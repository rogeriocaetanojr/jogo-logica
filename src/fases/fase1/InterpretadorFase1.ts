import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';
import { ErroSintaxeFase1 } from './LexerFase1';
import { analisarPrograma, type Instrucao, type Valor } from './ParserFase1';
import {
  ErroExecucaoFase1,
  chamadaForaDeCondicao,
  coletarNomes,
  contemMisturaSemParenteses,
  executarPrograma,
  formatarValor,
  type Ambiente,
} from './AvaliadorFase1';
import {
  ERROS_PARA_ESQUELETO,
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_PORTAO,
  TOTEM_4_SEQUENCIADOR,
} from './constantesFase1';
import {
  ERROS_GERAIS_FASE1,
  TEXTOS_TERMINAL_FASE1,
  TEXTOS_TOTEM_1_ALCOOLEMIA,
  TEXTOS_TOTEM_2_BALANCA,
  TEXTOS_TOTEM_3_PORTAO,
  TEXTOS_TOTEM_4_SEQUENCIADOR,
  type TextosTotemFase1,
} from './DialogosFase1';
import type { FeedbackErroFase1, ParametrosEscadaVento } from './tiposFase1';

/**
 * Interpretador da Fase 1: Céu Partido.
 * Em vez de comparar o texto digitado com respostas prontas, executa o código do jogador
 * em todas as situações possíveis e compara o comportamento com o esperado.
 * Assim aceita qualquer forma correta (ordem trocada, De Morgan, == True, variáveis auxiliares)
 * e, quando erra, diz o que está errado com um contraexemplo concreto.
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
// TOTEM 1: "O Teste de Alcoolemia da Sentinela" (not / and)
// =============================================================================

const SUCESSO_TOTEM_1: ResultadoComando = {
  sucesso: true,
  mensagem:
    '[SENTINELA A-01: ESCUDO DESATIVADO]\n' +
    'Lógica validada com sucesso! A rotina concluiu que você não oferece perigo e recolheu a barreira de vento.\n' +
    'O corredor celestial está aberto.',
  acao: 'DESATIVAR_ESCUDO_SENTINELA',
};

const REGRA_TOTEM_1: RegraTotem = {
  textos: TEXTOS_TOTEM_1_ALCOOLEMIA,
  variaveis: ['alarme_ligado', 'jogador_armado'],
  funcoes: ['desativar_escudo'],
  validar: criarValidadorBooleano({
    textos: TEXTOS_TOTEM_1_ALCOOLEMIA,
    variaveis: ['alarme_ligado', 'jogador_armado'],
    funcao: 'desativar_escudo',
    esperado: (a) => !a.alarme_ligado && !a.jogador_armado,
    descrever: (chamou) => (chamou ? 'o escudo é desligado' : 'o escudo continua ligado'),
    diagnosticarPrecedencia: false,
    sucesso: SUCESSO_TOTEM_1,
  }),
};

// =============================================================================
// TOTEM 2: "A Balança Hipócrita de Nuvens" (if / elif / else)
// =============================================================================

const SUCESSO_TOTEM_2: ResultadoComando = {
  sucesso: true,
  mensagem:
    '[VÁLVULA DE PRESSÃO CALIBRADA // ELEVADOR DE NUVEM]\n' +
    'Condicionais de altitude compiladas com perfeição!\n' +
    `O elevador estabilizou exatamente na altitude ${TOTEM_2_BALANCA.ALTITUDE_ALVO}.`,
  acao: 'ESTABILIZAR_ELEVADOR',
};

const FUNCOES_TOTEM_2 = ['aumentar_pressao', 'aliviar_pressao', 'estabilizar'] as const;

/**
 * Executa o programa em várias altitudes (incluindo as fronteiras do alvo) e exige
 * exatamente uma chamada certa em cada uma.
 */
