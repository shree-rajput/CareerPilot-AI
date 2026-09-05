/**
 * Cross-Language Type-Aware Input Serializer
 * Converts JSON input values into native code literal initializers for Java, JS, Python, and C++.
 */

export function serializeValue(val, lang, typeHint = "AUTO") {
  const normalizedLang = (lang || "javascript").toLowerCase();
  
  if (normalizedLang === "python" || normalizedLang === "py") {
    return serializePython(val);
  }
  if (normalizedLang === "java") {
    return serializeJava(val, typeHint);
  }
  if (normalizedLang === "cpp" || normalizedLang === "c++") {
    return serializeCpp(val, typeHint);
  }
  
  // Default JavaScript / TypeScript
  return JSON.stringify(val);
}

function serializePython(val) {
  if (val === null || val === undefined) return "None";
  if (typeof val === "boolean") return val ? "True" : "False";
  if (typeof val === "number" || typeof val === "string") return JSON.stringify(val);
  if (Array.isArray(val)) {
    return "[" + val.map(serializePython).join(", ") + "]";
  }
  if (typeof val === "object") {
    const entries = Object.entries(val).map(([k, v]) => `${JSON.stringify(k)}: ${serializePython(v)}`);
    return "{" + entries.join(", ") + "}";
  }
  return JSON.stringify(val);
}

function serializeJava(val, typeHint) {
  if (val === null || val === undefined) return "null";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return JSON.stringify(val);

  if (Array.isArray(val)) {
    if (val.length === 0) return "new int[]{}";
    if (Array.isArray(val[0])) {
      // Nested Array (int[][])
      const inner = val.map(sub => "new int[]{" + sub.map(v => typeof v === 'number' ? v : JSON.stringify(v)).join(", ") + "}").join(", ");
      return "new int[][]{" + inner + "}";
    }
    if (typeof val[0] === "string") {
      return "new String[]{" + val.map(v => JSON.stringify(v)).join(", ") + "}";
    }
    return "new int[]{" + val.map(v => String(v)).join(", ") + "}";
  }

  return JSON.stringify(val);
}

function serializeCpp(val, typeHint) {
  if (val === null || val === undefined) return "{}";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return JSON.stringify(val);

  if (Array.isArray(val)) {
    if (val.length === 0) return "std::vector<int>{}";
    if (Array.isArray(val[0])) {
      // vector<vector<int>>
      const inner = val.map(sub => "std::vector<int>{" + sub.map(v => String(v)).join(", ") + "}").join(", ");
      return "std::vector<std::vector<int>>{" + inner + "}";
    }
    if (typeof val[0] === "string") {
      return "std::vector<std::string>{" + val.map(v => JSON.stringify(v)).join(", ") + "}";
    }
    return "std::vector<int>{" + val.map(v => String(v)).join(", ") + "}";
  }

  return JSON.stringify(val);
}

/**
 * Infer C++ type string for function signature parameter
 */
export function inferCppType(val) {
  if (typeof val === "number") return Number.isInteger(val) ? "int" : "double";
  if (typeof val === "boolean") return "bool";
  if (typeof val === "string") return "std::string";
  if (Array.isArray(val)) {
    if (val.length > 0 && Array.isArray(val[0])) return "std::vector<std::vector<int>>";
    if (val.length > 0 && typeof val[0] === "string") return "std::vector<std::string>";
    return "std::vector<int>";
  }
  return "auto";
}

/**
 * Infer Java type string for function signature parameter
 */
export function inferJavaType(val) {
  if (typeof val === "number") return Number.isInteger(val) ? "int" : "double";
  if (typeof val === "boolean") return "boolean";
  if (typeof val === "string") return "String";
  if (Array.isArray(val)) {
    if (val.length > 0 && Array.isArray(val[0])) return "int[][]";
    if (val.length > 0 && typeof val[0] === "string") return "String[]";
    return "int[]";
  }
  return "Object";
}

/**
 * Normalizes test case input into a clean array of positional arguments.
 * Handles:
 * - Array of positional arguments: [[1,2,3], 5] -> [[1,2,3], 5]
 * - Object of named arguments: { nums: [1,2,3], target: 5 } -> [[1,2,3], 5]
 * - Single parameter array: [1, 2, 3] for 1 parameter -> [[1, 2, 3]]
 * - Primitive inputs: 5 -> [5], "hello" -> ["hello"]
 */
export function unpackTestCaseArguments(inputVal, parameterCount = 1) {
  if (inputVal === undefined) return [];
  if (inputVal === null) return [null];

  // Object of named arguments: { nums: [1,2,3], target: 5 }
  if (typeof inputVal === "object" && !Array.isArray(inputVal)) {
    return Object.values(inputVal);
  }

  // Array input
  if (Array.isArray(inputVal)) {
    const expectedParams = typeof parameterCount === "number" && parameterCount > 0 ? parameterCount : 1;

    // Multi-parameter function (expectedParams > 1)
    if (expectedParams > 1) {
      // If inputVal is [[arg1, arg2, ...]] (wrapped in 1-tuple array), unwrap it first
      if (inputVal.length === 1 && Array.isArray(inputVal[0]) && inputVal[0].length === expectedParams) {
        return inputVal[0];
      }
      // If inputVal itself contains the positional arguments (e.g. [[2,7,11,15], 9])
      if (inputVal.length === expectedParams) {
        return inputVal;
      }
      return inputVal;
    }

    // Single-parameter function (expectedParams === 1)
    if (expectedParams === 1) {
      // If inputVal is [[1, 2, 3]] (1-tuple array wrapping array arg [1,2,3])
      if (inputVal.length === 1 && Array.isArray(inputVal[0])) {
        return [inputVal[0]];
      }
      // Otherwise, the array [1,2,3] itself is argument 0
      return [inputVal];
    }

    return inputVal;
  }

  // Primitive value: number, string, boolean
  return [inputVal];
}
