"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import {
  type Message,
  type Conversation,
  checkHealth,
  sendMessage,
  streamMessage,
  fetchConversations,
  fetchConversation,
  deleteConversation,
} from "@/lib/api";

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function loadConversations() {
    try {
      const convs = await fetchConversations();
      setConversations(convs);
    } catch {
      console.error("Failed to load conversations");
    }
  }

  useEffect(() => {
    loadConversations();

    checkHealth().then(setHealthy);
    const interval = setInterval(() => {
      checkHealth().then(setHealthy);
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function handleSelectConversation(id: string) {
    try {
      const conv = await fetchConversation(id);
      setActiveId(conv.id);
      setMessages(conv.messages.filter((m) => (m.role as string) !== "system"));
    } catch {
      console.error("Failed to load conversation");
    }
  }

  function handleNewChat() {
    setActiveId(null);
    setMessages([]);
  }

  async function handleDeleteConversation(id: string) {
    try {
      await deleteConversation(id);
      if (activeId === id) handleNewChat();
      await loadConversations();
    } catch {
      console.error("Failed to delete conversation");
    }
  }

  async function handleSendNonStreaming(content: string) {
    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const { conversationId, reply } = await sendMessage(content, activeId ?? undefined);
      setActiveId(conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    }

    setLoading(false);
    await loadConversations();
  }

  async function handleSendStreaming(content: string) {
    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    let currentId = activeId;

    try {
      await streamMessage(
        content,
        currentId ?? undefined,
        (id) => {
          currentId = id;
          setActiveId(id);
        },
        (token) => {
          assistantMessage.content += token;
          setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
        },
        () => {}
      );
    } catch {
      assistantMessage.content = "Something went wrong. Please try again.";
      setMessages((prev) => [...prev.slice(0, -1), { ...assistantMessage }]);
    }

    setLoading(false);
    await loadConversations();
  }

  function handleSend(content: string) {
    if (useStreaming) {
      handleSendStreaming(content);
    } else {
      handleSendNonStreaming(content);
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        healthy={healthy}
        streaming={useStreaming}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        onToggleStreaming={() => setUseStreaming((prev) => !prev)}
      />

      <main className="flex flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center pt-40">
                <div className="text-center text-gray-500">
                  <h1 className="mb-2 text-2xl font-semibold text-gray-300">
                    AI Chat
                  </h1>
                  <p>Start a conversation by sending a message below.</p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => <ChatMessage key={i} message={msg} />)
            )}
          </div>
        </div>

        <ChatInput onSend={handleSend} disabled={loading} />
      </main>
    </div>
  );
}
