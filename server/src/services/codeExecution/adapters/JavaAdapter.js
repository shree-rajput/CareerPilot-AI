/**
 * Java Execution Adapter
 */

import { BaseAdapter } from "./BaseAdapter.js";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { serializeValue, inferJavaType, unpackTestCaseArguments } from "../serializers.js";

export class JavaAdapter extends BaseAdapter {
  constructor() {
    super("java");
  }

  async prepare({ code, executionContract, testCase, tempDir }) {
    const mode = executionContract?.mode || "FUNCTION";
    const fnName = executionContract?.functionName || this.discoverFunctionName(code);
    const inputVal = testCase.input;

    // Clean public modifier from Solution class if present
    let cleanCode = code.replace(/public\s+class\s+Solution/g, "class Solution");
    if (!cleanCode.includes("class Solution")) {
      cleanCode = `class Solution {\n${cleanCode}\n}`;
    }

    const solutionPath = path.join(tempDir, "Solution.java");
    await writeFile(solutionPath, cleanCode, "utf8");

    if (mode === "STDIN") {
      const runnerCode = `
import java.util.*;
import java.io.*;

public class SolutionRunner {
    public static void main(String[] args) {
        try {
            Solution.main(args);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
}
`;
      await writeFile(path.join(tempDir, "SolutionRunner.java"), runnerCode, "utf8");
      return;
    }

    // FUNCTION Mode Harness
    const paramCount = executionContract?.parameters?.length || 1;
    const typeHint = executionContract?.parameters?.[0]?.type || executionContract?.returnType || "AUTO";
    const args = unpackTestCaseArguments(inputVal, paramCount);
    const argsCode = args.map(v => serializeValue(v, "java", typeHint)).join(", ");

    const runnerCode = `
import java.util.*;
import java.lang.reflect.*;

public class SolutionRunner {
    public static void main(String[] args) {
        try {
            Solution sol = new Solution();
            Method targetMethod = null;
            for (Method m : Solution.class.getDeclaredMethods()) {
                if (m.getName().equals("${fnName}")) {
                    targetMethod = m;
                    break;
                }
            }
            if (targetMethod == null) {
                for (Method m : Solution.class.getDeclaredMethods()) {
                    if (!m.getName().equals("main") && !m.isSynthetic()) {
                        targetMethod = m;
                        break;
                    }
                }
            }

            if (targetMethod == null) {
                System.err.println("INVALID_SOLUTION_SIGNATURE: Method '${fnName}' not found in Solution class.");
                System.exit(1);
            }

            Object result = targetMethod.invoke(sol, ${argsCode});
            
            String outputState = "ACTUAL_OUTPUT";
            String jsonOutput;
            if (result == null) {
                outputState = "NULL_RETURN";
                jsonOutput = "null";
            } else if (result instanceof int[]) {
                jsonOutput = Arrays.toString((int[]) result);
            } else if (result instanceof String[]) {
                StringBuilder sb = new StringBuilder("[");
                String[] arr = (String[]) result;
                for (int i = 0; i < arr.length; i++) {
                    sb.append("\\"").append(arr[i]).append("\\"");
                    if (i < arr.length - 1) sb.append(",");
                }
                sb.append("]");
                jsonOutput = sb.toString();
            } else if (result instanceof char[]) {
                StringBuilder sb = new StringBuilder("[");
                char[] arr = (char[]) result;
                for (int i = 0; i < arr.length; i++) {
                    sb.append("\\"").append(arr[i]).append("\\"");
                    if (i < arr.length - 1) sb.append(",");
                }
                sb.append("]");
                jsonOutput = sb.toString();
            } else if (result instanceof boolean[]) {
                jsonOutput = Arrays.toString((boolean[]) result);
            } else if (result instanceof Object[]) {
                jsonOutput = Arrays.deepToString((Object[]) result);
            } else {
                jsonOutput = String.valueOf(result);
            }

            String payload = "{\\"outputState\\":\\"" + outputState + "\\",\\"value\\":" + jsonOutput + "}";
            System.out.println("__CP_OUTPUT_START__" + payload + "__CP_OUTPUT_END__");
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            System.err.println(cause.getClass().getName() + ": " + cause.getMessage());
            cause.printStackTrace(System.err);
            System.exit(1);
        } catch (Exception e) {
            System.err.println("INVALID_SOLUTION_SIGNATURE: " + e.getMessage());
            System.exit(1);
        }
    }
}
`;

    await writeFile(path.join(tempDir, "SolutionRunner.java"), runnerCode, "utf8");
  }

  async compile({ tempDir, timeoutMs }) {
    const solutionPath = path.join(tempDir, "Solution.java");
    const runnerPath = path.join(tempDir, "SolutionRunner.java");

    const compileRes = await this.spawnChildProcess({
      command: "javac",
      args: ["-encoding", "UTF-8", solutionPath, runnerPath],
      cwd: tempDir,
      timeoutMs: timeoutMs || 10000,
    });

    return compileRes;
  }

  async execute({ tempDir, timeoutMs, stdinInput = null }) {
    return await this.spawnChildProcess({
      command: "java",
      args: ["-cp", tempDir, "SolutionRunner"],
      cwd: tempDir,
      timeoutMs,
      stdinInput,
    });
  }

  discoverFunctionName(code) {
    const match = code.match(/public\s+[A-Za-z0-9_<>\text\[\]]+\s+([A-Za-z0-9_]+)\s*\(/);
    if (match && match[1] && match[1] !== "main" && match[1] !== "Solution") {
      return match[1];
    }
    const match2 = code.match(/([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/);
    if (match2 && match2[1] && !["main", "Solution", "if", "for", "while"].includes(match2[1])) {
      return match2[1];
    }
    return "solution";
  }
}
