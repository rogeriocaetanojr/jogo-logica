import Phaser from 'phaser';
import { COR, CORES_CONTEINER, Pincel, folhaPixel, hash3, retratoDataUrl, sombrear, texturaPixel, texturaSuave } from './ArtePorto';

/**
 * Sprites em pixel art do Porto Bugado (personagens de apoio, inimigos, itens e efeitos).
 * Todas as texturas são geradas uma única vez por sessão e reaproveitadas entre as áreas.
 */

const K = COR.contorno;

/* =========================================================================
 * DESENHOS REUTILIZÁVEIS (também usados nos retratos do comunicador)
 * ========================================================================= */

const BOIA_BASE = [
  '....KK....',
  '....KL....',
  '..KKKKKK..',
  '.KDDDDDDK.',
  '.KDEDDEDK.',
  '.KDDMMDDK.',
  'KRRRRRRRRK',
  'KWWWWWWWWK',
  'KRRRRRRRRK',
  '.KWWWWWWK.',
  '..KRRRRK..',
  '...KKKK...',
];
const BOIA_PALETA: Record<string, string> = {
  K,
  L: COR.telaBoia,
  D: '#10202A',
  E: COR.telaBoia,
  e: '#2A6A78',
  M: COR.telaBoia,
  A: '#FF4A3A',
  R: '#D8402E',
  W: COR.branco,
};

function desenharBoia(p: Pincel, quadro: number, x = 0, y = 0): void {
  const linhas = [...BOIA_BASE];
  if (quadro === 1) linhas[4] = '.KDeDDeDK.';
  if (quadro === 2) linhas[5] = '.KDMMMMDK.';
  if (quadro === 3) {
    linhas[1] = '....KA....';
    linhas[3] = '.KDEDDEDK.';
    linhas[5] = '.KDDMMDDK.';
  }
  p.sprite(linhas, BOIA_PALETA, x, y);
}

function desenharCapitao(p: Pincel, quadro: number, x = 0, y = 0): void {
  const azul = '#2B3A5A';
  const azulC = '#3E5480';
  const metal = '#8A7A6A';
  const metalE = '#5A4E44';
  const ouro = COR.contAmarelo;
  // Quepe
  p.px(x + 3, y + 1, 10, 3, COR.branco);
  p.px(x + 4, y + 0, 8, 1, COR.branco);
  p.px(x + 2, y + 4, 12, 1, K);
  p.px(x + 7, y + 2, 2, 1, ouro);
  p.ponto(x + 7, y + 3, ouro);
  // Cabeça enferrujada
  p.px(x + 3, y + 5, 10, 7, metal);
  p.px(x + 3, y + 11, 10, 1, metalE);
  p.ponto(x + 4, y + 6, '#A0522D');
  p.ponto(x + 11, y + 10, '#A0522D');
  // Olhos-lâmpada
  p.px(x + 5, y + 7, 2, 2, COR.advertencia);
  p.px(x + 9, y + 7, 2, 2, COR.advertencia);
  p.ponto(x + 5, y + 7, '#FFF1A8');
  p.ponto(x + 9, y + 7, '#FFF1A8');
  // Bigode/grade
  const boca = quadro === 1 ? 2 : 1;
  p.px(x + 4, y + 10, 8, boca, COR.branco);
  p.ponto(x + 4, y + 9, COR.branco);
  p.ponto(x + 11, y + 9, COR.branco);
  // Corpo (casaco de capitão)
  p.px(x + 2, y + 12, 12, 8, azul);
  p.px(x + 2, y + 12, 12, 1, azulC);
  p.px(x + 7, y + 13, 2, 7, azulC);
  p.ponto(x + 6, y + 14, ouro);
  p.ponto(x + 6, y + 17, ouro);
  p.ponto(x + 9, y + 14, ouro);
  p.ponto(x + 9, y + 17, ouro);
  // Braços
  p.px(x + 0, y + 13, 2, 6, azul);
  p.px(x + 14, y + 13, 2, 6, azul);
  p.px(x + 0, y + 19, 2, 1, metal);
  p.px(x + 14, y + 19, 2, 1, metal);
  // Pernas
  p.px(x + 4, y + 20, 3, 3, metalE);
  p.px(x + 9, y + 20, 3, 3, metalE);
  p.px(x + 3, y + 23, 4, 1, K);
  p.px(x + 9, y + 23, 4, 1, K);
}

