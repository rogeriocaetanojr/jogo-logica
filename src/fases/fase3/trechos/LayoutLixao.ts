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
/**
 * Queda mais alta que isto é fatal (ver JogadorLixao). A folga sobre QUEDA_SEGURA evita matar
 * por arredondamento. Onde dá para cair mais que isto, o layout põe um monitor de aviso.
 */
export const QUEDA_MORTAL = 480;

export type Elemento =
  | { tipo: 'viga'; x: number; alt: number; w: number }
  /** Esteira: alt <= 24 fica no chão; acima disso é uma esteira suspensa. v > 0 empurra para a direita. */
  | { tipo: 'esteira'; x: number; alt: number; w: number; v: number }
  /** Prensa hidráulica que bate sobre a superfície em `alt`, em ritmo fixo com `atraso` de fase. */
  | { tipo: 'prensa'; x: number; w: number; alt: number; atraso: number }
  | { tipo: 'fragil'; x: number; alt: number; w: number }
  /** Plataforma pendurada num guindaste, indo e voltando entre x e `ate` (borda esquerda). */
  | { tipo: 'guindaste'; x: number; ate: number; alt: number; w: number; v: number }
  /** Garra de ferro-velho: pega o jogador parado embaixo dela em `x` e o solta em `ate` (centros). */
  | { tipo: 'garra'; x: number; ate: number }
  /**
   * Cabo desencapado sobre uma poça no chão: choque intermitente. Com `grupo`, fica ligado o
   * tempo todo, é fatal e só desliga por um tempo quando o exercício do trecho manda.
   */
  | { tipo: 'choque'; x: number; w: number; atraso: number; grupo?: string }
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
   * Elevador de sucata entre `ate` (padrão 0, o chão) e `alt`. Por gatilho, anda para a outra
   * ponta quando o jogador sobe nele e é chamado de volta ao alto por quem espera no patamar;
   * com `ciclo`, sobe e desce sozinho, parando um pouco em cada ponta.
   */
  | { tipo: 'elevador'; x: number; alt: number; w: number; ate?: number; ciclo?: boolean }
  /** Checkpoint extra; `ordem` só cresce ao longo da fase (ver CenaFase3). */
  | { tipo: 'checkpoint'; x: number; alt: number; ordem: number }
  | { tipo: 'baixa'; x: number }
  /**
   * Monitor de aviso apoiado em (x, alt); `texto` troca a mensagem padrão. Estilo 'queda'
   * (padrão): tela vermelha com seta para baixo. 'desafio': tela amarela com alvo e seta para cima.
   */
  | { tipo: 'aviso'; x: number; alt: number; texto?: string; estilo?: 'queda' | 'desafio' };

/**
 * Obstáculo do exercício, no mesmo nível do terminal: vão que ganha uma ponte subindo, vão
 * que ganha uma plataforma descendo do alto, ou portão pequeno sobre uma passarela.
 */
export type ObstaculoExercicio = 'vao' | 'plataforma' | 'portao' | 'escada' | 'choque';

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
 * Patamar depois do obstáculo e elevadores da descida. O patamar é largo para o fosso
 * embaixo passar do planeio de quem pula do terminal.
 */
const PATAMAR = 480;
const ELEVADOR = 128;
/** Patamar no meio da descida, entre o elevador de cima e o de baixo, e o vão até o segundo. */
const PATAMAR_MEIO = 160;
/** Mensagem dos avisos ao lado dos elevadores. */
const AVISO_ELEVADOR = 'ESPERE O ELEVADOR SUBIR\nSE PULAR, VOCÊ PODE MORRER NA QUEDA';
const VAO_ELEVADORES = 96;

