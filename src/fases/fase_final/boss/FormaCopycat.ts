import Phaser from 'phaser';
import { COR, hexNum, texturaBrilho } from '../ArteFaseFinal';
import { BOSS_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';
import { FALAS_BOSS, FALAS_EXTRAS_BOSS } from '../DialogosFaseFinal';
import type { JogadorFaseFinal } from '../JogadorFaseFinal';
import { FormaBoss, type Retangulo, ret } from './FormaBoss';
import { TEX_BOSS } from './TexturasBoss';

const B = BOSS_FASE_FINAL;
const C = B.COPYCAT;
const V = B.VAPOR;

interface Amostra {
  t: number;
  x: number;
  /** y dos pés. */
  pes: number;
  flip: boolean;
  noAr: boolean;
}

type PassoCopycat = 'perseguindo' | 'arremessado' | 'atordoado';

const NUVENS_JATO = 16;
const NUVENS_MIOLO = 6;
const NUVENS_AVISO = 6;

/** Parte fracionária positiva (para ciclos que dependem só do tempo). */
function fracao(v: number): number {
  return ((v % 1) + 1) % 1;
}

/**
 * Saída de vapor no chão do terraço: desligada → aviso → jato, em ciclo fixo.
 * O jato é uma coluna de nuvens macias subindo e se abrindo, com miolo ciano aditivo,
 * respingos e clarão na base; no aviso a grelha pisca vermelho e solta fumacinha crescente.
 */
class SaidaVapor {
  public readonly x: number;
  private readonly defasagemMs: number;
  private readonly grade: Phaser.GameObjects.Sprite;
  private readonly nuvens: Phaser.GameObjects.Image[] = [];
  private readonly miolo: Phaser.GameObjects.Image[] = [];
  private readonly luzBase: Phaser.GameObjects.Image;

  constructor(cena: Phaser.Scene, x: number, defasagemMs: number) {
    this.x = x;
    this.defasagemMs = defasagemMs;
    this.grade = cena.add.sprite(x, B.CHAO_Y + 4, TEX_BOSS.VAPOR, 0).setOrigin(0.5, 1).setScale(ESCALA_ARTE).setDepth(6);
    for (let i = 0; i < NUVENS_JATO; i++) {
      this.nuvens.push(cena.add.image(x, B.CHAO_Y, TEX_BOSS.FUMACA).setDepth(17).setVisible(false));
    }
    for (let i = 0; i < NUVENS_MIOLO; i++) {
      this.miolo.push(
        cena.add
          .image(x, B.CHAO_Y, TEX_BOSS.FUMACA)
          .setDepth(17.5)
          .setTint(hexNum(COR.ciano))
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false)
      );
    }
    this.luzBase = cena.add
      .image(x, B.CHAO_Y - 4, texturaBrilho(cena))
      .setScale(1.1, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(7)
      .setVisible(false);
  }

  /** Fase no ciclo, em ms desde o começo do aviso (negativo = desligada). */
  private faseMs(tempoMs: number): number {
    const desligada = V.PERIODO_MS - V.AVISO_MS - V.JATO_MS;
    return ((tempoMs + this.defasagemMs) % V.PERIODO_MS) - desligada;
  }

  public estado(tempoMs: number): 'desligada' | 'aviso' | 'jato' {
    const f = this.faseMs(tempoMs);
    if (f < 0) return 'desligada';
    return f < V.AVISO_MS ? 'aviso' : 'jato';
  }

  public jato(): Retangulo {
    return ret(this.x, B.CHAO_Y - V.ALTURA_JATO / 2, V.LARGURA, V.ALTURA_JATO);
  }

  public desenhar(g: Phaser.GameObjects.Graphics, tempoMs: number): void {
    const estado = this.estado(tempoMs);
    const f = this.faseMs(tempoMs);
    this.grade.setFrame(estado === 'aviso' && Math.floor(f / 120) % 2 === 0 ? 1 : 0);
    for (const n of this.nuvens) n.setVisible(false);
    for (const n of this.miolo) n.setVisible(false);
    this.luzBase.setVisible(false);

    if (estado === 'desligada') {
      // Um fiapo de vapor residual
      const t = fracao(tempoMs / 1400);
      this.nuvens[0]
        .setVisible(true)
        .setPosition(this.x + Math.sin(tempoMs / 300) * 6, B.CHAO_Y - 6 - t * 26)
        .setScale(0.25 + t * 0.3)
        .setTint(0xc8d2e6)
        .setAlpha((1 - t) * 0.18);
      return;
    }

    if (estado === 'aviso') {
      const forca = f / V.AVISO_MS;
      const pisca = Math.floor(f / 120) % 2 === 0;
      this.luzBase
        .setVisible(true)
        .setTint(hexNum(COR.vermelho))
        .setAlpha((pisca ? 0.55 : 0.25) * (0.5 + forca * 0.5));
      for (let i = 0; i < NUVENS_AVISO; i++) {
        const t = fracao(tempoMs / 520 + i / NUVENS_AVISO);
        this.nuvens[i]
          .setVisible(true)
          .setPosition(this.x + Math.sin(tempoMs / 170 + i * 2.3) * (5 + t * 9), B.CHAO_Y - 8 - t * (18 + forca * 70))
          .setScale((0.25 + t * 0.55) * (0.6 + forca * 0.7))
          .setTint(0xdce4f2)
          .setAlpha((1 - t) * (0.25 + forca * 0.5));
      }
      return;
    }

    // Jato: sobe com força no começo e murcha nos últimos instantes
    const noJato = f - V.AVISO_MS;
    const subida = Math.min(1, noJato / 120);
    const fim = Math.max(0, Math.min(1, (V.JATO_MS - noJato) / 160));
    const altura = V.ALTURA_JATO * subida;
    const larguraBase = V.LARGURA / 64;
    for (let i = 0; i < NUVENS_JATO; i++) {
      const t = fracao(tempoMs / 430 + i / NUVENS_JATO);
      const abre = 6 + t * 26;
      const cor = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0xffffff),
        Phaser.Display.Color.ValueToColor(0x98abc8),
        100,
        Math.round(t * 100)
      );
      this.nuvens[i]
        .setVisible(true)
        .setPosition(this.x + Math.sin(tempoMs / 90 + i * 1.9) * abre * 0.5, B.CHAO_Y - 10 - t * altura)
        .setScale((0.6 + t * 1.3) * larguraBase * 1.75)
        .setTint(Phaser.Display.Color.GetColor(cor.r, cor.g, cor.b))
        .setAlpha((t < 0.08 ? t / 0.08 : 1) * Math.pow(1 - t, 0.6) * fim);
    }
    for (let i = 0; i < NUVENS_MIOLO; i++) {
      const t = fracao(tempoMs / 260 + i / NUVENS_MIOLO);
      this.miolo[i]
        .setVisible(true)
        .setPosition(this.x + Math.sin(tempoMs / 70 + i) * 4, B.CHAO_Y - 8 - t * altura * 0.75)
        .setScale(0.45 + t * 0.6)
        .setAlpha((1 - t) * 0.7 * fim);
    }
    this.luzBase
      .setVisible(true)
      .setTint(hexNum(COR.ciano))
      .setAlpha((0.45 + Math.sin(tempoMs / 40) * 0.1) * fim);
    // Respingos condensados saindo pelos lados
    for (let j = 0; j < 10; j++) {
      const t = fracao(tempoMs / 520 + j / 10);
      const lado = j % 2 ? 1 : -1;
      const px = this.x + lado * (14 + t * 46);
      const py = B.CHAO_Y - 30 - Math.sin(t * Math.PI) * (50 + (j % 3) * 18) + t * 20;
      g.fillStyle(0xeaf6ff, (1 - t) * 0.9 * fim);
      g.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
  }

  public destruir(): void {
    this.grade.destroy();
    this.luzBase.destroy();
    for (const n of [...this.nuvens, ...this.miolo]) n.destroy();
  }
}

