import type { BlocoNivelFase1 } from './tiposFase1';

/**
 * Constantes e configurações do level design, física e puzzles da Fase 1: Céu Partido.
 * Centraliza todos os números mágicos e coordenadas. Textos e diálogos ficam em DialogosFase1.ts.
 *
 * Convenções de coordenadas (gravidade 600, pulo 490 → sobe ~200 px):
 * - Plataforma de mármore (240x36): y = topo + 18 × scaleY.
 * - Nuvem (200x44): y = topo + 22. Mármore rachado (180x32): y = topo + 16.
 * - Jogador: pés em y + 58. Ponto de spawn ≈ topo - 88 (nasce 30 px acima do chão).
 * - Totem (52x70): y = topo - 35.
 */

export const MUNDO_FASE1 = {
  LARGURA: 10178,
  ALTURA: 720,
  PADDING_INFERIOR: 200,
  COR_FUNDO: '#a855f7',
  FADE_IN_MS: 300,
  OPACIDADE_CRT: 0.02,
} as const;

export const CAMERA_FASE1 = {
  LERP_X: 0.08,
  LERP_Y: 0.08,
  DEADZONE_LARGURA: 120,
  DEADZONE_ALTURA: 80,
} as const;

export const JOGADOR_FASE1 = {
  HITBOX_LARGURA: 44,
  HITBOX_ALTURA: 96,
  HITBOX_OFFSET_X: 42,
  HITBOX_OFFSET_Y: 26,
  VELOCIDADE_X: 220,
  VELOCIDADE_PULO: -490,
  VELOCIDADE_MAX_PLANAR: 80, // Limite de velocidade de queda para descida suave ao planar
  TEMPO_COYOTE_MS: 120, // Janela para pulo após sair de plataformas
  TEMPO_JUMP_BUFFER_MS: 120, // Janela de tolerância para buffer de comando de pulo pré-aterrissagem
  TINT_VENTO: 0xbae6fd,
  TINT_PLANEIO: 0xe0f2fe, // Tint mais suave ao planar fora das colunas de vento
  TINT_RACHANDO: 0xf87171,
  PROFUNDIDADE: 10,
  GRAVIDADE_EXTRA_PULO_CURTO: 1500, // px/s² somados à gravidade ao soltar o pulo subindo (freia a subida em curva)

  // Aceleração horizontal em px/s²: a velocidade acompanha o alvo em rampa em vez de mudar de uma vez
  ACELERACAO_CHAO: 2600,
  ACELERACAO_AR: 1800,
  FRENAGEM_CHAO: 3000,
  FRENAGEM_AR: 1200,

  // Fiapos de ar que o jogador deixa para trás ao planar
  RASTRO_PLANEIO: {
    INTERVALO_MS: 45,
    VIDA_MS: 380,
    VELOCIDADE_X: 60,
    COMPRIMENTO: 18,
    ESPESSURA: 2,
    COR: 0xe0f2fe,
    ALFA: 0.8,
    RECUO_X: 24,
    OFFSET_Y_MIN: -20,
    OFFSET_Y_MAX: 40,
    PROFUNDIDADE: 9,
  },
} as const;

