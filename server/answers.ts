import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.js';
import {
  getAnswers, saveAnswers, logOperation,
} from './db.js';

const router = Router();
router.use(authMiddleware);

// GET /api/answers/:bookKey - get user's answers for a book
router.get('/:bookKey', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { bookKey } = req.params;

  const answers = await getAnswers(userId, bookKey);
  res.json(answers);
});

// PUT /api/answers/:bookKey - save answers for a book
router.put('/:bookKey', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const username = (req as any).username;
  const { bookKey } = req.params;
  const { answers } = req.body;

  if (!answers || typeof answers !== 'object') {
    res.status(400).json({ error: '缺少回答数据' });
    return;
  }

  await saveAnswers(userId, bookKey, answers);
  await logOperation(username, 'answer_submit', bookKey, `提交了 ${Object.keys(answers).length} 个问答`);
  res.json({ message: '回答已保存' });
});

export default router;
