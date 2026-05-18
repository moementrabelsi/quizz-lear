import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { connectDb } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

function parseClientOrigins() {
  const raw = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

const allowedOrigins = parseClientOrigins();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/training', quizRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

await connectDb();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lear training API listening on port ${PORT}`);
});
