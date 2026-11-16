import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';
import { ErroSintaxeFase1 } from './LexerFase1';
import { analisarPrograma, type Instrucao } from './ParserFase1';
import {
  ErroExecucaoFase1,
  chamadaForaDeCondicao,
  coletarNomes,
  contemMisturaSemParenteses,
  executarComVariaveis,
  executarPrograma,
  formatarValor,
  type Ambiente,
} from './AvaliadorFase1';
import {
  ERROS_PARA_ESQUELETO,
  SENHA_MESTRA_FASE1,
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_PORTAO,
  TOTEM_4_SEQUENCIADOR,
  TOTEM_5_HELIO,
} from './constantesFase1';
import {
  ERROS_GERAIS_FASE1,
  TEXTOS_TERMINAL_FASE1,
  TEXTOS_TOTEM_1_ALCOOLEMIA,
  TEXTOS_TOTEM_2_BALANCA,
  TEXTOS_TOTEM_3_PORTAO,
  TEXTOS_TOTEM_4_SEQUENCIADOR,
  TEXTOS_TOTEM_5_HELIO,
  type TextosTotemFase1,
} from './DialogosFase1';
import type { FeedbackErroFase1, ParametrosEscadaVento } from './tiposFase1';

/**
 * Interpretador da Fase 1: Céu Partido.
 * Em vez de comparar o texto digitado com respostas prontas, executa o código do jogador
 * em todas as situações possíveis e compara o comportamento com o esperado.
 * Assim aceita qualquer forma correta (ordem trocada, De Morgan, == True, variáveis auxiliares)
 * e, quando erra, diz o que está errado com um contraexemplo concreto.
 *
 * Cada totem mostra um código curto com uma lacuna (___). O jogador digita só o que vai na
 * lacuna (ou a linha inteira, se preferir); o interpretador encaixa a resposta no modelo e
 * valida o programa completo.
 */

const G = ERROS_GERAIS_FASE1;
const T = TEXTOS_TERMINAL_FASE1;

/**
 * O que cada totem aceita e como ele valida o programa já analisado.
 */
interface RegraTotem {
  textos: TextosTotemFase1;
  variaveis: readonly string[];
  funcoes: readonly string[];
  /** Dicas sob medida quando o jogador usa um destes nomes como variável. */
  dicasNomes?: Readonly<Record<string, string>>;
  validar: (programa: Instrucao[]) => ResultadoComando;
  /** Códigos com a lacuna ___ onde entra a resposta curta do jogador (tentados em ordem). */
  modelos: readonly string[];
  /** Resultado de sucesso devolvido pela senha-mestra de testes. */
  respostaMestra: ResultadoComando;
}

// =============================================================================
// UTILITÁRIOS DE FEEDBACK
// =============================================================================

const ultimoSorteado = new Map<readonly string[], number>();

/**
 * Sorteia um deboche sem repetir o último sorteado da mesma lista.
 */
function sortearSemRepetir(mensagens: readonly string[]): string {
  if (mensagens.length <= 1) return mensagens[0] ?? '';
  let indice: number;
  do {
    indice = Math.floor(Math.random() * mensagens.length);
  } while (indice === ultimoSorteado.get(mensagens));
  ultimoSorteado.set(mensagens, indice);
  return mensagens[indice];
}

/**
 * Resposta errada: o título e o deboche vão na mensagem (cor de erro);
 * a dica objetiva e a simulação opcional vão em valor, para a cena exibir.
 */
function falha(
  titulo: string,
  deboche: string,
  dica?: string,
  simulacao?: ParametrosEscadaVento
): ResultadoComando {
  const feedback: FeedbackErroFase1 = {
    dica: dica ? `${T.PREFIXO_DICA} ${dica}` : undefined,
    simulacao,
  };
  return {
    sucesso: false,
    mensagem: `[${titulo}]\n${deboche}`,
    acao: 'FEEDBACK_ERRO',
    valor: JSON.stringify(feedback),
  };
}

function distanciaEdicao(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const acima = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = acima;
    }
  }
  return linha[b.length];
}

/**
 * Sugere o nome disponível mais parecido com o digitado, se houver um próximo o bastante.
 */
