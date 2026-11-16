import Phaser from 'phaser';
import { PROF } from './EfeitosPorto';

/**
 * Etiqueta discreta com a tecla da ação ("[J] PATCH", "[K] ESPUMA") que flutua em cima de onde
 * dá para acertar, só enquanto dá. Ajuda quem não sabe que pode atirar sem virar um tutorial.
 */
export class IndicadorTecla {
  private readonly texto: Phaser.GameObjects.Text;
  private readonly cena: Phaser.Scene;

  constructor(cena: Phaser.Scene, cor = '#FFD36B') {
    this.cena = cena;
    this.texto = cena.add
      .text(0, 0, '', {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: cor,
        backgroundColor: 'rgba(10, 8, 8, 0.78)',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(PROF.textos)
      .setVisible(false);
  }

  /** Mostra (ou move) a etiqueta em (x, y), com um leve balanço e pulsando. */
  mostrar(x: number, y: number, rotulo: string): void {
    const t = this.cena.time.now;
    if (this.texto.text !== rotulo) this.texto.setText(rotulo);
    this.texto
      .setVisible(true)
      .setPosition(Math.round(x), Math.round(y + Math.sin(t / 220) * 3))
      .setAlpha(0.8 + 0.2 * Math.sin(t / 160));
  }

  esconder(): void {
    this.texto.setVisible(false);
  }

  destruir(): void {
    this.texto.destroy();
  }
}
