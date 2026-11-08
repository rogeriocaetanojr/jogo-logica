import Phaser from 'phaser';
import { COR, Pincel, desenharLogoMegaBrain, folhaPixel, misturar, retratoDataUrl, sombrear } from '../ArteFaseFinal';

/**
 * Pixel art dos NPCs dos andares (humanos e robôs) e do Drone Captcha.
 * Folhas de 2 quadros (respirar/piscar), viradas para a esquerda, 32x60 em arte (64x120 na tela).
 */

export type AparenciaNpc = 'recepcionista' | 'influencer' | 'operadora' | 'chatbot';

export const TEX_DRONE_CAPTCHA = 'ff-drone-captcha';

export const texNpc = (aparencia: AparenciaNpc) => `ff-npc-${aparencia}`;
export const animNpc = (aparencia: AparenciaNpc) => `ff-npc-${aparencia}-anim`;

interface VisualHumano {
  pele: string;
  peleSombra: string;
  cabelo: string;
  estilo: 'longo' | 'coque';
  roupa: string;
  calca: string;
  acessorio: 'celular' | 'caneca';
  headset?: boolean;
}

const HUMANOS: Record<'influencer' | 'operadora', VisualHumano> = {
  influencer: {
    pele: '#e8b48f',
    peleSombra: '#b7805f',
    cabelo: '#ff7ad9',
    estilo: 'longo',
    roupa: '#7a1f6a',
    calca: '#22243a',
    acessorio: 'celular',
  },
  operadora: {
    pele: '#9a6648',
    peleSombra: '#734a33',
    cabelo: '#2a1d1a',
    estilo: 'coque',
    roupa: '#1f5a66',
    calca: '#1c1f30',
    acessorio: 'caneca',
    headset: true,
  },
};

/** Pessoa virada para a esquerda; `q` = 1 levanta cabeça e ombros (respiração). */
function desenharHumano(p: Pincel, v: VisualHumano, q: number, ox = 0, oy = 0): void {
  const r = q === 1 ? -1 : 0;
  const x = (n: number) => ox + n;
  const y = (n: number) => oy + n;

  // Pernas e sapatos
  p.px(x(11), y(40), 6, 16, v.calca);
  p.px(x(19), y(40), 6, 16, v.calca);
  p.px(x(23), y(40), 2, 16, sombrear(v.calca, 0.3));
  p.px(x(10), y(56), 7, 4, '#15161f');
  p.px(x(19), y(56), 7, 4, '#15161f');

  // Tronco
  p.px(x(10), y(22 + r), 16, 20 - r, v.roupa);
  p.px(x(22), y(22 + r), 4, 20 - r, sombrear(v.roupa, 0.3));
  p.px(x(10), y(40), 16, 2, sombrear(v.roupa, 0.45));
  p.px(x(14), y(22 + r), 6, 2, sombrear(v.roupa, 0.25)); // gola
  // Braço de trás
  p.px(x(25), y(24 + r), 3, 14, sombrear(v.roupa, 0.35));
  p.px(x(25), y(38), 3, 2, v.peleSombra);

  // Cabelo longo atrás da cabeça
  if (v.estilo === 'longo') p.px(x(17), y(8 + r), 9, 22, sombrear(v.cabelo, 0.15));

  // Pescoço e cabeça
  p.px(x(15), y(19 + r), 6, 3, v.peleSombra);
  p.px(x(12), y(8 + r), 12, 12, v.pele);
  p.px(x(21), y(9 + r), 3, 10, v.peleSombra);
  p.px(x(11), y(13 + r), 1, 3, v.pele);
  // Olhos e boca
  p.px(x(13), y(13 + r), 2, 2, '#1b1b26');
  p.px(x(17), y(13 + r), 2, 2, '#1b1b26');
  p.px(x(13), y(17 + r), 4, 1, sombrear(v.pele, 0.45));

  // Cabelo
  p.px(x(12), y(5 + r), 13, 4, v.cabelo);
  p.px(x(20), y(7 + r), 5, 6, v.cabelo);
  if (v.estilo === 'coque') {
    p.disco(x(22), y(4 + r), 3, v.cabelo);
    p.px(x(21), y(3 + r), 2, 1, misturar(v.cabelo, '#ffffff', 0.25));
  } else {
    p.px(x(12), y(5 + r), 3, 7, v.cabelo); // franja
    p.px(x(13), y(5 + r), 6, 1, misturar(v.cabelo, '#ffffff', 0.3));
  }
  if (v.headset) {
    p.px(x(21), y(6 + r), 2, 10, COR.metal);
    p.px(x(20), y(12 + r), 3, 4, '#202436');
    p.linha(x(20), y(15 + r), x(14), y(18 + r), COR.metal);
  }

  // Braço da frente com o acessório
  if (v.acessorio === 'celular') {
    // Celular erguido para a selfie, com a tela acesa
    p.px(x(6), y(14 + r), 4, 12, v.roupa);
    p.px(x(5), y(11 + r), 4, 4, v.pele);
    p.px(x(3), y(5 + r), 5, 8, '#101320');
    p.px(x(4), y(6 + r), 3, 6, misturar('#101320', COR.magenta, 0.6));
  } else {
    p.px(x(7), y(24 + r), 4, 10, v.roupa);
    p.px(x(4), y(32), 5, 6, COR.branco);
    p.px(x(3), y(33), 1, 3, COR.branco);
    p.px(x(5), y(31), 3, 1, misturar(COR.branco, '#6b4a2a', 0.4)); // café
    p.px(x(8), y(34), 3, 3, v.pele);
  }
}