function sugestao(nome: string, candidatos: readonly string[]): string {
  // Nome digitado pela metade ("alarme" → "alarme_ligado") é o erro mais comum
  const porPrefixo = nome.length >= 3 ? candidatos.find((c) => c.startsWith(nome) || nome.startsWith(c)) : undefined;
  if (porPrefixo) return ` Você quis dizer '${porPrefixo}'?`;

  let melhor: string | undefined;
  let menorDistancia = Math.max(2, Math.floor(nome.length / 3));
  for (const candidato of candidatos) {
    const distancia = distanciaEdicao(nome, candidato);
    if (distancia <= menorDistancia) {
      melhor = candidato;
      menorDistancia = distancia;
    }
  }
  return melhor ? ` Você quis dizer '${melhor}'?` : '';
}

function formatarAmbiente(ambiente: Ambiente): string {
  const partes = Object.entries(ambiente).map(([nome, valor]) => `${nome} = ${formatarValor(valor)}`);
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
}

function combinacoesBooleanas(nomes: readonly string[]): Ambiente[] {
  const combinacoes: Ambiente[] = [];
  for (let mascara = 0; mascara < 1 << nomes.length; mascara++) {
    const ambiente: Ambiente = {};
    nomes.forEach((nome, i) => {
      ambiente[nome] = Boolean(mascara & (1 << i));
    });
    combinacoes.push(ambiente);
  }
  return combinacoes;
}

// =============================================================================
// VERIFICAÇÕES COMUNS
// =============================================================================

/**
 * Confere, sem executar, se o programa só usa nomes que existem no totem
 * e se não tenta reescrever um sensor.
 */
function verificarNomes(programa: Instrucao[], regra: RegraTotem): ResultadoComando | null {
  const nomes = coletarNomes(programa);

  const sensorAlterado = nomes.atribuicoes.find((nome) => regra.variaveis.includes(nome));
  if (sensorAlterado) {
    return falha(
      'SENSOR SÓ DE LEITURA',
      sortearSemRepetir(G.SOMENTE_LEITURA),
      `'${sensorAlterado}' é um sensor: dá para ler o valor dele numa condição, mas não para trocar com '='.`
    );
  }

  const conhecidas = [...regra.variaveis, ...nomes.atribuicoes];
  const desconhecida = nomes.variaveisLidas.find((nome) => !conhecidas.includes(nome));
  if (desconhecida) return falhaVariavel(desconhecida, regra);

  const funcaoDesconhecida = nomes.chamadas.find((c) => !regra.funcoes.includes(c.nome));
  if (funcaoDesconhecida) {
    const nome = funcaoDesconhecida.nome;
    return falha(
      'FUNÇÃO DESCONHECIDA',
      sortearSemRepetir(G.FUNCAO_INEXISTENTE),
      `A função '${nome}()' não existe neste totem.${sugestao(nome, regra.funcoes)} ` +
        `Disponíveis: ${regra.funcoes.map((f) => `${f}()`).join(', ')}.`
    );
  }

  return null;
}

function falhaVariavel(nome: string, regra: RegraTotem): ResultadoComando {
  const disponiveis = regra.variaveis.length > 0 ? ` Disponíveis: ${regra.variaveis.join(', ')}.` : '';
  const dica =
    regra.dicasNomes?.[nome] ??
    `A variável '${nome}' não existe aqui.${sugestao(nome, regra.variaveis)}${disponiveis}`;
  return falha('VARIÁVEL DESCONHECIDA', sortearSemRepetir(G.VARIAVEL_INEXISTENTE), dica);
}

// =============================================================================
// VALIDADOR POR TABELA-VERDADE (Totens 1 e 3)
// =============================================================================

interface ConfigValidadorBooleano {
  textos: TextosTotemFase1;
  variaveis: readonly string[];
  funcao: string;
  esperado: (ambiente: Ambiente) => boolean;
  /** Descreve o efeito no cenário, ex.: chamou=true → 'o escudo é desligado'. */
  descrever: (chamou: boolean) => string;
  diagnosticarPrecedencia: boolean;
  sucesso: ResultadoComando;
}

/**
 * Roda o programa em todas as combinações True/False dos sensores e confere,
 * caso a caso, se a função é chamada exatamente quando deveria.
 */
