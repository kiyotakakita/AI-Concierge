import React, { useState, useMemo } from 'react';
import { Newspaper, Search, ExternalLink, BookmarkPlus, Filter, Clock, Tag } from 'lucide-react';
import { FeedItem, FeedSource } from '../types/index.ts';

interface RawStreamViewProps {
  feedItems: FeedItem[];
  feeds: FeedSource[];
  onSaveBookmark: (article: { url: string; title: string; sourceName: string; tags: string[] }) => Promise<void>;
}

export const RawStreamView: React.FC<RawStreamViewProps> = ({ feedItems, feeds, onSaveBookmark }) => {
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return feedItems.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.contentSnippet.toLowerCase().includes(q) ||
        item.sourceName.toLowerCase().includes(q);

      const matchesSource = !selectedSource || item.sourceName === selectedSource;

      return matchesSearch && matchesSource;
    });
  }, [feedItems, search, selectedSource]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    feedItems.forEach((item) => set.add(item.sourceName));
    return Array.from(set);
  }, [feedItems]);

  const handleSave = async (item: FeedItem) => {
    setSavingUrl(item.link);
    try {
      await onSaveBookmark({
        url: item.link,
        title: item.title,
        sourceName: item.sourceName,
        tags: item.categories && item.categories.length > 0 ? item.categories.slice(0, 3) : ['News'],
      });
    } finally {
      setSavingUrl(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">新着フィード・ストリーム</h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
          登録した各メディア・ブログから取得した最新の生記事一覧です。気になった記事をブックマークすると、AIコンシェルジュがあなたの関心として即座に学習します。
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="フィード記事を全文検索..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Source Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSource(null)}
            className={`text-xs px-3 py-2 rounded-xl font-medium shrink-0 transition ${
              selectedSource === null
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            すべてのソース ({feedItems.length})
          </button>
          {sources.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSource(selectedSource === s ? null : s)}
              className={`text-xs px-3 py-2 rounded-xl font-medium shrink-0 transition ${
                selectedSource === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Feed */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm">
          表示可能な記事が見つかりませんでした。
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isSaving = savingUrl === item.link;

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                      {item.sourceName}
                    </span>
                    {item.pubDate && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.pubDate).toLocaleDateString('ja-JP', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white hover:text-indigo-300 transition leading-snug">
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1">
                      <span>{item.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-1 text-slate-500" />
                    </a>
                  </h3>

                  {item.contentSnippet && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {item.contentSnippet}
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-slate-800/60 pt-3 sm:pt-0">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800"
                  >
                    <span>元記事</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => handleSave(item)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm shadow-indigo-600/30 disabled:opacity-50"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>{isSaving ? '保存中...' : 'ブックマーク'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
