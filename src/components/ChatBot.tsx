'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  loadCachedChat,
  refreshChatFromServer,
  sendChatMessage,
  clearChatHistory,
  type CachedChatMessage,
} from '@/lib/notesStore';

type ChatBotProps = {
  noteId: string;
  enabled: boolean;
};

export default function ChatBot({ noteId, enabled }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CachedChatMessage[] | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    (async () => {
      try {
        setBootError(null);
        const cached = await loadCachedChat(noteId);
        if (!active) return;
        setMessages(cached);
      } catch {
        if (!active) return;
        setBootError('Failed to load chat');
        setMessages([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [noteId, enabled]);

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages, sending]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  const handleRefresh = async () => {
    setMenuOpen(false);
    setRefreshing(true);
    setActionError(null);
    try {
      const fresh = await refreshChatFromServer(noteId);
      setMessages(fresh);
    } catch {
      setActionError('Could not refresh chat.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleClear = async () => {
    setMenuOpen(false);
    if (!window.confirm('Clear this chat history?')) return;
    try {
      setActionError(null);
      await clearChatHistory(noteId);
      setMessages([]);
    } catch {
      setActionError('Could not clear chat history.');
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setActionError(null);
    try {
      const updated = await sendChatMessage(noteId, text);
      setMessages(updated);
      setInput('');
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!enabled || !mounted) return null;

  const panel = open ? (
    <div className="fixed inset-0 z-40 flex items-end justify-end sm:items-stretch" role="dialog" aria-modal="true" aria-label="Ask AI about this note">
      <button
        type="button"
        aria-label="Close AI chat"
        className="absolute inset-0 bg-black/55 animate-fade-in"
        onClick={() => setOpen(false)}
      />

      <section
        className="relative z-10 flex h-[min(88dvh,100%)] w-full flex-col border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 animate-fade-in-up sm:h-full sm:w-[min(100%,24rem)] sm:border-l sm:animate-fade-in max-sm:rounded-t-3xl max-sm:border-t"
      >
        <div className="shrink-0 border-b border-slate-800">
          <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-slate-700" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-slate-950">
                AI
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-slate-50">Ask AI</h3>
                <p className="truncate text-xs text-slate-400">About this note</p>
              </div>
            </div>

            <div className="relative flex items-center gap-1" ref={menuRef}>
              <button
                type="button"
                aria-label="Chat options"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 active:scale-[.98]"
              >
                ⋯
              </button>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 active:scale-[.98]"
              >
                ✕
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 min-w-40 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-xl">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="block w-full px-3 py-2.5 text-left text-sm text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                  >
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="block w-full px-3 py-2.5 text-left text-sm text-rose-200 hover:bg-slate-700"
                  >
                    Clear chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div ref={listRef} className="note-content min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
          {bootError && (
            <div className="rounded-xl border border-amber-800/70 bg-amber-950/40 p-3 text-xs text-amber-200" role="status">
              {bootError}
            </div>
          )}
          {actionError && (
            <div className="rounded-xl border border-rose-800/70 bg-rose-950/40 p-3 text-xs text-rose-200" role="alert">
              {actionError}
            </div>
          )}

          {!messages || messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 px-4 py-8 text-center text-sm text-slate-400">
              Ask a question about this note.
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words ${
                    m.role === 'assistant' ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-950'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-a:text-white prose-pre:bg-slate-950/70">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                          table: ({ children }) => (
                            <div className="-mx-1 overflow-x-auto">
                              <table className="min-w-full break-words">{children}</table>
                            </div>
                          ),
                          pre: ({ children }) => <pre className="overflow-x-auto whitespace-pre-wrap break-words">{children}</pre>,
                          code: (props: { className?: string; children?: ReactNode }) => {
                            const { className, children, ...rest } = props;
                            return (
                              <code className={`${className || ''} break-words`} {...rest}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-slate-800 px-3.5 py-2.5 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-white/70 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  Thinking…
                </span>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-slate-800 bg-slate-900/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onComposerKeyDown}
              rows={1}
              placeholder="Ask anything about this note…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white"
            />
            <button
              type="submit"
              disabled={sending || input.trim().length === 0}
              className="min-h-11 shrink-0 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <p className="mt-2 hidden text-[11px] text-slate-500 sm:block">Enter to send · Shift+Enter for a new line</p>
        </form>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label="Ask AI about this note"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex h-14 min-w-14 items-center justify-center gap-2 rounded-2xl bg-white px-4 font-semibold text-slate-950 shadow-xl shadow-black/40 transition hover:bg-slate-200 active:scale-95 sm:bottom-8 sm:right-8"
      >
        <span className="text-sm">AI</span>
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </>
  );
}
