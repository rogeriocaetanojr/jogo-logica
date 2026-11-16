import Phaser from 'phaser';
import { COR, aleatorio, bayer, folhaPixel, texturaPixel } from './ArteLixao';
import type { Pincel } from './ArteLixao';

/**
 * Quadro do Monstro de Sucata em pixels de arte. O corpo (48 de largura, como a hitbox) fica
 * centrado em MONSTRO_QUADRO.CX, com folga em volta para o braço-guindaste subir acima da
 * cabeça e esticar para a frente. Olha para a esquerda (a cena espelha para a direita).
 */
export const MONSTRO_QUADRO = { W: 64, H: 50, CX: 32 } as const;

/** Quadros da folha 'lx-monstro'. */
export const QUADRO_MONSTRO = {
  ANDAR: [0, 1],
  DORMINDO: 2,
  PREPARO: 3,
  ARREMESSO: 4,
  TONTO: [5, 6],
  DERROTADO: 7,
  DOR: 8,
} as const;

/** Ponta da garra no quadro de arremesso, relativa ao centro do pé (px de arte): de onde sai a sucata. */
export const GARRA_ARREMESSO = { DX: -18, ALTURA: 42 } as const;

/** Tipos de sucata que o monstro arremessa (texturas 'lx-monstro-sucata-<i>'). */
export const SUCATAS_MONSTRO = 3;

type Pose = 'normal' | 'dormindo' | 'preparo' | 'arremesso' | 'tonto' | 'derrotado' | 'dor';

const POSES: readonly { pose: Pose; passo: 0 | 1 }[] = [
  { pose: 'normal', passo: 0 },
  { pose: 'normal', passo: 1 },
  { pose: 'dormindo', passo: 0 },
  { pose: 'preparo', passo: 0 },
  { pose: 'arremesso', passo: 0 },
  { pose: 'tonto', passo: 0 },
  { pose: 'tonto', passo: 1 },
  { pose: 'derrotado', passo: 0 },
  { pose: 'dor', passo: 0 },
];

/** Tela do monitor-cara: fundo quase preto esverdeado e a linha de varredura. */
const TELA = '#14201A';
const TELA_LINHA = '#0C1410';
const CHAO = MONSTRO_QUADRO.H;

export function gerarTexturasMonstro(cena: Phaser.Scene): void {
  folhaPixel(cena, 'lx-monstro', MONSTRO_QUADRO.W, MONSTRO_QUADRO.H, POSES.length, (p, i) => desenharMonstro(p, POSES[i].pose, POSES[i].passo));
  // Sucata arremessada: engrenagem, chapa torta e um monitorzinho
  texturaPixel(cena, 'lx-monstro-sucata-0', 9, 9, (p) => {
    p.disco(4, 4, 4, COR.contorno);
    p.disco(4, 4, 3, COR.sucataClara);
    for (const [x, y] of [[4, 0], [0, 4], [8, 4], [4, 8], [1, 1], [7, 1], [1, 7], [7, 7]]) p.ponto(x, y, COR.sucata);
    p.disco(4, 4, 1, COR.contorno);
    p.ponto(3, 2, COR.luz);
  });
  texturaPixel(cena, 'lx-monstro-sucata-1', 10, 7, (p) => {
    p.px(0, 2, 10, 4, COR.contorno);
    p.px(1, 3, 4, 2, COR.cobre);
    p.px(5, 1, 5, 4, COR.contorno);
    p.px(6, 2, 3, 2, COR.cobreClaro);
    p.ponto(2, 3, COR.cobreClaro);
    p.ponto(8, 3, COR.cobreEscuro);
  });
  texturaPixel(cena, 'lx-monstro-sucata-2', 9, 8, (p) => {
    p.caixa(0, 0, 9, 7, COR.sucata);
    p.px(1, 1, 7, 1, COR.sucataClara);
    p.px(2, 2, 5, 3, TELA);
    p.ponto(3, 3, COR.verdePlacaClaro);
    p.px(3, 7, 3, 1, COR.contorno);
  });
}

/**
 * Monstro de Sucata: um monte de chapas sombreadas com pontilhado, um monitor velho como
 * cara (os olhos são desenhados na tela e mudam de expressão), mandíbula de grade, placa de
 * circuito na barriga, chapa de cobre rebitada, pneu, chaminé, antena com LED, esteira de
 * trator e um braço-guindaste nas costas que pega e arremessa a sucata.
 */
