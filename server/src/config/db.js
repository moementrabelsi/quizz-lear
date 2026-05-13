import mongoose from 'mongoose';
import { Attempt } from '../models/Attempt.js';

const LEGACY_ATTEMPT_UNIQUE_INDEX = 'userId_1_quizId_1';

function isIndexNotFoundError(err) {
  if (!err) return false;
  if (err.code === 27 || err.code === 26 || err.codeName === 'IndexNotFound') return true;
  const msg = String(err.message ?? '');
  return /index not found|ns not found/i.test(msg);
}

/** Older builds used a unique compound index; retries require a non-unique index instead. */
async function migrateAttemptsIndexes() {
  const coll = mongoose.connection.collection('attempts');
  try {
    await coll.dropIndex(LEGACY_ATTEMPT_UNIQUE_INDEX);
    console.info(
      `[db] Dropped legacy unique index attempts.${LEGACY_ATTEMPT_UNIQUE_INDEX} (multiple attempts per user/quiz enabled).`
    );
  } catch (err) {
    if (!isIndexNotFoundError(err)) {
      console.warn('[db] Legacy attempts index drop:', err.message || err);
    }
  }
  try {
    await Attempt.syncIndexes();
  } catch (err) {
    console.warn('[db] Attempt.syncIndexes():', err.message || err);
  }
}

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  await migrateAttemptsIndexes();
}
