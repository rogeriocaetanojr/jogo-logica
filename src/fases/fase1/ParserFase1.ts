import { ErroSintaxeFase1, tokenizar, type Token } from './LexerFase1';

/**
 * Parser do subconjunto de Python dos totens da Fase 1.
 * O terminal tem uma linha só, então o "Python" aceito é achatado:
 *   if a and not b: f() elif c: g() else: h()
 *   x = not a; if x: f()
 *   f("texto", 1.5, valor=450)
 * Precedência igual à do Python: not > and > or; comparações antes de not.
 */

export type Valor = boolean | number | string;
export type OperadorComparacao = '==' | '!=' | '<' | '>' | '<=' | '>=';

const OPERADORES_COMPARACAO: readonly string[] = ['==', '!=', '<', '>', '<=', '>='];

interface ExpressaoBase {
  /** Verdadeiro quando a expressão foi escrita entre parênteses. */
  agrupada?: boolean;
}

export interface ExpressaoLiteral extends ExpressaoBase {
  tipo: 'literal';
  valor: Valor;
}

export interface ExpressaoVariavel extends ExpressaoBase {
  tipo: 'variavel';
  nome: string;
}

export interface ExpressaoNao extends ExpressaoBase {
  tipo: 'nao';
  operando: Expressao;
}

export interface ExpressaoLogica extends ExpressaoBase {
  tipo: 'logica';
  operador: 'and' | 'or';
  esquerda: Expressao;
  direita: Expressao;
}

export interface ExpressaoComparacao extends ExpressaoBase {
  tipo: 'comparacao';
  operador: OperadorComparacao;
  esquerda: Expressao;
  direita: Expressao;
}

export type Expressao =
  | ExpressaoLiteral
  | ExpressaoVariavel
  | ExpressaoNao
  | ExpressaoLogica
  | ExpressaoComparacao;

export interface Argumento {
  nome?: string;
  valor: Expressao;
}

export interface RamoSe {
  condicao: Expressao;
  corpo: Instrucao[];
}

export interface InstrucaoChamada {
  tipo: 'chamada';
  nome: string;
  argumentos: Argumento[];
}

export interface InstrucaoAtribuicao {
  tipo: 'atribuicao';
  alvo: string;
  valor: Expressao;
}

export interface InstrucaoSe {
  tipo: 'se';
  ramos: RamoSe[];
  senao?: Instrucao[];
}

export interface InstrucaoPass {
  tipo: 'pass';
}

export type Instrucao = InstrucaoChamada | InstrucaoAtribuicao | InstrucaoSe | InstrucaoPass;

/**
 * Transforma a linha digitada no terminal em uma lista de instruções.
 * Lança ErroSintaxeFase1 com uma explicação legível quando a escrita está errada.
 */
export function analisarPrograma(entrada: string): Instrucao[] {
  return new AnalisadorSintatico(tokenizar(entrada)).programa();
}

class AnalisadorSintatico {
  private readonly tokens: Token[];
  private indice: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public programa(): Instrucao[] {
    const instrucoes: Instrucao[] = [];

    while (!this.noFim()) {
      instrucoes.push(this.instrucao());

      if (this.ehSimbolo(';')) {
        while (this.ehSimbolo(';')) this.avancar();
        continue;
      }
      // Vários ifs independentes podem vir em sequência na mesma linha
      if (this.noFim() || this.ehPalavra('if')) continue;

      throw this.erro('Não entendi o que vem depois do comando. Separe comandos com ;');
    }

    return instrucoes;
  }

  // ===========================================================================
  // INSTRUÇÕES
  // ===========================================================================

  private instrucao(): Instrucao {
    if (this.ehPalavra('if')) return this.se();
    if (this.ehPalavra('elif') || this.ehPalavra('else')) {
      throw this.erro(`'${this.atual.valor}' apareceu sem um if antes.`);
    }
    return this.simples();
  }