function desenharMonstro(p: Pincel, pose: Pose, passo: 0 | 1): void {
  const cx = MONSTRO_QUADRO.CX;
  const caido = pose === 'derrotado' ? 4 : pose === 'dormindo' ? 2 : 0;
  const t = 10 + caido;
  const base = CHAO - 8;
  const rnd = aleatorio(4242);

  // Braço por trás do corpo quando está para baixo
  const braco = poseBraco(pose, passo, t);
  if (!braco.naFrente) desenharBraco(p, braco);

  // Esteira de trator
  p.caixa(cx - 23, base, 46, 8, COR.sombraSucata);
  p.px(cx - 22, base + 1, 44, 1, COR.sucata);
  for (let x = cx - 22 + passo * 2; x < cx + 22; x += 4) {
    p.ponto(x, base + 1, COR.sucataClara);
    p.ponto(x + 1, CHAO - 2, COR.sucata);
  }
  for (const rx of [-17, -9, -1, 7, 15]) {
    p.disco(cx + rx, base + 4, 2, COR.sucata);
    p.ponto(cx + rx, base + 4, COR.contorno);
    p.ponto(cx + rx - 1 + passo, base + 3, COR.sucataClara);
  }

  // Corpo: monte arredondado com luz vindo de cima e da frente (esquerda)
  for (let y = t; y < base + 1; y++) {
    const meia = Math.min(22, Math.round(9 + (y - t) * 0.62));
    const x0 = cx - meia;
    for (let x = x0; x <= cx + meia; x++) {
      const u = (x - x0) / Math.max(1, meia * 2);
      const v = (y - t) / Math.max(1, base - t);
      const tom = u * 0.9 + v * 1.1 + (bayer(x, y) - 0.5) * 0.55;
      const cor = tom < 0.55 ? COR.sucataClara : tom < 1.25 ? COR.sucata : COR.sombraSucata;
      p.ponto(x, y, x === x0 || x === cx + meia || y === t ? COR.contorno : cor);
    }
  }
  // Pedaços espetados no contorno de cima: chapa torta e uma grade de ventilador
  p.linha(cx - 7, t - 1, cx - 2, t - 3, COR.contorno);
  p.linha(cx - 7, t, cx - 2, t - 2, COR.sucataClara);
  p.caixa(cx + 4, t - 2, 6, 4, COR.sombraSucata);
  p.px(cx + 5, t - 1, 4, 1, COR.sucata);
  // Ferrugem e parafusos
  for (let i = 0; i < 18; i++) {
    const y = t + 3 + Math.floor(rnd() * (base - t - 4));
    const meia = Math.min(22, Math.round(9 + (y - t) * 0.62)) - 2;
    const x = cx - meia + Math.floor(rnd() * meia * 2);
    p.ponto(x, y, i % 3 === 0 ? COR.sucataClara : COR.cobreEscuro);
  }

  // Chaminé e antena com LED
  p.caixa(cx + 10, t - 5, 4, 9, COR.cobreEscuro);
  p.px(cx + 9, t - 6, 6, 2, COR.contorno);
  p.px(cx + 11, t - 4, 1, 6, COR.cobre);
  const xAntena = cx - 15;
  p.linha(cx - 11, t + 5, xAntena, t - 4, COR.contorno);
  const led = pose === 'dormindo' || pose === 'derrotado' ? COR.cobreEscuro : passo === 0 ? COR.perigo : COR.bateriaAmarela;
  p.ponto(xAntena, t - 5, led);
  p.ponto(xAntena - 1, t - 5, COR.contorno);
  p.ponto(xAntena + 1, t - 5, COR.contorno);

  // Chapa de cobre rebitada nas costas e pneu embutido embaixo
  p.caixa(cx + 4, t + 6, 13, 8, COR.cobre);
  p.px(cx + 5, t + 7, 11, 1, COR.cobreClaro);
  p.px(cx + 5, t + 12, 11, 1, COR.cobreEscuro);
  for (const [rx, ry] of [[1, 1], [11, 1], [1, 6], [11, 6]]) p.ponto(cx + 4 + rx, t + 6 + ry, COR.contorno);
  p.disco(cx + 14, base - 5, 6, COR.contorno);
  p.disco(cx + 14, base - 5, 5, COR.sombraSucata);
  for (let a = 0; a < 8; a++) p.ponto(cx + 14 + Math.round(Math.cos(a * 0.785) * 5), base - 5 + Math.round(Math.sin(a * 0.785) * 5), COR.contorno);
  p.disco(cx + 14, base - 5, 2, COR.sucata);
  p.ponto(cx + 14, base - 5, COR.contorno);

  // Placa de circuito na barriga
  p.caixa(cx - 3, t + 20, 13, 9, COR.verdePlaca);
  p.linha(cx - 1, t + 22, cx + 4, t + 22, COR.cobreClaro);
  p.linha(cx + 4, t + 22, cx + 4, t + 27, COR.cobreClaro);
  p.linha(cx - 1, t + 25, cx + 2, t + 25, COR.verdePlacaClaro);
  p.px(cx + 6, t + 23, 3, 3, COR.contorno);
  p.ponto(cx + 7, t + 24, COR.sucataClara);
  p.ponto(cx - 1, t + 27, COR.bateriaAmarela);

  // Monitor velho como cara
  const mx = cx - 20;
  const my = t + 4;
  p.caixa(mx, my, 20, 14, COR.sucata);
  p.px(mx + 1, my + 1, 18, 1, COR.sucataClara);
  p.px(mx + 18, my + 2, 1, 11, COR.sombraSucata);
  p.px(mx + 2, my + 2, 15, 10, COR.contorno);
  const ligada = pose !== 'derrotado';
  p.px(mx + 3, my + 3, 13, 8, ligada ? TELA : COR.contorno);
  if (ligada) for (let y = my + 4; y < my + 11; y += 2) p.px(mx + 3, y, 13, 1, TELA_LINHA);
  desenharOlhos(p, pose, passo, mx + 3, my + 3);
  // Botões do monitor
  p.ponto(mx + 16, my + 12, ligada ? COR.verdePlacaClaro : COR.sombraSucata);
  p.ponto(mx + 14, my + 12, COR.sombraSucata);

  // Mandíbula de grade abaixo do monitor (abre conforme a pose)
  const abertura = { normal: 1, dormindo: 0, preparo: 4, arremesso: 6, tonto: 3, derrotado: 2, dor: 3 }[pose];
  const jy = my + 15;
  const jx = mx - 1;
  p.px(jx, jy, 20, 2, COR.contorno);
  for (let x = jx + 1; x < jx + 19; x += 3) p.px(x, jy, 2, 2, COR.sucataClara);
  if (abertura > 0) {
    p.px(jx + 1, jy + 2, 18, abertura, COR.contorno);
    if (pose === 'preparo' || pose === 'arremesso') p.px(jx + 3, jy + 2 + Math.floor(abertura / 2), 14, Math.ceil(abertura / 2), COR.cobreEscuro);
  }
  const jyBaixo = jy + 2 + abertura;
  p.px(jx + (pose === 'derrotado' ? 2 : 0), jyBaixo, 20, 3, COR.contorno);
  p.px(jx + 1 + (pose === 'derrotado' ? 2 : 0), jyBaixo + 1, 18, 1, COR.sucata);
  for (let x = jx + 2; x < jx + 19; x += 3) p.ponto(x, jyBaixo, COR.sucataClara);
  // Tonto: um fio de cobre pendurado da boca, balançando
  if (pose === 'tonto') p.linha(jx + 8, jyBaixo + 2, jx + 7 + passo * 2, jyBaixo + 6, COR.cobre);

  if (braco.naFrente) desenharBraco(p, braco);
}

