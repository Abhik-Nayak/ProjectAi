import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import fs from "fs";
import path from "path";

async function parseAndChunkPDF(filepath) {
  try {
    // Read PDF
    const pdfBuffer = fs.readFileSync(filepath);
    const pdfData = await pdfParse(pdfBuffer);

    const fullText = pdfData.text;

    // Simple chunking: split by paragraphs + fixed size
    const CHUNK_SIZE = 500; // tokens (approximate: 1 token ≈ 4 chars)
    const OVERLAP = 100;

    const chunks = [];
    const charLimit = CHUNK_SIZE * 4; // rough conversion
    const overlapChar = OVERLAP * 4;

    let i = 0;
    while (i < fullText.length) {
      const chunk = fullText.substring(i, i + charLimit);

      chunks.push({
        text: chunk.trim(),
        pageNumber: Math.max(1,Math.ceil((i / fullText.length) * pdfData.numpages)),
        filepath: filepath,
        filename: path.basename(filepath),
      });

      i += charLimit - overlapChar;
    }
    return chunks;
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw error;
  }
}

export default parseAndChunkPDF;