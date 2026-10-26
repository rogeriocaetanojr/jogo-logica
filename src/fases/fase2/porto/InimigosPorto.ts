import Phaser from 'phaser';
import type { CenaFase2 } from '../CenaFase2';
import { COR, ESCALA, hexNum } from './ArtePorto';
import { PROF } from './EfeitosPorto';

/**
 * Inimigos do Porto Bugado: vírus e scripts do MegaBrain que tomaram máquinas, animais e o lixo do porto.
 * Vários só caem com a espuma, o que mantém as duas ferramentas em uso.
 */
export abstract class Inimigo {
  public ativo = true;
  public vida: number;
  public danoContato = 2;
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  protected readonly cena: CenaFase2;
  protected olhando = -1;
  private readonly olhos: Array<{ img: Phaser.GameObjects.Image; dx: number; dy: number }> = [];

  constructor(cena: CenaFase2, x: number, y: number, textura: string, vida: number, gravidade: boolean) {
    this.cena = cena;
    this.vida = vida;
    this.sprite = cena.physics.add.sprite(x, y, textura, 0);
    this.sprite.setScale(ESCALA).setDepth(PROF.inimigos);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(gravidade);
    if (gravidade) cena.inimigos.grupoChao.add(this.sprite);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  /** Olho verde-néon desenhado acima da fumaça: o perigo se lê pela cor. */
  protected adicionarOlho(dx: number, dy: number, largura = 1, altura = 1): void {
    const img = this.cena.add.image(this.x, this.y, 'pb-pixel');
    img.setDisplaySize(largura * ESCALA, altura * ESCALA).setTint(hexNum(COR.virus)).setDepth(PROF.emissivo);
    this.olhos.push({ img, dx, dy });
  }

  protected sincronizarOlhos(): void {
    const flip = this.sprite.flipX ? -1 : 1;
    for (const o of this.olhos) {
      o.img.setPosition(this.x + o.dx * ESCALA * flip, this.y + o.dy * ESCALA);
      o.img.setVisible(this.sprite.visible);
    }
  }

  abstract atualizar(tempo: number, delta: number): void;

  /** Retângulo do corpo para colisão com tiros e jogador. */
  contem(x: number, y: number, margem = 0): boolean {
    const b = this.body;
    return x >= b.left - margem && x <= b.right + margem && y >= b.top - margem && y <= b.bottom + margem;
  }

  /** Tiro de patch. Retorna true se o tiro foi consumido. */
  levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(tiro.x, tiro.y, 4)) return false;
    this.sofrer(1);
    return true;
  }

  /** Bola de espuma. Retorna true se a bola foi consumida. */
  levarEspuma(bola: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(bola.x, bola.y, 6)) return false;
    this.sofrer(1);
    return true;
  }

  protected bloquear(x: number, y: number, texto?: string): void {
    this.cena.efeitos.faisca(x, y);
    this.cena.som.tocar('tink');
    if (texto) this.cena.efeitos.textoFlutuante(this.x, this.body.top - 16, texto, '#C8C2B4', 11);
  }

  sofrer(dano: number): void {
    if (!this.ativo) return;
    this.vida -= dano;
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.cena.time.delayedCall(80, () => {
      if (this.sprite.active) this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    });
    if (this.vida <= 0) this.morrer();
    else this.cena.som.tocar('tink');
  }

  morrer(recompensa = true): void {
    if (!this.ativo) return;
    this.ativo = false;
    this.cena.efeitos.explosao(this.x, this.y, 0.8);
    this.cena.som.tocar('inimigo');
    if (recompensa) this.cena.soltarRecompensa(this.x, this.y);
    this.destruir();
  }

  /** Dano de contato no jogador (verificado pelo gerenciador). */
  tocarJogador(): void {
    const j = this.cena.jogador;
    j.receberDano(this.danoContato, this.x);
  }

  destruir(): void {
    this.ativo = false;
    for (const o of this.olhos) o.img.destroy();
    this.sprite.destroy();
  }
}

/* =========================================================================
 * GAIVÍRUS — gaivota-drone que dá rasantes em linha reta (1 tiro de patch)
 * ========================================================================= */
