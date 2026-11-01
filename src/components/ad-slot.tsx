/**
 * Ad space for the wide web layout. The app itself shows no ads, so the native
 * version renders nothing. See ad-slot.web.tsx for the web version.
 */
export const adsEnabled = false;

export function AdSlot(_props: { slot: string | undefined; height: number }) {
  return null;
}
