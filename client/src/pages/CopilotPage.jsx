import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { copilotApi } from '../api/career';
import { useCopilotChat } from '../hooks/useCopilotChat';
import { CopilotShell } from '../components/copilot/CopilotShell';
import { RenameModal, DeleteModal, ClearAllModal } from '../components/copilot/CopilotModals';
import { toast } from '../context/ToastContext';

export function CopilotPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isSharedView = !!token;
  const lastHandledPromptRef = useRef(null);

  const {
    conversations,
    activeConversation,
    messages,
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
  } = useCopilotChat();

  const [input, setInput] = useState('');
  const [renameTarget, setRenameTarget] = useState(null); // { id, title }
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }
  const [showClearAll, setShowClearAll] = useState(false);

  // Initial load
  useEffect(() => {
    if (isSharedView) {
      loadSharedConversation();
    } else {
      loadConversations();
    }
  }, [token]);

  // Handle incoming initialPrompt from Projects or Preparation Pages
  useEffect(() => {
    const promptText = location.state?.initialPrompt;
    if (promptText && !isSharedView && lastHandledPromptRef.current !== promptText) {
      lastHandledPromptRef.current = promptText;
      navigate(location.pathname, { replace: true, state: {} });
      sendMessage(promptText);
    }
  }, [location.state, isSharedView, navigate, sendMessage]);

  const loadSharedConversation = async () => {
    try {
      const res = await copilotApi.getSharedConversation(token);
      const conv = res?.data;
      if (!conv) throw new Error("Shared conversation not found");
      selectConversation(conv._id);
    } catch (err) {
      toast.error("Shared conversation not found or access denied.");
    }
  };

  const handleOpenRename = (id) => {
    const conv = conversations.find(c => c._id === id);
    if (conv) {
      setRenameTarget({ id: conv._id, title: conv.title || '' });
    }
  };

  const handleSaveRename = async (newTitle) => {
    if (!renameTarget) return;
    try {
      await copilotApi.renameConversation(renameTarget.id, newTitle.trim());
      toast.success("Conversation renamed.");
      setRenameTarget(null);
      loadConversations();
    } catch (err) {
      toast.error("Failed to rename conversation.");
    }
  };

  const handleOpenDelete = (id) => {
    const conv = conversations.find(c => c._id === id);
    if (conv) {
      setDeleteTarget({ id: conv._id, title: conv.title || '' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await copilotApi.deleteConversation(deleteTarget.id);
      if (activeConversation?._id === deleteTarget.id) {
        startNewChat();
      }
      toast.success("Conversation deleted.");
      setDeleteTarget(null);
      loadConversations();
    } catch (err) {
      toast.error("Failed to delete conversation.");
    }
  };

  const handleConfirmClearAll = async () => {
    try {
      await clearAllConversations();
      toast.success("All conversations cleared.");
      setShowClearAll(false);
    } catch (err) {
      toast.error("Failed to clear conversations.");
    }
  };

  const handleShare = async (id) => {
    try {
      const res = await copilotApi.shareConversation(id);
      const data = res?.data || res;
      const shareToken = data?.shareToken;
      if (!shareToken) throw new Error("No share token received");
      const url = `${window.location.origin}/copilot/shared/${shareToken}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to generate share link.");
    }
  };

  return (
    <>
      <CopilotShell
        conversations={conversations}
        activeConversation={activeConversation}
        messages={messages}
        isLoading={isLoading}
        error={error}
        input={input}
        setInput={setInput}
        pinnedIds={pinnedIds}
        onSendMessage={sendMessage}
        onRetry={retryLastMessage}
        onSelectPrompt={(p) => sendMessage(p)}
        onSelectConversation={selectConversation}
        onNewChat={() => {
          if (isSharedView) navigate('/copilot');
          else startNewChat();
        }}
        onRename={handleOpenRename}
        onDelete={handleOpenDelete}
        onShare={handleShare}
        onTogglePin={togglePinConversation}
        onExportChat={exportConversation}
        onClearAll={() => setShowClearAll(true)}
        onEditUserPrompt={editAndResendMessage}
        isSharedView={isSharedView}
      />

      {/* Modern Inline Modals */}
      <RenameModal
        isOpen={!!renameTarget}
        initialTitle={renameTarget?.title || ''}
        onSave={handleSaveRename}
        onClose={() => setRenameTarget(null)}
      />

      <DeleteModal
        isOpen={!!deleteTarget}
        conversationTitle={deleteTarget?.title || ''}
        onDelete={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ClearAllModal
        isOpen={showClearAll}
        onConfirm={handleConfirmClearAll}
        onClose={() => setShowClearAll(false)}
      />
    </>
  );
}
