import Phaser from 'phaser';
import { QUADROS_ANDAR } from '../../../compartilhado/animacoesPersonagens';

/** Lado de cada quadro dos spritesheets de Alvares e Reis. */
const QUADRO = 128;

/**
 * Proporções do corpo dentro da silhueta (do topo da cabeça aos pés) e como cada parte muda
 * agachado: a cabeça quase não muda, o tronco encolhe e as pernas dobram (mais curtas e um
 * pouco abertas). O resultado tem ~2/3 da altura em pé e cabe sob os canos das passagens baixas.
 */
const CORPO = {
  CABECA: 0.37,
  TRONCO: 0.33,
  ESCALA_CABECA: 0.94,
  ESCALA_TRONCO: 0.56,
  ESCALA_PERNAS: 0.5,
  LARGURA_PERNAS: 1.12,
  /** Inclinação para a frente (px): o sprite olha para a direita. */
  AVANCO_CABECA: 4,
  AVANCO_TRONCO: 2,
} as const;

/** Quadros da folha agachada: 0 e 1 parado (respirando), 2 a 9 andando agachado. */
export const QUADROS_ABAIXADO = { PARADO: [0, 1], ANDAR: [2, 3, 4, 5, 6, 7, 8, 9] } as const;

export function chaveAbaixado(tipo: string): string {
  return `${tipo}_abaixado`;
}

/** Topo e base da silhueta (pixels com alfa) de um quadro do spritesheet. */
function limites(dados: Uint8ClampedArray, largura: number, x0: number): { topo: number; base: number; esq: number; dir: number } {
  let topo = QUADRO;
  let base = 0;
  let esq = QUADRO;
  let dir = 0;
  for (let y = 0; y < QUADRO; y++) {
    for (let x = 0; x < QUADRO; x++) {
      if (dados[(y * largura + x0 + x) * 4 + 3] > 24) {
        if (y < topo) topo = y;
        if (y > base) base = y;
        if (x < esq) esq = x;
        if (x > dir) dir = x;
      }
    }
  }
  return { topo, base: base + 1, esq, dir: dir + 1 };
}

/**
 * Desenha um quadro agachado a partir de um quadro em pé, cortando a silhueta em cabeça,
 * tronco e pernas e remontando cada parte com sua escala, apoiada na mesma linha dos pés.
 */
function desenharAbaixado(
  ctx: CanvasRenderingContext2D,
  fonte: CanvasImageSource,
  dados: Uint8ClampedArray,
  larguraFonte: number,
  quadroFonte: number,
  destinoX: number,
  respiro: number
): void {
  const sx = quadroFonte * QUADRO;
  const { topo, base, esq, dir } = limites(dados, larguraFonte, sx);
  const h = base - topo;
  const hCabeca = Math.round(h * CORPO.CABECA);
  const hTronco = Math.round(h * CORPO.TRONCO);
  const hPernas = h - hCabeca - hTronco;
  const dPernas = Math.round(hPernas * CORPO.ESCALA_PERNAS);
  const dTronco = Math.round(hTronco * (CORPO.ESCALA_TRONCO - respiro * 0.03));
  const dCabeca = Math.round(hCabeca * CORPO.ESCALA_CABECA);
  const centro = (esq + dir) / 2;

  // Pernas dobradas: mais curtas e um pouco mais abertas, centradas
  const wPernas = QUADRO * CORPO.LARGURA_PERNAS;
  const yPernas = base - dPernas;
  ctx.drawImage(fonte, sx, topo + hCabeca + hTronco, QUADRO, hPernas, destinoX + centro - (centro * CORPO.LARGURA_PERNAS), yPernas, wPernas, dPernas);
  // Tronco curvado para a frente
  const yTronco = yPernas - dTronco + 1;
  ctx.drawImage(fonte, sx, topo + hCabeca, QUADRO, hTronco, destinoX + CORPO.AVANCO_TRONCO, yTronco, QUADRO, dTronco);
  // Cabeça por cima (respirando: desce 1 px)
  const yCabeca = yTronco - dCabeca + 2 + respiro;
  const wCabeca = Math.round(QUADRO * CORPO.ESCALA_CABECA);
  ctx.drawImage(fonte, sx, topo, QUADRO, hCabeca, destinoX + CORPO.AVANCO_CABECA + (QUADRO - wCabeca) * (centro / QUADRO), yCabeca, wCabeca, dCabeca);
}

/**
 * Cria (uma vez) a folha agachada do personagem e as animações `<tipo>_abaixado_parado` e
 * `<tipo>_abaixado_andar`. Precisa do spritesheet do personagem já carregado.
 */
export function gerarAbaixado(cena: Phaser.Scene, tipo: string): void {
  const chave = chaveAbaixado(tipo);
  if (!cena.textures.exists(chave) && cena.textures.exists(tipo)) {
    const fonte = cena.textures.get(tipo).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const larguraFonte = fonte.width;
    // Lê os pixels da folha original uma vez, para achar a silhueta de cada quadro
    const leitura = document.createElement('canvas');
    leitura.width = larguraFonte;
    leitura.height = QUADRO;
    const ctxLeitura = leitura.getContext('2d', { willReadFrequently: true });
    if (!ctxLeitura) return;
    ctxLeitura.drawImage(fonte, 0, 0);
    const dados = ctxLeitura.getImageData(0, 0, larguraFonte, QUADRO).data;

    const quadros: Array<{ fonte: number; respiro: number }> = [
      { fonte: 0, respiro: 0 },
      { fonte: 0, respiro: 1 },
      ...QUADROS_ANDAR.map((q) => ({ fonte: q, respiro: 0 })),
    ];
    const tex = cena.textures.createCanvas(chave, QUADRO * quadros.length, QUADRO);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    quadros.forEach((q, i) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(i * QUADRO, 0, QUADRO, QUADRO);
      ctx.clip();
      desenharAbaixado(ctx, fonte, dados, larguraFonte, q.fonte, i * QUADRO, q.respiro);
      ctx.restore();
    });
    tex.refresh();
    quadros.forEach((_, i) => tex.add(i, 0, i * QUADRO, 0, QUADRO, QUADRO));
  }
  const anims = cena.anims;
  if (!anims.exists(`${chave}_parado`)) {
    anims.create({
      key: `${chave}_parado`,
      frames: QUADROS_ABAIXADO.PARADO.map((f) => ({ key: chave, frame: f })),
      frameRate: 2.5,
      repeat: -1,
    });
  }
  if (!anims.exists(`${chave}_andar`)) {
    anims.create({
      key: `${chave}_andar`,
      frames: QUADROS_ABAIXADO.ANDAR.map((f) => ({ key: chave, frame: f })),
      frameRate: 9,
      repeat: -1,
    });
  }
}
