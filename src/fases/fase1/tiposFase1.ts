import type Phaser from 'phaser';
import type { TextosTotemFase1 } from './DialogosFase1';

/**
 * Plataformas que somem ao serem pisadas e voltam depois:
 * - rachado: mármore que treme em vermelho e quebra;
 * - efemera: nuvem que se dissipa aos poucos.
 */
export type TipoPlataformaInstavel = 'rachado' | 'efemera';

/**
 * Plataforma que some temporariamente depois de pisada.
 */
export interface PlataformaInstavel {
  tipo: TipoPlataformaInstavel;
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
 * Estados operacionais da sentinela:
 * - scanner: patrulha com cone de visão;
 * - carregando_pulso / disparando_pulso: pulso eólico descendente;
 * - mirando / rajando: viu o jogador e sopra uma rajada lateral;
 * - plataforma: hackeada, pousada sobre a balsa que ela virou;
 * - desativada: fora de combate.
 */
export type EstadoSentinela =
  | 'scanner'
  | 'carregando_pulso'
  | 'disparando_pulso'
  | 'mirando'
  | 'rajando'
  | 'plataforma'
  | 'desativada';

/**
 * O que a sentinela faz ao ver o jogador:
 * - respawn: alerta máximo, dispara o laser e manda o jogador ao checkpoint;
 * - rajada: mira e sopra o jogador para longe.
 */
export type TipoDeteccaoSentinela = 'respawn' | 'rajada';

/**
 * Ponto 2D de coordenadas.
 */
export interface Coordenada2D {
  x: number;
  y: number;
}

/**
 * Posição e escala de uma plataforma estática ou decoração do level design.
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
  podeDispararPulso: boolean;
  deteccao: TipoDeteccaoSentinela;
}

/**
 * Plataforma que vai e volta entre a posição inicial e a deslocada, pausando nas pontas.
 */
export interface ConfigPlataformaMovel {
  x: number;
  y: number;
  deslocamentoX: number;
  deslocamentoY: number;
  velocidade: number;
  pausaMs: number;
}

/**
 * Gêiser de vento: a cada ciclo avisa com bolhas e depois lança para cima quem estiver na área.
 */
export interface ConfigGeiser {
  x: number;
  /** Altura do chão onde fica a boca do gêiser; a área sobe a partir daqui. */
  yBase: number;
  largura: number;
  altura: number;
  /** Velocidade vertical do impulso, em px/s. */
  forca: number;
  periodoMs: number;
  duracaoMs: number;
  avisoMs: number;
  /** Atraso inicial do ciclo, para gêiseres vizinhos não estourarem juntos. */
  defasagemMs: number;
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
 * Tabela de dados de um bloco do nível. Tudo é opcional: cada bloco usa o que precisa.
 */
export interface BlocoNivelFase1 {
  PLATAFORMAS?: readonly ConfigPlataforma[];
  NUVENS?: readonly Coordenada2D[];
  RACHADOS?: readonly Coordenada2D[];
  EFEMERAS?: readonly Coordenada2D[];
  TRILHOS?: readonly ConfigPlataformaMovel[];
  COLUNAS_VENTO?: readonly ConfigColunaVento[];
  ZONAS_CONTRARIAS?: readonly ConfigZonaVentoContrario[];
  GEISERES?: readonly ConfigGeiser[];
  SENTINELAS?: readonly ConfigSentinela[];
  /** Colunas de mármore e obeliscos de checkpoint, sem colisão. */
  DECORACAO?: readonly ConfigPlataforma[];
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
 * Ponto de retorno ao morrer. Desafios resolvidos continuam resolvidos depois do respawn.
 */
export interface SnapshotCheckpointFase1 {
  idCheckpoint: string;
  pontoSpawn: Coordenada2D;
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
 * Área onde um vento fraco empurra o jogador para a esquerda, no chão e no ar.
 */
export interface ZonaVentoContrario extends ConfigZonaVentoContrario {
  grafico: Phaser.GameObjects.Graphics;
  particulas: ParticulaVentoHorizontal[];
}
