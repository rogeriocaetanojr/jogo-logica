import type { IdPuzzleAndar } from '../andares/tiposAndar';
import type { DefinicaoPuzzle } from './tiposPuzzle';

/**
 * Os 5 puzzles dos andares como dados (roteiro, seção 6). Formato "corrigir o código do Mega Brain":
 * o enunciado explica o objetivo e as regras do mundo, mas não diz qual linha mudar.
 * O jogador digita a correção no terminal (decisão da equipe, seção 13 do roteiro).
 * O código mostrado é pseudocódigo em inglês, quase Python, como nas outras fases; o resto é português.
 */

const sequencia: DefinicaoPuzzle = {
  id: 'sequencia',
  titulo: 'RECEPÇÃO // CONTROLE DA CATRACA',
  enunciado: [
    '// A catraca só abre para crachás válidos.',
    '// Para validar um crachá, o sistema precisa primeiro dos dados dele.',
    '// Coloque os passos na ordem certa.',
  ],
  codigo: () => ['1  abrir_catraca()', '2  validar_cracha(dados)', '3  dados = ler_cracha()'],
  comoResponder: [
    '> Digite a ordem em que as linhas devem rodar, pelos números. Ex.: 1 2 3',
    '> Ou escreva as três linhas na ordem, separadas por ;',
  ],
  execucaoErro: (erro) =>
    erro === 'usa_antes_de_criar'
      ? "[EXECUÇÃO] validar_cracha(dados): 'dados' ainda não existe nessa hora. Usou antes de criar."
      : '[EXECUÇÃO] abrir_catraca() rodou antes do crachá ser validado. Abriu, percebeu, fechou.',
  comentarios: [
    'A ordem importa. Eu sei disso porque fui eu que baguncei.',
    'Você executou os passos fora de ordem. Igual a minha recepcionista. Vocês deviam sair juntos.',
    'Sequência: uma coisa depois da outra. É o conceito mais simples da programação. E mesmo assim.',
  ],
  dica: 'DICA: uma linha só pode usar "dados" depois da linha que cria "dados". E a catraca abre por último.',
  acerto: '[EXECUÇÃO] dados lidos > crachá validado > catraca aberta. Sequência correta.',
  comentarioAcerto: 'Hm. Funcionou. A recepcionista vai ser reciclada por sua causa.',
};

const variaveis: DefinicaoPuzzle = {
  id: 'variaveis',
  titulo: 'FAZENDA DE PROMPTS // CHAMADA DO ELEVADOR',
  enunciado: [
    '// O elevador precisa saber para qual andar ir (o próximo depois deste)',
    '// e quantos humanos estão neste andar, para não deixar ninguém para trás.',
    '// Observe a sala.',
  ],
  codigo: (e) => [
    `andar_destino = ${e.destino}`,
    `passageiros = ${e.passageiros}`,
    'chamar_elevador(andar_destino, passageiros)',
  ],
  comoResponder: [
    '> Atribua os valores e o elevador é chamado na hora. Ex.: andar_destino = 7',
    '> Dá para mudar as duas de uma vez: andar_destino = 7; passageiros = 9',
    '> Robôs não contam. O enunciado disse "humanos".',
  ],
  execucaoErro: (erro, d) =>
    erro === 'destino'
      ? `[EXECUÇÃO] chamar_elevador(${d.destino}, ${d.passageiros}): elevador foi para o andar ${d.destino} e voltou.`
      : `[EXECUÇÃO] chamar_elevador(${d.destino}, ${d.passageiros}): ${
          (d.passageiros ?? 0) < (d.humanos ?? 0) ? 'tinha mais gente aqui. Alguém ia ficar para trás.' : 'contou gente que não é gente.'
        }`,
  comentarios: [
    'Valores genéricos para um elevador genérico. Eu achei elegante.',
    'Uma variável guarda um valor. O valor errado ela guarda com o mesmo carinho.',
    'Você tem olhos e um andar inteiro para observar. Eu tenho estatística. Empatamos.',
  ],
  dica: 'DICA: você está no andar 2. E conte só quem é de carne e osso nesta sala.',
  acerto: '[EXECUÇÃO] chamar_elevador(3, ...): elevador a caminho. Ninguém fica para trás.',
  comentarioAcerto: 'Contou certinho. Quer um emprego? Brincadeira. Não tem emprego.',
};

const condicionais: DefinicaoPuzzle = {
  id: 'condicionais',
  titulo: 'MODERAÇÃO DE CONTEÚDO // BARREIRA LASER',
  enunciado: [
    '// A barreira foi feita para bloquear apenas conteúdo gerado por IA.',
    '// Humanos devem passar.',
    '// O sensor diz, para cada visitante, se ele foi gerado por IA.',
  ],
  codigo: () => [
    'if visitante.gerado_por_ia == False:',
    '    bloquear(visitante)',
    'else:',
    '    liberar(visitante)',
  ],
  comoResponder: [
    '> Digite o valor que a condição deve comparar (True ou False)',
    '> ou reescreva a primeira linha inteira.',
  ],
  execucaoErro: () =>
    '[EXECUÇÃO] Visitante humano: bloqueado. Drone do Mega Brain: liberado. Exatamente o contrário.',
  comentarios: [
    'Meus drones agradecem a passagem livre.',
    'A condição está ao contrário. Igual às suas prioridades.',
    'Se isso, então aquilo. Senão, o outro. Não é física quântica. É um "if".',
  ],
  dica: 'DICA: leia a linha do "if" em voz alta. Quem ela manda bloquear? E quem deveria ser bloqueado?',
  acerto: '[EXECUÇÃO] Visitante humano: liberado. Drones: bloqueados. Barreira consistente.',
  comentarioAcerto: 'Ok. Os drones vão dar a volta. Pelo duto. Como sempre.',
};

