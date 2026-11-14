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
  /** Deboches específicos deste exercício ao errar (somados aos gerais de DEBOCHES). */
  deboches: readonly string[];
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
      'EXERCÍCIO 1 // TRIAGEM',
      'Uma bateria velha chegou na esteira e precisa ir para a caçamba certa.',
      'TAREFA: crie a variável cacamba e guarde nela o texto "eletronico".',
      'Lembre: texto em Python vai entre aspas.',
      'Exemplo parecido: cor = "verde"',
      'Digite sua resposta e aperte Enter.',
    ],
    deboches: [
      'Até a bateria velha entendeu o enunciado. E ela tá sem carga.',
      'A bateria está vazando ácido, e mesmo assim ela pensa melhor que você.',
      'Tava escrito. No enunciado. Que você claramente não leu.',
      'Isso é aula do primeiro dia, gênio. Você faltou?',
      'Errou a triagem. Parabéns, agora você também vai pra caçamba de lixo.',
      'Até a esteira parou de girar de vergonha alheia.',
      'O exemplo tá ali em cima, implorando pra ser lido.',
      'Se burrice reciclasse, esse lixão estaria limpo agora.',
      'Você separa lixo assim em casa também? Coitada da sua rua.',
      'A bateria pediu pra ser jogada no rio. Menos tóxico que esse código.',
    ],
    acerto: 'cacamba = "eletronico". Sucata separada e prensada: a rampa está pronta.',
    respostas: [["cacamba='eletronico'"], ["cacamba='eletrônico'"], ["caçamba='eletronico'"], ["caçamba='eletrônico'"]],
  },
  {
    enunciado: [
      'EXERCÍCIO 2 // ESCADA DO RECICLA',
      'A passarela é alta demais para pular. O Recicla pode montar uma escada.',
      'TAREFA (2 passos):',
      '  1) Crie a variável degraus com o valor 4 (número, sem aspas).',
      '  2) Chame a função construir passando degraus: construir(degraus)',
      'Digite o passo 1 e aperte Enter; depois o passo 2 e Enter.',
      'Ou tudo numa linha só, separando com ";".',
    ],
    deboches: [
      'O Recicla tem um parafuso só e entendeu. Você tem quantos?',
      'O Recicla tá parado olhando pra você. Ele tá com pena. Robô com pena.',
      'Respira. Lê de novo. Devagar. Como se fosse pra uma criança.',
      'Com esse código nem escada rolante funcionaria.',
      'Você chamou a função como quem chama o cachorro do vizinho: errado.',
      'O Recicla já empilhou mais sucata do que você acertou linhas.',
      'Escada de 4 degraus e você travou no primeiro. Simbólico.',
      'Tá tudo no enunciado. Tudinho. Mastigado.',
      'Nesse ritmo é mais rápido o Recicla aprender a voar.',
      'Até um drone quebrado montaria essa escada. De cabeça pra baixo.',
    ],
    acerto: 'degraus = 4. construir(4): o Recicla está empilhando os blocos!',
    respostas: [
      ['degraus=4', 'construir(degraus)'],
      ['degraus=4', 'construir(4)'],
    ],
  },
  {
    enunciado: [
      'EXERCÍCIO 3 // CORREDOR ELETRIFICADO',
      'O corredor à frente está eletrificado: encostar é fatal.',
      'O disjuntor só pode ser desligado se a energia for maior que 50.',
      'TAREFA: escreva um if que testa se energia > 50 e, se for,',
      'chama a função desligar().',
      'Exemplo parecido: if vida < 3: curar()',
      'Pode digitar em uma linha ou em duas (o if, Enter, depois desligar()).',
      'ATENÇÃO: a energia volta em 7 segundos. Depois de acertar, corra!',
    ],
    deboches: [
      'Você vai morrer eletrocutado por pura preguiça de ler.',
      'O corredor tá rindo de você. Com faíscas. Literalmente.',
      'Lógica não é "talvez", não é "acho que". Ou é, ou não é.',
      'O if não perdoa. E eu muito menos.',
      'Com essa lógica, a energia vai te desligar primeiro.',
      'Um if. UM. Tem gente que escreve mil por dia sem chorar.',
      'Se encostar no corredor com esse código, pelo menos vira luminária.',
      'Seu código é tão triste que o disjuntor ficou com dó.',
      'O disjuntor tá esperando há tanto tempo que já criou ferrugem.',
      'Até o chefão do lixão escreveria isso certo. E ele é feito de lixo.',
    ],
    acerto: 'energia > 50: verdadeiro. desligar(). CORRA!',
    respostas: [
      ['if energia>50:', 'desligar()'],
      ['if 50<energia:', 'desligar()'],
    ],
  },
];

/** Quanto do lixão cada exercício resolvido limpa, no medidor da HUD. */
export const LIMPEZA_POR_EXERCICIO = 25;

/** Deboches gerais do terminal ao errar, somados aos de cada exercício (sorteados sem repetir o anterior). Errar não pune. */
export const DEBOCHES: readonly string[] = [
  'Isso não é Python. Isso é um grito de socorro com parênteses.',
  'A sucata aqui tem mais lógica que esse código, e a sucata está desligada.',
  'Interessante. Errado, mas interessante. Igual a um pombo de três patas.',
  'Rodei na minha cabeça. Minha cabeça travou. Tenta de novo.',
  'Você digitou isso com o cotovelo? Sério, quero saber a técnica.',
  'Esse código faria o compilador pedir férias. Lê o enunciado de novo.',
  'Perto. Tipo Plutão é perto da Terra. Mais uma vez.',
  'Nem o drone mais burro do lixão aceitaria isso. E eles são bem burros.',
  'Seu código é o lixo eletrônico mais tóxico desse lugar inteiro.',
  'Já pensou em largar a programação e virar peso de papel?',
  'Errado de novo. Você é consistente, isso eu admito.',
  'O terminal está considerando se autodesligar pra não ler mais isso.',
  'Que tal ler o enunciado? É de graça, não morde.',
  'Já vi torradeira com mais raciocínio lógico.',
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
