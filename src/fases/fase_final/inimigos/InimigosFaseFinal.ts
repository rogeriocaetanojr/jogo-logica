import Phaser from 'phaser';
import { COR, hexNum } from '../ArteFaseFinal';
import type { ConfigInimigo } from '../andares/tiposAndar';
import { balaoFala } from '../BalaoFala';
import { ANDAR_FASE_FINAL, COMBATE_FASE_FINAL, ESCALA_ARTE, INIMIGOS_FASE_FINAL } from '../constantesFaseFinal';
import { FALAS_INIMIGOS } from '../DialogosFaseFinal';
import type { JogadorFaseFinal } from '../JogadorFaseFinal';
import { TEX_DRONE_CAPTCHA, gerarTexturaDrone } from '../npcs/TexturasNpc';
import { ANIM_INIMIGOS, TEX_INIMIGOS, gerarTexturasInimigos } from './TexturasInimigos';

const A = ANDAR_FASE_FINAL;
const I = INIMIGOS_FASE_FINAL;
const PROF = 18;

/** O que aconteceu quando o jogador encostou num inimigo neste quadro. */
export type ContatoInimigo = 'pisao' | 'dano' | null;

interface Inimigo {
  readonly vivo: boolean;
  readonly x: number;
  update(delta: number, jogador: JogadorFaseFinal): void;
  contato(jogador: JogadorFaseFinal): ContatoInimigo;
  derrotar(): void;
  destruir(): void;
}

function retangulo(cx: number, cy: number, w: number, h: number): Phaser.Geom.Rectangle {
  return new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
}

function corpoDoJogador(jogador: JogadorFaseFinal): Phaser.Geom.Rectangle {
  const c = jogador.corpo;
  return new Phaser.Geom.Rectangle(c.x, c.y, c.width, c.height);
}

/** Pisão: o jogador está caindo e os pés estão perto do topo do inimigo. */
function ehPisao(jogador: JogadorFaseFinal, topo: number): boolean {
  const c = jogador.corpo;
  return c.velocity.y > COMBATE_FASE_FINAL.VELOCIDADE_MIN_PISAO && c.bottom <= topo + COMBATE_FASE_FINAL.MARGEM_PISAO;
}

/** Animação de derrota comum: achata, some e solta um balão. */
function animarDerrota(cena: Phaser.Scene, visual: Phaser.GameObjects.Sprite, fala: string): void {
  balaoFala(cena, visual.x, visual.y - visual.displayHeight - 6, fala, 1300);
  cena.tweens.add({
    targets: visual,
    scaleY: visual.scaleY * 0.3,
    scaleX: visual.scaleX * 1.3,
    alpha: 0,
    duration: 260,
    onComplete: () => visual.destroy(),
  });
}

/* =========================================================================
 * SPAM BOT: anda em linha reta e vira na parede ou no limite da patrulha
 * ========================================================================= */

class SpamBot implements Inimigo {
  public vivo = true;
  private readonly cena: Phaser.Scene;
  private readonly corpo: Phaser.GameObjects.Zone;
  private readonly visual: Phaser.GameObjects.Sprite;
  private readonly colisor: Phaser.Physics.Arcade.Collider;
  private readonly cfg: ConfigInimigo;
  private direcao: -1 | 1 = -1;

  constructor(cena: Phaser.Scene, cfg: ConfigInimigo, solidos: Phaser.Physics.Arcade.StaticGroup) {
    this.cena = cena;
    this.cfg = cfg;
    const s = I.SPAM_BOT;
    this.corpo = cena.add.zone(cfg.x, A.CHAO_Y - s.ALTURA / 2 - 2, s.LARGURA, s.ALTURA);
    cena.physics.add.existing(this.corpo);
    this.colisor = cena.physics.add.collider(this.corpo, solidos);
    this.visual = cena.add.sprite(cfg.x, A.CHAO_Y, TEX_INIMIGOS.SPAM_BOT, 0).setOrigin(0.5, 1).setScale(ESCALA_ARTE).setDepth(PROF);
    this.visual.play(ANIM_INIMIGOS.SPAM_BOT_ANDA);
  }

  get x(): number {
    return this.corpo.x;
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.corpo.body as Phaser.Physics.Arcade.Body;
  }

  update(): void {
    if (!this.vivo) return;
    const b = this.body;
    const min = this.cfg.minX ?? -Infinity;
    const max = this.cfg.maxX ?? Infinity;
    if (b.blocked.left || this.corpo.x <= min) this.direcao = 1;
    else if (b.blocked.right || this.corpo.x >= max) this.direcao = -1;
    b.setVelocityX(this.direcao * I.SPAM_BOT.VELOCIDADE);
    this.visual.setPosition(this.corpo.x, b.bottom + 2).setFlipX(this.direcao > 0);
  }

