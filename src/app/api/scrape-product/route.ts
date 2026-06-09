import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

// ============================
// Utility functions
// ============================

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function makeAbsoluteUrl(imageUrl: string, pageUrl: string): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  try {
    const base = new URL(pageUrl);
    return new URL(imageUrl, base.origin).href;
  } catch {
    return "";
  }
}

function isProductImage(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  const skipPatterns = [
    "share", "social", "og-", "opengraph", "logo", "banner",
    "favicon", "icon", "placeholder", "default", "promo",
    "no-image", "not-found", "sprite", "pixel", "1x1",
    "mc.yandex", "analytics", "counter", "beacon",
  ];
  if (skipPatterns.some(p => lower.includes(p))) return false;
  return true;
}

function cleanTitle(raw: string): string {
  let title = raw
    // Remove store-specific suffixes with separator
    .replace(/\s*[—––]\s*купить.*$/i, "")
    .replace(/\s*—\s*Магнит\s*$/i, "")
    .replace(/\s*—\s*Лента\s*$/i, "")
    .replace(/\s*\|\s*Перекрёсток\s*$/i, "")
    .replace(/\s*\|\s*Ашан\s*$/i, "")
    .replace(/\s*\|\s*Пятёрочка\s*$/i, "")
    .replace(/\s*—\s*купить.*$/i, "")
    .trim();

  // Don't strip after | if it cuts the title too short (e.g. "Молоко |" → "Молоко")
  // Only strip | suffix if there's enough text before it
  const pipeMatch = title.match(/^(.+?)\s*\|\s*.+$/);
  if (pipeMatch && pipeMatch[1].trim().length > 5) {
    title = pipeMatch[1].trim();
  }

  // Don't strip after — if it cuts too short
  const dashMatch = title.match(/^(.+?)\s*[—––]\s*.+$/);
  if (dashMatch && dashMatch[1].trim().length > 5) {
    title = dashMatch[1].trim();
  }

  return title;
}

// ============================
// HTML-based extraction
// ============================

function extractTitle(html: string): string {
  let title = "";

  // 1. <h1> — cleanest product name
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]*>/g, "").trim();
  }

  // 2. Product-specific selectors
  if (!title) {
    const altMatch = html.match(
      /class="[^"]*product-details-gallery__slide-image[^"]*"[^>]*alt="([^"]+)"/i
    );
    if (altMatch) title = altMatch[1].trim();
  }

  if (!title) {
    const productImgAlt = html.match(
      /class="[^"]*(?:product|gallery|item-detail)[^"]*"[^>]*>[\s\S]*?<img[^>]+alt="([^"]+)"/i
    );
    if (productImgAlt) title = productImgAlt[1].trim();
  }

  // 3. Schema.org JSON-LD
  if (!title) {
    const jsonLdMatches = html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    for (const match of jsonLdMatches) {
      try {
        const schema = JSON.parse(match[1]);
        const items = Array.isArray(schema) ? schema : [schema];
        for (const item of items) {
          if (item.name && (item["@type"] === "Product" || item["@type"] === "IndividualProduct")) {
            title = item.name;
            break;
          }
        }
        if (title) break;
      } catch { /* ignore */ }
    }
  }

  // 4. og:title
  if (!title) {
    const ogTitleMatch = html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
    );
    if (ogTitleMatch) title = ogTitleMatch[1];
  }

  // 5. <title> with cleanup
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = cleanTitle(titleMatch[1].trim());
    }
  }

  return decodeHtmlEntities(title);
}

