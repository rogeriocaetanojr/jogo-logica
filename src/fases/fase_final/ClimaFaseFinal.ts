import Phaser from 'phaser';
import { CHUVA_FASE_FINAL, RAIOS_FASE_FINAL } from './constantesFaseFinal';

interface Gota {
  x: number;
  y: number;
  velocidade: number;
  comprimento: number;
}

interface Respingo {
  x: number;
  y: number;
  vidaMs: number;
}

/**
 * Chuva fina em espaço de tela (acompanha a câmera) com respingos no chão,
 * e relâmpagos em cadência fixa com clarão na tela. Usado no exterior e no terraço.
 */
export class ClimaFaseFinal {
  private readonly cena: Phaser.Scene;
  private readonly grafico: Phaser.GameObjects.Graphics;
  private readonly clarao: Phaser.GameObjects.Rectangle;
  private readonly raioCeu: Phaser.GameObjects.Graphics;
  private gotas: Gota[] = [];
  private respingos: Respingo[] = [];
  private acumuladorRespingoMs: number = 0;
  private proximoRaioMs: number;
  private indiceRaio: number = 0;
  private raioVisivelAte: number = 0;
  private tempoAtual: number = 0;
  /** y do chão no mundo (para os respingos); undefined desliga os respingos. */
  public chaoY?: number;

  constructor(cena: Phaser.Scene, chaoY?: number) {
    this.cena = cena;
    this.chaoY = chaoY;
    const c = CHUVA_FASE_FINAL;
    const { width, height } = cena.scale;

    this.grafico = cena.add.graphics().setScrollFactor(0).setDepth(c.PROFUNDIDADE);
    for (let i = 0; i < c.GOTAS; i++) {
      this.gotas.push(this.novaGota(Math.random() * width, Math.random() * height));
    }

    this.clarao = cena.add
      .rectangle(0, 0, width, height, 0xd6e4ff, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(c.PROFUNDIDADE - 10);
    this.raioCeu = cena.add.graphics().setScrollFactor(0).setDepth(-96);
    this.proximoRaioMs = RAIOS_FASE_FINAL.INTERVALOS_MS[0];
  }

  private novaGota(x: number, y: number): Gota {
    const c = CHUVA_FASE_FINAL;
    return {
      x,
      y,
      velocidade: Phaser.Math.Between(c.VELOCIDADE_MIN, c.VELOCIDADE_MAX),
      comprimento: Phaser.Math.Between(c.COMPRIMENTO_MIN, c.COMPRIMENTO_MAX),
    };
  }

  public update(tempo: number, delta: number): void {
    this.tempoAtual = tempo;
    const c = CHUVA_FASE_FINAL;
    const dt = delta / 1000;
    const { width, height } = this.cena.scale;
    const cam = this.cena.cameras.main;
    const g = this.grafico;
    g.clear();

    g.lineStyle(1, c.COR, c.ALFA);
    for (const gota of this.gotas) {
      gota.y += gota.velocidade * dt;
      gota.x += gota.velocidade * c.INCLINACAO * dt;
      if (gota.y > height + 20 || gota.x < -40) {
        Object.assign(gota, this.novaGota(Math.random() * (width + 120), -Math.random() * 60));
      }
      g.lineBetween(gota.x, gota.y, gota.x - gota.comprimento * c.INCLINACAO, gota.y - gota.comprimento);
    }

    // Respingos na linha do chão visível
    if (this.chaoY !== undefined) {
      const yTela = this.chaoY - cam.scrollY;
      if (yTela > 0 && yTela < height) {
        this.acumuladorRespingoMs += delta;
        const intervalo = 1000 / c.RESPINGOS_POR_SEGUNDO;
        while (this.acumuladorRespingoMs >= intervalo) {
          this.acumuladorRespingoMs -= intervalo;
          this.respingos.push({ x: Math.random() * width, y: yTela + Math.random() * 60, vidaMs: 220 });
        }
      }
      for (let i = this.respingos.length - 1; i >= 0; i--) {
        const r = this.respingos[i];
        r.vidaMs -= delta;
        if (r.vidaMs <= 0) {
          this.respingos.splice(i, 1);
          continue;
        }
        const k = 1 - r.vidaMs / 220;
        g.lineStyle(1, c.COR, c.ALFA * (1 - k) * 1.4);
        g.lineBetween(r.x - 2 - k * 4, r.y - k * 3, r.x - 1, r.y);
        g.lineBetween(r.x + 1, r.y, r.x + 2 + k * 4, r.y - k * 3);
      }
    }

    // Relâmpago ambiente em cadência fixa
    this.proximoRaioMs -= delta;
    if (this.proximoRaioMs <= 0) {
      const lista = RAIOS_FASE_FINAL.INTERVALOS_MS;
      this.indiceRaio = (this.indiceRaio + 1) % lista.length;
      this.proximoRaioMs = lista[this.indiceRaio];
      this.relampejar(160 + ((this.indiceRaio * 397) % 900));
    }
    if (tempo > this.raioVisivelAte) this.raioCeu.clear();
  }

  /** Clarão na tela e um raio no céu ao fundo, na coluna x (tela). */
  public relampejar(xTela: number): void {
    const r = RAIOS_FASE_FINAL;
    this.cena.tweens.killTweensOf(this.clarao);
    this.clarao.setAlpha(r.FLASH_ALFA);
    this.cena.tweens.add({ targets: this.clarao, alpha: 0, duration: r.FLASH_MS, ease: 'Quad.easeOut' });
    desenharRaio(this.raioCeu, xTela, -10, xTela + 60, 260, 0xe8f0ff, 2);
    this.raioVisivelAte = this.tempoAtual + r.RAIO_VISIVEL_MS;
  }

  public destruir(): void {
    this.grafico.destroy();
    this.clarao.destroy();
    this.raioCeu.destroy();
  }
}

/** Raio quebrado em zigue-zague de (x0, y0) a (x1, y1), com ramificação. Padrão fixo pela posição. */
export function desenharRaio(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cor: number,
  espessura: number
): void {
  g.clear();
  const segmentos = 9;
  const pontos: Array<[number, number]> = [];
  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos;
    const desvio = i === 0 || i === segmentos ? 0 : (((i * 7919 + Math.round(x0)) % 41) - 20) * 1.4;
    pontos.push([x0 + (x1 - x0) * t + desvio, y0 + (y1 - y0) * t]);
  }
  for (const [largura, alfa] of [
    [espessura * 4, 0.18],
    [espessura, 1],
  ] as const) {
    g.lineStyle(largura, cor, alfa);
    g.beginPath();
    g.moveTo(pontos[0][0], pontos[0][1]);
    for (const [x, y] of pontos.slice(1)) g.lineTo(x, y);
    g.strokePath();
  }
  // Galho
  const [bx, by] = pontos[4];
  g.lineStyle(Math.max(1, espessura - 1), cor, 0.8);
  g.beginPath();
  g.moveTo(bx, by);
  g.lineTo(bx + 28, by + 30);
  g.lineTo(bx + 22, by + 58);
  g.strokePath();
}
