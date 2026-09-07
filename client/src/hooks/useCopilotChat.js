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

  return {
    conversations,
    activeConversation,
    messages,
    suggestedActions,
    isLoading,
    error,
    sendMessage,
    retryLastMessage,
    startNewChat,
    selectConversation,
    loadConversations
  };
}