/** Olhos desenhados na tela do monitor (13x8 a partir de x, y). */
function desenharOlhos(p: Pincel, pose: Pose, passo: 0 | 1, x: number, y: number): void {
  const olho = COR.perigo;
  const brilho = COR.luz;
  switch (pose) {
    case 'normal':
      // Bravo: sobrancelhas em V e olhos de 3x2
      p.linha(x + 1, y + 1, x + 4, y + 2, olho);
      p.linha(x + 11, y + 1, x + 8, y + 2, olho);
      p.px(x + 2, y + 3, 3, 2, olho);
      p.px(x + 8, y + 3, 3, 2, olho);
      p.ponto(x + 2 + passo, y + 3, brilho);
      p.ponto(x + 8 + passo, y + 3, brilho);
      break;
    case 'preparo':
      // Olhos arregalados e sobrancelhas bem fechadas
      p.linha(x + 1, y, x + 5, y + 2, olho);
      p.linha(x + 11, y, x + 7, y + 2, olho);
      p.px(x + 2, y + 3, 3, 3, olho);
      p.px(x + 8, y + 3, 3, 3, olho);
      p.ponto(x + 3, y + 4, brilho);
      p.ponto(x + 9, y + 4, brilho);
      break;
    case 'arremesso':
      // Apertados no esforço
      p.linha(x + 1, y + 1, x + 5, y + 3, olho);
      p.linha(x + 11, y + 1, x + 7, y + 3, olho);
      p.px(x + 2, y + 4, 4, 1, olho);
      p.px(x + 7, y + 4, 4, 1, olho);
      break;
    case 'dor':
      // > <
      p.linha(x + 2, y + 2, x + 4, y + 4, olho);
      p.linha(x + 4, y + 4, x + 2, y + 6, olho);
      p.linha(x + 10, y + 2, x + 8, y + 4, olho);
      p.linha(x + 8, y + 4, x + 10, y + 6, olho);
      break;
    case 'tonto': {
      // Espirais girando (o segundo quadro espelha)
      const espiral = passo === 0 ? [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [1, 1]] : [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [1, 1]];
      for (const ox of [2, 8]) espiral.forEach(([ex, ey], i) => p.ponto(x + ox + ex, y + 2 + ey, i === 8 ? brilho : COR.bateriaAmarela));
      break;
    }
    case 'dormindo':
      // Olhos fechados, apagados
      p.px(x + 2, y + 4, 3, 1, COR.cobreEscuro);
      p.px(x + 8, y + 4, 3, 1, COR.cobreEscuro);
      break;
    case 'derrotado':
      // Tela rachada
      p.linha(x + 2, y, x + 6, y + 4, COR.sucata);
      p.linha(x + 6, y + 4, x + 5, y + 7, COR.sucata);
      p.linha(x + 6, y + 4, x + 11, y + 6, COR.sucata);
      break;
  }
}

