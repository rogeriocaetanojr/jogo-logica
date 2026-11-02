import type { LinhaDialogo } from '../../compartilhado/tipos';
import {
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_PORTAO,
  TOTEM_4_SEQUENCIADOR,
  TOTEM_5_HELIO,
} from './constantesFase1';

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
  /** Deboches para lógica errada, sorteados sem repetir o anterior. */
  MENSAGENS_ERRO: readonly string[];
  /** Deboches para diagnósticos específicos deste totem (ex.: PRECEDENCIA, INVERTIDA). */
  ERROS_ESPECIFICOS?: Readonly<Record<string, string>>;
  /** Resposta com lacunas, liberada no help depois de alguns erros. */
  ESQUELETO: string;
  AJUDA: string;
  STATUS: string;
}

/**
 * O que o jogo sabe sobre a jogatina até agora. Os NPCs, o Helio e o terminal usam isso para
 * reagir: quantas vezes o jogador morreu, quantos comandos errou e com quem já conversou.
 */
export interface ContextoDialogoFase1 {
  mortes: number;
  erros: number;
  totensResolvidos: number;
  conversouCom: (idNpc: string) => boolean;
}

export const CONTEXTO_NEUTRO_FASE1: ContextoDialogoFase1 = {
  mortes: 0,
  erros: 0,
  totensResolvidos: 0,
  conversouCom: () => true,
};

const plural = (n: number, singular: string, pluralForma: string): string => (n === 1 ? singular : pluralForma);

const FALANTE_RADIO = '> CANAL REBELDE // TRANSMISSÃO CELESTIAL';

export const DIALOGO_RADIO_ABERTURA: LinhaDialogo[] = [
  {
    falante: FALANTE_RADIO,
    texto: 'Atenção, Hacker! Você chegou ao Céu Partido, o setor aéreo da IA. Aqui o chão é opcional e a queda é obrigatória.',
  },
  {
    falante: FALANTE_RADIO,
    texto:
      'Setas andam, [ESPAÇO] pula, e segurar [ESPAÇO] no ar vira paraquedas. Chegue perto de um totem ou de alguém e aperte [E].',
  },
  {
    falante: FALANTE_RADIO,
    texto: 'Os desertores locais falam muito, mas às vezes falam algo útil. Dica de graça: não é a regra.',
  },
];

/**
 * Despedida da fase, com o placar: o rádio comenta o que o jogador fez de verdade.
 */
export function dialogoRadioVitoria(ctx: ContextoDialogoFase1): LinhaDialogo[] {
  let placar: string;
  if (ctx.mortes === 0 && ctx.erros === 0) {
    placar = 'Zero quedas, zero erros no terminal. Isso é perfeição ou a tal da senha-mestra. Eu não vou perguntar.';
  } else if (ctx.mortes === 0) {
    placar = `Nenhuma queda e ${ctx.erros} ${plural(ctx.erros, 'erro', 'erros')} de terminal. Pés no chão, dedos no caos.`;
  } else {
    placar = `${ctx.mortes} ${plural(ctx.mortes, 'queda', 'quedas')} e ${ctx.erros} ${plural(ctx.erros, 'erro', 'erros')} no terminal. O estagiário que programou isso ficaria orgulhoso.`;
  }
  return [
    {
      falante: FALANTE_RADIO,
      texto: 'Magnífico, Hacker! O Helio virou um if desligado e o céu voltou a ser céu.',
    },
    { falante: FALANTE_RADIO, texto: placar },
    {
      falante: FALANTE_RADIO,
      texto: 'Setor 1 liberado. Pressione ENTER para voltar ao Hub.',
    },
  ];
}

// =============================================================================
// NPCs
// =============================================================================

const FALANTE_SUCATINHA = '> SUCATINHA // DRONE DESERTOR';
const FALANTE_MAGO = '> MAGO DA NUVEM // LISO E DEVENDO';
const FALANTE_POMBO = '> POMBO-CORREIO // SINDICATO DOS ENTREGADORES AÉREOS';

const linhas = (falante: string, textos: readonly string[]): LinhaDialogo[] => textos.map((texto) => ({ falante, texto }));

