require("dotenv").config();
const express = require("express");
const cors = require("cors");
const chatRouter = require("./routes/chat");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`ChatGPT Clone API running on http://localhost:${PORT}`);
  console.log(`Token limit per conversation: ${process.env.MAX_TOKENS_PER_CONVERSATION || 4096}`);
});
