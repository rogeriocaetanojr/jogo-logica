import type { Expressao, Instrucao, OperadorComparacao, Valor } from './ParserFase1';

/**
 * Avaliador do Python achatado dos totens da Fase 1.
 * Executa o programa contra um conjunto de sensores e registra as funções chamadas,
 * para que o interpretador compare o comportamento com o esperado em cada situação.
 */

export type Ambiente = Record<string, Valor>;

export interface ChamadaRegistrada {
  nome: string;
  argumentos: { nome?: string; valor: Valor }[];
}

export type CategoriaErroExecucao = 'variavel' | 'tipo';

export class ErroExecucaoFase1 extends Error {
  public readonly categoria: CategoriaErroExecucao;
  public readonly nome: string;

  constructor(categoria: CategoriaErroExecucao, nome: string, explicacao: string) {
    super(explicacao);
    this.name = 'ErroExecucaoFase1';
    this.categoria = categoria;
    this.nome = nome;
  }
}

/**
 * Verdade no estilo Python: 0 e texto vazio são falsos.
 */
export function verdadeiro(valor: Valor): boolean {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor !== 0;
  return valor.length > 0;
}

/**
 * Formata um valor como o jogador escreveria em Python.
 */
export function formatarValor(valor: Valor): string {
  if (typeof valor === 'boolean') return valor ? 'True' : 'False';
  if (typeof valor === 'string') return `"${valor}"`;
  return String(valor);
}

function descreverTipo(valor: Valor): string {
  if (typeof valor === 'boolean') return 'um booleano';
  if (typeof valor === 'number') return 'um número';
  return 'um texto';
}

function comparar(operador: OperadorComparacao, a: Valor, b: Valor): boolean {
  // Em Python, True e False se comportam como 1 e 0 em comparações
  const x = typeof a === 'boolean' ? Number(a) : a;
  const y = typeof b === 'boolean' ? Number(b) : b;

  // Diferença com sinal: negativa se x < y, zero se iguais, positiva se x > y
  let diferenca: number;
  if (typeof x === 'number' && typeof y === 'number') {
    diferenca = x - y;
  } else if (typeof x === 'string' && typeof y === 'string') {
    diferenca = x < y ? -1 : x > y ? 1 : 0;
  } else {
    if (operador === '==') return false;
    if (operador === '!=') return true;
    throw new ErroExecucaoFase1(
      'tipo',
      '',
      `Não dá para comparar ${descreverTipo(a)} com ${descreverTipo(b)} usando '${operador}'.`
    );
  }

  switch (operador) {
    case '==':
      return diferenca === 0;
    case '!=':
      return diferenca !== 0;
    case '<':
      return diferenca < 0;
    case '>':
      return diferenca > 0;
    case '<=':
      return diferenca <= 0;
    case '>=':
      return diferenca >= 0;
  }
}

export function avaliarExpressao(expressao: Expressao, ler: (nome: string) => Valor): Valor {
  switch (expressao.tipo) {
    case 'literal':
      return expressao.valor;
    case 'variavel':
      return ler(expressao.nome);
    case 'nao':
      return !verdadeiro(avaliarExpressao(expressao.operando, ler));
    case 'logica': {
      const esquerda = verdadeiro(avaliarExpressao(expressao.esquerda, ler));
      const direita = verdadeiro(avaliarExpressao(expressao.direita, ler));
      return expressao.operador === 'and' ? esquerda && direita : esquerda || direita;
    }
    case 'comparacao':
      return comparar(
        expressao.operador,
        avaliarExpressao(expressao.esquerda, ler),
        avaliarExpressao(expressao.direita, ler)
      );
  }
}

/**
 * Executa o programa com os sensores do ambiente (somente leitura) e devolve as chamadas feitas.
 * Atribuições criam variáveis locais, que têm prioridade na leitura.
 */
