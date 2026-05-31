# AI Chat Foundation

A ChatGPT-style backend API built with Express, TypeScript, and OpenAI. Supports multi-turn conversations with in-memory storage.

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Framework:** Express
- **AI:** OpenAI GPT-4o-mini
- **Memory:** In-memory conversation store

## Project Structure

```
src/
├── server.ts              # Express app entry point
├── routes/
│   └── chat.ts            # Chat & conversation endpoints
├── services/
│   └── openai.ts          # OpenAI API wrapper
├── memory/
│   └── memoryStore.ts     # In-memory conversation store
└── types/
    └── index.ts           # Shared TypeScript interfaces
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
