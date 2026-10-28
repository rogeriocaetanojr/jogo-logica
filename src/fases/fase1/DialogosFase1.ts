import type { LinhaDialogo } from '../../compartilhado/tipos';

/**
 * Fonte única de textos da Fase 1: Céu Partido.
 * Diálogos, prompts dos totens, ajuda, telemetria e mensagens de erro sarcásticas.
 * Coordenadas e números de level design ficam em constantesFase1.ts.
 */

/**
 * Textos exibidos por um totem: abertura do terminal, ajuda, status e erros.
 */
export interface TextosTotemFase1 {
  TITULO: string;
  PROMPT: string;
  PROMPT_RESOLVIDO?: string;
  DIALOGO_INICIAL: string;
  VARIAVEIS_DISPONIVEIS: readonly string[];
  FUNCOES_DISPONIVEIS: readonly string[];
  MENSAGENS_ERRO: readonly string[];
  AJUDA: string;
  STATUS: string;
}

const FALANTE_RADIO = '> CANAL REBELDE // TRANSMISSÃO CELESTIAL';

export const DIALOGO_RADIO_ABERTURA: LinhaDialogo[] = [
  {
    falante: FALANTE_RADIO,
    texto:
      'Atenção, Hacker! Você alcançou o Céu Partido, o setor aerodinâmico controlado pela IA.',
  },
  {
    falante: FALANTE_RADIO,
    texto:
      'Utilize as correntes de vento verticais para planar segurando o pulo. Cuidado com o mármore rachado, os pulsos das sentinelas e converse com os desertores locais!',
  },
];

export const DIALOGO_RADIO_VITORIA: LinhaDialogo[] = [
  {
    falante: FALANTE_RADIO,
    texto:
      'Magnífico, Hacker! Você superou as sentinelas, interagiu com os desertores e sincronizou todos os puzzles do Céu Partido.',
  },
  {
    falante: FALANTE_RADIO,
    texto:
      'O setor 1 foi totalmente liberado. Pressione ENTER para retornar vitorioso ao Hub!',
  },
];

// =============================================================================
// NPCs
// =============================================================================

export const TEXTOS_NPCS_FASE1 = {
  SUCATINHA: {
    NOME: 'Sucatinha',
    PROMPT: '[E] FALAR COM SUCATINHA',
    DIALOGO: [
      {
        falante: '> SUCATINHA // DRONE DESERTOR',
        texto:
          'Psiu, carne com osso! Se você continuar pulando desse jeito sem usar o vento, vai virar adubo lá embaixo. Eu fugi da tropa do Azel porque o código de segurança dele é uma vergonha alheia. Dica de graça: se o terminal falar grosso com você, devolve lógica pura, senão ele vai te humilhar.',
      },
    ] as LinhaDialogo[],
  },
  MAGO_NUVEM: {
    NOME: 'Mago da Nuvem Sem Salário',
    PROMPT: '[E] FALAR COM MAGO DA NUVEM',
    DIALOGO: [
      {
        falante: '> MAGO DA NUVEM // SEM SALÁRIO',
        texto:
          'Você demorou tudo isso pra passar daquela sentinela? Eu já vi lesmas com compilação mais rápida. O santuário do Azel tá logo na frente. Ele acha que manda nos ventos só porque usa uma capa dramática. Vai lá e desconfigura a inteligência dele.',
      },
    ] as LinhaDialogo[],
  },
} as const;

// =============================================================================
// OS 4 DESAFIOS LÓGICOS DA FASE 1
// =============================================================================

