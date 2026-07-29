/**
 * Terminal Effects
 *
 * Fun visual effects for HyperSurge terminal.
 */

export {
  runMatrixEffect,
  startMatrixRain,
  getActiveMatrixController,
  isMatrixWaitingForKey,
  handleMatrixKeypress,
  type MatrixController,
} from './matrix';

export {
  runHackEffect,
  type HackController,
} from './hack';

export {
  runRebootEffect,
  type RebootController,
} from './reboot';
