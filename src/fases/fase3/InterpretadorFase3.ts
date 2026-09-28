import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';

/**
 * Interpretador de comandos da Fase 3: Registradores e Barramentos de Lista (Integrante 3).
 */
export function interpretarComandoFase3(
  entrada: string,
  _contexto?: ContextoInterpretador
): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) {
    return { sucesso: false, mensagem: '[AVISO] Digite uma instrução de lista para processar.' };
  }

  const normalizado = bruto.replace(/;+$/, '').trim().toLowerCase();

  if (normalizado === 'cls' || normalizado === 'clear' || normalizado === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
  }

  if (normalizado === 'help' || normalizado === 'ajuda') {
    return {
      sucesso: true,
      mensagem:
        '[MANUAL DE REGISTRADORES // SETOR 3]\n' +
        '  dados.append(item)    - Insere item no fim da lista\n' +
        '  dados.pop()           - Remove o último item\n' +
        '  dados[indice]         - Acessa elemento pelo índice (0 a N-1)\n' +
        "  Exemplo: chave = setor[0] + setor[2]",
    };
  }

  const semEspacos = normalizado.replace(/\s+/g, '');

  // Desafio: Montar a chave pegando o primeiro e o terceiro elemento de registradores = ["Alfa", "Beta", "Gamma"]
  // Ex: chave = registradores[0] + registradores[2] ou "AlfaGamma"
  const solucaoAcesso =
    semEspacos.includes('registradores[0]+registradores[2]') ||
    semEspacos.includes('dados[0]+dados[2]') ||
    semEspacos.includes('"alfagamma"') ||
    semEspacos.includes("'alfagamma'");

  if (solucaoAcesso) {
    return {
      sucesso: true,
      mensagem:
        "[REGISTRADORES SINCRONIZADOS] Chave 'AlfaGamma' montada com sucesso a partir dos índices da lista!",
      acao: 'CONCLUIR_FASE3',
    };
  }

  return {
    sucesso: false,
    mensagem:
      "[ERRO DE ÍNDICE] Mega Brain: 'Acesse os elementos corretos da lista com [0] e [2]: chave = registradores[0] + registradores[2]'",
  };
}
