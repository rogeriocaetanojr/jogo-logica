import Phaser from 'phaser';
import { COR, hexNum } from './ArteFaseFinal';
import { SLOGANS_MEGA_BRAIN } from './DialogosFaseFinal';

export interface ConfigTelao {
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Índice do primeiro slogan. */
  slogan: number;
  profundidade?: number;
}

const GLITCH_MS = 180;

/**
 * Telão de propaganda do Mega Brain: moldura com neon, slogan que troca em ciclo com um glitch
 * rápido (texto desalinhado em ciano/magenta) e scanlines por cima.
 */
export class TelaoFaseFinal {
  private readonly moldura: Phaser.GameObjects.Graphics;
  private readonly texto: Phaser.GameObjects.Text;
  private readonly fantasma: Phaser.GameObjects.Text;
  private readonly cfg: ConfigTelao;
  private indice: number;
  private proximaTrocaMs: number;
  private glitchAte: number = 0;
  private tempo: number = 0;
  private readonly trocaMs: number;

  constructor(cena: Phaser.Scene, cfg: ConfigTelao, trocaMs: number) {
    this.trocaMs = trocaMs;
    this.cfg = cfg;
    this.indice = cfg.slogan % SLOGANS_MEGA_BRAIN.length;
    // Telões trocam fora de sincronia entre si
    this.proximaTrocaMs = trocaMs * (0.4 + (cfg.slogan % 3) * 0.3);
    const prof = cfg.profundidade ?? -35;
    const { x, y, largura: w, altura: h } = cfg;

    const g = cena.add.graphics().setDepth(prof);
    g.fillStyle(hexNum(COR.contorno), 1);
    g.fillRect(x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16);
    g.fillStyle(hexNum(COR.metal), 1);
    g.fillRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12);
    g.fillGradientStyle(0x150a2e, 0x150a2e, 0x2a0f3e, 0x2a0f3e, 1);
    g.fillRect(x - w / 2, y - h / 2, w, h);
    g.lineStyle(2, hexNum(COR.ciano), 0.9);
    g.strokeRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6);
    // Suportes até a parede
    g.fillStyle(hexNum(COR.metal), 1);
    g.fillRect(x - w / 3, y + h / 2 + 8, 6, 14);
    g.fillRect(x + w / 3 - 6, y + h / 2 + 8, 6, 14);
    this.moldura = g;

    const estilo: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: `${Math.max(14, Math.round(h / 5.2))}px`,
      fontStyle: 'bold',
      color: '#ffe3f7',
      align: 'center',
      wordWrap: { width: w - 24 },
    };
    this.fantasma = cena.add.text(x, y, '', { ...estilo, color: COR.ciano }).setOrigin(0.5).setDepth(prof + 0.1).setAlpha(0);
    this.texto = cena.add.text(x, y, '', estilo).setOrigin(0.5).setDepth(prof + 0.2);
    this.texto.setShadow(0, 0, COR.magenta, 8, false, true);
    this.mostrar(this.indice);

    // Scanlines por cima da tela
    const scan = cena.add.graphics().setDepth(prof + 0.3);
    scan.fillStyle(0x000000, 0.22);
    for (let yy = y - h / 2; yy < y + h / 2; yy += 3) scan.fillRect(x - w / 2, yy, w, 1);
  }

  /** Troca o slogan e reduz a fonte até o texto caber dentro da tela. */
  private mostrar(indice: number): void {
    const slogan = SLOGANS_MEGA_BRAIN[indice];
    const { largura: w, altura: h } = this.cfg;
    let tamanho = Math.max(14, Math.round(h / 5.2));
    this.texto.setFontSize(tamanho).setText(slogan);
    while ((this.texto.height > h - 14 || this.texto.width > w - 16) && tamanho > 10) {
      tamanho--;
      this.texto.setFontSize(tamanho);
    }
    this.fantasma.setFontSize(tamanho).setText(slogan);
  }

  public update(tempo: number, delta: number): void {
    this.tempo = tempo;
    this.proximaTrocaMs -= delta;
    if (this.proximaTrocaMs <= 0) {
      this.proximaTrocaMs = this.trocaMs;
      this.indice = (this.indice + 1) % SLOGANS_MEGA_BRAIN.length;
      this.mostrar(this.indice);
      this.glitchAte = tempo + GLITCH_MS;
    }

    const emGlitch = this.tempo < this.glitchAte;
    const { x, y } = this.cfg;
    if (emGlitch) {
      const fase = Math.floor(tempo / 30) % 3;
      this.texto.setPosition(x + (fase - 1) * 4, y);
      this.fantasma.setPosition(x - (fase - 1) * 6, y + 1).setAlpha(0.8);
    } else {
      this.texto.setPosition(x, y);
      this.fantasma.setAlpha(0);
    }
  }

  public destruir(): void {
    this.moldura.destroy();
    this.texto.destroy();
    this.fantasma.destroy();
  }
}