  private se(): InstrucaoSe {
    this.avancar(); // if
    const ramos: RamoSe[] = [this.ramo('if')];
    let senao: Instrucao[] | undefined;

    while (true) {
      if (this.ehPalavra('elif')) {
        this.avancar();
        ramos.push(this.ramo('elif'));
        continue;
      }
      if (this.ehPalavra('else')) {
        this.avancar();
        // "else if" é aceito como elif
        if (this.ehPalavra('if')) {
          this.avancar();
          ramos.push(this.ramo('else if'));
          continue;
        }
        this.esperarSimbolo(':', "Faltou ':' depois do else");
        senao = this.corpo();
        if (this.ehPalavra('elif') || this.ehPalavra('else')) {
          throw this.erro(`Depois do else não pode vir outro ${this.atual.valor}.`);
        }
      }
      break;
    }

    return { tipo: 'se', ramos, senao };
  }

  private ramo(nome: string): RamoSe {
    if (this.ehSimbolo(':')) {
      throw this.erro(`O ${nome} está sem condição.`);
    }
    const condicao = this.expressao();
    this.esperarSimbolo(':', `Faltou ':' depois da condição do ${nome}`);
    return { condicao, corpo: this.corpo() };
  }

  private corpo(): Instrucao[] {
    if (this.atual.tipo === 'fim') {
      throw this.erro("Depois do ':' precisa vir um comando, ex.: f().", false);
    }
    if (this.ehPalavra('if')) {
      throw this.erro("Não dá para colocar outro if logo depois do ':'. Junte as condições com and.");
    }

    const instrucoes: Instrucao[] = [this.simples()];

    while (this.ehSimbolo(';')) {
      const proximo = this.espiar();
      if (proximo.tipo === 'palavra' && (proximo.valor === 'elif' || proximo.valor === 'else')) {
        this.avancar(); // ";" antes de elif/else é tolerado
        break;
      }
      if (proximo.tipo === 'fim' || (proximo.tipo === 'palavra' && proximo.valor === 'if')) break;
      if (proximo.tipo === 'simbolo' && proximo.valor === ';') break;

      this.avancar();
      instrucoes.push(this.simples());
    }

    return instrucoes;
  }

  private simples(): Instrucao {
    if (this.ehPalavra('pass')) {
      this.avancar();
      return { tipo: 'pass' };
    }
    if (this.atual.tipo !== 'nome') {
      throw this.erro('Esperava um comando, como chamar uma função: f().');
    }

    const nome = this.nomeComposto();

    if (this.ehSimbolo('(')) {
      return { tipo: 'chamada', nome, argumentos: this.argumentos() };
    }
    if (this.ehSimbolo('=')) {
      this.avancar();
      return { tipo: 'atribuicao', alvo: nome, valor: this.expressao() };
    }
    if (this.ehSimbolo('==')) {
      throw this.erro("Comparar com '==' fora de um if não faz nada. Para decidir algo, use if.");
    }

    throw this.erro(`'${nome}' sozinho não faz nada. Para executar uma função, use parênteses: ${nome}().`);
  }

  private argumentos(): Argumento[] {
    this.avancar(); // (
    const argumentos: Argumento[] = [];
    if (this.ehSimbolo(')')) {
      this.avancar();
      return argumentos;
    }

    while (true) {
      let nome: string | undefined;
      const proximo = this.espiar();
      if (this.atual.tipo === 'nome' && proximo.tipo === 'simbolo' && proximo.valor === '=') {
        nome = this.avancar().valor;
        this.avancar(); // =
      }
      argumentos.push({ nome, valor: this.expressao() });

      if (this.ehSimbolo(',')) {
        this.avancar();
        continue;
      }
      this.esperarSimbolo(')', 'Faltou fechar o parêntese da função');
      return argumentos;
    }
  }

  private nomeComposto(): string {
    let nome = this.avancar().valor;
    while (this.ehSimbolo('.') && this.espiar().tipo === 'nome') {
      this.avancar();
      nome += `.${this.avancar().valor}`;
    }
    return nome;
  }

  // ===========================================================================
  // EXPRESSÕES (or < and < not < comparação < primário)
  // ===========================================================================

  private expressao(): Expressao {
    return this.ou();
  }

  private ou(): Expressao {
    let esquerda = this.e();
    while (this.ehPalavra('or')) {
      this.avancar();
      esquerda = { tipo: 'logica', operador: 'or', esquerda, direita: this.e() };
    }
    return esquerda;
  }

