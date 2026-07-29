/**
 * Terminal color themes
 *
 * Provides both CSS colors (for UI) and ANSI escape codes (for terminal).
 */

/**
 * Available theme identifiers
 */
export type PhosphorMode =
  | 'cyan'
  | 'cyanLight'
  | 'amber'
  | 'green'
  | 'white'
  | 'hotpink'
  | 'hotpinkLight'
  | 'blood'
  | 'ice'
  | 'iceLight'
  | 'bladerunner'
  | 'bladerunnerLight'
  | 'tron'
  | 'tronLight'
  | 'daylight'
  | 'kawaii'
  | 'kawaiiLight'
  | 'oled'
  | 'solarized'
  | 'solarizedLight'
  | 'nord'
  | 'nordLight'
  | 'highcontrast'
  | 'highcontrastLight'
  | 'banana'
  | 'cream';

/**
 * Theme color definition for CSS/UI usage
 */
export interface ThemeColors {
  /** Display name */
  name: string;
  /** Emoji icon for quick switcher / UI */
  icon: string;
  /** Primary text/accent color (hex) */
  primary: string;
  /** Secondary accent color (hex) */
  secondary: string;
  /** Subtle glow effect (rgba) */
  glow: string;
  /** Intense glow effect (rgba) */
  glowIntense: string;
  /** Background color (hex) */
  bg: string;
  /** Status bar background - slightly elevated from bg */
  statusBarBg: string;
  /** Terminal foreground color - defaults to primary if not set */
  foreground?: string;
}

/**
 * All theme definitions with CSS colors
 */
