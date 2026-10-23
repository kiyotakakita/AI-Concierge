import React, { useState } from 'react';
import { Rss, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Globe } from 'lucide-react';
import { FeedSource } from '../types/index.ts';

interface FeedsViewProps {
  feeds: FeedSource[];
  onToggleFeed: (id: string, enabled: boolean) => Promise<void>;
  onAddFeed: (data: { name: string; url: string; category: FeedSource['category']; description?: string }) => Promise<void>;
  onDeleteFeed: (id: string) => Promise<void>;
  onTriggerAIRefresh: () => void;
}

export const FeedsView: React.FC<FeedsViewProps> = ({
  feeds,
  onToggleFeed,
  onAddFeed,
  onDeleteFeed,
  onTriggerAIRefresh,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [feedName, setFeedName] = useState('');
  const [feedCategory, setFeedCategory] = useState<FeedSource['category']>('tech');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) return;

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onAddFeed({
        name: feedName.trim(),
        url: feedUrl.trim(),
        category: feedCategory,
      });
      setFeedUrl('');
      setFeedName('');
      setIsAddOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'フィードの追加に失敗しました。URLを確認してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Rss className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">RSSフィード購読設定</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            AIコンシェルジュが毎日巡回し、おすすめ記事を抽出する外部ニュース＆ブログの情報ソース一覧です。
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(!isAddOpen)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-md shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>カスタムRSSを追加</span>
        </button>
      </div>

      {/* Add Feed Inline Form */}
      {isAddOpen && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-900/60 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>新しいRSS/Atomフィードを登録</span>
          </h3>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  フィードURL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  サイト名 (空欄時は自動取得)
                </label>
                <input
                  type="text"
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                  placeholder="例: TechCrunch Japan"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs font-semibold text-slate-400">カテゴリ:</label>
                <select
                  value={feedCategory}
                  onChange={(e) => setFeedCategory(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="tech">テクノロジー / 開発</option>
                  <option value="ai">AI / 機械学習</option>
                  <option value="business">ビジネス / スタートアップ</option>
                  <option value="general">一般ニュース / コラム</option>
                </select>
              </div>

              <div className="flex items-center gap-2 self-end">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !feedUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? '検証中...' : '接続テストして追加'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Feed List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feeds.map((feed) => {
          return (
            <div
              key={feed.id}
              className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                feed.enabled
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-slate-950/60 border-slate-900 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{feed.name}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {feed.category}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {feed.description || feed.url}
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feed.enabled}
                      onChange={(e) => onToggleFeed(feed.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="pt-1">
                  <a
                    href={feed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-slate-500 hover:text-indigo-300 flex items-center gap-1 font-mono break-all"
                  >
                    <span>{feed.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{feed.enabled ? '巡回対象' : '巡回停止中'}</span>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm(`フィード「${feed.name}」を削除しますか？`)) {
                      onDeleteFeed(feed.id);
                    }
                  }}
                  title="フィードを削除"
                  className="text-slate-500 hover:text-rose-400 transition p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
