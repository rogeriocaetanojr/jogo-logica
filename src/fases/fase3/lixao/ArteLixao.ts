import Phaser from 'phaser';

/**
 * Base de arte do Lixão Eletrônico: paleta própria da fase e pincel de pixel art
 * (desenho em canvas na resolução 320x180 e exibição em 4x).
 */

/** Cada pixel de arte vira um bloco de 4x4 pixels na tela (320x180 -> 1280x720). */
export const ESCALA = 4;

/**
 * Paleta da Fase 3, na linha do docs/GUIA_DE_DESIGN.md: cenário quente e escuro (concreto,
 * fuligem, céu queimado) contra informação de jogo em ciano e amarelo. Verde de placa, cobre e
 * ciano são as marcas da fase (ver docs/fase3/PLANO_FASE3.md, "Paleta"). Nenhuma cor da fase fica fora
 * deste objeto. Ciano só no que é interativo; vermelho só no que é perigo.
 */
export const COR = {
  // Lixo eletrônico: placas de circuito
  verdePlaca: '#3A7A47',
  verdePlacaClaro: '#62A86A',
  verdePlacaEscuro: '#2A3A2A',
  // Lixo eletrônico: fios e trilhas de cobre
  cobre: '#C8722E',
  cobreClaro: '#F0A050',
  cobreEscuro: '#8A4520',
  // Sucata (metal, carcaças, chão)
  sucataClara: '#9A8A72',
  sucata: '#6E5E4C',
  sombraSucata: '#463A30',
  contorno: '#1A1210',
  // Céu de poeira (trechos de sol e névoa)
  ceuPoeiraClaro: '#F2C27A',
  ceuPoeira: '#DE7A34',
  horizonte: '#B8502A',
  horizonteEscuro: '#7E2E28',
  // Chuva e noite (trechos 3 e 4)
  chuvaAzulClaro: '#4A5A7A',
  chuvaAzul: '#2B3550',
  noiteRoxo: '#3A2440',
  noiteRoxoEscuro: '#1E1420',
  /*
   * Céus em 8 faixas de "ferrugem tóxica", do marrom quase preto no topo à brasa perto do
   * horizonte, com a técnica de degradê da Fase 2. Sol em brasa, névoa em smog oliva,
   * chuva em ferrugem fria e noite com brasas apagadas. O laranja é complementar ao ciano
   * interativo, que salta à frente.
   */
  ceuSol1: '#1E120E',
  ceuSol2: '#2A1812',
  ceuSol3: '#3C2016',
  ceuSol4: '#53291A',
  ceuSol5: '#6E331C',
  ceuSol6: '#8E401E',
  ceuSol7: '#B45422',
  ceuSol8: '#E08A3A',
  ceuNevoa1: '#1C1810',
  ceuNevoa2: '#272014',
  ceuNevoa3: '#352A18',
  ceuNevoa4: '#45351C',
  ceuNevoa5: '#574220',
  ceuNevoa6: '#6C5226',
  ceuNevoa7: '#86682E',
  ceuNevoa8: '#A8863C',
  ceuChuva1: '#120E0E',
  ceuChuva2: '#1A1414',
  ceuChuva3: '#241A18',
  ceuChuva4: '#2E201C',
  ceuChuva5: '#3A2820',
  ceuChuva6: '#483024',
  ceuChuva7: '#583A28',
  ceuChuva8: '#6C462E',
  ceuNoite1: '#0A0706',
  ceuNoite2: '#100B09',
  ceuNoite3: '#170F0C',
  ceuNoite4: '#1F140F',
  ceuNoite5: '#281912',
  ceuNoite6: '#331F15',
  ceuNoite7: '#40261A',
  ceuNoite8: '#4E2E1E',
  // Tintas que esfriam o cenário conforme o clima (multiplicam as cores desenhadas)
  tintaPo: '#F0E0B0',
  tintaChuva: '#C4C6C8',
  tintaNoite: '#B89480',
  /*
   * Fundo (camadas de parallax): silhuetas de ferrugem mais escuras que o céu, sem verde nem cobre, para as plataformas cinza e os perigos saltarem à frente, para não se
   * confundir com as plataformas. As peças são desenhadas em 3 valores neutros e tingidas
   * pela cor do clima: Longe (cidade, mais clara e perto do céu), Meio (horizonte e
   * máquinas) e Perto (pilhas).
   */
  fundoValorClaro: '#FFFFFF',
  fundoValorMedio: '#D2D2D2',
  fundoValorEscuro: '#8C8C8C',
  /** Contornos e frestas do fundo: dão nitidez às silhuetas. */
  fundoValorContorno: '#4C4C4C',
  // Sol: ferrugem queimada
  fundoSolLonge: '#8A5A3A',
  fundoSolMeio: '#5E3A26',
  fundoSolPerto: '#3A2418',
  // Névoa: oliva de smog
  fundoNevoaLonge: '#7A6440',
  fundoNevoaMeio: '#56462E',
  fundoNevoaPerto: '#382E1E',
  // Chuva: ferrugem molhada
  fundoChuvaLonge: '#5A4234',
  fundoChuvaMeio: '#3E2E24',
  fundoChuvaPerto: '#2A1E18',
  // Noite: brasa apagada
  fundoNoiteLonge: '#4A2E20',
  fundoNoiteMeio: '#331F16',
  fundoNoitePerto: '#22140E',
  /** Janelas acesas e LEDs do fundo: amarelo quente (nunca interativos). */
  janela: '#F7C948',
  /** Letreiros neon quebrados do fundo: magenta, para não confundir com o ciano interativo. */
  neonRosa: '#E85FD2',
  neonRosaEscuro: '#9C4A8E',
  /** Chorume e fumaça tóxica: verde ácido de destaque do cenário (nunca interativo). */
  chorume: '#9ACD32',
  chorumeEscuro: '#5E7A1E',
  // Terra preta do chão do lixão
  terra: '#3A2A1E',
  terraEscura: '#24180F',
  /**
   * Musgo: tudo onde se pisa no puzzle (vigas, degraus, blocos, esteiras, frágeis, guindastes,
   * elevadores e pontes), para destacar do chão e do fundo cor de ferrugem.
   */
  musgoClaro: '#9DB85A',
  musgo: '#647E32',
  musgoEscuro: '#3C5020',
  // Interativo e perigo
  neonCiano: '#4FD8E8',
  neonCianoEscuro: '#2FA4A8',
  perigo: '#FF4A3A',
  // Baterias da HUD (a última fase da carga usa o vermelho de perigo)
  bateriaVerde: '#5CCB5A',
  bateriaAmarela: '#F2C230',
  /** Branco neutro: base de partículas e brilhos que recebem tinta. */
  luz: '#FFFFFF',
} as const;

