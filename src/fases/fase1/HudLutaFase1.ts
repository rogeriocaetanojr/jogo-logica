import Phaser from 'phaser';

const PROFUNDIDADE = 9000;
const LARGURA_SEGMENTO = 70;
const ESPACO_SEGMENTO = 6;
const ALTURA_SEGMENTO = 14;
const Y_BARRA = 50;
const X_CORACOES = 1220;
const Y_CORACOES = 34;
const ESPACO_CORACOES = 34;

/**
 * HUD fixo da luta contra o Helio: vida do boss em segmentos (topo central)
 * e os corações do jogador (canto superior direito). Só aparece durante a luta.
 */
export class HudLutaFase1 {
  private readonly grafico: Phaser.GameObjects.Graphics;
  private readonly rotulo: Phaser.GameObjects.Text;

  constructor(cena: Phaser.Scene) {
    this.grafico = cena.add.graphics();
    this.grafico.setScrollFactor(0);
    this.grafico.setDepth(PROFUNDIDADE);

    this.rotulo = cena.add.text(640, 28, 'HELIO // SENHOR DOS VENTOS', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#fbbf24',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      padding: { x: 8, y: 3 },
    });
    this.rotulo.setOrigin(0.5);
    this.rotulo.setScrollFactor(0);
    this.rotulo.setDepth(PROFUNDIDADE + 1);

    this.esconder();
  }

  public mostrar(): void {
    this.grafico.setVisible(true);
    this.rotulo.setVisible(true);
  }

  public esconder(): void {
    this.grafico.setVisible(false);
    this.rotulo.setVisible(false);
  }

  public atualizar(vidaBoss: number, vidaMaxBoss: number, coracoes: number, coracoesMax: number): void {
    const g = this.grafico;
    g.clear();

    // Vida do Helio em segmentos
    const larguraTotal = vidaMaxBoss * LARGURA_SEGMENTO + (vidaMaxBoss - 1) * ESPACO_SEGMENTO;
    const xInicial = 640 - larguraTotal / 2;
    for (let i = 0; i < vidaMaxBoss; i++) {
      const x = xInicial + i * (LARGURA_SEGMENTO + ESPACO_SEGMENTO);
      g.fillStyle(0x0f172a, 0.85);
      g.fillRect(x - 2, Y_BARRA - 2, LARGURA_SEGMENTO + 4, ALTURA_SEGMENTO + 4);
      g.fillStyle(i < vidaBoss ? 0xf59e0b : 0x334155, 1);
      g.fillRect(x, Y_BARRA, LARGURA_SEGMENTO, ALTURA_SEGMENTO);
    }

    // Corações do jogador, da direita para a esquerda
    for (let i = 0; i < coracoesMax; i++) {
      const x = X_CORACOES - (coracoesMax - 1 - i) * ESPACO_CORACOES;
      this.desenharCoracao(g, x, Y_CORACOES, i < coracoes);
    }
  }

  private desenharCoracao(g: Phaser.GameObjects.Graphics, x: number, y: number, cheio: boolean): void {
    g.fillStyle(0x0f172a, 0.85);
    g.fillCircle(x, y + 2, 16);
    g.fillStyle(cheio ? 0xef4444 : 0x475569, 1);
    g.fillCircle(x - 5, y - 2, 6);
    g.fillCircle(x + 5, y - 2, 6);
    g.fillTriangle(x - 11, y, x + 11, y, x, y + 11);
  }
}
