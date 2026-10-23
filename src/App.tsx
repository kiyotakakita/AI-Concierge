/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { ConciergeHome } from './components/ConciergeHome.tsx';
import { BookmarkView } from './components/BookmarkView.tsx';
import { FeedsView } from './components/FeedsView.tsx';
import { RawStreamView } from './components/RawStreamView.tsx';
import { Toast, ToastMessage } from './components/Toast.tsx';
import {
  Bookmark,
  ConciergeGreeting,
  FeedItem,
  FeedSource,
  PortalSummaryResponse,
  Recommendation,
} from './types/index.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'concierge' | 'bookmarks' | 'feeds' | 'stream'>('concierge');

  // State
  const [greeting, setGreeting] = useState<ConciergeGreeting | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast helper
  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Data Fetch
  const loadPortalData = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      // 1. Fetch portal summary
      const summaryRes = await fetch('/api/portal/summary');
      if (summaryRes.ok) {
        const summaryData: PortalSummaryResponse = await summaryRes.json();
        setGreeting(summaryData.greeting);
        setRecommendations(summaryData.recommendations);
      }

      // 2. Fetch bookmarks
      const bmRes = await fetch('/api/bookmarks');
      if (bmRes.ok) {
        const bmData = await bmRes.json();
        setBookmarks(bmData.bookmarks || []);
      }

      // 3. Fetch feeds
      const feedsRes = await fetch('/api/feeds');
      if (feedsRes.ok) {
        const feedsData = await feedsRes.json();
        setFeeds(feedsData || []);
      }

      // 4. Fetch raw feed items
      const itemsRes = await fetch('/api/feeds/raw-items');
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setFeedItems(itemsData.items || []);
      }
    } catch (err) {
      console.error('Error loading initial portal data:', err);
      addToast('error', 'データの取得に失敗しました');
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  // Refresh AI recommendations
  const handleRefreshRecommendations = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/portal/refresh-recommendations', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGreeting(data.greeting);
        setRecommendations(data.recommendations);
        addToast('success', 'AIコンシェルジュが最新の関心とフィードを再分析しました');

        // Also refresh raw items
        const itemsRes = await fetch('/api/feeds/raw-items?force=true');
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          setFeedItems(itemsData.items || []);
        }
      } else {
        addToast('error', '再分析のリクエストに失敗しました');
      }
    } catch (err) {
      addToast('error', 'ネットワークエラーが発生しました');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Save Bookmark from Recommendation or Stream
  const handleSaveBookmark = async (article: {
    url: string;
    title: string;
    sourceName: string;
    tags: string[];
  }) => {
    try {
      const res = await fetch('/api/bookmarks/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article),
      });

      if (res.ok) {
        const data = await res.json();
        setBookmarks((prev) => [data.bookmark, ...prev]);

        // Update recommendation saved state
        setRecommendations((prev) =>
          prev.map((r) => (r.articleUrl === article.url ? { ...r, savedAsBookmark: true } : r))
        );

        addToast('success', `「${article.title.slice(0, 20)}...」をブックマークに保存しました`);
      }
    } catch (err) {
      addToast('error', 'ブックマークの保存に失敗しました');
    }
  };

  // Dismiss Recommendation
  const handleDismissRecommendation = async (articleUrl: string) => {
    try {
      await fetch('/api/recommendations/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleUrl }),
      });

      setRecommendations((prev) => prev.filter((r) => r.articleUrl !== articleUrl));
      addToast('info', '推薦記事を非表示にしました');
    } catch (err) {
      addToast('error', '操作に失敗しました');
    }
  };

  // Quick Add
  const handleQuickAdd = async (url: string, note: string, tags: string[]) => {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, note, tags }),
      });

      if (res.ok) {
        const newBm = await res.json();
        setBookmarks((prev) => [newBm, ...prev]);
        addToast('success', 'クイック保存しました。AIの次期レコメンドに反映されます');
      }
    } catch (err) {
      addToast('error', '保存に失敗しました');
    }
  };

  // Add Bookmark from Modal
  const handleAddBookmark = async (data: { url: string; title: string; note: string; tags: string[] }) => {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const newBm = await res.json();
      setBookmarks((prev) => [newBm, ...prev]);
      addToast('success', 'ブックマークを登録しました');
    } else {
      addToast('error', '登録に失敗しました');
    }
  };

  // Update Bookmark
  const handleUpdateBookmark = async (
    id: string,
    data: { title: string; note: string; tags: string[] }
  ) => {
    const res = await fetch(`/api/bookmarks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updated = await res.json();
      setBookmarks((prev) => prev.map((b) => (b.id === id ? updated : b)));
      addToast('success', 'ブックマークを更新しました');
    } else {
      addToast('error', '更新に失敗しました');
    }
  };

  // Delete Bookmark
  const handleDeleteBookmark = async (id: string) => {
    const res = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      addToast('info', 'ブックマークを削除しました');
    } else {
      addToast('error', '削除に失敗しました');
    }
  };

  // Toggle Feed
  const handleToggleFeed = async (id: string, enabled: boolean) => {
    const res = await fetch(`/api/feeds/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });

    if (res.ok) {
      setFeeds((prev) => prev.map((f) => (f.id === id ? { ...f, enabled } : f)));
      addToast('success', `フィードを${enabled ? '有効' : '無効'}にしました`);
    } else {
      addToast('error', '設定変更に失敗しました');
    }
  };

  // Add Feed
  const handleAddFeed = async (data: {
    name: string;
    url: string;
    category: FeedSource['category'];
    description?: string;
  }) => {
    const res = await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const newFeed = await res.json();
      setFeeds((prev) => [...prev, newFeed]);
      addToast('success', `フィード「${newFeed.name}」を追加しました`);
      // Reload raw items
      const itemsRes = await fetch('/api/feeds/raw-items?force=true');
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setFeedItems(itemsData.items || []);
      }
    } else {
      const err = await res.json();
      throw new Error(err.error || 'フィードの追加に失敗しました');
    }
  };

  // Delete Feed
  const handleDeleteFeed = async (id: string) => {
    const res = await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setFeeds((prev) => prev.filter((f) => f.id !== id));
      addToast('info', 'フィードを削除しました');
    } else {
      addToast('error', 'フィードの削除に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        bookmarkCount={bookmarks.length}
        feedCount={feeds.filter((f) => f.enabled).length}
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshRecommendations}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'concierge' && (
          <ConciergeHome
            greeting={greeting}
            recommendations={recommendations}
            feedItems={feedItems}
            isLoading={isLoadingSummary}
            onSaveBookmark={handleSaveBookmark}
            onDismissRecommendation={handleDismissRecommendation}
            onQuickAdd={handleQuickAdd}
            onRefreshRecommendations={handleRefreshRecommendations}
            onOpenFeedTab={() => setActiveTab('stream')}
            onOpenBookmarksTab={() => setActiveTab('bookmarks')}
          />
        )}

        {activeTab === 'bookmarks' && (
          <BookmarkView
            bookmarks={bookmarks}
            onAddBookmark={handleAddBookmark}
            onUpdateBookmark={handleUpdateBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            onTriggerAIRefresh={handleRefreshRecommendations}
          />
        )}

        {activeTab === 'stream' && (
          <RawStreamView
            feedItems={feedItems}
            feeds={feeds}
            onSaveBookmark={handleSaveBookmark}
          />
        )}

        {activeTab === 'feeds' && (
          <FeedsView
            feeds={feeds}
            onToggleFeed={handleToggleFeed}
            onAddFeed={handleAddFeed}
            onDeleteFeed={handleDeleteFeed}
            onTriggerAIRefresh={handleRefreshRecommendations}
          />
        )}
      </main>

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
