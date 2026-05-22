import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

@Injectable()
export class TextExtractorService {
  async extract(filePath: string, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        return this.extractPdf(filePath);
      case 'text/plain':
      case 'text/markdown':
        return this.extractText(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractDocx(filePath);
      default:
        throw new Error(`Unsupported MIME type: ${mimeType}`);
    }
  }

  private async extractPdf(filePath: string): Promise<string> {
    const buffer = await readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async extractText(filePath: string): Promise<string> {
    return readFile(filePath, 'utf-8');
  }

  private async extractDocx(filePath: string): Promise<string> {
    const buffer = await readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}
