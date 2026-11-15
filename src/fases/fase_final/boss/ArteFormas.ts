import { COR, type Pincel, bayer, misturar, sombrear } from '../ArteFaseFinal';

/**
 * Pixel art das formas 2 a 4 do Mega Brain (Titã, Águia, Caveira) e dos braços da Caveira.
 * Desenhado à mão em código, com sombreamento por placas, pontilhado e brilhos.
 * Todos os desenhos olham para a ESQUERDA; o sprite espelha para virar.
 */

type P2 = readonly [number, number];

/* =========================================================================
 * FERRAMENTAS DE DESENHO
 * ========================================================================= */

/** Polígono preenchido por varredura, sem suavização (pixels inteiros). */
export function poligono(p: Pincel, pts: readonly P2[], cor: string): void {
  const ys = pts.map((q) => q[1]);
  const y0 = Math.floor(Math.min(...ys));
  const y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.round(xs[k]);
      const xb = Math.round(xs[k + 1]);
      if (xb > xa) p.px(xa, y, xb - xa, 1, cor);
    }
  }
}

function deslocar(pts: readonly P2[], dx: number, dy: number): P2[] {
  return pts.map(([x, y]) => [x + dx, y + dy] as const);
}

/** Placa de armadura: contorno, luz em cima, sombra embaixo e pontilhado escurecendo. */
function placa(p: Pincel, x: number, y: number, w: number, h: number, base: string): void {
  const escuro = sombrear(base, 0.45);
  p.px(x, y, w, h, COR.contorno);
  for (let yy = 1; yy < h - 1; yy++) {
    const k = yy / Math.max(1, h - 2);
    for (let xx = 1; xx < w - 1; xx++) {
      p.ponto(x + xx, y + yy, k * 0.9 > bayer(x + xx, y + yy) + 0.35 ? sombrear(base, 0.25) : base);
    }
  }
  p.px(x + 1, y + 1, w - 2, 1, misturar(base, '#ffffff', 0.45));
  p.px(x + 1, y + h - 2, w - 2, 1, escuro);
}

/** Lâmina afinando da raiz até a ponta (penas de metal, lâminas de serra). */
function lamina(
  p: Pincel,
  raiz: P2,
  ponta: P2,
  largura: number,
  base: string,
  claro: string,
  escuro: string,
  ponteira?: string,
  faixa?: string
): void {
  const dx = ponta[0] - raiz[0];
  const dy = ponta[1] - raiz[1];
  const comp = Math.hypot(dx, dy) || 1;
  const nx = -dy / comp;
  const ny = dx / comp;
  const m = largura / 2;
  const a: P2 = [raiz[0] + nx * m, raiz[1] + ny * m];
  const b: P2 = [raiz[0] - nx * m, raiz[1] - ny * m];
  const meio: P2 = [raiz[0] + dx * 0.7 - nx * m * 0.7, raiz[1] + dy * 0.7 - ny * m * 0.7];
  const pts: P2[] = [a, [ponta[0] + nx * 0.6, ponta[1] + ny * 0.6], ponta, meio, b];
  poligono(p, pts, base);
  p.linha(a[0], a[1], ponta[0], ponta[1], claro);
  p.linha(b[0], b[1], meio[0], meio[1], escuro);
  p.linha(meio[0], meio[1], ponta[0], ponta[1], escuro);
  if (faixa) {
    const f = 0.55;
    p.linha(raiz[0] + dx * f + nx * m * 0.8, raiz[1] + dy * f + ny * m * 0.8, raiz[0] + dx * f - nx * m * 0.6, raiz[1] + dy * f - ny * m * 0.6, faixa);
    p.linha(raiz[0] + dx * (f + 0.04) + nx * m * 0.8, raiz[1] + dy * (f + 0.04) + ny * m * 0.8, raiz[0] + dx * (f + 0.04) - nx * m * 0.6, raiz[1] + dy * (f + 0.04) - ny * m * 0.6, faixa);
  }
  if (ponteira) {
    p.linha(raiz[0] + dx * 0.85, raiz[1] + dy * 0.85, ponta[0], ponta[1], ponteira);
  }
}

function rebite(p: Pincel, x: number, y: number): void {
  p.ponto(x, y, '#d8def5');
  p.ponto(x + 1, y + 1, '#2a2f48');
}

