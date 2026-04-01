/**
 * Serialize a dice counts map and optional bonus into dice notation.
 * @param diceCounts Map of die type (lowercase, e.g. "d6") to count
 * @param bonus Optional numeric modifier
 * @returns Notation string like "2d6+1d8+3"
 */
export function serializeNotation(
  diceCounts: Record<string, number>,
  bonus?: number
): string {
  const parts: string[] = [];

  // Sort by die size for consistent output
  const entries = Object.entries(diceCounts)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => {
      const sizeA = parseInt(a.replace("d", ""), 10);
      const sizeB = parseInt(b.replace("d", ""), 10);
      return sizeA - sizeB;
    });

  for (const [type, count] of entries) {
    parts.push(`${count}${type}`);
  }

  if (bonus && bonus !== 0) {
    parts.push(`${bonus}`);
  }

  return parts.join("+");
}
