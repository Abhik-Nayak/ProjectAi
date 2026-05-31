# Exercise 2 — Token Logging & Cost Tracking

## Why AI Apps Become Expensive

### The Hidden Cost: Conversation History

Every OpenAI API call sends the **entire conversation history** as input (prompt tokens). This means:

```
Message 1:  "Hi"                          →  ~50 prompt tokens
Message 2:  "What is TypeScript?"         →  ~120 prompt tokens (msg1 + msg2 + system)
Message 3:  "How does it compare to JS?"  →  ~350 prompt tokens (msg1 + msg2 + reply1 + msg3)
Message 5:  ...                           →  ~1,200 prompt tokens
Message 10: ...                           →  ~3,000+ prompt tokens
Message 20: ...                           →  ~8,000+ prompt tokens
```

**The cost grows O(n²) over a conversation** — not linear. Each new message resends everything before it.

### What You're Paying For

| Token Type         | What It Is                                      | GPT-4o-mini Price   |
|--------------------|--------------------------------------------------|---------------------|
| **Prompt tokens**  | System prompt + full chat history + user message | $0.15 / 1M tokens  |
| **Completion tokens** | The AI's response                             | $0.60 / 1M tokens  |

- Streaming does NOT save money — it costs the same, just delivers tokens faster
- The system prompt (`"You are a helpful AI assistant."`) is re-sent every single call
- Longer AI replies = more completion tokens = more cost

### Real-World Example

A production chatbot with 1,000 daily users:
- Average 10 messages per conversation
- ~2,000 prompt tokens + ~500 completion tokens per message
- = ~25,000 tokens per conversation
- = 25M tokens/day
- = **$3.75/day prompt + $15/day completion = ~$18.75/day = ~$562/month**

Without logging, you'd have no idea why your bill is $562.

---

## When Token Logging Matters

| Scenario | Why You Need It |
|----------|-----------------|
| **Cost monitoring** | Track spend per request, per user, per day |
| **Bill spike debugging** | "Why did this month's bill go from $50 to $500?" |
| **User budgets** | Cap tokens per user/org to prevent abuse |
| **Optimization decisions** | Know if summarization or truncation would save money |
| **Pricing your product** | Calculate per-user cost to set SaaS pricing |
| **Alerting** | Get notified when daily spend exceeds threshold |

---

## How Real Companies Handle This

1. **Log every request** — prompt tokens, completion tokens, cost, model, timestamp
2. **Calculate cost per request** — using model-specific pricing
3. **Set budgets** — per-user, per-conversation, per-day limits
4. **Truncate history** — keep only last N messages, or max K tokens
5. **Summarize old context** — replace old messages with a summary to save tokens
6. **Dashboard** — daily/weekly spend charts, top users by cost, cost per feature

---

## Implementation Plan

### Files to Modify (3 files)

```
src/types/index.ts        ← Add TokenUsage interface
src/services/openai.ts    ← Extract usage from responses, calculate cost, console.log
src/routes/chat.ts        ← Return usage in API responses
```

---

### Step 1: Add `TokenUsage` type

**File:** `src/types/index.ts`
**Where:** Add at the bottom, after `ChatResponse`

```ts
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
}
```

---

### Step 2: Add cost calculator + update `getChatCompletion`

**File:** `src/services/openai.ts`
**Where:** Add pricing constant and helper function after the `SYSTEM_PROMPT` declaration

```ts
import type { Message, TokenUsage } from "../types/index.js";

// GPT-4o-mini pricing (per 1M tokens) — update if you switch models
const PRICING = {
  input: 0.15,   // $0.15 per 1M input tokens
  output: 0.60,  // $0.60 per 1M output tokens
};

function calculateCost(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1_000_000) * PRICING.input;
  const outputCost = (completionTokens / 1_000_000) * PRICING.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}
```

**Then update `getChatCompletion` — change return type and add logging:**

Current code returns `string`. Change it to return `{ content: string; usage: TokenUsage }`.

```ts
export async function getChatCompletion(
  messages: Message[]
): Promise<{ content: string; usage: TokenUsage }> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [SYSTEM_PROMPT, ...messages],
    temperature: 0.7,
    max_tokens: 1024,
  });

  const usage = response.usage;
  const tokenUsage: TokenUsage = {
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
    costUSD: calculateCost(usage?.prompt_tokens ?? 0, usage?.completion_tokens ?? 0),
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
```