export class Gaivirus extends Inimigo {
  private estado: 'patrulha' | 'rasante' | 'subindo' = 'patrulha';
  private readonly x0: number;
  private readonly x1: number;
  private readonly baseY: number;
  private dir = -1;
  private fimRasante = 0;
  private recarga = 0;

  constructor(cena: CenaFase2, x: number, y: number, alcance = 260) {
    super(cena, x, y, 'pb-gaivirus', 1, false);
    this.x0 = x - alcance;
    this.x1 = x + alcance;
    this.baseY = y;
    this.sprite.play('pb-anim-gaivirus');
    this.body.setSize(11, 5);
    this.adicionarOlho(0, 0.5);
  }

  atualizar(tempo: number): void {
    const j = this.cena.jogador;
    if (this.estado === 'patrulha') {
      this.body.setVelocity(this.dir * 90, Math.cos(tempo / 260) * 40);
      if (this.x < this.x0) this.dir = 1;
      if (this.x > this.x1) this.dir = -1;
      const dx = j.x - this.x;
      if (tempo > this.recarga && Math.abs(dx) < 380 && j.y > this.y + 40 && !j.morto) {
        this.estado = 'rasante';
        const ang = Phaser.Math.Angle.Between(this.x, this.y, j.x, j.y - 10);
        this.body.setVelocity(Math.cos(ang) * 430, Math.sin(ang) * 430);
        this.fimRasante = tempo + 1300;
        this.cena.som.tocar('sirene');
      }
    } else if (this.estado === 'rasante') {
      if (tempo > this.fimRasante || this.y > 640) {
        this.estado = 'subindo';
      }
    } else {
      this.body.setVelocity(this.body.velocity.x * 0.96, -180);
      if (this.y <= this.baseY) {
        this.estado = 'patrulha';
        this.recarga = tempo + 1800;
      }
    }
    this.sprite.setFlipX(this.body.velocity.x > 0);
    this.sincronizarOlhos();
  }
}

/* =========================================================================
 * SIRI-SCRIPT — anda de lado e atira colchetes { } (2 tiros, por trás ou de cima)
 * ========================================================================= */
export class SiriScript extends Inimigo {
  private readonly x0: number;
  private readonly x1: number;
  private dir = 1;
  private proximoTiro = 0;
  private viradaEm = 0;

  constructor(cena: CenaFase2, x: number, y: number, x0: number, x1: number) {
    super(cena, x, y, 'pb-siri', 2, true);
    this.x0 = x0;
    this.x1 = x1;
    this.sprite.play('pb-anim-siri');
    this.body.setSize(12, 7, false).setOffset(0.5, 2);
    this.olhando = -1;
    this.sprite.setFlipX(true);
    this.adicionarOlho(1.5, -4.5);
    this.adicionarOlho(3.5, -4.5);
  }

  atualizar(tempo: number): void {
    const j = this.cena.jogador;
    // Anda de lado, sem virar o corpo
    if (this.x < this.x0) this.dir = 1;
    if (this.x > this.x1) this.dir = -1;
    this.body.setVelocityX(this.dir * 55);
    // Vira a garra-escudo para o jogador com atraso
    const lado = j.x > this.x ? 1 : -1;
    if (lado !== this.olhando && tempo > this.viradaEm) {
      this.viradaEm = tempo + 650;
      this.cena.time.delayedCall(450, () => {
        if (!this.ativo) return;
        this.olhando = j.x > this.x ? 1 : -1;
        this.sprite.setFlipX(this.olhando < 0);
      });
    }
    if (tempo > this.proximoTiro && Math.abs(j.x - this.x) < 520 && Math.abs(j.y - this.y) < 140 && !j.morto) {
      this.proximoTiro = tempo + 2300;
      this.cena.armas.dispararInimigo(this.x + this.olhando * 30, this.y - 10, this.olhando * 260, 0, 'pb-chave', {
        quadro: this.olhando > 0 ? 1 : 0,
        dano: 2,
        tamanho: [4, 5],
        vida: 2600,
      });
    }
    // Pisão: cair por cima causa dano no siri e quica o jogador
    const jb = j.body;
    if (!j.morto && jb.velocity.y > 60 && Math.abs(j.x - this.x) < 40 && jb.bottom > this.body.top - 6 && jb.bottom < this.body.top + 16) {
      j.body.setVelocityY(-430);
      j.tornarInvulneravel(250);
      this.sofrer(1);
    }
    this.sincronizarOlhos();
  }

