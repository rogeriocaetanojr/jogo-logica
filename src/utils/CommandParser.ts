export interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
}

export function parseCommand(input: string, _context?: any): CommandResult {
  const raw = input.trim();
  if (!raw) {
    return {
      success: false,
      message: "[AVISO] Digite um comando valido para executar.",
    };
  }

  // Normaliza tirando ponto e virgula final e padronizando espacos
  const normalized = raw.replace(/;+$/, '').trim().toLowerCase();

  // Remove espacos ao redor do operador '=' para facilitar comparacao
  const compactAssignment = normalized.replace(/\s*=\s*/g, '=');

  const validCommands = [
    'porta.abrir()',
    'barreira.desativar()',
    'barreira=false',
    'barreira.aberta=true',
  ];

  if (validCommands.includes(compactAssignment)) {
    return {
      success: true,
      message: '[SUCESSO] Barreira desativada na raça!',
      action: 'DISABLE_BARRIER',
    };
  }

  const taunts = [
    "[ERRO 400] Mega Brain: 'Sintaxe horrivel. Nem minha IA generativa mais barata geraria esse lixo.'",
    "[ERRO 404] Comando nao reconhecido. Tente usar a cabeca em vez do autocomplete.",
    "[ERRO 500] Mega Brain: 'Tentativa patetica. O firewall nem sentiu cosquinha.'",
  ];

  const randomTaunt = taunts[Math.floor(Math.random() * taunts.length)];

  return {
    success: false,
    message: randomTaunt,
  };
}
