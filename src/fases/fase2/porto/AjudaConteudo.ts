import { FICHAS, barraNivel, quebrarTexto, textoNivel } from './FichaDesafio';
import type { IdFicha } from './FichaDesafio';

/**
 * Conteúdo da ajuda da fase 2. É a fonte única do painel [H] e do comando "ajuda" do terminal,
 * então toda sintaxe listada aqui precisa ser aceita pelo InterpretadorFase2.
 */

export type IdAjuda = 'controles' | 'pilha' | 'fila' | 'vetor' | 'ordenacao' | 'itens';

export interface ItemAjuda {
  /** Tecla ou comando, exatamente como se digita. */
  codigo: string;
  explicacao: string;
}

export interface SecaoAjuda {
  id: IdAjuda;
  titulo: string;
  /** Rótulo curto da aba. */
  aba: string;
  /** Explica o conceito de programação e o objetivo do desafio. */
  conceito: string;
  /** Nível do desafio, como "NÍVEL 2 DE 4 · FÁCIL [■■□□]" (só nas seções de desafio). */
  nivel?: string;
  /** Passo a passo para resolver, vindo da ficha do desafio. */
  comoResolver?: string[];
  itens: ItemAjuda[];
  /** Erros comuns e o que eles significam. */
  cuidados: string[];
}

/** Comandos que existem em todos os desafios; ficam numa linha só para a ajuda não precisar rolar. */
const COMANDOS_TERMINAL: ItemAjuda[] = [
  { codigo: 'status  dica  solucao  limpar', explicacao: 'ver o estado do desafio, pedir uma dica da BOIA, ver a resposta completa passo a passo e apagar o texto do terminal' },
];

export const AJUDA: SecaoAjuda[] = [
  {
    id: 'controles',
    titulo: 'Controles e tela',
    aba: 'Controles',
    conceito: 'Apague focos de incêndio, vença os vírus e use o terminal dos painéis amarelos e azuis para resolver os 4 desafios.',
    itens: [
      { codigo: 'A / D  ou  setas', explicacao: 'andar para os lados' },
      { codigo: 'W, Espaço ou ↑', explicacao: 'pular' },
      { codigo: 'S ou ↓', explicacao: 'agachar; na fumaça densa, agachado você enxerga mais e não tosse' },
      { codigo: 'J ou X', explicacao: 'Pistola de Patch: conserta vírus e inimigos' },
      { codigo: 'K ou C', explicacao: 'extintor ou Canhão de Espuma; segure W para mirar alto e S para mirar baixo' },
      { codigo: 'E', explicacao: 'interagir: painéis, hidrantes, gravações do PORTUS, CRACA' },
      { codigo: 'Q', explicacao: 'usar Tanque E e recuperar toda a vida' },
      { codigo: 'F', explicacao: 'usar Filtro de máscara e enxergar em dobro na fumaça por 60 s' },
      { codigo: 'H', explicacao: 'abrir e fechar esta ajuda (o jogo fica pausado)' },
      { codigo: 'Esc', explicacao: 'voltar ao Hub; dentro do terminal, só fecha o terminal' },
      { codigo: 'Espaço ou Enter', explicacao: 'avançar as falas' },
    ],
    cuidados: [
      'Índice de Fumaça: cada foco apagado tira 5%. A marca verde na barra mostra o menor valor possível, 40%, com os 12 focos apagados.',
      'O progresso é salvo a cada área. Ao voltar, aperte N nos primeiros segundos para recomeçar do início.',
    ],
  },
  {
    id: 'pilha',
    titulo: 'Desafio 1: Pilha',
    aba: 'Pilha',
    conceito:
      'Uma pilha é como uma pilha de pratos: o último que entra é o primeiro que sai (LIFO). Você só mexe no TOPO. ' +
      'Objetivo: tirar o contêiner ESP do fundo da pilhaA. Cada pilha aguenta no máximo 4 contêineres.',
    itens: [
      { codigo: 'pilhaA.pop()', explicacao: 'tira o contêiner do topo da pilha A e o segura na garra' },
      { codigo: 'pilhaB.push(conteiner)', explicacao: 'solta o contêiner da garra no topo da pilha B' },
      { codigo: 'pilhaC.push(pilhaA.pop())', explicacao: 'faz as duas coisas de uma vez: tira de A e coloca em C' },
      { codigo: 'pilhaA.pop(); pilhaB.push(conteiner)', explicacao: 'dois comandos na mesma linha, separados por ;' },
      ...COMANDOS_TERMINAL,
    ],
    cuidados: [
      'A garra segura um contêiner por vez: depois de pop(), faça push() antes de tirar outro.',
      'Pilha cheia (4) recusa push(). Escolha outra pilha.',
      'Mexer no meio (pilhaA[2], remove, insert) trava o guindaste: numa pilha só existe o topo.',
    ],
  },
  {
    id: 'fila',
    titulo: 'Desafio 2: Fila',
    aba: 'Fila',
    conceito:
      'Uma fila é como a fila do caixa: quem chega primeiro é atendido primeiro (FIFO), o contrário da pilha. ' +
      'Objetivo: fazer o REBOCADOR atracar. Ele é o último da fila, então os navios da frente precisam atracar antes.',
    itens: [
      { codigo: 'fila.dequeue()', explicacao: 'o navio da FRENTE da fila atraca e sai dela' },
      { codigo: 'fila.enqueue(navio)', explicacao: 'o navio-vírus que apareceu ao lado do portão vai para o FIM da fila' },
      ...COMANDOS_TERMINAL,
    ],
    cuidados: [
      'Quando surgir um NAVIO-VIRUS, use enqueue(navio) antes de dequeue(). Se der dequeue() primeiro, ele fura a fila e solta vírus no cais.',
      'fila.pop() é de pilha: tira o último. Na fila, quem sai é o da frente.',
      'enqueue só funciona quando há um navio novo esperando.',
    ],
  },
  {
    id: 'vetor',
    titulo: 'Desafio 3: Vetores e índices',
    aba: 'Vetores',
    conceito:
      'Um vetor guarda itens em posições numeradas, e a contagem começa no ZERO. Aqui há 8 válvulas, de valvula[0] a valvula[7]. ' +
      'Objetivo: abrir só as válvulas das prateleiras em chamas. A placa da prateleira é o índice mais 1.',
    itens: [
      { codigo: 'valvula[3].abrir()', explicacao: 'abre a válvula de índice 3, que molha a prateleira de placa 4' },
      { codigo: 'valvula[0].abrir(); valvula[5].abrir()', explicacao: 'abre duas válvulas na mesma linha' },
      { codigo: 'for i in [2, 5, 7]: valvula[i].abrir()', explicacao: 'laço: abre uma válvula para cada índice da lista' },
      { codigo: 'valvula[-1].abrir()', explicacao: 'índice negativo conta de trás para frente: -1 é a última (índice 7)' },
      ...COMANDOS_TERMINAL,
    ],
    cuidados: [
      'Índice fora de 0 a 7 solta um inimigo no depósito.',
      'Vetor usa colchetes: valvula[3], e não valvula(3).',
    ],
  },
  {
    id: 'ordenacao',
    titulo: 'Desafio 4: Ordenação',
    aba: 'Ordenação',
    conceito:
      'Ordenar é colocar os valores em sequência. A técnica mais simples: compare duas carretas vizinhas e, se a da esquerda for maior, troque. Repita até não precisar mais trocar. ' +
      'Objetivo: deixar as 6 carretas em ordem CRESCENTE de pressão.',
    itens: [
      { codigo: 'trocar(0, 1)', explicacao: 'troca de lugar as carretas das posições 0 e 1' },
      { codigo: 'se pressao[0] > pressao[1]: trocar(0, 1)', explicacao: 'só troca se a condição for verdadeira; se for falsa, nada acontece' },
      { codigo: 'trocar(0, 1); trocar(1, 2)', explicacao: 'duas trocas na mesma linha, na ordem em que aparecem' },
      ...COMANDOS_TERMINAL,
    ],
    cuidados: [
      'Só dá para trocar carretas VIZINHAS: trocar(0, 2) é recusado.',
      'Trocar quando a da esquerda já é menor PIORA a ordem, e o fogo avança.',
      'Posições vão de 0 a 5. Os operadores aceitos na condição são >, <, >=, <= e ==.',
    ],
  },
  {
    id: 'itens',
    titulo: 'Lacres e loja da CRACA',
    aba: 'Loja',
    conceito:
      'Lacres soltos pelos inimigos e espalhados pelo porto valem moeda na loja da CRACA, escondida em algum canto do porto. ' +
      'Chegue perto e aperte E para abrir o terminal da loja.',
    itens: [
      { codigo: '1', explicacao: 'Recarga de espuma (2 lacres): enche o tanque do Canhão de Espuma' },
      { codigo: '2', explicacao: 'Filtro de máscara (4 lacres): enxergar em dobro na fumaça, use com F' },
      { codigo: '3', explicacao: 'Tanque E (6 lacres): recupera toda a vida, use com Q' },
      { codigo: '4', explicacao: 'Vida extra (8 lacres): +1 vida' },
      { codigo: 'comprar("filtro")', explicacao: 'também vale pelo nome: espuma, filtro, tanque ou vida' },
      { codigo: 'sair', explicacao: 'fecha a loja' },
    ],
    cuidados: ['Hidrantes recarregam o canhão de graça [E]; caixas de incêndio recarregam o extintor.'],
  },
];

