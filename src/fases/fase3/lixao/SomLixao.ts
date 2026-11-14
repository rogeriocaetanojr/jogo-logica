import Phaser from 'phaser';

/** Volume dos efeitos da fase (0 a 1), antes do mudo compartilhado do jogo. */
const VOLUME = 0.25;

/**
 * Bipes eletrônicos do Lixão, sintetizados com WebAudio pelo contexto do Phaser (segue o
 * mudo do jogo). Por enquanto: a sequência de acerto do terminal e o toque do checkpoint.
 */
export class SomLixao {
  private readonly contexto: AudioContext | null;
  private readonly saida: GainNode | null;

  constructor(cena: Phaser.Scene) {
    const gerenciador = cena.sound as Phaser.Sound.WebAudioSoundManager;
    this.contexto = gerenciador && 'context' in gerenciador ? gerenciador.context : null;
    if (this.contexto) {
      this.saida = this.contexto.createGain();
      this.saida.gain.value = VOLUME;
      this.saida.connect(gerenciador.destination ?? this.contexto.destination);
    } else {
      this.saida = null;
    }
  }

  /** Acerto no terminal: três bipes subindo, como uma máquina destravando. */
  bipesAcerto(): void {
    [660, 880, 1320].forEach((freq, i) => this.bipe(freq, 0.09, i * 0.11));
  }

  /** Checkpoint salvo: dois bipes curtos no mesmo tom. */
  bipesCheckpoint(): void {
    this.bipe(990, 0.05, 0);
    this.bipe(990, 0.05, 0.08);
  }

  /** Aviso de perigo de um mecanismo: dois bipes graves. */
  aviso(): void {
    this.bipe(330, 0.06, 0);
    this.bipe(330, 0.06, 0.1);
  }

  /** Prensa batendo: "clang" agudo de lata, com parciais desafinados (som metálico) caindo rápido. */
  batida(): void {
    const ctx = this.contexto;
    const saida = this.saida;
    if (!ctx || !saida) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    for (const [f, vol, dur] of [
      [1240, 0.5, 0.18],
      [1870, 0.35, 0.12],
      [2690, 0.25, 0.08],
    ] as const) {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.85, t + dur);
      ganho.gain.setValueAtTime(0.0001, t);
      ganho.gain.exponentialRampToValueAtTime(vol, t + 0.002);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(ganho).connect(saida);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  }

  /** Choque ligando: rajada de bipes agudos. */
  choque(): void {
    for (let i = 0; i < 4; i++) this.bipe(1800 + i * 120, 0.03, i * 0.04);
  }

  private bipe(frequencia: number, duracao: number, atraso: number): void {
    const ctx = this.contexto;
    const saida = this.saida;
    if (!ctx || !saida) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    const inicio = ctx.currentTime + atraso;
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = frequencia;
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(1, inicio + 0.005);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
    osc.connect(ganho).connect(saida);
    osc.start(inicio);
    osc.stop(inicio + duracao + 0.02);
  }
}
