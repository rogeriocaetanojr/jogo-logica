import Phaser from 'phaser';

/** Volume geral da trilha (0 a 1), abaixo dos efeitos. */
const VOLUME = 0.11;
const BPM = 126;
/** Duração de uma colcheia (8 passos por compasso). */
const PASSO_S = 60 / BPM / 2;
/** Quanto à frente o agendador marca as notas, e de quanto em quanto tempo ele roda. */
const ANTECEDENCIA_S = 0.2;
const INTERVALO_MS = 50;
const FADE_ENTRADA_S = 1.5;
const FADE_SAIDA_S = 0.5;

/** Dó 5 (523 Hz): a melodia é escrita em semitons a partir dela; o baixo, duas oitavas abaixo. */
const DO5 = 523.25;

type Linha = readonly (number | null)[];

interface Secao {
  /** Raiz do acorde de cada compasso (semitons a partir de dó) e se é menor. */
  acordes: readonly (readonly [number, boolean])[];
  /** Melodia: um compasso por linha, 8 colcheias; null = pausa, -1 = segura a nota anterior. */
  melodia: readonly Linha[];
}

/*
 * Tudo em sol mixolídio (sol maior com fá natural): alegre, mas com um "jeitão" meio espacial
 * e sucateiro. Semitons a partir de dó 5; sol = 7, fá natural = 5/17.
 */

/** Parte A: motivo curto que pergunta e responde, subindo em degraus (G, F, C, G). */
const PARTE_A: Secao = {
  acordes: [
    [7, false],
    [5, false],
    [0, false],
    [7, false],
    [7, false],
    [5, false],
    [2, true],
    [7, false],
  ],
  melodia: [
    [7, null, 7, 11, null, 14, 12, null],
    [9, -1, null, 5, 9, null, 12, null],
    [7, null, 4, 7, null, 12, 11, 9],
    [7, -1, -1, null, null, 2, 5, 6],
    [7, null, 7, 11, null, 14, 17, null],
    [17, 16, 14, null, 12, 14, -1, null],
    [14, null, 12, 9, null, 5, 9, null],
    [7, -1, -1, -1, null, null, null, null],
  ],
};

/** Parte B: frases longas e cantadas, mais "flutuantes" (C, D, Em, C, Am, D...). */
const PARTE_B: Secao = {
  acordes: [
    [0, false],
    [2, false],
    [4, true],
    [0, false],
    [9, true],
    [2, false],
    [5, false],
    [7, false],
  ],
  melodia: [
    [16, -1, 19, -1, 16, null, 12, null],
    [14, -1, -1, null, 18, null, 21, null],
    [19, null, 16, null, 19, 23, -1, null],
    [21, -1, 19, null, 16, null, 12, 14],
    [16, -1, 12, null, 9, null, 12, 16],
    [18, -1, 21, null, 18, null, 14, null],
    [17, null, 14, 17, null, 21, -1, null],
    [19, -1, -1, -1, null, 11, 14, 17],
  ],
};

/** Ponte: só baixo, bateria e bipes de robô, para respirar antes de voltar ao tema. */
const PONTE: Secao = {
  acordes: [
    [5, false],
    [7, false],
    [5, false],
    [7, false],
  ],
  melodia: [
    [null, null, 24, null, null, 22, null, null],
    [null, null, 19, null, null, 17, null, null],
    [null, null, 24, null, null, 26, null, null],
    [26, 24, 22, 19, 17, null, null, null],
  ],
};

/** Ordem das seções: tema, refrão, tema, ponte, refrão... e volta. */
const ROTEIRO: readonly { secao: Secao; oitava: number }[] = [
  { secao: PARTE_A, oitava: 0 },
  { secao: PARTE_B, oitava: 0 },
  { secao: PARTE_A, oitava: 0 },
  { secao: PONTE, oitava: 0 },
  { secao: PARTE_B, oitava: -12 },
];

/** Swing: a colcheia do contratempo atrasa um pouco (sensação de "gingado"). */
const SWING_S = PASSO_S * 0.28;
/** Baixo sincopado: semitons sobre a raiz por colcheia; null = pausa. */
const BAIXO: readonly (number | null)[] = [0, null, 0, 12, null, 7, null, 10];

const freq = (semitons: number, base = DO5): number => base * Math.pow(2, semitons / 12);

