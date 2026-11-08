import type { IdPuzzleAndar } from '../andares/tiposAndar';

/** Estado que um puzzle guarda entre tentativas (só o de variáveis usa). */
export interface EstadoPuzzle {
  destino: number;
  passageiros: number;
}

/** Fatos do andar que o puzzle precisa saber (ex.: quantos humanos há na sala). */
export interface FatosAndar {
  numeroAndar: number;
  humanos: number;
}

export type ErroSequencia = 'usa_antes_de_criar' | 'abre_antes_de_validar';
export type ErroVariaveis = 'destino' | 'passageiros';
export type ErroCondicionais = 'sem_mudanca';
export type ErroLacos = 'zero' | 'poucas' | 'muitas';
export type ErroFuncoes = 'fixo';
export type CodigoErroPuzzle = ErroSequencia | ErroVariaveis | ErroCondicionais | ErroLacos | ErroFuncoes;

/** Informação extra do erro, usada pela mensagem e pela consequência visual. */
export interface DadosErroPuzzle {
  ordem?: number[];
  destino?: number;
  passageiros?: number;
  humanos?: number;
  placas?: number;
  comporta?: number;
}

/**
 * Resultado de avaliar uma entrada:
 * - certo: resolve o andar.
 * - errado: código válido mas com o problema; tem consequência visual e conta erro.
 * - formato: não deu para entender a entrada; só orienta, não conta erro.
 */
export type ResultadoPuzzle =
  | { status: 'certo'; estado?: EstadoPuzzle; observacao?: string }
  | { status: 'errado'; erro: CodigoErroPuzzle; dados: DadosErroPuzzle; estado?: EstadoPuzzle }
  | { status: 'formato'; mensagem: string };

/**
 * Um puzzle como dado: o enunciado, o código que a IA escreveu, como responder, o que dizer em
 * cada erro e a dica que aparece a partir do 3º erro. A lógica de avaliar fica em avaliadoresPuzzle.ts.
 */
export interface DefinicaoPuzzle {
  id: IdPuzzleAndar;
  titulo: string;
  enunciado: readonly string[];
  /** Código mostrado no terminal (o de variáveis reflete os valores atuais). */
  codigo: (estado: EstadoPuzzle) => string[];
  comoResponder: readonly string[];
  /** Linha de execução impressa no terminal para cada erro. */
  execucaoErro: (erro: CodigoErroPuzzle, dados: DadosErroPuzzle) => string;
  /** Comentários do Mega Brain pelo alto-falante, em ciclo, um por erro. */
  comentarios: readonly string[];
  /** Dica mais direta (sem entregar a resposta), somada ao comentário a partir do 3º erro. */
  dica: string;
  acerto: string;
  comentarioAcerto: string;
}