function validarTotem2(programa: Instrucao[]): ResultadoComando {
  const alvo = TOTEM_2_BALANCA.ALTITUDE_ALVO;
  const textos = TEXTOS_TOTEM_2_BALANCA;
  const especificos = textos.ERROS_ESPECIFICOS ?? {};
  const chamadasEstaticas = coletarNomes(programa).chamadas;

  if (chamadasEstaticas.length === 0) {
    return falha(
      'NADA ACONTECEU',
      sortearSemRepetir(G.SEM_CHAMADA),
      'Seu código não chama nenhuma das funções da plataforma.'
    );
  }
  if (chamadasEstaticas.some((c) => c.quantidadeArgumentos > 0)) {
    return falha(
      'ARGUMENTOS ERRADOS',
      sortearSemRepetir(G.ARGUMENTOS_INDEVIDOS),
      'As funções da plataforma não recebem nada: deixe os parênteses vazios.'
    );
  }

  for (const altitude of TOTEM_2_BALANCA.ALTITUDES_TESTE) {
    const esperado = altitude < alvo ? 'aumentar_pressao' : altitude > alvo ? 'aliviar_pressao' : 'estabilizar';
    const chamadas = executarPrograma(programa, { altitude_atual: altitude, altitude_alvo: alvo });

    if (chamadas.length === 0) {
      return falha(
        'NADA ACONTECEU',
        especificos.NADA_ACONTECE ?? sortearSemRepetir(textos.MENSAGENS_ERRO),
        `Com altitude_atual = ${altitude}, nenhuma função é chamada. ` +
          'Seu código precisa cobrir os três casos: abaixo, acima e exatamente no alvo.'
      );
    }
    if (chamadas.length > 1) {
      return falha(
        'CHAMADAS DEMAIS',
        sortearSemRepetir(G.CHAMADAS_DEMAIS),
        `Com altitude_atual = ${altitude}, seu código chamou ${chamadas.map((c) => `${c.nome}()`).join(' e ')}. ` +
          'Só pode uma por vez: use elif/else para que os casos não se sobreponham.'
      );
    }
    if (chamadas[0].nome !== esperado) {
      return falha(
        'FALHA NA LÓGICA',
        altitude === alvo && especificos.FRONTEIRA
          ? especificos.FRONTEIRA
          : sortearSemRepetir(textos.MENSAGENS_ERRO),
        `Com altitude_atual = ${altitude}, seu código chamou ${chamadas[0].nome}(), mas o certo é ${esperado}().`
      );
    }
  }

  return SUCESSO_TOTEM_2;
}

const REGRA_TOTEM_2: RegraTotem = {
  textos: TEXTOS_TOTEM_2_BALANCA,
  variaveis: ['altitude_atual', 'altitude_alvo'],
  funcoes: FUNCOES_TOTEM_2,
  validar: validarTotem2,
};

// =============================================================================
// TOTEM 3: "O Portão com Crise Existencial" (precedência: (A or B) and C)
// =============================================================================

const SUCESSO_TOTEM_3: ResultadoComando = {
  sucesso: true,
  mensagem:
    '[PORTÃO MILENAR // TRANCAS RECOLHIDAS]\n' +
    'Expressão booleana avaliada como Verdadeira com precedência correta!\n' +
    'As trancas de mármore desceram ao solo. Passagem para o Bloco 3 liberada.',
  acao: 'ABRIR_PORTAO_EXISTENCIAL',
};

const REGRA_TOTEM_3: RegraTotem = {
  textos: TEXTOS_TOTEM_3_PORTAO,
  variaveis: ['energia_sol', 'energia_vento', 'placa_pressionada'],
  funcoes: ['abrir_portao'],
  validar: criarValidadorBooleano({
    textos: TEXTOS_TOTEM_3_PORTAO,
    variaveis: ['energia_sol', 'energia_vento', 'placa_pressionada'],
    funcao: 'abrir_portao',
    esperado: (a) => Boolean((a.energia_sol || a.energia_vento) && a.placa_pressionada),
    descrever: (chamou) => (chamou ? 'o portão abre' : 'o portão continua trancado'),
    diagnosticarPrecedencia: true,
    sucesso: SUCESSO_TOTEM_3,
  }),
};

