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
    "duckduckgo", "ddg",
  ];
  if (skipPatterns.some(p => lower.includes(p))) return false;
  return true;
}

// Проверяем, заблокирован ли сайт (Qrator, ServicePipe и т.д.)
function isBlockedHtml(html: string): boolean {
  return /qauth\.js|qrator|challenge-platform|servicepipe|__qrator/i.test(html);
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

  // 2. Картинки с CDN / товаров
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
// Фолбэк: поиск через DuckDuckGo
// ============================

// Извлекаем поисковый запрос из URL товара
function urlToSearchQuery(pageUrl: string): string {
  try {
    const urlObj = new URL(pageUrl);
    // Берём последний сегмент пути (slug товара)
    const slug = urlObj.pathname
      .split("/")
      .filter(p => p && p !== "cat" && p !== "d" && p !== "product" && p !== "catalog" && p !== "p")
      .pop() || "";

    // Заменяем дефисы и подчёркивания на пробелы
    let query = slug.replace(/[-_]/g, " ").replace(/\d{6,}/g, "").replace(/\s+/g, " ").trim();

    // Добавляем название магазина для контекста
    const store = urlObj.hostname.replace("www.", "").replace(".ru", "").replace(".com", "");
    if (query) {
      query = `${query} ${store}`;
    }

    return query;
  } catch {
    return "";
  }
}

// Транслитерация для поиска на русском
function transliterateToRussian(text: string): string {
  const map: Record<string, string> = {
    "moloko": "молоко", "mayonez": "майонез", "ketchyp": "кетчуп",
    "sous": "соус", "hleb": "хлеб", "syir": "сыр", "tvorog": "творог",
    "smetana": "сметана", "kefir": "кефир", "maslo": "масло",
    "yaytso": "яйцо", "kuritsa": "курица", "myaso": "мясо",
    "ryiba": "рыба", "borshch": "борщ", "sup": "суп",
    "sukhaya": "сухая", "myagkaya": "мягкая", "upakovka": "упаковка",
    "sashet": "сашет", "pao": "ПАО", "russkiy": "русский",
    "produkt": "продукт", "supersup": "суперсуп",
  };
  let result = text.toLowerCase();
  for (const [eng, rus] of Object.entries(map)) {
    result = result.replace(new RegExp(eng, "gi"), rus);
  }
  return result;
}

interface DDGResult {
  title: string;
  url: string;
}

// Поиск через DuckDuckGo HTML — возвращает список результатов
async function searchDuckDuckGo(query: string): Promise<DDGResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results: DDGResult[] = [];

    // Парсим результаты DuckDuckGo
    const linkMatches = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi)];
    for (const match of linkMatches) {
      let linkUrl = match[1];
      const linkTitle = match[2].replace(/<[^>]+>/g, "").trim();

      // DuckDuckGo оборачивает ссылки через редирект
      const uddgMatch = linkUrl.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        linkUrl = decodeURIComponent(uddgMatch[1]);
      } else if (linkUrl.startsWith("//duckduckgo.com/l/")) {
        continue; // пропускаем внутренние ссылки DDG
      }

      if (linkTitle && linkUrl.startsWith("http")) {
        results.push({ title: linkTitle, url: linkUrl });
      }
    }

    return results;
  } catch (err) {
    console.error("[scrape-product] Ошибка DuckDuckGo:", err);
    return [];
  }
}

// ============================
// Основной обработчик
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

    let title = "";
    let imageUrl = "";
    let method = "direct-fetch";

    // ==========================================
    // Шаг 1: Прямой запрос (работает для Магнита)
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
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const html = await response.text();

        // Проверяем что страница не заблокирована антибот-защитой
        if (!isBlockedHtml(html)) {
          title = extractTitle(html);
          imageUrl = extractImage(html, url);
          console.log(`[direct-fetch] название="${title}", картинка=${imageUrl ? "найдена" : "нет"}`);
        } else {
          console.log(`[direct-fetch] Антибот-защита обнаружена, переключаемся на поиск`);
        }
      } else {
        console.log(`[direct-fetch] HTTP ${response.status}`);
      }
    } catch (err) {
      console.log(`[direct-fetch] Ошибка: ${err}`);
    }

    // ==========================================
    // Шаг 2: Фолбэк через DuckDuckGo (для заблокированных сайтов)
    // ==========================================
    if (!title || !imageUrl) {
      method = "ddg-search";
      console.log(`[ddg-search] Ищем через DuckDuckGo...`);

      // Формируем поисковый запрос из URL
      let searchQuery = urlToSearchQuery(url);
      searchQuery = transliterateToRussian(searchQuery);

      if (searchQuery.length < 3) {
        console.log(`[ddg-search] Слишком короткий запрос: "${searchQuery}"`);
      } else {
        console.log(`[ddg-search] Запрос: "${searchQuery}"`);
        const results = await searchDuckDuckGo(searchQuery);

        // Берём название из первого подходящего результата
        if (!title && results.length > 0) {
          // Ищем результат, который выглядит как товар (а не категория/статья)
          const productResult = results.find(r =>
            !/каталог|доставк|купить с|цена|отзывы|рецепт/i.test(r.title)
          ) || results[0];
          title = cleanTitle(productResult.title);
          console.log(`[ddg-search] Название: "${title}"`);
        }

        // Пробуем достать картинку с доступного сайта из результатов
        if (!imageUrl && results.length > 0) {
          // Приоритет: магнит (проверенный), потом другие
          const magnitResult = results.find(r => r.url.includes("magnit.ru"));
          const otherResult = results.find(r =>
            !r.url.includes("lenta.com") &&
            !r.url.includes("perekrestok.ru") &&
            !r.url.includes("5ka.ru") &&
            !r.url.includes("auchan.ru") &&
            !r.url.includes("kuper.ru")
          );

          const urlsToTry = [magnitResult?.url, otherResult?.url].filter(Boolean) as string[];

          for (const tryUrl of urlsToTry) {
            try {
              console.log(`[ddg-search] Пробуем получить картинку с: ${tryUrl}`);
              const imgResponse = await fetch(tryUrl, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                  "Accept-Language": "ru-RU,ru;q=0.9",
                },
                signal: AbortSignal.timeout(10000),
              });

              if (imgResponse.ok) {
                const imgHtml = await imgResponse.text();
                if (!isBlockedHtml(imgHtml)) {
                  imageUrl = extractImage(imgHtml, tryUrl);
                  if (imageUrl) {
                    console.log(`[ddg-search] Картинка найдена!`);
                    break;
                  }
                }
              }
            } catch {
              // Пропускаем ошибки
            }
          }
        }
      }
    }

    console.log(`[scrape-product] Итог: метод=${method}, название="${title}", картинка=${imageUrl ? "найдена" : "нет"}`);

    return NextResponse.json({
      title: title || "",
      imageUrl: imageUrl || "",
      method,
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
