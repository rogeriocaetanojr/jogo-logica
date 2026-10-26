import Phaser from 'phaser';

/**
 * Base de arte do Porto Bugado: paleta oficial do documento de design, pincel de pixel art
 * (desenho em canvas na resolução 320x180 e exibição em 4x) e fonte bitmap 3x5.
 */

/** Cada pixel de arte vira um bloco de 4x4 pixels na tela (320x180 -> 1280x720). */
export const ESCALA = 4;

/** Paleta da direção de arte (documento "Porto Bugado — Design da Fase"). */
export const COR = {
  // Céu e fumaça
  fuligem: '#2E2826',
  fumacaIluminada: '#6E4030',
  ceuQueimado: '#7E2E28',
  horizonte: '#DE7A34',
  sol: '#DE5232',
  // Mar e óleo
  aguaFunda: '#141C18',
  verdeLodo: '#2A3A2A',
  lodoClaro: '#3E5236',
  oleoRoxo: '#6B3FA0',
  oleoCiano: '#2FA4A8',
  oleoAmarelo: '#C9B03A',
  // Fogo
  fogoNucleo: '#FFF1A8',
  fogoChama: '#F7C948',
  fogoLaranja: '#F08A24',
  fogoBrasa: '#C8401E',
  fogoPonta: '#6E1E14',
  // Porto e personagens
  concreto: '#6A6662',
  concretoClaro: '#8A857E',
  concretoEscuro: '#4A4744',
  contVermelho: '#A33A2A',
  contAzul: '#2B5C9A',
  contAmarelo: '#C99A1E',
  contVerde: '#3A7A47',
  advertencia: '#F2C230',
  virus: '#5CFF8A',
  telaBoia: '#4FD8E8',
  aco: '#2E2630',
  contorno: '#1A1414',
  branco: '#EDE6D2',
  espuma: '#E8E6DC',
  espumaSombra: '#B8B4A6',
} as const;

/** Cores dos contêineres na ordem usada pelo cenário. */
export const CORES_CONTEINER = [COR.contVermelho, COR.contAzul, COR.contAmarelo, COR.contVerde, '#7A3A6A', '#5A6A7A'];

/** Converte '#RRGGBB' em número 0xRRGGBB (para tint e Graphics). */
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

