'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

type ApiKeySettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ApiKeySettings({ isOpen, onClose }: ApiKeySettingsProps) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setBootLoading(true);
      setMessage(null);
      setApiKey('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage(null);
      void loadCurrentKey();
    }
  }, [isOpen]);

  const loadCurrentKey = async () => {
    try {
      const res = await fetch('/api/user/api-key');
      if (res.ok) {
        const data = await res.json();
        setHasKey(data.hasKey);
        setMaskedKey(data.maskedKey);
      }
    } catch (e) {
      console.error('Failed to load API key:', e);
    } finally {
      setBootLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'API key saved successfully!' });
        setApiKey('');
        await loadCurrentKey();
      } else {
        setMessage({ type: 'error', text: 'Failed to save API key' });
      }
    } catch (e) {
      console.error('Save error:', e);
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    const keyToTest = apiKey.trim() || (hasKey ? 'current' : '');
    
    if (!keyToTest) {
      setMessage({ type: 'error', text: 'Please enter an API key or save one first' });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      // If testing the current saved key, fetch it first (we'll need to modify the backend to support this)
      // For now, we'll require users to paste the key to test it
      if (keyToTest === 'current') {
        setMessage({ type: 'error', text: 'Please paste your API key in the field above to test it' });
        setTesting(false);
        return;
      }

      const res = await fetch('/api/user/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      const data = await res.json();

      if (data.valid) {
        setMessage({ type: 'success', text: data.message || 'API key is valid!' });
      } else {
        setMessage({ type: 'error', text: data.message || 'API key is invalid' });
      }
    } catch (e) {
      console.error('Test error:', e);
      setMessage({ type: 'error', text: 'An error occurred while testing' });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    setApiKey('');
    setMessage(null);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const text = await res.text();
      let data: { message?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (res.ok) {
        setPasswordMessage({ type: 'success', text: data.message || 'Password changed. Redirecting to login…' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => router.push('/login'), 1500);
      } else {
        setPasswordMessage({
          type: 'error',
          text: data.message || 'Failed to change password',
        });
      }
    } catch (e) {
      console.error('Change password error:', e);
      setPasswordMessage({ type: 'error', text: 'An error occurred while changing password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!hasKey) {
      setMessage({ type: 'error', text: 'No API key to remove' });
      return;
    }

    if (!confirm('Are you sure you want to remove your API key? You will need to configure it again to use AI features.')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: '' }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'API key removed successfully!' });
        setApiKey('');
        await loadCurrentKey();
      } else {
        setMessage({ type: 'error', text: 'Failed to remove API key' });
      }
    } catch (e) {
      console.error('Remove error:', e);
      setMessage({ type: 'error', text: 'An error occurred while removing' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div
        className="my-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-50">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {bootLoading ? (
          <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading settings">
            <div className="h-16 animate-pulse rounded-xl border border-slate-700 bg-slate-800/80" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-800" />
              <div className="h-3 w-48 animate-pulse rounded bg-slate-800/70" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-800" />
              <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-800" />
            </div>
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="h-4 w-36 animate-pulse rounded bg-slate-800" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-800" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-800" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-800" />
            </div>
            <p className="text-center text-sm text-slate-400">Loading settings…</p>
          </div>
        ) : (
          <div className="animate-fade-in space-y-4">
          {hasKey && maskedKey && (
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
              <p className="mb-1 text-sm text-slate-400">Current API Key:</p>
              <p className="font-mono text-sm text-slate-300">{maskedKey}</p>
            </div>
          )}

          <div>
            <label htmlFor="apiKey" className="mb-2 block text-sm font-medium text-slate-300">
              Groq API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? 'Enter new API key to update' : 'Enter your Groq API key'}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white"
            />
            <p className="mt-1 text-xs text-slate-500">
              Get your API key from{' '}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline hover:text-slate-200"
              >
                Groq Console
              </a>
            </p>
          </div>

          {message && (
            <div
              className={`rounded-xl p-3 text-sm ${
                message.type === 'success'
                  ? 'border border-emerald-800/70 bg-emerald-950/40 text-emerald-200'
                  : 'border border-rose-800/70 bg-rose-950/40 text-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading || !apiKey.trim()}
                className="flex-1 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleTest}
                disabled={testing || (!apiKey.trim() && !hasKey)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test'}
              </button>
              {apiKey && (
                <button
                  onClick={handleClear}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 active:scale-[.98]"
                >
                  Clear
                </button>
              )}
            </div>
            {hasKey && (
              <button
                onClick={handleRemove}
                disabled={loading}
                className="w-full rounded-xl border border-rose-900/60 bg-rose-950/50 px-4 py-2 text-sm text-rose-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove API Key
              </button>
            )}
          </div>

          <div className="space-y-4 border-t border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-slate-200">Change Password</h3>

            <div>
              <label htmlFor="currentPassword" className="mb-2 block text-sm font-medium text-slate-300">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="mb-2 block text-sm font-medium text-slate-300">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-300">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters.</p>
            </div>

            {passwordMessage && (
              <div
                className={`rounded-xl p-3 text-sm ${
                  passwordMessage.type === 'success'
                    ? 'border border-emerald-800/70 bg-emerald-950/40 text-emerald-200'
                    : 'border border-rose-800/70 bg-rose-950/40 text-rose-200'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

