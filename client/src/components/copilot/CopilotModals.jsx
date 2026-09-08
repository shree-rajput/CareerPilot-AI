import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

export function RenameModal({ isOpen, initialTitle = '', onSave, onClose }) {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 relative">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Edit2 size={16} />
            <span>Rename Conversation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-bg-secondary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) {
              onSave(title.trim());
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Conversation Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. EdTech Project Prep"
              autoFocus
              className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!title.trim()}
              className="rounded-xl"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteModal({ isOpen, conversationTitle = '', onDelete, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-text text-sm m-0">Delete Conversation?</h3>
            <p className="text-xs text-text-muted m-0 mt-0.5">
              This will permanently remove <span className="font-semibold text-text">"{conversationTitle || 'this chat'}"</span> and its history.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onDelete}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
          >
            Delete Chat
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ClearAllModal({ isOpen, onConfirm, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-text text-sm m-0">Clear All Conversations?</h3>
            <p className="text-xs text-text-muted m-0 mt-0.5">
              This will permanently delete all your conversation history. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
          >
            Clear All History
          </Button>
        </div>
      </div>
    </div>
  );
}
