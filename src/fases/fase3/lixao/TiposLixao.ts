/**
 * Constantes e tipos do Lixão Eletrônico (Fase 3).
 */

/** Liga atalhos de desenvolvimento (teclas 1 a 6 levam ao início de cada trecho). Deixar false no commit. */
export const DEBUG = false;

/** Vida máxima do jogador, em baterias. */
export const VIDA_MAXIMA = 4;

/** Dimensões da tela e altura do topo do chão (coordenadas de mundo). */
export const LARGURA_TELA = 1280;
export const ALTURA_TELA = 720;
export const CHAO_Y = 640;

export type Clima = 'ensolarado' | 'empoeirado' | 'chuva' | 'noite';

export interface InfoArea {
  numero: number;
  nome: string;
  clima: Clima;
  /** Nome do clima como aparece no HUD. */
  rotuloClima: string;
}

/** Os 6 trechos do mapa contínuo do lixão, um por exercício. A 6 é a arena do Monstro de Sucata. */
export const AREAS: readonly InfoArea[] = [
  { numero: 1, nome: 'Portão do Lixão', clima: 'ensolarado', rotuloClima: 'ENSOLARADO' },
  { numero: 2, nome: 'Vale dos Monitores', clima: 'ensolarado', rotuloClima: 'ENSOLARADO' },
  { numero: 3, nome: 'Tempestade de Pó', clima: 'empoeirado', rotuloClima: 'EMPOEIRADO' },
  { numero: 4, nome: 'Calha de Cabos', clima: 'chuva', rotuloClima: 'CHUVA' },
  { numero: 5, nome: 'Pilhas Encharcadas', clima: 'chuva', rotuloClima: 'CHUVA' },
  { numero: 6, nome: 'Arena da Sucata', clima: 'noite', rotuloClima: 'NOITE' },
];
