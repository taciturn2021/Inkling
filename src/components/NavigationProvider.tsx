"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type NavContextValue = {
  back: () => void;
  canGoBack: boolean;
  stack: string[];
};

const NavContext = createContext<NavContextValue>({ back: () => {}, canGoBack: false, stack: [] });

function getFullPath(pathname: string, searchParams: URLSearchParams | null): string {
  const qs = searchParams?.toString();
  return qs && qs.length > 0 ? `${pathname}?${qs}` : pathname;
}

export default function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

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

  const canGoBack = (typeof window !== "undefined" && window.history.length > 1) || stack.length > 1;

  const back = () => {
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

  const value = useMemo(() => ({ back, canGoBack, stack }), [canGoBack, stack]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useBackNavigation() {
  return useContext(NavContext);
}
