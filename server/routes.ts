import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema } from "@shared/schema";
import { sendWelcomeEmail, checkMailjetStatus } from "./email-service";
import { syncFromGoogleDrive } from "./sync-service";
import { syncNewsArticles } from "./news-service";

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

  // Unsubscribe using token
  app.post("/api/unsubscribe", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Unsubscribe token required" });
      }
      
      const subscription = await storage.getSubscriptionByToken(token);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      await storage.deleteSubscription(subscription.id);
      res.json({ message: "Successfully unsubscribed" });
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

  const httpServer = createServer(app);

  return httpServer;
}