/**
 * Sucatinha ensina a mecânica de planar. Na primeira conversa fala o tutorial inteiro;
 * nas seguintes só comenta a sua situação.
 */
export function falasSucatinha(ctx: ContextoDialogoFase1, visita: number): LinhaDialogo[] {
  if (visita === 0) {
    const abertura =
      ctx.mortes > 0
        ? `Psst! Carne com osso! Você já caiu ${ctx.mortes} ${plural(ctx.mortes, 'vez', 'vezes')} e nem saiu do começo. Eu sou o Sucatinha, desertor da tropa do Helio.`
        : 'Psst! Carne com osso! Eu sou o Sucatinha, desertor da tropa do Helio. Salário? Nunca vi.';
    return linhas(FALANTE_SUCATINHA, [
      abertura,
      'Vento é elevador, planar é paraquedas. Caindo, segure [ESPAÇO] e você desce devagar. Dentro da corrente azul, segure e você sobe.',
      'Mármore rachado treme e some. Pisou, correu. Quem fica pensando vira adubo lá embaixo.',
    ]);
  }
  if (ctx.mortes >= 5) {
    return linhas(FALANTE_SUCATINHA, [
      `Você já caiu ${ctx.mortes} vezes desde a primeira conversa. Eu anotei. É meu hobby novo.`,
    ]);
  }
  const curtas = [
    'De novo? Segure [ESPAÇO] no ar. É só isso. Eu falei a mesma coisa pra tropa e olha onde eu fui parar.',
    'Já te expliquei tudo. Se quiser repetição, tem o terminal.',
    'Boa sorte lá na frente. Eu fico aqui, de rotor parado, sem salário.',
  ];
  return linhas(FALANTE_SUCATINHA, [curtas[(visita - 1) % curtas.length]]);
}

/**
 * Mago da Nuvem: pista do portão (precedência com parênteses) e quarta parede sobre o "estagiário".
 */
export function falasMagoNuvem(ctx: ContextoDialogoFase1, visita: number): LinhaDialogo[] {
  if (visita === 0) {
    const falas: string[] = [];
    if (!ctx.conversouCom('npc_sucatinha')) {
      falas.push('Você nem falou com o Sucatinha, né? Ele ficou lá de antena baixa. Mal-educado.');
    }
    falas.push('Mago da Nuvem Sem Salário, às ordens. Ordens que ninguém paga.');
    falas.push(
      'Lá na frente tem um portão com três sensores. Se quiser um conselho, parêntese é arrumar a mesa antes do jantar: sem ele, o "and" come o pão que o Mega Brain amassou.'
    );
    if (ctx.erros >= 6) {
      falas.push(`Vi seus ${ctx.erros} erros no terminal. Aceito você no sindicato dos magos. A mensalidade é um bug por mês.`);
    } else {
      falas.push('Quem programou essa fase foi um estagiário. Dá pra ver pelo comentário "TODO: consertar depois".');
    }
    return linhas(FALANTE_MAGO, falas);
  }
  if (ctx.mortes >= 6) {
    return linhas(FALANTE_MAGO, [
      `${ctx.mortes} quedas. Eu faço previsão do tempo, não resgate. Mas por você eu abro uma exceção.`,
    ]);
  }
  const curtas = [
    'O portão. Sol OU vento, E a placa. Parênteses. Eu repito de graça porque não recebo.',
    'Se travar, digite help no terminal. Depois de três erros ele te dá um esqueleto da resposta.',
    'Nuvem boa é nuvem sem prazo de entrega.',
  ];
  return linhas(FALANTE_MAGO, [curtas[(visita - 1) % curtas.length]]);
}

/**
 * Pombo-Correio, antes da arena: entrega o recado do Helio, entrega o padrão dele e avisa
 * que a porta da arena fecha. Também cobra quem passou direto pelo Mago.
 */