/**
 * Topo do exercício sobre uma torre já montada (a última corrida precisa subir para a
 * direita): o último degrau vira a plataforma larga do terminal; à frente, no mesmo nível,
 * o obstáculo do exercício, o patamar e a descida em dois elevadores: o primeiro vai até a
 * metade, num patamar do meio, e dele se pula no segundo, que sobe e desce sozinho até o chão.
 * Embaixo, um fosso do pé da torre até o primeiro elevador: o único caminho é por cima. Logo
 * depois do segundo elevador fica um checkpoint no chão, para quem morrer ali não renascer no alto.
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
  // Descida em dois elevadores: o de cima vai só até a metade; do patamar do meio, pula-se no
  // de baixo, que sobe e desce sozinho até o chão
  const altMeio = Math.round(alt / 2 / 8) * 8;
  const xPatamarMeio = xElevador + ELEVADOR;
  const xElevador2 = xPatamarMeio + PATAMAR_MEIO + VAO_ELEVADORES;
  const fimElevador = xElevador2 + ELEVADOR;
  const meio = t.degraus[indiceMeio];
  // Avisos de queda fatal: no primeiro degrau comum (sem prensa, esteira, frágil ou guindaste)
  // acima de QUEDA_MORTAL, na beira esquerda do terminal (longe dele, para o texto não cobrir
  // o "[E] Terminal") e no patamar do meio da descida (de onde pular direto ao chão mata)
  const degrauComum = (d: { x: number }) =>
    t.elementos.every((e) => e.tipo === 'viga' || e.x + ('w' in e ? e.w : 0) < d.x - 40 || e.x > d.x + TORRE.LARGURA + 40);
  const primeiroAlto = t.degraus.slice(0, -1).find((d) => d.alt > QUEDA_MORTAL && degrauComum(d));
  const avisos: Elemento[] = [
    ...(primeiroAlto ? [{ tipo: 'aviso' as const, x: primeiroAlto.x + 24, alt: primeiroAlto.alt }] : []),
    { tipo: 'aviso', x: xPlataforma + 20, alt },
    // Antes de cada elevador: pular nele quando está lá embaixo é queda fatal
    { tipo: 'aviso', x: xElevador - 48, alt, texto: AVISO_ELEVADOR },
    { tipo: 'aviso', x: xPatamarMeio + PATAMAR_MEIO - 36, alt: altMeio, texto: AVISO_ELEVADOR },
  ];
  const elementos: Elemento[] = [
    ...degraus,
    ...avisos,
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
    { tipo: 'elevador', x: xElevador, alt, w: ELEVADOR, ate: altMeio },
    { tipo: 'viga', x: xPatamarMeio, alt: altMeio, w: PATAMAR_MEIO },
    { tipo: 'elevador', x: xElevador2, alt: altMeio, w: ELEVADOR, ciclo: true },
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

/** Escada que o Recicla monta no exercício 2: degraus de 64 px subindo 80 px cada. */
export const ESCADA = { DEGRAUS: 4, LARGURA: 64, PASSO: 80 } as const;
/** Altura da passarela que a escada alcança (um pulo curto acima do último degrau). */
const ALT_PASSARELA_ESCADA = 384;

/**
 * Exercício 2 no chão: terminal e, à frente, o lugar da escada do Recicla. A passarela alta
 * cruza um fosso largo demais para pular; sem a escada não se alcança a passarela. No meio
 * dela, duas frágeis; no fim, a queda de volta ao chão firme.
 */
function exercicioEscada(xTerminal: number) {
  const xEscada = xTerminal + 160;
  const largura = ESCADA.DEGRAUS * ESCADA.LARGURA;
  const xPassarela = xEscada + largura;
  const fosso: readonly [number, number] = [xPassarela + 64, 704];
  const alt = ALT_PASSARELA_ESCADA;
  const fimPassarela = xPassarela + 896;
  const elementos: Elemento[] = [
    { tipo: 'viga', x: xPassarela, alt, w: 320 },
    { tipo: 'fragil', x: xPassarela + 408, alt, w: 96 },
    { tipo: 'fragil', x: xPassarela + 592, alt, w: 96 },
    { tipo: 'viga', x: xPassarela + 776, alt, w: 120 },
    { tipo: 'checkpoint', x: fimPassarela + 100, alt: 0, ordem: 60 },
  ];
  const exercicio: ExercicioLayout = {
    x: xTerminal,
    alt: 0,
    obstaculo: 'escada',
    xObstaculo: xEscada,
    largura,
    xChaoSeguinte: fimPassarela + 60,
  };
  return { elementos, exercicio, fosso, fim: fimPassarela };
}

/** Energia cortada pelo exercício 3: tempo até o corredor voltar a ficar eletrificado. */
export const CORREDOR = { SEGMENTOS: 6, LARGURA_SEGMENTO: 160, DESLIGADO_MS: 7000, AVISO_MS: 1500 } as const;

/**
 * Exercício 3 no chão: terminal e, à frente, um corredor de poças sempre eletrificado (fatal).
 * O acerto corta a energia por CORREDOR.DESLIGADO_MS; dá para rodar de novo no terminal.
 */
function exercicioCorredor(xTerminal: number) {
  const xCorredor = xTerminal + 120;
  const largura = CORREDOR.SEGMENTOS * CORREDOR.LARGURA_SEGMENTO;
  const elementos: Elemento[] = [];
  for (let i = 0; i < CORREDOR.SEGMENTOS; i++) {
    elementos.push({ tipo: 'choque', x: xCorredor + i * CORREDOR.LARGURA_SEGMENTO, w: CORREDOR.LARGURA_SEGMENTO, atraso: 0, grupo: 'corredor' });
  }
  elementos.push({ tipo: 'checkpoint', x: xCorredor + largura + 120, alt: 0, ordem: 60 });
  const exercicio: ExercicioLayout = {
    x: xTerminal,
    alt: 0,
    obstaculo: 'choque',
    xObstaculo: xCorredor,
    largura,
    xChaoSeguinte: xCorredor + largura + 60,
  };
  return { elementos, exercicio, fim: xCorredor + largura };
}