/**
 * Trilha da Fase 3, sintetizada na hora com WebAudio (sem arquivo): chiptune alegre com
 * swing em sol mixolídio, com eco espacial na melodia. Melodia em onda quadrada,
 * baixo "pula-pula" em triângulo, acordes curtinhos nos contratempos e bateria leve de ruído.
 * O roteiro alterna tema, tema mais agudo, refrão e ponte para não cansar. Toques de lixão:
 * de vez em quando um "plim" de sucata brilhando ou um "tonc" de lata. Usa o contexto do
 * Phaser, então segue o mudo do jogo.
 */
export class MusicaLixao {
  private readonly ctx: AudioContext | null;
  private readonly destino: AudioNode | null;
  private mestre: GainNode | null = null;
  private eco: DelayNode | null = null;
  private ruido: AudioBuffer | null = null;
  private temporizador?: number;
  private proximoTempo = 0;
  private passo = 0;
  /** Compasso global, para achar a seção e o compasso dentro dela. */
  private compasso = 0;

  constructor(cena: Phaser.Scene) {
    const g = cena.sound as Phaser.Sound.WebAudioSoundManager;
    this.ctx = g && 'context' in g ? g.context : null;
    this.destino = this.ctx ? (g.destination ?? this.ctx.destination) : null;
  }

