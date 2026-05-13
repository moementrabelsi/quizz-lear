export function QuizFlowBar({
  total,
  currentIndex,
  answers,
  maxReachableIndex,
  onStepClick,
}) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex min-w-max items-center gap-1 sm:gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const answered = answers[i] !== undefined && answers[i] !== null;
          const active = i === currentIndex;
          const clickable = i <= maxReachableIndex;

          let circle =
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ';
          if (active) {
            circle += 'border-lear-red bg-lear-red text-white';
          } else if (answered) {
            circle += 'border-lear-dark bg-lear-dark text-white';
          } else {
            circle += 'border-lear-border bg-white text-lear-muted';
          }

          return (
            <div key={i} className="flex items-center">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick(i)}
                className={`${circle} ${clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default opacity-70'}`}
                aria-current={active ? 'step' : undefined}
              >
                {i + 1}
              </button>
              {i < total - 1 ? (
                <span
                  className={`mx-1 hidden h-px w-6 sm:block ${i < currentIndex ? 'bg-lear-dark' : 'bg-lear-border'}`}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
