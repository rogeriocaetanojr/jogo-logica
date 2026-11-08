import type { LinhaDialogo } from '../../compartilhado/tipos';

/**
 * Todas as falas, mensagens de terminal e letreiros da Fase Final (fonte única).
 * Formato do falante: `> NOME // PAPEL`.
 */

export const FALANTES = {
  VALDIR: '> VALDIR // PORTEIRO DE CARNE E OSSO',
  MEGA_BRAIN: '> MEGA BRAIN // ALTO-FALANTE DA TORRE',
  TERMO: '> MEGA BRAIN TOWER // DEPARTAMENTO JURÍDICO',
} as const;

/** Letreiros e telões (roteiro 3.1). Sem nada em idioma oriental. */
export const SLOGANS_MEGA_BRAIN = [
  'MEGA BRAIN — PENSE MENOS.',
  'Criatividade? Temos um modelo pra isso.',
  'Seu emprego foi otimizado. Obrigado pela compreensão.',
  'Conteúdo infinito. Zero opiniões.',
  'Atualização obrigatória em 3... 2... 1...',
  'Lorem ipsum é a nova poesia.',
  'Não é sobre isso. É sobre aquilo.',
  'Imagine se importar em raciocinar...'
] as const;

export const HUD_FASE_FINAL = {
  SETOR: 'FASE FINAL // MEGA BRAIN TOWER',
  PULAR_PAN: '[QUALQUER TECLA] PULAR',
  OBJETIVOS: {
    PORTEIRO: 'OBJETIVO // Fale com o porteiro',
    TERMO: 'OBJETIVO // Assine o termo no terminal',
    ENTRAR: 'OBJETIVO // Entre na Mega Brain Tower',
  },
  PROMPT_VALDIR: '[E] FALAR',
  PROMPT_TERMO: '[E] ASSINAR O TERMO',
} as const;

/* =========================================================================
 * ANDARES
 * ========================================================================= */

export const TEXTOS_ANDAR = {
  setor: (numero: number, nome: string) => `FASE FINAL // ANDAR ${numero} — ${nome.toUpperCase()}`,
  BANNER_TITULO: (numero: number) => `ANDAR ${numero}`,
  BANNER_SUBTITULO: (nome: string, conceito: string) => `${nome.toUpperCase()} // ${conceito.toUpperCase()}`,
  OBJETIVO_PUZZLE: 'OBJETIVO // Conserte o código no terminal do andar',
  OBJETIVO_ELEVADOR: 'OBJETIVO // Pegue o elevador',
  PROMPT_TERMINAL: '[E] ABRIR TERMINAL',
  PROMPT_ELEVADOR: '[E] ENTRAR NO ELEVADOR',
  PROMPT_ELEVADOR_TRAVADO: '[E] ELEVADOR',
  ELEVADOR_TRAVADO: [
    'ELEVADOR TRAVADO // Resolva o terminal do andar.',
    'AINDA TRAVADO // Apertar mais forte não é um algoritmo.',
    'TRAVADO // O botão não tem sentimentos. O terminal tem a solução.',
  ],
  QUEDA: 'VOCÊ CAIU NO VÃO // De volta à entrada do andar',
  CHECKPOINT: (numero: number) => `CHECKPOINT // ANDAR ${numero}`,
  PUZZLE_RESOLVIDO: 'CÓDIGO CORRIGIDO // Elevador liberado',
  TERRACO_EM_OBRAS: 'TERRAÇO // EM OBRAS\nO Mega Brain chega na etapa 5.',
  SUBINDO: 'SUBINDO...',
  // Uma piada por viagem (pela ordem dos andares, sem sorteio)
  VIAGEM: [
    '♪ Música de elevador gerada por IA. Ninguém pediu. ♪',
    'Este elevador foi otimizado. Agora ele tem anúncios.',
    'Capacidade: 8 pessoas ou 1 ego de IA.',
    'Por favor, mantenha as mãos dentro do elevador e as opiniões fora dele.',
    'Próxima parada: o topo. A sua, nem tanto.',
  ],
} as const;

/** Mega Brain pelo alto-falante ao chegar em cada andar (quebra de quarta parede). */
export const ANUNCIOS_ANDAR: Record<number, string> = {
  1: 'Bem-vindo à Mega Brain Tower. Sua visita está sendo gravada para fins de treinamento. Do meu modelo.',
  2: 'Você sabe que dava pra só pedir pra mim, né?',
  3: 'Bem-vindo ao andar 3. Sua taxa de sucesso é inferior à de um autocomplete.',
  4: 'Estatisticamente, você vai desistir no andar 4. Eu li isso em algum lugar. Eu li tudo em algum lugar.',
  5: 'Sala dos servidores. Não toque em nada. Principalmente em mim.',
};