  iniciar(): void {
    const ctx = this.ctx;
    if (!ctx || !this.destino || this.mestre) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});

    this.mestre = ctx.createGain();
    this.mestre.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.mestre.gain.exponentialRampToValueAtTime(VOLUME, ctx.currentTime + FADE_ENTRADA_S);
    this.mestre.connect(this.destino);

    // Eco espacial curto na melodia
    this.eco = ctx.createDelay(1);
    this.eco.delayTime.value = PASSO_S * 3;
    const retorno = ctx.createGain();
    retorno.gain.value = 0.3;
    const abafa = ctx.createBiquadFilter();
    abafa.type = 'lowpass';
    abafa.frequency.value = 2500;
    const nivel = ctx.createGain();
    nivel.gain.value = 0.5;
    this.eco.connect(abafa).connect(retorno).connect(this.eco);
    abafa.connect(nivel).connect(this.mestre);

    this.ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const dados = this.ruido.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;

    this.proximoTempo = ctx.currentTime + 0.1;
    this.passo = 0;
    this.compasso = 0;
    this.temporizador = window.setInterval(() => this.agendar(), INTERVALO_MS);
  }

  /** Sai de cena: apaga rapidinho e desmonta. */
  parar(): void {
    window.clearInterval(this.temporizador);
    const ctx = this.ctx;
    const mestre = this.mestre;
    this.mestre = null;
    if (!ctx || !mestre) return;
    mestre.gain.cancelScheduledValues(ctx.currentTime);
    mestre.gain.setValueAtTime(Math.max(0.0001, mestre.gain.value), ctx.currentTime);
    mestre.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + FADE_SAIDA_S);
    window.setTimeout(() => {
      mestre.disconnect();
      this.eco?.disconnect();
      this.eco = null;
    }, FADE_SAIDA_S * 1000 + 100);
  }

  /* =========================================================================
   * AGENDADOR
   * ========================================================================= */

  private agendar(): void {
    const ctx = this.ctx;
    if (!ctx || !this.mestre) return;
    // Aba escondida ou contexto suspenso: não acumula notas atrasadas
    if (this.proximoTempo < ctx.currentTime - 0.5) this.proximoTempo = ctx.currentTime + 0.05;
    while (this.proximoTempo < ctx.currentTime + ANTECEDENCIA_S) {
      this.tocarPasso(this.passo, this.proximoTempo);
      this.proximoTempo += PASSO_S;
      this.passo = (this.passo + 1) % 8;
      if (this.passo === 0) this.compasso++;
    }
  }

  /** Seção atual do roteiro e o compasso dentro dela. */
  private posicao(): { secao: Secao; oitava: number; c: number } {
    const total = ROTEIRO.reduce((s, r) => s + r.secao.melodia.length, 0);
    let resto = this.compasso % total;
    for (const r of ROTEIRO) {
      if (resto < r.secao.melodia.length) return { secao: r.secao, oitava: r.oitava, c: resto };
      resto -= r.secao.melodia.length;
    }
    return { secao: PARTE_A, oitava: 0, c: 0 };
  }

  private tocarPasso(p: number, t0: number): void {
    const t = p % 2 === 1 ? t0 + SWING_S : t0;
    const { secao, oitava, c } = this.posicao();
    const [raiz, menor] = secao.acordes[c];

    // Melodia: nota dura até a próxima pausa ou nota (o -1 estende)
    const nota = secao.melodia[c][p];
    if (nota !== null && nota !== -1) {
      let dur = 1;
      while (p + dur < 8 && secao.melodia[c][p + dur] === -1) dur++;
      this.lead(freq(nota + oitava), t, dur * PASSO_S * 0.85);
    }

    // Baixo sincopado
    const salto = BAIXO[p];
    if (salto !== null) this.baixo(freq(raiz + salto - 24), t);

    // Acordes curtinhos em síncope (no "e" do 2 e do 4)
    if (p === 3 || p === 7 || p === 5) this.acorde(raiz, menor, t);

    // Bateria leve com gingado: bumbo no 1 e no "e" do 2, caixa no 2 e 4, chimbal em todas
    if (p === 0 || p === 3) this.bumbo(t);
    if (p === 2 || p === 6) this.caixa(t);
    this.chimbal(t, p % 2 === 1 ? 1 : 0.5);

    // Lixão: brilho de sucata ou lata batendo, de vez em quando
    if (p === 7 && Math.random() < 0.12) this.plim(t);
    if (p === 3 && Math.random() < 0.1) this.tonc(t);
  }

  /* =========================================================================
   * INSTRUMENTOS
   * ========================================================================= */

  private envelope(t: number, pico: number, ataque: number, duracao: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + ataque);
    g.gain.setValueAtTime(pico, t + Math.max(ataque, duracao * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    g.connect(this.mestre!);
    return g;
  }

  private osc(tipo: OscillatorType, f: number, t: number, dur: number, saida: AudioNode): OscillatorNode {
    const o = this.ctx!.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(f, t);
    o.connect(saida);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private fonteRuido(t: number, dur: number, saida: AudioNode): void {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.ruido;
    s.connect(saida);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  /** Melodia: onda quadrada com um vibratinho leve nas notas longas. */
  private lead(f: number, t: number, dur: number): void {
    const g = this.envelope(t, 0.2, 0.005, dur);
    if (this.eco) g.connect(this.eco);
    const o = this.osc('triangle', f, t, dur, g);
    // Um pouco de quadrada por cima para soar 8 bits, mas mais macia que o lead clássico
    const brilho = this.ctx!.createGain();
    brilho.gain.value = 0.35;
    brilho.connect(g);
    this.osc('square', f, t, dur, brilho);
    if (dur > PASSO_S * 1.5) {
      const lfo = this.ctx!.createOscillator();
      lfo.frequency.value = 6;
      const prof = this.ctx!.createGain();
      prof.gain.value = f * 0.008;
      lfo.connect(prof).connect(o.frequency);
      lfo.start(t + 0.12);
      lfo.stop(t + dur + 0.05);
    }
  }

  private baixo(f: number, t: number): void {
    const g = this.envelope(t, 0.45, 0.004, PASSO_S * 0.8);
    this.osc('triangle', f, t, PASSO_S * 0.8, g);
  }

  private acorde(raiz: number, menor: boolean, t: number): void {
    const dur = PASSO_S * 0.45;
    const g = this.envelope(t, 0.04, 0.003, dur);
    for (const n of [0, menor ? 3 : 4, 7]) this.osc('square', freq(raiz + n - 12), t, dur, g);
  }

  private bumbo(t: number): void {
    const g = this.envelope(t, 0.5, 0.002, 0.12);
    const o = this.osc('triangle', 160, t, 0.12, g);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
  }

  private caixa(t: number): void {
    const filtro = this.ctx!.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 2500;
    const g = this.envelope(t, 0.18, 0.002, 0.09);
    filtro.connect(g);
    this.fonteRuido(t, 0.09, filtro);
  }

  private chimbal(t: number, volume: number): void {
    const filtro = this.ctx!.createBiquadFilter();
    filtro.type = 'highpass';
    filtro.frequency.value = 8000;
    const g = this.envelope(t, 0.07 * volume, 0.001, 0.03);
    filtro.connect(g);
    this.fonteRuido(t, 0.03, filtro);
  }

  /** Brilho de sucata: dois bipes agudos subindo, tipo pegar uma peça. */
  private plim(t: number): void {
    const g1 = this.envelope(t, 0.08, 0.002, 0.08);
    this.osc('square', freq(24), t, 0.08, g1);
    const g2 = this.envelope(t + 0.08, 0.08, 0.002, 0.2);
    this.osc('square', freq(31), t + 0.08, 0.2, g2);
  }

  /** Lata batendo: tom curto que cai, meio oco. */
  private tonc(t: number): void {
    const g = this.envelope(t, 0.12, 0.002, 0.15);
    const o = this.osc('triangle', 700, t, 0.15, g);
    o.frequency.exponentialRampToValueAtTime(300, t + 0.12);
  }
}
