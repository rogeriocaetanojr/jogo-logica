import Phaser from 'phaser';
import type { Comunicador } from '../../compartilhado/Comunicador';
import type { LinhaDialogo } from '../../compartilhado/tipos';

export interface ConfigNpcFaseFinal {
  id: string;
  x: number;
  /** y dos pés (o sprite é ancorado embaixo). */
  pesY: number;
  textura: string;
  /** Animação de espera em loop (opcional). */
  animacao?: string;
  escala?: number;
  prompt: string;
  raioInteracao: number;
  /** Falas geradas na hora, conforme quantas vezes o jogador já conversou. */
  falas: (visita: number) => LinhaDialogo[];
  /** Humano ou robô (conta no puzzle do andar 2). */
  humano: boolean;
  espelhar?: boolean;
}

/**
 * NPC parado no chão com prompt [E]. Adaptado do NpcFase1 (sem flutuar).
 */
export class NpcFaseFinal {
  public readonly id: string;
  public readonly humano: boolean;
  public readonly sprite: Phaser.GameObjects.Sprite;
  public visitas: number = 0;
  /** Avisa a cena quando a conversa termina. */
  public aoTerminarConversa?: (npc: NpcFaseFinal) => void;

  private readonly prompt: Phaser.GameObjects.Text;
  private readonly cfg: ConfigNpcFaseFinal;

  constructor(cena: Phaser.Scene, cfg: ConfigNpcFaseFinal) {
    this.cfg = cfg;
    this.id = cfg.id;
    this.humano = cfg.humano;

    this.sprite = cena.add.sprite(cfg.x, cfg.pesY, cfg.textura, 0);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(cfg.escala ?? 2);
    this.sprite.setFlipX(Boolean(cfg.espelhar));
    this.sprite.setDepth(15);
    if (cfg.animacao) this.sprite.play(cfg.animacao);

    this.prompt = cena.add.text(cfg.x, cfg.pesY - this.sprite.displayHeight - 18, cfg.prompt, {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '12px',
      color: '#22e5ff',
      backgroundColor: 'rgba(5, 5, 12, 0.85)',
      padding: { x: 6, y: 3 },
    });
    this.prompt.setOrigin(0.5);
    this.prompt.setDepth(90);
    this.prompt.setVisible(false);
  }

  public estaPerto(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.cfg.x, this.cfg.pesY - 58) <= this.cfg.raioInteracao;
  }

  /**
   * Mostra o prompt quando o jogador está perto e abre a conversa com [E].
   * Retorna true se a interação foi consumida neste quadro.
   */
  public update(jogadorX: number, jogadorY: number, apertouE: boolean, comunicador: Comunicador): boolean {
    const perto = this.estaPerto(jogadorX, jogadorY);
    this.prompt.setVisible(perto && !comunicador.estaAtivo);
    if (!perto || !apertouE || comunicador.estaAtivo) return false;

    this.prompt.setVisible(false);
    // Vira para o jogador ao conversar
    this.sprite.setFlipX(jogadorX > this.cfg.x ? !this.cfg.espelhar : Boolean(this.cfg.espelhar));
    const falas = this.cfg.falas(this.visitas);
    this.visitas++;
    comunicador.iniciarDialogo(falas, () => {
      this.sprite.setFlipX(Boolean(this.cfg.espelhar));
      this.aoTerminarConversa?.(this);
    });
    return true;
  }

  public esconderPrompt(): void {
    this.prompt.setVisible(false);
  }

  public destruir(): void {
    this.prompt.destroy();
    this.sprite.destroy();
  }
}
