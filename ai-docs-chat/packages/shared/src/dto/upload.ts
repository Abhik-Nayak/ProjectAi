import { DocumentStatus } from '../types/document';

export interface UploadResponseDto {
  id: string;
  filename: string;
  status: DocumentStatus;
  message: string;
}

export interface DocumentListItemDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  chunkCount: number;
  createdAt: string;
}

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
