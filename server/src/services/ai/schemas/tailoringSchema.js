// import { z } from "zod";

// const tailoringItemSchema = z.object({
//   type: z.enum(["rephrase", "reorder", "highlight", "remove"]),
//   section: z.enum(["skills", "experience", "projects", "summary", "education", "certifications"]),
//   original: z.string().min(1),
//   suggestion: z.string().min(1),
//   reason: z.string().min(1)
// });

// export const tailoringSchema = z.array(tailoringItemSchema).min(1);
import { z } from "zod";

function safeEnum(values, defaultValue) {
  const normalized = values.map((v) => String(v).toLowerCase());
  return z.preprocess((val) => {
    if (!val) return defaultValue;
    const s = String(val).trim().toLowerCase();
    const idx = normalized.indexOf(s);
    if (idx !== -1) return values[idx];
    return defaultValue;
  }, z.enum(values).default(defaultValue));
}

const tailoringItemSchema = z.object({
  type: safeEnum(["rephrase", "reorder", "highlight", "remove"], "rephrase"),
  section: safeEnum([
    "skills",
    "experience",
    "projects",
    "summary",
    "education",
    "certifications"
  ], "experience"),
  original: z.string().default(""),
  suggestion: z.string().default(""),
  reason: z.string().default("")
});

export const tailoringSchema = z.preprocess(
  (val) => (Array.isArray(val) ? val : []),
  z.array(tailoringItemSchema).default([])
);

