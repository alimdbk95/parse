import fs from 'fs';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';

interface ParsedDocument {
  content: string;
  metadata: {
    type: string;
    headers?: string[];
    rowCount?: number;
    columns?: number;
    preview?: any[];
  };
}

export class DocumentService {
  async parseDocument(filePath: string, mimeType: string): Promise<ParsedDocument> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.csv':
        return this.parseCSV(filePath);
      case '.txt':
        return this.parseText(filePath);
      case '.json':
        return this.parseJSON(filePath);
      case '.pdf':
        return this.parsePDF(filePath);
      default:
        return this.parseText(filePath);
    }
  }

  private async parseCSV(filePath: string): Promise<ParsedDocument> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = csvParse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const headers = records.length > 0 ? Object.keys(records[0]) : [];
      const preview = records.slice(0, 10);

      return {
        content: fileContent,
        metadata: {
          type: 'csv',
          headers,
          rowCount: records.length,
          columns: headers.length,
          preview,
        },
      };
    } catch (error) {
      console.error('Error parsing CSV:', error);
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        content,
        metadata: { type: 'csv' },
      };
    }
  }

  private async parseText(filePath: string): Promise<ParsedDocument> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    return {
      content,
      metadata: {
        type: 'text',
        rowCount: lines.length,
      },
    };
  }

  private async parseJSON(filePath: string): Promise<ParsedDocument> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      let preview: any[] = [];
      if (Array.isArray(data)) {
        preview = data.slice(0, 10);
      } else if (typeof data === 'object') {
        preview = [data];
      }

      return {
        content,
        metadata: {
          type: 'json',
          rowCount: Array.isArray(data) ? data.length : 1,
          preview,
        },
      };
    } catch (error) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        content,
        metadata: { type: 'json' },
      };
    }
  }

  private async parsePDF(filePath: string): Promise<ParsedDocument> {
    try {
      // Dynamic import for pdf-parse
      const pdfParse = (await import('pdf-parse')).default;
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      return {
        content: data.text,
        metadata: {
          type: 'pdf',
          rowCount: data.numpages,
        },
      };
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return {
        content: 'PDF content extraction failed. The document has been uploaded but text content is not available.',
        metadata: { type: 'pdf' },
      };
    }
  }

  extractDataForChart(content: string, metadata: any): any[] | null {
    if (metadata?.preview && Array.isArray(metadata.preview)) {
      return metadata.preview;
    }

    // Try to extract data from CSV-like content
    try {
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length < 2) return null;

      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1, 11).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((header, i) => {
          const value = values[i];
          obj[header] = isNaN(Number(value)) ? value : Number(value);
        });
        return obj;
      });

      return data;
    } catch {
      return null;
    }
  }
}

export const documentService = new DocumentService();
