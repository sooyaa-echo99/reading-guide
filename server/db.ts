import pg from 'pg';

const { Pool } = pg;

// Support both DATABASE_URL (Render style) and individual vars
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'reading_guide',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
      }
);

// Exported for use in index.ts
export async function initDB(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bookshelf (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_key TEXT NOT NULL,
      book_name TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      guide_data TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'unread',
      review TEXT NOT NULL DEFAULT '',
      with_sticky_notes INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, book_key)
    );

    CREATE TABLE IF NOT EXISTS answers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_key TEXT NOT NULL,
      question_index INTEGER NOT NULL,
      answer TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, book_key, question_index)
    );

    CREATE TABLE IF NOT EXISTS oplogs (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Database tables initialized');
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

// ---- Users ----
export async function findUserByUsername(username: string): Promise<User | undefined> {
  const { rows } = await pool.query<User>(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return rows[0];
}

export async function createUser(username: string, passwordHash: string): Promise<User> {
  const { rows } = await pool.query<User>(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
    [username, passwordHash]
  );
  return rows[0];
}

export async function findUserById(id: number): Promise<User | undefined> {
  const { rows } = await pool.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return rows[0];
}

export async function getAllUsers(): Promise<Omit<User, 'password_hash'>[]> {
  const { rows } = await pool.query(
    'SELECT id, username, created_at FROM users ORDER BY id'
  );
  return rows;
}

// ---- Bookshelf ----
export async function getBookshelf(userId: number): Promise<BookshelfEntry[]> {
  const { rows } = await pool.query<BookshelfEntry>(
    'SELECT * FROM bookshelf WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  return rows;
}

export async function upsertBookshelf(
  entry: Partial<BookshelfEntry> & { user_id: number; book_key: string }
): Promise<BookshelfEntry> {
  const { rows } = await pool.query<BookshelfEntry>(
    `INSERT INTO bookshelf
       (user_id, book_key, book_name, author, guide_data, status, review, with_sticky_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, book_key) DO UPDATE SET
       book_name = EXCLUDED.book_name,
       author = EXCLUDED.author,
       guide_data = EXCLUDED.guide_data,
       with_sticky_notes = EXCLUDED.with_sticky_notes,
       updated_at = NOW()
     RETURNING *`,
    [
      entry.user_id,
      entry.book_key,
      entry.book_name || '',
      entry.author || '',
      entry.guide_data || '{}',
      entry.status || 'unread',
      entry.review || '',
      entry.with_sticky_notes ?? 0,
    ]
  );
  return rows[0];
}

export async function updateBookshelfStatus(
  userId: number, bookKey: string, status: string, review: string
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE bookshelf SET status = $1, review = $2, updated_at = NOW()
     WHERE user_id = $3 AND book_key = $4`,
    [status, review, userId, bookKey]
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteBookshelfEntry(userId: number, id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM bookshelf WHERE user_id = $1 AND id = $2',
    [userId, id]
  );
  return (rowCount ?? 0) > 0;
}

// ---- Answers ----
export async function getAnswers(userId: number, bookKey: string): Promise<Record<number, string>> {
  const { rows } = await pool.query(
    'SELECT question_index, answer FROM answers WHERE user_id = $1 AND book_key = $2',
    [userId, bookKey]
  );
  const result: Record<number, string> = {};
  for (const row of rows) result[row.question_index] = row.answer;
  return result;
}

export async function saveAnswers(
  userId: number, bookKey: string, answers: Record<number, string>
): Promise<void> {
  for (const [qiStr, answer] of Object.entries(answers)) {
    await pool.query(
      `INSERT INTO answers (user_id, book_key, question_index, answer)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, book_key, question_index) DO UPDATE
       SET answer = EXCLUDED.answer, updated_at = NOW()`,
      [userId, bookKey, parseInt(qiStr), answer]
    );
  }
}

// ---- Operation Logs ----
export async function logOperation(
  username: string, action: string, target: string, detail: string
): Promise<void> {
  await pool.query(
    'INSERT INTO oplogs (username, action, target, detail) VALUES ($1, $2, $3, $4)',
    [username, action, target, detail]
  );
  // Keep only last 500 logs
  await pool.query(`
    DELETE FROM oplogs WHERE id NOT IN (
      SELECT id FROM oplogs ORDER BY id DESC LIMIT 500
    )
  `);
}

export async function getOpLogs(): Promise<OpLog[]> {
  const { rows } = await pool.query<OpLog>(
    'SELECT * FROM oplogs ORDER BY id DESC'
  );
  return rows;
}
