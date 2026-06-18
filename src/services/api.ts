import { BookGuide } from '../types';

// ========== JWT Token helpers ==========
const LS_TOKEN = 'rg-token';
const LS_USERNAME = 'rg-username';

function getToken(): string {
  return localStorage.getItem(LS_TOKEN) || '';
}

function setSession(token: string, username: string) {
  localStorage.setItem(LS_TOKEN, token);
  localStorage.setItem(LS_USERNAME, username);
}

function clearSession() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USERNAME);
}

// ========== Fetch wrapper ==========
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `请求失败 (${res.status})` }));
    if (res.status === 401) {
      clearSession();
      window.location.reload();
      throw new Error(body.error || '登录已过期');
    }
    throw new Error(body.error || `请求失败 (${res.status})`);
  }

  return res.json();
}

// ========== Auth API ==========
export interface AuthResult { username: string; token?: string; }

export async function registerApi(username: string, password: string): Promise<AuthResult> {
  const data = await apiFetch<{ token: string; username: string; userId: number }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setSession(data.token, data.username);
  return { username: data.username, token: data.token };
}

export async function loginApi(username: string, password: string): Promise<AuthResult> {
  const data = await apiFetch<{ token: string; username: string; userId: number }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setSession(data.token, data.username);
  return { username: data.username, token: data.token };
}

