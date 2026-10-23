import fs from 'fs';
import path from 'path';
import { Bookmark, FeedSource, Recommendation, ConciergeGreeting } from '../src/types/index.ts';

interface PortalData {
  bookmarks: Bookmark[];
  feeds: FeedSource[];
  recommendations: Recommendation[];
  greeting: ConciergeGreeting | null;
  dismissedArticleUrls: string[];
  lastRecommendationUpdate: string | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'portal_data.json');

// Default initial feeds (Curated high-quality tech & AI news)
const DEFAULT_FEEDS: FeedSource[] = [
  {
    id: 'qiita-popular',
    name: 'Qiita トレンド・人気',
    url: 'https://qiita.com/popular-items/feed',
    category: 'tech',
    enabled: true,
    description: 'エンジニアコミュニティQiitaの話題の記事'
  },
  {
    id: 'zenn-trend',
    name: 'Zenn 最新記事',
    url: 'https://zenn.dev/feed',
    category: 'tech',
    enabled: true,
    description: '知見共有プラットフォームZennの最新技術記事'
  },
  {
    id: 'hatena-it',
    name: 'はてなブックマーク テクノロジー',
    url: 'https://b.hatena.ne.jp/hotentry/it.rss',
    category: 'tech',
    enabled: true,
    description: 'ネットで今話題のIT・プログラミング・テクノロジー記事'
  },
  {
    id: 'gigazine',
    name: 'GIGAZINE 科学・IT',
    url: 'https://gigazine.net/news/rss_2.0/',
    category: 'general',
    enabled: true,
    description: '最新テクノロジー・ガジェット・カルチャーニュース'
  },
  {
    id: 'techcrunch',
    name: 'TechCrunch Japan/US',
    url: 'https://techcrunch.com/feed/',
    category: 'business',
    enabled: true,
    description: '世界のスタートアップとテクノロジービジネス速報'
  }
];

// Initial seeded bookmarks representing a modern engineer/builder's interests
const DEFAULT_BOOKMARKS: Bookmark[] = [
  {
    id: 'bm-1',
    url: 'https://github.com/google-gemini/gemini-api-quickstart',
    title: 'Gemini API & LLMエージェント構築の実践パターン',
    note: 'Function callingとマルチモーダル処理を活用した自律型エージェントのアーキテクチャ設計。コンシェルジュ機能やRAGに必須。',
    tags: ['AI', 'Gemini', 'LLM', 'Agent'],
    sourceName: 'GitHub',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
  },
  {
    id: 'bm-2',
    url: 'https://react.dev/blog/2024/12/05/react-19',
    title: 'React 19 & Server Components 実戦導入ガイド',
    note: 'Actionsフック（useActionState, useOptimistic）とコンパイラによる最適化について確認。パフォーマンス改善に寄与する。',
    tags: ['React', 'Frontend', 'TypeScript'],
    sourceName: 'React Official',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 4).toISOString(),
  },
  {
    id: 'bm-3',
    url: 'https://tailwindcss.com/blog/tailwindcss-v4-alpha',
    title: 'Tailwind CSS v4の新エンジンとパフォーマンス',
    note: '設定ファイル不要のCSS-firstアプローチと劇的なビルド高速化。新プロジェクトのスタイリングに採用。',
    tags: ['CSS', 'Tailwind', 'Frontend'],
    sourceName: 'Tailwind Blog',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 6).toISOString(),
  },
  {
    id: 'bm-4',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/',
    title: 'TypeScript 5.x 高度な型パズルと実務での活用',
    note: 'Satisfies演算子、Const Type Parameters、テンプレートリテラル型による堅牢なAPIスキーマ設計。',
    tags: ['TypeScript', 'Architecture', 'Tech'],
    sourceName: 'TypeScript Handbook',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 8).toISOString(),
  }
];

class StorageService {
  private data: PortalData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): PortalData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('Failed to read data file, initializing fresh data:', err);
    }

    const initialData: PortalData = {
      bookmarks: DEFAULT_BOOKMARKS,
      feeds: DEFAULT_FEEDS,
      recommendations: [],
      greeting: null,
      dismissedArticleUrls: [],
      lastRecommendationUpdate: null,
    };
    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: PortalData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write data file:', err);
    }
  }

  // Bookmarks
  getBookmarks(): Bookmark[] {
    return [...this.data.bookmarks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  addBookmark(item: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark {
    const newBookmark: Bookmark = {
      ...item,
      id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
    };
    this.data.bookmarks.unshift(newBookmark);
    this.saveData(this.data);
    return newBookmark;
  }

  updateBookmark(id: string, updates: Partial<Omit<Bookmark, 'id' | 'createdAt'>>): Bookmark | null {
    const index = this.data.bookmarks.findIndex((b) => b.id === id);
    if (index === -1) return null;
    const updated: Bookmark = {
      ...this.data.bookmarks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.bookmarks[index] = updated;
    this.saveData(this.data);
    return updated;
  }

  deleteBookmark(id: string): boolean {
    const initialLen = this.data.bookmarks.length;
    this.data.bookmarks = this.data.bookmarks.filter((b) => b.id !== id);
    if (this.data.bookmarks.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // Feeds
  getFeeds(): FeedSource[] {
    return this.data.feeds;
  }

  addFeed(feed: Omit<FeedSource, 'id'>): FeedSource {
    const newFeed: FeedSource = {
      ...feed,
      id: 'feed_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    };
    this.data.feeds.push(newFeed);
    this.saveData(this.data);
    return newFeed;
  }

  updateFeed(id: string, updates: Partial<Omit<FeedSource, 'id'>>): FeedSource | null {
    const index = this.data.feeds.findIndex((f) => f.id === id);
    if (index === -1) return null;
    this.data.feeds[index] = { ...this.data.feeds[index], ...updates };
    this.saveData(this.data);
    return this.data.feeds[index];
  }

  deleteFeed(id: string): boolean {
    const initialLen = this.data.feeds.length;
    this.data.feeds = this.data.feeds.filter((f) => f.id !== id);
    if (this.data.feeds.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // Recommendations & Greeting cache
  getRecommendations(): {
    recommendations: Recommendation[];
    greeting: ConciergeGreeting | null;
    lastUpdated: string | null;
  } {
    // Filter out dismissed articles
    const validRecommendations = this.data.recommendations.filter(
      (r) => !this.data.dismissedArticleUrls.includes(r.articleUrl) && !r.dismissed
    );

    return {
      recommendations: validRecommendations,
      greeting: this.data.greeting,
      lastUpdated: this.data.lastRecommendationUpdate,
    };
  }

  setRecommendations(recommendations: Recommendation[], greeting: ConciergeGreeting): void {
    this.data.recommendations = recommendations;
    this.data.greeting = greeting;
    this.data.lastRecommendationUpdate = new Date().toISOString();
    this.saveData(this.data);
  }

  dismissRecommendation(articleUrl: string): void {
    if (!this.data.dismissedArticleUrls.includes(articleUrl)) {
      this.data.dismissedArticleUrls.push(articleUrl);
    }
    this.data.recommendations = this.data.recommendations.map((r) =>
      r.articleUrl === articleUrl ? { ...r, dismissed: true } : r
    );
    this.saveData(this.data);
  }

  markRecommendationSaved(articleUrl: string): void {
    this.data.recommendations = this.data.recommendations.map((r) =>
      r.articleUrl === articleUrl ? { ...r, savedAsBookmark: true } : r
    );
    this.saveData(this.data);
  }
}

export const storage = new StorageService();
