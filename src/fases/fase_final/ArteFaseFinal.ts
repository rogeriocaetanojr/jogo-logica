import Phaser from 'phaser';

/**
 * Base de arte da Fase Final: paleta noturna cyberpunk, pincel de pixel art em canvas,
 * fonte bitmap 3x5 e o logo do Mega Brain. Adaptado do ArtePorto (Fase 2).
 *
 * Regras da paleta (roteiro, seção 3): fundos azul-marinho, roxo e preto; acentos ciano e
 * magenta; vermelho só para ameaça (olhos, lasers, a marca do Mega Brain); laranja só na lava.
 */
export const COR = {
  // Noite
  preto: '#05050c',
  noite0: '#080a1a',
  noite1: '#0e1230',
  noite2: '#1a1644',
  roxo: '#2c1752',
  roxoClaro: '#4b2a7c',
  horizonte: '#3d1d5c',
  // Prédios
  predioFundo: '#11163a',
  predioMeio: '#18204a',
  predioFrente: '#1f2858',
  predioBorda: '#2c3870',
  janelaApagada: '#141a3c',
  janelaFria: '#86dcff',
  janelaQuente: '#ffd27a',
  janelaRoxa: '#c58cff',
  // Neon
  ciano: '#22e5ff',
  cianoEscuro: '#0b7f99',
  magenta: '#ff2bd6',
  magentaEscuro: '#8f137a',
  vermelho: '#ff2a3d',
  vermelhoEscuro: '#8a0f1f',
  // Rua
  concreto: '#2b2e44',
  concretoClaro: '#3f4462',
  concretoEscuro: '#1b1d2e',
  asfalto: '#11121f',
  faixa: '#c9c2a0',
  metal: '#4a5172',
  metalClaro: '#7b84aa',
  contorno: '#04040a',
  branco: '#eef0ff',
  // Pessoas
  pele: '#d8a07a',
  peleSombra: '#a8704f',
  cabeloGrisalho: '#9a9aa6',
  uniforme: '#2d3a66',
  uniformeSombra: '#1e2748',
  calca: '#1c1f30',
  bone: '#24305c',
  garrafa: '#c23a3a',
  // Fogo (só na arena da lava)
  lava: '#ff7a1a',
} as const;

export function hexNum(h: string): number {
  return parseInt(h.slice(1), 16);
}

