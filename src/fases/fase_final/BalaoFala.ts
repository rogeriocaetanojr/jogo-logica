import Phaser from 'phaser';
import { CENA_FASE_FINAL } from './constantesFaseFinal';

const FONTE = 'Consolas, Courier New, monospace';

/** Balão de fala curto sobre um ponto do mundo; some sozinho. */
export function balaoFala(cena: Phaser.Scene, x: number, y: number, texto: string, duracaoMs: number = 2200): void {
  const balao = cena.add
    .text(x, y, texto, {
      fontFamily: FONTE,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#05050c',
      backgroundColor: '#eef0ff',
      padding: { x: 8, y: 4 },
      align: 'center',
      wordWrap: { width: 260 },
    })
    .setOrigin(0.5, 1)
    .setDepth(95)
    .setScale(0.6)
    .setAlpha(0);
  cena.tweens.add({ targets: balao, scale: 1, alpha: 1, duration: 140, ease: 'Back.easeOut' });
  cena.tweens.add({
    targets: balao,
    alpha: 0,
    y: y - 12,
    delay: duracaoMs,
    duration: 300,
    onComplete: () => balao.destroy(),
  });
}

/**
 * Legenda do Mega Brain pelo alto-falante, na parte de baixo da tela. Não pausa o jogo
 * (diferente do diálogo): serve para os comentários dos puzzles.
 */
export class LegendaMegaBrain {
  private readonly cena: Phaser.Scene;
  private readonly texto: Phaser.GameObjects.Text;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    this.texto = cena.add
      .text(cena.scale.width / 2, cena.scale.height - 24, '', {
        fontFamily: FONTE,
        fontSize: '15px',
        color: '#ffe3f7',
        align: 'center',
        backgroundColor: 'rgba(12, 4, 16, 0.9)',
        padding: { x: 14, y: 8 },
        wordWrap: { width: 900 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(CENA_FASE_FINAL.PROFUNDIDADE_HUD + 3)
      .setAlpha(0);
  }

  public mostrar(falante: string, fala: string, dica?: string): void {
    const corpo = dica ? `${falante} ${fala}\n${dica}` : `${falante} ${fala}`;
    const duracao = 2600 + corpo.length * 45;
    this.cena.tweens.killTweensOf(this.texto);
    this.texto.setText(corpo).setAlpha(1);
    this.cena.tweens.add({ targets: this.texto, alpha: 0, delay: duracao, duration: 400 });
  }

  public get visivel(): boolean {
    return this.texto.alpha > 0;
  }

  public get conteudo(): string {
    return this.texto.text;
  }
}
