import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';

/**
 * Interpretador de comandos da Fase 3 (Lixão Eletrônico).
 * Provisório: só trata "ajuda" e "limpar". Os 6 exercícios em Python ficam para o fim
 * do desenvolvimento (ver docs/fase3/PLANO_FASE3.md, "Em aberto").
 */
export function interpretarComandoFase3(
  entrada: string,
  _contexto?: ContextoInterpretador
): ResultadoComando {
  const comando = entrada.trim().toLowerCase();

  if (!comando) {
    return { sucesso: false, mensagem: 'Nada digitado. Até a sucata aqui tem mais iniciativa.' };
  }

  if (comando === 'cls' || comando === 'clear' || comando === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
  }

  if (comando === 'ajuda' || comando === 'help') {
    return {
      sucesso: true,
      mensagem: 'Comandos: ajuda, limpar, enunciado. Os exercícios desta área ainda não foram instalados.',
    };
  }

  return {
    sucesso: false,
    mensagem: 'Comando não reconhecido. A máquina desta área ainda está desligada.',
  };
}
