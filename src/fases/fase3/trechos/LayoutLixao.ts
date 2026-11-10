import type { TipoReciclavel } from '../lixao/TiposLixao';

/**
 * Level design dos trechos de sol, névoa e chuva em dados puros (sem Phaser), para o mesmo
 * layout ser montado pelos trechos e conferido fora do jogo. x é relativo ao início do trecho;
 * `alt` é a altura do topo acima da linha do chão (px de mundo).
 *
 * Alcance do pulo (MOVIMENTO_LIXAO, gravidade 600): 225 px de altura e 416 px no mesmo nível.
 * Regras usadas aqui, com margem: degrau de até 152 px com vão de até 120 px entre bordas.
 * O caminho obrigatório nunca pede queda maior que QUEDA_SEGURA nem tomar dano: quem desce de
 * uma torre usa os degraus ou um elevador. scripts/verificarAlcanceFase3.ts confere tudo isso.
 *
 * Cada trecho tem puzzles próprios (nada de torre ou portão copiado de outro trecho):
 * sol com esteiras e prensas, névoa com frágeis e guindastes, chuva com choques e ímãs.
 *
 * Nada de paredão: nenhuma estrutura sólida passa de 3 blocos (192 px). Portões, passagens
 * baixas e o obstáculo do exercício têm espinhos de perigo no topo (ver ALTURA_BARREIRA), o
 * que impede pular por cima sem fechar a tela.
 */

/** Altura sólida de portões e da estrutura sobre passagens baixas (3 blocos). */
export const ALTURA_BARREIRA = 192;
/** Altura dos espinhos de perigo sobre a barreira: o total passa do pulo máximo (225 px). */
export const ALTURA_ESPINHOS = 40;
/**
 * Maior queda que o caminho obrigatório pode pedir (px). Quedas maiores só acontecem por erro
 * do jogador (cair de uma torre), nunca como único caminho.
 */
export const QUEDA_SEGURA = 400;

export type Elemento =
  | { tipo: 'viga'; x: number; alt: number; w: number }
  /** Esteira: alt <= 24 fica no chão; acima disso é uma esteira suspensa. v > 0 empurra para a direita. */
  | { tipo: 'esteira'; x: number; alt: number; w: number; v: number }
  /** Prensa hidráulica que bate sobre a superfície em `alt`, em ritmo fixo com `atraso` de fase. */
  | { tipo: 'prensa'; x: number; w: number; alt: number; atraso: number }
  | { tipo: 'fragil'; x: number; alt: number; w: number }
  /** Plataforma pendurada num guindaste, indo e voltando entre x e `ate` (borda esquerda). */
  | { tipo: 'guindaste'; x: number; ate: number; alt: number; w: number; v: number }
  /** Cabo desencapado sobre uma poça no chão: choque intermitente. */
  | { tipo: 'choque'; x: number; w: number; atraso: number }
  /** Ímã de sucata pendurado em (x, alt): ligado, puxa o jogador na horizontal até ele. */
  | { tipo: 'ima'; x: number; alt: number; atraso: number }
  /** Portão de grade pequeno (3 blocos e espinhos) no chão, aberto por alavanca ou botão. */
  | { tipo: 'portao'; id: string; x: number }
  | { tipo: 'alavanca'; x: number; alt: number; alvo: string }
  /** Botão-alvo: só ativa com um reciclável arremessado. */
  | { tipo: 'botao'; x: number; alt: number; alvo: string }
  /** Ponte que aparece quando o alvo é ativado. */
  | { tipo: 'ponte'; id: string; x: number; alt: number; w: number }
  /**
   * Elevador de sucata entre o chão e `alt`: anda para a outra ponta quando o jogador sobe
   * nele e é chamado de volta ao alto por quem espera no patamar.
   */
  | { tipo: 'elevador'; x: number; alt: number; w: number }
  /** Checkpoint extra; `ordem` só cresce ao longo da fase (ver CenaFase3). */
  | { tipo: 'checkpoint'; x: number; alt: number; ordem: number }
  | { tipo: 'baixa'; x: number };

/**
 * Obstáculo do exercício, no mesmo nível do terminal: vão que ganha uma ponte subindo, vão
 * que ganha uma plataforma descendo do alto, ou portão pequeno sobre uma passarela.
 */
export type ObstaculoExercicio = 'vao' | 'plataforma' | 'portao';

