import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';

/**
 * Interpretador de comandos da Fase 2: Loops e Automação (Integrante 2).
 */
export function interpretarComandoFase2(
  entrada: string,
  _contexto?: ContextoInterpretador
): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) {
    return { sucesso: false, mensagem: '[AVISO] Digite uma instrução de loop para executar.' };
  }

  const normalizado = bruto.replace(/;+$/, '').trim().toLowerCase();

  if (normalizado === 'cls' || normalizado === 'clear' || normalizado === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
  }

  if (normalizado === 'help' || normalizado === 'ajuda') {
    return {
      sucesso: true,
      mensagem:
        '[MANUAL DE AUTOMAÇÃO POR REPETIÇÃO // SETOR 2]\n' +
        '  for i in range(N): acao()  - Repete a ação N vezes consecutivas\n' +
        '  while condicao: acao()     - Repete enquanto a condição for verdadeira\n' +
        '  Exemplo: for i in range(5): alinhar_esteira()',
    };
  }

  // Desafio da Fase 2: Alinhar 5 segmentos de esteira com um loop
  const semEspacos = normalizado.replace(/\s+/g, ' ');

  const solucaoFor =
    semEspacos.includes('for') &&
    semEspacos.includes('range(5)') &&
    (semEspacos.includes('alinhar') || semEspacos.includes('ativar'));

  const solucaoWhile =
    semEspacos.includes('while') &&
    (semEspacos.includes('alinhar') || semEspacos.includes('ativar'));

  if (solucaoFor || solucaoWhile) {
    return {
      sucesso: true,
      mensagem:
        '[AUTOMAÇÃO CONCLUÍDA] 5/5 segmentos alinhados via loop! Barreira mecânica rebaixada.',
      acao: 'CONCLUIR_FASE2',
    };
  }

  return {
    sucesso: false,
    mensagem:
      "[ERRO DE LOOP] Mega Brain: 'Não faça trabalho repetitivo manual. Utilize um loop for ou while: for i in range(5): alinhar_esteira()'",
  };
}
