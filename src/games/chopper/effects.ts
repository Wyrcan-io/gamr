/**
 * Hyper Chopper - Visual Effects
 *
 * Particle systems, fireworks, and celebration effects.
 */

export interface Particle {
  x: number;
  y: number;
  char: string;
  color: string;
  vx: number;
  vy: number;
  life: number;
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  frames: number;
  color: string;
}

// Maximum particles to prevent performance issues
export const MAX_PARTICLES = 100;

// Encouraging messages for deliveries
export const DELIVERY_MESSAGES = [
  'NICE!', 'AWESOME!', 'PERFECT!', 'GREAT!', 'SWEET!',
  'BOOM!', 'YES!', 'NAILED IT!', 'SMOOTH!', 'SLICK!'
];

/**
 * Spawn particles in a burst pattern
 */
export function spawnParticles(
  particles: Particle[],
  x: number,
  y: number,
  count: number,
  color: string,
  chars: string[] = ['✦', '·', '○']
): void {
  if (particles.length >= MAX_PARTICLES) return;

  const actualCount = Math.min(count, MAX_PARTICLES - particles.length);
  for (let i = 0; i < actualCount; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 0.2 + Math.random() * 0.3;
    particles.push({
      x,
      y,
      char: chars[Math.floor(Math.random() * chars.length)],
      color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + 0.2,
      life: 12 + Math.floor(Math.random() * 8),
    });
  }
}

/**
 * Spawn a colorful firework explosion
 */
export function spawnFirework(
  particles: Particle[],
  x: number,
  y: number,
  intensity: number = 1
): void {
  const colors = ['\x1b[1;93m', '\x1b[1;92m', '\x1b[1;96m', '\x1b[1;95m', '\x1b[1;91m', '\x1b[1;97m'];
  const chars = ['★', '✦', '◆', '●', '✶', '✴', '◇', '♦', '•', '○'];

  // Central burst
  for (let i = 0; i < 12 * intensity; i++) {
    const angle = (Math.PI * 2 * i) / (12 * intensity);
    const speed = 0.4 + Math.random() * 0.4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const char = chars[Math.floor(Math.random() * chars.length)];
    particles.push({
      x, y,
      char,
      color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.2,
      life: 20 + Math.floor(Math.random() * 15),
    });
  }

  // Sparkle ring
  for (let i = 0; i < 8 * intensity; i++) {
    const angle = (Math.PI * 2 * i) / (8 * intensity) + Math.random() * 0.3;
    const dist = 1.5 + Math.random();
    particles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      char: '✧',
      color: '\x1b[1;97m',
      vx: Math.cos(angle) * 0.15,
      vy: Math.sin(angle) * 0.15 - 0.1,
      life: 15 + Math.floor(Math.random() * 10),
    });
  }
}

/**
 * Add a floating text popup
 */
export function addPopup(
  popups: Popup[],
  x: number,
  y: number,
  text: string,
  color: string = '\x1b[1;93m'
): void {
  popups.push({ x, y, text, frames: 25, color });
}

/**
 * Update all particles (apply physics, remove dead ones)
 */
export function updateParticles(particles: Particle[], gravityMult: number = 1): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02 * gravityMult;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/**
 * Update all popups (float up, fade out)
 */
export function updatePopups(popups: Popup[]): void {
  for (let i = popups.length - 1; i >= 0; i--) {
    const popup = popups[i];
    popup.y -= 0.12;
    popup.frames--;
    if (popup.frames <= 0) popups.splice(i, 1);
  }
}

/**
 * Spawn rising sparkle trail effect
 */
export function spawnSparkleTrail(
  particles: Particle[],
  x: number,
  y: number,
  count: number = 6,
  color: string = '\x1b[1;93m'
): void {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y,
      char: ['✦', '✧', '★'][Math.floor(Math.random() * 3)],
      color,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.3 - Math.random() * 0.3,
      life: 25 + Math.floor(Math.random() * 15),
    });
  }
}

/**
 * Spawn splash effect (for water crashes)
 */
export function spawnSplash(
  particles: Particle[],
  x: number,
  waterY: number,
  intensity: number = 1
): void {
  const count = Math.floor(20 * intensity);
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 15 * intensity;
    particles.push({
      x: x + spread,
      y: waterY - 1,
      char: ['~', '≈', '○', '●', '◦', '∘', '█', '▓'][Math.floor(Math.random() * 8)],
      color: Math.random() > 0.3 ? '\x1b[96m' : '\x1b[1;97m',
      vx: spread * 0.1,
      vy: -0.5 - Math.random() * 0.8,
      life: 25 + Math.floor(Math.random() * 15),
    });
  }
}

/**
 * Get random delivery message
 */
export function getRandomDeliveryMessage(): string {
  return DELIVERY_MESSAGES[Math.floor(Math.random() * DELIVERY_MESSAGES.length)];
}
