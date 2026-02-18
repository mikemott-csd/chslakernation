import { storage } from './storage';
import { emailService } from './email-service';
import { sendPushNotification } from './firebase-admin';
import { addHours, isSameDay, startOfDay, isAfter, isBefore, parseISO } from 'date-fns';

/**
 * Notification scheduler service
 * Sends game reminder emails at two points:
 * 1. 24 hours before the game (with a 6-hour window: 21-27 hours before)
 * 2. Morning of game day (8 AM - 9 AM)
 * 
 * Includes deduplication to prevent sending the same notification multiple times.
 */

interface NotificationCheck {
  gamesIn24Hours: number;
  gamesMorningOf: number;
  emailsSent: number;
  skippedDuplicates: number;
  errors: string[];
}

/**
 * Check for upcoming games and send notification emails
 * This should run periodically (e.g., every hour)
 */
export async function checkAndSendNotifications(): Promise<NotificationCheck> {
  const result: NotificationCheck = {
    gamesIn24Hours: 0,
    gamesMorningOf: 0,
    emailsSent: 0,
    skippedDuplicates: 0,
    errors: [],
  };

  try {
    // Get all games and subscriptions
    const games = await storage.getAllGames();
    const subscriptions = await storage.getAllSubscriptions();

    if (subscriptions.length === 0) {
      console.log('[Notifications] No subscriptions found');
      return result;
    }

    const now = new Date();
    const morningStart = new Date(now);
    morningStart.setHours(8, 0, 0, 0);
    const morningEnd = new Date(now);
    morningEnd.setHours(9, 0, 0, 0);

    // Process each game
    for (const game of games) {
      const gameDate = typeof game.date === 'string' ? parseISO(game.date) : game.date;
      const gameDateTime = new Date(gameDate);
      
      // Extract time from game.time string (e.g., "7:00 PM")
      const timeMatch = game.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3].toUpperCase() === 'PM';
        
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        gameDateTime.setHours(hours, minutes, 0, 0);
      }

      // Check if this game needs 24-hour notification
      // Widened window: 21-27 hours before game (6-hour window centered around 24 hours)
      // This ensures we catch games even if the server restarts or cron timing varies
      const timeDiffHours = (gameDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const needs24HourNotification = timeDiffHours > 21 && timeDiffHours <= 27;

      // Check if this game needs morning-of notification
      const needsMorningNotification = 
        isSameDay(gameDateTime, now) && 
        isAfter(now, morningStart) && 
        isBefore(now, morningEnd);

      if (!needs24HourNotification && !needsMorningNotification) {
        continue; // Skip this game
      }

      // Find subscribers interested in this sport
      const interestedSubscribers = subscriptions.filter(sub => 
        sub.sports.includes(game.sport)
      );

      // Determine which type of notification to send
      if (needs24HourNotification) {
        result.gamesIn24Hours++;
        for (const subscriber of interestedSubscribers) {
          // Atomically try to record this notification - prevents race conditions
          // If this returns true, we're the first to claim this notification, so we should send it
          let shouldSend = false;
          try {
            shouldSend = await storage.tryRecordNotificationAtomically(game.id, subscriber.id, '24hour');
          } catch (error) {
            const errMsg = `Failed to record notification for ${subscriber.email}: ${error}`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
            continue;
          }
          
          if (!shouldSend) {
            result.skippedDuplicates++;
            console.log(`[Notifications] Skipping duplicate 24-hour reminder for ${game.sport} vs ${game.opponent} to ${subscriber.email}`);
            continue;
          }

          // Mark as 'sending' before attempting email - this distinguishes between
          // "crashed before sending" and "crashed during/after sending"
          try {
            await storage.markNotificationSending(game.id, subscriber.id, '24hour');
          } catch (markError) {
            const errMsg = `Failed to mark notification as sending for ${subscriber.email}: ${markError}`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
            continue;
          }

          // Send the email
          let emailSent = false;
          try {
            emailSent = await emailService.send24HourReminder(subscriber.email, game, subscriber.unsubscribeToken);
          } catch (emailError) {
            // Email threw an error - delete the record so it can be retried
            await storage.deleteNotificationRecord(game.id, subscriber.id, '24hour');
            const errMsg = `Email send threw error for ${subscriber.email}: ${emailError} - will retry`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
            continue;
          }
          
          if (!emailSent) {
            // Email returned false (delivery failed) - delete the record so it can be retried
            await storage.deleteNotificationRecord(game.id, subscriber.id, '24hour');
            const errMsg = `Email delivery failed for ${subscriber.email} - will retry on next check`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
            continue;
          }
          
          // Email was sent successfully - now mark as sent
          // If this fails, record stays in 'sending' state - stale recovery will mark as sent
          try {
            await storage.markNotificationSent(game.id, subscriber.id, '24hour');
          } catch (markError) {
            // Email was sent but marking failed - record stays in 'sending'
            // Stale recovery will mark it as 'sent' to prevent duplicates
            const errMsg = `Email sent to ${subscriber.email} but mark-sent failed: ${markError}`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
          }
          
          result.emailsSent++;
          console.log(`[Notifications] Sent 24-hour reminder for ${game.sport} vs ${game.opponent} to ${subscriber.email}`);
        }
      }

      if (needsMorningNotification) {
        result.gamesMorningOf++;
        for (const subscriber of interestedSubscribers) {
          // Atomically try to record this notification - prevents race conditions
          // If this returns true, we're the first to claim this notification, so we should send it
          let shouldSend = false;
          try {
            shouldSend = await storage.tryRecordNotificationAtomically(game.id, subscriber.id, 'gameday');
          } catch (error) {
            const errMsg = `Failed to record notification for ${subscriber.email}: ${error}`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
            continue;
          }
          
          if (!shouldSend) {
            result.skippedDuplicates++;
            console.log(`[Notifications] Skipping duplicate game day reminder for ${game.sport} vs ${game.opponent} to ${subscriber.email}`);
            continue;
          }

          // Mark as 'sending' before attempting email - this distinguishes between
          // "crashed before sending" and "crashed during/after sending"
          try {
            await storage.markNotificationSending(game.id, subscriber.id, 'gameday');
          } catch (markError) {
            const errMsg = `Failed to mark notification as sending for ${subscriber.email}: ${markError}`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
            continue;
          }

          // Send the email
          let emailSent = false;
          try {
            emailSent = await emailService.sendGameDayReminder(subscriber.email, game, subscriber.unsubscribeToken);
          } catch (emailError) {
            // Email threw an error - delete the record so it can be retried
            await storage.deleteNotificationRecord(game.id, subscriber.id, 'gameday');
            const errMsg = `Email send threw error for ${subscriber.email}: ${emailError} - will retry`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
            continue;
          }
          
          if (!emailSent) {
            // Email returned false (delivery failed) - delete the record so it can be retried
            await storage.deleteNotificationRecord(game.id, subscriber.id, 'gameday');
            const errMsg = `Email delivery failed for ${subscriber.email} - will retry on next check`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
            continue;
          }
          
          // Email was sent successfully - now mark as sent
          // If this fails, record stays in 'sending' state - stale recovery will mark as sent
          try {
            await storage.markNotificationSent(game.id, subscriber.id, 'gameday');
          } catch (markError) {
            // Email was sent but marking failed - record stays in 'sending'
            // Stale recovery will mark it as 'sent' to prevent duplicates
            const errMsg = `Email sent to ${subscriber.email} but mark-sent failed: ${markError}`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
          }
          
          result.emailsSent++;
          console.log(`[Notifications] Sent game day reminder for ${game.sport} vs ${game.opponent} to ${subscriber.email}`);
        }
      }
    }

    // Send push notifications to all matching push subscribers
    try {
      const pushSubscriptions = await storage.getAllPushSubscriptions();
      if (pushSubscriptions.length > 0) {
        for (const game of games) {
          const gameDate = typeof game.date === 'string' ? parseISO(game.date) : game.date;
          const gameDateTime = new Date(gameDate);
          
          const timeMatch = game.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const isPM = timeMatch[3].toUpperCase() === 'PM';
            if (isPM && hours !== 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
            gameDateTime.setHours(hours, minutes, 0, 0);
          }

          const timeDiffHours = (gameDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          const needs24Hour = timeDiffHours > 21 && timeDiffHours <= 27;
          const needsMorning = isSameDay(gameDateTime, now) && isAfter(now, morningStart) && isBefore(now, morningEnd);

          if (!needs24Hour && !needsMorning) continue;

          const matchingPushSubs = pushSubscriptions.filter(sub => sub.sports.includes(game.sport));
          
          for (const pushSub of matchingPushSubs) {
            const notifType = needs24Hour ? '24hour-push' : 'gameday-push';
            
            let shouldSend = false;
            try {
              shouldSend = await storage.tryRecordNotificationAtomically(game.id, pushSub.id, notifType);
            } catch {
              continue;
            }
            
            if (!shouldSend) continue;

            const locationText = game.isHome === 'home' ? `Home - ${game.location}` : `Away - ${game.location}`;
            const title = needs24Hour 
              ? `Game Tomorrow: ${game.sport}`
              : `Game Today: ${game.sport}`;
            const body = `Lakers vs ${game.opponent} at ${game.time} | ${locationText}`;

            const success = await sendPushNotification(pushSub.fcmToken, title, body, {
              gameId: game.id,
              sport: game.sport,
              url: '/schedule',
            });

            if (success) {
              await storage.markNotificationSent(game.id, pushSub.id, notifType);
              result.emailsSent++;
              console.log(`[Notifications] Push sent for ${game.sport} vs ${game.opponent} to token ${pushSub.fcmToken.substring(0, 20)}...`);
            } else {
              await storage.deleteNotificationRecord(game.id, pushSub.id, notifType);
              await storage.deletePushSubscriptionByToken(pushSub.fcmToken);
              console.log(`[Notifications] Removed invalid push subscription: ${pushSub.fcmToken.substring(0, 20)}...`);
            }
          }
        }
      }
    } catch (pushError) {
      console.error('[Notifications] Push notification error:', pushError);
      result.errors.push(`Push notification error: ${pushError}`);
    }

    console.log(`[Notifications] Check complete: ${result.emailsSent} emails sent, ${result.skippedDuplicates} duplicates skipped for ${result.gamesIn24Hours} 24-hour reminders and ${result.gamesMorningOf} game day reminders`);
    if (result.errors.length > 0) {
      console.error(`[Notifications] ${result.errors.length} errors occurred`);
    }

  } catch (error) {
    console.error('[Notifications] Error during notification check:', error);
    result.errors.push(`System error: ${error}`);
  }

  return result;
}

export const notificationService = {
  checkAndSendNotifications,
};
