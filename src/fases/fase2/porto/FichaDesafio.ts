/**
 * Ficha de cada desafio da fase 2: nível, objetivo, método de resolução e gabarito.
 * É a fonte única do cabeçalho do terminal, do comando "solucao" e das abas do painel [H].
 * Todo comando listado em `gabarito` precisa ser aceito pelo InterpretadorFase2.
 */

export type IdFicha = 'pilha' | 'fila' | 'vetor' | 'ordenacao';

export interface PassoGabarito {
  /** Comando exatamente como se digita. */
  comando: string;
  /** O que acontece no jogo depois dele. */
  efeito: string;
}

export interface FichaDesafio {
  id: IdFicha;
  /** De 1 a 4, na ordem em que os desafios aparecem. */
  nivel: number;
  rotulo: 'Iniciante' | 'Fácil' | 'Médio' | 'Difícil';
  /** Conceito de programação treinado. */
  tema: string;
  objetivo: string;
  /** Método em passos curtos; não entrega a resposta pronta. */
  comoResolver: string[];
  /** Resposta completa, mostrada só pelo comando "solucao". */
  gabarito: PassoGabarito[];
}

export const TOTAL_NIVEIS = 4;

export const FICHAS: Record<IdFicha, FichaDesafio> = {
  pilha: {
    id: 'pilha',
    nivel: 1,
    rotulo: 'Iniciante',
    tema: 'Pilha (só se mexe no topo)',
    objetivo: 'Pegar o contêiner ESP, que está embaixo na pilhaA.',
    comoResolver: [
      'Só dá para pegar o de CIMA. Tire os 2 de cima da pilhaA e guarde em outra pilha: pilhaB.push(pilhaA.pop())',
      'Com o ESP no topo, pilhaA.pop() pega ele.',
    ],
    gabarito: [
      { comando: 'pilhaB.push(pilhaA.pop())', efeito: 'o AMA vai de A para B' },
      { comando: 'pilhaC.push(pilhaA.pop())', efeito: 'o AZL vai de A para C' },
      { comando: 'pilhaA.pop()', efeito: 'o ESP aparece no topo de A e a garra o pega: desafio concluído' },
    ],
  },
  fila: {
    id: 'fila',
    nivel: 2,
    rotulo: 'Fácil',
    tema: 'Fila (o primeiro a chegar é o primeiro a sair)',
    objetivo: 'Fazer o REBOCADOR (o último da fila) atracar.',
    comoResolver: [
      'Quem atraca é o da FRENTE: fila.dequeue()',
      'Se aparecer um NAVIO-VIRUS (ALERTA), mande ele para o FIM antes de continuar: fila.enqueue(navio)',
    ],
    gabarito: [
      { comando: 'fila.dequeue()', efeito: 'CARGUEIRO atraca; aparece o NAVIO-VIRUS-1 (ALERTA)' },
      { comando: 'fila.enqueue(navio)', efeito: 'o vírus vai para o fim da fila' },
      { comando: 'fila.dequeue()', efeito: 'PESQUEIRO atraca' },
      { comando: 'fila.dequeue()', efeito: 'REBOCADOR atraca: desafio concluído' },
    ],
  },
  vetor: {
    id: 'vetor',
    nivel: 3,
    rotulo: 'Médio',
    tema: 'Vetores (o computador conta a partir do zero)',
    objetivo: 'Apagar o fogo das 3 prateleiras em chamas.',
    comoResolver: [
      'Olhe a PLACA de cada prateleira pegando fogo. A válvula é a placa menos 1: placa 3 = valvula[2].',
      'Digite: valvula[2].abrir()  (para vários: valvula[2].abrir(); valvula[5].abrir())',
    ],
    gabarito: [
      { comando: 'valvula[2].abrir()', efeito: 'placa 3: fogo apagado' },
      { comando: 'valvula[5].abrir()', efeito: 'placa 6: fogo apagado' },
      { comando: 'valvula[7].abrir()', efeito: 'placa 8: fogo apagado, desafio concluído' },
      { comando: 'for i in [2, 5, 7]: valvula[i].abrir()', efeito: 'o mesmo resultado numa única linha, com laço' },
    ],
  },
  ordenacao: {
    id: 'ordenacao',
    nivel: 4,
    rotulo: 'Difícil',
    tema: 'Ordenação (trocar para pôr em ordem)',
    objetivo: 'Deixar as carretas em ordem crescente: da menor para a maior.',
    comoResolver: [
      'Se a carreta da esquerda for MAIOR que a vizinha, troque as duas: trocar(0, 1)',
      'Confira com status e repita até ficar em ordem.',
    ],
    gabarito: [
      { comando: 'trocar(0, 1)', efeito: '42 e 17 trocam: [17, 42, 23, 50, 65, 88]' },
      { comando: 'trocar(1, 2)', efeito: '42 e 23 trocam: [17, 23, 42, 50, 65, 88], ordenado' },
    ],
  },
};

/** Barra de nível: "■■□□" para o nível 2 de 4. */
export function barraNivel(nivel: number): string {
  return '■'.repeat(nivel) + '□'.repeat(TOTAL_NIVEIS - nivel);
}

/** Texto curto de nível para o cabeçalho do terminal e para as abas da ajuda. */
export function textoNivel(f: FichaDesafio): string {
  return `NÍVEL ${f.nivel} DE ${TOTAL_NIVEIS} · ${f.rotulo.toUpperCase()}`;
}

const LARGURA = 92;

/** Quebra o texto em linhas de no máximo `max` caracteres, sem cortar palavras. */
export function quebrarTexto(texto: string, max: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    if (atual && atual.length + 1 + palavra.length > max) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = atual ? `${atual} ${palavra}` : palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Item numerado ou com marcador, com recuo nas linhas seguintes. */
function itemRecuado(marcador: string, texto: string): string[] {
  const recuo = ' '.repeat(marcador.length + 1);
  const [primeira, ...resto] = quebrarTexto(texto, LARGURA - marcador.length - 1);
  return [`${marcador} ${primeira}`, ...resto.map((r) => recuo + r)];
}

/** Comandos que resolvem o desafio, exatamente como se digita (o terminal mostra com o efeito de cada um). */
export function linhasGabarito(f: FichaDesafio): string[] {
  const linhas = [`[GABARITO · ${f.tema.split(' (')[0].toUpperCase()}] Digite os comandos nesta ordem, um por vez:`, ''];
  const largura = Math.max(...f.gabarito.map((p) => p.comando.length));
  f.gabarito.forEach((p, i) => {
    const comando = `${String(i + 1).padStart(2)}. ${p.comando.padEnd(largura)}`;
    linhas.push(...itemRecuado(`${comando}  ->`, p.efeito));
  });
  return linhas;
}

/**
 * Texto de abertura do terminal: nível, conceito, quadro atual, objetivo e passo a passo.
 * O mais útil para agir (como resolver e comandos) fica no fim, que é onde o terminal rola ao abrir.
 */
export function linhasAbertura(f: FichaDesafio, contexto: string[], quadro: string): string[] {
  const linhas = [...contexto.map((c) => `> ${c}`), '', quadro, '', `OBJETIVO: ${f.objetivo}`, ''];
  f.comoResolver.forEach((p, i) => linhas.push(...itemRecuado(`  ${i + 1}.`, p)));
  linhas.push('', 'Travou? Digite dica, solucao (resposta passo a passo) ou ajuda.');
  return linhas;
}
