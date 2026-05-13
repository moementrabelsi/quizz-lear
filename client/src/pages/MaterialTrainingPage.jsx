import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';
import { AppHeader } from '../components/AppHeader.jsx';
import { TrainingPdfReader } from '../components/TrainingPdfReader.jsx';
import { PrimaryButton, SecondaryButton } from '../components/Buttons.jsx';
import {
  normalizeMaterialPdfPath,
  readMaterialProgress,
} from '../utils/trainingMaterial.js';
import { isYoutubeThresholdMet } from '../utils/youtube.js';

export default function MaterialTrainingPage() {
  const navigate = useNavigate();
  const [materialComplete, setMaterialComplete] = useState(false);

  const attemptQuery = useQuery({
    queryKey: ['attemptMe'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/training/attempts/me');
        return data;
      } catch (e) {
        if (e.response?.status === 404) return null;
        throw e;
      }
    },
    retry: false,
  });

  const quizQuery = useQuery({
    queryKey: ['trainingQuiz'],
    queryFn: async () => {
      const { data } = await api.get('/api/training/quiz');
      return data;
    },
  });

  useEffect(() => {
    if (attemptQuery.isSuccess && attemptQuery.data?.passed) {
      navigate('/training/result', { replace: true });
    }
  }, [attemptQuery.isSuccess, attemptQuery.data?.passed, navigate]);

  useEffect(() => {
    const quiz = quizQuery.data?.quiz;
    if (!quiz) return;
    const url = normalizeMaterialPdfPath(quiz.materialPdfUrl || '');
    if (!url) {
      setMaterialComplete(true);
      return;
    }
    const p = readMaterialProgress(quiz.id);
    setMaterialComplete(Boolean(p?.completed));
  }, [quizQuery.data?.quiz?.id, quizQuery.data?.quiz?.materialPdfUrl]);

  if (quizQuery.isLoading || attemptQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Reading material" />
        <div className="flex justify-center py-24 text-lear-muted">Loading…</div>
      </div>
    );
  }

  if (quizQuery.isError) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Reading material" />
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-lear-muted">
          {quizQuery.error?.response?.data?.message ||
            'Training content is not available yet. Please contact your administrator.'}
        </div>
      </div>
    );
  }

  const { quiz } = quizQuery.data;
  const materialPdfUrl = normalizeMaterialPdfPath(quiz.materialPdfUrl || '');

  if (!materialPdfUrl) {
    return <Navigate to="/training/video" replace />;
  }

  if (!isYoutubeThresholdMet(quiz.videoUrl)) {
    return <Navigate to="/training/video" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title={quiz.title} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 border-b border-lear-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-lear-muted">
              Step 2 of 3
            </p>
            <h1 className="mt-1 text-xl font-semibold text-lear-dark">Reading material</h1>
            <p className="mt-2 max-w-2xl text-sm text-lear-muted">
              One slide per screen. Use <span className="font-medium text-lear-dark">Next slide</span>{' '}
              until you have viewed every slide, then finish. There is no per-slide timer.
            </p>
          </div>
          <SecondaryButton type="button" onClick={() => navigate('/training/video')}>
            Back to video
          </SecondaryButton>
        </div>

        <div className="mt-8">
          <TrainingPdfReader
            quizId={quiz.id}
            pdfUrl={materialPdfUrl}
            requireVideoFirst={false}
            onCompleteChange={setMaterialComplete}
          />
        </div>

        {materialComplete ? (
          <div className="mt-10 flex justify-center border-t border-lear-border pt-10">
            <PrimaryButton
              type="button"
              onClick={() => navigate('/training/quiz')}
              className="min-w-[220px]"
            >
              Start quiz
            </PrimaryButton>
          </div>
        ) : null}
      </main>
    </div>
  );
}
