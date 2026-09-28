import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';

/**
 * Interpretador de comandos da Fase 1: Condicionais e Portas Lógicas (Integrante 1).
 */
export function interpretarComandoFase1(
  entrada: string,
  _contexto?: ContextoInterpretador
): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) {
    return {
      sucesso: false,
      mensagem: '[AVISO] Digite uma instrução condicional para avaliar.',
    };
  }

  const normalizado = bruto
    .replace(/;+$/, '')
    .trim()
    .toLowerCase();

  // Comandos de sistema
  if (normalizado === 'cls' || normalizado === 'clear' || normalizado === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
  }

  if (normalizado === 'help' || normalizado === 'ajuda') {
    return {
      sucesso: true,
      mensagem:
        '[MANUAL DO CIRCUITO CONDICIONAL // SETOR 1]\n' +
        '  clear / cls / limpar - Limpa a tela do terminal\n' +
        '  help / ajuda         - Exibe este manual\n' +
        '  if <condicao>:       - Executa bloco se a condição lógica for verdadeira\n' +
        '  Exemplo: if sensor_a and not sensor_b:\n' +
        '             abrir_trava()',
    };
  }

  // Normaliza espaços para facilitar validação sintática do IF
  const semEspacos = normalizado.replace(/\s+/g, ' ');

  // Cenário de desafio 1: A porta requer que o sensor_a esteja ligado E sensor_b desligado
  // Aceita:
  // if sensor_a and not sensor_b: abrir_trava()
  // if sensor_a and sensor_b == False: abrir_trava()
  // if sensor_a == True and sensor_b == False: abrir_trava()
  const solucaoCorreta =
    semEspacos.includes('sensor_a') &&
    (semEspacos.includes('not sensor_b') ||
      semEspacos.includes('sensor_b == false') ||
      semEspacos.includes('sensor_b is false')) &&
    (semEspacos.includes('abrir_trava') || semEspacos.includes('destravar') || semEspacos.includes('abrir'));

  if (solucaoCorreta) {
    return {
      sucesso: true,
      mensagem:
        '[CIRCUITO VALIDADO] Condição satisfeita: sensor_a (ATIVO) && sensor_b (INATIVO).\nComutador invertido! Trava lógica desativada.',
      acao: 'DESTRAVAR_PORTA_FASE1',
    };
  }

  // Erros conceituais guiados pelo Mega Brain
  if (semEspacos.includes('sensor_a and sensor_b')) {
    return {
      sucesso: false,
      mensagem:
        "[CURTO-CIRCUITO LÓGICO] Mega Brain: 'Se os dois sensores estiverem ligados ao mesmo tempo, a comporta sobrecarrega! O sensor B deve estar negado (NOT).'",
    };
  }

  if (semEspacos.includes('sensor_a or sensor_b')) {
    return {
      sucesso: false,
      mensagem:
        "[AMBIGUIDADE DETECTADA] Mega Brain: 'O operador OR permite que o sensor defeituoso libere a passagem. Use conjunção estrita (AND) com negação.'",
    };
  }

  return {
    sucesso: false,
    mensagem:
      "[ERRO DE SINTAXE CONDICIONAL] Mega Brain: 'Escreva a condicional no formato: if sensor_a and not sensor_b: abrir_trava()'",
  };
}
