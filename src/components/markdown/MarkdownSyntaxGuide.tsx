"use client";

import { useState } from 'react';

export default function MarkdownSyntaxGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-200"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Syntax & features guide
        <span className="text-xs text-slate-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-700 px-3 py-3 text-xs leading-relaxed text-slate-400">
          <p><strong className="text-slate-300">Headings:</strong> <code># H1</code> … <code>###### H6</code></p>
          <p><strong className="text-slate-300">Emphasis:</strong> <code>**bold**</code>, <code>*italic*</code>, <code>`inline code`</code></p>
          <p><strong className="text-slate-300">Links &amp; images:</strong> <code>[text](url)</code>, paste or upload images</p>
          <p><strong className="text-slate-300">Lists:</strong> <code>- item</code> or <code>1. item</code></p>
          <p><strong className="text-slate-300">Tables:</strong> GitHub-style pipe tables</p>
          <p><strong className="text-slate-300">Math:</strong> <code>$inline$</code> and <code>$$block$$</code></p>
          <p><strong className="text-slate-300">Code:</strong> fenced blocks with language, e.g. <code>```js</code></p>
          <p><strong className="text-slate-300">Mermaid:</strong> <code>```mermaid</code> diagram blocks</p>
          <p><strong className="text-slate-300">Alerts:</strong> <code>&gt; [!NOTE]</code>, <code>[!TIP]</code>, <code>[!WARNING]</code>, etc.</p>
          <p className="text-slate-500">Raw HTML is not rendered for security.</p>
        </div>
      )}
    </div>
  );
}
