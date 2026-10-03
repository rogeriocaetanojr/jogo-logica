import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';

/**
 * Interpretador da Fase 1: Céu Partido (Plataforma aérea, Condicionais, Debugging e Funções Parametrizadas).
 */
export function interpretarComandoFase1(
  entrada: string,
  contexto?: ContextoInterpretador
): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) {
    return {
      sucesso: false,
      mensagem: '[AVISO] Digite um comando ou instrução de código para avaliar.',
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
        '=== TERMINAL DO CÉU PARTIDO // MANUAL DE COMANDOS ===\n' +
        '  clear / cls / limpar - Limpa a tela do terminal\n' +
        '  help / ajuda         - Exibe este manual\n' +
        '  status               - Informa o estado dos sensores e dispositivos da área atual\n' +
        '------------------------------------------------------\n' +
        '  Puzzle 1 (Condicionais): if altar_a and altar_b and na_zona: ativar_vento()\n' +
        '  Puzzle 2 (Debug Sentinel): if sentinela.x >= limite_direita: sentinela.virar_esquerda()\n' +
        '  Puzzle 3 (Funções): programar_rajada(altura, atraso) [ex: programar_rajada(400, 1.5)]',
    };
  }

  const totemAtivo = (contexto?.totemAtivo as string) || '';

  // Comando de status contextual
  if (normalizado === 'status') {
    if (totemAtivo === 'totem_condicional') {
      const a = contexto?.altarA ? 'ATIVO (ON)' : 'INATIVO (OFF)';
      const b = contexto?.altarB ? 'ATIVO (ON)' : 'INATIVO (OFF)';
      const z = contexto?.naZona ? 'PRESENTE' : 'FORA DA ÁREA';
      return {
        sucesso: true,
        mensagem:
          `[TELEMETRIA DO SISTEMA EÓLICO]\n` +
          `  - Altar Celeste Alfa (altar_a): ${a}\n` +
          `  - Altar Celeste Beta (altar_b): ${b}\n` +
          `  - Posicionamento (na_zona): ${z}\n` +
          `  - Condição necessária: altar_a == True AND altar_b == True AND na_zona == True`,
      };
    } else if (totemAtivo === 'totem_sentinela') {
      return {
        sucesso: true,
        mensagem:
          `[TELEMETRIA // SENTINELA B-02]\n` +
          `  - Sensor Óptico: ALERTA VERMELHO ATIVO\n` +
          `  - Loop de Patrulha: travado no corredor estreito\n` +
          `  - Causa raiz: Operador de comparação incorreto no script de vigilância`,
      };
    } else if (totemAtivo === 'totem_rajada') {
      return {
        sucesso: true,
        mensagem:
          `[GERADOR DE CORRENTES // ESCADA DE VENTO]\n` +
          `  - Colunas Sequenciais: 3 canais de compressão atmosférica\n` +
          `  - Requisito de Elevação: altura mínima de 400px\n` +
          `  - Requisito de Sincronia: atraso entre rajadas = 1.5s`,
      };
    }
    return {
      sucesso: true,
      mensagem: '[STATUS] Dispositivos conectados e operando na rede do Céu Partido.',
    };
  }

  // Normalização sem múltiplos espaços para facilitar parsing
  const cmd = normalizado.replace(/\s+/g, ' ');

  // =========================================================================
  // PUZZLE 1: Totem com Condicional (if/else com múltiplos predicados lógicos)
  // =========================================================================
  if (totemAtivo === 'totem_condicional' || cmd.includes('altar') || cmd.includes('vento')) {
    const temIf = cmd.startsWith('if ') || cmd.includes('if(');
    const temAltarA = cmd.includes('altar_a') || cmd.includes('altar_alfa') || cmd.includes('altar1');
    const temAltarB = cmd.includes('altar_b') || cmd.includes('altar_beta') || cmd.includes('altar2');
    const temZona = cmd.includes('na_zona') || cmd.includes('zona') || cmd.includes('posicao');
    const temAtivar =
      cmd.includes('ativar_vento') ||
      cmd.includes('ativar') ||
      cmd.includes('ligar_vento') ||
      cmd.includes('vento()');

    if (temIf && temAltarA && temAltarB && temZona && temAtivar) {
      // Verifica operadores lógicos: deve usar AND (ou &&) e NÃO OR (||)
      if (cmd.includes(' or ') || cmd.includes('||')) {
        return {
          sucesso: false,
          mensagem:
            "[ERRO DE LÓGICA BOOLEANA]\n" +
            "O operador 'OR' permite acionar a corrente mesmo se um dos altares estiver desligado!\n" +
            "Ambos os altares e o posicionamento são estritamente necessários. Use 'AND'.",
        };
      }

      // Verifica se no momento os altares e a zona estão satisfeitos no mundo físico
      const altarAOk = Boolean(contexto?.altarA);
      const altarBOk = Boolean(contexto?.altarB);
      const naZonaOk = Boolean(contexto?.naZona);

      if (!altarAOk || !altarBOk || !naZonaOk) {
        return {
          sucesso: false,
          mensagem:
            `[CONDICIONAL VÁLIDA, MAS CONDIÇÃO FALSA]\n` +
            `Sua estrutura condicional está correta, mas nem todas as condições foram satisfeitas!\n` +
            `Status atual:\n` +
            `  altar_a: ${altarAOk ? 'True' : 'False'}\n` +
            `  altar_b: ${altarBOk ? 'True' : 'False'}\n` +
            `  na_zona: ${naZonaOk ? 'True' : 'False'}\n` +
            `Pise nos altares, posicione-se na zona de decolagem e submeta novamente!`,
        };
      }

      return {
        sucesso: true,
        mensagem:
          '[CIRCUITO ATMOSFÉRICO SINCRONIZADO]\n' +
          'Condição (altar_a == True and altar_b == True and na_zona == True) satisfeita!\n' +
          'Super Corrente de Vento Vertical acionada com sucesso!',
        acao: 'ATIVAR_VENTO_CONDICIONAL',
      };
    }

    if (cmd.includes('ativar_vento()') && !temIf) {
      return {
        sucesso: false,
        mensagem:
          "[ACESSO NEGADO] A super corrente requer uma condicional protetora!\n" +
          "Exemplo esperado: if altar_a and altar_b and na_zona: ativar_vento()",
      };
    }

    return {
      sucesso: false,
      mensagem:
        "[ERRO DE SINTAXE CONDICIONAL]\n" +
        "Estruture a instrução requerida:\n" +
        "  if altar_a and altar_b and na_zona: ativar_vento()",
    };
  }

  // =========================================================================
  // PUZZLE 2: Sentinela Hackeável (Debugging de operador relacional alheio)
  // =========================================================================
  if (totemAtivo === 'totem_sentinela' || cmd.includes('sentinela') || cmd.includes('virar')) {
    // Código incorreto original era: if sentinela.x < limite_direita: sentinela.virar_esquerda()
    // O jogador deve corrigir trocando '<' por '>=' ou '>' ou reescrever a condicional correta
    const usouMaiorIgual = cmd.includes('>=') || cmd.includes('>');
    const usouMenor = cmd.includes('<') || cmd.includes('<=');

    if (usouMenor) {
      return {
        sucesso: false,
        mensagem:
          "[BUG PERSISTE NO LOOP DA SENTINELA]\n" +
          "Usando o operador '<', a sentinela vira prematuramente enquanto ainda está no corredor.\n" +
          "Ela precisa avançar até ultra-passar o limite à direita antes de virar! Use '>=' ou '>'.",
      };
    }

    const mensionouLimite =
      cmd.includes('limite') ||
      cmd.includes('limite_direita') ||
      cmd.includes('3200') ||
      cmd.includes('3300') ||
      cmd.includes('3400');
    const mencionouSentinela = cmd.includes('sentinela') || cmd.includes('patrulha') || cmd.includes('virar');

    if (usouMaiorIgual && (mensionouLimite || mencionouSentinela)) {
      return {
        sucesso: true,
        mensagem:
          '[REPROGRAMAÇÃO DE PATRULHA EFETUADA // SENTINELA B-02]\n' +
          'Operador relacional corrigido para (> / >=)!\n' +
          'A sentinela ultrapassa o corredor estreito e direciona seu cone de visão para a área de descarte.\n' +
          'Caminho de mármore desobstruído!',
        acao: 'HACKEAR_SENTINELA',
      };
    }

    // Atalhos amigáveis de debug
    if (cmd === 'corrigir' || cmd === 'corrigir operador' || cmd === '>=' || cmd === '>') {
      return {
        sucesso: true,
        mensagem:
          '[REPROGRAMAÇÃO RÁPIDA APLICADA]\n' +
          'Operador de vigilância atualizado para >= limite_direita.\n' +
          'Sentinela redirecionada com sucesso!',
        acao: 'HACKEAR_SENTINELA',
      };
    }

    return {
      sucesso: false,
      mensagem:
        "[ERRO DE DEPURACÃO]\n" +
        "Corrija o operador relacional com bug no código da sentinela:\n" +
        "  if sentinela.x >= limite_direita: sentinela.virar_esquerda()",
    };
  }

  // =========================================================================
  // PUZZLE 3: Função com Parâmetros (Escada de Vento cronometrada)
  // =========================================================================
  if (totemAtivo === 'totem_rajada' || cmd.includes('rajada') || cmd.includes('escada')) {
    // Expressão regular para capturar argumentos: programar_rajada(altura, atraso)
    const regexChamada = /(?:programar_rajada|ativar_escada|rajada|funcao)\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/i;
    const match = cmd.match(regexChamada);

    if (match) {
      const altura = parseFloat(match[1]);
      const atraso = parseFloat(match[2]);

      // Validação do parâmetro de altura (mínimo 400px para elevar o jogador entre as ilhas)
      if (altura < 400) {
        return {
          sucesso: false,
          mensagem:
            `[FALHA DE TIMING // ELEVAÇÃO INSUFICIENTE]\n` +
            `Altura programada: ${altura}px.\n` +
            `O jato de vento é muito fraco para elevar o corpo até a próxima coluna antes de você cair!\n` +
            `Requisito: altura mínima de 400px.`,
        };
      }

      // Validação do parâmetro de atraso (deve sincronizar com o tempo de planar ~1.5s)
      if (atraso < 1.2 || atraso > 1.8) {
        return {
          sucesso: false,
          mensagem:
            `[FALHA DE TIMING // DESCOMPASSO TEMPORAL]\n` +
            `Atraso programado: ${atraso}s.\n` +
            `As 3 colunas dispararam fora de ritmo! A rajada dissipou antes que você alcançasse o próximo degrau.\n` +
            `Atraso ideal para sincronia em onda: 1.5s.`,
        };
      }

      return {
        sucesso: true,
        mensagem:
          `[ESCADA DE VENTO CALIBRADA COM SUCESSO]\n` +
          `Função programar_rajada(${altura}, ${atraso}) compilada e transmitida!\n` +
          `As 3 colunas de ar iniciaram seu ciclo contínuo de rajadas em onda ascendente!`,
        acao: 'ATIVAR_ESCADA_RAJADAS',
        valor: altura,
      };
    }

    return {
      sucesso: false,
      mensagem:
        "[SINTAXE DA FUNÇÃO INVÁLIDA]\n" +
        "Invoque a função com os dois parâmetros numéricos esperados:\n" +
        "  programar_rajada(altura, atraso)\n" +
        "  Exemplo: programar_rajada(400, 1.5)",
    };
  }

  return {
    sucesso: false,
    mensagem:
      "[COMANDO NÃO RECONHECIDO NO SETOR CELESTIAL]\n" +
      "Aproxime-se de um Totem ou digite 'ajuda' para verificar os comandos disponíveis.",
  };
}
