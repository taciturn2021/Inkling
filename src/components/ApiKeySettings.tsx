'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ApiKeySettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ApiKeySettings({ isOpen, onClose }: ApiKeySettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCurrentKey();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-100">API Key Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {hasKey && maskedKey && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-400 mb-1">Current API Key:</p>
              <p className="text-sm font-mono text-gray-300">{maskedKey}</p>
            </div>
          )}

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
              Gemini API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? 'Enter new API key to update' : 'Enter your Gemini API key'}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm px-3 py-2 rounded-lg outline-none focus:border-blue-500 placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get your API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-900/30 border border-green-700 text-green-300'
                  : 'bg-red-900/30 border border-red-700 text-red-300'
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
                className="flex-1 rounded-lg bg-blue-600 text-white text-sm px-4 py-2 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleTest}
                disabled={testing || (!apiKey.trim() && !hasKey)}
                className="flex-1 rounded-lg bg-green-600 text-white text-sm px-4 py-2 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test'}
              </button>
              {apiKey && (
                <button
                  onClick={handleClear}
                  className="rounded-lg bg-gray-700 text-white text-sm px-4 py-2 active:scale-[.98]"
                >
                  Clear
                </button>
              )}
            </div>
            {hasKey && (
              <button
                onClick={handleRemove}
                disabled={loading}
                className="w-full rounded-lg bg-red-600 text-white text-sm px-4 py-2 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove API Key
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

