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
  ANDARES_EM_CONSTRUCAO: 'ANDAR 1 // EM OBRAS\nOs andares chegam na próxima etapa.',
} as const;

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
    '[TERMO] True? Aqui o pseudocódigo é em português, mas tudo bem. A Mega Brain aceita qualquer coisa que pareça um sim.',
  ACEITO: '[TERMO] Obrigado por aceitar termos que você não leu. Bem-vindo à Mega Brain Tower.',
  JA_ASSINADO: '[TERMO] Termo já assinado. Não tem volta. Igual a todo termo.',
} as const;

export const NOTIFICACOES_FASE_FINAL = {
  PORTA_ABERTA: 'PORTA LIBERADA // BEM-VINDO À MEGA BRAIN TOWER',
} as const;
