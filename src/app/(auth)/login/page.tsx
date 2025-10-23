
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push('/');
      } else {
        const data = await res.json();
        setError(data.message || 'Invalid credentials');
      }
    } catch (error) {
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div className="min-h-dvh bg-gray-900 px-4 py-8 flex items-center">
      <div className="w-full max-w-sm mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-white">Login</h2>
        {error && <p className="text-red-500 mb-4" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="bg-gray-800 p-5 rounded-2xl shadow-lg w-full">
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-2" htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Login
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
