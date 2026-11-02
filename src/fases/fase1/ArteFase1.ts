/**
 * Direção de arte da Fase 1: Céu Partido.
 * Paleta extraída dos mockups do Stitch (docs/fase1/mockup) e das referências
 * (Celeste, Rivals of Aether, Air Man). Toda cor nova do cenário sai daqui.
 * O resumo do estilo está em docs/fase1/ESTETICA.md.
 */
export const CORES_FASE1 = {
  // Céu em faixas: ciano no alto, lavanda, rosa e pêssego no horizonte
  CEU_FAIXAS: [0x8ad8ec, 0xa5cdf2, 0xb9bdf6, 0xc9b5f4, 0xdcb2ea, 0xedb5dc, 0xf8bccd, 0xfdc6b8, 0xfed9c4],
  SOL: 0xfff4d6,
  SOL_HALO: 0xfde2c0,

  // Nuvens
  NUVEM: 0xffffff,
  NUVEM_SOMBRA: 0xe6defb,
  NUVEM_SOMBRA_ESCURA: 0xc9bdf0,
  NUVEM_ROSA: 0xfbd3e4,
  NUVEM_ROSA_SOMBRA: 0xeeb4d0,
  NUVEM_PESSEGO: 0xfde3d4,
  FAIXA_CLARA: 0xf4ecff,
  FAIXA_ESCURA: 0xb2a6e6,

  // Silhuetas distantes (ilhas, ruínas e dirigíveis somem no ar)
  DISTANTE_1: 0xc8bdf1,
  DISTANTE_2: 0xb6a9e8,
  DISTANTE_3: 0xa496dc,
  DISTANTE_LUZ: 0xe9e2ff,

  // Mármore
  MARMORE: 0xfaf6f0,
  MARMORE_LUZ: 0xffffff,
  MARMORE_SOMBRA: 0xe3dcea,
  MARMORE_ESCURO: 0xc3b8d6,
  MARMORE_VEIO: 0xd2c8e2,

  // Ouro e musgo dourado
  OURO: 0xfcd34d,
  OURO_CLARO: 0xfef3c7,
  OURO_ESCURO: 0xd99a1e,
  OURO_SOMBRA: 0xa86f12,
  MUSGO: 0xe8c547,

  // Rocha das ilhas flutuantes
  ROCHA: 0x9f92c8,
  ROCHA_CLARA: 0xbcb0e2,
  ROCHA_ESCURA: 0x76689f,
  ROCHA_FUNDO: 0x584b80,

  // Energia (hologramas, runas, vento)
  CIANO: 0x06b6d4,
  CIANO_CLARO: 0x67e8f9,
  CIANO_BRILHO: 0xcffafe,
  VENTO: 0xb8f1fb,

  // Tecnologia hostil (sentinelas, geradores)
  TECH: 0x0b0f19,
  TECH_MEDIO: 0x1e2235,
  TECH_CLARO: 0x3b4160,
  TECH_REFLEXO: 0x5b6386,
  ALERTA: 0xef4444,
  ALERTA_CLARO: 0xfca5a5,
  HACKEADO: 0x10b981,
  HACKEADO_CLARO: 0x6ee7b7,

  // Rachadura que brilha (mármore instável)
  RACHADURA: 0xfb923c,
  RACHADURA_BRILHO: 0xfde68a,

  // Helio: deus-sol showman (loiro, pele de mármore, branco/prata, vermelho e magenta)
  HELIO_PELE: 0xf6eee4,
  HELIO_PELE_SOMBRA: 0xdccfc2,
  HELIO_CABELO: 0xfcd34d,
  HELIO_CABELO_SOMBRA: 0xe0a422,
  HELIO_CABELO_LUZ: 0xfff1b0,
  HELIO_ARMADURA: 0xf1f5f9,
  HELIO_ARMADURA_SOMBRA: 0xb9c2d0,
  HELIO_VERMELHO: 0xdc2626,
  HELIO_VERMELHO_ESCURO: 0x991b1b,
  HELIO_CAPA: 0xc026d3,
  HELIO_CAPA_ESCURA: 0x701a75,
  HELIO_CAPA_FORRO: 0x1a0b24,
  HELIO_OLHO: 0x22d3ee,

  // Bandeira dos mirantes (o vermelho do topo da montanha no Celeste)
  BANDEIRA: 0xe2504a,
  BANDEIRA_SOMBRA: 0xb83a36,
  BANDEIRA_LUZ: 0xf47a6e,

  // Portal do santuário
  PORTAL_FUNDO: 0x3b0a45,
  PORTAL_ROSA: 0xf9a8d4,
  PORTAL_LILAS: 0xc4b5fd,
} as const;

