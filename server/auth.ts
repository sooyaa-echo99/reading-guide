import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  findUserByUsername, createUser, findUserById, logOperation,
} from '../server/db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'reading-guide-secret-2026';
const TOKEN_EXPIRY = '30d';

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    res.status(400).json({ error: '用户名需 2-20 个字符' });
    return;
  }

  if (password.length < 4) {
    res.status(400).json({ error: '密码至少 4 位' });
    return;
  }

  // Unique check
  const existing = findUserByUsername(trimmed);
  if (existing) {
    res.status(409).json({ error: '用户名已被注册' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const user = createUser(trimmed, hash);
  const token = jwt.sign({ userId: user.id, username: trimmed }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  logOperation(trimmed, 'register', trimmed, '新用户注册');

  res.json({ token, username: trimmed, userId: user.id });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const user = findUserByUsername(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  logOperation(user.username, 'login', user.username, '用户登录');
  res.json({ token, username: user.username, userId: user.id });
});

// Auth middleware
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '请先登录' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    (req as any).userId = payload.userId;
    (req as any).username = payload.username;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export default router;
