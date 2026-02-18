import * as XLSX from 'xlsx';
import { type InsertGame, type SportType } from "@shared/schema";
import { storage } from "./storage";

export interface SyncResult {
  success: boolean;
  gamesAdded: number;
  gamesUpdated: number;
  skipped: number;
  errors: string[];
  message: string;
}

/**
 * Convert Google Drive sharing link to export URL
 * Example: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * Converts to: https://docs.google.com/spreadsheets/d/FILE_ID/export?format=xlsx
 */
function convertToExportUrl(url: string): string {
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
 * Parse Excel data and convert to InsertGame objects
 */
function parseExcelToGames(buffer: Buffer): { games: InsertGame[], skippedRows: number, errors: string[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet) as any[];
  
  const games: InsertGame[] = [];
  let skippedRows = 0;
  const errors: string[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // Excel row number (accounting for header)
    
    // Skip empty rows
    if (!row.Sport && !row.Opponent && !row.Date) {
      continue;
    }
    
    // Get Home/Away value (handle both "Home/Away" and "Home / Away" column names)
    const homeAwayValue = row['Home/Away'] || row['Home / Away'];
    
    // Validate required fields
    if (!row.Sport || !row.Opponent || !row.Date || !row.Time || !row.Location || !homeAwayValue) {
      skippedRows++;
      errors.push(`Row ${rowNum}: Missing required fields`);
      console.warn(`Row ${rowNum}: Missing required fields`, row);
      continue;
    }
    
    // Validate sport type using shared schema
    const validSports: SportType[] = ['Football', 'Boys Basketball', 'Girls Basketball', 'Volleyball', 'Boys Hockey', 'Girls Ice Hockey'];
    if (!validSports.includes(row.Sport as SportType)) {
      skippedRows++;
      errors.push(`Row ${rowNum}: Invalid sport "${row.Sport}" (must be one of: ${validSports.join(', ')})`);
      console.warn(`Row ${rowNum}: Invalid sport "${row.Sport}"`, row);
      continue;
    }
    const sport = row.Sport as SportType;
    
    // Parse date - handle Excel date serial numbers and string dates
    let gameDate: Date;
    if (typeof row.Date === 'number') {
      // Excel serial date - convert to actual Date object
      // Excel epoch: Jan 1, 1900; Unix epoch: Jan 1, 1970
      // 25569 = days between Excel epoch and Unix epoch
      const unixTimestamp = (row.Date - 25569) * 86400 * 1000;
      gameDate = new Date(unixTimestamp);
    } else if (typeof row.Date === 'string') {
      // String date
      gameDate = new Date(row.Date);
    } else {
      console.warn('Invalid date format in row:', row);
      continue;
    }
    
    // Validate the date is valid
    if (isNaN(gameDate.getTime())) {
      skippedRows++;
      errors.push(`Row ${rowNum}: Invalid date value`);
      console.warn(`Row ${rowNum}: Invalid date value`, row);
      continue;
    }
    
    // Parse time - handle Excel time format (decimal) or string
    let gameTime: string;
    if (typeof row.Time === 'number') {
      // Excel time format (fraction of day) - convert to HH:MM AM/PM
      const totalMinutes = Math.round(row.Time * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      gameTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } else {
      gameTime = String(row.Time);
    }
    
    // Validate home/away (case-insensitive)
    const homeAway = String(homeAwayValue).toLowerCase().trim();
    if (homeAway !== 'home' && homeAway !== 'away') {
      skippedRows++;
      errors.push(`Row ${rowNum}: Invalid Home/Away value "${homeAwayValue}" (must be "home" or "away")`);
      console.warn(`Row ${rowNum}: Invalid Home/Away value "${homeAwayValue}"`, row);
      continue;
    }
    
    const game: InsertGame = {
      sport: sport,
      opponent: String(row.Opponent),
      date: gameDate,
      time: gameTime,
      location: String(row.Location),
      isHome: homeAway as 'home' | 'away',
    };
    
    games.push(game);
  }
  
  return { games, skippedRows, errors };
}

/**
 * Sync games from Google Drive spreadsheet to database
 */
export async function syncFromGoogleDrive(triggeredBy: 'manual' | 'cron'): Promise<SyncResult> {
  const googleDriveUrl = process.env.SYNC_GOOGLE_DRIVE_URL;
  
  if (!googleDriveUrl) {
    const errorMessage = 'SYNC_GOOGLE_DRIVE_URL environment variable not configured';
    
    // Log error to database
    await storage.createSyncLog({
      gamesAdded: '0',
      gamesUpdated: '0',
      gamesSkipped: '0',
      status: 'error',
      errorMessage,
      triggeredBy,
    });
    
    return {
      success: false,
      gamesAdded: 0,
      gamesUpdated: 0,
      skipped: 0,
      errors: [errorMessage],
      message: errorMessage,
    };
  }
  
  try {
    // Convert sharing URL to export URL
    const exportUrl = convertToExportUrl(googleDriveUrl);
    
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
    const parseResult = parseExcelToGames(buffer);
    
    if (parseResult.games.length === 0) {
      if (parseResult.errors.length > 0) {
        throw new Error(`No valid games found. Errors: ${parseResult.errors.join('; ')}`);
      }
      throw new Error('No valid games found in Excel file');
    }
    
    // Upsert games to database with deduplication
    const upsertResult = await storage.upsertGamesBatch(parseResult.games);
    
    // Build success message
    let message = `Successfully synced ${upsertResult.added + upsertResult.updated} games`;
    if (upsertResult.added > 0) {
      message += ` (${upsertResult.added} added`;
      if (upsertResult.updated > 0) {
        message += `, ${upsertResult.updated} updated`;
      }
      message += ')';
    } else if (upsertResult.updated > 0) {
      message += ` (${upsertResult.updated} updated)`;
    }
    if (parseResult.skippedRows > 0) {
      message += ` - ${parseResult.skippedRows} rows skipped`;
    }
    
    // Create success log in database
    await storage.createSyncLog({
      gamesAdded: String(upsertResult.added),
      gamesUpdated: String(upsertResult.updated),
      gamesSkipped: String(parseResult.skippedRows),
      status: 'success',
      errorMessage: parseResult.errors.length > 0 ? parseResult.errors.join('; ') : null,
      triggeredBy,
    });
    
    // Log errors if any (these are validation warnings, not fatal)
    if (parseResult.errors.length > 0) {
      console.warn('Validation errors during sync:', parseResult.errors);
    }
    
    console.log(message);
    
    return {
      success: true,
      gamesAdded: upsertResult.added,
      gamesUpdated: upsertResult.updated,
      skipped: parseResult.skippedRows,
      errors: parseResult.errors,
      message,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log error to database
    await storage.createSyncLog({
      gamesAdded: '0',
      gamesUpdated: '0',
      gamesSkipped: '0',
      status: 'error',
      errorMessage,
      triggeredBy,
    });
    
    console.error('Sync error:', error);
    
    return {
      success: false,
      gamesAdded: 0,
      gamesUpdated: 0,
      skipped: 0,
      errors: [errorMessage],
      message: errorMessage,
    };
  }
}
