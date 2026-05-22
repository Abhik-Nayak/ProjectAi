import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { DocumentStatus, UploadResponseDto, DocumentListItemDto } from '@ai-docs-chat/shared';
import { DocumentEntity } from './document.entity';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectQueue('document-processing')
    private readonly processingQueue: Queue,
  ) {}

  async handleUpload(file: Express.Multer.File): Promise<UploadResponseDto> {
    const doc = this.documentRepo.create({
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: file.path,
      status: DocumentStatus.PENDING,
    });

    const saved = await this.documentRepo.save(doc);

    await this.processingQueue.add('process', { documentId: saved.id });

    return {
      id: saved.id,
      filename: saved.filename,
      status: saved.status,
      message: 'Document uploaded and queued for processing',
    };
  }

  async listDocuments(): Promise<DocumentListItemDto[]> {
    const docs = await this.documentRepo.find({
      order: { createdAt: 'DESC' },
    });

    return docs.map((d) => ({
      id: d.id,
      filename: d.filename,
      mimeType: d.mimeType,
      sizeBytes: Number(d.sizeBytes),
      status: d.status,
      chunkCount: d.chunkCount,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async getDocument(id: string): Promise<DocumentEntity> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }
}
