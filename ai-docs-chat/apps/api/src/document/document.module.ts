import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { DocumentEntity } from './document.entity';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),

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
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
