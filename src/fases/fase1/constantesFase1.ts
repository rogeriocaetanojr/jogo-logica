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
  LARGURA: 13168,
  ALTURA: 720,
  PADDING_INFERIOR: 200,
  COR_FUNDO: '#a855f7',
  FADE_IN_MS: 300,
  OPACIDADE_CRT: 0.02,
} as const;

/**
 * Efeitos sonoros sintetizados (SomFase1). Volumes de 0 a 1 sobre o volume geral dos efeitos.
 */
export const SOM_FASE1 = {
  // Os efeitos ficam acima da música: são eles que contam o que está acontecendo
  VOLUME_EFEITOS: 0.9,
  // Sons com posição somem quando estão a esta distância (além dos 300 px do centro da tela)
  ALCANCE_PX: 900,
  LACOS: { BASE: 0.04, PLANEIO: 0.08, COLUNA: 0.12, ZONA: 0.1, CHUVA: 0 },
  // Voz das falas: um bipe a cada N letras, com o tom sorteado pelo nome de quem fala
  VOZ_LETRAS_POR_BIPE: 2,
  // Sentinela por perto: bipe de varredura a cada intervalo
  SCANNER_INTERVALO_MS: 1400,
} as const;

/**
 * Trilha sonora (MusicaFase1): skyTheme no céu e helioTheme na luta. Tempos em segundos.
 * Volumes baixos de propósito: a música é fundo, os efeitos ficam por cima.
 */
export const MUSICA_FASE1 = {
  VOLUME_CEU: 0.17,
  VOLUME_HELIO: 0.2,
  VOLUME_SUSPENSE: 0.06, // Helio de joelhos, esperando o comando do núcleo
  VOLUME_CEU_VITORIA: 0.12,
  FATOR_ABAFADO: 0.35, // Fração do volume com terminal ou diálogo abertos
  FADE_PADRAO_S: 1.5,
  FADE_ENTRADA_S: 2.5,
  FADE_SAIDA_CEU_S: 1.2,
  FADE_ENTRADA_LUTA_S: 1,
  FADE_VITORIA_S: 3,
} as const;

/**
 * Sensação de movimento do jogador: esticar e achatar, inclinação ao planar e poeira.
 * O corpo físico nunca muda: só o sprite que se vê (JogadorFase1.visual).
 */
