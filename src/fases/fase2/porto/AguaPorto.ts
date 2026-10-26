import Phaser from 'phaser';
import { ESCALA, bayer, empacotar, folhaPixel, hash3, hexRgb, misturarRgb } from './ArtePorto';
import { PROF } from './EfeitosPorto';

const LARGURA = 320;
const ALTURA = 180;

export interface ManchaOleo {
  x: number;
  profundidade: number;
  rx: number;
  ry: number;
}

export interface ReflexoFogo {
  x0: number;
  x1: number;
  forca: number;
}

export interface ConfigAgua {
  nivel: number;
  mare?: { amplitude: number; periodo: number };
  regioes?: Array<[number, number]>;
  noite?: boolean;
  limpeza?: number;
  manchas?: ManchaOleo[];
  reflexos?: ReflexoFogo[];
  lixo?: Array<{ tipo: number; x: number }>;
}

type Rgb = [number, number, number];

interface PaletaAgua {
  rampa: Rgb[];
  brilho: Rgb;
  lodo: Rgb;
  fundo: Rgb;
  espuma: Rgb;
  oleo: Rgb[];
}

const PALETA_SUJA: PaletaAgua = {
  rampa: ['#7A4A32', '#2A3A2A', '#1E2A22', '#141C18'].map(hexRgb),
  brilho: hexRgb('#A8603A'),
  lodo: hexRgb('#3E5236'),
  fundo: hexRgb('#10160F'),
  espuma: hexRgb('#8A8A68'),
  oleo: ['#6B3FA0', '#2FA4A8', '#C9B03A', '#A0407A'].map(hexRgb),
};

const PALETA_SUJA_NOITE: PaletaAgua = {
  rampa: ['#2A1E30', '#14201E', '#0E1418', '#080C10'].map(hexRgb),
  brilho: hexRgb('#4A2430'),
  lodo: hexRgb('#1E2C24'),
  fundo: hexRgb('#06090C'),
  espuma: hexRgb('#3A4038'),
  oleo: ['#6B3FA0', '#2FA4A8', '#C9B03A', '#A0407A'].map((c) => misturarRgb(hexRgb(c), [10, 12, 30], 0.35)),
};

const PALETA_LIMPA: PaletaAgua = {
  rampa: ['#7AA8B0', '#3E7E8A', '#24566A', '#163A4E'].map(hexRgb),
  brilho: hexRgb('#B8E0E8'),
  lodo: hexRgb('#4A8E9A'),
  fundo: hexRgb('#102838'),
  espuma: hexRgb('#E8F4F4'),
  oleo: ['#3E7E8A', '#4A8E9A', '#5A9EAA', '#3E7E8A'].map(hexRgb),
};

const RAMPA_EM = [0, 0.16, 0.5, 1];
const FOGO_1 = hexRgb('#C8501E');
const FOGO_2 = hexRgb('#F09A3A');

/**
 * Mar poluído do porto, desenhado pixel a pixel como na cena de referência:
 * verde-lodo escuro, manchas de óleo furta-cor com pontilhado, reflexo do fogo em traços
 * laranja na horizontal e lixo boiando. Inclui a maré e a transição para água limpa.
 */
export class AguaPorto {
  public nivelBase: number;
  public limpeza: number;
  public noite: boolean;
  public reflexos: ReflexoFogo[];
  public manchas: ManchaOleo[];
  public amplitudeExtra = 0;

  private readonly cena: Phaser.Scene;
  private readonly mare: { amplitude: number; periodo: number } | null;
  private readonly regioes: Array<[number, number]> | null;
  private readonly textura: Phaser.Textures.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly imagem: Phaser.GameObjects.Image;
  private readonly dados: ImageData;
  private readonly buffer: Uint32Array;
  private readonly lixo: Array<{ sprite: Phaser.GameObjects.Image; x: number; fase: number }> = [];
  private tempo = 0;
  private acumulado = 0;
  private nivelAtualCache: number;

  constructor(cena: Phaser.Scene, config: ConfigAgua) {
    this.cena = cena;
    this.nivelBase = config.nivel;
    this.nivelAtualCache = config.nivel;
    this.mare = config.mare ?? null;
    this.regioes = config.regioes ?? null;
    this.noite = config.noite ?? false;
    this.limpeza = config.limpeza ?? 0;
    this.reflexos = config.reflexos ?? [];
    this.manchas = config.manchas ?? [];

    const chave = 'pb-agua-tela';
    const existente = cena.textures.exists(chave) ? (cena.textures.get(chave) as Phaser.Textures.CanvasTexture) : null;
    this.textura = existente ?? (cena.textures.createCanvas(chave, LARGURA, ALTURA) as Phaser.Textures.CanvasTexture);
    this.textura.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.ctx = this.textura.getContext();
    this.dados = this.ctx.createImageData(LARGURA, ALTURA);
    this.buffer = new Uint32Array(this.dados.data.buffer);
    this.imagem = cena.add.image(0, 0, chave).setOrigin(0, 0).setScale(ESCALA).setScrollFactor(0).setDepth(PROF.agua);

    gerarTexturaLixo(cena);
    for (const item of config.lixo ?? []) {
      const s = cena.add.image(item.x, this.nivelBase, 'pb-lixo', item.tipo).setScale(ESCALA).setDepth(PROF.agua + 1);
      this.lixo.push({ sprite: s, x: item.x, fase: Math.random() * 6 });
    }
  }

