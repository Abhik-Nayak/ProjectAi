# How Semantic Search Works

## How Documents Are Stored (One-time process)

```
"JWT is used for login"  ──► OpenAI API ──► [0.12, -0.34, ...] ──► Stored in DB
"OAuth handles auth"     ──► OpenAI API ──► [0.45, 0.11, ...]  ──► Stored in DB
"Redis caches data"      ──► OpenAI API ──► [0.78, -0.22, ...] ──► Stored in DB
```

Every document/sentence is converted to a vector **once** and saved in the database alongside the original text.

## When a User Searches

```
User types: "How does login work?"
       │
       ▼
  Convert query to vector ──► [0.13, -0.31, ...]
       │
       ▼
  Compare with ALL stored vectors (cosine similarity)
       │
       ▼
  "JWT is used for login"   → 0.94 ✅ (closest match)
  "OAuth handles auth"      → 0.82
  "Redis caches data"       → 0.21 (not relevant)
```

## How Claude (LLM) Works vs Semantic Search

| | Semantic Search (search.js) | Claude (LLM) |
|---|---|---|
| **Purpose** | Find similar documents | Understand & generate text |
| **Method** | Embedding + cosine similarity | Transformer neural network |
| **Training** | Uses OpenAI's pre-trained embeddings | Trained by Anthropic on massive text data |
| **Output** | Returns existing documents ranked by similarity | Generates new text as a response |

### Claude's Flow (simplified)

```
User: "How does login work?"
       │
       ▼
  Tokenizer ──► Breaks into tokens: ["How", "does", "login", "work", "?"]
       │
       ▼
  Transformer Model (billions of parameters)
  - Self-attention: understands relationships between words
  - Layers of neural networks: processes meaning, context, intent
       │
       ▼
  Predicts the next token, one at a time:
  "Login" → "typically" → "works" → "by" → "verifying" → "credentials" → ...
```

### Key Differences

1. **Embeddings (search.js)** — converts text to vectors to **find similar content**. It doesn't understand or generate anything, just matches.

2. **LLMs like Claude** — trained on huge amounts of text to **understand language and generate responses**. It doesn't search a database — it has learned patterns, facts, and reasoning during training.

## How Real Systems Combine Both (RAG)

Many production apps use **both** together — this is called **RAG (Retrieval-Augmented Generation)**:

```
User: "How does our login work?"
       │
       ▼
  Step 1: Semantic Search (like search.js)
  → Finds relevant docs from YOUR database
       │
       ▼
  Step 2: Send to LLM (like Claude)
  → "Here are the docs: [...]  Now answer the user's question"
       │
       ▼
  Claude generates a human-readable answer based on YOUR data
```

This is powerful because Claude alone doesn't know your company's specific code or docs — but embedding search can fetch that context, and Claude can then explain it.

**search.js is Step 1 of a RAG system.** To make it a full RAG app, you'd send the top results to Claude/GPT and let it generate a natural answer.

## Why All Embedding Vectors Have the Same Length (1536)

The embedding model `text-embedding-3-small` **always outputs exactly 1536 numbers**, no matter what input you give it.

```
"Hi"                                    ──► OpenAI ──► [0.12, -0.34, ..., 0.56]  → 1536 numbers
"JWT authentication works using tokens" ──► OpenAI ──► [0.45, 0.11, ..., 0.78]  → 1536 numbers
"A very long paragraph about Redis..."  ──► OpenAI ──► [0.33, -0.22, ..., 0.91] → 1536 numbers
```

| What changes | What stays fixed |
|---|---|
| The **values** inside the vector (the numbers) | The **length** of the vector (1536) |

### Why Must They Be the Same Length?

Because **cosine similarity requires it**. You're comparing two vectors element-by-element:

```
Query:    [0.12, -0.34, 0.56, ..., 0.89]   ← 1536 numbers
Document: [0.45,  0.11, 0.78, ..., 0.23]   ← 1536 numbers
              ↕      ↕     ↕          ↕
          compare each position to calculate similarity
```

If they were different lengths, you couldn't compare them — it's like trying to compare coordinates in 2D space with coordinates in 3D space.

### Analogy

Think of it like a **fingerprint scanner**:
- Every person has a **different** fingerprint (different values)
- But the scanner always stores it as the **same size image** (fixed dimensions)
- Short name or long name, the fingerprint format doesn't change

The **meaning** of your text is compressed into exactly 1536 dimensions.

### Different Models, Different Sizes

| Model | Vector Length |
|---|---|
| `text-embedding-3-small` | 1536 |
| `text-embedding-3-large` | 3072 |
| `text-embedding-ada-002` | 1536 |
