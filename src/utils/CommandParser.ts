export interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
  value?: number;
}

export function parseCommand(
  input: string,
  context?: {
    totem?: 'power' | 'bridge' | 'barrier' | 'electric';
    scene?: 'boot' | 'main';
  }
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

  // ==========================================
  // COMANDOS DE SISTEMA: CLEAR / CLS / HELP
  // ==========================================
  if (
    normalized === 'cls' ||
    normalized === 'clear' ||
    normalized === 'clear()' ||
    normalized === 'cls()'
  ) {
    return {
      success: true,
      message: '',
      action: 'CLEAR_TERMINAL',
    };
  }

  if (
    normalized === 'help' ||
    normalized === 'ajuda' ||
    normalized === 'help()' ||
    normalized === 'ajuda()'
  ) {
    return {
      success: true,
      message:
        '[COMANDOS DO SISTEMA]\n' +
        '  clear / cls     - Limpa o histórico de mensagens da tela\n' +
        '  help / ajuda    - Exibe esta lista de auxílio com os comandos\n' +
        (context?.scene === 'boot'
          ? '  print(\'...\')    - Envia a instrução de texto para instanciar o kernel'
          : context?.totem === 'power'
            ? '  energia = <booleano> - Atribui valor lógico para ligar a energia'
            : context?.totem === 'bridge'
              ? '  tamanho_ponte = X - Define o comprimento da esteira em metros (inteiro)'
              : context?.totem === 'barrier'
                ? '  chave = 42      - Define a chave como tipo inteiro (int)\n  int("42")       - Converte o texto para número inteiro'
                : context?.totem === 'electric'
                  ? '  resistencia = X - Define a resistência em Ohms (ex: resistencia = 1000)\n  circuito.desligar() - Corta a tensão elétrica'
                  : '  [DICA] Aproxime-se de um totem e pressione [E] para interagir com o terminal.'),
    };
  }

  // ==========================================
  // RITUAL DE BOOT: HELLO WORLD
  // ==========================================
  const helloWorldMatch = normalized.match(
    /^print\s*\(\s*(['"])\s*hello\s+world(!?)\s*\1\s*\)$/
  );

  if (helloWorldMatch) {
    return {
      success: true,
      message:
        'Hello World!\n[SUCESSO] Kernel instanciado! Materializando O Lixão dos Scripts Esquecidos...',
      action: 'BOOT_SUCCESS',
    };
  }

  // 1. Detecção de sintaxe de Python 2 antiga (sem parênteses)
  const isPython2Print = /^print\s+['"].*$/.test(normalized);
  if (isPython2Print) {
    return {
      success: false,
      message:
        "[DEPRECATED ERROR] Mega Brain: 'Parenteses sumiram? Essa sintaxe morreu em 2020 junto com a capacidade humana de ler documentação.'",
    };
  }

  // 2. Se o jogador estiver na tela de boot ou tentou usar print/hello/world com sintaxe errada
  const isBootOrHelloAttempt =
    context?.scene === 'boot' ||
    normalized.includes('hello') ||
    normalized.includes('world') ||
    normalized.startsWith('print');

  if (isBootOrHelloAttempt) {
    return {
      success: false,
      message:
        "[SYNTAX ERROR] Mega Brain: 'Sério? Você não consegue nem dar um Hello World sem a IA autocompletar para você? Lembre-se da sintaxe: print(\\'...\\') com parênteses e aspas!'",
    };
  }

  // Remove espacos ao redor do operador '=' para facilitar comparacao
  const compactAssignment = normalized.replace(/\s*=\s*/g, '=');

  // ==========================================
  // DESAFIO 1: PAINEL DE ENERGIA (BOOLEANO)
  // ==========================================

  // 1. Redundância: energia = False
  if (
    compactAssignment === 'energia=false' ||
    (context?.totem === 'power' && compactAssignment === 'false')
  ) {
    return {
      success: false,
      message:
        "[REDUNDANCY ERROR] Mega Brain: 'Parabéns, você confirmou que o nada continua sendo nada.'",
    };
  }

  // 2. Erro de Tipo: Números (ex: energia = 1)
  const isPowerNumber =
    /^energia=\d+$/.test(compactAssignment) ||
    (context?.totem === 'power' && /^\d+$/.test(compactAssignment));

  if (isPowerNumber) {
    return {
      success: false,
      message:
        "[TYPE MISMATCH] Mega Brain: 'Um bit numérico? Aqui usamos Python moderno, novato. Booleano raiz se escreve por extenso com inicial maiúscula!'",
    };
  }

  // 3. Erro de Tipo: Strings (ex: energia = "ligada" ou 'ligada')
  const isPowerString =
    /^energia=['"][^'"]*['"]$/.test(compactAssignment) ||
    (context?.totem === 'power' && /^['"][^'"]*['"]$/.test(compactAssignment));

  if (isPowerString) {
    return {
      success: false,
      message:
        "[TYPE ERROR] Mega Brain: 'Jogou um texto no circuito e esperava o quê? Uma lâmpada de poesia? Use valores lógicos literais!'",
    };
  }

  // 4. Sucesso: energia = True ou energia = true
  const isPowerSuccess =
    compactAssignment === 'energia=true' ||
    (context?.totem === 'power' && compactAssignment === 'true');

  if (isPowerSuccess) {
    return {
      success: true,
      message:
        '[SUCESSO] energia = True | Corrente contínua restabelecida! Tranca magnética desativada.',
      action: 'DISABLE_STEEL_DOOR',
    };
  }

  // Se o jogador estiver interagindo com o painel de energia ou tentou atribuir a variável energia
  if (context?.totem === 'power' || compactAssignment.startsWith('energia=')) {
    return {
      success: false,
      message:
        "[SYNTAX ERROR] Mega Brain: 'Instrução completamente sem sentido. Você acha que circuitos elétricos funcionam na base do teclado aleatório? Atribua o estado lógico correto para a variável do painel.'",
    };
  }

  // ==========================================
  // DESAFIO 2: MECANISMO DE EXTENSÃO DA ESTEIRA (INTEIROS)
  // ==========================================
  const isBridgeTarget =
    context?.totem === 'bridge' ||
    compactAssignment.startsWith('tamanho_ponte=') ||
    compactAssignment.startsWith('tamanho=') ||
    compactAssignment.startsWith('ponte=') ||
    compactAssignment.startsWith('esteira=') ||
    compactAssignment.startsWith('tamanho_esteira=');

  if (isBridgeTarget) {
    // 1. Strings com aspas (ex: "8", 'oito', tamanho_ponte = "8", etc.)
    const stringQuoteMatch = compactAssignment.match(
      /^(?:(?:tamanho_ponte|tamanho|ponte|esteira|tamanho_esteira)=)?['"][^'"]*['"]$/
    );

    if (stringQuoteMatch) {
      return {
        success: false,
        message:
          "[TYPE ERROR] Mega Brain: 'Você digitou texto com aspas num pistão mecânico. A física não lê literatura.'",
      };
    }

    // 2. Valores numéricos inteiros
    const numMatch = compactAssignment.match(
      /^(?:(?:tamanho_ponte|tamanho|ponte|esteira|tamanho_esteira)=)?(-?\d+(?:\.\d+)?)$/
    );

    if (numMatch) {
      const val = parseFloat(numMatch[1]);
      if (val < 8) {
        return {
          success: false,
          message:
            "[UNDERFLOW ERROR] Mega Brain: 'Tentando saltar para a morte? A esteira continua curta e o chão lá embaixo está te esperando.'",
        };
      } else {
        return {
          success: true,
          message: '[SUCESSO] Pistões pressurizados! Esteira expandida para a margem oposta.',
          action: 'EXPAND_BRIDGE',
          value: val,
        };
      }
    }

    // 3. Erro de sintaxe genérico
    return {
      success: false,
      message:
        "[SYNTAX ERROR] Mega Brain: 'Instrução sem pé nem cabeça. Declare a variável com um valor inteiro válido.'",
    };
  }

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