export const themes: Record<PhosphorMode, ThemeColors> = {
  cyan: {
    name: 'Cyberpunk',
    icon: '🔵',
    primary: '#00D9FF',
    secondary: '#FF006E',
    glow: 'rgba(0, 217, 255, 0.5)',
    glowIntense: 'rgba(0, 217, 255, 0.8)',
    bg: '#0A1628',
    statusBarBg: '#0D1E38',
  },
  cyanLight: {
    name: 'Cyberpunk Light',
    icon: '💠',
    primary: '#0099CC',
    secondary: '#CC0066',
    glow: 'rgba(0, 153, 204, 0.15)',
    glowIntense: 'rgba(0, 153, 204, 0.3)',
    bg: '#F8FAFF',
    statusBarBg: '#EEF2FA',
    foreground: '#2d3640', // Dark text for terminal readability
  },
  amber: {
    name: 'Fallout',
    icon: '🟠',
    primary: '#FFB000',
    secondary: '#FF6600',
    glow: 'rgba(255, 176, 0, 0.5)',
    glowIntense: 'rgba(255, 176, 0, 0.8)',
    bg: '#1C1408',
    statusBarBg: '#2A1E0C',
  },
  green: {
    name: 'Matrix',
    icon: '🟢',
    primary: '#39FF14',
    secondary: '#00FF00',
    glow: 'rgba(57, 255, 20, 0.5)',
    glowIntense: 'rgba(57, 255, 20, 0.8)',
    bg: '#001A00',
    statusBarBg: '#002800',
  },
  white: {
    name: 'Ghost',
    icon: '⚪',
    primary: '#FFFFFF',
    secondary: '#88CCFF',
    glow: 'rgba(255, 255, 255, 0.3)',
    glowIntense: 'rgba(255, 255, 255, 0.5)',
    bg: '#0C0C0C',
    statusBarBg: '#1A1A1A',
  },
  hotpink: {
    name: 'Synthwave',
    icon: '🩷',
    primary: '#FF6AC1',
    secondary: '#00D9FF',
    glow: 'rgba(255, 106, 193, 0.5)',
    glowIntense: 'rgba(255, 106, 193, 0.8)',
    bg: '#0F0818',
    statusBarBg: '#1A0F28',
  },
  hotpinkLight: {
    name: 'Synthwave Light',
    icon: '🌷',
    primary: '#D84A9C',
    secondary: '#0099BB',
    glow: 'rgba(216, 74, 156, 0.15)',
    glowIntense: 'rgba(216, 74, 156, 0.3)',
    bg: '#FFF8FC',
    statusBarBg: '#F5EEF2',
    foreground: '#2d3640', // Dark text for terminal readability
  },
  blood: {
    name: 'Blood',
    icon: '🔴',
    primary: '#FF3333',
    secondary: '#AA0000',
    glow: 'rgba(255, 51, 51, 0.5)',
    glowIntense: 'rgba(255, 51, 51, 0.8)',
    bg: '#1A0505',
    statusBarBg: '#280808',
  },
  ice: {
    name: 'Ice',
    icon: '🩵',
    primary: '#88FFFF',
    secondary: '#4488FF',
    glow: 'rgba(136, 255, 255, 0.4)',
    glowIntense: 'rgba(136, 255, 255, 0.7)',
    bg: '#051520',
    statusBarBg: '#082030',
  },
  iceLight: {
    name: 'Ice Light',
    icon: '🧊',
    primary: '#0077AA',
    secondary: '#2255CC',
    glow: 'rgba(0, 119, 170, 0.12)',
    glowIntense: 'rgba(0, 119, 170, 0.25)',
    bg: '#F0FAFF',
    statusBarBg: '#E5F0F8',
    foreground: '#2d3640', // Dark text for terminal readability
  },
  bladerunner: {
    name: 'Blade Runner',
    icon: '🟧',
    primary: '#FF6B35',
    secondary: '#00CED1',
    glow: 'rgba(255, 107, 53, 0.6)',
    glowIntense: 'rgba(255, 107, 53, 0.9)',
    bg: '#1F0E08',
    statusBarBg: '#2D150C',
  },
  bladerunnerLight: {
    name: 'Blade Runner Light',
    icon: '🌅',
    primary: '#CC4400',
    secondary: '#008B8B',
    glow: 'rgba(204, 68, 0, 0.15)',
    glowIntense: 'rgba(204, 68, 0, 0.3)',
    bg: '#FFFAF5',
    statusBarBg: '#F5EFEA',
    foreground: '#2d3640', // Dark text for terminal readability
  },
  tron: {
    name: 'Tron',
    icon: '🔷',
    primary: '#6FFFE9',
    secondary: '#FF6B00',
    glow: 'rgba(111, 255, 233, 0.5)',
    glowIntense: 'rgba(111, 255, 233, 0.8)',
    bg: '#020815',
    statusBarBg: '#051020',
  },
  tronLight: {
    name: 'Tron Light',
    icon: '💎',
    primary: '#008080',
    secondary: '#CC5500',
    glow: 'rgba(0, 128, 128, 0.15)',
    glowIntense: 'rgba(0, 128, 128, 0.3)',
    bg: '#F5FFFF',
    statusBarBg: '#EAF5F5',
    foreground: '#2d3640', // Dark text for terminal readability
  },
  daylight: {
    name: 'Daylight',
    icon: '☀️',
    primary: '#1a1a1a',
    secondary: '#0066CC',
    glow: 'rgba(0, 102, 204, 0.1)',
    glowIntense: 'rgba(0, 102, 204, 0.2)',
    bg: '#FAFAF8',
    statusBarBg: '#EEEEEC',
    foreground: '#1a1a1a', // Matches primary for consistent dark text
  },
  kawaii: {
    name: 'Kawaii',
    icon: '🌸',
    primary: '#FF69B4',
    secondary: '#87CEEB',
    glow: 'rgba(255, 105, 180, 0.6)',
    glowIntense: 'rgba(255, 105, 180, 0.9)',
    bg: '#1E0818',
    statusBarBg: '#2D0F25',
  },
  kawaiiLight: {
    name: 'Kawaii Light',
    icon: '🎀',
    primary: '#D4458B',
    secondary: '#7B68EE',
    glow: 'rgba(255, 105, 180, 0.2)',
    glowIntense: 'rgba(255, 105, 180, 0.4)',
    bg: '#FFF5F8',
    statusBarBg: '#F5EAEE',
    foreground: '#2d3640', // Dark text for terminal readability
  },
  oled: {
    name: 'OLED Black',
    icon: '⚫',
    primary: '#FFFFFF',
    secondary: '#00D9FF',
    glow: 'rgba(255, 255, 255, 0.3)',
    glowIntense: 'rgba(255, 255, 255, 0.5)',
    bg: '#000000',
    statusBarBg: '#0A0A0A',
  },
  solarized: {
    name: 'Solarized',
    icon: '🌊',
    primary: '#2AA198',
    secondary: '#859900',
    glow: 'rgba(42, 161, 152, 0.4)',
    glowIntense: 'rgba(42, 161, 152, 0.6)',
    bg: '#002B36',
    statusBarBg: '#073642',
    foreground: '#D4D4D4', // Light gray for better readability
  },
  solarizedLight: {
    name: 'Solarized Light',
    icon: '🏖️',
    primary: '#657B83',
    secondary: '#268BD2',
    glow: 'rgba(38, 139, 210, 0.15)',
    glowIntense: 'rgba(38, 139, 210, 0.25)',
    bg: '#FDF6E3',
    statusBarBg: '#EEE8D5',
    foreground: '#586e75', // Solarized base01 for terminal text
  },
  nord: {
    name: 'Nord',
    icon: '❄️',
    primary: '#88C0D0',
    secondary: '#81A1C1',
    glow: 'rgba(136, 192, 208, 0.3)',
    glowIntense: 'rgba(136, 192, 208, 0.5)',
    bg: '#2E3440',
    statusBarBg: '#3B4252',
  },
  nordLight: {
    name: 'Nord Light',
    icon: '🏔️',
    primary: '#2E3440',
    secondary: '#5E81AC',
    glow: 'rgba(94, 129, 172, 0.15)',
    glowIntense: 'rgba(94, 129, 172, 0.25)',
    bg: '#ECEFF4',
    statusBarBg: '#E5E9F0',
    foreground: '#2E3440', // Nord polar night for terminal text
  },
  highcontrast: {
    name: 'High Contrast',
    icon: '◐',
    primary: '#FFFFFF',
    secondary: '#FFFF00',
    glow: 'rgba(255, 255, 255, 0.1)',
    glowIntense: 'rgba(255, 255, 255, 0.2)',
    bg: '#000000',
    statusBarBg: '#111111',
  },
  highcontrastLight: {
    name: 'High Contrast Light',
    icon: '◑',
    primary: '#000000',
    secondary: '#0000CC',
    glow: 'rgba(0, 0, 0, 0.05)',
    glowIntense: 'rgba(0, 0, 0, 0.1)',
    bg: '#FFFFFF',
    statusBarBg: '#EEEEEE',
    foreground: '#000000', // Maximum contrast for terminal text
  },
  banana: {
    name: 'Banana',
    icon: '🍌',
    primary: '#FFE135',
    secondary: '#8B7500',
    glow: 'rgba(255, 225, 53, 0.5)',
    glowIntense: 'rgba(255, 225, 53, 0.8)',
    bg: '#1A1800',
    statusBarBg: '#282400',
  },
  cream: {
    name: 'Cream',
    icon: '🍦',
    primary: '#4A3C2A',
    secondary: '#C17844',
    glow: 'rgba(193, 120, 68, 0.12)',
    glowIntense: 'rgba(193, 120, 68, 0.22)',
    bg: '#EDE5D4',
    statusBarBg: '#E3DBCA',
    foreground: '#4A3C2A',
  },
};

