import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentStatus } from '@ai-docs-chat/shared';

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  filename!: string;

  @Column()
  mimeType!: string;

  @Column({ type: 'bigint' })
  sizeBytes!: number;

  @Column({ type: 'varchar', default: DocumentStatus.PENDING })
  status!: DocumentStatus;

  @Column({ default: 0 })
  chunkCount!: number;

  @Column()
  storagePath!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
