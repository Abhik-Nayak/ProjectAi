import { randomUUID } from "crypto";
import type { Conversation, Message } from "../types/index.js";

const conversations = new Map<string, Conversation>();

export function createConversation(): Conversation {
  const conversation: Conversation = {
    id: randomUUID(),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  conversations.set(conversation.id, conversation);
  return conversation;
}

export function getConversation(id: string): Conversation | undefined {
  return conversations.get(id);
}

export function addMessage(conversationId: string, message: Message): void {
  const conversation = conversations.get(conversationId);
  if (!conversation) throw new Error(`Conversation ${conversationId} not found`);
  conversation.messages.push(message);
  conversation.updatedAt = Date.now();
}

export function getMessages(conversationId: string): Message[] {
  const conversation = conversations.get(conversationId);
  if (!conversation) throw new Error(`Conversation ${conversationId} not found`);
  return conversation.messages;
}

export function listConversations(): Conversation[] {
  return Array.from(conversations.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
}

export function deleteConversation(id: string): boolean {
  return conversations.delete(id);
}