function desenharCraca(p: Pincel, quadro: number, x = 0, y = 0): void {
  const corpo = '#4E6266';
  const corpoC = '#6E8488';
  p.elipse(x + 7, y + 7, 6, 4, corpo);
  p.px(x + 2, y + 6, 10, 1, corpoC);
  // Cracas
  for (const [cx, cy] of [
    [3, 4],
    [6, 3],
    [10, 4],
    [12, 7],
    [2, 8],
    [9, 10],
  ]) {
    p.ponto(x + cx, y + cy, '#D8D4C8');
    p.ponto(x + cx, y + cy + 1, '#A8A49A');
  }
  // Olho grande
  const ox = quadro === 1 ? 7 : 6;
  p.disco(x + 7, y + 7, 2, COR.advertencia);
  p.ponto(x + ox, y + 7, K);
  p.ponto(x + ox + 1, y + 7, K);
  // Patinhas
  p.ponto(x + 3, y + 11, corpoC);
  p.ponto(x + 11, y + 11, corpoC);
  p.px(x + 12, y + 9, 2, 1, corpoC);
}

function desenharPortus(p: Pincel, quadro: number, x = 0, y = 0): void {
  const c1 = COR.telaBoia;
  const c2 = '#2A8A9A';
  const c3 = '#A8F4FF';
  const desloc = quadro === 2 ? 1 : 0;
  // Rosto holográfico: círculo com linhas de varredura
  for (let yy = 0; yy < 15; yy++) {
    if ((yy + quadro) % 3 === 0) continue;
    const dy = yy - 7;
    const meia = Math.floor(Math.sqrt(Math.max(0, 49 - dy * dy)));
    p.px(x + 9 - meia + (yy === 5 ? desloc : 0), y + yy, meia * 2 + 1, 1, yy % 2 === 0 ? c2 : c1);
  }
  // Olho central e "boca" de dados
  p.px(x + 6, y + 5, 7, 2, c3);
  p.px(x + 8, y + 5, 3, 2, '#FFFFFF');
  p.px(x + 6, y + 10, 7, 1, c3);
  if (quadro !== 1) p.px(x + 8, y + 11, 3, 1, c3);
}

function desenharMegaBrain(p: Pincel, quadro: number, x = 0, y = 0): void {
  // Cérebro digital verde-néon (usado apenas no retrato das transmissões hostis)
  const v = COR.virus;
  const vE = '#1E7A44';
  p.elipse(x + 8, y + 7, 7, 6, vE);
  p.elipse(x + 8, y + 6, 6, 5, v);
  p.linha(x + 8, y + 1, x + 8, y + 11, vE);
  p.linha(x + 4, y + 4, x + 7, y + 6, vE);
  p.linha(x + 12, y + 4, x + 9, y + 7, vE);
  p.ponto(x + 5, y + 8, quadro === 1 ? v : K);
  p.ponto(x + 11, y + 8, quadro === 1 ? v : K);
  p.px(x + 6, y + 13, 5, 1, v);
}

/** Retratos (data URL) usados como avatar no comunicador DOM. */
export interface RetratosPorto {
  boia: string;
  capitao: string;
  craca: string;
  portus: string;
  megabrain: string;
  estivador: string;
}

let retratosCache: RetratosPorto | null = null;

export function obterRetratos(): RetratosPorto {
  if (retratosCache) return retratosCache;
  retratosCache = {
    boia: retratoDataUrl(14, 14, 4, (p) => desenharBoia(p, 2, 2, 1)),
    capitao: retratoDataUrl(16, 16, 3, (p) => desenharCapitao(p, 1, 0, 0)),
    craca: retratoDataUrl(16, 14, 3, (p) => desenharCraca(p, 0, 1, 1)),
    portus: retratoDataUrl(20, 16, 3, (p) => desenharPortus(p, 0, 1, 0)),
    megabrain: retratoDataUrl(17, 15, 3, (p) => desenharMegaBrain(p, 0, 0, 0)),
    estivador: retratoDataUrl(16, 14, 3, (p) => desenharEstivador(p, 4, 0, 0)),
  };
  return retratosCache;
}

/** HTML do avatar para o comunicador (imagem pixelada centralizada). */
export function avatarHtml(dataUrl: string, rotulo: string): string {
  return `<img src="${dataUrl}" alt="${rotulo}" style="width:72px;height:auto;image-rendering:pixelated;display:block;margin:auto" />`;
}

