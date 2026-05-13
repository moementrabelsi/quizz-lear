import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';
import { AppHeader } from '../components/AppHeader.jsx';
import { PrimaryButton } from '../components/Buttons.jsx';
import { extractYoutubeVideoId } from '../utils/youtube.js';
import { normalizeMaterialPdfPath, readMaterialProgress } from '../utils/trainingMaterial.js';
import { useYoutubeProgress } from '../hooks/useYoutubeProgress.js';

export default function VideoTrainingPage() {
  const navigate = useNavigate();
  const [videoReady, setVideoReady] = useState(false);
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

  const onThreshold = useCallback(() => setVideoReady(true), []);

  const videoId =
    quizQuery.data?.quiz?.videoUrl != null
      ? extractYoutubeVideoId(quizQuery.data.quiz.videoUrl)
      : null;

  useYoutubeProgress(videoId, onThreshold);

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
        <AppHeader title="Training video" />
        <div className="flex justify-center py-24 text-lear-muted">Loading training…</div>
      </div>
    );
  }

  if (quizQuery.isError) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Training video" />
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-lear-muted">
          {quizQuery.error?.response?.data?.message ||
            'Training content is not available yet. Please contact your administrator.'}
        </div>
      </div>
    );
  }

  const { quiz } = quizQuery.data;
  const materialPdfUrl = normalizeMaterialPdfPath(quiz.materialPdfUrl || '');

  const canStartQuizNoMaterial = videoReady && !materialPdfUrl;
  const canStartQuizAfterMaterial = videoReady && materialPdfUrl && materialComplete;
  const canGoToPdf = videoReady && materialPdfUrl;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title={quiz.title} />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-lear-dark sm:text-3xl">{quiz.title}</h1>
          {quiz.description ? (
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-lear-muted">
              {quiz.description}
            </p>
          ) : null}
        </div>

        <div className="mt-10 overflow-hidden rounded border border-lear-border bg-black shadow-none">
          <div className="relative aspect-video w-full">
            {videoId ? (
              <div id="yt-player" className="absolute inset-0 h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white">
                Invalid video URL configured for this module.
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-lear-muted">
          Watch at least 90% of the video to continue.
          {videoReady ? (
            <span className="ml-1 font-medium text-lear-dark"> Requirement met.</span>
          ) : null}
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 border-t border-lear-border pt-10">
          {materialPdfUrl ? (
            <>
              <PrimaryButton
                type="button"
                disabled={!canGoToPdf}
                onClick={() => navigate('/training/material')}
                className="min-w-[220px]"
              >
                Next — reading material
              </PrimaryButton>
              {!videoReady ? (
                <p className="max-w-md text-center text-xs text-lear-muted">
                  Complete the video requirement to open the PDF slides.
                </p>
              ) : !materialComplete ? (
                <p className="max-w-md text-center text-xs text-lear-muted">
                  Open the slides and move through every page. When you are done, use{' '}
                  <span className="font-medium text-lear-dark">Start quiz</span> on that screen (or
                  below after you finish).
                </p>
              ) : null}
              {canStartQuizAfterMaterial ? (
                <PrimaryButton
                  type="button"
                  onClick={() => navigate('/training/quiz')}
                  className="min-w-[220px]"
                >
                  Start quiz
                </PrimaryButton>
              ) : null}
            </>
          ) : (
            <>
              <PrimaryButton
                type="button"
                disabled={!canStartQuizNoMaterial}
                onClick={() => navigate('/training/quiz')}
                className="min-w-[220px]"
              >
                Start quiz
              </PrimaryButton>
              {!videoReady ? (
                <p className="max-w-md text-center text-xs text-lear-muted">
                  Finish the video to unlock the assessment.
                </p>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