export interface ExercicioLayout {
  /** Terminal (x do centro) e altura da plataforma onde ele fica. */
  x: number;
  alt: number;
  obstaculo: ObstaculoExercicio;
  /** Início e largura do obstáculo, no nível do terminal. */
  xObstaculo: number;
  largura: number;
  /** Chão logo depois do elevador, onde o caminho segue. */
  xChaoSeguinte: number;
}

export interface LayoutTrecho {
  largura: number;
  buracos: readonly (readonly [number, number])[];
  exercicio: ExercicioLayout;
  elementos: Elemento[];
  /** Drones: [x, altura de voo acima do chão]. */
  drones: readonly (readonly [number, number])[];
  /** Pilhas que desabam: [x, altura da pilha acima do chão] (0: no alto da tela, como antes). */
  quedas: readonly (readonly [number, number])[];
  reciclaveis: readonly (readonly [number, TipoReciclavel])[];
  /** Faixa de patrulha do Recicla, em chão plano. */
  patrulhaRecicla: readonly [number, number];
  /** Faixa x de cada puzzle do trecho (o verificador confere que nenhum se repete). */
  puzzles: readonly { nome: string; de: number; ate: number }[];
}

/** Plataforma de torre: largura padrão e distância entre centros de degraus vizinhos. */
export const TORRE = { LARGURA: 112, PASSO_X: 200 } as const;

/** Tipo especial de um degrau da torre, pelo índice. */
type Especial = 'fragil' | 'prensa' | 'guindaste' | { esteira: number };

/**
 * Torre em zigue-zague: corridas de degraus que sobem para um lado e depois voltam, cada
 * degrau `passo` acima do anterior e a 200 px de centro a centro (vão de 88 px). Ao virar, o
 * primeiro degrau da nova corrida fica uma coluna de volta, dois passos acima de um já pisado.
 * Cada trecho usa corridas, passo e especiais diferentes.
 */
function torre(
  x0: number,
  corridas: readonly (readonly [1 | -1, number])[],
  passo: number,
  especiais: Record<number, Especial> = {}
): { elementos: Elemento[]; topo: { x: number; alt: number }; degraus: { x: number; alt: number }[] } {
  const degraus: { x: number; alt: number }[] = [];
  let x = x0;
  let alt = passo;
  let primeira = true;
  for (const [dir, n] of corridas) {
    for (let i = 0; i < n; i++) {
      if (!(primeira && i === 0)) {
        x += dir * TORRE.PASSO_X;
        alt += passo;
      }
      degraus.push({ x, alt });
    }
    primeira = false;
  }
  const L = TORRE.LARGURA;
  const elementos: Elemento[] = degraus.flatMap(({ x: dx, alt: a }, i): Elemento[] => {
    const esp = especiais[i];
    if (esp === 'fragil') return [{ tipo: 'fragil', x: dx, alt: a, w: L }];
    // Prensa batendo sobre o degrau: subir no intervalo
    if (esp === 'prensa') return [{ tipo: 'viga', x: dx, alt: a, w: L }, { tipo: 'prensa', x: dx + 8, w: 96, alt: a, atraso: i * 300 }];
    // Guindaste curto no lugar do degrau, indo e voltando 40 px para cada lado
    if (esp === 'guindaste') return [{ tipo: 'guindaste', x: dx - 40, ate: dx + 40, alt: a, w: L, v: 40 }];
    if (esp) return [{ tipo: 'esteira', x: dx, alt: a, w: L, v: esp.esteira }];
    return [{ tipo: 'viga', x: dx, alt: a, w: L }];
  });
  return { elementos, topo: degraus[degraus.length - 1], degraus };
}

/** Plataforma larga do terminal, no topo da torre do exercício. */
const LARGURA_TERMINAL = 320;
/** Vão do exercício no alto: largo demais para pular, só passa com a ponte ou a plataforma. */
const VAO_EXERCICIO = 576;
/**
 * Patamar depois do obstáculo e elevador que desce ao chão. O patamar é largo para o fosso
 * embaixo passar do planeio de quem pula do terminal.
 */
const PATAMAR = 480;
const ELEVADOR = 128;

/**
 * Topo do exercício sobre uma torre já montada (a última corrida precisa subir para a
 * direita): o último degrau vira a plataforma larga do terminal; à frente, no mesmo nível,
 * o obstáculo do exercício, o patamar e o elevador que desce até o chão firme. Embaixo, um
 * fosso do pé da torre até o elevador: o único caminho é por cima. Logo depois do elevador
 * fica um checkpoint no chão, para quem morrer ali não renascer no alto.
 */
