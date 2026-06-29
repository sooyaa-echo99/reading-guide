import { useState, useEffect, useCallback } from 'react';
import type { BookshelfEntry } from '../services/api';
import { fetchBookshelf, addToBookshelf, updateBookshelfStatus, deleteBookshelfEntry, generateBookGuide, fetchAnswers, Answer } from '../services/api';
import { getCached, setCache } from '../services/cache';
import type { BookGuide, CharacterNode, CharacterEdge } from '../types';
import QuestionQA from './QuestionQA';

// ========== Book spine color palette ==========
const SPINE_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560',
  '#2d6a4f', '#40916c', '#52b788', '#1b4332', '#081c15',
  '#6a040f', '#9d0208', '#d00000', '#dc2f02', '#e85d04',
  '#3c096c', '#5a189a', '#7b2cbf', '#9d4edd', '#c77dff',
  '#023e8a', '#0077b6', '#0096c7', '#00b4d8', '#48cae4',
  '#7f4f24', '#936639', '#a98467', '#b08968', '#582f0e',
];

function getBookColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SPINE_COLORS[Math.abs(hash) % SPINE_COLORS.length];
}

// ========== Main BookshelfPage ==========
export default function BookshelfPage() {
  const [tab, setTab] = useState<'unread' | 'read'>('unread');
  const [entries, setEntries] = useState<BookshelfEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showReview, setShowReview] = useState<BookshelfEntry | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);

  // Guide viewing state (unread)
  const [viewingGuide, setViewingGuide] = useState<BookGuide | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState('');

  // Read book detail state
  const [readDetail, setReadDetail] = useState<BookshelfEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBookshelf();
      setEntries(data);
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unreadList = entries.filter(e => e.status === 'unread');
  const readList = entries.filter(e => e.status === 'read');
  const list = tab === 'unread' ? unreadList : readList;

  const handleViewUnread = async (entry: BookshelfEntry) => {
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

  const handleViewRead = (entry: BookshelfEntry) => {
    setReadDetail(entry);
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #fef3e6 0%, #fde8d0 40%, #f5d6b8 100%)' }}>
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-amber-900" style={{ fontFamily: '"STKaiti", "KaiTi", "楷体", serif' }}>
            📚 我的书架
          </h1>
          <div className="flex gap-1 bg-amber-900/10 rounded-xl p-1">
            {(['unread', 'read'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${
                  tab === t
                    ? 'bg-amber-900 text-amber-50 shadow-md'
                    : 'bg-transparent text-amber-800/60 hover:text-amber-800'
                }`}
              >
                {t === 'unread' ? `未读 (${unreadList.length})` : `已读 (${readList.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Shelf area */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {/* Add button */}
        <button
          onClick={() => setShowAdd(true)}
          className="w-full mb-8 py-4 rounded-xl border-2 border-dashed border-amber-300/60 text-amber-700/50
                     hover:border-amber-400 hover:text-amber-700 cursor-pointer bg-amber-50/30 text-sm transition-all"
        >
          + 添加新书到书架
        </button>

        {/* Loading */}
        {guideLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-8 text-center">
              <div className="animate-spin w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full mb-4 mx-auto" />
              <h3 className="text-base font-bold text-stone-700 mb-1">正在生成阅读指南</h3>
              <p className="text-xs text-stone-400">AI 正在分析中，请稍候...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {guideError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6 text-center">
              <div className="text-4xl mb-3">😞</div>
              <h3 className="text-base font-bold text-stone-700 mb-2">生成失败</h3>
              <p className="text-xs text-stone-500 mb-5">{guideError}</p>
              <button onClick={() => setGuideError('')} className="px-6 py-2 rounded-lg bg-stone-800 text-white text-sm cursor-pointer hover:bg-stone-700">关闭</button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center text-amber-800/50 py-16">
            <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">整理书架中...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="text-center text-amber-800/40 py-16">
            <p className="text-4xl mb-4">{tab === 'unread' ? '📖' : '✅'}</p>
            <p className="text-sm">{tab === 'unread' ? '书架上还没有书，去搜索添加吧' : '还没有读完的书'}</p>
          </div>
        ) : (
          <Bookshelf
            entries={list}
            tab={tab}
            onViewUnread={handleViewUnread}
            onViewRead={handleViewRead}
            onMarkRead={(e) => { setShowReview(e); setReviewText(''); setRating(0); }}
            onDelete={handleDelete}
          />
        )}

        {/* Guide Overlay (unread) */}
        {viewingGuide && (
          <GuideOverlay guide={viewingGuide} onClose={() => setViewingGuide(null)} />
        )}

        {/* Read Detail Overlay */}
        {readDetail && (
          <ReadDetailOverlay entry={readDetail} onClose={() => setReadDetail(null)} />
        )}

        {/* Add modal */}
        {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={load} />}

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
                className="w-full h-28 px-4 py-3 rounded-xl border border-stone-200 text-sm text-stone-700 resize-none focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
              <div className="mt-4 mb-2">
                <span className="text-xs text-stone-500">评分：</span>
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} onClick={() => setRating(i)} className="bg-transparent border-none cursor-pointer text-lg px-0.5">
                    {i <= rating ? '★' : '☆'}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowReview(null)} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-500 cursor-pointer bg-transparent hover:bg-stone-50">取消</button>
                <button onClick={handleMarkRead} disabled={!reviewText.trim()} className="flex-1 py-2.5 rounded-xl bg-stone-800 text-white cursor-pointer hover:bg-stone-700 disabled:opacity-40">确认标记已读</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== Bookshelf Grid ==========
function Bookshelf({
  entries,
  tab,
  onViewUnread,
  onViewRead,
  onMarkRead,
  onDelete,
}: {
  entries: BookshelfEntry[];
  tab: 'unread' | 'read';
  onViewUnread: (e: BookshelfEntry) => void;
  onViewRead: (e: BookshelfEntry) => void;
  onMarkRead: (e: BookshelfEntry) => void;
  onDelete: (id: number) => void;
}) {
  const booksPerShelf = 6;
  const shelves: BookshelfEntry[][] = [];
  for (let i = 0; i < entries.length; i += booksPerShelf) {
    shelves.push(entries.slice(i, i + booksPerShelf));
  }

  return (
    <div className="space-y-12">
      {shelves.map((shelfEntries, shelfIdx) => (
        <div key={shelfIdx}>
          {/* Books row */}
          <div className="flex items-end gap-3 px-4 justify-center flex-wrap">
            {shelfEntries.map(entry => (
              <BookSpine
                key={entry.id}
                entry={entry}
                tab={tab}
                onClick={() => {
                  if (entry.status === 'unread') onViewUnread(entry);
                  else onViewRead(entry);
                }}
                onMarkRead={() => onMarkRead(entry)}
                onDelete={() => onDelete(entry.id)}
              />
            ))}
            {/* Fill empty slots */}
            {shelfEntries.length < booksPerShelf &&
              Array.from({ length: booksPerShelf - shelfEntries.length }).map((_, i) => (
                <div key={`empty-${i}`} className="w-[100px] h-[180px] opacity-0 pointer-events-none" />
              ))}
          </div>
          {/* Shelf board */}
          <div className="relative mt-1">
            <div
              className="h-4 rounded-sm mx-auto shadow-lg"
              style={{
                background: 'linear-gradient(180deg, #c49a6c 0%, #a0714d 40%, #8b5e3c 100%)',
                maxWidth: `${Math.min(entries.length, booksPerShelf) * 120 + 20}px`,
              }}
            />
            <div className="h-1 mx-auto rounded-b-sm" style={{ background: '#6b3a2a', maxWidth: `${Math.min(entries.length, booksPerShelf) * 120 + 20}px`, opacity: 0.5 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ========== Book Spine ==========
function BookSpine({
  entry,
  tab,
  onClick,
  onMarkRead,
  onDelete,
}: {
  entry: BookshelfEntry;
  tab: 'unread' | 'read';
  onClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const color = getBookColor(entry.bookName);
  const [hover, setHover] = useState(false);

  // Generate a slightly lighter shade for the spine highlight
  const lighten = (hex: string, amt: number) => {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amt);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const b = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  const spineWidth = 96;
  const spineHeight = tab === 'read' ? 190 : 175;

  return (
    <div
      className="relative flex-shrink-0 cursor-pointer group"
      style={{ width: spineWidth, height: spineHeight }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {/* Book spine */}
      <div
        className="w-full h-full rounded-r-sm rounded-l-sm relative overflow-hidden transition-all duration-200 shadow-md"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${lighten(color, -20)} 100%)`,
          transform: hover ? 'translateY(-8px) scale(1.03)' : 'translateY(0)',
          boxShadow: hover
            ? `4px 8px 20px rgba(0,0,0,0.3), inset -2px 0 6px rgba(0,0,0,0.15), inset 2px 0 6px rgba(255,255,255,0.05)`
            : `2px 4px 10px rgba(0,0,0,0.2), inset -2px 0 6px rgba(0,0,0,0.15), inset 2px 0 6px rgba(255,255,255,0.05)`,
        }}
      >
        {/* Spine left edge light line */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Book title (vertical) */}
        <div
          className="absolute inset-0 flex items-center justify-center px-2"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <span
              className="text-white font-bold tracking-wider leading-tight text-center"
              style={{
                fontSize: '14px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.4)',
                maxHeight: '120px',
                overflow: 'hidden',
                letterSpacing: '0.05em',
              }}
            >
              {entry.bookName.length > 8 ? entry.bookName.slice(0, 8) + '…' : entry.bookName}
            </span>
            {entry.author && (
              <span
                className="text-white/70 text-xs tracking-wider"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                {entry.author.length > 4 ? entry.author.slice(0, 4) + '…' : entry.author}
              </span>
            )}
          </div>
        </div>

        {/* Status strip */}
        <div
          className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{
            background: entry.status === 'read' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
            color: entry.status === 'read' ? '#d4fc79' : '#ffd700',
            backdropFilter: 'blur(2px)',
          }}
        >
          {entry.status === 'read' ? '已读' : '未读'}
        </div>

        {/* Rating for read books */}
        {entry.status === 'read' && entry.rating > 0 && (
          <div className="absolute bottom-8 left-0 right-0 text-center text-[10px]" style={{ color: '#ffd700', textShadow: '0 0 4px rgba(0,0,0,0.3)' }}>
            {'★'.repeat(entry.rating)}
          </div>
        )}
      </div>

      {/* Hover action buttons */}
      {hover && (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1 z-10"
          style={{ transform: 'translate(-50%, -50%)' }}
          onClick={e => e.stopPropagation()}
        >
          {entry.status === 'unread' && (
            <button
              onClick={onMarkRead}
              className="text-[10px] bg-amber-900 text-amber-50 px-2 py-1 rounded-md cursor-pointer border-none hover:bg-amber-800 whitespace-nowrap shadow-md transition-colors"
            >
              已读
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-[10px] bg-red-900/80 text-red-100 px-2 py-1 rounded-md cursor-pointer border-none hover:bg-red-800 whitespace-nowrap shadow-md transition-colors"
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
}

// ========== Guide Full-Screen Overlay (unread) ==========
function GuideOverlay({ guide, onClose }: { guide: BookGuide; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-stone-50 overflow-y-auto">
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
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-2">索引贴分类</h2>
            <div className="space-y-3">
              {guide.stickyNotes.map((sn, i) => {
                const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6', '#8b5cf6'];
                const bgs = ['#fef2f2', '#fff7ed', '#fffbeb', '#ecfdf5', '#eff6ff', '#f5f3ff'];
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

// ========== Read Book Detail Overlay ==========
function ReadDetailOverlay({ entry, onClose }: { entry: BookshelfEntry; onClose: () => void }) {
  const [guide, setGuide] = useState<BookGuide | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [entry.bookKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Try cache first
      const cached = getCached(entry.bookName, entry.author || undefined, true);
      if (cached) {
        setGuide(cached);
        // Fetch answers
        const ans = await fetchAnswers(entry.bookName, entry.author || undefined);
        setAnswers(ans);
      } else {
        // Generate fresh
        const fresh = await generateBookGuide(entry.bookName, entry.author || undefined, true);
        setCache(entry.bookName, entry.author || undefined, fresh, true);
        setGuide(fresh);
        const ans = await fetchAnswers(entry.bookName, entry.author || undefined);
        setAnswers(ans);
      }
    } catch { }
    setLoading(false);
  };

  // Group answers by question index
  const answersByIndex: Record<number, Answer[]> = {};
  answers.forEach(a => {
    if (!answersByIndex[a.questionIndex]) answersByIndex[a.questionIndex] = [];
    answersByIndex[a.questionIndex].push(a);
  });

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
          <span className="text-sm font-medium text-stone-800">阅读笔记</span>
          <div className="w-16" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full" />
        </div>
      ) : !guide ? (
        <div className="text-center py-32 text-stone-400">
          <p className="mb-2">加载失败</p>
          <button onClick={loadData} className="text-amber-600 hover:text-amber-700 text-sm cursor-pointer bg-transparent border-none">重试</button>
        </div>
      ) : (
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-10">
          {/* ===== 1. 书名 + 作者 ===== */}
          <div className="text-center">
            <div
              className="w-24 h-32 mx-auto mb-4 rounded-md shadow-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${getBookColor(entry.bookName)} 0%, ${getBookColor(entry.bookName + 'x')} 100%)` }}
            >
              <span className="text-white/80 text-4xl">📖</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-800 mb-1">{guide.bookName}</h1>
            {guide.author && guide.author !== '未知' && (
              <p className="text-stone-400 text-sm">{guide.author} 著</p>
            )}
          </div>

          {/* ===== 2. 评分 + 小记 ===== */}
          <div className="bg-white border border-stone-100 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>⭐</span> 我的评分与短评
            </h2>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-2xl text-amber-400 tracking-wider">
                {entry.rating > 0 ? '★'.repeat(entry.rating) + '☆'.repeat(5 - entry.rating) : '☆☆☆☆☆'}
              </div>
              <span className="text-sm text-stone-400">
                {entry.rating > 0 ? `${entry.rating}/5` : '未评分'}
              </span>
            </div>
            <div className="bg-stone-50 rounded-xl px-4 py-3">
              <p className="text-sm text-stone-600 leading-relaxed">
                {entry.shortReview || '暂无短评'}
              </p>
            </div>
          </div>

          {/* ===== 3. 5 道题及回答 ===== */}
          {guide.guidingQuestions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                <span>💬</span> 5 个引导问题与你的回答
              </h2>
              <div className="space-y-3">
                {guide.guidingQuestions.map((q, i) => {
                  const qAnswers = answersByIndex[i] || [];
                  return (
                    <div key={i} className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                      {/* Question header */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-stone-50">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <p className="text-stone-700 text-sm leading-relaxed">{q}</p>
                      </div>
                      {/* Answers */}
                      <div className="px-4 py-3">
                        {qAnswers.length > 0 ? (
                          <div className="space-y-2">
                            {qAnswers.map(a => (
                              <div key={a.id} className="bg-amber-50/50 border border-amber-100/50 rounded-lg px-3 py-2">
                                <p className="text-sm text-stone-700 leading-relaxed">{a.answerText}</p>
                                <p className="text-xs text-stone-400 mt-1">
                                  {new Date(a.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 italic">尚未回答此问题。在书架点击"返回阅读"可以补充回答。</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== 4. 人物关系图 ===== */}
          {guide.characterRelations &&
            guide.characterRelations.nodes &&
            guide.characterRelations.nodes.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                  <span>🕸️</span> 人物关系图
                </h2>
                <CharacterGraph
                  nodes={guide.characterRelations.nodes}
                  edges={guide.characterRelations.edges || []}
                />
              </div>
            )}
        </main>
      )}
    </div>
  );
}

// ========== Character Relationship Graph ==========
function CharacterGraph({ nodes, edges }: { nodes: CharacterNode[]; edges: CharacterEdge[] }) {
  const svgWidth = 640;
  const svgHeight = Math.max(300, nodes.length * 80 + 80);

  // Position nodes in a radial layout
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const radius = Math.min(centerX, centerY) - 60;

  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    positions[node.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const nodeColors = [
    '#e94560', '#0f3460', '#533483', '#2d6a4f', '#d00000',
    '#5a189a', '#0077b6', '#7f4f24', '#e85d04', '#0096c7',
  ];

  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-6 overflow-x-auto">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ maxWidth: svgWidth, minHeight: svgHeight }}>
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;

          // Calculate midpoint for label
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;

          return (
            <g key={`edge-${i}`}>
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="#d6d3d1"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              {edge.label && (
                <>
                  {/* Label background */}
                  <rect
                    x={mx - edge.label.length * 6}
                    y={my - 10}
                    width={edge.label.length * 12}
                    height={18}
                    rx={6}
                    fill="#fafaf9"
                    stroke="#e7e5e4"
                    strokeWidth={0.5}
                  />
                  <text
                    x={mx}
                    y={my + 3}
                    textAnchor="middle"
                    className="text-xs"
                    fill="#78716c"
                    fontSize="11"
                  >
                    {edge.label}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const color = nodeColors[i % nodeColors.length];

          // Card width/height
          const cardW = Math.max(80, node.name.length * 14 + 20);
          const cardH = 52;

          return (
            <g key={`node-${node.id}`}>
              {/* Shadow */}
              <rect
                x={pos.x - cardW / 2 + 2}
                y={pos.y - cardH / 2 + 2}
                width={cardW}
                height={cardH}
                rx={10}
                fill="rgba(0,0,0,0.08)"
              />
              {/* Card background */}
              <rect
                x={pos.x - cardW / 2}
                y={pos.y - cardH / 2}
                width={cardW}
                height={cardH}
                rx={10}
                fill="white"
                stroke={color}
                strokeWidth={2}
              />
              {/* Color accent bar */}
              <rect
                x={pos.x - cardW / 2}
                y={pos.y - cardH / 2}
                width={cardW}
                height={4}
                rx={2}
                fill={color}
              />
              {/* Name */}
              <text
                x={pos.x}
                y={pos.y - 4}
                textAnchor="middle"
                fontWeight="700"
                fontSize="13"
                fill="#1c1917"
              >
                {node.name}
              </text>
              {/* Description */}
              <text
                x={pos.x}
                y={pos.y + 15}
                textAnchor="middle"
                fontSize="10"
                fill="#78716c"
              >
                {node.description.length > 12 ? node.description.slice(0, 12) + '…' : node.description}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-stone-100">
        <p className="text-xs text-stone-400 mb-3">人物列表</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {nodes.map((node, i) => {
            const color = nodeColors[i % nodeColors.length];
            return (
              <div key={node.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div>
                  <span className="text-sm font-medium text-stone-700">{node.name}</span>
                  <span className="text-xs text-stone-400 ml-1">{node.description}</span>
                </div>
              </div>
            );
          })}
        </div>
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
            <input autoFocus value={bookName} onChange={e => setBookName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" placeholder="输入书名" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">作者</label>
            <input value={author} onChange={e => setAuthor(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" placeholder="选填" />
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
