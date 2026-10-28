import Phaser from 'phaser';
import { GerenciadorEstado, type TipoPersonagem } from '../../nucleo/GerenciadorEstado';
import type { Coordenada2D } from './tiposFase1';
import type { VentoFase1 } from './VentoFase1';
import { JOGADOR_FASE1, VENTO_FASE1 } from './constantesFase1';

/**
 * Jogador da Fase 1 (Alvares ou Reis): sprite físico, teclado, movimento,
 * coyote time, jump buffer e a mecânica de planar dentro e fora das colunas de vento.
 */
export class JogadorFase1 {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly tipoPersonagem: TipoPersonagem;

  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclasWASD?: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private teclaEspaco?: Phaser.Input.Keyboard.Key;
  private teclaInteragir?: Phaser.Input.Keyboard.Key;

  // Temporizadores para Coyote Time e Jump Buffer
  private tempoUltimaVezNoChao: number = -9999;
  private tempoUltimoPressionarPulo: number = -9999;

  constructor(cena: Phaser.Scene, spawn: Coordenada2D) {
    this.tipoPersonagem = GerenciadorEstado.obterInstancia().obterPersonagem();

    this.sprite = cena.physics.add.sprite(spawn.x, spawn.y, `${this.tipoPersonagem}_idle`);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(JOGADOR_FASE1.PROFUNDIDADE);
    this.corpo.setSize(JOGADOR_FASE1.HITBOX_LARGURA, JOGADOR_FASE1.HITBOX_ALTURA);
    this.corpo.setOffset(JOGADOR_FASE1.HITBOX_OFFSET_X, JOGADOR_FASE1.HITBOX_OFFSET_Y);
    this.tocarAnimacao('idle');

    if (cena.input?.keyboard) {
      const teclado = cena.input.keyboard;
      this.cursores = teclado.createCursorKeys();
      this.teclasWASD = {
        w: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.teclaEspaco = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.teclaInteragir = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get corpo(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * Consome o aperto da tecla E neste quadro (chamar uma única vez por quadro).
   */
  public interagirApertado(): boolean {
    return Boolean(this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir));
  }

  public update(tempo: number, vento: VentoFase1): void {
    const corpo = this.corpo;

    const esquerda = (this.cursores?.left.isDown || this.teclasWASD?.a.isDown) ?? false;
    const direita = (this.cursores?.right.isDown || this.teclasWASD?.d.isDown) ?? false;
    const puloSegurado =
      (this.cursores?.up.isDown || this.teclasWASD?.w.isDown || this.teclaEspaco?.isDown) ?? false;

    const puloApertadoAgora =
      (this.cursores?.up && Phaser.Input.Keyboard.JustDown(this.cursores.up)) ||
      (this.teclasWASD?.w && Phaser.Input.Keyboard.JustDown(this.teclasWASD.w)) ||
      (this.teclaEspaco && Phaser.Input.Keyboard.JustDown(this.teclaEspaco));

    const noChao = corpo.blocked.down || corpo.touching.down;

    if (noChao) {
      this.tempoUltimaVezNoChao = tempo;
    }

    if (puloApertadoAgora) {
      this.tempoUltimoPressionarPulo = tempo;
    }

    const colunaAtual = vento.colunaAtivaEm(this.sprite.x, this.sprite.y);

    let velX = 0;
    if (esquerda) {
      velX = -JOGADOR_FASE1.VELOCIDADE_X;
      this.sprite.setFlipX(true);
    } else if (direita) {
      velX = JOGADOR_FASE1.VELOCIDADE_X;
      this.sprite.setFlipX(false);
    }

    if (colunaAtual) {
      velX -= VENTO_FASE1.FORCA_VENTO_LATERAL;
    }

    this.sprite.setVelocityX(velX);

    const podePularCoyote = tempo - this.tempoUltimaVezNoChao <= JOGADOR_FASE1.TEMPO_COYOTE_MS;
    const bufferPuloAtivo = tempo - this.tempoUltimoPressionarPulo <= JOGADOR_FASE1.TEMPO_JUMP_BUFFER_MS;

    if (bufferPuloAtivo && podePularCoyote) {
      this.sprite.setVelocityY(JOGADOR_FASE1.VELOCIDADE_PULO);
      this.tempoUltimoPressionarPulo = -9999;
      this.tempoUltimaVezNoChao = -9999;
    }

    let modoPlaneioAtivo = false;

    if (colunaAtual) {
      if (puloSegurado) {
        this.sprite.setVelocityY(-colunaAtual.forca);
        modoPlaneioAtivo = true;
      } else if (corpo.velocity.y > 0) {
        this.sprite.setVelocityY(
          Math.max(0, corpo.velocity.y - VENTO_FASE1.SUSTENTACAO_PASSIVA_DELTA)
        );
      }
    } else if (!noChao && puloSegurado && corpo.velocity.y > 0) {
      this.sprite.setVelocityY(Math.min(corpo.velocity.y, JOGADOR_FASE1.VELOCIDADE_MAX_PLANAR));
      modoPlaneioAtivo = true;
    }

    if (modoPlaneioAtivo) {
      this.sprite.setTint(JOGADOR_FASE1.TINT_VENTO);
    } else {
      this.sprite.clearTint();
    }

    if (noChao) {
      this.tocarAnimacao(velX !== 0 ? 'run' : 'idle');
    } else {
      this.tocarAnimacao('jump');
    }
  }

  /**
   * Imobiliza o jogador no ar enquanto o terminal ou um diálogo está aberto.
   */
  public congelar(): void {
    this.sprite.setVelocity(0, 0);
    this.corpo.setAllowGravity(false);
    this.tocarAnimacao('idle');
  }

  public liberarGravidade(): void {
    this.corpo.setAllowGravity(true);
  }

  /**
   * Teleporta o jogador para o ponto de spawn com física e temporizadores zerados.
   */
  public respawnar(ponto: Coordenada2D): void {
    const corpo = this.corpo;
    corpo.reset(ponto.x, ponto.y);
    corpo.setVelocity(0, 0);
    corpo.setAcceleration(0, 0);
    corpo.setAllowGravity(true);
    corpo.blocked.none = true;
    corpo.touching.none = true;

    this.sprite.clearTint();
    this.sprite.setFlipX(false);
    this.tocarAnimacao('idle');

    this.tempoUltimaVezNoChao = -9999;
    this.tempoUltimoPressionarPulo = -9999;
  }

  private tocarAnimacao(nome: 'idle' | 'run' | 'jump'): void {
    this.sprite.anims.play(`${this.tipoPersonagem}_${nome}`, true);
  }
}