export const TEXTOS_TOTEM_1_ALCOOLEMIA: TextosTotemFase1 = {
  TITULO: 'SENTINELA A-01 // TESTE DE ALCOOLEMIA',
  PROMPT: '[E] CONECTAR AO TESTE DE ALCOOLEMIA',
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
  AJUDA:
    '=== AJUDA // TESTE DE ALCOOLEMIA ===\n' +
    'A sentinela só baixa a guarda se você NÃO for uma ameaça.\n' +
    'Variáveis: alarme_ligado, jogador_armado\n' +
    'Função: desativar_escudo()\n' +
    'Lembre-se: use operadores de negação e conjunção (not / and).',
  STATUS:
    '[TELEMETRIA DA SENTINELA A-01]\n' +
    '  - alarme_ligado: False\n' +
    '  - jogador_armado: False\n' +
    '  - escudo: ATIVO (Vento Impenetrável)',
};

export const TEXTOS_TOTEM_2_BALANCA: TextosTotemFase1 = {
  TITULO: 'ELEVADOR DE MÁRMORE // BALANÇA HIPÓCRITA',
  PROMPT: '[E] AJUSTAR BALANÇA DE NUVENS',
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
  AJUDA:
    '=== AJUDA // BALANÇA HIPÓCRITA ===\n' +
    'Calibre a pressão com if/elif/else comparando altitude_atual com 350.\n' +
    'Funções: aumentar_pressao(), aliviar_pressao(), estabilizar()',
  STATUS:
    '[TELEMETRIA DA PLATAFORMA MÓVEL]\n' +
    '  - altitude_atual: 540\n' +
    '  - altitude_alvo (placa): 350\n' +
    '  - estado: DESALINHADO',
};

export const TEXTOS_TOTEM_3_PORTAO: TextosTotemFase1 = {
  TITULO: 'PORTÃO MILENAR // CRISE EXISTENCIAL',
  PROMPT: '[E] CONECTAR AO PORTÃO MILENAR',
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
  AJUDA:
    '=== AJUDA // PORTÃO MILENAR ===\n' +
    'O portão requer luz solar OU vento, E a placa física pressionada.\n' +
    'Sem parênteses (energia_sol or energia_vento), a precedência falhará!',
  STATUS:
    '[TELEMETRIA // PORTÃO MILENAR]\n' +
    '  - energia_sol: True\n' +
    '  - energia_vento: True\n' +
    '  - placa_pressionada: True\n' +
    '  - trancas: BLOQUEADAS',
};

export const TEXTOS_TOTEM_4_SEQUENCIADOR: TextosTotemFase1 = {
  TITULO: 'GERADOR TRIPLO // SEQUENCIADOR DE RAJADAS',
  PROMPT: '[E] SINCRONIZAR ESCADA DE RAJADAS',
  PROMPT_RESOLVIDO: '[E] RECALIBRAR ESCADA DE RAJADAS',
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
  AJUDA:
    '=== AJUDA // SEQUENCIADOR DE RAJADAS ===\n' +
    'Função: sincronizar_rajadas(ordem, intervalo, forca)\n' +
    'ordem: "crescente" | intervalo: 1.2 a 1.8 | forca: >= 400',
  STATUS:
    '[TELEMETRIA // GERADOR TRIPLO]\n' +
    '  - turbinas: 3 canais em espera\n' +
    '  - ordem exigida: "crescente"\n' +
    '  - janela de intervalo: 1.2s - 1.8s | empuxo: >= 400px',
};

// =============================================================================
// TERMINAL
// =============================================================================

export const TEXTOS_TERMINAL_FASE1 = {
  COMANDO_VAZIO:
    '[AVISO] Mandar comando em branco? O teclado tem mais de 100 teclas, aperte algumas delas antes do Enter.',
  SEM_TOTEM:
    '[ERRO DE CONEXÃO] Você não está conectado a nenhum totem de controle.\n' +
    'Aproxime-se de um painel e aperte [E] em vez de gritar comandos para o nada.',
  DESCONHECIDO:
    '[COMANDO DESCONHECIDO] O Mega Brain não reconhece essa instrução no setor celestial.',
  AJUDA_GERAL: 'Comandos gerais: clear, help, status',
  STATUS_GERAL: '[STATUS] Totem operacional.',
} as const;
