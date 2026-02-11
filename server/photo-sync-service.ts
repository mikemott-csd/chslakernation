import { google, type drive_v3 } from 'googleapis';
import { type InsertPhoto } from "@shared/schema";
import { storage } from "./storage";
import * as fs from 'fs';
import * as path from 'path';

interface CachedImage {
  buffer: Buffer;
  mimeType: string;
  cachedAt: number;
}

const IMAGE_CACHE = new Map<string, CachedImage>();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours
const MAX_CACHE_SIZE = 200; // max cached images

function getCachedImage(key: string): CachedImage | null {
  const cached = IMAGE_CACHE.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL) {
    IMAGE_CACHE.delete(key);
    return null;
  }
  return cached;
}

function setCachedImage(key: string, buffer: Buffer, mimeType: string) {
  if (IMAGE_CACHE.size >= MAX_CACHE_SIZE) {
    const oldestKey = IMAGE_CACHE.keys().next().value;
    if (oldestKey) IMAGE_CACHE.delete(oldestKey);
  }
  IMAGE_CACHE.set(key, { buffer, mimeType, cachedAt: Date.now() });
}

export interface PhotoSyncResult {
  success: boolean;
  photosAdded: number;
  photosRemoved: number;
  errors: string[];
  message: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
}

let _driveClient: drive_v3.Drive | null = null;

/**
 * Get authenticated Google Drive client using service account (cached singleton)
 */
function getGoogleDriveClient(): drive_v3.Drive {
  if (_driveClient) return _driveClient;

  let credentials;
  
  const jsonFilePath = path.join(process.cwd(), 'attached_assets', 'csd-ai-club-8aaa80cbab14_1769630091354.json');
  if (fs.existsSync(jsonFilePath)) {
    try {
      const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
      credentials = JSON.parse(fileContent);
      console.log('[PhotoSync] Loaded credentials from attached JSON file');
    } catch (fileError) {
      console.error('[PhotoSync] Failed to load from file:', fileError);
    }
  }
  
  if (!credentials) {
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    
    if (!credentialsJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not configured');
    }

    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      try {
        const cleanedJson = credentialsJson
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .trim();
        credentials = JSON.parse(cleanedJson);
      } catch (innerError) {
        console.error('[PhotoSync] JSON parse error. First 100 chars:', credentialsJson.substring(0, 100));
        throw new Error('Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON - check the format of your service account key');
      }
    }
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  _driveClient = google.drive({ version: 'v3', auth });
  return _driveClient;
}

/**
 * List all image files in a Google Drive folder (including subfolders)
 */
