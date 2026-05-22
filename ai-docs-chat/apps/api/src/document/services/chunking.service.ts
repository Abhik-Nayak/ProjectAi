import { Injectable } from '@nestjs/common';
import { encode, decode } from 'gpt-tokenizer';

export interface Chunk {
  content: string;
  tokenCount: number;
}

@Injectable()
export class ChunkingService {
  chunk(text: string, maxTokens = 500, overlapTokens = 50): Chunk[] {
    const tokens = encode(text);
    const chunks: Chunk[] = [];
    let start = 0;

    while (start < tokens.length) {
      const end = Math.min(start + maxTokens, tokens.length);
      const chunkTokens = tokens.slice(start, end);
      chunks.push({
        content: decode(chunkTokens),
        tokenCount: chunkTokens.length,
      });
      if (end >= tokens.length) break;
      start += maxTokens - overlapTokens;
    }

    return chunks;
  }
}
