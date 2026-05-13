import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { AppHeader } from '../components/AppHeader.jsx';
import { PrimaryButton } from '../components/Buttons.jsx';

export default function LoginPage() {
  const { user, bootstrapping } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith('@lear.com')) {
      setError('Only @lear.com email addresses may access this platform.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/send-otp', { email: trimmed });
      // Allow the modal to show once only when the backend created a fresh OTP.
      // If the OTP is reused, don't show the modal again.
      if (!data?.otpReused) {
        sessionStorage.removeItem(`otp_shown_${trimmed}`);
      }
      navigate('/verify', {
        state: {
          email: trimmed,
          otpCode: data?.otpCode,
          expiresInMinutes: data?.expiresInMinutes,
        },
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Unable to send verification code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="text-2xl font-semibold text-lear-dark">Employee sign in</h1>
        <p className="mt-2 text-sm text-lear-muted">
          Enter your Lear email address. We will send a one-time verification code.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-lear-dark">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-lear-border px-3 py-2 text-sm outline-none ring-lear-red focus:border-lear-red focus:ring-1"
              placeholder="you@lear.com"
            />
          </div>
          {error ? <p className="text-sm text-lear-red">{error}</p> : null}
          <PrimaryButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending…' : 'Continue'}
          </PrimaryButton>
        </form>
        <p className="mt-6 text-center text-xs text-lear-muted">
          Trouble signing in?{' '}
          <span className="text-lear-dark">Contact your training administrator.</span>
        </p>
        <Link to="#" className="mt-4 text-center text-sm text-lear-red hover:underline">
          If you forgot your OTP Code, please contact your training administrator.
        </Link>
      </main>
    </div>
  );
}
