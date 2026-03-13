/**
 * Parse a formatted monetary string (e.g. "$1,234,567", "₪1,234,567", or
 * RTL-marked "‏3,519,464 ‏₪") into a plain number, stripping currency
 * symbols, thousand separators, and Unicode directional marks.
 */
export function parseMoney(text: string | null | undefined): number {
  if (!text) return 0;
  // Strip currency symbols, commas, whitespace, and Unicode RTL/LTR marks
  return Number(text.replace(/[₪$,\s\u200F\u200E\u202A-\u202E\u2066-\u2069]/g, ''));
}
