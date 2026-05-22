export interface SearchQueryDto {
  query: string;
  topK?: number;
}

export interface SearchResultDto {
  chunkId: string;
  documentId: string;
  filename: string;
  content: string;
  chunkIndex: number;
  similarity: number;
}
