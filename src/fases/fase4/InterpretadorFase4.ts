import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';

/**
 * Interpretador de comandos da Fase 4: Funções e Modularização (Integrante 4).
 */
export function interpretarComandoFase4(
  entrada: string,
  _contexto?: ContextoInterpretador
): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) {
    return { sucesso: false, mensagem: '[AVISO] Digite uma definição de função.' };
  }

  const normalizado = bruto.replace(/;+$/, '').trim().toLowerCase();

  if (normalizado === 'cls' || normalizado === 'clear' || normalizado === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
  }

  if (normalizado === 'help' || normalizado === 'ajuda') {
    return {
      sucesso: true,
      mensagem:
        '[MANUAL DE SUB-ROTINAS // SETOR 4]\n' +
        '  def nome_funcao(parametro): return valor\n' +
        '  Exemplo: def calcular_frequencia(carga): return carga * 2',
    };
  }

  const semEspacos = normalizado.replace(/\s+/g, ' ');

  // Desafio: Declarar uma função de compensação de frequência: def compensar(frequencia): return frequencia * 2
  const solucaoFuncao =
    semEspacos.includes('def ') &&
    (semEspacos.includes('return ') || semEspacos.includes('->')) &&
    (semEspacos.includes('* 2') || semEspacos.includes('*2') || semEspacos.includes('+ frequencia'));

  if (solucaoFuncao) {
    return {
      sucesso: true,
      mensagem:
        '[SUB-ROTINA COMPILADA] Função de compensação integrada ao gerador! Frequência estabilizada.',
      acao: 'CONCLUIR_FASE4',
    };
  }

  return {
    sucesso: false,
    mensagem:
      "[ERRO DE FUNÇÃO] Mega Brain: 'Declare a função com def e retorno: def compensar(freq): return freq * 2'",
  };
}