export const VENTO_FASE1 = {
  PARTICULAS_QUANTIDADE: 20,
  PARTICULAS_VEL_Y_MIN: 80,
  PARTICULAS_VEL_Y_MAX: 180,
  PARTICULAS_ALFA_MIN: 0.3,
  PARTICULAS_ALFA_MAX: 0.8,
  PADDING_PARTICULAS_X: 6,
  LARGURA_PARTICULA: 3,
  ALTURA_PARTICULA: 10,
  DESCIDA_COLUNA_VEL: 60, // Velocidade de descida dentro da coluna ao soltar o pulo
  DESCIDA_COLUNA_SUAVIZACAO: 8, // Quanto maior, mais rápido a velocidade vertical converge para a descida
  COR_FUNDO_COLUNA: 0x38bdf8,
  ALFA_FUNDO_COLUNA: 0.22,
  COR_BORDA_COLUNA: 0xa5f3fc,
  ALFA_BORDA_COLUNA: 0.6,
  ESPESSURA_BORDA_COLUNA: 1.5,
  PROFUNDIDADE_GRAFICO: 1,
  // A velocidade das partículas acompanha a força da coluna (força fraca = partículas lentas)
  FORCA_REFERENCIA_PARTICULAS: 450,
  FATOR_PARTICULAS_MIN: 0.15,
  FATOR_PARTICULAS_MAX: 4,
  PERIODO_MIN_ESCADA_MS: 100,

  // Zonas de vento contrário: empurram o jogador devagar para a esquerda (andar e planar continuam possíveis)
  CONTRARIO: {
    COR_FUNDO: 0xe9d5ff,
    ALFA_FUNDO: 0.1,
    COR_BORDA: 0xffffff,
    ALFA_BORDA: 0.55,
    ESPESSURA_BORDA: 2,
    COMPRIMENTO_TRACEJADO: 22,
    PERIODO_TRACEJADO: 44,
    VELOCIDADE_TRACEJADO: 0.08,
    PARTICULAS_QUANTIDADE: 24,
    PARTICULAS_VEL_X_MIN: 140,
    PARTICULAS_VEL_X_MAX: 260,
    PARTICULAS_COMPRIMENTO_MIN: 14,
    PARTICULAS_COMPRIMENTO_MAX: 38,
    PARTICULAS_ESPESSURA: 2,
    PARTICULAS_ALFA_MIN: 0.3,
    PARTICULAS_ALFA_MAX: 0.7,
    COR_PARTICULA: 0xffffff,

    // Biruta fixada na borda esquerda da zona, avisando de longe de onde vem o vento
    BIRUTA: {
      ALTURA_MASTRO: 70,
      COMPRIMENTO: 56,
      SEGMENTOS: 4,
      ALTURA_BASE: 20,
      ALTURA_REDUCAO: 3,
      ONDA_AMPLITUDE: 3,
      ONDA_VELOCIDADE: 0.01,
      COR_MASTRO: 0xf8fafc,
      COR_PONTA: 0xf59e0b,
      COR_SEGMENTO_A: 0xf59e0b,
      COR_SEGMENTO_B: 0xf8fafc,
    },
  },

  // Gêiser de vento: impulso único para cima, em ciclo, com aviso de bolhas antes da erupção
  GEISER: {
    COR_BOCA: 0x1e293b,
    COR_AVISO: 0x7dd3fc,
    COR_ERUPCAO: 0xe0f2fe,
    ALFA_ERUPCAO: 0.35,
    LARGURA_BOCA: 70,
    ALTURA_BOCA: 14,
    BOLHAS_QUANTIDADE: 10,
    BOLHAS_VEL_Y: 70,
    JATOS_QUANTIDADE: 14,
    JATOS_VEL_Y: 900,
  },
} as const;

export const MARMORE_RACHADO_FASE1 = {
  TEMPO_TELEGRAPH_MS: 400,
  TEMPO_RESPAWN_MS: 3000,
  DURACAO_FADE_IN_MS: 350,
  TREMOR_VELOCIDADE: 0.08,
  TREMOR_AMPLITUDE: 2,
} as const;

export const NUVEM_EFEMERA_FASE1 = {
  TEMPO_DISSIPAR_MS: 800, // Tempo entre pisar e a nuvem sumir
  TEMPO_RESPAWN_MS: 2500,
  ALFA_MINIMO: 0.2, // Transparência no fim da dissipação, logo antes de sumir
  DURACAO_FADE_IN_MS: 350,
} as const;

export const SENTINELAS_FASE1 = {
  ALCANCE_VISAO_PADRAO: 220,
  ABERTURA_CONE_PADRAO: 38,
  OSCILACAO_Y_VEL: 0.004,
  OSCILACAO_Y_AMP: 6,
  OFFSET_PONTA_CONE_X: 18,
  COR_CONE_ALERTA: 0xef4444,
  COR_CONE_HACKEADA: 0x10b981,
  ALFA_CONE_FUNDO: 0.2,
  ALFA_CONE_BORDA: 0.6,
  PROFUNDIDADE_SPRITE: 6,
  PROFUNDIDADE_CONE: 7,
  PROFUNDIDADE_PULSO: 8,

  // Mecânica de Pulso Eólico (Modo Scanner -> Modo Pulso a cada 3.5s)
  TEMPO_SCANNER_MS: 3500,
  TEMPO_CARGA_PULSO_MS: 1000,
  TEMPO_DISPARO_PULSO_MS: 400,
  RAIO_PULSO_MAX: 180,
  FORCA_PULSO_DESCENDENTE: 550,
  COR_CARGA_PULSO: 0x38bdf8,
  COR_DISPARO_PULSO: 0xa5f3fc,

  // Rajada lateral: ao ver o jogador, mira (cone piscando) e sopra para longe em vez de matar
  TEMPO_MIRA_MS: 600,
  TEMPO_RAJADA_MS: 300,
  RECARGA_RAJADA_MS: 1400,
  COR_MIRA: 0xffffff,
  INTERVALO_PISCAR_MIRA_MS: 80,
  ALCANCE_RAJADA: 320,
  ALTURA_RAJADA: 160, // Distância vertical máxima para a rajada atingir o jogador
  EMPURRAO_X: 420,
  EMPURRAO_Y: -160,
  DURACAO_EMPURRAO_MS: 300,

  // Sentinela hackeada que vira balsa: fica pousada em cima do deck
  ALTURA_SOBRE_PLATAFORMA: 44,
} as const;