export function executarPrograma(programa: Instrucao[], ambiente: Ambiente): ChamadaRegistrada[] {
  const locais: Ambiente = {};
  const chamadas: ChamadaRegistrada[] = [];

  const ler = (nome: string): Valor => {
    if (Object.hasOwn(locais, nome)) return locais[nome];
    if (Object.hasOwn(ambiente, nome)) return ambiente[nome];
    throw new ErroExecucaoFase1('variavel', nome, `A variável '${nome}' não existe aqui.`);
  };

  const executar = (instrucoes: Instrucao[]): void => {
    for (const instrucao of instrucoes) {
      switch (instrucao.tipo) {
        case 'pass':
          break;
        case 'atribuicao':
          locais[instrucao.alvo] = avaliarExpressao(instrucao.valor, ler);
          break;
        case 'chamada':
          chamadas.push({
            nome: instrucao.nome,
            argumentos: instrucao.argumentos.map((arg) => ({
              nome: arg.nome,
              valor: avaliarExpressao(arg.valor, ler),
            })),
          });
          break;
        case 'se': {
          const ramo = instrucao.ramos.find((r) => verdadeiro(avaliarExpressao(r.condicao, ler)));
          if (ramo) {
            executar(ramo.corpo);
          } else if (instrucao.senao) {
            executar(instrucao.senao);
          }
          break;
        }
      }
    }
  };

  executar(programa);
  return chamadas;
}

// =============================================================================
// ANÁLISES ESTÁTICAS (sem executar)
// =============================================================================

export interface NomesDoPrograma {
  variaveisLidas: string[];
  atribuicoes: string[];
  chamadas: { nome: string; quantidadeArgumentos: number }[];
}

function* expressoesInternas(expressao: Expressao): Generator<Expressao> {
  yield expressao;
  switch (expressao.tipo) {
    case 'nao':
      yield* expressoesInternas(expressao.operando);
      break;
    case 'logica':
    case 'comparacao':
      yield* expressoesInternas(expressao.esquerda);
      yield* expressoesInternas(expressao.direita);
      break;
    case 'literal':
    case 'variavel':
      break;
  }
}

function* instrucoesInternas(programa: Instrucao[]): Generator<Instrucao> {
  for (const instrucao of programa) {
    yield instrucao;
    if (instrucao.tipo === 'se') {
      for (const ramo of instrucao.ramos) yield* instrucoesInternas(ramo.corpo);
      if (instrucao.senao) yield* instrucoesInternas(instrucao.senao);
    }
  }
}

function* expressoesDoPrograma(programa: Instrucao[]): Generator<Expressao> {
  for (const instrucao of instrucoesInternas(programa)) {
    if (instrucao.tipo === 'se') {
      for (const ramo of instrucao.ramos) yield* expressoesInternas(ramo.condicao);
    } else if (instrucao.tipo === 'atribuicao') {
      yield* expressoesInternas(instrucao.valor);
    } else if (instrucao.tipo === 'chamada') {
      for (const arg of instrucao.argumentos) yield* expressoesInternas(arg.valor);
    }
  }
}

/**
 * Lista variáveis lidas, variáveis atribuídas e funções chamadas, na ordem em que aparecem.
 */
export function coletarNomes(programa: Instrucao[]): NomesDoPrograma {
  const nomes: NomesDoPrograma = { variaveisLidas: [], atribuicoes: [], chamadas: [] };

  for (const instrucao of instrucoesInternas(programa)) {
    if (instrucao.tipo === 'atribuicao') {
      nomes.atribuicoes.push(instrucao.alvo);
    } else if (instrucao.tipo === 'chamada') {
      nomes.chamadas.push({ nome: instrucao.nome, quantidadeArgumentos: instrucao.argumentos.length });
    }
  }
  for (const expressao of expressoesDoPrograma(programa)) {
    if (expressao.tipo === 'variavel') nomes.variaveisLidas.push(expressao.nome);
  }

  return nomes;
}

/**
 * Verdadeiro se a função é chamada direto, fora de qualquer if.
 */
export function chamadaForaDeCondicao(programa: Instrucao[], funcao: string): boolean {
  return programa.some((instrucao) => instrucao.tipo === 'chamada' && instrucao.nome === funcao);
}

/**
 * Verdadeiro se alguma expressão mistura and e or sem parênteses agrupando a parte interna,
 * o que costuma indicar erro de precedência (o Python resolve and antes de or).
 */
export function contemMisturaSemParenteses(programa: Instrucao[]): boolean {
  for (const expressao of expressoesDoPrograma(programa)) {
    if (expressao.tipo !== 'logica') continue;
    for (const filho of [expressao.esquerda, expressao.direita]) {
      if (filho.tipo === 'logica' && filho.operador !== expressao.operador && !filho.agrupada) {
        return true;
      }
    }
  }
  return false;
}
