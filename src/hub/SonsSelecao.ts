import Phaser from 'phaser';

const VOLUME = 0.35;

/**
 * Sons da tela de seleção de personagem, sintetizados pelo contexto do Phaser (seguem o mudo do
 * jogo): um bipe de cápsula ao trocar de personagem e um "liga-sistema" ao escolher.
 */
export class SonsSelecao {
  private readonly ctx: AudioContext | null;
  private readonly saida: GainNode | null = null;

  constructor(cena: Phaser.Scene) {
    const g = cena.sound as Phaser.Sound.WebAudioSoundManager;
    this.ctx = g && 'context' in g ? g.context : null;
    if (!this.ctx) return;
    try {
      this.saida = this.ctx.createGain();
      this.saida.gain.value = VOLUME;
      this.saida.connect(g.destination ?? this.ctx.destination);
    } catch {
      this.saida = null;
    }
  }

  /** Trocou o personagem em foco: dois bipes curtos e um zumbido de cápsula acendendo. */
  trocar(paraDireita: boolean): void {
    this.tocar(() => {
      const [a, b] = paraDireita ? [660, 990] : [990, 660];
      this.tom('square', a, a, 0.05, 0.06);
      this.tom('square', b, b, 0.07, 0.06, 0.06);
      this.tom('sine', 180, 320, 0.18, 0.05, 0.02, 0.03);
    });
  }

  /** Escolheu: arpejo subindo e um acorde brilhante de sistema pronto. */
  escolher(): void {
    this.tocar(() => {
      this.tom('sawtooth', 90, 360, 0.35, 0.05, 0, 0.12);
      [523, 659, 784, 1047].forEach((f, i) => this.tom('square', f, f, 0.1, 0.06, 0.08 + i * 0.07));
      [1047, 1319, 1568].forEach((f) => this.tom('triangle', f, f, 0.7, 0.045, 0.38, 0.02));
    });
  }

  private tocar(receita: () => void): void {
    if (!this.ctx || !this.saida) return;
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    try {
      receita();
    } catch {
      // Áudio indisponível
    }
  }

  private tom(tipo: OscillatorType, f0: number, f1: number, dur: number, vol: number, atraso = 0, ataque = 0.005): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + atraso;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.saida!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