export function falasPombo(ctx: ContextoDialogoFase1, visita: number): LinhaDialogo[] {
  if (visita === 0) {
    const falas: string[] = [];
    if (!ctx.conversouCom('npc_mago_nuvem')) {
      falas.push('Passou batido pelo Mago? Ele vai ficar sabendo. Ele sabe de tudo, só não recebe.');
    }
    falas.push(
      ctx.mortes === 0
        ? 'Carta pra você, assinada pelo Helio: "Vai ser rápido." Eu só entrego, não leio. Mas li.'
        : `Carta pra você, assinada pelo Helio: "Vi ${ctx.mortes} ${plural(ctx.mortes, 'queda', 'quedas')} suas até aqui. Torci por todas." Eu só entrego, não leio. Mas li.`
    );
    falas.push(
      'Conselho de quem tá em greve: o Helio é repetitivo. Rajada rasteira, salto com pisão, chuva de penas. Depois ele fica tonto, e cabeça de deus tonto é pra pisar.'
    );
    falas.push(
      'O núcleo dele só desliga se ele estiver tonto E sem escudo. Pense em "and not". Mais pra frente, no meio da arena, a porta fecha e não tem volta. Eu estarei bem longe.'
    );
    return linhas(FALANTE_POMBO, falas);
  }
  const curtas = [
    'Não me atrasa, tô em greve. Mas tô com a carta no bico, então tecnicamente, trabalhando.',
    'Tonto E sem escudo. Rajada, salto, chuva. Decora. Eu cobro por repetição.',
    'A porta fecha lá no meio. Eu vou pra bem longe. Questão de sindicato.',
  ];
  return linhas(FALANTE_POMBO, [curtas[(visita - 1) % curtas.length]]);
}

export const TEXTOS_NPCS_FASE1 = {
  SUCATINHA: {
    NOME: 'Sucatinha',
    PROMPT: '[E] FALAR COM SUCATINHA',
    FALAS: falasSucatinha,
  },
  MAGO_NUVEM: {
    NOME: 'Mago da Nuvem Sem Salário',
    PROMPT: '[E] FALAR COM MAGO DA NUVEM',
    FALAS: falasMagoNuvem,
  },
  POMBO: {
    NOME: 'Pombo-Correio Sindicalizado',
    PROMPT: '[E] FALAR COM O POMBO',
    FALAS: falasPombo,
  },
} as const;

// =============================================================================
// QUARTA PAREDE: MORTES, TERMINAL PARADO E ERROS INSISTENTES
// =============================================================================

const PIADAS_MORTE_MARCOS: Readonly<Record<number, string>> = {
  3: 'Três quedas. O Sucatinha anotou.',
  5: 'Quinta queda. O sindicato dos pombos abriu um bolão.',
  8: 'Oito. O estagiário que fez a fase agradece o tráfego.',
  12: 'Doze quedas. Já tem gente chamando isso de "estratégia".',
};

const PIADAS_MORTE_EXTRAS: readonly string[] = [
  'Isso já virou um padrão. Na verdade, um bug.',
  'O chão é seu amigo. Você só não sabe disso ainda.',
  'Até a gravidade está com pena.',
  'A morte te manda um abraço. Ela tá sem mais assunto.',
];

/**
 * Piada que acompanha o aviso de "voltou ao checkpoint" em certas mortes.
 * Retorna undefined nas mortes comuns, para o humor não virar ruído.
 */
export function piadaDeMorte(mortes: number): string | undefined {
  if (PIADAS_MORTE_MARCOS[mortes]) return PIADAS_MORTE_MARCOS[mortes];
  if (mortes > 12 && mortes % 5 === 0) {
    return PIADAS_MORTE_EXTRAS[(mortes / 5) % PIADAS_MORTE_EXTRAS.length | 0];
  }
  return undefined;
}

/** Linhas do terminal quando o jogador fica um bom tempo sem digitar nada. */
export const TERMINAL_OCIOSO_FASE1: readonly string[] = [
  '[SILÊNCIO] Tá vivo aí? O vento não espera, mas eu espero. Eu literalmente não tenho nada melhor pra fazer.',
  '[SILÊNCIO] Pensar demora? Tudo bem. O cursor piscando é só o meu jeito de torcer por você.',
  '[SILÊNCIO] Digite help. Digitar não machuca. Ficar olhando pra tela é que gasta o teclado de ansiedade.',
  '[SILÊNCIO] O estagiário que programou isso também travou aqui. Ele resolveu copiando do Stack Overflow (se é que alguém lembra desse site).',
];