export const CHECKPOINTS_FASE1 = {
  INICIAL: { x: 120, y: 530 },
  CP1: {
    ID: 'cp1_plato_alto',
    GATILHO_X: 1500,
    GATILHO_Y_MAX: 210,
    PONTO: { x: 1540, y: 152 },
    NOME: 'CHECKPOINT 1 // PLATÔ DOS VENTOS',
  },
  CP2: {
    ID: 'cp2_mirante',
    GATILHO_X: 5498,
    GATILHO_Y_MAX: 160,
    PONTO: { x: 5538, y: 102 },
    NOME: 'CHECKPOINT 2 // MIRANTE DO ELEVADOR',
  },
  CP3: {
    ID: 'cp3_topo_escada',
    GATILHO_X: 8238,
    GATILHO_Y_MAX: 100,
    PONTO: { x: 8268, y: 40 },
    NOME: 'CHECKPOINT 3 // TOPO DA ESCADA DE RAJADAS',
  },
  CP4: {
    ID: 'cp4_arena',
    GATILHO_X: 9098,
    GATILHO_Y_MAX: 540,
    PONTO: { x: 9138, y: 472 },
    NOME: 'CHECKPOINT 4 // ARENA DO HELIO',
  },
  LIMITE_QUEDA_Y: 690,
  MARGEM_ALTURA_SEGURA: 120, // Só salva checkpoint se o jogador estiver acima de LIMITE_QUEDA_Y - margem
} as const;

export const DISTANCIA_INTERACAO_TOTEM_PADRAO = 80;
export const DISTANCIA_INTERACAO_NPC_PADRAO = 90;
export const OFFSET_PROMPT_TOTEM_Y = 50;
export const ERROS_PARA_ESQUELETO = 3; // Erros no mesmo totem até o help mostrar o esqueleto da resposta

export const NPCS_FASE1 = {
  SUCATINHA: { ID: 'npc_sucatinha', X: 1240, Y: 440, TEXTURA: 'npc-sucatinha' },
  MAGO_NUVEM: { ID: 'npc_mago_nuvem', X: 6648, Y: 264, TEXTURA: 'npc-mago-nuvem' },
  POMBO: { ID: 'npc_pombo', X: 8998, Y: 534, TEXTURA: 'npc-pombo' },
} as const;

// =============================================================================
// OS 4 DESAFIOS LÓGICOS DA FASE 1
// =============================================================================

export const TOTEM_1_ALCOOLEMIA = {
  ID: 'totem_1_sentinela_escudo',
  X: 3628,
  Y: 325,
  // Parede de vento que bloqueia o fim do platô até o escudo cair
  BARREIRA: { x: 3898, y: 210, scaleX: 0.2, scaleY: 8.4 },
  ESCUDO_VISUAL: { x: 3888, y: 60, largura: 20, altura: 300 },
  // A sentinela patrulha sobre o vão; hackeada, vira a balsa que atravessa o mesmo vão
  SENTINELA: {
    x: 3988,
    y: 328,
    minX: 3988,
    maxX: 4928,
    velocidade: 90,
    podeDispararPulso: false,
    deteccao: 'rajada',
  },
  BALSA: { y: 372, minX: 3988, maxX: 4928, velocidade: 150, pausaMs: 700 },
} as const;

