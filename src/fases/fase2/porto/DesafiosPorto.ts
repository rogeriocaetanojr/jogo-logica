import type { EstadoPorto } from './TiposPorto';
import { ESPUMA_MAXIMA } from './TiposPorto';

/**
 * Modelos de estado dos 4 desafios de programação do Porto Bugado.
 * O interpretador do terminal valida e aplica os comandos aqui; a cena consome os eventos para animar o mundo.
 */

/* =========================================================================
 * DESAFIO 1 — PILHA (contêineres empilhados)
 * ========================================================================= */

export type NomePilha = 'A' | 'B' | 'C';
export type CodigoConteiner = 'VRM' | 'AZL' | 'AMA' | 'VRD' | 'ESP';

export type EventoPilha = { tipo: 'pop'; pilha: NomePilha; conteiner: CodigoConteiner } | { tipo: 'push'; pilha: NomePilha; conteiner: CodigoConteiner };

export class ModeloPilha {
  public readonly limite = 4;
  public pilhas: Record<NomePilha, CodigoConteiner[]> = {
    A: ['ESP', 'VRM', 'AZL', 'AMA', 'VRD'],
    B: ['AMA', 'VRM'],
    C: ['AZL'],
  };
  public garra: CodigoConteiner | null = null;
  public concluido = false;
  public eventos: EventoPilha[] = [];

  pop(nome: NomePilha): string | null {
    if (this.garra) return `A garra já está segurando [${this.garra}]. Coloque-o no topo de uma pilha com push antes de tirar outro.`;
    const pilha = this.pilhas[nome];
    if (pilha.length === 0) return `IndexError: pop from empty list — a pilha${nome} está vazia, não há topo para tirar.`;
    const c = pilha.pop() as CodigoConteiner;
    this.garra = c;
    this.eventos.push({ tipo: 'pop', pilha: nome, conteiner: c });
    if (c === 'ESP') this.concluido = true;
    return null;
  }

  push(nome: NomePilha): string | null {
    if (!this.garra) return 'A garra está vazia: primeiro tire um contêiner do topo de alguma pilha com pop().';
    const pilha = this.pilhas[nome];
    if (pilha.length >= this.limite) return `LIMITE DE VENTO! A pilha${nome} já tem ${pilha.length} contêineres (máximo ${this.limite}).`;
    pilha.push(this.garra);
    this.eventos.push({ tipo: 'push', pilha: nome, conteiner: this.garra });
    this.garra = null;
    return null;
  }

  /** Desenho ASCII das três pilhas (topo em cima). */
  desenhar(): string {
    const altura = Math.max(5, ...Object.values(this.pilhas).map((p) => p.length));
    const linhas: string[] = [];
    for (let nivel = altura - 1; nivel >= 0; nivel--) {
      const celulas = (['A', 'B', 'C'] as NomePilha[]).map((n) => {
        const c = this.pilhas[n][nivel];
        if (!c) return '         ';
        const topo = nivel === this.pilhas[n].length - 1;
        return topo ? `>[ ${c} ]<` : ` [ ${c} ] `;
      });
      linhas.push('   ' + celulas.join('  '));
    }
    linhas.push('   ' + '-'.repeat(35));
    linhas.push('     pilhaA      pilhaB      pilhaC');
    linhas.push(`   GARRA: ${this.garra ? `[ ${this.garra} ]` : 'vazia'}    (>[ ]< = topo, limite ${this.limite})`);
    return linhas.join('\n');
  }
}

/* =========================================================================
 * DESAFIO 2 — FILA (navios esperando para atracar)
 * ========================================================================= */

export type EventoFila =
  | { tipo: 'atracou'; navio: string }
  | { tipo: 'furou'; navio: string }
  | { tipo: 'enfileirou'; navio: string }
  | { tipo: 'intruso'; navio: string };