  contato(jogador: JogadorFaseFinal): ContatoInimigo {
    if (!this.vivo) return null;
    const b = this.body;
    const meu = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
    if (!Phaser.Geom.Rectangle.Overlaps(corpoDoJogador(jogador), meu)) return null;
    return ehPisao(jogador, b.top) ? 'pisao' : 'dano';
  }

  derrotar(): void {
    if (!this.vivo) return;
    this.vivo = false;
    this.colisor.destroy();
    this.corpo.destroy();
    animarDerrota(this.cena, this.visual, FALAS_INIMIGOS.SPAM_BOT_DERROTADO);
  }

  destruir(): void {
    this.vivo = false;
    if (this.colisor.active) this.colisor.destroy();
    if (this.corpo.active) this.corpo.destroy();
    if (this.visual.active) this.visual.destroy();
  }
}

/* =========================================================================
 * DRONE CAPTCHA: patrulha no ar; quando o jogador passa embaixo, pisca,
 * pergunta "Você é um robô?" e mergulha em linha reta
 * ========================================================================= */

type EstadoDrone = 'patrulha' | 'aviso' | 'mergulho' | 'chao' | 'subida';

class DroneCaptcha implements Inimigo {
  public vivo = true;
  public x: number;
  private y: number;
  private readonly yBase: number;
  private readonly yChao: number;
  private readonly cena: Phaser.Scene;
  private readonly visual: Phaser.GameObjects.Sprite;
  private estado: EstadoDrone = 'patrulha';
  private direcao: -1 | 1 = 1;
  private relogioMs = 0;
  private recargaMs = 0;
  private readonly cfg: ConfigInimigo;

  constructor(cena: Phaser.Scene, cfg: ConfigInimigo) {
    this.cena = cena;
    this.cfg = cfg;
    this.x = cfg.x;
    this.yBase = cfg.y ?? 260;
    this.y = this.yBase;
    this.yChao = A.CHAO_Y - I.DRONE.ALTURA / 2 - 6;
    this.visual = cena.add.sprite(this.x, this.y, TEX_DRONE_CAPTCHA, 0).setScale(ESCALA_ARTE).setDepth(PROF);
    this.visual.play(`${TEX_DRONE_CAPTCHA}-voa`);
  }

  update(delta: number, jogador: JogadorFaseFinal): void {
    if (!this.vivo) return;
    const d = I.DRONE;
    const dt = delta / 1000;
    this.relogioMs += delta;
    this.recargaMs = Math.max(0, this.recargaMs - delta);

    switch (this.estado) {
      case 'patrulha': {
        const min = this.cfg.minX ?? this.cfg.x - 200;
        const max = this.cfg.maxX ?? this.cfg.x + 200;
        this.x += this.direcao * d.VELOCIDADE * dt;
        if (this.x <= min) this.direcao = 1;
        if (this.x >= max) this.direcao = -1;
        const embaixo = Math.abs(jogador.x - this.x) < d.ALCANCE_GATILHO && jogador.y > this.y;
        if (embaixo && this.recargaMs === 0) {
          this.estado = 'aviso';
          this.relogioMs = 0;
          balaoFala(this.cena, this.x, this.y - 30, FALAS_INIMIGOS.DRONE_AVISO, d.AVISO_MS + 200);
        }
        break;
      }
      case 'aviso':
        this.visual.setTint(Math.floor(this.relogioMs / 90) % 2 === 0 ? hexNum(COR.vermelho) : 0xffffff);
        if (this.relogioMs >= d.AVISO_MS) {
          this.visual.clearTint();
          this.estado = 'mergulho';
        }
        break;
      case 'mergulho':
        this.y = Math.min(this.yChao, this.y + d.VELOCIDADE_MERGULHO * dt);
        if (this.y >= this.yChao) {
          this.estado = 'chao';
          this.relogioMs = 0;
          this.cena.cameras.main.shake(90, 0.002);
        }
        break;
      case 'chao':
        if (this.relogioMs >= d.ESPERA_NO_CHAO_MS) this.estado = 'subida';
        break;
      case 'subida':
        this.y = Math.max(this.yBase, this.y - d.VELOCIDADE_SUBIDA * dt);
        if (this.y <= this.yBase) {
          this.estado = 'patrulha';
          this.recargaMs = d.RECARGA_MS;
        }
        break;
    }
    const flutuar = this.estado === 'patrulha' ? Math.sin(this.relogioMs / 260) * 4 : 0;
    this.visual.setPosition(this.x, this.y + flutuar).setFlipX(this.direcao > 0);
  }

