"use client";

import { useBackNavigation } from "./NavigationProvider";

export default function BackButton({ label = "Back" }: { label?: string }) {
  const { back, canGoBack } = useBackNavigation();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={back}
      className="inline-flex items-center gap-1 text-sm text-gray-300 hover:text-white active:scale-[.98] -ml-2 px-2 py-2 rounded-lg"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M10.5 19.5 3 12l7.5-7.5 1.06 1.06L6.621 10.5H21v1.5H6.621l4.939 4.94-1.06 1.06Z" />
      </svg>
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}