export type CorLixao = (typeof COR)[keyof typeof COR];

/** Faixas de céu de cada clima, do topo ao horizonte (ver tema.ceu em cada trecho). */
export const CEU = {
  sol: [COR.ceuSol1, COR.ceuSol2, COR.ceuSol3, COR.ceuSol4, COR.ceuSol5, COR.ceuSol6, COR.ceuSol7, COR.ceuSol8],
  nevoa: [COR.ceuNevoa1, COR.ceuNevoa2, COR.ceuNevoa3, COR.ceuNevoa4, COR.ceuNevoa5, COR.ceuNevoa6, COR.ceuNevoa7, COR.ceuNevoa8],
  chuva: [COR.ceuChuva1, COR.ceuChuva2, COR.ceuChuva3, COR.ceuChuva4, COR.ceuChuva5, COR.ceuChuva6, COR.ceuChuva7, COR.ceuChuva8],
  noite: [COR.ceuNoite1, COR.ceuNoite2, COR.ceuNoite3, COR.ceuNoite4, COR.ceuNoite5, COR.ceuNoite6, COR.ceuNoite7, COR.ceuNoite8],
} as const;

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

  /**
   * Faixas horizontais de cor, do topo para baixo, com pontilhado de Bayer só na borda de
   * cada faixa (como os céus da Fase 2). `curva` > 1 deixa as faixas escuras de cima mais largas.
   */
  degradePontilhado(x: number, y: number, w: number, h: number, cores: readonly string[], curva = 1.2): void {
    const pal = cores.map(hexRgb);
    for (let yy = 0; yy < h; yy++) {
      const f = Math.pow(yy / Math.max(1, h - 1), curva) * (pal.length - 1);
      const i = Math.min(pal.length - 2, Math.floor(f));
      const fr = Math.max(0, (f - i - 0.55) / 0.45);
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

/** Altura máxima do relevo de entulho acima da linha de colisão, em pixels de arte. */
export const BORDA_CHAO = 5;

/** Objeto meio enterrado no corte do chão, desenhado com o topo em (x, y). */
function enterrado(p: Pincel, x: number, y: number, rnd: () => number): void {
  const r = rnd();
  if (r < 0.18) {
    // Monitor de lado
    p.caixa(x, y, 9, 7, COR.sucata);
    p.px(x + 2, y + 2, 4, 3, COR.contorno);
  } else if (r < 0.32) {
    // Pneu
    p.disco(x + 4, y + 4, 4, COR.contorno);
    p.disco(x + 4, y + 4, 2, COR.terraEscura);
  } else if (r < 0.46) {
    // Garrafa deitada
    p.px(x, y + 1, 6, 3, COR.sombraSucata);
    p.px(x + 6, y + 2, 2, 1, COR.sombraSucata);
    p.ponto(x + 1, y + 1, COR.sucataClara);
  } else if (r < 0.6) {
    // Placa de circuito
    p.px(x, y, 8, 3, COR.verdePlacaEscuro);
    p.linha(x + 1, y + 1, x + 6, y + 1, COR.cobreEscuro);
  } else if (r < 0.72) {
    // Gabinete amassado
    p.caixa(x, y, 6, 8, COR.sombraSucata);
    p.px(x + 1, y + 2, 4, 1, COR.sucata);
  } else if (r < 0.84) {
    // Cabo serpenteando
    p.linha(x, y + 2, x + 3, y, COR.contorno);
    p.linha(x + 3, y, x + 7, y + 3, COR.contorno);
    p.ponto(x + 8, y + 3, COR.cobre);
  } else {
    // Lata enferrujada esmagada
    p.px(x, y + 1, 4, 3, COR.cobreEscuro);
    p.ponto(x + 1, y + 1, COR.cobre);
  }
}

/**
 * Chão do lixão: terra preta com lixo enterrado no corte, crosta de cascalho e sucata no
 * topo, relevo de entulho de até BORDA_CHAO pixels acima da colisão (y = BORDA_CHAO) com
 * pontas de objetos saindo, e chorume verde escorrendo da crosta.
 */
export function desenharChao(p: Pincel, w: number, h: number, rnd: () => number): void {
  const linha = BORDA_CHAO;
  // Terra: preta, escurecendo para baixo com pontilhado
  p.px(0, linha, w, h - linha, COR.terra);
  for (let y = linha + 8; y < h; y++) {
    const f = (y - linha - 8) / Math.max(1, h - linha - 10);
    for (let x = 0; x < w; x++) if (f > bayer(x, y)) p.ponto(x, y, COR.terraEscura);
  }
  p.px(0, h - 2, w, 2, COR.contorno);

  // Relevo do topo: caminhada aleatória suavizada entre 0 e BORDA_CHAO
  const topos: number[] = [];
  let elev = 1;
  let alvo = 1;
  for (let x = 0; x < w; x++) {
    if (rnd() < 0.08) alvo = Math.floor(rnd() * (BORDA_CHAO + 1));
    if (rnd() < 0.5) elev += Math.sign(alvo - elev);
    topos.push(linha - elev);
  }
  // Crosta de cascalho e sucata do topo até 3 px abaixo da colisão
  for (let x = 0; x < w; x++) {
    const topo = topos[x];
    p.px(x, topo, 1, linha + 3 - topo, COR.sombraSucata);
    p.ponto(x, topo, rnd() < 0.6 ? COR.sucataClara : COR.sucata);
    for (let y = topo + 1; y < linha + 3; y++) {
      const r = rnd();
      if (r < 0.25) p.ponto(x, y, COR.sucata);
      else if (r < 0.32) p.ponto(x, y, COR.contorno);
    }
  }
  // Pontas de objetos saindo dos picos do relevo
  for (let x = 2 + Math.floor(rnd() * 10); x < w - 6; x += 10 + Math.floor(rnd() * 22)) {
    const topo = topos[x];
    const r = rnd();
    if (r < 0.3) {
      p.px(x, topo - 2, 6, 2, COR.sucataClara);
      p.ponto(x + 2, topo - 2, COR.sombraSucata);
    } else if (r < 0.55) {
      p.linha(x, topo, x + 2, topo - 3, COR.contorno);
      p.ponto(x + 3, topo - 4, COR.cobre);
    } else if (r < 0.75) {
      p.disco(x + 2, topo, 2, COR.contorno);
      p.ponto(x + 2, topo, COR.sombraSucata);
    } else {
      p.px(x, topo - 1, 4, 1, COR.verdePlaca);
      p.ponto(x + 1, topo - 1, COR.cobre);
    }
  }
  // Lixo enterrado no corte
  for (let x = Math.floor(rnd() * 12); x < w - 4; x += 12 + Math.floor(rnd() * 18)) {
    enterrado(p, x, linha + 4 + Math.floor(rnd() * Math.max(1, h - linha - 12)), rnd);
  }
  // Pedrinhas e cacos
  for (let i = 0; i < w / 3; i++) {
    const x = Math.floor(rnd() * w);
    const y = linha + 4 + Math.floor(rnd() * (h - linha - 6));
    p.ponto(x, y, rnd() < 0.5 ? COR.sombraSucata : rnd() < 0.5 ? COR.cobreEscuro : COR.contorno);
  }
  // Chorume escorrendo da crosta
  for (let x = Math.floor(rnd() * 30); x < w; x += 30 + Math.floor(rnd() * 50)) {
    const comp = 3 + Math.floor(rnd() * 7);
    p.px(x, linha + 2, 2, 1, COR.chorume);
    p.px(x, linha + 3, 1, comp, COR.chorumeEscuro);
    p.ponto(x, linha + 3, COR.chorume);
    p.ponto(x, linha + 3 + comp, COR.chorume);
  }
}

/* =========================================================================
 * OBSTÁCULOS SÓLIDOS
 * Desenhados no tamanho exato do corpo de colisão (em pixels de arte).
 * ========================================================================= */

/** Bloco de sucata prensada: chapas empilhadas com rebites e frestas. */
export function desenharBlocoSucata(p: Pincel, w: number, h: number, rnd: () => number): void {
  p.caixa(0, 0, w, h, COR.musgo);
  p.px(1, 1, w - 2, 1, COR.musgoClaro);
  for (let y = 4 + Math.floor(rnd() * 3); y < h - 2; y += 4 + Math.floor(rnd() * 3)) {
    p.px(1, y, w - 2, 1, COR.musgoEscuro);
    p.px(1, y + 1, w - 2, 1, COR.musgoClaro);
    const x = 2 + Math.floor(rnd() * (w - 5));
    p.ponto(x, y - 2, COR.contorno);
    if (rnd() < 0.4) p.linha(x + 2, y - 1, x + 4, y - 2, COR.cobreEscuro);
  }
  p.px(1, h - 2, w - 2, 1, COR.musgoEscuro);
}

/**
 * Fardo de sucata prensada (passagem do exercício 1): camadas de carcaças, placas e cobre
 * esmagados, presos por cintas musgo, com o topo musgo claro para ler como chão de pisar.
 */
export function desenharFardo(p: Pincel, w: number, h: number, rnd: () => number): void {
  p.caixa(0, 0, w, h, COR.sombraSucata);
  // Camadas esmagadas
  for (let y = 2; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; ) {
      const pedaco = 3 + Math.floor(rnd() * 6);
      const r = rnd();
      const cor = r < 0.35 ? COR.sucata : r < 0.55 ? COR.verdePlacaEscuro : r < 0.7 ? COR.cobreEscuro : r < 0.85 ? COR.sucataClara : COR.sombraSucata;
      p.px(x, y, Math.min(pedaco, w - 1 - x), 1, cor);
      if (rnd() < 0.15) p.ponto(x + 1, y + 1, COR.cobre);
      x += pedaco;
    }
  }
  // Topo de pisar e cintas
  p.px(0, 0, w, 2, COR.musgoClaro);
  p.px(0, 1, w, 1, COR.musgo);
  for (let x = 4; x < w - 2; x += 10) {
    p.px(x, 0, 2, h, COR.musgo);
    p.ponto(x, 1, COR.musgoClaro);
  }
  p.px(0, h - 1, w, 1, COR.contorno);
}

/**
 * Piso de sacos de lixo amarrados, lado a lado e meio esmagados (pisos rentes ao chão).
 * Cada saco tem contorno arredondado, brilho de plástico e o nó em cima.
 */
export function desenharSacosLixo(p: Pincel, w: number, h: number, rnd: () => number): void {
  const cores = ['#2A2E2A', '#3A4A3A', '#2B3550', '#3A3030', '#4A4A40'];
  p.px(0, 1, w, h - 1, COR.contorno);
  for (let x = 0; x < w; ) {
    const largura = Math.min(6 + Math.floor(rnd() * 4), w - x);
    const cor = cores[Math.floor(rnd() * cores.length)];
    // Corpo arredondado: cantos de cima cortados
    p.px(x + 1, 1, largura - 2, h - 2, cor);
    p.px(x, 2, largura, h - 3, cor);
    p.px(x, 2, 1, h - 3, COR.contorno);
    // Brilho do plástico e dobra
    p.px(x + 1, 2, Math.max(1, Math.floor(largura / 3)), 1, COR.sucataClara);
    if (largura > 5) p.ponto(x + largura - 2, h - 2, COR.contorno);
    // Nó amarrado em cima
    const nx = x + Math.floor(largura / 2);
    p.ponto(nx, 0, COR.contorno);
    p.ponto(nx, 1, cor === '#4A4A40' ? COR.bateriaAmarela : COR.sucataClara);
    x += largura;
  }
  p.px(0, h - 1, w, 1, COR.contorno);
}

/**
 * Degrau de lixo eletrônico empilhado: monitores de tubo, gabinetes, teclados e placas,
 * camada por camada, com o topo plano para pisar.
 */
export function desenharPilhaEletronicos(p: Pincel, w: number, h: number, rnd: () => number): void {
  p.px(0, 0, w, h, COR.contorno);
  let y = 1;
  while (y < h - 1) {
    const tipo = Math.floor(rnd() * 4);
    const alt = Math.min(h - 1 - y, tipo === 2 ? 3 : tipo === 3 ? 2 : 5 + Math.floor(rnd() * 3));
    let x = 1;
    while (x < w - 1) {
      const larg = Math.min(w - 1 - x, tipo === 2 ? 7 + Math.floor(rnd() * 5) : 5 + Math.floor(rnd() * 5));
      if (larg < 2 || alt < 2) break;
      if (tipo === 0) {
        // Monitor de tubo: carcaça bege e tela escura com brilho
        p.px(x, y, larg - 1, alt, COR.sucataClara);
        if (larg > 3 && alt > 3) {
          p.px(x + 1, y + 1, larg - 3, alt - 2, COR.verdePlacaEscuro);
          p.ponto(x + 1, y + 1, COR.neonCianoEscuro);
        }
      } else if (tipo === 1) {
        // Gabinete: chapa cinza com baias e led
        p.px(x, y, larg - 1, alt, COR.sucata);
        p.px(x + 1, y + 1, larg - 3, 1, COR.sombraSucata);
        if (alt > 3) p.px(x + 1, y + 3, larg - 3, 1, COR.sombraSucata);
        p.ponto(x + larg - 3, y + alt - 2, rnd() < 0.5 ? COR.bateriaVerde : COR.perigo);
      } else if (tipo === 2) {
        // Teclado: base escura com teclas
        p.px(x, y, larg - 1, alt, COR.sombraSucata);
        for (let k = x + 1; k < x + larg - 2; k += 2) p.ponto(k, y + 1, COR.sucataClara);
      } else {
        // Placa de circuito verde com trilhas de cobre
        p.px(x, y, larg - 1, alt, COR.verdePlaca);
        p.px(x + 1, y, Math.max(1, larg - 4), 1, COR.cobre);
        p.ponto(x + 1, y + alt - 1, COR.contorno);
      }
      x += larg;
    }
    y += alt;
  }
  // Topo de pisar: tampa de gabinete amassada
  p.px(0, 0, w, 2, COR.contorno);
  p.px(1, 0, w - 2, 1, COR.sucataClara);
}

/** Viga de metal fina usada como plataforma suspensa. */
export function desenharViga(p: Pincel, w: number, h: number): void {
  p.caixa(0, 0, w, h, COR.musgoClaro);
  p.px(1, h - 2, w - 2, 1, COR.musgo);
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

/** Portão de grade de sucata que vai do chão ao alto da tela; sobe quando o exercício é resolvido. */
export function desenharPortao(p: Pincel, w: number, h: number): void {
  p.px(0, 0, w, h, COR.contorno);
  for (let x = 2; x < w - 2; x += 4) {
    p.px(x, 0, 2, h, COR.sucata);
    p.px(x, 0, 1, h, COR.sucataClara);
  }
  // Travessas enferrujadas com rebites
  for (let y = 6; y < h - 4; y += 24) {
    p.caixa(0, y, w, 4, COR.cobreEscuro);
    for (let x = 3; x < w - 2; x += 5) p.ponto(x, y + 1, COR.cobre);
  }
  p.px(0, h - 2, w, 2, COR.sombraSucata);
}

/** Altura dos espinhos no topo de uma barreira, em pixels de arte. */
export const ESPINHOS_BARREIRA = 10;

/**
 * Barreira baixa (no máximo 3 blocos) com espinhos de perigo no topo: portão de grade ou
 * andaime vazado de sucata, com o fundo aparecendo pelos vãos. Os espinhos impedem pular por cima.
 */
export function desenharBarreira(p: Pincel, w: number, h: number, tipo: 'portao' | 'andaime'): void {
  const e = ESPINHOS_BARREIRA;
  // Espinhos: base de sucata e pontas de perigo
  p.px(0, e - 2, w, 2, COR.contorno);
  for (let x = 0; x < w; x += 4) {
    p.px(x + 1, 4, 2, e - 6, COR.sucataClara);
    p.px(x + 1, 1, 2, 3, COR.perigo);
    p.ponto(x + 1, 0, COR.perigo);
  }
  if (tipo === 'portao') {
    // Grade: barras verticais com travessas, vãos transparentes
    for (let x = 1; x < w - 1; x += 4) {
      p.px(x, e, 2, h - e, COR.contorno);
      p.px(x, e, 1, h - e, COR.sucataClara);
    }
    for (let y = e + 4; y < h - 2; y += 12) {
      p.caixa(0, y, w, 3, COR.cobreEscuro);
      for (let x = 2; x < w - 1; x += 5) p.ponto(x, y + 1, COR.cobre);
    }
    p.px(0, h - 2, w, 2, COR.sombraSucata);
    return;
  }
  // Andaime: moldura, travessas e diagonais; o resto é vazado
  p.px(0, e, 2, h - e, COR.sombraSucata);
  p.px(w - 2, e, 2, h - e, COR.sombraSucata);
  for (let y = e; y < h - 1; y += 10) p.px(0, y, w, 2, COR.sucata);
  for (let y = e; y + 10 <= h; y += 10) {
    p.linha(2, y + 2, w - 3, y + 9, COR.sucataClara);
    p.linha(w - 3, y + 2, 2, y + 9, COR.sombraSucata);
  }
  p.px(0, h - 2, w, 2, COR.sucata);
}

/** Fosso sem fundo entre trechos de chão: paredes de sucata descendo para o escuro. */
export function desenharFosso(p: Pincel, w: number, h: number, rnd: () => number): void {
  p.px(0, 0, w, h, COR.contorno);
  p.px(0, 0, 2, Math.floor(h * 0.6), COR.sombraSucata);
  p.px(w - 2, 0, 2, Math.floor(h * 0.6), COR.sombraSucata);
  // Cabos pendurados na boca do fosso
  for (let x = 3 + Math.floor(rnd() * 4); x < w - 3; x += 5 + Math.floor(rnd() * 6)) {
    const comprimento = 2 + Math.floor(rnd() * (h / 2));
    p.linha(x, 0, x + (rnd() < 0.5 ? 1 : -1), comprimento, rnd() < 0.5 ? COR.cobreEscuro : COR.sombraSucata);
  }
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
 * Texturas comuns a todos os trechos: engrenagem, placa de circuito, fios de cobre, poeira,
 * brilho neon e terminal do ponto de exercício.
 */
export function gerarTexturasLixao(cena: Phaser.Scene): void {
  gerarTexturasEntulho(cena);
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

  // Espinho de sucata (perigo de teste): pontas de metal com ponta vermelha
  texturaPixel(cena, 'lx-espinho', 16, 7, (p) => {
    p.px(0, 5, 16, 2, COR.contorno);
    for (let x = 0; x < 16; x += 4) {
      p.px(x + 1, 3, 2, 2, COR.sucataClara);
      p.px(x + 1, 1, 2, 2, COR.perigo);
      p.ponto(x + 1, 0, COR.perigo);
    }
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

/* =========================================================================
 * ENTULHO DE CHÃO
 * Sucata decorativa espalhada densa pelo chão, atrás do jogador e dos recicláveis. Cores
 * mais apagadas que a munição (nada de lata ou bateria, que são recicláveis) para não
 * confundir o que é decoração com o que é coletável.
 * ========================================================================= */

/** Chaves das texturas de entulho, sorteadas pelo TrechoLixao. */
export const ENTULHO = [
  'lx-ent-crt',
  'lx-ent-tv',
  'lx-ent-teclado',
  'lx-ent-gabinete',
  'lx-ent-saco',
  'lx-ent-pneu',
  'lx-ent-hd',
  'lx-ent-ventoinha',
  'lx-ent-cabos',
  'lx-ent-impressora',
  'lx-ent-monte-0',
  'lx-ent-monte-1',
  'lx-ent-monte-2',
] as const;

/** Meia largura de cada entulho em px de mundo (para não cair na beira de buraco). */
export const MEIA_LARGURA_ENTULHO = 40;

export function gerarTexturasEntulho(cena: Phaser.Scene): void {
  // Monitor CRT caído de lado, tela rachada
  texturaPixel(cena, 'lx-ent-crt', 15, 12, (p) => {
    p.caixa(0, 1, 14, 11, COR.sucata);
    p.px(2, 3, 9, 7, COR.contorno);
    p.px(3, 4, 7, 5, COR.sombraSucata);
    p.linha(4, 4, 7, 8, COR.sucata);
    p.linha(7, 6, 9, 5, COR.sucata);
    p.px(12, 3, 3, 8, COR.sombraSucata);
    p.px(1, 2, 12, 1, COR.sucataClara);
  });
  // TV velha com antena torta
  texturaPixel(cena, 'lx-ent-tv', 16, 15, (p) => {
    p.linha(5, 4, 2, 0, COR.contorno);
    p.linha(9, 4, 13, 1, COR.contorno);
    p.caixa(0, 4, 16, 11, COR.cobreEscuro);
    p.px(2, 6, 9, 7, COR.contorno);
    p.px(3, 7, 7, 5, COR.sombraSucata);
    p.ponto(4, 8, COR.sucata);
    p.disco(13, 8, 1, COR.sucata);
    p.ponto(13, 11, COR.sucata);
  });
  // Teclado partido com teclas faltando
  texturaPixel(cena, 'lx-ent-teclado', 18, 5, (p) => {
    p.caixa(0, 1, 11, 4, COR.sucata);
    p.caixa(10, 2, 8, 3, COR.sucata);
    for (let x = 1; x < 17; x += 2) if (x % 5 !== 0) p.ponto(x, x < 10 ? 2 : 3, COR.sombraSucata);
    p.ponto(10, 1, COR.contorno);
  });
  // Gabinete aberto com placa verde exposta
  texturaPixel(cena, 'lx-ent-gabinete', 10, 15, (p) => {
    p.caixa(0, 0, 10, 15, COR.sombraSucata);
    p.px(1, 1, 8, 1, COR.sucata);
    p.px(2, 3, 6, 9, COR.verdePlacaEscuro);
    p.px(3, 4, 3, 2, COR.contorno);
    p.linha(3, 8, 7, 8, COR.cobreEscuro);
    p.linha(7, 9, 9, 13, COR.cobreEscuro);
  });
  // Saco de lixo preto amarrado
  texturaPixel(cena, 'lx-ent-saco', 13, 11, (p) => {
    p.disco(6, 6, 5, COR.contorno);
    p.px(1, 7, 11, 4, COR.contorno);
    p.px(5, 0, 3, 2, COR.contorno);
    p.ponto(4, 1, COR.contorno);
    p.ponto(8, 1, COR.contorno);
    p.linha(3, 4, 4, 3, COR.sombraSucata);
    p.linha(8, 5, 9, 7, COR.sombraSucata);
  });
  // Pneu meio enterrado
  texturaPixel(cena, 'lx-ent-pneu', 15, 8, (p) => {
    p.disco(7, 8, 7, COR.contorno);
    p.disco(7, 8, 4, COR.sombraSucata);
    p.disco(7, 8, 2, COR.contorno);
    for (let a = 0; a < 6; a++) {
      const ang = Math.PI + (a / 5) * Math.PI;
      p.ponto(7 + Math.round(Math.cos(ang) * 6), 8 + Math.round(Math.sin(ang) * 6), COR.sombraSucata);
    }
  });
  // HD aberto mostrando o disco
  texturaPixel(cena, 'lx-ent-hd', 9, 6, (p) => {
    p.caixa(0, 0, 9, 6, COR.sucata);
    p.disco(4, 3, 2, COR.sucataClara);
    p.ponto(4, 3, COR.contorno);
    p.linha(6, 1, 5, 3, COR.contorno);
  });
  // Ventoinha torta
  texturaPixel(cena, 'lx-ent-ventoinha', 8, 8, (p) => {
    p.caixa(0, 0, 8, 8, COR.sombraSucata);
    p.linha(1, 1, 6, 6, COR.sucata);
    p.linha(6, 1, 1, 6, COR.sucata);
    p.ponto(3, 3, COR.contorno);
  });
  // Emaranhado de cabos com pontas de cobre
  texturaPixel(cena, 'lx-ent-cabos', 20, 7, (p) => {
    p.linha(0, 6, 4, 3, COR.contorno);
    p.linha(4, 3, 8, 6, COR.contorno);
    p.linha(6, 6, 11, 2, COR.contorno);
    p.linha(11, 2, 15, 6, COR.contorno);
    p.linha(13, 6, 18, 3, COR.sombraSucata);
    p.linha(3, 6, 9, 4, COR.sombraSucata);
    p.ponto(19, 2, COR.cobre);
    p.ponto(18, 1, COR.cobreEscuro);
    p.ponto(11, 1, COR.cobreEscuro);
  });
  // Impressora esmagada com papel saindo
  texturaPixel(cena, 'lx-ent-impressora', 17, 9, (p) => {
    p.px(4, 0, 7, 3, COR.sucataClara);
    p.ponto(5, 1, COR.sombraSucata);
    p.caixa(0, 2, 17, 7, COR.sucata);
    p.px(2, 4, 13, 1, COR.contorno);
    p.px(1, 3, 15, 1, COR.sucataClara);
    p.ponto(14, 6, COR.cobreEscuro);
  });
  // Montinhos mistos de sucata
  (['monitores', 'placas', 'cabos'] as const).forEach((tipo, i) => {
    texturaPixel(cena, `lx-ent-monte-${i}`, 30, 16, (p) => desenharPilha(p, tipo, 15, 15, 28, 13, aleatorio(900 + i)));
  });
}
