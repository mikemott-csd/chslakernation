import cron from 'node-cron';
import { syncService } from './sync-service';
import { storage } from './storage';

let syncJob: cron.ScheduledTask | null = null;

/**
 * Perform the sync operation
 */
async function performSync() {
  try {
    console.log('[Cron] Starting scheduled sync from Google Drive...');
    const games = await syncService.syncFromGoogleDrive();
    await storage.replaceAllGames(games);
    console.log(`[Cron] Successfully synced ${games.length} games`);
  } catch (error) {
    console.error('[Cron] Sync failed:', error);
  }
}

/**
 * Start the hourly sync job
 */
export function startSyncJob() {
  if (syncJob) {
    console.log('[Cron] Sync job already running');
    return;
  }

  // Run every hour at minute 0
  // Format: minute hour day month weekday
  syncJob = cron.schedule('0 * * * *', async () => {
    await performSync();
  });

  console.log('[Cron] Hourly sync job started (runs at the top of every hour)');
}

/**
 * Stop the sync job
 */
export function stopSyncJob() {
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    console.log('[Cron] Sync job stopped');
  }
}

/**
 * Manual sync trigger
 */
export async function triggerManualSync() {
  await performSync();
}