function desenharEstivador(p: Pincel, quadro: number, x = 0, y = 0): void {
  const livre = quadro === 4;
  const capacete = COR.advertencia;
  const rosto = '#7A7672';
  const colete = COR.fogoLaranja;
  const refletivo = '#E8E6DC';
  const olho = livre ? COR.telaBoia : COR.virus;
  const caixa = '#8A5A3A';
  // Capacete
  p.px(x + 4, y + 0, 8, 2, capacete);
  p.px(x + 3, y + 2, 10, 1, capacete);
  p.px(x + 4, y + 0, 8, 1, '#FFF1A8');
  // Cabeça
  p.px(x + 4, y + 3, 8, 5, rosto);
  p.px(x + 5, y + 4, 2, 2, olho);
  p.px(x + 9, y + 4, 2, 2, olho);
  p.px(x + 6, y + 7, 4, 1, K);
  // Tronco com colete refletivo
  p.px(x + 3, y + 8, 10, 7, colete);
  p.px(x + 3, y + 11, 10, 1, refletivo);
  p.px(x + 7, y + 8, 2, 7, '#C86A1A');
  // Pernas
  p.px(x + 4, y + 15, 3, 5, '#3A4A5A');
  p.px(x + 9, y + 15, 3, 5, '#3A4A5A');
  p.px(x + 3, y + 20, 4, 1, K);
  p.px(x + 9, y + 20, 4, 1, K);
  if (livre) {
    // Acenando, caixa no chão
    p.px(x + 13, y + 3, 2, 6, colete);
    p.px(x + 13, y + 2, 2, 1, rosto);
    p.px(x + 1, y + 9, 2, 5, colete);
    return;
  }
  // Ciclo "carregar...": caixa sobe e desce
  const alturas = [12, 9, 6, 9];
  const cy = y + alturas[quadro % 4];
  p.px(x + 1, cy + 2, 2, 4, colete);
  p.px(x + 13, cy + 2, 2, 4, colete);
  p.px(x + 2, cy - 2, 12, 5, caixa);
  p.px(x + 2, cy - 2, 12, 1, '#B07A4A');
  p.px(x + 7, cy - 2, 2, 5, '#6A4028');
}

/* =========================================================================
 * GERAÇÃO DE TODAS AS TEXTURAS DE SPRITES
 * ========================================================================= */

export function gerarSpritesPorto(cena: Phaser.Scene): void {
  gerarPersonagensApoio(cena);
  gerarInimigos(cena);
  gerarItens(cena);
  gerarProjeteis(cena);
  gerarConsoles(cena);
  gerarConteineres(cena);
  gerarEfeitos(cena);
  gerarAnimacoes(cena);
}

function gerarPersonagensApoio(cena: Phaser.Scene): void {
  folhaPixel(cena, 'pb-boia', 10, 12, 4, (p, q) => desenharBoia(p, q));
  folhaPixel(cena, 'pb-capitao', 16, 24, 2, (p, q) => desenharCapitao(p, q));
  folhaPixel(cena, 'pb-estivador', 16, 21, 5, (p, q) => desenharEstivador(p, q));
  folhaPixel(cena, 'pb-craca', 14, 12, 2, (p, q) => desenharCraca(p, q));
  folhaPixel(cena, 'pb-portus', 19, 15, 4, (p, q) => desenharPortus(p, q));

  // Projetor do holograma do PORTUS (pedestal de terminal)
  texturaPixel(cena, 'pb-pedestal-portus', 14, 12, (p) => {
    p.px(4, 4, 6, 8, '#3A3638');
    p.px(1, 0, 12, 4, '#4A4648');
    p.px(2, 1, 10, 2, '#1A2A30');
    p.px(3, 1, 8, 1, COR.telaBoia);
    p.px(5, 6, 4, 1, COR.telaBoia);
    p.px(2, 11, 10, 1, K);
  });
}

