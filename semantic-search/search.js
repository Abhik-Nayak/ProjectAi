const OpenAI = require("openai");
const pool = require("./db");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

function cosineSimilarity(vecA, vecB) {
  console.log("Length check",vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function semanticSearch(query) {
  const queryEmbedding = await generateEmbedding(query);

  const result = await pool.query("SELECT * FROM documents");

  const scoredDocs = result.rows.map((doc) => {
    const similarity = cosineSimilarity(queryEmbedding, doc.embedding);

    return {
      content: doc.content,
      similarity,
    };
  });

  scoredDocs.sort((a, b) => b.similarity - a.similarity);

  console.log("\nTop Results:\n");

  scoredDocs.slice(0, 3).forEach((doc) => {
    console.log(`Score: ${doc.similarity.toFixed(4)}`);
    console.log(doc.content);
    console.log("-------------------");
  });

  process.exit();
}

semanticSearch("How does authentication using token work?");
