import Phaser from 'phaser';
import { COR, hexNum } from '../ArteFaseFinal';
import { BOSS_FASE_FINAL, CENA_FASE_FINAL } from '../constantesFaseFinal';

const FONTE = 'Consolas, Courier New, monospace';
const LARGURA_SEGMENTO = 120;
const Y = 672;

/** Nome da forma e barra segmentada de pisões, embaixo no centro da tela. */
export class HudBoss {
  private readonly cena: Phaser.Scene;
  private readonly nome: Phaser.GameObjects.Text;
  private readonly barra: Phaser.GameObjects.Graphics;
  private readonly total: number;

  constructor(cena: Phaser.Scene, titulo: string, total: number = BOSS_FASE_FINAL.PISOES_POR_FORMA) {
    this.cena = cena;
    this.total = total;
    const prof = CENA_FASE_FINAL.PROFUNDIDADE_HUD;
    this.nome = cena.add
      .text(cena.scale.width / 2, Y, titulo, {
        fontFamily: FONTE,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ff2a3d',
        backgroundColor: 'rgba(5, 5, 12, 0.8)',
        padding: { x: 10, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(prof)
      .setAlpha(0);
    this.barra = cena.add.graphics().setScrollFactor(0).setDepth(prof).setAlpha(0);
    this.atualizar(total);
  }

  public mostrar(): void {
    this.cena.tweens.add({ targets: [this.nome, this.barra], alpha: 1, duration: 400 });
  }

  public esconder(): void {
    this.cena.tweens.add({ targets: [this.nome, this.barra], alpha: 0, duration: 250 });
  }

  public atualizar(vida: number): void {
    const total = this.total;
    const largura = total * LARGURA_SEGMENTO + (total - 1) * 6;
    const x0 = this.cena.scale.width / 2 - largura / 2;
    const g = this.barra;
    g.clear();
    g.fillStyle(0x05050c, 0.85);
    g.fillRect(x0 - 4, Y + 4, largura + 8, 18);
    for (let i = 0; i < total; i++) {
      const x = x0 + i * (LARGURA_SEGMENTO + 6);
      g.fillStyle(i < vida ? hexNum(COR.vermelho) : 0x2a2d44, 1);
      g.fillRect(x, Y + 8, LARGURA_SEGMENTO, 10);
      if (i < vida) {
        g.fillStyle(0xffd0d6, 0.8);
        g.fillRect(x, Y + 8, LARGURA_SEGMENTO, 2);
      }
    }
  }
}
