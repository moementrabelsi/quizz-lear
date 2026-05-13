import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';

function normalizeMaterialPdfUrlInput(raw) {
  if (typeof raw !== 'string') return '';
  let u = raw.trim().replace(/\\/g, '/');
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return u.startsWith('/') ? u : `/${u}`;
}
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { User } from '../models/User.js';
import { Otp } from '../models/Otp.js';

export async function listQuizzes(req, res) {
  const quizzes = await Quiz.find().sort({ createdAt: -1 });
  const out = await Promise.all(
    quizzes.map(async (q) => {
      const count = await Question.countDocuments({ quizId: q._id });
      const attempts = await Attempt.countDocuments({ quizId: q._id });
      return {
        id: q._id,
        title: q.title,
        description: q.description,
        videoUrl: q.videoUrl,
        materialPdfUrl: q.materialPdfUrl || '',
        passingScore: q.passingScore,
        duration: q.duration,
        active: q.active,
        questionCount: count,
        attemptCount: attempts,
        updatedAt: q.updatedAt,
      };
    })
  );
  res.json({ quizzes: out });
}

export async function createQuiz(req, res) {
  const { title, description, videoUrl, materialPdfUrl, passingScore, duration, active } =
    req.body;
  const quiz = await Quiz.create({
    title,
    description: description ?? '',
    videoUrl,
    materialPdfUrl: normalizeMaterialPdfUrlInput(
      typeof materialPdfUrl === 'string' ? materialPdfUrl : ''
    ),
    passingScore: passingScore ?? 70,
    duration: duration ?? 900,
    active: Boolean(active),
  });

  if (quiz.active) {
    await Quiz.updateMany({ _id: { $ne: quiz._id } }, { active: false });
  }

  res.status(201).json({ quiz });
}

export async function updateQuiz(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  const quiz = await Quiz.findById(id);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

  const fields = [
    'title',
    'description',
    'videoUrl',
    'materialPdfUrl',
    'passingScore',
    'duration',
    'active',
  ];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      if (f === 'active') quiz[f] = Boolean(req.body[f]);
      else if (f === 'materialPdfUrl')
        quiz[f] = normalizeMaterialPdfUrlInput(String(req.body[f] ?? ''));
      else quiz[f] = req.body[f];
    }
  }
  await quiz.save();

  if (quiz.active) {
    await Quiz.updateMany({ _id: { $ne: quiz._id } }, { active: false });
  }

  res.json({ quiz });
}

export async function deleteQuiz(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  await Question.deleteMany({ quizId: id });
  await Attempt.deleteMany({ quizId: id });
  await Quiz.findByIdAndDelete(id);
  res.json({ message: 'Quiz deleted' });
}

export async function listQuestions(req, res) {
  const { quizId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(quizId)) {
    return res.status(400).json({ message: 'Invalid quiz id' });
  }
  const questions = await Question.find({ quizId }).sort({ createdAt: 1 });
  res.json({ questions });
}

export async function createQuestion(req, res) {
  const { quizId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(quizId)) {
    return res.status(400).json({ message: 'Invalid quiz id' });
  }
  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

  const { question, options, correctAnswer } = req.body;
  const q = await Question.create({ quizId, question, options, correctAnswer });
  res.status(201).json({ question: q });
}

export async function updateQuestion(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  const q = await Question.findById(id);
  if (!q) return res.status(404).json({ message: 'Question not found' });

  const { question, options, correctAnswer } = req.body;
  if (question !== undefined) q.question = question;
  if (options !== undefined) q.options = options;
  if (correctAnswer !== undefined) q.correctAnswer = correctAnswer;
  await q.save();
  res.json({ question: q });
}

export async function deleteQuestion(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  await Question.findByIdAndDelete(id);
  res.json({ message: 'Question deleted' });
}

