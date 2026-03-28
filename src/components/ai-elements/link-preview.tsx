"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

interface OGData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

// Cache OG data in memory to avoid re-fetching
const ogCache = new Map<string, OGData | null>();

function useOGData(url: string) {
  const [data, setData] = useState<OGData | null>(ogCache.get(url) ?? null);
  const [loading, setLoading] = useState(!ogCache.has(url));

  useEffect(() => {
    if (ogCache.has(url)) {
      setData(ogCache.get(url) ?? null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d: OGData | null) => {
        ogCache.set(url, d);
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        ogCache.set(url, null);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading };
}

function OGCard({ url }: { url: string }) {
  const { data, loading } = useOGData(url);

  if (loading) {
    return (
      <div className="rounded-lg border border-border/40 bg-muted/10 p-3 animate-pulse">
        <div className="h-3 w-2/3 rounded bg-muted/40" />
        <div className="h-2 w-full rounded bg-muted/30 mt-2" />
      </div>
    );
  }

  if (!data || (!data.title && !data.description)) return null;

  const hostname = new URL(url).hostname.replace("www.", "");

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex rounded-lg border border-border/40 bg-muted/10 overflow-hidden hover:bg-muted/20 transition-colors"
    >
      {data.image && (
        <div className="w-24 shrink-0 bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex-1 min-w-0 px-3 py-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          {data.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.favicon}
              alt=""
              className="h-3.5 w-3.5 rounded-sm"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <span className="text-[10px] text-muted-foreground/60 truncate">
            {data.siteName ?? hostname}
          </span>
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
        </div>
        {data.title && (
          <p className="text-xs font-medium text-foreground truncate">
            {data.title}
          </p>
        )}
        {data.description && (
          <p className="text-[11px] text-muted-foreground/70 line-clamp-2 mt-0.5 leading-snug">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}

// Extract URLs from text
const URL_REGEX =
  /https?:\/\/[^\s<>"')\]]+/g;

interface LinkPreviewsProps {
  content: string;
}

export function LinkPreviews({ content }: LinkPreviewsProps) {
  const urls = Array.from(new Set(content.match(URL_REGEX) ?? []));

  if (urls.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      {urls.map((url) => (
        <OGCard key={url} url={url} />
      ))}
    </div>
  );
}
