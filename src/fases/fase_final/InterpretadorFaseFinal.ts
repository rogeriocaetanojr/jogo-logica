import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';
import type { IdPuzzleAndar } from './andares/tiposAndar';
import { TEXTOS_TERMO } from './DialogosFaseFinal';
import { avaliarPuzzle } from './puzzles/avaliadoresPuzzle';
import { ERROS_PARA_DICA, PUZZLES, TEXTOS_PUZZLE } from './puzzles/definicoesPuzzles';
import type { EstadoPuzzle, FatosAndar, ResultadoPuzzle } from './puzzles/tiposPuzzle';
import { normalizar } from './utilTexto';

/**
 * Interpretador dos terminais da Fase Final. Cada terminal informa no contexto qual puzzle é
 * (`contexto.puzzle`). A validação é tolerante: ignora maiúsculas, acentos e espaços extras,
 * e aceita tanto a linha inteira corrigida quanto só o trecho que muda.
 */

export interface ContextoTermo extends ContextoInterpretador {
  puzzle: 'termo';
  aceito: boolean;
  recusas: number;
  invalidos: number;
}

/** Terminal do puzzle de um andar. A cena guarda este objeto e lê `ultimo` depois de cada envio. */
export interface ContextoPuzzleAndar extends ContextoInterpretador {
  puzzle: 'andar';
  id: IdPuzzleAndar;
  resolvido: boolean;
  erros: number;
  estado: EstadoPuzzle;
  fatos: FatosAndar;
  ultimo?: ResultadoPuzzle;
}

export const ACOES_FASE_FINAL = {
  TERMO_ACEITO: 'TERMO_ACEITO',
  TERMO_RECUSADO: 'TERMO_RECUSADO',
  TERMO_INVALIDO: 'TERMO_INVALIDO',
  PUZZLE_RESOLVIDO: 'PUZZLE_RESOLVIDO',
  PUZZLE_ERRADO: 'PUZZLE_ERRADO',
  PUZZLE_FORMATO: 'PUZZLE_FORMATO',
  AJUDA: 'AJUDA',
  LIMPAR: 'LIMPAR_TERMINAL',
} as const;

const COMANDOS_AJUDA = new Set(['help', 'ajuda', 'help()', 'ajuda()', '?']);
const COMANDOS_LIMPAR = new Set(['clear', 'limpar', 'cls', 'clear()', 'limpar()']);

export function interpretarComandoFaseFinal(entrada: string, contexto?: ContextoInterpretador): ResultadoComando {
  const texto = normalizar(entrada);

  if (COMANDOS_LIMPAR.has(texto)) {
    return { sucesso: true, mensagem: '', acao: ACOES_FASE_FINAL.LIMPAR };
  }

  switch (contexto?.puzzle) {
    case 'termo':
      return interpretarTermo(texto, contexto as ContextoTermo);
    case 'andar':
      return interpretarPuzzleAndar(entrada, texto, contexto as ContextoPuzzleAndar);
    default:
      return { sucesso: false, mensagem: '[ERRO] Este terminal está desconectado da torre.' };
  }
}

function interpretarPuzzleAndar(entrada: string, texto: string, ctx: ContextoPuzzleAndar): ResultadoComando {
  const def = PUZZLES[ctx.id];
  ctx.ultimo = undefined;
  if (ctx.resolvido) return { sucesso: true, mensagem: TEXTOS_PUZZLE.JA_RESOLVIDO };
  if (COMANDOS_AJUDA.has(texto)) {
    const linhas = [...def.comoResponder];
    if (ctx.erros >= ERROS_PARA_DICA) linhas.push(def.dica);
    return { sucesso: true, mensagem: linhas.join('\n'), acao: ACOES_FASE_FINAL.AJUDA };
  }

  const resultado = avaliarPuzzle(ctx.id, entrada, ctx.estado, ctx.fatos);
  ctx.ultimo = resultado;
  if (resultado.status === 'formato') {
    return { sucesso: false, mensagem: resultado.mensagem, acao: ACOES_FASE_FINAL.PUZZLE_FORMATO };
  }
  if (resultado.estado) ctx.estado = resultado.estado;
  if (resultado.status === 'certo') {
    return {
      sucesso: true,
      mensagem: `${TEXTOS_PUZZLE.EXECUTANDO}\n${def.acerto}`,
      acao: ACOES_FASE_FINAL.PUZZLE_RESOLVIDO,
    };
  }
  return {
    sucesso: false,
    mensagem: `${TEXTOS_PUZZLE.EXECUTANDO}\n${def.execucaoErro(resultado.erro, resultado.dados)}`,
    acao: ACOES_FASE_FINAL.PUZZLE_ERRADO,
  };
}

/* =========================================================================
 * TERMO DE CIÊNCIA
 * ========================================================================= */

// O termo é em português: "true" é aceito, mas ganha uma piada sobre o jogador ser espertão
const VALORES_VERDADEIRO = new Set(['verdadeiro', 'sim', 'v']);
const VALORES_PYTHON_VERDADEIRO = new Set(['true']);
const VALORES_FALSO = new Set(['falso', 'false', 'nao', 'n', 'f']);
const VARIAVEL_TERMO = 'jogador.ciente_dos_riscos';

function interpretarTermo(texto: string, ctx: ContextoTermo): ResultadoComando {
  if (ctx.aceito) {
    return { sucesso: true, mensagem: TEXTOS_TERMO.JA_ASSINADO };
  }

  if (COMANDOS_AJUDA.has(texto)) {
    return { sucesso: true, mensagem: TEXTOS_TERMO.AJUDA.join('\n'), acao: ACOES_FASE_FINAL.AJUDA };
  }

  // Linha inteira ("jogador.ciente_dos_riscos = x") ou só o valor ("x")
  let valor = texto;
  const igual = texto.lastIndexOf('=');
  if (igual >= 0) {
    const variavel = texto.slice(0, igual);
    valor = texto.slice(igual + 1);
    if (variavel !== VARIAVEL_TERMO) {
      return { sucesso: false, mensagem: TEXTOS_TERMO.VARIAVEL_ERRADA, acao: ACOES_FASE_FINAL.TERMO_INVALIDO };
    }
  }
  valor = valor.replace(/^["']|["']$/g, '');

  if (VALORES_VERDADEIRO.has(valor)) {
    return { sucesso: true, mensagem: TEXTOS_TERMO.ACEITO, acao: ACOES_FASE_FINAL.TERMO_ACEITO };
  }
  if (VALORES_PYTHON_VERDADEIRO.has(valor)) {
    return {
      sucesso: true,
      mensagem: `${TEXTOS_TERMO.PYTHON}\n${TEXTOS_TERMO.ACEITO}`,
      acao: ACOES_FASE_FINAL.TERMO_ACEITO,
    };
  }
  if (VALORES_FALSO.has(valor)) {
    const recusas = TEXTOS_TERMO.RECUSAS;
    const indice = ctx.recusas % recusas.length;
    const mensagem = recusas[indice].replace('{n}', String(ctx.recusas + 1));
    return { sucesso: false, mensagem, acao: ACOES_FASE_FINAL.TERMO_RECUSADO };
  }
  if (/^_+$/.test(valor)) {
    return { sucesso: false, mensagem: TEXTOS_TERMO.TRACOS, acao: ACOES_FASE_FINAL.TERMO_INVALIDO };
  }

  const invalidos = TEXTOS_TERMO.INVALIDOS;
  return {
    sucesso: false,
    mensagem: invalidos[ctx.invalidos % invalidos.length],
    acao: ACOES_FASE_FINAL.TERMO_INVALIDO,
  };
}
