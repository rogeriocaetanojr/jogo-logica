import Phaser from 'phaser';
import { CENA_FASE_FINAL, COMBATE_FASE_FINAL } from './constantesFaseFinal';
import type { JogadorFaseFinal } from './JogadorFaseFinal';

const X_CORACOES = 1240;
const Y_CORACOES = 30;
const ESPACO_CORACOES = 34;

/**
 * Corações do jogador nos andares (e, depois, no boss). Dano empurra para longe do inimigo,
 * dá 1 s de invulnerabilidade piscando e, sem corações, chama `aoMorrer`.
 * Adaptado da luta do Helio (Fase 1).
 */
export class CombateFaseFinal {
  public coracoes: number = COMBATE_FASE_FINAL.CORACOES;
  private invulneravelAte: number = 0;
  private readonly cena: Phaser.Scene;
  private readonly jogador: JogadorFaseFinal;
  private readonly aoMorrer: () => void;
  private readonly grafico: Phaser.GameObjects.Graphics;

  constructor(cena: Phaser.Scene, jogador: JogadorFaseFinal, aoMorrer: () => void) {
    this.cena = cena;
    this.jogador = jogador;
    this.aoMorrer = aoMorrer;
    this.grafico = cena.add.graphics().setScrollFactor(0).setDepth(CENA_FASE_FINAL.PROFUNDIDADE_HUD);
    this.desenhar();
  }

  public get podeLevarDano(): boolean {
    return this.coracoes > 0 && this.cena.time.now >= this.invulneravelAte;
  }

  /** Levou um golpe vindo de `deX`: perde um coração e é empurrado para o lado oposto. */
  public ferir(deX: number): void {
    if (!this.podeLevarDano) return;
    const c = COMBATE_FASE_FINAL;
    this.coracoes--;
    this.desenhar();
    this.cena.cameras.main.flash(150, 255, 70, 90);
    this.cena.cameras.main.shake(140, 0.004);
    if (this.coracoes <= 0) {
      this.aoMorrer();
      return;
    }
    this.invulneravelAte = this.cena.time.now + c.INVULNERAVEL_MS;
    const lado = this.jogador.x < deX ? -1 : 1;
    this.jogador.aplicarEmpurrao(lado * c.EMPURRAO_X, c.EMPURRAO_Y, c.TRAVA_CONTROLE_MS);
  }

  /** Pisou num inimigo: quique e um instante de imunidade (não leva dano do mesmo contato). */
  public pisou(): void {
    this.jogador.quicar(COMBATE_FASE_FINAL.QUIQUE_PISAO);
    this.invulneravelAte = Math.max(this.invulneravelAte, this.cena.time.now + 150);
    this.cena.cameras.main.shake(80, 0.003);
  }

  /** Corações cheios (voltou ao checkpoint). */
  public restaurar(): void {
    this.coracoes = COMBATE_FASE_FINAL.CORACOES;
    this.invulneravelAte = 0;
    this.jogador.sprite.setAlpha(1);
    this.desenhar();
  }

  /** Pisca o jogador enquanto está invulnerável. */
  public update(): void {
    const agora = this.cena.time.now;
    if (agora < this.invulneravelAte && this.coracoes > 0) {
      this.jogador.sprite.setAlpha(Math.floor(agora / 80) % 2 === 0 ? 0.35 : 1);
    } else if (this.jogador.sprite.alpha !== 1) {
      this.jogador.sprite.setAlpha(1);
    }
  }

  private desenhar(): void {
    const g = this.grafico;
    g.clear();
    const max = COMBATE_FASE_FINAL.CORACOES;
    for (let i = 0; i < max; i++) {
      const x = X_CORACOES - (max - 1 - i) * ESPACO_CORACOES;
      const cheio = i < this.coracoes;
      g.fillStyle(0x05050c, 0.85);
      g.fillCircle(x, Y_CORACOES + 2, 16);
      g.fillStyle(cheio ? 0xff2a3d : 0x3a3f5c, 1);
      g.fillCircle(x - 5, Y_CORACOES - 2, 6);
      g.fillCircle(x + 5, Y_CORACOES - 2, 6);
      g.fillTriangle(x - 11, Y_CORACOES, x + 11, Y_CORACOES, x, Y_CORACOES + 11);
      if (cheio) {
        g.fillStyle(0xffd0d6, 1);
        g.fillRect(x - 7, Y_CORACOES - 5, 3, 2);
      }
    }
  }
}