function gerarInimigos(cena: Phaser.Scene): void {
  // Gaivírus: gaivota-drone com olho do MegaBrain
  const palGaiv = { W: '#CFCAC0', K: '#2A2426', G: COR.virus, M: '#6A6662' };
  const gaiv = [
    ['K...........K', 'WK.........KW', '.WWK.....KWW.', '...WWWGWWW...', '....KWWWK....', '.....KMK.....'],
    ['.............', '....KWWWK....', '...WWWGWWW...', '.WWK.....KWW.', 'WK...KMK...KW', 'K...........K'],
  ];
  folhaPixel(cena, 'pb-gaivirus', 13, 6, 2, (p, q) => p.sprite(gaiv[q], palGaiv, 0, 0));

  // Siri-Script: siri vermelho que anda de lado, garra-escudo voltada para frente (direita)
  const palSiri = { R: COR.contVermelho, h: '#C85A42', r: '#7A2A20', K, G: COR.virus };
  const siriTopo = [
    '.......G.G...',
    '.......K.K.RR',
    '...........RK',
    '..RRRRRRR.RR.',
    '.RRRRhhRRRRR.',
    'RRRRRRRRRRRR.',
    '.RrRRRRRRrR..',
  ];
  const siriPernas = [
    ['.K.K.K.K.K...', 'K..K..K..K...'],
    ['K.K.K.K.K.K..', '.K..K..K..K..'],
  ];
  folhaPixel(cena, 'pb-siri', 13, 9, 2, (p, q) => p.sprite([...siriTopo, ...siriPernas[q]], palSiri, 0, 0));

  // Empilhadeira Zumbi (frente/garfos à direita, motor traseiro à esquerda)
  folhaPixel(cena, 'pb-empilhadeira', 28, 20, 2, (p, q) => {
    const am = COR.advertencia;
    const amE = '#B88A1A';
    // Contrapeso e motor traseiro (ponto fraco)
    p.px(0, 8, 6, 8, amE);
    p.px(0, 9, 3, 5, '#2A2422');
    p.ponto(1, 10, COR.virus);
    p.ponto(1, 12, COR.virus);
    p.ponto(2, 11, '#1E7A44');
    // Chassi
    p.px(4, 10, 16, 6, am);
    p.px(4, 10, 16, 1, '#FFF1A8');
    p.px(4, 15, 16, 1, amE);
    // Gaiola da cabine
    p.px(7, 2, 1, 8, '#3A3638');
    p.px(16, 2, 1, 8, '#3A3638');
    p.px(6, 2, 12, 1, '#3A3638');
    p.px(9, 6, 5, 4, '#2A2422');
    // Faróis-olhos zumbis
    p.px(18, 8, 2, 2, COR.virus);
    // Mastro
    p.px(21, 3, 2, 15, '#4A4648');
    p.ponto(21, 3, '#8A847C');
    // Garfos
    const gy = q === 1 ? 7 : 16;
    p.px(21, gy - 2, 3, 4, '#5A5658');
    p.px(23, gy + 1, 5, 1, '#8A847C');
    p.px(23, gy + 2, 5, 1, '#5A5658');
    // Rodas
    p.disco(6, 16, 3, '#141212');
    p.ponto(6, 16, '#6A6662');
    p.disco(18, 17, 2, '#141212');
    p.ponto(18, 17, '#6A6662');
  });

  // Água-Vírus: água-viva de sacolas plásticas
  const palAgua = { W: '#D8D4C8', w: '#A8A49A', G: COR.virus, K };
  const aguaTopo = [
    '..W.....W..',
    '.W.W...W.W.',
    '.W..WWW..W.',
    '..WWWWWWW..',
    '.WWWWWWWWW.',
    'WWGKWWWGKWW',
    'WWwWWWWWwWW',
    '.WWwwwwwWW.',
  ];
  const aguaTentaculos = [
    ['..w.W.W.w..', '.w..W.W..w.', '.w.W...W.w.', '..w.W.W.w..', '.w..W...W..', '..W.....W..'],
    ['.w..W.W..w.', '..w.W.W.w..', '..w..W..w..', '.w.W...W.w.', '..w.W.W..w.', '.w.....W...'],
  ];
  folhaPixel(cena, 'pb-agua-virus', 11, 14, 2, (p, q) => p.sprite([...aguaTopo, ...aguaTentaculos[q]], palAgua, 0, 0));

  // Mancha Viva: poça de óleo que se ergue (0 = poça, 1 = subindo, 2 = de pé)
  folhaPixel(cena, 'pb-mancha', 20, 14, 3, (p, q) => {
    const alturas = [3, 7, 12];
    const h = alturas[q];
    const topo = 13 - h;
    p.elipse(10, 13 - Math.floor(h / 2), 9, Math.max(1, Math.floor(h / 2)), '#141012');
    p.px(1, 12, 18, 2, '#141012');
    const brilhos = [COR.oleoRoxo, COR.oleoCiano, COR.oleoAmarelo];
    for (let i = 0; i < 6; i++) {
      const bx = 3 + i * 3;
      const by = topo + 1 + ((i * 2) % Math.max(1, h - 1));
      p.ponto(bx, Math.min(13, by), brilhos[i % 3]);
    }
    if (q > 0) {
      const oy = topo + (q === 2 ? 3 : 1);
      p.ponto(7, oy, COR.virus);
      p.ponto(12, oy, COR.virus);
    }
  });

  // Fumacê: nuvem de fumaça com olhos
  folhaPixel(cena, 'pb-fumace', 22, 16, 2, (p, q) => {
    const base = '#2E2826';
    const luz = '#4A403B';
    const discos = q === 0 ? [[6, 9, 5], [11, 6, 6], [16, 9, 5], [11, 11, 5]] : [[5, 9, 5], [11, 7, 6], [17, 8, 4], [12, 11, 5]];
    for (const [cx, cy, r] of discos) p.disco(cx, cy, r, luz);
    for (const [cx, cy, r] of discos) p.disco(cx + 1, cy + 1, r - 1, base);
    // Olhos bravos
    p.px(7, 7, 3, 3, COR.branco);
    p.px(13, 7, 3, 3, COR.branco);
    p.ponto(8 + q, 8, COR.virus);
    p.ponto(14 + q, 8, COR.virus);
    p.linha(6, 5, 9, 6, K);
    p.linha(16, 5, 13, 6, K);
  });

  // Barril Bugado (4 quadros rolando)
  folhaPixel(cena, 'pb-barril', 11, 11, 4, (p, q) => {
    p.disco(5, 5, 5, '#1E4070');
    p.disco(5, 5, 4, COR.contAzul);
    const ang = (q / 4) * Math.PI;
    const dx = Math.round(Math.cos(ang) * 4);
    const dy = Math.round(Math.sin(ang) * 4);
    p.linha(5 - dx, 5 - dy, 5 + dx, 5 + dy, '#8A4A2A');
    p.ponto(5, 5, COR.virus);
    p.ponto(4 + (q % 2), 4, '#4A7AB8');
  });

  // Garra de guindaste (0 = aberta, 1 = fechada)
  folhaPixel(cena, 'pb-garra', 16, 13, 2, (p, q) => {
    p.px(5, 0, 6, 3, COR.advertencia);
    p.px(5, 0, 6, 1, '#FFF1A8');
    p.ponto(7, 1, '#C8301E');
    p.px(6, 3, 4, 2, '#5A5658');
    const ab = q === 0 ? 2 : 0;
    p.linha(6, 5, 2 - ab, 10, '#8A847C');
    p.linha(9, 5, 13 + ab, 10, '#8A847C');
    p.linha(7, 5, 7, 11, '#8A847C');
    p.linha(8, 5, 8, 11, '#5A5658');
    p.px(1 - ab + 1, 10, 2, 2, '#5A5658');
    p.px(12 + ab, 10, 2, 2, '#5A5658');
  });

  // Janela Pop-up (anúncio falso do MegaBrain)
  folhaPixel(cena, 'pb-janela', 64, 40, 2, (p, q) => {
    p.px(0, 0, 64, 40, K);
    p.px(1, 1, 62, 38, '#D8D4C8');
    p.px(1, 1, 62, 8, COR.contAzul);
    p.texto('ALERTA!!', 4, 3, '#FFFFFF');
    // Botão X (alvo)
    p.px(54, 1, 9, 8, '#C8301E');
    p.texto('X', 57, 3, '#FFFFFF');
    p.textoCentro('VOCE GANHOU', 32, 13, K);
    p.textoCentro('UM CONTEINER!', 32, 20, K);
    // Botão falso "RESGATAR"
    const corBotao = q === 0 ? COR.contVerde : '#5AAA67';
    p.px(14, 28, 36, 8, corBotao);
    p.moldura(14, 28, 36, 8, K);
    p.textoCentro('RESGATAR', 32, 30, '#FFFFFF');
  });
}

