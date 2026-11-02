import Phaser from 'phaser';
import { SOM_FASE1 } from './constantesFase1';

/** Evento da cena que leva um efeito sonoro; qualquer módulo da fase emite sem conhecer o som. */
export const EVENTO_SOM_FASE1 = 'fase1-som';
/** Evento da cena com o estado contínuo do jogador (planando, na coluna...), a cada quadro. */
export const EVENTO_ESTADO_SOM_FASE1 = 'fase1-som-estado';

export type NomeSomFase1 =
  | 'pulo'
  | 'aterrissar'
  | 'passo'
  | 'impulso'
  | 'geiser'
  | 'rachar'
  | 'quebrar'
  | 'efemera'
  | 'alerta'
  | 'mirar'
  | 'rajada'
  | 'pulso_carga'
  | 'pulso'
  | 'hackear'
  | 'terminal_abrir'
  | 'terminal_erro'
  | 'terminal_acerto'
  | 'checkpoint'
  | 'queda'
  | 'dano'
  | 'portao'
  | 'elevador'
  | 'escada'
  | 'porta_arena'
  | 'npc'
  | 'placa'
  | 'placa_solta'
  | 'boss_entrada'
  | 'boss_aviso'
  | 'boss_onda'
  | 'boss_salto'
  | 'boss_choque'
  | 'boss_penas'
  | 'pena_impacto'
  | 'boss_tonto'
  | 'pisao'
  | 'boss_derrotado'
  | 'trovao'
  | 'desligar'
  | 'portal'
  | 'vitoria'
  | 'mudo'
  | 'tecla'
  | 'enviar'
  | 'prompt'
  | 'planar_inicio'
  | 'coluna_entrar'
  | 'scanner'
  | 'renascer'
  | 'dialogo_abrir'
  | 'dialogo_avancar'
  | 'helio_fala';

/** Estado contínuo que liga e desliga os laços de vento. */
export interface EstadoSomFase1 {
  planando: boolean;
  naColuna: boolean;
  naZonaContraria: boolean;
}

/**
 * Emite um efeito sonoro. Com `x`, o volume cai com a distância até o centro da tela
 * (o que está longe soa baixinho; o que está fora da tela, quase nada).
 */
export function emitirSom(cena: Phaser.Scene, nome: NomeSomFase1, x?: number, intensidade: number = 1): void {
  cena.events.emit(EVENTO_SOM_FASE1, nome, x, intensidade);
}

interface Laco {
  fonte: AudioBufferSourceNode;
  ganho: GainNode;
  volume: number;
}

/**
 * Sons da Fase 1 sintetizados em tempo real com Web Audio (sem arquivos): pulo, vento, sentinelas,
 * terminal, boss, trovão e os laços contínuos de vento e chuva. A trilha fica em MusicaFase1.
 * Segue o padrão de SomPorto: só toca com o contexto rodando e tudo dentro de try/catch.
 */
export class SomFase1 {
  private readonly cena: Phaser.Scene;
  private readonly contexto: AudioContext | null;
  private readonly saida: GainNode | null;
  private readonly ruido: AudioBuffer | null;
  private lacos: Record<'base' | 'planeio' | 'coluna' | 'zona' | 'chuva', Laco | null> = {
    base: null,
    planeio: null,
    coluna: null,
    zona: null,
    chuva: null,
  };
  private estado: EstadoSomFase1 = { planando: false, naColuna: false, naZonaContraria: false };
  private intensidadeTempestade: number = 0;
  private pausado: boolean = false;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    const gerenciador = cena.sound as Phaser.Sound.WebAudioSoundManager;
    this.contexto = gerenciador && 'context' in gerenciador ? gerenciador.context : null;
    if (this.contexto) {
      this.saida = this.contexto.createGain();
      this.saida.gain.value = SOM_FASE1.VOLUME_EFEITOS;
      this.saida.connect(gerenciador.destination ?? this.contexto.destination);
      this.ruido = this.criarRuido(2);
      this.iniciarLacos();
    } else {
      this.saida = null;
      this.ruido = null;
    }

    cena.events.on(EVENTO_SOM_FASE1, this.aoEvento, this);
    cena.events.on(EVENTO_ESTADO_SOM_FASE1, this.aoEstado, this);

