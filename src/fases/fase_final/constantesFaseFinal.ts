/**
 * Parâmetros ajustáveis da Fase Final: Mega Brain World.
 * Textos e falas ficam em DialogosFaseFinal.ts; cores em ArteFaseFinal.ts.
 *
 * Convenções (gravidade 600, pulo 490 → sobe ~200 px):
 * - Jogador: sprite 128x128, pés em y + 58. Spawn ≈ chão - 88 (nasce 30 px acima do chão).
 * - Arte em pixel art desenhada em canvas na metade da resolução e exibida em 2x (ESCALA_ARTE).
 */

export const ESCALA_ARTE = 2;

export const CENA_FASE_FINAL = {
  FADE_IN_MS: 400,
  OPACIDADE_CRT: 0.025,
  PROFUNDIDADE_HUD: 9000,
} as const;

export const JOGADOR_FASE_FINAL = {
  HITBOX_LARGURA: 44,
  HITBOX_ALTURA: 96,
  HITBOX_OFFSET_X: 42,
  HITBOX_OFFSET_Y: 26,
  PES_Y: 58, // distância do centro do sprite até a sola
  VELOCIDADE_X: 230,
  VELOCIDADE_PULO: -490,
  TEMPO_COYOTE_MS: 120,
  TEMPO_JUMP_BUFFER_MS: 120,
  GRAVIDADE_EXTRA_PULO_CURTO: 1500,
  ACELERACAO_CHAO: 2600,
  ACELERACAO_AR: 1800,
  FRENAGEM_CHAO: 3000,
  FRENAGEM_AR: 1200,
  PROFUNDIDADE: 20,
} as const;

/** Esticar/achatar e poeira do jogador (só o sprite visível muda; a hitbox nunca). */
export const FEEL_FASE_FINAL = {
  PULO: { x: 0.8, y: 1.25 },
  ATERRISSAGEM: { x: 0.3, y: 0.28 },
  VELOCIDADE_MIN_ATERRISSAGEM: 140,
  VELOCIDADE_IMPACTO_MAX: 620,
  RETORNO_FORMA: 14,
  PASSO_INTERVALO_MS: 230,
  VELOCIDADE_MIN_PASSO: 60,
  POEIRA: { VIDA_MS: 380, RAIO_MIN: 2, RAIO_MAX: 5, COR: 0x8a90b8, ALFA: 0.6 },
} as const;

export const CAMERA_FASE_FINAL = {
  LERP_X: 0.1,
  LERP_Y: 0.1,
  DEADZONE_LARGURA: 160,
  DEADZONE_ALTURA: 220,
} as const;

/** Chuva fina por cima de tudo nas áreas externas (exterior e terraço). */
export const CHUVA_FASE_FINAL = {
  GOTAS: 150,
  VELOCIDADE_MIN: 950,
  VELOCIDADE_MAX: 1350,
  COMPRIMENTO_MIN: 12,
  COMPRIMENTO_MAX: 24,
  INCLINACAO: -0.16, // deslocamento x por unidade de y (cai levemente para a esquerda)
  COR: 0xa8b8ff,
  ALFA: 0.32,
  RESPINGOS_POR_SEGUNDO: 26,
  PROFUNDIDADE: 800,
} as const;

/** Relâmpagos em cadência fixa (sem sorteio): intervalos em ms, repetidos em ciclo. */
export const RAIOS_FASE_FINAL = {
  INTERVALOS_MS: [9000, 13500, 7000, 11000],
  FLASH_ALFA: 0.32,
  FLASH_MS: 380,
  RAIO_VISIVEL_MS: 220,
} as const;

/**
 * Exterior: rua em frente à Mega Brain Tower.
 * x cresce para a direita; o chão da rua fica em CHAO_Y; a torre sobe até TOPO_TORRE_Y.
 */
