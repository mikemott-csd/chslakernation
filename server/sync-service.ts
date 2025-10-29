import * as XLSX from 'xlsx';
import { type Game, type InsertGame } from "@shared/schema";
import { randomUUID } from "crypto";

export interface SyncConfig {
  googleDriveUrl: string;
  lastSyncTime: Date | null;
  lastSyncStatus: 'success' | 'error' | 'never' | 'syncing';
  lastSyncError: string | null;
}

export interface SyncLog {
  id: string;
  timestamp: Date;
  status: 'success' | 'error';
  message: string;
  gamesImported?: number;
}

export class GoogleDriveSyncService {
  private config: SyncConfig;
  private syncLogs: SyncLog[];
  private maxLogs = 50;

  constructor() {
    this.config = {
      googleDriveUrl: '',
      lastSyncTime: null,
      lastSyncStatus: 'never',
      lastSyncError: null,
    };
    this.syncLogs = [];
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  getSyncLogs(): SyncLog[] {
    return [...this.syncLogs].reverse(); // Most recent first
  }

  setGoogleDriveUrl(url: string): void {
    this.config.googleDriveUrl = url;
  }

  private addLog(status: 'success' | 'error', message: string, gamesImported?: number): void {
    const log: SyncLog = {
      id: randomUUID(),
      timestamp: new Date(),
      status,
      message,
      gamesImported,
    };
    
    this.syncLogs.push(log);
    
    // Keep only the last N logs
    if (this.syncLogs.length > this.maxLogs) {
      this.syncLogs = this.syncLogs.slice(-this.maxLogs);
    }
  }

  /**
   * Convert Google Drive sharing link to export URL
   * Example: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
   * Converts to: https://docs.google.com/spreadsheets/d/FILE_ID/export?format=xlsx
   */
  private convertToExportUrl(url: string): string {
    // Handle various Google Drive URL formats
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
    }
    
    // If already an export URL, return as is
    if (url.includes('/export?format=')) {
      return url;
    }
    
    throw new Error('Invalid Google Drive URL format');
  }

  /**
   * Parse Excel data and convert to Game objects
   */
  private parseExcelToGames(buffer: Buffer): Game[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];
    
    const games: Game[] = [];
    
    for (const row of data) {
      // Skip empty rows
      if (!row.Sport && !row.Opponent && !row.Date) {
        continue;
      }
      
      // Validate required fields
      if (!row.Sport || !row.Opponent || !row.Date || !row.Time || !row.Location || !row['Home/Away']) {
        console.warn('Skipping invalid row:', row);
        continue;
      }
      
      // Validate sport type
      const validSports = ['Football', 'Soccer', 'Basketball', 'Volleyball'];
      if (!validSports.includes(row.Sport)) {
        console.warn(`Invalid sport "${row.Sport}" in row:`, row);
        continue;
      }
      
      // Parse date - handle Excel date serial numbers and string dates
      let gameDate: Date;
      if (typeof row.Date === 'number') {
        // Excel serial date
        gameDate = XLSX.SSF.parse_date_code(row.Date);
      } else if (typeof row.Date === 'string') {
        // String date
        gameDate = new Date(row.Date);
      } else {
        console.warn('Invalid date format in row:', row);
        continue;
      }
      
      // Validate home/away
      const homeAway = String(row['Home/Away']).toLowerCase();
      if (homeAway !== 'home' && homeAway !== 'away') {
        console.warn(`Invalid Home/Away value "${row['Home/Away']}" in row:`, row);
        continue;
      }
      
      const game: Game = {
        id: randomUUID(),
        sport: row.Sport,
        opponent: String(row.Opponent),
        date: gameDate,
        time: String(row.Time),
        location: String(row.Location),
        isHome: homeAway as 'home' | 'away',
      };
      
      games.push(game);
    }
    
    return games;
  }

  /**
   * Fetch and parse Excel file from Google Drive
   */
  async syncFromGoogleDrive(): Promise<Game[]> {
    if (!this.config.googleDriveUrl) {
      throw new Error('Google Drive URL not configured');
    }
    
    this.config.lastSyncStatus = 'syncing';
    
    try {
      // Convert sharing URL to export URL
      const exportUrl = this.convertToExportUrl(this.config.googleDriveUrl);
      
      console.log(`Fetching Excel file from: ${exportUrl}`);
      
      // Fetch the Excel file
      const response = await fetch(exportUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      // Get the file as array buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Parse Excel to games
      const games = this.parseExcelToGames(buffer);
      
      if (games.length === 0) {
        throw new Error('No valid games found in Excel file');
      }
      
      // Update sync status
      this.config.lastSyncTime = new Date();
      this.config.lastSyncStatus = 'success';
      this.config.lastSyncError = null;
      
      this.addLog('success', `Successfully imported ${games.length} games`, games.length);
      
      console.log(`Successfully synced ${games.length} games from Google Drive`);
      
      return games;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.config.lastSyncStatus = 'error';
      this.config.lastSyncError = errorMessage;
      
      this.addLog('error', errorMessage);
      
      console.error('Sync error:', error);
      throw error;
    }
  }
}

export const syncService = new GoogleDriveSyncService();
