# API Testing Guide — Postman

Base URL: `http://localhost:3000`

---

## 1. Health Check

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/health` |
| **Body** | _none_ |

**Expected Response** — `200 OK`
```json
{
  "status": "ok"
}
```

---

## 2. Chat — Streaming (SSE)

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/chat` |
| **Headers** | `Content-Type: application/json` |

**Body** (`raw` → `JSON`)
```json
{
  "message": "Explain how HTTP streaming works in 3 sentences",
  "sessionId": "session-1"
}
```

> **Postman tip:** Streaming responses show as raw text in Postman. Each chunk arrives as a `data:` line.

**Expected Response** — `200 OK` (`text/event-stream`)
```
data: {"content":"HTTP"}

data: {"content":" streaming"}

data: {"content":" works by..."}

data: {"done":true,"usage":{"promptTokens":25,"completionTokens":40,"totalTokens":65,"requests":1}}
```

---

## 3. Chat — Non-Streaming (JSON)

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/chat` |
| **Headers** | `Content-Type: application/json` |

**Body** (`raw` → `JSON`)
```json
{
  "message": "What is 2 + 2?",
  "sessionId": "session-2",
  "stream": false
}
```

**Expected Response** — `200 OK`
```json
{
  "message": "2 + 2 equals 4.",
  "usage": {
    "promptTokens": 22,
    "completionTokens": 8,
    "totalTokens": 30,
    "requests": 1
  }
}
```

---

## 4. Chat — Custom System Prompt

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/chat` |
| **Headers** | `Content-Type: application/json` |

**Body** (`raw` → `JSON`)
```json
{
  "message": "Tell me about Mars",
  "sessionId": "session-3",
  "stream": false,
  "systemPrompt": "You are a pirate. Answer everything in pirate speak."
}
```

**Expected Response** — `200 OK`
```json
{
  "message": "Arrr! Mars be the fourth rock from the sun, matey...",
  "usage": {
    "promptTokens": 30,
    "completionTokens": 45,
    "totalTokens": 75,
    "requests": 1
  }
}
```

---

## 5. Multi-Turn Conversation (Memory Test)

Send these two requests **in order** with the same `sessionId`:

### Turn 1

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/chat` |
| **Headers** | `Content-Type: application/json` |

**Body** (`raw` → `JSON`)
```json
{
  "message": "My name is Abhik",
  "sessionId": "session-4",
  "stream": false
}
```

### Turn 2

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/chat` |
| **Headers** | `Content-Type: application/json` |

**Body** (`raw` → `JSON`)
```json
{
  "message": "What is my name?",
  "sessionId": "session-4",
  "stream": false
}
```

**Expected:** The assistant should remember and reply with "Abhik".

---

## 6. Get Conversation History

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/api/chat/history` |
| **Body** | _none_ |

**Query Params**

| Key | Value |
|-----|-------|
| `sessionId` | `session-4` |

**Expected Response** — `200 OK`
```json
{
  "sessionId": "session-4",
  "messages": [
    { "role": "user", "content": "My name is Abhik" },
    { "role": "assistant", "content": "Nice to meet you, Abhik!" },
    { "role": "user", "content": "What is my name?" },
    { "role": "assistant", "content": "Your name is Abhik." }
  ],
  "usage": {
    "promptTokens": 60,
    "completionTokens": 20,
    "totalTokens": 80,
    "requests": 2
  }
}
```

---

## 7. Clear Conversation History

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `http://localhost:3000/api/chat/history` |
| **Headers** | `Content-Type: application/json` |

**Body** (`raw` → `JSON`)
```json
{
  "sessionId": "session-4"
}
```

**Expected Response** — `200 OK`
```json
{
  "cleared": true
}
```

---

## Error Cases

### Missing `message`

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/chat` |
| **Headers** | `Content-Type: application/json` |

**Body** (`raw` → `JSON`)
```json
{
  "sessionId": "session-1"
}
```

**Expected Response** — `400 Bad Request`
```json
{
  "error": "message is required and must be a non-empty string"
}
```

---

### Missing `sessionId`

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/chat` |
| **Headers** | `Content-Type: application/json` |

**Body** (`raw` → `JSON`)
```json
{
  "message": "hello"
}
```

**Expected Response** — `400 Bad Request`
```json
{
  "error": "sessionId is required"
}
```

---

### Empty message string

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/api/chat` |
| **Headers** | `Content-Type: application/json` |

**Body** (`raw` → `JSON`)
```json
{
  "message": "   ",
  "sessionId": "session-1"
}
```

**Expected Response** — `400 Bad Request`
```json
{
  "error": "message is required and must be a non-empty string"
}
```

---

### Token limit exceeded

After many messages on the same session (total tokens exceed `MAX_TOKENS_PER_CONVERSATION`):

**Expected Response** — `429 Too Many Requests`
```json
{
  "error": "Token limit exceeded for this conversation",
  "usage": {
    "promptTokens": 3800,
    "completionTokens": 500,
    "totalTokens": 4300,
    "requests": 12
  }
}
```

---

### Invalid API key

If `OPENAI_API_KEY` in `.env` is wrong or missing:

**Expected Response** — `401 Unauthorized`
```json
{
  "error": "Invalid OpenAI API key."
}
```

---

## Body Fields Reference

### POST /api/chat

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `message` | `string` | yes | — | The user's message |
| `sessionId` | `string` | yes | — | Unique conversation session ID |
| `stream` | `boolean` | no | `true` | `true` = SSE streaming, `false` = JSON response |
| `systemPrompt` | `string` | no | `"You are a helpful assistant."` | Override the system prompt |

### DELETE /api/chat/history

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | yes | Session to clear |

### GET /api/chat/history — Query Params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | yes | Session to retrieve |
