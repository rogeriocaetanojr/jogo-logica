export interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
  value?: number;
}

export function parseCommand(
  input: string,
  context?: { totem?: 'barrier' | 'physics' }
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

  // 2. Comandos de Sucesso para a Comporta Hidráulica (Conversão de tipo)
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

  // 3. Manipulação de Gravidade (Totem 2 - Física)
  const gravityMatch = compactAssignment.match(
    /^(?:gravidade|gravidade_mundo|gravity)=(\d+(?:\.\d+)?)$/
  );
  if (gravityMatch) {
    const val = parseFloat(gravityMatch[1]);
    if (val <= 300 && val >= 50) {
      return {
        success: true,
        message: `[SUCESSO] gravidade = ${val}. O campo gravitacional foi reduzido com sucesso!`,
        action: 'SET_GRAVITY',
        value: val,
      };
    } else if (val > 300) {
      return {
        success: false,
        message: `[AVISO] gravidade = ${val} ainda e muito pesada para saltar o abismo de 450px. Tente um valor <= 300.`,
      };
    } else {
      return {
        success: false,
        message: `[AVISO] Valor de gravidade muito baixo ou perigoso. Tente entre 100 e 300.`,
      };
    }
  }

  // 4. Manipulação da Força de Pulo (Totem 2 - Física)
  const jumpMatch = compactAssignment.match(
    /^(?:forca_pulo|forca_do_pulo|jump_force|player\.jump_force)=(\d+(?:\.\d+)?)$/
  );
  if (jumpMatch) {
    const val = parseFloat(jumpMatch[1]);
    if (val >= 550 && val <= 1200) {
      return {
        success: true,
        message: `[SUCESSO] forca_pulo = ${val}. Propulsores ajustados para salto longo!`,
        action: 'SET_JUMP_FORCE',
        value: val,
      };
    } else if (val < 550) {
      return {
        success: false,
        message: `[AVISO] forca_pulo = ${val} e insuficiente para cobrir o abismo de 450px. Tente um valor >= 550.`,
      };
    } else {
      return {
        success: false,
        message: `[AVISO] Força de pulo excessiva! Cuidado para não quebrar os motores.`,
      };
    }
  }

  // 5. Se o jogador estiver no Totem de Física e digitar comando inválido
  if (context?.totem === 'physics') {
    const taunts = [
      "[ERRO 400] Mega Brain: 'Sintaxe horrivel. Nem minha IA generativa mais barata geraria esse lixo.'",
      "[ERRO 404] Comando nao reconhecido. Altere 'gravidade = 250' ou 'forca_pulo = 600'.",
      "[ERRO 500] Mega Brain: 'Tentativa patetica. O firewall nem sentiu cosquinha.'",
    ];
    return {
      success: false,
      message: taunts[Math.floor(Math.random() * taunts.length)],
    };
  }

  // Padrão para a comporta
  return {
    success: false,
    message:
      '[ERRO DE SINTAXE] Variável inválida. Defina \'chave = 42\' ou use a função \'int("42")\'.',
  };
}
