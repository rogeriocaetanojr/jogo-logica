import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';

/**
 * Interpretador da Fase 1: Céu Partido.
 * Avalia sintaxe Python, operadores lógicos e funções com humor ácido (The Messenger / South Park).
 */
export function interpretarComandoFase1(
  entrada: string,
  contexto?: ContextoInterpretador
): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) {
    return {
      sucesso: false,
      mensagem:
        '[AVISO] Mandar comando em branco? O teclado tem mais de 100 teclas, aperte algumas delas antes do Enter.',
    };
  }

  const normalizado = bruto
    .replace(/;+$/, '')
    .trim()
    .toLowerCase();

  // Comandos de sistema globais
  if (normalizado === 'cls' || normalizado === 'clear' || normalizado === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
  }

  if (normalizado === 'help' || normalizado === 'ajuda') {
    return {
      sucesso: true,
      mensagem:
        '=== TERMINAL DO CÉU PARTIDO // MANUAL DE OPERAÇÕES ===\n' +
        '  clear / cls / limpar - Limpa a tela do terminal\n' +
        '  status               - Informa telemetria dos sensores e dispositivos locais\n' +
        '------------------------------------------------------\n' +
        '  Painel 1 (Condicionais): if altar_a and altar_b and na_zona: ativar_vento()\n' +
        '  Painel 2 (Debug Sentinela): if sentinela.x >= limite_direita: sentinela.virar_esquerda()\n' +
        '  Painel 3 (Função de Voo): programar_rajada(altura, atraso) [ex: programar_rajada(450, 1.5)]',
    };
  }

  const totemAtivo = (contexto?.totemAtivo as string) || '';

  // Bloqueio se não estiver conectado a nenhum totem
  if (!totemAtivo) {
    return {
      sucesso: false,
      mensagem:
        '[ERRO DE CONEXÃO] Você não está conectado a nenhum totem de controle.\n' +
        'Aproxime-se de um painel e aperte [E] em vez de gritar comandos para o nada.',
    };
  }

  // Telemetria contextual via comando 'status'
  if (normalizado === 'status') {
    if (totemAtivo === 'totem_condicional') {
      const a = contexto?.altarA ? 'LIGADO (True)' : 'DESLIGADO (False)';
      const b = contexto?.altarB ? 'LIGADO (True)' : 'DESLIGADO (False)';
      const z = contexto?.naZona ? 'POSICIONADO (True)' : 'FORA DA DEMARCAÇÃO (False)';
      return {
        sucesso: true,
        mensagem:
          `[TELEMETRIA DO CIRCUITO EÓLICO]\n` +
          `  - Altar Alfa (altar_a): ${a}\n` +
          `  - Altar Beta (altar_b): ${b}\n` +
          `  - Plataforma de Decolagem (na_zona): ${z}\n` +
          `Condição necessária: altar_a == True and altar_b == True and na_zona == True`,
      };
    } else if (totemAtivo === 'totem_sentinela') {
      return {
        sucesso: true,
        mensagem:
          `[TELEMETRIA // SENTINELA B-02]\n` +
          `  - Status: Bloqueando corredor com patrulha truncada\n` +
          `  - Bug detectado: Operador de comparação incorreto no script de vigilância\n` +
          `  - Linha atual com defeito: if sentinela.x < limite_direita: sentinela.virar_esquerda()`,
      };
    } else if (totemAtivo === 'totem_rajada') {
      return {
        sucesso: true,
        mensagem:
          `[GERADOR ATMOSFÉRICO // ESCADA EM ONDA]\n` +
          `  - 3 canais de compressão de ar aguardando calibragem.\n` +
          `  - Parâmetros: programar_rajada(altura, atraso)\n` +
          `  - Altura recomendada: 400 a 600 px | Atraso ideal: 1.2 a 1.8 segundos`,
      };
    }
  }

  // Normalização de múltiplos espaços para facilitar parsing
  const cmd = normalizado.replace(/\s+/g, ' ');

  // =========================================================================
  // PUZZLE 1: Totem com Condicional (Painel Eólico Central)
  // =========================================================================
  if (totemAtivo === 'totem_condicional') {
    // 1. Rejeita comandos de outros totens
    if (cmd.includes('programar_rajada') || cmd.includes('sentinela')) {
      return {
        sucesso: false,
        mensagem:
          '[ACESSO NEGADO] Esse terminal controla o circuito de vento dos altares.\n' +
          'Digitar comandos de outros setores aqui só prova que você não sabe nem onde está pisando.',
      };
    }

    // 2. Erros cômicos específicos de sintaxe
    if (cmd.includes(' or ') || cmd.includes('||')) {
      return {
        sucesso: false,
        mensagem:
          "[ERRO DE LÓGICA BOOLEANA]\n" +
          "Usando 'OR'? Se um dos altares estiver desligado você quer ser lançado pro abismo como um saco de batatas?\n" +
          "Ambos os altares e o seu posicionamento na zona são obrigatórios. Use 'AND'.",
      };
    }

    if (!cmd.startsWith('if') && !cmd.startsWith('if(')) {
      return {
        sucesso: false,
        mensagem:
          "[SINTAXE INVÁLIDA] Cadê a cláusula 'if'? Você quer sair ligando super turbinas sem checar as variáveis antes?\n" +
          "Segurança zero nessa fábrica. Exemplo: if altar_a and altar_b and na_zona: ativar_vento()",
      };
    }

    if (!cmd.includes(':')) {
      return {
        sucesso: false,
        mensagem:
          "[ERRO DE SINTAXE]\n" +
          "Faltou os dois pontos (':') no final da linha condicional.\n" +
          "Eu sei que dá preguiça, mas o interpretador não adivinha seus pensamentos.",
      };
    }

    // 3. Regex estrita de validação lógica (suporta parênteses opcionais e variações válidas de espaço)
    const regexPuzzle1 =
      /^if\s*\(?\s*(?:altar_a\s+and\s+altar_b|altar_b\s+and\s+altar_a)\s+and\s+na_zona\s*\)?\s*:\s*ativar_vento\s*(?:\(\s*\))?$/;
    const regexPuzzle1Alternativo =
      /^if\s*\(?\s*na_zona\s+and\s+(?:altar_a\s+and\s+altar_b|altar_b\s+and\s+altar_a)\s*\)?\s*:\s*ativar_vento\s*(?:\(\s*\))?$/;

    if (regexPuzzle1.test(cmd) || regexPuzzle1Alternativo.test(cmd)) {
      // 4. Verificação física do contexto
      const altarAOk = Boolean(contexto?.altarA);
      const altarBOk = Boolean(contexto?.altarB);
      const naZonaOk = Boolean(contexto?.naZona);

      if (!altarAOk || !altarBOk) {
        return {
          sucesso: false,
          mensagem:
            "[CONDICIONAL VÁLIDA, MAS CONDIÇÃO FALSA]\n" +
            "A lógica até faz sentido, mas você nem ligou os dois altares ainda. Quer que eu faça mágica?\n" +
            `Status: altar_a = ${altarAOk ? 'True' : 'False'} | altar_b = ${altarBOk ? 'True' : 'False'}.\n` +
            "Pise em ambos os altares celestes antes de submeter o script!",
        };
      }

      if (!naZonaOk) {
        return {
          sucesso: false,
          mensagem:
            "[ZONA VAZIA]\n" +
            "Código perfeito, mas você está fora da zona de decolagem demarcada no piso.\n" +
            "Quer ligar o ventilador gigante pra refrescar o vento vazio? Suba na marcação luminosa!",
        };
      }

      return {
        sucesso: true,
        mensagem:
          '[CIRCUITO ATMOSFÉRICO SINCRONIZADO]\n' +
          'Condição (altar_a and altar_b and na_zona) satisfeita com louvor!\n' +
          'Super corrente ascendente ativada. Segure o pulo no centro do jato para decolar!',
        acao: 'ATIVAR_VENTO_CONDICIONAL',
      };
    }

    return {
      sucesso: false,
      mensagem:
        "[ERRO DE CONDICIONAL]\n" +
        "Estrutura esperada não identificada. Formato esperado:\n" +
        "  if altar_a and altar_b and na_zona: ativar_vento()",
    };
  }

  // =========================================================================
  // PUZZLE 2: Totem da Sentinela B-02 (Depuração de Operador Relacional)
  // =========================================================================
  if (totemAtivo === 'totem_sentinela') {
    if (cmd.includes('altar') || cmd.includes('programar_rajada') || cmd.includes('vento')) {
      return {
        sucesso: false,
        mensagem:
          '[ACESSO NEGADO] Você está no console de depuração da Sentinela B-02.\n' +
          'Não adianta falar de vento ou altar aqui dentro. Foque no loop de patrulha do drone.',
      };
    }

    // Rejeição estrita a trapaças e tokens soltos
    if (
      cmd === '>=' ||
      cmd === '>' ||
      cmd === '<=' ||
      cmd === '<' ||
      cmd === 'corrigir' ||
      cmd === 'corrigir operador' ||
      cmd === 'hack'
    ) {
      return {
        sucesso: false,
        mensagem:
          "[REJEIÇÃO DE SINTAXE]\n" +
          "Digitar só um operador solto achando que passa? Eu sou um terminal, não um compilador de quermesse.\n" +
          "Escreva a instrução condicional completa corrigida!",
      };
    }

    if (cmd.includes('<') || cmd.includes('<=')) {
      return {
        sucesso: false,
        mensagem:
          "[BUG PERSISTE NO SCRIPT]\n" +
          "Você manteve o operador menor que ('<').\n" +
          "Com isso a sentinela vai continuar virando prematuramente e vigiando o corredor. Parabéns pelo esforço nulo.\n" +
          "Ela precisa avançar até ultra-passar o limite à direita antes de virar! Use '>=' ou '>'.",
      };
    }

    if (!cmd.includes(':')) {
      return {
        sucesso: false,
        mensagem:
          "[ERRO DE SINTAXE]\n" +
          "Faltou os dois pontos (':') depois da condicional.\n" +
          "Até uma sentinela com bug tem mais apreço pela sintaxe Python do que você.",
      };
    }

    // Validação estrita da instrução corrigida
    const regexPuzzle2 =
      /^if\s*\(?\s*sentinela(?:\.x)?\s*(?:>=|>)\s*(?:limite_direita|limite|3280|3300)\s*\)?\s*:\s*sentinela\.virar_esquerda\s*(?:\(\s*\))?$/;
    const regexPuzzle2Simples =
      /^if\s*\(?\s*(?:x|posicao|pos)\s*(?:>=|>)\s*(?:limite_direita|limite)\s*\)?\s*:\s*(?:virar_esquerda|virar)\s*(?:\(\s*\))?$/;

    if (regexPuzzle2.test(cmd) || regexPuzzle2Simples.test(cmd)) {
      return {
        sucesso: true,
        mensagem:
          '[REPROGRAMAÇÃO DE PATRULHA EFETUADA // SENTINELA B-02]\n' +
          'Operador relacional corrigido para (>=)!\n' +
          'A sentinela ultrapassou a fenda e agora direciona seu cone de visão para o descarte.\n' +
          'Caminho de mármore desobstruído com sucesso!',
        acao: 'HACKEAR_SENTINELA',
      };
    }

    return {
      sucesso: false,
      mensagem:
        "[SINTAXE INCORRETA]\n" +
        "Instrução esperada:\n" +
        "  if sentinela.x >= limite_direita: sentinela.virar_esquerda()",
    };
  }

  // =========================================================================
  // PUZZLE 3: Totem da Escada de Rajadas (Função Parametrizada)
  // =========================================================================
  if (totemAtivo === 'totem_rajada') {
    if (cmd.includes('altar') || cmd.includes('sentinela')) {
      return {
        sucesso: false,
        mensagem:
          '[ACESSO NEGADO] Você está no gerador da Escada de Vento.\n' +
          'Aqui nós calibramos física atmosférica, não sentinelas ou altares.',
      };
    }

    // Expressão regular rigorosa capturando altura e atraso numéricos
    const regexChamada =
      /^(?:programar_rajada|rajada)\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/;
    const match = cmd.match(regexChamada);

    if (match) {
      const altura = parseFloat(match[1]);
      const atraso = parseFloat(match[2]);

      // Feedback ácido com base nos valores passados (valores continuam sendo injetados na física real)
      if (altura < 350) {
        return {
          sucesso: true,
          mensagem:
            `[CALIBRAGEM APLICADA COM AVISO DE QUEDA]\n` +
            `Altura programada: ${altura}px. Com essa altura aí você não alcança nem a primeira nuvem.\n` +
            `Quer uma escada emprestada? As colunas foram configuradas com o que você pediu. Boa sorte despencando!`,
          acao: 'ATIVAR_ESCADA_RAJADAS',
          valor: { altura, atraso } as any,
        };
      }

      if (atraso < 1.0 || atraso > 2.2) {
        return {
          sucesso: true,
          mensagem:
            `[CALIBRAGEM APLICADA COM DESCOMPASSO TEMPORAL]\n` +
            `Atraso programado: ${atraso}s.\n` +
            `As 3 colunas vão disparar completamente fora de ritmo com a sua gravidade.\n` +
            `Se você se espatifar no chão tentando subir, a culpa é da sua matemática. (Dica: tente algo em torno de 1.5s).`,
          acao: 'ATIVAR_ESCADA_RAJADAS',
          valor: { altura, atraso } as any,
        };
      }

      return {
        sucesso: true,
        mensagem:
          `[ESCADA DE VENTO CALIBRADA COM SUCESSO]\n` +
          `Função programar_rajada(${altura}, ${atraso}) compilada e transmitida!\n` +
          `Colunas sequenciais calibradas em perfeita harmonia ascendente. Voe, passarinho!`,
        acao: 'ATIVAR_ESCADA_RAJADAS',
        valor: { altura, atraso } as any,
      };
    }

    return {
      sucesso: false,
      mensagem:
        "[SINTAXE DA FUNÇÃO INVÁLIDA]\n" +
        "Invoque a função passando exatamente os dois parâmetros numéricos esperados:\n" +
        "  programar_rajada(altura, atraso)\n" +
        "  Exemplo: programar_rajada(450, 1.5)\n" +
        "Nem pra copiar o exemplo do manual?",
    };
  }

  return {
    sucesso: false,
    mensagem:
      '[COMANDO DESCONHECIDO] O Mega Brain não reconhece essa instrução no setor celestial.',
  };
}