// =============================================================================
// TOTEM 4: "O Sequenciador de Rajadas" (função com parâmetros)
// =============================================================================

const FUNCAO_RAJADAS = 'sincronizar_rajadas';
const PARAMETROS_RAJADAS = ['ordem', 'intervalo', 'forca'] as const;
type ParametroRajadas = (typeof PARAMETROS_RAJADAS)[number];

function ehParametroRajadas(nome: string): nome is ParametroRajadas {
  return (PARAMETROS_RAJADAS as readonly string[]).includes(nome);
}

/**
 * Confere a chamada de sincronizar_rajadas (posicional ou com nomes) e a faixa de cada valor.
 * Valores bem escritos mas fora da faixa devolvem uma simulação para o jogador ver o problema.
 */
function validarTotem4(programa: Instrucao[]): ResultadoComando {
  const s = TOTEM_4_SEQUENCIADOR;
  const textos = TEXTOS_TOTEM_4_SEQUENCIADOR;
  const especificos = textos.ERROS_ESPECIFICOS ?? {};
  const assinatura = `${FUNCAO_RAJADAS}(ordem, intervalo, forca)`;

  const chamadas = executarPrograma(programa, {}).filter((c) => c.nome === FUNCAO_RAJADAS);
  if (chamadas.length === 0) {
    return falha('NADA ACONTECEU', sortearSemRepetir(G.SEM_CHAMADA), `Seu código nunca chama ${assinatura}.`);
  }
  if (chamadas.length > 1) {
    return falha(
      'CHAMADAS DEMAIS',
      sortearSemRepetir(G.CHAMADAS_DEMAIS),
      `Chame ${FUNCAO_RAJADAS}(...) uma vez só, com os três valores.`
    );
  }

  const { argumentos } = chamadas[0];
  const erroArgumentos = (dica: string) => falha('ARGUMENTOS ERRADOS', sortearSemRepetir(G.ARGUMENTOS_INDEVIDOS), dica);

  if (argumentos.length === 4 && argumentos.every((a) => a.nome === undefined) && argumentos.slice(1).every((a) => typeof a.valor === 'number')) {
    return erroArgumentos('Parece que você usou vírgula no número decimal. Em Python é ponto: 1.5, não 1,5.');
  }
  if (argumentos.length !== PARAMETROS_RAJADAS.length) {
    return erroArgumentos(`A função recebe 3 valores: ${assinatura}. Você passou ${argumentos.length}.`);
  }

  const valores: Partial<Record<ParametroRajadas, Valor>> = {};
  let viuNomeado = false;
  for (const [indice, argumento] of argumentos.entries()) {
    if (argumento.nome === undefined && viuNomeado) {
      return erroArgumentos('Em Python, os valores sem nome vêm antes dos valores com nome (ex.: forca=450).');
    }
    viuNomeado ||= argumento.nome !== undefined;

    const nome = argumento.nome ?? PARAMETROS_RAJADAS[indice];
    if (!ehParametroRajadas(nome)) {
      return erroArgumentos(`O parâmetro '${nome}' não existe.${sugestao(nome, PARAMETROS_RAJADAS)} Os nomes são: ordem, intervalo, forca.`);
    }
    if (valores[nome] !== undefined) {
      return erroArgumentos(`O parâmetro '${nome}' foi passado duas vezes.`);
    }
    valores[nome] = argumento.valor;
  }

  const { ordem, intervalo, forca } = valores;
  if (typeof ordem !== 'string') {
    return falha('TIPOS MISTURADOS', sortearSemRepetir(G.TIPO), `ordem é um texto: escreva entre aspas, ex.: "${s.ORDEM_CORRETA}".`);
  }
  if (typeof intervalo !== 'number' || typeof forca !== 'number') {
    return falha('TIPOS MISTURADOS', sortearSemRepetir(G.TIPO), 'intervalo e forca precisam ser números, ex.: 1.5 e 450.');
  }

  const ordemNormalizada = ordem.trim().toLowerCase();
  const simulacao: ParametrosEscadaVento = { ordem: ordemNormalizada, intervalo, forca };

  if (ordemNormalizada !== s.ORDEM_CORRETA) {
    const efeito =
      ordemNormalizada === 'decrescente'
        ? 'a escada liga de cima para baixo e o primeiro degrau some antes de você chegar'
        : 'as três turbinas ligam juntas';
    return falha(
      'ORDEM INCORRETA',
      especificos.ORDEM ?? sortearSemRepetir(textos.MENSAGENS_ERRO),
      `Com ordem "${ordem}", ${efeito}. A ordem exigida está no status. Veja a simulação.`,
      simulacao
    );
  }
  if (intervalo < s.INTERVALO_MIN || intervalo > s.INTERVALO_MAX) {
    const curto = intervalo < s.INTERVALO_MIN;
    return falha(
      'INTERVALO FORA DA FAIXA',
      (curto ? especificos.INTERVALO_CURTO : especificos.INTERVALO_LONGO) ?? sortearSemRepetir(textos.MENSAGENS_ERRO),
      `intervalo = ${intervalo}s ${curto ? 'é rápido demais: a coluna desliga antes de você pular' : 'é lento demais: você cai esperando a próxima coluna'}. ` +
        `A faixa é de ${s.INTERVALO_MIN} a ${s.INTERVALO_MAX} segundos. Veja a simulação.`,
      simulacao
    );
  }
  if (forca < s.FORCA_MIN || forca > s.FORCA_MAX) {
    const fraca = forca < s.FORCA_MIN;
    return falha(
      'FORÇA FORA DA FAIXA',
      (fraca ? especificos.FORCA_BAIXA : especificos.FORCA_ALTA) ?? sortearSemRepetir(textos.MENSAGENS_ERRO),
      `forca = ${forca} ${fraca ? 'não te levanta até o próximo degrau' : 'te arremessa longe demais'}. ` +
        `A faixa é de ${s.FORCA_MIN} a ${s.FORCA_MAX}. Veja a simulação.`,
      simulacao
    );
  }

  return {
    sucesso: true,
    mensagem:
      '[GERADOR TRIPLO // SEQUENCIADOR DE RAJADAS ATIVADO]\n' +
      `Sincronização compilada: ordem="${ordemNormalizada}", intervalo=${intervalo}s, forca=${forca}px!\n` +
      'As três correntes de ar disparam em escada ascendente perfeita. Voe, passarinho!',
    acao: 'ATIVAR_ESCADA_RAJADAS',
    valor: JSON.stringify(simulacao),
  };
}

