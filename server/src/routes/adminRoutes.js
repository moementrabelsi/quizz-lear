import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { handleValidation } from '../middlewares/validate.js';
import {
  listQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listAttempts,
  listOtpCodes,
  listSuccessfulCompletions,
  exportCompletionsCsv,
  analyticsSummary,
  exportAttemptsCsv,
} from '../controllers/adminController.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/quizzes', listQuizzes);
router.post(
  '/quizzes',
  [
    body('title').trim().notEmpty(),
    body('videoUrl').trim().notEmpty(),
    body('description').optional().isString(),
    body('passingScore').optional().isFloat({ min: 0, max: 100 }),
    body('duration').optional().isInt({ min: 60 }),
    body('active').optional().isBoolean(),
  ],
  handleValidation,
  createQuiz
);
router.patch('/quizzes/:id', updateQuiz);
router.delete('/quizzes/:id', deleteQuiz);

router.get('/quizzes/:quizId/questions', listQuestions);
router.post(
  '/quizzes/:quizId/questions',
  [
    body('question').trim().notEmpty(),
    body('options').isArray({ min: 2 }),
    body('options.*').isString().trim().notEmpty(),
    body('correctAnswer').isInt({ min: 0 }),
  ],
  handleValidation,
  createQuestion
);
router.patch(
  '/questions/:id',
  [
    body('question').optional().trim().notEmpty(),
    body('options').optional().isArray({ min: 2 }),
    body('correctAnswer').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  updateQuestion
);
router.delete('/questions/:id', deleteQuestion);

router.get('/attempts', listAttempts);
router.get('/otp-codes', listOtpCodes);
router.get('/completions', listSuccessfulCompletions);
router.get('/analytics/summary', analyticsSummary);
router.get('/exports/completions.csv', exportCompletionsCsv);
router.get('/exports/attempts.csv', exportAttemptsCsv);

export default router;
