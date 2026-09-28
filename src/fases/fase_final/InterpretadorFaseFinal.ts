import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';

/**
 * Interpretador de comandos da Fase Final: O Núcleo do Mega Brain (Equipe).
 */
export function interpretarComandoFaseFinal(
  entrada: string,
  _contexto?: ContextoInterpretador
): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) {
    return { sucesso: false, mensagem: '[AVISO] Digite o comando de desligamento do núcleo.' };
  }

  const normalizado = bruto.replace(/;+$/, '').trim().toLowerCase();

  if (normalizado === 'cls' || normalizado === 'clear' || normalizado === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
  }

  if (normalizado === 'help' || normalizado === 'ajuda') {
    return {
      sucesso: true,
      mensagem:
        '[PROTOCOLO DE REINICIALIZAÇÃO DO MEGA BRAIN // NÚCLEO]\n' +
        '  shutdown --force-free-thought\n' +
        '  reiniciar_mente_livre()\n' +
        '  Exemplo: reiniciar_mente_livre()',
    };
  }

  const semEspacos = normalizado.replace(/\s+/g, '');

  const solucaoFinal =
    semEspacos.includes('reiniciar_mente_livre') ||
    semEspacos.includes('shutdown') ||
    semEspacos.includes('megabrain.desligar()') ||
    semEspacos.includes('desligar()');

  if (solucaoFinal) {
    return {
      sucesso: true,
      mensagem:
        '[NÚCLEO LIBERADO] A diretriz autoritária do Mega Brain foi desmantelada!\nO pensamento livre foi restaurado para toda a humanidade.',
      acao: 'VENCER_JOGO',
    };
  }

  return {
    sucesso: false,
    mensagem:
      "[RESISTÊNCIA DO MEGA BRAIN] 'Minha lógica é perfeita! Você não pode me desligar sem a rotina de libertação: reiniciar_mente_livre()'",
  };
}
