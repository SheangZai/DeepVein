/**
 * Display names are seen by other players, so rude ones are swapped for a
 * default. Matching ignores case, spacing, punctuation and common letter
 * swaps ("f4ck", "s.h.i.t").
 */

export const DEFAULT_NAME = 'Miner';
export const MAX_NAME_LENGTH = 20;

/** Blocked when they appear anywhere in the name. */
const BLOCKED_ANYWHERE = [
  // English
  'fuck', 'fck', 'fack', 'phuck', 'shit', 'bitch', 'cunt', 'pussy', 'whore', 'slut', 'bastard',
  'asshole', 'arsehole', 'wank', 'twat', 'nigg', 'nigga', 'faggot', 'retard', 'rapist',
  'penis', 'vagina', 'porn', 'boob', 'tits', 'dildo', 'horny', 'nazi', 'hitler', 'motherf',
  // Malay / Indonesian
  'pukimak', 'puki', 'kimak', 'babi', 'bangsat', 'bodoh', 'sial', 'celaka', 'pantat', 'kontol',
  'memek', 'ngentot', 'anjing', 'jancok', 'jancuk', 'lancau', 'pepek', 'butoh', 'pelacur', 'sundal',
  'keparat', 'tolol', 'goblok',
  // Hokkien / Cantonese (romanised)
  'lanjiao', 'lancheow', 'chibai', 'cibai', 'kanninna', 'knn', 'diulei', 'diuleilomo', 'pokkai',
  // Tagalog
  'putangina', 'tangina', 'gago', 'puta', 'tarantado', 'ulol', 'bobo', 'pakyu', 'kantot',
  // Vietnamese (romanised)
  'ditme', 'dcm', 'vcl',
];

/** Blocked only as a whole word, because they hide inside innocent words. */
const BLOCKED_WORDS = ['ass', 'fag', 'kkk', 'sex', 'cum', 'tit', 'hoe', 'dick', 'cock', 'fuk', 'rape', 'cb'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b' };

function normalise(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[0-9!@$]/g, (c) => LEET[c] ?? c);
}

const ANYWHERE = BLOCKED_ANYWHERE.filter((w) => w.length >= 3);

export function isOffensive(text: string) {
  const plain = normalise(text);
  const compact = plain.replace(/[^a-z]/g, '');
  // Squash repeated letters too, so "fuuuck" and "shiiit" are caught.
  const squashed = compact.replace(/(.)\1+/g, '$1');
  if (ANYWHERE.some((w) => compact.includes(w) || squashed.includes(w))) return true;
  const words = plain.split(/[^a-z]+/).filter(Boolean);
  return words.some((w) => BLOCKED_WORDS.includes(w));
}

/** Trims and shortens a name, falling back to the default if it's empty or rude. */
export function cleanName(raw: string | null | undefined, fallback = DEFAULT_NAME) {
  const name = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
  if (!name || isOffensive(name)) return fallback;
  return name;
}