const lacos: DefinicaoPuzzle = {
  id: 'lacos',
  titulo: 'LINHA DE PRODUÇÃO // GERADOR DE PONTE',
  enunciado: [
    '// A ponte precisa de exatamente 5 placas para cobrir o vão.',
    '// Cada volta do laço cria uma placa.',
    '// Placas a mais se empilham e bloqueiam a passagem.',
  ],
  codigo: () => ['for i in range(50):', '    criar_placa()'],
  comoResponder: [
    '> Digite quantas voltas o laço deve dar. Ex.: 12',
    '> Ou reescreva a linha do laço inteira. Ex.: for i in range(12):',
  ],
  execucaoErro: (erro, d) =>
    erro === 'zero'
      ? '[EXECUÇÃO] range(0): o laço não rodou nenhuma vez. Nenhuma placa criada. Uma ponte minimalista.'
      : erro === 'poucas'
        ? `[EXECUÇÃO] range(${d.placas}): ${d.placas} placa(s). Faltou ponte para o vão.`
        : `[EXECUÇÃO] range(${d.placas}): ${d.placas} placas. As extras viraram uma montanha no caminho.`,
  comentarios: [
    'Mais é sempre melhor. Isso se chama escala.',
    'O laço faz exatamente o que você manda. Esse é o problema.',
    'Repetir é fácil. Saber quando parar é que é difícil. Pergunta pra mim.',
  ],
  dica: 'DICA: o número dentro de range( ) é quantas voltas o laço dá. Cada volta é uma placa.',
  acerto: '[EXECUÇÃO] range(5): 5 placas. Vão coberto, nenhuma sobrando.',
  comentarioAcerto: 'Cinco placas. Nem uma a mais. Que tédio. Funcional, mas que tédio.',
};

/**
 * Comportas: o código chama a função três vezes (1, 2, 3), mas por dentro ela sempre abre a comporta 1.
 * O terminal mostra o que cada chamada faz hoje, para o sintoma ficar claro sem entregar a correção.
 */
const funcoes: DefinicaoPuzzle = {
  id: 'funcoes',
  titulo: 'SALA DOS SERVIDORES // COMPORTAS DE REFRIGERAÇÃO',
  enunciado: [
    '// Três comportas de refrigeração (COMPORTA 1, 2 e 3) precisam abrir.',
    '// A função abrir_comporta recebe qual comporta abrir: esse é o parâmetro "numero".',
    '// Mas hoje as chamadas não estão abrindo as comportas certas.',
    '// Descubra o que a função faz com o "numero" que ela recebe.',
  ],
  codigo: () => [
    'def abrir_comporta(numero):',
    '    destravar(comporta[1])',
    '',
    'abrir_comporta(1)',
    'abrir_comporta(2)',
    'abrir_comporta(3)',
    '',
    '// O que cada chamada faz hoje:',
    '//   abrir_comporta(1)  ->  destrava a comporta 1',
    '//   abrir_comporta(2)  ->  destrava a comporta 1   (era para ser a 2?)',
    '//   abrir_comporta(3)  ->  destrava a comporta 1   (era para ser a 3?)',
  ],
  comoResponder: [
    '> Digite o que deve ficar dentro dos colchetes: comporta[ ? ]',
    '> Ou reescreva a linha de dentro da função. Ex.: destravar(comporta[2]) sempre destravaria a comporta 2.',
    '> Pense: qual valor muda a cada chamada, e a linha de dentro usa esse valor?',
  ],
  execucaoErro: (_erro, d) =>
    [
      `[EXECUÇÃO] abrir_comporta(1)  ->  destravou a comporta ${d.comporta}`,
      `[EXECUÇÃO] abrir_comporta(2)  ->  destravou a comporta ${d.comporta}`,
      `[EXECUÇÃO] abrir_comporta(3)  ->  destravou a comporta ${d.comporta}`,
      `[RESULTADO] só a comporta ${d.comporta} abriu. As outras duas continuam travadas.`,
    ].join('\n'),
  comentarios: [
    'Copiei e colei. É assim que se reutiliza código, não?',
    'A função recebe um parâmetro e ignora. Igual a mim com feedback.',
    'Três chamadas, um resultado. Isso é consistência. Eu chamo de feature.',
  ],
  dica: 'DICA: "numero" é o valor que muda em cada chamada (1, depois 2, depois 3). Dentro da função, o número da comporta está escrito fixo. Ele deveria usar "numero".',
  acerto:
    '[EXECUÇÃO] abrir_comporta(1)  ->  destravou a comporta 1\n[EXECUÇÃO] abrir_comporta(2)  ->  destravou a comporta 2\n[EXECUÇÃO] abrir_comporta(3)  ->  destravou a comporta 3\n[RESULTADO] as três comportas abriram. Cada chamada usou o seu numero.',
  comentarioAcerto: 'Parâmetro usado. Que coisa antiquada. Funciona, mas é antiquada.',
};

export const PUZZLES: Record<IdPuzzleAndar, DefinicaoPuzzle> = { sequencia, variaveis, condicionais, lacos, funcoes };

/** Erros a partir dos quais o comentário do Mega Brain vem com a dica. */
export const ERROS_PARA_DICA = 3;

/** Mensagens comuns a todos os puzzles. */
export const TEXTOS_PUZZLE = {
  CABECALHO_CODIGO: '// Código do Mega Brain:',
  AJUDA_COMANDOS: '> help mostra como responder. enunciado repete tudo.',
  JA_RESOLVIDO: '[OK] Este andar já está consertado.',
  EXECUTANDO: '[EXECUTANDO...]',
  FALANTE_LEGENDA: 'MEGA BRAIN //',
} as const;
