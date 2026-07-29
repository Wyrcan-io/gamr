# Rendering Patterns

## Terminal Setup

```typescript
// Enter alternate buffer (saves current screen, can restore on exit)
terminal.write('\x1b[?1049h');

// Hide cursor
terminal.write('\x1b[?25l');
```

## ANSI Escape Codes Reference

### Cursor Positioning

```typescript
'\x1b[H'           // Move to 0,0 (home)
'\x1b[2J'          // Clear screen
`\x1b[${y};${x}H`  // Move to row y, column x (1-indexed)
```

### Colors

```typescript
// Reset
'\x1b[0m'

// Styles
'\x1b[1m'   // Bold
'\x1b[2m'   // Dim/faint
'\x1b[5m'   // Blink

// Foreground colors (standard)
'\x1b[91m'  // Bright red
'\x1b[92m'  // Bright green
'\x1b[93m'  // Bright yellow
'\x1b[94m'  // Bright blue
'\x1b[95m'  // Bright magenta
'\x1b[96m'  // Bright cyan
'\x1b[97m'  // Bright white

// 256-color mode
'\x1b[38;5;{n}m'  // Foreground (0-255)
'\x1b[48;5;{n}m'  // Background (0-255)
```

### Background Colors

```typescript
'\x1b[41m'  // Red background
'\x1b[42m'  // Green background
'\x1b[43m'  // Yellow background

// Combined:
'\x1b[41;97m'  // White text on red bg
```

## Box Drawing Characters

```typescript
// Corners
'╔' '╗' '╚' '╝'  // Double line
'┌' '┐' '└' '┘'  // Single line

// Lines
'═' '║'  // Double horizontal/vertical
'─' '│'  // Single horizontal/vertical
'━' '┃'  // Heavy horizontal/vertical

// Connectors
'╠' '╣' '╦' '╩' '╬'  // Double T and cross
'├' '┤' '┬' '┴' '┼'  // Single T and cross
```

## Common Visual Characters

```typescript
// Blocks
'█' '▓' '▒' '░'  // Full to light shade
'▀' '▄'          // Half blocks (top/bottom)
'▐' '▌'          // Half blocks (right/left)

// Shapes
'●' '○' '◉' '◯'  // Circles
'◆' '◇' '◈'      // Diamonds
'★' '☆' '✦' '✧'  // Stars
'▲' '▼' '◀' '▶'  // Triangles
'♦' '♥' '♠' '♣'  // Card suits

// Effects
'✗' '✓'          // X and check
'☠'              // Skull (death)
'×' '·'          // Multiply and dot
```

## Border Drawing

```typescript
function drawBorder(output: string, x: number, y: number, w: number, h: number, color: string): string {
  // Top
  output += `\x1b[${y};${x}H${color}╔${'═'.repeat(w)}╗\x1b[0m`;

  // Sides
  for (let row = 0; row < h; row++) {
    output += `\x1b[${y + 1 + row};${x}H${color}║\x1b[0m`;
    output += `\x1b[${y + 1 + row};${x + w + 1}H${color}║\x1b[0m`;
  }

  // Bottom
  output += `\x1b[${y + h + 1};${x}H${color}╚${'═'.repeat(w)}╝\x1b[0m`;

  return output;
}
```

## Centering Content

```typescript
const cols = terminal.cols;
const rows = terminal.rows;

// Center text horizontally
const text = 'GAME OVER';
const textX = Math.floor((cols - text.length) / 2);

// Center game area
const gameLeft = Math.max(2, Math.floor((cols - GAME_WIDTH - 2) / 2));
const gameTop = Math.max(3, Math.floor((rows - GAME_HEIGHT - 6) / 2));

// Center within game area
const msgX = gameLeft + Math.floor((GAME_WIDTH - msg.length) / 2) + 1;
```

## Color Cycling Effects

```typescript
// Rainbow cycle
const colors = ['\x1b[91m', '\x1b[93m', '\x1b[92m', '\x1b[96m', '\x1b[94m', '\x1b[95m'];
const colorIndex = Math.floor(glitchFrame / 5) % colors.length;
const cycleColor = colors[colorIndex];

// Flash between two colors
const flashColor = glitchFrame % 6 < 3 ? '\x1b[1;91m' : '\x1b[1;93m';

// Blink effect (built-in)
output += '\x1b[5m[ PRESS ANY KEY ]\x1b[0m';
```

## Glitch Title Pattern

```typescript
const title = [
  '{GAME_NAME_LINE_1}',
  '{GAME_NAME_LINE_2}',
];

let glitchFrame = 0;

// In render():
glitchFrame = (glitchFrame + 1) % 60;
const glitchOffset = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;
const titleX = Math.floor((cols - title[0].length) / 2) + glitchOffset;

if (glitchFrame >= 55 && glitchFrame < 58) {
  // Glitch mode: red top, cyan bottom, offset
  output += `\x1b[1;${titleX}H\x1b[91m${title[0]}\x1b[0m`;
  output += `\x1b[2;${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`;
} else {
  // Normal mode: theme color
  output += `\x1b[1;${titleX}H${themeColor}\x1b[1m${title[0]}\x1b[0m`;
  output += `\x1b[2;${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;
}
```

## Perspective Rendering (Runner-style)

```typescript
// Road width varies by distance
function getRoadWidth(row: number): number {
  const t = row / (TRACK_HEIGHT - 1);  // 0 (far) to 1 (near)
  const factor = Math.pow(t, 0.6);      // Exponential for perspective
  return Math.floor(ROAD_WIDTH_TOP + (ROAD_WIDTH_BOTTOM - ROAD_WIDTH_TOP) * factor);
}

// Object size scales with distance
const normalizedDepth = row / TRACK_HEIGHT;
let objectChar: string;
if (normalizedDepth < 0.25) {
  objectChar = '·';        // Far: tiny
} else if (normalizedDepth < 0.5) {
  objectChar = '●';        // Medium
} else if (normalizedDepth < 0.75) {
  objectChar = '◉◉';       // Closer
} else {
  objectChar = '███';      // Near: largest
}

// Dimming for distance
const dimming = normalizedDepth < 0.4 ? '\x1b[2m' : '';
output += `${dimming}${color}${objectChar}\x1b[0m`;
```

## Progress Bar

```typescript
function renderProgressBar(percent: number, width: number): string {
  const filled = Math.floor((percent / 100) * width);
  const empty = width - filled;
  return `[${'\x1b[92m█'.repeat(filled)}${'\x1b[2m░'.repeat(empty)}\x1b[0m] ${percent}%`;
}
```

## Stats Bar

```typescript
const livesDisplay = '♥'.repeat(lives);
const stats = `SCORE: ${score.toString().padStart(5, '0')}  LVL: ${level}  ${livesDisplay}`;
const statsX = Math.floor((cols - stats.length) / 2);
output += `\x1b[4;${statsX}H${themeColor}${stats}\x1b[0m`;
```

## Animation Frames

```typescript
// Character animation (4 frames)
const runFrame = Math.floor(distance * 3) % 4;
const runFrames = [
  ['◢█◣', '╱ ╲'],
  ['◢█◣', '│ │'],
  ['◢█◣', '╲ ╱'],
  ['◢█◣', '│ │'],
];
const playerChars = runFrames[runFrame];

// Invader animation (2 frames)
const animFrame = Math.floor(glitchFrame / 15) % 2;
const invaderSprites = [
  ['<O>', '</\\>'],  // Frame 0
  ['<O>', '\\/>'],   // Frame 1
];
const sprite = invaderSprites[animFrame];
```

## Vertical Stacking (Tower-style games)

When rendering objects that stack vertically (like blocks in a tower game):

```typescript
// CRITICAL: Lower array index = lower on screen (higher Y value)
// Block 0 at bottom, Block N at top
for (let i = 0; i < blocks.length; i++) {
  const block = blocks[i];
  // i=0 renders at bottom (highest screenY)
  // Higher i = higher on screen (lower screenY)
  const screenY = renderTop + GAME_HEIGHT - i;

  output += `\x1b[${screenY};${blockX}H${block.color}${blockStr}\x1b[0m`;
}
```

**Common mistake**: Using the same Y for all items, causing them to render on one row instead of stacking. Always subtract the index from the base Y position.

## Theme-Aware Colors

```typescript
import { getCurrentThemeColor, getSubtleBackgroundColor, isLightTheme } from '../utils';

// Main accent color
const themeColor = getCurrentThemeColor();

// Subtle background elements (walls, floors)
const bgColor = getSubtleBackgroundColor();

// Conditional styling for light themes
if (isLightTheme()) {
  // Use darker colors for visibility on light background
}
```
