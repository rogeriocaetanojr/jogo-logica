import Phaser from 'phaser';

/**
 * Base de arte do Lixão Eletrônico: paleta própria da fase e pincel de pixel art
 * (desenho em canvas na resolução 320x180 e exibição em 4x).
 */

/** Cada pixel de arte vira um bloco de 4x4 pixels na tela (320x180 -> 1280x720). */
export const ESCALA = 4;

/**
 * Paleta da Fase 3 (ver docs/fase3/PLANO_FASE3.md, "Paleta"). Nenhuma cor da fase fica fora
 * deste objeto. Ciano só no que é interativo; vermelho só no que é perigo.
 */
export const COR = {
  // Lixo eletrônico: placas de circuito
  verdePlaca: '#1F5C3A',
  verdePlacaClaro: '#3E8E5A',
  verdePlacaEscuro: '#12361F',
  // Lixo eletrônico: fios e trilhas de cobre
  cobre: '#B8733A',
  cobreClaro: '#D9965A',
  cobreEscuro: '#7A4A26',
  // Sucata (metal, carcaças, chão)
  sucataClara: '#6E6058',
  sucata: '#4A3F38',
  sombraSucata: '#2B2420',
  contorno: '#17120F',
  // Céu de poeira (áreas 1 a 3)
  ceuPoeiraClaro: '#F2D2A8',
  ceuPoeira: '#E8B887',
  horizonte: '#D98A4E',
  horizonteEscuro: '#A8623A',
  // Chuva e noite (áreas 4 a 6)
  chuvaAzulClaro: '#4E6596',
  chuvaAzul: '#2B3F6B',
  noiteRoxo: '#2A1F4A',
  noiteRoxoEscuro: '#160F2A',
  // Tintas que esfriam o cenário conforme o clima (multiplicam as cores desenhadas)
  tintaPo: '#E8C49A',
  tintaChuva: '#9AA8CC',
  tintaNoite: '#6E62A0',
  // Interativo e perigo
  neonCiano: '#3FE8E0',
  neonCianoEscuro: '#1E8F8C',
  perigo: '#E0413A',
  /** Branco neutro: base de partículas e brilhos que recebem tinta. */
  luz: '#FFFFFF',
} as const;

export type CorLixao = (typeof COR)[keyof typeof COR];

export function hexNum(h: string): number {
  return parseInt(h.slice(1), 16);
}

