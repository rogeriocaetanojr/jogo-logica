import Phaser from 'phaser';
import type { TipoPersonagem } from '../../../nucleo/GerenciadorEstado';
import type { CenaFase2 } from '../CenaFase2';
import { VIDA_MAXIMA } from './TiposPorto';

/** Estado das teclas lido a cada quadro. */
export interface ControlesPorto {
  esquerda: boolean;
  direita: boolean;
  cima: boolean;
  pulo: boolean;
  puloApertado: boolean;
  agachar: boolean;
  atirar: boolean;
  espuma: boolean;
  espumaApertada: boolean;
}

const LARGURA_CORPO = 40;
const ALTURA_CORPO = 94;
const VELOCIDADE = 240;
const VELOCIDADE_AGACHADO = 110;
const FORCA_PULO = 650;
const GRAVIDADE_EXTRA = 400;
const QUEDA_MAXIMA = 900;

/**
 * Operador controlado pelo jogador (Alvares ou Reis).
 * O corpo físico é uma zona invisível; o sprite visual acompanha os pés,
 * o que permite agachar (achatar o sprite) sem alterar a colisão.
 */
export class JogadorPorto {
  public readonly corpo: Phaser.GameObjects.Zone;
  public readonly body: Phaser.Physics.Arcade.Body;
  public readonly visual: Phaser.GameObjects.Sprite;
  public readonly tipo: TipoPersonagem;

  public vida = VIDA_MAXIMA;
  public olhandoDireita = true;
  public agachado = false;
  public naAgua = false;
  public aguaLimpa = false;
  public noOleo = false;
  public cobertoDeOleoAte = 0;
  public morto = false;
  public congelado = false;

  private readonly cena: CenaFase2;
  private invulneravelAte = 0;
  private controleTravadoAte = 0;
  private ultimoNoChao = 0;
  private puloPedidoEm = -1000;
  private ultimoTiro = 0;
  private ultimaEspuma = 0;
  private ultimaBracada = 0;
  private tempoCorrida = 0;

  constructor(cena: CenaFase2, x: number, y: number, tipo: TipoPersonagem) {
    this.cena = cena;
    this.tipo = tipo;
    this.corpo = cena.add.zone(x, y, LARGURA_CORPO, ALTURA_CORPO);
    cena.physics.add.existing(this.corpo);
    this.body = this.corpo.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(GRAVIDADE_EXTRA);
    this.body.setMaxVelocityY(QUEDA_MAXIMA);
    this.body.setCollideWorldBounds(true);

    this.visual = cena.add.sprite(x, y + ALTURA_CORPO / 2, tipo);
    this.visual.setOrigin(0.5, 122 / 128);
    this.visual.setDepth(25);
    this.visual.anims.play(`${tipo}_idle`, true);
  }

  get x(): number {
    return this.corpo.x;
  }

  get y(): number {
    return this.corpo.y;
  }

  /** Linha dos pés (base do corpo físico). */
  get pes(): number {
    return this.body.bottom;
  }

  /** Posição aproximada da lanterna do capacete (centro da visão na fumaça). */
  get cabeca(): { x: number; y: number } {
    return { x: this.corpo.x, y: this.corpo.y - (this.agachado ? 4 : 30) };
  }

