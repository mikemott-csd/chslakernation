import { type User, type InsertUser, type Game, type InsertGame, type Subscription, type InsertSubscription, subscriptions } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
  
  // Subscription operations
  getAllSubscriptions(): Promise<Subscription[]>;
  getSubscriptionByEmail(email: string): Promise<Subscription | undefined>;
  getSubscriptionByToken(token: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private games: Map<string, Game>;

  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.seedGames();
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
    return Array.from(this.games.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  async getGameById(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = { ...insertGame, id };
    this.games.set(id, game);
    return game;
  }

  async replaceAllGames(games: Game[]): Promise<void> {
    this.games.clear();
    for (const game of games) {
      this.games.set(game.id, game);
    }
  }

  async clearGames(): Promise<void> {
    this.games.clear();
  }

  private seedGames() {
    // October 2025 Games
    const gamesData: Omit<Game, "id">[] = [
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

    gamesData.forEach((gameData) => {
      const id = randomUUID();
      const game: Game = { ...gameData, id };
      this.games.set(id, game);
    });
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
}

export const storage = new MemStorage();
