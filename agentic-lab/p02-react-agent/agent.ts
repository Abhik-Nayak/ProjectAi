import { z } from "zod";
import { tools } from "./tools.ts";

const OLLAMA = "http://localhost:11434/api/chat";
const MODEL = "qwen2.5:7b";
const MAX_STEPS = 8;

// Debug logging: shows what runs, in order
const log = (tag: string, ...rest: unknown[]) =>
  console.log(`[${tag}]`, ...rest);
const short = (s: string, n = 100) => (s.length > n ? s.slice(0, n) + "…" : s);

// One chat message (the 4 possible roles)
type Msg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: { function: { name: string; arguments: unknown } }[];
  tool_name?: string;
};

// Convert our tools into the format the model understands
const toolSpecs = tools.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: z.toJSONSchema(t.schema),
  },
}));

// Send messages + tools to the model, get one reply back
async function chat(messages: Msg[]): Promise<Msg> {
  log(
    "CHAT",
    `→ sending ${messages.length} messages (${messages.map((m) => m.role).join(", ")})`,
  );
  const r = await fetch(OLLAMA, {
    method: "POST",
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: toolSpecs,
      stream: false,
      options: { temperature: 0 },
    }),
  });
  const data = await r.json();
  log(
    "CHAT",
    `← model replied | tokens in/out: ${data.prompt_eval_count}/${data.eval_count}`,
  );
  return data.message;
}

// Run the tool the model asked for, safely
async function runTool(name: string, args: unknown): Promise<string> {
  // 1. Does the tool exist?
  const t = tools.find((t) => t.name === name);
  if (!t) return `Error: unknown tool "${name}"`;

  // 2. Are the arguments valid? (zod checks the model's input)
  const parsed = t.schema.safeParse(args);
  if (!parsed.success) return `Error: bad arguments: ${parsed.error.message}`;

  // 3. Run it, and turn any crash into an error message
  return t.run(parsed.data).catch((e) => `Error: ${e.message}`);
}

// The ReAct loop: ask model → run tools → repeat until final answer

export async function runAgent(task: string): Promise<string> {
  const messages: Msg[] = [
    {
      role: "system",
      content:
        "You are an agent. Use tools when needed. Never guess math, time, or file content. " +
        "When you have enough information, give a short final answer.",
    },
    { role: "user", content: task },
  ];

  for (let step = 1; step <= MAX_STEPS; step++) {
    console.log(`\n===== STEP ${step} / ${MAX_STEPS} =====`);
    const msg = await chat(messages);
    messages.push(msg);

    if (!msg.tool_calls?.length) {
      log("DECIDE", "no tool calls → FINAL ANSWER");
      return msg.content;
    }

    log(
      "DECIDE",
      "tool calls:",
      msg.tool_calls.map((c) => c.function.name).join(", "),
    );

    for (const call of msg.tool_calls) {
      const { name, arguments: args } = call.function;
      const result = await runTool(name, args);
      log("TOOL", `${name}(${JSON.stringify(args)}) → ${short(result)}`);
      messages.push({ role: "tool", tool_name: name, content: result });
    }
  }

  return "Stopped: max steps reached";
}

// Run from the terminal: npm run agent -- "your question"
const task = process.argv.slice(2).join(" ");
if (!task) {
  console.log('Usage: npm run agent -- "your question"');
  process.exit(1);
}
log("START", task);
console.log("\n✅", await runAgent(task));
