import Phaser from 'phaser';
import { COR, hexNum, texturaBrilho } from '../ArteFaseFinal';
import { CENA_FASE_FINAL } from '../constantesFaseFinal';
import { TEX_BOSS } from './TexturasBoss';

/**
 * Efeitos visuais do boss: partículas (faíscas, detritos, poeira), explosões, estouros de
 * quadrinho, clarões de tela e onomatopeias. Só visual: nada aqui muda a física ou os padrões
 * de ataque, por isso pode usar variação aleatória sem quebrar a regra de "sem sorte".
 */

type FormaParticula = 'quadrado' | 'risco' | 'circulo';

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravidade: number;
  arrasto: number;
  vidaMs: number;
  vidaMaxMs: number;
  tamanho: number;
  cor: number;
  forma: FormaParticula;
  chao?: number;
}

export interface OpcoesEmissao {
  quantidade: number;
  /** Direção média (radianos) e abertura do leque. */
  angulo?: number;
  abertura?: number;
  velocidade?: [number, number];
  vidaMs?: [number, number];
  tamanho?: [number, number];
  cores: readonly number[];
  gravidade?: number;
  arrasto?: number;
  forma?: FormaParticula;
  /** y do chão: as partículas quicam nele em vez de atravessar. */
  chao?: number;
  espalhar?: number;
}

const entre = (a: number, b: number) => a + Math.random() * (b - a);

/** Sistema de partículas leve desenhado num único Graphics; atualiza sozinho com a cena. */
export class Particulas {
  private readonly grafico: Phaser.GameObjects.Graphics;
  private lista: Particula[] = [];

  constructor(cena: Phaser.Scene, profundidade: number = 19) {
    this.grafico = cena.add.graphics().setDepth(profundidade);
    cena.events.on(Phaser.Scenes.Events.UPDATE, this.passo, this);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => cena.events.off(Phaser.Scenes.Events.UPDATE, this.passo, this));
  }

  public emitir(x: number, y: number, o: OpcoesEmissao): void {
    const [vMin, vMax] = o.velocidade ?? [80, 220];
    const [tMin, tMax] = o.vidaMs ?? [250, 500];
    const [sMin, sMax] = o.tamanho ?? [2, 4];
    for (let i = 0; i < o.quantidade; i++) {
      const ang = (o.angulo ?? -Math.PI / 2) + entre(-1, 1) * (o.abertura ?? Math.PI);
      const v = entre(vMin, vMax);
      const vida = entre(tMin, tMax);
      const esp = o.espalhar ?? 0;
      this.lista.push({
        x: x + entre(-esp, esp),
        y: y + entre(-esp, esp) * 0.5,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v,
        gravidade: o.gravidade ?? 600,
        arrasto: o.arrasto ?? 0.96,
        vidaMs: vida,
        vidaMaxMs: vida,
        tamanho: entre(sMin, sMax),
        cor: o.cores[i % o.cores.length],
        forma: o.forma ?? 'quadrado',
        chao: o.chao,
      });
    }
  }

  /** Faíscas amarelas e brancas (metal raspando, golpes). */
  public faiscas(x: number, y: number, angulo: number, abertura: number, quantidade: number, chao?: number): void {
    this.emitir(x, y, {
      quantidade,
      angulo,
      abertura,
      velocidade: [180, 420],
      vidaMs: [160, 380],
      tamanho: [1.5, 2.5],
      cores: [0xffffff, hexNum(COR.janelaQuente), 0xffd36b],
      gravidade: 900,
      arrasto: 0.97,
      forma: 'risco',
      chao,
    });
  }

  /** Pedaços de chão/metal voando e quicando. */
  public detritos(x: number, y: number, quantidade: number, cores: readonly number[], chao: number): void {
    this.emitir(x, y, {
      quantidade,
      angulo: -Math.PI / 2,
      abertura: Math.PI * 0.45,
      velocidade: [160, 380],
      vidaMs: [500, 900],
      tamanho: [3, 6],
      cores,
      gravidade: 1300,
      arrasto: 0.99,
      chao,
      espalhar: 18,
    });
  }

  private passo(_tempo: number, delta: number): void {
    const dt = Math.min(delta, 40) / 1000;
    const g = this.grafico;
    g.clear();
    if (this.lista.length === 0) return;
    const vivas: Particula[] = [];
    for (const p of this.lista) {
      p.vidaMs -= delta;
      if (p.vidaMs <= 0) continue;
      p.vy += p.gravidade * dt;
      p.vx *= p.arrasto;
      p.vy *= p.arrasto;
      const px = p.x;
      const py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.chao !== undefined && p.y > p.chao) {
        p.y = p.chao;
        p.vy *= -0.35;
        p.vx *= 0.6;
      }
      const k = p.vidaMs / p.vidaMaxMs;
      g.fillStyle(p.cor, Math.min(1, k * 1.6));
      if (p.forma === 'risco') {
        g.lineStyle(p.tamanho, p.cor, Math.min(1, k * 1.6));
        g.lineBetween(px, py, p.x + (p.x - px) * 0.6, p.y + (p.y - py) * 0.6);
      } else if (p.forma === 'circulo') {
        g.fillCircle(p.x, p.y, p.tamanho * (1.6 - k * 0.6));
      } else {
        g.fillRect(p.x - p.tamanho / 2, p.y - p.tamanho / 2, p.tamanho, p.tamanho);
      }
      vivas.push(p);
    }
    this.lista = vivas;
  }

  public limpar(): void {
    this.lista = [];
    this.grafico.clear();
  }
}

