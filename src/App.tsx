import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SearchPage from './components/SearchPage';
import ResultPage from './components/ResultPage';
import BookshelfPage from './components/BookshelfPage';
import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AdminUsersPage from './components/AdminUsersPage';
import AdminLogsPage from './components/AdminLogsPage';
import type { BookGuide, SearchParams } from './types';
import { generateBookGuide } from './services/api';
import { getCached, setCache, getCachedByKey } from './services/cache';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { username, loading } = useAuth();
  if (loading) return <div className="min-h-[80vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" /></div>;
  if (!username) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { username } = useAuth();
  if (username !== 'echo') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppContent() {
  const [state, setState] = useState<'search' | 'loading' | 'result' | 'error'>('search');
  const [guide, setGuide] = useState<BookGuide | null>(null);
  const [error, setError] = useState('');
  const [lastSearch, setLastSearch] = useState<SearchParams | null>(null);
  const { username, logout } = useAuth();

  const handleSearch = useCallback(async (params: SearchParams) => {
    setState('loading'); setError('');
    try {
      const result = await generateBookGuide(params.bookName, params.author, params.withStickyNotes);
      setGuide(result);
      setCache(params.bookName, params.author, result, params.withStickyNotes);
      setState('result');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '生成失败');
      setState('error');
    }
  }, []);

  const handleBack = useCallback(() => { setState('search'); setGuide(null); setError(''); }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-stone-100">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-base font-bold text-stone-800 no-underline">阅读指南</Link>
          <div className="flex items-center gap-3">
            <Link to="/settings" className="text-xs text-stone-500 hover:text-amber-600 transition-colors no-underline">设置</Link>
            <Link to="/bookshelf" className="text-xs text-stone-500 hover:text-amber-600 transition-colors no-underline">我的书架</Link>
            {username === 'echo' && (
              <Link to="/admin/users" className="text-xs text-amber-500 hover:text-amber-700 transition-colors no-underline font-medium">管理</Link>
            )}
            <span className="text-xs text-stone-400">{username}</span>
            <button onClick={logout} className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer bg-transparent border-none">退出</button>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            {state === 'search' && (
              <SearchPage
                onSearch={handleSearch}
                onSelectHistory={(params) => {
                  const key = params.bookName + (params.author ? `||${params.author}` : '') + (params.withStickyNotes ? '||sticky' : '');
                  const cached = getCachedByKey(key);
                  if (cached) { setGuide(cached); setLastSearch(params); setState('result'); }
                  else handleSearch(params);
                }}
              />
            )}
            {state === 'loading' && <LoadingPage bookName={lastSearch?.bookName || ''} />}
            {state === 'result' && guide && <ResultPage guide={guide} onBack={handleBack} />}
            {state === 'error' && <ErrorPage error={error} onRetry={() => lastSearch && handleSearch(lastSearch)} onBack={handleBack} />}
          </ProtectedRoute>
        } />
        <Route path="/bookshelf" element={<ProtectedRoute><BookshelfPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={
          <ProtectedRoute>
            <AdminOnly><AdminUsersPage /></AdminOnly>
          </ProtectedRoute>
        } />
        <Route path="/admin/logs" element={
          <ProtectedRoute>
            <AdminOnly><AdminLogsPage /></AdminOnly>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/reading-guide">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoadingPage({ bookName }: { bookName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="animate-spin w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full mb-6" />
      <h2 className="text-lg font-medium text-stone-700 mb-2">正在生成阅读指南</h2>
      <p className="text-stone-400">正在分析《{bookName}》...</p>
    </div>
  );
}

function ErrorPage({ error, onRetry, onBack }: { error: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="text-5xl mb-4">😞</div>
      <h2 className="text-lg font-medium text-stone-700 mb-2">生成失败</h2>
      <p className="text-stone-400 text-center max-w-sm mb-6">{error}</p>
      <div className="flex gap-3">
        <button onClick={onBack} className="px-5 py-2 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 cursor-pointer transition-colors">返回</button>
        <button onClick={onRetry} className="px-5 py-2 rounded-lg bg-stone-800 text-white hover:bg-stone-700 cursor-pointer transition-colors">重试</button>
      </div>
    </div>
  );
}
