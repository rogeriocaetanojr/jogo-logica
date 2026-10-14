import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';
import {
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_DDA,
  TOTEM_4_PORTAO,
  TOTEM_5_SEQUENCIADOR,
  TOTEM_6_ARQUITETO,
} from './constantesFase1';

/**
 * Sorteia uma mensagem sarcástica aleatória de um array constante.
 */
function sortearMensagem(mensagens: readonly string[]): string {
  const indice = Math.floor(Math.random() * mensagens.length);
  return mensagens[indice] ?? mensagens[0];
}

/**
 * Normaliza a entrada do usuário removendo quebras de linha e múltiplos espaços,
 * permitindo interpretação equivalente de comandos digitados em uma linha ou colados em múltiplas linhas.
 */
function normalizarEntrada(entrada: string): string {
  return entrada
    .replace(/\r?\n/g, ' ')
    .replace(/;+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Interpretador da Fase 1: Céu Partido (Onda 2 Expandida).
 * Valida a lógica dos 6 totens com isolamento rigoroso por contexto.totemAtivo,
 * aceitando sintaxe flexível em Python e retornando feedback sarcástico/ácido em falhas.
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

  const comandoLimpo = normalizarEntrada(bruto);
  const comandoMinusculo = comandoLimpo.toLowerCase();

  // Comandos globais de terminal
  if (
    comandoMinusculo === 'cls' ||
    comandoMinusculo === 'clear' ||
    comandoMinusculo === 'limpar'
  ) {
    return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
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

  // Comando HELP contextual
  if (comandoMinusculo === 'help' || comandoMinusculo === 'ajuda') {
    return tratarAjudaContextual(totemAtivo);
  }

  // Comando STATUS contextual
  if (comandoMinusculo === 'status') {
    return tratarStatusContextual(totemAtivo, contexto);
  }

  // =========================================================================
  // TOTEM 1: "O Teste de Alcoolemia da Sentinela" (Condicionais e not / and)
  // =========================================================================
  if (totemAtivo === TOTEM_1_ALCOOLEMIA.ID) {
    return avaliarTotem1(comandoLimpo);
  }

  // =========================================================================
  // TOTEM 2: "A Balança Hipócrita de Nuvens" (if / elif / else com altitude)
  // =========================================================================
  if (totemAtivo === TOTEM_2_BALANCA.ID) {
    return avaliarTotem2(comandoLimpo);
  }

  // =========================================================================
  // TOTEM 3: "A Sentinela com DDA" (Debug de Limite de Patrulha / Loop)
  // =========================================================================
  if (totemAtivo === TOTEM_3_DDA.ID) {
    return avaliarTotem3(comandoLimpo);
  }

  // =========================================================================
  // TOTEM 4: "O Portão com Crise Existencial" (Precedência: (A or B) and C)
  // =========================================================================
  if (totemAtivo === TOTEM_4_PORTAO.ID) {
    return avaliarTotem4(comandoLimpo);
  }

  // =========================================================================
  // TOTEM 5: "O Sequenciador de Rajadas" (Parâmetros de Ritmo e Força)
  // =========================================================================
  if (totemAtivo === TOTEM_5_SEQUENCIADOR.ID) {
    return avaliarTotem5(comandoLimpo);
  }

  // =========================================================================
  // TOTEM 6: "O Desafio do Arquiteto Preguiçoso" (Filtro for com if)
  // =========================================================================
  if (totemAtivo === TOTEM_6_ARQUITETO.ID) {
    return avaliarTotem6(comandoLimpo);
  }

  return {
    sucesso: false,
    mensagem:
      '[COMANDO DESCONHECIDO] O Mega Brain não reconhece essa instrução no setor celestial.',
  };
}

/**
 * Ajuda contextual para o totem ativo.
 */
function tratarAjudaContextual(totemAtivo: string): ResultadoComando {
  switch (totemAtivo) {
    case TOTEM_1_ALCOOLEMIA.ID:
      return {
        sucesso: true,
        mensagem:
          '=== AJUDA // TESTE DE ALCOOLEMIA ===\n' +
          'A sentinela só baixa a guarda se você NÃO for uma ameaça.\n' +
          'Variáveis: alarme_ligado, jogador_armado\n' +
          'Função: desativar_escudo()\n' +
          'Lembre-se: use operadores de negação e conjunção (not / and).',
      };
    case TOTEM_2_BALANCA.ID:
      return {
        sucesso: true,
        mensagem:
          '=== AJUDA // BALANÇA HIPÓCRITA ===\n' +
          'Calibre a pressão com if/elif/else comparando altitude_atual com 350.\n' +
          'Funções: aumentar_pressao(), aliviar_pressao(), estabilizar()',
      };
    case TOTEM_3_DDA.ID:
      return {
        sucesso: true,
        mensagem:
          '=== AJUDA // SENTINELA COM DDA ===\n' +
          'Ajuste o limite de patrulha para a coordenada indicada na placa (2300).\n' +
          'Função: patrulhar(limite)',
      };
    case TOTEM_4_PORTAO.ID:
      return {
        sucesso: true,
        mensagem:
          '=== AJUDA // PORTÃO MILENAR ===\n' +
          'O portão requer luz solar OU vento, E a placa física pressionada.\n' +
          'Sem parênteses (energia_sol or energia_vento), a precedência falhará!',
      };
    case TOTEM_5_SEQUENCIADOR.ID:
      return {
        sucesso: true,
        mensagem:
          '=== AJUDA // SEQUENCIADOR DE RAJADAS ===\n' +
          'Função: sincronizar_rajadas(ordem, intervalo, forca)\n' +
          'ordem: "crescente" | intervalo: 1.2 a 1.8 | forca: >= 400',
      };
    case TOTEM_6_ARQUITETO.ID:
      return {
        sucesso: true,
        mensagem:
          '=== AJUDA // DESAFIO DO ARQUITETO PREGUIÇOSO ===\n' +
          'Itere pelos pilares com "for pilar in pilares:" e recolha apenas os que têm .rachado True!',
      };
    default:
      return {
        sucesso: true,
        mensagem: 'Comandos gerais: clear, help, status',
      };
  }
}

/**
 * Status contextual de telemetria dos sensores.
 */
function tratarStatusContextual(
  totemAtivo: string,
  _contexto?: ContextoInterpretador
): ResultadoComando {
  switch (totemAtivo) {
    case TOTEM_1_ALCOOLEMIA.ID:
      return {
        sucesso: true,
        mensagem:
          '[TELEMETRIA DA SENTINELA A-01]\n' +
          '  - alarme_ligado: False\n' +
          '  - jogador_armado: False\n' +
          '  - escudo: ATIVO (Vento Impenetrável)',
      };
    case TOTEM_2_BALANCA.ID:
      return {
        sucesso: true,
        mensagem:
          '[TELEMETRIA DA PLATAFORMA MÓVEL]\n' +
          '  - altitude_atual: 540\n' +
          '  - altitude_alvo (placa): 350\n' +
          '  - estado: DESALINHADO',
      };
    case TOTEM_3_DDA.ID:
      return {
        sucesso: true,
        mensagem:
          '[TELEMETRIA // SENTINELA B-02]\n' +
          '  - limite_atual: 3280 (trava no corredor)\n' +
          '  - limite_alvo (placa): 2300\n' +
          '  - status: LOOP DE MICROPASSOS',
      };
    case TOTEM_4_PORTAO.ID:
      return {
        sucesso: true,
        mensagem:
          '[TELEMETRIA // PORTÃO MILENAR]\n' +
          '  - energia_sol: True\n' +
          '  - energia_vento: True\n' +
          '  - placa_pressionada: True\n' +
          '  - trancas: BLOQUEADAS',
      };
    case TOTEM_5_SEQUENCIADOR.ID:
      return {
        sucesso: true,
        mensagem:
          '[TELEMETRIA // GERADOR TRIPLO]\n' +
          '  - turbinas: 3 canais em espera\n' +
          '  - ordem exigida: "crescente"\n' +
          '  - janela de intervalo: 1.2s - 1.8s | empuxo: >= 400px',
      };
    case TOTEM_6_ARQUITETO.ID:
      return {
        sucesso: true,
        mensagem:
          '[TELEMETRIA // CORREDOR DE PILARES]\n' +
          '  - pilares[0]: id=1 (rachado=True)\n' +
          '  - pilares[1]: id=2 (rachado=False)\n' +
          '  - pilares[2]: id=3 (rachado=True)\n' +
          '  - pilares[3]: id=4 (rachado=False)',
      };
    default:
      return {
        sucesso: true,
        mensagem: '[STATUS] Totem operacional.',
      };
  }
}

/**
 * Validação do Totem 1: "O Teste de Alcoolemia da Sentinela"
 * if not alarme_ligado and not jogador_armado: desativar_escudo()
 */
function avaliarTotem1(cmd: string): ResultadoComando {
  // Regex flexível que aceita ambas as ordens dos operandos, parênteses opcionais ou De Morgan
  const regexSucesso =
    /^if\s*\(?\s*(?:not\s+alarme_ligado\s+and\s+not\s+jogador_armado|not\s+jogador_armado\s+and\s+not\s+alarme_ligado|not\s*\(\s*(?:alarme_ligado\s+or\s+jogador_armado|jogador_armado\s+or\s+alarme_ligado)\s*\))\s*\)?\s*:\s*desativar_escudo\s*\(\s*\)$/i;

  if (regexSucesso.test(cmd)) {
    return {
      sucesso: true,
      mensagem:
        '[SENTINELA A-01: ESCUDO DESATIVADO]\n' +
        'Lógica validada com sucesso! A rotina concluiu que você não oferece perigo e recolheu a barreira de vento.\n' +
        'O corredor celestial está aberto.',
      acao: 'DESATIVAR_ESCUDO_SENTINELA',
    };
  }

  // Falha na lógica ou sintaxe: sorteia feedback sarcástico
  return {
    sucesso: false,
    mensagem: `[FALHA NA CONDICIONAL]\n${sortearMensagem(TOTEM_1_ALCOOLEMIA.MENSAGENS_ERRO)}`,
  };
}

/**
 * Validação do Totem 2: "A Balança Hipócrita de Nuvens"
 * if altitude_atual < 350: aumentar_pressao()
 * elif altitude_atual > 350: aliviar_pressao()
 * else: estabilizar()
 */
function avaliarTotem2(cmd: string): ResultadoComando {
  // Padrão 1: if < 350: aumentar ... elif > 350: aliviar ... else: estabilizar
  const padrao1 =
    /^if\s*\(?\s*altitude_atual\s*<\s*(?:350|altitude_alvo)\s*\)?\s*:\s*aumentar_pressao\s*\(\s*\)\s*(?:elif|else\s+if)\s*\(?\s*altitude_atual\s*>\s*(?:350|altitude_alvo)\s*\)?\s*:\s*aliviar_pressao\s*\(\s*\)\s*else\s*:\s*estabilizar\s*\(\s*\)$/i;

  // Padrão 2: if > 350: aliviar ... elif < 350: aumentar ... else: estabilizar
  const padrao2 =
    /^if\s*\(?\s*altitude_atual\s*>\s*(?:350|altitude_alvo)\s*\)?\s*:\s*aliviar_pressao\s*\(\s*\)\s*(?:elif|else\s+if)\s*\(?\s*altitude_atual\s*<\s*(?:350|altitude_alvo)\s*\)?\s*:\s*aumentar_pressao\s*\(\s*\)\s*else\s*:\s*estabilizar\s*\(\s*\)$/i;

  // Padrão 3: if == 350: estabilizar ... elif < 350: aumentar ... else: aliviar
  const padrao3 =
    /^if\s*\(?\s*altitude_atual\s*==\s*(?:350|altitude_alvo)\s*\)?\s*:\s*estabilizar\s*\(\s*\)\s*(?:elif|else\s+if)\s*\(?\s*altitude_atual\s*<\s*(?:350|altitude_alvo)\s*\)?\s*:\s*aumentar_pressao\s*\(\s*\)\s*else\s*:\s*aliviar_pressao\s*\(\s*\)$/i;

  // Padrão 4: três ifs independentes
  const padraoTresIfs =
    /if\s*\(?\s*altitude_atual\s*<\s*(?:350|altitude_alvo)\s*\)?\s*:\s*aumentar_pressao\s*\(\s*\).*if\s*\(?\s*altitude_atual\s*>\s*(?:350|altitude_alvo)\s*\)?\s*:\s*aliviar_pressao\s*\(\s*\).*if\s*\(?\s*altitude_atual\s*==\s*(?:350|altitude_alvo)\s*\)?\s*:\s*estabilizar\s*\(\s*\)/i;

  if (
    padrao1.test(cmd) ||
    padrao2.test(cmd) ||
    padrao3.test(cmd) ||
    padraoTresIfs.test(cmd)
  ) {
    return {
      sucesso: true,
      mensagem:
        '[VÁLVULA DE PRESSÃO CALIBRADA // ELEVADOR DE NUVEM]\n' +
        'Condicionais de altitude compiladas com perfeição!\n' +
        'O elevador estabilizou exatamente na altitude 350.',
      acao: 'ESTABILIZAR_ELEVADOR',
    };
  }

  return {
    sucesso: false,
    mensagem: `[ERRO DE CALIBRAÇÃO]\n${sortearMensagem(TOTEM_2_BALANCA.MENSAGENS_ERRO)}`,
  };
}

/**
 * Validação do Totem 3: "A Sentinela com DDA"
 * patrulhar(2300) ou while sentinela.x < 2300: patrulhar()
 */
function avaliarTotem3(cmd: string): ResultadoComando {
  // Chamada de função direta: patrulhar(2300) ou sentinela.patrulhar(2300)
  const regexFuncao =
    /^(?:sentinela\.)?patrulhar\s*\(\s*(?:limite\s*=\s*)?(?:2300|limite)\s*\)$/i;

  // Loop while: while sentinela.x < 2300: patrulhar()
  const regexWhile =
    /^while\s*\(?\s*sentinela(?:\.x)?\s*<\s*(?:2300|limite)\s*\)?\s*:\s*(?:sentinela\.)?patrulhar\s*\(\s*\)$/i;

  // Condicional if: if sentinela.x < 2300: patrulhar()
  const regexIf =
    /^if\s*\(?\s*sentinela(?:\.x)?\s*<\s*(?:2300|limite)\s*\)?\s*:\s*(?:sentinela\.)?patrulhar\s*\(\s*\)$/i;

  // Atribuição direta: sentinela.limite = 2300 ou limite = 2300
  const regexAtribuicao = /^(?:sentinela\.)?limite\s*=\s*2300$/i;

  if (
    regexFuncao.test(cmd) ||
    regexWhile.test(cmd) ||
    regexIf.test(cmd) ||
    regexAtribuicao.test(cmd)
  ) {
    return {
      sucesso: true,
      mensagem:
        '[SENTINELA B-02 // ALCANCE EXPANDIDO]\n' +
        'Limite de patrulha atualizado para 2300!\n' +
        'O drone estendeu sua rota até o final da plataforma e desocupou o corredor.',
      acao: 'EXPANDIR_PATRULHA_SENTINELA',
    };
  }

  return {
    sucesso: false,
    mensagem: `[FALHA DE ALCANCE]\n${sortearMensagem(TOTEM_3_DDA.MENSAGENS_ERRO)}`,
  };
}

/**
 * Validação do Totem 4: "O Portão com Crise Existencial"
 * if (energia_sol or energia_vento) and placa_pressionada: abrir_portao()
 */
function avaliarTotem4(cmd: string): ResultadoComando {
  // Validação estrita da precedência com parênteses obrigatórios no OR
  const regexSucesso =
    /^if\s*\(?\s*(?:\(\s*(?:energia_sol\s+or\s+energia_vento|energia_vento\s+or\s+energia_sol)\s*\)\s+and\s+placa_pressionada|placa_pressionada\s+and\s+\(\s*(?:energia_sol\s+or\s+energia_vento|energia_vento\s+or\s+energia_sol)\s*\))\s*\)?\s*:\s*abrir_portao\s*\(\s*\)$/i;

  if (regexSucesso.test(cmd)) {
    return {
      sucesso: true,
      mensagem:
        '[PORTÃO MILENAR // TRANCAS RECOLHIDAS]\n' +
        'Expressão booleana avaliada como Verdadeira com precedência correta!\n' +
        'As trancas de mármore desceram ao solo. Passagem para o Bloco 3 liberada.',
      acao: 'ABRIR_PORTAO_EXISTENCIAL',
    };
  }

  // Se o usuário esqueceu os parênteses agrupando o 'or', entrega a mensagem específica
  if (
    /energia_sol\s+or\s+energia_vento\s+and\s+placa_pressionada/i.test(cmd) &&
    !/\(.*or.*\)/i.test(cmd)
  ) {
    return {
      sucesso: false,
      mensagem: `[ERRO DE PRECEDÊNCIA]\n${TOTEM_4_PORTAO.MENSAGENS_ERRO[0]}`,
    };
  }

  return {
    sucesso: false,
    mensagem: `[FALHA NA EXPRESSÃO]\n${sortearMensagem(TOTEM_4_PORTAO.MENSAGENS_ERRO)}`,
  };
}

/**
 * Validação do Totem 5: "O Sequenciador de Rajadas"
 * sincronizar_rajadas("crescente", 1.5, 450)
 */
function avaliarTotem5(cmd: string): ResultadoComando {
  const regexChamada =
    /^sincronizar_rajadas\s*\(\s*["']([^"']+)["']\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/i;
  const match = cmd.match(regexChamada);

  if (match) {
    const ordem = match[1].toLowerCase().trim();
    const intervalo = parseFloat(match[2]);
    const forca = parseFloat(match[3]);

    if (ordem !== 'crescente') {
      return {
        sucesso: false,
        mensagem: `[ORDEM INCORRETA]\n${TOTEM_5_SEQUENCIADOR.MENSAGENS_ERRO[2]}`,
      };
    }

    if (intervalo < 1.2 || intervalo > 1.8) {
      return {
        sucesso: false,
        mensagem: `[INTERVALO FORA DA FAIXA]\n${TOTEM_5_SEQUENCIADOR.MENSAGENS_ERRO[0]}`,
      };
    }

    if (forca < 400) {
      return {
        sucesso: false,
        mensagem: `[EMPUSHO INSUFICIENTE]\n${TOTEM_5_SEQUENCIADOR.MENSAGENS_ERRO[1]}`,
      };
    }

    return {
      sucesso: true,
      mensagem:
        '[GERADOR TRIPLO // SEQUENCIADOR DE RAJADAS ATIVADO]\n' +
        `Sincronização compilada: ordem="${ordem}", intervalo=${intervalo}s, forca=${forca}px!\n` +
        'As três correntes de ar disparam em escada ascendente perfeita. Voe, passarinho!',
      acao: 'ATIVAR_ESCADA_RAJADAS',
      valor: JSON.stringify({ ordem, intervalo, forca }),
    };
  }

  return {
    sucesso: false,
    mensagem: `[SINTAXE INVÁLIDA]\n${sortearMensagem(TOTEM_5_SEQUENCIADOR.MENSAGENS_ERRO)}`,
  };
}

/**
 * Validação do Totem 6: "O Desafio do Arquiteto Preguiçoso"
 * for pilar in pilares:
 *     if pilar.rachado:
 *         pilar.recolher()
 */
function avaliarTotem6(cmd: string): ResultadoComando {
  // Captura o identificador da iteração (ex: pilar, p, item)
  const regexSucesso =
    /^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+pilares\s*:\s*if\s+\1\.rachado(?:\s*==\s*True)?\s*:\s*\1\.recolher\s*\(\s*\)$/i;

  if (regexSucesso.test(cmd)) {
    return {
      sucesso: true,
      mensagem:
        '[ANTECÂMARA // PILARES RACHADOS RECOLHIDOS]\n' +
        'Loop e filtro executados! Os pilares instáveis desceram ao abismo.\n' +
        'Apenas os pilares sólidos permaneceram firmes. O santuário final está acessível!',
      acao: 'RECOLHER_PILARES_RACHADOS',
    };
  }

  // Se o jogador recolheu os pilares NÃO rachados (inverteu a lógica)
  if (
    /for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+pilares\s*:\s*if\s+not\s+\1\.rachado/i.test(
      cmd
    ) ||
    /if\s+([a-zA-Z_][a-zA-Z0-9_]*)\.rachado\s*==\s*False/i.test(cmd)
  ) {
    return {
      sucesso: false,
      mensagem: `[LÓGICA INVERTIDA]\n${TOTEM_6_ARQUITETO.MENSAGENS_ERRO[0]}`,
    };
  }

  // Se o jogador iterou sem if
  if (
    /for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+pilares\s*:\s*\1\.recolher/i.test(cmd)
  ) {
    return {
      sucesso: false,
      mensagem: `[FILTRO AUSENTE]\n${TOTEM_6_ARQUITETO.MENSAGENS_ERRO[1]}`,
    };
  }

  return {
    sucesso: false,
    mensagem: `[ERRO DE ITERAÇÃO]\n${sortearMensagem(TOTEM_6_ARQUITETO.MENSAGENS_ERRO)}`,
  };
}
