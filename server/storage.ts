import { type User, type InsertUser, type Game, type InsertGame, type Subscription, type InsertSubscription, type SyncLog, type InsertSyncLog, type NewsArticle, type InsertNewsArticle, type Photo, type InsertPhoto, type PhotoSyncLog, type InsertPhotoSyncLog, type SentNotification, type InsertSentNotification, type PushSubscription, type InsertPushSubscription, subscriptions, games, syncLogs, newsArticles, photos, photoSyncLogs, sentNotifications, pushSubscriptions } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc, asc, sql, notInArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Game operations
  getAllGames(): Promise<Game[]>;
  getGameById(id: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  replaceAllGames(games: Game[]): Promise<void>;
  clearGames(): Promise<void>;
  upsertGamesBatch(games: InsertGame[]): Promise<{ added: number; updated: number }>;
  incrementAttendance(gameId: string): Promise<Game | undefined>;
  
  // Subscription operations
  getAllSubscriptions(): Promise<Subscription[]>;
  getSubscriptionByEmail(email: string): Promise<Subscription | undefined>;
  getSubscriptionByToken(token: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
  
  // Sync log operations
  createSyncLog(log: InsertSyncLog): Promise<SyncLog>;
  getRecentSyncLogs(limit: number): Promise<SyncLog[]>;
  
  // News article operations
  getAllNewsArticles(): Promise<NewsArticle[]>;
  getRecentNewsArticles(limit: number): Promise<NewsArticle[]>;
  upsertNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  clearNewsArticles(): Promise<void>;
  
  // Photo operations
  getAllPhotos(): Promise<Photo[]>;
  getPhotoByGoogleDriveId(googleDriveId: string): Promise<Photo | undefined>;
  upsertPhoto(photo: InsertPhoto): Promise<Photo>;
  deletePhotosByGoogleDriveIds(idsToKeep: string[]): Promise<number>;
  
  // Photo sync log operations
  createPhotoSyncLog(log: InsertPhotoSyncLog): Promise<PhotoSyncLog>;
  getRecentPhotoSyncLogs(limit: number): Promise<PhotoSyncLog[]>;
  
  // Sent notification operations (two-phase: pending -> sent)
  hasNotificationBeenSent(gameId: string, subscriptionId: string, notificationType: string): Promise<boolean>;
  recordSentNotification(notification: InsertSentNotification): Promise<SentNotification | null>;
  tryRecordNotificationAtomically(gameId: string, subscriptionId: string, notificationType: string): Promise<boolean>;
  markNotificationSent(gameId: string, subscriptionId: string, notificationType: string): Promise<boolean>;
  deleteNotificationRecord(gameId: string, subscriptionId: string, notificationType: string): Promise<boolean>;

  // Push subscription operations
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined>;
  getPushSubscriptionByToken(fcmToken: string): Promise<PushSubscription | undefined>;
  createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  updatePushSubscription(id: string, update: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined>;
  deletePushSubscription(id: string): Promise<boolean>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean>;
  deletePushSubscriptionByToken(fcmToken: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async initialize(): Promise<void> {
    await this.seedGamesIfEmpty();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllGames(): Promise<Game[]> {
    const result = await db.select().from(games).orderBy(asc(games.date));
    return result;
  }

  async getGameById(id: string): Promise<Game | undefined> {
    const result = await db.select().from(games).where(eq(games.id, id));
    return result[0];
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const result = await db.insert(games).values(insertGame).returning();
    return result[0];
  }

  async replaceAllGames(newGames: Game[]): Promise<void> {
    await db.delete(games);
    if (newGames.length > 0) {
      await db.insert(games).values(newGames);
    }
  }

  async clearGames(): Promise<void> {
    await db.delete(games);
  }

  async upsertGamesBatch(insertGames: InsertGame[]): Promise<{ added: number; updated: number }> {
    let added = 0;
    let updated = 0;

    for (const insertGame of insertGames) {
      const existing = await db.select().from(games).where(
        and(
          eq(games.sport, insertGame.sport),
          eq(games.opponent, insertGame.opponent),
          eq(games.date, insertGame.date),
          eq(games.time, insertGame.time)
        )
      );

      if (existing.length > 0) {
        await db.update(games)
          .set({
            location: insertGame.location,
            isHome: insertGame.isHome,
          })
          .where(eq(games.id, existing[0].id));
        updated++;
      } else {
        await db.insert(games).values(insertGame);
        added++;
      }
    }

    return { added, updated };
  }

  async incrementAttendance(gameId: string): Promise<Game | undefined> {
    const result = await db
      .update(games)
      .set({ attendanceCount: sql`${games.attendanceCount} + 1` })
      .where(eq(games.id, gameId))
      .returning();

    return result[0] || undefined;
  }

  private seedGamesIfEmpty = async () => {
    const existingGames = await db.select().from(games);
    if (existingGames.length > 0) {
      return;
    }

    const gamesData: InsertGame[] = [
      // Football
      {
        sport: "Football",
        opponent: "Burlington Seahorses",
        date: new Date("2025-10-17"),
        time: "7:00 PM",
        location: "Lakers Stadium",
        isHome: "home",
      },
      {
        sport: "Football",
        opponent: "South Burlington Rebels",
        date: new Date("2025-10-24"),
        time: "6:30 PM",
        location: "Rebel Field",
        isHome: "away",
      },
      {
        sport: "Football",
        opponent: "Essex Hornets",
        date: new Date("2025-10-31"),
        time: "7:00 PM",
        location: "Lakers Stadium",
        isHome: "home",
      },
      
      // Soccer
      {
        sport: "Soccer",
        opponent: "Mount Mansfield Cougars",
        date: new Date("2025-10-16"),
        time: "4:00 PM",
        location: "Cougar Field",
        isHome: "away",
      },
      {
        sport: "Soccer",
        opponent: "CVU Redhawks",
        date: new Date("2025-10-18"),
        time: "4:30 PM",
        location: "Lakers Soccer Field",
        isHome: "home",
      },
      {
        sport: "Soccer",
        opponent: "Rice Memorial Green Knights",
        date: new Date("2025-10-23"),
        time: "4:00 PM",
        location: "Lakers Soccer Field",
        isHome: "home",
      },
      {
        sport: "Soccer",
        opponent: "BFA Comets",
        date: new Date("2025-10-30"),
        time: "3:30 PM",
        location: "Comet Stadium",
        isHome: "away",
      },
      
      // Volleyball
      {
        sport: "Volleyball",
        opponent: "Middlebury Tigers",
        date: new Date("2025-10-15"),
        time: "6:00 PM",
        location: "Lakers Gymnasium",
        isHome: "home",
      },
      {
        sport: "Volleyball",
        opponent: "Rutland Raiders",
        date: new Date("2025-10-17"),
        time: "6:30 PM",
        location: "Raider Arena",
        isHome: "away",
      },
      {
        sport: "Volleyball",
        opponent: "St. Johnsbury Hilltoppers",
        date: new Date("2025-10-22"),
        time: "6:00 PM",
        location: "Lakers Gymnasium",
        isHome: "home",
      },
      {
        sport: "Volleyball",
        opponent: "Burr and Burton Bulldogs",
        date: new Date("2025-10-29"),
        time: "6:30 PM",
        location: "Bulldog Court",
        isHome: "away",
      },

      // November 2025 Games
      // Football
      {
        sport: "Football",
        opponent: "Mount Mansfield Cougars",
        date: new Date("2025-11-07"),
        time: "7:00 PM",
        location: "Cougar Stadium",
        isHome: "away",
      },
      {
        sport: "Football",
        opponent: "CVU Redhawks",
        date: new Date("2025-11-14"),
        time: "6:30 PM",
        location: "Lakers Stadium",
        isHome: "home",
      },

      // Basketball (Season starting)
      {
        sport: "Basketball",
        opponent: "Burlington Seahorses",
        date: new Date("2025-11-20"),
        time: "7:00 PM",
        location: "Lakers Gymnasium",
        isHome: "home",
      },
      {
        sport: "Basketball",
        opponent: "South Burlington Rebels",
        date: new Date("2025-11-22"),
        time: "6:30 PM",
        location: "Rebel Arena",
        isHome: "away",
      },
      {
        sport: "Basketball",
        opponent: "Essex Hornets",
        date: new Date("2025-11-26"),
        time: "5:00 PM",
        location: "Lakers Gymnasium",
        isHome: "home",
      },

      // December 2025 Games
      // Basketball
      {
        sport: "Basketball",
        opponent: "Rice Memorial Green Knights",
        date: new Date("2025-12-03"),
        time: "7:00 PM",
        location: "Memorial Court",
        isHome: "away",
      },
      {
        sport: "Basketball",
        opponent: "Mount Mansfield Cougars",
        date: new Date("2025-12-06"),
        time: "6:30 PM",
        location: "Lakers Gymnasium",
        isHome: "home",
      },
      {
        sport: "Basketball",
        opponent: "CVU Redhawks",
        date: new Date("2025-12-10"),
        time: "7:00 PM",
        location: "Redhawk Arena",
        isHome: "away",
      },
      {
        sport: "Basketball",
        opponent: "BFA Comets",
        date: new Date("2025-12-13"),
        time: "6:30 PM",
        location: "Lakers Gymnasium",
        isHome: "home",
      },
      {
        sport: "Basketball",
        opponent: "Middlebury Tigers",
        date: new Date("2025-12-17"),
        time: "7:00 PM",
        location: "Lakers Gymnasium",
        isHome: "home",
      },
      {
        sport: "Basketball",
        opponent: "Rutland Raiders",
        date: new Date("2025-12-20"),
        time: "6:00 PM",
        location: "Raider Court",
        isHome: "away",
      },

      // January 2026 Games
      // Basketball
      {
        sport: "Basketball",
        opponent: "St. Johnsbury Hilltoppers",
        date: new Date("2026-01-08"),
        time: "7:00 PM",
        location: "Hilltopper Arena",
        isHome: "away",
      },
      {
        sport: "Basketball",
        opponent: "Burlington Seahorses",
        date: new Date("2026-01-10"),
        time: "6:30 PM",
        location: "Seahorse Stadium",
        isHome: "away",
      },
      {
        sport: "Basketball",
        opponent: "South Burlington Rebels",
        date: new Date("2026-01-15"),
        time: "7:00 PM",
        location: "Lakers Gymnasium",
        isHome: "home",
      },
      {
        sport: "Basketball",
        opponent: "Essex Hornets",
        date: new Date("2026-01-17"),
        time: "6:30 PM",
        location: "Hornet Court",
        isHome: "away",
      },
      {
        sport: "Basketball",
        opponent: "Rice Memorial Green Knights",
        date: new Date("2026-01-22"),
        time: "7:00 PM",
        location: "Lakers Gymnasium",
        isHome: "home",
      },
      {
        sport: "Basketball",
        opponent: "Mount Mansfield Cougars",
        date: new Date("2026-01-24"),
        time: "6:30 PM",
        location: "Cougar Arena",
        isHome: "away",
      },
      {
        sport: "Basketball",
        opponent: "CVU Redhawks",
        date: new Date("2026-01-29"),
        time: "7:00 PM",
        location: "Lakers Gymnasium",
        isHome: "home",
      },
    ];

    if (gamesData.length > 0) {
      await db.insert(games).values(gamesData);
    }
  }

  // Subscription operations - using PostgreSQL database
  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions);
  }

  async getSubscriptionByEmail(email: string): Promise<Subscription | undefined> {
    const result = await db.select().from(subscriptions).where(eq(subscriptions.email, email));
    return result[0];
  }

  async getSubscriptionByToken(token: string): Promise<Subscription | undefined> {
    const result = await db.select().from(subscriptions).where(eq(subscriptions.unsubscribeToken, token));
    return result[0];
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const unsubscribeToken = randomUUID();
    const result = await db.insert(subscriptions).values({
      ...insertSubscription,
      unsubscribeToken,
    }).returning();
    return result[0];
  }

  async updateSubscription(id: string, update: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const result = await db.update(subscriptions)
      .set(update)
      .where(eq(subscriptions.id, id))
      .returning();
    return result[0];
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id)).returning();
    return result.length > 0;
  }

  // Sync log operations
  async createSyncLog(insertLog: InsertSyncLog): Promise<SyncLog> {
    const result = await db.insert(syncLogs).values(insertLog).returning();
    return result[0];
  }

  async getRecentSyncLogs(limit: number): Promise<SyncLog[]> {
    const result = await db.select().from(syncLogs).orderBy(desc(syncLogs.syncedAt)).limit(limit);
    return result;
  }

  // News article operations
  async getAllNewsArticles(): Promise<NewsArticle[]> {
    return await db.select().from(newsArticles).orderBy(desc(newsArticles.publishedAt));
  }

  async getRecentNewsArticles(limit: number): Promise<NewsArticle[]> {
    return await db.select().from(newsArticles).orderBy(desc(newsArticles.publishedAt)).limit(limit);
  }

  async upsertNewsArticle(article: InsertNewsArticle): Promise<NewsArticle> {
    const existing = await db.select().from(newsArticles).where(eq(newsArticles.url, article.url));
    if (existing.length > 0) {
      const result = await db.update(newsArticles)
        .set({ title: article.title, publishedAt: article.publishedAt, fetchedAt: new Date() })
        .where(eq(newsArticles.url, article.url))
        .returning();
      return result[0];
    }
    const result = await db.insert(newsArticles).values(article).returning();
    return result[0];
  }

  async clearNewsArticles(): Promise<void> {
    await db.delete(newsArticles);
  }

  // Photo operations
  async getAllPhotos(): Promise<Photo[]> {
    return await db.select().from(photos).orderBy(desc(photos.createdTime));
  }

  async getPhotoByGoogleDriveId(googleDriveId: string): Promise<Photo | undefined> {
    const result = await db.select().from(photos).where(eq(photos.googleDriveId, googleDriveId));
    return result[0];
  }

  async upsertPhoto(photo: InsertPhoto): Promise<Photo> {
    const existing = await db.select().from(photos).where(eq(photos.googleDriveId, photo.googleDriveId));
    if (existing.length > 0) {
      const result = await db.update(photos)
        .set({
          name: photo.name,
          mimeType: photo.mimeType,
          thumbnailUrl: photo.thumbnailUrl,
          webViewUrl: photo.webViewUrl,
          downloadUrl: photo.downloadUrl,
          createdTime: photo.createdTime,
          syncedAt: new Date(),
        })
        .where(eq(photos.googleDriveId, photo.googleDriveId))
        .returning();
      return result[0];
    }
    const result = await db.insert(photos).values(photo).returning();
    return result[0];
  }

  async deletePhotosByGoogleDriveIds(idsToKeep: string[]): Promise<number> {
    if (idsToKeep.length === 0) {
      const result = await db.delete(photos).returning();
      return result.length;
    }
    const result = await db.delete(photos)
      .where(notInArray(photos.googleDriveId, idsToKeep))
      .returning();
    return result.length;
  }

  // Photo sync log operations
  async createPhotoSyncLog(insertLog: InsertPhotoSyncLog): Promise<PhotoSyncLog> {
    const result = await db.insert(photoSyncLogs).values(insertLog).returning();
    return result[0];
  }

  async getRecentPhotoSyncLogs(limit: number): Promise<PhotoSyncLog[]> {
    const result = await db.select().from(photoSyncLogs).orderBy(desc(photoSyncLogs.syncedAt)).limit(limit);
    return result;
  }

  // Sent notification operations
  async hasNotificationBeenSent(gameId: string, subscriptionId: string, notificationType: string): Promise<boolean> {
    const result = await db.select().from(sentNotifications).where(
      and(
        eq(sentNotifications.gameId, gameId),
        eq(sentNotifications.subscriptionId, subscriptionId),
        eq(sentNotifications.notificationType, notificationType)
      )
    );
    return result.length > 0;
  }

  async recordSentNotification(notification: InsertSentNotification): Promise<SentNotification | null> {
    try {
      const result = await db.insert(sentNotifications).values(notification).returning();
      return result[0];
    } catch (error: any) {
      // Handle unique constraint violation (duplicate notification)
      if (error.code === '23505') {
        // Constraint violation - notification already exists
        return null;
      }
      throw error;
    }
  }
  
  // Two-phase notification: try to claim notification for sending
  // Returns: 'send' (we should send), 'skip' (already sent or in progress), or throws on error
  async tryRecordNotificationAtomically(gameId: string, subscriptionId: string, notificationType: string): Promise<boolean> {
    try {
      // Try to insert with status='pending'
      await db.insert(sentNotifications).values({
        gameId,
        subscriptionId,
        notificationType,
        status: 'pending',
      });
      // Insert succeeded - we claimed this notification, should send the email
      return true;
    } catch (error: any) {
      // Handle unique constraint violation (duplicate notification)
      if (error.code === '23505') {
        // Check the existing record's status
        const existing = await db.select().from(sentNotifications).where(
          and(
            eq(sentNotifications.gameId, gameId),
            eq(sentNotifications.subscriptionId, subscriptionId),
            eq(sentNotifications.notificationType, notificationType)
          )
        );
        
        if (existing.length > 0) {
          const record = existing[0];
          
          // If already sent, skip
          if (record.status === 'sent') {
            return false;
          }
          
          // If 'sending' and stale, the process crashed during email send
          // We don't know if email was delivered - retry to ensure delivery
          // (Missing a notification is worse than a rare duplicate reminder)
          if (record.status === 'sending' && record.createdAt) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (record.createdAt < fiveMinutesAgo) {
              // Stale 'sending' record - process crashed during email send
              // Reset to pending and retry - accept possible duplicate over missed notification
              const claimResult = await db.update(sentNotifications)
                .set({ status: 'pending', createdAt: new Date() })
                .where(
                  and(
                    eq(sentNotifications.id, record.id),
                    eq(sentNotifications.status, 'sending'),
                    sql`${sentNotifications.createdAt} < ${fiveMinutesAgo}`
                  )
                )
                .returning();
              
              if (claimResult.length > 0) {
                console.log(`[Notifications] Reclaimed stale 'sending' notification for retry: ${notificationType} for game ${gameId} (may cause duplicate if email was already delivered)`);
                return true; // Re-attempt the email
              }
              return false;
            }
          }
          
          // If pending and stale, the process crashed before email send - retry
          if (record.status === 'pending' && record.createdAt) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (record.createdAt < fiveMinutesAgo) {
              // Stale pending record from crashed process - try to atomically claim it
              // Use WHERE conditions to ensure only one worker can claim it
              const claimResult = await db.update(sentNotifications)
                .set({ createdAt: new Date() })
                .where(
                  and(
                    eq(sentNotifications.id, record.id),
                    eq(sentNotifications.status, 'pending'),
                    sql`${sentNotifications.createdAt} < ${fiveMinutesAgo}`
                  )
                )
                .returning();
              
              if (claimResult.length > 0) {
                console.log(`[Notifications] Claimed stale pending notification for retry: ${notificationType} for game ${gameId}`);
                return true; // We successfully claimed it, re-attempt the email
              }
              // Another worker already claimed it
              return false;
            }
          }
          
          // Recent pending/sending record - another process is handling it
          return false;
        }
        
        // Record doesn't exist (race condition) - shouldn't happen but treat as skip
        return false;
      }
      throw error;
    }
  }

  // Mark notification as 'sending' (about to send email)
  async markNotificationSending(gameId: string, subscriptionId: string, notificationType: string): Promise<boolean> {
    const result = await db.update(sentNotifications)
      .set({ status: 'sending', createdAt: new Date() })
      .where(
        and(
          eq(sentNotifications.gameId, gameId),
          eq(sentNotifications.subscriptionId, subscriptionId),
          eq(sentNotifications.notificationType, notificationType),
          eq(sentNotifications.status, 'pending') // Only transition from pending
        )
      )
      .returning();
    return result.length > 0;
  }

  // Mark notification as successfully sent
  async markNotificationSent(gameId: string, subscriptionId: string, notificationType: string): Promise<boolean> {
    const result = await db.update(sentNotifications)
      .set({ status: 'sent', sentAt: new Date() })
      .where(
        and(
          eq(sentNotifications.gameId, gameId),
          eq(sentNotifications.subscriptionId, subscriptionId),
          eq(sentNotifications.notificationType, notificationType)
        )
      )
      .returning();
    return result.length > 0;
  }

  // Delete a notification record (used when email delivery fails to allow retry)
  async deleteNotificationRecord(gameId: string, subscriptionId: string, notificationType: string): Promise<boolean> {
    const result = await db.delete(sentNotifications).where(
      and(
        eq(sentNotifications.gameId, gameId),
        eq(sentNotifications.subscriptionId, subscriptionId),
        eq(sentNotifications.notificationType, notificationType)
      )
    ).returning();
    return result.length > 0;
  }

  // Push subscription operations
  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions);
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const result = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return result[0];
  }

  async createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    const result = await db.insert(pushSubscriptions).values(sub).returning();
    return result[0];
  }

  async updatePushSubscription(id: string, update: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined> {
    const result = await db.update(pushSubscriptions)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(pushSubscriptions.id, id))
      .returning();
    return result[0];
  }

  async deletePushSubscription(id: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id)).returning();
    return result.length > 0;
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).returning();
    return result.length > 0;
  }

  async getPushSubscriptionByToken(fcmToken: string): Promise<PushSubscription | undefined> {
    const result = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.fcmToken, fcmToken));
    return result[0];
  }

  async deletePushSubscriptionByToken(fcmToken: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions).where(eq(pushSubscriptions.fcmToken, fcmToken)).returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
