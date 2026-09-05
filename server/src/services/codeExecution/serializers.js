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
      const isCharArr = (typeHint && String(typeHint).includes("char")) || val.every(v => typeof v === "string" && v.length === 1);
      if (isCharArr) {
        return "new char[]{" + val.map(v => "'" + (v === "'" ? "\\'" : v) + "'").join(", ") + "}";
      }
      return "new String[]{" + val.map(v => JSON.stringify(v)).join(", ") + "}";
    }
    return "new int[]{" + val.map(v => String(v)).join(", ") + "}";
  }

  if (typeof val === "object") {
    const entries = Object.entries(val).map(([k, v]) => {
      const keyStr = JSON.stringify(k);
      const valStr = serializeJava(v, typeHint);
      return `put(${keyStr}, ${valStr});`;
    });
    return `new java.util.HashMap<String, Object>() {{ ${entries.join(" ")} }}`;
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
      const isCharArr = (typeHint && String(typeHint).includes("char")) || val.every(v => typeof v === "string" && v.length === 1);
      if (isCharArr) {
        return "std::vector<char>{" + val.map(v => "'" + (v === "'" ? "\\'" : v) + "'").join(", ") + "}";
      }
      return "std::vector<std::string>{" + val.map(v => JSON.stringify(v)).join(", ") + "}";
    }
    return "std::vector<int>{" + val.map(v => String(v)).join(", ") + "}";
  }

  if (typeof val === "object") {
    return JSON.stringify(JSON.stringify(val));
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
  return "Map<String, Object>";
}

/**
 * Normalizes test case input into a clean array of positional arguments.
 * Handles:
 * - Array of positional arguments: [[1,2,3], 5] -> [[1,2,3], 5]
 * - Object of named arguments: { nums: [1,2,3], target: 5 } -> [[1,2,3], 5] (when paramCount === 2)
 * - Single parameter Object input: { nums: [1,2,1,1,1], k: 3 } -> [{ nums: [1,2,1,1,1], k: 3 }] (when paramCount === 1)
 * - Single parameter array: [1, 2, 3] for 1 parameter -> [[1, 2, 3]]
 * - Primitive inputs: 5 -> [5], "hello" -> ["hello"]
 */
export function unpackTestCaseArguments(inputVal, parameterCount = 1) {
  if (inputVal === undefined) return [];
  if (inputVal === null) return [null];

  const expectedParams = typeof parameterCount === "number" && parameterCount > 0 ? parameterCount : 1;

  // Object input
  if (typeof inputVal === "object" && !Array.isArray(inputVal)) {
    const keys = Object.keys(inputVal);
    if (keys.length === expectedParams) {
      return Object.values(inputVal);
    }
    return [inputVal];
  }

  // Array input
  if (Array.isArray(inputVal)) {
    if (expectedParams > 1) {
      if (inputVal.length === 1 && Array.isArray(inputVal[0]) && inputVal[0].length === expectedParams) {
        return inputVal[0];
      }
      return inputVal;
    }

    if (expectedParams === 1) {
      if (inputVal.length === 1 && Array.isArray(inputVal[0])) {
        return [inputVal[0]];
      }
      return [inputVal];
    }

    return inputVal;
  }

  // Primitive value: number, string, boolean
  return [inputVal];
}
