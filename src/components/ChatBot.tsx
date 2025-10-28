'use client';

import { useEffect, useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // Read/Write persisted position
  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem('chat:pos');
      if (raw) {
        const v = JSON.parse(raw) as { x: number; y: number };
        setPos(v);
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
      const w = Math.min(window.innerWidth * 0.92, 352); // 22rem max
      const h = Math.min(window.innerHeight * 0.6, 480); // rough height cap
      sizeRef.current = { w, h };
      const x = Math.max(8, window.innerWidth - w - 16);
      const y = Math.max(8, window.innerHeight - Math.min(el.clientHeight || h, h) - 16);
      setPos({ x, y });
    };
    // wait a frame for layout
    const id = requestAnimationFrame(compute);
    return () => cancelAnimationFrame(id);
  }, [enabled, pos]);

  // Clamp on resize
  useEffect(() => {
    if (!enabled) return;
    const onResize = () => {
      setPos((prev) => {
        if (!prev) return prev;
        const rect = containerRef.current?.getBoundingClientRect();
        const w = rect?.width ?? Math.min(window.innerWidth * 0.92, 352);
        const h = rect?.height ?? Math.min(window.innerHeight * 0.6, 480);
        sizeRef.current = { w, h };
        return {
          x: Math.min(Math.max(8, prev.x), Math.max(8, window.innerWidth - w - 8)),
          y: Math.min(Math.max(8, prev.y), Math.max(8, window.innerHeight - h - 8)),
        };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [enabled]);

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

  return (
    <section
      ref={containerRef as any}
      className="fixed z-20"
      style={{
        left: pos ? `${pos.x}px` : undefined,
        top: pos ? `${pos.y}px` : undefined,
        width: 'min(92vw, 22rem)',
      }}
    >
      <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-800 bg-gray-900/95 backdrop-blur supports-backdrop-filter:bg-gray-900/75">
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
          </div>
        </div>

        {/* Body */}
        <div className="max-h-72 overflow-y-auto p-3 space-y-2">
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
                  {m.content}
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
      </div>
    </section>
  );
}