function gerarItens(cena: Phaser.Scene): void {
  // Lacre de contêiner (moeda da fase), 4 quadros girando
  folhaPixel(cena, 'pb-lacre', 7, 10, 4, (p, q) => {
    const larg = [5, 3, 1, 3][q];
    const x0 = 3 - Math.floor(larg / 2);
    p.px(x0, 0, larg, 1, '#B88A1A');
    p.px(x0, 1, larg, 6, COR.advertencia);
    p.px(x0, 7, larg, 1, '#B88A1A');
    if (larg > 2) p.ponto(x0 + 1, 2, '#FFF1A8');
    if (larg >= 3) p.ponto(3, 4, K);
    p.px(3, 8, 1, 2, '#8A847C');
  });

  texturaPixel(cena, 'pb-hidrante', 9, 13, (p) => {
    p.px(3, 0, 3, 2, '#C8301E');
    p.px(2, 2, 5, 2, '#E0503A');
    p.px(2, 4, 5, 8, '#C8301E');
    p.px(0, 6, 2, 3, '#8A2014');
    p.px(7, 6, 2, 3, '#8A2014');
    p.px(3, 5, 1, 6, '#E0503A');
    p.px(1, 12, 7, 1, '#5A1A10');
  });

  texturaPixel(cena, 'pb-caixa-extintor', 11, 15, (p) => {
    p.px(0, 0, 11, 15, '#8A2014');
    p.px(1, 1, 9, 13, '#C8301E');
    p.px(2, 2, 7, 11, '#3A2A2A');
    p.px(4, 4, 3, 8, '#E0503A');
    p.px(4, 3, 3, 1, K);
    p.ponto(5, 6, COR.branco);
    p.texto('1', 8, 9, COR.branco);
  });

  texturaPixel(cena, 'pb-kit', 8, 8, (p) => {
    p.px(0, 1, 8, 7, '#1A4A52');
    p.px(1, 2, 6, 5, COR.telaBoia);
    p.px(3, 2, 2, 5, '#FFFFFF');
    p.px(1, 4, 6, 1, '#FFFFFF');
    p.px(2, 0, 4, 1, '#1A4A52');
  });

  texturaPixel(cena, 'pb-canhao-item', 17, 10, (p) => {
    p.px(0, 2, 10, 6, '#C8301E');
    p.px(0, 2, 10, 1, '#E0503A');
    p.px(10, 3, 6, 3, '#8A847C');
    p.px(15, 2, 2, 5, '#5A5658');
    p.px(2, 8, 3, 2, '#3A3638');
    p.disco(4, 5, 1, COR.espuma);
    p.ponto(16, 4, COR.espuma);
  });

  texturaPixel(cena, 'pb-extintor-item', 7, 13, (p) => {
    p.px(1, 3, 5, 10, '#C8301E');
    p.px(1, 3, 5, 1, '#E0503A');
    p.px(2, 1, 3, 2, K);
    p.px(4, 0, 3, 1, K);
    p.px(2, 6, 3, 3, COR.branco);
  });

  // Mancha Viva seca pela espuma (vira plataforma)
  texturaPixel(cena, 'pb-mancha-seca', 20, 6, (p) => {
    p.elipse(10, 3, 9, 2, '#5A5258');
    p.px(1, 3, 18, 3, '#4A4248');
    p.px(2, 1, 16, 1, '#8A8288');
    p.ponto(5, 2, COR.espuma);
    p.ponto(13, 2, COR.espuma);
  });

  // Plataforma de espuma (2 quadros: normal e piscando antes de sumir)
  folhaPixel(cena, 'pb-plat-espuma', 26, 8, 2, (p, q) => {
    const c1 = q === 0 ? COR.espuma : '#FFFFFF';
    const c2 = q === 0 ? COR.espumaSombra : '#D8D4C8';
    for (const [cx, r] of [
      [4, 3],
      [10, 4],
      [16, 4],
      [22, 3],
    ]) {
      p.disco(cx, 4, r, c2);
      p.disco(cx, 3, r - 1, c1);
    }
    p.px(1, 5, 24, 2, c2);
  });
}

