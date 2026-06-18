import { useState, useEffect, useCallback } from 'react';
import type { BookshelfEntry } from '../services/api';
import { fetchBookshelf, addToBookshelf, updateBookshelfStatus, deleteBookshelfEntry, generateBookGuide } from '../services/api';
import { getCached, setCache } from '../services/cache';
import type { BookGuide } from '../types';
import QuestionQA from './QuestionQA';

export default function BookshelfPage() {
  const [tab, setTab] = useState<'unread' | 'read'>('unread');
  const [entries, setEntries] = useState<BookshelfEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showReview, setShowReview] = useState<BookshelfEntry | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);

  // Guide viewing state
  const [viewingGuide, setViewingGuide] = useState<BookGuide | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState('');

  // Q&A modal state (for read books)
  const [showQA, setShowQA] = useState<{ entry: BookshelfEntry; questions: string[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBookshelf();
      setEntries(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unreadList = entries.filter(e => e.status === 'unread');
  const readList = entries.filter(e => e.status === 'read');
  const list = tab === 'unread' ? unreadList : readList;

  // ========== Click unread book → view guide ==========
  const handleViewUnread = async (entry: BookshelfEntry) => {
    // Try cache first
    const cached = getCached(entry.bookName, entry.author || undefined, true);
    if (cached) {
      setViewingGuide(cached);
      return;
    }

    setGuideLoading(true);
    setGuideError('');
    try {
      const guide = await generateBookGuide(entry.bookName, entry.author || undefined, true);
      setCache(entry.bookName, entry.author || undefined, guide, true);
      setViewingGuide(guide);
    } catch (e: unknown) {
      setGuideError(e instanceof Error ? e.message : '生成失败');
    }
    setGuideLoading(false);
  };

  // ========== Click read book → view Q&A ==========
  const handleViewRead = (entry: BookshelfEntry) => {
    const cached = getCached(entry.bookName, entry.author || undefined);
    const questions = cached?.guidingQuestions || [];
    setShowQA({ entry, questions });
  };

  const handleMarkRead = async () => {
    if (!showReview) return;
    if (!reviewText.trim()) return;
    await updateBookshelfStatus(showReview.id, 'read', reviewText.trim());
    setShowReview(null);
    setReviewText('');
    setRating(0);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    await deleteBookshelfEntry(id);
    load();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-800 mb-6">我的书架</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1">
        {(['unread', 'read'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${
              tab === t ? 'bg-white text-stone-800 shadow-sm' : 'bg-transparent text-stone-400'
            }`}
          >
            {t === 'unread' ? `未读 (${unreadList.length})` : `已读 (${readList.length})`}
          </button>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full mb-6 py-3 rounded-xl border-2 border-dashed border-stone-200 text-stone-400
                   hover:border-amber-300 hover:text-amber-600 text-sm cursor-pointer bg-transparent transition-all"
      >
        + 添加到书架
      </button>

      {/* Guide Loading Overlay */}
      {guideLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-8 text-center">
            <div className="animate-spin w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full mb-4 mx-auto" />
            <h3 className="text-base font-bold text-stone-700 mb-1">正在生成阅读指南</h3>
            <p className="text-xs text-stone-400">AI 正在分析中，请稍候...</p>
          </div>
        </div>
      )}

      {/* Guide Error Overlay */}
      {guideError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="text-4xl mb-3">😞</div>
            <h3 className="text-base font-bold text-stone-700 mb-2">生成失败</h3>
            <p className="text-xs text-stone-500 mb-5">{guideError}</p>
            <button
              onClick={() => setGuideError('')}
              className="px-6 py-2 rounded-lg bg-stone-800 text-white text-sm cursor-pointer hover:bg-stone-700 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Full Guide Overlay (unread) */}
      {viewingGuide && (
        <GuideOverlay
          guide={viewingGuide}
          onClose={() => setViewingGuide(null)}
        />
      )}

      {/* Q&A Modal (read) */}
      {showQA && (
        <QAModal
          entry={showQA.entry}
          questions={showQA.questions}
          onClose={() => setShowQA(null)}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-stone-400 py-12">加载中...</div>
      ) : list.length === 0 ? (
        <div className="text-center text-stone-400 py-12">
          {tab === 'unread' ? '未读书籍为空，去搜索添加吧' : '已读书籍为空'}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(entry => (
            <div
              key={entry.id}
              onClick={() => {
                if (entry.status === 'unread') handleViewUnread(entry);
                else handleViewRead(entry);
              }}
              className="bg-white rounded-xl border border-stone-100 p-4 flex items-start justify-between cursor-pointer hover:shadow-sm hover:border-amber-100 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-700 truncate">{entry.bookName}</div>
                {entry.author && <div className="text-xs text-stone-400 mt-0.5">{entry.author}</div>}
                {entry.shortReview && (
                  <div className="text-xs text-stone-500 mt-2 bg-stone-50 rounded-lg px-3 py-2 line-clamp-2">
                    {entry.shortReview}
                  </div>
                )}
                {entry.rating > 0 && (
                  <div className="text-xs text-amber-500 mt-1">{'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}</div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3" onClick={e => e.stopPropagation()}>
                {entry.status === 'unread' && (
                  <button
                    onClick={() => { setShowReview(entry); setReviewText(''); setRating(0); }}
                    className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg cursor-pointer border-none hover:bg-amber-100 transition-colors"
                  >
                    标记已读
                  </button>
                )}
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-xs text-stone-400 hover:text-red-400 px-2 py-1.5 rounded-lg cursor-pointer bg-transparent border-none hover:bg-red-50 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <AddModal onClose={() => setShowAdd(false)} onAdd={load} />
      )}

      {/* Review modal */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReview(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-stone-800 mb-1">标记已读：《{showReview.bookName}》</h3>
            <p className="text-xs text-stone-400 mb-4">请写一段短评（必填），才能加入已读书架</p>
            <textarea
              autoFocus
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="这本书怎么样？有什么收获或感受？（必填）"
              className="w-full h-28 px-4 py-3 rounded-xl border border-stone-200 text-sm text-stone-700
                         resize-none focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
            <div className="mt-4 mb-2">
              <span className="text-xs text-stone-500">评分：</span>
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => setRating(i)} className="bg-transparent border-none cursor-pointer text-lg px-0.5">
                  {i <= rating ? '★' : '☆'}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowReview(null)} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-500 cursor-pointer bg-transparent hover:bg-stone-50 transition-colors">取消</button>
              <button
                onClick={handleMarkRead}
                disabled={!reviewText.trim()}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 text-white cursor-pointer hover:bg-stone-700 disabled:opacity-40 transition-colors"
              >
                确认标记已读
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Guide Full-Screen Overlay ==========
function GuideOverlay({ guide, onClose }: { guide: BookGuide; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 bg-stone-50/90 backdrop-blur-sm border-b border-stone-100 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer bg-transparent border-none p-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">返回书架</span>
          </button>
          <span className="text-sm font-medium text-stone-800">阅读指南</span>
          <div className="w-16" />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-800 mb-1">{guide.bookName}</h1>
          {guide.author && guide.author !== '未知' && (
            <p className="text-stone-400">{guide.author} 著</p>
          )}
        </div>

        {guide.oneLiner && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-6 py-4 mb-10">
            <p className="text-amber-800 text-lg font-medium leading-relaxed text-center">{guide.oneLiner}</p>
          </div>
        )}

        <GuideSection title="历史背景">
          <GuideBlock label="时代背景 & 创作缘起" text={guide.historicalBackground} />
          <GuideBlock label="关于作者" text={guide.authorBio} />
        </GuideSection>

        <GuideSection title="写作意图">
          <GuideBlock label="作者想解决什么问题" text={guide.writingIntent} />
          <GuideBlock label="写给谁看" text={guide.targetAudience} />
        </GuideSection>

        {guide.guidingQuestions.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-5">带着这 5 个问题开始阅读</h2>
            <div className="space-y-2">
              {guide.guidingQuestions.map((q, i) => (
                <QuestionQA key={i} question={q} index={i} bookName={guide.bookName} author={guide.author} />
              ))}
            </div>
          </div>
        )}

        <GuideSection title="适读人群">
          <p className="text-stone-600 leading-relaxed">{guide.suitableReaders}</p>
        </GuideSection>

        {guide.keyConcepts.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-5">核心概念预热</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {guide.keyConcepts.map((kc, i) => (
                <div key={i} className="bg-white border border-stone-100 rounded-xl px-5 py-4">
                  <span className="text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full">{i + 1}</span>
                  <h4 className="text-stone-800 font-medium mt-2 mb-1">{kc.term}</h4>
                  <p className="text-stone-500 text-sm leading-relaxed">{kc.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-5">阅读难度评估</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DiffBlock label="难度等级" value={guide.difficulty.level} />
            <DiffBlock label="语言风格" value={guide.difficulty.languageStyle} />
            <DiffBlock label="信息密度" value={guide.difficulty.infoDensity} />
            <DiffBlock label="预估时长" value={guide.difficulty.estimatedHours} />
          </div>
        </div>

        {guide.stickyNotes && guide.stickyNotes.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              索引贴分类
            </h2>
            <div className="space-y-3">
              {guide.stickyNotes.map((sn, i) => {
                const colors = ['#ef4444','#f97316','#eab308','#10b981','#3b82f6','#8b5cf6'];
                const bgs = ['#fef2f2','#fff7ed','#fffbeb','#ecfdf5','#eff6ff','#f5f3ff'];
                const c = colors[i % 6];
                const bg = bgs[i % 6];
                return (
                  <div key={i} className="rounded-xl border border-stone-200 overflow-hidden bg-white" style={{ borderLeftColor: c, borderLeftWidth: 3 }}>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-2" style={{ backgroundColor: bg }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                      <span className="text-xs font-bold tracking-wide" style={{ color: c }}>{sn.category}</span>
                    </div>
                    <div className="px-4 pb-3 space-y-1.5">
                      {sn.examples.map((ex, j) => (
                        <div key={j} className="flex items-start gap-2 pl-1">
                          <span className="text-xs mt-0.5" style={{ color: c }}>•</span>
                          <span className="text-sm text-stone-600 leading-relaxed">{ex}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ========== Q&A Modal (for read books) ==========
function QAModal({
  entry,
  questions,
  onClose,
}: {
  entry: BookshelfEntry;
  questions: string[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto flex items-start justify-center pt-12 pb-12" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 my-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-stone-800">{entry.bookName}</h3>
            {entry.author && <p className="text-xs text-stone-400">{entry.author}</p>}
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none cursor-pointer bg-transparent border-none">✕</button>
        </div>

        {questions.length > 0 ? (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <QuestionQA
                key={i}
                question={q}
                index={i}
                bookName={entry.bookName}
                author={entry.author}
                defaultExpanded={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-stone-400">
            <p className="mb-2">尚未生成阅读指南</p>
            <p className="text-xs">请先在首页搜索此书，生成指南后会包含 5 个引导问题</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== Reusable blocks ==========
function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function GuideBlock({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="bg-white border border-stone-100 rounded-xl px-6 py-5">
      <h3 className="text-xs text-stone-400 font-medium mb-2">{label}</h3>
      <p className="text-stone-600 leading-relaxed">{text}</p>
    </div>
  );
}

function DiffBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-stone-100 rounded-xl px-5 py-4 text-center">
      <p className="text-2xl mb-1 font-medium text-stone-700">{value}</p>
      <p className="text-xs text-stone-400">{label}</p>
    </div>
  );
}

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [bookName, setBookName] = useState('');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await addToBookshelf({ bookName: bookName.trim(), author: author.trim() || undefined, status: 'unread' });
      onAdd();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-stone-800 mb-4">添加到书架</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">书名 *</label>
            <input
              autoFocus
              value={bookName} onChange={e => setBookName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-700
                         focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              placeholder="输入书名"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">作者</label>
            <input
              value={author} onChange={e => setAuthor(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-700
                         focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              placeholder="选填"
            />
          </div>
          {error && <div className="text-xs text-red-500">{error}</div>}
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-500 cursor-pointer bg-transparent">取消</button>
            <button type="submit" disabled={submitting || !bookName.trim()} className="flex-1 py-2.5 rounded-xl bg-stone-800 text-white cursor-pointer hover:bg-stone-700 disabled:opacity-40">添加</button>
          </div>
        </form>
      </div>
    </div>
  );
}