export function hexRgb(h: string): [number, number, number] {
  const n = hexNum(h);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Arredonda uma coordenada de mundo para a grade de pixels de arte (múltiplo de ESCALA). */
export function grade(v: number): number {
  return Math.round(v / ESCALA) * ESCALA;
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

  /** Retângulo com contorno de 1 pixel. */
  caixa(x: number, y: number, w: number, h: number, corpo: string, borda: string = COR.contorno): void {
    this.px(x, y, w, h, borda);
    this.px(x + 1, y + 1, w - 2, h - 2, corpo);
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

/* =========================================================================
 * PILHAS DE LIXO
 * Cada pilha é desenhada a partir da base (y do chão na arte), centrada em cx.
 * ========================================================================= */

export type TipoPilha = 'monitores' | 'placas' | 'cabos';

/** Silhueta de monte (perfil em raiz quadrada com borda irregular). Devolve o topo de cada coluna. */
function monte(p: Pincel, cx: number, base: number, larg: number, alt: number, cor: string, rnd: () => number): number[] {
  const topos: number[] = [];
  const x0 = Math.round(cx - larg / 2);
  for (let i = 0; i < larg; i++) {
    const t = 1 - Math.abs(x0 + i - cx) / (larg / 2);
    const topo = Math.round(base - alt * Math.sqrt(Math.max(0, t)) + rnd() * 2);
    topos.push(topo);
    p.px(x0 + i, topo, 1, base - topo + 1, cor);
  }
  return topos;
}

/** Monitores CRT velhos empilhados em fileiras que estreitam para cima. */
function pilhaMonitores(p: Pincel, cx: number, base: number, larg: number, alt: number, rnd: () => number): void {
  monte(p, cx, base, larg, alt * 0.55, COR.sombraSucata, rnd);
  let y = base;
  let largFileira = larg * 0.85;
  while (y > base - alt && largFileira > 10) {
    const h = 8 + Math.floor(rnd() * 3);
    let x = cx - largFileira / 2;
    while (x < cx + largFileira / 2 - 8) {
      const w = 10 + Math.floor(rnd() * 5);
      const desvio = Math.round(rnd() * 2 - 1);
      const by = y - h + desvio;
      if (rnd() < 0.7) {
        // De frente: carcaça, tela apagada e reflexo
        p.caixa(x, by, w, h, COR.sucataClara);
        p.px(x + 2, by + 2, w - 4, h - 4, COR.sombraSucata);
        p.ponto(x + 3, by + 3, COR.sucata);
        p.ponto(x + 4, by + 3, COR.sucata);
        p.px(x + 1, by + h - 2, w - 2, 1, COR.sucata);
      } else {
        // De lado: carcaça com grade de ventilação
        p.caixa(x, by, w, h, COR.sucata);
        for (let v = 2; v < w - 2; v += 2) p.px(x + v, by + 2, 1, h - 4, COR.sombraSucata);
      }
      x += w - 1;
    }
    y -= h - 1;
    largFileira *= 0.72;
  }
}

/** Placas de circuito empilhadas: lâminas verdes com trilhas de cobre e chips. */
function pilhaPlacas(p: Pincel, cx: number, base: number, larg: number, alt: number, rnd: () => number): void {
  const topos = monte(p, cx, base, larg, alt, COR.verdePlacaEscuro, rnd);
  const x0 = Math.round(cx - larg / 2);
  const n = Math.floor(larg / 4);
  for (let i = 0; i < n; i++) {
    const coluna = Math.floor(rnd() * (larg - 12)) + 2;
    const topo = topos[coluna] ?? base;
    const w = 8 + Math.floor(rnd() * 6);
    const h = 3 + Math.floor(rnd() * 2);
    const x = x0 + coluna;
    const y = topo + Math.floor(rnd() * Math.max(1, base - topo - h));
    p.px(x, y, w, h, COR.verdePlaca);
    p.px(x, y, w, 1, COR.verdePlacaClaro);
    p.px(x, y + h, w, 1, COR.contorno);
    if (rnd() < 0.7) p.linha(x + 1, y + h - 1, x + w - 3, y + h - 1, COR.cobre);
    if (rnd() < 0.5) p.px(x + 2 + Math.floor(rnd() * (w - 5)), y + 1, 2, 1, COR.contorno);
  }
  // Trilhas longas e ilhas de solda espalhadas
  for (let i = 0; i < n / 2; i++) {
    const coluna = Math.floor(rnd() * (larg - 6)) + 3;
    const topo = (topos[coluna] ?? base) + 2;
    if (topo >= base - 2) continue;
    const y = topo + Math.floor(rnd() * (base - topo - 2));
    p.linha(x0 + coluna, y, x0 + coluna + 3, y, COR.cobreEscuro);
    p.ponto(x0 + coluna + 3, y, COR.cobreClaro);
  }
}

/** Emaranhado de cabos: monte escuro coberto de laços pretos e fios de cobre desencapados. */
function pilhaCabos(p: Pincel, cx: number, base: number, larg: number, alt: number, rnd: () => number): void {
  const topos = monte(p, cx, base, larg, alt * 0.8, COR.sombraSucata, rnd);
  const x0 = Math.round(cx - larg / 2);
  const n = Math.floor(larg / 3);
  for (let i = 0; i < n; i++) {
    const coluna = Math.floor(rnd() * (larg - 8)) + 4;
    const topo = topos[coluna] ?? base;
    const x = x0 + coluna;
    const y = topo + 1 + Math.floor(rnd() * Math.max(1, base - topo - 3));
    const r = 2 + Math.floor(rnd() * 3);
    const cobre = rnd() < 0.35;
    // Laço: meia elipse em segmentos de Bresenham
    let ax = x - r;
    let ay = y;
    for (let k = 1; k <= 6; k++) {
      const ang = Math.PI + (k / 6) * Math.PI;
      const bx = x + Math.cos(ang) * r;
      const by = y + Math.sin(ang) * r * 0.7;
      p.linha(ax, ay, bx, by, cobre ? COR.cobre : COR.contorno);
      ax = bx;
      ay = by;
    }
    if (cobre) p.ponto(x, y - Math.round(r * 0.7), COR.cobreClaro);
  }
  // Pontas desencapadas saindo do topo
  for (let i = 0; i < 3; i++) {
    const coluna = Math.floor(larg * (0.25 + i * 0.25));
    const topo = topos[coluna] ?? base;
    const x = x0 + coluna;
    p.linha(x, topo, x + 2, topo - 3, COR.contorno);
    p.ponto(x + 3, topo - 4, COR.cobreClaro);
    p.ponto(x + 1, topo - 4, COR.cobre);
  }
}

/** Desenha uma pilha do tipo informado. */
export function desenharPilha(
  p: Pincel,
  tipo: TipoPilha,
  cx: number,
  base: number,
  larg: number,
  alt: number,
  rnd: () => number
): void {
  if (tipo === 'monitores') pilhaMonitores(p, cx, base, larg, alt, rnd);
  else if (tipo === 'placas') pilhaPlacas(p, cx, base, larg, alt, rnd);
  else pilhaCabos(p, cx, base, larg, alt, rnd);
}

/* =========================================================================
 * CHÃO DE SUCATA
 * ========================================================================= */

/** Altura da borda irregular do chão acima da linha de colisão, em pixels de arte. */
export const BORDA_CHAO = 3;

/**
 * Chão de sucata: borda de entulho, chapas rebitadas, cacos de placa e fios de cobre,
 * escurecendo para baixo. A linha de colisão fica em y = BORDA_CHAO.
 */
export function desenharChao(p: Pincel, w: number, h: number, rnd: () => number): void {
  const topo = BORDA_CHAO;
  p.px(0, topo, w, h - topo, COR.sucata);
  p.px(0, topo + 9, w, h - topo - 9, COR.sombraSucata);
  p.px(0, h - 3, w, 3, COR.contorno);
  // Borda irregular de entulho sobre a linha do chão
  for (let x = 0; x < w; x++) {
    const elevacao = Math.floor(rnd() * 4) === 0 ? 1 + Math.floor(rnd() * BORDA_CHAO) : 0;
    p.px(x, topo - elevacao, 1, elevacao + 1, COR.sucataClara);
    p.ponto(x, topo + 1, rnd() < 0.3 ? COR.contorno : COR.sucata);
  }
  // Chapas rebitadas
  for (let x = Math.floor(rnd() * 20); x < w; x += 18 + Math.floor(rnd() * 22)) {
    const cw = 7 + Math.floor(rnd() * 6);
    const cy = topo + 3 + Math.floor(rnd() * 3);
    p.caixa(x, cy, cw, 4, COR.sucataClara, COR.sombraSucata);
    p.ponto(x + 1, cy + 1, COR.contorno);
    p.ponto(x + cw - 2, cy + 1, COR.contorno);
  }
  // Cacos de placa, fios e parafusos
  for (let i = 0; i < w / 5; i++) {
    const x = Math.floor(rnd() * w);
    const y = topo + 3 + Math.floor(rnd() * (h - topo - 6));
    const r = rnd();
    if (r < 0.2) {
      p.px(x, y, 3, 2, COR.verdePlaca);
      p.ponto(x + 1, y, COR.cobre);
    } else if (r < 0.4) p.linha(x, y, x + 3, y + (rnd() < 0.5 ? 1 : -1), COR.cobreEscuro);
    else if (r < 0.5) p.ponto(x, y, COR.cobreClaro);
    else p.ponto(x, y, y > topo + 9 ? COR.contorno : COR.sombraSucata);
  }
}

/* =========================================================================
 * OBSTÁCULOS SÓLIDOS
 * Desenhados no tamanho exato do corpo de colisão (em pixels de arte).
 * ========================================================================= */

/** Bloco de sucata prensada: chapas empilhadas com rebites e frestas. */
export function desenharBlocoSucata(p: Pincel, w: number, h: number, rnd: () => number): void {
  p.caixa(0, 0, w, h, COR.sucata);
  p.px(1, 1, w - 2, 1, COR.sucataClara);
  for (let y = 4 + Math.floor(rnd() * 3); y < h - 2; y += 4 + Math.floor(rnd() * 3)) {
    p.px(1, y, w - 2, 1, COR.sombraSucata);
    p.px(1, y + 1, w - 2, 1, COR.sucataClara);
    const x = 2 + Math.floor(rnd() * (w - 5));
    p.ponto(x, y - 2, COR.contorno);
    if (rnd() < 0.4) p.linha(x + 2, y - 1, x + 4, y - 2, COR.cobreEscuro);
  }
  p.px(1, h - 2, w - 2, 1, COR.sombraSucata);
}

/** Viga de metal fina usada como plataforma suspensa. */
export function desenharViga(p: Pincel, w: number, h: number): void {
  p.caixa(0, 0, w, h, COR.sucataClara);
  p.px(1, h - 2, w - 2, 1, COR.sucata);
  for (let x = 3; x < w - 2; x += 6) p.ponto(x, Math.floor(h / 2), COR.contorno);
}

/** Cano horizontal com anéis de junção; o vão embaixo dele é a passagem abaixada. */
export function desenharCano(p: Pincel, w: number, h: number): void {
  p.px(0, 0, w, h, COR.contorno);
  p.px(0, 1, w, h - 2, COR.sucata);
  p.px(0, 2, w, 1, COR.sucataClara);
  p.px(0, h - 3, w, 1, COR.sombraSucata);
  for (let x = 4; x < w - 3; x += 14) {
    p.px(x, 0, 3, h, COR.contorno);
    p.px(x + 1, 1, 1, h - 2, COR.cobreEscuro);
  }
}

/** Muralha de entulho que vai do cano até o alto da tela (impede pular por cima). */
export function desenharMuralha(p: Pincel, w: number, h: number, rnd: () => number): void {
  p.px(0, 0, w, h, COR.sombraSucata);
  for (let i = 0; i < (w * h) / 40; i++) {
    const x = Math.floor(rnd() * (w - 4));
    const y = Math.floor(rnd() * (h - 3));
    const r = rnd();
    if (r < 0.45) p.caixa(x, y, 5 + Math.floor(rnd() * 5), 3 + Math.floor(rnd() * 3), COR.sucata);
    else if (r < 0.6) {
      p.px(x, y, 5, 2, COR.verdePlaca);
      p.ponto(x + 1, y, COR.cobre);
    } else if (r < 0.75) p.linha(x, y, x + 4, y + 2, COR.contorno);
    else p.ponto(x, y, COR.cobreEscuro);
  }
  p.px(0, 0, 1, h, COR.contorno);
  p.px(w - 1, 0, 1, h, COR.contorno);
}

/* =========================================================================
 * TEXTURAS COMUNS
 * ========================================================================= */

/** Brilho de neon em pixel art: discos concêntricos pontilhados (usar com tinta e blend ADD). */
function desenharBrilho(p: Pincel, r: number): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      const densidade = (1 - d) * (1 - d) * 1.4;
      if (densidade > bayer(x + r, y + r)) p.ponto(x + r, y + r, COR.luz);
    }
  }
}

