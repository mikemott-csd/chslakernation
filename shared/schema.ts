import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Sports Schedule Schema
export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sport: text("sport").notNull(), // Football, Soccer, Basketball, Volleyball, Hockey
  opponent: text("opponent").notNull(),
  date: timestamp("date", { mode: "date" }).notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  isHome: text("is_home").notNull(), // "home" or "away"
  homeScore: integer("home_score"), // CHS Lakers score (nullable until game is final)
  awayScore: integer("away_score"), // Opponent score (nullable until game is final)
  final: boolean("final").default(false).notNull(), // true if game is completed
  attendanceCount: integer("attendance_count").default(0).notNull(), // Number of people marked as going
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
});

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

// Type for sport names
export type SportType = "Football" | "Boys Basketball" | "Girls Basketball" | "Volleyball" | "Boys Hockey" | "Girls Ice Hockey";

// Email Subscriptions Schema
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  sports: text("sports").array().notNull(), // Array of sports to receive notifications for
  unsubscribeToken: varchar("unsubscribe_token").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  unsubscribeToken: true,
  createdAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Sync Logs Schema - tracks Google Drive import history
export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  syncedAt: timestamp("synced_at", { mode: "date" }).notNull().defaultNow(),
  gamesAdded: text("games_added").notNull(), // number as text for simplicity
  gamesUpdated: text("games_updated").notNull(),
  gamesSkipped: text("games_skipped").notNull(),
  status: text("status").notNull(), // "success" or "error"
  errorMessage: text("error_message"),
  triggeredBy: text("triggered_by").notNull(), // "manual" or "cron"
});

export const insertSyncLogSchema = createInsertSchema(syncLogs).omit({
  id: true,
  syncedAt: true,
});

export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;

// News Articles Schema - Burlington Free Press articles about Colchester sports
export const newsArticles = pgTable("news_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  publishedAt: timestamp("published_at", { mode: "date" }),
  fetchedAt: timestamp("fetched_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({
  id: true,
  fetchedAt: true,
});

export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type NewsArticle = typeof newsArticles.$inferSelect;

// Photos Schema - photos synced from Google Drive
export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleDriveId: text("google_drive_id").notNull().unique(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  webViewUrl: text("web_view_url"),
  downloadUrl: text("download_url"),
  createdTime: timestamp("created_time", { mode: "date" }),
  syncedAt: timestamp("synced_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  syncedAt: true,
});

export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

// Photo Sync Logs Schema - tracks Google Drive photo sync history
export const photoSyncLogs = pgTable("photo_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  syncedAt: timestamp("synced_at", { mode: "date" }).notNull().defaultNow(),
  photosAdded: integer("photos_added").notNull(),
  photosRemoved: integer("photos_removed").notNull(),
  status: text("status").notNull(), // "success" or "error"
  errorMessage: text("error_message"),
  triggeredBy: text("triggered_by").notNull(), // "manual" or "cron"
});

export const insertPhotoSyncLogSchema = createInsertSchema(photoSyncLogs).omit({
  id: true,
  syncedAt: true,
});

export type InsertPhotoSyncLog = z.infer<typeof insertPhotoSyncLogSchema>;
export type PhotoSyncLog = typeof photoSyncLogs.$inferSelect;

// Sent Notifications Schema - tracks which notifications have been sent to prevent duplicates
// Uses a three-phase approach: pending -> sending -> sent to handle process crashes
// - 'pending': claimed but email not yet attempted
// - 'sending': email send in progress (prevents re-send on stale recovery)
// - 'sent': email delivered and confirmed
export const sentNotifications = pgTable("sent_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  subscriptionId: varchar("subscription_id").notNull(),
  notificationType: text("notification_type").notNull(), // "24hour" or "gameday"
  status: text("status").notNull().default("pending"), // "pending", "sending", or "sent"
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { mode: "date" }),
}, (table) => ({
  uniqueNotification: unique("unique_notification").on(table.gameId, table.subscriptionId, table.notificationType),
}));

export const insertSentNotificationSchema = createInsertSchema(sentNotifications).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

export type InsertSentNotification = z.infer<typeof insertSentNotificationSchema>;
export type SentNotification = typeof sentNotifications.$inferSelect;

// Push Notification Subscriptions Schema - FCM tokens for web push
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endpoint: text("endpoint").notNull().unique(),
  fcmToken: text("fcm_token").notNull(),
  sports: text("sports").array().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
