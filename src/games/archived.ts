import { run2048Game } from './2048';
import { runAsteroidsGame } from './asteroids';
import { runBreakoutGame } from './breakout';
import { runCourierGame } from './chopper';
import { runCrackGame } from './crack';
import { runFroggerGame } from './frogger';
import { runHangmanGame } from './hangman';
import { runMinesweeperGame } from './minesweeper';
import { runPongGame } from './pong';
import { runRunnerGame } from './runner';
import { runSimonGame } from './simon';
import { runSnakeGame } from './snake';
import { runSpaceInvadersGame } from './spaceinvaders';
import { runTetrisGame } from './tetris';
import { runTowerGame } from './tower';
import { runTronGame } from './tron';
import { runTypingTest } from './typingtest';
import { runWordleGame } from './wordle';
import { runHyperFighterGame } from './hyper-fighter';
import type { GameInfo } from './index';

/** Source-backed games kept for direct launches while the TUI is focused. */
export const archivedGames: GameInfo[] = [
  { id: 'tetris', name: 'Tetris', description: 'Stack the blocks', run: runTetrisGame },
  { id: 'snake', name: 'Snake', description: 'Eat and grow', run: runSnakeGame },
  { id: '2048', name: '2048', description: 'Slide and combine tiles', run: run2048Game },
  { id: 'runner', name: 'Runner', description: 'Jump and duck', run: runRunnerGame },
  { id: 'pong', name: 'Pong', description: 'Classic paddle game', run: runPongGame },
  { id: 'wordle', name: 'Wordle', description: 'Guess the word', run: runWordleGame },
  { id: 'minesweeper', name: 'Minesweeper', description: 'Clear the mines', run: runMinesweeperGame },
  { id: 'hangman', name: 'Hangman', description: 'Guess the word', run: runHangmanGame },
  { id: 'spaceinvaders', name: 'Space Invaders', description: 'Defend Earth', run: runSpaceInvadersGame },
  { id: 'tower', name: 'Tower', description: 'Build a tower', run: runTowerGame },
  { id: 'simon', name: 'Simon', description: 'Memory game', run: runSimonGame },
  { id: 'frogger', name: 'Frogger', description: 'Cross the road', run: runFroggerGame },
  { id: 'breakout', name: 'Breakout', description: 'Break all the bricks', run: runBreakoutGame },
  { id: 'asteroids', name: 'Asteroids', description: 'Shoot the rocks', run: runAsteroidsGame },
  { id: 'typingtest', name: 'Typing Test', description: 'Test your speed', run: runTypingTest },
  { id: 'tron', name: 'Tron', description: 'Light cycle battle', run: runTronGame },
  { id: 'crack', name: 'Crack', description: 'Hack the system', run: runCrackGame },
  { id: 'chopper', name: 'Chopper', description: 'Deliver passengers', run: runCourierGame },
  { id: 'hyper-fighter', name: 'Hyper Fighter', description: 'Gem battle vs AI', run: runHyperFighterGame },
];