  override levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(tiro.x, tiro.y, 4)) return false;
    const vx = (tiro.body as Phaser.Physics.Arcade.Body).velocity.x;
    if (Math.sign(vx) === -this.olhando) {
      this.bloquear(tiro.x, tiro.y, 'GARRA-ESCUDO! ATAQUE POR TRÁS OU DE CIMA');
      return true;
    }
    this.sofrer(1);
    return true;
  }

  override tocarJogador(): void {
    const j = this.cena.jogador;
    if (j.body.velocity.y > 40 && j.body.bottom < this.body.top + 18) return;
    super.tocarJogador();
  }
}

/* =========================================================================
 * JANELA POP-UP — cobre parte da tela; só fecha com tiro no X
 * ========================================================================= */
export class JanelaPopup extends Inimigo {
  constructor(cena: CenaFase2, x: number, y: number) {
    super(cena, x, y, 'pb-janela', 1, false);
    this.sprite.play('pb-anim-janela');
    this.sprite.setDepth(PROF.emissivo - 1);
    this.danoContato = 0;
    this.sprite.setScale(0);
    cena.tweens.add({ targets: this.sprite, scale: ESCALA, duration: 260, ease: 'Back.easeOut' });
    cena.som.tocar('glitch');
  }

  atualizar(tempo: number): void {
    const j = this.cena.jogador;
    const alvoX = j.x + j.direcao * 230;
    const alvoY = Phaser.Math.Clamp(j.y - 150, 150, 520);
    this.body.setVelocity((alvoX - this.x) * 0.9, (alvoY - this.y) * 0.9 + Math.sin(tempo / 400) * 20);
  }

  /** Área do botão X (canto superior direito). */
  private noX(x: number, y: number): boolean {
    const esq = this.x - 32 * ESCALA;
    const topo = this.y - 20 * ESCALA;
    return x >= esq + 52 * ESCALA && x <= esq + 64 * ESCALA && y >= topo - 6 && y <= topo + 10 * ESCALA;
  }

  override levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(tiro.x, tiro.y)) return false;
    if (this.noX(tiro.x, tiro.y)) {
      this.cena.efeitos.textoFlutuante(this.x, this.y, 'POP-UP FECHADO!', COR.virus, 13);
      this.morrer();
    } else {
      this.bloquear(tiro.x, tiro.y, 'ACERTE O [X]!');
    }
    return true;
  }

  override levarEspuma(): boolean {
    return false;
  }

  override tocarJogador(): void {
    // Não causa dano: só atrapalha a visão
  }
}

/* =========================================================================
 * EMPILHADEIRA ZUMBI — avança em linha reta e ergue os garfos ao ver o jogador
 * ========================================================================= */
export class EmpilhadeiraZumbi extends Inimigo {
  private estado: 'patrulha' | 'alerta' | 'investida' | 'tonta' = 'patrulha';
  private readonly x0: number;
  private readonly x1: number;
  private ate = 0;
  private origemInvestida = 0;

  constructor(cena: CenaFase2, x: number, y: number, x0: number, x1: number) {
    super(cena, x, y, 'pb-empilhadeira', 3, true);
    this.x0 = x0;
    this.x1 = x1;
    this.body.setSize(26, 15, false).setOffset(0, 5);
    this.olhando = 1;
    this.adicionarOlho(4.5, -1.5, 2, 2);
  }

