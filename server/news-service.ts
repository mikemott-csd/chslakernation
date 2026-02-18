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

async function getDecodingParams(base64Str: string): Promise<{ signature: string; timestamp: string } | null> {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
  const urls = [
    `https://news.google.com/articles/${base64Str}`,
    `https://news.google.com/rss/articles/${base64Str}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA },
        redirect: "follow",
      });
      if (!response.ok) continue;

      const html = await response.text();

      const sigMatch = html.match(/data-n-a-sg="([^"]+)"/);
      const tsMatch = html.match(/data-n-a-ts="([^"]+)"/);

      if (sigMatch && tsMatch) {
        return { signature: sigMatch[1], timestamp: tsMatch[1] };
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchDecodedUrl(base64Str: string, signature: string, timestamp: string): Promise<string | null> {
  try {
    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

    const payload = [
      "Fbv4je",
      JSON.stringify([
        "garturlreq",
        [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1],
        "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
        base64Str,
        parseInt(timestamp),
        signature,
      ]),
    ];

    const body = "f.req=" + encodeURIComponent(JSON.stringify([[payload]]));

    const response = await fetch(
      "https://news.google.com/_/DotsSplashUi/data/batchexecute",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": UA,
        },
        body,
      }
    );

    if (!response.ok) {
      console.error(`[News Sync] batchexecute HTTP ${response.status}`);
      return null;
    }

    const text = await response.text();
    const parts = text.split("\n\n");

    if (parts.length >= 2) {
      try {
        const parsed = JSON.parse(parts[1]);
        const innerData = parsed[0]?.[2];
        if (innerData) {
          const decoded = JSON.parse(innerData);
          const url = decoded[1];
          if (url && typeof url === "string" && url.startsWith("http")) {
            return url;
          }
        }
      } catch {
        // fallback regex
      }
    }

    const urlMatch = text.match(/https?:\/\/[^\s"\\]+burlingtonfreepress\.com[^\s"\\]*/);
    if (urlMatch) {
      return urlMatch[0].replace(/\\"/g, '');
    }

    return null;
  } catch (error) {
    console.error("[News Sync] batchexecute decode failed:", error);
    return null;
  }
}

async function resolveGoogleNewsUrl(googleUrl: string): Promise<string> {
  try {
    const url = new URL(googleUrl);
    const path = url.pathname.split("/");

    if (url.hostname !== "news.google.com") {
      return googleUrl;
    }

    const articlesIdx = path.indexOf("articles");
    if (articlesIdx === -1 || articlesIdx >= path.length - 1) {
      return googleUrl;
    }

    const base64 = path[articlesIdx + 1];

    const binaryStr = Buffer.from(base64, 'base64').toString('binary');
    const prefix = Buffer.from([0x08, 0x13, 0x22]).toString('binary');
    let str = binaryStr;
    if (str.startsWith(prefix)) {
      str = str.substring(prefix.length);
    }

    const suffix = Buffer.from([0xd2, 0x01, 0x00]).toString('binary');
    if (str.endsWith(suffix)) {
      str = str.substring(0, str.length - suffix.length);
    }

    const bytes = Uint8Array.from(str, (c) => c.charCodeAt(0));
    const len = bytes[0];
    if (len >= 0x80) {
      str = str.substring(2, len + 2);
    } else {
      str = str.substring(1, len + 1);
    }

    if (str.startsWith("AU_yqL")) {
      console.log(`[News Sync] New-style encoded URL, fetching decoding params...`);
      const params = await getDecodingParams(base64);
      if (params) {
        console.log(`[News Sync] Got signature & timestamp, decoding via batchexecute...`);
        const decoded = await fetchDecodedUrl(base64, params.signature, params.timestamp);
        if (decoded) {
          console.log(`[News Sync] Decoded URL: ${decoded}`);
          return decoded;
        }
      }
      console.log(`[News Sync] Could not decode, keeping Google News URL`);
      return googleUrl;
    }

    if (str.startsWith("http")) {
      console.log(`[News Sync] Decoded URL via base64: ${str}`);
      return str;
    }

    return googleUrl;
  } catch (error) {
    console.error("[News Sync] URL decode error:", error);
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
  
  // Mix Colchester and general articles, prioritizing recency while keeping some Colchester preference
  // Take at least 4 Colchester articles if available, then fill with newest from combined pool
  const recentColchester = sortedColchester.slice(0, 4);
  const remainingColchester = sortedColchester.slice(4);
  
  // Combine remaining articles and sort by date
  const combinedRemaining = [...remainingColchester, ...sortedOther].sort((a, b) => {
    const dateA = a.publishedAt?.getTime() || 0;
    const dateB = b.publishedAt?.getTime() || 0;
    return dateB - dateA;
  });
  
  // Final list: 4 newest Colchester + 6 newest from remaining pool
  const finalArticles = [...recentColchester, ...combinedRemaining].slice(0, 10);
  
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
      if (article.url.includes('news.google.com')) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
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
