import { Router } from 'express';
import { body } from 'express-validator';
import {
  sendOtp,
  verifyOtp,
  me,
  sendOtpValidators,
  verifyOtpValidators,
} from '../controllers/authController.js';
import { handleValidation } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Unlimited OTP requests (per requirement)
router.post('/send-otp', sendOtpValidators, handleValidation, sendOtp);
router.post('/verify-otp', verifyOtpValidators, handleValidation, verifyOtp);
router.get('/me', authenticate, me);

export default router;
