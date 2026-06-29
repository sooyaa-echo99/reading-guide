import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON<T>(file: string, fallback: T): T {
  const fp = path.join(DATA_DIR, file);
  try {
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch { /* corrupted file, use fallback */ }
  return fallback;
}

function writeJSON(file: string, data: any) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// ---- Type definitions (exported for shared use) ----
export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface BookshelfEntry {
  id: number;
  user_id: number;
  book_key: string;
  book_name: string;
  author: string;
  guide_data: string;
  status: string;
  review: string;
  with_sticky_notes: number;
  created_at: string;
  updated_at: string;
}

export interface OpLog {
  id: number;
  username: string;
  action: string;
  target: string;
  detail: string;
  created_at: string;
}

// ---- Init ----
export async function initDB(): Promise<void> {
  ensureDir();
  console.log('JSON file storage initialized (data/)');
}

// ---- Users ----
export async function findUserByUsername(username: string): Promise<User | undefined> {
  const users: User[] = readJSON('users.json', []);
  return users.find(u => u.username === username);
}

export async function createUser(username: string, passwordHash: string): Promise<User> {
  const users: User[] = readJSON('users.json', []);
  const maxId = users.reduce((m, u) => Math.max(m, u.id), 0);
  const user: User = {
    id: maxId + 1,
    username,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };
  users.push(user);
  writeJSON('users.json', users);
  return user;
}

export async function findUserById(id: number): Promise<User | undefined> {
  const users: User[] = readJSON('users.json', []);
  return users.find(u => u.id === id);
}

export async function getAllUsers(): Promise<Omit<User, 'password_hash'>[]> {
  const users: User[] = readJSON('users.json', []);
  return users.map(({ password_hash: _ph, ...rest }) => rest);
}

// ---- Bookshelf ----
export async function getBookshelf(userId: number): Promise<BookshelfEntry[]> {
  const all: BookshelfEntry[] = readJSON('bookshelf.json', []);
  return all
    .filter(e => e.user_id === userId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function upsertBookshelf(
  entry: Partial<BookshelfEntry> & { user_id: number; book_key: string }
): Promise<BookshelfEntry> {
  const all: BookshelfEntry[] = readJSON('bookshelf.json', []);
  const existing = all.find(e => e.user_id === entry.user_id && e.book_key === entry.book_key);
  const now = new Date().toISOString();

  if (existing) {
    existing.book_name = entry.book_name || existing.book_name;
    existing.author = entry.author || existing.author;
    existing.guide_data = entry.guide_data || existing.guide_data;
    existing.with_sticky_notes = entry.with_sticky_notes ?? existing.with_sticky_notes;
    existing.updated_at = now;
    writeJSON('bookshelf.json', all);
    return existing;
  }

  const maxId = all.reduce((m, e) => Math.max(m, e.id), 0);
  const newEntry: BookshelfEntry = {
    id: maxId + 1,
    user_id: entry.user_id,
    book_key: entry.book_key,
    book_name: entry.book_name || '',
    author: entry.author || '',
    guide_data: entry.guide_data || '{}',
    status: entry.status || 'unread',
    review: entry.review || '',
    with_sticky_notes: entry.with_sticky_notes ?? 0,
    created_at: now,
    updated_at: now,
  };
  all.push(newEntry);
  writeJSON('bookshelf.json', all);
  return newEntry;
}

export async function updateBookshelfStatus(
  userId: number, bookKey: string, status: string, review: string
): Promise<boolean> {
  const all: BookshelfEntry[] = readJSON('bookshelf.json', []);
  const entry = all.find(e => e.user_id === userId && e.book_key === bookKey);
  if (!entry) return false;
  entry.status = status;
  entry.review = review;
  entry.updated_at = new Date().toISOString();
  writeJSON('bookshelf.json', all);
  return true;
}

export async function deleteBookshelfEntry(userId: number, id: number): Promise<boolean> {
  const all: BookshelfEntry[] = readJSON('bookshelf.json', []);
  const idx = all.findIndex(e => e.user_id === userId && e.id === id);
  if (idx === -1) return false;
  all.splice(idx, 1);
  writeJSON('bookshelf.json', all);
  return true;
}

// ---- Answers ----
interface AnswerRow {
  user_id: number;
  book_key: string;
  question_index: number;
  answer: string;
}

export async function getAnswers(userId: number, bookKey: string): Promise<Record<number, string>> {
  const all: AnswerRow[] = readJSON('answers.json', []);
  const result: Record<number, string> = {};
  for (const a of all) {
    if (a.user_id === userId && a.book_key === bookKey) {
      result[a.question_index] = a.answer;
    }
  }
  return result;
}

export async function saveAnswers(
  userId: number, bookKey: string, answers: Record<number, string>
): Promise<void> {
  const all: AnswerRow[] = readJSON('answers.json', []);
  for (const [qiStr, answer] of Object.entries(answers)) {
    const qi = parseInt(qiStr);
    const idx = all.findIndex(
      a => a.user_id === userId && a.book_key === bookKey && a.question_index === qi
    );
    if (idx >= 0) {
      all[idx].answer = answer;
    } else {
      all.push({ user_id: userId, book_key: bookKey, question_index: qi, answer });
    }
  }
  writeJSON('answers.json', all);
}

// ---- Operation Logs ----
export async function logOperation(
  username: string, action: string, target: string, detail: string
): Promise<void> {
  let logs: OpLog[] = readJSON('oplogs.json', []);
  const maxId = logs.reduce((m, l) => Math.max(m, l.id), 0);
  logs.push({
    id: maxId + 1,
    username,
    action,
    target,
    detail,
    created_at: new Date().toISOString(),
  });
  // Keep only last 500 logs
  if (logs.length > 500) logs = logs.slice(-500);
  writeJSON('oplogs.json', logs);
}

export async function getOpLogs(): Promise<OpLog[]> {
  const logs: OpLog[] = readJSON('oplogs.json', []);
  return logs.sort((a, b) => b.id - a.id);
}
