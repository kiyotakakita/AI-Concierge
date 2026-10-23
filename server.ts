import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from './server/storage.ts';
import { fetchFeedItemsFromSources, testFeedUrl } from './server/rssService.ts';
import { generateConciergeRecommendations } from './server/geminiService.ts';
import { PortalSummaryResponse } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory cache for raw RSS items to avoid constant re-fetching across tabs
let cachedFeedItems: any[] = [];
let lastFeedFetchTime = 0;
const FEED_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getFreshOrCachedFeedItems(force = false) {
  const now = Date.now();
  if (!force && cachedFeedItems.length > 0 && now - lastFeedFetchTime < FEED_CACHE_TTL) {
    return cachedFeedItems;
  }
  const feeds = storage.getFeeds();
  const items = await fetchFeedItemsFromSources(feeds);
  cachedFeedItems = items;
  lastFeedFetchTime = now;
  return items;
}

// -------------------------------------------------------------
// Portal API Endpoints
// -------------------------------------------------------------

// GET /api/portal/summary - Concierge greeting, recommendations, and portal stats
app.get('/api/portal/summary', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.force === 'true';
    const cached = storage.getRecommendations();
    const bookmarks = storage.getBookmarks();
    const feeds = storage.getFeeds();

    // Check if recommendations exist and are recent (e.g. within 6 hours)
    const isRecent =
      cached.lastUpdated &&
      Date.now() - new Date(cached.lastUpdated).getTime() < 6 * 60 * 60 * 1000;

    if (!forceRefresh && cached.recommendations.length > 0 && cached.greeting && isRecent) {
      const summary: PortalSummaryResponse = {
        greeting: cached.greeting,
        recommendations: cached.recommendations,
        stats: {
          totalBookmarks: bookmarks.length,
          activeFeeds: feeds.filter((f) => f.enabled).length,
          totalArticlesFetched: cachedFeedItems.length,
          lastUpdated: cached.lastUpdated || new Date().toISOString(),
        },
        cached: true,
      };
      return res.json(summary);
    }

    // Otherwise generate fresh recommendations
    const feedItems = await getFreshOrCachedFeedItems(forceRefresh);
    const { greeting, recommendations } = await generateConciergeRecommendations(bookmarks, feedItems);

    storage.setRecommendations(recommendations, greeting);

    const summary: PortalSummaryResponse = {
      greeting,
      recommendations,
      stats: {
        totalBookmarks: bookmarks.length,
        activeFeeds: feeds.filter((f) => f.enabled).length,
        totalArticlesFetched: feedItems.length,
        lastUpdated: new Date().toISOString(),
      },
      cached: false,
    };

    return res.json(summary);
  } catch (err) {
    console.error('Error in /api/portal/summary:', err);
    res.status(500).json({ error: 'Failed to generate portal summary' });
  }
});

