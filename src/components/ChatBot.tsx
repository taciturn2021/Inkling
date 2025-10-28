'use client';

import { useEffect, useRef, useState } from 'react';
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
  enabled: boolean; // gate by role externally to avoid any UI trace for free users
};

export default function ChatBot({ noteId, enabled }: ChatBotProps) {
  const [messages, setMessages] = useState<CachedChatMessage[] | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const minSizeRef = useRef<{ w: number; h: number } | null>(null);

  // Read/Write persisted position
  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem('chat:pos');
      if (raw) {
        const v = JSON.parse(raw) as { x: number; y: number };
        setPos(v);
      }
      const minRaw = localStorage.getItem('chat:minimized');
      if (minRaw) setMinimized(minRaw === '1');
      const sizeRaw = localStorage.getItem('chat:size');
      if (sizeRaw) {
        try {
          const s = JSON.parse(sizeRaw) as { w: number; h: number };
          setSize(s);
        } catch {}
      }
    } catch {}
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (pos) {
      try { localStorage.setItem('chat:pos', JSON.stringify(pos)); } catch {}
    }
  }, [pos, enabled]);

  useEffect(() => {
    if (!enabled) return;
    try { localStorage.setItem('chat:minimized', minimized ? '1' : '0'); } catch {}
  }, [minimized, enabled]);

  // Persist size
  useEffect(() => {
    if (!enabled) return;
    if (size) {
      try { localStorage.setItem('chat:size', JSON.stringify(size)); } catch {}
      sizeRef.current = { ...size };
    }
  }, [size, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    (async () => {
      try {
        setBootError(null);
        // Load cached chat
        const cached = await loadCachedChat(noteId);
        if (!mounted) return;
        setMessages(cached);
      } catch (e) {
        if (!mounted) return;
        setBootError('Failed to load chat');
        setMessages([]);
      }
    })();
    return () => { mounted = false; };
  }, [noteId, enabled]);

  // Measure and set default position near bottom-right once container is rendered
  useEffect(() => {
    if (!enabled) return;
    if (pos) return; // already set (restored)
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const baseW = Math.min(window.innerWidth * 0.92, 300); // reduced min width
      const baseH = Math.min(window.innerHeight * 0.6, 340); // further reduced min height
      // Establish minimum size from initial
      minSizeRef.current = { w: baseW, h: baseH };
      // Initialize size if not restored
      if (!size) {
        sizeRef.current = { w: baseW, h: baseH };
        setSize({ w: baseW, h: baseH });
      } else {
        // Clamp restored size within viewport and at least min size
        const maxW = Math.max(200, window.innerWidth - 16);
        const maxH = Math.max(160, window.innerHeight - 16);
        const clamped = {
          w: Math.min(Math.max(size.w, baseW), maxW),
          h: Math.min(Math.max(size.h, baseH), maxH),
        };
        sizeRef.current = clamped;
        // Only set if changed to avoid loops
        if (clamped.w !== size.w || clamped.h !== size.h) setSize(clamped);
      }
      const effW = sizeRef.current.w || baseW;
      const effH = sizeRef.current.h || baseH;
      const x = Math.max(8, window.innerWidth - effW - 16);
      const y = Math.max(8, window.innerHeight - Math.min(el.clientHeight || effH, effH) - 16);
      setPos({ x, y });
    };
    // wait a frame for layout
    const id = requestAnimationFrame(compute);
    return () => cancelAnimationFrame(id);
  }, [enabled, pos, size]);

  // Clamp on resize
  useEffect(() => {
    if (!enabled) return;
    const onResize = () => {
      setPos((prev) => {
        if (!prev) return prev;
        const rect = containerRef.current?.getBoundingClientRect();
        const w = rect?.width ?? Math.min(window.innerWidth * 0.92, 300);
        const h = rect?.height ?? Math.min(window.innerHeight * 0.6, 340);
        sizeRef.current = { w, h };
        return {
          x: Math.min(Math.max(8, prev.x), Math.max(8, window.innerWidth - w - 8)),
          y: Math.min(Math.max(8, prev.y), Math.max(8, window.innerHeight - h - 8)),
        };
      });
      // Clamp stored size against viewport and minimums
      if (size) {
        const base = minSizeRef.current || { w: Math.min(window.innerWidth * 0.92, 300), h: Math.min(window.innerHeight * 0.6, 340) };
        const maxW = Math.max(200, window.innerWidth - 16);
        const maxH = Math.max(160, window.innerHeight - 16);
        const clamped = {
          w: Math.min(Math.max(size.w, base.w), maxW),
          h: Math.min(Math.max(size.h, base.h), maxH),
        };
        if (clamped.w !== size.w || clamped.h !== size.h) setSize(clamped);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [enabled, size]);

  // Clamp restored position on mount/update to keep window on-screen
  useEffect(() => {
    if (!enabled) return;
    if (!pos) return;
    const effW = size?.w ?? Math.min(window.innerWidth * 0.92, 300);
    const effH = size?.h ?? Math.min(window.innerHeight * 0.6, 420);
    const nx = Math.min(Math.max(8, pos.x), Math.max(8, window.innerWidth - effW - 8));
    const ny = Math.min(Math.max(8, pos.y), Math.max(8, window.innerHeight - effH - 8));
    if (nx !== pos.x || ny !== pos.y) setPos({ x: nx, y: ny });
  }, [enabled, pos, size]);

  // Resize handle drag
  const onResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = sizeRef.current || { w: Math.min(window.innerWidth * 0.92, 300), h: Math.min(window.innerHeight * 0.6, 420) };
    const minB = minSizeRef.current || { w: start.w, h: start.h };
    const move = (ev: PointerEvent) => {
      // Prevent page from scrolling while resizing on touch devices
      try { ev.preventDefault(); } catch {}
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const nextW = start.w + dx;
      const nextH = start.h + dy;
      const maxW = Math.max(200, window.innerWidth - 16);
      const maxH = Math.max(160, window.innerHeight - 16);
      const clamped = {
        w: Math.min(Math.max(nextW, minB.w), maxW),
        h: Math.min(Math.max(nextH, minB.h), maxH),
      };
      sizeRef.current = clamped;
      setSize(clamped);
      // Keep within viewport on resize
      setPos((prev) => {
        if (!prev) return prev;
        return {
          x: Math.min(Math.max(8, prev.x), Math.max(8, window.innerWidth - clamped.w - 8)),
          y: Math.min(Math.max(8, prev.y), Math.max(8, window.innerHeight - clamped.h - 8)),
        };
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handleRefresh = async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      const fresh = await refreshChatFromServer(noteId);
      setMessages(fresh);
    } catch (e) {
      // ignore; UI stays with cached
    } finally {
      setRefreshing(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const updated = await sendChatMessage(noteId, text);
      setMessages(updated);
      setInput('');
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err) {
      // surface lightweight toast via inline error state if desired
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    if (!enabled) return;
    try {
      await clearChatHistory(noteId);
      setMessages([]);
    } catch {}
  };

  if (!enabled) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = pos || { x: 12, y: 12 };
    setDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const rect = containerRef.current?.getBoundingClientRect();
      const w = rect?.width ?? Math.min(window.innerWidth * 0.92, 352);
      const h = rect?.height ?? Math.min(window.innerHeight * 0.6, 480);
      sizeRef.current = { w, h };
      const nx = Math.min(Math.max(8, startPos.x + dx), Math.max(8, window.innerWidth - w - 8));
      const ny = Math.min(Math.max(8, startPos.y + dy), Math.max(8, window.innerHeight - h - 8));
      setPos({ x: nx, y: ny });
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  if (minimized) {
    return (
      <button
        aria-label="Open AI chat"
        className="fixed z-20 bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg active:scale-[.98]"
        onClick={() => setMinimized(false)}
      >
        AI
      </button>
    );
  }

  return (
    <section
      ref={containerRef as any}
      className="fixed z-20"
      style={{
        left: pos ? `${pos.x}px` : undefined,
        top: pos ? `${pos.y}px` : undefined,
        width: size ? `${size.w}px` : 'min(92vw, 22rem)',
      }}
    >
      <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-800 bg-gray-900/95 backdrop-blur supports-backdrop-filter:bg-gray-900/75">
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center gap-2 border-b border-gray-800 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPointerDown}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white">AI</span>
            <h3 className="text-sm font-semibold">Ask AI about this note</h3>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleRefresh} className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 active:scale-[.98]">
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button onClick={handleClear} className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 active:scale-[.98]">
              Clear
            </button>
            <button onClick={(e) => { e.stopPropagation(); setMinimized(true); }} className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 active:scale-[.98]">
              Minimize
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={`${size ? '' : 'max-h-72'} overflow-y-auto p-3 space-y-2`} style={size ? { height: `${size.h}px` } : undefined}>
          {bootError && (
            <div className="text-xs text-yellow-300 bg-yellow-900/30 border border-yellow-800 rounded p-2">
              {bootError}
            </div>
          )}
          {!messages || messages.length === 0 ? (
            <div className="text-xs text-gray-400">Ask a question about this note.</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed ${m.role === 'assistant' ? 'bg-gray-800 text-gray-100' : 'bg-blue-600 text-white'}`}>
                  {m.role === 'assistant' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                        table: ({ children }) => (
                          <div className="-mx-2 overflow-x-auto"><table className="min-w-full">{children}</table></div>
                        ),
                        code: (props: any) => {
                          const { className, children, ...rest } = props;
                          return <code className={className} {...rest}>{children}</code>;
                        },
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-gray-800 text-gray-100">
                <span className="inline-flex items-center gap-2">
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  Thinking…
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-gray-800 p-2 flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about this note…"
            className="flex-1 bg-gray-800 border border-gray-700 text-gray-100 text-sm px-3 py-2 rounded-lg outline-none focus:border-blue-500 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={sending || input.trim().length === 0}
            className="rounded-lg bg-blue-600 disabled:bg-gray-600 text-white text-sm px-3 py-2 active:scale-[.98]"
          >
            Send
          </button>
        </form>
        {/* Resize handle button (drag to resize) */}
        <div className="absolute bottom-2 right-2">
          <button
            aria-label="Resize"
            onPointerDown={onResizePointerDown}
            className="h-7 w-7 rounded-md bg-gray-800/90 border border-gray-700 text-gray-300 active:scale-[.98] flex items-center justify-center touch-none"
            title="Drag to resize"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v6h-6"/>
              <path d="M21 21l-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}


