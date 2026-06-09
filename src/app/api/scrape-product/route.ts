import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// ============================
// Вспомогательные функции
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
    // Убираем типичные суффиксы магазинов
    .replace(/\s*[—––]\s*купить.*$/i, "")
    .replace(/\s*—\s*Магнит\s*$/i, "")
    .replace(/\s*—\s*Лента\s*$/i, "")
    .replace(/\s*\|\s*Перекрёсток\s*$/i, "")
    .replace(/\s*\|\s*Ашан\s*$/i, "")
    .replace(/\s*\|\s*Пятёрочка\s*$/i, "")
    .trim();

  // Убираем часть после | если до неё достаточно текста
  const pipeMatch = title.match(/^(.+?)\s*\|\s*.+$/);
  if (pipeMatch && pipeMatch[1].trim().length > 5) {
    title = pipeMatch[1].trim();
  }

  // Убираем часть после — если до неё достаточно текста
  const dashMatch = title.match(/^(.+?)\s*[—––]\s*.+$/);
  if (dashMatch && dashMatch[1].trim().length > 5) {
    title = dashMatch[1].trim();
  }

  return title;
}

// Проверяем что URL похож на картинку товара, а не лого/иконку
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
// Извлечение данных из HTML
// ============================

function extractTitle(html: string): string {
  let title = "";

  // 1. <h1> — лучший источник названия товара
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]*>/g, "").trim();
  }

  // 2. Schema.org JSON-LD — структурированные данные товара
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
      } catch { /* игнорируем ошибки парсинга */ }
    }
  }

  // 3. og:title — мета-тег Open Graph
  if (!title) {
    const ogTitleMatch = html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
    );
    if (ogTitleMatch) title = ogTitleMatch[1];
  }

  // 4. <title> с очисткой от мусора
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

  // 1. Галерея товара — лучший источник качественной картинки
  //    Магнит: class="product-details-gallery__slide-image" src="..."
  const galleryPatterns = [
    /class="[^"]*product-details-gallery__slide-image[^"]*"[^>]*src="([^"]+)"/i,
    /class="[^"]*(?:product.*?gallery|gallery.*?slide|item.*?photo)[^"]*"[^>]*src="([^"]+)"/i,
  ];
  for (const pattern of galleryPatterns) {
    const match = html.match(pattern);
    if (match && isProductImage(match[1])) {
      imageUrl = match[1];
      break;
    }
  }

  // 2. Картинки с CDN / товаров (если галерея не нашлась)
  if (!imageUrl) {
    const allImgSrcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)]
      .map(m => m[1])
      .filter(isProductImage);

    const cdnImages = allImgSrcs.filter(src =>
      /images-foodtech|catalog|product|img-dostavka|cdn.*product|cloudinary.*product|lenta\.com|static\.|media\./i.test(src)
    );

    // Выбираем большую картинку если есть
    const largeImage = cdnImages.find(src =>
      /\d{3,4}x\d{3,4}|rs:fit:\d{3,4}|w_\d{3,4}|width.*\d{3,4}|\d{3,4}_\d{3,4}/i.test(src)
    ) || cdnImages[0];

    if (largeImage) {
      imageUrl = largeImage;
    } else if (allImgSrcs.length > 0) {
      const largeFallback = allImgSrcs.find(src =>
        /\d{3,4}x\d{3,4}|rs:fit:\d{3,4}|w_\d{3,4}|\/large\/|\/big\/|\/full\//i.test(src)
      );
      imageUrl = largeFallback || allImgSrcs[0];
    }
  }

  // 3. Schema.org JSON-LD — картинка из структурированных данных
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
      } catch { /* игнорируем ошибки парсинга */ }
    }
  }

  // 4. og:image — самый последний вариант
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
// Основной обработчик: простой прямой запрос
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

    console.log(`[scrape-product] Запрос: ${url}`);

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
      console.log(`[scrape-product] HTTP ${response.status} для ${url}`);
      return NextResponse.json({
        title: "",
        imageUrl: "",
        method: "direct-fetch",
      });
    }

    const html = await response.text();

    const title = extractTitle(html);
    const imageUrl = extractImage(html, url);

    console.log(`[scrape-product] Результат: название="${title}", картинка=${imageUrl ? "найдена" : "нет"}`);

    return NextResponse.json({
      title: title || "",
      imageUrl: imageUrl || "",
      method: "direct-fetch",
    });
  } catch (error) {
    console.error("[scrape-product] Ошибка:", error);
    return NextResponse.json({
      title: "",
      imageUrl: "",
      method: "direct-fetch",
    });
  }
}