// POST /api/portal/refresh - Force regenerate recommendations
app.post('/api/portal/refresh-recommendations', async (req: Request, res: Response) => {
  try {
    const feedItems = await getFreshOrCachedFeedItems(true);
    const bookmarks = storage.getBookmarks();
    const { greeting, recommendations } = await generateConciergeRecommendations(bookmarks, feedItems);

    storage.setRecommendations(recommendations, greeting);

    res.json({
      success: true,
      greeting,
      recommendations,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in /api/portal/refresh-recommendations:', err);
    res.status(500).json({ error: 'Failed to refresh recommendations' });
  }
});

// -------------------------------------------------------------
// Bookmarks API Endpoints
// -------------------------------------------------------------

app.get('/api/bookmarks', (req: Request, res: Response) => {
  try {
    let list = storage.getBookmarks();
    const q = (req.query.q as string)?.toLowerCase()?.trim();
    const tag = (req.query.tag as string)?.toLowerCase()?.trim();

    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.note.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (tag) {
      list = list.filter((b) => b.tags.some((t) => t.toLowerCase() === tag));
    }

    res.json({ bookmarks: list, total: list.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

app.post('/api/bookmarks', (req: Request, res: Response) => {
  try {
    const { url, title, note, tags, sourceName } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Auto generate clean title if empty
    let computedTitle = title?.trim();
    if (!computedTitle) {
      try {
        const parsedUrl = new URL(url);
        computedTitle = `${parsedUrl.hostname}${parsedUrl.pathname.slice(0, 30)}`;
      } catch {
        computedTitle = url;
      }
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map((t: string) => t.trim()).filter(Boolean)
      : typeof tags === 'string'
      ? tags
          .split(/[,、\s]+/)
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];

    const newBookmark = storage.addBookmark({
      url,
      title: computedTitle,
      note: note?.trim() || '',
      tags: cleanTags.length > 0 ? cleanTags : ['General'],
      sourceName: sourceName || undefined,
    });

    res.status(201).json(newBookmark);
  } catch (err) {
    console.error('Failed to create bookmark:', err);
    res.status(500).json({ error: 'Failed to save bookmark' });
  }
});

app.post('/api/bookmarks/quick', (req: Request, res: Response) => {
  try {
    const { url, title, sourceName, note, tags } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const cleanTags = Array.isArray(tags) ? tags : ['News', sourceName || 'Web'];

    const bookmark = storage.addBookmark({
      url,
      title: title || url,
      note: note || `AIコンシェルジュから保存 (${new Date().toLocaleDateString('ja-JP')})`,
      tags: cleanTags,
      sourceName: sourceName || 'Web',
    });

    // Mark recommendation as saved
    storage.markRecommendationSaved(url);

    res.json({ success: true, bookmark });
  } catch (err) {
    res.status(500).json({ error: 'Failed to quick-save bookmark' });
  }
});

app.put('/api/bookmarks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { url, title, note, tags } = req.body;
    const updated = storage.updateBookmark(id, { url, title, note, tags });

    if (!updated) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

app.delete('/api/bookmarks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = storage.deleteBookmark(id);
    if (!success) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// -------------------------------------------------------------
// Feed Sources API Endpoints
// -------------------------------------------------------------

app.get('/api/feeds', (req: Request, res: Response) => {
  try {
    const feeds = storage.getFeeds();
    res.json(feeds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get feeds' });
  }
});

app.post('/api/feeds', async (req: Request, res: Response) => {
  try {
    const { name, url, category, description } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Feed URL is required' });
    }

    // Validate feed URL first
    const test = await testFeedUrl(url);
    if (!test.success) {
      return res.status(400).json({
        error: `無効なRSSフィードです: ${test.error}`,
      });
    }

    const feed = storage.addFeed({
      name: name?.trim() || test.title || 'Custom Feed',
      url: url.trim(),
      category: category || 'tech',
      enabled: true,
      description: description || `記事数: ${test.count}`,
    });

    // Invalidate cached feed items to pull new source
    cachedFeedItems = [];
    lastFeedFetchTime = 0;

    res.status(201).json(feed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add feed' });
  }
});

app.put('/api/feeds/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = storage.updateFeed(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    // Invalidate cached feed items on toggle
    cachedFeedItems = [];
    lastFeedFetchTime = 0;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update feed' });
  }
});

app.delete('/api/feeds/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = storage.deleteFeed(id);
    if (!success) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    cachedFeedItems = [];
    lastFeedFetchTime = 0;
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete feed' });
  }
});

// GET /api/feeds/raw-items - Browse all fresh collected items
app.get('/api/feeds/raw-items', async (req: Request, res: Response) => {
  try {
    const sourceId = req.query.sourceId as string;
    const items = await getFreshOrCachedFeedItems(req.query.force === 'true');

    const filtered = sourceId ? items.filter((item) => item.sourceId === sourceId) : items;
    res.json({ items: filtered, total: filtered.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch raw feed items' });
  }
});

// Dismiss recommendation
app.post('/api/recommendations/dismiss', (req: Request, res: Response) => {
  try {
    const { articleUrl } = req.body;
    if (!articleUrl) {
      return res.status(400).json({ error: 'articleUrl is required' });
    }
    storage.dismissRecommendation(articleUrl);
    res.json({ success: true, articleUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss recommendation' });
  }
});

// -------------------------------------------------------------
// Vite Dev Server / Static File Serving
// -------------------------------------------------------------

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AI Concierge Portal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
