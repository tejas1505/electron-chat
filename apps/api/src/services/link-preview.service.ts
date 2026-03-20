import { redis } from '../config/redis';
import { logger } from '../config/logger';

interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

const CACHE_TTL = 60 * 60 * 24; // 24 hours

export class LinkPreviewService {
  async getPreview(url: string): Promise<LinkPreview | null> {
    const cacheKey = `link:${Buffer.from(url).toString('base64').slice(0, 64)}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ElectronChatBot/1.0 (link preview)',
          Accept: 'text/html',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return null;
      const html = await res.text();

      const extract = (pattern: RegExp): string | null =>
        html.match(pattern)?.[1]?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() ?? null;

      const preview: LinkPreview = {
        url,
        title:
          extract(/property="og:title"\s+content="([^"]+)"/) ??
          extract(/name="twitter:title"\s+content="([^"]+)"/) ??
          extract(/<title[^>]*>([^<]+)<\/title>/i),
        description:
          extract(/property="og:description"\s+content="([^"]+)"/) ??
          extract(/name="description"\s+content="([^"]+)"/),
        image:
          extract(/property="og:image"\s+content="([^"]+)"/) ??
          extract(/name="twitter:image"\s+content="([^"]+)"/),
        siteName:
          extract(/property="og:site_name"\s+content="([^"]+)"/) ??
          new URL(url).hostname.replace('www.', ''),
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
      };

      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(preview));
      return preview;
    } catch (err) {
      logger.debug('Link preview failed for', url);
      return null;
    }
  }

  extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;
    return [...new Set(text.match(urlRegex) ?? [])].slice(0, 3); // max 3 previews
  }
}

export const linkPreviewService = new LinkPreviewService();
