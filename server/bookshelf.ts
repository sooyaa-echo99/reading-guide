import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.js';
import {
  getBookshelf, upsertBookshelf, updateBookshelfStatus, deleteBookshelfEntry,
  logOperation,
} from '../server/db.js';

const router = Router();
router.use(authMiddleware);

// GET /api/bookshelf - list user's bookshelf
router.get('/', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const rows = getBookshelf(userId);
  res.json(rows);
});

// POST /api/bookshelf/add - add book to unread shelf
router.post('/add', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const username = (req as any).username;
  const { bookKey, bookName, author, guideData, withStickyNotes } = req.body;

  if (!bookKey || !bookName) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  const result = upsertBookshelf({
    user_id: userId,
    book_key: bookKey,
    book_name: bookName,
    author: author || '',
    guide_data: JSON.stringify(guideData || {}),
    with_sticky_notes: withStickyNotes ? 1 : 0,
  });

  logOperation(username, 'bookshelf_add', bookName, result.status === 'unread' ? '加入未读书架' : '更新书架');
  res.json({ id: result.id, status: result.status, message: '已更新书架' });
});

// POST /api/bookshelf/move-to-read - move to read with review
router.post('/move-to-read', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const username = (req as any).username;
  const { bookKey, review } = req.body;

  if (!bookKey) {
    res.status(400).json({ error: '缺少书籍标识' });
    return;
  }

  if (!review || review.trim().length === 0) {
    res.status(400).json({ error: '短评不能为空' });
    return;
  }

  const ok = updateBookshelfStatus(userId, bookKey, 'read', review.trim());
  if (!ok) {
    res.status(404).json({ error: '书架上未找到该书' });
    return;
  }

  logOperation(username, 'mark_read', bookKey, `已读: ${review.trim()}`);
  res.json({ message: '已移入已读书架' });
});

// DELETE /api/bookshelf/:id - remove from shelf
router.delete('/:id', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const username = (req as any).username;
  const { id } = req.params;

  const ok = deleteBookshelfEntry(userId, parseInt(id));
  if (!ok) {
    res.status(404).json({ error: '未找到该书' });
    return;
  }

  logOperation(username, 'delete', `id:${id}`, '从书架删除');
  res.json({ message: '已从书架移除' });
});

export default router;
