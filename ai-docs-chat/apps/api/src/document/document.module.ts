import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { DocumentEntity } from './document.entity';
import { ChunkEntity } from './chunk.entity';
import { EmbeddingModule } from '../embedding/embedding.module';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentProcessor } from './processors/document.processor';
import { TextExtractorService } from './services/text-extractor.service';
import { ChunkingService } from './services/chunking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, ChunkEntity]),

    BullModule.registerQueue({
      name: 'document-processing',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }),

    EmbeddingModule,

    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: diskStorage({
          destination: config.get('UPLOAD_DIR', './uploads'),
          filename: (_req, file, cb) => {
            const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
            cb(null, uniqueName);
          },
        }),
        limits: {
          fileSize:
            config.get<number>('UPLOAD_MAX_SIZE_MB', 50) * 1024 * 1024,
        },
      }),
    }),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentProcessor, TextExtractorService, ChunkingService],
  exports: [DocumentService],
})
export class DocumentModule {}