export function logoutApi() {
  clearSession();
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function getCurrentUsername(): string {
  return localStorage.getItem(LS_USERNAME) || '';
}

// ========== Book Guide API (via backend proxy) ==========
export async function generateBookGuide(
  bookName: string,
  author?: string,
  withStickyNotes?: boolean
): Promise<BookGuide> {
  return apiFetch<BookGuide>('/api/generate', {
    method: 'POST',
    body: JSON.stringify({ bookName, author, withStickyNotes }),
  });
}

// ========== Bookshelf API ==========
export interface BookshelfEntry {
  id: number;
  bookKey: string;
  bookName: string;
  author: string;
  status: 'unread' | 'read';
  shortReview: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  guideData?: string;
}

export async function fetchBookshelf(status?: 'unread' | 'read'): Promise<BookshelfEntry[]> {
  const rows: any[] = await apiFetch('/api/bookshelf');
  const entries: BookshelfEntry[] = rows.map(r => ({
    id: r.id,
    bookKey: r.book_key,
    bookName: r.book_name,
    author: r.author || '',
    status: r.status,
    shortReview: r.review || '',
    rating: 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    guideData: r.guide_data,
  }));
  return status ? entries.filter(e => e.status === status) : entries;
}

export async function addToBookshelf(params: {
  bookName: string; author?: string; status?: 'unread' | 'read';
  shortReview?: string; rating?: number;
  guideData?: BookGuide; withStickyNotes?: boolean;
}): Promise<BookshelfEntry> {
  const bookKey = params.bookName + (params.author ? `||${params.author}` : '');
  const data = await apiFetch<{ id: number; status: string; message: string }>('/api/bookshelf/add', {
    method: 'POST',
    body: JSON.stringify({
      bookKey,
      bookName: params.bookName,
      author: params.author || '',
      guideData: params.guideData || {},
      withStickyNotes: params.withStickyNotes || false,
    }),
  });

  // If marked as read, call move-to-read
  if (params.status === 'read' && params.shortReview) {
    await apiFetch('/api/bookshelf/move-to-read', {
      method: 'POST',
      body: JSON.stringify({ bookKey, review: params.shortReview }),
    });
  }

  return {
    id: data.id,
    bookKey,
    bookName: params.bookName,
    author: params.author || '',
    status: params.status || 'unread',
    shortReview: params.shortReview || '',
    rating: params.rating || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    guideData: params.guideData ? JSON.stringify(params.guideData) : undefined,
  };
}

export async function updateBookshelfStatus(id: number, status: 'unread' | 'read', shortReview?: string): Promise<void> {
  // For status changes, we need the bookKey. We fetch the shelf first to find it.
  const shelf = await fetchBookshelf();
  const entry = shelf.find(e => e.id === id);
  if (!entry) throw new Error('未找到该书');

  if (status === 'read') {
    await apiFetch('/api/bookshelf/move-to-read', {
      method: 'POST',
      body: JSON.stringify({ bookKey: entry.bookKey, review: shortReview || '' }),
    });
  }
}

export async function deleteBookshelfEntry(id: number): Promise<void> {
  await apiFetch(`/api/bookshelf/${id}`, { method: 'DELETE' });
}

// ========== Answers API ==========
export interface Answer {
  id: number; bookName: string; author: string;
  questionIndex: number; questionText: string; answerText: string; createdAt: string;
}

export async function fetchAnswers(bookName: string, author?: string): Promise<Answer[]> {
  const bookKey = bookName + (author ? `||${author}` : '');
  const data: Record<number, string> = await apiFetch(`/api/answers/${encodeURIComponent(bookKey)}`);
  return Object.entries(data).map(([qi, text]) => ({
    id: Date.now() + parseInt(qi),
    bookName,
    author: author || '',
    questionIndex: parseInt(qi),
    questionText: '',
    answerText: text,
    createdAt: new Date().toISOString(),
  }));
}

export async function submitAnswer(params: {
  bookName: string; author?: string; questionIndex: number; questionText: string; answerText: string;
}): Promise<Answer> {
  const bookKey = params.bookName + (params.author ? `||${params.author}` : '');
  await apiFetch(`/api/answers/${encodeURIComponent(bookKey)}`, {
    method: 'PUT',
    body: JSON.stringify({ answers: { [params.questionIndex]: params.answerText } }),
  });
  return {
    id: Date.now(),
    bookName: params.bookName,
    author: params.author || '',
    questionIndex: params.questionIndex,
    questionText: params.questionText,
    answerText: params.answerText,
    createdAt: new Date().toISOString(),
  };
}

// ========== Operation Logs (admin) ==========
export interface OpLog {
  id: number;
  username: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export async function fetchOpLogs(): Promise<OpLog[]> {
  const data: any[] = await apiFetch('/api/admin/logs');
  return data.map(l => ({
    id: l.id,
    username: l.username,
    action: l.action,
    target: l.target,
    detail: l.detail,
    createdAt: l.created_at,
  }));
}

export interface StoredUser { username: string; passwordHash?: string; createdAt: string; }

export async function fetchAllUsers(): Promise<StoredUser[]> {
  const data: any[] = await apiFetch('/api/admin/users');
  return data.map(u => ({
    username: u.username,
    createdAt: u.created_at,
  }));
}

// ========== Export / Import (client-side, exports from server data) ==========
export interface AppSnapshot { version: 1; exportedAt: string; data: Record<string, string>; }

export async function exportAllData(): Promise<AppSnapshot> {
  const username = getCurrentUsername();
  if (!username) throw new Error('未登录');

  const snapshot: AppSnapshot = { version: 1, exportedAt: new Date().toISOString(), data: {} };

  // Fetch bookshelf
  const shelf = await fetchBookshelf();
  snapshot.data['bookshelf'] = JSON.stringify(shelf);

  // Fetch answers (we need to iterate known books)
  const answerKeys = new Set<string>();
  shelf.forEach(e => answerKeys.add(e.bookKey));

  const answers: Record<string, string> = {};
  for (const bk of answerKeys) {
    const [bookName, author] = bk.split('||');
    const ans = await fetchAnswers(bookName, author);
    if (ans.length > 0) {
      answers[bk] = JSON.stringify(ans);
    }
  }
  snapshot.data['answers'] = JSON.stringify(answers);

  return snapshot;
}

export async function importAllData(snapshot: AppSnapshot): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  // Import bookshelf items
  if (snapshot.data['bookshelf']) {
    try {
      const items = JSON.parse(snapshot.data['bookshelf']);
      if (Array.isArray(items)) {
        for (const item of items) {
          try {
            await addToBookshelf({
              bookName: item.bookName || item.book_name || '',
              author: item.author || '',
              status: item.status || 'unread',
              shortReview: item.shortReview || '',
              guideData: item.guideData ? (typeof item.guideData === 'string' ? JSON.parse(item.guideData) : item.guideData) : undefined,
            });
            imported++;
          } catch {
            skipped++;
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Import answers
  if (snapshot.data['answers']) {
    try {
      const answersMap = JSON.parse(snapshot.data['answers']);
      for (const [bk, answers] of Object.entries(answersMap)) {
        try {
          const ans = answers as any[];
          if (ans.length === 0) continue;
          const answersObj: Record<number, string> = {};
          ans.forEach((a: any) => {
            answersObj[a.questionIndex] = a.answerText;
          });
          const [bookName, author] = bk.split('||');
          await submitAnswer({
            bookName: bookName || bk,
            author: author || '',
            questionIndex: 0,
            questionText: '',
            answerText: '',
          });
          // Batch submit
          const bookKey = bookName + (author ? `||${author}` : '');
          // Use direct API for batch answer import
          const token = getToken();
          await fetch(`/api/answers/${encodeURIComponent(bookKey)}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ answers: answersObj }),
          });
          imported++;
        } catch {
          skipped++;
        }
      }
    } catch { /* ignore */ }
  }

  return { imported, skipped };
}