  atualizar(tempo: number): void {
    const j = this.cena.jogador;
    const frente = this.olhando;
    switch (this.estado) {
      case 'patrulha': {
        this.sprite.setFrame(0);
        this.body.setVelocityX(frente * 60);
        if ((this.x < this.x0 && frente < 0) || (this.x > this.x1 && frente > 0)) this.olhando = -frente;
        const dx = j.x - this.x;
        if (!j.morto && Math.sign(dx) === frente && Math.abs(dx) < 430 && Math.abs(j.y - this.y) < 90) {
          this.estado = 'alerta';
          this.ate = tempo + 600;
          this.body.setVelocityX(0);
          this.sprite.setFrame(1);
          this.cena.som.tocar('guindaste');
        }
        break;
      }
      case 'alerta':
        if (tempo > this.ate) {
          this.estado = 'investida';
          this.origemInvestida = this.x;
          this.danoContato = 3;
        }
        break;
      case 'investida':
        this.body.setVelocityX(frente * 330);
        if (Math.abs(this.x - this.origemInvestida) > 700 || this.body.blocked.left || this.body.blocked.right || this.x < this.x0 - 120 || this.x > this.x1 + 120) {
          this.estado = 'tonta';
          this.ate = tempo + 1100;
          this.body.setVelocityX(0);
          this.danoContato = 2;
          this.cena.cameras.main.shake(100, 0.004);
        }
        break;
      case 'tonta':
        if (tempo > this.ate) {
          this.olhando = -frente;
          this.estado = 'patrulha';
        }
        break;
    }
    this.sprite.setFlipX(this.olhando < 0);
    this.sincronizarOlhos();
  }

  override levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(tiro.x, tiro.y, 4)) return false;
    const vx = (tiro.body as Phaser.Physics.Arcade.Body).velocity.x;
    if (Math.sign(vx) === -this.olhando) {
      this.bloquear(tiro.x, tiro.y, 'BLINDADA! ACERTE O MOTOR TRASEIRO');
      return true;
    }
    this.sofrer(1);
    return true;
  }
}

/* =========================================================================
 * ÁGUA-VÍRUS — água-viva de sacolas; espuma prende, depois 1 tiro
 * ========================================================================= */
export class AguaVirus extends Inimigo {
  private presaAte = 0;
  private readonly fase: number;
  private readonly baseX: number;
  private casca: Phaser.GameObjects.Image | null = null;

  constructor(cena: CenaFase2, x: number, fase = 0) {
    super(cena, x, cena.agua?.nivel ?? 600, 'pb-agua-virus', 1, false);
    this.fase = fase;
    this.baseX = x;
    this.sprite.play('pb-anim-agua-virus');
    this.sprite.setDepth(PROF.agua + 1);
    this.body.setSize(9, 12);
    this.adicionarOlho(-2.5, -1.5);
    this.adicionarOlho(2.5, -1.5);
  }

  get presa(): boolean {
    return this.cena.time.now < this.presaAte;
  }

  atualizar(tempo: number): void {
    const nivel = this.cena.agua?.nivel ?? 600;
    if (this.presa) {
      this.body.setVelocity(0, 0);
      this.casca?.setPosition(this.x, this.y);
    } else {
      if (this.casca) {
        this.casca.destroy();
        this.casca = null;
        this.sprite.anims.resume();
      }
      const s = Math.sin(tempo / 560 + this.fase);
      const alvoY = nivel + 10 - Math.max(0, s) * 170;
      const alvoX = this.baseX + Math.sin(tempo / 1700 + this.fase) * 40;
      this.body.setVelocity((alvoX - this.x) * 4, (alvoY - this.y) * 4);
    }
    this.sincronizarOlhos();
  }

  override levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(tiro.x, tiro.y, 4)) return false;
    if (!this.presa) {
      this.bloquear(tiro.x, tiro.y, 'SACOLAS ABSORVEM O PATCH! USE ESPUMA');
      return true;
    }
    this.sofrer(1);
    return true;
  }

  override levarEspuma(bola: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(bola.x, bola.y, 8)) return false;
    this.presaAte = this.cena.time.now + 5000;
    this.sprite.anims.pause();
    if (!this.casca) {
      this.casca = this.cena.add.image(this.x, this.y, 'pb-plat-espuma', 0).setScale(ESCALA * 0.7).setDepth(PROF.agua + 2).setAlpha(0.85);
    }
    this.cena.efeitos.textoFlutuante(this.x, this.y - 50, 'PRESA NA ESPUMA!', COR.espuma, 12);
    return true;
  }

  override tocarJogador(): void {
    if (this.presa) return;
    super.tocarJogador();
  }

  override destruir(): void {
    this.casca?.destroy();
    super.destruir();
  }
}