/**
 * ANSI escape codes for terminal text coloring
 */
const ansiCodes: Record<PhosphorMode, string> = {
  cyan: '\x1b[96m',
  cyanLight: '\x1b[38;5;31m',
  amber: '\x1b[93m',
  green: '\x1b[92m',
  white: '\x1b[97m',
  hotpink: '\x1b[95m',
  hotpinkLight: '\x1b[38;5;169m',
  blood: '\x1b[91m',
  ice: '\x1b[96m',
  iceLight: '\x1b[38;5;31m',
  bladerunner: '\x1b[38;5;208m',
  bladerunnerLight: '\x1b[38;5;166m',
  tron: '\x1b[96m',
  tronLight: '\x1b[38;5;30m',
  daylight: '\x1b[34m',
  kawaii: '\x1b[95m',
  kawaiiLight: '\x1b[35m',
  oled: '\x1b[97m',
  solarized: '\x1b[36m',
  solarizedLight: '\x1b[38;5;66m',
  nord: '\x1b[96m',
  nordLight: '\x1b[38;5;59m',
  highcontrast: '\x1b[97m',
  highcontrastLight: '\x1b[30m',
  banana: '\x1b[93m',
  cream: '\x1b[38;5;130m',
};

/**
 * Light themes that need dark text
 */
const lightThemes: Set<PhosphorMode> = new Set([
  'cyanLight',
  'hotpinkLight',
  'iceLight',
  'bladerunnerLight',
  'tronLight',
  'daylight',
  'kawaiiLight',
  'solarizedLight',
  'nordLight',
  'highcontrastLight',
  'cream',
]);