function criarValidadorBooleano(cfg: ConfigValidadorBooleano): (programa: Instrucao[]) => ResultadoComando {
  return (programa) => {
    const especificos = cfg.textos.ERROS_ESPECIFICOS ?? {};
    const chamadas = coletarNomes(programa).chamadas.filter((c) => c.nome === cfg.funcao);

    if (chamadas.length === 0) {
      return falha('NADA ACONTECEU', sortearSemRepetir(G.SEM_CHAMADA), `Seu código nunca chama ${cfg.funcao}().`);
    }
    if (chamadas.some((c) => c.quantidadeArgumentos > 0)) {
      return falha(
        'ARGUMENTOS ERRADOS',
        sortearSemRepetir(G.ARGUMENTOS_INDEVIDOS),
        `${cfg.funcao}() não recebe nada: deixe os parênteses vazios.`
      );
    }

    const casos = combinacoesBooleanas(cfg.variaveis).map((ambiente) => ({
      ambiente,
      esperado: cfg.esperado(ambiente),
      chamou: executarPrograma(programa, ambiente).some((c) => c.nome === cfg.funcao),
    }));
    const errados = casos.filter((c) => c.chamou !== c.esperado);
    if (errados.length === 0) return cfg.sucesso;

    if (casos.every((c) => c.chamou) && chamadaForaDeCondicao(programa, cfg.funcao)) {
      return falha(
        'SEM CONDIÇÃO',
        sortearSemRepetir(G.SEM_CONDICAO),
        `Você chamou ${cfg.funcao}() direto, fora de um if. Ela roda em qualquer situação.`
      );
    }
    if (cfg.diagnosticarPrecedencia && contemMisturaSemParenteses(programa)) {
      return falha(
        'ERRO DE PRECEDÊNCIA',
        especificos.PRECEDENCIA ?? sortearSemRepetir(cfg.textos.MENSAGENS_ERRO),
        "Sem parênteses, o Python resolve o 'and' antes do 'or'. Use ( ) para agrupar o que precisa ser avaliado junto."
      );
    }
    if (errados.length === casos.length) {
      return falha(
        'LÓGICA INVERTIDA',
        especificos.INVERTIDA ?? sortearSemRepetir(cfg.textos.MENSAGENS_ERRO),
        'Sua condição faz o contrário do pedido: em todas as situações o resultado sai trocado.'
      );
    }

    const caso = errados[0];
    return falha(
      'FALHA NA LÓGICA',
      sortearSemRepetir(cfg.textos.MENSAGENS_ERRO),
      `Teste mental: com ${formatarAmbiente(caso.ambiente)}, no seu código ${cfg.descrever(caso.chamou)}. ` +
        `O certo seria: ${cfg.descrever(caso.esperado)}.`
    );
  };
}

// =============================================================================
// TOTEM 1: escudo da sentinela (valor True / False)
// =============================================================================

const SUCESSO_TOTEM_1: ResultadoComando = {
  sucesso: true,
  mensagem: '[ESCUDO DESLIGADO] escudo = False. A sentinela baixou a guarda. Pode passar!',
  acao: 'DESATIVAR_ESCUDO_SENTINELA',
};

const DICA_FALSE = 'Para desligar, use False (com F maiúsculo).';

function validarTotem1(programa: Instrucao[]): ResultadoComando {
  const { variaveis } = executarComVariaveis(programa, {});
  const escudo = variaveis.escudo;
  if (escudo === false) return SUCESSO_TOTEM_1;
  if (escudo === undefined) {
    return falha('NADA ACONTECEU', sortearSemRepetir(G.SEM_CHAMADA), `Escreva: escudo = False`);
  }
  if (escudo === true) {
    return falha('ESCUDO LIGADO', sortearSemRepetir(TEXTOS_TOTEM_1_ALCOOLEMIA.MENSAGENS_ERRO), `True deixa ligado. ${DICA_FALSE}`);
  }
  return falha('VALOR ERRADO', sortearSemRepetir(TEXTOS_TOTEM_1_ALCOOLEMIA.MENSAGENS_ERRO), `O escudo só entende True ou False. ${DICA_FALSE}`);
}

const REGRA_TOTEM_1: RegraTotem = {
  respostaMestra: SUCESSO_TOTEM_1,
  textos: TEXTOS_TOTEM_1_ALCOOLEMIA,
  modelos: ['escudo = ___', '___'],
  variaveis: [],
  funcoes: [],
  dicasNomes: {
    escudo: 'Para guardar um valor use um = só: escudo = False',
    desligado: DICA_FALSE,
    desligar: DICA_FALSE,
    falso: DICA_FALSE,
    off: DICA_FALSE,
    ligado: DICA_FALSE,
    nao: DICA_FALSE,
    no: DICA_FALSE,
  },
  validar: validarTotem1,
};

