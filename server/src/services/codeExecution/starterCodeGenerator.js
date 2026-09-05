/**
 * Deterministic Question-Aware Starter Code Generator
 * Generates language-specific function signatures and starter code for:
 * JavaScript, TypeScript, Python, Java, C++
 */

/**
 * Maps abstract types to language-specific type strings.
 */
function getLanguageType(abstractType, lang) {
  const normType = (abstractType || "any").trim().toLowerCase();

  const isArray = normType.includes("[]") || normType.includes("array") || normType.includes("vector") || normType.includes("list");
  const is2DArray = normType.includes("[][]") || normType.includes("2d");
  const isString = normType.includes("string") || normType.includes("str") || normType.includes("char");
  const isBool = normType.includes("bool");
  const isFloat = normType.includes("float") || normType.includes("double");
  const isInt = normType.includes("int") || normType.includes("number") || normType.includes("integer");

  switch (lang) {
    case "typescript":
    case "ts":
      if (is2DArray) return "number[][]";
      if (isArray) return isString ? "string[]" : isBool ? "boolean[]" : "number[]";
      if (isString) return "string";
      if (isBool) return "boolean";
      if (isInt || isFloat) return "number";
      return "any";

    case "python":
    case "py":
      if (is2DArray) return "List[List[int]]";
      if (isArray) return isString ? "List[str]" : isBool ? "List[bool]" : "List[int]";
      if (isString) return "str";
      if (isBool) return "bool";
      if (isFloat) return "float";
      if (isInt) return "int";
      return "Any";

    case "java":
      if (is2DArray) return "int[][]";
      if (isArray) return isString ? "String[]" : isBool ? "boolean[]" : "int[]";
      if (isString) return "String";
      if (isBool) return "boolean";
      if (isFloat) return "double";
      if (isInt) return "int";
      return "Object";

    case "cpp":
    case "c++":
      if (is2DArray) return "vector<vector<int>>";
      if (isArray) return isString ? "vector<string>" : isBool ? "vector<bool>" : "vector<int>";
      if (isString) return "string";
      if (isBool) return "bool";
      if (isFloat) return "double";
      if (isInt) return "int";
      return "auto";

    default: // javascript
      return "any";
  }
}

/**
 * Default return statements per language and type.
 */
function getDefaultReturnStatement(returnType, lang) {
  const normType = (returnType || "AUTO").trim().toLowerCase();
  if (normType === "void") return "";

  const isArray = normType.includes("[]") || normType.includes("array") || normType.includes("vector") || normType.includes("list");
  const is2DArray = normType.includes("[][]") || normType.includes("2d");
  const isString = normType.includes("string") || normType.includes("str");
  const isBool = normType.includes("bool");

  switch (lang) {
    case "java":
      if (is2DArray) return "return new int[][]{};";
      if (isArray) return isString ? "return new String[]{};" : "return new int[]{};";
      if (isString) return 'return "";';
      if (isBool) return "return false;";
      return "return 0;";

    case "cpp":
    case "c++":
      if (is2DArray || isArray) return "return {};";
      if (isString) return 'return "";';
      if (isBool) return "return false;";
      return "return 0;";

    case "python":
    case "py":
      return "pass";

    default: // javascript / typescript
      return "";
  }
}

/**
 * Cleans function name to be a valid identifier.
 */
function sanitizeFunctionName(name) {
  if (!name || typeof name !== "string") return "solution";
  const clean = name.replace(/[^a-zA-Z0-9_]/g, "");
  if (!clean || /^[0-9]/.test(clean)) return "solution";
  return clean;
}

/**
 * Sanitizes parameter names.
 */
function sanitizeParamName(name, index) {
  if (!name || typeof name !== "string") return `arg${index + 1}`;
  const clean = name.replace(/[^a-zA-Z0-9_]/g, "");
  if (!clean || /^[0-9]/.test(clean)) return `arg${index + 1}`;
  return clean;
}