  contato(jogador: JogadorFaseFinal): ContatoInimigo {
    if (!this.vivo) return null;
    const meu = retangulo(this.x, this.y, I.DRONE.LARGURA, I.DRONE.ALTURA);
    if (!Phaser.Geom.Rectangle.Overlaps(corpoDoJogador(jogador), meu)) return null;
    return ehPisao(jogador, meu.top) ? 'pisao' : 'dano';
  }

  derrotar(): void {
    if (!this.vivo) return;
    this.vivo = false;
    this.visual.stop();
    animarDerrota(this.cena, this.visual, FALAS_INIMIGOS.DRONE_DERROTADO);
  }

  destruir(): void {
    this.vivo = false;
    if (this.visual.active) this.visual.destroy();
  }
}

/* =========================================================================
 * TORRETA FIREWALL: fixa e indestrutível; mira acende 0,5 s antes de cada
 * laser horizontal, em intervalo regular
 * ========================================================================= */

class TorretaFirewall implements Inimigo {
  public readonly vivo = true;
  public readonly x: number;
  private readonly visual: Phaser.GameObjects.Sprite;
  private readonly feixe: Phaser.GameObjects.Graphics;
  private readonly bloco: Phaser.GameObjects.Zone;
  private readonly solidos: Phaser.Physics.Arcade.StaticGroup;
  private readonly direcao: -1 | 1;
  private readonly alcance: number;
  private relogioMs = 0;

  constructor(cena: Phaser.Scene, cfg: ConfigInimigo, solidos: Phaser.Physics.Arcade.StaticGroup) {
    this.solidos = solidos;
    this.x = cfg.x;
    this.direcao = cfg.direcao ?? -1;
    this.alcance = cfg.alcance ?? I.TORRETA.ALCANCE_PADRAO;
    this.visual = cena.add
      .sprite(cfg.x, A.CHAO_Y, TEX_INIMIGOS.TORRETA, 0)
      .setOrigin(0.5, 1)
      .setScale(ESCALA_ARTE)
      .setFlipX(this.direcao > 0)
      .setDepth(PROF);
    this.feixe = cena.add.graphics().setDepth(PROF + 1);
    // A torreta é sólida: dá para pular e ficar em cima dela
    this.bloco = cena.add.zone(cfg.x, A.CHAO_Y - 24, 40, 48);
    solidos.add(this.bloco);
  }

  private get boca(): number {
    return this.x + this.direcao * 24;
  }

  private get yFeixe(): number {
    return A.CHAO_Y - I.TORRETA.ALTURA_FEIXE;
  }

  private get fase(): 'espera' | 'aviso' | 'disparo' {
    const t = I.TORRETA;
    if (this.relogioMs >= t.PERIODO_MS - t.DISPARO_MS) return 'disparo';
    if (this.relogioMs >= t.PERIODO_MS - t.DISPARO_MS - t.AVISO_MS) return 'aviso';
    return 'espera';
  }

  update(delta: number): void {
    const t = I.TORRETA;
    this.relogioMs = (this.relogioMs + delta) % t.PERIODO_MS;
    const g = this.feixe;
    g.clear();
    const fim = this.boca + this.direcao * this.alcance;
    const fase = this.fase;
    this.visual.setFrame(fase === 'espera' ? 0 : 1);
    if (fase === 'aviso') {
      // Mira acendendo: linha fina piscando
      const piscando = Math.floor(this.relogioMs / 80) % 2 === 0;
      g.lineStyle(2, hexNum(COR.vermelho), piscando ? 0.7 : 0.3);
      g.lineBetween(this.boca, this.yFeixe, fim, this.yFeixe);
    } else if (fase === 'disparo') {
      g.lineStyle(t.ESPESSURA_FEIXE + 10, hexNum(COR.vermelho), 0.25);
      g.lineBetween(this.boca, this.yFeixe, fim, this.yFeixe);
      g.lineStyle(t.ESPESSURA_FEIXE, hexNum(COR.vermelho), 0.9);
      g.lineBetween(this.boca, this.yFeixe, fim, this.yFeixe);
      g.lineStyle(4, 0xffe0e6, 1);
      g.lineBetween(this.boca, this.yFeixe, fim, this.yFeixe);
    }
  }

  contato(jogador: JogadorFaseFinal): ContatoInimigo {
    if (this.fase !== 'disparo') return null;
    const x0 = Math.min(this.boca, this.boca + this.direcao * this.alcance);
    const feixe = new Phaser.Geom.Rectangle(x0, this.yFeixe - I.TORRETA.ESPESSURA_FEIXE / 2, this.alcance, I.TORRETA.ESPESSURA_FEIXE);
    return Phaser.Geom.Rectangle.Overlaps(corpoDoJogador(jogador), feixe) ? 'dano' : null;
  }

