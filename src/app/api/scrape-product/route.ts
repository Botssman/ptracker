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

// Check if an image URL looks like a real product photo (not a generic share/logo image)
function isProductImage(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();

  // Skip generic share/social images
  const skipPatterns = [
    "share", "social", "og-", "opengraph", "logo", "banner",
    "favicon", "icon", "placeholder", "default", "promo",
    "placeholder", "no-image", "not-found",
  ];
  if (skipPatterns.some(p => lower.includes(p))) return false;

  // Prefer images from CDNs and product image hosts
  const productPatterns = [
    "images-foodtech", "catalog", "product", "item",
    "goods", "media", "photo", "pic", "img-dostavka",
    "content-images", "cdn", "cloudinary", "imgix",
  ];

  return true; // Accept if not in skip list
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

    // Fetch the page HTML
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

    if (!response.ok) {
      return NextResponse.json(
        { error: `Не удалось загрузить страницу (код ${response.status})` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // ==========================================
    // Extract TITLE (prioritize H1 for clean product name)
    // ==========================================
    let title = "";

    // 1. Try <h1> first — the cleanest product name
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      title = h1Match[1].trim();
    }

    // 2. Try product-specific selectors in the HTML
    if (!title) {
      // Magnit-style: alt attribute on product gallery images
      const altMatch = html.match(
        /class="[^"]*product-details-gallery__slide-image[^"]*"[^>]*alt="([^"]+)"/i
      );
      if (altMatch) {
        title = altMatch[1].trim();
      }
    }

    if (!title) {
      // Generic: any img with alt inside a product/gallery container
      const productImgAlt = html.match(
        /class="[^"]*(?:product|gallery|item-detail)[^"]*"[^>]*>[\s\S]*?<img[^>]+alt="([^"]+)"/i
      );
      if (productImgAlt) {
        title = productImgAlt[1].trim();
      }
    }

    // 3. Try schema.org JSON-LD
    if (!title) {
      const jsonLdMatches = html.matchAll(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      );
      for (const match of jsonLdMatches) {
        try {
          const schema = JSON.parse(match[1]);
          // Could be a single object or array
          const items = Array.isArray(schema) ? schema : [schema];
          for (const item of items) {
            if (item.name && (item["@type"] === "Product" || item["@type"] === "IndividualProduct")) {
              title = item.name;
              break;
            }
          }
          if (title) break;
        } catch {
          // Ignore
        }
      }
    }

    // 4. Try og:title
    if (!title) {
      const ogTitleMatch = html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
      );
      if (ogTitleMatch) {
        title = ogTitleMatch[1];
      }
    }

    // 5. Fallback to <title> tag with cleanup
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
        // Remove common suffixes: " — Магнит", " | Пятёрочка", "купить с доставкой..."
        title = title
          .replace(/\s*[—–|]\s*.+$/, "")
          .replace(/\s*–\s*.+$/, "")
          .replace(/\s*купить\s.*$/i, "")
          .trim();
      }
    }

    title = decodeHtmlEntities(title);

    // ==========================================
    // Extract IMAGE (prioritize real product photo, not social share)
    // ==========================================
    let imageUrl = "";

    // 1. Try product gallery images (Magnit, Pyaterochka, etc.)
    const galleryPatterns = [
      // Magnit: class="product-details-gallery__slide-image"
      /class="[^"]*product-details-gallery__slide-image[^"]*"[^>]*src="([^"]+)"/i,
      // Generic product gallery with large images
      /class="[^"]*(?:product.*?image|gallery.*?slide|item.*?photo)[^"]*"[^>]*src="([^"]+)"/i,
      // img inside product-details or item-detail containers
      /class="[^"]*(?:product-details|item-detail|product-card)[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"/i,
    ];

    for (const pattern of galleryPatterns) {
      const match = html.match(pattern);
      if (match && isProductImage(match[1])) {
        imageUrl = match[1];
        break;
      }
    }

    // 2. Try to find large product images by src pattern (CDN images with product-like paths)
    if (!imageUrl) {
      const allImgSrcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)]
        .map(m => m[1])
        .filter(isProductImage);

      // Prefer images from product CDNs with large dimensions
      const cdnImages = allImgSrcs.filter(src =>
        /images-foodtech|catalog|product|img-dostavka|cdn.*product|cloudinary.*product/i.test(src)
      );

      // Prefer images with large dimensions in URL (rs:fit:1600, 1200x1200, etc.)
      const largeImage = cdnImages.find(src =>
        /\d{3,4}x\d{3,4}|rs:fit:\d{3,4}|w_\d{3,4}|width.*\d{3,4}/i.test(src)
      ) || cdnImages[0];

      if (largeImage) {
        imageUrl = largeImage;
      } else if (allImgSrcs.length > 0) {
        // Pick the largest-looking image URL
        imageUrl = allImgSrcs.find(src =>
          /\d{3,4}x\d{3,4}|rs:fit:\d{3,4}|w_\d{3,4}|\/large\/|\/big\/|\/full\//i.test(src)
        ) || allImgSrcs[0];
      }
    }

    // 3. Try schema.org JSON-LD for product image
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
              imageUrl =
                typeof item.image === "string"
                  ? item.image
                  : Array.isArray(item.image)
                    ? item.image[0]
                    : item.image.url || "";
              if (imageUrl) break;
            }
          }
          if (imageUrl) break;
        } catch {
          // Ignore
        }
      }
    }

    // 4. Fallback: og:image (but skip generic share images)
    if (!imageUrl) {
      const ogImageMatch = html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
      );
      if (ogImageMatch && isProductImage(ogImageMatch[1])) {
        imageUrl = ogImageMatch[1];
      }
    }

    // 5. Last resort: twitter:image
    if (!imageUrl) {
      const twitterImageMatch = html.match(
        /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i
      );
      if (twitterImageMatch) {
        imageUrl = twitterImageMatch[1];
      }
    }

    // Make relative URLs absolute
    imageUrl = makeAbsoluteUrl(imageUrl, url);

    return NextResponse.json({
      title: title || "",
      imageUrl: imageUrl || "",
    });
  } catch (error) {
    console.error("Scrape product error:", error);

    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Таймаут при загрузке страницы" },
        { status: 408 }
      );
    }

    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
