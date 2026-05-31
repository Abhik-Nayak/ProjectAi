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
