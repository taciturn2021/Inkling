
'use client';

import { useRouter } from 'next/navigation';

type HeaderProps = { onManageLabels: () => void };

export default function Header({ onManageLabels }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 border-b border-gray-800">
      <div className="px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Notes</h1>
        <div className="flex items-center gap-2">
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
    </header>
  );
}