/* =========================================================================
 * MANCHA VIVA — poça de óleo que se ergue, deixa lento e pega fogo; espuma seca e vira plataforma
 * ========================================================================= */
export class ManchaViva extends Inimigo {
  private estado: 'poca' | 'erguendo' | 'perseguindo' = 'poca';
  private ate = 0;
  private emChamas = false;
  private chama: Phaser.GameObjects.Sprite | null = null;

  constructor(cena: CenaFase2, x: number, y: number) {
    super(cena, x, y, 'pb-mancha', 99, true);
    this.body.setSize(18, 4, false).setOffset(1, 10);
    this.danoContato = 1;
  }

  atualizar(tempo: number): void {
    const j = this.cena.jogador;
    const dx = j.x - this.x;
    if (this.estado === 'poca') {
      this.sprite.setFrame(0);
      this.body.setVelocityX(0);
      if (Math.abs(dx) < 270 && Math.abs(j.y - this.y) < 150) {
        this.estado = 'erguendo';
        this.ate = tempo + 450;
        this.sprite.setFrame(1);
      }
    } else if (this.estado === 'erguendo') {
      if (tempo > this.ate) {
        this.estado = 'perseguindo';
        this.sprite.setFrame(2);
        this.body.setSize(16, 11, false).setOffset(2, 3);
        this.adicionarOlho(-3, -1);
        this.adicionarOlho(2, -1);
      }
    } else {
      this.body.setVelocityX(Math.sign(dx) * (this.emChamas ? 95 : 70));
      this.sprite.setFlipX(dx < 0);
    }
    // Encostou no fogo: pega fogo
    if (!this.emChamas && (this.cena.fogo.focoEm(this.x, this.y, 70) || this.cena.fogoNoChaoEm(this.x))) {
      this.emChamas = true;
      this.danoContato = 3;
      this.chama = this.cena.add.sprite(this.x, this.y, 'pb-fogo-m', 0).setOrigin(0.5, 1).setScale(ESCALA * 0.8).setDepth(PROF.fogo);
      this.chama.play('pb-anim-fogo-m');
      if (this.estado === 'poca') this.estado = 'erguendo';
    }
    this.chama?.setPosition(this.x, this.body.bottom);
    this.sincronizarOlhos();
  }

  override levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(tiro.x, tiro.y, 4) || this.estado === 'poca') return false;
    this.bloquear(tiro.x, tiro.y, 'SPLOSH! O ÓLEO ENGOLE O PATCH');
    return true;
  }

  override levarEspuma(bola: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(bola.x, bola.y, 12)) return false;
    // Espuma seca a mancha e a transforma em plataforma permanente
    const x = this.x;
    const topo = this.body.bottom - 28;
    this.cena.criarPlataformaFixa(x, topo, 72, 'pb-mancha-seca');
    this.cena.efeitos.vapor(x, topo, 1.4);
    this.cena.efeitos.textoFlutuante(x, topo - 30, 'MANCHA SECA = PLATAFORMA', COR.espuma, 12);
    this.ativo = false;
    this.cena.soltarRecompensa(x, topo - 20);
    this.destruir();
    return true;
  }

  override tocarJogador(): void {
    const j = this.cena.jogador;
    if (this.estado === 'poca') {
      j.cobertoDeOleoAte = this.cena.time.now + 1500;
      return;
    }
    if (j.receberDano(this.danoContato, this.x)) j.cobertoDeOleoAte = this.cena.time.now + 2600;
  }

  override destruir(): void {
    this.chama?.destroy();
    super.destruir();
  }
}

/* =========================================================================
 * FUMACÊ — nuvem com olhos que reduz ainda mais a visão; espuma ou ventiladores a dispersam
 * ========================================================================= */
export class Fumace extends Inimigo {
  private readonly fase = Math.random() * 6;
  public empurradoAte = 0;

  constructor(cena: CenaFase2, x: number, y: number) {
    super(cena, x, y, 'pb-fumace', 1, false);
    this.sprite.play('pb-anim-fumace');
    this.sprite.setDepth(PROF.fumacaFrente - 1);
    this.body.setSize(18, 12);
    this.danoContato = 1;
    this.adicionarOlho(-2.5, -0.5, 1, 1);
    this.adicionarOlho(3.5, -0.5, 1, 1);
  }

