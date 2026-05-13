import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { AppHeader } from '../components/AppHeader.jsx';
import { PrimaryButton, SecondaryButton } from '../components/Buttons.jsx';
import { OtpCodeModal } from '../components/OtpCodeModal.jsx';

export default function VerifyOtpPage() {
  const { user, bootstrapping, setToken } = useAuth();
  const location = useLocation();
  const email = location.state?.email || '';
  const otpCode = location.state?.otpCode;
  const expiresInMinutes = location.state?.expiresInMinutes;
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  useEffect(() => {
    if (!otpCode || !email) return;
    const shownKey = `otp_shown_${email}`;
    if (sessionStorage.getItem(shownKey)) return;
    sessionStorage.setItem(shownKey, '1');
    setShowOtpModal(true);
  }, [otpCode, email]);

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-lear-muted">
        Loading…
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/training/video'} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email) {
      navigate('/login', { replace: true });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/verify-otp', { email, otp: otp.trim() });
      setToken(data.token);
      const isAdmin = data.user?.role === 'admin';
      navigate(isAdmin ? '/admin' : '/training/video', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Verification failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <OtpCodeModal
        open={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        email={email}
        otpCode={otpCode}
        expiresInMinutes={expiresInMinutes}
      />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="text-2xl font-semibold text-lear-dark">Verify your email</h1>
        <p className="mt-2 text-sm text-lear-muted">
          Enter the six-digit code sent to{' '}
          <span className="font-medium text-lear-dark">{email || 'your inbox'}</span>.
        </p>
        <p className="mt-3 text-xs text-lear-muted">
          The OTP will be required for sign-in. The code is shown in a one-time modal (it won’t be shown again).
        </p>
        {!email ? (
          <p className="mt-4 text-sm text-lear-red">
            Start from the sign-in page to request a code.
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-lear-dark">
              Verification code
            </label>
            <input
              id="otp"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-center font-mono text-lg tracking-widest outline-none focus:border-lear-red focus:ring-1 focus:ring-lear-red"
              placeholder="••••••"
            />
          </div>
          {error ? <p className="text-sm text-lear-red">{error}</p> : null}
          <PrimaryButton type="submit" disabled={loading || otp.length !== 6} className="w-full">
            {loading ? 'Verifying…' : 'Sign in'}
          </PrimaryButton>
        </form>
        <div className="mt-6 flex justify-center gap-3">
          <SecondaryButton type="button" onClick={() => navigate('/login')}>
            Back
          </SecondaryButton>
        </div>
        <Link to="/login" className="mt-6 text-center text-sm text-lear-red hover:underline">
          Request a new code
        </Link>
      </main>
    </div>
  );
}