export async function listAttempts(req, res) {
  const search = (req.query.email || '').trim().toLowerCase();
  const quizFilter = req.query.quizId;
  const match = {};
  if (quizFilter && mongoose.Types.ObjectId.isValid(quizFilter)) {
    match.quizId = new mongoose.Types.ObjectId(quizFilter);
  }

  let userIds;
  if (search) {
    const users = await User.find({ email: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).select('_id');
    userIds = users.map((u) => u._id);
    match.userId = { $in: userIds };
    if (!userIds.length) {
      return res.json({ attempts: [] });
    }
  }

  const attempts = await Attempt.find(match)
    .sort({ submittedAt: -1 })
    .limit(500)
    .populate('userId', 'email')
    .populate('quizId', 'title passingScore');

  const rows = attempts.map((a) => ({
    id: a._id,
    email: a.userId?.email,
    quizTitle: a.quizId?.title,
    score: a.score,
    percentage: a.percentage,
    passed: a.passed,
    submittedAt: a.submittedAt,
    quizId: a.quizId?._id,
    attemptNumber: a.attemptNumber,
    passedOnAttempt: a.passed ? a.attemptNumber ?? null : null,
  }));

  res.json({ attempts: rows });
}

/** Admin OTP lookup so support can help employees recover their code. */
export async function listOtpCodes(req, res) {
  const search = (req.query.email || '').trim();
  const match = {};
  if (search) {
    match.email = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  const rows = await Otp.find(match)
    .sort({ createdAt: -1 })
    .limit(200)
    .select('email otpCode otpShown createdAt expiresAt');

  res.json({
    otps: rows.map((r) => ({
      id: r._id,
      email: r.email,
      otpCode: r.otpCode || null,
      otpShown: Boolean(r.otpShown),
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    })),
  });
}

function completionsAggregationPipeline(match) {
  const userColl = User.collection.collectionName;
  const quizColl = Quiz.collection.collectionName;
  return [
    { $match: match },
    { $sort: { submittedAt: 1 } },
    {
      $group: {
        _id: { userId: '$userId', quizId: '$quizId' },
        passDoc: { $first: '$$ROOT' },
      },
    },
    {
      $lookup: {
        from: userColl,
        localField: '_id.userId',
        foreignField: '_id',
        as: 'u',
      },
    },
    {
      $lookup: {
        from: quizColl,
        localField: '_id.quizId',
        foreignField: '_id',
        as: 'q',
      },
    },
    {
      $project: {
        id: '$passDoc._id',
        email: { $arrayElemAt: ['$u.email', 0] },
        quizTitle: { $arrayElemAt: ['$q.title', 0] },
        quizId: '$_id.quizId',
        passedOnAttempt: { $ifNull: ['$passDoc.attemptNumber', 1] },
        score: '$passDoc.score',
        percentage: '$passDoc.percentage',
        submittedAt: '$passDoc.submittedAt',
      },
    },
    { $sort: { submittedAt: -1 } },
  ];
}

/** One row per user per quiz: first passing attempt (chronological). */
export async function listSuccessfulCompletions(req, res) {
  const search = (req.query.email || '').trim();
  const quizFilter = req.query.quizId;

  const match = { passed: true };
  if (quizFilter && mongoose.Types.ObjectId.isValid(quizFilter)) {
    match.quizId = new mongoose.Types.ObjectId(quizFilter);
  }

  if (search) {
    const users = await User.find({
      email: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    }).select('_id');
    const ids = users.map((u) => u._id);
    if (!ids.length) {
      return res.json({ completions: [] });
    }
    match.userId = { $in: ids };
  }

  const pipeline = completionsAggregationPipeline(match).concat([{ $limit: 500 }]);
  const completions = await Attempt.aggregate(pipeline);
  res.json({ completions });
}

export async function exportCompletionsCsv(req, res) {
  const search = (req.query.email || '').trim();
  const quizFilter = req.query.quizId;
  const match = { passed: true };
  if (quizFilter && mongoose.Types.ObjectId.isValid(quizFilter)) {
    match.quizId = new mongoose.Types.ObjectId(quizFilter);
  }
  if (search) {
    const users = await User.find({
      email: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    }).select('_id');
    const ids = users.map((u) => u._id);
    if (!ids.length) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="completions-export.csv"');
      return res.send('email,quizTitle,succeededOnTry,score,percentage,submittedAt\n');
    }
    match.userId = { $in: ids };
  }

  const pipeline = completionsAggregationPipeline(match).concat([{ $limit: 5000 }]);
  const rows = await Attempt.aggregate(pipeline);

  const headers = ['email', 'quizTitle', 'succeededOnTry', 'score', 'percentage', 'submittedAt'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        `"${String(r.email || '').replace(/"/g, '""')}"`,
        `"${String(r.quizTitle || '').replace(/"/g, '""')}"`,
        r.passedOnAttempt,
        r.score,
        r.percentage,
        r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
      ].join(',')
    );
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="completions-export.csv"');
  res.send(lines.join('\n'));
}

export async function analyticsSummary(req, res) {
  const totalAttempts = await Attempt.countDocuments();
  const passed = await Attempt.countDocuments({ passed: true });
  const agg = await Attempt.aggregate([
    { $group: { _id: null, avgPct: { $avg: '$percentage' } } },
  ]);
  const avgPct = agg[0]?.avgPct ? Math.round(agg[0].avgPct * 100) / 100 : 0;

  const byQuiz = await Attempt.aggregate([
    {
      $group: {
        _id: '$quizId',
        attempts: { $sum: 1 },
        passed: { $sum: { $cond: ['$passed', 1, 0] } },
        avgPct: { $avg: '$percentage' },
      },
    },
  ]);

  const quizTitles = await Quiz.find({
    _id: { $in: byQuiz.map((b) => b._id) },
  }).select('title');

  const titleMap = Object.fromEntries(quizTitles.map((q) => [String(q._id), q.title]));

  const perQuiz = byQuiz.map((b) => ({
    quizId: b._id,
    title: titleMap[String(b._id)] || 'Unknown',
    attempts: b.attempts,
    passRate: b.attempts ? Math.round((b.passed / b.attempts) * 10000) / 100 : 0,
    avgPercentage: Math.round(b.avgPct * 100) / 100,
  }));

  res.json({
    totalAttempts,
    passRateOverall: totalAttempts ? Math.round((passed / totalAttempts) * 10000) / 100 : 0,
    avgPercentage: avgPct,
    perQuiz,
  });
}

export async function exportAttemptsCsv(req, res) {
  const attempts = await Attempt.find()
    .sort({ submittedAt: -1 })
    .limit(5000)
    .populate('userId', 'email')
    .populate('quizId', 'title');

  const headers = [
    'email',
    'quizTitle',
    'attemptNumber',
    'score',
    'percentage',
    'passed',
    'passedOnAttempt',
    'submittedAt',
  ];
  const lines = [headers.join(',')];

  for (const a of attempts) {
    const attemptNum = a.attemptNumber ?? '';
    const row = [
      `"${(a.userId?.email || '').replace(/"/g, '""')}"`,
      `"${(a.quizId?.title || '').replace(/"/g, '""')}"`,
      attemptNum,
      a.score,
      a.percentage,
      a.passed ? 'yes' : 'no',
      a.passed ? String(attemptNum || '') : '',
      a.submittedAt?.toISOString() || '',
    ];
    lines.push(row.join(','));
  }

  const csv = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attempts-export.csv"');
  res.send(csv);
}
