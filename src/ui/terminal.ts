/**
 * Small, dependency-free terminal layout helpers.
 *
 * JavaScript string length counts UTF-16 code units, not terminal cells. The
 * launcher uses these helpers so long names and descriptions cannot push the
 * cursor past the declared pane width.
 */

const ANSI_PATTERN = /\x1b\[[0-?]*[ -/]*[@-~]/g;

export function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

function isCombining(codePoint: number): boolean {
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f)
    || (codePoint >= 0x1ab0 && codePoint <= 0x1aff)
    || (codePoint >= 0x1dc0 && codePoint <= 0x1dff)
    || (codePoint >= 0x20d0 && codePoint <= 0x20ff)
    || (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  );
}

function isWide(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f)
    || (codePoint >= 0x2329 && codePoint <= 0x232a)
    || (codePoint >= 0x2e80 && codePoint <= 0xa4cf)
    || (codePoint >= 0xac00 && codePoint <= 0xd7a3)
    || (codePoint >= 0xf900 && codePoint <= 0xfaff)
    || (codePoint >= 0xfe10 && codePoint <= 0xfe19)
    || (codePoint >= 0xfe30 && codePoint <= 0xfe6f)
    || (codePoint >= 0xff00 && codePoint <= 0xff60)
    || (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    || (codePoint >= 0x1f300 && codePoint <= 0x1faff)
  );
}

function codePointWidth(codePoint: number): number {
  if (codePoint === 0 || codePoint < 0x20 || (codePoint >= 0x7f && codePoint < 0xa0)) return 0;
  if (isCombining(codePoint)) return 0;
  return isWide(codePoint) ? 2 : 1;
}

export function displayWidth(value: string): number {
  return Array.from(stripAnsi(value)).reduce((width, character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return width + codePointWidth(codePoint);
  }, 0);
}

export function clipToWidth(value: string, width: number, ellipsis = '…'): string {
  if (width <= 0) return '';
  if (displayWidth(value) <= width) return value;

  const ellipsisWidth = displayWidth(ellipsis);
  const limit = Math.max(0, width - ellipsisWidth);
  let output = '';
  let used = 0;

  for (const character of Array.from(stripAnsi(value))) {
    const nextWidth = codePointWidth(character.codePointAt(0) ?? 0);
    if (used + nextWidth > limit) break;
    output += character;
    used += nextWidth;
  }

  return output + (ellipsisWidth <= width ? ellipsis : '');
}

export function padToWidth(value: string, width: number, fill = ' '): string {
  const clipped = clipToWidth(value, width, '');
  const missing = Math.max(0, width - displayWidth(clipped));
  return clipped + fill.repeat(missing);
}

export function centerText(value: string, width: number): string {
  const clipped = clipToWidth(value, width, '');
  const missing = Math.max(0, width - displayWidth(clipped));
  const left = Math.floor(missing / 2);
  return ' '.repeat(left) + clipped + ' '.repeat(missing - left);
}

export function wrapText(value: string, width: number): string[] {
  if (width <= 0) return [''];
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (displayWidth(candidate) <= width) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = displayWidth(word) <= width ? word : clipToWidth(word, width, '');
  }

  if (line) lines.push(line);
  return lines;
}