export const EXTERIOR_FASE_FINAL = {
  LARGURA: 2600,
  CHAO_Y: 620,
  TOPO_MUNDO_Y: -2960,
  SPAWN: { x: 170, y: 532 },

  TORRE: {
    X_ESQUERDA: 1650,
    X_DIREITA: 2550,
    TOPO_Y: -2900, // ponta da antena
    LOGO_Y: -2560, // centro do logo do Mega Brain na coroa
  },

  // Fachadas da rua antes da torre (camada de mesmo plano do jogador, atrás dele)
  FACHADAS: { X_INICIO: 0, X_FIM: 1640, TOPO_Y: 240 },

  // Entre os telões, para nenhum poste ficar na frente de um slogan
  POSTES_X: [300, 780, 1260, 1600],

  GUARITA_X: 1715,
  VALDIR: { x: 1800, raioInteracao: 100 },
  TERMINAL_TERMO: { x: 1985, raioInteracao: 70 },
  PORTA: {
    x: 2100,
    LARGURA_FOLHA: 64,
    ALTURA: 176,
    ABERTURA_MS: 900,
    // Com a porta fechada, uma parede invisível segura o jogador antes dela
    BARREIRA_X: 2040,
    // Com a porta aberta, passar deste x entra na torre
    GATILHO_ENTRADA_X: 2085,
  },

  // Telões nas fachadas: posição do centro, tamanho e o primeiro slogan
  TELOES: [
    { x: 500, y: 380, largura: 260, altura: 104, slogan: 0 },
    { x: 1065, y: 400, largura: 220, altura: 90, slogan: 2 },
    { x: 1450, y: 372, largura: 210, altura: 86, slogan: 4 },
    { x: 2100, y: 236, largura: 380, altura: 150, slogan: 1 },
  ],
  TELAO_TROCA_MS: 4200,
} as const;

/**
 * Plano de abertura: a câmera sobe da base até o topo da torre, mostra o logo e um relâmpago
 * e volta ao jogador. Qualquer tecla pula.
 */
export const PAN_TORRE_FASE_FINAL = {
  ESPERA_INICIAL_MS: 500,
  SUBIDA_MS: 2600,
  PAUSA_TOPO_MS: 1000,
  VOLTA_MS: 1100,
  SCROLL_Y_TOPO: -2960,
} as const;

/** Andares da torre: medidas comuns a todos (o resto vem de andares/configAndares.ts). */
export const ANDAR_FASE_FINAL = {
  CHAO_Y: 620,
  TETO_Y: 70,
  ALTURA: 720,
  // Cair abaixo disto (num vão) volta ao checkpoint do andar
  LIMITE_QUEDA_Y: 900,
  ENTRADA_ELEVADOR_X: 150,
  ENTRADA_PORTA_X: 110,
  RAIO_TERMINAL: 70,
  // Elevador (quadro de 128x220 no mundo)
  ELEVADOR: {
    LARGURA: 128,
    ALTURA: 220,
    LARGURA_FOLHA: 56,
    PORTA_MS: 600,
    RAIO_ENTRADA: 50,
  },
  // Placas da ponte e portões dos puzzles
  ESPESSURA_PLACA: 22,
  ABRIR_BLOQUEIO_MS: 700,
  INTERVALO_PLACA_MS: 220,
  INTERVALO_COMPORTA_MS: 350,
} as const;

/** Corações, dano e pisão (andares e, depois, o boss). */
export const COMBATE_FASE_FINAL = {
  CORACOES: 3,
  INVULNERAVEL_MS: 1000,
  EMPURRAO_X: 260,
  EMPURRAO_Y: -280,
  TRAVA_CONTROLE_MS: 260,
  QUIQUE_PISAO: -400,
  // O pisão vale se o jogador está caindo e os pés estão perto do topo do inimigo
  MARGEM_PISAO: 20,
  VELOCIDADE_MIN_PISAO: 40,
} as const;

/**
 * Inimigos dos andares. Padrões fixos, sem sorteio: tudo depende de tempo ou da posição do jogador.
 */
export const INIMIGOS_FASE_FINAL = {
  SPAM_BOT: { VELOCIDADE: 75, LARGURA: 40, ALTURA: 34 },
  DRONE: {
    VELOCIDADE: 90,
    // Mergulha quando o jogador passa embaixo (até esta distância horizontal)
    ALCANCE_GATILHO: 46,
    AVISO_MS: 700,
    VELOCIDADE_MERGULHO: 560,
    ESPERA_NO_CHAO_MS: 450,
    VELOCIDADE_SUBIDA: 200,
    RECARGA_MS: 1300,
    LARGURA: 44,
    ALTURA: 30,
  },
  TORRETA: {
    PERIODO_MS: 2400,
    AVISO_MS: 500,
    DISPARO_MS: 380,
    ALCANCE_PADRAO: 360,
    ALTURA_FEIXE: 46, // acima do chão
    ESPESSURA_FEIXE: 14,
  },
  ALUCINACAO: { FASE_MS: 1500, PISCA_ANTES_MS: 350, LARGURA: 40, ALTURA: 100 },
} as const;