  /** Quanto este Fumacê reduz a visão (0..1) pela distância ao jogador. */
  influencia(): number {
    const d = Phaser.Math.Distance.Between(this.x, this.y, this.cena.jogador.x, this.cena.jogador.y);
    return Phaser.Math.Clamp(1 - (d - 60) / 240, 0, 1);
  }

  atualizar(tempo: number): void {
    const j = this.cena.jogador;
    if (tempo < this.empurradoAte) {
      this.sprite.setAlpha(Math.max(0, this.sprite.alpha - 0.02));
      if (this.sprite.alpha <= 0.05) this.morrer(true);
      return;
    }
    const ang = Phaser.Math.Angle.Between(this.x, this.y, j.x, j.y - 30);
    this.body.setVelocity(Math.cos(ang) * 55, Math.sin(ang) * 55 + Math.sin(tempo / 300 + this.fase) * 30);
    this.sincronizarOlhos();
  }

  override levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(tiro.x, tiro.y, 4)) return false;
    this.cena.efeitos.textoFlutuante(this.x, this.y - 40, 'PATCH SE PERDE NA FUMAÇA', '#C8C2B4', 11);
    return true;
  }

  override levarEspuma(bola: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(bola.x, bola.y, 10)) return false;
    this.cena.efeitos.vapor(this.x, this.y, 1.6);
    this.morrer();
    return true;
  }

  override tocarJogador(): void {
    if (this.cena.jogador.receberDano(this.danoContato, this.x)) {
      this.cena.efeitos.textoFlutuante(this.cena.jogador.x, this.cena.jogador.y - 70, 'COF! COF! FIQUE ABAIXADO!', '#C8C2B4', 12);
    }
  }
}

/* =========================================================================
 * BARRIL BUGADO — rola até o jogador e explode se encostar no fogo
 * ========================================================================= */
export class BarrilBugado extends Inimigo {
  private aceso = false;
  private apagado = false;
  private explodeEm = 0;
  private readonly dir: number;

  constructor(cena: CenaFase2, x: number, y: number, dir: number) {
    super(cena, x, y, 'pb-barril', 1, true);
    this.dir = dir;
    this.sprite.play('pb-anim-barril');
    this.body.setSize(10, 10);
    this.body.setBounce(0.1, 0.2);
    this.danoContato = 1;
  }

  atualizar(tempo: number): void {
    if (this.apagado) {
      this.body.setVelocityX(this.body.velocity.x * 0.9);
      return;
    }
    this.body.setVelocityX(this.dir * 175);
    if (this.body.blocked.left || this.body.blocked.right) {
      this.morrer(false);
      return;
    }
    if (!this.aceso && (this.cena.fogo.focoEm(this.x, this.y, 20) || this.cena.fogoNoChaoEm(this.x))) {
      this.aceso = true;
      this.explodeEm = tempo + 650;
      this.sprite.setTint(0xff7a4a);
    }
    if (this.aceso) {
      this.sprite.setVisible(Math.floor(tempo / 70) % 2 === 0);
      if (tempo > this.explodeEm) this.explodir();
    }
  }

  private explodir(): void {
    const x = this.x;
    const y = this.y;
    this.ativo = false;
    this.cena.efeitos.explosao(x, y, 1.6);
    this.cena.som.tocar('explosao');
    this.cena.cameras.main.shake(220, 0.01);
    const j = this.cena.jogador;
    if (Phaser.Math.Distance.Between(x, y, j.x, j.y) < 120) j.receberDano(3, x, 360);
    this.destruir();
  }