export class ModeloFila {
  public fila: string[] = ['CARGUEIRO', 'PETROLEIRO', 'PESQUEIRO', 'BALSA', 'GRANELEIRO', 'REBOCADOR'];
  public intruso: string | null = null;
  public concluido = false;
  public eventos: EventoFila[] = [];
  private atracacoes = 0;
  private intrusosCriados = 0;

  dequeue(): string | null {
    if (this.concluido) return 'O rebocador já atracou. Missão cumprida no cais.';
    if (this.intruso) {
      const navio = this.intruso;
      this.intruso = null;
      this.eventos.push({ tipo: 'furou', navio });
      this.verificarIntruso();
      return null;
    }
    const navio = this.fila.shift();
    if (!navio) return 'IndexError: a fila está vazia.';
    this.atracacoes++;
    this.eventos.push({ tipo: 'atracou', navio });
    if (navio === 'REBOCADOR') {
      this.concluido = true;
      return null;
    }
    this.verificarIntruso();
    return null;
  }

  enqueue(): string | null {
    if (!this.intruso) return 'Não há nenhum navio novo esperando para entrar na fila agora.';
    const navio = this.intruso;
    this.fila.push(navio);
    this.intruso = null;
    this.eventos.push({ tipo: 'enfileirou', navio });
    return null;
  }

  /** O script do MegaBrain manda navios-vírus furarem a fila após a 1ª e a 3ª atracação. */
  private verificarIntruso(): void {
    if (this.intruso || this.concluido) return;
    const gatilhos = [1, 3];
    if (this.intrusosCriados < gatilhos.length && this.atracacoes >= gatilhos[this.intrusosCriados]) {
      this.intrusosCriados++;
      this.intruso = `NAVIO-VIRUS-${this.intrusosCriados}`;
      this.eventos.push({ tipo: 'intruso', navio: this.intruso });
    }
  }

  desenhar(): string {
    const nomes = this.fila.map((n, i) => `${i}:${n}`);
    const linhas = ['   FRENTE (portão)  -->  ' + (nomes.slice(0, 3).join('  ') || '(vazia)')];
    if (nomes.length > 3) linhas.push('                         ' + nomes.slice(3).join('  ') + '  <-- FIM');
    else linhas[0] += '  <-- FIM';
    if (this.intruso) linhas.push(`   !! ${this.intruso} tentando FURAR a fila (esperando ao lado do portão) !!`);
    return linhas.join('\n');
  }
}

/* =========================================================================
 * DESAFIO 3 — VETORES E ÍNDICES (válvulas de sprinkler)
 * ========================================================================= */

export type EventoValvula = { tipo: 'abrir'; indice: number; apagou: boolean } | { tipo: 'fora'; indice: number };

export class ModeloValvulas {
  public readonly total = 8;
  /** Prateleiras em chamas por índice (placas 3, 6 e 8 => índices 2, 5 e 7). */
  public fogo: boolean[] = [false, false, true, false, false, true, false, true];
  public abertas: boolean[] = new Array(8).fill(false);
  public eventos: EventoValvula[] = [];

  get concluido(): boolean {
    return this.fogo.every((f) => !f);
  }

  abrir(indice: number): string | null {
    if (indice < -this.total || indice >= this.total) {
      this.eventos.push({ tipo: 'fora', indice });
      return `IndexError: ÍNDICE FORA DO LIMITE — valvula[${indice}] não existe (índices válidos: 0 a ${this.total - 1}).`;
    }
    const i = indice < 0 ? this.total + indice : indice;
    this.abertas[i] = true;
    const apagou = this.fogo[i];
    this.fogo[i] = false;
    this.eventos.push({ tipo: 'abrir', indice: i, apagou });
    return null;
  }

  desenhar(): string {
    const placas = Array.from({ length: 8 }, (_, i) => ` ${i + 1} `).join(' ');
    const estado = this.abertas.map((a) => (a ? '~~~' : ' . ')).join(' ');
    return ['   PLACA DA PRATELEIRA: ' + placas, '   SPRINKLER ABERTO:    ' + estado].join('\n');
  }
}

