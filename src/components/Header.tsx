

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type HeaderProps = {
  onManageLabels: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefreshChat?: () => void;
  refreshingChat?: boolean;
};

export default function Header({ onManageLabels, onRefresh, refreshing, searchTerm, onSearchChange, onRefreshChat, refreshingChat }: HeaderProps) {
  const router = useRouter();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
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
    <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur supports-backdrop-filter:bg-gray-900/60 border-b border-gray-800">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <h1 className="text-lg font-bold">Notes</h1>
          {/* Mobile search button */}
          <button
            aria-label="Search"
            onClick={() => setMobileSearchOpen((v) => !v)}
            className="sm:hidden rounded-lg bg-gray-800 border border-gray-700 text-gray-100 p-2 active:scale-[.98]"
          >
            {/* Magnifying glass */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-200">
              <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Desktop search */}
        <div className="hidden sm:flex flex-1">
          <div className="relative w-full">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search notes…"
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm pl-9 pr-8 py-2 rounded-lg outline-none focus:border-blue-500 placeholder-gray-500"
            />
            {searchTerm && (
              <button
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm px-3 py-2 active:scale-[.98]"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
          {onRefreshChat && (
            <button
              onClick={onRefreshChat}
              className="rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm px-3 py-2 active:scale-[.98] hidden sm:inline-flex"
            >
              {refreshingChat ? 'Refreshing chat…' : 'Refresh chat'}
            </button>
          )}
          <button
            onClick={onManageLabels}
            className="rounded-lg bg-blue-600 text-white text-sm px-3 py-2 active:scale-[.98]"
          >
            Labels
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 text-white text-sm px-3 py-2 active:scale-[.98]"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile search input */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search notes…"
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm pl-9 pr-8 py-2 rounded-lg outline-none focus:border-blue-500 placeholder-gray-500"
            />
            {searchTerm && (
              <button
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