  private e(): Expressao {
    let esquerda = this.nao();
    while (this.ehPalavra('and')) {
      this.avancar();
      esquerda = { tipo: 'logica', operador: 'and', esquerda, direita: this.nao() };
    }
    return esquerda;
  }

  private nao(): Expressao {
    if (this.ehPalavra('not')) {
      this.avancar();
      return { tipo: 'nao', operando: this.nao() };
    }
    return this.comparacao();
  }

  private comparacao(): Expressao {
    const esquerda = this.primario();

    let operador: OperadorComparacao | undefined;
    if (this.atual.tipo === 'simbolo' && OPERADORES_COMPARACAO.includes(this.atual.valor)) {
      operador = this.avancar().valor as OperadorComparacao;
    } else if (this.ehPalavra('is')) {
      this.avancar();
      if (this.ehPalavra('not')) {
        this.avancar();
        operador = '!=';
      } else {
        operador = '==';
      }
    } else if (this.ehSimbolo('=')) {
      throw this.erro("Para comparar use '==' (dois iguais). Um '=' sozinho guarda valor numa variável.");
    }

    if (!operador) return esquerda;
    return { tipo: 'comparacao', operador, esquerda, direita: this.primario() };
  }

  private primario(): Expressao {
    const token = this.atual;

    if (token.tipo === 'numero') {
      this.avancar();
      return { tipo: 'literal', valor: Number(token.valor) };
    }
    if (token.tipo === 'texto') {
      this.avancar();
      return { tipo: 'literal', valor: token.valor };
    }
    if (this.ehPalavra('true') || this.ehPalavra('false')) {
      this.avancar();
      return { tipo: 'literal', valor: token.valor === 'true' };
    }
    if (this.ehSimbolo('(')) {
      this.avancar();
      const interna = this.expressao();
      this.esperarSimbolo(')', 'Faltou fechar o parêntese');
      interna.agrupada = true;
      return interna;
    }
    if (token.tipo === 'nome') {
      const nome = this.nomeComposto();
      if (this.ehSimbolo('(')) {
        throw this.erro(`Dentro da condição use variáveis e valores. '${nome}()' é uma função: ela vai depois do ':'.`);
      }
      return { tipo: 'variavel', nome };
    }
    if (token.tipo === 'fim') {
      throw this.erro('A expressão terminou no meio. Faltou uma variável ou valor no final.', false);
    }

    throw this.erro('Esperava uma variável ou um valor aqui.');
  }

  // ===========================================================================
  // UTILITÁRIOS
  // ===========================================================================

  private get atual(): Token {
    return this.tokens[this.indice];
  }

  private noFim(): boolean {
    return this.atual.tipo === 'fim';
  }

  private espiar(): Token {
    return this.tokens[Math.min(this.indice + 1, this.tokens.length - 1)];
  }

  private avancar(): Token {
    const token = this.atual;
    if (token.tipo !== 'fim') this.indice++;
    return token;
  }

  private ehPalavra(valor: string): boolean {
    return this.atual.tipo === 'palavra' && this.atual.valor === valor;
  }

  private ehSimbolo(valor: string): boolean {
    return this.atual.tipo === 'simbolo' && this.atual.valor === valor;
  }

  private esperarSimbolo(valor: string, explicacao: string): void {
    if (!this.ehSimbolo(valor)) throw this.erro(`${explicacao}.`);
    this.avancar();
  }

  /**
   * Erro com a localização antes do ponto final: "Faltou ':' depois do if (perto de 'f')."
   */
  private erro(explicacao: string, comLocal: boolean = true): ErroSintaxeFase1 {
    if (!comLocal) return new ErroSintaxeFase1(explicacao);
    return new ErroSintaxeFase1(`${explicacao.replace(/\.$/, '')} ${this.perto()}.`);
  }

  private perto(): string {
    const token = this.atual;
    if (token.tipo === 'fim') return '(no fim da linha)';
    const trecho = token.tipo === 'texto' ? `"${token.valor}"` : token.valor;
    return `(perto de '${trecho}')`;
  }
}