/* =========================================================================
 * FORMA 2: TITÃ — 80x92, 7 quadros
 * 0 parado, 1 preparo, 2 investida, 3 travado, 4 mira, 5 respirando, 6 investida (capa)
 * ========================================================================= */

const ARMADURA = { claro: '#b4bcdc', base: '#737ca3', escuro: '#454c6e', fundo: '#272c44' };
const CAPA = { claro: '#5d3794', base: '#3d2168', escuro: '#211139' };

export function desenharTita(p: Pincel, q: number): void {
  const agachado = q === 1 ? 6 : q === 3 ? 22 : q === 5 ? 1 : 0;
  const dy = agachado;
  const dx = q === 2 || q === 6 ? -4 : 0;
  const balanco = q === 5 ? 2 : q === 6 ? 5 : q === 2 ? 3 : 0;
  const olhoForte = q === 1 || q === 2 || q === 4 || q === 6;

  // Capa (atrás de tudo), com barra rasgada
  const capa: P2[] = [
    [14 + dx, 28 + dy],
    [66 + dx, 28 + dy],
    [70 + balanco * 2, 86],
    [64 + balanco, 82],
    [58 + balanco, 90],
    [50, 84],
    [42, 91],
    [34, 85],
    [26 - balanco, 90],
    [18 - balanco, 83],
    [10 + dx - balanco, 88],
  ];
  poligono(p, capa, CAPA.escuro);
  poligono(p, deslocar(capa.slice(0, 2).concat([[60 + balanco, 80], [22 - balanco, 80]]), 0, 1), CAPA.base);
  for (const x of [26, 36, 46, 56]) {
    for (let y = 40 + dy; y < 84; y++) if ((x + y) % 2 === 0) p.ponto(x + dx + Math.round(balanco * (y / 90)), y, CAPA.escuro);
    p.linha(x + 2 + dx, 42 + dy, x + 2 + balanco, 80, CAPA.claro);
  }

  // Pernas: coxa, joelheira, canela e bota
  const topoPerna = 62 + Math.round(dy * 0.6);
  for (const x of [23, 43]) {
    placa(p, x, topoPerna, 14, 12, ARMADURA.base);
    placa(p, x + 1, topoPerna + 11, 12, Math.max(6, 74 - topoPerna - 1 + 6), ARMADURA.escuro);
    p.disco(x + 7, topoPerna + 12, 4, COR.contorno);
    p.disco(x + 7, topoPerna + 12, 3, ARMADURA.claro);
    rebite(p, x + 6, topoPerna + 11);
    placa(p, x - 3, 84, 19, 8, ARMADURA.fundo);
    p.px(x - 2, 85, 6, 1, ARMADURA.claro);
  }

  // Tronco: peito em trapézio, peitorais, abdômen em gomos e reator
  const peito: P2[] = [
    [19 + dx, 29 + dy],
    [61 + dx, 29 + dy],
    [57 + dx, 63 + dy],
    [23 + dx, 63 + dy],
  ];
  poligono(p, peito, COR.contorno);
  poligono(p, deslocar(peito, 0, 0).map(([x, y], i) => [x + (i === 0 || i === 3 ? 1 : -1), y + (i < 2 ? 1 : -1)] as const), ARMADURA.base);
  placa(p, 22 + dx, 31 + dy, 17, 13, ARMADURA.claro);
  placa(p, 41 + dx, 31 + dy, 17, 13, ARMADURA.claro);
  for (let i = 0; i < 3; i++) placa(p, 27 + dx, 46 + dy + i * 5, 26, 6, ARMADURA.escuro);
  // Reator no peito
  p.disco(40 + dx, 39 + dy, 5, COR.contorno);
  p.disco(40 + dx, 39 + dy, 4, COR.cianoEscuro);
  p.disco(40 + dx, 39 + dy, 2, COR.ciano);
  p.ponto(39 + dx, 38 + dy, '#e8fdff');
  // Cinto com fivela e emblema
  p.px(21 + dx, 61 + dy, 38, 5, COR.contorno);
  p.px(22 + dx, 62 + dy, 36, 3, '#3b2b24');
  p.px(22 + dx, 62 + dy, 36, 1, '#5a4337');
  p.px(35 + dx, 60 + dy, 10, 7, COR.contorno);
  p.px(36 + dx, 61 + dy, 8, 5, COR.janelaQuente);
  p.px(38 + dx, 62 + dy, 4, 3, '#7a5a18');
  p.ponto(39 + dx, 63 + dy, COR.vermelho);

  // Ombreiras em camadas e braços com manopla
  for (const [cx, bx] of [
    [16, 5],
    [64, 63],
  ] as const) {
    const ox = cx + dx;
    p.elipse(ox, 33 + dy, 12, 9, COR.contorno);
    p.elipse(ox, 33 + dy, 11, 8, ARMADURA.escuro);
    p.elipse(ox, 32 + dy, 10, 6, ARMADURA.base);
    p.elipse(ox, 30 + dy, 8, 3, ARMADURA.claro);
    rebite(p, ox - 6, 34 + dy);
    rebite(p, ox + 5, 34 + dy);
    const avancado = (q === 2 || q === 6) && cx === 16;
    if (avancado) {
      // Investida: punho blindado para a frente
      placa(p, 0, 38 + dy, 16, 9, ARMADURA.escuro);
      placa(p, -1, 36 + dy, 9, 13, ARMADURA.claro);
      for (let y = 38; y < 48; y += 3) p.px(1, y + dy, 5, 1, ARMADURA.escuro);
    } else {
      placa(p, bx + dx, 39 + dy, 12, 14, ARMADURA.escuro);
      placa(p, bx - 1 + dx, 52 + dy, 14, 12, ARMADURA.base);
      for (let x = bx + 1; x < bx + 12; x += 3) p.px(x + dx, 62 + dy, 2, 2, ARMADURA.claro);
    }
  }

  // Capuz e máscara
  const capuz: P2[] = [
    [27 + dx, 7 + dy],
    [53 + dx, 7 + dy],
    [59 + dx, 20 + dy],
    [55 + dx, 31 + dy],
    [25 + dx, 31 + dy],
    [21 + dx, 20 + dy],
  ];
  poligono(p, capuz, COR.contorno);
  poligono(p, deslocar(capuz, 0, 0).map(([x, y]) => [x + (x < 40 ? 1 : -1), y + 1] as const), CAPA.base);
  p.linha(29 + dx, 9 + dy, 23 + dx, 20 + dy, CAPA.claro);
  const mascara: P2[] = [
    [32 + dx, 12 + dy],
    [48 + dx, 12 + dy],
    [49 + dx, 24 + dy],
    [44 + dx, 29 + dy],
    [36 + dx, 29 + dy],
    [31 + dx, 24 + dy],
  ];
  poligono(p, mascara, '#1a1d2e');
  poligono(p, mascara.map(([x, y]) => [x + (x < 40 ? 1 : -1), y + (y < 20 ? 1 : -1)] as const), ARMADURA.claro);
  p.px(39 + dx, 13 + dy, 2, 15, ARMADURA.base);
  for (const y of [24, 26]) p.px(35 + dx, y + dy, 10, 1, ARMADURA.escuro);
  p.px(33 + dx, 21 + dy, 3, 1, ARMADURA.escuro);
  p.px(44 + dx, 21 + dy, 3, 1, ARMADURA.escuro);
  // Olhos
  const olho = q === 3 ? COR.vermelhoEscuro : COR.vermelho;
  p.px(33 + dx, 17 + dy, 5, 2, '#05050c');
  p.px(42 + dx, 17 + dy, 5, 2, '#05050c');
  p.px(34 + dx, 17 + dy, 3, 2, olho);
  p.px(43 + dx, 17 + dy, 3, 2, olho);
  if (olhoForte) {
    p.ponto(34 + dx, 17 + dy, '#ffe0e4');
    p.ponto(43 + dx, 17 + dy, '#ffe0e4');
    p.px(30 + dx, 18 + dy, 3, 1, COR.vermelho);
  }

  // Canhão no ombro de trás: base, cano com cintas e boca
  placa(p, 50 + dx, 9 + dy, 17, 13, ARMADURA.escuro);
  p.px(27 + dx, 5 + dy, 28, 8, COR.contorno);
  p.px(28 + dx, 6 + dy, 26, 6, ARMADURA.base);
  p.px(28 + dx, 6 + dy, 26, 1, ARMADURA.claro);
  p.px(28 + dx, 11 + dy, 26, 1, ARMADURA.escuro);
  for (const x of [36, 44]) p.px(x + dx, 5 + dy, 2, 8, ARMADURA.fundo);
  p.disco(28 + dx, 9 + dy, 4, COR.contorno);
  p.disco(28 + dx, 9 + dy, 3, q === 4 ? COR.vermelho : COR.vermelhoEscuro);
  if (q === 4) {
    p.disco(28 + dx, 9 + dy, 1, '#ffe0e4');
    p.ponto(23 + dx, 9 + dy, COR.vermelho);
    p.ponto(28 + dx, 3 + dy, COR.vermelho);
  }
  p.px(57 + dx, 13 + dy, 5, 3, COR.vermelho);
}

