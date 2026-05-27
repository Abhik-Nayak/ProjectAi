# Phase 1 — LLM + AI Agent Foundations

> Build raw LLM apps, prompt pipelines, tool-calling systems, basic agents, and streaming chat systems — **without frameworks** — so you understand what frameworks hide.

---

## Part 1: Core Concepts (Theory + Exploration)

### 1.1 LLM Basics

| # | Topic | What to Learn | How to Verify |
|---|-------|--------------|---------------|
| 1 | Tokens | What tokens are, how text maps to token IDs, why token count != word count | Use the OpenAI tokenizer (tiktoken) to tokenize sample strings and inspect the output |
| 2 | Context Windows | Max token limits per model, how input + output share the window, what happens when you exceed it | Send a prompt that's close to the limit, observe truncation or errors |
| 3 | Inference | How the model generates text (autoregressive next-token prediction), what a "completion" is | Call the API with a partial sentence, observe how it completes |
| 4 | Temperature | How temperature (0–2) controls randomness, difference between temperature and top_p | Call the same prompt at temp 0, 0.7, and 1.5 — compare outputs |
| 5 | Hallucinations | Why models fabricate facts, when it's most likely to happen, how to detect it | Ask the model for a fake citation, then ask it to verify — observe the failure mode |
| 6 | Structured Outputs | Getting JSON/typed responses from an LLM, function calling format, schema enforcement | Use `response_format: { type: "json_object" }` and validate the output against a schema |

### 1.2 AI Application Architecture

Understand the standard request flow before writing code:

```
User Input
  → Backend (Express/Node)
    → Prompt Builder (template + context + user message)
      → LLM API (OpenAI / Anthropic)
        → Response Parser (extract, validate, format)
          → Frontend (render to user)
```

**Key insight:** Every "AI feature" is this pipeline. Frameworks just hide the wiring.

### 1.3 Tool Calling

| # | Concept | Details |
|---|---------|---------|
| 1 | How LLMs decide to use tools | The model sees function schemas in the system prompt and chooses to call one based on user intent |
| 2 | Argument generation | The model generates JSON arguments matching the schema — it can get these wrong |
| 3 | Execution loop | You execute the function, feed the result back, and the model incorporates it into its answer |
| 4 | Chaining | One tool's output becomes context for deciding the next tool call |

### 1.4 Agent Basics

| # | Concept | Details |
|---|---------|---------|
| 1 | Reasoning loops | Agent receives a task → thinks → acts → observes → repeats until done |
| 2 | Planning | Breaking a complex task into steps before execution |
| 3 | Action execution | Calling tools, APIs, or code based on the plan |
| 4 | Memory injection | Feeding previous results and conversation history back into the prompt |

### 1.5 Streaming

| # | Concept | Details |
|---|---------|---------|
| 1 | Server-Sent Events (SSE) | HTTP-based one-way streaming protocol — server pushes chunks to client |
| 2 | Token streaming | LLM APIs stream tokens as they're generated, not all at once |
| 3 | Latency perception | Streaming makes responses feel instant even though total time is the same |

---

## Part 2: Projects

### Project 1 — ChatGPT Clone Backend

**Goal:** Build a streaming chat API with memory and prompt management from scratch.

**Stack:** Node.js, Express, OpenAI SDK, Redis (added later for persistence)

#### Steps

| # | Task | Details | Deliverable |
|---|------|---------|-------------|
| 1 | Project setup | Init Node.js project, install `openai`, `express`, `dotenv`, `cors` | Working Express server on port 3000 |
| 2 | Basic completion endpoint | `POST /api/chat` that takes a message, sends it to OpenAI, returns the response | Endpoint returns a plain text LLM response |
| 3 | Prompt template system | Build a `PromptBuilder` class that constructs system prompt + conversation history + user message | Reusable prompt builder with configurable system prompts |
| 4 | Conversation memory (in-memory) | Store conversation history per session in a Map, inject it into each request | Multi-turn conversations that remember context |
| 5 | Token tracking | Count tokens per request/response using tiktoken, log usage, enforce a per-conversation limit | Token usage logged, conversations capped at a configurable limit |
| 6 | Streaming response | Switch to `stream: true`, pipe SSE chunks to the client via `res.write()` | Tokens stream to the client in real-time |
| 7 | Redis memory (optional) | Replace the in-memory Map with Redis for conversation persistence across restarts | Conversations survive server restarts |
| 8 | Error handling | Handle API rate limits, timeouts, malformed requests, and token overflow gracefully | No unhandled crashes, clear error messages |

