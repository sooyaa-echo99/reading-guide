import { useState, FormEvent, useEffect } from 'react';
import { SearchParams } from '../types';
import { getHistory, clearHistory, deleteCacheEntry } from '../services/cache';

interface Props {
  onSearch: (params: SearchParams) => void;
  onSelectHistory: (params: SearchParams) => void;
}

interface HistoryItem {
  key: string;
  bookName: string;
  author: string;
  withStickyNotes: boolean;
  generatedAt: string;
}

export default function SearchPage({ onSearch, onSelectHistory }: Props) {
  const [bookName, setBookName] = useState('');
  const [author, setAuthor] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [withStickyNotes, setWithStickyNotes] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!bookName.trim()) return;
    onSearch({ bookName: bookName.trim(), author: author.trim() || undefined, withStickyNotes });
  };

  const handleHistoryClick = (item: HistoryItem) => {
    onSelectHistory({
      bookName: item.bookName,
      author: item.author || undefined,
      withStickyNotes: item.withStickyNotes,
    });
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const handleDeleteHistory = (key: string) => {
    deleteCacheEntry(key);
    setHistory(prev => prev.filter(h => h.key !== key));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="text-center max-w-md w-full">
          <h1 className="text-3xl font-bold text-stone-800 mb-3 tracking-tight">
            让每本书都值得被打开
          </h1>
          <p className="text-stone-400 leading-relaxed mb-10">
            输入你想读的书，获取历史背景、写作意图和无剧透的引导问题。
            带着理解开始阅读，而不是翻开才发现读不懂。
          </p>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto">
            <div className="mb-3">
              <input
                type="text"
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder="输入书名，如《百年孤独》"
                className="w-full px-5 py-3.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50 transition-all text-base"
                autoFocus
              />
            </div>
            <div className="mb-5">
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="作者（可选），如 加西亚·马尔克斯"
                className="w-full px-5 py-3.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50 transition-all text-base"
              />
            </div>

            {/* Sticky notes toggle */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setWithStickyNotes(!withStickyNotes)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer text-left ${
                  withStickyNotes
                    ? 'border-amber-300 bg-amber-50/80 shadow-sm'
                    : 'border-stone-100 bg-white hover:border-stone-200'
                }`}
              >
                <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  withStickyNotes ? 'bg-amber-400' : 'bg-stone-200'
                }`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    withStickyNotes ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    索引贴分类
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    按主题分类生成阅读索引卡片
                  </p>
                </div>
              </button>
            </div>

            <button
              type="submit"
              disabled={!bookName.trim()}
              className="w-full py-3.5 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-all cursor-pointer text-base"
            >
              生成阅读指南
            </button>
          </form>

          {/* History */}
          {history.length > 0 && (
            <div className="mt-10 text-left w-full max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  历史查询
                </h2>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-stone-300 hover:text-red-400 transition-colors cursor-pointer"
                >
                  清空记录
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {history.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-stone-100 bg-white hover:border-amber-200 hover:bg-amber-50/50 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-stone-700 font-medium text-sm truncate">
                          {item.bookName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 ml-6">
                        {item.author && (
                          <span className="text-xs text-stone-400 truncate">{item.author}</span>
                        )}
                        {item.withStickyNotes && (
                          <span className="text-xs text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">索引贴</span>
                        )}
                        <span className="text-xs text-stone-300">
                          {new Date(item.generatedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(item.key);
                        }}
                        className="p-1 rounded-md text-stone-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="删除此记录"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <svg className="w-4 h-4 text-stone-300 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-stone-300 mt-5">
            由 DeepSeek AI 即时生成 · 不涉及任何剧透
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-stone-300">
        阅读指南 — 带着问题去读，收获更多理解
      </footer>
    </div>
  );
}