/* =========================================================================
 * FORMA 3: ÁGUIA TECNOLÓGICA — 128x80, 7 quadros
 * 0-3 batida de asas, 4 grito, 5 rasante/mergulho (asas varridas), 6 presa no chão.
 * Lâminas de metal em leque, faixa vermelha, pescoço em anéis, bico e garras douradas.
 * ========================================================================= */

interface PoseAguia {
  asa: number;
  abertura: number;
  comprimento: number;
  dy: number;
  bicoAberto: boolean;
  garras: 'frente' | 'chao';
  cabecaBaixa?: boolean;
}

const POSES_AGUIA: readonly PoseAguia[] = [
  { asa: -100, abertura: 44, comprimento: 38, dy: 0, bicoAberto: false, garras: 'frente' },
  { asa: -50, abertura: 40, comprimento: 42, dy: 1, bicoAberto: false, garras: 'frente' },
  { asa: 36, abertura: 34, comprimento: 36, dy: 2, bicoAberto: false, garras: 'frente' },
  { asa: -12, abertura: 36, comprimento: 44, dy: 1, bicoAberto: false, garras: 'frente' },
  { asa: -112, abertura: 56, comprimento: 38, dy: 0, bicoAberto: true, garras: 'frente' },
  { asa: -3, abertura: 14, comprimento: 52, dy: 0, bicoAberto: true, garras: 'frente' },
  { asa: 128, abertura: 40, comprimento: 30, dy: 14, bicoAberto: true, garras: 'chao', cabecaBaixa: true },
];

