import Phaser from 'phaser';
import { COR, Pincel, desenharLogoMegaBrain, folhaPixel, misturar, retratoDataUrl, sombrear } from '../ArteFaseFinal';

/**
 * Pixel art dos NPCs dos andares (humanos e robôs) e do Drone Captcha.
 * Folhas de 2 quadros (respirar/piscar), viradas para a esquerda, 32x60 em arte (64x120 na tela).
 */

export type AparenciaNpc =
  | 'recepcionista'
  | 'influencer'
  | 'operadora'
  | 'chatbot'
  | 'devDemitido'
  | 'faxineiro'
  | 'estagiario'
  | 'tecnico';

type AparenciaHumana = 'influencer' | 'operadora' | 'devDemitido' | 'tecnico';

export const TEX_DRONE_CAPTCHA = 'ff-drone-captcha';

export const texNpc = (aparencia: AparenciaNpc) => `ff-npc-${aparencia}`;
export const animNpc = (aparencia: AparenciaNpc) => `ff-npc-${aparencia}-anim`;

interface VisualHumano {
  pele: string;
  peleSombra: string;
  cabelo: string;
  estilo: 'longo' | 'coque' | 'curto';
  roupa: string;
  calca: string;
  acessorio: 'celular' | 'caneca' | 'caixa' | 'tablet';
  headset?: boolean;
  barba?: boolean;
  lanterna?: boolean;
}

