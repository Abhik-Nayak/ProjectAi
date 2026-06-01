# Day 1 - Legal Document RAG System

A Retrieval-Augmented Generation (RAG) system that lets you upload legal PDFs, ask questions in natural language, and get accurate answers grounded in document content with source citations.

---

## Architecture Diagram

```
+-------------------+         +--------------------+         +------------------+
|                   |         |                    |         |                  |
|   React Frontend  | ------> |  Express Backend   | ------> |   OpenAI API     |
|   (Port 3000)     | <------ |  (Port 5000)       | <------ |                  |
|                   |         |                    |         |  - Embeddings    |
+-------------------+         +--------------------+         |  - GPT-4 Turbo   |
                              |                    |         +------------------+
                              |  In-Memory Vector  |
                              |  Store (JS Array)  |
                              +--------------------+
```

---

## How It Works - Step by Step

### Phase 1: Document Ingestion (Upload Flow)

```
 PDF File
   |
   v
+------------------------------+
| 1. Frontend: Base64 Encode   |   App.js reads file as DataURL,
|    FileReader -> base64Data  |   strips the prefix, sends raw base64
+------------------------------+
   |
   | POST /api/upload { filename, base64Data }
   v
+------------------------------+
| 2. Save PDF to ./uploads/    |   Server decodes base64 -> binary,
|                              |   writes to disk
+------------------------------+
   |
   v
+------------------------------+
| 3. Parse PDF (pdf-parse)     |   Extracts raw text from all pages
|    chunking.js               |   Tracks page numbers
+------------------------------+
   |
   v
+------------------------------+
| 4. Chunk Text                |   Split into ~500-token chunks
|    chunking.js               |   with 100-token overlap so no
|                              |   sentence loses its context
+------------------------------+
   |
   | Each chunk = { text, pageNumber, filename }
   v
+------------------------------+
| 5. Generate Embeddings       |   Each chunk -> OpenAI API
|    embeddings.js             |   Model: text-embedding-3-small
|                              |   Output: 1536-dim float vector
+------------------------------+
   |
   v
+------------------------------+
| 6. Store in Vector Store     |   In-memory JS array holding
|    server.js vectorStore[]   |   { text, embedding, metadata }
+------------------------------+
```

### Phase 2: Query & Retrieval (Chat Flow)

```
 User Question: "What are the payment terms?"
   |
   | POST /api/query { query }
   v
+------------------------------+
| 1. Embed the Query           |   Same model (text-embedding-3-small)
|    embeddings.js             |   converts question -> 1536-dim vector
+------------------------------+
   |
   v
+------------------------------+
| 2. Vector Search             |   Compare query vector against every
|    Cosine Similarity         |   stored chunk vector
|    embeddings.js             |
|                              |   cosine_sim = (A . B) / (|A| * |B|)
|                              |
|                              |   Score range: 0 (unrelated) to 1 (identical)
+------------------------------+
   |
   | Top 3 chunks sorted by score
   v
+------------------------------+
| 3. Build Prompt              |   System: "You are a legal document
|    generation.js             |            assistant..."
|                              |   User:   "QUESTION: {query}
|                              |            DOCUMENT EXCERPTS: {chunks}"
+------------------------------+
   |
   v
+------------------------------+
| 4. LLM Generation           |   Model: gpt-4-turbo
|    generation.js             |   Temperature: 0 (deterministic)
|    (LangChain ChatOpenAI)    |   Answers ONLY from provided context
+------------------------------+
   |
   v
+------------------------------+
| 5. Return Response           |   { answer, sources: [{text, score,
|                              |     filename}], query }
+------------------------------+
   |
   v
 Frontend displays answer + source citations with relevance %
```

---

## API Endpoints

### `POST /api/upload` - Ingest a PDF

Parses, chunks, embeds, and stores a PDF document.

| Field       | Type   | Description                    |
|-------------|--------|--------------------------------|
| `filename`  | string | Original name of the PDF file  |
| `base64Data`| string | Base64-encoded PDF binary data |

**Response:**
```json
{
  "success": true,
  "message": "Uploaded \"contract.pdf\" with 42 chunks",
  "chunkCount": 42
}
```

**What happens internally:**
1. Decode base64 and save PDF to `./uploads/`
2. Extract text with `pdf-parse`
3. Split into overlapping chunks (500 tokens, 100 overlap)
4. Embed each chunk via OpenAI `text-embedding-3-small`
5. Push all embedded chunks into the in-memory `vectorStore[]`

---

### `POST /api/query` - Ask a Question

Performs semantic search + LLM generation over uploaded documents.

| Field   | Type   | Description           |
|---------|--------|-----------------------|
| `query` | string | Natural language question |

**Response:**
```json
{
  "query": "What are the payment terms?",
  "answer": "According to the contract, payment is due within 30 days...",
  "sources": [
    {
      "text": "Payment shall be made within 30 days of invoice...",
      "score": 0.87,
      "filename": "contract.pdf"
    }
  ],
  "chunkCount": 42
}
```

