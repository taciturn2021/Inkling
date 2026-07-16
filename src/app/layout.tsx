import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import 'katex/dist/katex.min.css';
import NavigationProvider from "@/components/NavigationProvider";
import ServiceWorkerProvider from "@/components/ServiceWorkerProvider";
import '@/lib/scheduler';
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Inkling",
  description: "A note-taking app for students",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/inkling-icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>
        <ServiceWorkerProvider>
          <Suspense fallback={null}>
            <NavigationProvider>{children}</NavigationProvider>
          </Suspense>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
