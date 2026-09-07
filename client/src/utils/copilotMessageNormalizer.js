/**
 * Copilot Message & Response Normalizer
 * Guarantees that the UI consumes a predictable, normalized message model.
 */

export function createNormalizedMessage({
  id = null,
  role = 'assistant',
  content = '',
  sections = [],
  structuredData = null,
  suggestedActions = [],
  status = 'complete',
  errorCode = null,
  timestamp = new Date().toISOString(),
  metadata = {}
}) {
  return {
    id: id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    role: role === 'user' ? 'user' : role === 'system' ? 'system' : 'assistant',
    content: typeof content === 'string' ? content : '',
    sections: Array.isArray(sections) ? sections : [],
    structuredData: structuredData && typeof structuredData === 'object' ? structuredData : null,
    suggestedActions: Array.isArray(suggestedActions)
      ? suggestedActions.map(a => (typeof a === 'string' ? a : a?.label || a?.text || String(a || ''))).filter(Boolean)
      : [],
    status: ['sending', 'streaming', 'complete', 'error'].includes(status) ? status : 'complete',
    errorCode,
    timestamp,
    metadata
  };
}

/**
 * Safely normalizes raw API payloads into a clean NormalizedMessage
 */
export function normalizeCopilotResponse(responsePayload, userQuery = '') {
  if (!responsePayload) {
    return createNormalizedMessage({
      role: 'assistant',
      content: "I couldn't generate a response right now. Please try again.",
      status: 'error',
      errorCode: 'EMPTY_RESPONSE'
    });
  }

  let rawContent = '';
  let sections = [];
  let suggestedActions = [];
  let structuredData = null;

  // Extract from container objects
  const payload = responsePayload.data || responsePayload;

  if (payload.conversation?.messages?.length) {
    const lastMsg = payload.conversation.messages[payload.conversation.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      rawContent = lastMsg.content || '';
    }
  }

  if (!rawContent && typeof payload.reply === 'string') {
    rawContent = payload.reply;
  } else if (!rawContent && payload.reply && typeof payload.reply === 'object') {
    rawContent = payload.reply.content || payload.reply.reply || payload.reply.text || '';
  } else if (!rawContent && typeof payload.content === 'string') {
    rawContent = payload.content;
  } else if (!rawContent && typeof payload === 'string') {
    rawContent = payload;
  }

  if (Array.isArray(payload.sections)) {
    sections = payload.sections;
  }
  if (Array.isArray(payload.suggestedActions)) {
    suggestedActions = payload.suggestedActions;
  }
  if (payload.structuredData) {
    structuredData = payload.structuredData;
  }

  // Attempt to parse stringified JSON if rawContent looks like JSON object
  if (rawContent && typeof rawContent === 'string' && rawContent.trim().startsWith('{') && rawContent.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(rawContent.trim());
      if (parsed.reply || parsed.content) {
        rawContent = parsed.reply || parsed.content || '';
      }
      if (Array.isArray(parsed.sections) && !sections.length) {
        sections = parsed.sections;
      }
      if (Array.isArray(parsed.suggestedActions) && !suggestedActions.length) {
        suggestedActions = parsed.suggestedActions;
      }
      if (parsed.data && !structuredData) {
        structuredData = parsed.data;
      }
    } catch (e) {
      // Ignore JSON parse error, treat as raw markdown string
    }
  }

  // Fallback default message if empty
  if (!rawContent && !sections.length) {
    rawContent = "I am ready to help you with your career goals.";
  }

  return createNormalizedMessage({
    role: 'assistant',
    content: rawContent,
    sections,
    structuredData,
    suggestedActions,
    status: 'complete'
  });
}

/**
 * Normalizes an array of conversation messages from history DB
 */
export function normalizeConversationMessages(rawMessages = []) {
  if (!Array.isArray(rawMessages)) return [];

  return rawMessages.map(msg => {
    if (msg.role === 'user') {
      return createNormalizedMessage({
        id: msg._id || msg.id,
        role: 'user',
        content: msg.content || '',
        timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
        status: 'complete'
      });
    }

    // Assistant message
    return normalizeCopilotResponse(msg);
  });
}
