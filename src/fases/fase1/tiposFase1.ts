import type Phaser from 'phaser';

/**
 * Representa uma plataforma de mármore com comportamento de rachadura e quebra temporária.
 */
export interface PlataformaRachada {
  sprite: Phaser.Physics.Arcade.Sprite;
  rachando: boolean;
  quebrada: boolean;
  tempoRachando: number;
  xOriginal: number;
  yOriginal: number;
}

/**
 * Partícula individual ascendente dentro de uma coluna de ar.
 */
export interface ParticulaVento {
  x: number;
  y: number;
  velY: number;
  alfa: number;
}

/**
 * Entidade de coluna de vento ascensional com renderização gráfica e física.
 */
export interface ColunaVento {
  x: number;
  y: number;
  largura: number;
  altura: number;
  forca: number;
  ativa: boolean;
  grafico: Phaser.GameObjects.Graphics;
  particulas: ParticulaVento[];
}

/**
 * Drone sentinela com patrulha horizontal e cone de detecção óptico triangular.
 */
export interface SentinelaInimiga {
  sprite: Phaser.Physics.Arcade.Sprite;
  coneGrafico: Phaser.GameObjects.Graphics;
  xInicial: number;
  yInicial: number;
  minX: number;
  maxX: number;
  velocidade: number;
  direcao: number; // 1 = direita, -1 = esquerda
  alcanceVisao: number;
  aberturaCone: number;
  emAlerta: boolean;
  hackeada: boolean;
  escudoAtivo?: boolean;
  graficoEscudo?: Phaser.GameObjects.Graphics;
}

/**
 * Pilar móvel da antecâmara final (Desafio 6 do Arquiteto Preguiçoso).
 */
export interface PilarMovel {
  id: number;
  sprite: Phaser.Physics.Arcade.Sprite;
  rachado: boolean;
  recolhido: boolean;
  yOriginal: number;
}

/**
 * Ponto 2D de coordenadas.
 */
export interface Coordenada2D {
  x: number;
  y: number;
}

/**
 * Configuração imutável para criação de colunas de vento.
 */
export interface ConfigColunaVento {
  x: number;
  y: number;
  largura: number;
  altura: number;
  forca: number;
  ativa: boolean;
}

/**
 * Configuração imutável para criação de sentinelas.
 */
export interface ConfigSentinela {
  x: number;
  y: number;
  minX: number;
  maxX: number;
  velocidade: number;
}

/**
 * Parâmetros de sincronização das rajadas de vento (Desafio 5).
 */
export interface ParametrosEscadaVento {
  ordem: string;
  intervalo: number;
  forca: number;
}

/**
 * Dados de estado e referência de um Totem interativo da Fase 1.
 */
export interface TotemConfigInteracao {
  id: string;
  x: number;
  y: number;
  tituloTerminal: string;
  dialogoAbertura: string;
  variaveisDisponiveis: string[];
  funcoesDisponiveis: string[];
}