/**
 * Subtle background colors for game elements
 */
const subtleColors: Partial<Record<PhosphorMode, string>> = {
  cyanLight: '\x1b[38;5;153m',
  hotpinkLight: '\x1b[38;5;225m',
  iceLight: '\x1b[38;5;195m',
  bladerunnerLight: '\x1b[38;5;223m',
  tronLight: '\x1b[38;5;159m',
  daylight: '\x1b[38;5;252m',
  kawaiiLight: '\x1b[38;5;218m',
  solarizedLight: '\x1b[38;5;187m',
  nordLight: '\x1b[38;5;255m',
  highcontrastLight: '\x1b[38;5;250m',
  cream: '\x1b[38;5;223m',
  oled: '\x1b[38;5;234m',
  highcontrast: '\x1b[38;5;238m',
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get theme colors by mode
 */
export function getTheme(mode: PhosphorMode): ThemeColors {
  return themes[mode];
}

/**
 * Get ANSI escape code for a theme
 */
export function getAnsiColor(mode: PhosphorMode): string {
  return ansiCodes[mode] || '\x1b[92m';
}

/**
 * Check if a theme is light (needs dark text)
 */
export function isLightTheme(mode: PhosphorMode): boolean {
  return lightThemes.has(mode);
}

/**
 * Get subtle background color for game elements
 */
export function getSubtleColor(mode: PhosphorMode): string {
  return subtleColors[mode] || '\x1b[38;5;236m';
}

/**
 * Get all available theme modes
 */
export function getThemeModes(): PhosphorMode[] {
  return Object.keys(themes) as PhosphorMode[];
}

const VALID_THEME_MODES = new Set<string>(Object.keys(themes));

/**
 * Check if a string is a valid theme mode
 */
export function isValidThemeMode(value: string): value is PhosphorMode {
  return VALID_THEME_MODES.has(value);
}

/**
 * ANSI reset code
 */
export const ANSI_RESET = '\x1b[0m';

// ============================================================================
// xterm.js Terminal Theme
// ============================================================================

/**
 * xterm.js ITheme-compatible color set.
 * Includes the 16 ANSI colors, selection, cursor, scrollbar, and foreground/background.
 */
export interface ITerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  selectionForeground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
  scrollbarSliderBackground: string;
  scrollbarSliderHoverBackground: string;
  scrollbarSliderActiveBackground: string;
}

/**
 * Generate a full xterm.js theme from a PhosphorMode.
 *
 * Maps theme colors to the 16 ANSI colors, selection, cursor, and scrollbar.
 * Light themes get inverted black/white and muted ANSI colors for readability.
 */
export function getTerminalTheme(mode: PhosphorMode): ITerminalTheme {
  const theme = themes[mode];
  const isLight = lightThemes.has(mode);

  const selectionBg = isLight ? '#3399FF' : theme.primary;
  const selectionFg = isLight ? '#000000' : '#000000';

  // For light themes, invert black/white so apps that hard-code dark backgrounds
  // (e.g. Codex using \033[40m) remain readable on light terminal backgrounds.
  let black, white, brightBlack, brightWhite;

  if (isLight) {
    black = theme.bg;
    white = '#1a1a1a';
    brightBlack = '#e0e0e0';
    brightWhite = '#2a2a2a';
  } else {
    black = theme.bg;
    white = '#FFFFFF';
    brightBlack = '#636B7C';
    brightWhite = '#FFFFFF';
  }

  const cursorAccent = isLight
    ? (theme.foreground ?? '#1a1a1a')
    : theme.bg;

  return {
    background: "rgba(0, 0, 0, 0)",
    foreground: theme.foreground ?? theme.primary,
    cursor: theme.secondary,
    cursorAccent,
    selectionBackground: selectionBg,
    selectionForeground: selectionFg,
    black,
    red: isLight ? "#c41a16" : "#FF0040",
    green: isLight ? "#007400" : "#39FF14",
    yellow: isLight ? "#826b00" : "#E5C400",
    blue: isLight ? "#0451a5" : "#7AA2F7",
    magenta: isLight ? "#a626a4" : theme.secondary,
    cyan: isLight ? "#0598bc" : theme.primary,
    white,
    brightBlack,
    brightRed: isLight ? "#e45649" : "#FF006E",
    brightGreen: isLight ? "#50a14f" : "#39FF14",
    brightYellow: isLight ? "#c18401" : "#FFD400",
    brightBlue: isLight ? "#4078f2" : "#89B4FA",
    brightMagenta: isLight ? "#c678dd" : theme.secondary,
    brightCyan: isLight ? "#0184bc" : theme.primary,
    brightWhite,
    scrollbarSliderBackground: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.1)',
    scrollbarSliderHoverBackground: isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.18)',
    scrollbarSliderActiveBackground: isLight ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.25)',
  };
}