**What happens internally:**
1. Embed the query using the same embedding model
2. Compute cosine similarity against every chunk in the vector store
3. Retrieve top-3 most similar chunks
4. Feed chunks as context into GPT-4-Turbo with a system prompt
5. Return the generated answer + source chunks with scores

---

### `GET /api/status` - System Health Check

Returns the current state of the vector store.

**Response:**
```json
{
  "documentsCount": 2,
  "chunksCount": 84,
  "documents": [
    {
      "filename": "contract.pdf",
      "uploadedAt": "2026-01-15T10:30:00.000Z",
      "chunkCount": 42
    }
  ]
}
```

---

## Project Structure

```
Day1/
├── legal-rag/                     # Backend
│   ├── server.js                  # Express server, routes, vectorStore
│   ├── rag/
│   │   ├── chunking.js            # PDF parsing + text splitting
│   │   ├── embeddings.js          # Embedding generation + cosine search
│   │   └── generation.js          # LLM prompt building + answer generation
│   ├── uploads/                   # Stored PDF files
│   ├── .env                       # OPENAI_API_KEY, PORT
│   └── package.json
│
└── frontend/                      # React UI
    └── src/
        ├── App.js                 # Single-page app (upload + chat)
        └── App.css                # Styling
```

---

## Key RAG Concepts for Interviews

### 1. What is RAG?

RAG = **Retrieval** + **Augmented** + **Generation**

Instead of asking an LLM to answer from its training data (which can hallucinate), you **retrieve** relevant documents first, **augment** the prompt with that context, then **generate** an answer grounded in real data.

```
Traditional LLM:    Question ---------> LLM ---------> Answer (may hallucinate)

RAG:                Question ---> Retrieve docs ---> LLM + docs ---> Answer (grounded)
```

### 2. Why Chunking?

- LLMs have **token limits** - you can't feed an entire 100-page PDF
- Smaller chunks allow **precise retrieval** - find the exact paragraph that answers the question
- **Overlap** (100 tokens) ensures sentences at chunk boundaries aren't split and lost

### 3. Why Embeddings?

Embeddings convert text into **numerical vectors** that capture semantic meaning:
- "payment terms" and "invoice due date" are **close** in vector space (high cosine similarity)
- "payment terms" and "company address" are **far apart** (low cosine similarity)
- This enables **semantic search**, not just keyword matching

### 4. Why Cosine Similarity?

```
cosine_sim(A, B) = (A . B) / (|A| * |B|)
```
- Measures the **angle** between two vectors, not the distance
- Scale-invariant: works regardless of vector magnitude
- Returns 0-1: easy to interpret as a relevance percentage

### 5. Why Temperature = 0?

- Temperature controls **randomness** in LLM output
- `temperature: 0` = deterministic, always picks the most likely token
- For legal/factual Q&A, you want **consistent, reliable** answers, not creative ones

### 6. Common Interview Questions

**Q: How do you prevent hallucination in RAG?**
- Ground the LLM by providing retrieved document chunks as context
- Use a system prompt that says "only answer from provided excerpts"
- Set temperature to 0 for deterministic responses
- Return source citations so users can verify

**Q: What are the tradeoffs of chunk size?**
- Too small: loses context, retrieves fragments
- Too large: dilutes relevance, wastes token budget
- Sweet spot: 200-1000 tokens with overlap

**Q: Why not use a vector database here?**
- This is an in-memory prototype (resets on server restart)
- Production systems use Pinecone, Weaviate, pgvector, ChromaDB, etc.
- Vector DBs add: persistence, indexing (ANN/HNSW), filtering, scaling

**Q: What is the difference between semantic search and keyword search?**
- Keyword search (BM25/TF-IDF): matches exact words, misses synonyms
- Semantic search (embeddings): matches meaning, finds "payment due date" when you search "when to pay"
- Best systems use **hybrid search** (both combined)

**Q: How would you improve this system?**
- Add a vector database (Pinecone/ChromaDB) for persistence
- Use hybrid search (semantic + keyword BM25)
- Add re-ranking (cross-encoder) after initial retrieval
- Implement streaming responses (SSE)
- Add metadata filtering (by document, date, section)
- Use recursive chunking instead of fixed-size

---

## Quick Start

```bash
# Backend
cd legal-rag
cp .env.example .env          # Add your OPENAI_API_KEY
npm install
npm run dev                   # Starts on port 5000

# Frontend
cd frontend
npm install
npm start                     # Starts on port 3000
```

---

## Tech Stack

| Component       | Technology                  | Purpose                        |
|-----------------|-----------------------------|--------------------------------|
| Backend         | Express.js 5                | REST API server                |
| PDF Parsing     | pdf-parse                   | Extract text from PDFs         |
| Embeddings      | OpenAI text-embedding-3-small | Convert text to vectors      |
| LLM             | GPT-4-Turbo                 | Answer generation              |
| Orchestration   | LangChain                   | LLM abstraction layer          |
| Vector Store    | In-memory JS array          | Store and search embeddings    |
| Frontend        | React 19                    | User interface                 |
