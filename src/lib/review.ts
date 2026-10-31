import * as StoreReview from 'expo-store-review';

import type { DigResult } from './progress';
import { createStore } from './storage';

/** When we last asked for a rating (ms). */
const lastAsked = createStore<number>('review:last-asked', 0);
const ASK_EVERY_MS = 120 * 24 * 60 * 60 * 1000;
const MIN_DIGS = 3;

/**
 * Asks for an App Store rating right after a good dig: a returning player
 * (a few digs in) who just struck a Ruby or Diamond. Apple also rate-limits
 * the prompt, so this may show nothing. No-op on web and TestFlight.
 */
export async function maybeAskForReview(result: DigResult, digsPlayed: number) {
  if (digsPlayed < MIN_DIGS) return;
  if (!result.answers.some((a) => a.tier === 'ruby' || a.tier === 'diamond')) return;
  if (Date.now() - lastAsked.get() < ASK_EVERY_MS) return;
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    lastAsked.set(Date.now());
    // Let the results screen land first.
    setTimeout(() => StoreReview.requestReview().catch(() => {}), 1500);
  } catch {
    // Never let a rating prompt break the results screen.
  }
}
