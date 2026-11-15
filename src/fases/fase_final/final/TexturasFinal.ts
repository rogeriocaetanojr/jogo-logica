import Phaser from 'phaser';
import { COR, type Pincel, folhaPixel, texturaPixel, texturaSuave } from '../ArteFaseFinal';

/** Texturas do final: céu do amanhecer, sol, nuvens, a mão do joinha e o relógio de ponto. */
export const TEX_FINAL = {
  CEU_AMANHECER: 'ff-final-ceu',
  SOL: 'ff-final-sol',
  NUVEM: 'ff-final-nuvem',
  JOINHA: 'ff-final-joinha',
  RELOGIO_PONTO: 'ff-final-relogio-ponto',
  CONE: 'ff-final-cone',
} as const;

/** Paleta do amanhecer: o único céu claro da fase. */
export const COR_AMANHECER = {
  ceu: ['#1d2a6b', '#3b3d8f', '#7a4f9e', '#c0628f', '#f08a72', '#ffb877', '#ffe0a0'],
  sol: '#fff2c4',
  solBorda: '#ffd27a',
  nuvem: '#ffc7b5',
  nuvemSombra: '#c47a9a',
  /** Tint das silhuetas da cidade contra o sol. */
  cidadeLonge: 0x9a7ab8,
  cidadePerto: 0x6a5088,
} as const;

export function gerarTexturasFinal(cena: Phaser.Scene): void {
  texturaPixel(cena, TEX_FINAL.CEU_AMANHECER, 320, 180, (p) => {
    p.degradePontilhado(0, 0, 320, 180, COR_AMANHECER.ceu, 0.9);
    // As últimas estrelas indo embora
    for (let i = 0; i < 14; i++) p.ponto((i * 97) % 320, (i * 37) % 40, '#c7d2ff');
  });

  texturaPixel(cena, TEX_FINAL.SOL, 48, 48, (p) => {
    p.disco(24, 24, 23, COR_AMANHECER.solBorda);
    p.disco(24, 24, 20, COR_AMANHECER.sol);
    p.disco(19, 19, 6, '#ffffff');
  });

  texturaSuave(cena, TEX_FINAL.NUVEM, 160, 40, (ctx) => {
    const g = ctx.createRadialGradient(80, 22, 4, 80, 22, 80);
    g.addColorStop(0, 'rgba(255,214,196,0.95)');
    g.addColorStop(0.55, 'rgba(240,150,150,0.55)');
    g.addColorStop(1, 'rgba(200,110,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(80, 22, 80, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Mão robótica fazendo joinha (2 quadros: LED do pulso aceso/apagado)
  folhaPixel(cena, TEX_FINAL.JOINHA, 40, 60, 2, (p, q) => desenharJoinha(p, q === 1));

  // Relógio de ponto num pedestal (0 esperando, 1 BIP)
  folhaPixel(cena, TEX_FINAL.RELOGIO_PONTO, 22, 44, 2, (p, q) => {
    p.px(9, 20, 4, 22, COR.metal);
    p.px(5, 41, 12, 3, COR.metal);
    p.px(5, 41, 12, 1, COR.metalClaro);
    p.px(1, 2, 20, 20, COR.contorno);
    p.px(2, 3, 18, 18, '#3a3f5e');
    p.px(2, 3, 18, 1, COR.metalClaro);
    p.px(4, 5, 14, 7, '#05060c');
    p.textoCentro(q === 1 ? 'OK' : '0600', 11, 6, q === 1 ? '#5aff8a' : COR.ciano, 1);
    // Leitor de crachá
    p.px(5, 14, 12, 4, '#14121c');
    p.px(6, 15, 10, 1, q === 1 ? '#5aff8a' : COR.vermelho);
  });

  texturaPixel(cena, TEX_FINAL.CONE, 12, 16, (p) => {
    p.px(0, 14, 12, 2, '#3a1a08');
    p.px(4, 0, 4, 2, '#ff7a1a');
    p.px(3, 2, 6, 4, '#ff7a1a');
    p.px(3, 6, 6, 2, '#f2f0f6');
    p.px(2, 8, 8, 3, '#ff7a1a');
    p.px(2, 11, 8, 2, '#f2f0f6');
    p.px(1, 13, 10, 1, '#ff7a1a');
    p.px(4, 1, 1, 12, '#ffb877');
  });
}

/**
 * Mão robótica fazendo joinha (40x60 de arte, paródia de cena clássica): polegar para cima com
 * unha, quatro dedos dobrados de frente com nós arredondados, pulso com LEDs e antebraço.
 */
function desenharJoinha(p: Pincel, ledAceso: boolean): void {
  const K = COR.contorno;
  const metal = '#8a93b8';
  const claro = '#d6deef';
  const escuro = '#4a5072';
  const sombra = '#2c3150';

  // Polegar (em pé, levemente inclinado)
  p.px(19, 1, 10, 17, K);
  p.px(20, 0, 8, 1, K);
  p.px(20, 1, 8, 16, metal);
  p.px(20, 1, 3, 16, claro);
  p.px(26, 2, 2, 15, escuro);
  p.px(21, 2, 5, 4, '#eef2fa'); // unha
  p.px(21, 6, 5, 1, escuro);
  p.px(20, 10, 8, 1, escuro); // junta
  p.ponto(24, 12, COR.ciano);

  // Palma / costas da mão
  p.px(8, 15, 26, 25, K);
  p.px(9, 16, 24, 23, metal);
  p.px(26, 16, 7, 23, escuro);
  p.px(9, 16, 24, 2, claro);

  // Quatro dedos dobrados, de frente: cada um é um rolo com o nó arredondado à esquerda
  for (let i = 0; i < 4; i++) {
    const y = 17 + i * 5;
    p.px(4, y, 20, 6, K);
    p.disco(7, y + 3, 3, K);
    p.px(5, y + 1, 18, 4, metal);
    p.disco(7, y + 3, 2, metal);
    p.px(6, y + 1, 16, 1, claro);
    p.ponto(5, y + 2, claro);
    p.px(5, y + 4, 18, 1, escuro);
    p.px(13, y + 1, 1, 4, escuro); // junta do meio
  }
  p.px(4, 37, 20, 1, sombra);

  // Pulso com LEDs
  p.px(10, 39, 22, 6, K);
  p.px(11, 40, 20, 4, sombra);
  p.px(11, 40, 20, 1, escuro);
  p.px(14, 41, 2, 2, ledAceso ? COR.vermelho : COR.vermelhoEscuro);
  p.px(19, 41, 2, 2, ledAceso ? COR.ciano : COR.cianoEscuro);
  p.px(24, 41, 2, 2, ledAceso ? COR.magenta : COR.magentaEscuro);

  // Antebraço com placas e cabos
  p.px(11, 45, 20, 15, K);
  p.px(12, 45, 18, 15, metal);
  p.px(12, 45, 4, 15, claro);
  p.px(25, 45, 5, 15, escuro);
  p.px(16, 49, 9, 1, COR.magenta);
  p.px(16, 54, 9, 1, COR.ciano);
  p.px(19, 45, 1, 15, escuro);
}

/** Retrato do protagonista para o diálogo, recortado do quadro de frente do spritesheet. */
export function retratoProtagonista(cena: Phaser.Scene, chave: string): string {
  const fonte = cena.textures.get(chave).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 56;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#ffb877';
  ctx.fillRect(0, 0, 64, 56);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fonte, 32, 8, 64, 56, 0, 0, 64, 56);
  return canvas.toDataURL();
}
