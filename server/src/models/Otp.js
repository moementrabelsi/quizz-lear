import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  // OTP is stored so the internal training UI can display it once.
  // Verification still uses otpHash (secure comparison) to avoid trusting plaintext.
  otpCode: { type: String },
  // Frontend requirement: show OTP code only once.
  // When otpShown becomes true, the backend will stop returning otpCode in responses,
  // but the same otpHash remains valid for future sign-ins.
  otpShown: { type: Boolean, default: false },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model('Otp', otpSchema);
