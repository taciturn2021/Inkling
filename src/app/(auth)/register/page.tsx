
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [allowed, setAllowed] = useState<boolean | null>(null);
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
    }
  };

  const disabled = allowed === false;

  return (
    <div className="min-h-dvh bg-gray-900 px-4 py-8 flex items-center">
      <div className="w-full max-w-sm mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-white">Register</h2>
        {disabled && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-900/40 border border-yellow-800 text-yellow-200">
            Registration is currently disabled. If you need access, contact the administrator.
          </div>
        )}
        {error && <p className="text-red-500 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="bg-gray-800 p-5 rounded-2xl shadow-lg w-full">
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-2" htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
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
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              autoComplete="new-password"
              required
              disabled={disabled}
            />
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create account
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
