import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

function cleanTitle(raw: string): string {
  let title = raw
    .replace(/\s*[—––]\s*купить.*$/i, "")
    .replace(/\s*—\s*Магнит\s*$/i, "")
    .replace(/\s*—\s*Лента\s*$/i, "")
    .replace(/\s*\|\s*Перекрёсток\s*$/i, "")
    .replace(/\s*\|\s*Ашан\s*$/i, "")
    .replace(/\s*\|\s*Пятёрочка\s*$/i, "")
    .trim();

  const pipeMatch = title.match(/^(.+?)\s*\|\s*.+$/);
  if (pipeMatch && pipeMatch[1].trim().length > 5) {
    title = pipeMatch[1].trim();
  }

  const dashMatch = title.match(/^(.+?)\s*[—––]\s*.+$/);
  if (dashMatch && dashMatch[1].trim().length > 5) {
    title = dashMatch[1].trim();
  }

  return title;
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

// ============================
// HTML extraction
// ============================

function extractTitle(html: string): string {
  let title = "";

  // 1. <h1> — best source for product name
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]*>/g, "").trim();
  }

  // 2. Schema.org JSON-LD Product
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

  // 3. og:title
  if (!title) {
    const ogTitleMatch = html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
    );
    if (ogTitleMatch) title = ogTitleMatch[1];
  }

  // 4. <title> with cleanup
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

  // 1. All <img> src attributes, filtered for product images
  const allImgSrcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)]
    .map(m => m[1])
    .filter(isProductImage);

  // 2. Prefer CDN / product images
  const cdnImages = allImgSrcs.filter(src =>
    /images-foodtech|catalog|product|img-dostavka|cdn.*product|cloudinary.*product|lenta\.com|static\.|media\./i.test(src)
  );

  // Pick a large one if possible
  const largeImage = cdnImages.find(src =>
    /\d{3,4}x\d{3,4}|rs:fit:\d{3,4}|w_\d{3,4}|width.*\d{3,4}|\d{3,4}_\d{3,4}/i.test(src)
  ) || cdnImages[0];

  if (largeImage) {
    imageUrl = largeImage;
  } else if (allImgSrcs.length > 0) {
    // Fallback: any large image
    const largeFallback = allImgSrcs.find(src =>
      /\d{3,4}x\d{3,4}|rs:fit:\d{3,4}|w_\d{3,4}|\/large\/|\/big\/|\/full\//i.test(src)
    );
    imageUrl = largeFallback || allImgSrcs[0];
  }

  // 3. Schema.org JSON-LD Product image
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

  // 4. og:image
  if (!imageUrl) {
    const ogImageMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    );
    if (ogImageMatch && isProductImage(ogImageMatch[1])) {
      imageUrl = ogImageMatch[1];
    }
  }

  return makeAbsoluteUrl(imageUrl, pageUrl);
}

// ============================
// Main handler: simple direct fetch
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

    console.log(`[scrape-product] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.log(`[scrape-product] HTTP ${response.status} for ${url}`);
      return NextResponse.json({
        title: "",
        imageUrl: "",
        method: "direct-fetch",
      });
    }

    const html = await response.text();

    const title = extractTitle(html);
    const imageUrl = extractImage(html, url);

    console.log(`[scrape-product] Result: title="${title}", image=${imageUrl ? "found" : "missing"}`);

    return NextResponse.json({
      title: title || "",
      imageUrl: imageUrl || "",
      method: "direct-fetch",
    });
  } catch (error) {
    console.error("[scrape-product] Error:", error);
    return NextResponse.json({
      title: "",
      imageUrl: "",
      method: "direct-fetch",
    });
  }
}
