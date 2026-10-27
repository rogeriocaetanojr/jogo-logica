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
    tema: 'Pilha (LIFO: o último a entrar é o primeiro a sair)',
    objetivo: 'Pegar o contêiner ESP, que está no FUNDO da pilhaA.',
    comoResolver: [
      'Olhe a pilhaA: o ESP está embaixo e há 4 contêineres em cima dele. Só dá para tirar o do TOPO.',
      'Tire um contêiner do topo da pilhaA e guarde no topo de outra pilha. Faça isso 4 vezes: pilhaB.push(pilhaA.pop()).',
      'Respeite o limite de 4 por pilha: a pilhaB tem espaço para 2 e a pilhaC para 3. Use as duas.',
      'Com o ESP no topo da pilhaA, um último pilhaA.pop() o pega e o desafio termina.',
    ],
    gabarito: [
      { comando: 'pilhaB.push(pilhaA.pop())', efeito: 'VRD sai de A e vai para B (B fica com 3)' },
      { comando: 'pilhaB.push(pilhaA.pop())', efeito: 'AMA vai para B (B fica cheia, com 4)' },
      { comando: 'pilhaC.push(pilhaA.pop())', efeito: 'AZL vai para C (C fica com 2)' },
      { comando: 'pilhaC.push(pilhaA.pop())', efeito: 'VRM vai para C (C fica com 3)' },
      { comando: 'pilhaA.pop()', efeito: 'o ESP aparece no topo de A e a garra o pega: desafio concluído' },
    ],
  },
  fila: {
    id: 'fila',
    nivel: 2,
    rotulo: 'Fácil',
    tema: 'Fila (FIFO: o primeiro a entrar é o primeiro a sair)',
    objetivo: 'Fazer o REBOCADOR atracar. Ele é o último da fila de 6 navios.',
    comoResolver: [
      'Na fila, sai quem está na FRENTE. Cada fila.dequeue() faz o primeiro navio atracar, até chegar a vez do REBOCADOR.',
      'Depois de certas atracações aparece um NAVIO-VIRUS querendo furar a fila. O terminal avisa com "ALERTA".',
      'Ao ver o ALERTA, digite fila.enqueue(navio) ANTES de qualquer dequeue: o vírus vai para o FIM da fila.',
      'Se der dequeue com um vírus esperando, ele fura a fila e solta vírus no cais.',
    ],
    gabarito: [
      { comando: 'fila.dequeue()', efeito: 'CARGUEIRO atraca; aparece o NAVIO-VIRUS-1 (ALERTA)' },
      { comando: 'fila.enqueue(navio)', efeito: 'o vírus vai para o fim da fila' },
      { comando: 'fila.dequeue()', efeito: 'PETROLEIRO atraca' },
      { comando: 'fila.dequeue()', efeito: 'PESQUEIRO atraca; aparece o NAVIO-VIRUS-2 (ALERTA)' },
      { comando: 'fila.enqueue(navio)', efeito: 'o segundo vírus também vai para o fim' },
      { comando: 'fila.dequeue()', efeito: 'BALSA atraca' },
      { comando: 'fila.dequeue()', efeito: 'GRANELEIRO atraca' },
      { comando: 'fila.dequeue()', efeito: 'REBOCADOR atraca: desafio concluído' },
    ],
  },
  vetor: {
    id: 'vetor',
    nivel: 3,
    rotulo: 'Médio',
    tema: 'Vetores e índices (a contagem começa no zero)',
    objetivo: 'Abrir SÓ as válvulas das prateleiras em chamas, sem usar índice fora de 0 a 7.',
    comoResolver: [
      'Olhe as prateleiras no depósito e anote o número da PLACA de cada uma que está pegando fogo.',
      'A placa começa no 1, mas o vetor começa no 0. Por isso: índice = número da placa - 1.',
      'Escreva uma válvula por foco: valvula[índice].abrir(). Separe vários comandos com ponto e vírgula, ou use um laço com a lista de índices.',
      'Índice fora de 0 a 7 causa um glitch. Exemplo: a placa 2 vira valvula[1] e a placa 5 vira valvula[4].',
      'Abrir válvula de prateleira que não está em chamas não ajuda: confira as placas antes de digitar.',
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
    tema: 'Ordenação (comparar vizinhos e trocar)',
    objetivo: 'Deixar as 6 carretas em ordem CRESCENTE de pressão, da esquerda para a direita.',
    comoResolver: [
      'Compare um par de vizinhas, começando por pressao[0] e pressao[1]. Se a da esquerda for MAIOR, troque as duas. Se não for, não faça nada.',
      'Ande um par para a frente e repita: (1, 2), (2, 3), (3, 4) e (4, 5). Isso é uma "passada" e leva o maior valor para a direita.',
      'Digite status e confira. Se ainda houver algum par fora de ordem, faça outra passada.',
      'Nunca troque quando a da esquerda já é menor: isso piora a ordem e o fogo avança. Só vizinhas: trocar(0, 2) é recusado.',
    ],
    gabarito: [
      { comando: 'trocar(0, 1)', efeito: '42 e 17 trocam: [17, 42, 88, 23, 65, 50]' },
      { comando: 'trocar(2, 3)', efeito: '88 e 23 trocam: [17, 42, 23, 88, 65, 50]' },
      { comando: 'trocar(3, 4)', efeito: '88 e 65 trocam: [17, 42, 23, 65, 88, 50]' },
      { comando: 'trocar(4, 5)', efeito: '88 e 50 trocam: [17, 42, 23, 65, 50, 88]' },
      { comando: 'trocar(1, 2)', efeito: '42 e 23 trocam: [17, 23, 42, 65, 50, 88]' },
      { comando: 'trocar(3, 4)', efeito: '65 e 50 trocam: [17, 23, 42, 50, 65, 88], ordenado' },
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
  const linhas = [
    `=== DESAFIO ${f.nivel}: ${f.tema.split(' (')[0].toUpperCase()} ===`,
    `${textoNivel(f)}   [${barraNivel(f.nivel)}]`,
    `Conceito: ${f.tema}`,
    ...contexto.map((c) => `> ${c}`),
    '',
    quadro,
    '',
    `OBJETIVO: ${f.objetivo}`,
    '',
    'COMO RESOLVER:',
  ];
  f.comoResolver.forEach((p, i) => linhas.push(...itemRecuado(`  ${i + 1}.`, p)));
  linhas.push('', 'Comandos: ajuda (manual)  |  dica  |  status (ver o quadro)  |  solucao (resposta completa)');
  return linhas;
}