/* =========================================================================
 * DESAFIO 4 — ORDENAÇÃO (carretas de petróleo, troca de vizinhas)
 * ========================================================================= */

export type EventoCarreta = { tipo: 'troca'; i: number; piorou: boolean };

export class ModeloCarretas {
  public pressao: number[] = [42, 17, 88, 23, 65, 50];
  public eventos: EventoCarreta[] = [];
  public trocas = 0;

  get ordenado(): boolean {
    return this.pressao.every((v, i) => i === 0 || this.pressao[i - 1] <= v);
  }

  trocar(a: number, b: number): string | null {
    const n = this.pressao.length;
    if (a < 0 || b < 0 || a >= n || b >= n) return `IndexError: índice fora do limite. As carretas vão de 0 a ${n - 1}.`;
    if (Math.abs(a - b) !== 1) return `O guindaste só troca duas carretas VIZINHAS: trocar(i, i+1). ${a} e ${b} não são vizinhas.`;
    const i = Math.min(a, b);
    const piorou = this.pressao[i] < this.pressao[i + 1];
    [this.pressao[i], this.pressao[i + 1]] = [this.pressao[i + 1], this.pressao[i]];
    this.trocas++;
    this.eventos.push({ tipo: 'troca', i, piorou });
    return null;
  }

  desenhar(): string {
    const valores = this.pressao.map((v) => String(v).padStart(4)).join('');
    const indices = this.pressao.map((_, i) => String(i).padStart(4)).join('');
    return [`   pressao = [${this.pressao.join(', ')}]`, `   valor :${valores}`, `   índice:${indices}`].join('\n');
  }
}

/* =========================================================================
 * LOJA DA CRACA (troca de lacres por itens)
 * ========================================================================= */

export interface ItemLoja {
  codigo: string;
  nome: string;
  preco: number;
  descricao: string;
  aplicar: (estado: EstadoPorto) => string | null;
}

export const ITENS_LOJA: ItemLoja[] = [
  {
    codigo: 'espuma',
    nome: 'Recarga de espuma',
    preco: 2,
    descricao: 'enche o tanque do Canhão de Espuma',
    aplicar: (e) => {
      if (!e.temCanhao) return 'Você nem tem canhão ainda, chefia. Volta depois do Pátio das Pilhas.';
      if (e.espuma >= ESPUMA_MAXIMA) return 'Seu tanque já está cheio.';
      e.espuma = ESPUMA_MAXIMA;
      return null;
    },
  },
  {
    codigo: 'filtro',
    nome: 'Filtro de máscara',
    preco: 4,
    descricao: 'dobra a visão na fumaça por 60 s [F]',
    aplicar: (e) => {
      e.filtros++;
      return null;
    },
  },
  {
    codigo: 'tanque',
    nome: 'Tanque E',
    preco: 6,
    descricao: 'recupera toda a vida quando usado [Q]',
    aplicar: (e) => {
      e.tanquesE++;
      return null;
    },
  },
  {
    codigo: 'vida',
    nome: 'Vida extra',
    preco: 8,
    descricao: '+1 vida',
    aplicar: (e) => {
      e.vidas++;
      return null;
    },
  },
];

export class ModeloLoja {
  public comprou: ItemLoja | null = null;
  private readonly estado: EstadoPorto;

  constructor(estado: EstadoPorto) {
    this.estado = estado;
  }

  get lacres(): number {
    return this.estado.lacres;
  }

  comprar(item: ItemLoja): string | null {
    if (this.estado.lacres < item.preco) return `Faltam ${item.preco - this.estado.lacres} lacre(s) pra isso. A CRACA não faz fiado.`;
    const erro = item.aplicar(this.estado);
    if (erro) return erro;
    this.estado.lacres -= item.preco;
    this.comprou = item;
    return null;
  }

  desenhar(): string {
    return ITENS_LOJA.map((it, i) => `   ${i + 1}) ${it.nome.padEnd(18)} ${String(it.preco).padStart(2)} lacres — ${it.descricao}`).join('\n');
  }
}
