/**
 * Constantes e tipos do Lixão Eletrônico (Fase 3).
 */

/**
 * Liga atalhos de desenvolvimento: teclas 1 a 4 levam ao início de cada trecho e L libera o
 * obstáculo do exercício do trecho atual, C troca o clima e R traz o Recicla até o jogador.
 * Deixar false no commit.
 */
export const DEBUG = false;

/** Vida máxima do jogador, em baterias. */
export const VIDA_MAXIMA = 5;

/** Dano: invencibilidade piscando e empurrão leve para trás. */
export const DANO = {
  INVENCIBILIDADE_MS: 1000,
  /** Intervalo do pisca durante a invencibilidade. */
  PISCA_MS: 80,
  EMPURRAO_X: 220,
  EMPURRAO_Y: -220,
  /** Tempo em que o empurrão ignora as teclas de andar. */
  CONTROLE_TRAVADO_MS: 220,
} as const;

/** Duração de cada metade do fade ao morrer (escurece, reaparece no checkpoint). */
export const FADE_MORTE_MS = 400;

/** Dimensões da tela e altura do topo do chão (coordenadas de mundo). */
export const LARGURA_TELA = 1280;
export const ALTURA_TELA = 720;
export const CHAO_Y = 640;
/**
 * Topo do mundo (y de mundo, negativo): as torres sobem até 2 a 3 telas acima do chão e a
 * câmera acompanha na vertical. Muros, portões e muralhas vão até aqui.
 */
export const TOPO_MUNDO = -1800;

export type Clima = 'sol' | 'nevoa' | 'chuva' | 'noite';

export interface InfoTrecho {
  numero: number;
  nome: string;
  clima: Clima;
  /** Nome do clima como aparece no HUD. */
  rotuloClima: string;
}

/**
 * Os 4 trechos do mapa contínuo do lixão. Só o clima muda de um para o outro; os três
 * primeiros têm um exercício no meio e o 4 é a arena do Monstro de Sucata.
 */
export const TRECHOS: readonly InfoTrecho[] = [
  { numero: 1, nome: 'Portão do Lixão', clima: 'sol', rotuloClima: 'SOL' },
  { numero: 2, nome: 'Tempestade de Pó', clima: 'nevoa', rotuloClima: 'NÉVOA' },
  { numero: 3, nome: 'Pilhas Encharcadas', clima: 'chuva', rotuloClima: 'CHUVA' },
  { numero: 4, nome: 'Arena da Sucata', clima: 'noite', rotuloClima: 'NOITE' },
];

/** Recicláveis que servem de munição: caem das pilhas e ficam soltos pelo chão. */
export type TipoReciclavel = 'lata' | 'placa' | 'monitor' | 'bateria';

export interface InfoReciclavel {
  nome: string;
  /**
   * Peso do item (1 é o mais leve). Quanto mais pesado, mais lento sai da mão e mais rápido
   * cai: a curva fica curta e baixa (ver ARREMESSO em ArremessoLixao).
   */
  peso: number;
}

export const RECICLAVEIS: Record<TipoReciclavel, InfoReciclavel> = {
  lata: { nome: 'Carcaça de lata', peso: 1 },
  placa: { nome: 'Placa de circuito', peso: 1.5 },
  bateria: { nome: 'Bateria', peso: 2 },
  monitor: { nome: 'Monitor CRT', peso: 3 },
};

export const TIPOS_RECICLAVEIS = Object.keys(RECICLAVEIS) as readonly TipoReciclavel[];
