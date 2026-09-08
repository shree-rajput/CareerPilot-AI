/**
 * CareerPilot AI - Structured Extension Logger
 * Consistent, prefixed development logger that sanitizes sensitive data.
 */

(function (global) {
  const PREFIX = "[CareerPilot Extension]";

  function sanitize(obj) {
    if (!obj) return obj;
    if (typeof obj === "string") {
      return obj.replace(/(bearer\s+)[a-zA-Z0-9._-]+/gi, "$1[REDACTED]");
    }
    if (typeof obj === "object") {
      try {
        const cloned = JSON.parse(JSON.stringify(obj));
        const sanitizeKeys = (item) => {
          if (!item || typeof item !== "object") return;
          for (const key of Object.keys(item)) {
            if (/token|password|secret|authorization|cookie/i.test(key)) {
              item[key] = "[REDACTED]";
            } else if (typeof item[key] === "object") {
              sanitizeKeys(item[key]);
            }
          }
        };
        sanitizeKeys(cloned);
        return cloned;
      } catch (e) {
        return "[Unparseable Object]";
      }
    }
    return obj;
  }

  const logger = {
    info: (message, ...args) => {
      console.log(`${PREFIX} ℹ️ ${message}`, ...args.map(sanitize));
    },
    warn: (message, ...args) => {
      console.warn(`${PREFIX} ⚠️ ${message}`, ...args.map(sanitize));
    },
    error: (message, ...args) => {
      console.error(`${PREFIX} 🚨 ${message}`, ...args.map(sanitize));
    },
    debug: (message, ...args) => {
      console.debug(`${PREFIX} 🔍 ${message}`, ...args.map(sanitize));
    },
  };

  global.__CAREERPILOT_LOGGER__ = logger;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = logger;
  }
})(typeof self !== "undefined" ? self : this);
