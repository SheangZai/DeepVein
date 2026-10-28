import { findMatch, keyOf, numberSignature } from '@/game/match';
import { ANSWER_TIERS } from '@/game/tiers';

import type { AnswerEntry, Prompt, PromptSource } from './types';

export interface BuildIssue {
  promptId: string;
  message: string;
}

export function buildPrompt(src: PromptSource, issues: BuildIssue[] = []): Prompt {
  const entries: AnswerEntry[] = [];
  const keys = new Map<string, number>();
  const signatures = new Map<string, string>();

  for (const tier of ANSWER_TIERS) {
    const raw = tier === 'diamond' ? [src.diamond] : (src[tier] ?? []);
    for (const line of raw) {
      const [name, ...aliases] = line.split('|').map((s) => s.trim());
      const index = entries.length;
      entries.push({ id: `${src.id}:${index}`, name, tier });
      for (const form of [name, ...aliases]) {
        const key = keyOf(form);
        if (!key) continue;
        const prev = keys.get(key);
        if (prev !== undefined && prev !== index) {
          issues.push({
            promptId: src.id,
            message: `"${form}" collides with "${entries[prev].name}"`,
          });
          continue;
        }
        keys.set(key, index);
        signatures.set(key, numberSignature(form));
      }
    }
  }

  const gem = entries.find((e) => e.tier === 'diamond')!;
  return { id: src.id, category: src.category, text: src.text, entries, gem, keys, signatures };
}

export function matchAnswer(prompt: Prompt, input: string): AnswerEntry | null {
  const i = findMatch(prompt, input);
  return i === null ? null : prompt.entries[i];
}
