import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "langchain";

const llm = new ChatOpenAI({
  modelName: "gpt-4-turbo",
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

async function generateAnswer(query, retrievedChunks) {
  // Build context from retrieved chunks
  const context = retrievedChunks
    .map((chunk, i) => `[Source ${i + 1}]\n${chunk.text}`)
    .join("\n\n---\n\n");

  // Create prompt
  const systemPrompt = new SystemMessage(`
You are a legal document assistant. Answer the user's question based ONLY on the provided document excerpts.

IMPORTANT:
- If the answer isn't in the documents, say "I don't have information about this"
- Always cite which source you're referencing
- Be concise and clear
- For legal questions, remind user to consult a lawyer
  `);

  const userPrompt = new HumanMessage(`
QUESTION: ${query}

DOCUMENT EXCERPTS:
${context}

Please answer the question based on these excerpts.
  `);

  const response = await llm.call([systemPrompt, userPrompt]);

  return {
    text: response.content,
    model: "gpt-4-turbo",
  };
}

export default generateAnswer;
