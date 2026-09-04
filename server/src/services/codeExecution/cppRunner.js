import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1 MB

export const runCpp = async ({
  code,
  input,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) => {
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "careerpilot-cpp-"));
  const sourceFileName = `solution_${crypto.randomUUID().replace(/-/g, "")}.cpp`;
  const execFileName = process.platform === "win32" ? "solution.exe" : "solution.out";
  const sourceFilePath = path.join(tempDirectory, sourceFileName);
  const execFilePath = path.join(tempDirectory, execFileName);

  try {
    const inputStr = JSON.stringify(input);

    const wrappedCode = `#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>

${code}

int main() {
    // Basic test runner harness
    std::cout << "Done" << std::endl;
    return 0;
}
`;

    await writeFile(sourceFilePath, wrappedCode, "utf8");

    // 1. Compile C++ code using g++
    const compileResult = await executeProcess({
      command: "g++",
      args: ["-std=c++17", sourceFilePath, "-o", execFilePath],
      cwd: tempDirectory,
      timeoutMs: 10000,
    });

    if (compileResult.status !== "completed" || compileResult.exitCode !== 0) {
      return {
        status: "failed",
        stdout: compileResult.stdout,
        stderr: compileResult.stderr || "Compilation failed.",
        exitCode: compileResult.exitCode || 1,
      };
    }

    // 2. Run compiled executable
    return await executeProcess({
      command: execFilePath,
      args: [],
      cwd: tempDirectory,
      timeoutMs,
    });
  } catch (err) {
    return {
      status: "failed",
      stdout: "",
      stderr: err.code === "ENOENT" ? "C++ compiler (g++) is not installed on this system." : (err.message || "C++ execution failed."),
      exitCode: 1,
    };
  } finally {
    await rm(tempDirectory, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
};

const executeProcess = ({ command, args, cwd, timeoutMs }) => {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputLimitExceeded = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const appendOutput = (current, chunk) => {
      const next = current + chunk.toString();
      if (Buffer.byteLength(next, "utf8") > MAX_OUTPUT_SIZE) {
        outputLimitExceeded = true;
        child.kill("SIGKILL");
        return current;
      }
      return next;
    };

    child.stdout.on("data", (chunk) => {
      stdout = appendOutput(stdout, chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr = appendOutput(stderr, chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        status: "failed",
        stdout,
        stderr: error.code === "ENOENT" ? `Command '${command}' not found on server.` : (error.message || stderr),
        exitCode: null,
        timedOut: false,
        outputLimitExceeded,
      });
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeout);

      if (timedOut) {
        resolve({
          status: "timeout",
          stdout,
          stderr: "Time limit exceeded",
          exitCode,
          timedOut: true,
          outputLimitExceeded,
        });
        return;
      }

      if (outputLimitExceeded) {
        resolve({
          status: "failed",
          stdout,
          stderr: "Output limit exceeded.",
          exitCode,
          timedOut: false,
          outputLimitExceeded: true,
        });
        return;
      }

      resolve({
        status: exitCode === 0 ? "completed" : "failed",
        stdout,
        stderr,
        exitCode,
        timedOut: false,
        outputLimitExceeded: false,
      });
    });
  });
};
