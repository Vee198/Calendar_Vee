import * as FileSystem from 'expo-file-system/legacy';

const FEEDBACK_FILE = FileSystem.documentDirectory + 'feedback_log.csv';

export interface FeedbackEntry {
  id: string;
  timestamp: string;
  username: string;
  category: string;
  message: string;
  rating: number; // 1-5
}

class FeedbackService {
  /**
   * Initialize CSV file with headers if not exists
   */
  private async ensureFile(): Promise<void> {
    const info = await FileSystem.getInfoAsync(FEEDBACK_FILE);
    if (!info.exists) {
      const headers = 'id,timestamp,username,category,rating,message\n';
      await FileSystem.writeAsStringAsync(FEEDBACK_FILE, headers, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }
  }

  /**
   * Escape CSV field (handle commas, quotes, newlines)
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  /**
   * Submit new feedback
   */
  async submit(entry: Omit<FeedbackEntry, 'id' | 'timestamp'>): Promise<FeedbackEntry> {
    await this.ensureFile();

    const feedback: FeedbackEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    const row = [
      feedback.id,
      feedback.timestamp,
      this.escapeCSV(feedback.username),
      this.escapeCSV(feedback.category),
      feedback.rating.toString(),
      this.escapeCSV(feedback.message),
    ].join(',') + '\n';

    // Read existing content, then append new row
    const existing = await FileSystem.readAsStringAsync(FEEDBACK_FILE, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await FileSystem.writeAsStringAsync(FEEDBACK_FILE, existing + row, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return feedback;
  }

  /**
   * Read all feedback entries from CSV
   */
  async getAll(): Promise<FeedbackEntry[]> {
    await this.ensureFile();

    const content = await FileSystem.readAsStringAsync(FEEDBACK_FILE, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const lines = content.trim().split('\n');
    if (lines.length <= 1) return []; // Only header

    const entries: FeedbackEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const fields = this.parseCSVLine(line);
        if (fields.length >= 6) {
          entries.push({
            id: fields[0],
            timestamp: fields[1],
            username: fields[2],
            category: fields[3],
            rating: parseInt(fields[4], 10) || 3,
            message: fields[5],
          });
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Return newest first
    return entries.reverse();
  }

  /**
   * Parse a CSV line handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          fields.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    fields.push(current);

    return fields;
  }

  /**
   * Get feedback count
   */
  async getCount(): Promise<number> {
    const entries = await this.getAll();
    return entries.length;
  }

  /**
   * Get CSV file path (for export/sharing)
   */
  getFilePath(): string {
    return FEEDBACK_FILE;
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;
