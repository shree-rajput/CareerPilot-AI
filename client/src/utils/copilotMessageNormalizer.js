/**
 * Copilot Message & Response Normalizer
 * Guarantees that the UI consumes a predictable, normalized message model.
 * Provides smart auto-chunking for legacy or raw markdown responses into:
 * - Direct Answer / TL;DR
 * - Key Points
 * - Progressive Expandable Sections
 * - Contextual Action Buttons
 */

export const RESPONSE_TYPES = {
  DIRECT_ANSWER: 'DIRECT_ANSWER',
  EXPLANATION: 'EXPLANATION',
  INTERVIEW_PREPARATION: 'INTERVIEW_PREPARATION',
  RESUME_ANALYSIS: 'RESUME_ANALYSIS',
  PROJECT_ANALYSIS: 'PROJECT_ANALYSIS',
  RECOMMENDATION: 'RECOMMENDATION',
  ACTION_PLAN: 'ACTION_PLAN',
  COMPARISON: 'COMPARISON',
  STEP_BY_STEP: 'STEP_BY_STEP',
  CODE_EXPLANATION: 'CODE_EXPLANATION',
  APPLICATION_INSIGHT: 'APPLICATION_INSIGHT'
};

export function createNormalizedMessage({
  id = null,
  role = 'assistant',
  content = '',
  responseType = RESPONSE_TYPES.DIRECT_ANSWER,
  summary = '',
  keyPoints = [],
  expandableSections = [],
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
    responseType: Object.values(RESPONSE_TYPES).includes(responseType) ? responseType : RESPONSE_TYPES.DIRECT_ANSWER,
    summary: typeof summary === 'string' ? summary : '',
    keyPoints: Array.isArray(keyPoints) ? keyPoints.filter(Boolean) : [],
    expandableSections: Array.isArray(expandableSections) ? expandableSections : [],
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
 * Classifies raw user query & response text into a ResponseType if not provided
 */
function classifyResponseType(userQuery = '', rawText = '', payloadData = {}) {
  if (payloadData.responseType && Object.values(RESPONSE_TYPES).includes(payloadData.responseType)) {
    return payloadData.responseType;
  }

  const combined = (userQuery + ' ' + rawText).toLowerCase();

  if (/interview|mock|prepare for.*interview|interview question|question 1|practice answer/i.test(combined)) {
    return RESPONSE_TYPES.INTERVIEW_PREPARATION;
  }
  if (/resume|cv|ats|strong areas|needs improvement|work experience/i.test(combined)) {
    return RESPONSE_TYPES.RESUME_ANALYSIS;
  }
  if (/project|architecture|tech stack|what you built|verified details/i.test(combined)) {
    return RESPONSE_TYPES.PROJECT_ANALYSIS;
  }
  if (/recommend|priority|focus on|next action|roadmap/i.test(combined)) {
    return RESPONSE_TYPES.RECOMMENDATION;
  }
  if (/```|function|syntax|closure|code snippet|script/i.test(combined)) {
    return RESPONSE_TYPES.CODE_EXPLANATION;
  }
  if (/step \d|step-by-step|first.*then.*finally/i.test(combined)) {
    return RESPONSE_TYPES.STEP_BY_STEP;
  }
  if (rawText.length > 500) {
    return RESPONSE_TYPES.EXPLANATION;
  }
  return RESPONSE_TYPES.DIRECT_ANSWER;
}

/**
 * Smart Auto-Chunker: Chunks raw Markdown into summary, keyPoints, and expandableSections
 */
function parseRawMarkdownStructure(rawMarkdown = '', classifiedType = RESPONSE_TYPES.DIRECT_ANSWER) {
  if (!rawMarkdown || typeof rawMarkdown !== 'string') {
    return { summary: '', keyPoints: [], expandableSections: [], mainContent: '' };
  }

  let text = rawMarkdown.trim();
  let summary = '';
  const keyPoints = [];
  const expandableSections = [];

  // 1. Extract TL;DR or Short Summary if explicitly headered or first block
  const tldrMatch = /###?\s*(?:TL;?DR|Short Answer|Direct Answer|Executive Summary)\n+([\s\S]*?)(?=\n###?|\n$)/i.exec(text);
  if (tldrMatch) {
    summary = tldrMatch[1].trim();
    text = text.replace(tldrMatch[0], '').trim();
  }

  // 2. Extract Key Points if present
  const keyPointsMatch = /###?\s*(?:Key Points|Most Important|Focus Areas|Highlights|Key Takeaways)\n+([\s\S]*?)(?=\n###?|\n$)/i.exec(text);
  if (keyPointsMatch) {
    const lines = keyPointsMatch[1].split('\n');
    lines.forEach(l => {
      const cleaned = l.replace(/^[-*•\d+\.]\s*/, '').trim();
      if (cleaned) keyPoints.push(cleaned);
    });
    text = text.replace(keyPointsMatch[0], '').trim();
  }

  // 3. Auto-chunk remaining Markdown headers into expandable sections for Progressive Disclosure
  // Headers like "Detailed Explanation", "Technical Deep Dive", "Interview Questions", "Example Answer", "Alternative Approach"
  const headerRegex = /(?:^|\n)###?\s+(Detailed Explanation|Technical Deep Dive|Deep Technical Questions|Possible Follow-ups|Example Answer|Alternative Approach|Additional Details|Background Context|Full Explanation)[\r\n]+([\s\S]*?)(?=\n###?|\n$)/gi;
  
  let match;
  while ((match = headerRegex.exec(rawMarkdown)) !== null) {
    const title = match[1].trim();
    const content = match[2].trim();
    if (content) {
      expandableSections.push({
        id: `exp_${expandableSections.length + 1}`,
        title,
        content
      });
      // Remove extracted chunk from main content stream to prevent duplication
      text = text.replace(match[0], '').trim();
    }
  }

  // 4. If no explicit TL;DR header was found, take the very first paragraph as summary if text is long
  if (!summary && text.length > 250) {
    const paras = text.split(/\n\n+/);
    if (paras.length > 1 && !paras[0].startsWith('#')) {
      summary = paras[0].trim();
      text = paras.slice(1).join('\n\n').trim();
    }
  }

  // 5. For long text (>700 chars) with multiple markdown sections, if expandableSections is still empty,
  // chunk secondary sections (sections 2+) into expandable sections
  if (expandableSections.length === 0 && text.length > 700) {
    const sectionSplit = text.split(/(?=\n###?\s+)/);
    if (sectionSplit.length > 2) {
      const keepContent = [sectionSplit[0], sectionSplit[1]].join('\n\n');
      const expandContent = sectionSplit.slice(2).join('\n\n');
      text = keepContent;
      expandableSections.push({
        id: 'exp_details',
        title: classifiedType === RESPONSE_TYPES.INTERVIEW_PREPARATION ? 'More Questions & Follow-ups' : 'Detailed Explanation & Technical Deep Dive',
        content: expandContent.trim()
      });
    }
  }

  return {
    summary,
    keyPoints,
    expandableSections,
    mainContent: text
  };
}

function extractFieldFromRawJson(jsonStr, fieldName) {
  if (!jsonStr || typeof jsonStr !== 'string') return '';
  try {
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i');
    const match = regex.exec(jsonStr);
    if (match && match[1]) {
      return match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  } catch {
    // ignore
  }
  return '';
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
  let responseType = null;
  let summary = '';
  let keyPoints = [];
  let expandableSections = [];
  let sections = [];
  let suggestedActions = [];
  let structuredData = null;

  // Extract from container objects
  const payload = responsePayload.data || responsePayload;

  if (payload.conversation?.messages?.length) {
    const lastMsg = payload.conversation.messages[payload.conversation.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      rawContent = lastMsg.content || '';
      responseType = lastMsg.responseType;
      summary = lastMsg.summary;
      keyPoints = lastMsg.keyPoints;
      expandableSections = lastMsg.expandableSections;
      sections = lastMsg.sections;
      structuredData = lastMsg.structuredData;
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

  if (payload.responseType) responseType = payload.responseType;
  if (payload.summary) summary = payload.summary;
  if (Array.isArray(payload.keyPoints)) keyPoints = payload.keyPoints;
  if (Array.isArray(payload.expandableSections)) expandableSections = payload.expandableSections;
  if (Array.isArray(payload.sections)) sections = payload.sections;
  if (Array.isArray(payload.suggestedActions)) suggestedActions = payload.suggestedActions;
  if (payload.structuredData) structuredData = payload.structuredData;

  // Attempt to parse stringified JSON if rawContent looks like JSON object (with or without markdown fences)
  if (rawContent && typeof rawContent === 'string') {
    let checkContent = rawContent.trim();
    if (checkContent.startsWith('```')) {
      checkContent = checkContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '').trim();
    }
    const firstBrace = checkContent.indexOf('{');
    const lastBrace = checkContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = checkContent.substring(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(jsonCandidate);
        rawContent = parsed.reply || parsed.content || parsed.message || parsed.text || parsed.answer || '';
        
        if (parsed.responseType && !responseType) responseType = parsed.responseType;
        if (parsed.summary && !summary) summary = parsed.summary;
        if (Array.isArray(parsed.keyPoints) && (!keyPoints || !keyPoints.length)) keyPoints = parsed.keyPoints;
        if (Array.isArray(parsed.expandableSections) && (!expandableSections || !expandableSections.length)) expandableSections = parsed.expandableSections;
        if (Array.isArray(parsed.sections) && (!sections || !sections.length)) sections = parsed.sections;
        if (Array.isArray(parsed.suggestedActions) && (!suggestedActions || !suggestedActions.length)) suggestedActions = parsed.suggestedActions;
        if (parsed.structuredData && !structuredData) structuredData = parsed.structuredData;
      } catch (e) {
        // Fallback regex extraction if JSON.parse fails (e.g. truncated or malformed JSON string)
        const extReply = extractFieldFromRawJson(checkContent, 'reply') || extractFieldFromRawJson(checkContent, 'content');
        const extSummary = extractFieldFromRawJson(checkContent, 'summary');
        const extType = extractFieldFromRawJson(checkContent, 'responseType');
        if (extReply || extSummary) {
          rawContent = extReply || '';
          if (extSummary && !summary) summary = extSummary;
          if (extType && !responseType) responseType = extType;
        }
      }
    } else if (checkContent.includes('"reply"') || checkContent.includes('"responseType"')) {
      const extReply = extractFieldFromRawJson(checkContent, 'reply') || extractFieldFromRawJson(checkContent, 'content');
      const extSummary = extractFieldFromRawJson(checkContent, 'summary');
      const extType = extractFieldFromRawJson(checkContent, 'responseType');
      if (extReply || extSummary) {
        rawContent = extReply || '';
        if (extSummary && !summary) summary = extSummary;
        if (extType && !responseType) responseType = extType;
      }
    }

    // Safety net: If rawContent STILL looks like a raw JSON string (e.g. truncated JSON object), extract readable text
    if (rawContent && typeof rawContent === 'string' && (rawContent.trim().startsWith('{') || rawContent.includes('"responseType":'))) {
      const extReply = extractFieldFromRawJson(rawContent, 'reply') || extractFieldFromRawJson(rawContent, 'content') || extractFieldFromRawJson(rawContent, 'summary');
      if (extReply) {
        rawContent = extReply;
      } else {
        // Remove JSON syntax wrapper keys if regex couldn't capture closed quotes
        rawContent = rawContent
          .replace(/^{\s*"responseType":\s*"[^"]*",?/i, '')
          .replace(/"summary":\s*"([^"]*)",?/gi, '$1\n')
          .replace(/"keyPoints":\s*\[[\s\S]*?\],?/gi, '')
          .replace(/"reply":\s*"/i, '')
          .replace(/"expandableSections":\s*\[[\s\S]*$/i, '')
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .trim();
      }
    }
  }

  // Fallback default message if empty
  if (!rawContent && !sections.length && !summary) {
    rawContent = "I am ready to help you with your career goals.";
  }

  // Classify response type if missing
  const classifiedType = classifyResponseType(userQuery, rawContent, { responseType });

  // Smart Auto-Chunking if summary or expandableSections are missing
  const parsedStruct = parseRawMarkdownStructure(rawContent, classifiedType);

  const finalSummary = summary || parsedStruct.summary;
  const finalKeyPoints = keyPoints.length > 0 ? keyPoints : parsedStruct.keyPoints;
  const finalExpandableSections = expandableSections.length > 0 ? expandableSections : parsedStruct.expandableSections;
  const finalContent = parsedStruct.mainContent || rawContent;

  return createNormalizedMessage({
    role: 'assistant',
    content: finalContent,
    responseType: classifiedType,
    summary: finalSummary,
    keyPoints: finalKeyPoints,
    expandableSections: finalExpandableSections,
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

  let lastUserQuery = '';

  return rawMessages.map(msg => {
    if (msg.role === 'user') {
      lastUserQuery = msg.content || '';
      return createNormalizedMessage({
        id: msg._id || msg.id,
        role: 'user',
        content: msg.content || '',
        timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
        status: 'complete'
      });
    }

    // Assistant message
    return normalizeCopilotResponse(msg, lastUserQuery);
  });
}
