import { storage } from "./storage";
import type { InsertNewsArticle } from "@shared/schema";

const BURLINGTON_FREE_PRESS_SPORTS_URL = "https://www.burlingtonfreepress.com/sports/";

interface ParsedArticle {
  title: string;
  url: string;
  publishedAt?: Date;
}

export async function fetchBurlingtonFreePressArticles(): Promise<ParsedArticle[]> {
  try {
    console.log("[News Sync] Fetching Burlington Free Press sports articles...");
    
    const response = await fetch(BURLINGTON_FREE_PRESS_SPORTS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const articles = parseArticlesFromHtml(html);
    
    // Filter for articles related to Colchester or Vermont high school sports
    const relevantArticles = articles.filter(article => {
      const titleLower = article.title.toLowerCase();
      return (
        titleLower.includes("colchester") ||
        titleLower.includes("lakers") ||
        titleLower.includes("vermont") ||
        titleLower.includes("high school") ||
        titleLower.includes("all-state") ||
        titleLower.includes("varsity")
      );
    });

    console.log(`[News Sync] Found ${relevantArticles.length} relevant articles out of ${articles.length} total`);
    return relevantArticles.slice(0, 8); // Limit to 8 most recent relevant articles
  } catch (error) {
    console.error("[News Sync] Error fetching articles:", error);
    return [];
  }
}

function parseArticlesFromHtml(html: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];
  
  // Match article links with titles from Burlington Free Press HTML structure
  // Looking for patterns like: <a href="https://www.burlingtonfreepress.com/story/...">Article Title</a>
  const articleRegex = /href="(https:\/\/www\.burlingtonfreepress\.com\/story\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  
  let match;
  const seenUrls = new Set<string>();
  
  while ((match = articleRegex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    
    // Skip if we've already seen this URL or if title is too short/generic
    if (seenUrls.has(url) || title.length < 10) continue;
    
    // Skip navigation links and generic text
    if (title.toLowerCase().includes("more in") || 
        title.toLowerCase().includes("view gallery") ||
        title.toLowerCase().includes("shopping")) continue;
    
    seenUrls.add(url);
    
    // Try to extract date from URL (format: /2025/12/03/)
    const dateMatch = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
    let publishedAt: Date | undefined;
    if (dateMatch) {
      publishedAt = new Date(
        parseInt(dateMatch[1]),
        parseInt(dateMatch[2]) - 1,
        parseInt(dateMatch[3])
      );
    }
    
    articles.push({ title, url, publishedAt });
  }
  
  return articles;
}

export async function syncNewsArticles(): Promise<{ added: number; updated: number }> {
  console.log("[News Sync] Starting weekly news sync...");
  
  const articles = await fetchBurlingtonFreePressArticles();
  
  let added = 0;
  let updated = 0;
  
  for (const article of articles) {
    const insertArticle: InsertNewsArticle = {
      title: article.title,
      url: article.url,
      publishedAt: article.publishedAt,
    };
    
    try {
      // Check if article already exists by URL
      const existing = await storage.getAllNewsArticles();
      const existingArticle = existing.find(a => a.url === article.url);
      
      await storage.upsertNewsArticle(insertArticle);
      
      if (existingArticle) {
        updated++;
      } else {
        added++;
      }
    } catch (error) {
      console.error(`[News Sync] Error upserting article "${article.title}":`, error);
    }
  }
  
  console.log(`[News Sync] Completed: ${added} added, ${updated} updated`);
  return { added, updated };
}

// Seed initial articles if none exist
export async function seedNewsIfEmpty(): Promise<void> {
  const existing = await storage.getAllNewsArticles();
  if (existing.length > 0) {
    console.log("[News] News articles already exist, skipping seed");
    return;
  }

  console.log("[News] Seeding initial news articles...");
  
  // Seed with the current Burlington Free Press articles
  const initialArticles: InsertNewsArticle[] = [
    {
      title: "This state football champion is a German foreign exchange student",
      url: "https://www.burlingtonfreepress.com/story/sports/high-school/varsityinsider/2025/11/24/meet-colchester-lakers-footballs-foreign-exchange-student-sebastian-viertlboeck/86857726007/",
      publishedAt: new Date("2025-11-24"),
    },
    {
      title: "Find out who made VT high school football coaches' all-state teams",
      url: "https://www.burlingtonfreepress.com/story/sports/high-school/varsityinsider/2025/11/24/vermont-high-school-football-coaches-all-state-teams-for-2025-season/87271432007/",
      publishedAt: new Date("2025-11-24"),
    },
    {
      title: "50 players selected to the 2025 Free Press All-State Boys Soccer Team",
      url: "https://www.burlingtonfreepress.com/story/sports/high-school/varsityinsider/2025/12/03/vermont-free-press-all-state-boys-soccer-team-for-2025-season/87343019007/",
      publishedAt: new Date("2025-12-03"),
    },
    {
      title: "50 players selected to the 36th Free Press All-State Girls Soccer Team",
      url: "https://www.burlingtonfreepress.com/story/sports/high-school/varsityinsider/2025/12/01/vermont-free-press-all-state-girls-soccer-team-for-2025-season/87342830007/",
      publishedAt: new Date("2025-12-01"),
    },
  ];

  for (const article of initialArticles) {
    await storage.upsertNewsArticle(article);
  }
  
  console.log(`[News] Seeded ${initialArticles.length} initial articles`);
}
