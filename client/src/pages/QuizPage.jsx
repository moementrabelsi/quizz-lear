import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { AppHeader } from '../components/AppHeader.jsx';
import { PrimaryButton, SecondaryButton } from '../components/Buttons.jsx';
import { QuizFlowBar } from '../components/QuizFlowBar.jsx';
import { QuizStartModal } from '../components/QuizStartModal.jsx';
import { normalizeMaterialPdfPath, readMaterialProgress } from '../utils/trainingMaterial.js';
import { isYoutubeThresholdMet } from '../utils/youtube.js';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function QuizPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxReachable, setMaxReachable] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [hasAgreedToStart, setHasAgreedToStart] = useState(false);

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

  const autoSubmittedRef = useRef(false);

  const quizQuery = useQuery({
    queryKey: ['trainingQuiz'],
    queryFn: async () => {
      const { data } = await api.get('/api/training/quiz');
      return data;
    },
  });

  const questions = quizQuery.data?.questions || [];
  const quiz = quizQuery.data?.quiz;

  useEffect(() => {
    if (attemptQuery.data?.passed) {
      navigate('/training/result', { replace: true });
    }
  }, [attemptQuery.data?.passed, navigate]);

  useEffect(() => {
    setAnswers(Array.from({ length: questions.length }, () => null));
  }, [questions.length]);

  const durationSec = quiz?.duration ?? 900;
  const [secondsLeft, setSecondsLeft] = useState(durationSec);

  useEffect(() => {
    setHasAgreedToStart(false);
    setSecondsLeft(durationSec);
    autoSubmittedRef.current = false;
  }, [durationSec, quiz?.id]);

  useEffect(() => {
    if (!hasAgreedToStart) return undefined;
    if (!quiz || questions.length === 0) return undefined;
    if (!isYoutubeThresholdMet(quiz.videoUrl)) return undefined;
    const material = normalizeMaterialPdfPath(quiz.materialPdfUrl || '');
    if (material && !readMaterialProgress(quiz.id)?.completed) return undefined;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [
    hasAgreedToStart,
    quiz?.id,
    quiz?.videoUrl,
    quiz?.materialPdfUrl,
    questions.length,
  ]);

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/api/training/attempts', payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attemptMe'] });
      navigate('/training/result', { replace: true });
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['attemptMe'] });
        navigate('/training/result', { replace: true });
      }
    },
  });

  const buildPayload = useMemo(() => {
    return () => ({
      quizId: quiz?.id,
      answers: questions.map((q, idx) => ({
        questionId: q.id,
        selectedIndex:
          answers[idx] !== null && answers[idx] !== undefined ? answers[idx] : -1,
      })),
    });
  }, [quiz?.id, questions, answers]);

  useEffect(() => {
    if (!hasAgreedToStart) return;
    if (
      secondsLeft !== 0 ||
      !quiz?.id ||
      questions.length === 0 ||
      autoSubmittedRef.current ||
      submitMutation.isPending
    ) {
      return;
    }
    autoSubmittedRef.current = true;
    submitMutation.mutate(buildPayload());
    // Intentionally keyed off timer boundary only; payload reads latest closure via buildPayload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, hasAgreedToStart]);

  function selectOption(optionIndex) {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  }

  function goNext() {
    if (currentIndex >= questions.length - 1) {
      autoSubmittedRef.current = true;
      submitMutation.mutate(buildPayload());
      return;
    }
    setMaxReachable((m) => Math.max(m, currentIndex + 1));
    setCurrentIndex((i) => i + 1);
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  if (quizQuery.isLoading || attemptQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Assessment" />
        <div className="flex justify-center py-24 text-lear-muted">Loading assessment…</div>
      </div>
    );
  }

  if (quizQuery.isError || !questions.length) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Assessment" />
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-lear-muted">
          {quizQuery.error?.response?.data?.message ||
            'The assessment is unavailable. Return to training.'}
        </div>
      </div>
    );
  }

  const materialPdf = normalizeMaterialPdfPath(quiz.materialPdfUrl || '');

  if (!isYoutubeThresholdMet(quiz.videoUrl)) {
    return <Navigate to="/training/video" replace />;
  }
  if (materialPdf) {
    const prog = readMaterialProgress(quiz.id);
    if (!prog?.completed) {
      return <Navigate to="/training/material" replace />;
    }
  }

  const q = questions[currentIndex];
  const selected = answers[currentIndex];

  function handleModalCancel() {
    if (materialPdf) {
      navigate('/training/material');
    } else {
      navigate('/training/video');
    }
  }

  function handleAgreeStart() {
    setSecondsLeft(durationSec);
    setHasAgreedToStart(true);
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title={quiz.title} />
      <QuizStartModal
        open={!hasAgreedToStart}
        quizTitle={quiz.title}
        description={quiz.description}
        durationSeconds={durationSec}
        questionCount={questions.length}
        onAgree={handleAgreeStart}
        onCancel={handleModalCancel}
      />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div
          className={`flex flex-col gap-4 border-b border-lear-border pb-6 sm:flex-row sm:items-center sm:justify-between ${!hasAgreedToStart ? 'pointer-events-none opacity-40' : ''}`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-lear-muted">Progress</p>
            <QuizFlowBar
              total={questions.length}
              currentIndex={currentIndex}
              answers={answers}
              maxReachableIndex={maxReachable}
              onStepClick={(i) => setCurrentIndex(i)}
            />
          </div>
          <div
            className={`shrink-0 text-right text-sm font-semibold ${secondsLeft <= 60 ? 'text-lear-red' : 'text-lear-dark'}`}
            aria-live="polite"
          >
            Time remaining: {formatTime(secondsLeft)}
          </div>
        </div>

        <section className={`mx-auto mt-10 max-w-xl ${!hasAgreedToStart ? 'pointer-events-none opacity-40' : ''}`}>
          <p className="text-xs font-medium uppercase text-lear-muted">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-snug text-lear-dark sm:text-xl">
            {q.question}
          </h2>
          <div className="mt-6 space-y-2">
            {q.options.map((opt, idx) => {
              const active = selected === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectOption(idx)}
                  className={`w-full rounded border px-4 py-3 text-left text-sm transition ${
                    active
                      ? 'border-lear-red bg-lear-red text-white'
                      : 'border-lear-border bg-white text-lear-dark hover:border-lear-dark'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </section>

        <div
          className={`mx-auto mt-10 flex max-w-xl justify-between gap-3 ${!hasAgreedToStart ? 'pointer-events-none opacity-40' : ''}`}
        >
          <div className="flex flex-wrap gap-3">
            <SecondaryButton type="button" onClick={() => navigate('/training/video')}>
              Back to video
            </SecondaryButton>
            {materialPdf ? (
              <SecondaryButton type="button" onClick={() => navigate('/training/material')}>
                Reading material
              </SecondaryButton>
            ) : null}
            <SecondaryButton type="button" disabled={currentIndex === 0} onClick={goPrev}>
              Previous
            </SecondaryButton>
          </div>
          <PrimaryButton
            type="button"
            disabled={submitMutation.isPending || !hasAgreedToStart}
            onClick={goNext}
          >
            {currentIndex >= questions.length - 1 ? 'Submit' : 'Next'}
          </PrimaryButton>
        </div>
        {submitMutation.isError && submitMutation.error?.response?.status !== 409 ? (
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-lear-red">
            {submitMutation.error?.response?.data?.message || 'Submission failed.'}
          </p>
        ) : null}
      </main>
    </div>
  );
}
