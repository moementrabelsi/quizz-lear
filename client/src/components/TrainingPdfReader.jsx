import { useCallback, useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// Keep pdfjs-dist in package.json aligned with react-pdf's pdfjs API (see package.json).
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PrimaryButton, SecondaryButton } from './Buttons.jsx';
import {
  clearMaterialProgress,
  readMaterialProgress,
  resolveMaterialPdfUrl,
  writeMaterialProgress,
} from '../utils/trainingMaterial.js';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export function TrainingPdfReader({
  quizId,
  pdfUrl,
  videoReady = false,
  /** When false (e.g. dedicated material route), PDF is shown without waiting for the video gate. */
  requireVideoFirst = true,
  onCompleteChange,
}) {
  const resolvedUrl = useMemo(() => resolveMaterialPdfUrl(pdfUrl), [pdfUrl]);
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  /** Each index true once the learner has viewed that slide at least once. */
  const [visited, setVisited] = useState([]);
  /** User already finished all slides once — browse freely. */
  const [reviewMode, setReviewMode] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [pageWidth, setPageWidth] = useState(720);

  useEffect(() => {
    function measure() {
      const w = typeof window !== 'undefined' ? window.innerWidth : 720;
      setPageWidth(Math.min(820, Math.max(280, w - 48)));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const syncComplete = useCallback(
    (complete) => {
      onCompleteChange?.(complete);
    },
    [onCompleteChange]
  );

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }) => {
      setLoadError(null);
      setNumPages(n);
      setPageIndex(0);
      const initial = Array.from({ length: n }, (_, i) => i === 0);
      setVisited(initial);

      const saved = readMaterialProgress(quizId);
      if (saved?.completed && saved.pageCount === n) {
        setReviewMode(true);
        syncComplete(true);
      } else {
        if (saved?.pageCount && saved.pageCount !== n) {
          clearMaterialProgress(quizId);
        }
        setReviewMode(false);
        syncComplete(false);
      }
    },
    [quizId, syncComplete]
  );

  useEffect(() => {
    if (numPages === 0) return;
    setVisited((prev) => {
      const next = prev.length === numPages ? [...prev] : Array(numPages).fill(false);
      next[pageIndex] = true;
      return next;
    });
  }, [pageIndex, numPages]);

  const allSlidesSeen = numPages > 0 && visited.length === numPages && visited.every(Boolean);
  const atLastSlide = numPages > 0 && pageIndex >= numPages - 1;

  const canGoNext = reviewMode ? !atLastSlide : !atLastSlide || allSlidesSeen;

  const unlocked = !requireVideoFirst || videoReady;

  function goNext() {
    if (pageIndex >= numPages - 1) {
      writeMaterialProgress(quizId, numPages);
      setReviewMode(true);
      syncComplete(true);
      return;
    }
    setPageIndex((i) => i + 1);
  }

  function goPrev() {
    setPageIndex((i) => Math.max(0, i - 1));
  }

  if (!pdfUrl?.trim()) return null;

  if (!unlocked) {
    return (
      <div className="rounded border border-lear-border bg-lear-surface px-4 py-6 text-center text-sm text-lear-muted">
        Complete the video requirement first. Then open the reading material from this training flow.
      </div>
    );
  }

  return (
    <div className="rounded border border-lear-border bg-white p-4 sm:p-6">
      <h2 className="text-center text-lg font-semibold text-lear-dark">Slides</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-xs text-lear-muted">
        {reviewMode ? (
          <>
            You already completed this handout. Use{' '}
            <span className="font-medium text-lear-dark">Previous slide</span> /{' '}
            <span className="font-medium text-lear-dark">Next slide</span> to browse anytime.
          </>
        ) : (
          <>
            One slide at a time. Use <span className="font-medium text-lear-dark">Next slide</span>{' '}
            to move forward until you have viewed every slide, then tap{' '}
            <span className="font-medium text-lear-dark">Finish reading</span> on the last one.
          </>
        )}
      </p>

      {loadError ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-lear-red">
            Could not load the PDF. Check that the file path is correct (for example{' '}
            <code className="rounded bg-lear-surface px-1 text-lear-dark">/materials/handbook.pdf</code>
            ) or use a full <code className="rounded bg-lear-surface px-1 text-lear-dark">https://</code>{' '}
            link, then refresh.
          </p>
          <p className="mt-2 break-all text-xs text-lear-muted">{String(loadError.message || loadError)}</p>
        </div>
      ) : (
        <div className="mt-6 flex justify-center overflow-x-auto">
          <Document
            file={resolvedUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(err) => {
              console.error('PDF load error', err);
              setLoadError(err instanceof Error ? err : new Error(String(err)));
            }}
            loading={
              <p className="py-16 text-center text-sm text-lear-muted">Loading document…</p>
            }
          >
            {numPages > 0 ? (
              <Page
                pageNumber={pageIndex + 1}
                width={pageWidth}
                renderTextLayer
                renderAnnotationLayer
              />
            ) : null}
          </Document>
        </div>
      )}

      {numPages > 0 && !loadError ? (
        <>
          <p className="mt-4 text-center text-sm text-lear-dark">
            Slide {pageIndex + 1} of {numPages}
            {!reviewMode ? (
              <span className="ml-2 text-lear-muted">
                · {allSlidesSeen ? 'All slides viewed' : 'View every slide to finish'}
              </span>
            ) : (
              <span className="ml-2 text-lear-muted">· Review</span>
            )}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <SecondaryButton type="button" disabled={pageIndex === 0} onClick={goPrev}>
              Previous slide
            </SecondaryButton>
            {!(reviewMode && atLastSlide) ? (
              <PrimaryButton type="button" disabled={!canGoNext} onClick={goNext}>
                {atLastSlide ? 'Finish reading' : 'Next slide'}
              </PrimaryButton>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