function gerarProjeteis(cena: Phaser.Scene): void {
  // Patch: remendo de código brilhante
  texturaPixel(cena, 'pb-patch', 8, 5, (p) => {
    p.px(1, 0, 6, 5, '#1E8A9A');
    p.px(0, 1, 8, 3, COR.telaBoia);
    p.px(3, 1, 2, 3, '#FFFFFF');
    p.px(2, 2, 4, 1, '#FFFFFF');
  });

  texturaPixel(cena, 'pb-bola-espuma', 6, 6, (p) => {
    p.disco(3, 3, 2, COR.espumaSombra);
    p.disco(2, 2, 2, COR.espuma);
    p.ponto(2, 1, '#FFFFFF');
  });

  folhaPixel(cena, 'pb-chave', 4, 5, 2, (p, q) => {
    const linhas = q === 0 ? ['.GG.', '.G..', 'G...', '.G..', '.GG.'] : ['.GG.', '..G.', '...G', '..G.', '.GG.'];
    p.sprite(linhas, { G: COR.virus }, 0, 0);
  });

  texturaPixel(cena, 'pb-borracha', 5, 5, (p) => {
    p.disco(2, 2, 2, '#1A1212');
    p.ponto(1, 1, COR.fogoLaranja);
    p.ponto(3, 2, COR.fogoBrasa);
    p.ponto(2, 3, COR.fogoChama);
  });

  texturaPixel(cena, 'pb-gota-oleo', 4, 6, (p) => {
    p.px(1, 0, 2, 2, '#141012');
    p.px(0, 2, 4, 3, '#141012');
    p.px(1, 5, 2, 1, '#141012');
    p.ponto(1, 2, COR.oleoRoxo);
    p.ponto(2, 3, COR.oleoCiano);
  });

  texturaPixel(cena, 'pb-pixel', 1, 1, (p) => p.ponto(0, 0, '#FFFFFF'));
}

/** Consoles de controle (terminais dos desafios) com a cor de cada sistema. */
function gerarConsoles(cena: Phaser.Scene): void {
  const variantes: Record<string, string> = {
    amarelo: COR.advertencia,
    azul: COR.telaBoia,
    vermelho: '#FF5A4A',
    laranja: COR.fogoLaranja,
    verde: COR.virus,
  };
  for (const [nome, cor] of Object.entries(variantes)) {
    folhaPixel(cena, `pb-console-${nome}`, 14, 20, 2, (p, q) => {
      p.px(2, 8, 10, 12, '#3A3638');
      p.px(2, 8, 10, 1, '#5A5658');
      p.px(0, 0, 14, 9, '#4A4648');
      p.px(1, 1, 12, 7, '#0E1416');
      for (let yy = 2; yy < 7; yy += 2) {
        const w = 3 + ((yy * 3 + q * 2) % 7);
        p.px(2, yy, w, 1, cor);
      }
      if (q === 1) p.px(11, 6, 1, 1, cor);
      p.px(4, 11, 6, 2, '#2A2628');
      p.ponto(5, 11, cor);
      p.ponto(8, 11, COR.advertencia);
      p.px(1, 19, 12, 1, K);
    });
  }
}

