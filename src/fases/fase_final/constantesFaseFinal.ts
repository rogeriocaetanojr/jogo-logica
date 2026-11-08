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
