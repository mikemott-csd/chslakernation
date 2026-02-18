import cron, { type ScheduledTask } from 'node-cron';
import { syncFromGoogleDrive } from './sync-service';
import { notificationService } from './notification-service';
import { syncNewsArticles } from './news-service';
import { syncPhotosFromGoogleDrive } from './photo-sync-service';

// Quiet hours configuration - no notifications between 12am and 5am Eastern Time
const QUIET_HOURS_START = 0;  // 12:00 AM (midnight)
const QUIET_HOURS_END = 5;    // 5:00 AM

/**
 * Check if current time is within quiet hours (12am-5am Eastern Time)
 * Returns true if notifications should be suppressed
 */
function isQuietHours(): boolean {
  // Get current time in Eastern Time
  const now = new Date();
  const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = easternTime.getHours();
  
  // Quiet hours: 12am (0) to 5am (exclusive)
  return hour >= QUIET_HOURS_START && hour < QUIET_HOURS_END;
}

let syncJob: ScheduledTask | null = null;
let notificationJob: ScheduledTask | null = null;
let newsSyncJob: ScheduledTask | null = null;
let photoSyncJob: ScheduledTask | null = null;

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
 * Skips sending during quiet hours (12am-5am Eastern Time)
 */
async function performNotificationCheck() {
  try {
    // Skip notifications during quiet hours (12am-5am Eastern Time)
    if (isQuietHours()) {
      console.log('[Cron] Skipping notification check - quiet hours (12am-5am ET)');
      return;
    }
    
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
  console.log('[Cron] Manual notification check triggered...');
  const result = await notificationService.checkAndSendNotifications();
  console.log(`[Cron] Manual notification check complete: ${result.emailsSent} emails sent, ${result.skippedDuplicates} skipped`);
  return result;
}

/**
 * Perform the news sync operation
 */
async function performNewsSync() {
  try {
    console.log('[Cron] Starting daily news sync from Burlington Free Press...');
    const result = await syncNewsArticles();
    console.log(`[Cron] News sync complete: ${result.added} added, ${result.updated} updated`);
  } catch (error) {
    console.error('[Cron] News sync failed:', error);
  }
}

/**
 * Start the daily news sync job
 */
export function startNewsSyncJob() {
  if (newsSyncJob) {
    console.log('[Cron] News sync job already running');
    return;
  }

  // Run every day at 6:00 AM
  // Format: minute hour day month weekday
  newsSyncJob = cron.schedule('0 6 * * *', async () => {
    await performNewsSync();
  });

  console.log('[Cron] Daily news sync job started (runs every day at 6:00 AM)');
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

/**
 * Perform the photo sync operation
 */
async function performPhotoSync() {
  try {
    console.log('[Cron] Starting scheduled photo sync from Google Drive...');
    const result = await syncPhotosFromGoogleDrive('cron');
    if (result.success) {
      console.log(`[Cron] ${result.message}`);
    } else {
      console.error(`[Cron] Photo sync failed: ${result.message}`);
    }
  } catch (error) {
    console.error('[Cron] Photo sync failed:', error);
  }
}

/**
 * Start the hourly photo sync job
 */
export function startPhotoSyncJob() {
  if (photoSyncJob) {
    console.log('[Cron] Photo sync job already running');
    return;
  }

  // Run every hour at minute 30
  // Format: minute hour day month weekday
  photoSyncJob = cron.schedule('30 * * * *', async () => {
    await performPhotoSync();
  });

  console.log('[Cron] Hourly photo sync job started (runs 30 minutes past every hour)');
}

/**
 * Stop the photo sync job
 */
export function stopPhotoSyncJob() {
  if (photoSyncJob) {
    photoSyncJob.stop();
    photoSyncJob = null;
    console.log('[Cron] Photo sync job stopped');
  }
}

/**
 * Manual photo sync trigger
 */
export async function triggerManualPhotoSync() {
  await performPhotoSync();
}