/**
 * Generates question-specific starter code for JavaScript.
 */
export function generateJavaScriptStarter({ functionName, parameters }) {
  const fn = sanitizeFunctionName(functionName);
  const params = (parameters || []).map((p, i) => sanitizeParamName(p.name, i));
  const paramList = params.length > 0 ? params.join(", ") : "input";

  return `function ${fn}(${paramList}) {\n  // Write your solution here\n}`;
}

/**
 * Generates question-specific starter code for TypeScript.
 */
export function generateTypeScriptStarter({ functionName, parameters, returnType }) {
  const fn = sanitizeFunctionName(functionName);
  const params = (parameters || []).map((p, i) => {
    const pName = sanitizeParamName(p.name, i);
    const pType = getLanguageType(p.type, "typescript");
    return `${pName}: ${pType}`;
  });
  const paramList = params.length > 0 ? params.join(", ") : "input: any";
  const retType = getLanguageType(returnType, "typescript");

  return `function ${fn}(${paramList}): ${retType} {\n  // Write your solution here\n}`;
}

/**
 * Generates question-specific starter code for Python.
 */
export function generatePythonStarter({ functionName, parameters }) {
  const fn = sanitizeFunctionName(functionName);
  const params = (parameters || []).map((p, i) => sanitizeParamName(p.name, i));
  const paramList = params.length > 0 ? params.join(", ") : "input";

  return `def ${fn}(${paramList}):\n    # Write your solution here\n    pass`;
}

/**
 * Generates question-specific starter code for Java.
 */
export function generateJavaStarter({ functionName, parameters, returnType }) {
  const fn = sanitizeFunctionName(functionName);
  const params = (parameters || []).map((p, i) => {
    const pName = sanitizeParamName(p.name, i);
    const pType = getLanguageType(p.type, "java");
    return `${pType} ${pName}`;
  });
  const paramList = params.length > 0 ? params.join(", ") : "Object input";
  const retType = getLanguageType(returnType, "java");
  const defaultReturn = getDefaultReturnStatement(returnType, "java");

  const body = defaultReturn ? `  // Write your solution here\n        ${defaultReturn}` : `  // Write your solution here`;

  return `class Solution {\n    public ${retType} ${fn}(${paramList}) {\n      ${body}\n    }\n}`;
}

/**
 * Generates question-specific starter code for C++.
 */
export function generateCppStarter({ functionName, parameters, returnType }) {
  const fn = sanitizeFunctionName(functionName);
  const params = (parameters || []).map((p, i) => {
    const pName = sanitizeParamName(p.name, i);
    const pType = getLanguageType(p.type, "cpp");
    const isComplex = pType.includes("vector") || pType.includes("string");
    return isComplex ? `vector<int>& ${pName}` : `${pType} ${pName}`;
  });
  const paramList = params.length > 0 ? params.join(", ") : "auto input";
  const retType = getLanguageType(returnType, "cpp");
  const defaultReturn = getDefaultReturnStatement(returnType, "cpp");

  const body = defaultReturn ? `  // Write your solution here\n        ${defaultReturn}` : `  // Write your solution here`;

  return `class Solution {\npublic:\n    ${retType} ${fn}(${paramList}) {\n      ${body}\n    }\n};`;
}

/**
 * Generates starter code for all supported languages for a coding question.
 */
export function generateAllStarterCodes(questionMetadata = {}) {
  const config = {
    functionName: questionMetadata.functionName || questionMetadata.execution?.functionName || "solution",
    parameters: questionMetadata.parameters || questionMetadata.execution?.parameters || [],
    returnType: questionMetadata.returnType || questionMetadata.execution?.returnType || "AUTO",
  };

  return {
    javascript: generateJavaScriptStarter(config),
    typescript: generateTypeScriptStarter(config),
    python: generatePythonStarter(config),
    java: generateJavaStarter(config),
    cpp: generateCppStarter(config),
  };
}