/** Comentários sobre erros no mesmo totem: o deboche cresce com a insistência. */
export const ERROS_INSISTENTES_FASE1: Readonly<Record<number, string>> = {
  6: '[AVISO] Seis erros neste totem. Respira. Lê o enunciado de novo com "enunciado".',
  10: '[AVISO] Dez erros. O estagiário que escreveu isso errou menos. E ele nem sabia a linguagem.',
  15: '[AVISO] Quinze. Se isso fosse um teste de colégio, a professora já tinha chamado seus pais.',
};

/**
 * Comentário que o totem faz na primeira vez que o jogador o abre, só quando o histórico dá pano:
 * muitas quedas ou muitos erros acumulados.
 */
export function comentarioEntradaTotem(idTotem: string, ctx: ContextoDialogoFase1): string | undefined {
  switch (idTotem) {
    case TOTEM_2_BALANCA.ID:
      return ctx.mortes >= 3 ? `[A-02] Chegou aqui com ${ctx.mortes} quedas nas costas. O elevador vê tudo.` : undefined;
    case TOTEM_3_PORTAO.ID:
      return ctx.erros >= 5 ? `[PORTÃO] Li seu histórico: ${ctx.erros} erros até agora. Estou com medo, de verdade.` : undefined;
    case TOTEM_4_SEQUENCIADOR.ID:
      return ctx.mortes >= 6 ? `[GERADOR] ${ctx.mortes} quedas. Posso começar a cobrar pedágio?` : undefined;
    case TOTEM_5_HELIO.ID:
      return ctx.erros >= 8 ? '[NÚCLEO] Você errou tanto até aqui que eu juro que dá pra ouvir a fase suspirar.' : undefined;
    case TOTEM_1_ALCOOLEMIA.ID:
    default:
      return undefined;
  }
}

// =============================================================================
// BOSS: HELIO
// =============================================================================

const FALANTE_HELIO = '> HELIO // SENHOR DOS VENTOS';

export const TEXTOS_HELIO = {
  // Frases curtas que flutuam sobre o Helio durante a luta (não pausam o jogo)
  GOLPES: [
    'Isso foi sorte. Sorte estatisticamente irrelevante.',
    'Você pisou na minha cabeça?! Eu tenho contrato com os desenvolvedores!',
    'Tá, eu tropecei no meu próprio vento. Acontece com todo deus.',
  ],
  RECOMECO: [
    'Volta do checkpoint, volta. Eu espero. Eu literalmente não tenho mais nada pra fazer nessa fase.',
    'Três corações e você gastou todos. Impressionante, até pra um estagiário.',
    'Quer que eu jogue em câmera lenta? Ah, não dá. Eu não fui programado com dó.',
  ],
  DERROTADO:
    'Ok... meus ventos tão fracos. Mas só me desliga quem acertar a condição do meu núcleo. Duvido.',
  DESLIGADO: 'Desligado por um if. Que fim mais... didático.',
} as const;

/**
 * Provocação de abertura: o Helio cita o que viu, porque ele "vê todas as tentativas".
 */
export function introHelio(ctx: ContextoDialogoFase1): LinhaDialogo[] {
  const falas: string[] = [
    'Então é você o "hacker" que andou desconfigurando meus totens. Eu vi seu código. Vi as tentativas erradas também. Todas elas.',
  ];
  if (ctx.mortes > 0 || ctx.erros > 0) {
    const quedas = `${ctx.mortes} ${plural(ctx.mortes, 'queda', 'quedas')}`;
    const erros = `${ctx.erros} ${plural(ctx.erros, 'erro', 'erros')} de terminal`;
    falas.push(`Contei ${quedas} e ${erros}. Guardei tudo num arquivo chamado "esculacho.txt".`);
  }
  falas.push('Aqui não tem terminal pra te salvar, gênio. Aqui é vento, reflexo e humilhação ao vivo. Pula se for capaz.');
  return linhas(FALANTE_HELIO, falas);
}

// =============================================================================
// OS 4 DESAFIOS LÓGICOS DA FASE 1
// =============================================================================