  override levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(tiro.x, tiro.y, 4)) return false;
    this.bloquear(tiro.x, tiro.y);
    return true;
  }

  override levarEspuma(bola: Phaser.Physics.Arcade.Image): boolean {
    if (!this.contem(bola.x, bola.y, 10) || this.apagado) return false;
    this.apagado = true;
    this.aceso = false;
    this.sprite.anims.stop();
    this.sprite.setVisible(true).setTint(0xb8c8d0);
    this.cena.efeitos.vapor(this.x, this.y);
    this.cena.time.delayedCall(2500, () => {
      if (this.ativo) {
        this.ativo = false;
        this.cena.tweens.add({ targets: this.sprite, alpha: 0, duration: 400, onComplete: () => this.destruir() });
      }
    });
    return true;
  }

  override tocarJogador(): void {
    if (this.apagado) return;
    if (this.aceso) {
      this.explodir();
      return;
    }
    if (this.cena.jogador.receberDano(this.danoContato, this.x)) this.morrer(false);
  }
}

/* =========================================================================
 * GARRA DE GUINDASTE — desce para agarrar; tiro no cabo derruba a garra
 * ========================================================================= */
export class GarraGuindaste extends Inimigo {
  private estado: 'seguindo' | 'descendo' | 'subindo' | 'caindo' = 'seguindo';
  private readonly trilhoY: number;
  private readonly chaoY: number;
  private readonly x0: number;
  private readonly x1: number;
  private ate = 0;
  private readonly cabo: Phaser.GameObjects.Graphics;
  private readonly sombra: Phaser.GameObjects.Ellipse;

  constructor(cena: CenaFase2, x: number, trilhoY: number, chaoY: number, x0: number, x1: number) {
    super(cena, x, trilhoY + 120, 'pb-garra', 1, false);
    this.trilhoY = trilhoY;
    this.chaoY = chaoY;
    this.x0 = x0;
    this.x1 = x1;
    this.body.setSize(14, 12);
    this.cabo = cena.add.graphics().setDepth(PROF.inimigos - 1);
    this.sombra = cena.add.ellipse(x, chaoY - 2, 70, 12, 0x000000, 0.45).setDepth(PROF.estruturas + 2);
    this.danoContato = 2;
  }

  atualizar(tempo: number): void {
    const j = this.cena.jogador;
    const repouso = this.trilhoY + 110;
    switch (this.estado) {
      case 'seguindo': {
        this.sprite.setFrame(0);
        const alvo = Phaser.Math.Clamp(j.x, this.x0, this.x1);
        this.body.setVelocity(Phaser.Math.Clamp((alvo - this.x) * 2, -95, 95), (repouso - this.y) * 3);
        if (Math.abs(j.x - this.x) < 34 && tempo > this.ate && j.x > this.x0 - 40 && j.x < this.x1 + 40) {
          this.estado = 'descendo';
          this.ate = tempo + 450;
          this.body.setVelocity(0, 0);
          this.cena.som.tocar('guindaste');
        }
        break;
      }
      case 'descendo':
        if (tempo > this.ate) this.body.setVelocity(0, 760);
        if (this.body.bottom >= this.chaoY) {
          this.body.setVelocity(0, 0);
          this.sprite.setFrame(1);
          this.estado = 'subindo';
          this.cena.cameras.main.shake(80, 0.003);
        }
        break;
      case 'subindo':
        this.body.setVelocity(0, -240);
        if (this.y <= repouso) {
          this.estado = 'seguindo';
          this.ate = tempo + 1600;
        }
        break;
      case 'caindo':
        if (this.body.bottom >= this.chaoY) {
          this.morrer();
          return;
        }
        break;
    }
    // Cabo e sombra de aviso (a sombra escurece quando a garra se aproxima do chão)
    this.cabo.clear();
    if (this.estado !== 'caindo') {
      this.cabo.fillStyle(0x2a2426, 1);
      this.cabo.fillRect(Math.round(this.x) - 2, this.trilhoY, 4, this.body.top - this.trilhoY);
      this.cabo.fillStyle(0x8a847c, 1);
      this.cabo.fillRect(Math.round(this.x) - 2, this.trilhoY, 2, this.body.top - this.trilhoY);
    }
    this.sombra.setPosition(this.x, this.chaoY - 2);
    const prox = 1 - (this.chaoY - this.body.bottom) / (this.chaoY - repouso);
    this.sombra.setScale(0.6 + prox * 0.6, 1).setAlpha(this.estado === 'descendo' ? 0.7 : 0.25 + prox * 0.4);
  }

