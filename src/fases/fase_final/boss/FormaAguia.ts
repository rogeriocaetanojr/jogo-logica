import Phaser from 'phaser';
import type { NomeSomFaseFinal } from '../som/eventosSom';
import { COR, hexNum } from '../ArteFaseFinal';
import { BOSS_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';
import { FALAS_BOSS, FALAS_EXTRAS_BOSS } from '../DialogosFaseFinal';
import type { JogadorFaseFinal } from '../JogadorFaseFinal';
import { FormaBoss, type Retangulo, ret, suave } from './FormaBoss';
import { Particulas, estouro, fumaca } from './EfeitosBoss';
import { QUADROS_BOSS, TEX_BOSS } from './TexturasBoss';

const B = BOSS_FASE_FINAL;
const G = B.AGUIA;
/** Centro do sprite (160 px de altura) com as garras cravadas no chão. */
const Y_PRESA = B.CHAO_Y - 80;
const QA = QUADROS_BOSS.AGUIA;

type Ataque = 'penas' | 'rasante' | 'mergulho';
type PassoAguia =
  | 'voo'
  | 'paira'
  | 'penas'
  | 'avisoRasante'
  | 'rasanteDesce'
  | 'rasante'
  | 'rasanteSobe'
  | 'avisoMergulho'
  | 'mergulho'
  | 'presa';

/** Ordem fixa dos ataques. */
const CICLO: readonly Ataque[] = ['penas', 'rasante', 'penas', 'mergulho'];

interface Pena {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angulo: number;
}

/**
 * Forma 3 — Águia tecnológica: voa pelas bordas da arena. Sequência fixa:
 * leque de penas → rasante rente ao chão (suba numa passarela ou pule) → leque de penas →
 * mergulho com mira no chão. O mergulho sempre termina com as garras cravadas: janela do pisão.
 */
export class FormaAguia extends FormaBoss {
  public readonly sprite: Phaser.GameObjects.Sprite;
  private passo: PassoAguia = 'paira';
  private relogioMs: number = 0;
  private x: number;
  private y: number;
  private canto: number = 1;
  private indiceCiclo: number = 0;
  private penasDisparadas: number = 0;
  private penas: Pena[] = [];
  private miraX: number = 0;
  // Voo genérico de um ponto a outro
  private vooDe = { x: 0, y: 0 };
  private vooPara = { x: 0, y: 0 };
  private vooMs: number = 0;
  private aposVoo: PassoAguia = 'paira';
  private readonly particulas: Particulas;

  constructor(cena: Phaser.Scene) {
    super(cena, FALAS_BOSS[3]);
    // Chega pousada no chão (caiu junto com o jogador)
    this.x = 900;
    this.y = Y_PRESA;
    this.sprite = cena.add.sprite(this.x, this.y, TEX_BOSS.AGUIA, QA.PRESA).setScale(ESCALA_ARTE).setDepth(18);
    this.particulas = new Particulas(cena, 19);
  }

  public get vulneravel(): boolean {
    return this.passo === 'presa';
  }

  protected aoIniciar(): void {
    this.voarPara(G.CANTOS[this.canto], 700, 'paira');
  }

  private iniciarPasso(passo: PassoAguia): void {
    const sons: Partial<Record<PassoAguia, NomeSomFaseFinal>> = {
      avisoRasante: 'aguia_grito',
      rasante: 'aguia_rasante',
      avisoMergulho: 'aguia_grito',
      mergulho: 'aguia_mergulho',
    };
    const som = sons[passo];
    if (som) this.som(som);
    this.passo = passo;
    this.relogioMs = 0;
  }

  private voarPara(destino: { x: number; y: number }, ms: number, depois: PassoAguia): void {
    this.vooDe = { x: this.x, y: this.y };
    this.vooPara = { x: destino.x, y: destino.y };
    this.vooMs = ms;
    this.aposVoo = depois;
    this.iniciarPasso('voo');
  }

  private get cantoAtual(): { x: number; y: number } {
    return G.CANTOS[this.canto];
  }

  protected cabeca(): Retangulo {
    if (this.passo === 'presa') return ret(this.x, B.CHAO_Y - 62, 130, 30);
    return ret(this.x, this.y - 10, 120, 24);
  }

  protected corpoPerigoso(): Retangulo | null {
    if (this.passo === 'presa') return null;
    if (this.passo === 'mergulho') return ret(this.x, this.y, 64, 150);
    return ret(this.x, this.y + 12, G.HITBOX.LARGURA, G.HITBOX.ALTURA);
  }

  protected perigos(): Retangulo[] {
    return this.penas.map((p) => ret(p.x, p.y, 18, 18));
  }

  protected pontoDeFala(): { x: number; y: number } {
    return { x: this.x, y: this.y - 86 };
  }

  protected atualizarAtaque(delta: number, jogador: JogadorFaseFinal): void {
    const dt = delta / 1000;
    this.relogioMs += delta;
    this.moverPenas(dt);
    let angulo = 0;

    switch (this.passo) {
      case 'voo': {
        const k = suave(this.relogioMs / this.vooMs);
        this.x = this.vooDe.x + (this.vooPara.x - this.vooDe.x) * k;
        this.y = this.vooDe.y + (this.vooPara.y - this.vooDe.y) * k;
        if (Math.abs(this.vooPara.x - this.vooDe.x) > 4) this.sprite.setFlipX(this.vooPara.x > this.vooDe.x);
        this.bater();
        if (this.relogioMs >= this.vooMs) this.iniciarPasso(this.aposVoo);
        break;
      }
      case 'paira':
        this.bater();
        this.y = this.cantoAtual.y + Math.sin(this.tempoMs / 220) * 6;
        this.sprite.setFlipX(this.x < B.LARGURA / 2);
        if (this.relogioMs >= G.PAIRA_MS) this.proximoAtaque();
        break;
      case 'penas':
        this.bater();
        if (this.penasDisparadas < G.PENAS && this.relogioMs >= this.penasDisparadas * G.ENTRE_PENAS_MS) {
          this.dispararPena(this.penasDisparadas);
          this.penasDisparadas++;
        }
        if (this.relogioMs >= G.PENAS * G.ENTRE_PENAS_MS + 300) this.iniciarPasso('paira');
        break;
      case 'avisoRasante':
        this.sprite.setFrame(QA.GRITO);
        if (this.relogioMs >= G.AVISO_RASANTE_MS) {
          this.voarPara({ x: this.cantoAtual.x, y: G.ALTURA_RASANTE }, G.RASANTE_DESCE_MS, 'rasante');
        }
        break;
      case 'rasante': {
        const destino = G.CANTOS[1 - this.canto].x;
        const dir = Math.sign(destino - this.x);
        this.sprite.setFrame(QA.RASANTE).setFlipX(dir > 0);
        if (Math.floor(this.tempoMs / 50) !== Math.floor((this.tempoMs - delta) / 50)) {
          this.particulas.faiscas(this.x - dir * 40, this.y + 30, dir > 0 ? Math.PI : 0, 0.3, 2);
        }
        this.x += dir * G.VELOCIDADE_RASANTE * dt;
        if ((dir > 0 && this.x >= destino) || (dir < 0 && this.x <= destino) || dir === 0) {
          this.x = destino;
          this.canto = 1 - this.canto;
          this.voarPara(this.cantoAtual, G.RASANTE_SOBE_MS, 'paira');
        }
        break;
      }
      case 'avisoMergulho': {
        this.sprite.setFrame(QA.GRITO);
        const travar = this.relogioMs >= G.AVISO_MERGULHO_MS - G.MIRA_TRAVADA_MS;
        if (!travar) {
          const alvo = Phaser.Math.Clamp(jogador.x, 120, B.LARGURA - 120);
          this.x += Phaser.Math.Clamp(alvo - this.x, -620 * dt, 620 * dt);
          this.miraX = this.x;
        }
        this.y += (G.ALTURA_MIRA - this.y) * Math.min(1, dt * 6);
        if (this.relogioMs >= G.AVISO_MERGULHO_MS) this.iniciarPasso('mergulho');
        break;
      }
      case 'mergulho':
        this.sprite.setFrame(QA.RASANTE);
        angulo = this.sprite.flipX ? 90 : -90;
        this.y += G.VELOCIDADE_MERGULHO * dt;
        if (this.y + 75 >= B.CHAO_Y) {
          this.y = Y_PRESA;
          this.som('aguia_impacto');
          this.cena.cameras.main.shake(280, 0.012);
          estouro(this.cena, this.x, B.CHAO_Y - 10, 56, 0xffd36b);
          this.particulas.detritos(this.x, B.CHAO_Y - 4, 14, [0x12233a, 0x3b4060, 0xffd36b], B.CHAO_Y);
          this.particulas.faiscas(this.x, B.CHAO_Y - 4, -Math.PI / 2, Math.PI * 0.5, 12, B.CHAO_Y);
          fumaca(this.cena, this.x - 50, B.CHAO_Y - 12, 1.2, 0x55607a, 700);
          fumaca(this.cena, this.x + 50, B.CHAO_Y - 12, 1.2, 0x55607a, 700);
          this.falar(FALAS_EXTRAS_BOSS.AGUIA_PRESA, 1500);
          this.iniciarPasso('presa');
        }
        break;
      case 'presa':
        this.sprite.setFrame(QA.PRESA);
        // Treme tentando soltar as garras
        this.x = this.miraX + (Math.floor(this.tempoMs / 50) % 2 === 0 ? -2 : 2);
        if (this.relogioMs >= G.PRESA_MS) {
          this.x = this.miraX;
          this.canto = this.x < B.LARGURA / 2 ? 0 : 1;
          this.voarPara(this.cantoAtual, G.SOLTA_MS, 'paira');
        }
        break;
    }
    this.sprite.setPosition(this.x, this.y).setAngle(angulo);
  }

  private proximoAtaque(): void {
    const ataque = CICLO[this.indiceCiclo % CICLO.length];
    this.indiceCiclo++;
    if (ataque === 'penas') {
      this.penasDisparadas = 0;
      this.iniciarPasso('penas');
    } else if (ataque === 'rasante') {
      this.falar(FALAS_EXTRAS_BOSS.AGUIA_GRITO, 900);
      this.iniciarPasso('avisoRasante');
    } else {
      this.falar(FALAS_EXTRAS_BOSS.AGUIA_GRITO, 900);
      this.miraX = this.x;
      this.iniciarPasso('avisoMergulho');
    }
  }

  /** Bate as asas (quadros 0 e 1). */
  private bater(): void {
    const volta = Math.floor(this.tempoMs / (75 * QA.BATER.length));
    if (volta !== this.ultimaBatida) {
      this.ultimaBatida = volta;
      this.som('aguia_asa', this.x, 0.6);
    }
    this.sprite.setFrame(QA.BATER[Math.floor(this.tempoMs / 75) % QA.BATER.length]);
  }

  private ultimaBatida: number = -1;

  private dispararPena(indice: number): void {
    this.som('aguia_pena');
    const alvoBase = G.ALVOS_PENAS[indice % G.ALVOS_PENAS.length];
    const alvoX = this.canto === 0 ? alvoBase : B.LARGURA - alvoBase;
    const ang = Math.atan2(B.CHAO_Y - this.y, alvoX - this.x);
    this.penas.push({
      x: this.x,
      y: this.y + 16,
      vx: Math.cos(ang) * G.VELOCIDADE_PENA,
      vy: Math.sin(ang) * G.VELOCIDADE_PENA,
      angulo: ang,
    });
  }

  private moverPenas(dt: number): void {
    for (const p of this.penas) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.penas = this.penas.filter((p) => p.y < B.CHAO_Y - 4 && p.x > -30 && p.x < B.LARGURA + 30);
  }

  protected desenharEfeitos(): void {
    const g = this.efeitos;
    if (this.estado === 'atacando') {
      if (this.passo === 'avisoRasante') {
        // Rota do rasante marcada rente ao chão
        this.tracejado(G.CANTOS[0].x, G.ALTURA_RASANTE, G.CANTOS[1].x, G.ALTURA_RASANTE, hexNum(COR.vermelho), 0.7, 3);
        this.desenharAviso(this.x, this.y - 86);
      }
      if (this.passo === 'avisoMergulho' || this.passo === 'mergulho') {
        const travada = this.passo === 'mergulho' || this.relogioMs >= G.AVISO_MERGULHO_MS - G.MIRA_TRAVADA_MS;
        const pisca = !travada || Math.floor(this.tempoMs / 60) % 2 === 0;
        this.tracejado(this.miraX, this.y + 50, this.miraX, B.CHAO_Y, hexNum(COR.vermelho), pisca ? 0.9 : 0.4, 2);
        g.lineStyle(3, hexNum(COR.vermelho), pisca ? 1 : 0.5);
        g.strokeEllipse(this.miraX, B.CHAO_Y - 4, 90, 16);
        if (this.passo === 'avisoMergulho') this.desenharAviso(this.x, this.y - 86);
      }
      if (this.passo === 'presa') {
        this.desenharTontura(this.x, B.CHAO_Y - 90);
        this.desenharAlvoCabeca(this.x, B.CHAO_Y - 78);
        // Rachaduras onde as garras cravaram
        g.lineStyle(2, 0x05050c, 1);
        g.lineBetween(this.miraX - 30, B.CHAO_Y + 2, this.miraX - 50, B.CHAO_Y + 14);
        g.lineBetween(this.miraX + 20, B.CHAO_Y + 2, this.miraX + 44, B.CHAO_Y + 12);
      }
      if (this.passo === 'rasante') {
        // Linhas de velocidade no rastro
        const dir = this.sprite.flipX ? 1 : -1;
        g.fillStyle(hexNum(COR.magenta), 0.6);
        for (let i = 0; i < 4; i++) g.fillRect(this.x - dir * (90 + i * 26), this.y - 20 + i * 12, 40, 2);
      }
    }
    for (const p of this.penas) {
      const cx = Math.cos(p.angulo) * 12;
      const cy = Math.sin(p.angulo) * 12;
      g.lineStyle(5, hexNum(COR.metalClaro), 1);
      g.lineBetween(p.x - cx, p.y - cy, p.x + cx, p.y + cy);
      g.lineStyle(2, hexNum(COR.magenta), 1);
      g.lineBetween(p.x - cx * 1.6, p.y - cy * 1.6, p.x - cx, p.y - cy);
    }
  }

  protected aoSerAtingido(): void {
    this.penas = [];
    this.sprite.setAngle(0).setFrame(QA.PRESA);
  }

  protected aoRetomar(): void {
    this.canto = this.x < B.LARGURA / 2 ? 0 : 1;
    this.voarPara(this.cantoAtual, G.SOLTA_MS, 'paira');
  }

  protected destruirExtras(): void {
    this.particulas.limpar();
    this.penas = [];
  }
}