/**
 * Forma 1 — Copycat: cópia do protagonista (sprite final, sem tint). Repete o caminho do
 * jogador com meio segundo de atraso. Não encosta em quem está parado (fica encarando),
 * mas machuca quem anda de volta para cima dela. Quando passa por um jato de vapor que o
 * jogador já atravessou, é arremessada e fica atordoada: janela do pisão.
 */
export class FormaCopycat extends FormaBoss {
  public readonly sprite: Phaser.GameObjects.Sprite;
  private readonly saidas: SaidaVapor[];
  private rastro: Amostra[] = [];
  private passo: PassoCopycat = 'perseguindo';
  private x: number = C.X_INICIAL;
  private pes: number = B.CHAO_Y;
  private vx: number = 0;
  private vy: number = 0;
  private relogioMs: number = 0;
  private andandoMs: number = 0;

  constructor(cena: Phaser.Scene, personagem: string) {
    super(cena, FALAS_BOSS[1]);
    this.sprite = cena.add
      .sprite(this.x, this.pes, TEX_BOSS.copycat(personagem), 0)
      .setOrigin(0.5, 121 / 128)
      .setFlipX(true)
      .setDepth(18);
    this.saidas = V.SAIDAS.map((s) => new SaidaVapor(cena, s.x, s.defasagemMs));
  }

