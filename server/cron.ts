import cron, { type ScheduledTask } from 'node-cron';
import { syncService } from './sync-service';
import { storage } from './storage';
import { notificationService } from './notification-service';

let syncJob: ScheduledTask | null = null;
let notificationJob: ScheduledTask | null = null;

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
 * Check for games and send notifications
 */
async function performNotificationCheck() {
  try {
    console.log('[Cron] Starting scheduled notification check...');
    const result = await notificationService.checkAndSendNotifications();
    console.log(`[Cron] Notification check complete: ${result.emailsSent} emails sent`);
  } catch (error) {
    console.error('[Cron] Notification check failed:', error);
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
 * Start the notification check job
 */
export function startNotificationJob() {
  if (notificationJob) {
    console.log('[Cron] Notification job already running');
    return;
  }

  // Run every hour at minute 15
  // Format: minute hour day month weekday
  notificationJob = cron.schedule('15 * * * *', async () => {
    await performNotificationCheck();
  });

  console.log('[Cron] Hourly notification job started (runs 15 minutes past every hour)');
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
 * Stop the notification job
 */
export function stopNotificationJob() {
  if (notificationJob) {
    notificationJob.stop();
    notificationJob = null;
    console.log('[Cron] Notification job stopped');
  }
}

/**
 * Manual sync trigger
 */
export async function triggerManualSync() {
  await performSync();
}

/**
 * Manual notification check trigger
 */
export async function triggerManualNotificationCheck() {
  await performNotificationCheck();
}
