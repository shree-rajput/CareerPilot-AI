import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 6000;
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1 MB

export const runJava = async ({
  code,
  input,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) => {
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "careerpilot-java-"));
  const filePath = path.join(tempDirectory, "SolutionRunner.java");

  try {
    const wrappedCode = `
import java.util.*;

public class SolutionRunner {
    ${code}

    public static void main(String[] args) {
        try {
            Solution sol = new Solution();
            Object inputVal = ${JSON.stringify(JSON.stringify(input))};
            Object result = sol.solve(inputVal);
            System.out.println(result);
        } catch (Exception e) {
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }
}
`;

    await writeFile(filePath, wrappedCode, "utf8");

    return await executeProcess({
      command: "java",
      args: [filePath],
      cwd: tempDirectory,
      timeoutMs,
    });
  } finally {
    await rm(tempDirectory, {
      recursive: true,
      force: true,
    });
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
        stderr: error.code === "ENOENT" ? "Java SDK/JRE is not installed on this server." : (error.message || stderr),
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
          stderr: "Time limit exceeded (6s)",
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