#### What You'll Know After This
- How the OpenAI API actually works under the hood
- How conversation memory is managed (it's just prompt engineering)
- How streaming works at the HTTP level
- Why token counting matters for cost and reliability

---

### Project 2 — Tool Calling Agent

**Goal:** Build an agent that can use multiple tools to answer user questions.

**Stack:** Node.js, Express, OpenAI SDK (function calling)

#### Steps

| # | Task | Details | Deliverable |
|---|------|---------|-------------|
| 1 | Define tool schemas | Write OpenAI function-calling schemas for: `get_weather`, `calculate`, `query_database`, `web_search` | JSON schemas that describe each tool's name, description, and parameters |
| 2 | Implement tool functions | Build the actual functions — weather (mock or real API), calculator (eval math), DB (query a SQLite/Postgres table), web search (mock or SerpAPI) | Each tool works standalone when called directly |
| 3 | Single tool calling | Send a user message + tool schemas to the LLM, detect when it wants to call a tool, execute it, return the result | Agent correctly calls one tool and incorporates the result |
| 4 | Multi-tool orchestration | Handle the loop: LLM calls tool → you execute → feed result back → LLM may call another tool or respond | Agent can chain 2-3 tool calls to answer a complex question |
| 5 | Validation layer | Validate tool arguments before execution (type checks, range checks, required fields) | Bad arguments are caught before execution, with a clear error fed back to the LLM |
| 6 | Retry logic | If a tool call fails (timeout, bad response), retry with backoff, or ask the LLM to try a different approach | Transient failures don't crash the agent |
| 7 | Conversation endpoint | `POST /api/agent` that accepts a user message and returns the final answer (after all tool calls) | Clean API that hides the tool-calling loop from the client |

#### What You'll Know After This
- How function calling actually works (it's just structured prompting)
- How to build the execute-observe loop
- Why validation matters (LLMs generate bad arguments regularly)
- How retries and error recovery work in agent systems

---

### Project 3 — Mini Research Agent

**Goal:** Build an agent that can search, read, summarize, and cite sources to answer research questions.

**Stack:** Node.js, OpenAI SDK, a search API (SerpAPI / Tavily / mock)

#### Steps

| # | Task | Details | Deliverable |
|---|------|---------|-------------|
| 1 | Search tool | Build a tool that takes a query, calls a search API, returns top 5 results (title, snippet, URL) | `search(query)` returns structured results |
| 2 | Read/fetch tool | Build a tool that takes a URL, fetches the page content, extracts the main text (strip HTML) | `fetch_page(url)` returns clean text content |
| 3 | Summarize tool | Build a tool that takes a long text and returns a concise summary using the LLM | `summarize(text)` returns a 2-3 sentence summary |
| 4 | Agent loop v1 | Wire the agent: receive question → search → read top results → summarize → answer with citations | Agent answers questions with `[1]`, `[2]` citations |
| 5 | Multi-step reasoning | Handle questions that need multiple searches — agent decides "I need more info" and searches again | Agent can do 2-3 rounds of search-read-summarize before answering |
| 6 | Context accumulation | Build a working memory that tracks what the agent has learned so far across steps | Agent doesn't re-read pages or lose findings between steps |
| 7 | Iterative planning | Before each action, the agent states its plan: "I'll search for X because I still need Y" | Visible reasoning trace in the logs |
| 8 | Final synthesis | After gathering enough info, the agent writes a structured answer with inline citations | Clean, sourced answer — not just a dump of summaries |

#### What You'll Know After This
- How agent loops work in practice (not just theory)
- How to accumulate context without blowing the token window
- How iterative planning improves agent quality
- Why citation and source tracking is hard but essential

---

## Part 3: Debugging Skills

Work through these scenarios as you build the projects above.

| # | Skill | What to Practice |
|---|-------|-----------------|
| 1 | Prompt failures | When the LLM ignores instructions — learn to diagnose whether it's a prompt issue, context issue, or model limitation |
| 2 | Hallucination tracing | Identify when and why the model made something up — check if the answer was in the context or fabricated |
| 3 | Context overflow | What happens when you exceed the context window — learn to detect and handle truncation |
| 4 | Invalid JSON outputs | When the LLM returns malformed JSON for tool calls — learn to parse defensively and retry |
| 5 | Tool failure recovery | When a tool throws an error — learn to feed the error back to the LLM and let it adapt |
| 6 | Latency bottlenecks | Profile where time is spent — LLM inference, tool execution, network — and learn to optimize |

---

## Part 4: Production Insights

By the end of Phase 1, you should be able to explain each of these from experience:

| # | Insight | Why It Matters |
|---|---------|---------------|
| 1 | Prompts become systems | A single prompt grows into template + context + history + constraints — it's software engineering |
| 2 | Memory is hard | You can't store everything — you need strategies for what to keep, compress, or forget |
| 3 | Agents fail silently | An agent can return a confident wrong answer — you need observability to catch it |
| 4 | Tool calling breaks | LLMs generate bad arguments, call wrong tools, or loop forever — you need guardrails |
| 5 | Retries matter | Transient failures are common with APIs — without retries your system is fragile |
| 6 | Observability is critical | You need logs, traces, and metrics to understand what your AI system is actually doing |

---

## Suggested Order of Execution

```
Week 1-2:  Part 1 (Concepts) + Project 1 (Steps 1-5)
Week 3:    Project 1 (Steps 6-8) + Part 3 (Debug as you go)
Week 4:    Project 2 (Steps 1-4)
Week 5:    Project 2 (Steps 5-7) + Part 3 (Debug as you go)
Week 6:    Project 3 (Steps 1-4)
Week 7:    Project 3 (Steps 5-8) + Part 4 (Reflect on insights)
```

---

## Success Criteria

You're ready for Phase 2 when you can:

- [ ] Call an LLM API directly and handle the response
- [ ] Build a multi-turn conversation with proper prompt construction
- [ ] Stream tokens over SSE to a client
- [ ] Define tool schemas and implement the tool-calling loop
- [ ] Handle tool failures, retries, and validation
- [ ] Build an agent that reasons across multiple steps
- [ ] Accumulate context without exceeding the token window
- [ ] Debug prompt failures, hallucinations, and malformed outputs
- [ ] Explain why each of the 6 production insights matters from firsthand experience
