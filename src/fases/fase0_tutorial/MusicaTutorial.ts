import Phaser from 'phaser';

/** Volume geral da trilha (0 a 1), bem abaixo dos efeitos. */
const VOLUME = 0.1;
const BPM = 96;
/** Uma colcheia (8 passos por compasso). */
const PASSO_S = 60 / BPM / 2;
const ANTECEDENCIA_S = 0.2;
const INTERVALO_MS = 50;
const FADE_ENTRADA_S = 2;
const FADE_SAIDA_S = 0.6;
/** Lá 4: melodia, arpejo e baixo são escritos em semitons a partir dele. */
const LA4 = 440;

/** Melodia: um compasso por linha, 8 colcheias; null = pausa, -1 = segura a nota anterior. */
type Linha = readonly (number | null)[];

/*
 * Lá menor, Am - F - C - G (duas voltas por ciclo de 8 compassos). No escuro tocam só baixo,
 * arpejo abafado e um pad: soa misterioso. Quando a energia volta, entram a melodia e a bateria.
 */
const ACORDES: readonly (readonly [number, boolean])[] = [
  [0, true],
  [-4, false],
  [3, false],
  [-2, false],
  [0, true],
  [-4, false],
  [3, false],
  [-2, false],
];

const MELODIA: readonly Linha[] = [
  [0, null, 3, null, 7, -1, 5, 3],
  [0, -1, null, -4, 0, null, 3, null],
  [7, null, 10, 7, 3, -1, 0, null],
  [2, -1, -1, null, -2, null, 2, 3],
  [0, null, 3, null, 7, -1, 12, 10],
  [8, -1, 7, null, 3, null, 0, null],
  [3, null, 7, 10, 12, -1, 10, 7],
  [5, -1, 2, -1, -1, null, null, null],
];

const freq = (semitons: number): number => LA4 * Math.pow(2, semitons / 12);

/**
 * Musiquinha do tutorial: chiptune sintetizado em laço pelo contexto do Phaser (segue o mudo
 * do jogo). `ligarEnergia` acrescenta melodia e bateria quando o galpão acende.
 */
export class MusicaTutorial {
  private readonly ctx: AudioContext | null;
  private readonly destino: AudioNode | null;
  private mestre: GainNode | null = null;
  private ruido: AudioBuffer | null = null;
  private temporizador?: number;
  private proximoTempo = 0;
  private passo = 0;
  private energia = false;

