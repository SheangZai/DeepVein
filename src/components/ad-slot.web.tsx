import { useEffect } from 'react';

/**
 * Google AdSense unit for the wide web layout. Off until these are set as
 * build variables (in Cloudflare and .env):
 *   EXPO_PUBLIC_ADSENSE_CLIENT     ca-pub-…
 *   EXPO_PUBLIC_ADSENSE_SLOT_LEFT  ad unit id
 *   EXPO_PUBLIC_ADSENSE_SLOT_RIGHT ad unit id
 * Turning ads on also needs the privacy policy updated (public/privacy).
 */
const CLIENT = process.env.EXPO_PUBLIC_ADSENSE_CLIENT;
export const adsEnabled = !!CLIENT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function loadScript() {
  if (!CLIENT || document.getElementById('adsbygoogle-js')) return;
  const el = document.createElement('script');
  el.id = 'adsbygoogle-js';
  el.async = true;
  el.crossOrigin = 'anonymous';
  el.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  document.head.appendChild(el);
}

export function AdSlot({ slot, height }: { slot: string | undefined; height: number }) {
  useEffect(() => {
    if (!CLIENT || !slot) return;
    loadScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers and slow loads are fine: the space just stays empty.
    }
  }, [slot]);

  if (!CLIENT || !slot) return null;
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', width: 300, height }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
    />
  );
}
