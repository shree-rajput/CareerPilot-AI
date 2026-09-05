/**
 * C++ Execution Adapter
 */

import { BaseAdapter } from "./BaseAdapter.js";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { serializeValue, unpackTestCaseArguments } from "../serializers.js";

export class CppAdapter extends BaseAdapter {
  constructor() {
    super("cpp");
  }

  async prepare({ code, executionContract, testCase, tempDir }) {
    const mode = executionContract?.mode || "FUNCTION";
    const fnName = executionContract?.functionName || this.discoverFunctionName(code);
    
    const sourceFileName = `solution_${crypto.randomUUID().replace(/-/g, "")}.cpp`;
    const execFileName = process.platform === "win32" ? "solution.exe" : "solution.out";
    
    this.sourceFilePath = path.join(tempDir, sourceFileName);
    this.execFilePath = path.join(tempDir, execFileName);

    if (mode === "STDIN") {
      const wrappedCode = `#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

${code}
`;
      await writeFile(this.sourceFilePath, wrappedCode, "utf8");
      return;
    }

    // FUNCTION Mode Harness
    const paramCount = executionContract?.parameters?.length || 1;
    const argValues = unpackTestCaseArguments(testCase.input, paramCount);
    let argDecls = [];
    let argNames = [];

    argValues.forEach((val, index) => {
      const varName = `arg${index}`;
      argNames.push(varName);
      argDecls.push(`auto ${varName} = ${serializeValue(val, "cpp")};`);
    });

    const declsCode = argDecls.join("\n        ");
    const callArgs = argNames.join(", ");

    const hasSolutionClass = code.includes("class Solution") || code.includes("struct Solution");

    const wrappedCode = `#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
#include <type_traits>
using namespace std;

${code}

template <typename T>
void printCppResult(const T& val) {
    cout << val;
}

void printCppResult(const string& val) {
    cout << "\\"" << val << "\\"";
}

void printCppResult(bool val) {
    cout << (val ? "true" : "false");
}

template <typename T>
void printCppResult(const vector<T>& vec) {
    cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        printCppResult(vec[i]);
        if (i + 1 < vec.size()) cout << ",";
    }
    cout << "]";
}

int main() {
    try {
        ${declsCode}
        ${hasSolutionClass ? "Solution sol;" : ""}
        auto result = ${hasSolutionClass ? `sol.${fnName}` : fnName}(${callArgs});
        cout << "__CP_OUTPUT_START__";
        printCppResult(result);
        cout << "__CP_OUTPUT_END__" << endl;
    } catch (const exception& e) {
        cerr << "RUNTIME_ERROR: " << e.what() << endl;
        return 1;
    } catch (...) {
        cerr << "RUNTIME_ERROR: Unknown C++ exception caught." << endl;
        return 1;
    }
    return 0;
}
`;

    await writeFile(this.sourceFilePath, wrappedCode, "utf8");
  }

  async compile({ tempDir, timeoutMs }) {
    const compileRes = await this.spawnChildProcess({
      command: "g++",
      args: ["-std=c++17", "-O2", this.sourceFilePath, "-o", this.execFilePath],
      cwd: tempDir,
      timeoutMs: timeoutMs || 10000,
    });

    return compileRes;
  }

  async execute({ tempDir, timeoutMs, stdinInput = null }) {
    return await this.spawnChildProcess({
      command: this.execFilePath,
      args: [],
      cwd: tempDir,
      timeoutMs,
      stdinInput,
    });
  }

  discoverFunctionName(code) {
    const match = code.match(/(?:int|double|bool|string|vector<[^>]+>|void)\s+([A-Za-z0-9_]+)\s*\(/);
    if (match && match[1] && match[1] !== "main") return match[1];
    return "search";
  }
}
