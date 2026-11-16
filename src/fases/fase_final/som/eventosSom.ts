import type Phaser from 'phaser';

/** Evento da cena com um efeito sonoro; qualquer módulo da fase emite sem conhecer o sintetizador. */
export const EVENTO_SOM_FASE_FINAL = 'ff-som';
/** Evento da cena que liga, desliga ou ajusta um laço contínuo (serra, laser, motor...). */
export const EVENTO_LACO_FASE_FINAL = 'ff-som-laco';

export type NomeSomFaseFinal =
  // Jogador e combate
  | 'pulo'
  | 'aterrissar'
  | 'pisao'
  | 'quique'
  | 'dano'
  | 'queimar'
  | 'morte'
  | 'queda_buraco'
  | 'checkpoint'
  // Interface
  | 'prompt'
  | 'dialogo_abrir'
  | 'dialogo_avancar'
  | 'tecla'
  | 'enviar'
  | 'terminal_abrir'
  | 'terminal_erro'
  | 'terminal_acerto'
  | 'terminal_info'
  | 'notificacao'
  | 'mudo'
  // Exterior
  | 'trovao'
  | 'porta_torre'
  | 'pan_whoosh'
  // Andares
  | 'elevador_ding'
  | 'elevador_porta'
  | 'elevador_travado'
  | 'elevador_partida'
  | 'liberar'
  | 'catraca_erro'
  | 'ponte_placa'
  | 'ponte_cai'
  | 'comporta_ok'
  | 'comporta_travada'
  | 'drone_tchau'
  | 'banner_andar'
  // Inimigos
  | 'drone_alerta'
  | 'drone_mergulho'
  | 'drone_pouso'
  | 'torreta_mira'
  | 'torreta_tiro'
  | 'alucinacao_some'
  | 'alucinacao_volta'
  // Boss: geral e transições
  | 'boss_golpe'
  | 'boss_quique'
  | 'boss_derrotado'
  | 'boss_aviso'
  | 'boss_fala'
  | 'holograma'
  | 'pixels_juntam'
  | 'glitch'
  | 'recompilar'
  | 'soco'
  | 'explosao'
  | 'chao_racha'
  | 'chao_quebra'
  | 'queda_longa'
  | 'pouso_pesado'
  // Copycat
  | 'vapor_aviso'
  | 'vapor_jato'
  | 'copycat_arremessado'
  | 'atordoado'
  // Titã
  | 'tita_preparo'
  | 'tita_investida'
  | 'tita_parede'
  | 'tita_mira'
  | 'tita_tiro'
  | 'tita_salto'
  | 'tita_pisao'
  | 'tita_travado'
  // Águia
  | 'aguia_grito'
  | 'aguia_asa'
  | 'aguia_pena'
  | 'aguia_rasante'
  | 'aguia_mergulho'
  | 'aguia_impacto'
  // Caveira
  | 'braco_aviso'
  | 'serra_pousa'
  | 'laser_carga'
  | 'laser_disparo'
  | 'canhao_tiro'
  | 'garra_trava'
  | 'garra_impacto'
  | 'caveira_gira'
  | 'caveira_pouso'
  | 'caveira_sobe'
  // Cérebro e rebase
  | 'leque_aviso'
  | 'leque_onda'
  | 'chuva_aviso'
  | 'anel_lanca'
  | 'olho_abrindo'
  | 'olho_ferido'
  | 'rebase_terminal'
  | 'rebase_errado'
  | 'rebase_pick'
  | 'rebase_certo'
  | 'placa_drop'
  | 'plataforma_cai'
  | 'splash_lava'
  | 'joinha_sobe'
  | 'joinha_brilho'
  | 'joinha_afunda'
  | 'fade_branco'
  // Final
  | 'passarinho'
  | 'ponto_bip'
  | 'atualizacao'
  | 'clique';

/** Laços contínuos: ambientes por trecho e sons que duram enquanto algo acontece. */
export type NomeLacoFaseFinal = 'chuva' | 'lava' | 'predio' | 'vento' | 'serra' | 'laser' | 'motor';

/**
 * Emite um efeito sonoro. Com `x` (coordenada do mundo), o som vai para o lado da tela onde
 * acontece e cai de volume se estiver longe da câmera.
 */
export function emitirSom(cena: Phaser.Scene, nome: NomeSomFaseFinal, x?: number, intensidade: number = 1): void {
  cena.events.emit(EVENTO_SOM_FASE_FINAL, nome, x, intensidade);
}

/** Liga (volume > 0), ajusta ou desliga (0) um laço contínuo. */
export function definirLaco(cena: Phaser.Scene, nome: NomeLacoFaseFinal, volume: number): void {
  cena.events.emit(EVENTO_LACO_FASE_FINAL, nome, volume);
}
