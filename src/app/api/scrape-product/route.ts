import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

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

// Check if an image URL looks like a real product photo
function isProductImage(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  const skipPatterns = [
    "share", "social", "og-", "opengraph", "logo", "banner",
    "favicon", "icon", "placeholder", "default", "promo",
    "no-image", "not-found", "sprite", "pixel", "1x1",
  ];
  if (skipPatterns.some(p => lower.includes(p))) return false;
  return true;
}

// Extract title from HTML
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
      title = titleMatch[1].trim()
        .replace(/\s*[—–|]\s*.+$/, "")
        .replace(/\s*–\s*.+$/, "")
        .replace(/\s*купить\s.*$/i, "")
        .trim();
    }
  }

  return decodeHtmlEntities(title);
}

// Extract product image from HTML
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

    // ==========================================
    // Step 1: Fast HTML parsing (works for SSR sites like Magnit)
    // ==========================================
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
        title = extractTitle(html);
        imageUrl = extractImage(html, url);
      }
    } catch {
      // Fast fetch failed, will try page_reader
    }

    // ==========================================
    // Step 2: Fallback — use page_reader for SPA sites (Lenta, etc.)
    // ==========================================
    if (!title || !imageUrl) {
      try {
        const ZAI = (await import("z-ai-web-dev-sdk")).default;
        const zai = await ZAI.create();

        const result = await zai.functions.invoke("page_reader", {
          url: url,
        });

        if (result?.data?.html) {
          const renderedHtml = result.data.html;

          // Use title from page_reader if we don't have one
          if (!title) {
            // Try page_reader's title first
            if (result.data.title) {
              title = result.data.title
                .replace(/\s*[—–|]\s*.+$/, "")
                .replace(/\s*купить\s.*$/i, "")
                .trim();
            }
            // Then try h1 from rendered HTML
            if (!title) {
              title = extractTitle(renderedHtml);
            }
          }

          // Use image from rendered HTML if we don't have one
          if (!imageUrl) {
            imageUrl = extractImage(renderedHtml, url);
          }
        }
      } catch (sdkError) {
        console.error("page_reader fallback failed:", sdkError);
        // Continue with whatever we have
      }
    }

    return NextResponse.json({
      title: title || "",
      imageUrl: imageUrl || "",
    });
  } catch (error) {
    console.error("Scrape product error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