const METAL_AGUIA = { claro: '#c3cae6', base: '#4f5677', escuro: '#262a40', fundo: '#171a2b' };
const OURO = { claro: '#ffe9a8', base: '#f2b53a', escuro: '#9a6a12' };

function asaAguia(p: Pincel, pose: PoseAguia, raiz: P2, desvio: number, longe: boolean): void {
  const n = 7;
  const base = longe ? sombrear(METAL_AGUIA.base, 0.35) : METAL_AGUIA.base;
  const claro = longe ? sombrear(METAL_AGUIA.claro, 0.35) : METAL_AGUIA.claro;
  const escuro = METAL_AGUIA.fundo;
  // Da lâmina de trás para a da frente (a da frente fica por cima)
  for (let i = n - 1; i >= 0; i--) {
    const k = i / (n - 1);
    const ang = ((pose.asa + desvio - pose.abertura / 2 + pose.abertura * k) * Math.PI) / 180;
    const comp = pose.comprimento * (1 - k * 0.38);
    const r: P2 = [raiz[0] + i * 2.2, raiz[1] + i * 0.6];
    const ponta: P2 = [r[0] + Math.cos(ang) * comp, r[1] + Math.sin(ang) * comp];
    lamina(p, r, ponta, 7 - k * 2, base, claro, escuro, i < 3 ? COR.magenta : undefined, longe ? undefined : COR.vermelho);
  }
  // Braço da asa (osso de metal) com rebites
  const angBraco = ((pose.asa + desvio - pose.abertura / 2) * Math.PI) / 180;
  const cotovelo: P2 = [raiz[0] + Math.cos(angBraco) * 12, raiz[1] + Math.sin(angBraco) * 12];
  p.linha(raiz[0], raiz[1], cotovelo[0], cotovelo[1], longe ? METAL_AGUIA.fundo : COR.contorno);
  p.linha(raiz[0], raiz[1] - 1, cotovelo[0], cotovelo[1] - 1, claro);
  p.disco(cotovelo[0], cotovelo[1], 2, longe ? METAL_AGUIA.escuro : METAL_AGUIA.base);
  p.ponto(cotovelo[0], cotovelo[1] - 1, claro);
}

