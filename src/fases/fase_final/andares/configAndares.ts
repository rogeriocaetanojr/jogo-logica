import { COR } from '../ArteFaseFinal';
import type { ConfigAndar, TemaAndar } from './tiposAndar';

/**
 * Os 5 andares da Mega Brain Tower como dados. O construtor genérico (AndarFaseFinal) lê isto;
 * trocar um objeto muda nome, decoração, plataformas, inimigos, NPCs e puzzle sem código novo.
 *
 * Referências de física (gravidade 600, pulo 490): o pulo sobe ~200 px e cobre ~370 px na
 * horizontal. Chão em y = 620. Vãos de até ~300 px são puláveis do chão.
 */

const TEMAS: Record<TemaAndar['id'], TemaAndar> = {
  recepcao: {
    id: 'recepcao',
    parede: '#1b2246',
    paredeEscura: '#111632',
    piso: '#232a4e',
    acento: COR.ciano,
    acento2: COR.magenta,
    luz: '#bfefff',
  },
  fazenda: {
    id: 'fazenda',
    parede: '#221637',
    paredeEscura: '#150d24',
    piso: '#2a1c40',
    acento: COR.magenta,
    acento2: COR.ciano,
    luz: '#ffc8f2',
  },
  moderacao: {
    id: 'moderacao',
    parede: '#28142a',
    paredeEscura: '#180b1a',
    piso: '#2c1a2e',
    acento: COR.magenta,
    acento2: COR.vermelho,
    luz: '#ffd4e4',
  },
  producao: {
    id: 'producao',
    parede: '#1f1c31',
    paredeEscura: '#131124',
    piso: '#2a2638',
    acento: COR.janelaQuente,
    acento2: COR.magenta,
    luz: '#fff0c8',
  },
  servidores: {
    id: 'servidores',
    parede: '#0f1d2e',
    paredeEscura: '#09131f',
    piso: '#13263a',
    acento: COR.ciano,
    acento2: COR.janelaFria,
    luz: '#c8f6ff',
  },
};

