export interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
  value?: number;
}

export function parseCommand(
  input: string,
  context?: { totem?: 'barrier' | 'electric' }
): CommandResult {
  const raw = input.trim();
  if (!raw) {
    return {
      success: false,
      message: '[AVISO] Digite um comando valido para executar.',
    };
  }

  // Normaliza tirando ponto e virgula final e padronizando espacos
  const normalized = raw
    .replace(/;+$/, '')
    .trim()
    .toLowerCase();

  // Remove espacos ao redor do operador '=' para facilitar comparacao
  const compactAssignment = normalized.replace(/\s*=\s*/g, '=');

  // ==========================================
  // TOTEM 1: COMPORTA HIDRÁULICA (TIPOS)
  // ==========================================

  // 1. Verificação de ERRO DE TIPO (uso de aspas para representar números)
  const isStringError =
    compactAssignment === '"42"' ||
    compactAssignment === "'42'" ||
    compactAssignment === '"int"' ||
    compactAssignment === "'int'" ||
    compactAssignment === 'chave="42"' ||
    compactAssignment === "chave='42'" ||
    compactAssignment === 'chave_seguranca="42"' ||
    compactAssignment === "chave_seguranca='42'" ||
    compactAssignment === 'tipo="int"' ||
    compactAssignment === "tipo='int'";

  if (isStringError) {
    return {
      success: false,
      message:
        '[ERRO DE TIPO] Você acabou de mandar um texto com o desenho do número. Aspas são para TEXTO, gênio da computação! O pistão precisa de um INTEIRO sem aspas.',
    };
  }

  // 2. Comandos de Sucesso para a Comporta Hidráulica
  const isGateSuccess =
    compactAssignment === 'chave=42' ||
    compactAssignment === 'chave_seguranca=42' ||
    compactAssignment === 'int("42")' ||
    compactAssignment === "int('42')" ||
    compactAssignment === 'int(42)' ||
    compactAssignment === 'tipo=int' ||
    compactAssignment === 'tipo=integer' ||
    compactAssignment === 'int' ||
    compactAssignment === 'chave=int("42")' ||
    compactAssignment === "chave=int('42')" ||
    compactAssignment === 'chave_seguranca=int("42")' ||
    compactAssignment === "chave_seguranca=int('42')";

  if (isGateSuccess) {
    return {
      success: true,
      message:
        '[SUCESSO] Tipo convertido para INT com sucesso! Pistão reconheceu a massa 42kg. Comporta destravada.',
      action: 'DISABLE_BARRIER',
    };
  }

  // ==========================================
  // TOTEM 2: REGULADOR ELÉTRICO (LEI DE OHM)
  // ==========================================

  // Desligamento direto ou tensão zerada
  const isElectricShutdown =
    compactAssignment === 'circuito.desligar()' ||
    compactAssignment === 'circuito.desligar' ||
    compactAssignment === 'desligar' ||
    compactAssignment === 'desligar()' ||
    compactAssignment === 'tensao=0' ||
    compactAssignment === 'voltagem=0' ||
    compactAssignment === 'v=0' ||
    compactAssignment === 'tensao=0v';

  if (isElectricShutdown) {
    return {
      success: true,
      message: '[SUCESSO] Corrente estabilizada em níveis seguros! Faíscas neutralizadas.',
      action: 'DISABLE_SHOCK',
    };
  }

  // Aumento de resistência (resistencia >= 500)
  const resistanceMatch = compactAssignment.match(
    /^(?:resistencia|resistencia_circuito|r)=(\d+(?:\.\d+)?)(?:ohm|ohms|k|kohm)?$/
  );
  if (resistanceMatch) {
    const val = parseFloat(resistanceMatch[1]);
    if (val >= 500) {
      return {
        success: true,
        message: '[SUCESSO] Corrente estabilizada em níveis seguros! Faíscas neutralizadas.',
        action: 'DISABLE_SHOCK',
      };
    } else if (val === 0) {
      return {
        success: false,
        message:
          '[ALUCINAÇÃO DE IA] Divisão por zero detectada. Seus elétrons entraram em colapso existencial. Tente colocar um número válido.',
      };
    } else {
      return {
        success: false,
        message: `[AVISO] Resistência de ${val}Ω é muito baixa! A corrente continua em curto letal. Tente um valor >= 500.`,
      };
    }
  }

  // Erro explícito de divisão por zero ou sintaxe errada no Totem Elétrico
  if (
    context?.totem === 'electric' ||
    compactAssignment.includes('/0') ||
    compactAssignment === 'resistencia=0' ||
    compactAssignment === 'r=0'
  ) {
    return {
      success: false,
      message:
        '[ALUCINAÇÃO DE IA] Divisão por zero detectada. Seus elétrons entraram em colapso existencial. Tente colocar um número válido.',
    };
  }

  // Padrão de erro para o totem da comporta
  return {
    success: false,
    message:
      '[ERRO DE SINTAXE] Variável inválida. Defina \'chave = 42\' ou use a função \'int("42")\'.',
  };
}