export function desenharAguia(p: Pincel, q: number): void {
  const pose = POSES_AGUIA[q];
  const dy = pose.dy;
  const corpo: P2 = [66, 46 + dy];

  // Asa de longe (atrás do corpo)
  asaAguia(p, pose, [corpo[0] + 4, corpo[1] - 8], -14, true);

  // Cauda em leque de lâminas
  for (const [tx, ty] of [
    [118, 36],
    [123, 44],
    [119, 53],
  ] as const) {
    lamina(p, [80, corpo[1]], [tx, ty + dy], 6, METAL_AGUIA.base, METAL_AGUIA.claro, METAL_AGUIA.fundo, COR.magenta);
  }

  // Pernas e garras douradas
  const desenharGarra = (bx: number, by: number, chao: boolean) => {
    for (const [ox, oy] of chao
      ? [
          [-7, 4],
          [-2, 6],
          [4, 5],
        ]
      : [
          [-7, 2],
          [-5, 6],
          [-1, 7],
        ]) {
      p.linha(bx, by, bx + ox, by + oy, OURO.base);
      p.linha(bx + 1, by, bx + ox + 1, by + oy, OURO.escuro);
      p.ponto(bx + ox - Math.sign(ox || -1), by + oy + 1, OURO.claro);
    }
  };
  for (const [lx, alcance] of [
    [62, 0],
    [70, 3],
  ] as const) {
    const topo: P2 = [lx, corpo[1] + 6];
    const pe: P2 = pose.garras === 'chao' ? [lx - 2, 74] : [lx - 12 - alcance, corpo[1] + 16 + alcance];
    p.linha(topo[0], topo[1], pe[0], pe[1], COR.contorno);
    p.linha(topo[0] + 1, topo[1], pe[0] + 1, pe[1], METAL_AGUIA.escuro);
    // Anéis da perna
    for (let k = 0.25; k < 1; k += 0.25) {
      const ax = topo[0] + (pe[0] - topo[0]) * k;
      const ay = topo[1] + (pe[1] - topo[1]) * k;
      p.px(ax - 1, ay, 4, 2, METAL_AGUIA.base);
      p.ponto(ax, ay, METAL_AGUIA.claro);
    }
    desenharGarra(pe[0], pe[1], pose.garras === 'chao');
  }

  // Corpo blindado
  p.elipse(corpo[0], corpo[1], 19, 11, COR.contorno);
  p.elipse(corpo[0], corpo[1], 18, 10, METAL_AGUIA.escuro);
  p.elipse(corpo[0] - 2, corpo[1] - 2, 15, 7, METAL_AGUIA.base);
  for (let x = corpo[0] - 12; x < corpo[0] + 14; x += 5) {
    p.linha(x, corpo[1] - 7, x + 3, corpo[1] + 6, METAL_AGUIA.fundo);
    p.ponto(x + 1, corpo[1] - 6, METAL_AGUIA.claro);
  }
  p.px(corpo[0] - 12, corpo[1] - 9, 22, 1, METAL_AGUIA.claro);
  // Faixa ciano e luz vermelha no peito
  p.px(corpo[0] - 10, corpo[1] + 4, 20, 2, COR.cianoEscuro);
  p.px(corpo[0] - 8, corpo[1] + 4, 14, 1, COR.ciano);
  p.disco(corpo[0] - 14, corpo[1] + 1, 2, COR.vermelho);

  // Pescoço em anéis até a cabeça
  const cabeca: P2 = pose.cabecaBaixa ? [30, 62] : [30, 36 + dy];
  const anel = 4;
  for (let i = anel; i >= 1; i--) {
    const k = i / (anel + 1);
    const ax = corpo[0] - 16 + (cabeca[0] + 6 - (corpo[0] - 16)) * k;
    const ay = corpo[1] - 4 + (cabeca[1] + 2 - (corpo[1] - 4)) * k;
    p.disco(ax, ay, 6, COR.contorno);
    p.disco(ax, ay, 5, METAL_AGUIA.escuro);
    p.disco(ax - 1, ay - 1, 4, METAL_AGUIA.base);
    p.px(ax - 3, ay - 4, 4, 1, METAL_AGUIA.claro);
  }

  // Cabeça angulosa com crista varrida para trás
  const [hx, hy] = cabeca;
  for (const [cx, cy] of [
    [18, -12],
    [21, -7],
    [16, -16],
  ] as const) {
    lamina(p, [hx + 6, hy - 4], [hx + cx, hy + cy], 4, METAL_AGUIA.base, METAL_AGUIA.claro, METAL_AGUIA.fundo, COR.magenta);
  }
  const cranio: P2[] = [
    [hx - 6, hy - 6],
    [hx + 6, hy - 9],
    [hx + 12, hy - 3],
    [hx + 10, hy + 6],
    [hx - 2, hy + 7],
    [hx - 8, hy + 1],
  ];
  poligono(p, cranio, COR.contorno);
  poligono(p, cranio.map(([x, y]) => [x + (x < hx ? 1 : -1), y + (y < hy ? 1 : -1)] as const), METAL_AGUIA.base);
  p.linha(hx - 5, hy - 5, hx + 6, hy - 8, METAL_AGUIA.claro);
  p.linha(hx - 2, hy + 3, hx + 8, hy + 3, METAL_AGUIA.escuro);
  // Olho em fenda vermelha
  p.px(hx - 4, hy - 3, 7, 2, '#05050c');
  p.px(hx - 3, hy - 3, 5, 2, COR.vermelho);
  p.ponto(hx - 3, hy - 3, '#ffe0e4');
  // Bico dourado em gancho
  const bico: P2[] = [
    [hx - 6, hy - 3],
    [hx - 18, hy - 1],
    [hx - 22, hy + 3],
    [hx - 19, hy + 5],
    [hx - 16, hy + 2],
    [hx - 6, hy + 2],
  ];
  poligono(p, bico, OURO.base);
  p.linha(hx - 6, hy - 3, hx - 18, hy - 1, OURO.claro);
  p.linha(hx - 16, hy + 2, hx - 6, hy + 2, OURO.escuro);
  p.ponto(hx - 21, hy + 4, OURO.escuro);
  if (pose.bicoAberto) {
    p.px(hx - 15, hy + 2, 9, 3, '#3a0a14');
    poligono(
      p,
      [
        [hx - 6, hy + 4],
        [hx - 16, hy + 8],
        [hx - 13, hy + 9],
        [hx - 6, hy + 6],
      ],
      OURO.escuro
    );
  } else {
    poligono(
      p,
      [
        [hx - 6, hy + 2],
        [hx - 14, hy + 3],
        [hx - 6, hy + 5],
      ],
      OURO.escuro
    );
  }

  // Asa da frente (por cima do corpo)
  asaAguia(p, pose, [corpo[0] - 2, corpo[1] - 7], 0, false);
}