  /** Nível atual da superfície (com maré) em coordenadas de mundo. */
  get nivel(): number {
    return this.nivelAtualCache;
  }

  nivelEm(_x: number): number {
    return this.nivelAtualCache;
  }

  existeAgua(x: number): boolean {
    if (!this.regioes) return true;
    return this.regioes.some(([a, b]) => x >= a && x <= b);
  }

  estaSubmerso(x: number, y: number): boolean {
    return this.existeAgua(x) && y > this.nivelAtualCache;
  }

  private calcularNivel(): number {
    let n = this.nivelBase;
    if (this.mare) n += this.mare.amplitude * Math.sin((this.tempo / this.mare.periodo) * Math.PI * 2);
    return n + this.amplitudeExtra;
  }

  atualizar(delta: number): void {
    this.tempo += delta;
    this.nivelAtualCache = this.calcularNivel();
    const t = this.tempo / 1000;
    for (const item of this.lixo) {
      const x = item.x + Math.sin(t * 0.25 + item.fase) * 8;
      const y = this.nivelAtualCache - 6 + Math.round(Math.sin(t * 1.6 + item.fase) * 1) * ESCALA;
      item.sprite.setPosition(Math.round(x / ESCALA) * ESCALA, Math.round(y / ESCALA) * ESCALA);
    }
    // Redesenha em ~30 quadros por segundo (o mar muda devagar)
    this.acumulado += delta;
    if (this.acumulado < 33) return;
    this.acumulado = 0;
    this.desenhar();
  }

  private paleta(): PaletaAgua {
    const suja = this.noite ? PALETA_SUJA_NOITE : PALETA_SUJA;
    if (this.limpeza <= 0) return suja;
    if (this.limpeza >= 1) return PALETA_LIMPA;
    const k = this.limpeza;
    const mix = (a: Rgb, b: Rgb): Rgb => misturarRgb(a, b, k);
    return {
      rampa: suja.rampa.map((c, i) => mix(c, PALETA_LIMPA.rampa[i])),
      brilho: mix(suja.brilho, PALETA_LIMPA.brilho),
      lodo: mix(suja.lodo, PALETA_LIMPA.lodo),
      fundo: mix(suja.fundo, PALETA_LIMPA.fundo),
      espuma: mix(suja.espuma, PALETA_LIMPA.espuma),
      oleo: suja.oleo.map((c, i) => mix(c, PALETA_LIMPA.oleo[i])),
    };
  }

