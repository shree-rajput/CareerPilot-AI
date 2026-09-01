import React, { useState, useEffect, useRef } from "react";
import { X, Send, User, MessageSquare, Clock } from "lucide-react";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import api from "../../api/axios";

export function MentorMessagingModal({ recipient, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const recipientId = recipient?._id || recipient?.userId || recipient?.mentorId;

  useEffect(() => {
    if (recipientId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 4000); // Polling every 4 seconds
      return () => clearInterval(interval);
    }
  }, [recipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${recipientId}`);
      setMessages(res.data.data || []);
      // Mark read
      api.patch(`/messages/${recipientId}/read`).catch(() => {});
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    try {
      setSending(true);
      const res = await api.post("/messages", {
        receiverId: recipientId,
        text: inputText
      });

      setMessages((prev) => [...prev, res.data.data]);
      setInputText("");
    } catch (err) {
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  if (!recipient) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col h-[520px] overflow-hidden">
        
        {/* Header */}
        <div className="bg-bg-secondary p-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs">
              {recipient.name?.slice(0, 2)?.toUpperCase() || "CP"}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-text m-0">{recipient.name}</h3>
              <span className="text-[10px] text-text-secondary font-semibold block">Direct CareerPilot Message</span>
            </div>
          </div>
          <Button variant="ghost" size="xs" onClick={onClose} className="p-1 text-text-secondary hover:text-text">
            <X size={18} />
          </Button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3 bg-bg/50">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="md" className="text-primary" />
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => {
              const isMine = msg.senderId !== recipientId;
              return (
                <div
                  key={msg._id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed font-medium ${
                      isMine
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-surface border border-border text-text rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-text-secondary font-mono mt-1 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-secondary gap-2 text-center p-6">
              <MessageSquare size={32} className="opacity-30" />
              <p className="text-xs font-semibold m-0">No messages yet. Send a direct message to start the conversation.</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-border bg-surface flex items-center gap-2">
          <input
            type="text"
            required
            placeholder="Type your message..."
            className="flex-1 bg-bg border border-border text-xs font-semibold text-text p-2.5 rounded-xl outline-none focus:border-primary"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <Button type="submit" variant="primary" size="sm" disabled={sending} className="font-bold gap-1 rounded-xl">
            <Send size={14} /> Send
          </Button>
        </form>

      </div>
    </div>
  );
}