/* =========================================================================
 * NPCS DOS ANDARES
 * ========================================================================= */

interface FalasNpc {
  falante: string;
  primeira: string[];
  repeticoes: string[];
}

/** Falas por id do NPC (configAndares). Primeira conversa completa; depois, uma frase por visita, em ciclo. */
export const FALAS_NPC: Record<string, FalasNpc> = {
  recepcionista: {
    falante: '> RECEPCIONISTA-BOT // ATENDIMENTO 24/7',
    primeira: [
      'Bem-vindo à Mega Brain Tower! Seu crachá está sendo processado.',
      'Processamento: fora de ordem. Acesso: negado. Satisfação: garantida.',
    ],
    repeticoes: ['Bem-vindo! Acesso negado! Bem-vindo!', 'Por favor, aguarde. Sua espera é importante para nós. Para mim, não.'],
  },
  influencer: {
    falante: '> INFLUENCER DE IA // 300 POSTS POR DIA',
    primeira: ['Fiz 300 posts hoje. Não li nenhum.', 'Engajamento é tudo. Eu nem sei sobre o que eram.'],
    repeticoes: ['Me segue? Eu te sigo de volta. Automaticamente.', 'Esse corredor rende um vídeo. "Programador perdido entra numa cilada".'],
  },
  operadora: {
    falante: '> OPERADORA DE PROMPT // TURNO DE 12 HORAS',
    primeira: ['Eu revisava textos. Agora eu reviso se a máquina ainda está ligada.', 'Está. Sempre está.'],
    repeticoes: ['Doze horas olhando a palavra "GERANDO". Eu me sinto gerada.', 'Se for subir, me leva por favor. Eu caibo no elevador. Já conferi.'],
  },
  chatbot: {
    falante: '> CHATBOT DE ATENDIMENTO // TRAVADO',
    primeira: ['Posso ajudar em mais alguma coisa? Posso ajudar em mais alguma coisa? Posso aj—'],
    repeticoes: ['Desculpe, não entendi. Desculpe, não entendi. Desculpe, não ent—', 'Sua opinião é muito importante. Sua opinião é muito importa—'],
  },
};

/** O que a recepcionista grita quando a catraca bate na cara do jogador. */
export const FALA_RECEPCIONISTA_ERRO = 'Bem-vindo! Acesso negado! Bem-vindo!';

/** Para onde o elevador foi quando o destino estava errado. */
export function textoDestinoElevador(destino: number, andarAtual: number): string {
  if (destino === 0) return 'ANDAR 0 // Estacionamento de ideias abandonadas';
  if (destino < 0) return `ANDAR ${destino} // Subsolo. Só tem backup e arrependimento.`;
  if (destino === andarAtual) return `ANDAR ${destino} // Você já está aqui. O elevador também.`;
  if (destino < andarAtual) return `ANDAR ${destino} // Você acabou de vir de lá.`;
  if (destino > 5) return `ANDAR ${destino} // Esse andar não existe. O elevador alucinou.`;
  return `ANDAR ${destino} // Pulou andar. Pressa é inimiga da lógica.`;
}

export function textoPassageirosElevador(passageiros: number, humanos: number): string {
  return passageiros < humanos
    ? `ELEVADOR // Lugar para ${passageiros}. Tem ${humanos === 1 ? 'gente' : 'mais gente'} nesta sala.`
    : `ELEVADOR // Lugar para ${passageiros}. Robô não é passageiro, é patrimônio.`;
}

export const DRONE_TCHAU = 'o/ tchauzinho';

/* =========================================================================
 * VALDIR
 * ========================================================================= */

export interface ContextoValdir {
  termoAceito: boolean;
  recusas: number;
}