// =============================================================================
// TOTEM 2: elevador (número)
// =============================================================================

const SUCESSO_TOTEM_2: ResultadoComando = {
  sucesso: true,
  mensagem: `[ELEVADOR PROGRAMADO] altura = ${TOTEM_2_BALANCA.ALTITUDE_ALVO}. Subindo!`,
  acao: 'ESTABILIZAR_ELEVADOR',
};

function validarTotem2(programa: Instrucao[]): ResultadoComando {
  const alvo = TOTEM_2_BALANCA.ALTITUDE_ALVO;
  const { variaveis } = executarComVariaveis(programa, {});
  const altura = variaveis.altura;
  const erros = TEXTOS_TOTEM_2_BALANCA.MENSAGENS_ERRO;
  if (altura === alvo) return SUCESSO_TOTEM_2;
  if (altura === undefined) {
    return falha('NADA ACONTECEU', sortearSemRepetir(G.SEM_CHAMADA), `Escreva o número da placa: altura = ${alvo}`);
  }
  if (typeof altura === 'string') {
    return falha('TEXTO NO LUGAR DE NÚMERO', sortearSemRepetir(erros), `Número vai sem aspas: ${alvo}, não "${altura}".`);
  }
  if (typeof altura !== 'number') {
    return falha('VALOR ERRADO', sortearSemRepetir(erros), `A altura é um número. A placa diz ${alvo}.`);
  }
  const onde = altura > alvo ? 'alto demais' : 'baixo demais';
  return falha('ALTURA ERRADA', sortearSemRepetir(erros), `Com altura = ${altura} o elevador para ${onde}. A placa diz ${alvo}.`);
}

const REGRA_TOTEM_2: RegraTotem = {
  respostaMestra: SUCESSO_TOTEM_2,
  textos: TEXTOS_TOTEM_2_BALANCA,
  modelos: ['altura = ___', '___'],
  variaveis: [],
  funcoes: [],
  dicasNomes: { altura: `Para guardar um valor use um = só: altura = ${TOTEM_2_BALANCA.ALTITUDE_ALVO}` },
  validar: validarTotem2,
};

// =============================================================================
// TOTEM 3: portão (or)
// =============================================================================

const SUCESSO_TOTEM_3: ResultadoComando = {
  sucesso: true,
  mensagem: '[PORTÃO ABERTO] sol or vento = True. Basta um, e hoje tem sol!',
  acao: 'ABRIR_PORTAO_EXISTENCIAL',
};

const REGRA_TOTEM_3: RegraTotem = {
  respostaMestra: SUCESSO_TOTEM_3,
  textos: TEXTOS_TOTEM_3_PORTAO,
  // "or" sozinho, a expressão inteira ou a linha inteira com "abrir ="
  modelos: [
    'abrir = sol ___ vento; if abrir: abrir_portao()',
    'abrir = ___; if abrir: abrir_portao()',
    '___; if abrir: abrir_portao()',
  ],
  variaveis: ['sol', 'vento'],
  funcoes: ['abrir_portao'],
  dicasNomes: {
    ou: 'Em Python, "ou" se escreve or.',
    e: 'Em Python, "e" se escreve and.',
  },
  validar: criarValidadorBooleano({
    textos: TEXTOS_TOTEM_3_PORTAO,
    variaveis: ['sol', 'vento'],
    funcao: 'abrir_portao',
    esperado: (a) => Boolean(a.sol || a.vento),
    descrever: (abre) => (abre ? 'o portão abre' : 'o portão fica fechado'),
    diagnosticarPrecedencia: false,
    sucesso: SUCESSO_TOTEM_3,
  }),
};

// =============================================================================
// TOTEM 4: turbinas (chamar uma função com um valor)
// =============================================================================

const FUNCAO_TURBINAS = 'ligar_turbinas';
const TURBINAS = 3;

