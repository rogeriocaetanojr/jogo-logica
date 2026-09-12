export interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
  value?: number;
}

const lastErrorIndexMap: Record<string, number> = {};

function getNonRepeatingError(poolKey: string, errors: string[]): string {
  if (errors.length <= 1) return errors[0] || '';

  const lastIndex = lastErrorIndexMap[poolKey] ?? -1;
  let nextIndex: number;

  // Sorteia até encontrar um índice diferente do anterior
  do {
    nextIndex = Math.floor(Math.random() * errors.length);
  } while (nextIndex === lastIndex);

  lastErrorIndexMap[poolKey] = nextIndex;
  return errors[nextIndex];
}

// Pools de mensagens de erro randômicas do Mega Brain
const MEGA_BRAIN_ERRORS = {
  challenge0: {
    syntax: [
      "[SYNTAX ERROR] Mega Brain: 'Sério? Nem um print básico sem IA autocompletar pra você? Use parênteses e aspas direito!'",
      "[SYNTAX ERROR] Mega Brain: 'O teclado tem mais teclas do que você consegue coordenar? É a saudação universal de todo novato: print com parênteses e aspas.'",
      "[SYNTAX ERROR] Mega Brain: 'Seu código parece um tropeço físico no teclado. Escreva a instrução clássica de abertura da programação.'",
      "[SYNTAX ERROR] Mega Brain: 'Errar o Hello World é um marco histórico. Tente digitar a função de saída padrão com as duas palavras clássicas.'",
    ],
    deprecated: [
      "[DEPRECATED ERROR] Mega Brain: 'Parênteses sumiram? Essa sintaxe morreu em 2020 junto com a paciência de quem lê código legado.'",
      "[DEPRECATED ERROR] Mega Brain: 'Viajou no tempo direto de 2005? Em Python moderno a função exige parênteses envolventes.'",
      "[DEPRECATED ERROR] Mega Brain: 'Isso aqui não é fórum arqueológico de Python 2. Coloque parênteses nessa chamada!'",
    ],
  },
  challenge1: {
    generic: [
      "[SYNTAX ERROR] Mega Brain: 'Instrução sem sentido. Circuitos não ligam com fé, precisam do estado lógico afirmativo atribuído à variável!'",
      "[SYNTAX ERROR] Mega Brain: 'Você bateu a cabeça no teclado ou achou que isso era feitiço? Atribua o estado binário correto.'",
      "[SYNTAX ERROR] Mega Brain: 'O galpão continua nas trevas porque seu comando não expressa verdade lógica nenhuma.'",
      "[SYNTAX ERROR] Mega Brain: 'Desse jeito a bateria da sua lanterna acaba antes de você acertar uma atribuição lógica simples.'",
    ],
    typeMismatch: [
      "[TYPE MISMATCH] Mega Brain: 'Aqui não aceitamos gambiarra de inteiro solto nem poesia em aspas. Booleano raiz em Python se escreve por extenso!'",
      "[TYPE MISMATCH] Mega Brain: 'Tentar alimentar um relé magnético com texto aleatório é motivo de demissão sumária.'",
      "[TYPE MISMATCH] Mega Brain: 'Tipo primitivo incorreto. No mundo binário só existem dois literais, e nenhum deles precisa de aspas.'",
      "[TYPE MISMATCH] Mega Brain: 'Valores numéricos e strings rejeitados pelo circuito. Mude para a palavra-chave booleana verdadeira.'",
    ],
  },
  challenge2: {
    underflow: [
      "[UNDERFLOW ERROR] Mega Brain: 'Sua esteira continuou curta e despencou no vácuo. Vai continuar chutando número no escuro?'",
      "[CALCULATION ERROR] Mega Brain: 'Faltou braço pro pistão alcançar a margem. Olhe as leituras antes de digitar qualquer bobagem.'",
      "[GAP ERROR] Mega Brain: 'A física não negocia com preguiça mental. O vão continua maior do que o valor ridículo que você definiu.'",
      "[SPAN ERROR] Mega Brain: 'Se você tentar andar nessa esteira desse tamanho, o exaustor de ar lá embaixo vai cansar de te catar.'",
    ],
    typeError: [
      "[TYPE ERROR] Mega Brain: 'Você mandou um texto com aspas pro motor hidráulico. Engrenagens operam com números inteiros, não com redação.'",
      "[TYPE ERROR] Mega Brain: 'Aspas numa variável de comprimento físico? Nem a inteligência artificial mais queimada faria isso.'",
      "[TYPE ERROR] Mega Brain: 'Pistões industriais não analisam prosa. Tire essas aspas e envie uma grandeza numérica.'",
    ],
  },
  challenge3: {
    reverseOrder: [
      "[INVERTED SEQUENCE ERROR] Mega Brain: ''FailMega'? Strings não são conta de adição comutativa onde a ordem não importa. Respeite a sequência dos fragmentos!'",
      "[ORDER ERROR] Mega Brain: 'Você montou a chave de trás pra frente. Tente juntar na ordem cronológica que os registradores exibem.'",
      "[SEQUENCE MISMATCH] Mega Brain: 'Chave invertida rejeitada pelo elevador. O primeiro fragmento vem antes do segundo, gênio.'",
      "[SYNTAX ORDER] Mega Brain: 'Quem lê da direita para a esquerda é outro tipo de compilador. Coloque parte1 antes de parte2.'",
    ],
    syntaxOrType: [
      "[NAME ERROR] Mega Brain: 'Identificadores não encontrados. Ou você utiliza os nomes exatos das variáveis fragmentadas, ou concatena os textos literais entre aspas.'",
      "[TYPE ERROR] Mega Brain: 'Misturar texto com aritmética sem sentido quebrou o interpretador. Concatene os dois fragmentos usando o operador adequado!'",
      "[SECURITY REJECTED] Mega Brain: 'Acesso negado. O barramento exige a soma textual das duas metades fornecidas na tela.'",
      "[ELEVATOR LOCKED] Mega Brain: 'O guincho continua travado no teto. Junte as duas metades da chave em uma variável só.'",
    ],
  },
};

