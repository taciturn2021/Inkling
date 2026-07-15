export default function NoteLoading() {
  return (
    <div className="min-h-screen bg-slate-900 px-4 py-6 text-slate-50 sm:px-6" role="status" aria-live="polite">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <span className="h-9 w-20 animate-pulse rounded-xl bg-slate-800" />
          <span className="h-5 w-32 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="mt-8 space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-800/80" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800/80" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-800/60" />
        </div>
        <p className="mt-6 text-center text-sm text-slate-400">Opening note…</p>
      </div>
    </div>
  );
}
