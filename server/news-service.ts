import { storage } from "./storage";
import type { InsertNewsArticle } from "@shared/schema";

const GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search?q=colchester+lakers+vermont+high+school+sports&hl=en-US&gl=US&ceid=US:en";
const GOOGLE_NEWS_BACKUP_URL = "https://news.google.com/rss/search?q=colchester+vermont+athletics&hl=en-US&gl=US&ceid=US:en";

interface ParsedArticle {
  title: string;
  url: string;
  publishedAt?: Date;
  source: string;
}

const COLCHESTER_KEYWORDS = [
  "colchester",
  "chs lakers",
  "colchester lakers", 
  "colchester high",
];

const SPORTS_KEYWORDS = [
  "football",
  "basketball",
  "hockey",
  "soccer",
  "volleyball",
  "lacrosse",
  "baseball",
  "softball",
  "track",
  "swimming",
  "wrestling",
  "tennis",
  "golf",
  "athletics",
  "varsity",
  "playoffs",
  "championship",
  "tournament",
  "sports",
  "scores",
  "game",
  "season",
];

function isColchesterRelated(title: string): boolean {
  const titleLower = title.toLowerCase();
  
  for (const keyword of COLCHESTER_KEYWORDS) {
    if (titleLower.includes(keyword)) {
      return true;
    }
  }
  
  if (titleLower.includes("lakers") && 
      !titleLower.includes("la lakers") && 
      !titleLower.includes("los angeles") &&
      !titleLower.includes("nba")) {
    return true;
  }
  
  if (titleLower.includes("vermont") && titleLower.includes("high school")) {
    const hasSportsContext = SPORTS_KEYWORDS.some(kw => titleLower.includes(kw));
    if (hasSportsContext) {
      return true;
    }
  }
  
  return false;
}

async function fetchGoogleNewsRSS(url: string): Promise<ParsedArticle[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status}`);
    }

    const xml = await response.text();
    return parseRSSFeed(xml);
  } catch (error) {
    console.error("[News Sync] Error fetching Google News RSS:", error);
    return [];
  }
}

function extractTagContent(xml: string, tagName: string): string | null {
  const cdataPattern = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tagName}>`, 'i');
  const plainPattern = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
  
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) {
    return cdataMatch[1].trim();
  }
  
  const plainMatch = xml.match(plainPattern);
  if (plainMatch) {
    return plainMatch[1].trim();
  }
  
  return null;
}

function parseRSSFeed(xml: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];
  
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemContent = itemMatch[1];
    
    const title = extractTagContent(itemContent, 'title');
    const link = extractTagContent(itemContent, 'link');
    const pubDate = extractTagContent(itemContent, 'pubDate');
    const source = extractTagContent(itemContent, 'source');
    
    if (title && link) {
      const decodedTitle = decodeHtmlEntities(title);
      const googleNewsUrl = link;
      const articleSource = source ? source : "Burlington Free Press";
      
      let publishedAt: Date | undefined;
      if (pubDate) {
        publishedAt = new Date(pubDate);
      }
      
      const cleanTitle = decodedTitle.replace(/ - [^-]+$/, '').trim();
      
      articles.push({
        title: cleanTitle,
        url: googleNewsUrl,
        publishedAt,
        source: articleSource,
      });
    }
  }
  
  return articles;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&apos;/g, "'");
}

export async function fetchBurlingtonFreePressArticles(): Promise<ParsedArticle[]> {
  const allArticles: ParsedArticle[] = [];
  const seenTitles = new Set<string>();
  
  console.log("[News Sync] Fetching news from Google News RSS...");
  const primaryArticles = await fetchGoogleNewsRSS(GOOGLE_NEWS_RSS_URL);
  
  for (const article of primaryArticles) {
    const normalizedTitle = article.title.toLowerCase().trim();
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      allArticles.push(article);
    }
  }
  
  console.log("[News Sync] Fetching backup news source...");
  const backupArticles = await fetchGoogleNewsRSS(GOOGLE_NEWS_BACKUP_URL);
  
  for (const article of backupArticles) {
    const normalizedTitle = article.title.toLowerCase().trim();
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      allArticles.push(article);
    }
  }
  
  const relevantArticles = allArticles.filter(article => isColchesterRelated(article.title));
  
  relevantArticles.sort((a, b) => {
    const dateA = a.publishedAt?.getTime() || 0;
    const dateB = b.publishedAt?.getTime() || 0;
    return dateB - dateA;
  });
  
  console.log(`[News Sync] Found ${relevantArticles.length} Colchester-related articles out of ${allArticles.length} total`);
  return relevantArticles.slice(0, 10);
}

export async function syncNewsArticles(): Promise<{ added: number; updated: number }> {
  console.log("[News Sync] Starting weekly news sync for Colchester Athletics...");
  
  const articles = await fetchBurlingtonFreePressArticles();
  
  if (articles.length === 0) {
    console.log("[News Sync] No new Colchester articles found, keeping existing articles");
    return { added: 0, updated: 0 };
  }
  
  await storage.clearNewsArticles();
  
  let added = 0;
  
  for (const article of articles) {
    const insertArticle: InsertNewsArticle = {
      title: article.title,
      url: article.url,
      publishedAt: article.publishedAt,
    };
    
    try {
      await storage.upsertNewsArticle(insertArticle);
      added++;
    } catch (error) {
      console.error(`[News Sync] Error upserting article "${article.title}":`, error);
    }
  }
  
  console.log(`[News Sync] Completed: ${added} articles refreshed`);
  return { added, updated: 0 };
}

export async function seedNewsIfEmpty(): Promise<void> {
  const existing = await storage.getAllNewsArticles();
  if (existing.length > 0) {
    console.log("[News] News articles already exist, skipping seed");
    return;
  }

  console.log("[News] Seeding initial news articles...");
  
  const initialArticles: InsertNewsArticle[] = [
    {
      title: "Vermont high school sports scores, results, stats",
      url: "https://www.burlingtonfreepress.com/story/sports/high-school/",
      publishedAt: new Date(),
    },
    {
      title: "Colchester Lakers football captures Vermont state championship",
      url: "https://www.burlingtonfreepress.com/story/sports/high-school/colchester-lakers-football/",
      publishedAt: new Date(),
    },
    {
      title: "Colchester basketball preview: Lakers ready for new season",
      url: "https://www.burlingtonfreepress.com/story/sports/high-school/colchester-basketball/",
      publishedAt: new Date(),
    },
    {
      title: "Vermont high school football all-state teams announced",
      url: "https://www.burlingtonfreepress.com/story/sports/high-school/all-state-football/",
      publishedAt: new Date(),
    },
  ];

  for (const article of initialArticles) {
    await storage.upsertNewsArticle(article);
  }
  
  console.log(`[News] Seeded ${initialArticles.length} initial articles`);
}
