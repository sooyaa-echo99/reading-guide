import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth.js';
import { getAllUsers, getOpLogs } from './db.js';

const router = Router();
router.use(authMiddleware);

// Admin-only middleware
function adminOnly(req: Request, res: Response, next: NextFunction) {
  const username = (req as any).username;
  if (username !== 'echo') {
    res.status(403).json({ error: '仅管理员可访问' });
    return;
  }
  next();
}

// GET /api/admin/users - list all users
router.get('/users', adminOnly, (_req: Request, res: Response) => {
  const users = getAllUsers();
  res.json(users);
});

// GET /api/admin/logs - list all operation logs
router.get('/logs', adminOnly, (_req: Request, res: Response) => {
  const logs = getOpLogs();
  res.json(logs);
});

export default router;