  private desenhar(): void {
    const cam = this.cena.cameras.main;
    const camX = cam.scrollX;
    const camY = cam.scrollY;
    const nivel = this.nivelAtualCache;
    const t = this.tempo / 1000;
    const pal = this.paleta();
    const buf = this.buffer;
    const alfa = 214;
    const forcaOleo = 1 - this.limpeza;
    buf.fill(0);

    const linhaInicial = Math.max(0, Math.floor((nivel - 8 - camY) / ESCALA));
    const profundidadeRampa = 200;
    for (let ay = linhaInicial; ay < ALTURA; ay++) {
      const wy = camY + ay * ESCALA + 2;
      const ya = Math.floor(wy / ESCALA);
      const wob1 = Math.sin(t * 1.2 + ya * 0.9) * 1.8;
      const wob2 = Math.sin(t * 1.0 + ya * 0.6) * 1.6;
      const wob3 = Math.sin(t * 3 + ya * 0.8) * 2;
      for (let ax = 0; ax < LARGURA; ax++) {
        const wx = camX + ax * ESCALA + 2;
        if (this.regioes && !this.existeAgua(wx)) continue;
        const xa = Math.floor(wx / ESCALA);
        const superficie = nivel + Math.sin(xa * 0.35 + t * 2) * 2;
        if (wy < superficie) continue;
        const prof = wy - superficie;
        const d = Math.min(1, prof / profundidadeRampa);
        const kx = 0.34 - 0.2 * d;
        let ri = 0;
        while (ri < 2 && d > RAMPA_EM[ri + 1]) ri++;
        const rf = Math.max(0, ((d - RAMPA_EM[ri]) / (RAMPA_EM[ri + 1] - RAMPA_EM[ri]) - 0.6) / 0.4);
        const b = bayer(xa, ya);
        let c: Rgb = rf > b ? pal.rampa[ri + 1] : pal.rampa[ri];
        if (Math.sin(xa * kx + ya * 13.7 + wob1) > 0.86) c = d < 0.2 ? pal.brilho : pal.lodo;
        else if (Math.sin(xa * kx * 0.8 + ya * 7.3 - wob2) < -0.92) c = pal.fundo;

        // Reflexo do fogo em traços horizontais
        for (let j = 0; j < this.reflexos.length; j++) {
          const r = this.reflexos[j];
          if (wx < r.x0 || wx > r.x1) continue;
          const f = 1 - prof / 136;
          if (f <= 0) continue;
          const v = r.forca * f * Math.sin((Math.PI * (wx - r.x0)) / (r.x1 - r.x0)) * (0.5 + 0.5 * Math.sin(xa * 0.55 + ya * 9.1 + wob3));
          if (v > 0.62) c = FOGO_2;
          else if (v > 0.36) c = FOGO_1;
          else if (v > 0.14 && v > b * 0.5) c = FOGO_1;
        }

        // Manchas de óleo furta-cor (roxo, ciano e amarelo) com pontilhado
        if (forcaOleo > 0.05) {
          for (let j = 0; j < this.manchas.length; j++) {
            const m = this.manchas[j];
            const cxm = m.x / ESCALA + Math.sin(t * 0.15 + j * 1.7) * 4;
            const cym = (superficie + m.profundidade) / ESCALA;
            const dy = ya - cym;
            if (dy > m.ry || dy < -m.ry) continue;
            const dx = xa - cxm;
            const e = (dx * dx) / (m.rx * m.rx) + (dy * dy) / (m.ry * m.ry);
            if (e < 1) {
              const banda = (((Math.floor(dx * 0.22 + dy * 0.8 + t * 0.6 + j) % 4) + 4) % 4);
              if ((0.75 * (1 - e) + 0.2) * forcaOleo > b) c = pal.oleo[banda];
            }
          }
        }

        if (prof < 8 && hash3(xa, ya, Math.floor(t * 2)) > 0.55) c = pal.espuma;
        else if (hash3(xa, ya, 7) > 0.988) c = pal.lodo;
        buf[ay * LARGURA + ax] = empacotar(c, alfa);
      }
    }
    this.ctx.putImageData(this.dados, 0, 0);
    this.textura.refresh();
  }

  /** Transição gradual para água limpa (recompensa visual dos desafios). */
  limpar(duracao: number, aoTerminar?: () => void): void {
    const inicio = this.limpeza;
    this.cena.tweens.addCounter({
      from: inicio,
      to: 1,
      duration: duracao,
      onUpdate: (tw) => {
        this.limpeza = tw.getValue() ?? 1;
      },
      onComplete: () => aoTerminar?.(),
    });
    for (const item of this.lixo) {
      this.cena.tweens.add({ targets: item.sprite, alpha: 0, duration: duracao });
    }
  }

  destruir(): void {
    this.imagem.destroy();
    for (const item of this.lixo) item.sprite.destroy();
  }
}

/** Lixo boiando: pneu, garrafa, sacola, barril e lata. */
function gerarTexturaLixo(cena: Phaser.Scene): void {
  folhaPixel(cena, 'pb-lixo', 10, 5, 5, (p, q) => {
    const K = '#141212';
    if (q === 0) {
      p.px(1, 1, 7, 1, K);
      p.px(0, 2, 2, 1, K);
      p.px(7, 2, 2, 1, K);
      p.px(1, 3, 7, 1, K);
      p.px(2, 1, 3, 1, '#4A4646');
    } else if (q === 1) {
      p.px(2, 2, 4, 2, '#4A8A5A');
      p.px(3, 2, 2, 1, '#8ACB9A');
      p.ponto(6, 2, '#C8301E');
    } else if (q === 2) {
      p.ponto(2, 1, '#D8D4C8');
      p.ponto(5, 1, '#D8D4C8');
      p.px(2, 2, 4, 1, '#D8D4C8');
      p.px(1, 3, 6, 2, '#C4C0B2');
    } else if (q === 3) {
      p.px(1, 1, 7, 3, '#2B5C9A');
      p.px(3, 1, 1, 3, '#1E4070');
      p.px(6, 1, 1, 3, '#1E4070');
      p.px(1, 1, 7, 1, '#8A4A2A');
    } else {
      p.px(3, 3, 3, 1, '#A8A8B0');
      p.ponto(4, 2, '#C8C8D0');
    }
  });
}
