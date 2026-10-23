import React, { useState, useMemo } from 'react';
import {
  Bookmark as BookmarkIcon,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Tag,
  Calendar,
  Edit2,
  Check,
  X,
  FileText,
  Sparkles,
  Copy,
} from 'lucide-react';
import { Bookmark } from '../types/index.ts';

interface BookmarkViewProps {
  bookmarks: Bookmark[];
  onAddBookmark: (data: { url: string; title: string; note: string; tags: string[] }) => Promise<void>;
  onUpdateBookmark: (id: string, data: { title: string; note: string; tags: string[] }) => Promise<void>;
  onDeleteBookmark: (id: string) => Promise<void>;
  onTriggerAIRefresh: () => void;
}

export const BookmarkView: React.FC<BookmarkViewProps> = ({
  bookmarks,
  onAddBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
  onTriggerAIRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New bookmark form state
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newTags, setNewTags] = useState('Tech, AI');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editTags, setEditTags] = useState('');

  // Extract all unique tags
  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    bookmarks.forEach((b) => {
      b.tags.forEach((t) => {
        const clean = t.trim();
        if (clean) map.set(clean, (map.get(clean) || 0) + 1);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  // Filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.note.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q));

      const matchesTag = !selectedTag || b.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

      return matchesSearch && matchesTag;
    });
  }, [bookmarks, searchQuery, selectedTag]);

  const handleStartEdit = (b: Bookmark) => {
    setEditingId(b.id);
    setEditTitle(b.title);
    setEditNote(b.note);
    setEditTags(b.tags.join(', '));
  };

  const handleSaveEdit = async (id: string) => {
    const tagsArr = editTags
      .split(/[,、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    await onUpdateBookmark(id, {
      title: editTitle,
      note: editNote,
      tags: tagsArr.length > 0 ? tagsArr : ['General'],
    });
    setEditingId(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const tagsArr = newTags
        .split(/[,、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      await onAddBookmark({
        url: newUrl.trim(),
        title: newTitle.trim() || newUrl.trim(),
        note: newNote.trim(),
        tags: tagsArr.length > 0 ? tagsArr : ['Tech'],
      });

      setNewUrl('');
      setNewTitle('');
      setNewNote('');
      setNewTags('Tech, AI');
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner explaining how bookmarks power the AI Concierge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">ブックマーク・メモ管理</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            保存した記事やメモは、AIコンシェルジュがあなたの嗜好・関心を推論する基盤データになります。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>新規登録</span>
          </button>
        </div>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="タイトル、メモ、URL、タグで検索..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tags horizontal list */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              onClick={() => setSelectedTag(null)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                selectedTag === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              すべて ({bookmarks.length})
            </button>
            {allTags.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>#{tag}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bookmarks List */}
      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">該当するブックマークがありません</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            検索条件を変更するか、右上の「新規登録」ボタンから新しい記事やメモを保存してください。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookmarks.map((b) => {
            const isEditing = editingId === b.id;

            return (
              <div
                key={b.id}
                className="rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 p-5 space-y-4 transition shadow-sm"
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">タイトル</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">メモ・考察</label>
                      <textarea
                        rows={3}
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">タグ (カンマ区切り)</label>
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleSaveEdit(b.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>更新を保存</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-base sm:text-lg font-bold text-white hover:text-indigo-300 transition">
                          <a href={b.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                            <span>{b.title}</span>
                            <ExternalLink className="w-4 h-4 text-slate-500" />
                          </a>
                        </h3>
                        <p className="text-xs text-slate-500 break-all font-mono">
                          {b.url}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-start">
                        <button
                          onClick={() => handleStartEdit(b)}
                          title="編集"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`「${b.title}」を削除しますか？`)) {
                              onDeleteBookmark(b.id);
                            }
                          }}
                          title="削除"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Note Content */}
                    {b.note && (
                      <div className="text-xs sm:text-sm text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                        {b.note}
                      </div>
                    )}

                    {/* Footer: Tags and Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        {b.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            onClick={() => setSelectedTag(tag)}
                            className="cursor-pointer text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(b.createdAt).toLocaleDateString('ja-JP')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Bookmark Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookmarkIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">新しいブックマークを保存</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  タイトル (空欄の場合は自動設定)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="記事のタイトル"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  メモ・重要ポイント（AIがあなたの興味として学習します）
                </label>
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="この記事のどこに惹かれたか、どんな技術や知見が記載されていたか..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  タグ (カンマ区切り)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="TypeScript, Next.js, AI, Architecture"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newUrl.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? '保存中...' : 'ブックマークを追加'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
