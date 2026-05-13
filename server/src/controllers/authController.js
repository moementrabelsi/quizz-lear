import { body } from 'express-validator';
import { User } from '../models/User.js';
import { Otp } from '../models/Otp.js';
import { isLearEmail, normalizeEmail } from '../utils/emailDomain.js';
import { sendOtpEmail } from '../services/mailService.js';
import { hashOtp, compareOtp } from '../services/otpHash.js';
import { signToken } from '../utils/jwt.js';

function otpStickyExpiryDate() {
  // "B" requirement: the first OTP should stay usable for future sign-ins.
  // We keep it valid for a long time by default.
  const days = Number(process.env.OTP_STICKY_DAYS || 3650); // ~10 years
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function sendOtp(req, res) {
  const email = normalizeEmail(req.body.email);

  if (!isLearEmail(email)) {
    return res.status(403).json({
      message: 'Only @lear.com email addresses are allowed to sign in.',
    });
  }

  const now = new Date();
  const stickyExpiresAt = otpStickyExpiryDate();

  // "B" requirement: reuse the *first* OTP ever generated for this email.
  const existing = await Otp.findOne({ email }).sort({ createdAt: 1 });

  if (existing) {
    // Ensure it remains usable for future sign-ins.
    if (!existing.expiresAt || existing.expiresAt < now) {
      existing.expiresAt = stickyExpiresAt;
    }

    // Show OTP code in the modal only once globally (per browser request type).
    const shouldReturnOtpCode = !existing.otpShown && Boolean(existing.otpCode);
    if (shouldReturnOtpCode) {
      existing.otpShown = true;
    }

    await existing.save();

    if (existing.otpCode) {
      await sendOtpEmail(email, existing.otpCode);
    }

    const remainingMs = existing.expiresAt.getTime() - now.getTime();
    const expiresInMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));

    return res.json({
      message: 'If this email is eligible, a verification code has been sent.',
      expiresInMinutes,
      otpReused: true,
      ...(shouldReturnOtpCode ? { otpCode: existing.otpCode } : {}),
    });
  }

  // First time for this email: generate the OTP once.
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await hashOtp(code);

  await Otp.create({
    email,
    otpCode: code,
    otpHash,
    expiresAt: stickyExpiresAt,
    otpShown: false,
  });

  await sendOtpEmail(email, code);

  const expiresInMinutes = Math.max(1, Math.ceil((stickyExpiresAt.getTime() - now.getTime()) / (60 * 1000)));

  return res.json({
    message: 'If this email is eligible, a verification code has been sent.',
    expiresInMinutes,
    otpCode: code,
    otpReused: false,
  });
}

export async function verifyOtp(req, res) {
  const email = normalizeEmail(req.body.email);
  const otp = req.body.otp;

  if (!isLearEmail(email)) {
    return res.status(403).json({ message: 'Only @lear.com email addresses are allowed.' });
  }

  // For "B" requirement, we accept the first OTP for future sign-ins.
  const record = await Otp.findOne({ email }).sort({ createdAt: 1 });
  if (!record) {
    return res.status(400).json({ message: 'Invalid code. Request a new one.' });
  }

  const ok = await compareOtp(otp, record.otpHash);
  if (!ok) {
    return res.status(400).json({ message: 'Invalid verification code.' });
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, verified: true, role: 'employee' });
  } else {
    user.verified = true;
    await user.save();
  }

  const token = signToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  return res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      verified: user.verified,
    },
  });
}

export async function me(req, res) {
  return res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      verified: req.user.verified,
    },
  });
}

export const sendOtpValidators = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
];

export const verifyOtpValidators = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('otp')
    .isString()
    .trim()
    .isLength({ min: 6, max: 6 })
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6-digit code'),
];
