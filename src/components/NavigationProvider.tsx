"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type NavContextValue = {
  back: () => void;
  canGoBack: boolean;
  stack: string[];
  startNavigating: () => void;
};

const NavContext = createContext<NavContextValue>({
  back: () => {},
  canGoBack: false,
  stack: [],
  startNavigating: () => {},
});

function getFullPath(pathname: string, searchParams: URLSearchParams | null): string {
  const qs = searchParams?.toString();
  return qs && qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

export default function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const [stack, setStack] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem("nav:stack");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const lastPathRef = useRef<string | null>(null);

  const fullPath = useMemo(() => getFullPath(pathname, searchParams), [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastPathRef.current === fullPath) return;

    setNavigating(false);
    setStack((prev) => {
      if (prev[prev.length - 1] === fullPath) return prev;
      const next = [...prev, fullPath].slice(-50); // cap size
      try {
        sessionStorage.setItem("nav:stack", JSON.stringify(next));
      } catch {}
      lastPathRef.current = fullPath;
      return next;
    });
  }, [fullPath]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        const nextPath = `${url.pathname}${url.search}`;
        const currentPath = `${window.location.pathname}${window.location.search}`;
        if (nextPath === currentPath) return;
        setNavigating(true);
      } catch {
        // ignore invalid urls
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const canGoBack = (typeof window !== "undefined" && window.history.length > 1) || stack.length > 1;

  const back = () => {
    setNavigating(true);
    if (typeof window === "undefined") {
      router.push("/");
      return;
    }
    // Prefer native history when available
    if (window.history.length > 1) {
      router.back();
      return;
    }
    // Fallback to our stack
    setStack((prev) => {
      if (prev.length <= 1) {
        router.push("/");
        return prev;
      }
      const next = prev.slice(0, -1);
      const target = next[next.length - 1] ?? "/";
      try {
        sessionStorage.setItem("nav:stack", JSON.stringify(next));
      } catch {}
      router.replace(target);
      return next;
    });
  };

  const startNavigating = () => setNavigating(true);

  const value = useMemo(
    () => ({ back, canGoBack, stack, startNavigating }),
    [canGoBack, stack]
  );

  return (
    <NavContext.Provider value={value}>
      {navigating && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-slate-800"
          role="progressbar"
          aria-label="Loading page"
        >
          <div className="h-full w-1/3 animate-[nav-progress_1.1s_ease-in-out_infinite] bg-white" />
        </div>
      )}
      {children}
    </NavContext.Provider>
  );
}

export function useBackNavigation() {
  return useContext(NavContext);
}

export function useStartNavigating() {
  return useContext(NavContext).startNavigating;
}
