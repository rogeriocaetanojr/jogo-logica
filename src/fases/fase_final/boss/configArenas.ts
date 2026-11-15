import { COR } from '../ArteFaseFinal';
import type { ConfigDecoracao, ConfigPlataforma, TemaAndar } from '../andares/tiposAndar';

/**
 * Arenas do boss, de cima para baixo (roteiro 9.1): Terraço → Cobertura executiva →
 * Sala de servidores principal → Casa de máquinas → Núcleo. Cada uma ocupa uma tela
 * (1280x720, câmera estática) e é só dados, como os andares.
 */
export interface ConfigArena {
  forma: number;
  tema: TemaAndar;
  /** Terraço é ao ar livre (céu, chuva); as outras são salas com parede e teto. */
  tipo: 'terraco' | 'interior';
  plataformas: ConfigPlataforma[];
  decoracao: ConfigDecoracao[];
  /** Altura da cidade vista pelas janelas (cresce à medida que se desce). */
  alturaCidade: number;
}

/** Trecho do piso que quebra na transição (os dois caem por ele). */
export const VAO_QUEDA = { x0: 520, x1: 760 } as const;

export const ARENAS: Record<number, ConfigArena> = {
  1: {
    forma: 1,
    tipo: 'terraco',
    tema: {
      id: 'terraco',
      parede: '#1b2246',
      paredeEscura: '#111632',
      piso: '#2b2e44',
      acento: COR.vermelho,
      acento2: COR.ciano,
      luz: '#bfefff',
    },
    plataformas: [],
    decoracao: [],
    alturaCidade: 0,
  },
  2: {
    forma: 2,
    tipo: 'interior',
    tema: {
      id: 'cobertura',
      parede: '#24183a',
      paredeEscura: '#170f27',
      piso: '#2e2040',
      acento: COR.janelaQuente,
      acento2: COR.magenta,
      luz: '#ffe6b0',
    },
    plataformas: [
      { tipo: 'mesa', x: 330, topo: 450, largura: 220 },
      { tipo: 'mesa', x: 950, topo: 450, largura: 220 },
    ],
    decoracao: [
      { tipo: 'cartaz', x: 640, texto: 'CEO DO ANO: MEGA BRAIN' },
      { tipo: 'sofa', x: 120 },
      { tipo: 'planta', x: 520 },
      { tipo: 'planta', x: 760 },
      { tipo: 'sofa', x: 1160 },
    ],
    alturaCidade: 10,
  },
  3: {
    forma: 3,
    tipo: 'interior',
    tema: {
      id: 'servidorPrincipal',
      parede: '#0d1a2c',
      paredeEscura: '#08111e',
      piso: '#12233a',
      acento: COR.ciano,
      acento2: COR.magenta,
      luz: '#c8f6ff',
    },
    plataformas: [
      { tipo: 'passarela', x: 300, topo: 440, largura: 240 },
      { tipo: 'passarela', x: 980, topo: 440, largura: 240 },
    ],
    decoracao: [
      { tipo: 'rackFundo', x: 80 },
      { tipo: 'rackFundo', x: 180 },
      { tipo: 'cabos', x: 420 },
      { tipo: 'rackFundo', x: 1100 },
      { tipo: 'rackFundo', x: 1200 },
      { tipo: 'cabos', x: 860 },
    ],
    alturaCidade: 30,
  },
  4: {
    forma: 4,
    tipo: 'interior',
    tema: {
      id: 'casaMaquinas',
      parede: '#1e1a2c',
      paredeEscura: '#12101c',
      piso: '#2a2434',
      acento: COR.janelaQuente,
      acento2: COR.vermelho,
      luz: '#ffe0b8',
    },
    plataformas: [
      { tipo: 'passarela', x: 150, topo: 450, largura: 200 },
      { tipo: 'passarela', x: 1130, topo: 450, largura: 200 },
    ],
    decoracao: [
      { tipo: 'tubos', x: 60 },
      { tipo: 'prensa', x: 330 },
      { tipo: 'esteiraFundo', x: 640 },
      { tipo: 'prensa', x: 950 },
      { tipo: 'tubos', x: 1220 },
    ],
    alturaCidade: 60,
  },
  5: {
    forma: 5,
    tipo: 'interior',
    tema: {
      id: 'nucleo',
      parede: '#1c0f1c',
      paredeEscura: '#110811',
      piso: '#2a1418',
      acento: COR.lava,
      acento2: COR.vermelho,
      luz: '#ffc890',
    },
    plataformas: [],
    decoracao: [
      { tipo: 'tubos', x: 120 },
      { tipo: 'tubos', x: 1160 },
    ],
    alturaCidade: 90,
  },
};