function validarTotem4(programa: Instrucao[]): ResultadoComando {
  const erros = TEXTOS_TOTEM_4_SEQUENCIADOR.MENSAGENS_ERRO;
  const chamadas = executarComVariaveis(programa, {}).chamadas.filter((c) => c.nome === FUNCAO_TURBINAS);
  const dica = `Escreva: ${FUNCAO_TURBINAS}(${TURBINAS})`;
  if (chamadas.length === 0) return falha('NADA ACONTECEU', sortearSemRepetir(G.SEM_CHAMADA), dica);
  const argumentos = chamadas[0].argumentos;
  if (argumentos.length !== 1) {
    return falha('PARÊNTESES', sortearSemRepetir(erros), `Coloque um número só dentro dos parênteses. ${dica}`);
  }
  const valor = argumentos[0].valor;
  if (typeof valor === 'string') {
    return falha('TEXTO NO LUGAR DE NÚMERO', sortearSemRepetir(erros), `Número vai sem aspas: ${TURBINAS}, não "${valor}".`);
  }
  if (valor !== TURBINAS) {
    const quantas = typeof valor === 'number' && valor < TURBINAS ? `Só ${valor} ligaram.` : `Só existem ${TURBINAS} turbinas.`;
    return falha('TURBINAS ERRADAS', sortearSemRepetir(erros), `${quantas} ${dica}`);
  }
  return sucessoTurbinas();
}

/** A escada liga com a calibragem padrão de fábrica (de baixo para cima). */
function sucessoTurbinas(): ResultadoComando {
  const parametros: ParametrosEscadaVento = {
    ordem: TOTEM_4_SEQUENCIADOR.ORDEM_CORRETA,
    intervalo: TOTEM_4_SEQUENCIADOR.PERIODO_PADRAO_MS / 1000,
    forca: TOTEM_4_SEQUENCIADOR.FORCA_PADRAO,
  };
  return {
    sucesso: true,
    mensagem: `[TURBINAS LIGADAS] ${FUNCAO_TURBINAS}(${TURBINAS}). A escada de vento está no ar. Voe, passarinho!`,
    acao: 'ATIVAR_ESCADA_RAJADAS',
    valor: JSON.stringify(parametros),
  };
}

const REGRA_TOTEM_4: RegraTotem = {
  respostaMestra: sucessoTurbinas(),
  textos: TEXTOS_TOTEM_4_SEQUENCIADOR,
  modelos: [`${FUNCAO_TURBINAS}(___)`],
  variaveis: [],
  funcoes: [FUNCAO_TURBINAS],
  dicasNomes: {
    tres: `Use o número: ${TURBINAS}.`,
    três: `Use o número: ${TURBINAS}.`,
    turbinas: `Coloque o número de turbinas: ${TURBINAS}.`,
  },
  validar: validarTotem4,
};

// =============================================================================
// TOTEM 5: núcleo do Helio (if)
// =============================================================================

const SUCESSO_TOTEM_5: ResultadoComando = {
  sucesso: true,
  mensagem: '[NÚCLEO DESLIGADO] Se está tonto, desliga. Era só isso. O portal do santuário está aberto.',
  acao: 'DESLIGAR_HELIO',
};

const REGRA_TOTEM_5: RegraTotem = {
  respostaMestra: SUCESSO_TOTEM_5,
  textos: TEXTOS_TOTEM_5_HELIO,
  modelos: ['if ___: desligar()'],
  variaveis: ['helio_tonto'],
  funcoes: ['desligar'],
  dicasNomes: {
    tonto: 'O sensor se chama helio_tonto.',
    helio: 'O sensor se chama helio_tonto.',
    atordoado: 'O sensor se chama helio_tonto.',
  },
  validar: criarValidadorBooleano({
    textos: TEXTOS_TOTEM_5_HELIO,
    variaveis: ['helio_tonto'],
    funcao: 'desligar',
    esperado: (a) => Boolean(a.helio_tonto),
    descrever: (chamou) => (chamou ? 'o Helio é desligado' : 'o Helio continua ligado'),
    diagnosticarPrecedencia: false,
    sucesso: SUCESSO_TOTEM_5,
  }),
};

// =============================================================================
// ENTRADA DO INTERPRETADOR
// =============================================================================

const REGRAS_POR_TOTEM: Record<string, RegraTotem> = {
  [TOTEM_1_ALCOOLEMIA.ID]: REGRA_TOTEM_1,
  [TOTEM_2_BALANCA.ID]: REGRA_TOTEM_2,
  [TOTEM_3_PORTAO.ID]: REGRA_TOTEM_3,
  [TOTEM_4_SEQUENCIADOR.ID]: REGRA_TOTEM_4,
  [TOTEM_5_HELIO.ID]: REGRA_TOTEM_5,
};

