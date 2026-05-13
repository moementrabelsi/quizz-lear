export function PrimaryButton({ children, disabled, type = 'button', className = '', ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded bg-lear-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c42422] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, type = 'button', className = '', ...rest }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded border border-lear-border bg-white px-5 py-2.5 text-sm font-semibold text-lear-dark hover:border-lear-dark ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
