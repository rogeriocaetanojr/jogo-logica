import type { LinhaDialogo } from '../../../compartilhado/tipos';
import { avatarHtml, obterRetratos } from './SpritesPorto';

export type Falante = 'boia' | 'capitao' | 'craca' | 'portus' | 'megabrain' | 'estivador' | 'operador';

const ROTULOS: Record<Exclude<Falante, 'operador'>, string> = {
  boia: '> BOIA // ROBÔ-BOIA DE SINALIZAÇÃO',
  capitao: '> CAPITÃO PRÁTICO // EX-PRÁTICO DO PORTO DE BUG',
  craca: '> CRACA // MERCADO DEBAIXO DO PÍER',
  portus: '> PORTUS // GRAVAÇÃO RECUPERADA',
  megabrain: '> MEGABRAIN // TRANSMISSÃO HOSTIL',
  estivador: '> ESTIVADOR-07 // ROBÔ DE CARGA',
};

/**
 * Monta uma fala para o comunicador DOM com retrato em pixel art.
 * "{nome}" é trocado pelo nome do operador escolhido (Alvares ou Reis).
 */
export function fala(quem: Falante, texto: string, nomeOperador: string): LinhaDialogo {
  const retratos = obterRetratos();
  const textoFinal = texto.replace(/\{nome\}/g, nomeOperador);
  if (quem === 'operador') {
    return {
      falante: `> ${nomeOperador.toUpperCase()} // OPERADOR DE LOGÍSTICA`,
      texto: textoFinal,
    };
  }
  const avatar = avatarHtml(retratos[quem], quem.toUpperCase());
  return { falante: ROTULOS[quem], texto: textoFinal, avatar };
}

/** Sequência de falas no formato [falante, texto]. */
export function roteiro(linhas: Array<[Falante, string]>, nomeOperador: string): LinhaDialogo[] {
  return linhas.map(([quem, texto]) => fala(quem, texto, nomeOperador));
}

/** As 5 gravações do PORTUS (as três últimas são pistas da luta contra o KRAKEN.EXE). */
export const GRAVACOES_PORTUS: string[] = [
  'Eu organizava 3.000 contêineres por dia. Então alguém instalou uma atualização sem assinatura.',
  'Os novos comandos falam de outros países. O porto não é o alvo. É a porta.',
  'Meus braços de atracação trabalham em fila. O primeiro que se move é o primeiro que volta.',
  'Se eu for tomado, vou proteger meu núcleo em pilha. O último escudo colocado é o primeiro que cai.',
  'Na base do servidor há um cabo-mestre. Puxe-o, e a espuma de emergência será liberada.',
];

/** Dicas da BOIA para cada desafio (texto do documento de design). */
export const DICAS_BOIA: string[] = [
  'Pilha é igual pilha de pratos: o último que você coloca é o primeiro que você tira.',
  'Fila é a fila do caixa: quem chegou primeiro é atendido primeiro. É o contrário da pilha!',
  'Para o computador, a primeira gaveta é a gaveta zero.',
  'Compare duas de cada vez. Se a da esquerda for maior, troque. Repita até tudo ficar em ordem.',
];