/**
 * Camadas do parallax: textura, altura na tela e quanto andam em relação à câmera.
 * Quanto menor o fator, mais distante a camada parece.
 */
export const CENARIO_FASE1 = {
  LARGURA_TELA: 1280,
  ALTURA_TELA: 720,
  PROFUNDIDADE_CEU: -20,
  CAMADAS: [
    { chave: 'bg-ilhas-distantes', y: 250, fator: 0.12, deriva: 0, profundidade: -16 },
    { chave: 'bg-ruinas', y: 260, fator: 0.28, deriva: 0, profundidade: -14 },
    { chave: 'bg-mar-nuvens', y: 520, fator: 0.45, deriva: 6, profundidade: -12 },
    { chave: 'bg-mar-nuvens-perto', y: 610, fator: 0.7, deriva: 10, profundidade: -10 },
  ],
  SOL: { x: 1010, y: 150, raio: 46 },
  // Nuvens soltas que atravessam o céu em alturas, tamanhos e velocidades sorteados.
  // As mais distantes são menores, mais lentas, mais apagadas e puxadas para o lilás.
  NUVENS_FUNDO: {
    QUANTIDADE: 13,
    VARIANTES: 4,
    FATOR_MIN: 0.03,
    FATOR_MAX: 0.24,
    ESCALA_MIN: 0.4,
    ESCALA_MAX: 1.15,
    Y_MIN: 40,
    Y_MAX: 330,
    VELOCIDADE_MIN: 5,
    VELOCIDADE_MAX: 22,
    OSCILACAO_VELOCIDADE: 0.35, // Rajadas: a velocidade varia até 35% para cima e para baixo
    BALANCO_Y: 6,
    ALFA_LONGE: 0.7,
    ALFA_PERTO: 0.97,
    TINT_LONGE: 0xe4dcff,
  },
  // Balanço vertical bem leve das camadas de nuvem
  BALANCO_CAMADAS: 3,
  DIRIGIVEIS: [
    { x: 260, y: 170, escala: 0.55, fator: 0.08, velocidade: 6 },
    { x: 1150, y: 230, escala: 0.8, fator: 0.14, velocidade: -9 },
    { x: 2100, y: 140, escala: 0.45, fator: 0.06, velocidade: 4 },
  ],
  PASSAROS: { QUANTIDADE: 5, VELOCIDADE: 60, FATOR: 0.6, Y_MIN: 120, Y_MAX: 300 },
  // Nuvens de primeiro plano, na frente de tudo e bem transparentes
  NEBLINA_FRENTE: { y: 690, fator: 1.25, alfa: 0.55, profundidade: 30 },

  // Ilhas flutuantes sob as plataformas de mármore
  ILHA: { FUNDO_MIN: 70, FUNDO_MAX: 170, PROPORCAO_FUNDO: 0.32, PROFUNDIDADE: -1 },
  CACHOEIRA: { LARGURA: 14, VELOCIDADE: 90, ALFA: 0.75 },
} as const;

/**
 * Objetos de ambiente (só visuais, sem colisão). Coordenadas do mundo.
 * As cachoeiras saem da borda de uma ilha; o índice aponta a plataforma em BLOCOS_NIVEL_FASE1.
 */
export const AMBIENTE_FASE1 = {
  // Estátuas quebradas sobre pedestal (atrás do jogador)
  ESTATUAS: [
    { x: 260, base: 620, escala: 1, espelhar: false },
    { x: 12270, base: 560, escala: 1.15, espelhar: false },
    { x: 12680, base: 560, escala: 1.15, espelhar: true },
  ],
  // Cachoeiras que caem de baixo das ilhas para o vazio (topo = topo da plataforma)
  CACHOEIRAS: [
    { x: 1560, topo: 240 },
    { x: 2850, topo: 400 },
    { x: 5540, topo: 190 },
    { x: 10300, topo: 130 },
  ],
  // Bandeiras nos mirantes dos checkpoints: tremulam com o vento
  BANDEIRAS: [
    { x: 1760, base: 240 },
    { x: 5680, base: 190 },
    { x: 10350, base: 130 },
  ],
} as const;