function topoExercicio(
  t: ReturnType<typeof torre>,
  obstaculo: ObstaculoExercicio,
  indiceMeio: number
): { elementos: Elemento[]; exercicio: ExercicioLayout; fosso: readonly [number, number]; fimElevador: number } {
  const degraus = t.elementos.slice(0, -1);
  const alt = t.topo.alt;
  const xPlataforma = t.topo.x;
  const fimPlataforma = xPlataforma + LARGURA_TERMINAL;
  const xPatamar = fimPlataforma + VAO_EXERCICIO;
  const xElevador = xPatamar + PATAMAR;
  const fimElevador = xElevador + ELEVADOR;
  const meio = t.degraus[indiceMeio];
  const elementos: Elemento[] = [
    ...degraus,
    { tipo: 'viga', x: xPlataforma, alt, w: LARGURA_TERMINAL },
    { tipo: 'checkpoint', x: meio.x + TORRE.LARGURA / 2, alt: meio.alt, ordem: 30 },
  ];
  if (obstaculo === 'portao') {
    // Passarela contínua sobre o vão; o portão do exercício fica no começo dela
    elementos.push({ tipo: 'viga', x: fimPlataforma, alt, w: VAO_EXERCICIO + PATAMAR });
  } else {
    elementos.push({ tipo: 'viga', x: xPatamar, alt, w: PATAMAR });
  }
  elementos.push(
    { tipo: 'elevador', x: xElevador, alt, w: ELEVADOR },
    // Chão firme ao lado do elevador embaixo: o jogador desce e segue andando
    { tipo: 'checkpoint', x: fimElevador + 80, alt: 0, ordem: 60 }
  );
  return {
    elementos,
    exercicio: {
      x: xPlataforma + LARGURA_TERMINAL / 2,
      alt,
      obstaculo,
      xObstaculo: fimPlataforma,
      largura: obstaculo === 'portao' ? 64 : VAO_EXERCICIO,
      xChaoSeguinte: fimElevador + 60,
    },
    fosso: [fimPlataforma - 40, xElevador - (fimPlataforma - 40)],
    fimElevador,
  };
}

/** Largura dos trechos 1 a 3. */
const LARGURA_TRECHO = 7040;

/* =========================================================================
 * TRECHO 1: SOL (ensina esteiras e prensas)
 * ========================================================================= */

/** Torre de 10 degraus de 150 px (4 para a direita, 3 de volta, 3 para a direita) com esteiras e uma prensa. */
const solExercicio = topoExercicio(
  torre(1800, [[1, 4], [-1, 3], [1, 3]], 150, { 1: { esteira: -50 }, 3: 'prensa', 6: { esteira: 50 } }),
  'vao',
  5
);

const SOL: LayoutTrecho = {
  largura: LARGURA_TRECHO,
  buracos: [solExercicio.fosso, [6400, 448]],
  exercicio: solExercicio.exercicio,
  elementos: [
    // Esteiras no chão: a primeira ajuda, a segunda empurra contra o avanço
    { tipo: 'esteira', x: 400, alt: 24, w: 256, v: 90 },
    { tipo: 'esteira', x: 780, alt: 24, w: 256, v: -70 },
    // Prensas em onda: passar no intervalo de cada uma
    { tipo: 'prensa', x: 1080, w: 96, alt: 0, atraso: 0 },
    { tipo: 'prensa', x: 1220, w: 96, alt: 0, atraso: 870 },
    { tipo: 'prensa', x: 1360, w: 96, alt: 0, atraso: 1740 },
    // Torre do exercício: terminal no alto, ponte sobre o vão e elevador para descer
    ...solExercicio.elementos,
    // Alavanca na esteira suspensa: dois degraus baixos, esteira contra o avanço com duas
    // prensas em cima e a alavanca no fim. Para voltar: os degraus ou uma queda de 384 px
    { tipo: 'viga', x: 4400, alt: 128, w: 112 },
    { tipo: 'viga', x: 4600, alt: 256, w: 112 },
    { tipo: 'esteira', x: 4800, alt: 384, w: 480, v: -60 },
    { tipo: 'prensa', x: 4920, w: 96, alt: 384, atraso: 0 },
    { tipo: 'prensa', x: 5110, w: 96, alt: 384, atraso: 1300 },
    { tipo: 'alavanca', x: 5240, alt: 384, alvo: 'portao-sol' },
    // Longe da esteira: quem pula lá de cima não alcança o topo do portão
    { tipo: 'portao', id: 'portao-sol', x: 5900 },
    { tipo: 'baixa', x: 6100 },
    // Botão-alvo pendurado sobre o fosso: acertar um reciclável estende a ponte
    { tipo: 'ponte', id: 'ponte-sol', x: 6400, alt: 0, w: 448 },
    { tipo: 'botao', x: 6624, alt: 420, alvo: 'ponte-sol' },
    { tipo: 'prensa', x: 6900, w: 96, alt: 0, atraso: 0 },
  ],
  drones: [
    [1700, 1100],
    [5000, 750],
  ],
  quedas: [
    [1600, 1300],
    [4700, 600],
    [5600, 0],
  ],
  reciclaveis: [
    [600, 'placa'],
    [960, 'lata'],
    [1600, 'monitor'],
    [4100, 'bateria'],
    [6280, 'lata'],
    [6330, 'placa'],
  ],
  patrulhaRecicla: [4000, 4300],
  puzzles: [
    { nome: 'sol: torre de esteiras e prensa', de: 1800, ate: solExercicio.fimElevador },
    { nome: 'sol: alavanca na esteira com prensas', de: 4400, ate: 5964 },
    { nome: 'sol: botão-alvo e ponte', de: 6400, ate: 6996 },
  ],
};

