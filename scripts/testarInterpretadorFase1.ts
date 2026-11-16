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
  TOTEM_5_HELIO,
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
const T5 = TOTEM_5_HELIO.ID;

const casos: Caso[] = [
  // ===== Totem 1: escudo = ___  (False) =====
  { totem: T1, entrada: 'False', sucesso: true, acao: 'DESATIVAR_ESCUDO_SENTINELA' },
  { totem: T1, entrada: 'false', sucesso: true },
  { totem: T1, entrada: '  False  ', sucesso: true },
  { totem: T1, entrada: 'escudo = False', sucesso: true },
  { totem: T1, entrada: 'escudo=false', sucesso: true },
  { totem: T1, entrada: 'not True', sucesso: true },
  { totem: T1, entrada: 'True', sucesso: false, mensagem: 'ESCUDO LIGADO', dica: 'False' },
  { totem: T1, entrada: '0', sucesso: false, mensagem: 'VALOR ERRADO', dica: 'False' },
  { totem: T1, entrada: '"False"', sucesso: false, mensagem: 'VALOR ERRADO' },
  { totem: T1, entrada: 'desligado', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA', dica: 'False' },
  { totem: T1, entrada: 'falso', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA', dica: 'False' },
  { totem: T1, entrada: '', sucesso: false },
  { totem: T1, entrada: 'escudo == False', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA', dica: 'um = só' },

  // ===== Totem 2: altura = ___  (350) =====
  { totem: T2, entrada: '350', sucesso: true, acao: 'ESTABILIZAR_ELEVADOR' },
  { totem: T2, entrada: 'altura = 350', sucesso: true },
  { totem: T2, entrada: 'altura=350', sucesso: true },
  { totem: T2, entrada: '350.0', sucesso: true },
  { totem: T2, entrada: '540', sucesso: false, mensagem: 'ALTURA ERRADA', dica: 'alto demais' },
  { totem: T2, entrada: '100', sucesso: false, mensagem: 'ALTURA ERRADA', dica: 'baixo demais' },
  { totem: T2, entrada: '"350"', sucesso: false, mensagem: 'TEXTO NO LUGAR DE NÚMERO', dica: 'sem aspas' },
  { totem: T2, entrada: 'True', sucesso: false, mensagem: 'VALOR ERRADO' },
  { totem: T2, entrada: 'trezentos', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA' },
  { totem: T2, entrada: 'altura == 350', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA', dica: 'um = só' },

  // ===== Totem 3: abrir = sol ___ vento  (or) =====
  { totem: T3, entrada: 'or', sucesso: true, acao: 'ABRIR_PORTAO_EXISTENCIAL' },
  { totem: T3, entrada: 'OR', sucesso: true },
  { totem: T3, entrada: ' or ', sucesso: true },
  { totem: T3, entrada: 'sol or vento', sucesso: true },
  { totem: T3, entrada: 'vento or sol', sucesso: true },
  { totem: T3, entrada: 'abrir = sol or vento', sucesso: true },
  { totem: T3, entrada: 'and', sucesso: false, mensagem: 'FALHA NA LÓGICA', dica: 'sol = True e vento = False' },
  { totem: T3, entrada: 'sol and vento', sucesso: false, mensagem: 'FALHA NA LÓGICA' },
  { totem: T3, entrada: 'ou', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA', dica: 'or' },
  { totem: T3, entrada: '||', sucesso: false, mensagem: 'LINGUAGEM ERRADA' },

  // ===== Totem 4: ligar_turbinas(___)  (3) =====
  { totem: T4, entrada: '3', sucesso: true, acao: 'ATIVAR_ESCADA_RAJADAS' },
  { totem: T4, entrada: 'ligar_turbinas(3)', sucesso: true },
  { totem: T4, entrada: ' 3 ', sucesso: true },
  { totem: T4, entrada: '2', sucesso: false, mensagem: 'TURBINAS ERRADAS', dica: 'Só 2 ligaram' },
  { totem: T4, entrada: '5', sucesso: false, mensagem: 'TURBINAS ERRADAS', dica: 'Só existem 3' },
  { totem: T4, entrada: '"3"', sucesso: false, mensagem: 'TEXTO NO LUGAR DE NÚMERO' },
  { totem: T4, entrada: 'tres', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA', dica: 'número' },
  { totem: T4, entrada: '1, 2', sucesso: false, mensagem: 'PARÊNTESES' },
  { totem: T4, entrada: 'ligar_turbinas()', sucesso: false, mensagem: 'PARÊNTESES' },
  { totem: T4, entrada: 'ligar_turbina(3)', sucesso: false, mensagem: 'FUNÇÃO DESCONHECIDA', dica: 'ligar_turbinas' },

  // ===== Totem 5: if ___: desligar()  (helio_tonto) =====
  { totem: T5, entrada: 'helio_tonto', sucesso: true, acao: 'DESLIGAR_HELIO' },
  { totem: T5, entrada: 'helio_tonto == True', sucesso: true },
  { totem: T5, entrada: 'helio_tonto is True', sucesso: true },
  { totem: T5, entrada: 'if helio_tonto:', sucesso: true },
  { totem: T5, entrada: 'if helio_tonto: desligar()', sucesso: true },
  { totem: T5, entrada: 'not helio_tonto', sucesso: false, mensagem: 'LÓGICA INVERTIDA' },
  { totem: T5, entrada: 'tonto', sucesso: false, mensagem: 'VARIÁVEL DESCONHECIDA', dica: 'helio_tonto' },
  { totem: T5, entrada: 'True', sucesso: false, mensagem: 'FALHA NA LÓGICA' },
  { totem: T5, entrada: 'desligar()', sucesso: false, mensagem: 'SEM CONDIÇÃO' },

  // ===== Comandos do terminal =====
  { totem: T1, entrada: 'help', sucesso: true, mensagem: 'Depois de 2 tentativas' },
  { totem: T1, entrada: 'help', sucesso: true, mensagem: 'escudo = Fa___', errosNoTotem: 2 },
  { totem: T3, entrada: 'status', sucesso: true, mensagem: 'sol = True' },
  { totem: T1, entrada: 'senhamagicabrainrebase', sucesso: true, acao: 'DESATIVAR_ESCUDO_SENTINELA' },
  { totem: T1, entrada: 'limpar', sucesso: true, acao: 'CLEAR_TERMINAL' },
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
