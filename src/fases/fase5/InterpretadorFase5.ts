import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';

/**
 * Interpretador de comandos da Fase 5: Algoritmos e Otimização (Integrante 5).
 */
export function interpretarComandoFase5(
  entrada: string,
  _contexto?: ContextoInterpretador
): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) {
    return { sucesso: false, mensagem: '[AVISO] Digite uma rota ou instrução de otimização.' };
  }

  const normalizado = bruto.replace(/;+$/, '').trim().toLowerCase();

  if (normalizado === 'cls' || normalizado === 'clear' || normalizado === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
  }

  if (normalizado === 'help' || normalizado === 'ajuda') {
    return {
      sucesso: true,
      mensagem:
        '[MANUAL DE ROTEAMENTO OTIMIZADO // SETOR 5]\n' +
        '  min(caminhos)         - Retorna o caminho de menor latência\n' +
        '  otimizar_rota()       - Recalcula o trajeto crítico\n' +
        '  Exemplo: rota = min([14, 8, 22])',
    };
  }

  const semEspacos = normalizado.replace(/\s+/g, '');

  // Desafio: Identificar a menor latência entre os nós: [14, 8, 22] usando min() ou o valor 8
  const solucaoOtimizacao =
    semEspacos.includes('min(') ||
    semEspacos.includes('rota=8') ||
    semEspacos.includes('rota=min') ||
    semEspacos.includes('caminho=8') ||
    semEspacos === '8';

  if (solucaoOtimizacao) {
    return {
      sucesso: true,
      mensagem:
        '[ROTA OTIMIZADA] Menor latência identificada (8ms)! Pacotes desviados do firewall do Mega Brain.',
      acao: 'CONCLUIR_FASE5',
    };
  }

  return {
    sucesso: false,
    mensagem:
      "[ERRO DE ROTEAMENTO] Mega Brain: 'Seus pacotes colidiram. Encontre o menor custo usando min(): rota = min([14, 8, 22])'",
  };
}
