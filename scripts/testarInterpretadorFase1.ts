/**
 * Testes do interpretador da Fase 1, sem Phaser e sem navegador.
 * Rodar com: npx tsx scripts/testarInterpretadorFase1.ts
 */
import { interpretarComandoFase1 } from '../src/fases/fase1/InterpretadorFase1';
import {
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_PORTAO,
  TOTEM_4_SEQUENCIADOR,
} from '../src/fases/fase1/constantesFase1';

interface Caso {
  totem: string;
  entrada: string;
  sucesso: boolean;
  /** Trecho esperado na mensagem (título do diagnóstico ou texto de sucesso). */
  mensagem?: string;
  /** Trecho esperado na dica objetiva. */
  dica?: string;
  acao?: string;
  simulacao?: boolean;
  errosNoTotem?: number;
}

const T1 = TOTEM_1_ALCOOLEMIA.ID;
const T2 = TOTEM_2_BALANCA.ID;
const T3 = TOTEM_3_PORTAO.ID;
const T4 = TOTEM_4_SEQUENCIADOR.ID;

const casos: Caso[] = [
  // ===== Totem 1: not / and =====
  { totem: T1, entrada: 'if not alarme_ligado and not jogador_armado: desativar_escudo()', sucesso: true, acao: 'DESATIVAR_ESCUDO_SENTINELA' },
  { totem: T1, entrada: 'if not jogador_armado and not alarme_ligado: desativar_escudo()', sucesso: true },
  { totem: T1, entrada: 'if not (alarme_ligado or jogador_armado): desativar_escudo()', sucesso: true },
  { totem: T1, entrada: 'if alarme_ligado == False and jogador_armado == False: desativar_escudo()', sucesso: true },
  { totem: T1, entrada: 'if alarme_ligado is False and jogador_armado is False: desativar_escudo()', sucesso: true },
  { totem: T1, entrada: 'IF NOT Alarme_Ligado AND NOT Jogador_Armado: Desativar_Escudo()', sucesso: true },
  { totem: T1, entrada: 'if alarme_ligado or jogador_armado: pass else: desativar_escudo()', sucesso: true },
  { totem: T1, entrada: 'seguro = not alarme_ligado and not jogador_armado; if seguro: desativar_escudo()', sucesso: true },
  { totem: T1, entrada: 'if not alarme_ligado and not jogador_armado: desativar_escudo();', sucesso: true },
  { totem: T1, entrada: 'if alarme_ligado or jogador_armado: desativar_escudo()', sucesso: false, mensagem: 'LÓGICA INVERTIDA' },
  { totem: T1, entrada: 'if not alarme_ligado: desativar_escudo()', sucesso: false, mensagem: 'FALHA NA LÓGICA', dica: 'jogador_armado = True' },
  { totem: T1, entrada: 'desativar_escudo()', sucesso: false, mensagem: 'SEM CONDIÇÃO' },
  { totem: T1, entrada: 'if not alarme_ligado and not jogador_armado desativar_escudo()', sucesso: false, mensagem: 'ERRO DE SINTAXE', dica: "Faltou ':'" },
  { totem: T1, entrada: 'if !alarme_ligado && !jogador_armado: desativar_escudo()', sucesso: false, mensagem: 'LINGUAGEM ERRADA' },
  { totem: T1, entrada: 'if not alarme and not jogador_armado: desativar_escudo()', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA', dica: "Você quis dizer 'alarme_ligado'?" },
  { totem: T1, entrada: 'if not alarme_ligado and not jogador_armado: desligar_escudo()', sucesso: false, mensagem: 'FUNÇÃO DESCONHECIDA', dica: 'desativar_escudo' },
  { totem: T1, entrada: 'alarme_ligado = False; desativar_escudo()', sucesso: false, mensagem: 'SENSOR SÓ DE LEITURA' },
  { totem: T1, entrada: 'if not alarme_ligado and not jogador_armado: pass', sucesso: false, mensagem: 'NADA ACONTECEU' },
  { totem: T1, entrada: 'if not alarme_ligado and not jogador_armado: desativar_escudo(True)', sucesso: false, mensagem: 'ARGUMENTOS ERRADOS' },
  { totem: T1, entrada: 'if not alarme_ligado: if not jogador_armado: desativar_escudo()', sucesso: false, mensagem: 'ERRO DE SINTAXE' },
  { totem: T1, entrada: 'if not alarme_ligado and not jogador_armado: desativar_escudo', sucesso: false, mensagem: 'ERRO DE SINTAXE', dica: 'parênteses' },

  // ===== Totem 2: if / elif / else =====
  { totem: T2, entrada: 'if altitude_atual < 350: aumentar_pressao() elif altitude_atual > 350: aliviar_pressao() else: estabilizar()', sucesso: true, acao: 'ESTABILIZAR_ELEVADOR' },
  { totem: T2, entrada: 'if altitude_atual == 350: estabilizar() elif altitude_atual < 350: aumentar_pressao() else: aliviar_pressao()', sucesso: true },
  { totem: T2, entrada: 'if altitude_atual < altitude_alvo: aumentar_pressao() elif altitude_atual > altitude_alvo: aliviar_pressao() else: estabilizar()', sucesso: true },
  { totem: T2, entrada: 'if altitude_atual < 350: aumentar_pressao() if altitude_atual > 350: aliviar_pressao() if altitude_atual == 350: estabilizar()', sucesso: true },
  { totem: T2, entrada: 'if altitude_atual < 350: aumentar_pressao(); elif altitude_atual > 350: aliviar_pressao(); else: estabilizar()', sucesso: true },
  { totem: T2, entrada: 'if 350 > altitude_atual: aumentar_pressao() else if altitude_atual > 350: aliviar_pressao() else: estabilizar()', sucesso: true },
  { totem: T2, entrada: 'if altitude_atual < 350: aumentar_pressao() elif altitude_atual > 350: aliviar_pressao()', sucesso: false, mensagem: 'NADA ACONTECEU', dica: 'altitude_atual = 350' },
  { totem: T2, entrada: 'if altitude_atual <= 350: aumentar_pressao() elif altitude_atual > 350: aliviar_pressao() else: estabilizar()', sucesso: false, mensagem: 'FALHA NA LÓGICA', dica: 'estabilizar()' },
  { totem: T2, entrada: 'if altitude_atual < 350: aumentar_pressao() if altitude_atual <= 350: estabilizar() else: aliviar_pressao()', sucesso: false, mensagem: 'CHAMADAS DEMAIS' },
  { totem: T2, entrada: 'if altitude_atual = 350: estabilizar()', sucesso: false, mensagem: 'ERRO DE SINTAXE', dica: "'=='" },
  { totem: T2, entrada: 'if altitude_atual < "350": aumentar_pressao() else: estabilizar()', sucesso: false, mensagem: 'TIPOS MISTURADOS' },
  { totem: T2, entrada: 'else: estabilizar()', sucesso: false, mensagem: 'ERRO DE SINTAXE', dica: 'sem um if' },

  // ===== Totem 3: precedência =====
  { totem: T3, entrada: 'if (energia_sol or energia_vento) and placa_pressionada: abrir_portao()', sucesso: true, acao: 'ABRIR_PORTAO_EXISTENCIAL' },
  { totem: T3, entrada: 'if placa_pressionada and (energia_vento or energia_sol): abrir_portao()', sucesso: true },
  { totem: T3, entrada: 'if energia_sol and placa_pressionada or energia_vento and placa_pressionada: abrir_portao()', sucesso: true },
  { totem: T3, entrada: 'if energia_sol or energia_vento and placa_pressionada: abrir_portao()', sucesso: false, mensagem: 'ERRO DE PRECEDÊNCIA' },
  { totem: T3, entrada: 'if (energia_sol and energia_vento) and placa_pressionada: abrir_portao()', sucesso: false, mensagem: 'FALHA NA LÓGICA' },
  { totem: T3, entrada: 'if energia_sol or energia_vento: abrir_portao()', sucesso: false, mensagem: 'FALHA NA LÓGICA', dica: 'placa_pressionada = False' },
  { totem: T3, entrada: 'if (energia_sol or energia_vento and placa_pressionada: abrir_portao()', sucesso: false, mensagem: 'ERRO DE SINTAXE', dica: 'parêntese' },

  // ===== Totem 4: função com parâmetros =====
  { totem: T4, entrada: 'sincronizar_rajadas("crescente", 1.5, 450)', sucesso: true, acao: 'ATIVAR_ESCADA_RAJADAS' },
  { totem: T4, entrada: "sincronizar_rajadas('Crescente', 1.2, 400)", sucesso: true },
  { totem: T4, entrada: 'sincronizar_rajadas(ordem="crescente", intervalo=1.5, forca=500)', sucesso: true },
  { totem: T4, entrada: 'sincronizar_rajadas("crescente", forca=450, intervalo=1.8)', sucesso: true },
  { totem: T4, entrada: 'sincronizar_rajadas(“crescente”, 1.5, 450)', sucesso: true },
  { totem: T4, entrada: 'sincronizar_rajadas(ordem="crescente", intervalo=1.5, força=450)', sucesso: true },
  { totem: T4, entrada: 'sincronizar_rajadas("decrescente", 1.5, 450)', sucesso: false, mensagem: 'ORDEM INCORRETA', simulacao: true },
  { totem: T4, entrada: 'sincronizar_rajadas("crescente", 0.5, 450)', sucesso: false, mensagem: 'INTERVALO FORA DA FAIXA', simulacao: true },
  { totem: T4, entrada: 'sincronizar_rajadas("crescente", 1.5, 200)', sucesso: false, mensagem: 'FORÇA FORA DA FAIXA', simulacao: true },
  { totem: T4, entrada: 'sincronizar_rajadas("crescente", 1.5, 2000)', sucesso: false, mensagem: 'FORÇA FORA DA FAIXA', simulacao: true },
  { totem: T4, entrada: 'sincronizar_rajadas("crescente", 1,5, 450)', sucesso: false, mensagem: 'ARGUMENTOS ERRADOS', dica: 'ponto' },
  { totem: T4, entrada: 'sincronizar_rajadas(crescente, 1.5, 450)', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA', dica: 'aspas' },
  { totem: T4, entrada: 'sincronizar_rajadas(ordem, intervalo, forca)', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA', dica: 'nome do parâmetro' },
  { totem: T4, entrada: 'sincronizar_rajadas("crescente", 1.5)', sucesso: false, mensagem: 'ARGUMENTOS ERRADOS', dica: 'Você passou 2' },
  { totem: T4, entrada: 'ordem = "crescente"', sucesso: false, mensagem: 'NADA ACONTECEU' },

  // ===== Comandos gerais =====
  { totem: T1, entrada: '   ', sucesso: false, mensagem: 'comando em branco' },
  { totem: T1, entrada: 'clear', sucesso: true, acao: 'CLEAR_TERMINAL' },
  { totem: T1, entrada: 'CLS', sucesso: true, acao: 'CLEAR_TERMINAL' },
  { totem: T2, entrada: 'help', sucesso: true, mensagem: 'enunciado, clear' },
  { totem: '', entrada: 'if True: desativar_escudo()', sucesso: false, mensagem: 'ERRO DE CONEXÃO' },
  { totem: T1, entrada: 'help', sucesso: true, mensagem: 'Depois de 3 tentativas' },
  { totem: T1, entrada: 'help', sucesso: true, mensagem: 'if not ___ and not ___', errosNoTotem: 3 },
  { totem: T4, entrada: 'status', sucesso: true, mensagem: 'ordem exigida' },
];

let falhas = 0;

for (const caso of casos) {
  const problemas: string[] = [];
  let resultado;
  try {
    resultado = interpretarComandoFase1(caso.entrada, {
      totemAtivo: caso.totem,
      errosNoTotem: caso.errosNoTotem ?? 0,
    });
  } catch (erro) {
    problemas.push(`lançou exceção: ${(erro as Error).message}`);
  }

  if (resultado) {
    let feedback: { dica?: string; simulacao?: unknown } = {};
    if (resultado.acao === 'FEEDBACK_ERRO' && typeof resultado.valor === 'string') {
      feedback = JSON.parse(resultado.valor);
    }

    if (resultado.sucesso !== caso.sucesso) problemas.push(`sucesso=${resultado.sucesso}, esperado ${caso.sucesso}`);
    if (caso.mensagem && !resultado.mensagem.includes(caso.mensagem)) {
      problemas.push(`mensagem sem "${caso.mensagem}"`);
    }
    if (caso.acao && resultado.acao !== caso.acao) problemas.push(`acao=${resultado.acao}, esperado ${caso.acao}`);
    if (caso.dica && !(feedback.dica ?? '').includes(caso.dica)) problemas.push(`dica sem "${caso.dica}"`);
    if (caso.simulacao !== undefined && Boolean(feedback.simulacao) !== caso.simulacao) {
      problemas.push(`simulacao=${Boolean(feedback.simulacao)}, esperado ${caso.simulacao}`);
    }
    if (!caso.sucesso && problemas.length === 0 && resultado.acao === 'FEEDBACK_ERRO' && !feedback.dica) {
      problemas.push('erro sem dica objetiva');
    }
  }

  if (problemas.length > 0) {
    falhas++;
    console.log(`FALHOU  ${caso.entrada}`);
    for (const p of problemas) console.log(`        - ${p}`);
    if (resultado) {
      console.log(`        mensagem: ${resultado.mensagem.replace(/\n/g, ' | ')}`);
      if (typeof resultado.valor === 'string') console.log(`        valor: ${resultado.valor}`);
    }
  } else {
    console.log(`ok      ${caso.entrada}`);
  }
}

console.log(`\n${casos.length - falhas}/${casos.length} casos passaram.`);
process.exit(falhas > 0 ? 1 : 0);
