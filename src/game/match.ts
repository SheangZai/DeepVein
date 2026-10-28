/**
 * Lenient answer matching: case/accents/punctuation-insensitive, ignores a
 * leading "the", tolerates simple plurals and small typos. Typo tolerance
 * never crosses numbers ("Toy Story 2" ≠ "Toy Story 3", "Henry V" ≠ "Henry VI").
 */

const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/;

/** Space-separated normal form, e.g. "Kiki's Delivery Service" -> "kikis delivery service". */
export function normalizeWords(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’‘`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

/** Compact key used for lookups: no spaces. */
export function keyOf(input: string): string {
  return normalizeWords(input).replace(/ /g, '');
}

/** Digits and roman numerals in the answer; fuzzy matches must agree on these. */
export function numberSignature(input: string): string {
  return normalizeWords(input)
    .split(' ')
    .filter((t) => /^\d+$/.test(t) || ROMAN.test(t))
    .join(',');
}

function maxTypos(len: number) {
  if (len < 5) return 0;
  if (len < 9) return 1;
  return 2;
}

/** Optimal string alignment distance with an early exit above `limit`. */
export function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2][j - 2] + 1);
      }
      d[i][j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
  }
  return d[rows - 1][cols - 1];
}

export interface Matchable {
  /** Compact key -> entry index. */
  keys: Map<string, number>;
  /** Number signature per compact key. */
  signatures: Map<string, string>;
}

/** Returns the index of the matched entry, or null. */
export function findMatch(index: Matchable, input: string): number | null {
  const key = keyOf(input);
  if (!key) return null;

  const exact = index.keys.get(key);
  if (exact !== undefined) return exact;

  const plural = key.endsWith('s') ? index.keys.get(key.slice(0, -1)) : index.keys.get(key + 's');
  if (plural !== undefined) return plural;

  const limit = maxTypos(key.length);
  if (limit === 0) return null;
  const sig = numberSignature(input);

  let best: number | null = null;
  let bestDist = limit + 1;
  let tied = false;
  for (const [candidate, entry] of index.keys) {
    if (index.signatures.get(candidate) !== sig) continue;
    if (maxTypos(candidate.length) === 0) continue;
    const dist = editDistance(key, candidate, limit);
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
      tied = false;
    } else if (dist === bestDist && entry !== best) {
      tied = true;
    }
  }
  if (best === null || tied) return null;
  return best;
}
