'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ApiKeySettings from './ApiKeySettings';
import { clearActiveUserData } from '@/lib/notesStore';

type HeaderProps = {
  onManageLabels: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefreshChat?: () => void;
  refreshingChat?: boolean;
  networkEnabled?: boolean;
};

function IconSearch({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRefresh({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTags({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSettings({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLogout({ className = '' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClear({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const iconBtn =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-100 active:scale-[.98] disabled:opacity-60 sm:h-auto sm:w-auto sm:px-3 sm:py-2';

export default function Header({
  onManageLabels,
  onRefresh,
  refreshing,
  searchTerm,
  onSearchChange,
  onRefreshChat,
  refreshingChat,
  networkEnabled = true,
}: HeaderProps) {
  const router = useRouter();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [apiKeySettingsOpen, setApiKeySettingsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
      await clearActiveUserData();
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileSearchOpen]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/90 backdrop-blur supports-backdrop-filter:bg-slate-900/75">
      <div className="flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <div className="min-w-0 flex-shrink-0">
          <h1 className="truncate text-lg font-bold tracking-tight">Inkling</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Your notes</p>
        </div>

        {/* Desktop search */}
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="relative w-full max-w-xl">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch />
            </span>
            <input
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search notes…"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-8 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white"
            />
            {searchTerm && (
              <button
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <IconClear />
              </button>
            )}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            aria-label="Search"
            onClick={() => setMobileSearchOpen((v) => !v)}
            className={`${iconBtn} sm:hidden ${mobileSearchOpen ? 'border-white text-white' : ''}`}
          >
            <IconSearch />
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className={iconBtn}
              disabled={refreshing}
              aria-label={refreshing ? 'Refreshing' : 'Refresh'}
            >
              <IconRefresh className={refreshing ? 'animate-spin' : ''} />
              <span className="ml-0 hidden sm:ml-2 sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          )}

          {onRefreshChat && (
            <button
              onClick={onRefreshChat}
              className={`${iconBtn} hidden sm:inline-flex`}
              aria-label={refreshingChat ? 'Refreshing chat' : 'Refresh chat'}
            >
              <span>{refreshingChat ? 'Refreshing chat…' : 'Refresh chat'}</span>
            </button>
          )}

          <button
            onClick={onManageLabels}
            disabled={!networkEnabled}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950 shadow-lg shadow-black/30 active:scale-[.98] sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-sm sm:font-medium"
            aria-label="Labels"
          >
            <IconTags className="sm:hidden" />
            <span className="hidden sm:inline">Labels</span>
          </button>

          <button
            onClick={() => setApiKeySettingsOpen(true)}
            disabled={!networkEnabled}
            className={iconBtn}
            aria-label="Settings"
          >
            <IconSettings />
          </button>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-900/60 bg-rose-950/50 text-rose-200 active:scale-[.98] disabled:opacity-60 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
            aria-label={loggingOut ? 'Logging out' : 'Log out'}
          >
            <IconLogout />
            <span className="hidden sm:inline">{loggingOut ? 'Leaving…' : 'Log out'}</span>
          </button>
        </div>
      </div>

      <ApiKeySettings isOpen={apiKeySettingsOpen} onClose={() => setApiKeySettingsOpen(false)} />

      {mobileSearchOpen && (
        <div className="border-t border-slate-800 px-4 py-3 sm:hidden">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch />
            </span>
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search notes…"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-8 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white"
            />
            {searchTerm && (
              <button
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <IconClear />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