function extractImage(html: string, pageUrl: string): string {
  let imageUrl = "";

  // 1. Product gallery images
  const galleryPatterns = [
    /class="[^"]*product-details-gallery__slide-image[^"]*"[^>]*src="([^"]+)"/i,
    /class="[^"]*(?:product.*?image|gallery.*?slide|item.*?photo)[^"]*"[^>]*src="([^"]+)"/i,
    /class="[^"]*(?:product-details|item-detail|product-card)[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"/i,
  ];

  for (const pattern of galleryPatterns) {
    const match = html.match(pattern);
    if (match && isProductImage(match[1])) {
      imageUrl = match[1];
      break;
    }
  }

  // 2. Large product images from CDNs
  if (!imageUrl) {
    const allImgSrcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)]
      .map(m => m[1])
      .filter(isProductImage);

    const cdnImages = allImgSrcs.filter(src =>
      /images-foodtech|catalog|product|img-dostavka|cdn.*product|cloudinary.*product|lenta\.com|static\.|media\./i.test(src)
    );

    const largeImage = cdnImages.find(src =>
      /\d{3,4}x\d{3,4}|rs:fit:\d{3,4}|w_\d{3,4}|width.*\d{3,4}|\d{3,4}_\d{3,4}/i.test(src)
    ) || cdnImages[0];

    if (largeImage) {
      imageUrl = largeImage;
    } else if (allImgSrcs.length > 0) {
      imageUrl = allImgSrcs.find(src =>
        /\d{3,4}x\d{3,4}|rs:fit:\d{3,4}|w_\d{3,4}|\/large\/|\/big\/|\/full\//i.test(src)
      ) || allImgSrcs[0];
    }
  }

  // 3. Schema.org JSON-LD
  if (!imageUrl) {
    const jsonLdMatches = html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    for (const match of jsonLdMatches) {
      try {
        const schema = JSON.parse(match[1]);
        const items = Array.isArray(schema) ? schema : [schema];
        for (const item of items) {
          if (item.image && (item["@type"] === "Product" || item["@type"] === "IndividualProduct")) {
            imageUrl = typeof item.image === "string" ? item.image
              : Array.isArray(item.image) ? item.image[0]
              : item.image.url || "";
            if (imageUrl) break;
          }
        }
        if (imageUrl) break;
      } catch { /* ignore */ }
    }
  }

  // 4. og:image (skip generic share images)
  if (!imageUrl) {
    const ogImageMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    );
    if (ogImageMatch && isProductImage(ogImageMatch[1])) {
      imageUrl = ogImageMatch[1];
    }
  }

  // 5. twitter:image
  if (!imageUrl) {
    const twitterImageMatch = html.match(
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i
    );
    if (twitterImageMatch) imageUrl = twitterImageMatch[1];
  }

  return makeAbsoluteUrl(imageUrl, pageUrl);
}

// ============================
// Strategy 1: Direct fetch (fast, for SSR sites)
// ============================

async function strategyDirectFetch(url: string): Promise<{ title: string; imageUrl: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const html = await response.text();

      // Check if the page is a captcha/bot challenge (not a real product page)
      const isCaptcha = /captcha|challenge-platform|cf-browser-verification/i.test(html);
      const isBotBlock = /access.*forbidden|blocked|denied|403\s*error/i.test(html);
      const hasNoH1OrProduct = !/<h1[^>]*>/i.test(html) && !/application\/ld\+json.*Product/i.test(html);

      if (isCaptcha || isBotBlock) {
        console.log("[strategy1] Bot protection detected, skipping");
        return { title: "", imageUrl: "" };
      }

      const title = extractTitle(html);
      const imageUrl = extractImage(html, url);

      // If title is too generic (just the store name), it's probably not a product page
      if (title && hasNoH1OrProduct && (title.includes("Доставка") || title.includes("Купить"))) {
        console.log("[strategy1] Title looks generic (not a product page), skipping");
        return { title: "", imageUrl: "" };
      }

      return { title, imageUrl };
    }
  } catch {
    // Fetch failed, will try next strategy
  }
  return { title: "", imageUrl: "" };
}

// ============================
// Strategy 2: page_reader SDK (for SPA sites)
// ============================

