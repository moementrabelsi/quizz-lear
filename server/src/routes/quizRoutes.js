import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { handleValidation } from '../middlewares/validate.js';
import {
  getActiveQuizBundle,
  submitAttempt,
  myAttemptDetail,
} from '../controllers/quizController.js';

const router = Router();

router.use(authenticate);

router.get('/quiz', getActiveQuizBundle);

router.post(
  '/attempts',
  [
    body('quizId').isMongoId().withMessage('Valid quizId required'),
    body('answers').isArray().withMessage('answers must be an array'),
    body('answers.*.questionId').isMongoId(),
    body('answers.*.selectedIndex').isInt({ min: -1 }),
  ],
  handleValidation,
  submitAttempt
);

router.get('/attempts/me', myAttemptDetail);

export default router;
