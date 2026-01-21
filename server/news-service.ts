import { storage } from "./storage";
import type { InsertNewsArticle } from "@shared/schema";

const GOOGLE_NEWS_BFP_URL = "https://news.google.com/rss/search?q=site:burlingtonfreepress.com+colchester+high+school+sports&hl=en-US&gl=US&ceid=US:en";
const GOOGLE_NEWS_BFP_BACKUP_URL = "https://news.google.com/rss/search?q=site:burlingtonfreepress.com+colchester+vermont+athletics&hl=en-US&gl=US&ceid=US:en";
const GOOGLE_NEWS_BFP_GENERAL_URL = "https://news.google.com/rss/search?q=site:burlingtonfreepress.com+vermont+high+school+sports&hl=en-US&gl=US&ceid=US:en";

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
  
  return false;
}

function isVermontSportsRelated(title: string): boolean {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes("vermont") && titleLower.includes("high school")) {
    const hasSportsContext = SPORTS_KEYWORDS.some(kw => titleLower.includes(kw));
    return hasSportsContext;
  }
  
  return false;
}

async function resolveGoogleNewsUrl(googleUrl: string): Promise<string> {
  try {
    const response = await fetch(googleUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    
    const finalUrl = response.url;
    if (finalUrl && finalUrl.includes('burlingtonfreepress.com')) {
      return finalUrl;
    }
    
    return googleUrl;
  } catch (error) {
    return googleUrl;
  }
}

async function fetchGoogleNewsRSS(url: string): Promise<ParsedArticle[]> {
  try {
    console.log(`[News Sync] Fetching from: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (!response.ok) {
      console.error(`[News Sync] RSS fetch failed with status: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseRSSFeed(xml);
  } catch (error) {
    console.error("[News Sync] Error fetching RSS:", error);
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
    
    if (title && link) {
      const decodedTitle = decodeHtmlEntities(title);
      
      let publishedAt: Date | undefined;
      if (pubDate) {
        publishedAt = new Date(pubDate);
      }
      
      const cleanTitle = decodedTitle.replace(/ - Burlington Free Press$/, '').replace(/ - [^-]+$/, '').trim();
      
      articles.push({
        title: cleanTitle,
        url: link,
        publishedAt,
        source: "Burlington Free Press",
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
  
  console.log("[News Sync] Fetching Burlington Free Press articles about Colchester athletics...");
  
  const primaryArticles = await fetchGoogleNewsRSS(GOOGLE_NEWS_BFP_URL);
  console.log(`[News Sync] Primary search returned ${primaryArticles.length} articles`);
  
  for (const article of primaryArticles) {
    const normalizedTitle = article.title.toLowerCase().trim();
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      allArticles.push(article);
    }
  }
  
  const backupArticles = await fetchGoogleNewsRSS(GOOGLE_NEWS_BFP_BACKUP_URL);
  console.log(`[News Sync] Backup search returned ${backupArticles.length} articles`);
  
  for (const article of backupArticles) {
    const normalizedTitle = article.title.toLowerCase().trim();
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      allArticles.push(article);
    }
  }
  
  if (allArticles.length < 5) {
    console.log("[News Sync] Fetching general Vermont high school sports from Burlington Free Press...");
    const generalArticles = await fetchGoogleNewsRSS(GOOGLE_NEWS_BFP_GENERAL_URL);
    console.log(`[News Sync] General search returned ${generalArticles.length} articles`);
    
    for (const article of generalArticles) {
      const normalizedTitle = article.title.toLowerCase().trim();
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        allArticles.push(article);
      }
    }
  }
  
  const colchesterArticles = allArticles.filter(article => isColchesterRelated(article.title));
  const otherArticles = allArticles.filter(article => !isColchesterRelated(article.title));
  
  const sortedColchester = colchesterArticles.sort((a, b) => {
    const dateA = a.publishedAt?.getTime() || 0;
    const dateB = b.publishedAt?.getTime() || 0;
    return dateB - dateA;
  });
  
  const sortedOther = otherArticles.sort((a, b) => {
    const dateA = a.publishedAt?.getTime() || 0;
    const dateB = b.publishedAt?.getTime() || 0;
    return dateB - dateA;
  });
  
  const finalArticles = [...sortedColchester, ...sortedOther].slice(0, 10);
  
  console.log(`[News Sync] Found ${sortedColchester.length} Colchester-specific articles and ${sortedOther.length} other Burlington Free Press articles`);
  
  console.log("[News Sync] Attempting to resolve direct Burlington Free Press URLs...");
  const resolvedArticles: ParsedArticle[] = [];
  
  for (const article of finalArticles) {
    try {
      const resolvedUrl = await resolveGoogleNewsUrl(article.url);
      resolvedArticles.push({
        ...article,
        url: resolvedUrl,
      });
    } catch (error) {
      resolvedArticles.push(article);
    }
  }
  
  return resolvedArticles;
}

export async function syncNewsArticles(): Promise<{ added: number; updated: number }> {
  console.log("[News Sync] Starting news sync for Colchester Athletics from Burlington Free Press...");
  
  const articles = await fetchBurlingtonFreePressArticles();
  
  if (articles.length === 0) {
    console.log("[News Sync] No articles found, keeping existing articles");
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
  
  console.log(`[News Sync] Completed: ${added} articles refreshed from Burlington Free Press`);
  return { added, updated: 0 };
}

export async function seedNewsIfEmpty(): Promise<void> {
  const existing = await storage.getAllNewsArticles();
  if (existing.length > 0) {
    console.log("[News] News articles already exist, skipping seed");
    return;
  }

  console.log("[News] No articles found, fetching from Burlington Free Press...");
  await syncNewsArticles();
}
