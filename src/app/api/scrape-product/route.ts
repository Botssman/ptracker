import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

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

    // Extract title
    let title = "";

    // Try og:title first (most reliable for product pages)
    const ogTitleMatch = html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
    );
    if (ogTitleMatch) {
      title = ogTitleMatch[1];
    }

    // Fallback to <title> tag
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
        // Clean up common suffixes like " — Магнит" or " | Пятёрочка"
        title = title.replace(/\s*[—–|]\s*.+$/, "").trim();
      }
    }

    // Try schema.org JSON-LD for product name
    if (!title) {
      const jsonLdMatch = html.match(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
      );
      if (jsonLdMatch) {
        try {
          const schema = JSON.parse(jsonLdMatch[1]);
          if (schema.name) title = schema.name;
        } catch {
          // Ignore JSON parse errors
        }
      }
    }

    // Decode HTML entities
    title = title
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();

    // Extract image
    let imageUrl = "";

    // Try og:image first
    const ogImageMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    );
    if (ogImageMatch) {
      imageUrl = ogImageMatch[1];
    }

    // Try twitter:image
    if (!imageUrl) {
      const twitterImageMatch = html.match(
        /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i
      );
      if (twitterImageMatch) {
        imageUrl = twitterImageMatch[1];
      }
    }

    // Try schema.org JSON-LD for product image
    if (!imageUrl) {
      const jsonLdMatch = html.match(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
      );
      if (jsonLdMatch) {
        try {
          const schema = JSON.parse(jsonLdMatch[1]);
          if (schema.image) {
            imageUrl =
              typeof schema.image === "string"
                ? schema.image
                : Array.isArray(schema.image)
                  ? schema.image[0]
                  : schema.image.url || "";
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }

    // Make relative URLs absolute
    if (imageUrl && !imageUrl.startsWith("http")) {
      try {
        const base = new URL(url);
        imageUrl = new URL(imageUrl, base.origin).href;
      } catch {
        imageUrl = "";
      }
    }

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