/* =========================================================================
 * FORMA 4: CAVEIRA TECNOLÓGICA — 60x64, 4 quadros
 * 0 normal, 1 tonta (olhos em X), 2 boca aberta (ataque), 3 olhos acesos
 * ========================================================================= */

export function desenharCaveira(p: Pincel, q: number): void {
  const osso = '#bcc2da';
  const ossoClaro = '#e6e9f7';
  const ossoEscuro = '#7f86a8';
  const ossoFundo = '#4b5172';
  const contornoC = '#14172a';
  const cx = 30;
  const boca = q === 2 ? 5 : 0;

  // Crânio com volume (pontilhado escurecendo para baixo e para a direita)
  p.elipse(cx, 26, 27, 25, contornoC);
  p.elipse(cx, 25, 26, 24, osso);
  for (let y = 4; y < 46; y++) {
    for (let x = 6; x < 56; x++) {
      const dxn = (x - cx) / 26;
      const dyn = (y - 25) / 24;
      if (dxn * dxn + dyn * dyn > 0.92) continue;
      const sombra = dxn * 0.6 + dyn * 0.6;
      if (sombra > 0.25 + bayer(x, y) * 0.6) p.ponto(x, y, ossoEscuro);
    }
  }
  p.elipse(cx - 6, 13, 13, 7, ossoClaro);
  p.px(cx - 14, 9, 6, 2, '#ffffff');
  // Emendas de placa, rebites e uma rachadura
  p.px(cx - 1, 2, 2, 22, ossoEscuro);
  p.linha(cx + 10, 4, cx + 20, 18, ossoEscuro);
  for (const [x, y] of [
    [cx - 18, 18],
    [cx + 18, 18],
    [cx - 12, 7],
    [cx + 12, 7],
    [cx - 2, 3],
  ] as const)
    rebite(p, x, y);
  p.linha(cx + 4, 6, cx + 8, 12, contornoC);
  p.linha(cx + 8, 12, cx + 6, 16, contornoC);

  // Decoração de calavera em neon: flor na testa, pétalas nos olhos, pontos na bochecha
  p.disco(cx, 13, 3, COR.magenta);
  for (const [x, y] of [
    [cx, 8],
    [cx + 5, 13],
    [cx, 18],
    [cx - 5, 13],
  ] as const) {
    p.disco(x, y, 1, COR.ciano);
  }
  p.ponto(cx, 13, '#ffe6fa');
  for (const s of [-1, 1]) {
    const ox = cx + s * 11;
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      p.ponto(ox + Math.cos(ang) * 10, 29 + Math.sin(ang) * 9, a % 2 ? COR.magenta : COR.ciano);
    }
    for (let i = 0; i < 3; i++) p.ponto(ox + s * (6 + i * 2), 40 + (i % 2), COR.magenta);
  }

  // Órbitas e olhos
  for (const s of [-1, 1]) {
    const ox = cx + s * 11;
    p.elipse(ox, 29, 8, 7, contornoC);
    p.elipse(ox, 29, 7, 6, '#06060e');
    if (q === 1) {
      p.linha(ox - 3, 26, ox + 3, 32, COR.ciano);
      p.linha(ox + 3, 26, ox - 3, 32, COR.ciano);
    } else {
      const forte = q === 2 || q === 3;
      p.disco(ox, 29, forte ? 4 : 3, COR.vermelho);
      p.disco(ox, 29, forte ? 2 : 1, forte ? '#ffd0d6' : COR.vermelho);
      p.ponto(ox - 1, 28, '#ffffff');
    }
  }
  // Nariz
  poligono(
    p,
    [
      [cx - 3, 36],
      [cx + 3, 36],
      [cx, 41],
    ],
    contornoC
  );

  // Maxilar superior e dentes de cima
  p.px(cx - 15, 42, 30, 6, contornoC);
  p.px(cx - 14, 42, 28, 5, ossoFundo);
  for (let x = cx - 13; x < cx + 13; x += 4) {
    p.px(x, 43, 3, 4, ossoClaro);
    p.ponto(x + 2, 46, ossoEscuro);
  }
  p.px(cx + 5, 43, 3, 4, COR.janelaQuente); // dente de ouro

  // Mandíbula (desce quando abre) com dobradiças de metal
  const my = 49 + boca;
  if (boca) p.px(cx - 13, 48, 26, boca + 1, '#3a0610');
  p.px(cx - 15, my, 30, 13, contornoC);
  p.px(cx - 14, my, 28, 11, ossoEscuro);
  p.px(cx - 14, my + 9, 28, 2, ossoFundo);
  for (let x = cx - 13; x < cx + 13; x += 4) p.px(x, my + 1, 3, 4, osso);
  for (const s of [-1, 1]) {
    p.disco(cx + s * 17, 47 + Math.floor(boca / 2), 3, contornoC);
    p.disco(cx + s * 17, 47 + Math.floor(boca / 2), 2, COR.metal);
    p.ponto(cx + s * 17, 46 + Math.floor(boca / 2), COR.metalClaro);
  }
}