/** Largura dos trechos 1 a 3. */
const LARGURA_TRECHO = 7040;

/* =========================================================================
 * TRECHO 1: SOL (ensina esteiras e prensas)
 * ========================================================================= */

/** Torre de 10 degraus de 150 px (4 para a direita, 3 de volta, 3 para a direita) com esteiras e uma prensa. */
const solExercicio = topoExercicio(
  torre(1800, [[1, 4], [-1, 3], [1, 3]], 150, { 1: { esteira: 150 }, 3: 'prensa', 6: { esteira: 50 } }),
  'vao',
  5
);

const SOL: LayoutTrecho = {
  largura: LARGURA_TRECHO,
  buracos: [solExercicio.fosso, [6400, 448]],
  exercicio: solExercicio.exercicio,
  elementos: [
    // Primeira contra o avanço: forte, mas abaixo da velocidade do jogador (240) para dar para vencer
    { tipo: 'esteira', x: 400, alt: 24, w: 256, v: -160 },
    // Segunda a favor, muito forte: atira o jogador para frente, rumo às prensas
    { tipo: 'esteira', x: 780, alt: 24, w: 256, v: 300 },
    // Prensas em onda: passar no intervalo de cada uma
    { tipo: 'prensa', x: 1080, w: 96, alt: 0, atraso: 0 },
    { tipo: 'prensa', x: 1220, w: 96, alt: 0, atraso: 870 },
    { tipo: 'prensa', x: 1360, w: 96, alt: 0, atraso: 1740 },
    // Torre do exercício: terminal no alto, ponte sobre o vão e elevador para descer
    ...solExercicio.elementos,
    // Checkpoint antes da alavanca na esteira suspensa
    { tipo: 'checkpoint', x: 4340, alt: 0, ordem: 70 },
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
    // Monitor provocando antes da passagem baixa: dica de que o alvo lá em cima abre a ponte
    { tipo: 'aviso', x: 6036, alt: 0, estilo: 'desafio', texto: 'APOSTO QUE VOCÊ NÃO ACERTA UM LIXO\nNAQUELE ALVO LÁ EM CIMA' },
    // Checkpoint depois da passagem baixa, antes do fosso do botão-alvo
    { tipo: 'checkpoint', x: 6260, alt: 0, ordem: 80 },
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
  // Só a munição do botão-alvo; o resto vem das quedas e do Recicla
  reciclaveis: [[6300, 'lata']],
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

/** Exercício no chão: o Recicla monta a escada até a passarela das frágeis. */
const nevoaExercicio = exercicioEscada(2400);

const NEVOA: LayoutTrecho = {
  largura: LARGURA_TRECHO,
  buracos: [[380, 520], [1050, 450], nevoaExercicio.fosso, [6620, 320]],
  exercicio: nevoaExercicio.exercicio,
  elementos: [
    // Checkpoint na entrada do trecho
    { tipo: 'checkpoint', x: 200, alt: 0, ordem: 10 },
    // Frágeis sobre o primeiro fosso: tremem e caem 0,5 s depois de pisar
    { tipo: 'fragil', x: 430, alt: 40, w: 96 },
    { tipo: 'fragil', x: 600, alt: 72, w: 96 },
    { tipo: 'fragil', x: 770, alt: 40, w: 96 },
    // Plataforma de guindaste atravessando o segundo fosso
    { tipo: 'guindaste', x: 1060, ate: 1340, alt: 40, w: 128, v: 80 },
    { tipo: 'baixa', x: 1560 },
    // Exercício no chão: o acerto faz o Recicla montar a escada até a passarela
    ...nevoaExercicio.elementos,
    // Checkpoint antes da ilha da alavanca
    { tipo: 'checkpoint', x: 4640, alt: 0, ordem: 70 },
    // Ilha da alavanca: duas frágeis em escada e um guindaste até a ilha. Para voltar: o
    // guindaste e as frágeis (que voltam em 3 s) ou uma queda de 352 px
    { tipo: 'fragil', x: 4700, alt: 128, w: 96 },
    { tipo: 'fragil', x: 4880, alt: 256, w: 96 },
    { tipo: 'guindaste', x: 5060, ate: 5300, alt: 320, w: 128, v: 70 },
    { tipo: 'viga', x: 5520, alt: 352, w: 160 },
    { tipo: 'alavanca', x: 5600, alt: 352, alvo: 'portao-nevoa' },
    { tipo: 'portao', id: 'portao-nevoa', x: 6200 },
    // Monitor provocando entre os dois portões: o alvo lá em cima abre o segundo
    { tipo: 'aviso', x: 6300, alt: 0, estilo: 'desafio', texto: 'APOSTO QUE VOCÊ NÃO ACERTA UM LIXO\nNAQUELE ALVO LÁ EM CIMA' },
    // Checkpoint entre os dois portões
    { tipo: 'checkpoint', x: 6400, alt: 0, ordem: 80 },
    // Segundo portão, aberto por um botão-alvo pendurado no alto
    { tipo: 'portao', id: 'portao-alvo-nevoa', x: 6450 },
    { tipo: 'botao', x: 6482, alt: 420, alvo: 'portao-alvo-nevoa' },
    // Saída: garra que pega o jogador antes do fosso e o solta do outro lado
    { tipo: 'garra', x: 6560, ate: 7010 },
  ],
  drones: [
    [2100, 300],
    [3300, 600],
    [5000, 800],
    [5300, 500],
  ],
  quedas: [
    [1900, 0],
    [5000, 0],
    [6000, 0],
  ],
  // Só a munição do botão-alvo; o resto vem das quedas e do Recicla
  reciclaveis: [[6360, 'lata']],
  patrulhaRecicla: [4350, 4600],
  puzzles: [
    { nome: 'névoa: escada do Recicla e passarela de frágeis', de: 2400, ate: nevoaExercicio.fim },
    { nome: 'névoa: ilha da alavanca pelo guindaste', de: 4700, ate: 6264 },
    { nome: 'névoa: portão do botão-alvo e garra', de: 6450, ate: 7060 },
  ],
};

/* =========================================================================
 * TRECHO 3: CHUVA (combina: choques, ímãs e chão escorregadio)
 * ========================================================================= */

/** Exercício no chão: corredor eletrificado que o acerto desliga por alguns segundos. */
const chuvaExercicio = exercicioCorredor(2000);

const CHUVA: LayoutTrecho = {
  largura: LARGURA_TRECHO,
  // Fossos largos demais para pular (o pulo alcança ~416 px): só passa pendurado no ímã
  buracos: [[860, 460], [6500, 480]],
  exercicio: chuvaExercicio.exercicio,
  elementos: [
    // Checkpoint na entrada do trecho
    { tipo: 'checkpoint', x: 200, alt: 0, ordem: 10 },
    // Cabos desencapados em poças: aviso piscando antes do choque
    { tipo: 'choque', x: 400, w: 160, atraso: 0 },
    { tipo: 'choque', x: 620, w: 160, atraso: 900 },
    // Ímã sobre o fosso: ligado, ergue o jogador e o segura para atravessar
    { tipo: 'ima', x: 1090, alt: 300, atraso: 0 },
    // Ímã puxando para cima de uma poça com choque
    { tipo: 'choque', x: 1380, w: 128, atraso: 400 },
    { tipo: 'ima', x: 1520, alt: 240, atraso: 1200 },
    // Exercício no chão: corredor eletrificado; o acerto corta a energia e é preciso correr
    ...chuvaExercicio.elementos,
    // Checkpoint antes das duas alavancas
    { tipo: 'checkpoint', x: 4780, alt: 0, ordem: 70 },
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
    { tipo: 'portao', id: 'portao-chuva-2', x: 6400 },
    // Checkpoint entre o segundo portão e o fosso do ímã
    { tipo: 'checkpoint', x: 6300, alt: 0, ordem: 80 },
    // Saída: fosso largo atravessado pendurado no ímã
    { tipo: 'ima', x: 6740, alt: 300, atraso: 2400 },
  ],
  drones: [
    [600, 180],
    [1800, 400],
    [2600, 700],
    [5200, 500],
    [5900, 700],
    [6400, 200],
  ],
  quedas: [
    [3300, 0],
    [5800, 600],
    [1300, 0],
    [6500, 0],
  ],
  // Sem botão-alvo: a munição vem só das quedas e do Recicla
  reciclaveis: [],
  patrulhaRecicla: [4400, 4640],
  puzzles: [
    { nome: 'chuva: corredor eletrificado', de: 2000, ate: chuvaExercicio.fim },
    { nome: 'chuva: duas alavancas sobre choques', de: 4880, ate: 6464 },
    { nome: 'chuva: fosso com ímã', de: 6500, ate: 7000 },
  ],
};

/** Layout dos trechos 1 a 3; o trecho 4 (arena) não usa. */
export const LAYOUTS: readonly LayoutTrecho[] = [SOL, NEVOA, CHUVA];
