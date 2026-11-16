import Phaser from 'phaser';
import { type NomeLacoFaseFinal, type NomeSomFaseFinal, definirLaco, emitirSom } from '../som/eventosSom';
import { COR, hexNum } from '../ArteFaseFinal';
import { balaoFala } from '../BalaoFala';
import { BOSS_FASE_FINAL, COMBATE_FASE_FINAL } from '../constantesFaseFinal';
import type { TextosForma } from '../DialogosFaseFinal';
import type { JogadorFaseFinal } from '../JogadorFaseFinal';

const B = BOSS_FASE_FINAL;
/** Delta máximo por quadro: depois de um engasgo (aba em segundo plano) nada atravessa paredes ou pula estados. */
const DELTA_MAX_MS = 34;

/**
 * Estados comuns a todas as formas (roteiro, recomendações técnicas):
 * - intro: parado, esperando a fala de entrada;
 * - atacando: segue a sequência fixa da forma (inclui a janela vulnerável, que é um passo dela);
 * - atingido: levou um pisão; pisca, fala e se recompõe;
 * - derrotado: acabaram os pisões; a cena assume com a transição.
 */
export type EstadoBoss = 'intro' | 'atacando' | 'atingido' | 'derrotado';

/** O que aconteceu entre o jogador e o boss neste quadro. */
export interface ResultadoBoss {
  /** Pisão na janela vulnerável: tirou um pisão do boss. */
  golpe: boolean;
  /** Pisou na cabeça fora da janela: só quica. */
  quique: boolean;
  /** Encostou no corpo ou num ataque: dano vindo deste x. */
  danoDeX?: number;
}

export type Retangulo = Phaser.Geom.Rectangle;

export function ret(cx: number, cy: number, w: number, h: number): Retangulo {
  return new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
}

export function corpoDoJogador(jogador: JogadorFaseFinal): Retangulo {
  const c = jogador.corpo;
  return new Phaser.Geom.Rectangle(c.x, c.y, c.width, c.height);
}

/** Interpolação suave de 0..1 (sem depender de tweens, que continuam rodando com o jogo pausado). */
export function suave(t: number): number {
  const k = Phaser.Math.Clamp(t, 0, 1);
  return k * k * (3 - 2 * k);
}

/**
 * Base das formas do Mega Brain. Cada forma implementa a própria sequência de ataques em
 * `atualizarAtaque` (com passos e temporizadores fixos, sem sorteio) e diz onde ficam a
 * cabeça (onde o pisão conta), o corpo que machuca e os ataques ativos.
 * O movimento é todo calculado à mão com o delta, para congelar junto com o terminal e os diálogos.
 */
export abstract class FormaBoss {
  public estado: EstadoBoss = 'intro';
  public vida: number;
  public readonly vidaMaxima: number;
  /** Sprite principal (a transição usa a textura e a posição dele). */
  public abstract readonly sprite: Phaser.GameObjects.Sprite;

  protected readonly cena: Phaser.Scene;
  protected readonly textos: TextosForma;
  /** Gráfico dos ataques (projéteis, miras, ondas), redesenhado a cada quadro. */
  protected readonly efeitos: Phaser.GameObjects.Graphics;
  /** Relógio de jogo da forma (só anda quando o boss é atualizado). */
  protected tempoMs: number = 0;
  private relogioAtingidoMs: number = 0;
  private indiceSemJanela: number = 0;

  constructor(cena: Phaser.Scene, textos: TextosForma, pisoes: number = B.PISOES_POR_FORMA) {
    this.cena = cena;
    this.textos = textos;
    this.vida = pisoes;
    this.vidaMaxima = pisoes;
    this.efeitos = cena.add.graphics().setDepth(17);
  }

  /** Janela de vulnerabilidade aberta (pisão conta). */
  public abstract get vulneravel(): boolean;
  /** Onde o pisão é testado (topo da cabeça). */
  protected abstract cabeca(): Retangulo | null;
  /** Corpo que machuca ao encostar (null quando está inofensivo, como na janela). */
  protected abstract corpoPerigoso(): Retangulo | null;
  /** Ataques ativos que machucam. */
  protected abstract perigos(): Retangulo[];
  /** Ponto acima da cabeça para os balões de fala. */
  protected abstract pontoDeFala(): { x: number; y: number };
  protected abstract atualizarAtaque(delta: number, jogador: JogadorFaseFinal): void;
  /** Desenha projéteis/miras no gráfico `efeitos` (já limpo). */
  protected abstract desenharEfeitos(): void;
  /** Levou o pisão: some com os ataques em andamento. */
  protected abstract aoSerAtingido(jogador: JogadorFaseFinal): void;
  /** Volta à luta depois do pisão: recomeça a sequência. */
  protected abstract aoRetomar(jogador: JogadorFaseFinal): void;
  protected abstract aoIniciar(): void;
  /** Objetos próprios da forma (além do sprite e dos efeitos). */
  protected abstract destruirExtras(): void;

  public iniciar(): void {
    if (this.estado !== 'intro') return;
    this.estado = 'atacando';
    this.aoIniciar();
  }

  public falar(texto: string, duracaoMs: number = 1800): void {
    this.som('boss_fala');
    const p = this.pontoDeFala();
    balaoFala(this.cena, p.x, p.y, texto, duracaoMs);
  }

