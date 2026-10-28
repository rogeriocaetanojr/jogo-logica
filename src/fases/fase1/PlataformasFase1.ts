import Phaser from 'phaser';
import type { PlataformaRachada } from './tiposFase1';
import { JOGADOR_FASE1, MARMORE_RACHADO_FASE1 } from './constantesFase1';

/**
 * Plataformas de mármore rachado da Fase 1: ao serem pisadas, tremem em vermelho,
 * quebram após o telegraph e reaparecem com fade-in depois de alguns segundos.
 */
export class PlataformasRachadasFase1 {
  public readonly grupo: Phaser.Physics.Arcade.StaticGroup;
  public readonly plataformas: PlataformaRachada[] = [];

  private cena: Phaser.Scene;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    this.grupo = cena.physics.add.staticGroup();
  }

  public criar(x: number, y: number): void {
    const sprite = this.grupo.create(x, y, 'marmore-rachado') as Phaser.Physics.Arcade.Sprite;
    sprite.refreshBody();

    this.plataformas.push({
      sprite,
      rachando: false,
      quebrada: false,
      tempoRachando: 0,
      xOriginal: x,
      yOriginal: y,
    });
  }

  /**
   * Callback de colisão do jogador: inicia a rachadura da plataforma pisada.
   */
  public aoPisar(sprite: Phaser.Physics.Arcade.Sprite): void {
    const plat = this.plataformas.find((p) => p.sprite === sprite);
    if (plat && !plat.rachando && !plat.quebrada) {
      plat.rachando = true;
      plat.tempoRachando = this.cena.time.now;
      plat.sprite.setTint(JOGADOR_FASE1.TINT_RACHANDO);
    }
  }

  public update(tempo: number): void {
    for (const plat of this.plataformas) {
      if (!plat.rachando || plat.quebrada) continue;

      plat.sprite.x =
        plat.xOriginal +
        Math.sin(tempo * MARMORE_RACHADO_FASE1.TREMOR_VELOCIDADE) * MARMORE_RACHADO_FASE1.TREMOR_AMPLITUDE;

      if (tempo - plat.tempoRachando > MARMORE_RACHADO_FASE1.TEMPO_TELEGRAPH_MS) {
        this.quebrar(plat);
      }
    }
  }

  /**
   * Adia a quebra das plataformas que estavam rachando enquanto o mundo está congelado.
   */
  public adiarRachaduras(delta: number): void {
    for (const plat of this.plataformas) {
      if (plat.rachando) {
        plat.tempoRachando += delta;
      }
    }
  }

  /**
   * Devolve todas as plataformas intactas às posições originais (respawn de checkpoint).
   */
  public resetar(): void {
    for (const plat of this.plataformas) {
      plat.rachando = false;
      plat.quebrada = false;
      plat.sprite.x = plat.xOriginal;
      plat.sprite.y = plat.yOriginal;
      plat.sprite.setVisible(true);
      plat.sprite.setAlpha(1);
      plat.sprite.clearTint();
      plat.sprite.enableBody(false, plat.xOriginal, plat.yOriginal, true, true);
    }
  }

  private quebrar(plat: PlataformaRachada): void {
    plat.quebrada = true;
    plat.rachando = false;
    plat.sprite.x = plat.xOriginal;
    plat.sprite.setVisible(false);
    plat.sprite.disableBody(true, true);

    this.cena.time.delayedCall(MARMORE_RACHADO_FASE1.TEMPO_RESPAWN_MS, () => {
      plat.quebrada = false;
      plat.sprite.setVisible(true);
      plat.sprite.enableBody(false, plat.xOriginal, plat.yOriginal, true, true);
      plat.sprite.setAlpha(0);
      this.cena.tweens.add({
        targets: plat.sprite,
        alpha: 1,
        duration: MARMORE_RACHADO_FASE1.DURACAO_FADE_IN_MS,
      });
    });
  }
}
