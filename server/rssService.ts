import Parser from 'rss-parser';
import { FeedItem, FeedSource } from '../src/types/index.ts';

const parser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (AI-Concierge-Portal/1.0; RSS-Reader)',
    Accept: 'application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8',
  },
});

// Helper to strip HTML tags from snippets
function cleanSnippet(text?: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .slice(0, 300);
}

export async function fetchFeedItemsFromSources(sources: FeedSource[]): Promise<FeedItem[]> {
  const enabledSources = sources.filter((s) => s.enabled);
  if (enabledSources.length === 0) return [];

  const results = await Promise.allSettled(
    enabledSources.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        const items: FeedItem[] = (feed.items || []).slice(0, 15).map((item, idx) => {
          const title = item.title?.trim() || 'No Title';
          const link = item.link?.trim() || '';
          const snippet = cleanSnippet(item.contentSnippet || item.summary || item.content || '');
          const pubDate = item.pubDate || item.isoDate || new Date().toISOString();

          return {
            id: `item_${source.id}_${idx}_${encodeURIComponent(link.slice(-20))}`,
            title,
            link,
            contentSnippet: snippet,
            sourceName: source.name,
            sourceId: source.id,
            pubDate,
            isoDate: item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()),
            categories: (item.categories as string[]) || [],
          };
        });
        return items;
      } catch (err) {
        console.warn(`[RSS] Failed to fetch feed from ${source.name} (${source.url}):`, (err as Error).message);
        return [] as FeedItem[];
      }
    })
  );

  const allItems: FeedItem[] = [];
  const seenLinks = new Set<string>();

  for (const res of results) {
    if (res.status === 'fulfilled') {
      for (const item of res.value) {
        if (item.link && !seenLinks.has(item.link)) {
          seenLinks.add(item.link);
          allItems.push(item);
        }
      }
    }
  }

  // Sort newest first
  allItems.sort((a, b) => {
    const timeA = a.isoDate ? new Date(a.isoDate).getTime() : 0;
    const timeB = b.isoDate ? new Date(b.isoDate).getTime() : 0;
    return timeB - timeA;
  });

  return allItems;
}

export async function testFeedUrl(url: string): Promise<{ success: boolean; title?: string; count?: number; error?: string }> {
  try {
    const feed = await parser.parseURL(url);
    return {
      success: true,
      title: feed.title || 'Untitled Feed',
      count: feed.items?.length || 0,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || 'Failed to parse RSS feed',
    };
  }
}
