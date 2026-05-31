# AI Chat Foundation

A ChatGPT-style chat application with a Next.js frontend and Express backend, powered by OpenAI. Supports multi-turn conversations, real-time streaming (SSE), and in-memory conversation management.

## Tech Stack

| Layer      | Technology                |
|------------|---------------------------|
| Frontend   | Next.js 15, React 19, Tailwind CSS v4 |
| Backend    | Express, Node.js 20+      |
| Language   | TypeScript                |
| AI         | OpenAI GPT-4o-mini        |
| Transport  | REST + Server-Sent Events |
| Memory     | In-memory store (Map)     |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js :3001)                     │
│                                                                     │
│  ┌───────────┐   ┌──────────────┐   ┌───────────┐                  │
│  │  Sidebar   │   │  ChatMessage  │   │ ChatInput  │                │
│  │           │   │              │   │           │                  │
│  │ - History  │   │ - User msg   │   │ - Textarea │                │
│  │ - New chat │   │ - AI msg     │   │ - Send btn │                │
│  │ - Delete   │   │              │   │           │                  │
│  │ - Stream   │   └──────────────┘   └─────┬─────┘                │
│  │   toggle  │                             │                       │
│  │ - Health  │        ┌────────────────────┘                       │
│  │   status  │        │                                            │
│  └─────┬─────┘        │                                            │
│        │              │                                            │
└────────┼──────────────┼────────────────────────────────────────────┘
         │              │
         │   HTTP/SSE   │  CORS: localhost:3001 only
         │              │
┌────────┼──────────────┼────────────────────────────────────────────┐
│        ▼              ▼     BACKEND (Express :3000)                │
│  ┌─────────────────────────────────┐                               │
│  │         server.ts                │                               │
│  │  - CORS middleware               │                               │
│  │  - JSON parser                   │                               │
│  │  - GET /health                   │                               │
│  └──────────────┬──────────────────┘                               │
│                 │                                                   │
│                 ▼                                                   │
│  ┌─────────────────────────────────┐                               │
│  │       routes/chat.ts            │                               │
│  │                                 │                               │
│  │  POST /api/chat          ───────┼──┐                            │
│  │  POST /api/chat/stream   ───────┼──┤                            │
│  │  GET  /api/chat/conversations   │  │                            │
│  │  GET  /api/chat/conversations/:id  │                            │
│  │  DELETE /api/chat/conversations/:id│                            │
│  └──────────────┬──────────────────┘  │                            │
│                 │                     │                             │
│        ┌────────┴────────┐            │                            │
│        ▼                 ▼            ▼                            │
│  ┌───────────┐   ┌──────────────────────┐                          │
│  │ memoryStore│   │  services/openai.ts   │                        │
│  │           │   │                      │                          │
│  │ - create  │   │ - getChatCompletion  │──────► OpenAI API        │
│  │ - get     │   │ - streamChatCompl.   │        (gpt-4o-mini)     │
│  │ - add msg │   └──────────────────────┘                          │
│  │ - list    │                                                     │
│  │ - delete  │                                                     │
│  └───────────┘                                                     │
│   (in-memory)                                                      │
└────────────────────────────────────────────────────────────────────┘
```

## Request Workflow

### 1. Non-Streaming Chat Flow

```
User types message
       │
       ▼
  ChatInput ──► page.tsx (handleSendNonStreaming)
                    │
                    ▼
              POST /api/chat
              { message, conversationId? }
                    │
                    ▼
            ┌── New conversation? ──┐
            │ Yes                   │ No
            ▼                       ▼
     createConversation()    getConversation()
            │                       │
            └───────┬───────────────┘
                    ▼
          addMessage(user msg)
                    │
                    ▼
          getMessages(history)
                    │
                    ▼
          getChatCompletion(history)
                    │
                    ▼
            OpenAI API call
                    │
                    ▼
          addMessage(assistant msg)
                    │
                    ▼
          Return { conversationId, reply }
                    │
                    ▼
          Render ChatMessage bubble
```

### 2. Streaming Chat Flow (SSE)

```
User types message
       │
       ▼
  ChatInput ──► page.tsx (handleSendStreaming)
                    │
                    ▼
              POST /api/chat/stream
              { message, conversationId? }
                    │
                    ▼
            Set SSE headers
            Content-Type: text/event-stream
                    │
                    ▼
            data: { conversationId }  ──► Frontend stores ID
                    │
                    ▼
          streamChatCompletion(history)
                    │
                    ▼
            ┌───────────────┐
            │  OpenAI Stream │
            │   (for await)  │
            └───────┬───────┘
                    │
              ┌─────┴─────┐
              │ each token │ ──► data: { token }  ──► append to bubble
              └─────┬─────┘
                    │ (repeat)
                    ▼
            data: [DONE]  ──► Frontend closes reader
                    │
                    ▼
          addMessage(full reply)
```

### 3. Conversation Management Flow

```
                    Sidebar
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    "+ New Chat"   Click conv    "✕" button
         │            │            │
         ▼            ▼            ▼
   Clear state    GET /conversations/:id    DELETE /conversations/:id
                      │            │
                      ▼            ▼
               Load messages   Remove from store
                      │            │
                      ▼            ▼
              Render history   Refresh sidebar
                               (GET /conversations)