const DICA_PARAMETRO = (nome: string) =>
  `'${nome}' é o nome do parâmetro. No lugar dele, passe o valor (ou escreva ${nome}=valor).`;
const DICA_ASPAS = (nome: string) => `Texto vai entre aspas: "${nome}".`;

const REGRA_TOTEM_4: RegraTotem = {
  textos: TEXTOS_TOTEM_4_SEQUENCIADOR,
  variaveis: [],
  funcoes: [FUNCAO_RAJADAS],
  dicasNomes: {
    ordem: DICA_PARAMETRO('ordem'),
    intervalo: DICA_PARAMETRO('intervalo'),
    forca: DICA_PARAMETRO('forca'),
    crescente: DICA_ASPAS('crescente'),
    decrescente: DICA_ASPAS('decrescente'),
  },
  validar: validarTotem4,
};

// =============================================================================
// ENTRADA DO INTERPRETADOR
// =============================================================================

const REGRAS_POR_TOTEM: Record<string, RegraTotem> = {
  [TOTEM_1_ALCOOLEMIA.ID]: REGRA_TOTEM_1,
  [TOTEM_2_BALANCA.ID]: REGRA_TOTEM_2,
  [TOTEM_3_PORTAO.ID]: REGRA_TOTEM_3,
  [TOTEM_4_SEQUENCIADOR.ID]: REGRA_TOTEM_4,
};

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

  try {
    const programa = analisarPrograma(comando);
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
