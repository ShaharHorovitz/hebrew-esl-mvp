/**
 * Central choice builder for quiz options
 * Ensures 4 unique, shuffled options with 1 correct answer
 */

export function buildChoices(
  correct: string,
  pool: string[],
  count = 4
): string[] {
  // Remove duplicates & the correct answer
  const uniq = Array.from(new Set(pool)).filter(x => x && x !== correct);
  
  // Fisher-Yates shuffle
  for (let i = uniq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniq[i], uniq[j]] = [uniq[j], uniq[i]];
  }
  
  const distractors = uniq.slice(0, Math.max(0, count - 1));
  const opts = [correct, ...distractors].slice(0, count);
  
  // Final shuffle so the correct isn't always first
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  
  return opts;
}
