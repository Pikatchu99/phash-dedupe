import { hammingDistance, type PerceptualHash } from "./hash.js";

export interface DuplicatePair {
  a: string;
  b: string;
  distance: number;
}

/**
 * Compares every hash against every other hash and returns the pairs whose
 * Hamming distance is at or below `threshold`, sorted by distance (closest
 * matches first). O(n²) — fine for a few thousand images; for much larger
 * libraries you'd want to bucket hashes (e.g. by a locality-sensitive prefix)
 * before comparing, which this package does not do yet.
 */
export function findDuplicatePairs(hashes: Map<string, PerceptualHash>, threshold: number): DuplicatePair[] {
  const entries = [...hashes.entries()];
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [pathA, hashA] = entries[i]!;
      const [pathB, hashB] = entries[j]!;
      const distance = hammingDistance(hashA, hashB);
      if (distance <= threshold) pairs.push({ a: pathA, b: pathB, distance });
    }
  }

  return pairs.sort((x, y) => x.distance - y.distance);
}

/**
 * Groups images into clusters of mutual near-duplicates using the pairs from
 * {@link findDuplicatePairs}. Grouping is transitive: if A~B and B~C are both
 * within the threshold, A/B/C land in the same cluster even if A and C alone
 * would exceed it. Only clusters with 2+ members are returned — files with no
 * match are omitted.
 */
export function clusterDuplicates(pairs: DuplicatePair[]): string[][] {
  const parent = new Map<string, string>();

  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    const p = parent.get(x)!;
    if (p !== x) {
      const root = find(p);
      parent.set(x, root);
      return root;
    }
    return p;
  }

  function union(a: string, b: string): void {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }

  for (const { a, b } of pairs) union(a, b);

  const groups = new Map<string, string[]>();
  for (const key of parent.keys()) {
    const root = find(key);
    const group = groups.get(root);
    if (group) group.push(key);
    else groups.set(root, [key]);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}
