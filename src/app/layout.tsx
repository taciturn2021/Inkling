import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import 'katex/dist/katex.min.css';
import NavigationProvider from "@/components/NavigationProvider";
import '@/lib/scheduler';
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Note Reading Website",
  description: "A note-taking app for students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>
        <Suspense fallback={null}>
          <NavigationProvider>{children}</NavigationProvider>
        </Suspense>
      </body>
    </html>
  );
}