export function misturarRgb(a: readonly number[], b: readonly number[], k: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function misturar(a: string, b: string, k: number): string {
  return rgbHex(misturarRgb(hexRgb(a), hexRgb(b), k));
}

/** Escurece uma cor em direção ao preto (k = 0 mantém, k = 1 vira preto). */
export function sombrear(h: string, k: number): string {
  return rgbHex(misturarRgb(hexRgb(h), [0, 0, 0], k));
}

/** Versão noturna de uma cor (mesma fórmula da cena de referência). */
export function noturna(h: string, k = 1): string {
  const c = hexRgb(h);
  return rgbHex(misturarRgb(c, [c[0] * 0.42 + 4, c[1] * 0.48 + 6, c[2] * 0.78 + 14], k));
}

/** Empacota RGBA em um Uint32 little-endian (ImageData). */
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

/** Hash determinístico 0..1 para ruído estável. */
export function hash3(a: number, b: number, c: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Gerador pseudoaleatório com semente (LCG). */
export function aleatorio(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
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
  '[': ['XX.', 'X..', 'X..', 'X..', 'XX.'],
  ']': ['.XX', '..X', '..X', '..X', '.XX'],
  '{': ['.XX', '.X.', 'X..', '.X.', '.XX'],
  '}': ['XX.', '.X.', '..X', '.X.', 'XX.'],
  '=': ['...', 'XXX', '...', 'XXX', '...'],
  '+': ['...', '.X.', 'XXX', '.X.', '...'],
  '>': ['X..', '.X.', '..X', '.X.', 'X..'],
  '<': ['..X', '.X.', 'X..', '.X.', '..X'],
  '/': ['..X', '..X', '.X.', 'X..', 'X..'],
  "'": ['.X.', '.X.', '...', '...', '...'],
  '"': ['X.X', 'X.X', '...', '...', '...'],
  '#': ['X.X', 'XXX', 'X.X', 'XXX', 'X.X'],
  '%': ['X.X', '..X', '.X.', 'X..', 'X.X'],
  '*': ['...', 'X.X', '.X.', 'X.X', '...'],
};

/** Remove acentos e passa para maiúsculas (a fonte bitmap só tem ASCII). */
function normalizarTexto(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

/** Largura em pixels de arte de um texto na fonte 3x5. */
export function larguraTexto(str: string, escala = 1): number {
  const n = normalizarTexto(str).length;
  return n === 0 ? 0 : (n * 4 - 1) * escala;
}

/* =========================================================================
 * PINCEL DE PIXEL ART
 * ========================================================================= */

/**
 * Pincel sobre um CanvasRenderingContext2D que desenha em coordenadas inteiras de pixel de arte.
 */
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

  /** Disco preenchido no estilo pixel (linhas horizontais). */
  disco(cx: number, cy: number, r: number, cor: string): void {
    this.ctx.fillStyle = cor;
    cx = Math.round(cx);
    cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
      this.ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  }

  /** Elipse preenchida no estilo pixel. */
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

  /** Linha de Bresenham. */
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

  /** Contorno retangular de 1 pixel. */
  moldura(x: number, y: number, w: number, h: number, cor: string): void {
    this.px(x, y, w, 1, cor);
    this.px(x, y + h - 1, w, 1, cor);
    this.px(x, y, 1, h, cor);
    this.px(x + w - 1, y, 1, h, cor);
  }

  /** Texto na fonte bitmap 3x5 (escala inteira opcional). */
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

  /** Texto centralizado horizontalmente em cx. */
  textoCentro(str: string, cx: number, y: number, cor: string, escala = 1): void {
    this.texto(str, Math.round(cx - larguraTexto(str, escala) / 2), y, cor, escala);
  }

  /** Texto com contorno de 1 pixel (legível sobre fundos movimentados). */
  textoContorno(str: string, x: number, y: number, cor: string, contorno: string, escala = 1): void {
    for (const [ox, oy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      this.texto(str, x + ox * escala, y + oy * escala, contorno, escala);
    }
    this.texto(str, x, y, cor, escala);
  }

  /**
   * Desenha um sprite definido por linhas de caracteres; cada caractere é uma chave da paleta.
   * '.' ou caracteres ausentes da paleta são transparentes.
   */
  sprite(linhas: readonly string[], paleta: Record<string, string>, x: number, y: number, espelhar = false): void {
    const largura = Math.max(...linhas.map((l) => l.length));
    linhas.forEach((linha, yy) => {
      for (let xx = 0; xx < linha.length; xx++) {
        const cor = paleta[linha[xx]];
        if (!cor) continue;
        const px = espelhar ? largura - 1 - xx : xx;
        this.ctx.fillStyle = cor;
        this.ctx.fillRect(x + px, y + yy, 1, 1);
      }
    });
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

  /** Faixas diagonais amarelo/preto de advertência. */
  faixaAdvertencia(x: number, y: number, w: number, h: number, corA: string = COR.advertencia, corB: string = '#1A1616', passo = 4): void {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const k = Math.floor((xx + yy) / passo) % 2;
        this.ponto(x + xx, y + yy, k === 0 ? corA : corB);
      }
    }
  }
}

/* =========================================================================
 * FÁBRICA DE TEXTURAS
 * ========================================================================= */

/**
 * Cria (uma única vez) uma textura de canvas em resolução de arte, com filtro NEAREST
 * para manter os pixels nítidos ao exibir em 4x.
 */
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

/**
 * Cria uma folha de sprites horizontal com quadros numerados 0..n-1.
 */
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

/** Textura suave (sem pixelização), usada para brilhos radiais aditivos. */
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

/**
 * Gera um retrato em data URL (para o avatar do comunicador DOM), ampliado sem suavização.
 */
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
