/**
 * JavaScript / TypeScript Execution Adapter
 */

import { BaseAdapter } from "./BaseAdapter.js";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { serializeValue, unpackTestCaseArguments } from "../serializers.js";

export class JavaScriptAdapter extends BaseAdapter {
  constructor() {
    super("javascript");
  }

  async prepare({ code, executionContract, testCase, tempDir }) {
    const mode = executionContract?.mode || "FUNCTION";
    const fnName = executionContract?.functionName || this.discoverFunctionName(code);
    const fileName = `solution_${crypto.randomUUID().replace(/-/g, "")}.js`;
    const filePath = path.join(tempDir, fileName);

    if (mode === "STDIN") {
      const wrappedCode = `
"use strict";
${code}
`;
      await writeFile(filePath, wrappedCode, "utf8");
      this.entryFile = filePath;
      return;
    }

    // FUNCTION Mode
    const paramCount = executionContract?.parameters?.length || 1;
    const args = unpackTestCaseArguments(testCase.input, paramCount);
    const argsCode = args.map(v => serializeValue(v, "javascript")).join(", ");

    const wrappedCode = `
"use strict";

${code}

let targetFn = null;
if (typeof ${fnName} === "function") {
  targetFn = ${fnName};
} else if (typeof solution === "function") {
  targetFn = solution;
} else if (typeof twoSum === "function") {
  targetFn = twoSum;
} else if (typeof two_sum === "function") {
  targetFn = two_sum;
} else if (typeof reverseString === "function") {
  targetFn = reverseString;
} else if (typeof reverse_string === "function") {
  targetFn = reverse_string;
} else {
  const reserved = new Set(["console", "require", "exports", "module", "process", "Buffer", "setTimeout", "clearTimeout", "setInterval", "clearInterval"]);
  for (const key of Object.keys(globalThis)) {
    if (!reserved.has(key) && typeof globalThis[key] === "function") {
      targetFn = globalThis[key];
      break;
    }
  }
}

if (!targetFn) {
  console.error("INVALID_SOLUTION_SIGNATURE: Solution function '${fnName}' not found.");
  process.exit(1);
}

try {
  const result = targetFn(${argsCode});
  
  let outputState = "ACTUAL_OUTPUT";
  let payloadValue = result;

  if (result === undefined) {
    outputState = "UNDEFINED_RETURN";
    payloadValue = null;
  } else if (result === null) {
    outputState = "NULL_RETURN";
    payloadValue = null;
  }

  const payload = JSON.stringify({ outputState, value: payloadValue });
  console.log("__CP_OUTPUT_START__" + payload + "__CP_OUTPUT_END__");
} catch (err) {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
}
`;

    await writeFile(filePath, wrappedCode, "utf8");
    this.entryFile = filePath;
  }

  async execute({ tempDir, timeoutMs, stdinInput = null }) {
    return await this.spawnChildProcess({
      command: process.execPath,
      args: ["--disable-proto=delete", this.entryFile],
      cwd: tempDir,
      timeoutMs,
      stdinInput,
    });
  }

  discoverFunctionName(code) {
    const match = code.match(/function\s+([A-Za-z0-9_]+)\s*\(/);
    if (match && match[1]) return match[1];
    const matchConst = code.match(/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:function|\()/);
    if (matchConst && matchConst[1]) return matchConst[1];
    return "solution";
  }
}
