/**
 * Constantes e configurações do level design, física e puzzles da Fase 1: Céu Partido.
 * Centraliza todos os números mágicos, coordenadas e diálogos/mensagens sarcásticas dos 6 totens.
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
  PONTO_CP1: { x: 1740, y: 400 }, // Spawna com segurança acima do platô (topo y≈478)
  GATILHO_CP2_X: 3520,
  PONTO_CP2: { x: 3600, y: 410 }, // Spawna com segurança acima do platô (topo y≈488)
  LIMITE_QUEDA_Y: 690,
} as const;

export const DISTANCIA_INTERACAO_TOTEM_PADRAO = 80;

// =============================================================================
// OS 6 DESAFIOS LÓGICOS DA FASE 1
// =============================================================================

export const TOTEM_1_ALCOOLEMIA = {
  ID: 'totem_1_sentinela_escudo',
  TITULO: 'SENTINELA A-01 // TESTE DE ALCOOLEMIA',
  X: 1880,
  Y: 480,
  DIALOGO_INICIAL:
    'Ora, ora, se não é o zé programação tentando fingir que sabe codificar. Olha para aquela sentinela: a rotina de segurança dela foi escrita por um estagiário não remunerado. Ela só mantém o escudo erguido se achar que você é uma ameaça legítima. Vá ao terminal e prove que a lógica dela está completamente embriagada.',
  VARIAVEIS_DISPONIVEIS: [
    'alarme_ligado (booleano): indica se o alarme da sala foi disparado',
    'jogador_armado (booleano): indica se o hacker carrega armamento físico',
  ],
  FUNCOES_DISPONIVEIS: [
    'desativar_escudo(): desliga a barreira de vento intransponível do corredor',
  ],
  MENSAGENS_ERRO: [
    'Você acabou de mandar a sentinela atirar com o dobro de força. Parabéns pelo brilhantismo, Einstein. Tente de novo antes que ela perceba que o seu código é pior que a mira dela.',
    "Operador errado. O alarme tá berrando no teto e você achou que um 'and' solto ia te camuflar? Desligue o interruptor primeiro ou aprenda o que 'not' faz.",
    'A sentinela nem se mexeu. Ela tá olhando para a tela do seu terminal e sentindo pena de quem te ensinou lógica booleana.',
  ],
} as const;

export const TOTEM_2_BALANCA = {
  ID: 'totem_2_balanca_nuvens',
  TITULO: 'ELEVADOR DE MÁRMORE // BALANÇA HIPÓCRITA',
  X: 2480,
  Y: 534,
  ALTITUDE_ALVO: 350,
  ELEVADOR_X: 2620,
  ELEVADOR_Y_INICIAL: 540,
  DIALOGO_INICIAL:
    'Parabéns por chegar até aqui sem cair no precipício vinte vezes — ou você já caiu e eu finjo que não vi? Esta plataforma possui três pesos. Se você colocar vento demais, vai virar purê no teto de mármore. Se colocar de menos, vai fazer companhia aos pássaros lá embaixo. Ajuste a válvula condicional de acordo com a altitude indicada na placa.',
  VARIAVEIS_DISPONIVEIS: [
    'altitude_atual (inteiro): altitude atual da plataforma móvel',
    'altitude_alvo: indicada na placa comemorativa de mármore (350)',
  ],
  FUNCOES_DISPONIVEIS: [
    'aumentar_pressao(): impulsiona a plataforma para cima caso esteja abaixo da meta',
    'aliviar_pressao(): reduz a pressão caso a plataforma ultrapasse o nível',
    'estabilizar(): ancora os ímãs ao atingir a altitude correta',
  ],
  MENSAGENS_ERRO: [
    'A plataforma decolou direto para a estratosfera. Se a sua intenção era construir um foguete amador, parabéns. Agora calibra essa pressão direito.',
    "Caiu feito pedra no abismo. Faltou um 'elif' ou você achou que a gravidade ia ignorar esse número ridículo?",
    'Você estabilizou a plataforma na altura errada. Agora ela serve de mesa de centro para urubus. Leia a placa de altitude antes de chutar código, gênio.',
  ],
} as const;

export const TOTEM_3_DDA = {
  ID: 'totem_3_sentinela_patrulha',
  TITULO: 'SENTINELA B-02 // ROTINA DE PATRULHA TRUNCADA',
  X: 3000,
  Y: 414,
  LIMITE_PLACA: 2300,
  DIALOGO_INICIAL:
    'Veja bem aquele drone ali. O sujeito que programou a rotina dele colocou o limite de patrulha menor que a largura do próprio chassis. Ele está preso num loop ridículo de micro-passos. Abra o código defeituoso dele e corrija o alcance para que ele desocupe a passagem antes que eu decida fechar a janela do jogo por vergonha alheia.',
  VARIAVEIS_DISPONIVEIS: [
    'sentinela.x: posição horizontal atual do drone',
    'limite: coordenada gravada na placa de patrulha (2300)',
  ],
  FUNCOES_DISPONIVEIS: [
    'patrulhar(limite): define a fronteira máxima de patrulha da sentinela',
  ],
  MENSAGENS_ERRO: [
    'Mandou o drone andar até a coordenada zero? Ele quase se atirou no abismo... Uma pena que a física impediu. Use a coordenada da placa!',
    'Você inverteu a lógica e criou uma sentinela que anda 2 pixels e gira em círculos fingindo demência. Corrige essa condição de parada.',
    'O drone travou no mesmo lugar bloqueando o caminho e o cooler dele acabou de fundir de tanta vergonha alheia. Tente outro valor.',
  ],
} as const;

export const TOTEM_4_PORTAO = {
  ID: 'totem_4_portao_existencial',
  TITULO: 'PORTÃO MILENAR // CRISE EXISTENCIAL',
  X: 3620,
  Y: 450,
  X_PORTAO: 3720,
  Y_PORTAO: 390,
  DIALOGO_INICIAL:
    'Olhe para este portão milenar. Ele foi programado com uma lógica tão confusa que nem o arquiteto celestial lembra como abre. Ele só quer uma expressão lógica coerente. Sem parênteses no lugar certo, ele simplesmente finge demência e continua trancado.',
  VARIAVEIS_DISPONIVEIS: [
    'energia_sol (booleano): sensor de luz difusa da abóbada',
    'energia_vento (booleano): turbinas geradoras de brisa',
    'placa_pressionada (booleano): peso físico sobre o pedestal rúnico',
  ],
  FUNCOES_DISPONIVEIS: [
    'abrir_portao(): recolhe as trancas pesadas de mármore do portal',
  ],
  MENSAGENS_ERRO: [
    'Faltaram os parênteses e a porta tentou explodir em vez de abrir. Volte para as aulas de matemática básica do ensino fundamental, por favor.',
    'Esqueceu de checar a placa de pressão no chão? Achar que só acender a luz resolvia a vida é puro privilégio de protagonista.',
    'A porta analisou sua expressão booleana e entrou em crise existencial. Ela só quer que você agrupe as condições direito.',
  ],
} as const;

export const TOTEM_5_SEQUENCIADOR = {
  ID: 'totem_5_sequenciador_rajadas',
  TITULO: 'GERADOR TRIPLO // SEQUENCIADOR DE RAJADAS',
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
  DIALOGO_INICIAL:
    'Você realmente achou que o jogo ia deixar você passar só segurando o direcional para a frente? Isto não é um simulador de caminhada. Você tem três geradores de vento. Se dispararem juntos, eles entram em curto e você despenca. Defina a ordem, o intervalo e o impulso. E não me venha com números mágicos tirados da sua imaginação.',
  VARIAVEIS_DISPONIVEIS: [
    'ordem (texto): padrão rítmico do fluxo ("crescente")',
    'intervalo (número): tempo de duração em segundos de cada coluna (ideal: 1.2 a 1.8)',
    'forca (número): empuxo vertical em pixels (mínimo: 400)',
  ],
  FUNCOES_DISPONIVEIS: [
    'sincronizar_rajadas(ordem, intervalo, forca): calibra os canais de ar em onda contínua',
  ],
  MENSAGENS_ERRO: [
    'Intervalo curto demais! Nem o Sonic com overclock conseguiria pular de uma nuvem para a outra nesse ritmo. Dá um respiro entre as rajadas.',
    'Força insuficiente. O vento gerado não move nem folha seca, quem dirá seu personagem. Aumente essa potência.',
    'Todas as turbinas ligaram juntas e queimaram a fiação celeste. É uma sequência crescente, não um show de fogos de artifício.',
  ],
} as const;

export const TOTEM_6_ARQUITETO = {
  ID: 'totem_6_arquiteto_pilares',
  TITULO: 'ANTECÂMARA // DESAFIO DO ARQUITETO PREGUIÇOSO',
  X: 4860,
  Y: 270,
  PILARES_CONFIG: [
    { id: 1, x: 4940, y: 320, rachado: true },
    { id: 2, x: 5020, y: 320, rachado: false },
    { id: 3, x: 5100, y: 320, rachado: true },
    { id: 4, x: 5180, y: 320, rachado: false },
  ],
  DIALOGO_INICIAL:
    'O criador deste templo colocou quatro pilares no meio do caminho e foi almoçar. Metade deles está podre e vai quebrar se você pisar. Escreva um filtro para retrair os pilares defeituosos antes que você descubra a lei da gravidade da pior maneira possível.',
  VARIAVEIS_DISPONIVEIS: [
    'pilares: lista contendo os 4 pilares de mármore do corredor',
    'pilar.rachado: propriedade booleana que indica fratura estrutural grave',
  ],
  FUNCOES_DISPONIVEIS: [
    'pilar.recolher(): aciona os pistões para rebaixar o pilar ao fundo do vale',
  ],
  MENSAGENS_ERRO: [
    'Você recolheu os pilares inteiros e deixou só os podres no caminho. Deseja um paraquedas ou vai pular no abismo por teimosia?',
    "Iterou sobre a lista de pilares e não filtrou nada? Eles continuam todos aí bloqueando a sua cara. Use o 'if' dentro do loop, preguiçoso.",
    "Erro de sintaxe no 'for'. O arquiteto celeste olhou para sua indentação e preferiu continuar no horário de almoço do que rodar isso.",
  ],
} as const;

export const SANTUARIO_FASE1 = {
  DISTANCIA_PORTAL: 60,
  CHAO: { x: 5260, yOffset: 60, scaleX: 3.0, scaleY: 1.4 },
  COLUNAS_DOURADAS_X: [5120, 5240, 5340],
  COLUNAS_DOURADAS_Y_OFFSET: 210,
  PORTAL: { x: 5300, yOffset: 140 },
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