const LACUNA = '___';

/**
 * Programas candidatos para a resposta do jogador. Se ele escreveu a linha inteira (chamou uma
 * função ou tem um ":" seguido de comando), vale o que ele escreveu. Senão, a resposta vai no
 * lugar do ___ de cada modelo do totem, na ordem: o primeiro que for Python válido é o usado.
 * Antes, tira um "if" da frente e o ":" do fim, se o jogador tiver digitado.
 */
export function montarCandidatos(entrada: string, modelos: readonly string[]): string[] {
  const chamaFuncao = /\b[a-z_][\w.]*\(/i.test(entrada);
  const temComando = /:\s*\S/.test(entrada);
  if (chamaFuncao || temComando) return [entrada];
  const trecho = entrada
    .trim()
    .replace(/^(if|elif)\s+/i, '')
    .replace(/:\s*$/, '')
    .trim();
  return modelos.map((modelo) => modelo.replace(LACUNA, trecho));
}

/** O primeiro candidato que é Python válido; se nenhum for, o erro do primeiro. */
function analisarCandidatos(candidatos: string[]): Instrucao[] {
  let primeiroErro: unknown;
  for (const codigo of candidatos) {
    try {
      return analisarPrograma(codigo);
    } catch (erro) {
      primeiroErro ??= erro;
    }
  }
  throw primeiroErro;
}

function ajudaContextual(textos: TextosTotemFase1 | undefined, erros: number): string {
  if (!textos) return T.AJUDA_GERAL;
  const extra =
    erros >= ERROS_PARA_ESQUELETO ? `${T.ESQUELETO_LIBERADO}\n  ${textos.ESQUELETO}` : T.ESQUELETO_BLOQUEADO;
  return `${textos.AJUDA}\n\n${extra}\n\n${T.COMANDOS_TERMINAL}`;
}

export function interpretarComandoFase1(entrada: string, contexto?: ContextoInterpretador): ResultadoComando {
  const comando = entrada.trim();
  if (!comando) {
    return { sucesso: false, mensagem: T.COMANDO_VAZIO };
  }

  const comandoMinusculo = comando.toLowerCase();
  if (comandoMinusculo === 'cls' || comandoMinusculo === 'clear' || comandoMinusculo === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
  }

  const totemAtivo = (contexto?.totemAtivo as string) || '';
  if (!totemAtivo) {
    return { sucesso: false, mensagem: T.SEM_TOTEM };
  }

  const regra = REGRAS_POR_TOTEM[totemAtivo];
  const erros = Number(contexto?.errosNoTotem) || 0;

  if (comandoMinusculo === 'help' || comandoMinusculo === 'ajuda') {
    return { sucesso: true, mensagem: ajudaContextual(regra?.textos, erros) };
  }
  if (comandoMinusculo === 'status') {
    return { sucesso: true, mensagem: regra?.textos.STATUS ?? T.STATUS_GERAL };
  }
  if (!regra) {
    return { sucesso: false, mensagem: T.DESCONHECIDO };
  }

  // Chave mestra de testes: resolve o totem aberto sem validar código
  if (comandoMinusculo === SENHA_MESTRA_FASE1) {
    return { ...regra.respostaMestra, mensagem: `${T.CHAVE_MESTRA}\n${regra.respostaMestra.mensagem}` };
  }

  try {
    const programa = analisarCandidatos(montarCandidatos(comando, regra.modelos));
    return verificarNomes(programa, regra) ?? regra.validar(programa);
  } catch (erro) {
    if (erro instanceof ErroSintaxeFase1) {
      return erro.categoria === 'linguagem'
        ? falha('LINGUAGEM ERRADA', sortearSemRepetir(G.LINGUAGEM_ERRADA), erro.message)
        : falha('ERRO DE SINTAXE', sortearSemRepetir(G.SINTAXE), erro.message);
    }
    if (erro instanceof ErroExecucaoFase1) {
      return erro.categoria === 'variavel'
        ? falhaVariavel(erro.nome, regra)
        : falha('TIPOS MISTURADOS', sortearSemRepetir(G.TIPO), erro.message);
    }
    throw erro;
  }
}
