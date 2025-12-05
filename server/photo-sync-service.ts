import { google } from 'googleapis';
import { type InsertPhoto } from "@shared/schema";
import { storage } from "./storage";

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

/**
 * Get authenticated Google Drive client using service account
 */
function getGoogleDriveClient() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not configured');
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    throw new Error('Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
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
 * Download a file from Google Drive
 * Returns the file as a buffer with content type
 */
export async function downloadDriveFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const drive = getGoogleDriveClient();
    
    // Get file metadata first (with shared drive support)
    const metaResponse = await drive.files.get({
      fileId,
      fields: 'mimeType',
      supportsAllDrives: true,
    });
    
    const mimeType = metaResponse.data.mimeType || 'image/jpeg';
    
    // Download the file (with shared drive support)
    const response = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    
    const buffer = Buffer.from(response.data as ArrayBuffer);
    return { buffer, mimeType };
  } catch (error) {
    console.error(`[PhotoSync] Failed to download file ${fileId}:`, error);
    return null;
  }
}

/**
 * Get a thumbnail from Google Drive
 * Returns the thumbnail as a buffer
 */
export async function getThumbnail(fileId: string, size: number = 400): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const drive = getGoogleDriveClient();
    
    // Get file with thumbnail link (with shared drive support)
    const response = await drive.files.get({
      fileId,
      fields: 'thumbnailLink',
      supportsAllDrives: true,
    });
    
    let thumbnailUrl = response.data.thumbnailLink;
    if (!thumbnailUrl) {
      // If no thumbnail, return the full image
      return downloadDriveFile(fileId);
    }
    
    // Modify the thumbnail URL to get a larger size
    thumbnailUrl = thumbnailUrl.replace(/=s\d+/, `=s${size}`);
    
    // Fetch the thumbnail
    const thumbnailResponse = await fetch(thumbnailUrl);
    if (!thumbnailResponse.ok) {
      // Fall back to full image if thumbnail fetch fails
      return downloadDriveFile(fileId);
    }
    
    const buffer = Buffer.from(await thumbnailResponse.arrayBuffer());
    const mimeType = thumbnailResponse.headers.get('content-type') || 'image/jpeg';
    
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
