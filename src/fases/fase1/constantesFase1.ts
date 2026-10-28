/**
 * Constantes e configurações do level design, física e puzzles da Fase 1: Céu Partido.
 * Centraliza todos os números mágicos e coordenadas. Textos e diálogos ficam em DialogosFase1.ts.
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

    // Posições provisórias para teste do vento; o layout final é definido junto com o level design
    ZONAS: [
      { x: 1530, y: 400, largura: 380, altura: 400, forca: 75 },
      { x: 3210, y: 380, largura: 620, altura: 400, forca: 75 },
    ],
  },

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
  PROFUNDIDADE_PULSO: 8,

  // Mecânica de Pulso Eólico (Modo Scanner -> Modo Pulso a cada 3.5s)
  TEMPO_SCANNER_MS: 3500,
  TEMPO_CARGA_PULSO_MS: 1000,
  TEMPO_DISPARO_PULSO_MS: 400,
  RAIO_PULSO_MAX: 180,
  FORCA_PULSO_DESCENDENTE: 550,
  COR_CARGA_PULSO: 0x38bdf8,
  COR_DISPARO_PULSO: 0xa5f3fc,

  // Sentinelas do Level Design
  SENTINELA_1: {
    x: 2120,
    y: 430,
    minX: 2040,
    maxX: 2260,
    velocidade: 80,
    podeDispararPulso: true,
  },
  SENTINELA_3: {
    x: 3940,
    y: 340,
    minX: 3870,
    maxX: 4040,
    velocidade: 90,
    podeDispararPulso: true,
  },
} as const;

export const CHECKPOINTS_FASE1 = {
  INICIAL: { x: 120, y: 520 }, // Chão inicial em y=640 (topo ≈ 618.4), pés do jogador em 520 + 58 = 578 (40.4px acima)
  CP1: {
    ID: 'cp1_central',
    GATILHO_X: 1680,
    GATILHO_Y_MAX: 520,
    PONTO: { x: 1740, y: 390 }, // Platô Bloco 1 em y=500 (topo ≈ 478.4), pés em 390 + 58 = 448 (30.4px acima)
    NOME: 'CHECKPOINT 1 // SETOR CENTRAL',
  },
  CP2: {
    ID: 'cp2_elevador',
    GATILHO_X: 2750,
    GATILHO_Y_MAX: 420,
    PONTO: { x: 2820, y: 280 }, // Platô do Elevador em y=390 (topo = 372.0), pés em 280 + 58 = 338 (34px acima)
    NOME: 'CHECKPOINT 2 // PLATÔ DO ELEVADOR',
  },
  CP3: {
    ID: 'cp3_portao',
    GATILHO_X: 3550,
    GATILHO_Y_MAX: 490,
    PONTO: { x: 3600, y: 355 }, // Platô do Portão em y=470 (topo ≈ 448.4), pés em 355 + 58 = 413 (35.4px acima)
    NOME: 'CHECKPOINT 3 // PORTÃO MILENAR',
  },
  CP4: {
    ID: 'cp4_ante_camara',
    GATILHO_X: 4720,
    GATILHO_Y_MAX: 370,
    PONTO: { x: 4760, y: 230 }, // Platô da Antecâmara em y=340 (topo = 322.0), pés em 230 + 58 = 288 (34px acima)
    NOME: 'CHECKPOINT 4 // ENTRADA DA ANTECÂMARA',
  },
  LIMITE_QUEDA_Y: 690,
  MARGEM_ALTURA_SEGURA: 120, // Só salva checkpoint se o jogador estiver acima de LIMITE_QUEDA_Y - margem
} as const;

export const DISTANCIA_INTERACAO_TOTEM_PADRAO = 80;
export const DISTANCIA_INTERACAO_NPC_PADRAO = 90;
export const OFFSET_PROMPT_TOTEM_Y = 50;

export const NPCS_FASE1 = {
  SUCATINHA: {
    ID: 'npc_sucatinha',
    X: 1200,
    Y: 390,
    TEXTURA: 'npc-sucatinha',
    OFFSET_NUVEM_Y: 40,
  },
  MAGO_NUVEM: {
    ID: 'npc_mago_nuvem',
    X: 3400,
    Y: 390,
    TEXTURA: 'npc-mago-nuvem',
    OFFSET_NUVEM_Y: 45,
  },
} as const;

// =============================================================================
// OS 4 DESAFIOS LÓGICOS DA FASE 1
// =============================================================================

export const TOTEM_1_ALCOOLEMIA = {
  ID: 'totem_1_sentinela_escudo',
  X: 1880,
  Y: 480,
  BARREIRA: { x: 2160, y: 430, scaleX: 0.2, scaleY: 3.5 },
  ESCUDO_VISUAL: { x: 2150, y: 330, largura: 20, altura: 200 },
} as const;

export const TOTEM_2_BALANCA = {
  ID: 'totem_2_balanca_nuvens',
  X: 2480,
  Y: 534,
  ALTITUDE_ALVO: 350,
  ELEVADOR_X: 2620,
  ELEVADOR_Y_INICIAL: 540,
  PLACA_OFFSET: { x: 65, y: -45 },
} as const;

export const TOTEM_3_PORTAO = {
  ID: 'totem_3_portao_existencial',
  X: 3620,
  Y: 450,
  X_PORTAO: 3720,
  Y_PORTAO: 390,
  DESLOCAMENTO_ABERTO_Y: 160,
  ALFA_ABERTO: 0.15,
} as const;

export const TOTEM_4_SEQUENCIADOR = {
  ID: 'totem_4_sequenciador_rajadas',
  X: 4100,
  Y: 434,
  PERIODO_PADRAO_MS: 1500,
  FORCA_PADRAO: 450,
  COLUNA_ESCADA_1: {
    x: 4260,
    y: 290,
    largura: 80,
    altura: 420,
    forca: 450,
    ativa: false,
  },
  COLUNA_ESCADA_2: {
    x: 4440,
    y: 230,
    largura: 80,
    altura: 480,
    forca: 450,
    ativa: false,
  },
  COLUNA_ESCADA_3: {
    x: 4620,
    y: 170,
    largura: 80,
    altura: 540,
    forca: 450,
    ativa: false,
  },
} as const;

export const SANTUARIO_FASE1 = {
  DISTANCIA_PORTAL: 60,
  CHAO: { x: 5260, yOffset: 60, scaleX: 3.0, scaleY: 1.4 },
  COLUNAS_DOURADAS_X: [5120, 5240, 5340],
  COLUNAS_DOURADAS_Y_OFFSET: 210,
  PORTAL: { x: 5300, yOffset: 140 },
  FEIXES_LUZ: [
    { topoX: 5020, baseX1: 4940, baseX2: 5100, baseY: 660 },
    { topoX: 5280, baseX1: 5180, baseX2: 5380, baseY: 660 },
  ],
} as const;

// =============================================================================
// LEVEL DESIGN POR BLOCO
// =============================================================================

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

export const BLOCO_2_LEVEL_DESIGN = {
  PLATO_TOTEM_1: { x: 1880, y: 540, scaleX: 1.2, scaleY: 1.0 },
  PLATO_SOB_SENTINELA: { x: 2140, y: 590, scaleX: 1.0, scaleY: 1.0 },
  PLATO_TOTEM_2: { x: 2480, y: 590, scaleX: 1.0, scaleY: 1.0 },
  PLATO_APOS_ELEVADOR: { x: 2820, y: 390, scaleX: 1.2, scaleY: 1.0 },
  PLATO_INTERMEDIARIO: { x: 3000, y: 470, scaleX: 1.0, scaleY: 1.0 },
  CORREDOR: { x: 3200, y: 450, scaleX: 1.6, scaleY: 1.0 },
  MARMORE_RACHADO_1: { x: 3480, y: 440 },
  PLATO_CHEGADA: { x: 3600, y: 470, scaleX: 1.4, scaleY: 1.2 },
  OBELISCO_CP3: { x: 3560, y: 390, scaleX: 0.8, scaleY: 0.6 },
} as const;

export const BLOCO_3_LEVEL_DESIGN = {
  NUVEM_TOTEM_4: { x: 4100, y: 490 },
  MARMORE_RACHADO_1: { x: 4350, y: 420 },
  MARMORE_RACHADO_2: { x: 4530, y: 360 },
  PLATO_APOS_ESCADA: { x: 4760, y: 340, scaleX: 1.2, scaleY: 1.0 },
  PLATO_ANTECAMARA: { x: 4860, y: 330, scaleX: 0.8, scaleY: 1.0 },
} as const;