    // O navegador começa o áudio suspenso até um gesto do jogador: retoma no primeiro que vier
    this.retomarContexto();
    document.addEventListener('keydown', this.retomarContexto);
    document.addEventListener('pointerdown', this.retomarContexto);
  }

  private retomarContexto = (): void => {
    const ctx = this.contexto;
    if (!ctx) return;
    if (ctx.state === 'running') {
      document.removeEventListener('keydown', this.retomarContexto);
      document.removeEventListener('pointerdown', this.retomarContexto);
      return;
    }
    ctx.resume().catch(() => {});
  };

  /**
   * Voz de quem fala: um bipe curto por sílaba, no tom de cada personagem.
   * Varia um pouco a altura para soar como fala e não como alarme.
   */
  public voz(frequencia: number, forma: OscillatorType = 'square'): void {
    try {
      if (!this.contexto || this.contexto.state !== 'running') return;
      const f = frequencia * (0.9 + Math.random() * 0.25);
      this.tom(forma, f, f * 0.92, 0.045, 0.06);
    } catch {
      // Áudio indisponível
    }
  }

  // ---------------------------------------------------------------------------
  // Entrada: eventos da cena
  // ---------------------------------------------------------------------------

  private aoEvento(nome: NomeSomFase1, x?: number, intensidade: number = 1): void {
    let volume = intensidade;
    if (x !== undefined) {
      const camera = this.cena.cameras.main;
      const distancia = Math.abs(x - camera.worldView.centerX);
      volume *= Phaser.Math.Clamp(1 - Math.max(0, distancia - 300) / SOM_FASE1.ALCANCE_PX, 0, 1);
    }
    if (volume < 0.04) return;
    this.tocar(nome, volume);
  }

  private aoEstado(estado: EstadoSomFase1): void {
    this.estado = estado;
  }

  /** Terminal ou diálogo aberto: os laços de vento do jogador calam, o céu fica abafado. */
  public definirPausado(pausado: boolean): void {
    this.pausado = pausado;
  }

  public definirTempestade(intensidade: number): void {
    this.intensidadeTempestade = intensidade;
  }

  /** Atualiza o volume dos laços (chamar a cada quadro). */
  public atualizar(): void {
    const ctx = this.contexto;
    if (!ctx || ctx.state !== 'running') return;
    const L = SOM_FASE1.LACOS;
    const livre = !this.pausado;
    const alvos: Record<keyof typeof this.lacos, number> = {
      base: L.BASE * (1 - this.intensidadeTempestade * 0.3),
      planeio: livre && this.estado.planando ? L.PLANEIO : 0,
      coluna: livre && this.estado.naColuna ? L.COLUNA : 0,
      zona: livre && this.estado.naZonaContraria ? L.ZONA : 0,
      chuva: L.CHUVA * this.intensidadeTempestade,
    };
    (Object.keys(this.lacos) as (keyof typeof this.lacos)[]).forEach((nome) => {
      const laco = this.lacos[nome];
      if (!laco) return;
      try {
        laco.ganho.gain.setTargetAtTime(alvos[nome] * laco.volume, ctx.currentTime, 0.12);
      } catch {
        // Áudio indisponível
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Blocos de construção
  // ---------------------------------------------------------------------------

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
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    osc.connect(g).connect(this.saida);
    osc.start(t);
    osc.stop(t + duracao + 0.05);
  }

  private chiado(
    duracao: number,
    volume: number,
    filtro: BiquadFilterType,
    freq: number,
    freqFim = freq,
    atraso = 0
  ): void {
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
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    fonte.connect(f).connect(g).connect(this.saida);
    fonte.start(t, Math.random() * 1.5);
    fonte.stop(t + duracao + 0.05);
  }

  private arpejo(tipo: OscillatorType, notas: readonly number[], passo: number, duracao: number, volume: number): void {
    notas.forEach((f, i) => this.tom(tipo, f, f, duracao, volume, i * passo));
  }

  // ---------------------------------------------------------------------------
  // Efeitos
  // ---------------------------------------------------------------------------

  public tocar(nome: NomeSomFase1, v: number = 1): void {
    try {
      if (!this.contexto || this.contexto.state !== 'running') return;
      switch (nome) {
        case 'pulo':
          this.tom('square', 280, 560, 0.1, 0.08 * v);
          this.chiado(0.08, 0.07 * v, 'highpass', 2500, 4000);
          break;
        case 'aterrissar':
          this.chiado(0.1, 0.13 * v, 'lowpass', 800, 200);
          this.tom('sine', 120, 55, 0.12, 0.12 * v);
          break;
        case 'passo':
          this.chiado(0.05, 0.07 * v, 'bandpass', 500 + Math.random() * 200, 300);
          this.tom('sine', 140 + Math.random() * 30, 90, 0.05, 0.05 * v);
          break;
        case 'impulso':
          this.chiado(0.45, 0.2 * v, 'bandpass', 400, 2600);
          this.tom('sine', 180, 620, 0.4, 0.08 * v);
          break;
        case 'geiser':
          this.chiado(0.6, 0.3 * v, 'bandpass', 300, 2200);
          this.tom('sine', 90, 300, 0.5, 0.12 * v);
          break;
        case 'rachar':
          for (let i = 0; i < 3; i++) this.chiado(0.05, 0.1 * v, 'highpass', 2800, 1800, i * 0.12);
          this.tom('sawtooth', 120, 90, 0.3, 0.05 * v);
          break;
        case 'quebrar':
          this.chiado(0.5, 0.28 * v, 'lowpass', 1800, 200);
          this.tom('triangle', 160, 50, 0.3, 0.14 * v);
          break;
        case 'efemera':
          this.chiado(0.35, 0.07 * v, 'highpass', 2500, 5000);
          this.tom('sine', 800, 400, 0.2, 0.04 * v);
          break;
        case 'alerta':
          this.tom('square', 880, 880, 0.08, 0.1 * v);
          this.tom('square', 660, 660, 0.08, 0.1 * v, 0.1);
          this.tom('square', 880, 880, 0.08, 0.1 * v, 0.2);
          break;
        case 'mirar':
          this.tom('square', 440, 880, 0.25, 0.08 * v);
          break;
        case 'rajada':
          this.chiado(0.5, 0.3 * v, 'bandpass', 300, 1500);
          this.tom('sawtooth', 120, 60, 0.3, 0.09 * v);
          break;
        case 'pulso_carga':
          this.tom('sine', 200, 900, 0.7, 0.08 * v);
          break;
        case 'pulso':
          this.chiado(0.5, 0.35 * v, 'lowpass', 2000, 80);
          this.tom('sine', 120, 40, 0.5, 0.3 * v);
          break;
        case 'hackear':
          for (let i = 0; i < 5; i++) this.tom('square', 200 + Math.random() * 1800, 100 + Math.random() * 900, 0.05, 0.07 * v, i * 0.04);
          this.tom('square', 880, 110, 0.5, 0.08 * v, 0.2);
          this.arpejo('square', [523, 659, 784], 0.09, 0.1, 0.08 * v);
          break;
        case 'terminal_abrir':
          this.tom('square', 600, 900, 0.05, 0.06 * v);
          this.tom('square', 900, 1200, 0.06, 0.06 * v, 0.06);
          break;
        case 'terminal_erro':
          this.tom('square', 160, 110, 0.3, 0.12 * v);
          this.tom('sawtooth', 80, 60, 0.25, 0.08 * v, 0.05);
          break;
        case 'terminal_acerto':
          this.arpejo('square', [523, 659, 784, 1046], 0.08, 0.12, 0.09 * v);
          break;
        case 'checkpoint':
          this.arpejo('sine', [784, 988, 1319], 0.12, 0.5, 0.1 * v);
          break;
        case 'queda':
          this.tom('triangle', 440, 60, 0.8, 0.16 * v);
          this.chiado(0.7, 0.12 * v, 'lowpass', 1500, 100);
          break;
        case 'dano':
          this.tom('sawtooth', 300, 80, 0.22, 0.17 * v);
          this.chiado(0.12, 0.12 * v, 'highpass', 2000, 800);
          break;
        case 'portao':
          this.tom('sawtooth', 55, 40, 1.3, 0.13 * v);
          this.chiado(1.4, 0.2 * v, 'lowpass', 500, 120);
          break;
        case 'elevador':
          this.tom('triangle', 90, 180, 1.5, 0.09 * v);
          this.chiado(1.5, 0.1 * v, 'bandpass', 400, 900);
          break;
        case 'escada':
          this.tom('sawtooth', 80, 160, 0.35, 0.09 * v);
          this.chiado(0.4, 0.14 * v, 'bandpass', 300, 1400);
          break;
        case 'porta_arena':
          this.chiado(0.6, 0.45 * v, 'lowpass', 800, 40);
          this.tom('sine', 70, 30, 0.7, 0.35 * v);
          break;
        case 'npc':
          for (let i = 0; i < 3; i++) this.tom('square', 500 + Math.random() * 250, 500 + Math.random() * 250, 0.05, 0.05 * v, i * 0.06);
          break;
        case 'placa':
          this.tom('square', 330, 330, 0.06, 0.06 * v);
          this.tom('square', 440, 440, 0.08, 0.06 * v, 0.06);
          break;
        case 'placa_solta':
          this.tom('square', 440, 440, 0.06, 0.05 * v);
          this.tom('square', 300, 300, 0.08, 0.05 * v, 0.06);
          break;
        case 'boss_entrada':
          this.chiado(0.8, 0.5 * v, 'lowpass', 1200, 50);
          this.tom('sine', 80, 30, 0.8, 0.4 * v);
          this.arpejo('sawtooth', [147, 110, 98], 0.2, 0.5, 0.09 * v);
          break;
        case 'boss_aviso':
          this.tom('sawtooth', 200, 420, 0.25, 0.08 * v);
          break;
        case 'boss_onda':
          this.chiado(0.55, 0.3 * v, 'bandpass', 400, 1800);
          this.tom('sine', 150, 300, 0.4, 0.08 * v);
          break;
        case 'boss_salto':
          this.tom('sine', 120, 260, 0.5, 0.1 * v);
          this.chiado(0.3, 0.1 * v, 'bandpass', 600, 1500);
          break;
        case 'boss_choque':
          this.chiado(0.5, 0.45 * v, 'lowpass', 1200, 50);
          this.tom('sine', 80, 30, 0.5, 0.35 * v);
          break;
        case 'boss_penas':
          this.chiado(0.6, 0.15 * v, 'highpass', 2000, 5000);
          break;
        case 'pena_impacto':
          this.tom('triangle', 1400, 300, 0.1, 0.1 * v);
          this.chiado(0.06, 0.1 * v, 'highpass', 3000, 1500);
          break;
        case 'boss_tonto':
          this.arpejo('sine', [1568, 1976, 2349], 0.12, 0.2, 0.06 * v);
          break;
        case 'pisao':
          this.tom('square', 200, 900, 0.12, 0.14 * v);
          this.chiado(0.1, 0.18 * v, 'highpass', 2500, 1000);
          this.tom('sine', 80, 40, 0.2, 0.25 * v);
          break;
        case 'boss_derrotado':
          this.tom('triangle', 440, 50, 1.4, 0.18 * v);
          this.chiado(1.2, 0.18 * v, 'lowpass', 2000, 80);
          break;
        case 'trovao':
          this.chiado(1.3, 0.45 * v, 'lowpass', 500, 60, 0.2);
          this.tom('sine', 60, 30, 1.1, 0.28 * v, 0.2);
          break;
        case 'desligar':
          this.tom('sawtooth', 300, 30, 1.2, 0.18 * v);
          this.chiado(1.0, 0.15 * v, 'lowpass', 1500, 100);
          break;
        case 'portal':
          this.arpejo('sine', [392, 523, 659, 784, 1046], 0.13, 0.4, 0.08 * v);
          break;
        case 'vitoria':
          this.arpejo('square', [523, 523, 523, 659, 784, 1046], 0.13, 0.16, 0.08 * v);
          break;
        case 'mudo':
          this.tom('square', 700, 700, 0.06, 0.07 * v);
          break;
        case 'tecla':
          this.tom('square', 1800 + Math.random() * 600, 1500, 0.02, 0.03 * v);
          this.chiado(0.02, 0.04 * v, 'highpass', 4000, 3000);
          break;
        case 'enviar':
          this.tom('square', 700, 1100, 0.06, 0.07 * v);
          break;
        case 'prompt':
          this.tom('sine', 1320, 1320, 0.08, 0.06 * v);
          this.tom('sine', 1760, 1760, 0.12, 0.05 * v, 0.06);
          break;
        case 'planar_inicio':
          this.chiado(0.35, 0.12 * v, 'bandpass', 600, 1800);
          this.tom('sine', 300, 500, 0.25, 0.04 * v);
          break;
        case 'coluna_entrar':
          this.chiado(0.5, 0.16 * v, 'bandpass', 400, 2400);
          this.tom('sine', 220, 660, 0.4, 0.05 * v);
          break;
        case 'scanner':
          this.tom('sine', 1100, 1500, 0.09, 0.05 * v);
          this.tom('sine', 1500, 1100, 0.09, 0.03 * v, 0.1);
          break;
        case 'renascer':
          this.arpejo('sine', [659, 988, 1319], 0.07, 0.25, 0.07 * v);
          this.chiado(0.4, 0.06 * v, 'highpass', 3000, 6000);
          break;
        case 'dialogo_abrir':
          this.tom('square', 500, 750, 0.06, 0.06 * v);
          this.tom('square', 750, 1000, 0.06, 0.05 * v, 0.06);
          break;
        case 'dialogo_avancar':
          this.tom('square', 900, 1200, 0.04, 0.05 * v);
          break;
        case 'helio_fala':
          // Risadinha de deboche descendo
          [520, 470, 420, 380].forEach((f, i) => this.tom('sawtooth', f, f * 0.85, 0.07, 0.07 * v, i * 0.08));
          break;
      }
    } catch {
      // Áudio indisponível: segue sem som
    }
  }

  // ---------------------------------------------------------------------------
  // Laços contínuos de vento e chuva
  // ---------------------------------------------------------------------------

  private criarLaco(tipo: BiquadFilterType, freq: number, volume: number, lfoHz: number, lfoProfundidade: number): Laco | null {
    const ctx = this.contexto;
    if (!ctx || !this.saida || !this.ruido) return null;
    const fonte = ctx.createBufferSource();
    fonte.buffer = this.ruido;
    fonte.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = tipo;
    filtro.frequency.value = freq;
    const ganho = ctx.createGain();
    ganho.gain.value = 0;
    // Ondulação lenta do volume: o vento sopra em rajadas, não em linha reta
    const lfo = ctx.createOscillator();
    lfo.frequency.value = lfoHz;
    const profundidade = ctx.createGain();
    profundidade.gain.value = lfoProfundidade;
    const ondulado = ctx.createGain();
    ondulado.gain.value = 1;
    lfo.connect(profundidade).connect(ondulado.gain);
    lfo.start();
    fonte.connect(filtro).connect(ganho).connect(ondulado).connect(this.saida);
    fonte.start();
    return { fonte, ganho, volume };
  }

  private iniciarLacos(): void {
    try {
      this.lacos.base = this.criarLaco('lowpass', 520, 1, 0.11, 0.35);
      this.lacos.planeio = this.criarLaco('bandpass', 1300, 1, 0.5, 0.15);
      this.lacos.coluna = this.criarLaco('bandpass', 750, 1, 1.6, 0.2);
      this.lacos.zona = this.criarLaco('bandpass', 480, 1, 0.3, 0.4);
      this.lacos.chuva = this.criarLaco('highpass', 3200, 1, 0.2, 0.1);
    } catch {
      // Áudio indisponível
    }
  }

  public destruir(): void {
    document.removeEventListener('keydown', this.retomarContexto);
    document.removeEventListener('pointerdown', this.retomarContexto);
    this.cena.events.off(EVENTO_SOM_FASE1, this.aoEvento, this);
    this.cena.events.off(EVENTO_ESTADO_SOM_FASE1, this.aoEstado, this);
    for (const laco of Object.values(this.lacos)) {
      if (!laco) continue;
      try {
        laco.fonte.stop();
        laco.fonte.disconnect();
        laco.ganho.disconnect();
      } catch {
        // Fonte já parada
      }
    }
    try {
      this.saida?.disconnect();
    } catch {
      // Ignora
    }
  }
}