export function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbHex(c: readonly number[]): string {
  return (
    '#' +
    c
      .slice(0, 3)
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function misturar(a: string, b: string, k: number): string {
  const x = hexRgb(a);
  const y = hexRgb(b);
  return rgbHex([x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]);
}

/** Escurece uma cor em direção ao preto (k = 0 mantém, k = 1 vira preto). */
export function sombrear(h: string, k: number): string {
  return misturar(h, '#000000', k);
}

export function empacotar(c: readonly number[], a = 255): number {
  return ((a << 24) | ((c[2] & 255) << 16) | ((c[1] & 255) << 8) | (c[0] & 255)) >>> 0;
}

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((linha) => linha.map((v) => (v + 0.5) / 16));

/** Limiar da matriz de Bayer 4x4 para pontilhado ordenado. */
export function bayer(x: number, y: number): number {
  return BAYER_4[y & 3][x & 3];
}

/** Hash determinístico 0..1 (ruído estável: o mesmo prédio sempre tem as mesmas janelas acesas). */
export function hash3(a: number, b: number, c: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* =========================================================================
 * FONTE BITMAP 3x5
 * ========================================================================= */

const FONTE: Record<string, string[]> = {
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
  B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
  C: ['.XX', 'X..', 'X..', 'X..', '.XX'],
  D: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'],
  E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  F: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
  G: ['.XX', 'X..', 'X.X', 'X.X', '.XX'],
  H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  I: ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  J: ['..X', '..X', '..X', 'X.X', '.X.'],
  K: ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'],
  L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
  M: ['X.X', 'XXX', 'XXX', 'X.X', 'X.X'],
  N: ['XX.', 'X.X', 'X.X', 'X.X', 'X.X'],
  O: ['.X.', 'X.X', 'X.X', 'X.X', '.X.'],
  P: ['XX.', 'X.X', 'XX.', 'X..', 'X..'],
  Q: ['.X.', 'X.X', 'X.X', 'XX.', '.XX'],
  R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
  S: ['.XX', 'X..', '.X.', '..X', 'XX.'],
  T: ['XXX', '.X.', '.X.', '.X.', '.X.'],
  U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'],
  V: ['X.X', 'X.X', 'X.X', 'X.X', '.X.'],
  W: ['X.X', 'X.X', 'XXX', 'XXX', 'X.X'],
  X: ['X.X', 'X.X', '.X.', 'X.X', 'X.X'],
  Y: ['X.X', 'X.X', '.X.', '.X.', '.X.'],
  Z: ['XXX', '..X', '.X.', 'X..', 'XXX'],
  '0': ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
  '2': ['XX.', '..X', '.X.', 'X..', 'XXX'],
  '3': ['XX.', '..X', '.X.', '..X', 'XX.'],
  '4': ['X.X', 'X.X', 'XXX', '..X', '..X'],
  '5': ['XXX', 'X..', 'XX.', '..X', 'XX.'],
  '6': ['.XX', 'X..', 'XXX', 'X.X', 'XXX'],
  '7': ['XXX', '..X', '.X.', '.X.', '.X.'],
  '8': ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
  '9': ['XXX', 'X.X', 'XXX', '..X', 'XX.'],
  '.': ['...', '...', '...', '...', '.X.'],
  ',': ['...', '...', '...', '.X.', 'X..'],
  ':': ['...', '.X.', '...', '.X.', '...'],
  '!': ['.X.', '.X.', '.X.', '...', '.X.'],
  '?': ['XX.', '..X', '.X.', '...', '.X.'],
  '-': ['...', '...', 'XXX', '...', '...'],
  _: ['...', '...', '...', '...', 'XXX'],
  '(': ['.X.', 'X..', 'X..', 'X..', '.X.'],
  ')': ['.X.', '..X', '..X', '..X', '.X.'],
  '=': ['...', 'XXX', '...', 'XXX', '...'],
  '+': ['...', '.X.', 'XXX', '.X.', '...'],
  '>': ['X..', '.X.', '..X', '.X.', 'X..'],
  '/': ['..X', '..X', '.X.', 'X..', 'X..'],
  '%': ['X.X', '..X', '.X.', 'X..', 'X.X'],
  '&': ['.X.', 'X.X', '.X.', 'X.X', '.XX'],
  '*': ['...', 'X.X', '.X.', 'X.X', '...'],
};

/** Remove acentos e passa para maiúsculas (a fonte bitmap só tem ASCII). */
function normalizarTexto(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

export function larguraTexto(str: string, escala = 1): number {
  const n = normalizarTexto(str).length;
  return n === 0 ? 0 : (n * 4 - 1) * escala;
}

/* =========================================================================
 * PINCEL DE PIXEL ART
 * ========================================================================= */

export class Pincel {
  public readonly ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
  }

  px(x: number, y: number, w: number, h: number, cor: string): void {
    this.ctx.fillStyle = cor;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  ponto(x: number, y: number, cor: string): void {
    this.ctx.fillStyle = cor;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  disco(cx: number, cy: number, r: number, cor: string): void {
    this.ctx.fillStyle = cor;
    cx = Math.round(cx);
    cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
      this.ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  }

  elipse(cx: number, cy: number, rx: number, ry: number, cor: string): void {
    this.ctx.fillStyle = cor;
    cx = Math.round(cx);
    cy = Math.round(cy);
    for (let dy = -ry; dy <= ry; dy++) {
      const k = 1 - (dy * dy) / (ry * ry + 0.0001);
      if (k < 0) continue;
      const dx = Math.floor(rx * Math.sqrt(k) + 0.35);
      this.ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  }

  linha(x0: number, y0: number, x1: number, y1: number, cor: string): void {
    this.ctx.fillStyle = cor;
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 4000; i++) {
      this.ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  moldura(x: number, y: number, w: number, h: number, cor: string): void {
    this.px(x, y, w, 1, cor);
    this.px(x, y + h - 1, w, 1, cor);
    this.px(x, y, 1, h, cor);
    this.px(x + w - 1, y, 1, h, cor);
  }

  texto(str: string, x: number, y: number, cor: string, escala = 1): void {
    this.ctx.fillStyle = cor;
    let cx = Math.round(x);
    const cy = Math.round(y);
    for (const ch of normalizarTexto(str)) {
      const glifo = FONTE[ch];
      if (glifo) {
        glifo.forEach((linha, yy) => {
          for (let xx = 0; xx < 3; xx++) {
            if (linha[xx] === 'X') this.ctx.fillRect(cx + xx * escala, cy + yy * escala, escala, escala);
          }
        });
      }
      cx += 4 * escala;
    }
  }

  textoCentro(str: string, cx: number, y: number, cor: string, escala = 1): void {
    this.texto(str, Math.round(cx - larguraTexto(str, escala) / 2), y, cor, escala);
  }

  /** Faixas verticais de cor com pontilhado de Bayer na transição (céus e paredes). */
  degradePontilhado(x: number, y: number, w: number, h: number, cores: readonly string[], curva = 1.2): void {
    const pal = cores.map(hexRgb);
    const img = this.ctx.createImageData(w, h);
    const buf = new Uint32Array(img.data.buffer);
    for (let yy = 0; yy < h; yy++) {
      const f = Math.pow(yy / Math.max(1, h - 1), curva) * (pal.length - 1);
      const i = Math.min(pal.length - 2, Math.floor(f));
      const fr = Math.max(0, (f - i - 0.55) / 0.45);
      for (let xx = 0; xx < w; xx++) {
        const c = fr > bayer(x + xx, y + yy) ? pal[i + 1] : pal[i];
        buf[yy * w + xx] = empacotar(c);
      }
    }
    this.ctx.putImageData(img, x, y);
  }
}

/* =========================================================================
 * FÁBRICA DE TEXTURAS
 * ========================================================================= */

/** Cria (uma única vez) uma textura de canvas em resolução de arte, com filtro NEAREST. */
export function texturaPixel(
  cena: Phaser.Scene,
  chave: string,
  w: number,
  h: number,
  desenhar: (p: Pincel) => void
): string {
  if (cena.textures.exists(chave)) return chave;
  const tex = cena.textures.createCanvas(chave, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  if (!tex) return chave;
  desenhar(new Pincel(tex.getContext()));
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return chave;
}

/** Folha de sprites horizontal com quadros numerados 0..n-1. */
export function folhaPixel(
  cena: Phaser.Scene,
  chave: string,
  larguraQuadro: number,
  alturaQuadro: number,
  quadros: number,
  desenhar: (p: Pincel, quadro: number) => void
): string {
  if (cena.textures.exists(chave)) return chave;
  const tex = cena.textures.createCanvas(chave, larguraQuadro * quadros, alturaQuadro);
  if (!tex) return chave;
  const ctx = tex.getContext();
  const pincel = new Pincel(ctx);
  for (let i = 0; i < quadros; i++) {
    ctx.save();
    ctx.translate(i * larguraQuadro, 0);
    ctx.beginPath();
    ctx.rect(0, 0, larguraQuadro, alturaQuadro);
    ctx.clip();
    desenhar(pincel, i);
    ctx.restore();
  }
  tex.refresh();
  for (let i = 0; i < quadros; i++) {
    tex.add(i, 0, i * larguraQuadro, 0, larguraQuadro, alturaQuadro);
  }
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return chave;
}

/** Textura suave (sem pixelização), usada para brilhos aditivos. */
export function texturaSuave(
  cena: Phaser.Scene,
  chave: string,
  w: number,
  h: number,
  desenhar: (ctx: CanvasRenderingContext2D) => void
): string {
  if (cena.textures.exists(chave)) return chave;
  const tex = cena.textures.createCanvas(chave, w, h);
  if (!tex) return chave;
  desenhar(tex.getContext());
  tex.refresh();
  return chave;
}

/** Brilho radial branco (pintado com tint e blend ADD). */
export function texturaBrilho(cena: Phaser.Scene): string {
  return texturaSuave(cena, 'ff-brilho', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

/** Retrato em data URL para o avatar do comunicador, ampliado sem suavização. */
export function retratoDataUrl(w: number, h: number, ampliacao: number, desenhar: (p: Pincel) => void): string {
  const base = document.createElement('canvas');
  base.width = w;
  base.height = h;
  const ctxBase = base.getContext('2d');
  if (!ctxBase) return '';
  desenhar(new Pincel(ctxBase));
  const grande = document.createElement('canvas');
  grande.width = w * ampliacao;
  grande.height = h * ampliacao;
  const ctx = grande.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, 0, 0, grande.width, grande.height);
  return grande.toDataURL('image/png');
}

/** HTML do avatar para o comunicador (imagem pixelada centralizada). */
export function avatarHtml(dataUrl: string, rotulo: string): string {
  return `<img src="${dataUrl}" alt="${rotulo}" style="width:56px;height:auto;image-rendering:pixelated;display:block;margin:auto" />`;
}

/* =========================================================================
 * MARCA DO MEGA BRAIN
 * ========================================================================= */

// Lóbulos do hemisfério esquerdo (dx, dy, raio) em unidades de R; o direito é o espelho
const LOBULOS: ReadonlyArray<readonly [number, number, number]> = [
  [-0.3, -0.62, 0.34],
  [-0.66, -0.42, 0.38],
  [-0.92, -0.04, 0.36],
  [-0.78, 0.36, 0.36],
  [-0.38, 0.5, 0.36],
  [-0.38, -0.05, 0.46],
];

/**
 * Logo do Mega Brain: cérebro de contorno ondulado, metade orgânica (dobras) e metade
 * circuito (trilhas com nós). `r` é a meia-largura aproximada em pixels de arte.
 */
export function desenharLogoMegaBrain(
  p: Pincel,
  cx: number,
  cy: number,
  r: number,
  cor: string = COR.vermelho,
  corDetalhe: string = COR.vermelhoEscuro
): void {
  const R = r / 1.25;
  const contorno = sombrear(cor, 0.7);
  const claro = misturar(cor, '#ffffff', 0.45);
  const lobulos = LOBULOS.flatMap(([dx, dy, rr]) => [
    [cx + dx * R, cy + dy * R, rr * R],
    [cx - dx * R, cy + dy * R, rr * R],
  ]);
  for (const [x, y, rr] of lobulos) p.disco(x, y, Math.round(rr) + 1, contorno);
  for (const [x, y, rr] of lobulos) p.disco(x, y, Math.round(rr), cor);
  // Brilho no alto dos lóbulos de cima
  for (const [x, y, rr] of lobulos) if (y < cy - R * 0.3) p.px(x - rr * 0.4, y - rr * 0.7, Math.max(1, rr * 0.5), 1, claro);

  // Fissura entre os hemisférios
  const larguraFissura = Math.max(1, Math.round(R / 10));
  p.px(cx - Math.floor(larguraFissura / 2), cy - R * 0.8, larguraFissura, R * 1.35, contorno);

  // Metade esquerda: dobras orgânicas
  const dobra = (pontos: Array<[number, number]>) => {
    for (let i = 0; i < pontos.length - 1; i++) {
      p.linha(cx + pontos[i][0] * R, cy + pontos[i][1] * R, cx + pontos[i + 1][0] * R, cy + pontos[i + 1][1] * R, corDetalhe);
    }
  };
  dobra([[-0.82, -0.28], [-0.55, -0.4], [-0.32, -0.2]]);
  dobra([[-0.95, 0.18], [-0.62, 0.08], [-0.48, 0.34]]);
  dobra([[-0.5, -0.72], [-0.22, -0.5]]);
  dobra([[-0.3, 0.12], [-0.15, 0.3]]);

  // Metade direita: trilhas de circuito com nós
  const no = Math.max(1, Math.round(R / 9));
  const trilha = (pontos: Array<[number, number]>) => {
    dobra(pontos);
    const [fx, fy] = pontos[pontos.length - 1];
    p.disco(cx + fx * R, cy + fy * R, no, corDetalhe);
  };
  trilha([[0.14, -0.38], [0.52, -0.38], [0.7, -0.56]]);
  trilha([[0.14, 0], [0.86, 0]]);
  trilha([[0.14, 0.32], [0.46, 0.32], [0.62, 0.48]]);
}