/** Contêineres de jogo (32x16 pixels de arte = 128x64 na tela). */
function gerarConteineres(cena: Phaser.Scene): void {
  const desenhar = (p: Pincel, cor: string, rotulo?: string) => {
    const esc = sombrear(cor, 0.3);
    const esc2 = sombrear(cor, 0.5);
    p.px(0, 0, 32, 16, cor);
    for (let x = 2; x < 30; x += 2) p.px(x, 2, 1, 12, esc);
    p.px(0, 0, 32, 2, esc2);
    p.px(0, 14, 32, 2, esc2);
    p.px(0, 0, 2, 16, esc2);
    p.px(30, 0, 2, 16, esc2);
    p.px(0, 0, 32, 1, sombrear(cor, -0.25));
    // Portas com travas na extremidade direita
    p.px(25, 2, 1, 12, esc2);
    p.px(27, 4, 1, 8, '#8A847C');
    p.px(29, 4, 1, 8, '#8A847C');
    // Cantoneiras
    for (const [cx, cy] of [
      [0, 0],
      [30, 0],
      [0, 14],
      [30, 14],
    ]) {
      p.px(cx, cy, 2, 2, '#2A2426');
    }
    if (rotulo) {
      p.px(6, 5, larguraRotulo(rotulo) + 2, 7, '#F2EEE2');
      p.texto(rotulo, 7, 6, '#C8301E');
    }
  };
  CORES_CONTEINER.slice(0, 4).forEach((cor, i) => {
    texturaPixel(cena, `pb-cont-${i}`, 32, 16, (p) => desenhar(p, cor));
  });
  // Contêiner especial do Canhão de Espuma
  texturaPixel(cena, 'pb-cont-canhao', 32, 16, (p) => {
    desenhar(p, '#C8C2B4');
    p.px(2, 2, 22, 2, '#C8301E');
    p.px(2, 12, 22, 2, '#C8301E');
    p.px(5, 5, 19, 7, '#F2EEE2');
    p.texto('ESPUMA', 6, 6, '#C8301E');
  });
}

function larguraRotulo(rotulo: string): number {
  return rotulo.length * 4 - 1;
}

function gerarEfeitos(cena: Phaser.Scene): void {
  // Chamas animadas (algoritmo da cena de referência, com laço perfeito em 10 quadros)
  const tamanhosChama: Array<[string, number, number, number]> = [
    ['pb-fogo-p', 10, 16, 1.0],
    ['pb-fogo-m', 18, 24, 2.0],
    ['pb-fogo-g', 30, 34, 3.0],
    ['pb-fogo-faixa', 48, 20, 4.5],
  ];
  for (const [chave, w, h, semente] of tamanhosChama) {
    folhaPixel(cena, chave, w, h, 10, (p, q) => desenharChamas(p, w, h, semente, q, 10, chave === 'pb-fogo-faixa'));
  }

  // Discos de fumaça (borda iluminada pelo fogo ou fumaça comum)
  for (const r of [5, 9, 14]) {
    const s = r * 2 + 3;
    texturaPixel(cena, `pb-fumaca-${r}`, s, s, (p) => {
      p.disco(r + 1, r + 1, r, COR.fuligem);
      if (r > 2) {
        p.disco(r, r, r - 2, '#4A403B');
        p.disco(r + 1, r + 1, r - 2, COR.fuligem);
      }
    });
    texturaPixel(cena, `pb-fumaca-luz-${r}`, s, s, (p) => {
      p.disco(r + 1, r + 1, r, COR.fuligem);
      if (r > 2) {
        p.disco(r + 2, r + 2, r - 2, COR.fumacaIluminada);
        p.disco(r + 1, r + 1, r - 2, COR.fuligem);
      }
    });
  }

  // Brilho radial suave para luzes aditivas
  texturaSuave(cena, 'pb-brilho', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });

  // Explosão (6 quadros)
  folhaPixel(cena, 'pb-explosao', 24, 24, 6, (p, q) => {
    const r = 3 + q * 2;
    const cores = [COR.fogoNucleo, COR.fogoChama, COR.fogoLaranja, COR.fogoBrasa, '#4A403B', COR.fuligem];
    if (q < 4) {
      p.disco(12, 12, Math.min(11, r + 2), cores[Math.min(5, q + 2)]);
      p.disco(12, 12, Math.min(10, r), cores[Math.min(5, q + 1)]);
      p.disco(12, 12, Math.max(1, r - 3), cores[q]);
    } else {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + q;
        p.disco(12 + Math.cos(a) * (r - 3), 12 + Math.sin(a) * (r - 3), 2, cores[q]);
      }
    }
  });

  // Vapor (espuma/água sobre fogo)
  folhaPixel(cena, 'pb-vapor', 14, 14, 4, (p, q) => {
    const r = 2 + q;
    const cor = q < 2 ? '#F2EEE2' : '#B8B4A6';
    p.disco(7, 9 - q, r, cor);
    p.disco(4, 10 - q, Math.max(1, r - 1), cor);
    p.disco(10, 10 - q, Math.max(1, r - 1), cor);
  });

  // Respingo de água contaminada
  folhaPixel(cena, 'pb-respingo', 16, 10, 4, (p, q) => {
    const cores = [COR.lodoClaro, COR.verdeLodo];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.15 + 0.7 * (i / 5));
      const d = 2 + q * 2;
      p.px(8 + Math.cos(a) * d * 1.4, 9 - Math.sin(a) * d * (q < 2 ? 1 : 0.6), 1, 2, cores[i % 2]);
    }
  });

  // Faísca de impacto
  folhaPixel(cena, 'pb-faisca', 5, 5, 3, (p, q) => {
    if (q === 0) {
      p.ponto(2, 2, '#FFFFFF');
      p.ponto(1, 2, COR.telaBoia);
      p.ponto(3, 2, COR.telaBoia);
      p.ponto(2, 1, COR.telaBoia);
      p.ponto(2, 3, COR.telaBoia);
    } else if (q === 1) {
      p.ponto(0, 2, COR.telaBoia);
      p.ponto(4, 2, COR.telaBoia);
      p.ponto(2, 0, COR.telaBoia);
      p.ponto(2, 4, COR.telaBoia);
    } else {
      p.ponto(0, 0, '#2A8A9A');
      p.ponto(4, 4, '#2A8A9A');
      p.ponto(4, 0, '#2A8A9A');
      p.ponto(0, 4, '#2A8A9A');
    }
  });
}

