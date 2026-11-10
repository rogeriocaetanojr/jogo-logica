import type { TipoReciclavel } from '../lixao/TiposLixao';

/**
 * Level design dos trechos de sol, névoa e chuva em dados puros (sem Phaser), para o mesmo
 * layout ser montado pelos trechos e conferido fora do jogo. x é relativo ao início do trecho;
 * `alt` é a altura do topo acima da linha do chão (px de mundo).
 *
 * Alcance do pulo (MOVIMENTO_LIXAO, gravidade 600): 225 px de altura e 416 px no mesmo nível.
 * Regras usadas aqui, com margem: degrau de até 152 px com vão de até 120 px entre bordas.
 *
 * Nada de paredão: nenhuma estrutura sólida passa de 3 blocos (192 px). Portões, passagens
 * baixas e o obstáculo do exercício têm espinhos de perigo no topo (ver ALTURA_BARREIRA), o
 * que impede pular por cima sem fechar a tela.
 */

/** Altura sólida de portões e da estrutura sobre passagens baixas (3 blocos). */
export const ALTURA_BARREIRA = 192;
/** Altura dos espinhos de perigo sobre a barreira: o total passa do pulo máximo (225 px). */
export const ALTURA_ESPINHOS = 40;

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
  /** Elevador de sucata entre o chão e `alt`: anda para a outra ponta quando o jogador sobe nele. */
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
}

/** Plataforma de torre: largura padrão e distância entre centros de degraus vizinhos. */
export const TORRE = { LARGURA: 112, PASSO_X: 200 } as const;

/** Tipo especial de um degrau da torre, pelo índice. */
type Especial = 'fragil' | { esteira: number };

/**
 * Torre em zigue-zague: corridas de degraus que sobem para um lado e depois voltam, cada
 * degrau `passo` acima do anterior e a 200 px de centro a centro (vão de 88 px).
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
      // Cada degrau anda uma coluna no sentido da corrida; ao virar, o primeiro degrau da
      // nova corrida fica uma coluna de volta, dois degraus acima de um já pisado
      if (!(primeira && i === 0)) {
        x += dir * TORRE.PASSO_X;
        alt += passo;
      }
      degraus.push({ x, alt });
    }
    primeira = false;
  }
  const elementos: Elemento[] = degraus.map(({ x: dx, alt: a }, i) => {
    const esp = especiais[i];
    if (esp === 'fragil') return { tipo: 'fragil', x: dx, alt: a, w: TORRE.LARGURA };
    if (esp) return { tipo: 'esteira', x: dx, alt: a, w: TORRE.LARGURA, v: esp.esteira };
    return { tipo: 'viga', x: dx, alt: a, w: TORRE.LARGURA };
  });
  return { elementos, topo: degraus[degraus.length - 1], degraus };
}

/** Plataforma larga do terminal, no topo da torre do exercício. */
const LARGURA_TERMINAL = 320;
/** Vão do exercício no alto: largo demais para pular, só passa com a ponte ou a plataforma. */
const VAO_EXERCICIO = 576;
/**
 * Patamar depois do obstáculo e elevador que desce ao chão. O patamar é largo para o fosso
 * embaixo passar do planeio de quem pula do terminal (cerca de 820 px a 1670 px de altura).
 */
const PATAMAR = 480;
const ELEVADOR = 128;

/**
 * Torre do exercício: sobe em zigue-zague (direita, esquerda, direita) até a plataforma larga
 * do terminal, no ponto mais alto do trecho. À frente, no mesmo nível, o obstáculo do
 * exercício; depois dele um patamar e um elevador que desce ao chão. Embaixo, um fosso largo
 * do pé da torre até o elevador: o único caminho é por cima.
 *
 * Devolve os elementos, o exercício e o fosso (para a lista de buracos).
 */
