import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema } from "@shared/schema";
import { sendWelcomeEmail } from "./email-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all games
  app.get("/api/games", async (_req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch games" });
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

  const httpServer = createServer(app);

  return httpServer;
}
