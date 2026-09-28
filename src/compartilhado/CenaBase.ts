import Phaser from 'phaser';
import { GerenciadorEstado } from '../nucleo/GerenciadorEstado';
import { Comunicador } from './Comunicador';
import { Terminal } from './Terminal';

/**
 * Classe base herdável para todas as fases e cenas interativas do jogo.
 * Fornece terminal, rádio/comunicador, persistência de estado e utilitários visuais retrô.
 */
export abstract class CenaBase extends Phaser.Scene {
  protected gerenciadorEstado: GerenciadorEstado;
  protected comunicador!: Comunicador;
  protected terminal!: Terminal;
  protected idFase: string;

  private overlayCRT?: Phaser.GameObjects.Graphics;
  private teclaEscCena?: Phaser.Input.Keyboard.Key;

  constructor(chaveCena: string, idFase: string = '') {
    super(chaveCena);
    this.idFase = idFase;
    this.gerenciadorEstado = GerenciadorEstado.obterInstancia();
  }

  init(_dados?: unknown): void {
    // Pode ser sobrescrito pelas fases filhas
  }

  create(): void {
    this.comunicador = new Comunicador();
    this.terminal = new Terminal();

    // Configura atalho ESC para retornar ao hub se o terminal estiver fechado
    if (this.input.keyboard) {
      this.teclaEscCena = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    // Limpeza de recursos e eventos DOM ao encerrar ou trocar de cena
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destruirCenaBase();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.destruirCenaBase();
    });
  }

  /**
   * Atualização padrão herdável. Trata tecla ESC para sair para o Hub quando o terminal não está aberto.
   */
  update(_tempo: number, _delta: number): void {
    if (
      this.teclaEscCena &&
      Phaser.Input.Keyboard.JustDown(this.teclaEscCena) &&
      !this.terminal.estaAberto &&
      !this.comunicador.estaAtivo &&
      this.scene.key !== 'CenaHub' &&
      this.scene.key !== 'CenaAbertura'
    ) {
      this.retornarAoHub();
    }
  }

  /**
   * Gera o efeito visual característico de scanlines CRT retrô.
   */
  protected criarEfeitoCRT(
    largura: number = this.scale.width,
    altura: number = this.scale.height,
    opacidade: number = 0.03
  ): Phaser.GameObjects.Graphics {
    if (this.overlayCRT) {
      this.overlayCRT.destroy();
    }

    const overlay = this.add.graphics();
    overlay.setDepth(9999);
    overlay.setScrollFactor(0);
    overlay.fillStyle(0x00ff66, opacidade);

    for (let y = 0; y < altura; y += 4) {
      overlay.fillRect(0, y, largura, 2);
    }

    this.overlayCRT = overlay;
    return overlay;
  }

  /**
   * Cria HUD superior discreto com o nome do setor e atalho do hub.
   */
  protected criarHUDSuperior(tituloSetor: string): void {
    const textoHud = this.add.text(
      20,
      16,
      `[ SETOR // ${tituloSetor} ]  |  [ESC] HUB`,
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '13px',
        color: '#00ff66',
        backgroundColor: 'rgba(5, 10, 15, 0.75)',
        padding: { x: 8, y: 4 },
      }
    );
    textoHud.setScrollFactor(0);
    textoHud.setDepth(9998);
  }

  /**
   * Conclui a fase atual, persistindo no GerenciadorEstado e liberando a próxima.
   */
  protected concluirFaseAtual(): void {
    if (this.idFase) {
      this.gerenciadorEstado.concluirFase(this.idFase);
    }
  }

  /**
   * Realiza a transição suave de fade para o Hub Central.
   */
  public retornarAoHub(): void {
    this.terminal.fecharForcado();
    this.comunicador.finalizarDialogo();

    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('CenaHub');
    });
  }

  /**
   * Transiciona diretamente para uma fase específica.
   */
  public irParaFase(chaveCena: string, dados?: unknown): void {
    this.terminal.fecharForcado();
    this.comunicador.finalizarDialogo();

    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start(chaveCena, dados as object | undefined);
    });
  }

  protected destruirCenaBase(): void {
    if (this.comunicador) {
      this.comunicador.destruir();
    }
    if (this.terminal) {
      this.terminal.destruir();
    }
  }
}
