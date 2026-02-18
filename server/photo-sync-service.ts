import { google, type drive_v3 } from 'googleapis';
import { type InsertPhoto } from "@shared/schema";
import { storage } from "./storage";
import * as fs from 'fs';
import * as path from 'path';

const PHOTO_CACHE_DIR = path.join(process.cwd(), 'photo-cache');
const THUMB_DIR = path.join(PHOTO_CACHE_DIR, 'thumbnails');
const FULL_DIR = path.join(PHOTO_CACHE_DIR, 'full');

function ensureCacheDirs() {
  for (const dir of [PHOTO_CACHE_DIR, THUMB_DIR, FULL_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

ensureCacheDirs();

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

async function listPhotosInFolder(folderId: string): Promise<GoogleDriveFile[]> {
  const drive = getGoogleDriveClient();
  
  const allFiles: GoogleDriveFile[] = [];
  const foldersToProcess: string[] = [folderId];
  
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

  while (foldersToProcess.length > 0) {
    const currentFolderId = foldersToProcess.shift()!;
    let pageToken: string | undefined;

    do {
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
            console.log(`[PhotoSync] Found subfolder: "${file.name}"`);
            foldersToProcess.push(file.id!);
          } else if (file.mimeType?.startsWith('image/')) {
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

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/svg+xml': '.svg',
  };
  return map[mimeType] || '.jpg';
}

function getThumbPath(fileId: string, mimeType: string): string {
  return path.join(THUMB_DIR, `${fileId}${getExtension(mimeType)}`);
}

function getFullPath(fileId: string, mimeType: string): string {
  return path.join(FULL_DIR, `${fileId}${getExtension(mimeType)}`);
}

function findCachedFile(dir: string, fileId: string): string | null {
  const extensions = ['.jpg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  for (const ext of extensions) {
    const filePath = path.join(dir, `${fileId}${ext}`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

function isValidBrowserImage(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;
  return false;
}

async function downloadAndSaveFullImage(fileId: string, mimeType: string): Promise<boolean> {
  const filePath = getFullPath(fileId, mimeType);
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath);
    if (isValidBrowserImage(existing)) return true;
    console.log(`[PhotoSync] Cached file ${fileId} is not a valid browser image, re-downloading...`);
    fs.unlinkSync(filePath);
  }

  try {
    const drive = getGoogleDriveClient();
    
    const response = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    
    const buffer = Buffer.from(response.data as ArrayBuffer);
    
    if (isValidBrowserImage(buffer)) {
      fs.writeFileSync(filePath, buffer);
      console.log(`[PhotoSync] Saved full image: ${fileId} (${(buffer.length / 1024).toFixed(0)}KB)`);
      return true;
    }
    
    console.log(`[PhotoSync] File ${fileId} is RAW/non-browser format, fetching high-res thumbnail instead...`);
    const thumbResponse = await drive.files.get({
      fileId,
      fields: 'thumbnailLink',
      supportsAllDrives: true,
    });
    
    let thumbnailUrl = thumbResponse.data.thumbnailLink;
    if (thumbnailUrl) {
      thumbnailUrl = thumbnailUrl.replace(/=s\d+/, '=s1600');
      const imgResponse = await fetch(thumbnailUrl);
      if (imgResponse.ok) {
        const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
        if (isValidBrowserImage(imgBuffer)) {
          fs.writeFileSync(filePath, imgBuffer);
          console.log(`[PhotoSync] Saved high-res thumbnail as full image for ${fileId} (${(imgBuffer.length / 1024).toFixed(0)}KB)`);
          return true;
        }
      }
    }
    
    console.error(`[PhotoSync] Could not obtain browser-compatible image for ${fileId}`);
    return false;
  } catch (error) {
    console.error(`[PhotoSync] Failed to download full image ${fileId}:`, error);
    return false;
  }
}

async function downloadAndSaveThumbnail(fileId: string, mimeType: string, size: number = 400): Promise<boolean> {
  const filePath = getThumbPath(fileId, mimeType);
  if (fs.existsSync(filePath)) return true;

  try {
    const drive = getGoogleDriveClient();
    
    const response = await drive.files.get({
      fileId,
      fields: 'thumbnailLink',
      supportsAllDrives: true,
    });
    
    let thumbnailUrl = response.data.thumbnailLink;
    
    if (thumbnailUrl) {
      thumbnailUrl = thumbnailUrl.replace(/=s\d+/, `=s${size}`);
      const thumbnailResponse = await fetch(thumbnailUrl);
      if (thumbnailResponse.ok) {
        const buffer = Buffer.from(await thumbnailResponse.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
        console.log(`[PhotoSync] Saved thumbnail: ${fileId} (${(buffer.length / 1024).toFixed(0)}KB)`);
        return true;
      }
    }
    
    return await downloadAndSaveFullImage(fileId, mimeType);
  } catch (error) {
    console.error(`[PhotoSync] Failed to download thumbnail ${fileId}:`, error);
    return false;
  }
}

export function getLocalThumbnail(fileId: string): { filePath: string; mimeType: string } | null {
  const cached = findCachedFile(THUMB_DIR, fileId);
  if (cached) {
    const ext = path.extname(cached).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif',
      '.webp': 'image/webp', '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
    };
    return { filePath: cached, mimeType: mimeMap[ext] || 'image/jpeg' };
  }
  return null;
}

export function getLocalFullImage(fileId: string): { filePath: string; mimeType: string } | null {
  const cached = findCachedFile(FULL_DIR, fileId);
  if (cached) {
    const ext = path.extname(cached).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif',
      '.webp': 'image/webp', '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
    };
    return { filePath: cached, mimeType: mimeMap[ext] || 'image/jpeg' };
  }
  return null;
}

export async function ensurePhotosDownloaded(): Promise<void> {
  console.log('[PhotoSync] Checking for photos that need to be downloaded to disk...');
  const photos = await storage.getAllPhotos();
  
  if (photos.length === 0) {
    console.log('[PhotoSync] No photos in database to download');
    return;
  }

  let downloaded = 0;
  let alreadyCached = 0;
  let failed = 0;

  for (const photo of photos) {
    const driveId = photo.googleDriveId;
    const mime = photo.mimeType;

    const thumbExists = findCachedFile(THUMB_DIR, driveId) !== null;
    const fullExists = findCachedFile(FULL_DIR, driveId) !== null;

    if (thumbExists && fullExists) {
      alreadyCached++;
      continue;
    }

    try {
      if (!thumbExists) {
        await downloadAndSaveThumbnail(driveId, mime);
      }
      if (!fullExists) {
        await downloadAndSaveFullImage(driveId, mime);
      }
      downloaded++;
    } catch (error) {
      console.error(`[PhotoSync] Failed to download photo ${driveId}:`, error);
      failed++;
    }

    if (downloaded % 5 === 0 && downloaded > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[PhotoSync] Download check complete: ${alreadyCached} already cached, ${downloaded} newly downloaded, ${failed} failed`);
}

function cleanupRemovedPhotos(activeGoogleDriveIds: string[]) {
  const activeSet = new Set(activeGoogleDriveIds);
  
  for (const dir of [THUMB_DIR, FULL_DIR]) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fileId = path.basename(file, path.extname(file));
        if (!activeSet.has(fileId)) {
          fs.unlinkSync(path.join(dir, file));
          console.log(`[PhotoSync] Cleaned up removed photo file: ${file}`);
        }
      }
    } catch (error) {
      console.error(`[PhotoSync] Error cleaning up directory ${dir}:`, error);
    }
  }
}

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
    
    const drivePhotos = await listPhotosInFolder(folderId);
    console.log(`[PhotoSync] Found ${drivePhotos.length} photos in Google Drive folder`);

    let photosAdded = 0;
    const drivePhotoIds: string[] = [];
    const errors: string[] = [];

    for (const driveFile of drivePhotos) {
      try {
        drivePhotoIds.push(driveFile.id);
        
        const existingPhoto = await storage.getPhotoByGoogleDriveId(driveFile.id);
        
        const photoData: InsertPhoto = {
          googleDriveId: driveFile.id,
          name: driveFile.name,
          mimeType: driveFile.mimeType,
          thumbnailUrl: `/api/photos/${driveFile.id}/thumbnail`,
          webViewUrl: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
          downloadUrl: `/api/photos/${driveFile.id}/image`,
          createdTime: driveFile.createdTime ? new Date(driveFile.createdTime) : null,
        };

        await storage.upsertPhoto(photoData);
        
        if (!existingPhoto) {
          photosAdded++;
        }

        await downloadAndSaveThumbnail(driveFile.id, driveFile.mimeType);
        await downloadAndSaveFullImage(driveFile.id, driveFile.mimeType);
      } catch (error) {
        const errMsg = `Failed to sync photo ${driveFile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errMsg);
        console.error(`[PhotoSync] ${errMsg}`);
      }
    }

    const photosRemoved = await storage.deletePhotosByGoogleDriveIds(drivePhotoIds);
    if (photosRemoved > 0) {
      console.log(`[PhotoSync] Removed ${photosRemoved} photos no longer in Google Drive`);
    }

    cleanupRemovedPhotos(drivePhotoIds);

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
