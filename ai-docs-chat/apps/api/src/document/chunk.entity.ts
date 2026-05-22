import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DocumentEntity } from './document.entity';

@Entity('document_chunks')
export class ChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  documentId!: string;

  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document!: DocumentEntity;

  @Column('text')
  content!: string;

  @Column('int')
  chunkIndex!: number;

  @Column('int')
  tokenCount!: number;

  @Column('float8', { array: true })
  embedding!: number[];

  @CreateDateColumn()
  createdAt!: Date;
}
