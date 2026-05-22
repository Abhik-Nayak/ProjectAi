import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: config.get<string>('OPENAI_API_KEY'),
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const batchSize = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });
      allEmbeddings.push(...response.data.map((d) => d.embedding));
    }

    return allEmbeddings;
  }
}