const FORMATO_UMA_LINHA =
  'Escreva tudo numa linha só. Formato: if condição: funcao()';

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
    'Operador errado ou faltando. A sentinela quer o alarme desligado E você desarmado ao mesmo tempo. "not" e "and" são ferramentas, não enfeite.',
    'A sentinela nem se mexeu. Ela tá olhando para a tela do seu terminal e sentindo pena de quem te ensinou lógica booleana.',
    'Lógica booleana não é opinião: cada combinação de alarme e arma tem UMA resposta certa. A sua errou em pelo menos uma.',
    'Cada sensor é um sim ou um não. "not" troca o sim pelo não, "and" exige dois sins. Misture na ordem certa e a sentinela deixa você passar.',
  ],
  ERROS_ESPECIFICOS: {
    INVERTIDA:
      'Você inverteu tudo: agora a sentinela baixa o escudo justamente quando você é uma ameaça. É o tipo de lógica que faz porteiro abrir a porta pro ladrão e trancar o morador.',
  },
  ESQUELETO: 'if not ___ and not ___: desativar_escudo()',
  AJUDA:
    '=== AJUDA // TESTE DE ALCOOLEMIA ===\n' +
    'A sentinela só baixa a guarda se você NÃO for uma ameaça.\n' +
    'Variáveis: alarme_ligado, jogador_armado\n' +
    'Função: desativar_escudo()\n' +
    'Lembre-se: use operadores de negação e conjunção (not / and).\n' +
    FORMATO_UMA_LINHA,
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
    `altitude_alvo: indicada na placa comemorativa de mármore (${TOTEM_2_BALANCA.ALTITUDE_ALVO})`,
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
    'if/elif/else é fila de guichê: o primeiro que servir atende e os outros nem levantam. Na ordem errada, atende errado.',
    'Comparar altitude com a placa só tem três casos: abaixo, acima ou igual. Seu código cobre uns dois e meio.',
  ],
  ERROS_ESPECIFICOS: {
    NADA_ACONTECE:
      "Tem altitude em que seu código simplesmente não faz nada. A plataforma fica parada, você fica parado, e a gravidade fica feliz. Faltou um elif ou um else.",
    FRONTEIRA:
      'Errou justo na altitude exata da placa. É como errar o próprio aniversário: dá pra perdoar, mas todo mundo vai lembrar.',
  },
  ESQUELETO: `if altitude_atual ___ ${TOTEM_2_BALANCA.ALTITUDE_ALVO}: ___() elif altitude_atual ___ ${TOTEM_2_BALANCA.ALTITUDE_ALVO}: ___() else: ___()`,
  AJUDA:
    '=== AJUDA // BALANÇA HIPÓCRITA ===\n' +
    `Calibre a pressão com if/elif/else comparando altitude_atual com ${TOTEM_2_BALANCA.ALTITUDE_ALVO}.\n` +
    'Funções: aumentar_pressao(), aliviar_pressao(), estabilizar()\n' +
    'Tudo numa linha só, ex.: if x > 0: a() elif x < 0: b() else: c()',
  STATUS:
    '[TELEMETRIA DA PLATAFORMA MÓVEL]\n' +
    '  - altitude_atual: 540\n' +
    `  - altitude_alvo (placa): ${TOTEM_2_BALANCA.ALTITUDE_ALVO}\n` +
    '  - estado: DESALINHADO',
};