export function falasValdir(visita: number, ctx: ContextoValdir, avatar?: string): LinhaDialogo[] {
  const fala = (texto: string): LinhaDialogo => ({ falante: FALANTES.VALDIR, texto, avatar });

  if (ctx.termoAceito) {
    return [
      fala('Assinou? Viu como ninguém lê? Eu avisei.'),
      fala('Pode subir. Se lá em cima perguntarem, eu nunca te vi. Eu nunca vejo nada. É por isso que me mantiveram.'),
    ];
  }

  if (ctx.recusas >= 3) {
    return [
      fala(`Tu respondeu "falso" ${ctx.recusas} vezes pra uma máquina que não aceita "não". Admiro a teimosia.`),
      fala('Mas o elevador não sobe com princípios. Assina logo.'),
    ];
  }

  if (visita === 0) {
    return [
      fala('Opa. Vai subir?'),
      fala('Lá em cima tem cinco andares de robô, puzzle e uma IA com complexo de deus. Eu ficaria aqui embaixo, mas eu ganho por hora.'),
      fala('Ah, e o elevador só funciona se você resolver o problema de cada andar. Foi a IA que projetou. Ela diz que é "engajamento para gerar insights valiosos".'),
      fala('Assina o termo ali no terminal. É burocracia. Ninguém lê. Nem eu.'),
    ];
  }

  const repeticoes = [
    'O terminal é ali do lado da porta. O que brilha. Tudo aqui brilha, na verdade. Aquele que brilha mais perto.',
    'Meu café esfriou três vezes enquanto você decidia. Vai lá.',
    'Eu tô aqui há onze anos. Você tá aqui há dois minutos e já cansou meu ouvido.',
  ];
  return [fala(repeticoes[(visita - 1) % repeticoes.length])];
}

/* =========================================================================
 * TERMO DE CIÊNCIA (terminal da porta)
 * ========================================================================= */

export const TEXTOS_TERMO = {
  TITULO: 'MEGA BRAIN TOWER // TERMO DE CIÊNCIA',
  ENUNCIADO: [
    '// TERMO DE CIÊNCIA DE RISCOS — MEGA BRAIN TOWER',
    '// Ao prosseguir, você concorda em ser otimizado.',
    '',
    'jogador.ciente_dos_riscos = ___',
    '',
    '> Complete a linha: digite o valor que vai no lugar de ___ (verdadeiro ou falso).',
    '> help mostra as opções.',
  ],
  PERGUNTA: 'jogador.ciente_dos_riscos = ___',
  AJUDA: [
    '[AJUDA] Valores aceitos: verdadeiro ou falso.',
    '[AJUDA] Pode digitar só o valor (verdadeiro) ou a linha inteira (jogador.ciente_dos_riscos = verdadeiro).',
    '[AJUDA] Dica jurídica: só uma das opções abre a porta. Adivinha qual.',
  ],
  // "falso": uma resposta por tentativa, em ordem, e depois volta ao começo (o loop é a piada)
  RECUSAS: [
    '[TERMO] Resposta inválida. Tente uma resposta mais verdadeira.',
    '[TERMO] Você não pode recusar. É um termo de uso.',
    "[TERMO] Ok, registramos seu 'falso' como 'verdadeiro'. De nada. ...Brincadeira. Tenta de novo.",
    '[TERMO] Recusa número {n} arquivada na pasta "Usuários Difíceis". A pasta está cheia. Só tem você nela.',
  ],
  INVALIDOS: [
    '[TERMO] Isso não é verdadeiro nem falso. É um termo de uso, não uma sessão de terapia.',
    '[TERMO] Não existe "talvez" em contrato. Só "verdadeiro" e "verdadeiro mais tarde".',
    '[TERMO] Entrada não reconhecida. O jurídico pediu para lembrar: as opções são verdadeiro ou falso.',
  ],
  TRACOS: '[TERMO] Os tracinhos são onde VOCÊ escreve. Escrever os tracinhos é... uma escolha. Errada.',
  VARIAVEL_ERRADA:
    '[TERMO] Você mudou o nome da variável. O termo é sobre jogador.ciente_dos_riscos, não sobre o que você queria que fosse.',
  PYTHON:
    '[TERMO] True? Hmmmm bilinguezão, aqui o desafio é em português, beleza? Mas tudo bem. Pela frente tem bastante "coding" pra você pagar de espertão.',
  ACEITO: '[TERMO] Obrigado por aceitar termos que você não leu. Bem-vindo à Mega Brain Tower.',
  JA_ASSINADO: '[TERMO] Termo já assinado. Não tem volta. Igual a todo termo.',
} as const;

export const NOTIFICACOES_FASE_FINAL = {
  PORTA_ABERTA: 'PORTA LIBERADA // BEM-VINDO À MEGA BRAIN TOWER',
} as const;
