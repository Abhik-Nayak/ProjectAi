import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.js";

const app = express();
const port = parseInt(process.env.PORT || "3000", 10);

app.use(cors({ origin: "http://localhost:3001" }));
app.use(express.json());

app.use("/api/chat", chatRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
