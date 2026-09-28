import Phaser from 'phaser';
import { CenaAbertura } from './CenaAbertura';
import { CenaHub } from '../hub/CenaHub';
import { CenaTutorial } from '../fases/fase0_tutorial/CenaTutorial';
import { CenaFase1 } from '../fases/fase1/CenaFase1';
import { CenaFase2 } from '../fases/fase2/CenaFase2';
import { CenaFase3 } from '../fases/fase3/CenaFase3';
import { CenaFase4 } from '../fases/fase4/CenaFase4';
import { CenaFase5 } from '../fases/fase5/CenaFase5';
import { CenaFaseFinal } from '../fases/fase_final/CenaFaseFinal';

export const configuracaoJogo: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 600, x: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [
    CenaAbertura,
    CenaHub,
    CenaTutorial,
    CenaFase1,
    CenaFase2,
    CenaFase3,
    CenaFase4,
    CenaFase5,
    CenaFaseFinal,
  ],
};