  derrotar(): void {
    // Firewall não se derrota. Só se contorna.
  }

  destruir(): void {
    this.visual.destroy();
    this.feixe.destroy();
    if (this.bloco.active) this.solidos.remove(this.bloco, true, true);
  }
}

/* =========================================================================
 * ALUCINAÇÃO: holograma que alterna sólido / intangível em ritmo fixo;
 * pisca antes de trocar e só machuca quando sólido
 * ========================================================================= */

class Alucinacao implements Inimigo {
  public readonly vivo = true;
  public readonly x: number;
  private readonly visual: Phaser.GameObjects.Sprite;
  private relogioMs = 0;

  constructor(cena: Phaser.Scene, cfg: ConfigInimigo) {
    this.x = cfg.x;
    this.visual = cena.add.sprite(cfg.x, A.CHAO_Y, TEX_INIMIGOS.ALUCINACAO, 0).setOrigin(0.5, 1).setScale(ESCALA_ARTE).setDepth(PROF);
    this.visual.play(ANIM_INIMIGOS.ALUCINACAO_GLITCH);
  }

  get solido(): boolean {
    return Math.floor(this.relogioMs / I.ALUCINACAO.FASE_MS) % 2 === 0;
  }

  update(delta: number): void {
    const a = I.ALUCINACAO;
    this.relogioMs = (this.relogioMs + delta) % (a.FASE_MS * 2);
    const restante = a.FASE_MS - (this.relogioMs % a.FASE_MS);
    const avisando = restante < a.PISCA_ANTES_MS && Math.floor(restante / 70) % 2 === 0;
    let alfa = this.solido ? 0.95 : 0.2;
    if (avisando) alfa = this.solido ? 0.45 : 0.6;
    this.visual.setAlpha(alfa);
    this.visual.setY(A.CHAO_Y - 2 + Math.sin(this.relogioMs / 300) * 3);
  }

  contato(jogador: JogadorFaseFinal): ContatoInimigo {
    if (!this.solido) return null;
    const a = I.ALUCINACAO;
    const meu = retangulo(this.x, A.CHAO_Y - a.ALTURA / 2, a.LARGURA, a.ALTURA);
    return Phaser.Geom.Rectangle.Overlaps(corpoDoJogador(jogador), meu) ? 'dano' : null;
  }

  derrotar(): void {
    // Não dá para pisar numa alucinação. Só esperar ela passar.
  }

  destruir(): void {
    this.visual.destroy();
  }
}

/* =========================================================================
 * GERENCIADOR
 * ========================================================================= */

/** Resultado do quadro: inimigos pisados e, se houve, de onde veio o dano. */
export interface ResultadoInimigos {
  pisoes: number;
  danoDeX?: number;
}

/**
 * Cria os inimigos do andar a partir da configuração e devolve, a cada quadro,
 * o que o jogador pisou e se ele levou dano. `resetar()` recria todos (morte).
 */
export class InimigosFaseFinal {
  private lista: Inimigo[] = [];
  private readonly cena: Phaser.Scene;
  private readonly configs: readonly ConfigInimigo[];
  private readonly solidos: Phaser.Physics.Arcade.StaticGroup;

  constructor(cena: Phaser.Scene, configs: readonly ConfigInimigo[], solidos: Phaser.Physics.Arcade.StaticGroup) {
    this.cena = cena;
    this.configs = configs;
    this.solidos = solidos;
    gerarTexturasInimigos(cena);
    gerarTexturaDrone(cena);
    this.criar();
  }

  get vivos(): number {
    return this.lista.filter((i) => i.vivo).length;
  }

  private criar(): void {
    this.lista = this.configs.map((cfg) => {
      switch (cfg.tipo) {
        case 'spamBot':
          return new SpamBot(this.cena, cfg, this.solidos);
        case 'droneCaptcha':
          return new DroneCaptcha(this.cena, cfg);
        case 'torretaFirewall':
          return new TorretaFirewall(this.cena, cfg, this.solidos);
        case 'alucinacao':
          return new Alucinacao(this.cena, cfg);
      }
    });
  }

  public resetar(): void {
    for (const i of this.lista) i.destruir();
    this.criar();
  }

  public update(delta: number, jogador: JogadorFaseFinal, podeLevarDano: boolean): ResultadoInimigos {
    const resultado: ResultadoInimigos = { pisoes: 0 };
    for (const inimigo of this.lista) {
      inimigo.update(delta, jogador);
      const contato = inimigo.contato(jogador);
      if (contato === 'pisao') {
        inimigo.derrotar();
        resultado.pisoes++;
      } else if (contato === 'dano' && podeLevarDano && resultado.danoDeX === undefined) {
        resultado.danoDeX = inimigo.x;
      }
    }
    return resultado;
  }
}
