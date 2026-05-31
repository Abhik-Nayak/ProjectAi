import OpenAI from "openai";
import type { Message } from "../types/index.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT: Message = {
  role: "system",
  content: "You are a helpful AI assistant.",
};

export async function getChatCompletion(messages: Message[]): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [SYSTEM_PROMPT, ...messages],
    temperature: 0.7,
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content ?? "";
}

// streaming support code.
export async function streamChatCompletion(
  messages: Message[],
  onToken: (token: string) => void,
  onDone: () => void,
): Promise<string> {
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [SYSTEM_PROMPT, ...messages],
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? "";
    if (token) {
      fullResponse += token;
      onToken(token);
    }
  }

  onDone();
  return fullResponse;
}
