import Phaser from 'phaser';

type NomeSom =
  | 'tiro'
  | 'pulo'
  | 'dano'
  | 'derrota'
  | 'espuma'
  | 'extintor'
  | 'apagar'
  | 'explosao'
  | 'lacre'
  | 'item'
  | 'bracada'
  | 'buzina'
  | 'sirene'
  | 'guindaste'
  | 'erro'
  | 'acerto'
  | 'glitch'
  | 'tink'
  | 'inimigo'
  | 'vapor';

/**
 * Sons sintetizados em tempo real com Web Audio (sem arquivos externos):
 * sirene do porto, ondas, fogo, guindaste e buzina de navio, além dos efeitos de jogo.
 */
export class SomPorto {
  private readonly contexto: AudioContext | null;
  private readonly saida: GainNode | null;
  private ruido: AudioBuffer | null = null;
  private ambientes: Array<{ fonte: AudioBufferSourceNode; ganho: GainNode }> = [];

  constructor(cena: Phaser.Scene) {
    const gerenciador = cena.sound as Phaser.Sound.WebAudioSoundManager;
    this.contexto = gerenciador && 'context' in gerenciador ? gerenciador.context : null;
    if (this.contexto) {
      this.saida = this.contexto.createGain();
      this.saida.gain.value = 0.32;
      this.saida.connect(gerenciador.destination ?? this.contexto.destination);
      this.ruido = this.criarRuido(2);
    } else {
      this.saida = null;
    }
  }

  private criarRuido(segundos: number): AudioBuffer | null {
    if (!this.contexto) return null;
    const taxa = this.contexto.sampleRate;
    const buf = this.contexto.createBuffer(1, Math.floor(taxa * segundos), taxa);
    const dados = buf.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    return buf;
  }

  private tom(tipo: OscillatorType, f0: number, f1: number, duracao: number, volume: number, atraso = 0): void {
    const ctx = this.contexto;
    if (!ctx || !this.saida) return;
    const t = ctx.currentTime + atraso;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + duracao);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    osc.connect(g).connect(this.saida);
    osc.start(t);
    osc.stop(t + duracao + 0.05);
  }

  private chiado(duracao: number, volume: number, filtro: BiquadFilterType, freq: number, freqFim = freq, atraso = 0): void {
    const ctx = this.contexto;
    if (!ctx || !this.saida || !this.ruido) return;
    const t = ctx.currentTime + atraso;
    const fonte = ctx.createBufferSource();
    fonte.buffer = this.ruido;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, freqFim), t + duracao);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    fonte.connect(f).connect(g).connect(this.saida);
    fonte.start(t, Math.random() * 1.5);
    fonte.stop(t + duracao + 0.05);
  }

  tocar(nome: NomeSom): void {
    try {
      if (!this.contexto || this.contexto.state !== 'running') return;
      switch (nome) {
        case 'tiro':
          this.tom('square', 880, 1760, 0.07, 0.12);
          break;
        case 'pulo':
          this.tom('square', 220, 440, 0.1, 0.06);
          break;
        case 'dano':
          this.tom('sawtooth', 300, 80, 0.22, 0.18);
          break;
        case 'derrota':
          this.tom('triangle', 440, 60, 0.9, 0.2);
          break;
        case 'espuma':
          this.chiado(0.35, 0.22, 'bandpass', 1800, 600);
          break;
        case 'extintor':
          this.chiado(0.5, 0.25, 'highpass', 2500, 1200);
          break;
        case 'apagar':
          this.chiado(0.8, 0.22, 'lowpass', 3000, 300);
          this.tom('sine', 660, 990, 0.25, 0.08, 0.1);
          break;
        case 'explosao':
          this.chiado(0.9, 0.5, 'lowpass', 900, 60);
          this.tom('sine', 90, 30, 0.6, 0.35);
          break;
        case 'lacre':
          this.tom('square', 1320, 1320, 0.05, 0.08);
          this.tom('square', 1760, 1760, 0.08, 0.08, 0.05);
          break;
        case 'item':
          [523, 659, 784, 1046].forEach((f, i) => this.tom('square', f, f, 0.1, 0.09, i * 0.08));
          break;
        case 'bracada':
          this.chiado(0.25, 0.12, 'lowpass', 800, 300);
          break;
        case 'buzina':
          this.tom('sawtooth', 98, 92, 1.1, 0.16);
          this.tom('sawtooth', 147, 140, 1.1, 0.1);
          break;
        case 'sirene':
          this.tom('sine', 600, 900, 0.6, 0.08);
          this.tom('sine', 900, 600, 0.6, 0.08, 0.6);
          break;
        case 'guindaste':
          this.tom('sawtooth', 70, 110, 0.5, 0.06);
          this.chiado(0.5, 0.05, 'bandpass', 400, 500);
          break;
        case 'erro':
          this.tom('square', 160, 120, 0.3, 0.12);
          break;
        case 'acerto':
          this.tom('square', 660, 660, 0.08, 0.1);
          this.tom('square', 990, 990, 0.14, 0.1, 0.08);
          break;
        case 'glitch':
          for (let i = 0; i < 5; i++) this.tom('square', 200 + Math.random() * 1800, 100 + Math.random() * 900, 0.05, 0.07, i * 0.04);
          break;
        case 'tink':
          this.tom('triangle', 2400, 1800, 0.06, 0.1);
          break;
        case 'inimigo':
          this.chiado(0.25, 0.2, 'bandpass', 1200, 200);
          this.tom('square', 440, 110, 0.2, 0.08);
          break;
        case 'vapor':
          this.chiado(0.6, 0.18, 'highpass', 4000, 2000);
          break;
      }
    } catch {
      // Áudio indisponível: segue sem som
    }
  }

  /** Ambiente contínuo: ondas (passa-baixa lento) e crepitar do fogo. */
  iniciarAmbiente(ondas: number, fogo: number): void {
    try {
      const ctx = this.contexto;
      if (!ctx || !this.saida || !this.ruido) return;
      this.pararAmbiente();
      const criarLaco = (volume: number, tipo: BiquadFilterType, freq: number, lfo: number) => {
        if (volume <= 0) return;
        const fonte = ctx.createBufferSource();
        fonte.buffer = this.ruido;
        fonte.loop = true;
        const filtro = ctx.createBiquadFilter();
        filtro.type = tipo;
        filtro.frequency.value = freq;
        const ganho = ctx.createGain();
        ganho.gain.value = volume;
        const osc = ctx.createOscillator();
        osc.frequency.value = lfo;
        const prof = ctx.createGain();
        prof.gain.value = volume * 0.6;
        osc.connect(prof).connect(ganho.gain);
        osc.start();
        fonte.connect(filtro).connect(ganho).connect(this.saida!);
        fonte.start();
        this.ambientes.push({ fonte, ganho });
      };
      criarLaco(ondas * 0.12, 'lowpass', 420, 0.12);
      criarLaco(fogo * 0.05, 'bandpass', 2200, 7);
    } catch {
      // Ignora falhas de áudio
    }
  }

  pararAmbiente(): void {
    for (const a of this.ambientes) {
      try {
        a.fonte.stop();
        a.fonte.disconnect();
        a.ganho.disconnect();
      } catch {
        // Fonte já parada
      }
    }
    this.ambientes = [];
  }

  destruir(): void {
    this.pararAmbiente();
    try {
      this.saida?.disconnect();
    } catch {
      // Ignora
    }
  }
}
