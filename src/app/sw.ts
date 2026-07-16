/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith('/_next/static/'),
      handler: new CacheFirst({
        cacheName: 'inkling-static',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin &&
        ['style', 'script', 'font'].includes(request.destination),
      handler: new CacheFirst({
        cacheName: 'inkling-assets',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: /.*/,
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
