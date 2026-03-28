import { NextResponse } from "next/server";

interface OGData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

function extractMeta(html: string, property: string): string | undefined {
  // Match both property="..." and name="..." meta tags
  const patterns = [
    new RegExp(
      `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*?)["'][^>]*property=["']${property}["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*?)["'][^>]*name=["']${property}["']`,
      "i",
    ),
  ];

  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim();
}

function extractFavicon(html: string, baseUrl: string): string | undefined {
  const match = html.match(
    /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["']/i,
  );
  if (!match?.[1]) return `${new URL(baseUrl).origin}/favicon.ico`;
  const href = match[1];
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  return new URL(href, baseUrl).href;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MeetUpBot/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Fetch failed: ${res.status}` },
        { status: 502 },
      );
    }

    // Only read the first 50KB to avoid downloading huge pages
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let html = "";
    if (reader) {
      while (html.length < 50_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
      }
      reader.cancel();
    }

    const data: OGData = {
      url,
      title:
        extractMeta(html, "og:title") ??
        extractMeta(html, "twitter:title") ??
        extractTitle(html),
      description:
        extractMeta(html, "og:description") ??
        extractMeta(html, "twitter:description") ??
        extractMeta(html, "description"),
      image:
        extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image"),
      favicon: extractFavicon(html, url),
      siteName: extractMeta(html, "og:site_name"),
    };

    // Resolve relative image URLs
    if (data.image && !data.image.startsWith("http")) {
      data.image = new URL(data.image, url).href;
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch OG data" },
      { status: 502 },
    );
  }
}
