import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    question: { type: String, required: true, trim: true },
    options: [{ type: String, required: true, trim: true }],
    correctAnswer: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

questionSchema.pre('validate', function validateOptions(next) {
  if (!Array.isArray(this.options) || this.options.length < 2) {
    return next(new Error('Question must have at least two options'));
  }
  if (this.correctAnswer >= this.options.length) {
    return next(new Error('correctAnswer index out of range'));
  }
  next();
});

export const Question = mongoose.model('Question', questionSchema);