  public get vulneravel(): boolean {
    return this.passo === 'atordoado';
  }

  protected aoIniciar(): void {
    this.passo = 'perseguindo';
    this.rastro = [];
  }

  protected cabeca(): Retangulo {
    return ret(this.x, this.pes - C.HITBOX.ALTURA + 14, C.HITBOX.LARGURA + 8, 28);
  }

  protected corpoPerigoso(): Retangulo | null {
    if (this.passo !== 'perseguindo') return null;
    return ret(this.x, this.pes - C.HITBOX.ALTURA / 2, C.HITBOX.LARGURA, C.HITBOX.ALTURA);
  }

  protected perigos(): Retangulo[] {
    return this.saidas.filter((s) => s.estado(this.tempoMs) === 'jato').map((s) => s.jato());
  }

  protected pontoDeFala(): { x: number; y: number } {
    return { x: this.x, y: this.pes - 120 };
  }

  protected atualizarAtaque(delta: number, jogador: JogadorFaseFinal): void {
    const dt = delta / 1000;
    this.gravar(jogador);
    switch (this.passo) {
      case 'perseguindo':
        this.perseguir(dt, jogador);
        this.verificarVapor();
        break;
      case 'arremessado':
        this.vy += 1400 * dt;
        this.x = Phaser.Math.Clamp(this.x + this.vx * dt, 60, B.LARGURA - 60);
        this.pes = Math.min(B.CHAO_Y, this.pes + this.vy * dt);
        this.sprite.setAngle(this.sprite.angle + 720 * dt * Math.sign(this.vx || 1));
        this.relogioMs += delta;
        if (this.pes >= B.CHAO_Y && this.vy > 0 && this.relogioMs > 200) {
          this.passo = 'atordoado';
          this.relogioMs = C.ATORDOADO_MS;
          this.sprite.setAngle(0);
          this.cena.cameras.main.shake(90, 0.003);
        }
        break;
      case 'atordoado':
        this.relogioMs -= delta;
        // Sentado, balançando a cabeça
        this.sprite.setFrame(0).setAngle(Math.sin(this.tempoMs / 140) * 6);
        if (this.relogioMs <= 0) {
          this.sprite.setAngle(0);
          this.passo = 'perseguindo';
          this.rastro = [];
        }
        break;
    }
    this.sprite.setPosition(this.x, this.pes);
  }

  private gravar(jogador: JogadorFaseFinal): void {
    this.rastro.push({
      t: this.tempoMs,
      x: jogador.x,
      pes: jogador.corpo.bottom,
      flip: jogador.sprite.flipX,
      noAr: !jogador.noChao,
    });
    // Guarda só o necessário para o atraso
    while (this.rastro.length > 2 && this.rastro[1].t <= this.tempoMs - C.ATRASO_MS) this.rastro.shift();
  }