function torreExercicio(
  x0: number,
  passo: number,
  obstaculo: ObstaculoExercicio,
  especiais: Record<number, Especial> = {}
): { elementos: Elemento[]; exercicio: ExercicioLayout; fosso: readonly [number, number]; fimElevador: number } {
  const t = torre(x0, [[1, 3], [-1, 4], [1, 4]], passo, especiais);
  // O último degrau vira a plataforma larga do terminal
  const degraus = t.elementos.slice(0, -1);
  const alt = t.topo.alt;
  const xPlataforma = t.topo.x;
  const fimPlataforma = xPlataforma + LARGURA_TERMINAL;
  const xPatamar = fimPlataforma + VAO_EXERCICIO;
  const xElevador = xPatamar + PATAMAR;
  const meio = t.degraus[6];
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
  elementos.push({ tipo: 'elevador', x: xElevador, alt, w: ELEVADOR });
  return {
    elementos,
    exercicio: {
      x: xPlataforma + LARGURA_TERMINAL / 2,
      alt,
      obstaculo,
      xObstaculo: fimPlataforma,
      largura: obstaculo === 'portao' ? 64 : VAO_EXERCICIO,
      xChaoSeguinte: xElevador + ELEVADOR + 60,
    },
    // Fosso do pé da torre (40 px antes do fim da plataforma) até o início do elevador
    fosso: [fimPlataforma - 40, xElevador - (fimPlataforma - 40)],
    fimElevador: xElevador + ELEVADOR,
  };
}

/**
 * Distância do degrau mais à direita da torre de retorno até o portão: mais que o planeio de
 * quem pula do degrau mais alto daquele lado (cerca de 630 px), para o portão pequeno não
 * poder ser pulado de cima.
 */
const AFASTAMENTO_PORTAO = 700;

/**
 * Torre de retorno: o caminho à direita está fechado por um portão pequeno; a torre sobe para a
 * esquerda (esquerda, direita, esquerda) até a alavanca no alto, que abre o portão lá embaixo.
 */
function torreRetorno(x0: number, passo: number, portao: string, especiais: Record<number, Especial> = {}): Elemento[] {
  const t = torre(x0, [[-1, 3], [1, 3], [-1, 5]], passo, especiais);
  const meio = t.degraus[6];
  const maisDireita = Math.max(...t.degraus.map((d) => d.x)) + TORRE.LARGURA;
  return [
    ...t.elementos,
    { tipo: 'portao', id: portao, x: maisDireita + AFASTAMENTO_PORTAO },
    { tipo: 'alavanca', x: t.topo.x + 24, alt: t.topo.alt, alvo: portao },
    { tipo: 'checkpoint', x: meio.x + TORRE.LARGURA / 2, alt: meio.alt, ordem: 70 },
  ];
}

/** Largura dos trechos 1 a 3. */
const LARGURA_TRECHO = 7040;

/* =========================================================================
 * TRECHO 1: SOL (ensina esteiras e prensas)
 * ========================================================================= */

const solExercicio = torreExercicio(1800, 136, 'vao', { 1: { esteira: -50 }, 5: { esteira: 50 } });

const SOL: LayoutTrecho = {
  largura: LARGURA_TRECHO,
  buracos: [solExercicio.fosso, [6060, 576]],
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
    { tipo: 'baixa', x: 3800 },
    // Torre de retorno pela alavanca; esteiras nos degraus
    ...torreRetorno(4750, 136, 'portao-sol', { 4: { esteira: 50 }, 8: { esteira: -50 } }),
    // Antes do portão: prensa e esteira contra o avanço juntas
    { tipo: 'prensa', x: 5340, w: 96, alt: 0, atraso: 400 },
    { tipo: 'esteira', x: 5100, alt: 24, w: 160, v: -60 },
    // Botão-alvo pendurado sobre o fosso: acertar um reciclável estende a ponte
    { tipo: 'ponte', id: 'ponte-sol', x: 6060, alt: 0, w: 576 },
    { tipo: 'botao', x: 6350, alt: 420, alvo: 'ponte-sol' },
    { tipo: 'prensa', x: 6820, w: 96, alt: 0, atraso: 0 },
  ],
  drones: [
    [1700, 1100],
    [4450, 1250],
  ],
  quedas: [
    [1600, 1300],
    [4400, 1300],
    [5600, 0],
  ],
  reciclaveis: [
    [600, 'placa'],
    [960, 'lata'],
    [1600, 'monitor'],
    [4050, 'bateria'],
    [5900, 'lata'],
    [5960, 'placa'],
  ],
  patrulhaRecicla: [4000, 4200],
};

/* =========================================================================
 * TRECHO 2: NÉVOA (complica: plataformas frágeis e guindastes)
 * ========================================================================= */

const nevoaExercicio = torreExercicio(1800, 144, 'plataforma', { 2: 'fragil', 5: 'fragil', 8: 'fragil' });

