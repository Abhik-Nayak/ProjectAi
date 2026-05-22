import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChunkEntity } from '../document/chunk.entity';
import { EmbeddingModule } from '../embedding/embedding.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChunkEntity]),
    EmbeddingModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