  get noChao(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  get invulneravel(): boolean {
    return this.cena.time.now < this.invulneravelAte;
  }

  get direcao(): number {
    return this.olhandoDireita ? 1 : -1;
  }

  posicionar(x: number, y: number): void {
    this.body.reset(x, y);
    this.sincronizarVisual(0);
  }

  atualizar(controles: ControlesPorto, delta: number): void {
    const agora = this.cena.time.now;
    if (this.morto) {
      this.sincronizarVisual(delta);
      return;
    }

    if (this.congelado) {
      this.body.setVelocityX(0);
      this.agachado = false;
      this.tocarAnimacao('idle');
      this.sincronizarVisual(delta);
      return;
    }

    const noChao = this.noChao;
    if (noChao) this.ultimoNoChao = agora;
    if (controles.puloApertado) this.puloPedidoEm = agora;

    const controleLivre = agora >= this.controleTravadoAte;
    const oleado = agora < this.cobertoDeOleoAte;

    // Agachar: só no chão e fora da água
    this.agachado = controleLivre && controles.agachar && noChao && !this.naAgua;

    // Movimento horizontal
    let alvo = 0;
    if (controleLivre) {
      if (controles.esquerda && !controles.direita) {
        alvo = -1;
        this.olhandoDireita = false;
      } else if (controles.direita && !controles.esquerda) {
        alvo = 1;
        this.olhandoDireita = true;
      }
    }

    let velocidade = this.agachado ? VELOCIDADE_AGACHADO : VELOCIDADE;
    if (this.naAgua) velocidade *= this.aguaLimpa ? 0.75 : 0.5;
    if (oleado) velocidade *= 0.55;

    if (controleLivre) {
      const desejada = alvo * velocidade;
      if (this.noOleo && noChao) {
        // Óleo no chão: escorregadio, a velocidade muda devagar
        const k = Math.min(1, (delta / 1000) * 2.2);
        this.body.setVelocityX(this.body.velocity.x + (desejada - this.body.velocity.x) * k);
      } else {
        this.body.setVelocityX(desejada);
      }
    }

    // Física na água: flutuação e braçadas
    if (this.naAgua) {
      this.body.setGravityY(-470);
      this.body.setMaxVelocityY(140);
      const superficie = this.cena.agua?.nivelEm(this.x) ?? this.y;
      const cabecaFora = this.y - 30 < superficie + 6;
      if (controles.puloApertado && agora - this.ultimaBracada > 220) {
        this.ultimaBracada = agora;
        this.body.setMaxVelocityY(QUEDA_MAXIMA);
        this.body.setVelocityY(cabecaFora ? -560 : -300);
        this.cena.som.tocar('bracada');
        this.cena.efeitos.respingo(this.x, superficie);
      }
    } else {
      this.body.setGravityY(GRAVIDADE_EXTRA);
      this.body.setMaxVelocityY(QUEDA_MAXIMA);
      // Pulo com tolerância (coyote time) e memória de botão (buffer)
      const podePular = agora - this.ultimoNoChao < 90;
      if (controleLivre && podePular && agora - this.puloPedidoEm < 130) {
        this.body.setVelocityY(-FORCA_PULO * (oleado ? 0.8 : 1));
        this.puloPedidoEm = -1000;
        this.ultimoNoChao = -1000;
        this.agachado = false;
        this.cena.som.tocar('pulo');
      }
      // Pulo variável: soltar o botão corta a subida
      if (!controles.pulo && this.body.velocity.y < -260) {
        this.body.setVelocityY(-260);
      }
    }

    // Ferramentas
    if (controleLivre && controles.atirar && agora - this.ultimoTiro > 210) {
      if (this.cena.dispararPatch(this.x + this.direcao * 34, this.y - (this.agachado ? -12 : 8), this.direcao)) {
        this.ultimoTiro = agora;
      }
    }
    if (controleLivre && controles.espumaApertada && agora - this.ultimaEspuma > 300) {
      this.ultimaEspuma = agora;
      const mira = controles.cima ? 'alto' : controles.agachar ? 'baixo' : 'normal';
      this.cena.usarFerramentaEspuma(this.x + this.direcao * 30, this.y - (this.agachado ? -10 : 14), this.direcao, mira);
    }

    // Animação
    if (!noChao && !this.naAgua) this.tocarAnimacao('jump');
    else if (alvo !== 0) this.tocarAnimacao('run');
    else this.tocarAnimacao('idle');

    this.sincronizarVisual(delta, alvo !== 0 && noChao);
  }

  private tocarAnimacao(nome: 'idle' | 'run' | 'jump'): void {
    const chave = `${this.tipo}_${nome}`;
    if (this.visual.anims.currentAnim?.key !== chave) this.visual.anims.play(chave, true);
  }

  private sincronizarVisual(delta: number, correndo = false): void {
    this.tempoCorrida = correndo ? this.tempoCorrida + delta : 0;
    const balanco = correndo ? Math.round(Math.abs(Math.sin(this.tempoCorrida * 0.018)) * -3) : 0;
    this.visual.setPosition(Math.round(this.corpo.x), Math.round(this.body.bottom + balanco));
    this.visual.setFlipX(!this.olhandoDireita);
    if (!this.morto) {
      const alvoY = this.agachado ? 0.74 : 1;
      const alvoX = this.agachado ? 1.06 : 1;
      this.visual.scaleY += (alvoY - this.visual.scaleY) * 0.45;
      this.visual.scaleX += (alvoX - this.visual.scaleX) * 0.45;
      const piscando = this.invulneravel && Math.floor(this.cena.time.now / 70) % 2 === 0;
      this.visual.setAlpha(piscando ? 0.35 : 1);
      if (this.cena.time.now < this.cobertoDeOleoAte) this.visual.setTint(0x6b5a8a);
      else if (this.naAgua && !this.aguaLimpa) this.visual.setTint(0xa8c8a0);
      else this.visual.clearTint();
    }
  }

  /** Aplica dano com recuo e invulnerabilidade temporária. Retorna true se o dano foi aplicado. */
  receberDano(quantidade: number, origemX: number, recuo = 280): boolean {
    if (this.morto || this.invulneravel || this.cena.time.now < 0) return false;
    this.vida = Math.max(0, this.vida - quantidade);
    this.invulneravelAte = this.cena.time.now + 1200;
    this.controleTravadoAte = this.cena.time.now + 260;
    const lado = this.x >= origemX ? 1 : -1;
    this.body.setVelocity(lado * recuo, this.naAgua ? -120 : -300);
    this.visual.setTint(0xff6a5a);
    this.cena.som.tocar('dano');
    this.cena.cameras.main.shake(120, 0.006);
    this.cena.hud.atualizar();
    if (this.vida <= 0) this.morrer();
    return true;
  }

  curar(quantidade: number): void {
    this.vida = Math.min(VIDA_MAXIMA, this.vida + quantidade);
    this.cena.hud.atualizar();
  }

  /** Empurrão sem dano (cancela, jato d'água etc.). */
  empurrar(vx: number, vy: number, travarMs = 200): void {
    this.body.setVelocity(vx, vy);
    this.controleTravadoAte = this.cena.time.now + travarMs;
  }

  tornarInvulneravel(ms: number): void {
    this.invulneravelAte = Math.max(this.invulneravelAte, this.cena.time.now + ms);
  }

  private morrer(): void {
    this.morto = true;
    this.body.setVelocity(0, -380);
    this.body.checkCollision.none = true;
    this.cena.som.tocar('derrota');
    this.cena.tweens.add({
      targets: this.visual,
      angle: this.olhandoDireita ? -90 : 90,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeIn',
    });
    this.cena.time.delayedCall(1100, () => this.cena.aoMorrerJogador());
  }

  reviver(x: number, y: number): void {
    this.morto = false;
    this.vida = VIDA_MAXIMA;
    this.body.checkCollision.none = false;
    this.visual.setAngle(0).setAlpha(1).clearTint();
    this.posicionar(x, y);
    this.body.setVelocity(0, 0);
    this.invulneravelAte = this.cena.time.now + 2000;
    this.cena.hud.atualizar();
  }

  destruir(): void {
    this.visual.destroy();
    this.corpo.destroy();
  }
}