function desenharRecepcionista(p: Pincel, q: number): void {
  // Robô de cabeça-tela atrás do balcão
  const corpo = '#c9cde0';
  const sombra = '#8b90a8';
  p.px(9, 18, 22, 22, corpo);
  p.px(25, 18, 6, 22, sombra);
  p.px(4, 20, 6, 12, sombra);
  p.px(30, 20, 6, 12, sombra);
  // Cabeça com tela
  p.px(8, 2, 24, 16, corpo);
  p.px(10, 4, 20, 12, '#05070f');
  if (q === 0) {
    p.px(14, 7, 3, 2, COR.ciano);
    p.px(23, 7, 3, 2, COR.ciano);
  } else {
    p.px(14, 8, 3, 1, COR.ciano);
    p.px(23, 8, 3, 1, COR.ciano);
  }
  p.px(15, 12, 10, 1, COR.ciano);
  p.px(14, 11, 1, 1, COR.ciano);
  p.px(25, 11, 1, 1, COR.ciano);
  // Headset
  p.px(6, 4, 2, 10, COR.metal);
  p.linha(7, 13, 12, 16, COR.metal);
  // Balcão
  p.px(0, 36, 40, 24, '#1a2040');
  p.px(0, 34, 40, 3, misturar('#1a2040', COR.metalClaro, 0.5));
  p.px(0, 34, 40, 1, COR.ciano);
  desenharLogoMegaBrain(p, 20, 48, 7);
}

function desenharChatbot(p: Pincel, q: number): void {
  const corpo = '#3b4a7a';
  // Rodinhas
  p.px(6, 54, 6, 6, '#15161f');
  p.px(20, 54, 6, 6, '#15161f');
  // Corpo de totem
  p.px(4, 22, 24, 33, corpo);
  p.px(22, 22, 6, 33, sombrear(corpo, 0.3));
  p.px(8, 30, 16, 3, COR.metal);
  for (let yy = 38; yy < 52; yy += 4) p.px(8, yy, 16, 2, sombrear(corpo, 0.35));
  // Cabeça-monitor com balão de fala travado
  p.px(2, 4, 28, 18, COR.metal);
  p.px(4, 6, 24, 14, '#05070f');
  if (q === 0) {
    p.texto('POSSO', 6, 7, COR.janelaFria, 1);
    p.texto('AJUD?', 6, 13, COR.janelaFria, 1);
  } else {
    p.texto('POSSO', 6, 7, COR.janelaFria, 1);
    p.texto('POSS', 6, 13, COR.janelaFria, 1);
  }
  // Antena
  p.px(15, 0, 2, 4, COR.metal);
  p.ponto(15, 0, COR.vermelho);
}

export function gerarTexturasNpc(cena: Phaser.Scene, aparencia: AparenciaNpc): void {
  const largura = aparencia === 'recepcionista' ? 40 : 32;
  folhaPixel(cena, texNpc(aparencia), largura, 60, 2, (p, q) => {
    if (aparencia === 'recepcionista') desenharRecepcionista(p, q);
    else if (aparencia === 'chatbot') desenharChatbot(p, q);
    else desenharHumano(p, HUMANOS[aparencia], q);
  });
  if (!cena.anims.exists(animNpc(aparencia))) {
    cena.anims.create({
      key: animNpc(aparencia),
      frames: cena.anims.generateFrameNumbers(texNpc(aparencia), { frames: [0, 0, 0, 1] }),
      frameRate: 3,
      repeat: -1,
    });
  }
}

/** Retrato (cabeça e ombros) para o avatar do diálogo. */
export function retratoNpc(aparencia: AparenciaNpc): string {
  return retratoDataUrl(26, 22, 3, (p) => {
    p.px(0, 0, 26, 22, COR.noite1);
    if (aparencia === 'recepcionista') {
      p.ctx.save();
      p.ctx.translate(-7, 2);
      desenharRecepcionista(p, 0);
      p.ctx.restore();
    } else if (aparencia === 'chatbot') {
      p.ctx.save();
      p.ctx.translate(-3, 1);
      desenharChatbot(p, 0);
      p.ctx.restore();
    } else {
      desenharHumano(p, HUMANOS[aparencia], 0, -4, 1);
    }
  });
}

/** Drone Captcha: bola com olho vermelho, hélices e placa "?" embaixo. Quadros 0/1 = hélices. */
export function gerarTexturaDrone(cena: Phaser.Scene): void {
  folhaPixel(cena, TEX_DRONE_CAPTCHA, 28, 22, 2, (p, q) => {
    const helice = q === 0 ? [2, 10] : [5, 7];
    p.px(helice[0], 1, helice[1], 1, COR.metalClaro);
    p.px(28 - helice[0] - helice[1], 1, helice[1], 1, COR.metalClaro);
    p.px(6, 2, 2, 3, COR.metal);
    p.px(20, 2, 2, 3, COR.metal);
    p.disco(14, 9, 6, '#2b2f45');
    p.disco(14, 8, 5, '#3a3f5c');
    p.disco(14, 9, 2, COR.vermelho);
    p.ponto(13, 8, '#ffd0d6');
    p.px(10, 15, 8, 6, COR.branco);
    p.texto('?', 12, 15, COR.vermelho, 1);
  });
  if (!cena.anims.exists(`${TEX_DRONE_CAPTCHA}-voa`)) {
    cena.anims.create({
      key: `${TEX_DRONE_CAPTCHA}-voa`,
      frames: cena.anims.generateFrameNumbers(TEX_DRONE_CAPTCHA, { frames: [0, 1] }),
      frameRate: 12,
      repeat: -1,
    });
  }
}