interface Braco {
  ombro: readonly [number, number];
  cotovelo: readonly [number, number];
  garra: readonly [number, number];
  aberta: boolean;
  segurando: boolean;
  naFrente: boolean;
}

function poseBraco(pose: Pose, passo: 0 | 1, t: number): Braco {
  const cx = MONSTRO_QUADRO.CX;
  const ombro = [cx + 15, t + 12] as const;
  switch (pose) {
    case 'preparo':
      return { ombro: [cx + 14, t + 10], cotovelo: [cx + 20, 2], garra: [cx + 4, 3], aberta: false, segurando: true, naFrente: true };
    case 'arremesso':
      return { ombro: [cx + 14, t + 10], cotovelo: [cx + 4, t - 5], garra: [cx + GARRA_ARREMESSO.DX, CHAO - GARRA_ARREMESSO.ALTURA], aberta: true, segurando: false, naFrente: true };
    case 'dor':
      return { ombro, cotovelo: [cx + 25, t + 12], garra: [cx + 28, t + 3], aberta: true, segurando: false, naFrente: false };
    case 'tonto':
      return { ombro, cotovelo: [cx + 24, t + 24], garra: [cx + 26 - passo, CHAO - 3], aberta: true, segurando: false, naFrente: false };
    case 'dormindo':
      return { ombro, cotovelo: [cx + 23, t + 22], garra: [cx + 22, CHAO - 4], aberta: false, segurando: false, naFrente: false };
    case 'derrotado':
      return { ombro: [cx + 15, t + 13], cotovelo: [cx + 25, CHAO - 5], garra: [cx + 30, CHAO - 3], aberta: true, segurando: false, naFrente: false };
    default:
      return { ombro, cotovelo: [cx + 23, t + 19 + passo], garra: [cx + 20, t + 29 + passo], aberta: false, segurando: false, naFrente: false };
  }
}

/** Cano grosso entre dois pontos: contorno de 3 px com miolo de cobre e brilho. */
function cano(p: Pincel, a: readonly [number, number], b: readonly [number, number]): void {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) p.linha(a[0] + dx, a[1] + dy, b[0] + dx, b[1] + dy, COR.contorno);
  p.linha(a[0], a[1], b[0], b[1], COR.cobre);
  p.linha(a[0], a[1] - 1, b[0], b[1] - 1, COR.cobreClaro);
}

function desenharBraco(p: Pincel, b: Braco): void {
  cano(p, b.ombro, b.cotovelo);
  cano(p, b.cotovelo, b.garra);
  for (const j of [b.ombro, b.cotovelo]) {
    p.disco(j[0], j[1], 2, COR.contorno);
    p.disco(j[0], j[1], 1, COR.sucataClara);
  }
  const [gx, gy] = b.garra;
  if (b.segurando) {
    // Bloco de sucata preso na garra
    p.caixa(gx - 5, gy - 3, 10, 7, COR.sucataClara);
    p.px(gx - 4, gy - 2, 4, 2, COR.cobre);
    p.px(gx + 1, gy + 1, 3, 2, COR.sombraSucata);
    p.ponto(gx + 2, gy - 2, COR.verdePlacaClaro);
  }
  // Garra de duas pinças
  const abre = b.aberta ? 3 : 1;
  p.linha(gx, gy, gx - abre, gy + 3, COR.contorno);
  p.linha(gx, gy, gx + abre, gy + 3, COR.contorno);
  p.linha(gx - abre, gy + 3, gx - abre + 1, gy + 4, COR.sucataClara);
  p.linha(gx + abre, gy + 3, gx + abre - 1, gy + 4, COR.sucataClara);
  p.disco(gx, gy, 1, COR.sucataClara);
}
