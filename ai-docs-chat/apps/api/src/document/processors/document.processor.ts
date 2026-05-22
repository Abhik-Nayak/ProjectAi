import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { DocumentStatus } from '@ai-docs-chat/shared';
import { DocumentEntity } from '../document.entity';
import { ChunkEntity } from '../chunk.entity';
import { TextExtractorService } from '../services/text-extractor.service';
import { ChunkingService } from '../services/chunking.service';
import { EmbeddingService } from '../../embedding/embedding.service';

interface ProcessJobData {
  documentId: string;
}

@Processor('document-processing')
export class DocumentProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(ChunkEntity)
    private readonly chunkRepo: Repository<ChunkEntity>,
    private readonly textExtractor: TextExtractorService,
    private readonly chunking: ChunkingService,
    private readonly embedding: EmbeddingService,
  ) {
    super();
  }

  async process(job: Job<ProcessJobData>): Promise<void> {
    const { documentId } = job.data;
    this.logger.log(`Processing document ${documentId}`);

    const doc = await this.documentRepo.findOneOrFail({
      where: { id: documentId },
    });

    await this.documentRepo.update(documentId, {
      status: DocumentStatus.PROCESSING,
    });

    try {
      const text = await this.textExtractor.extract(
        doc.storagePath,
        doc.mimeType,
      );

      const chunks = this.chunking.chunk(text);
      this.logger.log(`Document ${documentId}: ${chunks.length} chunks`);

      const embeddings = await this.embedding.embed(
        chunks.map((c) => c.content),
      );

      const chunkEntities = chunks.map((chunk, index) =>
        this.chunkRepo.create({
          documentId,
          content: chunk.content,
          chunkIndex: index,
          tokenCount: chunk.tokenCount,
          embedding: embeddings[index],
        }),
      );
      await this.chunkRepo.save(chunkEntities);

      await this.documentRepo.update(documentId, {
        status: DocumentStatus.READY,
        chunkCount: chunks.length,
      });

      this.logger.log(`Document ${documentId} ready (${chunks.length} chunks)`);
    } catch (error) {
      this.logger.error(`Failed to process document ${documentId}`, error);
      await this.documentRepo.update(documentId, {
        status: DocumentStatus.FAILED,
      });
      throw error;
    }
  }
}
