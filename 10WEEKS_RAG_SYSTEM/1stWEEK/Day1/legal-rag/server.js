import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app=express();
app.use(cors());
app.use(express.json({limit:"50mb"}));

// Import RAG modules 
import parseAndChunkPDF from "./rag/chunking.js";
import { generateEmbeddings, searchVector } from "./rag/embeddings.js";
import generateAnswer from "./rag/generation.js";

let vectorStore = [];
let documents = [];

// ====API ENDPOINTS =======

// 1. Upload & Process PDF
app.post('/api/upload', async (req, res) => {
  try {
    const { filename, base64Data } = req.body;

    // Save PDF
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

    const buffer = Buffer.from(base64Data, 'base64');
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);

    // Parse & chunk
    console.log('📄 Parsing PDF...');
    const chunks = await parseAndChunkPDF(filepath);
    console.log(`✓ Created ${chunks.length} chunks`);

    // Generate embeddings
    console.log('🔗 Generating embeddings...');
    const embeddedChunks = await generateEmbeddings(chunks);

    // Store in vector store
    documents.push({
      filename,
      chunks: embeddedChunks,
      uploadedAt: new Date()
    });

    vectorStore = [...vectorStore, ...embeddedChunks];

    res.json({
      success: true,
      message: `Uploaded "${filename}" with ${chunks.length} chunks`,
      chunkCount: chunks.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Query the RAG system
app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (vectorStore.length === 0) {
      return res.status(400).json({ error: 'No documents uploaded yet' });
    }
    
    console.log(`\n❓ Query: "${query}"`);
    
    // Step 1: Search vector store
    console.log('🔍 Searching...');
    const retrieved = await searchVector(query, vectorStore, 3);
    
    console.log(`✓ Found ${retrieved.length} relevant chunks`);
    retrieved.forEach((r, i) => {
      console.log(`  ${i+1}. (score: ${r.score.toFixed(2)}) ${r.text.slice(0, 60)}...`);
    });
    
    // Step 2: Generate answer
    console.log('💭 Generating answer...');
    const answer = await generateAnswer(query, retrieved);
    
    res.json({
      query,
      answer: answer.text,
      sources: retrieved.map(r => ({
        text: r.text,
        score: r.score,
        filename: r.filename
      })),
      chunkCount: vectorStore.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Get status
app.get('/api/status', (req, res) => {
  res.json({
    documentsCount: documents.length,
    chunksCount: vectorStore.length,
    documents: documents.map(d => ({
      filename: d.filename,
      uploadedAt: d.uploadedAt,
      chunkCount: d.chunks.length
    }))
  });
});

// Global error handler — logs file, line, and full stack trace
app.use((err, req, res, _next) => {
  const stack = err.stack || '';
  const match = stack.match(/at\s+\S+\s+\((.+):(\d+):(\d+)\)/);
  const location = match
    ? { file: match[1], line: match[2], column: match[3] }
    : null;

  console.error('\n========== UNHANDLED ERROR ==========');
  console.error(`Message : ${err.message}`);
  if (location) {
    console.error(`File    : ${location.file}`);
    console.error(`Line    : ${location.line}:${location.column}`);
  }
  console.error(`Route   : ${req.method} ${req.originalUrl}`);
  console.error(`Stack   :\n${stack}`);
  console.error('=====================================\n');

  res.status(err.status || 500).json({
    error: err.message,
    ...(process.env.NODE_ENV !== 'production' && { location, stack })
  });
});

process.on('uncaughtException', (err) => {
  console.error('\n========== UNCAUGHT EXCEPTION ==========');
  console.error(err.stack || err.message);
  console.error('========================================\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n========== UNHANDLED REJECTION ==========');
  console.error(reason instanceof Error ? reason.stack : reason);
  console.error('=========================================\n');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 RAG Server running on http://localhost:${PORT}`);
  console.log(`📝 Use this to test:\n`);
  console.log(`   POST http://localhost:${PORT}/api/upload`);
  console.log(`   POST http://localhost:${PORT}/api/query`);
  console.log(`   GET  http://localhost:${PORT}/api/status\n`);
});