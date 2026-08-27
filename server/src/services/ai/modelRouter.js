import { env } from "../../config/env.js";

export const MODEL_ROLES = {
  FAST_EXTRACTION: "FAST_EXTRACTION",
  GENERAL_REASONING: "GENERAL_REASONING",
  COMPLEX_REASONING: "COMPLEX_REASONING",
};

export function getModelForRole(role) {
  switch (role) {
    case MODEL_ROLES.FAST_EXTRACTION:
      return env.groqModelFast;
    case MODEL_ROLES.GENERAL_REASONING:
      return env.groqModelGeneral;
    case MODEL_ROLES.COMPLEX_REASONING:
      return env.groqModelComplex;
    default:
      return env.groqModelGeneral; // Safe default
  }
}
