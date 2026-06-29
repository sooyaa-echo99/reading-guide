import express from 'express';
import cors from 'cors';
import authRoutes from './auth.js';
import bookshelfRoutes from './bookshelf.js';
import answersRoutes from './answers.js';
import apiRoutes from './api.js';
import adminRoutes from './admin.js';
import { initDB } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bookshelf', bookshelfRoutes);
app.use('/api/answers', answersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Initialize DB then start server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Reading Guide server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

export default app;
