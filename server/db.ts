import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// JSON file storage helpers
interface User { id: number; username: string; password_hash: string; created_at: string; }
interface BookshelfEntry {
  id: number; user_id: number; book_key: string; book_name: string;
  author: string; guide_data: string; status: string; review: string;
  with_sticky_notes: number; created_at: string; updated_at: string;
}
interface AnswerEntry {
  id: number; user_id: number; book_key: string;
  question_index: number; answer: string; created_at: string; updated_at: string;
}

function readJSON<T>(file: string, defaultVal: T): T {
  const fp = path.join(dataDir, file);
  if (!fs.existsSync(fp)) return defaultVal;
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); }
  catch { return defaultVal; }
}

function writeJSON(file: string, data: unknown): void {
  const fp = path.join(dataDir, file);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

let _userIdCounter = 1;
let _bookshelfIdCounter = 1;
let _answerIdCounter = 1;
let _oplogIdCounter = 1;

function loadCounters() {
  const users: User[] = readJSON('users.json', []);
  _userIdCounter = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const shelf: BookshelfEntry[] = readJSON('bookshelf.json', []);
  _bookshelfIdCounter = shelf.length > 0 ? Math.max(...shelf.map(b => b.id)) + 1 : 1;
  const answers: AnswerEntry[] = readJSON('answers.json', []);
  _answerIdCounter = answers.length > 0 ? Math.max(...answers.map(a => a.id)) + 1 : 1;
  const oplogs: OpLog[] = readJSON('oplogs.json', []);
  _oplogIdCounter = oplogs.length > 0 ? Math.max(...oplogs.map(o => o.id)) + 1 : 1;
}
loadCounters();

// --- Users ---
export function findUserByUsername(username: string): User | undefined {
  const users: User[] = readJSON('users.json', []);
  return users.find(u => u.username === username);
}

export function createUser(username: string, passwordHash: string): User {
  const users: User[] = readJSON('users.json', []);
  const user: User = {
    id: _userIdCounter++, username, password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };
  users.push(user);
  writeJSON('users.json', users);
  return user;
}

export function findUserById(id: number): User | undefined {
  const users: User[] = readJSON('users.json', []);
  return users.find(u => u.id === id);
}

// --- Bookshelf ---
export function getBookshelf(userId: number): BookshelfEntry[] {
  const shelf: BookshelfEntry[] = readJSON('bookshelf.json', []);
  return shelf.filter(b => b.user_id === userId).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function upsertBookshelf(entry: Partial<BookshelfEntry> & { user_id: number; book_key: string }): BookshelfEntry {
  const shelf: BookshelfEntry[] = readJSON('bookshelf.json', []);
  const idx = shelf.findIndex(b => b.user_id === entry.user_id && b.book_key === entry.book_key);
  const now = new Date().toISOString();
  if (idx >= 0) {
    const existing = shelf[idx];
    shelf[idx] = {
      ...existing,
      book_name: entry.book_name ?? existing.book_name,
      author: entry.author ?? existing.author,
      guide_data: entry.guide_data ?? existing.guide_data,
      status: entry.status ?? existing.status,
      review: entry.review ?? existing.review,
      with_sticky_notes: entry.with_sticky_notes ?? existing.with_sticky_notes,
      updated_at: now,
    };
    writeJSON('bookshelf.json', shelf);
    return shelf[idx];
  } else {
    const newEntry: BookshelfEntry = {
      id: _bookshelfIdCounter++,
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
    shelf.push(newEntry);
    writeJSON('bookshelf.json', shelf);
    return newEntry;
  }
}

export function updateBookshelfStatus(userId: number, bookKey: string, status: string, review: string): boolean {
  const shelf: BookshelfEntry[] = readJSON('bookshelf.json', []);
  const idx = shelf.findIndex(b => b.user_id === userId && b.book_key === bookKey);
  if (idx < 0) return false;
  shelf[idx].status = status;
  shelf[idx].review = review;
  shelf[idx].updated_at = new Date().toISOString();
  writeJSON('bookshelf.json', shelf);
  return true;
}

export function deleteBookshelfEntry(userId: number, id: number): boolean {
  let shelf: BookshelfEntry[] = readJSON('bookshelf.json', []);
  const before = shelf.length;
  shelf = shelf.filter(b => !(b.user_id === userId && b.id === id));
  if (shelf.length === before) return false;
  writeJSON('bookshelf.json', shelf);
  return true;
}

// --- Answers ---
export function getAnswers(userId: number, bookKey: string): Record<number, string> {
  const answers: AnswerEntry[] = readJSON('answers.json', []);
  const filtered = answers.filter(a => a.user_id === userId && a.book_key === bookKey);
  const result: Record<number, string> = {};
  for (const a of filtered) result[a.question_index] = a.answer;
  return result;
}

export function saveAnswers(userId: number, bookKey: string, answers: Record<number, string>): void {
  let all: AnswerEntry[] = readJSON('answers.json', []);
  const now = new Date().toISOString();
  for (const [qiStr, answer] of Object.entries(answers)) {
    const qi = parseInt(qiStr);
    const idx = all.findIndex(a => a.user_id === userId && a.book_key === bookKey && a.question_index === qi);
    if (idx >= 0) {
      all[idx].answer = answer;
      all[idx].updated_at = now;
    } else {
      all.push({ id: _answerIdCounter++, user_id: userId, book_key: bookKey, question_index: qi, answer, created_at: now, updated_at: now });
    }
  }
  writeJSON('answers.json', all);
}

// --- Operation Logs ---
export interface OpLog {
  id: number; username: string; action: string; target: string;
  detail: string; created_at: string;
}

export function logOperation(username: string, action: string, target: string, detail: string): void {
  const logs: OpLog[] = readJSON('oplogs.json', []);
  logs.push({
    id: ++_oplogIdCounter,
    username,
    action,
    target,
    detail,
    created_at: new Date().toISOString(),
  });
  // Keep last 500
  if (logs.length > 500) {
    logs.splice(0, logs.length - 500);
  }
  writeJSON('oplogs.json', logs);
}

export function getOpLogs(): OpLog[] {
  const logs: OpLog[] = readJSON('oplogs.json', []);
  return logs.sort((a, b) => b.id - a.id);
}

// --- Admin queries ---
export function getAllUsers(): User[] {
  const users: User[] = readJSON('users.json', []);
  return users.map(({ password_hash: _, ...rest }) => rest as User);
}
