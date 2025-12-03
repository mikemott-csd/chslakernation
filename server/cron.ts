import cron, { type ScheduledTask } from 'node-cron';
import { syncFromGoogleDrive } from './sync-service';
import { notificationService } from './notification-service';
import { syncNewsArticles } from './news-service';

let syncJob: ScheduledTask | null = null;
let notificationJob: ScheduledTask | null = null;
let newsSyncJob: ScheduledTask | null = null;

/**
 * Perform the sync operation
 */
async function performSync() {
  try {
    console.log('[Cron] Starting scheduled sync from Google Drive...');
    const result = await syncFromGoogleDrive('cron');
    if (result.success) {
      console.log(`[Cron] ${result.message}`);
    } else {
      console.error(`[Cron] Sync failed: ${result.message}`);
    }
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

/**
 * Perform the news sync operation
 */
async function performNewsSync() {
  try {
    console.log('[Cron] Starting weekly news sync from Burlington Free Press...');
    const result = await syncNewsArticles();
    console.log(`[Cron] News sync complete: ${result.added} added, ${result.updated} updated`);
  } catch (error) {
    console.error('[Cron] News sync failed:', error);
  }
}

/**
 * Start the weekly news sync job
 */
export function startNewsSyncJob() {
  if (newsSyncJob) {
    console.log('[Cron] News sync job already running');
    return;
  }

  // Run every Sunday at 6:00 AM
  // Format: minute hour day month weekday (0 = Sunday)
  newsSyncJob = cron.schedule('0 6 * * 0', async () => {
    await performNewsSync();
  });

  console.log('[Cron] Weekly news sync job started (runs every Sunday at 6:00 AM)');
}

/**
 * Stop the news sync job
 */
export function stopNewsSyncJob() {
  if (newsSyncJob) {
    newsSyncJob.stop();
    newsSyncJob = null;
    console.log('[Cron] News sync job stopped');
  }
}

/**
 * Manual news sync trigger
 */
export async function triggerManualNewsSync() {
  await performNewsSync();
}
