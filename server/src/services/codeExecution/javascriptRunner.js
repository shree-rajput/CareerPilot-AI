import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1 MB

export const runJavaScript = async ({
  code,
  input,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) => {
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "careerpilot-js-"));

  const fileName = `${crypto.randomUUID()}.js`;
  const filePath = path.join(tempDirectory, fileName);

  try {
    const wrappedCode = `
"use strict";

const input = ${JSON.stringify(input)};

${code}

// The runner expects the candidate to expose
// a function called "solution".
if (typeof solution !== "function") {
  throw new Error(
    "Your code must define a function named solution."
  );
}

const result = solution(input);

console.log(JSON.stringify(result));
`;

    await writeFile(filePath, wrappedCode, "utf8");

    return await executeProcess({
      command: process.execPath,
      args: ["--disable-proto=delete", filePath],
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
        stderr: error.message || stderr,
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
          stderr,
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
