import { Router, type Request, type Response } from "express";
import {
  createConversation,
  getConversation,
  addMessage,
  getMessages,
  listConversations,
  deleteConversation,
} from "../memory/memoryStore.js";
import { getChatCompletion, streamChatCompletion } from "../services/openai.js";
import type { ChatRequest } from "../types/index.js";

const router = Router();

router.post("/stream", async (req: Request, res: Response) => {
  try {
    const { conversationId, message } = req.body as ChatRequest;

    let convId = conversationId;
    if (!convId) {
      const conv = createConversation();
      convId = conv.id;
    } else if (!getConversation(convId)) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    addMessage(convId, { role: "user", content: message });

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send conversation ID as the first event
    res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);

    const history = getMessages(convId);

    const fullReply = await streamChatCompletion(
      history,
      (token) => {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      },
      () => {
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    );

    addMessage(convId, { role: "assistant", content: fullReply });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (!res.headersSent) {
      res.status(500).json({ error: msg });
    } else {
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.end();
    }
  }
});


router.post("/", async (req: Request, res: Response) => {
  try {
    const { conversationId, message } = req.body as ChatRequest;

    let convId = conversationId;
    if (!convId) {
      const conv = createConversation();
      convId = conv.id;
    } else if (!getConversation(convId)) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    addMessage(convId, { role: "user", content: message });

    const history = getMessages(convId);
    const reply = await getChatCompletion(history);

    addMessage(convId, { role: "assistant", content: reply.content });

    res.json({ conversationId: convId, reply });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

router.get("/conversations", (_req: Request, res: Response) => {
  res.json(listConversations());
});

router.get("/conversations/:id", (req: Request, res: Response) => {
  const conversation = getConversation(req.params.id as string);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json(conversation);
});

router.delete("/conversations/:id", (req: Request, res: Response) => {
  const deleted = deleteConversation(req.params.id as string);
  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
