/**
 * Constantes e configurações do level design, física e puzzles da Fase 1: Céu Partido.
 * Centraliza todos os números mágicos para facilitar ajustes finos e manutenção.
 */

export const MUNDO_FASE1 = {
  LARGURA: 5400,
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
  TINT_RACHANDO: 0xf87171,
  PROFUNDIDADE: 10,
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
  FORCA_VENTO_LATERAL: 90, // Força contínua de arraste horizontal para a esquerda
  SUSTENTACAO_PASSIVA_DELTA: 15,
  COR_FUNDO_COLUNA: 0x38bdf8,
  ALFA_FUNDO_COLUNA: 0.22,
  COR_BORDA_COLUNA: 0xa5f3fc,
  ALFA_BORDA_COLUNA: 0.6,
  ESPESSURA_BORDA_COLUNA: 1.5,
  PROFUNDIDADE_GRAFICO: 1,

  // Colunas do Bloco 1 (Tutorial de Vento)
  COLUNA_1: {
    x: 720,
    y: 360,
    largura: 90,
    altura: 360,
    forca: 380,
    ativa: true,
  },
  COLUNA_2: {
    x: 1260,
    y: 280,
    largura: 90,
    altura: 420,
    forca: 420,
    ativa: true,
  },
} as const;

export const MARMORE_RACHADO_FASE1 = {
  TEMPO_TELEGRAPH_MS: 400,
  TEMPO_RESPAWN_MS: 3000,
  DURACAO_FADE_IN_MS: 350,
  TREMOR_VELOCIDADE: 0.08,
  TREMOR_AMPLITUDE: 2,
} as const;

export const SENTINELAS_FASE1 = {
  ALCANCE_VISAO_PADRAO: 220,
  ABERTURA_CONE_PADRAO: 38,
  OSCILACAO_Y_VEL: 0.004,
  OSCILACAO_Y_AMP: 6,
  OFFSET_PONTA_CONE_X: 18,
  HACKEADA_LIMITE_X: 3500,
  HACKEADA_VELOCIDADE: 120,
  COR_CONE_ALERTA: 0xef4444,
  COR_CONE_HACKEADA: 0x10b981,
  ALFA_CONE_FUNDO: 0.2,
  ALFA_CONE_BORDA: 0.6,
  PROFUNDIDADE_SPRITE: 6,
  PROFUNDIDADE_CONE: 7,

  // Sentinelas do Level Design
  SENTINELA_1: {
    x: 2120,
    y: 430,
    minX: 2040,
    maxX: 2260,
    velocidade: 80,
  },
  SENTINELA_B02: {
    x: 3180,
    y: 390,
    minX: 3100,
    maxX: 3280,
    velocidade: 75,
  },
  SENTINELA_3: {
    x: 3940,
    y: 340,
    minX: 3870,
    maxX: 4040,
    velocidade: 90,
  },
} as const;

export const CHECKPOINTS_FASE1 = {
  INICIAL: { x: 120, y: 560 },
  GATILHO_CP1_X: 1650,
  PONTO_CP1: { x: 1740, y: 440 },
  GATILHO_CP2_X: 3520,
  PONTO_CP2: { x: 3600, y: 450 },
  LIMITE_QUEDA_Y: 690,
} as const;

export const PUZZLE_1_FASE1 = {
  DISTANCIA_INTERACAO_TOTEM: 80,
  DISTANCIA_ATIVACAO_ALTAR: 46,
  ALTAR_A_NUVEM: { x: 2320, y: 450, scaleX: 0.8, scaleY: 1 },
  ALTAR_A_SPRITE: { x: 2320, y: 424 },
  ALTAR_B_NUVEM: { x: 2640, y: 450, scaleX: 0.8, scaleY: 1 },
  ALTAR_B_SPRITE: { x: 2640, y: 424 },
  PLATO_TOTEM: { x: 2480, y: 590, scaleX: 1.6, scaleY: 1.2 },
  TOTEM: { x: 2480, y: 534 },
  PROMPT: { x: 2480, y: 490 },
  ZONA_DECOLAGEM: { x: 2420, y: 560, largura: 120, altura: 30 },
  ZONA_TOLERANCIA_Y: 50,
  SUPER_COLUNA: {
    x: 2480,
    y: 180,
    largura: 120,
    altura: 520,
    forca: 600,
    ativa: false,
  },
  PLATO_ELEVADO: { x: 2780, y: 330 },
} as const;

export const PUZZLE_2_FASE1 = {
  DISTANCIA_INTERACAO_TOTEM: 80,
  PLATO_TOTEM: { x: 3000, y: 470 },
  TOTEM: { x: 2960, y: 414 },
  PROMPT: { x: 2960, y: 370 },
  CORREDOR_MARMORE: { x: 3220, y: 490, scaleX: 1.2, scaleY: 1 },
  MARMORE_RACHADO_SAIDA: { x: 3400, y: 450 },
  PLATO_BLOCO_2: { x: 3600, y: 510, scaleX: 1.6, scaleY: 1.2 },
  OBELISCO_CP2: { x: 3560, y: 435, scaleX: 0.8, scaleY: 0.6 },
} as const;

export const PUZZLE_3_FASE1 = {
  DISTANCIA_INTERACAO_TOTEM: 80,
  MARMORE_RACHADO_INICIAL: { x: 3780, y: 470 },
  NUVEM_TOTEM: { x: 4100, y: 490 },
  TOTEM: { x: 4100, y: 434 },
  PROMPT: { x: 4100, y: 390 },
  PERIODO_CICLO_MS: 1500,
  COLUNA_ESCADA_1: {
    x: 4260,
    y: 290,
    largura: 80,
    altura: 420,
    forca: 430,
    ativa: false,
  },
  COLUNA_ESCADA_2: {
    x: 4440,
    y: 230,
    largura: 80,
    altura: 480,
    forca: 430,
    ativa: false,
  },
  COLUNA_ESCADA_3: {
    x: 4620,
    y: 170,
    largura: 80,
    altura: 540,
    forca: 430,
    ativa: false,
  },
  MARMORE_RACHADO_1: { x: 4350, y: 390 },
  MARMORE_RACHADO_2: { x: 4530, y: 330 },
  NUVEM_POS_ESCADA: { x: 4780, y: 330 },
} as const;

export const SANTUARIO_FASE1 = {
  DISTANCIA_PORTAL: 60,
  CHAO: { x: 5200, yOffset: 60, scaleX: 3.5, scaleY: 1.4 },
  COLUNAS_DOURADAS_X: [5000, 5120, 5300, 5390],
  COLUNAS_DOURADAS_Y_OFFSET: 210,
  PORTAL: { x: 5220, yOffset: 140 },
} as const;

export const BLOCO_1_LEVEL_DESIGN = {
  CHAO_INICIAL: { x: 280, y: 640, scaleX: 2.5, scaleY: 1.2 },
  COLUNAS_DECORATIVAS: [
    { x: 100, y: 510 },
    { x: 420, y: 510 },
  ],
  NUVEM_1: { x: 560, y: 560 },
  MARMORE_RACHADO_1: { x: 890, y: 500 },
  NUVEM_2: { x: 1100, y: 440 },
  MARMORE_RACHADO_2: { x: 1400, y: 380 },
  MARMORE_RACHADO_3: { x: 1560, y: 320 },
  PLATO_CHEGADA: { x: 1740, y: 500, scaleX: 1.8, scaleY: 1.2 },
  OBELISCO_CP1: { x: 1700, y: 420, scaleX: 0.8, scaleY: 0.6 },
} as const;
