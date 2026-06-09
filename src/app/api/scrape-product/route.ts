import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// ============================
// Константы
// ============================

// URL Google Apps Script прокси (обходит Qrator)
const GAS_PROXY_URL = "https://script.google.com/macros/s/AKfycbwBWql-eCn5EaDV2Ew1iix3BOKPTkNSot4emaO9vi39scpoFSJ_2xL8zUBrgD58n1iuaA/exec";

// Заголовки для API Ленты
const LENTA_API_BASE = "https://api.lenta.com/v1";
const LENTA_HEADERS = {
  "X-Retail-Brand": "lo",
  "X-Platform": "web",
  "DeviceID": "ptracker-svc-00000000-0000-0000-0000-000000000001",
  "Accept": "application/json",
};

// Домены, защищённые Qrator (прямой запрос с сервера заблокирован)
const QRATOR_DOMAINS = [
  "lenta.com", "lentochka.lenta.com",
  "perekrestok.ru", "5ka.ru", "auchan.ru",
  "kuper.ru", "ozone.ru", "ozon.ru",
];

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

// Проверяем, защищён ли домен Qrator-ом
function isQratorProtected(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return QRATOR_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// ============================
// Google Apps Script прокси
// ============================

// Вызов URL через GAS прокси (без заголовков — для HTML-страниц)
async function fetchViaGasProxy(targetUrl: string): Promise<string | null> {
  try {
    const proxyUrl = `${GAS_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (err) {
    console.error("[gas-proxy] Ошибка:", err);
    return null;
  }
}

// Вызов API через GAS прокси с кастомными заголовками
async function fetchApiViaGasProxy(apiUrl: string, headers: Record<string, string>): Promise<string | null> {
  try {
    const proxyUrl = `${GAS_PROXY_URL}?url=${encodeURIComponent(apiUrl)}&headers=${encodeURIComponent(JSON.stringify(headers))}`;
    const response = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (err) {
    console.error("[gas-proxy-api] Ошибка:", err);
    return null;
  }
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

function extractBrand(html: string): string {
  // 1. Schema.org JSON-LD
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of jsonLdMatches) {
    try {
      const schema = JSON.parse(match[1]);
      const items = Array.isArray(schema) ? schema : [schema];
      for (const item of items) {
        if (item["@type"] === "Product" || item["@type"] === "IndividualProduct") {
          if (item.brand) {
            if (typeof item.brand === "string") return item.brand.trim();
            if (item.brand.name) return item.brand.name.trim();
          }
          if (item.manufacturer) {
            if (typeof item.manufacturer === "string") return item.manufacturer.trim();
            if (item.manufacturer.name) return item.manufacturer.name.trim();
          }
        }
      }
    } catch { /* ignore */ }
  }

  // 2. Meta tags
  const metaPatterns = [
    /<meta[^>]*property=["']og:brand["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']product:brand["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']brand["'][^>]*content=["']([^"']+)["']/i,
  ];
  for (const pattern of metaPatterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1].trim());
  }

  // 3. HTML elements
  const brandPatterns = [
    /class=["'][^"']*brand[^"']*"[^>]*>([\s\S]*?)<\/[^>]+>/i,
    /class=["'][^"']*vendor[^"']*"[^>]*>([\s\S]*?)<\/[^>]+>/i,
    /data-brand=["']([^"']+)["']/i,
  ];
  for (const pattern of brandPatterns) {
    const match = html.match(pattern);
    if (match) {
      const text = match[1].replace(/<[^>]*>/g, "").trim();
      if (text && text.length > 0 && text.length < 100) return decodeHtmlEntities(text);
    }
  }

  return "";
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
// Специфичные парсеры магазинов
// ============================

// Извлекаем ID товара Ленты из URL
// Примеры: /product/moloko-...-930g-2000320 или /item/2000320
function extractLentaProductId(url: string): number | null {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Паттерн: /product/slug-name-{id} или /item/{id}
    const idMatch = path.match(/-(\d{4,10})$/);
    if (idMatch) return parseInt(idMatch[1], 10);

    // Паттерн: /item/{id}
    const itemMatch = path.match(/\/item\/(\d{4,10})/);
    if (itemMatch) return parseInt(itemMatch[1], 10);

    return null;
  } catch {
    return null;
  }
}

// Извлекаем название товара Ленты из URL slug
// /product/moloko-pasterizovannoe-prostokvashino-3-2-930g-2000320
// → "Молоко пастеризованное Простоквашино 3.2% 930г"
function extractLentaTitleFromSlug(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Берём последний сегмент пути (slug товара)
    const slug = path.split("/").filter(p => p && p !== "product" && p !== "item").pop() || "";
    if (!slug) return "";

    // Разбиваем slug на части, убираем ID в конце
    const parts = slug.replace(/-\d{4,10}$/, "").split("-");

    // Транслитерация каждой части
    const russianParts = parts.map(part => {
      const lower = part.toLowerCase();
      return SLUG_TO_RUSSIAN[lower] || part;
    });

    let title = russianParts.join(" ");

    // Форматируем проценты и вес
    title = title.replace(/(\d)[,.](\d)/g, "$1.$2"); // 3,2 → 3.2
    title = title.replace(/(\d+\.?\d*)\s*%/g, "$1%"); // 3.2 % → 3.2%

    return title.trim();
  } catch {
    return "";
  }
}

// Получаем данные товара Ленты через API
async function fetchLentaProduct(productId: number): Promise<{ title: string; imageUrl: string; brand: string } | null> {
  const apiUrl = `${LENTA_API_BASE}/catalog/items/${productId}`;
  console.log(`[lenta-api] Запрос: ${apiUrl}`);

  const jsonStr = await fetchApiViaGasProxy(apiUrl, LENTA_HEADERS);
  if (!jsonStr) {
    console.log(`[lenta-api] Не удалось получить ответ от API`);
    return null;
  }

  try {
    const data = JSON.parse(jsonStr);

    // Проверяем на ошибку API
    if (data.code && data.code !== "OK" && data.code !== 200) {
      console.log(`[lenta-api] API вернул ошибку: ${data.code} - ${data.message}`);
      return null;
    }

    const product = data.product || data;
    const title = product.Name || product.name || product.title || "";
    
    // Картинка товара из API
    let imageUrl = "";
    if (product.MainImage?.Url) {
      imageUrl = product.MainImage.Url;
    } else if (product.Images && Array.isArray(product.Images) && product.Images.length > 0) {
      const mainImg = product.Images.find((img: any) => img.IsMain) || product.Images[0];
      imageUrl = mainImg.Url || mainImg.url || mainImg.src || "";
    } else if (product.ImageUrl) {
      imageUrl = product.ImageUrl;
    } else if (product.image) {
      imageUrl = typeof product.image === "string" ? product.image : product.image.url || "";
    }

    // Делаем URL картинки абсолютным
    if (imageUrl && !imageUrl.startsWith("http")) {
      imageUrl = `https://cdn.lentochka.lenta.com${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    }

    // Бренд из API
    const brand = product.Brand || product.brand || product.Vendor || product.vendor || "";

    console.log(`[lenta-api] Название: "${title}", Картинка: ${imageUrl ? "найдена" : "нет"}, Бренд: "${brand || "нет"}"`);
    return { title, imageUrl, brand };
  } catch (err) {
    console.error(`[lenta-api] Ошибка парсинга JSON:`, err);
    // Сохраняем первые 500 символов для отладки
    console.log(`[lenta-api] Ответ API (первые 500 символов): ${jsonStr.substring(0, 500)}`);
    return null;
  }
}

// ============================
// Фолбэк: поиск через DuckDuckGo
// ============================

function urlToSearchQuery(pageUrl: string): string {
  try {
    const urlObj = new URL(pageUrl);
    const slug = urlObj.pathname
      .split("/")
      .filter(p => p && p !== "cat" && p !== "d" && p !== "product" && p !== "catalog" && p !== "p" && p !== "item")
      .pop() || "";

    let query = slug.replace(/[-_]/g, " ").replace(/\d{6,}/g, "").replace(/\s+/g, " ").trim();

    const store = urlObj.hostname.replace("www.", "").replace(".ru", "").replace(".com", "");
    if (query) {
      query = `${query} ${store}`;
    }

    return query;
  } catch {
    return "";
  }
}

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

    const linkMatches = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi)];
    for (const match of linkMatches) {
      let linkUrl = match[1];
      const linkTitle = match[2].replace(/<[^>]+>/g, "").trim();

      const uddgMatch = linkUrl.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        linkUrl = decodeURIComponent(uddgMatch[1]);
      } else if (linkUrl.startsWith("//duckduckgo.com/l/")) {
        continue;
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
    let brand = "";
    let method = "direct-fetch";

    // ==========================================
    // Шаг 1: Прямой запрос (работает для Магнита и других SSR-сайтов)
    // ==========================================
    if (!isQratorProtected(url)) {
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

          if (!isBlockedHtml(html)) {
            title = extractTitle(html);
            imageUrl = extractImage(html, url);
            brand = extractBrand(html);
            console.log(`[direct-fetch] название="${title}", картинка=${imageUrl ? "найдена" : "нет"}, бренд="${brand || "нет"}"`);
          } else {
            console.log(`[direct-fetch] Антибот-защита обнаружена`);
          }
        } else {
          console.log(`[direct-fetch] HTTP ${response.status}`);
        }
      } catch (err) {
        console.log(`[direct-fetch] Ошибка: ${err}`);
      }
    } else {
      console.log(`[scrape-product] Домен защищён Qrator, пропускаем прямой запрос`);
    }

    // ==========================================
    // Шаг 2: Специфичный парсер для Ленты (через API + GAS прокси)
    // ==========================================
    if ((!title || !imageUrl) && url.includes("lenta.com")) {
      method = "lenta-api";
      console.log(`[lenta-api] Пробуем получить данные через API Ленты...`);

      // Сначала пробуем название из URL slug (надёжный источник для Ленты)
      if (!title) {
        title = extractLentaTitleFromSlug(url);
        if (title) console.log(`[lenta-slug] Название из URL: "${title}"`);
      }

      // Пробуем API через GAS прокси с SSR-токеном
      const productId = extractLentaProductId(url);
      if (productId) {
        const lentaData = await fetchLentaProduct(productId);
        if (lentaData) {
          // API название предпочтительнее, если получено
          if (lentaData.title) title = lentaData.title;
          if (!imageUrl) imageUrl = lentaData.imageUrl;
          if (lentaData.brand) brand = lentaData.brand;
        }
      } else {
        console.log(`[lenta-api] Не удалось извлечь ID товара из URL`);
      }

      // Если API не отдал картинку или бренд, пробуем через прокси получить HTML страницы
      if (!imageUrl || !brand) {
        console.log(`[lenta-api] Пробуем получить данные через HTML-прокси...`);
        const html = await fetchViaGasProxy(url);
        if (html && !isBlockedHtml(html)) {
          if (!imageUrl) imageUrl = extractImage(html, url);
          if (!title) title = extractTitle(html);
          if (!brand) brand = extractBrand(html);
          console.log(`[lenta-proxy] картинка=${imageUrl ? "найдена" : "нет"}, бренд="${brand || "нет"}"`);
        }
      }
    }

    // ==========================================
    // Шаг 3: GAS прокси для других Qrator-защищённых сайтов
    // ==========================================
    if ((!title || !imageUrl) && isQratorProtected(url) && !url.includes("lenta.com")) {
      method = "gas-proxy";
      console.log(`[gas-proxy] Пробуем получить страницу через прокси...`);

      const html = await fetchViaGasProxy(url);
      if (html) {
        if (!isBlockedHtml(html)) {
          if (!title) title = extractTitle(html);
          if (!imageUrl) imageUrl = extractImage(html, url);
          if (!brand) brand = extractBrand(html);
          console.log(`[gas-proxy] название="${title}", картинка=${imageUrl ? "найдена" : "нет"}, бренд="${brand || "нет"}"`);
        } else {
          console.log(`[gas-proxy] Прокси тоже заблокирован`);
        }
      }
    }

    // ==========================================
    // Шаг 4: Фолбэк через DuckDuckGo (последняя надежда)
    // ==========================================
    if (!title || !imageUrl) {
      method = "ddg-search";
      console.log(`[ddg-search] Ищем через DuckDuckGo...`);

      let searchQuery = urlToSearchQuery(url);
      searchQuery = transliterateToRussian(searchQuery);

      if (searchQuery.length < 3) {
        console.log(`[ddg-search] Слишком короткий запрос: "${searchQuery}"`);
      } else {
        console.log(`[ddg-search] Запрос: "${searchQuery}"`);
        const results = await searchDuckDuckGo(searchQuery);

        if (!title && results.length > 0) {
          const productResult = results.find(r =>
            !/каталог|доставк|купить с|цена|отзывы|рецепт/i.test(r.title)
          ) || results[0];
          title = cleanTitle(productResult.title);
          console.log(`[ddg-search] Название: "${title}"`);

          // Пробуем извлечь бренд из сниппета DuckDuckGo
          if (!brand) {
            const snippet = (productResult as any).snippet || "";
            const brandFromSnippet = snippet.match(/(?:бренд|марка|производитель|brand)\s*[:=–—]?\s*([A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\s]{1,30})/i);
            if (brandFromSnippet) {
              brand = brandFromSnippet[1].trim();
            }
          }
        }

        if (!imageUrl && results.length > 0) {
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
                  if (!brand) brand = extractBrand(imgHtml);
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

    console.log(`[scrape-product] Итог: метод=${method}, название="${title}", картинка=${imageUrl ? "найдена" : "нет"}, бренд="${brand || "нет"}"`);

    return NextResponse.json({
      title: title || "",
      imageUrl: imageUrl || "",
      brand: brand || "",
      method,
    });
  } catch (error) {
    console.error("[scrape-product] Ошибка:", error);
    return NextResponse.json({
      title: "",
      imageUrl: "",
      brand: "",
      method: "direct-fetch",
    });
  }
}
