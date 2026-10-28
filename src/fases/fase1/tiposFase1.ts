import type Phaser from 'phaser';
import type { TextosTotemFase1 } from './DialogosFase1';

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
 * Estados operacionais da sentinela com alternância entre busca e rajada eólica.
 */
export type EstadoSentinela =
  | 'scanner'
  | 'carregando_pulso'
  | 'disparando_pulso'
  | 'desativada';

/**
 * Ponto 2D de coordenadas.
 */
export interface Coordenada2D {
  x: number;
  y: number;
}

/**
 * Posição e escala de uma plataforma estática do level design.
 */
export interface ConfigPlataforma {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
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
  podeDispararPulso?: boolean;
}

/**
 * Parâmetros de sincronização das rajadas de vento (Desafio 4).
 */
export interface ParametrosEscadaVento {
  ordem: string;
  intervalo: number;
  forca: number;
}

/**
 * Ordem em que a escada de rajadas liga as colunas. Qualquer ordem desconhecida liga todas juntas.
 */
export type OrdemEscada = 'crescente' | 'decrescente' | 'simultanea';

/**
 * Dados extras de uma resposta errada, enviados em ResultadoComando.valor (JSON).
 * A dica é impressa em cor neutra; a simulação roda a escada com os valores errados.
 */
export interface FeedbackErroFase1 {
  dica?: string;
  simulacao?: ParametrosEscadaVento;
}

/**
 * Totem interativo no cenário: imagem, prompt [E] e textos do terminal.
 * Totens reabríveis continuam disponíveis depois de resolvidos (ex.: recalibrar rajadas).
 */
export interface TotemFase1 {
  id: string;
  imagem: Phaser.GameObjects.Image;
  prompt: Phaser.GameObjects.Text;
  textos: TextosTotemFase1;
  reabrivel: boolean;
}

/**
 * Snapshot de progresso e estado para reset limpo ao morrer / respawnar.
 */
export interface SnapshotCheckpointFase1 {
  idCheckpoint: string;
  pontoSpawn: Coordenada2D;
  totensResolvidos: readonly string[];
}

/**
 * Risco horizontal que atravessa uma zona de vento contrário, da direita para a esquerda.
 */
export interface ParticulaVentoHorizontal {
  x: number;
  y: number;
  velX: number;
  comprimento: number;
  alfa: number;
}

/**
 * Configuração imutável para criação de zonas de vento contrário.
 */
export interface ConfigZonaVentoContrario {
  x: number;
  y: number;
  largura: number;
  altura: number;
  forca: number;
}

/**
 * Área onde um vento fraco empurra o jogador para a esquerda, no chão e no ar.
 */
export interface ZonaVentoContrario extends ConfigZonaVentoContrario {
  grafico: Phaser.GameObjects.Graphics;
  particulas: ParticulaVentoHorizontal[];
}
