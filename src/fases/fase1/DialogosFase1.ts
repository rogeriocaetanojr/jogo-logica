import type { LinhaDialogo } from '../../compartilhado/tipos';
import {
  ERROS_PARA_ESQUELETO,
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
  /** Deboches para lógica errada, sorteados sem repetir o anterior. */
  MENSAGENS_ERRO: readonly string[];
  /** Deboches para diagnósticos específicos deste totem (ex.: PRECEDENCIA, INVERTIDA). */
  ERROS_ESPECIFICOS?: Readonly<Record<string, string>>;
  /** Código mostrado no terminal, com a lacuna ___ que o jogador completa. */
  CODIGO: readonly string[];
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
      'Setas andam, [ESPAÇO] pula, e segurar [ESPAÇO] no ar vira paraquedas. Chegue perto de um totem ou de alguém e aperte [E]. [M] liga e desliga o som.',
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
 * Mago da Nuvem: pista do portão (sol OU vento: or) e quarta parede sobre o "estagiário".
 */
export function falasMagoNuvem(ctx: ContextoDialogoFase1, visita: number): LinhaDialogo[] {
  if (visita === 0) {
    const falas: string[] = [];
    if (!ctx.conversouCom('npc_sucatinha')) {
      falas.push('Você nem falou com o Sucatinha, né? Ele ficou lá de antena baixa. Mal-educado.');
    }
    falas.push('Mago da Nuvem Sem Salário, às ordens. Ordens que ninguém paga.');
    falas.push(
      'Lá na frente tem um portão que abre com sol OU vento. Conselho: "and" quer os dois, "or" se contenta com um.'
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
    'O portão. Sol OU vento. "or". Eu repito de graça porque não recebo.',
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
      'O núcleo dele só desliga SE ele estiver tonto. "Se" em Python é "if". Passou daquela porta, ela fecha e não tem volta. Eu estarei bem longe.'
    );
    return linhas(FALANTE_POMBO, falas);
  }
  const curtas = [
    'Não me atrasa, tô em greve. Mas tô com a carta no bico, então tecnicamente, trabalhando.',
    'Se ele estiver tonto: if. Rajada, salto, chuva. Decora. Eu cobro por repetição.',
    'Passou da porta, ela fecha. Eu vou pra bem longe. Questão de sindicato.',
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
// OS 5 TERMINAIS DA FASE 1: um conceito básico por totem, para quem nunca programou
// (valor True/False, número, or, chamar função, if)
// =============================================================================

const COMO_RESPONDER = 'Digite o que vai no lugar do ___ e aperte Enter.';

export const TEXTOS_TOTEM_1_ALCOOLEMIA: TextosTotemFase1 = {
  TITULO: 'SENTINELA A-01 // ESCUDO',
  PROMPT: '[E] HACKEAR A SENTINELA',
  DIALOGO_INICIAL: 'True = ligado. False = desligado. Desligue o escudo da sentinela.',
  CODIGO: ['escudo = ___'],
  MENSAGENS_ERRO: [
    'O escudo continua ligado. A sentinela agradece.',
    'Quase! Para desligar, a palavra é False.',
  ],
  ESQUELETO: 'escudo = Fa___',
  AJUDA: 'Para desligar algo, use False (com F maiúsculo).\n' + COMO_RESPONDER,
  STATUS: '[SENTINELA A-01] escudo = True (ligado)',
};

export const TEXTOS_TOTEM_2_BALANCA: TextosTotemFase1 = {
  TITULO: 'ELEVADOR DE MÁRMORE // ALTURA',
  PROMPT: '[E] PROGRAMAR O ELEVADOR',
  DIALOGO_INICIAL: `O elevador sobe até a altura que você escrever. A placa diz ${TOTEM_2_BALANCA.ALTITUDE_ALVO}.`,
  CODIGO: ['altura = ___'],
  MENSAGENS_ERRO: [
    'O elevador parou no lugar errado. Olha a placa de novo.',
    'Número certo, elevador feliz. Número errado, você de cara no teto.',
  ],
  ESQUELETO: `altura = ${String(TOTEM_2_BALANCA.ALTITUDE_ALVO).slice(0, 2)}_`,
  AJUDA: `Escreva o número da placa: ${TOTEM_2_BALANCA.ALTITUDE_ALVO}. Número vai sem aspas.\n` + COMO_RESPONDER,
  STATUS: `[ELEVADOR] altura da placa: ${TOTEM_2_BALANCA.ALTITUDE_ALVO}`,
};

export const TEXTOS_TOTEM_3_PORTAO: TextosTotemFase1 = {
  TITULO: 'PORTÃO MILENAR // ENERGIA',
  PROMPT: '[E] CONECTAR AO PORTÃO',
  DIALOGO_INICIAL: 'O portão abre com sol OU com vento (basta um). Use and (os dois) ou or (qualquer um).',
  CODIGO: ['abrir = sol ___ vento'],
  MENSAGENS_ERRO: [
    'Com "and" o portão quer os dois juntos. Hoje só tem sol.',
    'O portão analisou sua escolha e entrou em crise existencial.',
  ],
  ESQUELETO: 'abrir = sol o_ vento',
  AJUDA: 'and = precisa dos dois.  or = qualquer um serve.\n' + COMO_RESPONDER,
  STATUS: '[PORTÃO] sol = True | vento = False',
};

export const TEXTOS_TOTEM_4_SEQUENCIADOR: TextosTotemFase1 = {
  TITULO: 'GERADOR TRIPLO // TURBINAS',
  PROMPT: '[E] LIGAR AS TURBINAS',
  PROMPT_RESOLVIDO: '[E] RELIGAR AS TURBINAS',
  DIALOGO_INICIAL: 'Funções fazem coisas. Esta liga turbinas: diga quantas dentro dos parênteses. São 3.',
  CODIGO: ['ligar_turbinas(___)'],
  MENSAGENS_ERRO: [
    'Faltou turbina. A escada ficou sem degrau e você sem chão.',
    'Conta de novo: são 3 turbinas.',
  ],
  ESQUELETO: 'ligar_turbinas(_)  ← o número de turbinas',
  AJUDA: 'Coloque o número de turbinas (3) dentro dos parênteses.\n' + COMO_RESPONDER,
  STATUS: '[GERADOR] turbinas: 3 (desligadas)',
};

export const TEXTOS_TOTEM_5_HELIO: TextosTotemFase1 = {
  TITULO: 'HELIO // NÚCLEO DOS VENTOS',
  PROMPT: '[E] ACESSAR O NÚCLEO DO HELIO',
  DIALOGO_INICIAL: 'if quer dizer "se". Desligue o Helio SE ele estiver tonto. O sensor é helio_tonto.',
  CODIGO: ['if ___: desligar()'],
  MENSAGENS_ERRO: [
    'O núcleo leu sua condição e riu. Os ventos riram junto.',
    'Quase! A condição é o sensor: helio_tonto.',
  ],
  ERROS_ESPECIFICOS: {
    INVERTIDA: 'Você desligaria o Helio só quando ele NÃO estivesse tonto. Ousado.',
  },
  ESQUELETO: 'if helio_t____: desligar()',
  AJUDA: 'Depois do if vem a condição: o sensor helio_tonto.\n' + COMO_RESPONDER,
  STATUS: '[NÚCLEO] helio_tonto = True',
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
  ESQUELETO_LIBERADO: '[ESQUELETO DE EMERGÊNCIA] A resposta começa assim:',
  ESQUELETO_BLOQUEADO:
    `Errando muito? Depois de ${ERROS_PARA_ESQUELETO} tentativas este help mostra o começo da resposta. Não que eu esteja torcendo.`,
  AVISO_ESQUELETO:
    `[AVISO] ${ERROS_PARA_ESQUELETO} erros neste totem. Digite help: agora ele mostra o começo da resposta.`,
  FAIXA_SIMULACAO: 'SIMULAÇÃO // OLHA O QUE OS SEUS NÚMEROS FAZEM COM A ESCADA',
  SIMULACAO_ENCERRADA:
    '[SIMULAÇÃO ENCERRADA] Viu o estrago? Com esses valores a escada não te leva a lugar nenhum. Ajuste e tente de novo.',
} as const;
