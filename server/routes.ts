import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { syncService } from "./sync-service";
import { triggerManualSync } from "./cron";

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

  // Get sync configuration
  app.get("/api/sync/config", async (_req, res) => {
    try {
      const config = syncService.getConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sync config" });
    }
  });

  // Update Google Drive URL
  app.post("/api/sync/config", async (req, res) => {
    try {
      const { googleDriveUrl } = req.body;
      
      if (!googleDriveUrl || typeof googleDriveUrl !== 'string') {
        return res.status(400).json({ message: "Invalid Google Drive URL" });
      }
      
      syncService.setGoogleDriveUrl(googleDriveUrl);
      res.json({ message: "Google Drive URL updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update sync config" });
    }
  });

  // Trigger manual sync
  app.post("/api/sync/trigger", async (_req, res) => {
    try {
      await triggerManualSync();
      const config = syncService.getConfig();
      res.json({ 
        message: "Sync completed successfully",
        config 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Sync failed";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Get sync logs
  app.get("/api/sync/logs", async (_req, res) => {
    try {
      const logs = syncService.getSyncLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sync logs" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
