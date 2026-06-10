"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Loader2, MessageCircle, ImagePlus } from "lucide-react";
import { fetchJson } from "@/lib/fetch-client";
import { SafetyActions } from "@/components/SafetyActions";

interface ChatPanelProps {
  bookingId?: string;
  enabled: boolean;
  otherUserId?: string;
  rideId?: string;
}

interface Message {
  id: string;
  content: string;
  imageUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
  sender: { id: string; name: string };
}

export function ChatPanel({ bookingId, enabled, otherUserId, rideId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const query = bookingId ? `bookingId=${bookingId}` : "";

  useEffect(() => {
    if (!enabled || !query) return;

    async function load() {
      setLoading(true);
      const { data } = await fetchJson<{ messages: Message[] }>(`/api/messages?${query}`);
      setMessages(data?.messages ?? []);
      setLoading(false);
    }

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [enabled, query]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!enabled) {
    return (
      <div className="bg-gray-50 rounded-xl border p-6 text-center">
        <MessageCircle className="w-8 h-8 text-muted mx-auto mb-2" />
        <p className="text-sm text-muted">Chat unlocks after successful payment</p>
      </div>
    );
  }

  async function sendMessage(imageUrl?: string, text?: string) {
    const body = text ?? content.trim();
    if (!body && !imageUrl) return;

    setSending(true);
    const { data, ok } = await fetchJson<{ message: Message }>("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, content: body || "[Image]", imageUrl }),
    });

    if (ok && data?.message) {
      setMessages((prev) => [...prev, data.message]);
      setContent("");
    }
    setSending(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", "chat_image");
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (data.file?.url) {
      await sendMessage(data.file.url, "[Photo]");
    }
  }

  return (
    <div className="bg-white rounded-xl border flex flex-col h-96">
      <div className="px-4 py-3 border-b font-medium text-sm text-gray-900 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-brand-600" />
          Chat
        </span>
        {otherUserId && (
          <SafetyActions reportedUserId={otherUserId} rideId={rideId} bookingId={bookingId} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="font-medium text-gray-900">{msg.sender.name}: </span>
              {msg.imageUrl ? (
                <a href={msg.imageUrl} target="_blank" rel="noreferrer" className="block mt-1">
                  <img src={msg.imageUrl} alt="Shared" className="max-w-[200px] rounded-lg border" />
                </a>
              ) : (
                <span className="text-gray-600">{msg.content}</span>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-lg border text-gray-600 hover:bg-gray-50"
        >
          <ImagePlus className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="p-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
