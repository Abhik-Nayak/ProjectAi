# 30-Day AI Agents Plan — From PERN/FastAPI Dev to Shipping Real Agents

> **Who this is for:** You already know PostgreSQL, Express, React, Node (4+ yrs) and you've picked up Python + FastAPI. You don't need to learn "programming" — you need to learn how LLMs *behave* and how to wrap them in reliable, tool-using loops. This plan skips the academic 80% and drills the 20% that ships products.

---

## The 80/20 of AI Agents (read this first)

You do **not** need: training models, transformer math, GPU/CUDA, building your own embeddings, RLHF internals, or 12 competing frameworks. That's the 80% that gives 20% of the value for an app developer.

The **20% that gives 80%** of the value:

1. **LLM API calls** — messages, system prompts, temperature, structured output.
2. **Tool / function calling** — the single most important agent primitive.
3. **The agent loop** — reason → act → observe → repeat (ReAct).
4. **RAG** — embeddings + vector search to give agents knowledge (you already have pgvector — huge head start).
5. **Memory** — short-term (conversation) + long-term (Postgres).
6. **Orchestration** — multi-step + multi-agent flows with a real framework.
7. **Evals + observability** — how you know it actually works.
8. **Production** — streaming, async, cost, guardrails, deploy.

**Core principle of this plan:** *build the primitives by hand first, then reach for frameworks.* Most devs who only learn LangChain can't debug their agents because they never understood the loop underneath. You won't have that problem.

### Your stack advantage

| You already know | Use it for |
|---|---|
| PostgreSQL | Vector store (pgvector), memory, agent state, eval results |
| FastAPI | Serving agents, streaming endpoints, background jobs |
| React | Chat UIs, agent dashboards, tool-call visualizers |
| Node/Express | TS agents (Vercel AI SDK) if you ever want JS-side |
| Async/REST instincts | Tool calls, retries, timeouts — same muscles |

### Ground rules