const NEVOA: LayoutTrecho = {
  largura: LARGURA_TRECHO,
  buracos: [[380, 520], [1050, 450], nevoaExercicio.fosso, [6250, 480]],
  exercicio: nevoaExercicio.exercicio,
  elementos: [
    // Frágeis sobre o primeiro fosso: tremem e caem 0,5 s depois de pisar
    { tipo: 'fragil', x: 430, alt: 40, w: 96 },
    { tipo: 'fragil', x: 600, alt: 72, w: 96 },
    { tipo: 'fragil', x: 770, alt: 40, w: 96 },
    // Plataforma de guindaste atravessando o segundo fosso
    { tipo: 'guindaste', x: 1060, ate: 1340, alt: 40, w: 128, v: 80 },
    // Torre do exercício com degraus frágeis: o acerto desce uma plataforma sobre o vão
    ...nevoaExercicio.elementos,
    { tipo: 'baixa', x: 3800 },
    // Torre de retorno pela alavanca, com frágeis
    ...torreRetorno(4750, 144, 'portao-nevoa', { 1: 'fragil', 4: 'fragil', 8: 'fragil' }),
    // Portão com botão-alvo pendurado no alto: só abre com um reciclável certeiro
    { tipo: 'portao', id: 'portao-alvo-nevoa', x: 6000 },
    { tipo: 'botao', x: 6032, alt: 420, alvo: 'portao-alvo-nevoa' },
    // Saída: guindaste sobre um fosso
    { tipo: 'guindaste', x: 6260, ate: 6590, alt: 40, w: 128, v: 90 },
  ],
  drones: [
    [1650, 1150],
    [2100, 600],
    [4450, 1300],
    [4700, 500],
  ],
  quedas: [
    [1700, 1350],
    [4400, 1350],
    [5600, 0],
  ],
  reciclaveis: [
    [300, 'placa'],
    [975, 'lata'],
    [4050, 'bateria'],
    [5880, 'lata'],
    [5930, 'monitor'],
  ],
  patrulhaRecicla: [4000, 4200],
};

/* =========================================================================
 * TRECHO 3: CHUVA (combina: choque, ímãs, chão escorregadio e tudo o que veio antes)
 * ========================================================================= */

const chuvaExercicio = torreExercicio(1800, 152, 'portao', { 2: 'fragil', 4: { esteira: -60 }, 8: 'fragil' });

const CHUVA: LayoutTrecho = {
  largura: LARGURA_TRECHO,
  buracos: [[1000, 160], chuvaExercicio.fosso, [6060, 576]],
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
    // Torre do exercício com frágeis, esteira e um ímã ao lado; o acerto abre o portão da passarela
    ...chuvaExercicio.elementos,
    { tipo: 'ima', x: 1560, alt: 1150, atraso: 500 },
    { tipo: 'baixa', x: 3800 },
    // Torre de retorno pela alavanca com esteira, frágeis e ímã
    ...torreRetorno(4750, 152, 'portao-chuva', { 1: { esteira: 60 }, 5: 'fragil', 9: 'fragil' }),
    { tipo: 'ima', x: 4350, alt: 1300, atraso: 0 },
    // Antes do portão: choque e ímã juntos no chão molhado
    { tipo: 'choque', x: 5250, w: 160, atraso: 0 },
    { tipo: 'ima', x: 5450, alt: 240, atraso: 1500 },
    // Botão-alvo sobre o fosso, com um cabo de choque na área de arremesso
    { tipo: 'choque', x: 5850, w: 96, atraso: 600 },
    { tipo: 'ponte', id: 'ponte-chuva', x: 6060, alt: 0, w: 576 },
    { tipo: 'botao', x: 6350, alt: 420, alvo: 'ponte-chuva' },
  ],
  drones: [
    [600, 180],
    [1700, 1250],
    [2150, 700],
    [4400, 1400],
    [4700, 600],
    [5600, 200],
  ],
  quedas: [
    [1750, 1450],
    [4400, 1450],
    [1300, 0],
    [6800, 0],
  ],
  reciclaveis: [
    [300, 'lata'],
    [900, 'placa'],
    [1250, 'monitor'],
    [4050, 'bateria'],
    [5980, 'lata'],
    [6010, 'placa'],
  ],
  patrulhaRecicla: [4000, 4200],
};

/** Layout dos trechos 1 a 3; o trecho 4 (arena) não usa. */
export const LAYOUTS: readonly LayoutTrecho[] = [SOL, NEVOA, CHUVA];
