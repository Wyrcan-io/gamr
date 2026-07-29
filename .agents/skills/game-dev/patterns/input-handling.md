# Input Handling Patterns

## Basic Setup

```typescript
const keyListener = terminal.onKey(({ domEvent }) => {
  if (!running) { keyListener.dispose(); return; }

  domEvent.preventDefault();
  domEvent.stopPropagation();

  const key = domEvent.key.toLowerCase();

  // Handle input based on game state...
});
```

## State-Based Input Flow

```typescript
// 1. ESC always toggles pause (works from any state)
if (key === 'escape') {
  paused = !paused;
  if (paused) pauseMenuSelection = 0;  // Reset menu selection!
  return;
}

// 2. Q quits from pause/game over/start screen
if (key === 'q' && (paused || gameOver || !gameStarted)) {
  controller.stop();
  dispatchGameQuit(terminal);
  return;
}

// 3. Start screen - any key (except above) starts game
if (!gameStarted && !paused) {
  gameStarted = true;
  return;
}

// 4. Game over - R to restart
if (gameOver) {
  if (key === 'r') {
    initGame();
    gameStarted = true;
  }
  return;
}

// 5. Pause menu - handle navigation
if (paused) {
  // See pause menu section below
  return;
}

// 6. Gameplay input
switch (domEvent.key) {
  case 'ArrowLeft':
  case 'a':
    // Left action
    break;
  // etc.
}
```

## Pause Menu Navigation

Using the shared menu system:

```typescript
import { PAUSE_MENU_ITEMS, navigateMenu } from '../shared/menu';

if (paused) {
  const { newSelection, confirmed } = navigateMenu(
    pauseMenuSelection,
    PAUSE_MENU_ITEMS.length,
    key,
    domEvent
  );

  // Selection changed
  if (newSelection !== pauseMenuSelection) {
    pauseMenuSelection = newSelection;
    return;
  }

  // Item confirmed
  if (confirmed) {
    switch (pauseMenuSelection) {
      case 0: // Resume
        paused = false;
        break;
      case 1: // Restart
        initGame();
        gameStarted = true;
        paused = false;
        break;
      case 2: // Quit
        controller.stop();
        dispatchGameQuit(terminal);
        break;
      case 3: // List Games
        running = false;
        dispatchGamesMenu(terminal);
        break;
      case 4: // Next Game
        running = false;
        dispatchGameSwitch(terminal);
        break;
    }
    return;
  }

  // Legacy shortcuts still work
  if (key === 'r') { initGame(); gameStarted = true; paused = false; }
  else if (key === 'l') { running = false; dispatchGamesMenu(terminal); }
  else if (key === 'n') { running = false; dispatchGameSwitch(terminal); }
  return;
}
```

## Common Input Patterns

### Arrow Keys + WASD

```typescript
switch (domEvent.key) {
  case 'ArrowLeft':
  case 'a':
    playerX = Math.max(0, playerX - 1);
    break;
  case 'ArrowRight':
  case 'd':
    playerX = Math.min(GAME_WIDTH - 1, playerX + 1);
    break;
  case 'ArrowUp':
  case 'w':
    playerY = Math.max(0, playerY - 1);
    break;
  case 'ArrowDown':
  case 's':
    playerY = Math.min(GAME_HEIGHT - 1, playerY + 1);
    break;
}
```

### Movement Speed

For faster movement per keypress:

```typescript
case 'ArrowLeft':
  if (playerX > 2) playerX -= 2;  // Move by 2
  break;
```

### Continuous Input (Held Keys)

For games needing held-key detection:

```typescript
let keysHeld: Set<string> = new Set();

// On key down:
keysHeld.add(domEvent.key);

// On key up (note: terminal.onKey doesn't have keyup,
// so use a different approach - check in update):
// In update():
function update() {
  // Apply held keys
  if (keysHeld.has('ArrowLeft')) playerX -= moveSpeed;
  if (keysHeld.has('ArrowRight')) playerX += moveSpeed;
  // etc.
}
```

**Note:** xterm.js onKey only fires on keydown. For true continuous input, you'd need DOM event listeners, which most terminal games avoid by using per-frame input checks.

### Action with Cooldown

```typescript
let shootCooldown = 0;

// In update():
if (shootCooldown > 0) shootCooldown--;

// In key handler:
case ' ':
  if (shootCooldown === 0) {
    shootBullet(playerX, playerY - 1);
    shootCooldown = 10;  // 10 frames cooldown
  }
  break;
```

### Jump/Slide Mechanics

```typescript
let isJumping = false;
let jumpFrame = 0;
const JUMP_DURATION = 12;

let isSliding = false;
let slideFrame = 0;
const SLIDE_DURATION = 10;

// In key handler:
case 'ArrowUp':
case ' ':
  if (!isJumping && !isSliding) {
    isJumping = true;
    jumpFrame = 0;
  }
  break;
case 'ArrowDown':
  if (!isJumping && !isSliding) {
    isSliding = true;
    slideFrame = 0;
  }
  break;

// In update():
if (isJumping) {
  jumpFrame++;
  if (jumpFrame >= JUMP_DURATION) {
    isJumping = false;
    jumpFrame = 0;
  }
}
if (isSliding) {
  slideFrame++;
  if (slideFrame >= SLIDE_DURATION) {
    isSliding = false;
    slideFrame = 0;
  }
}

// Jump height calculation:
function getJumpHeight(): number {
  if (isJumping) {
    const progress = jumpFrame / JUMP_DURATION;
    return Math.sin(progress * Math.PI) * 2.5;  // Parabolic arc
  }
  return 0;
}
```

### Letter Input (Word Games)

```typescript
// Only accept A-Z
if (/^[a-z]$/.test(key)) {
  guessLetter(key.toUpperCase());
}
```

### Number Input

```typescript
if (/^[0-9]$/.test(key)) {
  selectOption(parseInt(key));
}
```

## Input Key Reference

| domEvent.key | Lower | Usage |
|--------------|-------|-------|
| `ArrowLeft` | - | Move left |
| `ArrowRight` | - | Move right |
| `ArrowUp` | - | Move up / Jump |
| `ArrowDown` | - | Move down / Slide |
| ` ` (space) | - | Action / Fire |
| `Escape` | `escape` | Pause toggle |
| `Enter` | `enter` | Confirm |
| `a`-`z` | Same | WASD or letter input |

## Cleanup

Always dispose the key listener on stop:

```typescript
const originalStop = controller.stop;
controller.stop = () => {
  clearInterval(renderInterval);
  clearInterval(gameInterval);
  keyListener.dispose();  // Important!
  originalStop();
};
```