export const TEXTOS_TOTEM_3_PORTAO: TextosTotemFase1 = {
  TITULO: 'PORTÃO MILENAR // CRISE EXISTENCIAL',
  PROMPT: '[E] CONECTAR AO PORTÃO MILENAR',
  DIALOGO_INICIAL:
    'Olha pra cima do portão: um cristal solar e uma turbina de vento. Olha pro chão: uma placa rúnica. A regra do arquiteto é simples: o portão precisa de ENERGIA, que pode vir do cristal OU da turbina (qualquer um serve), E de alguém pisando na placa. Ele escreveu isso sem parênteses, e o portão nunca mais abriu. Conserta essa lógica antes que eu morra de tédio.',
  VARIAVEIS_DISPONIVEIS: [
    'energia_sol (booleano): o cristal solar acima do portão está carregado',
    'energia_vento (booleano): a turbina ao lado do portão está girando',
    'placa_pressionada (booleano): tem alguém em pé na placa rúnica do chão',
  ],
  FUNCOES_DISPONIVEIS: [
    'abrir_portao(): recolhe as trancas pesadas de mármore do portal',
  ],
  MENSAGENS_ERRO: [
    'Faltaram os parênteses e a porta tentou explodir em vez de abrir. Volte para as aulas de matemática básica do ensino fundamental, por favor.',
    'Esqueceu de checar a placa de pressão no chão? Achar que só acender a luz resolvia a vida é puro privilégio de protagonista.',
    'A porta analisou sua expressão booleana e entrou em crise existencial. Ela só quer que você agrupe as condições direito.',
    'O "and" é mais mandão que o "or", igual multiplicação com soma. Sem parênteses, a conta sai do jeito que ele quer, não do seu.',
    'Sol OU vento serve qualquer um. A placa, não: ela é obrigatória. "ou" e "e" não são sinônimos, apesar do que o seu professor de português sugeriu.',
  ],
  ERROS_ESPECIFICOS: {
    PRECEDENCIA:
      'Faltaram os parênteses e a porta tentou explodir em vez de abrir. Volte para as aulas de matemática básica do ensino fundamental, por favor.',
    INVERTIDA:
      'Parabéns, você criou um portão que só abre quando não devia. Isso não é segurança, é pegadinha de programa de auditório.',
  },
  ESQUELETO: 'if (___ or ___) and ___: abrir_portao()',
  AJUDA:
    '=== AJUDA // PORTÃO MILENAR ===\n' +
    'O portão requer luz solar OU vento, E a placa física pressionada.\n' +
    'Sem parênteses (energia_sol or energia_vento), a precedência falhará!\n' +
    FORMATO_UMA_LINHA,
  STATUS:
    '[TELEMETRIA // PORTÃO MILENAR]\n' +
    '  - energia_sol: True (cristal carregado)\n' +
    '  - energia_vento: False (turbina parada)\n' +
    '  - placa_pressionada: True quando alguém pisa na placa do chão\n' +
    '  - regra: energia (do sol OU do vento) E placa pressionada\n' +
    '  - trancas: BLOQUEADAS',
};

const S = TOTEM_4_SEQUENCIADOR;

export const TEXTOS_TOTEM_4_SEQUENCIADOR: TextosTotemFase1 = {
  TITULO: 'GERADOR TRIPLO // SEQUENCIADOR DE RAJADAS',
  PROMPT: '[E] SINCRONIZAR ESCADA DE RAJADAS',
  PROMPT_RESOLVIDO: '[E] RECALIBRAR ESCADA DE RAJADAS',
  DIALOGO_INICIAL:
    'Você realmente achou que o jogo ia deixar você passar só segurando o direcional para a frente? Isto não é um simulador de caminhada. Você tem três geradores de vento. Se dispararem juntos, eles entram em curto e você despenca. Defina a ordem, o intervalo e o impulso. E não me venha com números mágicos tirados da sua imaginação.',
  VARIAVEIS_DISPONIVEIS: [
    `ordem (texto, entre aspas): padrão rítmico do fluxo ("${S.ORDEM_CORRETA}")`,
    `intervalo (número): segundos de cada coluna, entre ${S.INTERVALO_MIN} e ${S.INTERVALO_MAX}`,
    `forca (número): empuxo vertical em pixels, entre ${S.FORCA_MIN} e ${S.FORCA_MAX}`,
  ],
  FUNCOES_DISPONIVEIS: [
    'sincronizar_rajadas(ordem, intervalo, forca): calibra os canais de ar em onda contínua',
  ],
  MENSAGENS_ERRO: [
    'Intervalo curto demais! Nem o Sonic com overclock conseguiria pular de uma nuvem para a outra nesse ritmo. Dá um respiro entre as rajadas.',
    'Força insuficiente. O vento gerado não move nem folha seca, quem dirá seu personagem. Aumente essa potência.',
    'Todas as turbinas ligaram juntas e queimaram a fiação celeste. É uma sequência crescente, não um show de fogos de artifício.',
    'Função com parâmetros é pedir pizza: sabor, tamanho e endereço. Faltou um, e a pizza que chegou foi uma queda.',
    'São três geradores e uma ordem. Eles não são DJs, não fazem improviso.',
  ],
  ERROS_ESPECIFICOS: {
    ORDEM:
      'Todas as turbinas ligaram juntas e queimaram a fiação celeste. É uma sequência crescente, não um show de fogos de artifício.',
    INTERVALO_CURTO:
      'Intervalo curto demais! Nem o Sonic com overclock conseguiria pular de uma nuvem para a outra nesse ritmo. Dá um respiro entre as rajadas.',
    INTERVALO_LONGO:
      'Intervalo longo demais. Cada coluna demora tanto que você vira estátua no ar esperando a próxima. E estátua não voa.',
    FORCA_BAIXA:
      'Força insuficiente. O vento gerado não move nem folha seca, quem dirá seu personagem. Aumente essa potência.',
    FORCA_ALTA:
      'Força demais! O vento ia te arremessar pra fora do HUD e você viraria satélite. Calma, Thor.',
  },
  ESQUELETO: 'sincronizar_rajadas("___", ___, ___)',
  AJUDA:
    '=== AJUDA // SEQUENCIADOR DE RAJADAS ===\n' +
    'Função: sincronizar_rajadas(ordem, intervalo, forca)\n' +
    `ordem: "${S.ORDEM_CORRETA}" | intervalo: ${S.INTERVALO_MIN} a ${S.INTERVALO_MAX} | forca: ${S.FORCA_MIN} a ${S.FORCA_MAX}\n` +
    'Texto vai entre aspas e número decimal usa ponto (1.5).',
  STATUS:
    '[TELEMETRIA // GERADOR TRIPLO]\n' +
    '  - turbinas: 3 canais em espera\n' +
    `  - ordem exigida: "${S.ORDEM_CORRETA}"\n` +
    `  - janela de intervalo: ${S.INTERVALO_MIN}s - ${S.INTERVALO_MAX}s | empuxo: ${S.FORCA_MIN}px - ${S.FORCA_MAX}px`,
};

