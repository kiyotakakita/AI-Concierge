export interface Bookmark {
  id: string;
  url: string;
  title: string;
  note: string;
  tags: string[];
  sourceName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: 'tech' | 'business' | 'ai' | 'general';
  enabled: boolean;
  description?: string;
}

export interface FeedItem {
  id: string;
  title: string;
  link: string;
  contentSnippet: string;
  sourceName: string;
  sourceId: string;
  pubDate: string;
  isoDate?: string;
  categories?: string[];
}

export interface Recommendation {
  id: string;
  articleTitle: string;
  articleUrl: string;
  sourceName: string;
  pubDate: string;
  category?: string;
  summary: string[]; // 3-line summary points
  reason: string; // Why this was recommended based on user bookmarks
  relatedBookmarkTags: string[];
  relevanceScore: number; // 0 - 100
  dismissed?: boolean;
  savedAsBookmark?: boolean;
}

export interface ConciergeGreeting {
  greeting: string;
  personalizedMessage: string;
  keyTopics: string[];
  generatedAt: string;
}

export interface PortalSummaryResponse {
  greeting: ConciergeGreeting;
  recommendations: Recommendation[];
  stats: {
    totalBookmarks: number;
    activeFeeds: number;
    totalArticlesFetched: number;
    lastUpdated: string;
  };
  cached: boolean;
}
