/**
 * Deterministic Question-Aware Starter Code Generator
 * Generates language-specific function signatures and starter code for:
 * JavaScript, TypeScript, Python, Java, C++
 */

/**
 * Maps canonical abstract types to language-specific type strings.
 * Throws INVALID_CODING_CONTRACT error if abstractType cannot be resolved.
 */
export function getLanguageType(abstractType, lang) {
  if (!abstractType || typeof abstractType !== "string") {
    throw new Error("INVALID_CODING_CONTRACT: Parameter or return type metadata is missing.");
  }

  const normType = abstractType.trim().toLowerCase();

  const is2DArray = normType.includes("[][]") || normType.includes("2d");
  const isArray = !is2DArray && (normType.includes("[]") || normType.includes("array") || normType.includes("vector") || normType.includes("list"));
  const isObject = normType.includes("object") || normType.includes("map") || normType.includes("dict") || normType.includes("record") || normType.includes("{");
  const isString = !isObject && (normType.includes("string") || normType.includes("str") || normType.includes("char"));
  const isBool = normType.includes("bool");
  const isFloat = normType.includes("float") || normType.includes("double");
  const isInt = normType.includes("int") || normType.includes("number") || normType.includes("integer");

  switch (lang) {
    case "typescript":
    case "ts":
      if (is2DArray) return isString ? "string[][]" : "number[][]";
      if (isArray) return isString ? "string[]" : isBool ? "boolean[]" : "number[]";
      if (isObject) return "Record<string, any>";
      if (isString) return "string";
      if (isBool) return "boolean";
      if (isInt || isFloat) return "number";
      throw new Error(`INVALID_CODING_CONTRACT: Unsupported TypeScript type '${abstractType}'`);

    case "python":
    case "py":
      if (is2DArray) return isString ? "List[List[str]]" : "List[List[int]]";
      if (isArray) return isString ? "List[str]" : isBool ? "List[bool]" : isFloat ? "List[float]" : "List[int]";
      if (isObject) return "dict";
      if (isString) return "str";
      if (isBool) return "bool";
      if (isFloat) return "float";
      if (isInt) return "int";
      throw new Error(`INVALID_CODING_CONTRACT: Unsupported Python type '${abstractType}'`);

    case "java":
      if (is2DArray) return isString ? "String[][]" : "int[][]";
      if (isArray) return isString ? "String[]" : isBool ? "boolean[]" : isFloat ? "double[]" : "int[]";
      if (isObject) return "Map<String, Object>";
      if (isString) return "String";
      if (isBool) return "boolean";
      if (isFloat) return "double";
      if (isInt) return "int";
      throw new Error(`INVALID_CODING_CONTRACT: Unsupported Java type '${abstractType}'`);

    case "cpp":
    case "c++":
      if (is2DArray) return isString ? "vector<vector<string>>" : "vector<vector<int>>";
      if (isArray) return isString ? "vector<string>" : isBool ? "vector<bool>" : isFloat ? "vector<double>" : "vector<int>";
      if (isObject) return "auto";
      if (isString) return "string";
      if (isBool) return "bool";
      if (isFloat) return "double";
      if (isInt) return "int";
      throw new Error(`INVALID_CODING_CONTRACT: Unsupported C++ type '${abstractType}'`);

    default: // javascript
      if (is2DArray) return "number[][]";
      if (isArray) return isString ? "string[]" : isBool ? "boolean[]" : "number[]";
      if (isObject) return "object";
      if (isString) return "string";
      if (isBool) return "boolean";
      if (isInt || isFloat) return "number";
      return "any";
  }
}

/**
 * Default return statements per language and type.
 */
function getDefaultReturnStatement(returnType, lang) {
  const normType = (returnType || "").trim().toLowerCase();
  if (normType === "void") return "";

  const is2DArray = normType.includes("[][]") || normType.includes("2d");
  const isArray = !is2DArray && (normType.includes("[]") || normType.includes("array") || normType.includes("vector") || normType.includes("list"));
  const isString = normType.includes("string") || normType.includes("str");
  const isBool = normType.includes("bool");
  const isFloat = normType.includes("float") || normType.includes("double");

  switch (lang) {
    case "java":
      if (is2DArray) return isString ? "return new String[][]{};" : "return new int[][]{};";
      if (isArray) return isString ? "return new String[]{};" : isBool ? "return new boolean[]{};" : isFloat ? "return new double[]{};" : "return new int[]{};";
      if (isString) return 'return "";';
      if (isBool) return "return false;";
      if (isFloat) return "return 0.0;";
      return "return 0;";

    case "cpp":
    case "c++":
      if (is2DArray || isArray) return "return {};";
      if (isString) return 'return "";';
      if (isBool) return "return false;";
      if (isFloat) return "return 0.0;";
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
  const paramList = params.join(", ");

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
  const paramList = params.join(", ");
  const retType = getLanguageType(returnType, "typescript");

  return `function ${fn}(${paramList}): ${retType} {\n  // Write your solution here\n}`;
}

/**
 * Generates question-specific starter code for Python.
 */
export function generatePythonStarter({ functionName, parameters }) {
  const fn = sanitizeFunctionName(functionName);
  const params = (parameters || []).map((p, i) => sanitizeParamName(p.name, i));
  const paramList = params.join(", ");

  return `def ${fn}(${paramList}):\n    # Write your solution here\n    pass`;
}

/**
 * Generates question-specific starter code for Java.
 */
export function generateJavaStarter({ functionName, parameters, returnType }) {
  const fn = sanitizeFunctionName(functionName);
  let hasMap = false;
  const params = (parameters || []).map((p, i) => {
    const pName = sanitizeParamName(p.name, i);
    const pType = getLanguageType(p.type, "java");
    if (pType.includes("Map")) hasMap = true;
    return `${pType} ${pName}`;
  });
  const paramList = params.join(", ");
  const retType = getLanguageType(returnType, "java");
  const defaultReturn = getDefaultReturnStatement(returnType, "java");

  const body = defaultReturn ? `  // Write your solution here\n        ${defaultReturn}` : `  // Write your solution here`;
  const imports = hasMap ? `import java.util.*;\n\n` : "";

  return `${imports}class Solution {\n    public ${retType} ${fn}(${paramList}) {\n      ${body}\n    }\n}`;
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
    return isComplex ? `const ${pType}& ${pName}` : `${pType} ${pName}`;
  });
  const paramList = params.join(", ");
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
    returnType: questionMetadata.returnType || questionMetadata.execution?.returnType || "integer",
  };

  return {
    javascript: generateJavaScriptStarter(config),
    typescript: generateTypeScriptStarter(config),
    python: generatePythonStarter(config),
    java: generateJavaStarter(config),
    cpp: generateCppStarter(config),
  };
}

