import OpenAI from "openai";
import type { Message, TokenUsage } from "../types/index.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT: Message = {
  role: "system",
  content: "You are a helpful AI assistant.",
};

// GPT-4o-mini pricing (per 1M tokens) — update if you switch models
const PRICING = {
  input: 0.15, // $0.15 per 1M input tokens
  output: 0.6, // $0.60 per 1M output tokens
};

function calculateCost(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1_000_000) * PRICING.input;
  const outputCost = (completionTokens / 1_000_000) * PRICING.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

export async function getChatCompletion(messages: Message[]): Promise<{ content: string; usage: TokenUsage; }> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [SYSTEM_PROMPT, ...messages],
    temperature: 0.7,
    max_tokens: 1024,
  });

  // return response.choices[0]?.message?.content ?? "";

  const usage = response.usage;
  const tokenUsage: TokenUsage = {
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
    costUSD: calculateCost(
      usage?.prompt_tokens ?? 0,
      usage?.completion_tokens ?? 0,
    ),
  };

  console.log("[Token Usage]", {
    model: "gpt-4o-mini",
    ...tokenUsage,
  });

  return {
    content: response.choices[0]?.message?.content ?? "",
    usage: tokenUsage,
  };
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
