/**
 * Lexer do subconjunto de Python aceito nos totens da Fase 1.
 * Tolerante com o que não muda o sentido do código (espaços, caixa alta, acentos em nomes,
 * aspas curvas coladas de outro lugar) e explicativo com o que é erro de verdade.
 */

export type TipoToken = 'nome' | 'palavra' | 'numero' | 'texto' | 'simbolo' | 'fim';

export interface Token {
  tipo: TipoToken;
  valor: string;
  posicao: number;
}

export type CategoriaErroSintaxe = 'sintaxe' | 'linguagem';

/**
 * Erro de escrita do código. A mensagem já é a explicação objetiva para o jogador;
 * a categoria 'linguagem' indica sintaxe de outra linguagem (&&, ||, !, chaves).
 */
export class ErroSintaxeFase1 extends Error {
  public readonly categoria: CategoriaErroSintaxe;

  constructor(explicacao: string, categoria: CategoriaErroSintaxe = 'sintaxe') {
    super(explicacao);
    this.name = 'ErroSintaxeFase1';
    this.categoria = categoria;
  }
}

const PALAVRAS_RESERVADAS = new Set([
  'if',
  'elif',
  'else',
  'and',
  'or',
  'not',
  'is',
  'true',
  'false',
  'pass',
]);

const SIMBOLOS_DUPLOS = ['==', '!=', '<=', '>='];
const SIMBOLOS_SIMPLES = '<>=():,.;';

/**
 * Remove acentos e passa para minúsculas: "Força" e "forca" viram o mesmo nome.
 */
function normalizarNome(nome: string): string {
  return nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function tokenizar(entrada: string): Token[] {
  const fonte = entrada.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const tokens: Token[] = [];
  let i = 0;

  while (i < fonte.length) {
    const c = fonte[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // Texto entre aspas simples ou duplas
    if (c === '"' || c === "'") {
      const fim = fonte.indexOf(c, i + 1);
      if (fim === -1) {
        throw new ErroSintaxeFase1(`Faltou fechar as aspas do texto ${fonte.slice(i, i + 12)}...`);
      }
      tokens.push({ tipo: 'texto', valor: fonte.slice(i + 1, fim), posicao: i });
      i = fim + 1;
      continue;
    }

    const resto = fonte.slice(i);

    const numero = /^\d+(?:\.\d+)?/.exec(resto);
    if (numero) {
      tokens.push({ tipo: 'numero', valor: numero[0], posicao: i });
      i += numero[0].length;
      continue;
    }

    const nome = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(resto);
    if (nome) {
      const normalizado = normalizarNome(nome[0]);
      const tipo = PALAVRAS_RESERVADAS.has(normalizado) ? 'palavra' : 'nome';
      tokens.push({ tipo, valor: normalizado, posicao: i });
      i += nome[0].length;
      continue;
    }

    // Sintaxe de outras linguagens: explicar o equivalente em Python
    const dois = fonte.slice(i, i + 2);
    const tres = fonte.slice(i, i + 3);
    if (tres === '===' || tres === '!==') {
      throw new ErroSintaxeFase1(
        `Em Python a comparação usa '${tres.slice(0, 2)}' (dois sinais), não '${tres}'.`,
        'linguagem'
      );
    }
    if (dois === '&&') {
      throw new ErroSintaxeFase1("Em Python o 'e' lógico se escreve and, não &&.", 'linguagem');
    }
    if (dois === '||') {
      throw new ErroSintaxeFase1("Em Python o 'ou' lógico se escreve or, não ||.", 'linguagem');
    }
    if (dois === '=<' || dois === '=>') {
      throw new ErroSintaxeFase1(`O operador se escreve '${dois[1]}=', com o sinal de igual no fim.`);
    }

    if (SIMBOLOS_DUPLOS.includes(dois)) {
      tokens.push({ tipo: 'simbolo', valor: dois, posicao: i });
      i += 2;
      continue;
    }

    if (c === '!') {
      throw new ErroSintaxeFase1('Em Python a negação se escreve not, não !.', 'linguagem');
    }
    if (c === '{' || c === '}') {
      throw new ErroSintaxeFase1(
        "Python não usa chaves { }. Depois da condição vem ':' e o comando.",
        'linguagem'
      );
    }

    if (SIMBOLOS_SIMPLES.includes(c)) {
      tokens.push({ tipo: 'simbolo', valor: c, posicao: i });
      i++;
      continue;
    }

    throw new ErroSintaxeFase1(`Não reconheço o caractere '${c}'.`);
  }

  tokens.push({ tipo: 'fim', valor: '', posicao: fonte.length });
  return tokens;
}
