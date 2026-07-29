# Effect Patterns

Visual juice that makes games feel alive.

## Shared Effects Module

gamr provides a shared effects module at `src/games/shared/effects.ts`. Import it to avoid duplicating particle, popup, and shake logic:

```typescript
import {
  type Particle,
  type ScorePopup,
  type ScreenShakeState,
  type FlashState,
  spawnParticles,
  spawnFirework,
  spawnSparkleTrail,
  updateParticles,
  addScorePopup,
  updatePopups,
  createShakeState,
  triggerShake,
  applyShake,
  createFlashState,
  triggerFlash,
  updateFlash,
  isFlashVisible,
  MAX_PARTICLES,
  PARTICLE_CHARS,
  FIREWORK_COLORS,
} from '../shared/effects';
```

## Particle System

### Using Shared Particles

```typescript
// State
let particles: Particle[] = [];

// Spawn a burst
spawnParticles(particles, x, y, 8, '\x1b[1;93m');

// Spawn with custom characters
spawnParticles(particles, x, y, 6, '\x1b[1;91m', PARTICLE_CHARS.death);

// In update():
updateParticles(particles);

// With custom gravity:
updateParticles(particles, 0.5);  // Half gravity
updateParticles(particles, 2);    // Double gravity
```

### Particle Rendering

