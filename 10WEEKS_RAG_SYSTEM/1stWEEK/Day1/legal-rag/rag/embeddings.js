import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbeddings(chunks) {
  console.log(`Embedding ${chunks.length} chunks...`);

  const embeddedChunks = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const vector = await embeddings.embedQuery(chunks[i].text);

      embeddedChunks.push({
        ...chunks[i],
        embedding: vector,
      });

      if ((i + 1) % 5 === 0) {
        console.log(`  ✓ Embedded ${i + 1}/${chunks.length}`);
      }
    } catch (error) {
      console.error(`Error embedding chunk ${i}:`, error);
    }
  }

  return embeddedChunks;
}

// Cosine similarity
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function searchVector(query, vectorStore, topK = 3) {
  // Embed the query
  const queryEmbedding = await embeddings.embedQuery(query);

  // Score all chunks
  const scored = vectorStore.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // Sort and return top K
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

export { searchVector, generateEmbeddings };