/** Viagem de elevador entre andares: portas fecham, visor sobe, tela apaga. */
export const TRANSICAO_ELEVADOR = {
  PORTA_FECHA_MS: 600,
  VISOR_MS: 1700,
  FADE_MS: 350,
  NOME_ANDAR_MS: 2600,
} as const;

export const CHECKPOINTS_FASE_FINAL = {
  TERMO: { id: 'termo', nome: 'CHECKPOINT // TERMO ASSINADO', ponto: { x: 1990, y: 532 } },
} as const;

export const INTERACAO_FASE_FINAL = {
  OFFSET_PROMPT_Y: -86,
} as const;

/**
 * Bossfight (etapa 5): parâmetros de cada forma do Mega Brain. Tudo em ms e px/s.
 * Arena fixa de 1280x720 com câmera estática; chão em y = 620 (igual aos andares).
 */
export const BOSS_FASE_FINAL = {
  PISOES_POR_FORMA: 2,
  CHAO_Y: 620,
  LARGURA: 1280,
  /** Topo do mundo acima da tela, para o jogador poder cair do teto na transição. */
  TOPO_MUNDO_Y: -400,
  SPAWN_JOGADOR: { x: 220, y: 532 },
  /** Chegando caindo: o jogador e a forma anterior passam pelo buraco do teto. */
  QUEDA_JOGADOR: { x: 580, y: -140 },
  QUEDA_BOSS_X: 700,
  /** Pisão na cabeça fora da janela: quica sem dano. */
  QUIQUE_SEM_JANELA: -420,
  QUIQUE_GOLPE: -540,
  HITSTOP_MS: 90,
  ATINGIDO_MS: 1200,
  /** Pausa entre a fala de entrada e o primeiro ataque. */
  PREPARO_MS: 700,
  GLITCH_MS: 1000,
  TRANSICAO: { APROXIMA_MS: 450, BRIGA_MS: 1700, RACHA_MS: 750, QUEDA_MS: 900 },

  COPYCAT: {
    ATRASO_MS: 900,
    /** Não encosta em quem está parado: fica encarando a essa distância. */
    DISTANCIA_MIN: 76,
    VELOCIDADE_MAX_X: 205,
    VELOCIDADE_MAX_Y: 900,
    ATORDOADO_MS: 4000,
    X_INICIAL: 1080,
    HITBOX: { LARGURA: 40, ALTURA: 92 },
  },
  /** Saídas de vapor do terraço: ciclo fixo aviso → jato → desligado. */
  VAPOR: {
    PERIODO_MS: 2800,
    AVISO_MS: 1100,
    JATO_MS: 700,
    LARGURA: 56,
    ALTURA_JATO: 230,
    SAIDAS: [
      { x: 500, defasagemMs: 0 },
      { x: 860, defasagemMs: 1400 },
    ],
  },

  TITA: {
    X_INICIAL: 1060,
    HITBOX: { LARGURA: 104, ALTURA: 136 },
    HITBOX_TRAVADO_ALTURA: 116,
    MARGEM_PAREDE: 110,
    AVISO_INVESTIDA_MS: 850,
    VELOCIDADE_INVESTIDA: 560,
    RECUPERA_MS: 500,
    TIROS: 3,
    MIRA_MS: 750,
    MIRA_TRAVADA_MS: 220,
    ENTRE_TIROS_MS: 350,
    VELOCIDADE_TIRO: 430,
    RAIO_TIRO: 13,
    SALTO_ALTURA: 230,
    SALTO_SOBE_MS: 450,
    SALTO_PAIRA_MS: 250,
    SALTO_DESCE_MS: 260,
    VELOCIDADE_ONDA: 430,
    ALTURA_ONDA: 30,
    TRAVADO_MS: 3300,
    LEVANTA_MS: 450,
  },

  AGUIA: {
    CANTOS: [
      { x: 170, y: 230 },
      { x: 1110, y: 230 },
    ],
    HITBOX: { LARGURA: 150, ALTURA: 64 },
    PAIRA_MS: 700,
    PENAS: 3,
    /** x do chão para onde cada pena do leque vai, a partir do canto esquerdo (espelhado no direito). */
    ALVOS_PENAS: [380, 640, 900],
    VELOCIDADE_PENA: 420,
    ENTRE_PENAS_MS: 260,
    AVISO_RASANTE_MS: 900,
    ALTURA_RASANTE: 572,
    RASANTE_DESCE_MS: 450,
    VELOCIDADE_RASANTE: 620,
    RASANTE_SOBE_MS: 520,
    AVISO_MERGULHO_MS: 1000,
    MIRA_TRAVADA_MS: 260,
    ALTURA_MIRA: 200,
    VELOCIDADE_MERGULHO: 950,
    PRESA_MS: 3300,
    SOLTA_MS: 600,
  },

  CAVEIRA: {
    X: 640,
    Y_FLUTUA: 190,
    HITBOX: { LARGURA: 96, ALTURA: 100 },
    AVISO_BRACO_MS: 850,
    ENTRE_BRACOS_MS: 450,
    SERRA: { RAIO: 24, VELOCIDADE: 470, DESCE_MS: 450 },
    LASER: { COLUNAS_A: [250, 640, 1030], COLUNAS_B: [445, 835], LARGURA: 56, AVISO_MS: 900, DISPARO_MS: 650 },
    CANHAO: { ALVOS_A: [330, 640, 950], ALVOS_B: [485, 795], VOO_MS: 1000, ENTRE_BOMBAS_MS: 180, RAIO_EXPLOSAO: 56, EXPLOSAO_MS: 320 },
    GARRA: { MIRA_MS: 950, TRAVA_MS: 260, VELOCIDADE: 1100, NO_CHAO_MS: 450, LARGURA: 70 },
    GIRA_DESCE_MS: 700,
    NO_CHAO_MS: 3300,
    SOBE_MS: 600,
  },

  /** Forma 5 — Cérebro Seráfico, no núcleo sobre a lava (etapa 6). */
  CEREBRO: {
    /** Um pisão por olho grande. */
    PISOES: 3,
    X: 1010,
    Y: 420,
    /** Olhos grandes no alto do cérebro (relativos ao centro), abrem nesta ordem. */
    OLHOS: [
      { x: -80, y: -74 },
      { x: 0, y: -88 },
      { x: 80, y: -74 },
    ],
    PAUSA_MS: 700,
    OLHO_ABRINDO_MS: 600,
    OLHO_ABERTO_MS: 3800,
    LEQUE: {
      AVISO_MS: 700,
      ONDAS: 3,
      ENTRE_ONDAS_MS: 1100,
      /** Ângulos fixos do leque (graus, 180 = para a esquerda); ondas ímpares deslocam meio passo. */
      ANGULOS: [150, 170, 190, 210],
      DESLOCAMENTO_IMPAR: 10,
      VELOCIDADE: 210,
      RAIO: 9,
    },
    CHUVA: {
      AVISO_MS: 500,
      ALVOS_A: [120, 400, 690],
      ALVOS_B: [260, 540, 860],
      ENTRE_MS: 240,
      VOO_MS: 1150,
      RAIO_EXPLOSAO: 48,
      EXPLOSAO_MS: 320,
    },
  },
  /** Arena do núcleo: plataforma do jogador à esquerda, plataforma do Mega Brain à direita, lava embaixo. */
  NUCLEO: {
    PLATAFORMA_JOGADOR: { x0: 0, x1: 560, topo: 620 },
    PLATAFORMA_BOSS: { x0: 780, x1: 1240, topo: 600 },
    /** Ressaltos de uma via para alcançar os olhos. */
    RESSALTOS: [
      { x: 690, topo: 470, largura: 140 },
      { x: 840, topo: 440, largura: 100 },
      { x: 1200, topo: 440, largura: 90 },
    ],
    LAVA_Y: 662,
    /** Encostar na lava tira um coração e volta para a plataforma. */
    SPAWN: { x: 200, y: 532 },
    QUEDA_JOGADOR_X: 320,
    BURACOS_TETO: [
      [250, 400],
      [930, 1090],
    ] as ReadonlyArray<readonly [number, number]>,
    QUEDA_CEREBRO_MS: 3400,
  },
} as const;