// ============================================================================
// Light Theme Escape Sequence Transformer
// ============================================================================

function srgbToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(
  fgR: number,
  fgG: number,
  fgB: number,
  bgR: number,
  bgG: number,
  bgB: number
): number {
  const fgLum = relativeLuminance(fgR, fgG, fgB);
  const bgLum = relativeLuminance(bgR, bgG, bgB);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureReadableForegroundOnLightTheme(
  red: number,
  green: number,
  blue: number,
  bgR: number,
  bgG: number,
  bgB: number,
  minContrast = 4.2
): [number, number, number] {
  if (contrastRatio(red, green, blue, bgR, bgG, bgB) >= minContrast) {
    return [red, green, blue];
  }

  for (let step = 1; step <= 20; step += 1) {
    const factor = 1 - step / 20;
    const nextR = Math.round(red * factor);
    const nextG = Math.round(green * factor);
    const nextB = Math.round(blue * factor);
    if (contrastRatio(nextR, nextG, nextB, bgR, bgG, bgB) >= minContrast) {
      return [nextR, nextG, nextB];
    }
  }

  return [30, 30, 30];
}

function ansi256ToRgb(colorIndex: number): [number, number, number] | null {
  if (colorIndex < 0 || colorIndex > 255) return null;

  // Standard + bright ANSI palette.
  const basePalette: Array<[number, number, number]> = [
    [0, 0, 0],
    [205, 49, 49],
    [13, 188, 121],
    [229, 229, 16],
    [36, 114, 200],
    [188, 63, 188],
    [17, 168, 205],
    [229, 229, 229],
    [102, 102, 102],
    [241, 76, 76],
    [35, 209, 139],
    [245, 245, 67],
    [59, 142, 234],
    [214, 112, 214],
    [41, 184, 219],
    [255, 255, 255],
  ];

  if (colorIndex <= 15) return basePalette[colorIndex];

  if (colorIndex >= 16 && colorIndex <= 231) {
    const idx = colorIndex - 16;
    const red = Math.floor(idx / 36);
    const green = Math.floor((idx % 36) / 6);
    const blue = idx % 6;
    const level = [0, 95, 135, 175, 215, 255];
    return [level[red], level[green], level[blue]];
  }

  const gray = 8 + (colorIndex - 232) * 10;
  return [gray, gray, gray];
}

/**
 * Transform ANSI escape sequences for light themes.
 *
 * Apps like Codex use true color (24-bit) escape sequences that bypass our
 * theme's ANSI color settings. This intercepts dark backgrounds/foregrounds
 * and inverts them so TUI apps remain readable on light backgrounds.
 *
 * @param data - Raw terminal data with ANSI escape sequences
 * @param themeBg - The theme's background color hex (e.g., "#F5E6D3")
 * @returns Transformed data with inverted colors for light themes
 */
export function transformEscapeSequencesForLightTheme(data: string, themeBg: string): string {
  const bgR = parseInt(themeBg.slice(1, 3), 16);
  const bgG = parseInt(themeBg.slice(3, 5), 16);
  const bgB = parseInt(themeBg.slice(5, 7), 16);
  // Keep a small but visible contrast band so TUI input/panel regions
  // remain distinguishable on light themes.
  const highlightDelta = 22;
  const highlightR = Math.max(bgR - highlightDelta, 0);
  const highlightG = Math.max(bgG - highlightDelta, 0);
  const highlightB = Math.max(bgB - highlightDelta, 0);

  const transformSgr = (sequence: string) => {
    const body = sequence.slice(2, -1);
    if (body.length === 0) return sequence;

    const normalized = body.replace(/:/g, ';');
    const rawParams = normalized.split(';');
    const params: number[] = [];

    for (const raw of rawParams) {
      if (raw === '') {
        params.push(0);
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        return sequence;
      }
      params.push(value);
    }

    let changed = false;
    const out: number[] = [];

    for (let i = 0; i < params.length; i += 1) {
      const code = params[i];

      // 24-bit background color (48;2;R;G;B)
      if (code === 48 && params[i + 1] === 2 && i + 4 < params.length) {
        const hasColorSpace = i + 5 < params.length
          && params[i + 2] === 0
          && params[i + 3] <= 255
          && params[i + 4] <= 255
          && params[i + 5] <= 255;
        const offset = hasColorSpace ? 3 : 2;
        const red = params[i + offset];
        const green = params[i + offset + 1];
        const blue = params[i + offset + 2];
        const sum = red + green + blue;

        if (sum < 600) {
          // Dark and mid-range backgrounds -> theme bg (invisible)
          out.push(48, 2, bgR, bgG, bgB);
          changed = true;
        } else {
          // Preserve bright panel/input backgrounds as subtle contrast.
          out.push(48, 2, highlightR, highlightG, highlightB);
          changed = true;
        }
        i += hasColorSpace ? 5 : 4;
        continue;
      }

      // 8-bit background color (48;5;N)
      if (code === 48 && params[i + 1] === 5 && i + 2 < params.length) {
        const colorIndex = params[i + 2];
        if (colorIndex === 7 || colorIndex === 8 || colorIndex === 15 || (colorIndex >= 247 && colorIndex <= 255)) {
          // White/bright backgrounds often represent panel surfaces in TUIs.
          // Keep them as a subtle highlight instead of fully flattening.
          out.push(48, 2, highlightR, highlightG, highlightB);
          changed = true;
        } else if (colorIndex === 0 || colorIndex === 16 || (colorIndex >= 232 && colorIndex <= 246)) {
          // Map black and dark-to-mid grays (232-246) to theme bg.
          out.push(48, 2, bgR, bgG, bgB);
          changed = true;
        } else {
          out.push(48, 5, colorIndex);
        }
        i += 2;
        continue;
      }

      // 24-bit foreground color (38;2;R;G;B)
      if (code === 38 && params[i + 1] === 2 && i + 4 < params.length) {
        const hasColorSpace = i + 5 < params.length
          && params[i + 2] === 0
          && params[i + 3] <= 255
          && params[i + 4] <= 255
          && params[i + 5] <= 255;
        const offset = hasColorSpace ? 3 : 2;
        const red = params[i + offset];
        const green = params[i + offset + 1];
        const blue = params[i + offset + 2];
        const [nextR, nextG, nextB] = ensureReadableForegroundOnLightTheme(red, green, blue, bgR, bgG, bgB);
        if (nextR !== red || nextG !== green || nextB !== blue) {
          out.push(38, 2, nextR, nextG, nextB);
          changed = true;
        } else {
          out.push(38, 2, red, green, blue);
        }
        i += hasColorSpace ? 5 : 4;
        continue;
      }

      // 8-bit foreground color (38;5;N)
      if (code === 38 && params[i + 1] === 5 && i + 2 < params.length) {
        const colorIndex = params[i + 2];
        const rgb = ansi256ToRgb(colorIndex);
        if (!rgb) {
          out.push(38, 5, colorIndex);
          i += 2;
          continue;
        }
        const [red, green, blue] = rgb;
        const [nextR, nextG, nextB] = ensureReadableForegroundOnLightTheme(red, green, blue, bgR, bgG, bgB);
        if (nextR !== red || nextG !== green || nextB !== blue) {
          out.push(38, 2, nextR, nextG, nextB);
          changed = true;
        } else {
          out.push(38, 5, colorIndex);
        }
        i += 2;
        continue;
      }

      // Faint text often becomes unreadable on light backgrounds.
      if (code === 2) {
        changed = true;
        continue;
      }

      // Standard ANSI background black (40)
      if (code === 40) {
        out.push(48, 2, bgR, bgG, bgB);
        changed = true;
        continue;
      }

      // ANSI white/bright white background (47, 107)
      if (code === 47 || code === 107) {
        out.push(48, 2, highlightR, highlightG, highlightB);
        changed = true;
        continue;
      }

      // Bright black background (100)
      if (code === 100) {
        out.push(48, 2, highlightR, highlightG, highlightB);
        changed = true;
        continue;
      }

      // ANSI black foreground (30)
      if (code === 30) {
        out.push(38, 2, 60, 60, 60);
        changed = true;
        continue;
      }

      // Bright black foreground (90)
      if (code === 90) {
        out.push(38, 2, 100, 100, 100);
        changed = true;
        continue;
      }

      // ANSI white foreground (37)
      if (code === 37) {
        out.push(38, 2, 40, 40, 40);
        changed = true;
        continue;
      }

      // Bright white foreground (97)
      if (code === 97) {
        out.push(38, 2, 30, 30, 30);
        changed = true;
        continue;
      }

      // Reverse video (7) can create harsh dark pills on light themes when
      // apps rely on default background swapping. Force a subtle theme-aware bg.
      if (code === 7) {
        out.push(48, 2, highlightR, highlightG, highlightB);
        changed = true;
        continue;
      }

      // Inverse-off (27) should clear the background we introduced for code 7.
      if (code === 27) {
        out.push(49);
        changed = true;
        continue;
      }

      out.push(code);
    }

    if (!changed) return sequence;
    return `\x1b[${out.join(';')}m`;
  };

  return data.replace(/\x1b\[[0-9:;]*m/g, transformSgr);
}

/**
 * Transform ANSI escape sequences for dark themes with non-black backgrounds.
 *
 * Apps like Claude Code use true-color (24-bit) escape sequences for dark
 * backgrounds (e.g. \033[48;2;0;0;0m) which bypass the ANSI color mapping.
 * On dark themes where the bg isn't pure black, these show as jarring strips.
 * This remaps near-black and near-white backgrounds to the theme bg.
 */
export function transformEscapeSequencesForDarkTheme(data: string, themeBg: string): string {
  const bgR = parseInt(themeBg.slice(1, 3), 16);
  const bgG = parseInt(themeBg.slice(3, 5), 16);
  const bgB = parseInt(themeBg.slice(5, 7), 16);

  const transformSgr = (sequence: string) => {
    const body = sequence.slice(2, -1);
    if (body.length === 0) return sequence;

    const normalized = body.replace(/:/g, ';');
    const rawParams = normalized.split(';');
    const params: number[] = [];

    for (const raw of rawParams) {
      if (raw === '') { params.push(0); continue; }
      const value = Number(raw);
      if (!Number.isFinite(value)) return sequence;
      params.push(value);
    }

    let changed = false;
    const out: number[] = [];

    for (let i = 0; i < params.length; i += 1) {
      const code = params[i];

      // 24-bit background color (48;2;R;G;B) — remap near-black/near-white
      if (code === 48 && params[i + 1] === 2 && i + 4 < params.length) {
        const hasColorSpace = i + 5 < params.length
          && params[i + 2] === 0
          && params[i + 3] <= 255
          && params[i + 4] <= 255
          && params[i + 5] <= 255;
        const offset = hasColorSpace ? 3 : 2;
        const red = params[i + offset];
        const green = params[i + offset + 1];
        const blue = params[i + offset + 2];
        const sum = red + green + blue;

        // Near-black and near-white backgrounds are usually hard-coded TUI
        // panel fills that clash with themed dark terminals.
        if (sum < 40 || sum > 700) {
          out.push(48, 2, bgR, bgG, bgB);
          changed = true;
        } else {
          out.push(48, 2, red, green, blue);
        }
        i += hasColorSpace ? 5 : 4;
        continue;
      }

      // 8-bit background color (48;5;N) — remap black/near-black and white
      if (code === 48 && params[i + 1] === 5 && i + 2 < params.length) {
        const colorIndex = params[i + 2];
        if (
          colorIndex === 0
          || colorIndex === 7
          || colorIndex === 8
          || colorIndex === 15
          || colorIndex === 16
          || colorIndex === 231
          || (colorIndex >= 232 && colorIndex <= 234)
          || (colorIndex >= 250 && colorIndex <= 255)
        ) {
          out.push(48, 2, bgR, bgG, bgB);
          changed = true;
        } else {
          out.push(48, 5, colorIndex);
        }
        i += 2;
        continue;
      }

      // Standard ANSI white/bright white background
      if (code === 47 || code === 107) {
        out.push(48, 2, bgR, bgG, bgB);
        changed = true;
        continue;
      }

      out.push(code);
    }

    if (!changed) return sequence;
    return `\x1b[${out.join(';')}m`;
  };

  return data.replace(/\x1b\[[0-9:;]*m/g, transformSgr);
}
