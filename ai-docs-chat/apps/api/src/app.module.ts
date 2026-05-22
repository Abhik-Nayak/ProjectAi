import { Module, OnModuleInit, Injectable } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { DocumentModule } from './document/document.module';
import { SearchModule } from './search/search.module';
import { HealthModule } from './health/health.module';

@Injectable()
export class PgVectorSetup implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '..', '..', '.env'),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get('POSTGRES_USER', 'aidocs'),
        password: config.get('POSTGRES_PASSWORD', 'aidocs_secret'),
        database: config.get('POSTGRES_DB', 'aidocs_chat'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          username: config.get('REDIS_USERNAME', 'default'),
          password: config.get('REDIS_PASSWORD', ''),
          tls: config.get('REDIS_TLS', 'false') === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
        },
      }),
    }),

    HealthModule,
    DocumentModule,
    SearchModule,
  ],
  providers: [PgVectorSetup],
})
export class AppModule {}
