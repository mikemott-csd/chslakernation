import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema, insertPushSubscriptionSchema } from "@shared/schema";
import { sendPushNotification } from "./firebase-admin";
import { sendWelcomeEmail, checkMailjetStatus, sendUnsubscribeConfirmation } from "./email-service";
import { syncFromGoogleDrive } from "./sync-service";
import { syncNewsArticles } from "./news-service";
import { syncPhotosFromGoogleDrive, getLocalThumbnail, getLocalFullImage } from "./photo-sync-service";
import { triggerManualNotificationCheck } from "./cron";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all games
  app.get("/api/games", async (_req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error) {
      console.error('Failed to fetch games:', error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  // Increment attendance for a game
  app.post("/api/games/:id/attendance", async (req, res) => {
    try {
      const game = await storage.incrementAttendance(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      console.error('Failed to increment attendance:', error);
      res.status(500).json({ message: "Failed to increment attendance" });
    }
  });

  // Create a new subscription
  app.post("/api/subscriptions", async (req, res) => {
    try {
      const validatedData = insertSubscriptionSchema.parse(req.body);
      
      // Check if email already exists
      const existing = await storage.getSubscriptionByEmail(validatedData.email);
      if (existing) {
        // Update existing subscription
        const updated = await storage.updateSubscription(existing.id, {
          sports: validatedData.sports,
        });
        
        // Send confirmation email for subscription update (async, don't wait)
        if (updated) {
          sendWelcomeEmail(updated).catch(err => 
            console.error('Failed to send update confirmation email:', err)
          );
        }
        
        res.json({ subscription: updated, message: "Subscription updated successfully" });
      } else {
        // Create new subscription
        const subscription = await storage.createSubscription(validatedData);
        
        // Send welcome email (async, don't wait)
        sendWelcomeEmail(subscription).catch(err => 
          console.error('Failed to send welcome email:', err)
        );
        
        res.status(201).json({ subscription, message: "Subscription created successfully" });
      }
    } catch (error) {
      console.error('Subscription creation error:', error);
      res.status(400).json({ message: "Invalid subscription data" });
    }
  });

  // Get subscription by email (for checking if already subscribed)
  app.get("/api/subscriptions/:email", async (req, res) => {
    try {
      const subscription = await storage.getSubscriptionByEmail(req.params.email);
      if (subscription) {
        res.json(subscription);
      } else {
        res.status(404).json({ message: "Subscription not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Get subscription by unsubscribe token (for showing current sports)
  app.get("/api/subscription/by-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const subscription = await storage.getSubscriptionByToken(token);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      // Return only the sports array (don't expose email or other sensitive data)
      res.json({ sports: subscription.sports });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Unsubscribe using token - supports selective or full unsubscription
  app.post("/api/unsubscribe", async (req, res) => {
    try {
      const { token, sports } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Unsubscribe token required" });
      }
      
      const subscription = await storage.getSubscriptionByToken(token);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      const subscriberEmail = subscription.email;
      const originalSports = [...subscription.sports];
      
      // If sports array provided, do selective unsubscription
      if (sports && Array.isArray(sports) && sports.length > 0) {
        const remainingSports = subscription.sports.filter(s => !sports.includes(s));
        
        if (remainingSports.length === 0) {
          // No sports left, delete the subscription entirely
          await storage.deleteSubscription(subscription.id);
          
          // Send unsubscribe confirmation email (async, don't wait)
          sendUnsubscribeConfirmation(subscriberEmail, originalSports, [], true).catch(err => {
            console.error('Failed to send unsubscribe confirmation:', err);
          });
          
          res.json({ message: "Successfully unsubscribed from all sports", fullyUnsubscribed: true });
        } else {
          // Update subscription with remaining sports
          await storage.updateSubscription(subscription.id, { sports: remainingSports });
          
          // Send unsubscribe confirmation email (async, don't wait)
          sendUnsubscribeConfirmation(subscriberEmail, sports, remainingSports, false).catch(err => {
            console.error('Failed to send unsubscribe confirmation:', err);
          });
          
          res.json({ 
            message: `Successfully unsubscribed from ${sports.join(", ")}`, 
            fullyUnsubscribed: false,
            remainingSports 
          });
        }
      } else {
        // No sports specified, unsubscribe from all (delete subscription)
        await storage.deleteSubscription(subscription.id);
        
        // Send unsubscribe confirmation email (async, don't wait)
        sendUnsubscribeConfirmation(subscriberEmail, originalSports, [], true).catch(err => {
          console.error('Failed to send unsubscribe confirmation:', err);
        });
        
        res.json({ message: "Successfully unsubscribed from all sports", fullyUnsubscribed: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // Admin endpoint: Manual sync from Google Drive
  app.post("/api/admin/sync", async (req, res) => {
    try {
      // Simple authentication check (for internal admin use)
      const adminSecret = process.env.ADMIN_SECRET;
      const providedSecret = req.headers['x-admin-secret'] || req.body.adminSecret;
      
      // Return 401 for both missing config and wrong secret (don't leak config status)
      if (!adminSecret || providedSecret !== adminSecret) {
        console.warn(`Unauthorized sync attempt from ${req.ip}`);
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log('Manual sync triggered via admin endpoint');
      
      // Trigger sync
      const result = await syncFromGoogleDrive('manual');
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          gamesAdded: result.gamesAdded,
          gamesUpdated: result.gamesUpdated,
          skipped: result.skipped,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message,
          errors: result.errors,
        });
      }
    } catch (error) {
      console.error('Admin sync error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Sync failed" 
      });
    }
  });

  // Get recent sync logs
  app.get("/api/admin/sync-logs", async (req, res) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      const providedSecret = req.headers['x-admin-secret'];
      
      if (!adminSecret || providedSecret !== adminSecret) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await storage.getRecentSyncLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
      res.status(500).json({ message: "Failed to fetch sync logs" });
    }
  });

  // Get news articles
  app.get("/api/news", async (_req, res) => {
    try {
      const articles = await storage.getRecentNewsArticles(8);
      res.json(articles);
    } catch (error) {
      console.error('Failed to fetch news articles:', error);
      res.status(500).json({ message: "Failed to fetch news articles" });
    }
  });

  // Admin: Manually trigger news sync
  app.post("/api/admin/sync-news", async (req, res) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      const providedSecret = req.headers['x-admin-secret'];
      
      if (!adminSecret || providedSecret !== adminSecret) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log('Manual news sync triggered via admin endpoint');
      const result = await syncNewsArticles();
      
      res.json({
        success: true,
        message: `News sync complete: ${result.added} added, ${result.updated} updated`,
        ...result,
      });
    } catch (error) {
      console.error('Admin news sync error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "News sync failed" 
      });
    }
  });

  // Debug: Check Mailjet status
  app.get("/api/debug/mailjet-status", async (_req, res) => {
    try {
      const status = await checkMailjetStatus();
      res.json(status);
    } catch (error) {
      console.error('Failed to check Mailjet status:', error);
      res.status(500).json({ message: "Failed to check Mailjet status" });
    }
  });

  // Debug: Send a test email to any address
  app.post("/api/debug/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email address required" });
      }
      
      // Create a mock subscription for testing
      const testSubscription = {
        id: 'test-id',
        email: email,
        sports: ['Football', 'Basketball'],
        unsubscribeToken: 'test-token',
        createdAt: new Date()
      };
      
      const result = await sendWelcomeEmail(testSubscription);
      res.json({ 
        success: result, 
        message: result ? `Test email sent to ${email}` : 'Failed to send email'
      });
    } catch (error) {
      console.error('Failed to send test email:', error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Debug: Manually trigger notification check
  app.post("/api/debug/trigger-notifications", async (_req, res) => {
    try {
      console.log('[Debug] Manual notification check triggered via API');
      const result = await triggerManualNotificationCheck();
      res.json({
        success: true,
        message: `Notification check complete: ${result.emailsSent} emails sent, ${result.skippedDuplicates} duplicates skipped`,
        gamesIn24Hours: result.gamesIn24Hours,
        gamesMorningOf: result.gamesMorningOf,
        emailsSent: result.emailsSent,
        skippedDuplicates: result.skippedDuplicates,
        errors: result.errors,
      });
    } catch (error) {
      console.error('Failed to trigger notification check:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Failed to trigger notification check" 
      });
    }
  });

  // Get all photos (public endpoint)
  app.get("/api/photos", async (_req, res) => {
    try {
      const photos = await storage.getAllPhotos();
      res.json(photos);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.get("/api/photos/:fileId/thumbnail", async (req, res) => {
    try {
      const { fileId } = req.params;
      const result = getLocalThumbnail(fileId);
      
      if (!result) {
        return res.status(404).json({ message: "Thumbnail not found" });
      }
      
      res.set('Content-Type', result.mimeType);
      res.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      res.sendFile(result.filePath);
    } catch (error) {
      console.error('Failed to serve thumbnail:', error);
      res.status(500).json({ message: "Failed to serve thumbnail" });
    }
  });

  app.get("/api/photos/:fileId/image", async (req, res) => {
    try {
      const { fileId } = req.params;
      const result = getLocalFullImage(fileId);
      
      if (!result) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      res.set('Content-Type', result.mimeType);
      res.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      res.sendFile(result.filePath);
    } catch (error) {
      console.error('Failed to serve image:', error);
      res.status(500).json({ message: "Failed to serve image" });
    }
  });

  // Admin: Manually trigger photo sync from Google Drive
  app.post("/api/admin/sync-photos", async (req, res) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      const providedSecret = req.headers['x-admin-secret'] || req.body.adminSecret;
      
      if (!adminSecret || providedSecret !== adminSecret) {
        console.warn(`Unauthorized photo sync attempt from ${req.ip}`);
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log('Manual photo sync triggered via admin endpoint');
      
      const result = await syncPhotosFromGoogleDrive('manual');
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          photosAdded: result.photosAdded,
          photosRemoved: result.photosRemoved,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message,
          errors: result.errors,
        });
      }
    } catch (error) {
      console.error('Admin photo sync error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Photo sync failed" 
      });
    }
  });

  // Get recent photo sync logs
  app.get("/api/admin/photo-sync-logs", async (req, res) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      const providedSecret = req.headers['x-admin-secret'];
      
      if (!adminSecret || providedSecret !== adminSecret) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await storage.getRecentPhotoSyncLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error('Failed to fetch photo sync logs:', error);
      res.status(500).json({ message: "Failed to fetch photo sync logs" });
    }
  });

  app.post("/api/push-subscriptions", async (req, res) => {
    try {
      const { fcmToken, sports } = req.body;
      
      if (!fcmToken || !sports || !Array.isArray(sports) || sports.length === 0) {
        return res.status(400).json({ message: "fcmToken and sports array are required" });
      }

      const existing = await storage.getPushSubscriptionByToken(fcmToken);
      if (existing) {
        const updated = await storage.updatePushSubscription(existing.id, {
          sports,
        });
        return res.json({ subscription: updated, message: "Push subscription updated" });
      }

      const subscription = await storage.createPushSubscription({
        endpoint: fcmToken,
        fcmToken,
        sports,
      });
      res.status(201).json({ subscription, message: "Push subscription created" });
    } catch (error) {
      console.error('Push subscription error:', error);
      res.status(500).json({ message: "Failed to save push subscription" });
    }
  });

  app.delete("/api/push-subscriptions", async (req, res) => {
    try {
      const { fcmToken } = req.body;
      if (!fcmToken) {
        return res.status(400).json({ message: "fcmToken is required" });
      }

      await storage.deletePushSubscriptionByToken(fcmToken);
      res.json({ message: "Push subscription removed" });
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });

  app.get("/api/firebase-config", (_req, res) => {
    res.json({
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || '',
    });
  });

  app.get("/api/vapid-key", (_req, res) => {
    res.json({ vapidKey: process.env.FIREBASE_VAPID_KEY || '' });
  });

  const httpServer = createServer(app);

  return httpServer;
}
