/**
 * Python Execution Adapter
 */

import { BaseAdapter } from "./BaseAdapter.js";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { serializeValue, unpackTestCaseArguments } from "../serializers.js";

export class PythonAdapter extends BaseAdapter {
  constructor() {
    super("python");
  }

  async prepare({ code, executionContract, testCase, tempDir }) {
    const mode = executionContract?.mode || "FUNCTION";
    const fnName = executionContract?.functionName || this.discoverFunctionName(code);
    const fileName = `solution_${crypto.randomUUID().replace(/-/g, "")}.py`;
    const filePath = path.join(tempDir, fileName);

    if (mode === "STDIN") {
      await writeFile(filePath, code, "utf8");
      this.entryFile = filePath;
      return;
    }

    // FUNCTION Mode
    const paramCount = executionContract?.parameters?.length || 1;
    const args = unpackTestCaseArguments(testCase.input, paramCount);
    const argsCode = args.map(v => serializeValue(v, "python")).join(", ");

    const wrappedCode = `import sys
import json
import traceback

${code}

target_fn = None
if '${fnName}' in globals() and callable(globals()['${fnName}']):
    target_fn = globals()['${fnName}']
elif 'solution' in globals() and callable(globals()['solution']):
    target_fn = globals()['solution']
elif 'two_sum' in globals() and callable(globals()['two_sum']):
    target_fn = globals()['two_sum']
elif 'twoSum' in globals() and callable(globals()['twoSum']):
    target_fn = globals()['twoSum']
else:
    for k, v in list(globals().items()):
        if callable(v) and not k.startswith('__') and k not in ('sys', 'json', 'traceback', 'target_fn'):
            target_fn = v
            break

if not target_fn:
    print("INVALID_SOLUTION_SIGNATURE: Solution function '${fnName}' not found.", file=sys.stderr)
    sys.exit(1)

try:
    result = target_fn(${argsCode})
    output_state = "ACTUAL_OUTPUT"
    payload_val = result
    if result is None:
        output_state = "NULL_RETURN"
        payload_val = None
    payload = json.dumps({"outputState": output_state, "value": payload_val})
    print("__CP_OUTPUT_START__" + payload + "__CP_OUTPUT_END__")
except Exception as e:
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
`;

    await writeFile(filePath, wrappedCode, "utf8");
    this.entryFile = filePath;
  }

  async execute({ tempDir, timeoutMs, stdinInput = null }) {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";

    return await this.spawnChildProcess({
      command: pythonCmd,
      args: [this.entryFile],
      cwd: tempDir,
      timeoutMs,
      stdinInput,
    });
  }

  discoverFunctionName(code) {
    const match = code.match(/def\s+([A-Za-z0-9_]+)\s*\(/);
    if (match && match[1]) return match[1];
    return "solution";
  }
}