export const TEXTOS_TOTEM_5_HELIO: TextosTotemFase1 = {
  TITULO: 'HELIO // NÚCLEO DOS VENTOS',
  PROMPT: '[E] ACESSAR O NÚCLEO DO HELIO',
  DIALOGO_INICIAL:
    'O núcleo do Helio só aceita o comando de desligar se ele estiver atordoado E sem o escudo de vento reserva. Errar aqui não ressuscita o deus do vento. Mas a vergonha fica salva no seu histórico.',
  VARIAVEIS_DISPONIVEIS: [
    'helio.atordoado (booleano): o Helio está tonto depois da surra',
    'helio.escudo (booleano): o escudo de vento reserva está ligado',
  ],
  FUNCOES_DISPONIVEIS: ['desligar(): corta a energia do núcleo dos ventos'],
  MENSAGENS_ERRO: [
    'O núcleo leu sua condição e riu. Riu alto. Os ventos riram junto.',
    'Quase. Quase é a palavra favorita de quem perde pro chefão no último segundo.',
    'Você revisou a fase inteira até aqui pra errar justo o and? Poético.',
    'Tonto e sem escudo são dois fatos, e o "and" exige os dois. "not" fica de plantão no escudo.',
  ],
  ERROS_ESPECIFICOS: {
    INVERTIDA:
      'Você desligaria o Helio só quando ele estivesse acordado e blindado. Ousado. Suicida, mas ousado.',
  },
  ESQUELETO: 'if helio.___ and not helio.___: desligar()',
  AJUDA:
    '=== AJUDA // NÚCLEO DO HELIO ===\n' +
    'Desligue somente se ele estiver atordoado E sem escudo.\n' +
    'Variáveis: helio.atordoado, helio.escudo\n' +
    'Função: desligar()\n' +
    FORMATO_UMA_LINHA,
  STATUS:
    '[TELEMETRIA // NÚCLEO DO HELIO]\n' +
    '  - helio.atordoado: True\n' +
    '  - helio.escudo: False\n' +
    '  - ventos: INSTÁVEIS',
};

// =============================================================================
// ERROS GERAIS (valem para qualquer totem)
// =============================================================================