export const FEEL_FASE1 = {
  PULO: { x: 0.8, y: 1.25 },
  ATERRISSAGEM: { x: 0.3, y: 0.28 }, // Quanto achata no impacto máximo
  VELOCIDADE_MIN_ATERRISSAGEM: 140, // Abaixo disso, pousar não faz barulho nem poeira
  VELOCIDADE_IMPACTO_MAX: 620,
  RETORNO_FORMA: 14, // Quão rápido volta ao normal (1 / s)
  INCLINACAO_PLANEIO_GRAUS: 9,
  INCLINACAO_SUAVIZACAO: 10,
  PASSO_INTERVALO_MS: 230,
  VELOCIDADE_MIN_PASSO: 60,
  POEIRA: { VIDA_MS: 420, RAIO_MIN: 3, RAIO_MAX: 7, COR: 0xe3dcea, ALFA: 0.75 },
  // Zoom suave quando o Helio chega (a arena tem a largura da tela, então é só um empurrãozinho)
  ZOOM_INTRO: 1.06,
  ZOOM_INTRO_MS: 900,
  ZOOM_VOLTA_MS: 700,
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
  // Feixe da coluna: faixas sobrepostas (o centro fica mais forte) e fitas em espiral (Onda 6)
  COR_FUNDO_COLUNA: 0x67e8f9,
  ALFA_FUNDO_COLUNA: 0.07,
  FAIXAS_FEIXE: 4,
  COR_BORDA_COLUNA: 0xcffafe,
  ALFA_BORDA_COLUNA: 0.45,
  ESPESSURA_BORDA_COLUNA: 1,
  COR_FITA: 0xffffff,
  ALFA_FITA: 0.6,
  ESPESSURA_FITA: 2,
  PASSO_FITA: 10,
  COMPRIMENTO_ONDA_FITA: 38,
  VELOCIDADE_FITA: 160,
  PROFUNDIDADE_GRAFICO: 1,
  // A velocidade das partículas acompanha a força da coluna (força fraca = partículas lentas)
  FORCA_REFERENCIA_PARTICULAS: 450,
  FATOR_PARTICULAS_MIN: 0.15,
  FATOR_PARTICULAS_MAX: 4,
  PERIODO_MIN_ESCADA_MS: 100,

  // Zonas de vento contrário: empurram o jogador devagar para a esquerda (andar e planar continuam possíveis)
  CONTRARIO: {
    COR_FUNDO: 0xe9d5ff,
    ALFA_FUNDO: 0.18,
    ALFA_MIOLO: 0.14,
    RAIO_NEVOA: 60,
    FADE_BORDA: 60,
    PARTICULAS_QUANTIDADE: 14,
    PARTICULAS_VEL_X_MIN: 170,
    PARTICULAS_VEL_X_MAX: 300,
    PARTICULAS_COMPRIMENTO_MIN: 110,
    PARTICULAS_COMPRIMENTO_MAX: 220,
    PARTICULAS_ALFA_MIN: 0.65,
    PARTICULAS_ALFA_MAX: 1,
    COR_PARTICULA: 0xffffff,
    COR_RASTRO: 0x67e8f9,
    // Fitas: espessura máxima = MIN + alfa × EXTRA (só no meio; as pontas afinam até zero)
    ESPESSURA_MIN: 2,
    ESPESSURA_EXTRA: 5,
    PONTOS_RISCO: 12,
    ONDA_FREQUENCIA: 0.035,
    ONDA_VELOCIDADE: 0.005,
    ONDA_AMPLITUDE: 7,
    CARACOL_A_CADA: 2,
    RAIO_CARACOL: 7,
    ESPESSURA_CARACOL: 3,
    // Golfadas de nuvem rolando dentro da corrente
    GOLFADAS: 6,
    GOLFADA_VELOCIDADE: 0.2,
    ALFA_GOLFADA: 0.5,

    // Biruta fixada na borda esquerda da zona, avisando de longe de onde vem o vento
    BIRUTA: {
      ALTURA_MASTRO: 70,
      COMPRIMENTO: 56,
      SEGMENTOS: 4,
      ALTURA_BASE: 20,
      ALTURA_PONTA: 9,
      ONDA_AMPLITUDE: 3,
      ONDA_VELOCIDADE: 0.01,
      COR_MASTRO: 0xf8fafc,
      COR_PONTA: 0xf59e0b,
      COR_SEGMENTO_A: 0xf97316,
      COR_SEGMENTO_B: 0xf8fafc,
      COR_SOMBRA_A: 0xc2410c,
      COR_SOMBRA_B: 0xd4cde0,
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
    SUBIDA_MS: 120, // O feixe da erupção cresce do chão até o topo neste tempo
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

// Plataformas móveis: só os 24 px de cima da textura colidem; o resto é casco e propulsor
export const ALTURA_CORPO_PLATAFORMA_MOVEL = 24;

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
    ID: 'cp3_gerador',
    GATILHO_X: 7950,
    GATILHO_Y_MAX: 400,
    PONTO: { x: 7950, y: 332 },
    NOME: 'CHECKPOINT 3 // PORTÃO MILENAR',
  },
  CP3B: {
    ID: 'cp3b_gerador',
    GATILHO_X: 8880,
    GATILHO_Y_MAX: 400,
    PONTO: { x: 8900, y: 332 },
    NOME: 'CHECKPOINT 4 // GERADOR TRIPLO',
  },
  CP4: {
    ID: 'cp4_topo_escada',
    GATILHO_X: 9788,
    GATILHO_Y_MAX: 120,
    PONTO: { x: 9818, y: 60 },
    NOME: 'CHECKPOINT 5 // TOPO DA ESCADA DE RAJADAS',
  },
  CP5: {
    ID: 'cp5_arena',
    GATILHO_X: 12088,
    GATILHO_Y_MAX: 540,
    PONTO: { x: 12128, y: 472 },
    NOME: 'CHECKPOINT 6 // ARENA DO HELIO',
  },
  LIMITE_QUEDA_Y: 690,
  MARGEM_ALTURA_SEGURA: 120, // Só salva checkpoint se o jogador estiver acima de LIMITE_QUEDA_Y - margem
} as const;

export const DISTANCIA_INTERACAO_TOTEM_PADRAO = 80;
export const DISTANCIA_INTERACAO_NPC_PADRAO = 90;
export const OFFSET_PROMPT_TOTEM_Y = 50;
// Terminal aberto sem nenhum comando por este tempo: o terminal puxa assunto
export const TERMINAL_OCIOSO_MS = 40000;

export const ERROS_PARA_ESQUELETO = 3; // Erros no mesmo totem até o help mostrar o esqueleto da resposta
// Chave mestra para testes: resolve o totem aberto, qualquer que seja
export const SENHA_MESTRA_FASE1 = 'senhamagicabrainrebase';

export const NPCS_FASE1 = {
  SUCATINHA: { ID: 'npc_sucatinha', X: 1240, Y: 428, TEXTURA: 'npc-sucatinha' },
  MAGO_NUVEM: { ID: 'npc_mago_nuvem', X: 6898, Y: 250, TEXTURA: 'npc-mago-nuvem' },
  POMBO: { ID: 'npc_pombo', X: 11680, Y: 386, TEXTURA: 'npc-pombo' },
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
  X: 7658,
  Y: 385,
  X_PORTAO: 7858,
  Y_PORTAO: 290,
  ESCALA_Y_PORTAO: 1.3, // 260 px de altura: alto demais para pular por cima
  DESLOCAMENTO_ABERTO_Y: 240,
  ALFA_ABERTO: 0.15,
  // Os três sensores da condição aparecem no cenário, cada um com o nome da variável
  PLACA: { x: 7755, y: 420, largura: 70 }, // Placa de pressão no chão, entre o totem e o portão
  CRISTAL: { x: 7806, y: 112 }, // energia_sol: cristal carregado à esquerda do topo do portão
  TURBINA: { x: 7914, y: 118 }, // energia_vento: turbina parada à direita do topo do portão
  COR_SENSOR_LIGADO: '#34d399',
  COR_SENSOR_DESLIGADO: '#94a3b8',
} as const;

export const TOTEM_4_SEQUENCIADOR = {
  ID: 'totem_4_sequenciador_rajadas',
  X: 8930,
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
  // A escada são três salas separadas por pilares de mármore (topo 150). Cada coluna sai de um
  // gerador no chão, na ponta direita da sala, e leva o jogador por cima do pilar seguinte.
  // Do chão (420) o pulo chega a 220 e não passa o pilar; planando do alto de uma coluna o jogador
  // perde 54 px de altura em ~150 px, e as salas têm 300 px: a ordem 1 → 2 → 3 é obrigatória.
  COLUNA_ESCADA_1: { x: 9058, y: 275, largura: 80, altura: 290, forca: 450, ativa: false },
  COLUNA_ESCADA_2: { x: 9398, y: 275, largura: 80, altura: 290, forca: 450, ativa: false },
  COLUNA_ESCADA_3: { x: 9738, y: 260, largura: 80, altura: 320, forca: 450, ativa: false },
} as const;

export const TOTEM_5_HELIO = {
  ID: 'totem_5_nucleo_helio',
} as const;

export const ARENA_FASE1 = {
  // Porta que sobe atrás do jogador ao entrar na arena (mesmo gatilho do checkpoint da arena).
  // O Pombo fica do lado de fora, na ilha dele, e dá para conversar com calma
  PORTA: { x: 11903, y: 430, escalaY: 1.3, deslocamentoAbertaY: 260, gatilhoX: 12088 },
  PORTAL: { x: 12928, y: 480 },
  DISTANCIA_PORTAL: 60,
  COLUNAS_DOURADAS: [
    { x: 12808, y: 400 },
    { x: 13048, y: 400 },
  ],
  FEIXES_LUZ: [
    { topoX: 12808, baseX1: 12728, baseX2: 12888, baseY: 560 },
    { topoX: 13048, baseX1: 12968, baseX2: 13128, baseY: 560 },
  ],
  // A arena (11888 → 13168) tem a largura exata da tela: durante a luta a câmera fica parada nela
  CAMERA_CENTRO: { x: 12528, y: 360 },
  CHAO_Y: 560,
  // Por onde os ataques do Helio alcançam: a arena inteira, da porta (x 11903) até o fim do chão.
  // Antes parava em 12150 e quem ficava para trás, perto da porta, não levava penas, pisões nem ondas.
  LIMITE_ESQUERDO: 11940,
  LIMITE_DIREITO: 13140,
  // Totem do núcleo, que só aparece quando o Helio cai de joelhos
  TOTEM_FINAL: { x: 12550, y: 525 },
} as const;

// =============================================================================
// BOSS: HELIO, SENHOR DOS VENTOS (estilo Bowser: padrão claro, leve variação, 3 golpes)
// =============================================================================

export const BOSS_HELIO_FASE1 = {
  X_INICIAL: 12890,
  LARGURA_CORPO: 90,
  ALTURA_CORPO: 120,
  VIDA: 3,
  // Cada vez que o Helio fica tonto ele sobe de nível: fica mais rápido (tempos divididos e projéteis
  // multiplicados por 1 + 0,15 × nível) e solta mais projéteis em todos os ataques (tabelas por nível).
  // Conta a tontura, não a vida: errar o pisão também deixa o próximo ciclo mais difícil.
  ACELERACAO_POR_TONTURA: 0.15,
  NIVEL_MAXIMO: 5, // Depois do último nível da tabela, a dificuldade para de subir
  PROFUNDIDADE: 8,
  PROFUNDIDADE_EFEITOS: 9,

  // Aviso antes de cada ataque: o jogador sempre vê o que vem
  TELEGRAFIA_RAJADA_MS: 700,
  TELEGRAFIA_SALTO_MS: 550,
  TELEGRAFIA_CHUVA_MS: 600,
  PAUSA_ENTRE_ATAQUES_MS: 350,

  // Rajada rasteira: ondas de vento no chão, na direção do jogador (pule por cima)
  ONDAS_POR_NIVEL: [5, 6, 7, 8, 9, 10],
  INTERVALO_ONDAS_MS: 650,
  ONDA_VELOCIDADE: 513, // 380 × 1,35
  ONDA_LARGURA: 46,
  ONDA_ALTURA: 64,

  // Salto com pisão: cai onde o jogador estava e solta ondas de choque para os dois lados
  SALTOS_POR_NIVEL: [2, 3, 4, 5, 6, 6],
  SALTO_MS: 1467, // Era 1100: salto 25% mais lento
  SALTO_ALTURA: 260,
  PAUSA_POS_SALTO_MS: 450,
  CHOQUE_VELOCIDADE: 459, // 340 × 1,35
  CHOQUE_LARGURA: 40,
  CHOQUE_ALTURA: 28,

  // Chuva de penas: o Helio voa e solta várias rodadas, uma ENCIMA da outra: a rodada seguinte começa
  // antes de a anterior terminar de cair. Cada rodada é uma cortina de penas com UM corredor livre
  // (a sombra de cada pena aparece no chão antes de ela cair). O corredor muda de lugar a cada rodada,
  // então o jogador precisa se mexer o tempo todo; uma pena também mira onde ele está agora.
  CHUVA_RODADAS_POR_NIVEL: [3, 3, 4, 4, 5, 5],
  PENAS_POR_RODADA_POR_NIVEL: [6, 8, 8, 10, 10, 12],
  INICIO_RODADAS_MS: 800, // Tempo entre o começo de uma rodada e o da seguinte (dividido pelo fator do nível)
  ESCALONAMENTO_MS: 300, // As sombras de uma rodada aparecem em varredura durante este tempo
  CORREDOR_MEIA_LARGURA: 58, // Nenhuma pena cai a menos disso do centro do corredor (o corpo pede 33)
  CORREDOR_DISTANCIA_INICIAL_MIN: 110, // Primeira rodada: o corredor nasce a esta distância do jogador
  CORREDOR_DISTANCIA_INICIAL_MAX: 180,
  CORREDOR_SALTO_MIN: 60, // Depois, o corredor anda de uma rodada para a outra o que o jogador alcança correndo
  CORREDOR_SALTO_MAX: 160,
  ALTURA_VOO: 230,
  SUBIDA_MS: 500,
  AVISO_PENA_MS: 620,
  AVISO_PENA_MIN_MS: 400, // Mesmo nos níveis altos, o jogador tem pelo menos isto para reagir
  PENA_VELOCIDADE: 1900, // Era 837 (1300 na revisão anterior): caem em ~0,3 s depois do aviso
  PENA_LARGURA: 22,
  PENA_ALTURA: 44,

  // Janela de tontura: é aqui que se pisa na cabeça
  TONTO_MS: 2500,
  FERIDO_MS: 900,
  ZONA_PISAO: 34, // Tolerância vertical (px) entre os pés do jogador e o topo da cabeça
  QUIQUE_PISAO: -520,
  HITSTOP_MS: 80,

  // Vida do jogador durante a luta
  CORACOES: 3,
  INVULNERAVEL_MS: 1000,
  EMPURRAO_DANO_X: 360,
  EMPURRAO_DANO_Y: -280,
  DURACAO_EMPURRAO_DANO_MS: 350,
  ATRASO_RECOMECO_MS: 1400,

  // Morte na luta: o jogador gira e some devagar enquanto a tela apaga
  MORTE_ANIMACAO_MS: 1600,
  MORTE_FADE_SAIDA_MS: 1800,
  MORTE_FADE_ENTRADA_MS: 1000,
  MORTE_COR_FADE: { r: 12, g: 8, b: 30 },
} as const;

// =============================================================================
// TEMPESTADE: o céu fecha quando o Helio entra e abre quando ele é desligado
// =============================================================================

export const TEMPESTADE_FASE1 = {
  COR_CEU: 0x1e1b4b,
  ALFA_CEU: 0.6,
  COR_NUVENS: 0x312e81,
  ALFA_NUVENS: 0.85,
  ENTRADA_MS: 900,
  SAIDA_MS: 2500,
  GOTAS_QUANTIDADE: 140,
  GOTA_VELOCIDADE_MIN: 700,
  GOTA_VELOCIDADE_MAX: 1100,
  GOTA_INCLINACAO: -0.22, // Deslocamento horizontal por pixel de queda (chuva tocada pelo vento)
  GOTA_COMPRIMENTO_MIN: 14,
  GOTA_COMPRIMENTO_MAX: 26,
  ALFA_GOTAS: 0.4,
  RAIO_INTERVALO_MIN_MS: 3500,
  RAIO_INTERVALO_MAX_MS: 7500,
  RAIO_DURACAO_MS: 280,
  PROFUNDIDADE_CEU: -3,
  PROFUNDIDADE_CHUVA: 40,
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
    { x: 100, y: 490, scaleX: 1, scaleY: 1, tipo: 'coluna' },
    { x: 420, y: 490, scaleX: 1, scaleY: 1, tipo: 'coluna' },
    { x: 1490, y: 162, scaleX: 0.8, scaleY: 0.6, tipo: 'obelisco' }, // Obelisco do CP1
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
  // Pilar depois do mirante (topo 300): do platô do Totem 2 (topo 400) o pulo + planeio alcança
  // ~455 px acima de 300 e o pilar está a 762 px; do mirante (topo 190) ele fica a 272 px.
  // Sem o elevador, não tem como seguir para o cânion.
  PAREDES: [{ x: 6020, y: 610, largura: 40, altura: 620 }],
  DECORACAO: [{ x: 5508, y: 112, scaleX: 0.8, scaleY: 0.6, tipo: 'obelisco' }], // Obelisco do CP2
} as const satisfies BlocoNivelFase1;

/**
 * BLOCO 3: Ruínas e Desafios 3 e 4 (x 5728 → 9228).
 * Cânion com gêiser, plataforma em trilho sob a sentinela de pulso,
 * o portão milenar, a escada de rajadas e a sentinela de alerta máximo no topo.
 */
export const BLOCO_3_LEVEL_DESIGN = {
  PLATAFORMAS: [
    { x: 6348, y: 618, scaleX: 2.1, scaleY: 1 }, // Fundo do cânion, topo 600
    { x: 6858, y: 318, scaleX: 1, scaleY: 1 }, // Platô do Mago, topo 300: só pelo gêiser
    { x: 7804, y: 438, scaleX: 1.72, scaleY: 1 }, // Platô do portão (CP3), topo 420
    { x: 8979, y: 438, scaleX: 0.99, scaleY: 1 }, // Platô do Totem 4 (CP4), topo 420
    { x: 9288, y: 438, scaleX: 1.25, scaleY: 1 }, // Sala 2 da escada, topo 420
    { x: 9628, y: 438, scaleX: 1.25, scaleY: 1 }, // Sala 3 da escada, topo 420
    { x: 10078, y: 148, scaleX: 2.5, scaleY: 1 }, // Topo da escada (CP5), topo 130: só pela coluna 3
  ],
  GEISERES: [
    {
      x: 6558,
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
  // Entre o portão e o gerador: mármore rachado, elevador em trilho vertical e nuvem efêmera.
  // O pilar em x 8760 (topo 250) só se passa de cima: do chão (topo 420) o pulo não chega.
  RACHADOS: [{ x: 8130, y: 436 }], // topo 420
  EFEMERAS: [{ x: 8560, y: 232 }], // topo 210
  TRILHOS: [
    { x: 8350, y: 412, deslocamentoX: 0, deslocamentoY: -170, velocidade: 90, pausaMs: 700 }, // sobe do topo 400 ao 230
    { x: 7078, y: 312, deslocamentoX: 360, deslocamentoY: 0, velocidade: 110, pausaMs: 500 }, // topo 300
  ],
  // Pilares de mármore que separam as salas da escada (topo 150, até o fundo do mundo).
  // O terceiro sustenta o topo da escada e fecha a sala 3: sem ele dava para planar por baixo
  // do topo direto até a arena.
  PAREDES: [
    { x: 8760, y: 485, largura: 40, altura: 470 }, // Pilar do trecho novo, topo 250
    { x: 9118, y: 435, largura: 40, altura: 570 },
    { x: 9458, y: 435, largura: 40, altura: 570 },
    { x: 9798, y: 443, largura: 40, altura: 554 },
  ],
  ZONAS_CONTRARIAS: [{ x: 7268, y: 300, largura: 560, altura: 300, forca: 75 }],
  SENTINELAS: [
    // S-02: patrulha sobre o trilho, solta pulso eólico e sopra quem ela vê
    { x: 7078, y: 180, minX: 7078, maxX: 7438, velocidade: 80, podeDispararPulso: true, deteccao: 'rajada' },
    // S-03: alerta máximo no topo da escada; quem for visto volta ao checkpoint
    { x: 10088, y: 60, minX: 10088, maxX: 10408, velocidade: 104, podeDispararPulso: false, deteccao: 'respawn' },
  ],
  DECORACAO: [
    { x: 7990, y: 342, scaleX: 0.8, scaleY: 0.6, tipo: 'obelisco' }, // Obelisco do CP3
    { x: 8875, y: 342, scaleX: 0.8, scaleY: 0.6, tipo: 'obelisco' }, // Obelisco do CP4 (gerador)
    { x: 9793, y: 78, scaleX: 0.6, scaleY: 0.4, tipo: 'obelisco' }, // Obelisco do CP4
  ],
} as const satisfies BlocoNivelFase1;

/**
 * BLOCO 4: Arena do boss (x 9228 → 10578): a luta contra o Helio e o portal de saída.
 */
export const BLOCO_4_LEVEL_DESIGN = {
  PLATAFORMAS: [
    // Ilha do Pombo, topo 420, a 1150 px do topo da escada (topo 130). Planando sem vento o
    // jogador alcança ~900 px; a corrente a favor no fim do vão é o que leva até a ilha.
    { x: 11708, y: 438, scaleX: 1.5, scaleY: 1 },
    { x: 12528, y: 578, scaleX: 5.34, scaleY: 1 }, // Chão da arena até a borda do mundo, topo 560
  ],
  // Força negativa = vento a favor (empurra para a direita)
  ZONAS_CONTRARIAS: [{ x: 11114, y: 290, largura: 828, altura: 300, forca: -200 }], // de 10700 até a borda da ilha
  DECORACAO: [{ x: 12118, y: 482, scaleX: 0.8, scaleY: 0.6, tipo: 'obelisco' }], // Obelisco do CP5
} as const satisfies BlocoNivelFase1;

export const BLOCOS_NIVEL_FASE1: readonly BlocoNivelFase1[] = [
  BLOCO_1_LEVEL_DESIGN,
  BLOCO_2_LEVEL_DESIGN,
  BLOCO_3_LEVEL_DESIGN,
  BLOCO_4_LEVEL_DESIGN,
];