  public update(deltaBruto: number, jogador: JogadorFaseFinal, podeLevarDano: boolean): ResultadoBoss {
    const resultado: ResultadoBoss = { golpe: false, quique: false };
    const delta = Math.min(deltaBruto, DELTA_MAX_MS);
    this.tempoMs += delta;

    if (this.estado === 'atingido') {
      this.relogioAtingidoMs -= delta;
      this.piscarAtingido();
      if (this.relogioAtingidoMs <= 0) {
        this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
        this.sprite.setAlpha(1);
        if (this.vida <= 0) {
          this.estado = 'derrotado';
        } else {
          this.estado = 'atacando';
          this.aoRetomar(jogador);
        }
      }
    } else if (this.estado === 'atacando') {
      this.atualizarAtaque(delta, jogador);
    }

    this.efeitos.clear();
    this.desenharEfeitos();
    if (this.estado !== 'atacando') return resultado;

    const corpo = corpoDoJogador(jogador);
    const cabeca = this.cabeca();
    const v = jogador.corpo.velocity.y;
    if (
      cabeca &&
      Phaser.Geom.Rectangle.Overlaps(corpo, cabeca) &&
      v > COMBATE_FASE_FINAL.VELOCIDADE_MIN_PISAO &&
      jogador.corpo.bottom <= cabeca.top + COMBATE_FASE_FINAL.MARGEM_PISAO
    ) {
      if (this.vulneravel) {
        this.levarGolpe(jogador);
        resultado.golpe = true;
      } else {
        resultado.quique = true;
        const falas = this.textos.semJanela;
        this.falar(falas[this.indiceSemJanela % falas.length], 1300);
        this.indiceSemJanela++;
      }
      return resultado;
    }

    if (!podeLevarDano) return resultado;
    const alvos = [this.corpoPerigoso(), ...this.perigos()];
    for (const r of alvos) {
      if (r && Phaser.Geom.Rectangle.Overlaps(corpo, r)) {
        resultado.danoDeX = r.centerX;
        break;
      }
    }
    return resultado;
  }

  private levarGolpe(jogador: JogadorFaseFinal): void {
    this.vida--;
    this.estado = 'atingido';
    this.relogioAtingidoMs = B.ATINGIDO_MS;
    this.aoSerAtingido(jogador);
    const falas = this.textos.atingido;
    this.falar(falas[Math.min(this.vidaMaxima - this.vida - 1, falas.length - 1)], 1600);
  }

  /** Pisca branco/ciano/magenta enquanto se recompõe do pisão. */
  protected piscarAtingido(): void {
    const fase = Math.floor(this.tempoMs / 70) % 3;
    if (fase === 0) this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else this.sprite.setTint(hexNum(fase === 1 ? COR.ciano : COR.magenta)).setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** Efeito sonoro na posição do chefe (ou em `x`). */
  protected som(nome: NomeSomFaseFinal, x?: number, intensidade: number = 1): void {
    emitirSom(this.cena, nome, x ?? this.sprite.x, intensidade);
  }

  protected laco(nome: NomeLacoFaseFinal, volume: number): void {
    definirLaco(this.cena, nome, volume);
  }

  public destruir(): void {
    this.destruirExtras();
    this.efeitos.destroy();
    this.sprite.destroy();
  }

  /* -------------------------------------------------------------------------
   * Utilitários de desenho compartilhados pelas formas
   * ------------------------------------------------------------------------- */

  /** Estrelinhas girando sobre a cabeça (tonto/travado = vulnerável). */
  protected desenharTontura(x: number, y: number): void {
    const g = this.efeitos;
    for (let i = 0; i < 3; i++) {
      const a = this.tempoMs / 260 + (i * Math.PI * 2) / 3;
      const px = x + Math.cos(a) * 30;
      const py = y + Math.sin(a) * 8;
      g.fillStyle(i === 1 ? hexNum(COR.ciano) : hexNum(COR.janelaQuente), 1);
      g.fillRect(px - 4, py - 1, 8, 2);
      g.fillRect(px - 1, py - 4, 2, 8);
    }
  }

  /** Seta pulsando apontando para a cabeça vulnerável. */
  protected desenharAlvoCabeca(x: number, topo: number): void {
    const g = this.efeitos;
    const sobe = Math.sin(this.tempoMs / 120) * 4;
    g.fillStyle(hexNum(COR.ciano), 0.9);
    g.fillTriangle(x - 10, topo - 34 + sobe, x + 10, topo - 34 + sobe, x, topo - 20 + sobe);
  }

  /** Linha tracejada (miras). */
  protected tracejado(x0: number, y0: number, x1: number, y1: number, cor: number, alfa: number, espessura = 2): void {
    const g = this.efeitos;
    const dist = Phaser.Math.Distance.Between(x0, y0, x1, y1);
    const passos = Math.max(1, Math.floor(dist / 14));
    g.lineStyle(espessura, cor, alfa);
    for (let i = 0; i < passos; i += 2) {
      const a = i / passos;
      const b = Math.min(1, (i + 1) / passos);
      g.lineBetween(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b);
    }
  }

  /** "!" de aviso sobre um ponto (telegrafa o próximo ataque). */
  protected desenharAviso(x: number, y: number): void {
    const g = this.efeitos;
    const pisca = Math.floor(this.tempoMs / 100) % 2 === 0;
    g.fillStyle(pisca ? hexNum(COR.vermelho) : 0xffffff, 1);
    g.fillRect(x - 3, y - 22, 6, 14);
    g.fillRect(x - 3, y - 5, 6, 5);
  }
}