const HUMANOS: Record<AparenciaHumana, VisualHumano> = {
  devDemitido: {
    pele: '#d9a982',
    peleSombra: '#a8774f',
    cabelo: '#4a3326',
    estilo: 'curto',
    roupa: '#3b3f52', // moletom
    calca: '#26304d',
    acessorio: 'caixa',
    barba: true,
  },
  tecnico: {
    pele: '#b98560',
    peleSombra: '#8a5f40',
    cabelo: '#1d1d24',
    estilo: 'curto',
    roupa: '#2f5c4a', // colete
    calca: '#1c1f30',
    acessorio: 'tablet',
    lanterna: true,
  },
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
  } else if (v.estilo === 'longo') {
    p.px(x(12), y(5 + r), 3, 7, v.cabelo); // franja
    p.px(x(13), y(5 + r), 6, 1, misturar(v.cabelo, '#ffffff', 0.3));
  } else {
    p.px(x(13), y(5 + r), 6, 1, misturar(v.cabelo, '#ffffff', 0.2)); // curto
  }
  if (v.barba) {
    p.px(x(12), y(16 + r), 9, 4, v.cabelo);
    p.px(x(13), y(17 + r), 4, 1, sombrear(v.pele, 0.45)); // boca aparecendo
  }
  if (v.lanterna) {
    p.px(x(12), y(8 + r), 13, 2, '#202436');
    p.px(x(11), y(7 + r), 3, 3, COR.janelaQuente);
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
  } else if (v.acessorio === 'caixa') {
    // Caixa de papelão com os pertences: planta, caneca e um teclado
    p.px(x(6), y(26 + r), 4, 8, v.roupa);
    p.px(x(1), y(30), 15, 11, '#a07a4a');
    p.px(x(1), y(30), 15, 1, '#c49a62');
    p.px(x(1), y(35), 15, 1, sombrear('#a07a4a', 0.3));
    p.px(x(3), y(25), 2, 5, '#2f9e7a');
    p.ponto(x(2), y(24), '#52d1a0');
    p.ponto(x(5), y(24), '#52d1a0');
    p.px(x(8), y(26), 4, 4, COR.branco);
    p.px(x(12), y(28), 3, 2, COR.metal);
    p.px(x(14), y(32), 3, 3, v.pele);
  } else if (v.acessorio === 'tablet') {
    p.px(x(6), y(24 + r), 4, 10, v.roupa);
    p.px(x(2), y(28), 8, 10, '#101320');
    p.px(x(3), y(29), 6, 8, misturar('#101320', COR.ciano, 0.5));
    p.px(x(4), y(31), 4, 1, COR.ciano);
    p.px(x(4), y(33), 3, 1, COR.ciano);
    p.px(x(8), y(32), 3, 3, v.pele);
    // Faixas refletivas do colete
    p.px(x(10), y(30), 16, 2, COR.janelaQuente);
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

/** Robô faxineiro: corpo amarelo de limpeza, viseira, rodinhas e esfregão; quadro 1 = esfregão balançando. */
function desenharFaxineiro(p: Pincel, q: number): void {
  const corpo = '#d8b24a';
  const sombra = sombrear(corpo, 0.3);
  // Esfregão (atrás do corpo)
  const ponta = q === 0 ? 0 : 3;
  p.linha(10, 30, ponta + 2, 54, '#8a6a3a');
  p.px(ponta, 54, 9, 4, '#9aa0b8');
  for (let x = ponta; x < ponta + 9; x += 2) p.px(x, 58, 1, 2, '#9aa0b8');
  // Rodinhas e corpo
  p.px(10, 55, 6, 5, '#15161f');
  p.px(20, 55, 6, 5, '#15161f');
  p.px(8, 32, 20, 23, corpo);
  p.px(23, 32, 5, 23, sombra);
  for (let x = 8; x < 28; x += 6) p.px(x, 46, 3, 4, '#1b1b26'); // faixa de advertência
  p.px(8, 32, 20, 1, misturar(corpo, '#ffffff', 0.3));
  // Cabeça com viseira
  p.px(11, 20, 14, 12, corpo);
  p.px(22, 20, 3, 12, sombra);
  p.px(11, 24, 10, 4, '#05070f');
  p.px(12, 25, 3, 2, COR.ciano);
  p.px(17, 25, 3, 2, COR.ciano);
  p.px(17, 16, 2, 4, COR.metal);
  p.ponto(17, 15, q === 0 ? COR.janelaQuente : '#6b5a2a'); // luz giratória
  // Braço segurando o cabo
  p.px(6, 34, 6, 3, sombra);
}

/** Estagiário escondido atrás de uma caixa: só a cabeça e as mãos aparecem; quadro 1 = se abaixa. */
function desenharEstagiario(p: Pincel, q: number): void {
  const pele = '#e3b48c';
  const cabelo = '#6b3f2a';
  const abaixa = q === 1 ? 3 : 0;
  // Cabeça espiando por cima da caixa
  p.px(10, 18 + abaixa, 12, 12, pele);
  p.px(19, 19 + abaixa, 3, 10, sombrear(pele, 0.3));
  p.px(10, 15 + abaixa, 13, 5, cabelo);
  p.px(20, 18 + abaixa, 3, 5, cabelo);
  p.px(11, 23 + abaixa, 2, 2, '#1b1b26'); // olhos olhando de lado
  p.px(15, 23 + abaixa, 2, 2, '#1b1b26');
  p.px(11, 22 + abaixa, 2, 1, '#ffffff');
  // Crachá de estagiário pendurado na borda
  p.px(24, 34, 5, 7, COR.branco);
  p.texto('E', 25, 35, COR.vermelho, 1);
  // Caixa
  p.px(2, 30, 28, 30, '#a07a4a');
  p.px(2, 30, 28, 2, '#c49a62');
  p.px(2, 44, 28, 1, sombrear('#a07a4a', 0.3));
  p.moldura(2, 30, 28, 30, '#6e5230');
  p.textoCentro('NAO', 16, 36, '#3a2a18', 1);
  p.textoCentro('ABRA', 16, 48, '#3a2a18', 1);
  // Dedos na borda da caixa
  p.px(8, 29, 4, 2, pele);
  p.px(20, 29, 4, 2, pele);
}

function desenharNpc(p: Pincel, aparencia: AparenciaNpc, q: number, ox = 0, oy = 0): void {
  switch (aparencia) {
    case 'recepcionista':
      return comDeslocamento(p, ox, oy, () => desenharRecepcionista(p, q));
    case 'chatbot':
      return comDeslocamento(p, ox, oy, () => desenharChatbot(p, q));
    case 'faxineiro':
      return comDeslocamento(p, ox, oy, () => desenharFaxineiro(p, q));
    case 'estagiario':
      return comDeslocamento(p, ox, oy, () => desenharEstagiario(p, q));
    default:
      return desenharHumano(p, HUMANOS[aparencia], q, ox, oy);
  }
}

function comDeslocamento(p: Pincel, ox: number, oy: number, desenhar: () => void): void {
  p.ctx.save();
  p.ctx.translate(ox, oy);
  desenhar();
  p.ctx.restore();
}

export function gerarTexturasNpc(cena: Phaser.Scene, aparencia: AparenciaNpc): void {
  const largura = aparencia === 'recepcionista' ? 40 : 32;
  folhaPixel(cena, texNpc(aparencia), largura, 60, 2, (p, q) => desenharNpc(p, aparencia, q));
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
    const enquadramento: Partial<Record<AparenciaNpc, [number, number]>> = {
      recepcionista: [-7, 2],
      chatbot: [-3, 1],
      faxineiro: [-5, -14],
      estagiario: [-3, -12],
    };
    const [ox, oy] = enquadramento[aparencia] ?? [-4, 1];
    desenharNpc(p, aparencia, 0, ox, oy);
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
