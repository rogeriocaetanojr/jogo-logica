import Phaser from 'phaser';

/** Volume dos efeitos do tutorial (0 a 1), antes do mudo do jogo. */
const VOLUME = 0.38;

const aleatorio = (min: number, max: number): number => min + Math.random() * (max - min);

/**
 * Efeitos sonoros do tutorial, sintetizados com WebAudio pelo contexto do Phaser (seguem o mudo
 * do jogo): passos, pulo e pouso, terminal (abrir, teclas, acerto e erro), energia voltando,
 * esteira expandindo, choque, queda no fosso, empuxo pneumático e o boot do kernel.
 */
export class SomTutorial {
  private readonly ctx: AudioContext | null;
  private readonly saida: GainNode | null = null;
  private readonly ruido: AudioBuffer | null = null;
  private terminalAberto: () => boolean = () => false;

  constructor(cena: Phaser.Scene) {
    const g = cena.sound as Phaser.Sound.WebAudioSoundManager;
    this.ctx = g && 'context' in g ? g.context : null;
    if (this.ctx) {
      try {
        const ctx = this.ctx;
        this.saida = ctx.createGain();
        this.saida.gain.value = VOLUME;
        const limitador = ctx.createDynamicsCompressor();
        limitador.threshold.value = -10;
        limitador.ratio.value = 10;
        this.saida.connect(limitador).connect(g.destination ?? ctx.destination);
        const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.ruido = buf;
      } catch {
        this.saida = null;
      }
    }
    document.addEventListener('keydown', this.aoTeclar, true);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener('keydown', this.aoTeclar, true));
  }

  /** Clique das teclas enquanto o terminal estiver aberto. */
  definirTerminal(aberto: () => boolean): void {
    this.terminalAberto = aberto;
  }

  private aoTeclar = (e: KeyboardEvent): void => {
    if (!this.terminalAberto() || e.repeat) return;
    if (e.key === 'Enter') this.enviar();
    else if (e.key.length === 1 || e.key === 'Backspace') this.tecla();
  };

  /* ------------------------------ jogador ------------------------------ */

  passo(): void {
    this.tocar(() => this.chiado(0.035, 0.05, 'bandpass', aleatorio(1400, 2400), 900, 0, 2));
  }

  pulo(): void {
    this.tocar(() => {
      this.tom('square', 260, 560, 0.09, 0.045);
      this.chiado(0.06, 0.05, 'bandpass', 900, 1800, 0, 2);
    });
  }

  /** Pouso: baque mais forte quanto maior a queda (0 a 1). */
  pouso(forca: number): void {
    this.tocar(() => {
      this.tom('sine', 120, 50, 0.1, 0.08 + forca * 0.18);
      this.chiado(0.1, 0.06 + forca * 0.12, 'lowpass', 1500, 400);
    });
  }

  /* ------------------------------ terminal ----------------------------- */

  terminalAbrir(): void {
    this.tocar(() => {
      this.chiado(0.12, 0.05, 'highpass', 6000, 3000);
      this.tom('sine', 220, 900, 0.12, 0.06);
      this.tom('square', 1200, 1200, 0.04, 0.04, 0.14);
    });
  }

  private tecla(): void {
    this.tocar(() => {
      this.chiado(0.02, 0.07, 'bandpass', aleatorio(2500, 3800), 2000, 0, 3);
      this.tom('square', aleatorio(1500, 2100), 1400, 0.012, 0.018);
    });
  }

  private enviar(): void {
    this.tocar(() => this.tom('square', 880, 1320, 0.06, 0.05, 0.01));
  }

  acerto(): void {
    this.tocar(() => {
      [660, 880, 1320, 1760].forEach((f, i) => this.tom('square', f, f, 0.09, 0.07, i * 0.08));
      this.tom('triangle', 1760, 1760, 0.35, 0.05, 0.32);
    });
  }

  erro(): void {
    this.tocar(() => {
      this.tom('square', 220, 220, 0.12, 0.06);
      this.tom('square', 160, 160, 0.2, 0.06, 0.14);
    });
  }

  /** Kernel instanciado: varredura subindo e acorde de "sistema ligado". */
  boot(): void {
    this.tocar(() => {
      this.tom('sawtooth', 60, 600, 0.7, 0.05, 0, 0.2);
      [523, 659, 784, 1047].forEach((f, i) => this.tom('triangle', f, f, 0.9 - i * 0.1, 0.06, 0.55 + i * 0.07));
    });
  }

  /* ------------------------------ mundo -------------------------------- */

  /** Energia voltando: relé estalando, gerador subindo e as luzes acendendo. */
  energiaLiga(): void {
    this.tocar(() => {
      this.chiado(0.05, 0.25, 'highpass', 3000, 2000);
      this.tom('sawtooth', 40, 120, 0.9, 0.07, 0.05, 0.3);
      for (let i = 0; i < 4; i++) this.tom('square', 1800, 1800, 0.03, 0.03, 0.5 + i * 0.09);
      this.tom('sine', 60, 60, 1.2, 0.05, 0.9, 0.2);
    });
  }

  /** Esteira estendendo: motor e trava no fim. */
  esteira(): void {
    this.tocar(() => {
      this.tom('sawtooth', 70, 140, 1.2, 0.05, 0, 0.1);
      this.chiado(1.2, 0.05, 'lowpass', 700, 900, 0, 1, 0.1);
      this.tom('sine', 150, 50, 0.25, 0.18, 1.2);
      this.metal(320, 0.3, 0.1, 1.2);
    });
  }

  choque(): void {
    this.tocar(() => {
      this.chiado(0.05, 0.3, 'highpass', 4000, 2000);
      this.tom('sawtooth', 70, 50, 0.35, 0.09);
      for (let i = 0; i < 5; i++) this.chiado(0.03, 0.16, 'bandpass', aleatorio(2500, 6000), 2000, i * aleatorio(0.04, 0.08), 4);
    });
  }

  queda(): void {
    this.tocar(() => {
      this.tom('sine', 900, 200, 0.3, 0.05);
      this.tom('sine', 140, 40, 0.3, 0.2, 0.15);
      this.metal(220, 0.35, 0.1, 0.15);
    });
  }

  /** Empuxo do respiradouro: rajada de ar subindo. */
  empuxo(): void {
    this.tocar(() => {
      this.chiado(0.35, 0.16, 'bandpass', 500, 2600, 0, 1.5);
      this.tom('square', 200, 500, 0.15, 0.03);
    });
  }

  /* ------------------------------ síntese ------------------------------ */

  private tocar(receita: () => void): void {
    if (!this.ctx || !this.saida) return;
    if (this.ctx.state !== 'running') {
      this.ctx.resume().catch(() => {});
      return;
    }
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
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.saida!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private chiado(dur: number, vol: number, filtro: BiquadFilterType, f0: number, f1 = f0, atraso = 0, q = 1, ataque = 0.006): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + atraso;
    const fonte = ctx.createBufferSource();
    fonte.buffer = this.ruido;
    fonte.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(30, f0), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fonte.connect(f).connect(g).connect(this.saida!);
    fonte.start(t, Math.random() * 0.5);
    fonte.stop(t + dur + 0.05);
  }

  /** Pancada metálica: parciais inarmônicas decaindo. */
  private metal(f: number, dur: number, vol: number, atraso = 0): void {
    [1, 2.76, 5.4].forEach((p, i) => this.tom('sine', f * p, f * p * 0.995, dur / (1 + i * 0.6), vol / (1 + i * 1.2), atraso, 0.002));
  }
}