```

### 4. Health Check Flow

```
App mounts
    │
    ▼
GET /health  ──► { status: "ok" }
    │
    ▼
Show green/red dot in sidebar
    │
    ▼
Repeat every 30 seconds
```

## Project Structure

```
ai-chat-foundation/
├── src/                          # Backend
│   ├── server.ts                 # Express app, CORS, health check
│   ├── routes/
│   │   └── chat.ts               # All chat & conversation endpoints
│   ├── services/
│   │   └── openai.ts             # OpenAI completion + streaming
│   ├── memory/
│   │   └── memoryStore.ts        # In-memory conversation store
│   └── types/
│       └── index.ts              # Shared TypeScript interfaces
│
├── web/                          # Frontend (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout, dark theme
│   │   │   ├── page.tsx          # Main chat page
│   │   │   └── globals.css       # Tailwind import
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Conversation list, health, toggle
│   │   │   ├── ChatMessage.tsx   # Message bubble
│   │   │   └── ChatInput.tsx     # Auto-resize input + send
│   │   └── lib/
│   │       └── api.ts            # API client (REST + SSE)
│   ├── package.json
│   └── tsconfig.json
│
├── package.json
├── tsconfig.json
└── .env
```

## Setup

```bash
npm install
```

Create a `.env` file:

```
PORT=3000
OPENAI_API_KEY=your-key-here
```

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Health Check

```
GET /health
```

**Response:**

```json
{ "status": "ok" }
```

---

### Send Message

```
POST /api/chat
```

**Request Body:**

| Field            | Type   | Required | Description                                      |
|------------------|--------|----------|--------------------------------------------------|
| `message`        | string | Yes      | The user's message                                |
| `conversationId` | string | No       | Existing conversation ID. Omit to start a new one |

**Request Example (new conversation):**

```json
{
  "message": "What is TypeScript?"
}
```

**Request Example (continue conversation):**

```json
{
  "conversationId": "a1b2c3d4-...",
  "message": "How does it compare to JavaScript?"
}
```

**Response `200`:**

```json
{
  "conversationId": "a1b2c3d4-...",
  "reply": "TypeScript is a typed superset of JavaScript..."
}
```

**Error `404`:** Conversation ID not found
**Error `500`:** OpenAI or server error

---

### Stream Message (SSE)

```
POST /api/chat/stream
```

Streams tokens in real-time using Server-Sent Events (SSE).

**Request Body:**

| Field            | Type   | Required | Description                                      |
|------------------|--------|----------|--------------------------------------------------|
| `message`        | string | Yes      | The user's message                                |
| `conversationId` | string | No       | Existing conversation ID. Omit to start a new one |

**Request Example:**

```json
{
  "message": "Explain closures in JavaScript"
}
```

**Response (SSE stream):**

```
data: {"conversationId":"a1b2c3d4-..."}

data: {"token":"A"}
data: {"token":" closure"}
data: {"token":" is"}
data: {"token":" a"}
data: {"token":" function"}
...
data: [DONE]
```

**Response Headers:**

| Header          | Value              |
|-----------------|--------------------|
| `Content-Type`  | text/event-stream  |
| `Cache-Control` | no-cache           |
| `Connection`    | keep-alive         |

**Error (before stream starts) `404`:** Conversation not found
**Error (during stream):** `{"error": "..."}` sent as SSE event

**Test with curl:**

```bash
curl -N -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "What is TypeScript?"}'
```

---

### List Conversations

```
GET /api/chat/conversations
```

**Response `200`:**

```json
[
  {
    "id": "a1b2c3d4-...",
    "messages": [...],
    "createdAt": 1717200000000,
    "updatedAt": 1717200060000
  }
]
```

---

### Get Conversation

```
GET /api/chat/conversations/:id
```

**Request Params:**

| Param | Type   | Description     |
|-------|--------|-----------------|
| `id`  | string | Conversation ID |

**Response `200`:**

```json
{
  "id": "a1b2c3d4-...",
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ],
  "createdAt": 1717200000000,
  "updatedAt": 1717200060000
}
```

**Error `404`:** Conversation not found

---

### Delete Conversation

```
DELETE /api/chat/conversations/:id
```

**Request Params:**

| Param | Type   | Description     |
|-------|--------|-----------------|
| `id`  | string | Conversation ID |

**Response `200`:**

```json
{ "success": true }
```

**Error `404`:** Conversation not found

---

## Endpoint Summary

| # | Method   | Endpoint                       | Description              | Used In UI         |
|---|----------|--------------------------------|--------------------------|--------------------|
| 1 | `GET`    | `/health`                      | Server health check      | Sidebar status dot |
| 2 | `POST`   | `/api/chat`                    | Send message (JSON)      | Stream mode OFF    |
| 3 | `POST`   | `/api/chat/stream`             | Send message (SSE)       | Stream mode ON     |
| 4 | `GET`    | `/api/chat/conversations`      | List all conversations   | Sidebar list       |
| 5 | `GET`    | `/api/chat/conversations/:id`  | Get single conversation  | Click conversation |
| 6 | `DELETE` | `/api/chat/conversations/:id`  | Delete a conversation    | Delete button (✕)  |
