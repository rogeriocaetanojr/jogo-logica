import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';
import {
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_PORTAO,
  TOTEM_4_SEQUENCIADOR,
} from './constantesFase1';
import {
  TEXTOS_TERMINAL_FASE1,
  TEXTOS_TOTEM_1_ALCOOLEMIA,
  TEXTOS_TOTEM_2_BALANCA,
  TEXTOS_TOTEM_3_PORTAO,
  TEXTOS_TOTEM_4_SEQUENCIADOR,
  type TextosTotemFase1,
} from './DialogosFase1';

/**
 * Textos de ajuda/status por totem, indexados pelo ID usado em contexto.totemAtivo.
 */
const TEXTOS_POR_TOTEM: Record<string, TextosTotemFase1> = {
  [TOTEM_1_ALCOOLEMIA.ID]: TEXTOS_TOTEM_1_ALCOOLEMIA,
  [TOTEM_2_BALANCA.ID]: TEXTOS_TOTEM_2_BALANCA,
  [TOTEM_3_PORTAO.ID]: TEXTOS_TOTEM_3_PORTAO,
  [TOTEM_4_SEQUENCIADOR.ID]: TEXTOS_TOTEM_4_SEQUENCIADOR,
};

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
 * Interpretador da Fase 1: Céu Partido.
 * Valida a lógica dos 4 totens com isolamento rigoroso por contexto.totemAtivo,
 * aceitando sintaxe flexível em Python e retornando feedback sarcástico/ácido em falhas.
 */
export function interpretarComandoFase1(
  entrada: string,
  contexto?: ContextoInterpretador
): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) {
    return { sucesso: false, mensagem: TEXTOS_TERMINAL_FASE1.COMANDO_VAZIO };
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
    return { sucesso: false, mensagem: TEXTOS_TERMINAL_FASE1.SEM_TOTEM };
  }

  const textos = TEXTOS_POR_TOTEM[totemAtivo];

  // Comandos HELP e STATUS contextuais
  if (comandoMinusculo === 'help' || comandoMinusculo === 'ajuda') {
    return { sucesso: true, mensagem: textos?.AJUDA ?? TEXTOS_TERMINAL_FASE1.AJUDA_GERAL };
  }
  if (comandoMinusculo === 'status') {
    return { sucesso: true, mensagem: textos?.STATUS ?? TEXTOS_TERMINAL_FASE1.STATUS_GERAL };
  }

  switch (totemAtivo) {
    // TOTEM 1: "O Teste de Alcoolemia da Sentinela" (Condicionais e not / and)
    case TOTEM_1_ALCOOLEMIA.ID:
      return avaliarTotem1(comandoLimpo);
    // TOTEM 2: "A Balança Hipócrita de Nuvens" (if / elif / else com altitude)
    case TOTEM_2_BALANCA.ID:
      return avaliarTotem2(comandoLimpo);
    // TOTEM 3: "O Portão com Crise Existencial" (Precedência: (A or B) and C)
    case TOTEM_3_PORTAO.ID:
      return avaliarTotem3(comandoLimpo);
    // TOTEM 4: "O Sequenciador de Rajadas" (Parâmetros de Ritmo e Força)
    case TOTEM_4_SEQUENCIADOR.ID:
      return avaliarTotem4(comandoLimpo);
    default:
      return { sucesso: false, mensagem: TEXTOS_TERMINAL_FASE1.DESCONHECIDO };
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
    mensagem: `[FALHA NA CONDICIONAL]\n${sortearMensagem(TEXTOS_TOTEM_1_ALCOOLEMIA.MENSAGENS_ERRO)}`,
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
    mensagem: `[ERRO DE CALIBRAÇÃO]\n${sortearMensagem(TEXTOS_TOTEM_2_BALANCA.MENSAGENS_ERRO)}`,
  };
}

/**
 * Validação do Totem 3: "O Portão com Crise Existencial"
 * if (energia_sol or energia_vento) and placa_pressionada: abrir_portao()
 */
function avaliarTotem3(cmd: string): ResultadoComando {
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
      mensagem: `[ERRO DE PRECEDÊNCIA]\n${TEXTOS_TOTEM_3_PORTAO.MENSAGENS_ERRO[0]}`,
    };
  }

  return {
    sucesso: false,
    mensagem: `[FALHA NA EXPRESSÃO]\n${sortearMensagem(TEXTOS_TOTEM_3_PORTAO.MENSAGENS_ERRO)}`,
  };
}

/**
 * Validação do Totem 4: "O Sequenciador de Rajadas"
 * sincronizar_rajadas("crescente", 1.5, 450)
 */
function avaliarTotem4(cmd: string): ResultadoComando {
  const erros = TEXTOS_TOTEM_4_SEQUENCIADOR.MENSAGENS_ERRO;
  const regexChamada =
    /^sincronizar_rajadas\s*\(\s*["']([^"']+)["']\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/i;
  const match = cmd.match(regexChamada);

  if (match) {
    const ordem = match[1].toLowerCase().trim();
    const intervalo = parseFloat(match[2]);
    const forca = parseFloat(match[3]);

    if (ordem !== 'crescente') {
      return { sucesso: false, mensagem: `[ORDEM INCORRETA]\n${erros[2]}` };
    }

    if (intervalo < 1.2 || intervalo > 1.8) {
      return { sucesso: false, mensagem: `[INTERVALO FORA DA FAIXA]\n${erros[0]}` };
    }

    if (forca < 400) {
      return { sucesso: false, mensagem: `[EMPUSHO INSUFICIENTE]\n${erros[1]}` };
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
    mensagem: `[SINTAXE INVÁLIDA]\n${sortearMensagem(erros)}`,
  };
}
