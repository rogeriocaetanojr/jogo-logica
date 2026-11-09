import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';
import { DEBOCHES, EXERCICIOS, avaliarResposta } from './lixao/ExerciciosLixao';
import type { ContextoExercicio } from './lixao/ExerciciosLixao';

/** Ações devolvidas à cena (ver CenaFase3.configurarTerminal). */
export const ACAO_RESOLVER = 'RESOLVER_EXERCICIO';
/** Primeira linha de uma resposta em duas partes aceita; `valor` traz a linha normalizada. */
export const ACAO_LINHA_PARCIAL = 'LINHA_PARCIAL';

let ultimoDeboche = -1;

/** Sorteia um deboche diferente do anterior. */
function sortearDeboche(): string {
  let i: number;
  do i = Math.floor(Math.random() * DEBOCHES.length);
  while (i === ultimoDeboche && DEBOCHES.length > 1);
  ultimoDeboche = i;
  return DEBOCHES[i];
}

/**
 * Interpretador de comandos da Fase 3 (Lixão Eletrônico). O contexto diz qual exercício
 * está aberto e a linha pendente de uma resposta em duas partes (ver ExerciciosLixao).
 * Além do código, aceita "ajuda" e "limpar".
 */
export function interpretarComandoFase3(entrada: string, contexto?: ContextoInterpretador): ResultadoComando {
  const comando = entrada.trim();
  const minusculo = comando.toLowerCase();

  if (!comando) {
    return { sucesso: false, mensagem: 'Nada digitado. Até a sucata aqui tem mais iniciativa.' };
  }

  if (minusculo === 'cls' || minusculo === 'clear' || minusculo === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
  }

  if (minusculo === 'ajuda' || minusculo === 'help') {
    return {
      sucesso: true,
      mensagem: 'Digite o código Python do enunciado e aperte Enter. Comandos: enunciado, limpar, ajuda. Esc fecha.',
    };
  }

  const ctx = contexto as Partial<ContextoExercicio> | undefined;
  const exercicio = ctx?.exercicio !== undefined ? EXERCICIOS[ctx.exercicio] : undefined;
  if (!exercicio) {
    return { sucesso: false, mensagem: 'Este terminal não tem exercício instalado.' };
  }
  if (ctx?.resolvido) {
    return { sucesso: true, mensagem: 'Exercício já resolvido. O caminho está livre; vai embora.' };
  }

  const avaliacao = avaliarResposta(exercicio, comando, ctx?.linhaPendente ?? '');
  if (avaliacao.tipo === 'acerto') {
    return { sucesso: true, mensagem: exercicio.acerto, acao: ACAO_RESOLVER };
  }
  if (avaliacao.tipo === 'parcial') {
    return {
      sucesso: true,
      mensagem: 'Linha aceita. Agora a próxima.',
      acao: ACAO_LINHA_PARCIAL,
      valor: avaliacao.linhaPendente,
    };
  }
  return { sucesso: false, mensagem: sortearDeboche() };
}