- **~2–3 hours/day.** Less theory, more keyboard.
- **Python is your primary track** (richest agent ecosystem; you're already learning FastAPI). Serve with FastAPI, build frontends in React — play to your strengths.
- **Every week ends in a shippable project.** Push each to GitHub. By Day 30 you have 4 portfolio pieces.
- **Pick ONE model provider** to start (Anthropic, OpenAI, or an OpenAI-compatible local model via Ollama). Don't shop around early.

---

## Day 0 — Setup (do before Day 1)

- [ ] Python 3.11+, `uv` or `poetry`, a fresh virtualenv.
- [ ] API key for one provider. Set a **hard spend limit** ($10–20) so experiments can't surprise you.
- [ ] Install: `pydantic`, `httpx`, `python-dotenv`, your provider SDK.
- [ ] Local Postgres with the `pgvector` extension enabled (`CREATE EXTENSION vector;`). Docker is fine.
- [ ] A scratch repo: `ai-agents-30days/` with a folder per project.

---

## Week 1 — Primitives: Build an Agent From Scratch

**Goal:** Understand what an agent *is* by building one with zero frameworks.

### Day 1 — LLM API fundamentals
- Make raw chat completion calls. Understand the `messages` array: `system`, `user`, `assistant` roles.
- Play with **temperature** (0 vs 1), `max_tokens`, stop sequences. Watch outputs change.
- **Mental model:** the LLM is a stateless function `f(messages) -> text`. *It remembers nothing.* You resend history every call.
- **Do:** A CLI that holds a conversation by appending to the `messages` list.

### Day 2 — Structured output
- Force the model to return JSON matching a **Pydantic** schema (use your provider's structured-output / JSON mode).
- This is the bridge between "text generator" and "software component."
- **Do:** A function that takes a messy email and returns `{sender, intent, action_items[]}` as validated Pydantic.

### Day 3 — Tool / function calling (the big one)
- Define a tool (a Python function + a JSON schema describing it). Send it to the model. The model replies "call `get_weather(city='Tokyo')`."
- **You** execute the function, append the result, and call the model again.
- **Mental model:** the LLM doesn't run code — it *requests* a function and you run it. This request/execute/return cycle is 80% of agents.
- **Do:** Give the model two tools — a calculator and a `query_db(sql)` against your Postgres — and watch it choose.

### Day 4 — Multiple tools + the decision to stop
- Add 3–4 tools. Learn how the model decides *which* tool and *when it's done* (no more tool calls → final answer).
- Handle the messy parts: bad arguments, tool errors, the model looping.
- **Do:** Extend yesterday's script so the model can chain two tools in one task (e.g., query DB → calculate a total).

### Day 5 — The agent loop (ReAct), hand-rolled
- Implement the loop yourself:
  ```
  while not done:
      response = llm(messages + tools)
      if response.tool_calls:
          results = run_tools(response.tool_calls)
          messages += results
      else:
          done = True
  ```
- Add a **max-iterations** guard (agents will loop forever if you let them).
- **Mental model:** an "agent" = LLM + tools + a loop + a stopping condition. That's it.

### Day 6 — Prompting that actually matters
- System prompt design: role, constraints, tool-use rules, output format.
- **Few-shot** examples and light **chain-of-thought** ("think step by step before calling a tool").
- Learn the 20% of prompt engineering that matters: be specific, show examples, define the format, give negative examples.
- **Do:** Harden your agent's system prompt so it stops hallucinating tool names.

### Day 7 — 🛠️ Project 1: "Mini-Agent" (your own micro-framework)
**Build:** A pure-Python CLI agent — tool registry, the ReAct loop, structured final answers, iteration cap, and basic logging of each step.
- Tools: calculator, current time, and a real `query_postgres(sql)` tool.
- Wrap it in **one FastAPI endpoint** (`POST /agent` → task in, answer out).
- **Why it matters:** You now understand the machinery every framework hides. Everything after this is convenience.

---

## Week 2 — Knowledge Agents: RAG + Memory

**Goal:** Give agents knowledge they weren't trained on, and memory across turns.

### Day 8 — Embeddings + vector search (your home turf)
- Generate embeddings for text. Store them in **pgvector**. Run a cosine-similarity query.
- Understand: embeddings = semantic coordinates; nearest neighbors = "most related text."
- **Do:** Embed 50 paragraphs, store in Postgres, retrieve the top-5 for a query. (You already know the SQL side — this is the easy win.)

### Day 9 — Chunking + indexing
- Chunk strategies: fixed size, overlap, by-heading. Why chunking quality > model choice for RAG quality.
- Add an **HNSW** index in pgvector for speed.
- **Do:** Build an ingestion script: file → chunks → embeddings → Postgres.

### Day 10 — The RAG pipeline
- Full flow: query → embed → retrieve top-k → stuff into prompt → answer **with citations**.
- **Grounding:** instruct the model to answer *only* from retrieved context and say "I don't know" otherwise.
- **Do:** Ask questions over your ingested docs; verify answers cite the right chunks.

### Day 11 — Better retrieval (80/20)
- **Hybrid search** (keyword/BM25 + vector) and a simple **reranking** pass. These two give most of the "make RAG good" gains.
- Learn to spot retrieval failures (the #1 cause of bad RAG answers).
- **Do:** Add a rerank step; compare answers before/after.

### Day 12 — Short-term memory
- Conversation memory: the messages list, plus **summarization** when it gets long (so you don't blow the context window).
- **Do:** Add rolling summarization to your Week-1 agent so it survives 50-turn chats.

### Day 13 — Long-term memory in Postgres
- Persist facts/preferences across sessions; retrieve relevant ones via vector search (memory = RAG over past conversations).
- **Do:** Store user facts in Postgres; have the agent recall them in a new session.

### Day 14 — 🛠️ Project 2: "Docs Q&A Agent"
**Build:** A RAG agent over a real corpus — your team's docs, a GitHub repo's markdown, or a set of PDFs.
- FastAPI backend (ingest + chat endpoints), pgvector store, citations in responses.
- A minimal **React chat UI** (your strength) showing answers + source links.
- **Why it matters:** RAG-over-your-docs is the single most common real-world agent request you'll get at work.

---

## Week 3 — Real Agents: Frameworks + Orchestration

**Goal:** Now that you *get* the primitives, use frameworks to move fast and build multi-step systems.

### Day 15 — LangGraph (or your framework of choice)
- Re-implement your Week-1 agent in **LangGraph**. Notice it's the same loop — now as a state graph with nodes and edges.
- Why graphs: explicit state, branching, retries, and **human-in-the-loop** pauses.
- (Alternatives worth knowing exist: LlamaIndex for RAG-heavy apps, CrewAI/AutoGen for multi-agent, Vercel AI SDK for TS. Don't learn them all — know they exist.)

### Day 16 — Stateful, multi-step workflows
- Build a graph with branches: e.g., classify → route → act → verify → respond.
- Add **retries with backoff** and error nodes. This is where your backend instincts pay off.
- **Do:** A 4-step workflow where one step's failure routes to a recovery path.

### Day 17 — Planning + reflection
- Patterns: **plan-then-execute** (agent writes a plan, then runs each step) and **reflection** (agent critiques its own output and retries).
- When these help vs. when they just burn tokens (80/20: use sparingly).
- **Do:** Add a reflection step to your Docs Q&A agent to self-check citations.

### Day 18 — Human-in-the-loop + guard steps
- Pause for human approval before risky tool calls (e.g., writing to a DB, sending an email).
- **Do:** Add an approval gate before any `write`/`DELETE` SQL.

### Day 19 — Multi-agent patterns
- **Supervisor → workers** and **agent handoffs**. When multiple specialized agents beat one mega-agent (and when they don't — usually they don't; start simple).
- **Do:** A supervisor that routes a request to a "SQL agent" or a "docs agent."

### Day 20 — MCP (Model Context Protocol)
- The open standard for plugging agents into external tools/data without custom glue. Connect your agent to one MCP server (filesystem, GitHub, or Postgres).
- **Why it matters:** MCP is fast becoming the standard way agents get tools — knowing it is increasingly expected.

### Day 21 — 🛠️ Project 3: "Postgres Analyst Agent" (text-to-SQL)
**Build:** An agent that answers natural-language questions about a real database — *perfect for a PERN dev*.
- Schema introspection → safe SQL generation → execution → natural-language answer + the table.
- Guardrails: read-only role, query validation, row limits, approval gate for anything non-`SELECT`.
- LangGraph orchestration, FastAPI backend, React UI that shows the SQL it ran.
- **Why it matters:** "Let me ask my database in English" is a killer internal tool and a standout portfolio piece that leans on skills most AI folks lack.

---

## Week 4 — Production: Make It Reliable and Ship It

**Goal:** The difference between a demo and a product.

### Day 22 — Evals (how you know it works)
- Build a **golden dataset**: 20–30 (input → expected output/behavior) cases.
- Run your agent against it and score. Add **LLM-as-a-judge** for fuzzy correctness.
- **Mental model:** without evals you're not engineering, you're vibing. Evals are your test suite.
- **Do:** A pytest-style eval runner that stores results in Postgres.

### Day 23 — Regression testing + prompt versioning
- Treat prompts like code: version them, re-run evals on every change, catch regressions.
- **Do:** Change a prompt, run evals, see what breaks.

### Day 24 — Observability + tracing
- Trace every run: prompts, tool calls, tokens, latency, cost. Use **LangSmith** (or Langfuse / OpenLLMetry).
- **Do:** Wire up tracing; find your slowest and priciest step.

### Day 25 — Cost + latency optimization (80/20)
- The big levers: **prompt caching**, smaller models for easy steps, fewer tool round-trips, **streaming** responses (TTFT matters for UX).
- **Do:** Add streaming to your FastAPI endpoint → React UI; add caching for a fixed system prompt.

### Day 26 — Guardrails + safety
- Input/output validation, **prompt-injection** defense (especially when tools touch real systems or untrusted text), allow-lists for tools, PII handling.
- **Do:** Try to jailbreak your own agent; then patch the holes.

### Day 27 — Async + background jobs
- Long-running agents shouldn't block requests. Use FastAPI `BackgroundTasks` or a queue (Celery/RQ/Arq); stream progress to the client.
- **Do:** Make a long agent task run in the background with status polling/streaming.

### Day 28 — Deploy
- Containerize, set env/secrets, rate-limit, add health checks. Deploy backend (Fly.io/Render/Railway) + frontend (Vercel).
- **Do:** Get one agent live on a public URL.

### Day 29 — Polish the capstone
- Pick your strongest project (the **Postgres Analyst** is the recommended capstone) and make it production-grade: error states in the UI, loading/streaming, tool-call transparency, a README with architecture diagram.

### Day 30 — 🛠️ Capstone: Ship + Write-Up
**Deliver:** One polished, deployed, evaluated agent end-to-end.
- README covering: the problem, architecture, the agent loop, RAG/memory, guardrails, evals, and cost notes.
- A short Loom/GIF demo. Post it (GitHub, LinkedIn, blog).
- **Why it matters:** A deployed, evaluated agent with a clear write-up is worth more than ten tutorials finished. This is your proof of skill.

---

## What you'll have after 30 days

- **4 projects:** a hand-rolled mini-agent, a docs RAG agent, a multi-agent system, and a deployed text-to-SQL analyst.
- A real mental model of agents — you can debug, not just assemble.
- Production muscles: evals, tracing, streaming, guardrails, deploy.
- A portfolio that pairs AI agents with backend depth most candidates don't have.

## Deliberately skipped (the 80% you don't need yet)
Model training/fine-tuning, transformer internals, GPU ops, building embeddings from scratch, exotic framework tours, agent benchmarks research, and chasing every new release. Revisit *fine-tuning* and *advanced multi-agent* only once you've shipped — by then you'll know if you actually need them.

## A few high-signal resources
- Your provider's official docs on **tool use / function calling** and **structured outputs** (read these properly — most value per minute).
- **LangGraph** docs (the "concepts" + "how-to" sections).
- **pgvector** README (you'll move fast here given your Postgres background).
- One good **prompt-engineering** guide from your model provider — skim, don't memorize.
- **MCP** spec/intro docs.

---

### How to use this plan
- If a day clicks fast, push into the next. If it's hard, repeat it — depth beats checkboxes.
- Keep a `LEARNINGS.md` per project: what broke, what fixed it. That file becomes your real expertise.
- When stuck, drop back to the **Week-1 loop** mentally: *messages in, tool call out, run it, repeat.* Almost every bug lives there.
