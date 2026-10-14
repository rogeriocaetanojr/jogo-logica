import Phaser from 'phaser';
import type { LinhaDialogo } from '../../compartilhado/tipos';
import type { Comunicador } from '../../compartilhado/Comunicador';
import { DISTANCIA_INTERACAO_NPC_PADRAO } from './constantesFase1';

/**
 * Entidade modularizada de NPC interativo da Fase 1: Céu Partido.
 * Gerencia posicionamento, animação de flutuação, prompt de HUD [E] e disparo de diálogo via Comunicador.
 */
export class NpcFase1 {
  public cena: Phaser.Scene;
  public id: string;
  public nome: string;
  public sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  public promptTexto: Phaser.GameObjects.Text;
  public dialogo: LinhaDialogo[];
  public x: number;
  public y: number;
  public raioInteracao: number;

  constructor(
    cena: Phaser.Scene,
    id: string,
    nome: string,
    x: number,
    y: number,
    textura: string,
    prompt: string,
    dialogo: LinhaDialogo[],
    raioInteracao: number = DISTANCIA_INTERACAO_NPC_PADRAO
  ) {
    this.cena = cena;
    this.id = id;
    this.nome = nome;
    this.x = x;
    this.y = y;
    this.dialogo = dialogo;
    this.raioInteracao = raioInteracao;

    // Sprite do NPC com profundidade destacada
    this.sprite = this.cena.add.sprite(x, y, textura);
    this.sprite.setDepth(15);

    // Prompt no HUD sobre a cabeça do NPC
    this.promptTexto = this.cena.add.text(x, y - 48, prompt, {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '11px',
      color: '#34d399',
      backgroundColor: '#090d16',
      padding: { x: 6, y: 3 },
    });
    this.promptTexto.setOrigin(0.5);
    this.promptTexto.setVisible(false);
    this.promptTexto.setDepth(90);

    // Animação procedural suave de flutuação vertical
    this.cena.tweens.add({
      targets: this.sprite,
      y: y - 6,
      yoyo: true,
      repeat: -1,
      duration: 1600,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Monitora a proximidade do jogador e gerencia a interação com a tecla E.
   * Retorna true se a interação foi disparada neste frame (impedindo conflito com totens).
   */
  public update(
    jogadorX: number,
    jogadorY: number,
    teclaInteragirPressionada: boolean,
    comunicador: Comunicador
  ): boolean {
    const dist = Phaser.Math.Distance.Between(jogadorX, jogadorY, this.x, this.y);
    const perto = dist <= this.raioInteracao;

    this.promptTexto.setVisible(perto && !comunicador.estaAtivo);

    if (perto && teclaInteragirPressionada && !comunicador.estaAtivo) {
      this.promptTexto.setVisible(false);
      comunicador.iniciarDialogo(this.dialogo);
      return true;
    }

    return false;
  }

  public destruir(): void {
    this.promptTexto.destroy();
    this.sprite.destroy();
  }
}