export const ANDARES: readonly ConfigAndar[] = [
  {
    numero: 1,
    nome: 'Recepção Automatizada',
    conceito: 'Sequência',
    tema: TEMAS.recepcao,
    largura: 3000,
    entrada: 'porta',
    elevadorX: 2820,
    alturaCidade: 0,
    plataformas: [
      { tipo: 'mesa', x: 920, topo: 520, largura: 180 },
      { tipo: 'mesa', x: 1150, topo: 470, largura: 160 },
      { tipo: 'mesa', x: 1720, topo: 530, largura: 220 },
    ],
    buracos: [{ x0: 1260, x1: 1440 }],
    decoracao: [
      { tipo: 'planta', x: 330 },
      { tipo: 'sofa', x: 540 },
      { tipo: 'telao', x: 760, slogan: 0 },
      { tipo: 'balcao', x: 1720 },
      { tipo: 'cartaz', x: 1980, texto: 'FUNCIONARIO DO MES: MEGA BRAIN (DE NOVO)' },
      { tipo: 'planta', x: 2060 },
      { tipo: 'telao', x: 2640, slogan: 3 },
    ],
    inimigos: [],
    npcs: [{ id: 'recepcionista', x: 2310, humano: false, aparencia: 'recepcionista' }],
    puzzle: { id: 'sequencia', terminalX: 2190, bloqueio: { tipo: 'catraca', x: 2460 } },
  },
  {
    numero: 2,
    nome: 'Fazenda de Prompts',
    conceito: 'Variáveis',
    tema: TEMAS.fazenda,
    largura: 3200,
    entrada: 'elevador',
    elevadorX: 3020,
    alturaCidade: 20,
    plataformas: [
      { tipo: 'rack', x: 700, topo: 500, largura: 120 },
      { tipo: 'rack', x: 950, topo: 420, largura: 120 },
      { tipo: 'passarela', x: 1240, topo: 360, largura: 200 },
      { tipo: 'rack', x: 1760, topo: 470, largura: 140 },
      { tipo: 'rack', x: 1960, topo: 390, largura: 120 },
    ],
    buracos: [{ x0: 1130, x1: 1450 }],
    decoracao: [
      { tipo: 'maquinaPrompt', x: 400 },
      { tipo: 'cabos', x: 820 },
      { tipo: 'maquinaPrompt', x: 1480 },
      { tipo: 'cabos', x: 2080 },
      { tipo: 'maquinaPrompt', x: 2250 },
      { tipo: 'maquinaPrompt', x: 2480 },
      { tipo: 'telao', x: 2620, slogan: 2 },
    ],
    inimigos: [],
    npcs: [
      { id: 'influencer', x: 560, humano: true, aparencia: 'influencer' },
      { id: 'operadora', x: 1590, humano: true, aparencia: 'operadora' },
      { id: 'chatbot', x: 2360, humano: false, aparencia: 'chatbot' },
    ],
    puzzle: { id: 'variaveis', terminalX: 2800, bloqueio: { tipo: 'elevador', x: 3020 } },
  },
  {
    numero: 3,
    nome: 'Moderação de Conteúdo',
    conceito: 'Condicionais',
    tema: TEMAS.moderacao,
    largura: 3200,
    entrada: 'elevador',
    elevadorX: 2960,
    alturaCidade: 40,
    plataformas: [
      { tipo: 'caixa', x: 820, topo: 556, largura: 64 },
      { tipo: 'caixa', x: 884, topo: 492, largura: 64 },
      { tipo: 'passarela', x: 1130, topo: 430, largura: 220 },
      { tipo: 'passarela', x: 1580, topo: 470, largura: 160 },
      { tipo: 'mesa', x: 1920, topo: 500, largura: 180 },
    ],
    buracos: [{ x0: 1250, x1: 1500 }],
    decoracao: [
      { tipo: 'esteiraFundo', x: 520 },
      { tipo: 'scanner', x: 900 },
      { tipo: 'cartaz', x: 1200, texto: 'POSTS HUMANOS DETECTADOS HOJE: 0' },
      { tipo: 'esteiraFundo', x: 1700 },
      { tipo: 'scanner', x: 2080 },
      { tipo: 'telao', x: 2700, slogan: 5 },
    ],
    inimigos: [],
    npcs: [],
    puzzle: { id: 'condicionais', terminalX: 2300, bloqueio: { tipo: 'laser', x: 2520 } },
  },
  {
    numero: 4,
    nome: 'Linha de Produção Genérica',
    conceito: 'Laços',
    tema: TEMAS.producao,
    largura: 3400,
    entrada: 'elevador',
    elevadorX: 3180,
    alturaCidade: 60,
    plataformas: [
      { tipo: 'caixa', x: 700, topo: 556, largura: 64 },
      { tipo: 'passarela', x: 960, topo: 450, largura: 200 },
      { tipo: 'rack', x: 1500, topo: 440, largura: 140 },
      { tipo: 'passarela', x: 1760, topo: 380, largura: 180 },
    ],
    buracos: [{ x0: 1100, x1: 1360 }],
    decoracao: [
      { tipo: 'prensa', x: 480 },
      { tipo: 'pilhaCaixas', x: 800 },
      { tipo: 'esteiraFundo', x: 1250 },
      { tipo: 'prensa', x: 1620 },
      { tipo: 'cartaz', x: 1980, texto: 'META DIARIA: INFINITO' },
      { tipo: 'pilhaCaixas', x: 2960 },
    ],
    inimigos: [],
    npcs: [],
    puzzle: { id: 'lacos', terminalX: 2120, bloqueio: { tipo: 'ponte', x: 2260, placas: 5, larguraPlaca: 96 } },
  },
  {
    numero: 5,
    nome: 'Sala dos Servidores',
    conceito: 'Funções',
    tema: TEMAS.servidores,
    largura: 3400,
    entrada: 'elevador',
    elevadorX: 3180,
    alturaCidade: 80,
    plataformas: [
      { tipo: 'rack', x: 650, topo: 470, largura: 120 },
      { tipo: 'rack', x: 850, topo: 380, largura: 120 },
      { tipo: 'passarela', x: 1100, topo: 330, largura: 160 },
      { tipo: 'rack', x: 1350, topo: 420, largura: 120 },
      { tipo: 'mesa', x: 1600, topo: 500, largura: 180 },
    ],
    buracos: [
      { x0: 950, x1: 1260 },
      { x0: 1720, x1: 1880 },
    ],
    decoracao: [
      { tipo: 'rackFundo', x: 300 },
      { tipo: 'rackFundo', x: 470 },
      { tipo: 'tubos', x: 800 },
      { tipo: 'cartaz', x: 1080, texto: 'TEMPERATURA: CRITICA. VIBE: OTIMA' },
      { tipo: 'rackFundo', x: 1450 },
      { tipo: 'tubos', x: 1960 },
      { tipo: 'rackFundo', x: 2900 },
    ],
    inimigos: [],
    npcs: [],
    puzzle: { id: 'funcoes', terminalX: 2200, bloqueio: { tipo: 'comportas', x: 2340, espacamento: 160 } },
  },
];

export const TOTAL_ANDARES = ANDARES.length;

export function obterAndar(numero: number): ConfigAndar {
  const andar = ANDARES.find((a) => a.numero === numero);
  if (!andar) throw new Error(`Andar ${numero} não existe`);
  return andar;
}