/**
 * Desenha um quadro de chamas: altura de cada coluna por ruído senoidal com envelope,
 * cores do núcleo (base) até a ponta (topo).
 */
function desenharChamas(p: Pincel, w: number, h: number, semente: number, quadro: number, total: number, faixa: boolean): void {
  const fase = (quadro / total) * Math.PI * 2;
  for (let x = 0; x < w; x++) {
    const env = faixa ? 0.75 + 0.25 * Math.sin((x / w) * Math.PI * 4 + semente) : Math.sin((Math.PI * (x + 0.5)) / w);
    const n =
      0.55 +
      0.25 * Math.sin(x * 0.75 + semente + fase) +
      0.2 * Math.sin(x * 1.9 - 2 * fase + semente * 2.3);
    const alt = Math.max(1, Math.round(h * n * (0.3 + 0.7 * env)));
    for (let i = 0; i < alt; i++) {
      const k = i / alt;
      if (k > 0.7 && hash3(x, i, quadro) < 0.3) continue;
      const cor =
        k < 0.18 ? COR.fogoNucleo : k < 0.42 ? COR.fogoChama : k < 0.68 ? COR.fogoLaranja : k < 0.88 ? COR.fogoBrasa : COR.fogoPonta;
      p.ponto(x, h - 1 - i, cor);
    }
  }
}

function gerarAnimacoes(cena: Phaser.Scene): void {
  const criar = (chave: string, textura: string, quadros: number[], fps: number, repetir = -1) => {
    if (cena.anims.exists(chave)) return;
    cena.anims.create({
      key: chave,
      frames: quadros.map((f) => ({ key: textura, frame: f })),
      frameRate: fps,
      repeat: repetir,
    });
  };
  for (const tam of ['p', 'm', 'g', 'faixa']) {
    criar(`pb-anim-fogo-${tam}`, `pb-fogo-${tam}`, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 14);
  }
  criar('pb-anim-gaivirus', 'pb-gaivirus', [0, 1], 6);
  criar('pb-anim-siri', 'pb-siri', [0, 1], 6);
  criar('pb-anim-agua-virus', 'pb-agua-virus', [0, 1], 3);
  criar('pb-anim-fumace', 'pb-fumace', [0, 1], 3);
  criar('pb-anim-barril', 'pb-barril', [0, 1, 2, 3], 10);
  criar('pb-anim-lacre', 'pb-lacre', [0, 1, 2, 3, 2, 1], 8);
  criar('pb-anim-estivador', 'pb-estivador', [0, 1, 2, 3], 4);
  criar('pb-anim-portus', 'pb-portus', [0, 1, 0, 2, 0, 3], 6);
  criar('pb-anim-craca', 'pb-craca', [0, 0, 0, 1], 2);
  criar('pb-anim-janela', 'pb-janela', [0, 1], 3);
  criar('pb-anim-explosao', 'pb-explosao', [0, 1, 2, 3, 4, 5], 14, 0);
  criar('pb-anim-vapor', 'pb-vapor', [0, 1, 2, 3], 8, 0);
  criar('pb-anim-respingo', 'pb-respingo', [0, 1, 2, 3], 12, 0);
  criar('pb-anim-faisca', 'pb-faisca', [0, 1, 2], 18, 0);
  criar('pb-anim-console-amarelo', 'pb-console-amarelo', [0, 1], 2);
  criar('pb-anim-console-azul', 'pb-console-azul', [0, 1], 2);
  criar('pb-anim-console-vermelho', 'pb-console-vermelho', [0, 1], 2);
  criar('pb-anim-console-laranja', 'pb-console-laranja', [0, 1], 2);
  criar('pb-anim-console-verde', 'pb-console-verde', [0, 1], 2);
}