async function strategyPageReader(url: string): Promise<{ title: string; imageUrl: string }> {
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const result = await zai.functions.invoke("page_reader", { url });

    if (result?.data?.html) {
      const renderedHtml = result.data.html;

      // Check for bot protection in rendered page
      if (/qauth\.js|qrator|challenge-platform|access.*forbidden/i.test(renderedHtml)) {
        console.log("[strategy2] Bot protection detected in page_reader HTML, skipping");
        return { title: "", imageUrl: "" };
      }

      let title = "";
      if (result.data.title) {
        title = cleanTitle(result.data.title);
      }
      if (!title) {
        title = extractTitle(renderedHtml);
      }

      const imageUrl = extractImage(renderedHtml, url);
      return { title, imageUrl };
    }
  } catch (sdkError) {
    console.error("[strategy2] page_reader failed:", (sdkError as Error).message);
  }
  return { title: "", imageUrl: "" };
}

// ============================
// Strategy 3: agent-browser (real browser, bypasses most protections)
// ============================

async function strategyAgentBrowser(url: string): Promise<{ title: string; imageUrl: string }> {
  try {
    // Navigate to the URL using agent-browser CLI (async to avoid blocking event loop)
    const { stdout: navOutput } = await execAsync("agent-browser", ["open", url], {
      timeout: 20000,
    });

    // Wait a moment for JS rendering
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get the accessibility snapshot which contains structured page content
    const { stdout: snapshot } = await execAsync("agent-browser", ["snapshot"], {
      timeout: 10000,
    });

    // Check for bot protection in the snapshot
    if (/403\s*error|forbidden|captcha|проблемы со связью|access.*forbidden/i.test(snapshot)) {
      console.log("[strategy3] Bot protection detected in agent-browser snapshot, skipping");
      return { title: "", imageUrl: "" };
    }

    // Extract h1 from the snapshot
    let title = "";

    // Pattern: heading "Title" [level=1]
    const h1Match = snapshot.match(/heading\s+"([^"]+)"\s*\[level=1/i);
    if (h1Match) {
      title = h1Match[1].trim();
      title = cleanTitle(title);
    }

    // If no h1, try the page title from navigation output
    if (!title && navOutput) {
      const pageTitleMatch = navOutput.match(/✓\s+(.+)/);
      if (pageTitleMatch) {
        title = cleanTitle(pageTitleMatch[1].trim());
        title = title.replace(/\s*[–—]\s*купить.*$/i, "")
          .replace(/\s*из магазина.*$/i, "")
          .replace(/\s*\|.*$/i, "")
          .trim();
      }
    }

    // Try getting the page title directly
    if (!title) {
      try {
        const { stdout: pageTitle } = await execAsync("agent-browser", ["get", "title"], {
          timeout: 5000,
        });
        if (pageTitle.trim()) {
          title = cleanTitle(pageTitle.trim());
        }
      } catch { /* ignore */ }
    }

    // Extract product image using agent-browser eval to get img elements
    let imageUrl = "";

    try {
      // Get all images with their src and alt attributes
      const { stdout: imgJson } = await execAsync("agent-browser", ["eval",
        "JSON.stringify(Array.from(document.querySelectorAll('img')).filter(i=>i.src&&!i.src.startsWith('data:')).slice(0,20).map(i=>({src:i.src,alt:i.alt})))"
      ], { timeout: 10000 });

      const cleanedJson = imgJson.trim().replace(/^"(.*)"$/s, '$1').replace(/\\"/g, '"');
      const images: Array<{ src: string; alt: string }> = JSON.parse(cleanedJson);

      // Filter product images: skip logos, banners, icons, QR codes, etc.
      const productImages = images.filter(img => {
        const alt = (img.alt || "").toLowerCase();
        const src = (img.src || "").toLowerCase();
        if (/logo|banner|icon|app|qr|store|share|download|install|favicon|promo|category/i.test(alt + src)) return false;
        if (/data:image/i.test(img.src)) return false;
        return true;
      });

      // Try to find an image whose alt matches the product title
      if (title && productImages.length > 0) {
        const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const matchingImage = productImages.find(img => {
          const altLower = (img.alt || "").toLowerCase();
          return titleWords.some(w => altLower.includes(w));
        });
        if (matchingImage) {
          imageUrl = matchingImage.src;
        }
      }

      // Fallback: first product image that's from a CDN
      if (!imageUrl && productImages.length > 0) {
        const cdnImage = productImages.find(img =>
          /images-foodtech|catalog|product|img-dostavka|cdn|cloudinary|static|media/i.test(img.src)
        );
        imageUrl = cdnImage?.src || productImages[0].src;
      }
    } catch (evalErr) {
      console.error("[strategy3] agent-browser eval for images failed:", (evalErr as Error).message);
    }

    // Fallback: try og:image via eval
    if (!imageUrl) {
      try {
        const { stdout: ogImage } = await execAsync("agent-browser", ["eval",
          "document.querySelector('meta[property=\"og:image\"]')?.content || ''"
        ], { timeout: 5000 });

        const ogImg = ogImage.trim().replace(/^"(.*)"$/s, '$1');
        if (ogImg && isProductImage(ogImg)) {
          imageUrl = makeAbsoluteUrl(ogImg, url);
        }
      } catch { /* ignore */ }
    }

    return { title, imageUrl };
  } catch (err) {
    console.error("[strategy3] agent-browser failed:", (err as Error).message);
    return { title: "", imageUrl: "" };
  }
}

