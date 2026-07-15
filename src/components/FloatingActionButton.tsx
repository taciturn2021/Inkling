
import Link from 'next/link';

export default function FloatingActionButton() {
  return (
    <Link
      href="/notes/new"
      className="fixed bottom-5 right-5 z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white font-bold text-slate-950 shadow-xl shadow-black/40 transition hover:bg-slate-200 active:scale-95 sm:bottom-8 sm:right-8"
      aria-label="Create new note"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </Link>
  );
}