export const FALAS = {
  abertura: [
    ['megabrain', 'PORTUS conectado. Guindastes, navios e caminhões agora obedecem a MIM. O porto de Bug é só a porta. Depois dele, o mundo.'],
    ['boia', 'Calma, {nome}. Todo porto tem uma ordem. A gente só precisa descobrir qual.'],
    ['boia', 'Eu sou a BOIA, robô de sinalização do cais. O MegaBrain infectou o PORTUS, a IA que organizava o porto. Os guindastes soltaram contêineres sozinhos e tombaram carretas de petróleo do lado do depósito de pneus.'],
    ['boia', 'O fogo se espalhou pelo óleo e a fumaça preta tomou tudo. Nosso objetivo: chegar à torre do servidor central, no meio da baía, e desconectar o MegaBrain.'],
    ['boia', 'Cada foco de incêndio apagado tira 5% do ÍNDICE DE FUMAÇA lá em cima. Quanto menor o índice, mais clara vai estar a torre quando a gente chegar.'],
  ] as Array<[Falante, string]>,
  capitao: [
    ['capitao', 'Rapaz, isso não é jeito de atracar! Foi o tal MegaBrain: entrou pelo PORTUS feito rato em porão.'],
    ['capitao', 'Quarenta anos guiando navio até o cais e nunca vi um guindaste com vontade própria. E aquela cancela não para de abrir e fechar!'],
    ['capitao', 'Toma esse extintor da guarita. Três jatos, nem um a mais. Mire na base do fogo, não nas labaredas.'],
    ['boia', 'Aperte [K] para usar o extintor e [J] para a Pistola de Patch, que conserta os vírus na marra.'],
  ] as Array<[Falante, string]>,
  capitaoDepois: [['capitao', 'Ainda aqui, rapaz? O fogo não espera maré boa. Siga para o Pátio das Pilhas!']] as Array<[Falante, string]>,
  primeiroFogo: [
    ['boia', 'Foco de incêndio bloqueando a pista! Chegue perto e use o extintor [K].'],
  ] as Array<[Falante, string]>,
  oleo: [['boia', 'Cuidado com as poças de óleo: o chão fica escorregadio e qualquer chama acende tudo.']] as Array<[Falante, string]>,
  fimPortaria: [
    ['boia', 'O Pátio das Pilhas fica logo depois do portão. O PORTUS guardava um Canhão de Espuma num contêiner de emergência por lá.'],
  ] as Array<[Falante, string]>,

  patioEntrada: [
    ['boia', 'Olha os painéis de LED: cada vez que o guindaste mexe, ele escreve push() ou pop(). push coloca no topo, pop tira do topo.'],
    ['boia', 'Leia o padrão dos guindastes para subir pelas pilhas antes que elas mudem. E fique de olho nas sombras no chão: contêiner caindo!'],
  ] as Array<[Falante, string]>,
  desafio1Intro: [
    ['boia', 'Achei! O contêiner de ESPUMA está no FUNDO da pilha A. O guindaste só pega o contêiner do topo e só coloca no topo de outra pilha.'],
    ['boia', 'E por causa do vento, cada pilha aguenta no máximo 4 contêineres. Use o painel do guindaste [E].'],
  ] as Array<[Falante, string]>,
  desafio1Fim: [
    ['boia', 'Canhão de Espuma na mão! Aperte [K] para disparar: segure [W] para mirar alto e [S] para mirar baixo.'],
    ['boia', 'A espuma apaga fogo e, disparada na água ou no óleo, vira uma plataforma que dura 4 segundos. O tanque recarrega nos hidrantes vermelhos [E].'],
  ] as Array<[Falante, string]>,
  estivadorTravado: [['estivador', 'Carregar... carregar... carregar... carregar...']] as Array<[Falante, string]>,
  estivadorLivre: [
    ['estivador', 'Ufa! Eu estava carregando a mesma caixa há três dias!'],
    ['estivador', 'Valeu, operador. Vou empilhar uns contêineres ali na saída pra você passar por cima do portão travado.'],
  ] as Array<[Falante, string]>,

  caisEntrada: [
    ['boia', 'O Cais da Fila. Os navios esperam em fila para atracar e o painel de chegadas pisca ATRASADO para todo mundo.'],
    ['boia', 'A água está contaminada: cair nela machuca e deixa você lento. Use os conveses dos navios e a espuma para atravessar. E repare na maré, que sobe e desce!'],
  ] as Array<[Falante, string]>,
  desafio2Intro: [
    ['boia', 'Aquele barco vermelho no FIM da fila é o rebocador-bombeiro. Ele consegue apagar o cais, mas está atrás de todo mundo.'],
    ['boia', 'O portão do cais só deixa atracar o navio da FRENTE. E o MegaBrain vai mandar navios-vírus furarem a fila. Mande-os para o fim!'],
  ] as Array<[Falante, string]>,
  desafio2Fim: [
    ['boia', 'O rebocador atracou! Olha os canhões d\'água dele: o óleo em chamas está apagando e a água está clareando.'],
    ['boia', 'Água limpa dá pra nadar sem se machucar. O Depósito de Pneus fica logo ali no fim do cais.'],
  ] as Array<[Falante, string]>,
  craca: [['craca', 'Psst! Tem lacre aí? Tenho filtro novinho, quase sem fuligem.']] as Array<[Falante, string]>,

  depositoEntrada: [
    ['boia', 'O Depósito de Pneus. Quanto mais alto, mais densa a fumaça: a sua visão vira um círculo em volta da lanterna do capacete.'],
    ['boia', 'Regra de incêndio de verdade: fique abaixado! Segure [S] para agachar. A fumaça sobe, então o círculo de visão cresce e você não tosse.'],
  ] as Array<[Falante, string]>,
  desafio3Intro: [
    ['boia', 'As prateleiras pegando fogo bloqueiam a subida. O painel de sprinklers controla 8 válvulas: de valvula[0] até valvula[7].'],
    ['boia', 'As placas das prateleiras vão de 1 a 8, mas o sistema conta a partir do ZERO. Leia a placa da prateleira em chamas e traduza para o índice certo.'],
  ] as Array<[Falante, string]>,
  desafio3Fim: [['boia', 'Todos os sprinklers certos abertos! O caminho até o topo do depósito está livre... e tem alguma coisa enorme rolando lá em cima.']] as Array<[Falante, string]>,
  minibossIntro: [
    ['megabrain', 'BORRACHÃO.EXE, esmague esse operador. Pneu queimando não negocia.'],
    ['boia', 'Um jato de espuma esfria os pneus e faz ele parar por 3 segundos, mostrando o núcleo. Aí é patch no olho verde!'],
  ] as Array<[Falante, string]>,
  minibossFim: [['boia', 'BORRACHÃO.EXE desligado! Os pneus estão apagando e a fumaça do depósito baixou. Para o Terminal de Combustível!']] as Array<[Falante, string]>,

  terminalEntrada: [
    ['boia', 'As carretas de petróleo tombadas estão vazando, e o fogo vem correndo pelo óleo do chão, atrás da gente. CORRA!'],
    ['boia', 'Espuma no óleo vira plataforma e corta o caminho do fogo por alguns segundos. Barris bugados explodem se encostarem nas chamas.'],
  ] as Array<[Falante, string]>,
  desafio4Intro: [
    ['boia', 'O portão de saída está travado. Para abrir, as 6 carretas precisam ser ligadas ao dreno em ordem CRESCENTE de pressão.'],
    ['boia', 'O guindaste só troca duas carretas VIZINHAS de lugar. O fogo avança devagar enquanto você pensa, e cada troca certa empurra ele para trás com um jato de espuma.'],
  ] as Array<[Falante, string]>,
  desafio4Fim: [['boia', 'Pressões em ordem, dreno aberto! O portão liberou. A torre do servidor está no meio da baía, é agora ou nunca.']] as Array<[Falante, string]>,

  torreEntrada: [
    ['megabrain', 'CONECTANDO AO MEGABRAIN... 97%... Você chegou tarde, operador. O PORTUS agora é KRAKEN.EXE.'],
    ['boia', 'O PORTUS se fundiu com o óleo da baía e os cabos do servidor! Lembra das gravações? Primeiro FILA, depois PILHA, depois os ÍNDICES.'],
  ] as Array<[Falante, string]>,
  krakenFila: [['boia', 'Os tentáculos acendem numerados, em ordem. O PRIMEIRO a acender é o PRIMEIRO a golpear: é uma fila! Depois do golpe, ele fica preso 2 s com um conector exposto. Patch nele!']] as Array<[Falante, string]>,
  krakenPilha: [['boia', 'Ele empilhou contêineres como escudos! Só o escudo do TOPO pisca e pode ser quebrado. Do último ao primeiro, até o núcleo aparecer.']] as Array<[Falante, string]>,
  krakenVetor: [['boia', 'Maré alta e chuva de óleo! 8 tomadas numeradas de 0 a 7 cercam a arena. Eu anuncio o índice, você desliga a tomada certa [E]. Use a espuma como plataforma!']] as Array<[Falante, string]>,
  krakenFim: [
    ['boia', 'O KRAKEN.EXE afundou! Olha a base do servidor: o cabo-mestre apareceu. Puxe com [E]!'],
  ] as Array<[Falante, string]>,
  final: [
    ['portus', 'Conexão com o MegaBrain: DESCONECTADO. Sistema de espuma de emergência: LIBERADO.'],
    ['portus', 'Obrigado, {nome}. Meus contêineres voltaram para a ordem certa, e a porta do continente está fechada para o MegaBrain.'],
    ['boia', 'A fumaça está indo embora e a água da baía está clareando... Todo porto tem uma ordem. E hoje quem colocou ordem foi você.'],
  ] as Array<[Falante, string]>,
};
