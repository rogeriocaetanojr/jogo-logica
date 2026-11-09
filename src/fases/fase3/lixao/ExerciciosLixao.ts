/**
 * Os 3 exercícios de Python dos terminais do Lixão (sol, névoa e chuva) e a validação por
 * comparação de texto normalizado. Nada de Python é executado: a resposta digitada é
 * normalizada (espaços, quebras de linha, indentação, aspas e o nome da variável do for) e
 * comparada com as respostas aceitas.
 *
 * O campo do terminal recebe uma linha por Enter. Uma resposta de duas linhas pode vir em
 * duas submissões: a primeira fica pendente (ver `linhaPendente` em ContextoExercicio) e a
 * segunda completa.
 */

export interface Exercicio {
  /** Linhas do enunciado, impressas no topo do terminal. */
  enunciado: readonly string[];
  /** Mensagem do terminal ao acertar. */
  acerto: string;
  /**
   * Respostas aceitas, cada uma como lista de linhas já normalizadas (ver `normalizarLinha`).
   * Uma linha que termina em ":" pode receber a seguinte no mesmo Enter.
   */
  respostas: ReadonlyArray<readonly string[]>;
}

/** Um exercício por trecho com terminal, na ordem dos trechos (sol, névoa, chuva). */
export const EXERCICIOS: readonly Exercicio[] = [
  {
    enunciado: [
      'EXERCÍCIO 1 // GARRA DE ENTULHO',
      'A garra precisa remover 3 blocos de entulho.',
      'Use um for para chamar remover() 3 vezes.',
      'Digite o código em uma linha e aperte Enter.',
    ],
    acerto: 'Garra acionada. remover() x3. O entulho desaba.',
    respostas: [
      ['for _ in range(3):', 'remover()'],
      ['for _ in range(0,3):', 'remover()'],
    ],
  },
  {
    enunciado: [
      'EXERCÍCIO 2 // PONTE SOBRE O VÃO',
      'Crie a variável tamanho com valor 5 e chame ponte(tamanho).',
      'Pode ser em uma linha ou em duas: a primeira fica guardada até a segunda.',
    ],
    acerto: 'tamanho = 5. ponte(5) montada. Pode atravessar.',
    respostas: [['tamanho=5', 'ponte(tamanho)']],
  },
  {
    enunciado: [
      'EXERCÍCIO 3 // PORTA COM SENSOR',
      'A porta só abre se a energia for maior que 50.',
      'Escreva um if que chama abrir() quando energia > 50.',
      'Digite o código em uma linha e aperte Enter.',
    ],
    acerto: 'energia > 50: verdadeiro. abrir(). O portão sobe.',
    respostas: [
      ['if energia>50:', 'abrir()'],
      ['if 50<energia:', 'abrir()'],
    ],
  },
];

/** Quanto do lixão cada exercício resolvido limpa, no medidor da HUD. */
export const LIMPEZA_POR_EXERCICIO = 25;

/** Deboches do terminal ao errar (sorteados sem repetir o anterior). Errar não pune. */
export const DEBOCHES: readonly string[] = [
  'Isso não é Python. Isso é um grito de socorro com parênteses.',
  'A sucata aqui tem mais lógica que esse código, e a sucata está desligada.',
  'Interessante. Errado, mas interessante. Igual a um pombo de três patas.',
  'Rodei na minha cabeça. Minha cabeça travou. Tenta de novo.',
  'Você digitou isso com o cotovelo? Sério, quero saber a técnica.',
  'Esse código faria o compilador pedir férias. Lê o enunciado de novo.',
  'Perto. Tipo Plutão é perto da Terra. Mais uma vez.',
  'Nem o drone mais burro do lixão aceitaria isso. E eles são bem burros.',
];

/** Estado de uma sessão de terminal: qual exercício e a linha já aceita, se houver. */
export interface ContextoExercicio {
  exercicio: number;
  /** Primeira linha de uma resposta em duas partes, já normalizada; '' quando não há. */
  linhaPendente: string;
  [chave: string]: unknown;
}

/**
 * Normaliza uma linha de código: tira indentação e espaços repetidos, remove espaços em
 * volta de pontuação, troca aspas duplas por simples e o nome da variável do for por "_".
 */
export function normalizarLinha(linha: string): string {
  let s = linha.trim().replace(/\s+/g, ' ');
  s = s.replace(/"/g, "'");
  s = s.replace(/\s*([()=:<>,;])\s*/g, '$1');
  s = s.replace(/^for [A-Za-z_]\w* in /, 'for _ in ');
  return s;
}

/** Junta linhas normalizadas no formato de uma linha só: ":" cola a seguinte, senão ";". */
export function juntarLinhas(linhas: readonly string[]): string {
  return linhas.reduce((acc, l) => (acc === '' ? l : acc.endsWith(':') ? acc + l : `${acc};${l}`), '');
}

/** Separa a entrada em linhas normalizadas; aceita quebras de linha e ";" entre comandos. */
function separarEntrada(entrada: string): string[] {
  return entrada
    .split(/\r?\n|;/)
    .map(normalizarLinha)
    .filter((l) => l !== '');
}

export type AvaliacaoExercicio =
  | { tipo: 'acerto' }
  | { tipo: 'parcial'; linhaPendente: string }
  | { tipo: 'erro' };

/**
 * Compara a entrada (mais a linha pendente, se houver) com as respostas do exercício.
 * "parcial" quando o que foi digitado até agora é o começo exato de uma resposta aceita.
 */
export function avaliarResposta(exercicio: Exercicio, entrada: string, linhaPendente: string): AvaliacaoExercicio {
  const linhas = separarEntrada(`${linhaPendente}\n${entrada}`);
  const digitado = juntarLinhas(linhas);
  if (digitado === '') return { tipo: 'erro' };

  for (const resposta of exercicio.respostas) {
    if (juntarLinhas(resposta) === digitado) return { tipo: 'acerto' };
  }
  for (const resposta of exercicio.respostas) {
    for (let k = 1; k < resposta.length; k++) {
      if (juntarLinhas(resposta.slice(0, k)) === digitado) return { tipo: 'parcial', linhaPendente: digitado };
    }
  }
  return { tipo: 'erro' };
}
