import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';

dotenv.config();

const SAMPLE_VIDEO =
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

async function seed() {
  await connectDb();
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@lear.com').toLowerCase();

  await User.findOneAndUpdate(
    { email: adminEmail },
    { email: adminEmail, role: 'admin', verified: true },
    { upsert: true, new: true }
  );

  let quiz = await Quiz.findOne({ title: 'Annual Compliance Awareness' });
  if (!quiz) {
    quiz = await Quiz.create({
      title: 'Annual Compliance Awareness',
      description:
        'Complete the training video and assessment. You must score at least the passing threshold to complete this module.',
      videoUrl: SAMPLE_VIDEO,
      materialPdfUrl: '/materials/safe-driving-2026.pdf',
      passingScore: 70,
      duration: 900,
      active: true,
    });
  } else {
    quiz.videoUrl = quiz.videoUrl || SAMPLE_VIDEO;
    quiz.materialPdfUrl =
      quiz.materialPdfUrl || '/materials/safe-driving-2026.pdf';
    quiz.active = true;
    quiz.passingScore = quiz.passingScore || 70;
    quiz.duration = quiz.duration || 900;
    await quiz.save();
    await Quiz.updateMany({ _id: { $ne: quiz._id } }, { active: false });
  }

  const existingCount = await Question.countDocuments({ quizId: quiz._id });
  if (existingCount === 0) {
    await Question.insertMany([
      {
        quizId: quiz._id,
        question: 'What is the primary goal of internal compliance training?',
        options: [
          'To replace managerial oversight',
          'To align employee behavior with company policies and regulations',
          'To reduce the need for documentation',
          'To delegate legal responsibility to individuals',
        ],
        correctAnswer: 1,
      },
      {
        quizId: quiz._id,
        question: 'When should a potential policy violation be reported?',
        options: [
          'Only if it affects your department',
          'Only at the annual review',
          'As soon as you become aware, through the appropriate channels',
          'After confirming with external counsel only',
        ],
        correctAnswer: 2,
      },
      {
        quizId: quiz._id,
        question: 'Which practice best protects confidential company information?',
        options: [
          'Sharing credentials when workloads are high',
          'Storing files only on unencrypted personal devices',
          'Following access controls and data classification guidelines',
          'Discussing sensitive topics in public channels for speed',
        ],
        correctAnswer: 2,
      },
      {
        quizId: quiz._id,
        question: 'Lear training assessments allow how many attempts per employee?',
        options: ['Unlimited', 'Three attempts', 'One attempt', 'Two attempts'],
        correctAnswer: 2,
      },
      {
        quizId: quiz._id,
        question: 'A strong password policy typically includes:',
        options: [
          'Short passwords for memorability',
          'Reuse across systems for convenience',
          'Length, complexity, and periodic rotation requirements',
          'Sharing with trusted colleagues',
        ],
        correctAnswer: 2,
      },
    ]);
  }

  console.log('Seed complete.');
  console.log(`Admin user: ${adminEmail} (sign in with OTP like any employee)`);
  console.log(`Sample quiz: ${quiz.title} (${quiz._id})`);
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