  override levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (this.estado !== 'caindo' && Math.abs(tiro.x - this.x) < 14 && tiro.y > this.trilhoY && tiro.y < this.body.top) {
      this.estado = 'caindo';
      this.body.setAllowGravity(true);
      this.body.setVelocity(0, 100);
      this.cena.efeitos.faisca(this.x, tiro.y);
      this.cena.efeitos.textoFlutuante(this.x, tiro.y - 20, 'CABO CORTADO!', COR.virus, 12);
      this.cabo.clear();
      return true;
    }
    if (!this.contem(tiro.x, tiro.y, 4)) return false;
    this.bloquear(tiro.x, tiro.y, 'MIRE NO CABO!');
    return true;
  }

  override levarEspuma(): boolean {
    return false;
  }

  override tocarJogador(): void {
    if (this.estado === 'descendo' || this.estado === 'caindo') super.tocarJogador();
  }

  override destruir(): void {
    this.cabo.destroy();
    this.sombra.destroy();
    super.destruir();
  }
}

/* =========================================================================
 * GERENCIADOR
 * ========================================================================= */
export class GerenciadorInimigos {
  public readonly lista: Inimigo[] = [];
  public readonly grupoChao: Phaser.Physics.Arcade.Group;
  private readonly cena: CenaFase2;

  constructor(cena: CenaFase2) {
    this.cena = cena;
    this.grupoChao = cena.physics.add.group();
    cena.physics.add.collider(this.grupoChao, cena.solidos);
    cena.physics.add.collider(this.grupoChao, cena.grupoMoveis);
  }

  adicionar<T extends Inimigo>(inimigo: T): T {
    this.lista.push(inimigo);
    return inimigo;
  }

  atualizar(tempo: number, delta: number): void {
    const j = this.cena.jogador;
    const cam = this.cena.cameras.main;
    let reducao = 0;
    for (const ini of this.lista) {
      if (!ini.ativo) continue;
      // Só processa inimigos perto da tela
      if (ini.x < cam.scrollX - 500 || ini.x > cam.scrollX + cam.width + 500 || ini.y < cam.scrollY - 500 || ini.y > cam.scrollY + cam.height + 500) {
        if (ini.body.allowGravity === false) ini.body.setVelocity(0, 0);
        continue;
      }
      ini.atualizar(tempo, delta);
      if (!ini.ativo) continue;
      if (ini instanceof Fumace) reducao = Math.max(reducao, ini.influencia());
      if (!j.morto && ini.danoContato >= 0 && Phaser.Geom.Intersects.RectangleToRectangle(ini.body.getBounds(new Phaser.Geom.Rectangle()) as Phaser.Geom.Rectangle, j.body.getBounds(new Phaser.Geom.Rectangle()) as Phaser.Geom.Rectangle)) {
        ini.tocarJogador();
      }
      // Água contaminada mata inimigos de chão que caírem
      if (ini.body.allowGravity && this.cena.agua && this.cena.agua.estaSubmerso(ini.x, ini.y + 30)) ini.morrer(false);
    }
    this.cena.fumaca.reducaoFumace = reducao;
    for (let i = this.lista.length - 1; i >= 0; i--) if (!this.lista[i].ativo) this.lista.splice(i, 1);
  }

  /** Testa um tiro de patch contra os inimigos. Retorna true se o tiro foi consumido. */
  atingirPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    for (const ini of this.lista) {
      if (ini.ativo && ini.levarPatch(tiro)) return true;
    }
    return false;
  }

  atingirEspuma(bola: Phaser.Physics.Arcade.Image): boolean {
    for (const ini of this.lista) {
      if (ini.ativo && ini.levarEspuma(bola)) return true;
    }
    return false;
  }

  /** Empurra e dispersa Fumacês dentro de um retângulo (ventiladores). */
  ventilar(area: Phaser.Geom.Rectangle, dir: number): void {
    for (const ini of this.lista) {
      if (ini instanceof Fumace && ini.ativo && area.contains(ini.x, ini.y)) {
        ini.body.setVelocity(dir * 260, -40);
        ini.empurradoAte = this.cena.time.now + 2000;
      }
    }
  }

  destruirTodos(): void {
    for (const ini of this.lista) ini.destruir();
    this.lista.length = 0;
  }
}