---

### Step 3: Update `streamChatCompletion`

**File:** `src/services/openai.ts`
**What changes:**

1. Add `stream_options: { include_usage: true }` to the API call
2. Add a new callback parameter `onUsage`
3. Capture usage from the final stream chunk
4. Log it to console

```ts
export async function streamChatCompletion(
  messages: Message[],
  onToken: (token: string) => void,
  onUsage: (usage: TokenUsage) => void,       // ← NEW parameter
  onDone: () => void
): Promise<string> {
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [SYSTEM_PROMPT, ...messages],
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
    stream_options: { include_usage: true },   // ← NEW option
  });

  let fullResponse = "";
  let tokenUsage: TokenUsage | null = null;

  for await (const chunk of stream) {
    // The final chunk contains usage data (no content)
    if (chunk.usage) {
      tokenUsage = {
        promptTokens: chunk.usage.prompt_tokens ?? 0,
        completionTokens: chunk.usage.completion_tokens ?? 0,
        totalTokens: chunk.usage.total_tokens ?? 0,
        costUSD: calculateCost(
          chunk.usage.prompt_tokens ?? 0,
          chunk.usage.completion_tokens ?? 0
        ),
      };
      console.log("[Token Usage - Stream]", {
        model: "gpt-4o-mini",
        ...tokenUsage,
      });
    }

    const token = chunk.choices[0]?.delta?.content ?? "";
    if (token) {
      fullResponse += token;
      onToken(token);
    }
  }

  if (tokenUsage) onUsage(tokenUsage);
  onDone();
  return fullResponse;
}
```

---

### Step 4: Update non-streaming route

**File:** `src/routes/chat.ts`
**Where:** `router.post("/", ...)` handler

Change this line:
```ts
const reply = await getChatCompletion(history);
```

To:
```ts
const { content: reply, usage } = await getChatCompletion(history);
```

And update the response:
```ts
res.json({ conversationId: convId, reply, usage });
```

---

### Step 5: Update streaming route

**File:** `src/routes/chat.ts`
**Where:** `router.post("/stream", ...)` handler

Add `onUsage` callback (the new 3rd parameter):

```ts
const fullReply = await streamChatCompletion(
  history,
  (token) => {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  },
  (usage) => {                                                    // ← NEW
    res.write(`data: ${JSON.stringify({ usage })}\n\n`);          // ← NEW
  },                                                              // ← NEW
  () => {
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
);
```

---

## What You'll See After Changes

### Console Output (Backend Terminal)

```
[Token Usage] {
  model: 'gpt-4o-mini',
  promptTokens: 52,
  completionTokens: 184,
  totalTokens: 236,
  costUSD: 0.000118
}
```

### Non-Streaming API Response

```json
{
  "conversationId": "abc-123",
  "reply": "TypeScript is a typed superset of JavaScript...",
  "usage": {
    "promptTokens": 52,
    "completionTokens": 184,
    "totalTokens": 236,
    "costUSD": 0.000118
  }
}
```

### Streaming SSE Events

```
data: {"conversationId":"abc-123"}
data: {"token":"Type"}
data: {"token":"Script"}
data: {"token":" is"}
...
data: {"usage":{"promptTokens":52,"completionTokens":184,"totalTokens":236,"costUSD":0.000118}}
data: [DONE]
```

---

## Verification Checklist

- [ ] Start backend: `npm run dev`
- [ ] Send a non-streaming request → check console for `[Token Usage]` log
- [ ] Check JSON response includes `usage` object
- [ ] Send a streaming request → check console for `[Token Usage - Stream]` log
- [ ] Check SSE stream includes `usage` event before `[DONE]`
- [ ] Send 5+ messages in the same conversation → **watch `promptTokens` grow** each turn
- [ ] This growth is the core lesson: this is why AI apps get expensive

---

## The "Aha" Moment

After implementing, send 5 messages in one conversation and watch the console:

```
Message 1: promptTokens: 24    completionTokens: 150   cost: $0.000094
Message 2: promptTokens: 195   completionTokens: 120   cost: $0.000101
Message 3: promptTokens: 380   completionTokens: 200   cost: $0.000177
Message 4: promptTokens: 610   completionTokens: 180   cost: $0.000200
Message 5: promptTokens: 850   completionTokens: 160   cost: $0.000224
```

Prompt tokens keep climbing — you're paying to resend the entire history every time.
