"use client";

import { useEffect, useState } from 'react';
import { getImageBlob, putImageBlob } from '@/lib/idb';

export default function CachedImage({ src, alt }: { src?: string; alt?: string }) {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>();

  useEffect(() => {
    let canceled = false;
    let objectUrl: string | undefined;

    const resolve = async () => {
      if (!src) {
        setResolvedSrc(undefined);
        return;
      }
      const match = src.match(/\/api\/images\/([a-f\d]{24})/i);
      const id = match?.[1];
      if (!id) {
        setResolvedSrc(src);
        return;
      }

      try {
        const cached = await getImageBlob(id);
        if (cached) {
          objectUrl = URL.createObjectURL(cached.blob);
          if (canceled) URL.revokeObjectURL(objectUrl);
          else setResolvedSrc(objectUrl);
          return;
        }

        const res = await fetch(src, { cache: 'no-store' });
        if (!res.ok) throw new Error('Image unavailable');
        const blob = await res.blob();
        await putImageBlob(id, blob, blob.type || 'image/*');
        objectUrl = URL.createObjectURL(blob);
        if (canceled) URL.revokeObjectURL(objectUrl);
        else setResolvedSrc(objectUrl);
      } catch {
        if (!canceled) setResolvedSrc(undefined);
      }
    };

    void resolve();
    return () => {
      canceled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolvedSrc} alt={alt || ''} loading="lazy" decoding="async" />
  );
}
