import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchResultDto } from '@ai-docs-chat/shared';
import { ChunkEntity } from '../document/chunk.entity';
import { EmbeddingService } from '../embedding/embedding.service';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(ChunkEntity)
    private readonly chunkRepo: Repository<ChunkEntity>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(query: string, topK = 5): Promise<SearchResultDto[]> {
    const embeddings = await this.embeddingService.embed([query]);
    const queryEmbedding = embeddings[0]!;
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const results = await this.chunkRepo.query(
      `SELECT dc.id, dc."documentId", dc.content, dc."chunkIndex", dc."tokenCount",
              d.filename,
              1 - (dc.embedding::vector <=> $1::vector) AS similarity
       FROM document_chunks dc
       JOIN documents d ON d.id = dc."documentId"
       ORDER BY dc.embedding::vector <=> $1::vector
       LIMIT $2`,
      [embeddingStr, topK],
    );

    return results.map((r: any) => ({
      chunkId: r.id,
      documentId: r.documentId,
      filename: r.filename,
      content: r.content,
      chunkIndex: r.chunkIndex,
      similarity: parseFloat(r.similarity),
    }));
  }
}
