/**
 * One-time migration: set attemptNumber for attempts created before multi-attempt support.
 * Run: node src/scripts/migrateAttemptNumbers.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Attempt } from '../models/Attempt.js';

dotenv.config();

async function migrate() {
  await connectDb();
  const all = await Attempt.find().sort({ submittedAt: 1 }).lean();
  let currentKey = null;
  let n = 0;
  for (const doc of all) {
    const key = `${doc.userId}-${doc.quizId}`;
    if (key !== currentKey) {
      currentKey = key;
      n = 0;
    }
    n += 1;
    if (doc.attemptNumber !== n) {
      await Attempt.updateOne({ _id: doc._id }, { $set: { attemptNumber: n } });
    }
  }
  console.log(`Migration finished. Processed ${all.length} attempt(s).`);
  await mongoose.disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