export const ERROS_GERAIS_FASE1 = {
  SINTAXE: [
    'O compilador leu isso, respirou fundo e pediu transferência para a Fase 2.',
    'Isso não é Python. Isso é um teclado caindo da escada.',
    'Até o autocorretor do celular teria vergonha dessa sintaxe.',
  ],
  LINGUAGEM_ERRADA: [
    'Python, campeão. Não JavaScript, não C, não a língua do seu cachorro.',
    'Copiou do Stack Overflow da linguagem errada, né? Eu vi.',
    'O terminal tem alergia a símbolo de outra linguagem. Ele tá espirrando agora.',
  ],
  VARIAVEL_INEXISTENTE: [
    'Essa variável não existe. Inventar sensor é coisa de vendedor de curso.',
    'Você chamou uma variável imaginária. Ela não veio. Ninguém veio.',
    'Nome errado. O totem procurou no céu inteiro e não achou nada parecido.',
  ],
  FUNCAO_INEXISTENTE: [
    'Essa função não existe. Gritar comandos aleatórios não é programar, é rezar.',
    'O totem não sabe fazer isso. Ele mal sabe fazer o que está na lista.',
    'Função inventada detectada. Criatividade nota 10, funcionamento nota 0.',
  ],
  SEM_CHAMADA: [
    'Escreveu uma condição linda e não mandou fazer nada. É tipo ligar o carro e ficar na garagem.',
    'Muita decisão, zero ação. Você seria um ótimo gerente de projeto.',
    'O totem esperou o comando final. Esperou. Ainda está esperando.',
  ],
  SEM_CONDICAO: [
    'Chamou a função direto, sem if. Ela vai rodar até com o mundo pegando fogo.',
    'Sem condição nenhuma? Isso não é lógica, é botão de pânico.',
    'Você pulou a parte do if. A parte inteira do desafio. Impressionante.',
  ],
  CHAMADAS_DEMAIS: [
    'Dois comandos ao mesmo tempo? A plataforma não é multitarefa, diferente das suas abas abertas.',
    'Você mandou fazer tudo de uma vez. O hardware celeste fritou só de ler.',
    'Uma decisão por vez, por favor. Isso aqui não é reunião de condomínio.',
  ],
  SOMENTE_LEITURA: [
    'Mudar o valor do sensor? Isso não é hackear, é mentir pro termômetro.',
    'Os sensores são só de leitura. Você não manda no alarme, só pergunta pra ele.',
    'Tentou reescrever a realidade com um "=". Ousado. Inútil, mas ousado.',
  ],
  ARGUMENTOS_INDEVIDOS: [
    'Essa função não quer isso nos parênteses. Respeite o espaço pessoal dela.',
    'Parâmetro errado. A função devolveu com cara de nojo.',
    'Passou argumento errado. É como pôr gasolina na geladeira.',
  ],
  TIPO: [
    'Comparando texto com número? Nem o JavaScript chega a tanto. Mentira, chega.',
    'Tipos misturados. O totem tentou somar maçã com terça-feira.',
    'Isso é um texto e aquilo é um número. Eles não se falam desde 2009.',
  ],
} as const;

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
  AJUDA_GERAL: 'Comandos gerais: help, status, enunciado, clear',
  COMANDOS_TERMINAL:
    'Comandos do terminal: help, status, enunciado, clear. Use ↑ e ↓ para repetir comandos anteriores.',
  STATUS_GERAL: '[STATUS] Totem operacional.',
  CHAVE_MESTRA: '[CHAVE MESTRA ACEITA] Modo de teste: totem resolvido sem validar o código.',
  PREFIXO_DICA: '[DICA]',
  ESQUELETO_LIBERADO: '[ESQUELETO DE EMERGÊNCIA] Preencha as lacunas:',
  ESQUELETO_BLOQUEADO:
    'Errando muito? Depois de 3 tentativas este help libera um esqueleto da resposta. Não que eu esteja torcendo.',
  AVISO_ESQUELETO:
    '[AVISO] 3 erros neste totem. Digite help: agora ele mostra um esqueleto da resposta.',
  FAIXA_SIMULACAO: 'SIMULAÇÃO // OLHA O QUE OS SEUS NÚMEROS FAZEM COM A ESCADA',
  SIMULACAO_ENCERRADA:
    '[SIMULAÇÃO ENCERRADA] Viu o estrago? Com esses valores a escada não te leva a lugar nenhum. Ajuste e tente de novo.',
} as const;
