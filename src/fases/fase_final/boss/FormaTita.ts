import Phaser from 'phaser';
import { COR, hexNum } from '../ArteFaseFinal';
import { BOSS_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';
import { FALAS_BOSS } from '../DialogosFaseFinal';
import type { JogadorFaseFinal } from '../JogadorFaseFinal';
import { FormaBoss, type Retangulo, ret, suave } from './FormaBoss';
import { Particulas, estouro, fumaca } from './EfeitosBoss';
import { QUADROS_BOSS, TEX_BOSS } from './TexturasBoss';

const B = BOSS_FASE_FINAL;
const T = B.TITA;
const QT = QUADROS_BOSS.TITA;

type PassoTita =
  | 'avisoInvestida'
  | 'investida'
  | 'recupera'
  | 'mira'
  | 'entreTiros'
  | 'saltoSobe'
  | 'saltoPaira'
  | 'saltoDesce'
  | 'travado'
  | 'levanta';

interface Tiro {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Onda {
  x: number;
  direcao: -1 | 1;
}

/**
 * Forma 2 — Titã: lento e pesado. Sequência fixa:
 * investida até a parede → 3 tiros de canhão com mira visível → salto e pisão no chão
 * (onda de choque para os dois lados) → fica travado e abaixado: janela do pisão.
 */
export class FormaTita extends FormaBoss {
  public readonly sprite: Phaser.GameObjects.Sprite;
  private passo: PassoTita = 'avisoInvestida';
  private relogioMs: number = 0;
  private x: number = T.X_INICIAL;
  /** Deslocamento vertical do salto (negativo = no ar). */
  private altura: number = 0;
  /** -1 olhando para a esquerda, 1 para a direita. */
  private frente: -1 | 1 = -1;
  private direcaoInvestida: -1 | 1 = -1;
  private tirosDados: number = 0;
  private miraX: number = 0;
  private miraY: number = 0;
  private saltoDeX: number = 0;
  private saltoParaX: number = 0;
  private tiros: Tiro[] = [];
  private ondas: Onda[] = [];
  private readonly particulas: Particulas;

  constructor(cena: Phaser.Scene) {
    super(cena, FALAS_BOSS[2]);
    this.sprite = cena.add.sprite(this.x, B.CHAO_Y, TEX_BOSS.TITA, 0).setOrigin(0.5, 1).setScale(ESCALA_ARTE).setDepth(18);
    this.particulas = new Particulas(cena, 19);
  }

  public get vulneravel(): boolean {
    return this.passo === 'travado';
  }

  protected aoIniciar(): void {
    this.iniciarPasso('avisoInvestida');
  }

  private iniciarPasso(passo: PassoTita, duracaoMs: number = 0): void {
    this.passo = passo;
    this.relogioMs = duracaoMs;
  }

  private get boca(): { x: number; y: number } {
    return { x: this.x + this.frente * 20, y: B.CHAO_Y + this.altura - 166 };
  }

  protected cabeca(): Retangulo {
    const alturaCorpo = this.passo === 'travado' ? T.HITBOX_TRAVADO_ALTURA : T.HITBOX.ALTURA;
    return ret(this.x, B.CHAO_Y + this.altura - alturaCorpo + 12, 74, 28);
  }

  protected corpoPerigoso(): Retangulo | null {
    if (this.passo === 'travado' || this.passo === 'levanta') return null;
    return ret(this.x, B.CHAO_Y + this.altura - T.HITBOX.ALTURA / 2 + 10, T.HITBOX.LARGURA, T.HITBOX.ALTURA - 20);
  }

  protected perigos(): Retangulo[] {
    return [
      ...this.tiros.map((t) => ret(t.x, t.y, T.RAIO_TIRO * 2, T.RAIO_TIRO * 2)),
      ...this.ondas.map((o) => ret(o.x, B.CHAO_Y - T.ALTURA_ONDA / 2, 36, T.ALTURA_ONDA)),
    ];
  }

  protected pontoDeFala(): { x: number; y: number } {
    return { x: this.x, y: B.CHAO_Y + this.altura - 196 };
  }

  protected atualizarAtaque(delta: number, jogador: JogadorFaseFinal): void {
    const dt = delta / 1000;
    this.relogioMs += delta;
    this.moverProjeteis(dt);

    switch (this.passo) {
      case 'avisoInvestida': {
        // Agachado olhando para a parede oposta, poeira nos pés
        this.direcaoInvestida = this.x > B.LARGURA / 2 ? -1 : 1;
        this.frente = this.direcaoInvestida;
        this.sprite.setFrame(QT.PREPARO);
        if (this.relogioMs >= T.AVISO_INVESTIDA_MS) {
          this.iniciarPasso('investida');
        }
        break;
      }
      case 'investida': {
        this.sprite.setFrame(Math.floor(this.tempoMs / 90) % 2 === 0 ? QT.INVESTIDA : QT.INVESTIDA_B);
        this.x += this.direcaoInvestida * T.VELOCIDADE_INVESTIDA * dt;
        if (Math.floor(this.tempoMs / 70) !== Math.floor((this.tempoMs - delta) / 70)) {
          fumaca(this.cena, this.x - this.direcaoInvestida * 50, B.CHAO_Y - 10, 0.7, 0x6b6f8c, 450);
        }
        const limite = this.direcaoInvestida < 0 ? T.MARGEM_PAREDE : B.LARGURA - T.MARGEM_PAREDE;
        if ((this.direcaoInvestida < 0 && this.x <= limite) || (this.direcaoInvestida > 0 && this.x >= limite)) {
          this.x = limite;
          this.cena.cameras.main.shake(220, 0.009);
          const parede = this.direcaoInvestida < 0 ? 4 : B.LARGURA - 4;
          estouro(this.cena, parede, B.CHAO_Y - 90, 48, 0xffffff);
          this.particulas.detritos(parede, B.CHAO_Y - 100, 10, [0x4a3a5c, 0x6d769c, 0x2e2040], B.CHAO_Y);
          this.iniciarPasso('recupera');
        }
        break;
      }
      case 'recupera':
        this.sprite.setFrame(this.quadroParado());
        if (this.relogioMs >= T.RECUPERA_MS) {
          this.tirosDados = 0;
          this.iniciarPasso('mira');
        }
        break;
      case 'mira': {
        this.frente = jogador.x < this.x ? -1 : 1;
        this.sprite.setFrame(QT.MIRA);
        // Segue o jogador até travar a mira um instante antes do disparo
        if (this.relogioMs < T.MIRA_MS - T.MIRA_TRAVADA_MS) {
          this.miraX = jogador.x;
          this.miraY = jogador.y;
        }
        if (this.relogioMs >= T.MIRA_MS) {
          const b = this.boca;
          const ang = Math.atan2(this.miraY - b.y, this.miraX - b.x);
          this.tiros.push({ x: b.x, y: b.y, vx: Math.cos(ang) * T.VELOCIDADE_TIRO, vy: Math.sin(ang) * T.VELOCIDADE_TIRO });
          this.tirosDados++;
          this.cena.cameras.main.shake(80, 0.003);
          estouro(this.cena, b.x, b.y, 22, 0xffd0d6, 0x05050c, 20);
          fumaca(this.cena, b.x, b.y, 0.5, 0x8a8698, 400);
          this.iniciarPasso('entreTiros');
        }
        break;
      }
      case 'entreTiros':
        this.sprite.setFrame(this.quadroParado());
        if (this.relogioMs >= T.ENTRE_TIROS_MS) {
          if (this.tirosDados < T.TIROS) this.iniciarPasso('mira');
          else {
            this.saltoDeX = this.x;
            // Pula na direção do jogador, sem passar das margens
            const alvo = Phaser.Math.Clamp(jogador.x, T.MARGEM_PAREDE, B.LARGURA - T.MARGEM_PAREDE);
            this.saltoParaX = this.x + Phaser.Math.Clamp(alvo - this.x, -280, 280);
            this.frente = this.saltoParaX < this.x ? -1 : 1;
            this.iniciarPasso('saltoSobe');
          }
        }
        break;
      case 'saltoSobe': {
        const k = suave(this.relogioMs / T.SALTO_SOBE_MS);
        this.sprite.setFrame(QT.PREPARO);
        this.altura = -T.SALTO_ALTURA * k;
        this.x = this.saltoDeX + (this.saltoParaX - this.saltoDeX) * k;
        if (this.relogioMs >= T.SALTO_SOBE_MS) this.iniciarPasso('saltoPaira');
        break;
      }
      case 'saltoPaira':
        if (this.relogioMs >= T.SALTO_PAIRA_MS) this.iniciarPasso('saltoDesce');
        break;
      case 'saltoDesce': {
        const k = Math.min(1, this.relogioMs / T.SALTO_DESCE_MS);
        this.altura = -T.SALTO_ALTURA * (1 - k * k);
        if (k >= 1) {
          this.altura = 0;
          this.ondas.push({ x: this.x - 60, direcao: -1 }, { x: this.x + 60, direcao: 1 });
          this.cena.cameras.main.shake(300, 0.012);
          estouro(this.cena, this.x, B.CHAO_Y - 10, 56, 0xffd36b);
          this.particulas.detritos(this.x, B.CHAO_Y - 4, 14, [0x3f2c52, 0x6d769c, 0xffd36b], B.CHAO_Y);
          fumaca(this.cena, this.x - 60, B.CHAO_Y - 12, 1.3, 0x6b6f8c, 700);
          fumaca(this.cena, this.x + 60, B.CHAO_Y - 12, 1.3, 0x6b6f8c, 700);
          this.iniciarPasso('travado');
        }
        break;
      }
      case 'travado':
        this.sprite.setFrame(QT.TRAVADO);
        if (this.relogioMs >= T.TRAVADO_MS) this.iniciarPasso('levanta');
        break;
      case 'levanta':
        this.sprite.setFrame(QT.PREPARO);
        if (this.relogioMs >= T.LEVANTA_MS) this.iniciarPasso('avisoInvestida');
        break;
    }

    this.sprite.setPosition(this.x, B.CHAO_Y + this.altura).setFlipX(this.frente > 0);
  }

  private moverProjeteis(dt: number): void {
    for (const t of this.tiros) {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
    }
    this.tiros = this.tiros.filter((t) => t.x > -40 && t.x < B.LARGURA + 40 && t.y < B.CHAO_Y + 10 && t.y > -40);
    for (const o of this.ondas) o.x += o.direcao * T.VELOCIDADE_ONDA * dt;
    this.ondas = this.ondas.filter((o) => o.x > -40 && o.x < B.LARGURA + 40);
  }

  protected desenharEfeitos(): void {
    const g = this.efeitos;
    if (this.estado === 'atacando') {
      if (this.passo === 'avisoInvestida') {
        this.desenharAviso(this.x, B.CHAO_Y - 200);
        // Poeira raspando no chão para o lado da investida
        for (let i = 0; i < 3; i++) {
          const t = ((this.tempoMs / 300 + i / 3) % 1 + 1) % 1;
          g.fillStyle(0x8a90b8, 0.6 * (1 - t));
          g.fillCircle(this.x - this.direcaoInvestida * (40 + t * 40), B.CHAO_Y - 6 - t * 10, 6 + t * 6);
        }
      }
      if (this.passo === 'mira') {
        const b = this.boca;
        const travada = this.relogioMs >= T.MIRA_MS - T.MIRA_TRAVADA_MS;
        const piscar = travada && Math.floor(this.tempoMs / 60) % 2 === 0;
        this.tracejado(b.x, b.y, this.miraX, this.miraY, hexNum(COR.vermelho), travada ? (piscar ? 1 : 0.5) : 0.6, travada ? 3 : 2);
        g.lineStyle(2, hexNum(COR.vermelho), 0.9);
        g.strokeCircle(this.miraX, this.miraY, travada ? 12 : 18);
      }
      if (this.passo === 'saltoSobe' || this.passo === 'saltoPaira' || this.passo === 'saltoDesce') {
        // Sombra de onde vai cair
        g.fillStyle(0x000000, 0.35);
        g.fillEllipse(this.saltoParaX, B.CHAO_Y - 3, 120, 14);
      }
      if (this.passo === 'travado') {
        const topo = B.CHAO_Y - T.HITBOX_TRAVADO_ALTURA;
        this.desenharTontura(this.x, topo - 4);
        this.desenharAlvoCabeca(this.x, topo);
      }
    }
    for (const t of this.tiros) {
      g.fillStyle(hexNum(COR.vermelho), 0.35);
      g.fillCircle(t.x, t.y, T.RAIO_TIRO + 6);
      g.fillStyle(hexNum(COR.vermelho), 1);
      g.fillCircle(t.x, t.y, T.RAIO_TIRO);
      g.fillStyle(0xffd0d6, 1);
      g.fillCircle(t.x - 3, t.y - 3, 4);
    }
    for (const o of this.ondas) {
      g.fillStyle(hexNum(COR.ciano), 0.35);
      g.fillTriangle(o.x - 26, B.CHAO_Y, o.x + 26, B.CHAO_Y, o.x, B.CHAO_Y - T.ALTURA_ONDA - 8);
      g.fillStyle(0xeef0ff, 0.9);
      g.fillTriangle(o.x - 16, B.CHAO_Y, o.x + 16, B.CHAO_Y, o.x + o.direcao * 4, B.CHAO_Y - T.ALTURA_ONDA);
    }
  }

  protected aoSerAtingido(): void {
    this.tiros = [];
    this.ondas = [];
    this.sprite.setFrame(QT.TRAVADO);
  }

  /** Respiração pesada parado (alterna dois quadros). */
  private quadroParado(): number {
    return Math.floor(this.tempoMs / 450) % 2 === 0 ? QT.PARADO : QT.RESPIRA;
  }

  protected aoRetomar(): void {
    this.altura = 0;
    this.iniciarPasso('levanta');
  }

  protected destruirExtras(): void {
    this.particulas.limpar();
    this.tiros = [];
    this.ondas = [];
  }
}
