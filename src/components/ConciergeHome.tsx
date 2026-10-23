import React, { useState } from 'react';
import {
  Sparkles,
  ExternalLink,
  BookmarkPlus,
  BookmarkCheck,
  EyeOff,
  Send,
  Link as LinkIcon,
  Clock,
  Tag,
  TrendingUp,
  Flame,
  ArrowRight,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';
import { ConciergeGreeting, Recommendation, FeedItem } from '../types/index.ts';

interface ConciergeHomeProps {
  greeting: ConciergeGreeting | null;
  recommendations: Recommendation[];
  feedItems: FeedItem[];
  isLoading: boolean;
  onSaveBookmark: (article: { url: string; title: string; sourceName: string; tags: string[] }) => Promise<void>;
  onDismissRecommendation: (articleUrl: string) => Promise<void>;
  onQuickAdd: (url: string, note: string, tags: string[]) => Promise<void>;
  onRefreshRecommendations: () => void;
  onOpenFeedTab: () => void;
  onOpenBookmarksTab: () => void;
}

export const ConciergeHome: React.FC<ConciergeHomeProps> = ({
  greeting,
  recommendations,
  feedItems,
  isLoading,
  onSaveBookmark,
  onDismissRecommendation,
  onQuickAdd,
  onRefreshRecommendations,
  onOpenFeedTab,
  onOpenBookmarksTab,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [quickTags, setQuickTags] = useState('Tech, AI');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    setIsSubmittingQuick(true);
    try {
      const isUrl = /^https?:\/\//i.test(quickInput.trim());
      const url = isUrl ? quickInput.trim() : `memo://${encodeURIComponent(quickInput.trim().slice(0, 30))}`;
      const note = isUrl ? 'クイックバーから追加した記事' : quickInput.trim();
      const tags = quickTags
        .split(/[,、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      await onQuickAdd(url, note, tags.length > 0 ? tags : ['QuickSave']);
      setQuickInput('');
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handleSave = async (rec: Recommendation) => {
    setSavingUrl(rec.articleUrl);
    try {
      await onSaveBookmark({
        url: rec.articleUrl,
        title: rec.articleTitle,
        sourceName: rec.sourceName,
        tags: rec.relatedBookmarkTags,
      });
    } finally {
      setSavingUrl(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. AI Concierge Greeting Card */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>パーソナル AI コンシェルジュ</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>{greeting?.greeting || 'おかえりなさい！'}</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal">
              {greeting?.personalizedMessage ||
                'あなたの過去の保存ブックマークを学習し、今朝のRSSフィードから最も価値の高い記事を厳選しました。'}
            </p>

            {/* Interest Topics Tags */}
            {greeting?.keyTopics && greeting.keyTopics.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  現在の注目トピック:
                </span>
                {greeting.keyTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-xs font-medium text-slate-300 border border-slate-700 transition"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick status pill / prompt to refresh */}
          <div className="flex md:flex-col items-center md:items-end justify-between gap-3 text-xs text-slate-400 border-t md:border-t-0 border-slate-800 pt-4 md:pt-0">
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-800/50">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>嗜好モデル同期中</span>
            </div>
            <button
              onClick={onOpenBookmarksTab}
              className="text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4"
            >
              ブックマークで好みを調整 &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* 2. Quick Input Bar */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm">
        <form onSubmit={handleQuickSubmit} className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>クイック保存 (URLまたはメモを入力するとAIが次の推薦に反映します)</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="気になった記事のURL (https://...) または 読書メモや関心事を入力..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div className="sm:w-48">
              <input
                type="text"
                value={quickTags}
                onChange={(e) => setQuickTags(e.target.value)}
                placeholder="タグ (カンマ区切り)"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingQuick || !quickInput.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-md shadow-indigo-600/30 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Send className="w-4 h-4" />
              <span>保存</span>
            </button>
          </div>
        </form>
      </section>

      {/* 3. Recommended Articles (本日のおすすめ 3〜5選) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">本日のおすすめ厳選記事</h2>
              <p className="text-xs text-slate-400">
                あなたの関心と親和性が高い上位3〜5件をAIがピックアップ
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            {recommendations.length > 0 && `${recommendations.length} 件を推薦中`}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="h-6 bg-slate-800 rounded w-3/4" />
                <div className="h-16 bg-slate-800/60 rounded" />
                <div className="h-10 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
            <Sparkles className="w-10 h-10 text-indigo-400 mx-auto opacity-70" />
            <h3 className="text-lg font-semibold text-slate-200">おすすめ記事を準備中</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              RSSフィードから記事を取得してAIがパーソナライズ選定を行います。下のボタンを押して更新してください。
            </p>
            <button
              onClick={onRefreshRecommendations}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
            >
              今すぐAI分析を実行する
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {recommendations.map((rec) => {
              const isSaved = rec.savedAsBookmark;
              const isSaving = savingUrl === rec.articleUrl;

              return (
                <article
                  key={rec.id}
                  className="flex flex-col justify-between rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all duration-200 shadow-md hover:shadow-indigo-950/20 p-6 group"
                >
                  <div className="space-y-4">
                    {/* Header: Source, PubDate, Relevance */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                          {rec.sourceName}
                        </span>
                        {rec.pubDate && (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(rec.pubDate).toLocaleDateString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold text-[11px]">
                        <span>適合度</span>
                        <span className="text-amber-400">{rec.relevanceScore}%</span>
                      </div>
                    </div>

                    {/* Article Title */}
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition leading-snug">
                      <a
                        href={rec.articleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-start gap-1.5"
                      >
                        <span>{rec.articleTitle}</span>
                        <ExternalLink className="w-4 h-4 shrink-0 mt-1 text-slate-500 group-hover:text-indigo-300" />
                      </a>
                    </h3>

                    {/* 💡 AI Recommendation Reason */}
                    <div className="rounded-xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-900/30 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span>AIコンシェルジュの選定理由</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {rec.reason}
                      </p>
                    </div>

                    {/* 📝 AI 3-Line Summary */}
                    <div className="space-y-1.5 bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                        📝 3行要約
                      </span>
                      <ul className="space-y-1.5">
                        {rec.summary.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Related Tags */}
                    {rec.relatedBookmarkTags && rec.relatedBookmarkTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {rec.relatedBookmarkTags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <a
                      href={rec.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition"
                    >
                      <span>元記事を開く</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDismissRecommendation(rec.articleUrl)}
                        title="この推薦を非表示にする"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition border border-transparent hover:border-rose-900/40"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">興味なし</span>
                      </button>

                      <button
                        onClick={() => handleSave(rec)}
                        disabled={isSaved || isSaving}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                          isSaved
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
                        }`}
                      >
                        {isSaved ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>保存済み</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span>{isSaving ? '保存中...' : 'ブックマーク保存'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Stream Preview (最新フィード速報) */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">新着RSSダイジェスト</h3>
            <p className="text-xs text-slate-400">
              購読中の各フィードから届いたリアルタイム新着記事
            </p>
          </div>
          <button
            onClick={onOpenFeedTab}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>すべて見る ({feedItems.length}件)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {feedItems.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-3 transition group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-medium text-indigo-300 truncate max-w-[120px]">
                    {item.sourceName}
                  </span>
                  <span>
                    {item.pubDate &&
                      new Date(item.pubDate).toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                      })}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition line-clamp-2 leading-snug">
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                </h4>
                {item.contentSnippet && (
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {item.contentSnippet}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-800/60 text-xs">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <span>開く</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={() =>
                    onSaveBookmark({
                      url: item.link,
                      title: item.title,
                      sourceName: item.sourceName,
                      tags: item.categories && item.categories.length > 0 ? item.categories.slice(0, 3) : ['News'],
                    })
                  }
                  className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>保存</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