  private perseguir(dt: number, jogador: JogadorFaseFinal): void {
    const alvo = this.rastro[0];
    if (!alvo) return;
    const xAntes = this.x;
    let novoX = this.x + Phaser.Math.Clamp(alvo.x - this.x, -C.VELOCIDADE_MAX_X * dt, C.VELOCIDADE_MAX_X * dt);
    // Não encosta em quem está parado no mesmo nível: fica encarando a uma distância
    const mesmoNivel = Math.abs(jogador.corpo.bottom - this.pes) < 40;
    const distAntes = Math.abs(this.x - jogador.x);
    const distDepois = Math.abs(novoX - jogador.x);
    if (mesmoNivel && distDepois < C.DISTANCIA_MIN && distDepois < distAntes) {
      novoX = distAntes >= C.DISTANCIA_MIN ? jogador.x + Math.sign(this.x - jogador.x || 1) * C.DISTANCIA_MIN : this.x;
    }
    this.x = novoX;
    this.pes += Phaser.Math.Clamp(alvo.pes - this.pes, -C.VELOCIDADE_MAX_Y * dt, C.VELOCIDADE_MAX_Y * dt);
    this.pes = Math.min(this.pes, B.CHAO_Y);

    const andou = Math.abs(this.x - xAntes) > 0.5;
    const encarando = mesmoNivel && Math.abs(this.x - jogador.x) <= C.DISTANCIA_MIN + 1;
    this.vx = (this.x - xAntes) / Math.max(dt, 0.001);
    if (encarando) this.sprite.setFlipX(jogador.x < this.x);
    else if (andou) this.sprite.setFlipX(this.x < xAntes);
    else this.sprite.setFlipX(alvo.flip);

    if (alvo.noAr && this.pes < B.CHAO_Y - 4) {
      this.sprite.setFrame(3);
      this.sprite.setScale(1, 1);
    } else if (andou) {
      this.andandoMs += dt * 1000;
      this.sprite.setFrame(Math.floor(this.andandoMs / 110) % 2 === 0 ? 1 : 0);
      this.sprite.setScale(1, 1 + Math.abs(Math.sin(this.andandoMs / 70)) * 0.03);
    } else {
      this.sprite.setFrame(0).setScale(1, 1);
    }
  }

  /** Entrou num jato ativo: é arremessada para longe da saída e cai atordoada. */
  private verificarVapor(): void {
    const corpo = ret(this.x, this.pes - C.HITBOX.ALTURA / 2, C.HITBOX.LARGURA, C.HITBOX.ALTURA);
    for (const s of this.saidas) {
      if (s.estado(this.tempoMs) !== 'jato' || !Phaser.Geom.Rectangle.Overlaps(corpo, s.jato())) continue;
      const lado = Math.sign(this.x - s.x) || (this.vx > 0 ? -1 : 1);
      this.vx = lado * 190;
      this.vy = -430;
      this.passo = 'arremessado';
      this.relogioMs = 0;
      this.sprite.setFrame(3);
      this.falar(FALAS_EXTRAS_BOSS.COPYCAT_VAPOR, 1400);
      return;
    }
  }

  protected desenharEfeitos(): void {
    for (const s of this.saidas) s.desenhar(this.efeitos, this.tempoMs);
    if (this.estado === 'atacando' && this.passo === 'atordoado') {
      const topo = this.pes - C.HITBOX.ALTURA;
      this.desenharTontura(this.x, topo - 6);
      this.desenharAlvoCabeca(this.x, topo);
    }
    // Scanline de "cópia": faixas finas passando pelo corpo (efeito por cima, o sprite fica intacto)
    if (this.estado !== 'derrotado') {
      const y = this.pes - 104 + ((this.tempoMs / 6) % 104);
      this.efeitos.fillStyle(hexNum(COR.ciano), 0.25);
      this.efeitos.fillRect(this.x - 26, y, 52, 2);
    }
  }

  /** Sprite final do Copycat não recebe tint (roteiro 9.2): pisca só na transparência. */
  protected override piscarAtingido(): void {
    this.sprite.setAlpha(Math.floor(this.tempoMs / 70) % 2 === 0 ? 0.25 : 1);
  }

  protected aoSerAtingido(): void {
    this.passo = 'atordoado';
    this.sprite.setAngle(0);
  }

  /** Recompõe do lado oposto ao jogador, sem rastro antigo. */
  protected aoRetomar(jogador: JogadorFaseFinal): void {
    this.x = jogador.x < B.LARGURA / 2 ? C.X_INICIAL : B.LARGURA - C.X_INICIAL;
    this.pes = B.CHAO_Y;
    this.passo = 'perseguindo';
    this.rastro = [];
    this.sprite.setPosition(this.x, this.pes).setFrame(0);
  }

  protected destruirExtras(): void {
    for (const s of this.saidas) s.destruir();
  }
}
