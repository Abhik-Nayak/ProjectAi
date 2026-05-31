"use client";

import { useState } from "react";
import type { Conversation } from "@/lib/api";

function ConversationItem({
  conv,
  isActive,
  onSelect,
  onDelete,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const preview =
    conv.messages.find((m) => m.role === "user")?.content || "New chat";

  return (
    <div
      className={`my-1 flex items-center rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
        isActive ? "bg-gray-700" : "hover:bg-gray-800"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="flex-1 truncate">{preview}</span>
      {hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-2 text-red-400 hover:text-red-300"
        >
          ✕
        </button>
      )}
    </div>
  );
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  healthy: boolean | null;
  streaming: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onToggleStreaming: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  healthy,
  streaming,
  onSelect,
  onNew,
  onDelete,
  onToggleStreaming,
}: SidebarProps) {

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-700 bg-gray-950">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full rounded-md border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
        >
          + New Chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            isActive={conv.id === activeId}
            onSelect={() => onSelect(conv.id)}
            onDelete={() => onDelete(conv.id)}
          />
        ))}
      </nav>

      <div className="border-t border-gray-700 p-3 space-y-3">
        <button
          onClick={onToggleStreaming}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs hover:bg-gray-800 transition-colors"
        >
          <span className="text-gray-400">Stream mode</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              streaming
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            {streaming ? "ON" : "OFF"}
          </span>
        </button>

        <div className="flex items-center gap-2 px-3 text-xs text-gray-400">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              healthy === null
                ? "bg-gray-500"
                : healthy
                  ? "bg-green-500"
                  : "bg-red-500"
            }`}
          />
          <span>
            API {healthy === null ? "checking..." : healthy ? "connected" : "offline"}
          </span>
        </div>
      </div>
    </aside>
  );
}
