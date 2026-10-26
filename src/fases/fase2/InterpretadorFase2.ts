import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';
import { DICAS_BOIA } from './porto/DialogosPorto';
import { ITENS_LOJA, ModeloCarretas, ModeloFila, ModeloLoja, ModeloPilha, ModeloValvulas } from './porto/DesafiosPorto';
import type { NomePilha } from './porto/DesafiosPorto';

/**
 * Interpretador da Fase 2: Porto Bugado (Pilha, Fila, Vetores e índices, Ordenação).
 * O contexto traz o desafio ativo e o modelo de estado correspondente.
 */

export type DesafioPorto = 'pilha' | 'fila' | 'vetor' | 'ordenacao' | 'loja';

const ultimoErro: Record<string, number> = {};

function sortearSemRepetir(chave: string, lista: string[]): string {
  if (lista.length <= 1) return lista[0] ?? '';
  let i: number;
  do {
    i = Math.floor(Math.random() * lista.length);
  } while (i === ultimoErro[chave]);
  ultimoErro[chave] = i;
  return lista[i];
}

const DEBOCHE_MEGABRAIN: Record<string, string[]> = {
  pilha: [
    "Mega Brain: 'Meus guindastes empilham melhor que você, e eles estão infectados.'",
    "Mega Brain: 'Pilha. Topo. Primeiro a sair. Três palavras e você tropeçou nas três.'",
    "Mega Brain: 'Continue assim e o Canhão de Espuma vai enferrujar no fundo da pilha.'",
  ],
  fila: [
    "Mega Brain: 'Furar fila é privilégio meu, operador.'",
    "Mega Brain: 'Os navios buzinam de tédio enquanto você inventa comandos.'",
    "Mega Brain: 'Na minha fila, quem chega primeiro é atendido... quando EU quiser.'",
  ],
  vetor: [
    "Mega Brain: 'Contar a partir do um? Que adorável. Que humano.'",
    "Mega Brain: 'Os pneus agradecem cada segundo que você perde contando gavetas.'",
    "Mega Brain: 'Índice errado, prateleira errada, operador errado.'",
  ],
  ordenacao: [
    "Mega Brain: 'Desordem é o meu estado natural. Pelo visto é o seu também.'",
    "Mega Brain: 'Compare vizinhos, troque, repita. Até uma esteira sabe disso.'",
    "Mega Brain: 'O fogo adora quando você hesita.'",
  ],
};

function deboche(desafio: string): string {
  return sortearSemRepetir(desafio, DEBOCHE_MEGABRAIN[desafio] ?? ['']);
}

