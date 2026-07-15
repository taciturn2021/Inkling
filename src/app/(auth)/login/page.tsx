
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const raw = new URLSearchParams(window.location.search).get('next') || '';
        // Only allow relative paths that start with '/' but not '//' or '\' (protocol-relative / open redirect)
        const next = /^\/(?![/\\])/.test(raw) ? raw : '/';
        router.push(next);
      } else {
        const text = await res.text();
        let message = 'Invalid credentials';
        try {
          const data = JSON.parse(text);
          message = data.message || message;
        } catch {
          if (text) message = text;
        }
        setError(message);
      }
    } catch (error) {
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center bg-slate-900 px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">Inkling</p>
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-50">Welcome back</h2>
        <p className="mb-6 text-sm text-slate-400">Your ideas are waiting for you.</p>
        {error && <p className="text-red-500 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 p-5 shadow-2xl shadow-slate-950/30">
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-2" htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-white focus:border-white focus:outline-none"
              autoComplete="username"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm mb-2" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-700 px-3 py-2.5 text-white focus:border-white focus:outline-none"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-white py-2.5 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-400 text-sm">
          Don\'t have an account?{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