export function parseCommand(
  input: string,
  context?: {
    totem?: 'power' | 'bridge' | 'elevator' | 'barrier' | 'electric';
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
              : context?.totem === 'elevator'
                ? '  senha = texto1 + texto2 - Concatena variáveis de texto (string)'
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
      message: getNonRepeatingError('d0_deprecated', MEGA_BRAIN_ERRORS.challenge0.deprecated),
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
      message: getNonRepeatingError('d0_syntax', MEGA_BRAIN_ERRORS.challenge0.syntax),
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

  // 2. Erro de Tipo: Números (ex: energia = 1) ou Strings (ex: energia = "ligada")
  const isPowerNumber =
    /^energia=\d+$/.test(compactAssignment) ||
    (context?.totem === 'power' && /^\d+$/.test(compactAssignment));

  const isPowerString =
    /^energia=['"][^'"]*['"]$/.test(compactAssignment) ||
    (context?.totem === 'power' && /^['"][^'"]*['"]$/.test(compactAssignment));

  if (isPowerNumber || isPowerString) {
    return {
      success: false,
      message: getNonRepeatingError('d1_typeMismatch', MEGA_BRAIN_ERRORS.challenge1.typeMismatch),
    };
  }

  // 3. Sucesso: energia = True ou energia = true
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
      message: getNonRepeatingError('d1_invalid', MEGA_BRAIN_ERRORS.challenge1.generic),
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
        message: getNonRepeatingError('d2_typeError', MEGA_BRAIN_ERRORS.challenge2.typeError),
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
          message: getNonRepeatingError('d2_underflow', MEGA_BRAIN_ERRORS.challenge2.underflow),
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
  // DESAFIO 3: CONSOLE DO ELEVADOR (CONCATENAÇÃO DE STRINGS)
  // ==========================================
  const isElevatorTarget =
    context?.totem === 'elevator' ||
    compactAssignment.startsWith('senha=') ||
    compactAssignment.startsWith('chave_elevador=');

  if (isElevatorTarget) {
    const expr = compactAssignment
      .replace(/^(?:senha|chave_elevador)=/, '')
      .replace(/\s+/g, '');

    // 1. Sucesso: concatenação correta de variáveis ou strings literais
    const isConcatSuccess =
      expr === 'parte1+parte2' ||
      expr === '"mega"+"fail"' ||
      expr === "'mega'+'fail'" ||
      expr === '"mega"+\'fail\'' ||
      expr === "'mega'+\"fail\"" ||
      expr === '"megafail"' ||
      expr === "'megafail'";

    if (isConcatSuccess) {
      return {
        success: true,
        message:
          "[ACESSO CONCEDIDO] Hash validado: 'MegaFail'. Destravando guincho hidráulico...",
        action: 'LOWER_ELEVATOR',
      };
    }

    // 2. Erro de Sequência Invertida: partes concatenadas na ordem oposta ("FailMega")
    const isReverseOrder =
      expr === 'parte2+parte1' ||
      expr === '"fail"+"mega"' ||
      expr === "'fail'+'mega'" ||
      expr === '"fail"+\'mega\'' ||
      expr === "'fail'+\"mega\"" ||
      expr === '"failmega"' ||
      expr === "'failmega'";

    if (isReverseOrder) {
      return {
        success: false,
        message: getNonRepeatingError('d3_inverted', MEGA_BRAIN_ERRORS.challenge3.reverseOrder),
      };
    }

    // 3. Demais erros de Sintaxe, Variável ou Tipos do Desafio 3
    return {
      success: false,
      message: getNonRepeatingError('d3_syntaxOrType', MEGA_BRAIN_ERRORS.challenge3.syntaxOrType),
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
