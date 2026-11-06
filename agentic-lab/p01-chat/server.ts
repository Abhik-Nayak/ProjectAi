import express from "express";

const app = express();
app.use(express.json());
app.use(express.static("ui")); // serves ui/index.html at http://localhost:3000
const OLLAMA = "http://localhost:11434";
const MODEL = "qwen2.5:7b";

app.post("/chat", async (req, res) => {
  const { messages } = req.body; // [{ role, content }]
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      options: { temperature: 0.2, num_ctx: 4096 },
      messages: [{ role: "system", content: "You are a concise assistant." }, ...messages],
    }),
  });

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop()!;
    for (const line of lines) {
      if (!line.trim()) continue;
      const j = JSON.parse(line);
      if (j.message?.content) res.write(j.message.content);
      if (j.done) console.log("tokens in/out:", j.prompt_eval_count, j.eval_count);
    }
  }
  res.end();
});

app.listen(3000, () => console.log("http://localhost:3000"));