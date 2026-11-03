import type { PromptSource } from './types';

/** Daily dig #42 (11 Nov 2026) is the first that can use the November 2026 prompts. */
export const DAILY_V2_DIG = 42;

/** Marks prompts as new from a given daily dig. Shafts, Unlimited and TNT use them straight away. */
export function addedOnDig(dig: number, prompts: PromptSource[]): PromptSource[] {
  return prompts.map((p) => ({ ...p, since: dig }));
}
