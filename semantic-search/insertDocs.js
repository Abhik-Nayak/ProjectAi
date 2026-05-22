const OpenAI = require("openai");
const pool = require("./db");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const documents = [
  "JWT authentication works using signed tokens.",
  "Docker containers package applications with dependencies.",
  "Kubernetes manages container orchestration.",
  "Redis is an in-memory key-value database.",
  "PostgreSQL is a relational database system."
];

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

async function insertDocuments() {
  for (const doc of documents) {
    const embedding = await generateEmbedding(doc);
    console.log("doc:",doc,"Embedding:", embedding);
    await pool.query(
      "INSERT INTO documents (content, embedding) VALUES ($1, $2::vector)",
      [doc, JSON.stringify(embedding)]
    );
    

    console.log("Inserted:", doc);
  }

  process.exit();
}

insertDocuments();