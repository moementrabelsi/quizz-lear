import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    videoUrl: { type: String, required: true, trim: true },
    materialPdfUrl: { type: String, default: '', trim: true },
    passingScore: { type: Number, required: true, min: 0, max: 100, default: 70 },
    duration: { type: Number, required: true, min: 60, default: 900 },
    active: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Quiz = mongoose.model('Quiz', quizSchema);
