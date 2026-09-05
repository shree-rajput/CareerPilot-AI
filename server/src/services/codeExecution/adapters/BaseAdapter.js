/**
 * Base Execution Adapter
 */

import { spawn } from "node:child_process";

export class BaseAdapter {
  constructor(languageName) {
    this.languageName = languageName;
    this.maxOutputSize = 1024 * 1024; // 1 MB
  }

  async prepare({ code, executionContract, testCase, tempDir }) {
    throw new Error("prepare() must be implemented by adapter subclass.");
  }

  async compile({ tempDir, timeoutMs }) {
    return { status: "completed", stdout: "", stderr: "", exitCode: 0 };
  }

  async execute({ tempDir, timeoutMs }) {
    throw new Error("execute() must be implemented by adapter subclass.");
  }

  spawnChildProcess({ command, args, cwd, timeoutMs, stdinInput = null }) {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd,
        stdio: [stdinInput !== null ? "pipe" : "ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      if (stdinInput !== null && child.stdin) {
        child.stdin.write(stdinInput);
        child.stdin.end();
      }

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
        if (Buffer.byteLength(next, "utf8") > this.maxOutputSize) {
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
        resolve({
          status: exitCode === 0 && !timedOut && !outputLimitExceeded ? "completed" : "failed",
          stdout,
          stderr,
          exitCode,
          timedOut,
          outputLimitExceeded,
        });
      });
    });
  }
}
