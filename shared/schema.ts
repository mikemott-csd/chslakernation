import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
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
  sport: text("sport").notNull(), // Football, Soccer, Basketball, Volleyball
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
export type SportType = "Football" | "Soccer" | "Basketball" | "Volleyball";

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
