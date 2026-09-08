import { useState, useCallback, useRef } from 'react';
import { copilotApi } from '../api/career';
import {
  createNormalizedMessage,
  normalizeCopilotResponse,
  normalizeConversationMessages
} from '../utils/copilotMessageNormalizer';
import { normalizeCopilotError } from '../utils/copilotErrorNormalizer';

export function useCopilotChat({ initialConversationId = null } = {}) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Store the last attempted user query for single-click retry
  const lastUserQueryRef = useRef('');

  const loadConversations = useCallback(async () => {
    try {
      const res = await copilotApi.getConversations();
      const list = Array.isArray(res?.data) ? res.data : [];
      setConversations(list);
      return list;
    } catch (err) {
      console.error("[useCopilotChat] Failed to load conversations:", err);
      setConversations([]);
      return [];
    }
  }, []);

  const selectConversation = useCallback(async (id) => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await copilotApi.getConversation(id);
      const conv = res?.data;
      if (!conv) throw new Error("Invalid conversation");
      
      setActiveConversation(conv);
      const normMsgs = normalizeConversationMessages(conv.messages || []);
      setMessages(normMsgs);
      setSuggestedActions([]);
    } catch (err) {
      const normErr = normalizeCopilotError(err);
      setError(normErr);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewChat = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
    setSuggestedActions([]);
    setError(null);
    lastUserQueryRef.current = '';
  }, []);

  const sendMessage = useCallback(async (text) => {
    const query = (text || '').trim();
    if (!query || isLoading) return;

    lastUserQueryRef.current = query;
    setError(null);

    // Append user message immediately
    const userMsg = createNormalizedMessage({
      role: 'user',
      content: query,
      status: 'complete'
    });

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let activeId = activeConversation?._id;

      if (!activeId) {
        const createRes = await copilotApi.createConversation(query.slice(0, 30) || "Career Chat");
        const newConv = createRes?.data;
        activeId = newConv?._id;
        if (!activeId) throw new Error("Failed to create conversation session");
        setActiveConversation(newConv);
      }

      const sendRes = await copilotApi.sendMessage(activeId, query);
      const normAssistantMsg = normalizeCopilotResponse(sendRes?.data, query);

      setMessages(prev => [...prev, normAssistantMsg]);
      setSuggestedActions(normAssistantMsg.suggestedActions || []);

      // Refresh sidebar list in background
      loadConversations();
    } catch (err) {
      const normErr = normalizeCopilotError(err);
      setError(normErr);

      // Append an error assistant message so user can click [ Retry ]
      const errorAssistantMsg = createNormalizedMessage({
        role: 'assistant',
        content: normErr.userFriendlyMessage,
        status: 'error',
        errorCode: normErr.errorCode
      });

      setMessages(prev => [...prev, errorAssistantMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [activeConversation, isLoading, loadConversations]);

  const retryLastMessage = useCallback(async () => {
    const queryToRetry = lastUserQueryRef.current;
    if (!queryToRetry || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Remove the trailing error message if it exists
    setMessages(prev => {
      if (prev.length > 0 && prev[prev.length - 1].status === 'error') {
        return prev.slice(0, -1);
      }
      return prev;
    });

    try {
      let activeId = activeConversation?._id;
      if (!activeId) {
        const createRes = await copilotApi.createConversation(queryToRetry.slice(0, 30) || "Career Chat");
        const newConv = createRes?.data;
        activeId = newConv?._id;
        if (!activeId) throw new Error("Failed to create conversation");
        setActiveConversation(newConv);
      }

      const sendRes = await copilotApi.sendMessage(activeId, queryToRetry);
      const normAssistantMsg = normalizeCopilotResponse(sendRes?.data, queryToRetry);

      setMessages(prev => [...prev, normAssistantMsg]);
      setSuggestedActions(normAssistantMsg.suggestedActions || []);
      loadConversations();
    } catch (err) {
      const normErr = normalizeCopilotError(err);
      setError(normErr);

      const errorAssistantMsg = createNormalizedMessage({
        role: 'assistant',
        content: normErr.userFriendlyMessage,
        status: 'error',
        errorCode: normErr.errorCode
      });

      setMessages(prev => [...prev, errorAssistantMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [activeConversation, isLoading, loadConversations]);

  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('copilot_pinned_convs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const togglePinConversation = useCallback((id) => {
    if (!id) return;
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem('copilot_pinned_convs', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const exportConversation = useCallback(async (id) => {
    const conv = conversations.find(c => c._id === id) || activeConversation;
    const title = conv?.title || "CareerPilot Chat";
    let exportMsgs = messages;

    if (id && activeConversation?._id !== id) {
      try {
        const res = await copilotApi.getConversation(id);
        const data = res?.data || res;
        exportMsgs = normalizeConversationMessages(data?.messages || []);
      } catch {
        // fallback to current messages
      }
    }

    let md = `# CareerPilot Copilot: ${title}\n*Exported on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
    exportMsgs.forEach(m => {
      if (m.role === 'user') {
        md += `### 👤 User:\n${m.content}\n\n`;
      } else {
        md += `### 🤖 CareerPilot:\n`;
        if (m.summary) md += `**Summary**: ${m.summary}\n\n`;
        if (m.content) md += `${m.content}\n\n`;
        if (m.keyPoints?.length) {
          md += `**Key Points**:\n${m.keyPoints.map(k => `- ${k}`).join('\n')}\n\n`;
        }
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [conversations, activeConversation, messages]);

  const editAndResendMessage = useCallback((msgIndex, newText) => {
    if (msgIndex < 0 || !newText.trim() || isLoading) return;
    setMessages(prev => prev.slice(0, msgIndex));
    sendMessage(newText);
  }, [isLoading, sendMessage]);

  const clearAllConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      await Promise.all((conversations || []).map(c => copilotApi.deleteConversation(c._id).catch(() => {})));
      startNewChat();
      loadConversations();
    } catch (err) {
      console.error("[useCopilotChat] Failed to clear all conversations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [conversations, startNewChat, loadConversations]);

  return {
    conversations,
    activeConversation,
    messages,
    suggestedActions,
    isLoading,
    error,
    pinnedIds,
    sendMessage,
    retryLastMessage,
    startNewChat,
    selectConversation,
    loadConversations,
    togglePinConversation,
    exportConversation,
    editAndResendMessage,
    clearAllConversations
  };
}