/* =========================================================================
 * TRECHO 2: NÉVOA (complica: plataformas frágeis e guindastes)
 * ========================================================================= */

/** Torre de 12 degraus de 128 px (2 para a direita, 5 de volta, 5 para a direita) com frágeis e guindastes. */
const nevoaExercicio = topoExercicio(
  torre(2500, [[1, 2], [-1, 5], [1, 5]], 128, { 1: 'guindaste', 3: 'fragil', 6: 'guindaste', 8: 'fragil', 10: 'fragil' }),
  'plataforma',
  7
);

const NEVOA: LayoutTrecho = {
  largura: LARGURA_TRECHO,
  buracos: [[380, 520], [1050, 450], nevoaExercicio.fosso, [6620, 320]],
  exercicio: nevoaExercicio.exercicio,
  elementos: [
    // Frágeis sobre o primeiro fosso: tremem e caem 0,5 s depois de pisar
    { tipo: 'fragil', x: 430, alt: 40, w: 96 },
    { tipo: 'fragil', x: 600, alt: 72, w: 96 },
    { tipo: 'fragil', x: 770, alt: 40, w: 96 },
    // Plataforma de guindaste atravessando o segundo fosso
    { tipo: 'guindaste', x: 1060, ate: 1340, alt: 40, w: 128, v: 80 },
    { tipo: 'baixa', x: 1560 },
    // Torre do exercício: o acerto desce uma plataforma sobre o vão
    ...nevoaExercicio.elementos,
    // Ilha da alavanca: duas frágeis em escada e um guindaste até a ilha. Para voltar: o
    // guindaste e as frágeis (que voltam em 3 s) ou uma queda de 352 px
    { tipo: 'fragil', x: 4700, alt: 128, w: 96 },
    { tipo: 'fragil', x: 4880, alt: 256, w: 96 },
    { tipo: 'guindaste', x: 5060, ate: 5300, alt: 320, w: 128, v: 70 },
    { tipo: 'viga', x: 5520, alt: 352, w: 160 },
    { tipo: 'alavanca', x: 5600, alt: 352, alvo: 'portao-nevoa' },
    { tipo: 'portao', id: 'portao-nevoa', x: 6200 },
    // Segundo portão, aberto por um botão-alvo pendurado no alto
    { tipo: 'portao', id: 'portao-alvo-nevoa', x: 6450 },
    { tipo: 'botao', x: 6482, alt: 420, alvo: 'portao-alvo-nevoa' },
    // Saída: guindaste sobre um fosso
    { tipo: 'guindaste', x: 6630, ate: 6810, alt: 40, w: 128, v: 90 },
  ],
  drones: [
    [2100, 1150],
    [2500, 600],
    [5000, 800],
    [5300, 500],
  ],
  quedas: [
    [2300, 1350],
    [5000, 0],
    [6000, 0],
  ],
  reciclaveis: [
    [300, 'placa'],
    [975, 'lata'],
    [4500, 'bateria'],
    [6340, 'lata'],
    [6380, 'monitor'],
  ],
  patrulhaRecicla: [4350, 4600],
  puzzles: [
    { nome: 'névoa: torre de frágeis e guindastes', de: 1700, ate: nevoaExercicio.fimElevador },
    { nome: 'névoa: ilha da alavanca pelo guindaste', de: 4700, ate: 6264 },
    { nome: 'névoa: portão do botão-alvo e guindaste', de: 6450, ate: 6940 },
  ],
};

