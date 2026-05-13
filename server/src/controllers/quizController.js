import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';

function sanitizeQuestions(docs) {
  return docs.map((q) => ({
    id: q._id,
    question: q.question,
    options: q.options,
  }));
}

export async function getActiveQuizBundle(req, res) {
  const quiz = await Quiz.findOne({ active: true }).sort({ updatedAt: -1 });
  if (!quiz) {
    return res.status(404).json({ message: 'No active training quiz is available.' });
  }

  const questions = await Question.find({ quizId: quiz._id }).sort({ createdAt: 1 });

  return res.json({
    quiz: {
      id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      videoUrl: quiz.videoUrl,
      materialPdfUrl: quiz.materialPdfUrl || '',
      passingScore: quiz.passingScore,
      duration: quiz.duration,
    },
    questions: sanitizeQuestions(questions),
  });
}

export async function submitAttempt(req, res) {
  const { quizId, answers } = req.body;
  if (!mongoose.Types.ObjectId.isValid(quizId)) {
    return res.status(400).json({ message: 'Invalid quiz id' });
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz || !quiz.active) {
    return res.status(400).json({ message: 'Quiz is not available.' });
  }

  const alreadyPassed = await Attempt.findOne({
    userId: req.user._id,
    quizId: quiz._id,
    passed: true,
  });
  if (alreadyPassed) {
    return res.status(409).json({
      message: 'You have already passed this assessment. No further attempts are required.',
    });
  }

  const questions = await Question.find({ quizId }).sort({ createdAt: 1 });
  if (!questions.length) {
    return res.status(400).json({ message: 'Quiz has no questions.' });
  }

  const previousAttempts = await Attempt.countDocuments({
    userId: req.user._id,
    quizId: quiz._id,
  });
  const attemptNumber = previousAttempts + 1;

  const answerMap = new Map(
    (answers || []).map((a) => [String(a.questionId), Number(a.selectedIndex)])
  );

  let correct = 0;
  const storedAnswers = [];

  for (const q of questions) {
    const qid = String(q._id);
    const raw = answerMap.has(qid) ? answerMap.get(qid) : null;
    const idx =
      raw !== null &&
      Number.isInteger(raw) &&
      raw >= 0 &&
      raw < q.options.length
        ? raw
        : -1;

    storedAnswers.push({ questionId: q._id, selectedIndex: idx });

    if (idx >= 0 && idx === q.correctAnswer) {
      correct += 1;
    }
  }

  const total = questions.length;
  const percentage = Math.round((correct / total) * 100 * 100) / 100;
  const passed = percentage >= quiz.passingScore;

  const attempt = await Attempt.create({
    userId: req.user._id,
    quizId: quiz._id,
    answers: storedAnswers,
    score: correct,
    percentage,
    passed,
    submittedAt: new Date(),
    attemptNumber,
  });

  return res.status(201).json({
    percentage,
    passed,
    correctCount: correct,
    totalQuestions: total,
    passingScore: quiz.passingScore,
    attemptId: attempt._id,
    attemptNumber,
    totalAttempts: attemptNumber,
    passedOnAttempt: passed ? attemptNumber : null,
  });
}

export async function myAttemptDetail(req, res) {
  const activeQuiz = await Quiz.findOne({ active: true }).sort({ updatedAt: -1 });
  if (!activeQuiz) {
    return res.status(404).json({ message: 'No active training quiz is available.' });
  }

  const attempts = await Attempt.find({
    userId: req.user._id,
    quizId: activeQuiz._id,
  }).sort({ submittedAt: 1 });

  if (!attempts.length) {
    return res.status(404).json({ message: 'No results yet.' });
  }

  const totalQs = await Question.countDocuments({ quizId: activeQuiz._id });
  const totalAttempts = attempts.length;
  const firstPassedIdx = attempts.findIndex((a) => a.passed);
  const firstPassed = firstPassedIdx >= 0 ? attempts[firstPassedIdx] : null;
  const latest = attempts[attempts.length - 1];
  const display = firstPassed || latest;

  return res.json({
    percentage: display.percentage,
    passed: Boolean(firstPassed),
    correctCount: display.score,
    totalQuestions: totalQs,
    quizTitle: activeQuiz.title,
    passingScore: activeQuiz.passingScore,
    submittedAt: display.submittedAt,
    quizId: activeQuiz._id,
    totalAttempts,
    passedOnAttempt: firstPassed
      ? firstPassed.attemptNumber ?? firstPassedIdx + 1
      : null,
  });
}