// ============================
// Strategy 4: web_search (fallback for fully blocked sites)
// ============================

async function strategyWebSearch(url: string): Promise<{ title: string; imageUrl: string }> {
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    // Extract meaningful search terms from the URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname
      .split("/")
      .filter(p => p && p !== "cat" && p !== "d" && p !== "product" && p !== "catalog" && p !== "p")
      .pop() || "";

    // Convert URL slug to readable search query
    let searchQuery = pathParts
      .replace(/[-_]/g, " ")
      .replace(/\d{5,}/g, "")  // Remove long product IDs
      .replace(/\s+/g, " ")
      .trim();

    // If the slug looks like transliterated Russian, also search in Russian
    const translitMap: Record<string, string> = {
      "moloko": "молоко", "mayonez": "майонез", "ketchyp": "кетчуп",
      "sous": "соус", "hleb": "хлеб", "syir": "сыр", "tvorog": "творог",
      "smetana": "сметана", "kefir": "кефир", "maslo": "масло",
      "yaytso": "яйцо", "kuritsa": "курица", "myaso": "мясо",
      "ryiba": "рыба", "ovoshhi": "овощи", "fruktyi": "фрукты",
      "pasterizovannoe": "пастеризованное", "otbornoe": "отборное",
      "provansal": "провансаль", "pitatelnaya": "питательная",
      "bez-zmzh": "без змж", "pet": "ПЭТ",
    };

    let russianQuery = searchQuery.toLowerCase();
    for (const [eng, rus] of Object.entries(translitMap)) {
      russianQuery = russianQuery.replace(new RegExp(eng, "gi"), rus);
    }
    // If transliteration changed anything, prefer the Russian query
    if (russianQuery !== searchQuery.toLowerCase()) {
      searchQuery = russianQuery;
    }

    if (!searchQuery || searchQuery.length < 3) {
      console.log("[strategy4] Could not extract search query from URL");
      return { title: "", imageUrl: "" };
    }

    // Add the store name to the search
    const storePrefix = urlObj.hostname
      .replace("www.", "")
      .replace(".ru", "")
      .replace(".com", "");

    const fullQuery = `${searchQuery} ${storePrefix}`;

    console.log(`[strategy4] Searching for: "${fullQuery}"`);

    const results = await zai.functions.invoke("web_search", {
      query: fullQuery,
      num: 10,
    }) as Array<{ url: string; name: string; snippet: string; host_name: string }>;

    if (!results || results.length === 0) {
      return { title: "", imageUrl: "" };
    }

    // Find the best matching result
    const sameDomainProductResult = results.find(r =>
      r.url.includes(urlObj.hostname) &&
      !/каталог|доставк|купить с|цена/i.test(r.name)
    );
    const sameDomainResult = results.find(r =>
      r.url.includes(urlObj.hostname)
    );
    const catalogResult = results.find(r =>
      /catalog-ceny|edostavka|produkty|price|kachestvorb|magazinnoff/i.test(r.url) && !r.url.includes(urlObj.hostname)
    );
    const bestResult = sameDomainProductResult || catalogResult || sameDomainResult || results[0];

    let title = bestResult.name || "";
    title = cleanTitle(title);

    // For image, try fetching og:image from accessible third-party sites
    let imageUrl = "";

    const altSites = results.filter(r =>
      !r.url.includes(urlObj.hostname) &&
      !/lenta\.com|perekrestok\.ru/i.test(r.url)
    );

    for (const result of altSites) {
      try {
        const altFetch = await fetch(result.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (altFetch.ok) {
          const altHtml = await altFetch.text();
          const altImage = extractImage(altHtml, result.url);
          if (altImage) {
            imageUrl = altImage;
            break;
          }
        }
      } catch {
        // Skip failed fetches
      }
    }

    return { title, imageUrl };
  } catch (err) {
    console.error("[strategy4] web_search failed:", (err as Error).message);
    return { title: "", imageUrl: "" };
  }
}

