/**
 * Puzzle Fighter Effects — Particles, projectiles, portraits,
 * combo text, screen shake, border flash
 */

import type { GemColor } from './engine';

// ============================================================================
// Color Helpers
// ============================================================================

const GEM_ANSI: Record<GemColor, string> = {
  red: '\x1b[1;38;5;196m',
  green: '\x1b[1;38;5;46m',
  blue: '\x1b[1;38;5;27m',
  yellow: '\x1b[1;38;5;226m',
};

// ============================================================================
// Particles
// ============================================================================

export interface Particle {
  x: number;
  y: number;
  char: string;
  color: string;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const PARTICLE_CHARS = ['✦', '★', '◆', '●', '·', '*', '▪'];

export function spawnClearParticles(x: number, y: number, color: GemColor, count: number, particles: Particle[]): void {
  const ansi = GEM_ANSI[color];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 2,
      y: y + (Math.random() - 0.5),
      char: PARTICLE_CHARS[Math.floor(Math.random() * PARTICLE_CHARS.length)],
      color: ansi,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.8) * 2,
      life: 8 + Math.floor(Math.random() * 8),
      maxLife: 16,
    });
  }
}

export function spawnFirework(x: number, y: number, particles: Particle[]): void {
  const colors = ['\x1b[91m', '\x1b[93m', '\x1b[92m', '\x1b[96m', '\x1b[95m'];
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20;
    const speed = 1.5 + Math.random();
    particles.push({
      x,
      y,
      char: PARTICLE_CHARS[Math.floor(Math.random() * PARTICLE_CHARS.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.5,
      life: 12 + Math.floor(Math.random() * 8),
      maxLife: 20,
    });
  }
}

export function spawnCollapse(startX: number, startY: number, width: number, height: number, particles: Particle[]): void {
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (Math.random() < 0.4) {
        particles.push({
          x: startX + c * 2,
          y: startY + r,
          char: '▓',
          color: '\x1b[90m',
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.3 + Math.random() * 0.5,
          life: 10 + Math.floor(Math.random() * 15),
          maxLife: 25,
        });
      }
    }
  }
}

export function updateParticles(particles: Particle[]): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // gravity
    p.life--;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

export function renderParticles(particles: Particle[], minX: number, minY: number, maxX: number, maxY: number): string {
  let output = '';
  for (const p of particles) {
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    if (px < minX || px > maxX || py < minY || py > maxY) continue;
    const fade = p.life > p.maxLife * 0.5 ? '\x1b[1m' : '\x1b[2m';
    output += `\x1b[${py};${px}H${fade}${p.color}${p.char}\x1b[0m`;
  }
  return output;
}

// ============================================================================
// Floating Text
// ============================================================================

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  frames: number;
  maxFrames: number;
}

const COMBO_MESSAGES = [
  { text: 'NICE!', color: '\x1b[92m' },
  { text: 'GREAT!', color: '\x1b[93m' },
  { text: 'AMAZING!', color: '\x1b[96m' },
  { text: 'UNSTOPPABLE!', color: '\x1b[95m' },
  { text: 'GODLIKE!!', color: '\x1b[91m' },
  { text: 'GODLIKE!!', color: '\x1b[1;91m' },
];

export function spawnComboText(chains: number, x: number, y: number, texts: FloatingText[]): void {
  const idx = Math.min(chains - 1, COMBO_MESSAGES.length - 1);
  const msg = COMBO_MESSAGES[idx];
  texts.push({
    text: `${msg.text} ×${chains}`,
    x: x - Math.floor(msg.text.length / 2),
    y,
    color: msg.color,
    frames: 20,
    maxFrames: 20,
  });
}

export function spawnChainCounter(chains: number, x: number, y: number, texts: FloatingText[]): void {
  texts.push({
    text: `${chains} CHAIN`,
    x: x - 3,
    y: y + 1,
    color: '\x1b[1;97m',
    frames: 16,
    maxFrames: 16,
  });
}

export function updateFloatingTexts(texts: FloatingText[]): void {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.frames--;
    // Float upward every 3 frames
    if (t.frames % 3 === 0) t.y -= 1;
    if (t.frames <= 0) {
      texts.splice(i, 1);
    }
  }
}

