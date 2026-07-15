
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/register', { method: 'GET', cache: 'no-store' });
        const data = await res.json().catch(() => ({ allowed: false }));
        if (mounted) setAllowed(!!data.allowed);
      } catch {
        if (mounted) setAllowed(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!allowed) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push('/login');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = allowed === false;

  return (
    <div className="flex min-h-dvh items-center bg-slate-900 px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">Inkling</p>
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-50">Create your space</h2>
        <p className="mb-6 text-sm text-slate-400">A calmer place for your notes and ideas.</p>
        {disabled && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-900/40 border border-yellow-800 text-yellow-200">
            Registration is currently disabled. If you need access, contact the administrator.
          </div>
        )}
        {error && <p className="text-red-500 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 p-5 shadow-2xl shadow-slate-950/30">
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-2" htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-white focus:border-white focus:outline-none disabled:opacity-60"
              autoComplete="username"
              required
              disabled={disabled}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm mb-2" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-white focus:border-white focus:outline-none disabled:opacity-60"
              autoComplete="new-password"
              required
              disabled={disabled}
            />
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-xl bg-white py-2.5 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