```typescript
for (const p of particles) {
  const screenX = Math.round(renderLeft + 1 + p.x);
  const screenY = Math.round(renderTop + 1 + p.y);
  // Bounds check
  if (screenX > renderLeft && screenX < renderLeft + GAME_WIDTH + 1 &&
      screenY > renderTop && screenY < renderTop + GAME_HEIGHT + 1) {
    const alpha = p.life > 5 ? '' : '\x1b[2m';  // Fade out
    output += `\x1b[${screenY};${screenX}H${alpha}${p.color}${p.char}\x1b[0m`;
  }
}
```

### Particle Character Sets

Available via `PARTICLE_CHARS`:

```typescript
PARTICLE_CHARS.explosion  // ['✗', '×', '·', '○', '▒', '░']
PARTICLE_CHARS.success    // ['✦', '★', '◆', '●', '♦']
PARTICLE_CHARS.fire       // ['▓', '▒', '░', '●', '◆']
PARTICLE_CHARS.death      // ['✗', '☠', '×', '▓', '░']
PARTICLE_CHARS.sparkle    // ['✦', '✧', '★']
PARTICLE_CHARS.firework   // ['★', '✦', '◆', '●', '✶', '✴', '◇', '♦', '•', '○']
```

### Custom Particle Spawning

For game-specific effects not covered by the shared module, you can still push directly:

```typescript
particles.push({
  x, y,
  char: '~',
  color: '\x1b[96m',
  vx: (Math.random() - 0.5) * 0.3,
  vy: -0.5,
  life: 20,
});
```

## Score Popups

### Using Shared Popups

```typescript
let scorePopups: ScorePopup[] = [];

// Add a popup
addScorePopup(scorePopups, enemy.x, enemy.y - 1, '+100', '\x1b[1;93m');
addScorePopup(scorePopups, player.x, player.y - 2, '3x COMBO!', '\x1b[1;96m');

// In update():
updatePopups(scorePopups);
```

### Popup Rendering

```typescript
for (const popup of scorePopups) {
  const screenX = Math.round(renderLeft + 1 + popup.x);
  const screenY = Math.round(renderTop + 1 + popup.y);
  if (screenY > renderTop && screenY < renderTop + GAME_HEIGHT + 1) {
    const alpha = popup.frames > 10 ? '\x1b[1m' : '\x1b[2m';
    output += `\x1b[${screenY};${screenX}H${alpha}${popup.color}${popup.text}\x1b[0m`;
  }
}
```

## Screen Shake

### Using Shared Shake

```typescript
const shake = createShakeState();

// Trigger:
triggerShake(shake, 3, 1);   // Light hit
triggerShake(shake, 8, 2);   // Medium impact
triggerShake(shake, 15, 4);  // Big explosion

// In render():
const { offsetX, offsetY } = applyShake(shake);
const renderLeft = gameLeft + offsetX;
const renderTop = gameTop + offsetY;
```

### Manual Shake (alternative)

If you need more control:

```typescript
let shakeFrames = 0;
let shakeIntensity = 0;

// Trigger:
shakeFrames = 8;
shakeIntensity = 2;

// In render():
let renderLeft = gameLeft;
let renderTop = gameTop;
if (shakeFrames > 0) {
  shakeFrames--;
  renderLeft += Math.floor((Math.random() - 0.5) * shakeIntensity * 2);
  renderTop += Math.floor((Math.random() - 0.5) * shakeIntensity);
}
```

## Flash Effects

### Using Shared Flash

```typescript
const borderFlash = createFlashState();
const hitFlash = createFlashState();

// Trigger:
triggerFlash(borderFlash, 8);
triggerFlash(hitFlash, 15);

// In render - check visibility for strobe:
const borderColor = isFlashVisible(borderFlash) ? '\x1b[1;91m' : themeColor;
const playerColor = isFlashVisible(hitFlash) ? '\x1b[1;91m' : themeColor;

// In update - decrement:
updateFlash(borderFlash);
updateFlash(hitFlash);
```

### Manual Flash (alternative)

```typescript
let borderFlash = 0;

// Trigger:
borderFlash = 8;

// Render:
const borderColor = borderFlash > 0 && borderFlash % 4 < 2 ? '\x1b[1;91m' : themeColor;

// Update:
if (borderFlash > 0) borderFlash--;
```

## Kill Streaks / Combos

### State

```typescript
let killStreakCount = 0;
let killStreakTimer = 0;
```

### Logic

```typescript
// On kill/score:
killStreakCount++;
killStreakTimer = 30;  // Reset timer

// Calculate bonus:
const baseScore = 10;
const streakBonus = killStreakCount >= 3 ? Math.floor(killStreakCount * 5) : 0;
const totalScore = baseScore + streakBonus;

// Effect intensity scales with streak:
const effectIntensity = Math.min(killStreakCount, 8);
triggerShake(shake, 3 + effectIntensity, 1 + Math.floor(effectIntensity / 3));
spawnParticles(particles, x, y, 6 + effectIntensity, '\x1b[1;93m');

// In update():
if (killStreakTimer > 0) {
  killStreakTimer--;
  if (killStreakTimer === 0) killStreakCount = 0;
}
```

### Streak Message

```typescript
if (killStreakCount >= 3) {
  const streakMsg = killStreakCount >= 5
    ? `★ ${killStreakCount}x KILL STREAK! ★`
    : `${killStreakCount}x STREAK!`;
  const streakX = renderLeft + Math.floor((GAME_WIDTH - streakMsg.length) / 2) + 1;
  const streakColor = glitchFrame % 6 < 3 ? '\x1b[1;91m' : '\x1b[1;93m';
  output += `\x1b[${renderTop + 2};${streakX}H${streakColor}${streakMsg}\x1b[0m`;
}
```

## Firework Effect

For big celebrations (win, level complete):

```typescript
// Using shared firework:
spawnFirework(particles, x, y);          // Normal intensity
spawnFirework(particles, x, y, 2);       // Double intensity

// Multiple fireworks across screen:
for (let i = 0; i < 5; i++) {
  const fx = Math.random() * GAME_WIDTH;
  const fy = Math.random() * GAME_HEIGHT;
  spawnFirework(particles, fx, fy);
}
```

## Sparkle Trail

For rising sparkle effects:

```typescript
spawnSparkleTrail(particles, x, y);                        // Default (6 particles, yellow)
spawnSparkleTrail(particles, x, y, 10, '\x1b[1;96m');      // More, cyan
```

## Effect Timing Guide

| Event | Shake | Particles | Popup |
|-------|-------|-----------|-------|
| Small collect | - | 4-6 | +10 |
| Enemy kill | 3, 1 | 6-8 | +50 |
| Combo hit | 5, 2 | 8-10 | +100! |
| Player hit | 8, 3 | 10 red | - |
| Level complete | 12, 2 | Firework | BONUS! |
| Game over | 20, 4 | 15 red | GAME OVER |