export const TOTEM_2_BALANCA = {
  ID: 'totem_2_balanca_nuvens',
  X: 5058,
  Y: 365,
  ALTITUDE_ALVO: 350,
  ELEVADOR_X: 5348,
  ELEVADOR_Y_INICIAL: 540,
  PLACA_OFFSET: { x: 65, y: -45 },
  // Altitudes simuladas para validar o if/elif/else (inclui as fronteiras 349, 350 e 351)
  ALTITUDES_TESTE: [540, 300, 350, 349, 351, 0, 1000],
} as const;

export const TOTEM_3_PORTAO = {
  ID: 'totem_3_portao_existencial',
  X: 7408,
  Y: 385,
  X_PORTAO: 7608,
  Y_PORTAO: 290,
  ESCALA_Y_PORTAO: 1.3, // 260 px de altura: alto demais para pular por cima
  DESLOCAMENTO_ABERTO_Y: 240,
  ALFA_ABERTO: 0.15,
} as const;

export const TOTEM_4_SEQUENCIADOR = {
  ID: 'totem_4_sequenciador_rajadas',
  X: 7818,
  Y: 385,
  PERIODO_PADRAO_MS: 1500,
  FORCA_PADRAO: 450,
  ORDEM_CORRETA: 'crescente',
  INTERVALO_MIN: 1.2,
  INTERVALO_MAX: 1.8,
  FORCA_MIN: 400,
  FORCA_MAX: 650,
  // Valores errados rodam a escada por alguns segundos para o jogador ver o problema
  SIMULACAO_ATRASO_MS: 900,
  SIMULACAO_MS: 2600,
  // Três colunas encostadas, cada uma mais alta: o jogador "surfa" de uma para a outra
  // conforme elas ligam em ordem. O topo da escada fica 310 px acima do platô do totem.
  COLUNA_ESCADA_1: { x: 7988, y: 500, largura: 80, altura: 400, forca: 450, ativa: false },
  COLUNA_ESCADA_2: { x: 8068, y: 440, largura: 80, altura: 520, forca: 450, ativa: false },
  COLUNA_ESCADA_3: { x: 8148, y: 380, largura: 80, altura: 640, forca: 450, ativa: false },
} as const;

export const ARENA_FASE1 = {
  // Porta que sobe atrás do jogador ao entrar na arena (mesmo gatilho do checkpoint 4)
  PORTA: { x: 8913, y: 430, escalaY: 1.3, deslocamentoAbertaY: 260, gatilhoX: 9098 },
  PORTAL: { x: 9938, y: 480 },
  DISTANCIA_PORTAL: 60,
  COLUNAS_DOURADAS: [
    { x: 9818, y: 400 },
    { x: 10058, y: 400 },
  ],
  FEIXES_LUZ: [
    { topoX: 9818, baseX1: 9738, baseX2: 9898, baseY: 560 },
    { topoX: 10058, baseX1: 9978, baseX2: 10138, baseY: 560 },
  ],
} as const;

// =============================================================================
// LEVEL DESIGN POR BLOCO (~4 min de jogo sem o boss)
// =============================================================================

/**
 * BLOCO 1: Introdução (x 0 → 2918). Andar, pular, mármore rachado,
 * coluna de vento obrigatória e o primeiro vão que só se atravessa planando.
 */
export const BLOCO_1_LEVEL_DESIGN = {
  PLATAFORMAS: [
    { x: 300, y: 638, scaleX: 2.5, scaleY: 1 }, // Chão inicial, topo 620
    { x: 760, y: 578, scaleX: 1, scaleY: 1 }, // Degrau, topo 560
    { x: 1640, y: 258, scaleX: 1.4, scaleY: 1 }, // Platô alto (CP1), topo 240: só pela coluna
    { x: 2738, y: 418, scaleX: 1.5, scaleY: 1 }, // Pouso depois do vão de 750 px, topo 400 (a corrida perfeita alcança ~860 px: o teto do mundo corta o pulo)
  ],
  RACHADOS: [{ x: 1010, y: 536 }], // topo 520
  NUVENS: [{ x: 1240, y: 492 }], // topo 470, onde fica a Sucatinha
  COLUNAS_VENTO: [{ x: 1420, y: 410, largura: 90, altura: 500, forca: 400, ativa: true }],
  DECORACAO: [
    { x: 100, y: 490, scaleX: 1, scaleY: 1 },
    { x: 420, y: 490, scaleX: 1, scaleY: 1 },
    { x: 1490, y: 162, scaleX: 0.8, scaleY: 0.6 }, // Obelisco do CP1
  ],
} as const satisfies BlocoNivelFase1;

