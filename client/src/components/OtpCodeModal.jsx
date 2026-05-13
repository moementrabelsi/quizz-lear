import { useState } from 'react';

export function OtpCodeModal({
  open,
  onClose,
  email,
  otpCode,
  expiresInMinutes,
}) {
  const [copied, setCopied] = useState(false);

  function onCopy() {
    if (!otpCode) return;
    const text = String(otpCode);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        })
        .catch(() => {
          // Fallback
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      return;
    }

    // Old browser fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded border border-lear-border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-lear-dark">OTP code</h2>
            <p className="mt-1 text-xs text-lear-muted">
              For <span className="font-medium text-lear-dark">{email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-lear-border px-2 py-1 text-sm font-semibold text-lear-muted hover:border-lear-dark hover:text-lear-dark"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 rounded border border-lear-border bg-lear-surface py-3">
          <span className="font-mono text-3xl font-semibold tracking-widest text-lear-red">
            {otpCode}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="rounded border border-lear-border bg-white px-3 py-2 text-xs font-semibold text-lear-dark hover:border-lear-red hover:text-lear-red"
            aria-label="Copy OTP code"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <p className="mt-3 text-xs text-lear-muted">
          This code is shown only once. If you didn’t capture it, request a new code.
          {expiresInMinutes ? ` It expires in ${expiresInMinutes} minutes.` : null}
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-lear-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c42422]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