/* =========================================================================
 * BRAÇOS DA CAVEIRA
 * ========================================================================= */

function suporte(p: Pincel, cx: number, cy: number): void {
  p.disco(cx, cy, 5, COR.contorno);
  p.disco(cx, cy, 4, '#3b4060');
  p.disco(cx, cy, 2, COR.metal);
  p.ponto(cx - 1, cy - 1, COR.metalClaro);
  p.px(cx - 1, cy + 4, 3, 3, '#3b4060');
}

/** Serra: 32x32, 4 quadros (dentes girando). */
export function desenharSerra(p: Pincel, q: number): void {
  const c = 16;
  const dentes = 14;
  for (let i = 0; i < dentes; i++) {
    const a = (i / dentes) * Math.PI * 2 + (q * Math.PI) / (dentes * 2);
    const b = a + Math.PI / dentes;
    poligono(
      p,
      [
        [c + Math.cos(a) * 11, c + Math.sin(a) * 11],
        [c + Math.cos(a + 0.12) * 15, c + Math.sin(a + 0.12) * 15],
        [c + Math.cos(b) * 11, c + Math.sin(b) * 11],
      ],
      i % 2 ? COR.metalClaro : '#dfe4f6'
    );
  }
  p.disco(c, c, 12, COR.contorno);
  p.disco(c, c, 11, '#9aa3c6');
  // Reflexo girando
  const ang = (q / 4) * Math.PI;
  for (let r = 3; r < 11; r++) {
    p.ponto(c + Math.cos(ang) * r, c + Math.sin(ang) * r, '#ffffff');
    p.ponto(c - Math.cos(ang) * r, c - Math.sin(ang) * r, '#6b7399');
  }
  p.disco(c, c, 5, COR.contorno);
  p.disco(c, c, 4, COR.magenta);
  p.disco(c, c, 2, '#2a0d24');
  p.ponto(c - 1, c - 2, '#ffd6f6');
}