export function renderFloatingTexts(texts: FloatingText[]): string {
  let output = '';
  for (const t of texts) {
    if (t.y < 1) continue;
    const fade = t.frames > t.maxFrames * 0.4 ? '\x1b[1m' : '\x1b[2m';
    output += `\x1b[${t.y};${Math.max(1, t.x)}H${fade}${t.color}${t.text}\x1b[0m`;
  }
  return output;
}

// ============================================================================
// Attack Projectiles
// ============================================================================

export interface Projectile {
  fromX: number;
  toX: number;
  y: number;
  progress: number;
  char: string;
  color: string;
  count: number;
}

export function spawnProjectile(fromX: number, toX: number, y: number, count: number, projectiles: Projectile[]): void {
  let char: string;
  let color: string;
  if (count >= 8) {
    char = '◈';
    color = '\x1b[1;91m';
  } else if (count >= 4) {
    char = '◆';
    color = '\x1b[1;93m';
  } else {
    char = '●';
    color = '\x1b[1;97m';
  }

  projectiles.push({ fromX, toX, y, progress: 0, char, color, count });
}

export function updateProjectiles(projectiles: Projectile[]): void {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.progress += 1 / 7; // ~7 frames to cross
    if (p.progress >= 1) {
      projectiles.splice(i, 1);
    }
  }
}

export function renderProjectiles(projectiles: Projectile[]): string {
  let output = '';
  for (const p of projectiles) {
    const x = Math.round(p.fromX + (p.toX - p.fromX) * p.progress);
    if (x < 1) continue;
    output += `\x1b[${p.y};${x}H${p.color}${p.char}\x1b[0m`;
  }
  return output;
}

// ============================================================================
// Character Portraits (3-line ASCII in VS column)
// ============================================================================

export type Pose = 'idle' | 'attack' | 'hit' | 'win' | 'lose';

export function renderPortrait(lines: string[], x: number, y: number, color: string): string {
  let output = '';
  for (let i = 0; i < lines.length; i++) {
    output += `\x1b[${y + i};${x}H${color}${lines[i]}\x1b[0m`;
  }
  return output;
}

// ============================================================================
// Screen Shake
// ============================================================================

export interface ShakeState {
  intensity: number;
  frames: number;
}

export function triggerShake(shake: ShakeState, intensity: number, frames: number): void {
  shake.intensity = Math.max(shake.intensity, intensity);
  shake.frames = Math.max(shake.frames, frames);
}

export function updateShake(shake: ShakeState): { dx: number; dy: number } {
  if (shake.frames <= 0) return { dx: 0, dy: 0 };
  shake.frames--;
  if (shake.frames <= 0) {
    shake.intensity = 0;
    return { dx: 0, dy: 0 };
  }
  return {
    dx: Math.round((Math.random() - 0.5) * shake.intensity * 2),
    dy: Math.round((Math.random() - 0.5) * shake.intensity),
  };
}

// ============================================================================
// Border Flash
// ============================================================================

export interface FlashState {
  color: string;
  frames: number;
}

export function triggerFlash(flash: FlashState, color: string, frames: number): void {
  flash.color = color;
  flash.frames = frames;
}

export function updateFlash(flash: FlashState): string | null {
  if (flash.frames <= 0) return null;
  flash.frames--;
  return flash.color;
}

// ============================================================================
// Energy Bar
// ============================================================================

export function renderEnergyBar(x: number, y: number, level: number, maxLevel: number): string {
  const barHeight = 6;
  const filled = Math.min(barHeight, Math.round((level / Math.max(1, maxLevel)) * barHeight));
  let output = '';

  for (let i = 0; i < barHeight; i++) {
    const isFilled = i >= barHeight - filled;
    const char = isFilled ? '█' : '░';
    const color = isFilled
      ? (filled >= barHeight - 1 ? '\x1b[91m' : filled >= barHeight / 2 ? '\x1b[93m' : '\x1b[92m')
      : '\x1b[90m';
    output += `\x1b[${y + i};${x}H${color}${char}\x1b[0m`;
  }

  return output;
}