/** Nuvem de fumaça macia que sobe e some. */
export function fumaca(cena: Phaser.Scene, x: number, y: number, escala: number, cor: number, duracaoMs: number = 600, profundidade = 18): void {
  const img = cena.add
    .image(x, y, TEX_BOSS.FUMACA)
    .setScale(escala * 0.5)
    .setTint(cor)
    .setAlpha(0.75)
    .setDepth(profundidade);
  cena.tweens.add({
    targets: img,
    scale: escala * 1.3,
    y: y - 30 * escala,
    alpha: 0,
    duration: duracaoMs,
    ease: 'Quad.easeOut',
    onComplete: () => img.destroy(),
  });
}

/** Explosão: clarão aditivo, bola de fogo, anel de choque, faíscas, detritos e fumaça. */
export function explosao(cena: Phaser.Scene, particulas: Particulas, x: number, y: number, escala: number, chao: number): void {
  const brilho = texturaBrilho(cena);
  const fogo = cena.add
    .image(x, y, brilho)
    .setTint(0xff8a2a)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.4 * escala)
    .setDepth(21);
  cena.tweens.add({ targets: fogo, scale: 1.6 * escala, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => fogo.destroy() });
  const miolo = cena.add.image(x, y, brilho).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3 * escala).setDepth(22);
  cena.tweens.add({ targets: miolo, scale: 0.9 * escala, alpha: 0, duration: 200, onComplete: () => miolo.destroy() });

  const anel = cena.add.graphics().setDepth(21);
  cena.tweens.addCounter({
    from: 0,
    to: 1,
    duration: 320,
    onUpdate: (tw) => {
      const k = tw.getValue() ?? 0;
      anel.clear();
      anel.lineStyle(6 * (1 - k) + 1, 0xffe0a0, 1 - k);
      anel.strokeEllipse(x, y, 40 * escala + 140 * escala * k, (40 * escala + 140 * escala * k) * 0.55);
    },
    onComplete: () => anel.destroy(),
  });
  particulas.faiscas(x, y, -Math.PI / 2, Math.PI, Math.round(14 * escala), chao);
  particulas.detritos(x, y, Math.round(6 * escala), [0x3f4462, 0x2b2e44, hexNum(COR.janelaQuente)], chao);
  for (let i = 0; i < 3; i++) {
    cena.time.delayedCall(60 + i * 70, () => fumaca(cena, x + (i - 1) * 18 * escala, y - 6, 0.9 * escala, 0x4a4558, 700));
  }
}

/** Estouro de quadrinho: estrela de pontas irregulares que pula e some (efeito de porrada). */
export function estouro(cena: Phaser.Scene, x: number, y: number, raio: number, cor: number, contorno: number = 0x05050c, prof = 30): void {
  const g = cena.add.graphics().setDepth(prof).setPosition(x, y);
  const pontas = 10;
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < pontas * 2; i++) {
    const a = (i / (pontas * 2)) * Math.PI * 2 + 0.2;
    const r = i % 2 === 0 ? raio * (0.9 + ((i * 7) % 5) * 0.06) : raio * 0.45;
    pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  g.fillStyle(contorno, 1);
  g.fillPoints(
    pts.map((p) => p.clone().scale(1.12)),
    true
  );
  g.fillStyle(cor, 1);
  g.fillPoints(pts, true);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(0, 0, raio * 0.25);
  g.setScale(0.2);
  cena.tweens.add({ targets: g, scale: 1, duration: 90, ease: 'Back.easeOut' });
  cena.tweens.add({ targets: g, alpha: 0, scale: 1.25, delay: 160, duration: 160, onComplete: () => g.destroy() });
}

/** Clarão colorido cobrindo a tela inteira. */
export function clarao(cena: Phaser.Scene, cor: number, alfa: number, duracaoMs: number): void {
  const { width, height } = cena.scale;
  const r = cena.add
    .rectangle(0, 0, width, height, cor, alfa)
    .setOrigin(0)
    .setScrollFactor(0)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(CENA_FASE_FINAL.PROFUNDIDADE_HUD - 5);
  cena.tweens.add({ targets: r, alpha: 0, duration: duracaoMs, onComplete: () => r.destroy() });
}

/** Onomatopeia de quadrinho (POW!, BOOM!...) com estouro atrás. */
export function onomatopeia(cena: Phaser.Scene, x: number, y: number, texto: string, cor: string, inclinacao: number): void {
  estouro(cena, x, y, 46, hexNum(cor) === 0xffffff ? 0xffd36b : 0xffffff, 0x05050c, 31);
  const txt = cena.add
    .text(x, y, texto, {
      fontFamily: 'Impact, Consolas, monospace',
      fontSize: '34px',
      fontStyle: 'bold',
      color: cor,
      stroke: '#05050c',
      strokeThickness: 7,
    })
    .setOrigin(0.5)
    .setDepth(32)
    .setScale(0.3)
    .setAngle(inclinacao);
  cena.tweens.add({ targets: txt, scale: 1, duration: 120, ease: 'Back.easeOut' });
  cena.tweens.add({ targets: txt, alpha: 0, y: y - 18, delay: 380, duration: 200, onComplete: () => txt.destroy() });
}