/** Laser: 24x30, 3 quadros: 0 parado, 1 carregando, 2 disparando. */
export function desenharLaser(p: Pincel, q: number): void {
  suporte(p, 12, 5);
  placa(p, 4, 9, 16, 13, COR.metal);
  for (const x of [6, 16]) p.px(x, 11, 2, 9, '#2b2f45');
  p.px(8, 21, 8, 5, COR.contorno);
  p.px(9, 21, 6, 4, '#3b4060');
  const lente = q === 0 ? COR.vermelhoEscuro : q === 1 ? COR.vermelho : '#ffd0d6';
  p.disco(12, 26, 3, COR.contorno);
  p.disco(12, 26, 2, lente);
  if (q === 2) p.disco(12, 26, 1, '#ffffff');
  if (q >= 1) {
    p.ponto(9, 14, COR.vermelho);
    p.ponto(15, 14, COR.vermelho);
    p.px(10, 17, 4, 1, COR.vermelho);
  }
}

/** Canhão: 28x32, 2 quadros: 0 parado, 1 disparando (clarão na boca). */
export function desenharCanhao(p: Pincel, q: number): void {
  suporte(p, 14, 5);
  p.disco(14, 14, 8, COR.contorno);
  p.disco(14, 14, 7, '#3b4060');
  p.disco(13, 13, 5, COR.metal);
  p.ponto(11, 11, COR.metalClaro);
  placa(p, 9, 18, 10, 10, COR.metalClaro);
  p.px(9, 22, 10, 1, '#3b4060');
  p.px(11, 27, 6, 3, '#05060c');
  if (q === 1) {
    p.disco(14, 30, 2, '#ffffff');
    p.ponto(10, 30, COR.janelaQuente);
    p.ponto(18, 30, COR.janelaQuente);
    p.ponto(14, 31, COR.janelaQuente);
  }
}

/** Garra: 32x36, 2 quadros: 0 aberta, 1 fechada. Pistão hidráulico no punho. */
export function desenharGarra(p: Pincel, q: number): void {
  suporte(p, 16, 5);
  placa(p, 9, 9, 14, 10, COR.metal);
  p.px(14, 10, 4, 8, '#9aa3c6');
  p.px(15, 10, 2, 8, '#d8def5');
  const abre = q === 0 ? 7 : 2;
  for (const [x0, x1] of [
    [11, 11 - abre],
    [16, 16],
    [21, 21 + abre],
  ] as const) {
    const meio = 26;
    p.linha(x0, 18, x1, meio, COR.contorno);
    p.linha(x0 + 1, 18, x1 + 1, meio, COR.metalClaro);
    p.linha(x0 + 2, 18, x1 + 2, meio, COR.metal);
    const curva = x1 < 16 ? 2 : x1 > 16 ? -2 : 0;
    p.linha(x1, meio, x1 + curva, meio + 7, OURO.base);
    p.linha(x1 + 1, meio, x1 + 1 + curva, meio + 7, OURO.escuro);
    p.ponto(x1 + curva, meio + 7, OURO.claro);
  }
}
