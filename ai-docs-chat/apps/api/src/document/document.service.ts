import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentStatus, UploadResponseDto, DocumentListItemDto } from '@ai-docs-chat/shared';
import { DocumentEntity } from './document.entity';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
  ) {}

  async handleUpload(file: Express.Multer.File): Promise<UploadResponseDto> {
    const doc = this.documentRepo.create({
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: file.path,
      status: DocumentStatus.READY,
    });

    const saved = await this.documentRepo.save(doc);

    return {
      id: saved.id,
      filename: saved.filename,
      status: saved.status,
      message: 'Document uploaded successfully',
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
