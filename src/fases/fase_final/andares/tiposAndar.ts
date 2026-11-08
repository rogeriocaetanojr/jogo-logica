import type { AparenciaNpc } from '../npcs/TexturasNpc';

/**
 * Tipos da configuração de andar: cada um dos 5 andares da Mega Brain Tower é só um objeto de
 * dados (configAndares.ts) lido pelo construtor genérico (AndarFaseFinal.ts).
 */

/** Paleta de um andar (cores em '#RRGGBB'). */
export interface TemaAndar {
  id: 'recepcao' | 'fazenda' | 'moderacao' | 'producao' | 'servidores';
  parede: string;
  paredeEscura: string;
  piso: string;
  acento: string;
  acento2: string;
  luz: string;
}

/**
 * Plataformas:
 * - mesa / passarela: só o tampo é sólido, e só por cima (dá para subir por baixo).
 * - rack / caixa: blocos sólidos por todos os lados.
 */
export type TipoPlataforma = 'mesa' | 'passarela' | 'rack' | 'caixa';

export interface ConfigPlataforma {
  tipo: TipoPlataforma;
  /** Centro horizontal. */
  x: number;
  /** y do topo (onde o jogador pisa). */
  topo: number;
  largura: number;
  /** Só para rack/caixa: altura do bloco (padrão: vai até o chão). */
  altura?: number;
}

/** Trecho sem chão; cair nele volta ao checkpoint do andar. */
export interface ConfigBuraco {
  x0: number;
  x1: number;
}

export type TipoDecoracao =
  | 'balcao'
  | 'sofa'
  | 'planta'
  | 'cartaz'
  | 'telao'
  | 'maquinaPrompt'
  | 'cabos'
  | 'scanner'
  | 'esteiraFundo'
  | 'prensa'
  | 'pilhaCaixas'
  | 'rackFundo'
  | 'tubos';

export interface ConfigDecoracao {
  tipo: TipoDecoracao;
  x: number;
  /** Texto do cartaz ou índice do slogan do telão. */
  texto?: string;
  slogan?: number;
}

/** Inimigos (etapa 4): Spam Bot, Drone Captcha, Torreta Firewall, Alucinação. */
export type TipoInimigo = 'spamBot' | 'droneCaptcha' | 'torretaFirewall' | 'alucinacao';

export interface ConfigInimigo {
  tipo: TipoInimigo;
  x: number;
  y: number;
  /** Limites da patrulha (spamBot/drone). */
  minX?: number;
  maxX?: number;
  /** Direção do disparo (torreta): -1 esquerda, 1 direita. */
  direcao?: -1 | 1;
}

/** NPCs dos andares. `humano` conta no puzzle do andar 2; as falas ficam em DialogosFaseFinal (por id). */
export interface ConfigNpcAndar {
  id: string;
  x: number;
  humano: boolean;
  aparencia: AparenciaNpc;
}

/**
 * O que o puzzle do andar controla no cenário:
 * - catraca: portão de vidro do chão ao teto com catraca embaixo.
 * - laser: barreira de feixes do chão ao teto.
 * - ponte: um vão no chão que a ponte de placas cobre.
 * - comportas: três comportas de refrigeração em sequência.
 * - elevador: nada no caminho; o próprio elevador é o puzzle.
 */
export type TipoBloqueio = 'catraca' | 'laser' | 'ponte' | 'comportas' | 'elevador';

export interface ConfigBloqueio {
  tipo: TipoBloqueio;
  /** Posição principal (portão, barreira ou início do vão). */
  x: number;
  /** ponte: quantas placas cobrem o vão e a largura de cada uma. */
  placas?: number;
  larguraPlaca?: number;
  /** comportas: distância entre elas. */
  espacamento?: number;
}

export type IdPuzzleAndar = 'sequencia' | 'variaveis' | 'condicionais' | 'lacos' | 'funcoes';

export interface ConfigPuzzleAndar {
  id: IdPuzzleAndar;
  /** x do terminal do puzzle. */
  terminalX: number;
  bloqueio: ConfigBloqueio;
}

export interface ConfigAndar {
  numero: number;
  nome: string;
  conceito: string;
  tema: TemaAndar;
  largura: number;
  /** Andar 1 entra pela porta do saguão; os outros, pelo elevador. */
  entrada: 'porta' | 'elevador';
  /** x do elevador de saída (centro). */
  elevadorX: number;
  /** Altura em que a cidade aparece pelas janelas (cresce a cada andar: a cidade fica mais baixa). */
  alturaCidade: number;
  plataformas: ConfigPlataforma[];
  buracos: ConfigBuraco[];
  decoracao: ConfigDecoracao[];
  inimigos: ConfigInimigo[];
  npcs: ConfigNpcAndar[];
  puzzle: ConfigPuzzleAndar;
}