/* =========================================================================
 * TRECHO 3: CHUVA (combina: choques, ímãs e chão escorregadio)
 * ========================================================================= */

/** Torre de 13 degraus de 136 px em cinco corridas curtas, com ímãs puxando dos lados. */
const chuvaExercicio = topoExercicio(torre(2000, [[1, 3], [-1, 2], [1, 3], [-1, 2], [1, 3]], 136), 'portao', 6);

const CHUVA: LayoutTrecho = {
  largura: LARGURA_TRECHO,
  buracos: [[1000, 160], chuvaExercicio.fosso, [6800, 200]],
  exercicio: chuvaExercicio.exercicio,
  elementos: [
    // Cabos desencapados em poças: aviso piscando antes do choque
    { tipo: 'choque', x: 400, w: 160, atraso: 0 },
    { tipo: 'choque', x: 680, w: 160, atraso: 900 },
    // Ímã sobre o buraco: puxa para dentro enquanto ligado
    { tipo: 'ima', x: 1080, alt: 300, atraso: 0 },
    // Ímã puxando para cima de uma poça com choque
    { tipo: 'choque', x: 1380, w: 128, atraso: 400 },
    { tipo: 'ima', x: 1520, alt: 240, atraso: 1200 },
    // Torre do exercício com ímãs nos dois lados; o acerto abre o portão da passarela
    ...chuvaExercicio.elementos,
    { tipo: 'ima', x: 1760, alt: 700, atraso: 500 },
    { tipo: 'ima', x: 2960, alt: 1300, atraso: 2000 },
    { tipo: 'baixa', x: 4680 },
    // Duas alavancas em sequência. A primeira fica numa viga baixa sobre uma poça com choque
    { tipo: 'choque', x: 4880, w: 160, atraso: 0 },
    { tipo: 'viga', x: 4900, alt: 144, w: 128 },
    { tipo: 'alavanca', x: 4964, alt: 144, alvo: 'portao-chuva-1' },
    { tipo: 'portao', id: 'portao-chuva-1', x: 5440 },
    // Atrás do primeiro portão: degraus sobre uma poça longa e um ímã puxando de volta
    { tipo: 'ima', x: 5600, alt: 240, atraso: 1500 },
    { tipo: 'choque', x: 5660, w: 320, atraso: 600 },
    { tipo: 'viga', x: 5640, alt: 128, w: 112 },
    { tipo: 'viga', x: 5840, alt: 256, w: 112 },
    { tipo: 'viga', x: 6040, alt: 384, w: 128 },
    { tipo: 'alavanca', x: 6104, alt: 384, alvo: 'portao-chuva-2' },
    { tipo: 'portao', id: 'portao-chuva-2', x: 6700 },
    // Saída: fosso curto com um ímã puxando para dentro
    { tipo: 'ima', x: 6900, alt: 300, atraso: 2400 },
  ],
  drones: [
    [600, 180],
    [1800, 1300],
    [2600, 700],
    [5200, 500],
    [5900, 700],
    [6400, 200],
  ],
  quedas: [
    [2300, 1500],
    [5800, 600],
    [1300, 0],
    [6500, 0],
  ],
  reciclaveis: [
    [300, 'lata'],
    [900, 'placa'],
    [1250, 'monitor'],
    [4450, 'bateria'],
    [6400, 'lata'],
  ],
  patrulhaRecicla: [4400, 4640],
  puzzles: [
    { nome: 'chuva: torre de corridas curtas com ímãs', de: 1700, ate: chuvaExercicio.fimElevador },
    { nome: 'chuva: duas alavancas sobre choques', de: 4880, ate: 6764 },
    { nome: 'chuva: fosso com ímã', de: 6800, ate: 7000 },
  ],
};

/** Layout dos trechos 1 a 3; o trecho 4 (arena) não usa. */
export const LAYOUTS: readonly LayoutTrecho[] = [SOL, NEVOA, CHUVA];