  constructor(cena: Phaser.Scene) {
    const g = cena.sound as Phaser.Sound.WebAudioSoundManager;
    this.ctx = g && 'context' in g ? g.context : null;
    this.destino = this.ctx ? (g.destination ?? this.ctx.destination) : null;
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.parar());
  }

  iniciar(energia = false): void {
    const ctx = this.ctx;
    if (!ctx || !this.destino || this.mestre) return;
    this.energia = energia;
    try {
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      this.mestre = ctx.createGain();
      this.mestre.gain.setValueAtTime(0.0001, ctx.currentTime);
      this.mestre.gain.exponentialRampToValueAtTime(VOLUME, ctx.currentTime + FADE_ENTRADA_S);
      this.mestre.connect(this.destino);
      this.ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.proximoTempo = ctx.currentTime + 0.1;
      this.passo = 0;
      this.temporizador = window.setInterval(() => this.agendar(), INTERVALO_MS);
    } catch {
      this.mestre = null;
    }
  }

  /** Luz de volta: a trilha ganha melodia e bateria a partir do próximo compasso. */
  ligarEnergia(): void {
    this.energia = true;
  }

  parar(): void {
    window.clearInterval(this.temporizador);
    const ctx = this.ctx;
    const mestre = this.mestre;
    this.mestre = null;
    if (!ctx || !mestre) return;
    try {
      mestre.gain.cancelScheduledValues(ctx.currentTime);
      mestre.gain.setValueAtTime(Math.max(0.0001, mestre.gain.value), ctx.currentTime);
      mestre.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + FADE_SAIDA_S);
      window.setTimeout(() => mestre.disconnect(), FADE_SAIDA_S * 1000 + 100);
    } catch {
      // Áudio indisponível
    }
  }

  /** Estado para testes. */
  descrever(): { tocando: boolean; energia: boolean; passo: number } {
    return { tocando: !!this.mestre, energia: this.energia, passo: this.passo };
  }

  private agendar(): void {
    const ctx = this.ctx;
    if (!ctx || !this.mestre) return;
    // Aba em segundo plano atrasa o temporizador: recomeça do agora em vez de despejar notas velhas
    if (this.proximoTempo < ctx.currentTime - 0.1) this.proximoTempo = ctx.currentTime + 0.05;
    while (this.proximoTempo < ctx.currentTime + ANTECEDENCIA_S) {
      this.tocarPasso(this.passo, this.proximoTempo);
      this.proximoTempo += PASSO_S;
      this.passo++;
    }
  }

  private tocarPasso(p: number, t: number): void {
    const compasso = Math.floor(p / 8) % ACORDES.length;
    const c = p % 8;
    const [raiz, menor] = ACORDES[compasso];
    const terca = menor ? 3 : 4;
    const triade = [raiz, raiz + terca, raiz + 7];

    // Pad suave no começo de cada compasso
    if (c === 0) for (const s of triade) this.nota('triangle', freq(s - 12), t, PASSO_S * 7.5, 0.05, 0.25);
    // Baixo nos tempos 1 e 3
    if (c === 0 || c === 4) this.nota('triangle', freq(raiz - 24), t, PASSO_S * 1.8, 0.32, 0.005);
    // Arpejo abafado em toda colcheia
    this.nota('square', freq(triade[c % 3] + (c >= 4 ? 12 : 0)), t, PASSO_S * 0.6, 0.035, 0.003);

    if (!this.energia) return;
    // Melodia (com a energia ligada)
    const linha = MELODIA[compasso];
    const nota = linha[c];
    if (nota !== null && nota !== -1) {
      let dur = 1;
      for (let k = c + 1; k < 8 && linha[k] === -1; k++) dur++;
      this.nota('square', freq(nota + 12), t, PASSO_S * dur * 0.9, 0.09, 0.008);
      this.nota('triangle', freq(nota), t, PASSO_S * dur * 0.9, 0.05, 0.01);
    }
    // Bateria: bumbo 1 e 3, caixa 2 e 4, chimbal nas colcheias de trás
    if (c === 0 || c === 4) this.bumbo(t);
    if (c === 2 || c === 6) this.caixa(t);
    if (c % 2 === 1) this.chimbal(t);
  }

  private nota(tipo: OscillatorType, f: number, t: number, dur: number, vol: number, ataque: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.setValueAtTime(vol, t + Math.max(ataque, dur * 0.4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.mestre!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private bumbo(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.mestre!);
    o.start(t);
    o.stop(t + 0.2);
  }

  private ruidoFiltrado(t: number, dur: number, vol: number, tipo: BiquadFilterType, f: number): void {
    const ctx = this.ctx!;
    const fonte = ctx.createBufferSource();
    fonte.buffer = this.ruido;
    const filtro = ctx.createBiquadFilter();
    filtro.type = tipo;
    filtro.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fonte.connect(filtro).connect(g).connect(this.mestre!);
    fonte.start(t);
    fonte.stop(t + dur + 0.02);
  }

  private caixa(t: number): void {
    this.ruidoFiltrado(t, 0.14, 0.22, 'bandpass', 1800);
    this.nota('triangle', 190, t, 0.08, 0.12, 0.002);
  }

  private chimbal(t: number): void {
    this.ruidoFiltrado(t, 0.04, 0.07, 'highpass', 7000);
  }
}