/**
 * BLOCO 2: Vento contrário e Desafios 1 e 2 (x 2918 → 5728).
 * Nuvens efêmeras contra o vento, o escudo da Sentinela A-01, a balsa
 * em que ela se transforma e o elevador de nuvem.
 */
export const BLOCO_2_LEVEL_DESIGN = {
  PLATAFORMAS: [
    { x: 3738, y: 378, scaleX: 1.5, scaleY: 1 }, // Platô do Totem 1, topo 360
    { x: 5118, y: 418, scaleX: 1, scaleY: 1 }, // Platô do Totem 2, topo 400
    { x: 5608, y: 208, scaleX: 1, scaleY: 1 }, // Mirante (CP2), topo 190: só pelo elevador
  ],
  EFEMERAS: [
    { x: 3098, y: 402 }, // topo 380
    { x: 3378, y: 382 }, // topo 360
  ],
  ZONAS_CONTRARIAS: [{ x: 3238, y: 380, largura: 600, altura: 360, forca: 75 }],
  DECORACAO: [{ x: 5508, y: 112, scaleX: 0.8, scaleY: 0.6 }], // Obelisco do CP2
} as const satisfies BlocoNivelFase1;

/**
 * BLOCO 3: Ruínas e Desafios 3 e 4 (x 5728 → 8828).
 * Cânion com gêiser, plataforma em trilho sob a sentinela de pulso,
 * o portão milenar, a escada de rajadas e a sentinela de alerta máximo no topo.
 */
export const BLOCO_3_LEVEL_DESIGN = {
  PLATAFORMAS: [
    { x: 6098, y: 618, scaleX: 2.1, scaleY: 1 }, // Fundo do cânion, topo 600
    { x: 6608, y: 318, scaleX: 1, scaleY: 1 }, // Platô do Mago, topo 300: só pelo gêiser
    { x: 7648, y: 438, scaleX: 2.5, scaleY: 1 }, // Platô do portão e do Totem 4, topo 420
    { x: 8528, y: 128, scaleX: 2.5, scaleY: 1 }, // Topo da escada (CP3), topo 110
  ],
  GEISERES: [
    {
      x: 6308,
      yBase: 600,
      largura: 80,
      altura: 400,
      forca: 650,
      periodoMs: 2800,
      duracaoMs: 500,
      avisoMs: 900,
      defasagemMs: 0,
    },
  ],
  TRILHOS: [
    { x: 6828, y: 312, deslocamentoX: 360, deslocamentoY: 0, velocidade: 110, pausaMs: 500 }, // topo 300
  ],
  ZONAS_CONTRARIAS: [{ x: 7018, y: 300, largura: 560, altura: 300, forca: 75 }],
  SENTINELAS: [
    // S-02: patrulha sobre o trilho, solta pulso eólico e sopra quem ela vê
    { x: 6828, y: 180, minX: 6828, maxX: 7188, velocidade: 80, podeDispararPulso: true, deteccao: 'rajada' },
    // S-03: alerta máximo no topo da escada; quem for visto volta ao checkpoint
    { x: 8538, y: 40, minX: 8538, maxX: 8758, velocidade: 90, podeDispararPulso: false, deteccao: 'respawn' },
  ],
  DECORACAO: [{ x: 8243, y: 58, scaleX: 0.6, scaleY: 0.4 }], // Obelisco do CP3
} as const satisfies BlocoNivelFase1;

/**
 * BLOCO 4: Arena do boss (x 8828 → 10178). Por enquanto termina no portal;
 * o Helio entra na Onda 5.
 */
export const BLOCO_4_LEVEL_DESIGN = {
  PLATAFORMAS: [{ x: 9498, y: 578, scaleX: 5, scaleY: 1 }], // Chão da arena, topo 560
  DECORACAO: [{ x: 9128, y: 482, scaleX: 0.8, scaleY: 0.6 }], // Obelisco do CP4
} as const satisfies BlocoNivelFase1;

export const BLOCOS_NIVEL_FASE1: readonly BlocoNivelFase1[] = [
  BLOCO_1_LEVEL_DESIGN,
  BLOCO_2_LEVEL_DESIGN,
  BLOCO_3_LEVEL_DESIGN,
  BLOCO_4_LEVEL_DESIGN,
];
