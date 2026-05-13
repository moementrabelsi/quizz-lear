import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedIndex: { type: Number, required: true, min: -1 },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, required: true },
    percentage: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    submittedAt: { type: Date, default: Date.now },
    attemptNumber: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

attemptSchema.index({ userId: 1, quizId: 1 });

export const Attempt = mongoose.model('Attempt', attemptSchema);
