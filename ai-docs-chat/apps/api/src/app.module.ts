import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { DocumentModule } from './document/document.module';
import { HealthModule } from './health/health.module';

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
        synchronize: true, // Phase 0 only — use migrations in prod
      }),
    }),

    HealthModule,
    DocumentModule,
  ],
})
export class AppModule {}
