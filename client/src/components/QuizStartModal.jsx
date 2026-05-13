import { PrimaryButton, SecondaryButton } from './Buttons.jsx';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function QuizStartModal({
  open,
  quizTitle,
  description,
  durationSeconds,
  questionCount,
  onAgree,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-start-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-lear-border bg-white p-6 shadow-lg sm:p-8">
        <h2 id="quiz-start-title" className="text-lg font-semibold text-lear-dark sm:text-xl">
          Before you begin
        </h2>
        <p className="mt-1 text-sm text-lear-muted">{quizTitle}</p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-lear-dark">
          <p>Please read the following before starting the assessment.</p>
          <ul className="list-inside list-disc space-y-2 text-lear-dark">
            <li>You will answer {questionCount} multiple-choice question(s).</li>
            <li>
              You have <span className="font-semibold">{formatTime(durationSeconds)}</span> total
              once the timer starts. When time runs out, your answers will be submitted
              automatically.
            </li>
            <li>Read each question carefully. You can move back to change answers before submitting.</li>
            <li>Do not refresh or leave this page during the assessment unless instructed.</li>
          </ul>
          {description?.trim() ? (
            <div className="rounded border border-lear-border bg-lear-surface p-3 text-xs text-lear-dark">
              <p className="font-medium text-lear-muted">Module notes</p>
              <p className="mt-1 whitespace-pre-wrap">{description.trim()}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded border border-lear-border bg-lear-surface px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-lear-muted">Time limit</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-lear-red">
            {formatTime(durationSeconds)}
          </p>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onCancel}>
            Go back
          </SecondaryButton>
          <PrimaryButton type="button" onClick={onAgree} className="sm:min-w-[160px]">
            I agree — start assessment
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
