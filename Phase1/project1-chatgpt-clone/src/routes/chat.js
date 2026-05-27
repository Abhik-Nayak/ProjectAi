const { Router } = require("express");
const OpenAI = require("openai");
const { PromptBuilder } = require("../lib/promptBuilder");
const { ConversationMemory } = require("../lib/conversationMemory");
const { TokenTracker } = require("../lib/tokenTracker");

const router = Router();

let openai;
function getOpenAI() {
  if (!openai) openai = new OpenAI();
  return openai;
}

const memory = new ConversationMemory();
const tokenTracker = new TokenTracker();
const promptBuilder = new PromptBuilder();

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS_PER_CONVERSATION || "4096", 10);

// POST /api/chat — streaming chat endpoint
router.post("/", async (req, res) => {
  const { message, sessionId, stream = true, systemPrompt } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message is required and must be a non-empty string" });
  }

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId is required" });
  }

  if (tokenTracker.isOverLimit(sessionId, MAX_TOKENS)) {
    return res.status(429).json({
      error: "Token limit exceeded for this conversation",
      usage: tokenTracker.getUsage(sessionId),
    });
  }

  if (systemPrompt) {
    promptBuilder.setSystemPrompt(systemPrompt);
  }

  const history = memory.getHistory(sessionId);
  const messages = promptBuilder.build(history, message);
  const promptTokens = tokenTracker.countMessagesTokens(messages);

  try {
    if (stream) {
      return await handleStreamingResponse(req, res, messages, sessionId, message, promptTokens);
    }
    return await handleNonStreamingResponse(req, res, messages, sessionId, message, promptTokens);
  } catch (err) {
    return handleApiError(res, err);
  }
});

async function handleStreamingResponse(req, res, messages, sessionId, userMessage, promptTokens) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const stream = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages,
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  memory.addMessage(sessionId, "user", userMessage);
  memory.addMessage(sessionId, "assistant", fullResponse);

  const completionTokens = tokenTracker.countTokens(fullResponse);
  tokenTracker.trackUsage(sessionId, promptTokens, completionTokens);

  res.write(`data: ${JSON.stringify({ done: true, usage: tokenTracker.getUsage(sessionId) })}\n\n`);
  res.end();
}

async function handleNonStreamingResponse(req, res, messages, sessionId, userMessage, promptTokens) {
  const completion = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages,
  });

  const assistantMessage = completion.choices[0].message.content;

  memory.addMessage(sessionId, "user", userMessage);
  memory.addMessage(sessionId, "assistant", assistantMessage);

  const completionTokens = completion.usage?.completion_tokens || tokenTracker.countTokens(assistantMessage);
  const actualPromptTokens = completion.usage?.prompt_tokens || promptTokens;
  tokenTracker.trackUsage(sessionId, actualPromptTokens, completionTokens);

  res.json({
    message: assistantMessage,
    usage: tokenTracker.getUsage(sessionId),
  });
}

function handleApiError(res, err) {
  if (res.headersSent) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    return res.end();
  }

  if (err instanceof OpenAI.RateLimitError) {
    return res.status(429).json({ error: "Rate limited by OpenAI. Try again later." });
  }
  if (err instanceof OpenAI.AuthenticationError) {
    return res.status(401).json({ error: "Invalid OpenAI API key." });
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return res.status(502).json({ error: "Could not connect to OpenAI." });
  }
  if (err.code === "context_length_exceeded") {
    return res.status(413).json({ error: "Conversation too long. Start a new session." });
  }

  console.error("Chat error:", err.message);
  return res.status(500).json({ error: "Internal server error" });
}

// GET /api/chat/history — view conversation history for a session
router.get("/history", (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId query param is required" });
  }
  res.json({
    sessionId,
    messages: memory.getHistory(sessionId),
    usage: tokenTracker.getUsage(sessionId),
  });
});

// DELETE /api/chat/history — clear a session
router.delete("/history", (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }
  memory.clearSession(sessionId);
  res.json({ cleared: true });
});

module.exports = router;