async function listPhotosInFolder(folderId: string): Promise<GoogleDriveFile[]> {
  const drive = getGoogleDriveClient();
  
  const allFiles: GoogleDriveFile[] = [];
  const foldersToProcess: string[] = [folderId];
  
  // First, verify we can access the folder (with shared drive support)
  try {
    const folderInfo = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true,
    });
    console.log(`[PhotoSync] Folder access confirmed: "${folderInfo.data.name}" (${folderInfo.data.id})`);
  } catch (error: any) {
    console.error(`[PhotoSync] Cannot access folder ${folderId}:`, error.message);
    throw new Error(`Cannot access Google Drive folder: ${error.message}`);
  }

  // Process folders recursively
  while (foldersToProcess.length > 0) {
    const currentFolderId = foldersToProcess.shift()!;
    let pageToken: string | undefined;

    do {
      // List all files in current folder (images and subfolders) with shared drive support
      const response = await drive.files.list({
        q: `'${currentFolderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink, createdTime)',
        pageSize: 100,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (response.data.files) {
        for (const file of response.data.files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            // Add subfolder to process list
            console.log(`[PhotoSync] Found subfolder: "${file.name}"`);
            foldersToProcess.push(file.id!);
          } else if (file.mimeType?.startsWith('image/')) {
            // Add image file
            allFiles.push(file as GoogleDriveFile);
          }
        }
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);
  }

  console.log(`[PhotoSync] Total images found across all folders: ${allFiles.length}`);
  return allFiles;
}

/**
 * Generate a proxied thumbnail URL that goes through our server
 * This allows the server to fetch private images using the service account
 */
function generateThumbnailUrl(fileId: string): string {
  return `/api/photos/${fileId}/thumbnail`;
}

/**
 * Generate a proxied full image URL that goes through our server
 */
function generateViewUrl(fileId: string): string {
  return `/api/photos/${fileId}/image`;
}

/**
 * Download a file from Google Drive (with in-memory caching)
 */
export async function downloadDriveFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cacheKey = `full:${fileId}`;
  const cached = getCachedImage(cacheKey);
  if (cached) return { buffer: cached.buffer, mimeType: cached.mimeType };

  try {
    const drive = getGoogleDriveClient();
    
    const metaResponse = await drive.files.get({
      fileId,
      fields: 'mimeType',
      supportsAllDrives: true,
    });
    
    const mimeType = metaResponse.data.mimeType || 'image/jpeg';
    
    const response = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    
    const buffer = Buffer.from(response.data as ArrayBuffer);
    setCachedImage(cacheKey, buffer, mimeType);
    return { buffer, mimeType };
  } catch (error) {
    console.error(`[PhotoSync] Failed to download file ${fileId}:`, error);
    return null;
  }
}

/**
 * Get a thumbnail from Google Drive (with in-memory caching)
 */
export async function getThumbnail(fileId: string, size: number = 400): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cacheKey = `thumb:${fileId}:${size}`;
  const cached = getCachedImage(cacheKey);
  if (cached) return { buffer: cached.buffer, mimeType: cached.mimeType };

  try {
    const drive = getGoogleDriveClient();
    
    const response = await drive.files.get({
      fileId,
      fields: 'thumbnailLink',
      supportsAllDrives: true,
    });
    
    let thumbnailUrl = response.data.thumbnailLink;
    if (!thumbnailUrl) {
      return downloadDriveFile(fileId);
    }
    
    thumbnailUrl = thumbnailUrl.replace(/=s\d+/, `=s${size}`);
    
    const thumbnailResponse = await fetch(thumbnailUrl);
    if (!thumbnailResponse.ok) {
      return downloadDriveFile(fileId);
    }
    
    const buffer = Buffer.from(await thumbnailResponse.arrayBuffer());
    const mimeType = thumbnailResponse.headers.get('content-type') || 'image/jpeg';
    
    setCachedImage(cacheKey, buffer, mimeType);
    return { buffer, mimeType };
  } catch (error) {
    console.error(`[PhotoSync] Failed to get thumbnail for ${fileId}:`, error);
    return null;
  }
}

/**
 * Sync photos from Google Drive folder to database
 */
export async function syncPhotosFromGoogleDrive(triggeredBy: 'manual' | 'cron'): Promise<PhotoSyncResult> {
  const folderId = process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID;
  
  if (!folderId) {
    const errorMessage = 'GOOGLE_DRIVE_PHOTOS_FOLDER_ID environment variable not configured';
    
    await storage.createPhotoSyncLog({
      photosAdded: 0,
      photosRemoved: 0,
      status: 'error',
      errorMessage,
      triggeredBy,
    });
    
    return {
      success: false,
      photosAdded: 0,
      photosRemoved: 0,
      errors: [errorMessage],
      message: errorMessage,
    };
  }

  try {
    console.log(`[PhotoSync] Starting sync from Google Drive folder: ${folderId}`);
    
    // List all photos in the folder
    const drivePhotos = await listPhotosInFolder(folderId);
    console.log(`[PhotoSync] Found ${drivePhotos.length} photos in Google Drive folder`);

    let photosAdded = 0;
    const drivePhotoIds: string[] = [];
    const errors: string[] = [];

    // Upsert each photo
    for (const driveFile of drivePhotos) {
      try {
        drivePhotoIds.push(driveFile.id);
        
        const existingPhoto = await storage.getPhotoByGoogleDriveId(driveFile.id);
        
        const photoData: InsertPhoto = {
          googleDriveId: driveFile.id,
          name: driveFile.name,
          mimeType: driveFile.mimeType,
          thumbnailUrl: generateThumbnailUrl(driveFile.id),
          webViewUrl: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
          downloadUrl: generateViewUrl(driveFile.id),
          createdTime: driveFile.createdTime ? new Date(driveFile.createdTime) : null,
        };

        await storage.upsertPhoto(photoData);
        
        if (!existingPhoto) {
          photosAdded++;
        }
      } catch (error) {
        const errMsg = `Failed to sync photo ${driveFile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errMsg);
        console.error(`[PhotoSync] ${errMsg}`);
      }
    }

    // Remove photos that are no longer in Google Drive
    const photosRemoved = await storage.deletePhotosByGoogleDriveIds(drivePhotoIds);
    if (photosRemoved > 0) {
      console.log(`[PhotoSync] Removed ${photosRemoved} photos no longer in Google Drive`);
    }

    // Build success message
    let message = '';
    if (photosAdded === 0 && photosRemoved === 0) {
      message = `Photos up to date (${drivePhotos.length} total)`;
    } else {
      const parts: string[] = [];
      if (photosAdded > 0) parts.push(`${photosAdded} added`);
      if (photosRemoved > 0) parts.push(`${photosRemoved} removed`);
      message = `Successfully synced photos: ${parts.join(', ')} (${drivePhotos.length} total)`;
    }

    if (errors.length > 0) {
      message += ` - ${errors.length} errors`;
    }

    // Log success
    await storage.createPhotoSyncLog({
      photosAdded,
      photosRemoved,
      status: errors.length === 0 ? 'success' : 'partial',
      errorMessage: errors.length > 0 ? errors.join('; ') : null,
      triggeredBy,
    });

    console.log(`[PhotoSync] ${message}`);

    return {
      success: true,
      photosAdded,
      photosRemoved,
      errors,
      message,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during photo sync';
    
    await storage.createPhotoSyncLog({
      photosAdded: 0,
      photosRemoved: 0,
      status: 'error',
      errorMessage,
      triggeredBy,
    });

    console.error('[PhotoSync] Sync error:', error);

    return {
      success: false,
      photosAdded: 0,
      photosRemoved: 0,
      errors: [errorMessage],
      message: errorMessage,
    };
  }
}