// ============================
// Main handler: orchestrates all strategies
// ============================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Неверный URL" }, { status: 400 });
    }

    let title = "";
    let imageUrl = "";
    let method = "";

    console.log(`[scrape-product] Starting scrape for: ${url}`);

    // ==========================================
    // Strategy 1: Direct fetch (fastest, ~10s)
    // ==========================================
    const r1 = await strategyDirectFetch(url);
    if (r1.title) { title = r1.title; method = "direct-fetch"; }
    if (r1.imageUrl) { imageUrl = r1.imageUrl; }
    console.log(`[strategy1] title: "${title}", image: ${imageUrl ? "found" : "missing"}`);

    // ==========================================
    // Strategy 2: page_reader SDK (~15s)
    // ==========================================
    if (!title || !imageUrl) {
      const r2 = await strategyPageReader(url);
      if (!title && r2.title) { title = r2.title; method = "page-reader"; }
      if (!imageUrl && r2.imageUrl) { imageUrl = r2.imageUrl; }
      console.log(`[strategy2] title: "${title}", image: ${imageUrl ? "found" : "missing"}`);
    }

    // ==========================================
    // Strategy 3: agent-browser (~25s, real browser)
    // ==========================================
    if (!title || !imageUrl) {
      const r3 = await strategyAgentBrowser(url);
      if (!title && r3.title) { title = r3.title; method = "agent-browser"; }
      if (!imageUrl && r3.imageUrl) { imageUrl = r3.imageUrl; }
      console.log(`[strategy3] title: "${title}", image: ${imageUrl ? "found" : "missing"}`);
    }

    // ==========================================
    // Strategy 4: web_search (fallback, ~10s)
    // ==========================================
    if (!title || !imageUrl) {
      const r4 = await strategyWebSearch(url);
      if (!title && r4.title) { title = r4.title; method = "web-search"; }
      if (!imageUrl && r4.imageUrl) { imageUrl = r4.imageUrl; }
      console.log(`[strategy4] title: "${title}", image: ${imageUrl ? "found" : "missing"}`);
    }

    console.log(`[scrape-product] Final result: method=${method}, title="${title}", image=${imageUrl ? "found" : "missing"}`);

    return NextResponse.json({
      title: title || "",
      imageUrl: imageUrl || "",
      method: method || "",
    });
  } catch (error) {
    console.error("Scrape product error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
