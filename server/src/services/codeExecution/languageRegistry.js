/**
 * Cross-Language Adapter Registry
 */

import { JavaAdapter } from "./adapters/JavaAdapter.js";
import { JavaScriptAdapter } from "./adapters/JavaScriptAdapter.js";
import { PythonAdapter } from "./adapters/PythonAdapter.js";
import { CppAdapter } from "./adapters/CppAdapter.js";

class LanguageRegistry {
  constructor() {
    this.adapters = new Map();

    const java = new JavaAdapter();
    const js = new JavaScriptAdapter();
    const py = new PythonAdapter();
    const cpp = new CppAdapter();

    this.register(["java"], java);
    this.register(["javascript", "js", "typescript", "ts"], js);
    this.register(["python", "py"], py);
    this.register(["cpp", "c++", "c"], cpp);
  }

  register(aliases, adapter) {
    for (const alias of aliases) {
      this.adapters.set(alias.toLowerCase(), adapter);
    }
  }

  getAdapter(language) {
    if (!language) return null;
    const normalized = language.trim().toLowerCase();
    return this.adapters.get(normalized) || null;
  }
}

export const languageRegistry = new LanguageRegistry();
