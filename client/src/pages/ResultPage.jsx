import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { AppHeader } from '../components/AppHeader.jsx';

export default function ResultPage() {
  const query = useQuery({
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

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Results" />
        <div className="flex justify-center py-24 text-lear-muted">Loading results…</div>
      </div>
    );
  }

  if (query.isError || query.data === null) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Results" />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-sm text-lear-muted">
            No submitted assessment was found. Complete the training module first.
          </p>
          <Link
            to="/training/video"
            className="mt-6 inline-block text-sm font-semibold text-lear-red hover:underline"
          >
            Go to training
          </Link>
        </main>
      </div>
    );
  }

  const r = query.data;
  const passed = r.passed;
  const totalAttempts = r.totalAttempts ?? 1;
  const passedOnAttempt = r.passedOnAttempt ?? null;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title="Assessment results" />
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="border border-lear-border px-8 py-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-lear-muted">Your score</p>
          <p className="mt-4 text-4xl font-bold text-lear-dark">{r.percentage}%</p>
          <p className="mt-2 text-sm text-lear-muted">
            {r.correctCount} of {r.totalQuestions} correct · Passing threshold {r.passingScore}%
          </p>
          <p className="mt-3 text-xs text-lear-muted">
            {passed
              ? passedOnAttempt != null
                ? `You passed on attempt ${passedOnAttempt} of ${totalAttempts} submitted for this module.`
                : `Submitted attempts for this module: ${totalAttempts}.`
              : `This was attempt ${totalAttempts} for this module.`}
          </p>
          <div className="mt-8 border-t border-lear-border pt-8">
            <p className={`text-lg font-semibold ${passed ? 'text-lear-dark' : 'text-lear-red'}`}>
              {passed ? 'Passed' : 'Not passed'}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-lear-muted">
              {passed
                ? 'Congratulations, you passed the training.'
                : 'You did not reach the minimum required score.'}
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {!passed ? (
            <Link
              to="/training/video"
              className="inline-flex w-full justify-center rounded bg-lear-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c42422] sm:w-auto"
            >
              Review video and try again
            </Link>
          ) : null}
          <Link
            to="/training/video"
            className="inline-flex justify-center rounded border border-lear-border px-5 py-2.5 text-sm font-semibold text-lear-dark hover:border-lear-dark"
          >
            Back to training home
          </Link>
        </div>
      </main>
    </div>
  );
}
