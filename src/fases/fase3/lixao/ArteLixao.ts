import Phaser from 'phaser';

/**
 * Base de arte do Lixão Eletrônico: paleta própria da fase e pincel de pixel art
 * (desenho em canvas na resolução 320x180 e exibição em 4x).
 */

/** Cada pixel de arte vira um bloco de 4x4 pixels na tela (320x180 -> 1280x720). */
export const ESCALA = 4;

/** Paleta da Fase 3 (ver docs/fase3/PLANO_FASE3.md, "Visual e som"). */
export const COR = {
  // Céu de poeira
  ceuBege: '#E8D3A6',
  ceuAreia: '#D9A86A',
  ceuLaranja: '#C9743A',
  ceuPo: '#9C6A3E',
  // Chuva e noite
  ceuChuva: '#3A4A6A',
  ceuChuvaBaixo: '#5A6A8A',
  ceuNoite: '#140F2A',
  ceuNoiteBaixo: '#2A1F4A',
  // Lixo eletrônico
  placa: '#1F6B3A',
  placaClara: '#3F9A55',
  placaEscura: '#0F3A22',
  cobre: '#C07A3A',
  cobreEscuro: '#7A4422',
  sucata: '#5A5550',
  sucataEscura: '#2E2A28',
  // Interativo e perigo
  neon: '#3FF4F0',
  neonEscuro: '#1A9AA0',
  perigo: '#E83A3A',
  contorno: '#120E10',
} as const;

export function hexNum(h: string): number {
  return parseInt(h.slice(1), 16);
}

export function hexRgb(h: string): [number, number, number] {
  const n = hexNum(h);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Matriz de Bayer 4x4 normalizada (0..1), para pontilhado nas transições. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/** Gerador pseudoaleatório determinístico (mesma semente, mesmo cenário). */
export function aleatorio(semente: number): () => number {
  let s = semente >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Pincel de pixel art sobre um contexto de canvas, sempre em pixels inteiros. */
export class Pincel {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  px(x: number, y: number, w: number, h: number, cor: string): void {
    this.ctx.fillStyle = cor;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  ponto(x: number, y: number, cor: string): void {
    this.px(x, y, 1, 1, cor);
  }

  disco(cx: number, cy: number, r: number, cor: string): void {
    for (let y = -r; y <= r; y++) {
      const meia = Math.floor(Math.sqrt(r * r - y * y));
      this.px(cx - meia, cy + y, meia * 2 + 1, 1, cor);
    }
  }

  /** Linha de Bresenham. */
  linha(x0: number, y0: number, x1: number, y1: number, cor: string): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let erro = dx + dy;
    for (;;) {
      this.ponto(x0, y0, cor);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * erro;
      if (e2 >= dy) {
        erro += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        erro += dx;
        y0 += sy;
      }
    }
  }

  /** Sprite por linhas de caracteres; cada caractere é uma chave da paleta, '.' é transparente. */
  sprite(linhas: readonly string[], paleta: Record<string, string>, x: number, y: number): void {
    linhas.forEach((linha, yy) => {
      for (let xx = 0; xx < linha.length; xx++) {
        const cor = paleta[linha[xx]];
        if (cor) this.ponto(x + xx, y + yy, cor);
      }
    });
  }

  /** Faixas verticais de cor com pontilhado de Bayer na transição (céus). */
  degradePontilhado(x: number, y: number, w: number, h: number, cores: readonly string[]): void {
    const pal = cores.map(hexRgb);
    for (let yy = 0; yy < h; yy++) {
      const f = (yy / Math.max(1, h - 1)) * (pal.length - 1);
      const i = Math.min(pal.length - 2, Math.floor(f));
      const fr = f - i;
      for (let xx = 0; xx < w; xx++) {
        const c = fr > bayer(x + xx, y + yy) ? pal[i + 1] : pal[i];
        this.ponto(x + xx, y + yy, `rgb(${c[0]},${c[1]},${c[2]})`);
      }
    }
  }
}

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
  for (let i = 0; i < quadros; i++) tex.add(i, 0, i * larguraQuadro, 0, larguraQuadro, alturaQuadro);
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return chave;
}

/** Textura suave (sem pixelização), para brilhos aditivos de neon e faíscas. */
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
 * Texturas comuns a todas as áreas: engrenagem, placa de circuito, poeira, brilho neon,
 * marcador do ponto de exercício e placa de saída.
 */
export function gerarTexturasLixao(cena: Phaser.Scene): void {
  texturaPixel(cena, 'lx-engrenagem', 13, 13, (p) => {
    p.disco(6, 6, 5, COR.sucataEscura);
    for (const [x, y] of [
      [6, 0],
      [6, 12],
      [0, 6],
      [12, 6],
      [2, 2],
      [10, 2],
      [2, 10],
      [10, 10],
    ]) p.ponto(x, y, COR.sucataEscura);
    p.disco(6, 6, 2, COR.cobreEscuro);
    p.ponto(6, 6, COR.contorno);
  });

  texturaPixel(cena, 'lx-placa', 14, 9, (p) => {
    p.px(0, 0, 14, 9, COR.placa);
    p.px(0, 8, 14, 1, COR.placaEscura);
    p.linha(1, 2, 5, 2, COR.cobre);
    p.linha(5, 2, 7, 4, COR.cobre);
    p.linha(2, 6, 9, 6, COR.cobre);
    p.px(8, 1, 4, 3, COR.contorno);
    p.ponto(12, 6, COR.neon);
  });

  texturaPixel(cena, 'lx-poeira', 2, 2, (p) => p.px(0, 0, 2, 2, '#FFFFFF'));

  texturaSuave(cena, 'lx-brilho', 48, 48, (ctx) => {
    const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 48, 48);
  });

  // Ponto de exercício: terminal velho com tela ciano (2 quadros: tela acesa e piscando)
  folhaPixel(cena, 'lx-terminal', 14, 20, 2, (p, q) => {
    p.px(5, 12, 4, 8, COR.sucataEscura);
    p.px(0, 0, 14, 12, COR.contorno);
    p.px(1, 1, 12, 10, COR.sucata);
    p.px(2, 2, 10, 7, q === 0 ? COR.neon : COR.neonEscuro);
    p.px(3, 3, 5, 1, COR.contorno);
    p.px(3, 5, 7, 1, COR.contorno);
    p.ponto(11, 10, COR.perigo);
  });

  // Saída: placa com seta para a próxima área
  texturaPixel(cena, 'lx-saida', 16, 22, (p) => {
    p.px(7, 8, 2, 14, COR.sucataEscura);
    p.px(0, 0, 16, 9, COR.contorno);
    p.px(1, 1, 14, 7, COR.neonEscuro);
    p.sprite(['....X...', '....XX..', 'XXXXXXX.', '....XX..', '....X...'], { X: COR.neon }, 4, 2);
  });
}