function dividirComandos(bruto: string): string[] {
  return bruto
    .split(/;|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function compactar(cmd: string): string {
  return cmd.replace(/\s+/g, '').replace(/["'`]/g, '').toLowerCase();
}

const AJUDA: Record<DesafioPorto, string> = {
  pilha:
    '[PAINEL DO GUINDASTE // PILHA]\n' +
    '  pilhaA.pop()            - tira o contêiner do TOPO de A e segura na garra\n' +
    '  pilhaB.push(conteiner)  - coloca o contêiner da garra no TOPO de B\n' +
    '  pilhaC.push(pilhaA.pop()) - as duas coisas de uma vez\n' +
    '  Vários comandos na mesma linha: separe com ;\n' +
    '  status / dica / limpar',
  fila:
    '[PORTÃO DO CAIS // FILA]\n' +
    '  fila.dequeue()          - o navio da FRENTE atraca\n' +
    '  fila.enqueue(navio)     - um navio novo entra no FIM da fila\n' +
    '  status / dica / limpar',
  vetor:
    '[PAINEL DE SPRINKLERS // VETORES E ÍNDICES]\n' +
    '  valvula[3].abrir()      - molha a prateleira 4\n' +
    '  Índices válidos: 0 a 7. Vários comandos: separe com ;\n' +
    '  Também vale: for i in [0, 1]: valvula[i].abrir()\n' +
    '  status / dica / limpar',
  ordenacao:
    '[DRENO DAS CARRETAS // ORDENAÇÃO]\n' +
    '  trocar(i, i+1)          - o guindaste troca duas carretas VIZINHAS\n' +
    '  se pressao[i] > pressao[i+1]: trocar(i, i+1)\n' +
    '  status / dica / limpar',
  loja: '[CRACA // MERCADO DEBAIXO DO PÍER]\n  Digite o número do item (ex: 2) ou comprar("filtro"). Digite sair para fechar.',
};

const INDICE_DICA: Record<DesafioPorto, number> = { pilha: 0, fila: 1, vetor: 2, ordenacao: 3, loja: 0 };

export function interpretarComandoFase2(entrada: string, contexto?: ContextoInterpretador): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) return { sucesso: false, mensagem: '[AVISO] Digite um comando.' };

  const desafio = (contexto?.desafio as DesafioPorto) || 'pilha';
  const simples = bruto.replace(/;+$/, '').trim().toLowerCase();

  if (simples === 'cls' || simples === 'clear' || simples === 'limpar') {
    return { sucesso: true, mensagem: '', acao: 'LIMPAR_TERMINAL' };
  }
  if (simples === 'help' || simples === 'ajuda' || simples === 'manual') {
    return { sucesso: true, mensagem: AJUDA[desafio] };
  }
  if (desafio !== 'loja' && (simples === 'dica' || simples === 'boia')) {
    return { sucesso: true, mensagem: `[DICA DA BOIA] "${DICAS_BOIA[INDICE_DICA[desafio]]}"` };
  }

  switch (desafio) {
    case 'pilha':
      return interpretarPilha(bruto, simples, contexto?.modelo as ModeloPilha);
    case 'fila':
      return interpretarFila(bruto, simples, contexto?.modelo as ModeloFila);
    case 'vetor':
      return interpretarVetor(bruto, simples, contexto?.modelo as ModeloValvulas);
    case 'ordenacao':
      return interpretarOrdenacao(bruto, simples, contexto?.modelo as ModeloCarretas);
    case 'loja':
      return interpretarLoja(simples, contexto?.modelo as ModeloLoja);
  }
  return { sucesso: false, mensagem: '[ERRO] Terminal sem desafio conectado.' };
}

/* ---------------- Desafio 1: Pilha ---------------- */

function interpretarPilha(bruto: string, simples: string, modelo: ModeloPilha): ResultadoComando {
  if (simples === 'status' || simples === 'estado') return { sucesso: true, mensagem: modelo.desenhar() };
  const linhas: string[] = [];
  for (const cmd of dividirComandos(bruto)) {
    const c = compactar(cmd);
    let m: RegExpMatchArray | null;
    let erro: string | null = null;
    let erroTopo = false;

    if ((m = c.match(/^pilha_?([abc])\.(?:push|append)\(pilha_?([abc])\.pop\(\)\)$/))) {
      erro = modelo.pop(m[2].toUpperCase() as NomePilha);
      if (!erro) {
        linhas.push(`> pilha${m[2].toUpperCase()}.pop()  ->  garra pegou [${modelo.garra}]`);
        erro = modelo.push(m[1].toUpperCase() as NomePilha);
        if (!erro) linhas.push(`> pilha${m[1].toUpperCase()}.push(conteiner)  ->  contêiner no topo de ${m[1].toUpperCase()}`);
      }
    } else if ((m = c.match(/^pilha_?([abc])\.pop\(\)$/))) {
      erro = modelo.pop(m[1].toUpperCase() as NomePilha);
      if (!erro) linhas.push(`> pilha${m[1].toUpperCase()}.pop()  ->  garra pegou [${modelo.garra}]`);
    } else if ((m = c.match(/^pilha_?([abc])\.(?:push|append)\(([a-z_çê0-9]*)\)$/))) {
      erro = modelo.push(m[1].toUpperCase() as NomePilha);
      if (!erro) linhas.push(`> pilha${m[1].toUpperCase()}.push(conteiner)  ->  contêiner no topo de ${m[1].toUpperCase()}`);
    } else if (/^pilha_?[abc](\.pop\(.+\)|\.remove\(|\[|\.insert\(|\.get\()/.test(c) || /^del/.test(c)) {
      erroTopo = true;
      erro = 'SÓ O TOPO! O guindaste travou: numa pilha só dá para mexer no contêiner de CIMA.';
    } else if (/^pilha_?[abc]\.(pop|push)/.test(c)) {
      erro = 'Sintaxe estranha. Exemplos: pilhaA.pop()  ou  pilhaB.push(conteiner)';
    } else {
      erro = `Comando não reconhecido: "${cmd}". Digite ajuda para ver os comandos do guindaste.`;
    }

    if (erro) {
      const msg = [...linhas, `[${erroTopo ? 'GUINDASTE TRAVADO' : 'ERRO'}] ${erro}`, deboche('pilha'), '', modelo.desenhar()].join('\n');
      return { sucesso: false, mensagem: msg, acao: erroTopo ? 'PILHA_TOPO' : linhas.length ? 'PILHA_MOVEU' : 'PILHA_ERRO' };
    }
    if (modelo.concluido) break;
  }
  if (modelo.concluido) {
    return {
      sucesso: true,
      mensagem: [...linhas, '', '[CONTÊINER DE ESPUMA LIBERADO] O guindaste está descendo o contêiner até você!'].join('\n'),
      acao: 'PILHA_CONCLUIDA',
    };
  }
  return { sucesso: true, mensagem: [...linhas, '', modelo.desenhar()].join('\n'), acao: 'PILHA_MOVEU' };
}

/* ---------------- Desafio 2: Fila ---------------- */

function interpretarFila(bruto: string, simples: string, modelo: ModeloFila): ResultadoComando {
  if (simples === 'status' || simples === 'estado') return { sucesso: true, mensagem: modelo.desenhar() };
  const linhas: string[] = [];
  for (const cmd of dividirComandos(bruto)) {
    const c = compactar(cmd);
    let erro: string | null = null;
    let erroMeio = false;
    if (/^fila\.(dequeue|popleft|desenfileirar)\(\)$/.test(c)) {
      const antes = modelo.eventos.length;
      erro = modelo.dequeue();
      for (const ev of modelo.eventos.slice(antes)) {
        if (ev.tipo === 'furou') linhas.push(`> fila.dequeue()  ->  !! ${ev.navio} FUROU A FILA e atracou primeiro! Vírus descarregados no cais!`);
        else if (ev.tipo === 'atracou') linhas.push(`> fila.dequeue()  ->  ${ev.navio} atracou no portão.`);
        else if (ev.tipo === 'intruso') linhas.push(`   ALERTA: ${ev.navio} apareceu tentando furar a fila!`);
      }
    } else if (/^fila\.(enqueue|append|enfileirar)\(([a-z_0-9-]*)\)$/.test(c)) {
      const navio = modelo.intruso;
      erro = modelo.enqueue();
      if (!erro) linhas.push(`> fila.enqueue(navio)  ->  ${navio} foi para o FIM da fila. Bloqueado!`);
    } else if (/^fila\.pop\(\)$/.test(c)) {
      erro = 'pop() tira o ÚLTIMO da fila — isso é comportamento de PILHA! Na fila, quem sai é o da FRENTE: fila.dequeue()';
    } else if (/^fila(\.(dequeue|pop|remove|insert|popleft)\(.+\)|\[)/.test(c)) {
      erroMeio = true;
      erro = 'FOOOOOM! Os navios buzinam e voltam ao lugar: só o navio da FRENTE pode atracar.';
    } else {
      erro = `Comando não reconhecido: "${cmd}". Use fila.dequeue() ou fila.enqueue(navio).`;
    }
    if (erro) {
      return {
        sucesso: false,
        mensagem: [...linhas, `[${erroMeio ? 'BUZINAÇO' : 'ERRO'}] ${erro}`, deboche('fila'), '', modelo.desenhar()].join('\n'),
        acao: erroMeio ? 'FILA_BUZINA' : linhas.length ? 'FILA_MOVEU' : 'FILA_ERRO',
      };
    }
    if (modelo.concluido) break;
  }
  if (modelo.concluido) {
    return { sucesso: true, mensagem: [...linhas, '', '[REBOCADOR-BOMBEIRO ATRACADO] Canhões d\'água ligados: limpando o cais!'].join('\n'), acao: 'FILA_CONCLUIDA' };
  }
  return { sucesso: true, mensagem: [...linhas, '', modelo.desenhar()].join('\n'), acao: 'FILA_MOVEU' };
}

/* ---------------- Desafio 3: Vetores e índices ---------------- */

function interpretarVetor(bruto: string, simples: string, modelo: ModeloValvulas): ResultadoComando {
  if (simples === 'status' || simples === 'estado') return { sucesso: true, mensagem: modelo.desenhar() + '\n   (os sensores de calor estão cegos pela fumaça: confira as PLACAS das prateleiras em chamas)' };
  const linhas: string[] = [];
  const indices: number[] = [];
  let laco = bruto.match(/^for\s+(\w+)\s+in\s+\[([^\]]*)\]\s*:\s*valvulas?\[\s*(\w+)\s*\]\s*\.\s*(abrir|open)\(\s*\)\s*;?$/i);
  if (laco && laco[1] === laco[3]) {
    for (const parte of laco[2].split(',')) {
      const n = Number(parte.trim());
      if (!Number.isInteger(n)) return { sucesso: false, mensagem: `[TypeError] índices de lista precisam ser inteiros: "${parte.trim()}"` };
      indices.push(n);
    }
  } else {
    laco = null;
    for (const cmd of dividirComandos(bruto)) {
      const c = compactar(cmd);
      let m: RegExpMatchArray | null;
      if ((m = c.match(/^valvulas?\[(-?\d+)\]\.(abrir|open)\(\)$/)) || (m = c.match(/^abrir\(valvulas?\[(-?\d+)\]\)$/))) {
        indices.push(Number(m[1]));
      } else if (/^valvulas?\(\d+\)/.test(c)) {
        return { sucesso: false, mensagem: `[SyntaxError] Vetor se acessa com COLCHETES: valvula[3].abrir() — e não valvula(3).\n${deboche('vetor')}` };
      } else if ((m = c.match(/^valvulas?\[([^\]]*)\]/))) {
        return { sucesso: false, mensagem: `[TypeError] O índice precisa ser um número inteiro: valvula[${m[1]}] não serve.\n${deboche('vetor')}` };
      } else {
        return { sucesso: false, mensagem: `Comando não reconhecido: "${cmd}". Exemplo: valvula[3].abrir()` };
      }
    }
  }
  let foraDoLimite = false;
  for (const i of indices) {
    const erro = modelo.abrir(i);
    if (erro) {
      foraDoLimite = true;
      linhas.push(`> valvula[${i}].abrir()  ->  [GLITCH] ${erro}`);
      break;
    }
    const ev = modelo.eventos[modelo.eventos.length - 1];
    if (ev.tipo === 'abrir') {
      const placa = ev.indice + 1;
      linhas.push(
        ev.apagou
          ? `> valvula[${i}].abrir()  ->  sprinkler da prateleira ${placa}: FOGO APAGADO!`
          : `> valvula[${i}].abrir()  ->  água na prateleira ${placa}... mas ela não estava pegando fogo.`
      );
    }
  }
  if (foraDoLimite) {
    return { sucesso: false, mensagem: [...linhas, deboche('vetor'), 'ALERTA: o glitch soltou um inimigo no depósito!'].join('\n'), acao: 'VETOR_FORA' };
  }
  if (modelo.concluido) {
    return { sucesso: true, mensagem: [...linhas, '', '[SPRINKLERS CERTOS ABERTOS] Caminho até o topo do depósito liberado!'].join('\n'), acao: 'VETOR_CONCLUIDO' };
  }
  return { sucesso: true, mensagem: [...linhas, '', modelo.desenhar()].join('\n'), acao: 'VETOR_ABRIU' };
}

/* ---------------- Desafio 4: Ordenação ---------------- */

function interpretarOrdenacao(bruto: string, simples: string, modelo: ModeloCarretas): ResultadoComando {
  if (simples === 'status' || simples === 'estado') return { sucesso: true, mensagem: modelo.desenhar() };
  const linhas: string[] = [];
  for (const cmd of dividirComandos(bruto)) {
    const c = compactar(cmd);
    let m: RegExpMatchArray | null;
    let a: number;
    let b: number;
    if ((m = c.match(/^(?:trocar|swap)\((-?\d+),(-?\d+)\)$/))) {
      a = Number(m[1]);
      b = Number(m[2]);
    } else if ((m = c.match(/^pressao\[(\d+)\],pressao\[(\d+)\]=pressao\[(\d+)\],pressao\[(\d+)\]$/)) && m[1] === m[4] && m[2] === m[3]) {
      a = Number(m[1]);
      b = Number(m[2]);
    } else if (/^(se|if)/.test(c)) {
      return { sucesso: false, mensagem: 'Boa ideia, mas aqui quem compara é você! Olhe os valores e mande a troca direto: trocar(i, i+1)' };
    } else {
      return { sucesso: false, mensagem: `Comando não reconhecido: "${cmd}". Exemplo: trocar(0, 1)\n${deboche('ordenacao')}` };
    }
    const erro = modelo.trocar(a, b);
    if (erro) {
      return { sucesso: false, mensagem: [...linhas, `[ERRO] ${erro}`, '', modelo.desenhar()].join('\n'), acao: linhas.length ? 'ORDEM_TROCOU' : 'ORDEM_ERRO' };
    }
    const ev = modelo.eventos[modelo.eventos.length - 1];
    linhas.push(
      ev.piorou
        ? `> trocar(${ev.i}, ${ev.i + 1})  ->  PSSSSH! A carreta soltou vapor: essa troca PIOROU a ordem. O fogo avançou!`
        : `> trocar(${ev.i}, ${ev.i + 1})  ->  troca certa! Jato de espuma empurrou o fogo para trás.`
    );
    if (modelo.ordenado) break;
  }
  if (modelo.ordenado) {
    return { sucesso: true, mensagem: [...linhas, '', modelo.desenhar(), '', '[DRENO CONECTADO EM ORDEM CRESCENTE] Portão de saída liberado!'].join('\n'), acao: 'ORDEM_CONCLUIDA' };
  }
  return { sucesso: true, mensagem: [...linhas, '', modelo.desenhar()].join('\n'), acao: 'ORDEM_TROCOU' };
}

/* ---------------- Loja da CRACA ---------------- */

function interpretarLoja(simples: string, modelo: ModeloLoja): ResultadoComando {
  if (['sair', 'exit', 'tchau', 'fechar'].includes(simples)) return { sucesso: true, mensagem: 'CRACA: Volta sempre! E traz lacre!', acao: 'LOJA_SAIR' };
  if (simples === 'status' || simples === 'lista' || simples === 'itens') return { sucesso: true, mensagem: `${modelo.desenhar()}\n   Seus lacres: ${modelo.lacres}` };
  const c = compactar(simples);
  let item = null;
  const num = c.match(/^(?:comprar\(?)?(\d)\)?$/);
  if (num) item = ITENS_LOJA[Number(num[1]) - 1] ?? null;
  if (!item) item = ITENS_LOJA.find((it) => c.includes(it.codigo)) ?? null;
  if (!item) return { sucesso: false, mensagem: 'CRACA: Hã? Fala o número do item, chefia. Ou "sair".' };
  const erro = modelo.comprar(item);
  if (erro) return { sucesso: false, mensagem: `CRACA: ${erro}` };
  return { sucesso: true, mensagem: `CRACA: ${item.nome} é seu! Sobraram ${modelo.lacres} lacre(s).`, acao: 'LOJA_COMPROU' };
}