/**
 * Texturas comuns a todas as áreas: engrenagem, placa de circuito, fios de cobre, poeira,
 * brilho neon e terminal do ponto de exercício.
 */
export function gerarTexturasLixao(cena: Phaser.Scene): void {
  // Engrenagem enferrujada meio enterrada
  texturaPixel(cena, 'lx-engrenagem', 15, 15, (p) => {
    p.disco(7, 7, 6, COR.contorno);
    for (const [x, y] of [
      [6, 0],
      [6, 13],
      [0, 6],
      [13, 6],
      [2, 2],
      [11, 2],
      [2, 11],
      [11, 11],
    ]) p.px(x, y, 2, 2, COR.contorno);
    p.disco(7, 7, 5, COR.cobreEscuro);
    for (const [x, y] of [
      [7, 1],
      [1, 7],
      [3, 3],
    ]) p.ponto(x, y, COR.cobreEscuro);
    p.px(4, 4, 2, 1, COR.cobre);
    p.disco(7, 7, 2, COR.sucata);
    p.ponto(7, 7, COR.contorno);
  });

  // Placa de circuito caída, com chip e trilhas
  texturaPixel(cena, 'lx-placa', 16, 9, (p) => {
    p.px(0, 1, 16, 8, COR.contorno);
    p.px(1, 1, 14, 7, COR.verdePlaca);
    p.px(1, 1, 14, 1, COR.verdePlacaClaro);
    p.linha(2, 3, 5, 3, COR.cobre);
    p.linha(5, 3, 7, 5, COR.cobre);
    p.linha(2, 6, 10, 6, COR.cobre);
    p.px(9, 2, 4, 3, COR.contorno);
    p.ponto(13, 6, COR.cobreClaro);
    p.ponto(3, 6, COR.cobreClaro);
  });

  // Cabo grosso saindo do chão com fios de cobre desencapados na ponta
  texturaPixel(cena, 'lx-fios', 20, 11, (p) => {
    p.sprite(
      [
        '...............c..c.',
        '.............C.c.c..',
        '..........C.c.ccc...',
        '.........C..cc.ccC..',
        '.....XXX.....cc..c..',
        '....XXXXX..XXc......',
        '...XXHHXXXXXX.......',
        '..XXH...XXXX........',
        '.XXH................',
        'XXH.................',
        'XH..................',
      ],
      { X: COR.contorno, H: COR.sombraSucata, c: COR.cobre, C: COR.cobreClaro },
      0,
      0
    );
  });

  texturaPixel(cena, 'lx-poeira', 1, 1, (p) => p.ponto(0, 0, COR.luz));

  texturaPixel(cena, 'lx-brilho', 25, 25, (p) => desenharBrilho(p, 12));

  // Ponto de exercício: terminal velho com tela ciano e LED ciano (quadro 0 aceso, 1 apagado)
  folhaPixel(cena, 'lx-terminal', 16, 24, 2, (p, q) => {
    // Pé e base
    p.px(6, 16, 4, 6, COR.contorno);
    p.px(7, 16, 2, 6, COR.sucata);
    p.caixa(2, 21, 12, 3, COR.sucata);
    // Gabinete
    p.caixa(0, 2, 16, 15, COR.sucataClara);
    p.px(1, 15, 14, 1, COR.sucata);
    // Tela com prompt
    p.px(2, 4, 12, 9, COR.contorno);
    p.px(3, 5, 10, 7, COR.neonCianoEscuro);
    p.px(4, 6, 2, 1, COR.neonCiano);
    p.px(7, 6, 4, 1, COR.neonCiano);
    p.px(4, 8, 5, 1, COR.neonCiano);
    p.px(4, 10, 1, 1, COR.neonCiano);
    if (q === 0) p.px(5, 10, 2, 1, COR.neonCiano);
    // Antena com LED
    p.px(12, 0, 1, 2, COR.contorno);
    p.px(11, 0, 3, 1, q === 0 ? COR.neonCiano : COR.neonCianoEscuro);
    // Teclas
    p.px(3, 14, 2, 1, COR.sombraSucata);
    p.px(6, 14, 2, 1, COR.sombraSucata);
    p.px(9, 14, 2, 1, COR.sombraSucata);
  });
}
