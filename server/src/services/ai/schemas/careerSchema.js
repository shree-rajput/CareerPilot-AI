export const projectKitSchema = {
  type: "object",
  properties: {
    kit: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          category: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] }
        },
        required: ["question", "category", "difficulty"],
        additionalProperties: false
      }
    }
  },
  required: ["kit"],
  additionalProperties: false
};

export const prepPlanSchema = {
  type: "object",
  properties: {
    actionItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
          priority: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          estimatedTimeMinutes: { type: "integer" },
          source: { type: "string" }
        },
        required: ["title", "reason", "priority", "estimatedTimeMinutes", "source"],
        additionalProperties: false
      }
    }
  },
  required: ["actionItems"],
  additionalProperties: false
};

export const copilotChatSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    suggestedActions: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["reply", "suggestedActions"],
  additionalProperties: false
};