/** Liga a ficha de cada desafio na sua seção da ajuda: nível e passo a passo. */
for (const secao of AJUDA) {
  const ficha = FICHAS[secao.id as IdFicha];
  if (!ficha) continue;
  secao.nivel = `${textoNivel(ficha)}  [${barraNivel(ficha.nivel)}]`;
  secao.comoResolver = ficha.comoResolver;
}

export function obterAjuda(id: IdAjuda): SecaoAjuda {
  return AJUDA.find((s) => s.id === id) ?? AJUDA[0];
}

const LARGURA_TERMINAL = 96;

/** Texto do comando "ajuda" dentro do terminal (monoespaçado, sem formatação). */
export function textoAjudaTerminal(id: IdAjuda): string {
  const s = obterAjuda(id);
  const largura = Math.max(...s.itens.map((i) => i.codigo.length));
  const recuo = ' '.repeat(largura + 6);
  const linhas = [`[${s.titulo.toUpperCase()}]`, ...(s.nivel ? [s.nivel] : []), s.conceito, ''];
  if (s.comoResolver) {
    linhas.push('Como resolver:');
    s.comoResolver.forEach((p, i) => {
      const [primeira, ...resto] = quebrarTexto(p, LARGURA_TERMINAL - 5);
      linhas.push(`  ${i + 1}. ${primeira}`, ...resto.map((r) => `     ${r}`));
    });
    linhas.push('');
  }
  for (const item of s.itens) {
    const [primeira, ...resto] = quebrarTexto(item.explicacao, LARGURA_TERMINAL - largura - 6);
    linhas.push(`  ${item.codigo.padEnd(largura)}  ${primeira}`, ...resto.map((r) => recuo + r));
  }
  if (s.cuidados.length > 0) {
    linhas.push('', 'Cuidado:');
    for (const c of s.cuidados) linhas.push(`  - ${c}`);
  }
  return linhas.join('\n');
}
