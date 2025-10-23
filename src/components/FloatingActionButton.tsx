
import Link from 'next/link';

export default function FloatingActionButton() {
  return (
    <Link
      href="/notes/new"
      className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white font-bold w-14 h-14 flex items-center justify-center rounded-full shadow-lg"
      aria-label="Create new note"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </Link>
  );
}
