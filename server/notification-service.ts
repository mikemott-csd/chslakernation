import { storage } from './storage';
import { emailService } from './email-service';
import { addHours, isSameDay, startOfDay, isAfter, isBefore, parseISO } from 'date-fns';

/**
 * Notification scheduler service
 * Sends game reminder emails at two points:
 * 1. 24 hours before the game
 * 2. Morning of game day (8 AM)
 */

interface NotificationCheck {
  gamesIn24Hours: number;
  gamesMorningOf: number;
  emailsSent: number;
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
    const in24Hours = addHours(now, 24);
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
      const timeDiffHours = (gameDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const needs24HourNotification = timeDiffHours > 23 && timeDiffHours <= 25;

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
          try {
            await emailService.send24HourReminder(subscriber.email, game, subscriber.unsubscribeToken);
            result.emailsSent++;
            console.log(`[Notifications] Sent 24-hour reminder for ${game.sport} vs ${game.opponent} to ${subscriber.email}`);
          } catch (error) {
            const errMsg = `Failed to send 24-hour reminder to ${subscriber.email}: ${error}`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
          }
        }
      }

      if (needsMorningNotification) {
        result.gamesMorningOf++;
        for (const subscriber of interestedSubscribers) {
          try {
            await emailService.sendGameDayReminder(subscriber.email, game, subscriber.unsubscribeToken);
            result.emailsSent++;
            console.log(`[Notifications] Sent game day reminder for ${game.sport} vs ${game.opponent} to ${subscriber.email}`);
          } catch (error) {
            const errMsg = `Failed to send game day reminder to ${subscriber.email}: ${error}`;
            console.error(`[Notifications] ${errMsg}`);
            result.errors.push(errMsg);
          }
        }
      }
    }

    console.log(`[Notifications] Check complete: ${result.emailsSent} emails sent for ${result.gamesIn24Hours} 24-hour reminders and ${result.gamesMorningOf} game day reminders`);
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
