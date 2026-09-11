export interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
  value?: number;
}

export function parseCommand(input: string, _context?: any): CommandResult {
  const raw = input.trim();
  if (!raw) {
    return {
      success: false,
      message: '[AVISO] Digite um comando valido para executar.',
    };
  }

  // Normaliza tirando ponto e virgula final e padronizando espacos
  const normalized = raw.replace(/;+$/, '').trim().toLowerCase();

  // Remove espacos ao redor do operador '=' para facilitar comparacao
  const compactAssignment = normalized.replace(/\s*=\s*/g, '=');

  // 1. Comandos da Barreira
  const barrierCommands = [
    'porta.abrir()',
    'barreira.desativar()',
    'barreira=false',
    'barreira.aberta=true',
  ];

  if (barrierCommands.includes(compactAssignment)) {
    return {
      success: true,
      message: '[SUCESSO] Barreira desativada na raça!',
      action: 'DISABLE_BARRIER',
    };
  }

  // 2. Manipulação de Gravidade (ex: gravidade = 250, gravidade_mundo = 200)
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

  // 3. Manipulação da Força de Pulo (ex: forca_pulo = 600, player.jump_force = 650)
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

  // Zombarias ácidas do Mega Brain em caso de comando desconhecido
  const taunts = [
    "[ERRO 400] Mega Brain: 'Sintaxe horrivel. Nem minha IA generativa mais barata geraria esse lixo.'",
    "[ERRO 404] Comando nao reconhecido. Tente usar a cabeca em vez do autocomplete.",
    "[ERRO 500] Mega Brain: 'Tentativa patetica. O firewall nem sentiu cosquinha.'",
    "[ERRO 422] Mega Brain: 'Defina a variavel corretamente. O compilador chorou ao ler isso.'",
  ];

  const randomTaunt = taunts[Math.floor(Math.random() * taunts.length)];

  return {
    success: false,
    message: randomTaunt,
  };
}
