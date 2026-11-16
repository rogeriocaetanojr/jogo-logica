import Phaser from 'phaser';
import { SOM_FASE_FINAL } from '../constantesFaseFinal';
import {
  EVENTO_LACO_FASE_FINAL,
  EVENTO_SOM_FASE_FINAL,
  type NomeLacoFaseFinal,
  type NomeSomFaseFinal,
} from './eventosSom';

const S = SOM_FASE_FINAL;

/** Frequência de uma nota em semitons a partir do lá 440. */
const nota = (semitons: number): number => 440 * Math.pow(2, semitons / 12);
const aleatorio = (min: number, max: number): number => min + Math.random() * (max - min);

interface Laco {
  ganho: GainNode;
  fontes: AudioScheduledSourceNode[];
  /** Volume pedido pela cena (0 a 1); o real anda até ele aos poucos. */
  alvo: number;
}

/** Timbre de cada falante: um bipe curto por sílaba enquanto o texto aparece. */
interface Voz {
  frequencia: number;
  forma: OscillatorType;
  /** Variação de altura entre sílabas (0 a 1). */
  variacao: number;
}

const VOZES: Array<{ trecho: string; voz: Voz }> = [
  { trecho: 'MEGA BRAIN', voz: { frequencia: 98, forma: 'sawtooth', variacao: 0.12 } },
  { trecho: 'SERÁFICO', voz: { frequencia: 82, forma: 'sawtooth', variacao: 0.1 } },
  { trecho: 'COPYCAT', voz: { frequencia: 130, forma: 'sawtooth', variacao: 0.2 } },
  { trecho: 'TITÃ', voz: { frequencia: 73, forma: 'sawtooth', variacao: 0.1 } },
  { trecho: 'ÁGUIA', voz: { frequencia: 165, forma: 'sawtooth', variacao: 0.3 } },
  { trecho: 'CAVEIRA', voz: { frequencia: 87, forma: 'sawtooth', variacao: 0.15 } },
  { trecho: 'VALDIR', voz: { frequencia: 150, forma: 'triangle', variacao: 0.15 } },
  { trecho: 'ALVARES', voz: { frequencia: 240, forma: 'square', variacao: 0.25 } },
  { trecho: 'REIS', voz: { frequencia: 185, forma: 'square', variacao: 0.18 } },
  { trecho: 'JURÍDICO', voz: { frequencia: 520, forma: 'sine', variacao: 0.05 } },
];
const VOZ_PADRAO: Voz = { frequencia: 300, forma: 'square', variacao: 0.3 };
const GANHO_VOZ = 2.4;
/** As vozes robóticas (dente de serra) somem atrás da trilha: ganho extra. */
const GANHO_VOZ_ROBO = 2.6;

/**
 * Mixagem: ganho de cada som, calibrado medindo o pico na saída (analisador no destino do
 * Phaser). Deixa a interface por volta de 0,1, os ataques entre 0,15 e 0,35 e os impactos
 * grandes por volta de 0,6 a 0,7, sempre audíveis por cima da trilha e sem estourar.
 */
const MIXAGEM: Partial<Record<NomeSomFaseFinal, number>> = {
  // Interface
  prompt: 4, dialogo_abrir: 3.5, dialogo_avancar: 4, tecla: 4, enviar: 4, terminal_info: 4,
  notificacao: 3, mudo: 4, terminal_abrir: 2.2, terminal_acerto: 3, checkpoint: 4, atualizacao: 4,
  clique: 1.4, terminal_erro: 0.7,
  // Jogador
  pulo: 2, aterrissar: 1.6, quique: 2.5, queda_buraco: 2.4, dano: 0.35, morte: 1.6, queimar: 1.6,
  // Andares e inimigos
  elevador_porta: 2, elevador_ding: 1.4, elevador_travado: 0.42, elevador_partida: 1.5,
  porta_torre: 2, pan_whoosh: 2.5, ponte_cai: 2, liberar: 1.9, banner_andar: 0.6,
  torreta_mira: 4, torreta_tiro: 2.3, drone_alerta: 4.5, drone_mergulho: 2.7, drone_tchau: 2.6,
  alucinacao_some: 3.5, alucinacao_volta: 3.5, drone_pouso: 1.2,
  // Boss: geral e transições
  boss_fala: 5, boss_aviso: 4.5, boss_quique: 2, boss_golpe: 0.8, boss_derrotado: 1.1,
  glitch: 6, pixels_juntam: 6, holograma: 3, queda_longa: 2.7, soco: 0.55,
  explosao: 0.33, chao_quebra: 0.6, chao_racha: 2.2, pouso_pesado: 1.3, trovao: 0.5,
  // Copycat
  vapor_aviso: 1.21, vapor_jato: 1.49, copycat_arremessado: 1.65, atordoado: 5,
  // Titã
  tita_preparo: 1.65, tita_investida: 0.44, tita_parede: 0.39, tita_mira: 2.75, tita_tiro: 0.41,
  tita_salto: 1.32, tita_pisao: 0.34, tita_travado: 0.66,
  // Águia
  aguia_asa: 1.38, aguia_pena: 1.1, aguia_rasante: 1.65, aguia_mergulho: 2.48, aguia_impacto: 0.44,
  aguia_grito: 0.77,
  // Caveira
  braco_aviso: 2.75, laser_carga: 2.75, laser_disparo: 0.5, canhao_tiro: 0.77, garra_trava: 1.1,
  garra_impacto: 0.41, caveira_gira: 3.3, caveira_pouso: 0.39, caveira_sobe: 1.93, serra_pousa: 0.77,
  // Cérebro, rebase e final
  leque_aviso: 2.48, leque_onda: 0.72, chuva_aviso: 0.72, anel_lanca: 1.93, olho_abrindo: 1.93,
  olho_ferido: 1.3, rebase_terminal: 3, rebase_pick: 4.5, rebase_errado: 1.4, rebase_certo: 1.1,
  placa_drop: 1.2, plataforma_cai: 3, splash_lava: 0.85, joinha_sobe: 3.5, joinha_brilho: 4.3,
  joinha_afunda: 3.5, fade_branco: 2.7, passarinho: 4.5, ponto_bip: 4.5,
};

/**
 * Efeitos sonoros da Fase Final, todos sintetizados na hora com Web Audio (sem arquivos):
 * golpes, explosões, vapor, laser, serra, grito da águia, lava, chuva, elevador, terminal e a
 * voz dos personagens nos diálogos. Cada som vai para o lado da tela onde acontece e os
 * impactos grandes ganham um pouco de eco de sala. A trilha fica em TrilhaFaseFinal.
 *
 * Usa o contexto de áudio do Phaser, então segue o mudo do jogo ([M]). Tudo fica dentro de
 * try/catch: sem áudio, o jogo segue normal.
 */
export class SomFaseFinal {
  private readonly cena: Phaser.Scene;
  private readonly terminalAberto: () => boolean;
  private readonly ctx: AudioContext | null;
  private readonly saida: GainNode | null = null;
  private readonly reverb: ConvolverNode | null = null;
  private readonly ruidoBranco: AudioBuffer | null = null;
  private readonly ruidoMarrom: AudioBuffer | null = null;
  private readonly curvaSuja: Float32Array<ArrayBuffer> | null = null;
  private readonly lacos = new Map<NomeLacoFaseFinal, Laco>();
  /** Destino da receita em execução (ganho do som + pan) e o envio para o eco. */
  private bus: AudioNode | null = null;
  private envio: GainNode | null = null;
  private proximaBolhaMs: number = 0;
  private destruido: boolean = false;

  // Voz nos diálogos
  private dialogoAntes: boolean = false;
  private textoAntes: string = '';
  private falanteAntes: string = '';
  private letrasDesdeBipe: number = 0;

  constructor(cena: Phaser.Scene, terminalAberto: () => boolean) {
    this.cena = cena;
    this.terminalAberto = terminalAberto;
    const gerenciador = cena.sound as Phaser.Sound.WebAudioSoundManager;
    this.ctx = gerenciador && 'context' in gerenciador ? gerenciador.context : null;
    if (this.ctx) {
      try {
        const ctx = this.ctx;
        this.saida = ctx.createGain();
        this.saida.gain.value = S.VOLUME_EFEITOS;
        const limitador = ctx.createDynamicsCompressor();
        limitador.threshold.value = -9;
        limitador.knee.value = 6;
        limitador.ratio.value = 12;
        limitador.attack.value = 0.002;
        limitador.release.value = 0.2;
        this.saida.connect(limitador).connect(gerenciador.destination ?? ctx.destination);
        this.ruidoBranco = this.criarRuido(2, false);
        this.ruidoMarrom = this.criarRuido(3, true);
        this.reverb = ctx.createConvolver();
        this.reverb.buffer = this.criarSala(1.6);
        this.reverb.connect(this.saida);
        this.curvaSuja = criarCurvaDistorcao(18);
      } catch {
        this.saida = null;
      }
    }
    cena.events.on(EVENTO_SOM_FASE_FINAL, this.aoEvento, this);
    cena.events.on(EVENTO_LACO_FASE_FINAL, this.aoLaco, this);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
    document.addEventListener('keydown', this.aoTeclar, true);
    // O navegador começa o áudio suspenso até um gesto: retoma no primeiro que vier
    this.retomar();
    document.addEventListener('keydown', this.retomar);
    document.addEventListener('pointerdown', this.retomar);
  }

  private retomar = (): void => {
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === 'running') {
      document.removeEventListener('keydown', this.retomar);
      document.removeEventListener('pointerdown', this.retomar);
      return;
    }
    ctx.resume().catch(() => {});
  };

  private get pronto(): boolean {
    return !this.destruido && !!this.ctx && !!this.saida && this.ctx.state === 'running';
  }

  /* =========================================================================
   * ENTRADAS
   * ========================================================================= */

  private aoEvento(nome: NomeSomFaseFinal, x?: number, intensidade: number = 1): void {
    if (!this.pronto) return;
    let volume = intensidade;
    let pan = 0;
    if (x !== undefined) {
      const cam = this.cena.cameras.main;
      const dx = x - cam.worldView.centerX;
      pan = Phaser.Math.Clamp(dx / (cam.width / 2), -1, 1) * S.PAN_MAX;
      volume *= Phaser.Math.Clamp(1 - Math.max(0, Math.abs(dx) - cam.width / 2) / S.ALCANCE_PX, 0, 1);
    }
    if (volume < 0.03) return;
    this.tocar(nome, volume, pan);
  }

  private aoLaco(nome: NomeLacoFaseFinal, volume: number): void {
    if (this.destruido || !this.ctx || !this.saida) return;
    try {
      let laco = this.lacos.get(nome);
      if (!laco) {
        if (volume <= 0) return;
        laco = this.criarLaco(nome);
        this.lacos.set(nome, laco);
      }
      laco.alvo = Math.max(0, volume);
      laco.ganho.gain.setTargetAtTime(laco.alvo * (S.LACOS[nome] ?? 0.2), this.ctx.currentTime, 0.15);
    } catch {
      // Áudio indisponível
    }
  }

  /** Clique do teclado enquanto o jogador digita no terminal; Enter tem som de envio. */
  private aoTeclar = (e: KeyboardEvent): void => {
    if (!this.terminalAberto() || !this.pronto) return;
    if (e.key === 'Enter') this.tocar('enviar', 1, 0);
    else if (e.key.length === 1 || e.key === 'Backspace') this.tocar('tecla', 1, 0);
  };

  /**
   * Voz de quem fala nos diálogos: um bipe curto a cada poucas letras, no timbre do falante.
   * Chamar a cada quadro.
   */
  public atualizar(delta: number, dialogoAtivo: boolean): void {
    if (dialogoAtivo && !this.dialogoAntes) this.aoEvento('dialogo_abrir');
    this.dialogoAntes = dialogoAtivo;
    if (dialogoAtivo) {
      const texto = document.getElementById('dialog-text')?.textContent ?? '';
      const falante = document.getElementById('dialog-speaker')?.textContent ?? '';
      if (falante !== this.falanteAntes || !texto.startsWith(this.textoAntes)) {
        if (this.textoAntes) this.aoEvento('dialogo_avancar');
        this.textoAntes = '';
        this.letrasDesdeBipe = S.LETRAS_POR_BIPE;
      }
      const novas = texto.slice(this.textoAntes.length).replace(/\s/g, '').length;
      this.letrasDesdeBipe += novas;
      // Um bipe por quadro no máximo: pular o texto não vira rajada
      if (novas > 0 && novas < 12 && this.letrasDesdeBipe >= S.LETRAS_POR_BIPE) {
        this.letrasDesdeBipe = 0;
        this.voz(falante);
      }
      this.textoAntes = texto;
      this.falanteAntes = falante;
    } else {
      this.textoAntes = '';
      this.falanteAntes = '';
    }

    // Bolhas da lava estourando de vez em quando, espalhadas pela tela
    const lava = this.lacos.get('lava');
    if (lava && lava.alvo > 0 && this.pronto) {
      this.proximaBolhaMs -= delta;
      if (this.proximaBolhaMs <= 0) {
        this.proximaBolhaMs = aleatorio(180, 650);
        this.comBus(lava.alvo * 0.6, aleatorio(-0.7, 0.7), () => {
          const f = aleatorio(140, 320);
          this.tom('sine', f, f * aleatorio(2.2, 3.4), 0.07, 0.22);
          if (Math.random() < 0.4) this.chiado(0.12, 0.05, 'lowpass', 900, 300);
        });
      }
    }
  }

  private voz(falante: string): void {
    if (!this.pronto) return;
    const v = VOZES.find((x) => falante.toUpperCase().includes(x.trecho))?.voz ?? VOZ_PADRAO;
    this.comBus(GANHO_VOZ * (v.forma === 'sawtooth' ? GANHO_VOZ_ROBO : 1), 0, () => {
      const f = v.frequencia * (1 + aleatorio(-v.variacao, v.variacao));
      this.tom(v.forma, f, f * 0.9, 0.05, v.forma === 'sawtooth' ? 0.085 : 0.07);
      // Robôs falam com um zumbido metálico por cima
      if (v.forma === 'sawtooth') this.tom('square', f * 2.01, f * 1.8, 0.04, 0.02);
    });
  }

  /* =========================================================================
   * INFRAESTRUTURA
   * ========================================================================= */

  private criarRuido(segundos: number, marrom: boolean): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * segundos), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < d.length; i++) {
      const branco = Math.random() * 2 - 1;
      if (marrom) {
        ultimo = (ultimo + 0.02 * branco) / 1.02;
        d[i] = ultimo * 3.5;
      } else d[i] = branco;
    }
    return buf;
  }

  /** Resposta de impulso de uma sala de concreto (ruído que decai), para o eco dos impactos. */
  private criarSala(segundos: number): AudioBuffer {
    const ctx = this.ctx!;
    const n = Math.floor(ctx.sampleRate * segundos);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    }
    return buf;
  }

  /** Monta o destino de um som (volume + pan + envio de eco) e roda a receita nele. */
  private comBus(volume: number, pan: number, receita: () => void): void {
    const ctx = this.ctx;
    if (!ctx || !this.saida) return;
    try {
      const g = ctx.createGain();
      g.gain.value = volume;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p).connect(this.saida);
      const envio = ctx.createGain();
      envio.gain.value = 0;
      p.connect(envio);
      if (this.reverb) envio.connect(this.reverb);
      this.bus = g;
      this.envio = envio;
      receita();
    } catch {
      // Áudio indisponível
    } finally {
      this.bus = null;
      this.envio = null;
    }
  }

  private tocar(nome: NomeSomFaseFinal, volume: number, pan: number): void {
    this.comBus(volume * (MIXAGEM[nome] ?? 1), pan, () => this.receita(nome));
  }

  /** Quanto do som atual vai para o eco de sala (0 a 1). */
  private eco(quantidade: number): void {
    if (this.envio) this.envio.gain.value = quantidade;
  }

  /** Distorção (para golpes, rugidos e explosões com "crocância"). */
  private sujo(): AudioNode {
    const ctx = this.ctx!;
    const w = ctx.createWaveShaper();
    w.curve = this.curvaSuja;
    w.oversample = '2x';
    w.connect(this.bus!);
    return w;
  }

  private agora(atraso: number): number {
    return this.ctx!.currentTime + atraso;
  }

  /** Oscilador com envelope rápido e glissando exponencial. */
  private tom(
    tipo: OscillatorType,
    f0: number,
    f1: number,
    duracao: number,
    volume: number,
    atraso = 0,
    saida: AudioNode | null = null,
    ataque = 0.005
  ): OscillatorNode {
    const ctx = this.ctx!;
    const t = this.agora(atraso);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + duracao);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    o.connect(g).connect(saida ?? this.bus!);
    o.start(t);
    o.stop(t + duracao + 0.05);
    return o;
  }

  /** Ruído filtrado com varredura do filtro. */
  private chiado(
    duracao: number,
    volume: number,
    filtro: BiquadFilterType,
    f0: number,
    f1 = f0,
    atraso = 0,
    q = 1,
    marrom = false,
    ataque = 0.008,
    saida: AudioNode | null = null
  ): void {
    const ctx = this.ctx!;
    const t = this.agora(atraso);
    const fonte = ctx.createBufferSource();
    fonte.buffer = marrom ? this.ruidoMarrom : this.ruidoBranco;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(30, f0), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + duracao);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    fonte.connect(f).connect(g).connect(saida ?? this.bus!);
    fonte.start(t, Math.random() * 1.2);
    fonte.stop(t + duracao + 0.05);
  }

  /** Baque grave: seno que despenca (bumbo) com um estalo de ataque. */
  private baque(volume: number, f0 = 150, f1 = 40, duracao = 0.3, atraso = 0): void {
    this.tom('sine', f0, f1, duracao, volume, atraso);
    this.tom('triangle', f0 * 2, f1, duracao * 0.4, volume * 0.4, atraso);
    this.chiado(0.02, volume * 0.5, 'highpass', 2500, 2500, atraso);
  }

  /** Pancada metálica: parciais inarmônicas que decaem (sino, chapa, garra). */
  private metal(f: number, duracao: number, volume: number, atraso = 0): void {
    const parciais = [1, 2.76, 5.4, 8.93];
    parciais.forEach((p, i) => this.tom('sine', f * p, f * p * 0.995, duracao / (1 + i * 0.6), volume / (1 + i * 1.2), atraso, null, 0.002));
  }

  /** Síntese FM: portadora com glissando e modulador proporcional (gritos, rosnados, boing). */
  private fm(f0: number, f1: number, razao: number, indice: number, duracao: number, volume: number, atraso = 0, tipo: OscillatorType = 'sine'): void {
    const ctx = this.ctx!;
    const t = this.agora(atraso);
    const port = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const prof = ctx.createGain();
    const g = ctx.createGain();
    port.type = tipo;
    port.frequency.setValueAtTime(f0, t);
    port.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + duracao);
    mod.frequency.setValueAtTime(f0 * razao, t);
    mod.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * razao), t + duracao);
    prof.gain.setValueAtTime(f0 * indice, t);
    prof.gain.exponentialRampToValueAtTime(Math.max(1, f1 * indice * 0.5), t + duracao);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + 0.01);
    g.gain.setValueAtTime(volume, t + duracao * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    mod.connect(prof).connect(port.frequency);
    port.connect(g).connect(this.bus!);
    port.start(t);
    mod.start(t);
    port.stop(t + duracao + 0.05);
    mod.stop(t + duracao + 0.05);
  }

  private arpejo(freqs: number[], passo: number, tipo: OscillatorType, volume: number, durNota: number, atraso = 0): void {
    freqs.forEach((f, i) => this.tom(tipo, f, f, durNota, volume, atraso + i * passo));
  }

  /** Explosão: estalo, estrondo grave e rabo de ruído marrom com distorção e eco. */
  private explosao(forca: number): void {
    this.eco(0.35);
    const sujo = this.sujo();
    this.chiado(0.12, 0.5 * forca, 'highpass', 1800, 900);
    this.chiado(0.9 + forca * 0.5, 0.75 * forca, 'lowpass', 2600, 120, 0, 0.7, true, 0.005, sujo);
    this.baque(0.9 * forca, 110, 28, 0.6 + forca * 0.2);
    this.chiado(0.5, 0.25 * forca, 'bandpass', 600, 180, 0.04, 0.8);
  }

  /* =========================================================================
   * RECEITAS
   * ========================================================================= */

  private receita(nome: NomeSomFaseFinal): void {
    switch (nome) {
      /* ---------------- Jogador e combate ---------------- */
      case 'pulo':
        this.tom('square', 280, 620, 0.1, 0.07);
        this.tom('triangle', 140, 310, 0.1, 0.08);
        this.chiado(0.05, 0.03, 'highpass', 3000);
        break;
      case 'aterrissar':
        this.chiado(0.09, 0.12, 'lowpass', 700, 200, 0, 0.7, true);
        this.tom('sine', 120, 50, 0.09, 0.2);
        break;
      case 'pisao':
        this.tom('square', 560, 110, 0.14, 0.13);
        this.baque(0.4, 170, 55, 0.16);
        this.chiado(0.06, 0.15, 'bandpass', 1400, 600, 0, 2);
        break;
      case 'quique':
        this.fm(260, 820, 0.5, 1.2, 0.16, 0.14, 0, 'triangle');
        break;
      case 'dano':
        this.eco(0.15);
        this.tom('square', 460, 110, 0.26, 0.12, 0, this.sujo());
        this.tom('sawtooth', 230, 80, 0.3, 0.08);
        this.chiado(0.14, 0.2, 'bandpass', 2200, 700, 0, 1.5);
        this.baque(0.35, 140, 50, 0.18);
        break;
      case 'queimar':
        this.chiado(0.7, 0.28, 'highpass', 2500, 6000, 0, 0.7, false, 0.01);
        this.chiado(0.4, 0.18, 'bandpass', 900, 400, 0, 1.2, true);
        this.tom('sawtooth', 380, 90, 0.35, 0.09);
        this.fm(700, 200, 3.1, 2, 0.3, 0.06, 0.05);
        break;
      case 'morte':
        this.eco(0.25);
        this.arpejo([nota(3), nota(0), nota(-4), nota(-9), nota(-14)], 0.11, 'square', 0.09, 0.14);
        this.tom('triangle', 220, 55, 0.7, 0.14, 0.05);
        this.baque(0.4, 120, 35, 0.4, 0.55);
        break;
      case 'queda_buraco':
        this.tom('sine', 1300, 160, 0.75, 0.12);
        this.tom('square', 650, 80, 0.75, 0.03);
        break;
      case 'checkpoint':
        this.eco(0.2);
        this.arpejo([nota(3), nota(7), nota(10), nota(15)], 0.07, 'square', 0.07, 0.12);
        this.arpejo([nota(15), nota(19)], 0.09, 'triangle', 0.08, 0.3, 0.28);
        break;

      /* ---------------- Interface ---------------- */
      case 'prompt':
        this.tom('sine', 1320, 1760, 0.06, 0.07);
        this.tom('sine', 2640, 2640, 0.08, 0.03, 0.05);
        break;
      case 'dialogo_abrir':
        this.tom('square', 880, 880, 0.04, 0.05);
        this.tom('square', 1320, 1320, 0.06, 0.05, 0.05);
        this.chiado(0.08, 0.03, 'highpass', 5000);
        break;
      case 'dialogo_avancar':
        this.tom('square', 700, 980, 0.04, 0.04);
        break;
      case 'tecla':
        this.chiado(0.025, 0.08, 'bandpass', aleatorio(2500, 3800), 2000, 0, 3);
        this.tom('square', aleatorio(1500, 2100), 1400, 0.015, 0.02);
        break;
      case 'enviar':
        this.chiado(0.03, 0.1, 'bandpass', 2000, 1500, 0, 2);
        this.tom('square', 880, 1320, 0.06, 0.05, 0.02);
        this.tom('square', 1760, 1760, 0.05, 0.04, 0.08);
        break;
      case 'terminal_abrir':
        this.chiado(0.18, 0.06, 'highpass', 6000, 3000);
        this.tom('sine', 180, 900, 0.14, 0.08);
        this.tom('square', 1200, 1200, 0.03, 0.04, 0.16);
        this.tom('square', 1600, 1600, 0.05, 0.04, 0.21);
        break;
      case 'terminal_erro':
        this.tom('square', 220, 220, 0.12, 0.08, 0, this.sujo());
        this.tom('square', 165, 165, 0.22, 0.08, 0.14, this.sujo());
        break;
      case 'terminal_acerto':
        this.eco(0.2);
        this.arpejo([nota(10), nota(14), nota(17), nota(22)], 0.07, 'square', 0.06, 0.14);
        this.arpejo([nota(22), nota(26), nota(29)], 0, 'triangle', 0.05, 0.6, 0.3);
        break;
      case 'terminal_info':
        this.tom('sine', 1000, 1000, 0.05, 0.05);
        this.tom('sine', 1500, 1500, 0.07, 0.04, 0.06);
        break;
      case 'notificacao':
        this.tom('triangle', 1046, 1046, 0.1, 0.07);
        this.tom('triangle', 1568, 1568, 0.18, 0.06, 0.08);
        break;
      case 'mudo':
        this.tom('square', 660, 880, 0.06, 0.06);
        break;

      /* ---------------- Exterior ---------------- */
      case 'trovao':
        this.eco(0.5);
        this.chiado(0.18, 0.45, 'highpass', 2500, 1200, 0, 0.7, false, 0.003);
        this.chiado(2.8, 0.7, 'lowpass', 1400, 90, 0.05, 0.6, true, 0.02, this.sujo());
        this.tom('sine', 70, 32, 2.2, 0.35, 0.1, null, 0.05);
        this.chiado(1.6, 0.25, 'lowpass', 600, 120, 0.7, 0.6, true, 0.2);
        break;
      case 'porta_torre':
        this.eco(0.4);
        this.chiado(0.5, 0.25, 'highpass', 3000, 1500, 0, 0.8, false, 0.01);
        this.tom('sawtooth', 45, 70, 1.4, 0.18, 0.1, null, 0.2);
        this.chiado(1.4, 0.3, 'lowpass', 500, 200, 0.1, 0.8, true, 0.1);
        this.metal(140, 0.9, 0.2, 1.4);
        this.baque(0.4, 90, 35, 0.5, 1.4);
        break;
      case 'pan_whoosh':
        this.chiado(1.8, 0.14, 'bandpass', 300, 2400, 0, 1.5, false, 0.9);
        this.tom('sine', 60, 110, 1.8, 0.12, 0, null, 0.9);
        break;

      /* ---------------- Andares ---------------- */
      case 'elevador_ding':
        this.eco(0.3);
        this.metal(1318, 1.1, 0.14);
        this.tom('sine', 1318, 1318, 0.9, 0.1);
        this.metal(1046, 1.4, 0.14, 0.32);
        this.tom('sine', 1046, 1046, 1.2, 0.1, 0.32);
        break;
      case 'elevador_porta':
        this.chiado(0.7, 0.12, 'lowpass', 900, 500, 0, 0.8, true, 0.1);
        this.tom('sine', 380, 460, 0.6, 0.04, 0, null, 0.1);
        this.metal(300, 0.3, 0.08, 0.65);
        break;
      case 'elevador_travado':
        this.tom('square', 116, 116, 0.35, 0.07, 0, this.sujo());
        this.tom('square', 110, 110, 0.35, 0.07, 0, this.sujo());
        this.metal(500, 0.2, 0.06);
        break;
      case 'elevador_partida':
        this.baque(0.35, 90, 40, 0.3);
        this.metal(220, 0.4, 0.08);
        this.tom('sawtooth', 50, 120, 1.2, 0.08, 0.1, null, 0.3);
        break;
      case 'liberar':
        this.eco(0.25);
        this.metal(900, 0.15, 0.1);
        this.chiado(0.25, 0.1, 'highpass', 2000, 6000, 0.05);
        this.arpejo([nota(-2), nota(3), nota(7), nota(10)], 0.07, 'triangle', 0.1, 0.18, 0.08);
        this.tom('sine', 60, 40, 0.5, 0.2, 0.08);
        break;
      case 'catraca_erro':
        this.metal(320, 0.4, 0.18);
        this.baque(0.3, 160, 60, 0.2);
        this.tom('square', 150, 140, 0.3, 0.06, 0.1, this.sujo());
        break;
      case 'ponte_placa':
        this.metal(420, 0.25, 0.12);
        this.baque(0.25, 200, 80, 0.15);
        break;
      case 'ponte_cai':
        this.tom('sine', 900, 120, 0.8, 0.08);
        this.metal(260, 0.5, 0.14, 0.75);
        this.chiado(0.4, 0.2, 'lowpass', 1500, 200, 0.75, 0.7, true);
        break;
      case 'comporta_ok':
        this.chiado(0.4, 0.15, 'highpass', 2500, 1200, 0, 0.8);
        this.metal(200, 0.5, 0.14, 0.3);
        this.baque(0.3, 100, 40, 0.3, 0.3);
        break;
      case 'comporta_travada':
        this.metal(180, 0.3, 0.16);
        this.tom('square', 90, 85, 0.25, 0.08, 0.05, this.sujo());
        break;
      case 'drone_tchau':
        this.fm(700, 1300, 7, 0.6, 1.0, 0.06);
        this.arpejo([nota(15), nota(12)], 0.12, 'square', 0.05, 0.1, 0.2);
        break;
      case 'banner_andar': {
        this.eco(0.3);
        const sujo = this.sujo();
        for (const n of [-21, -14, -9]) this.tom('sawtooth', nota(n), nota(n), 0.6, 0.05, 0, sujo, 0.01);
        this.chiado(0.5, 0.06, 'bandpass', 600, 3000, 0, 2);
        break;
      }

      /* ---------------- Inimigos ---------------- */
      case 'drone_alerta':
        for (let i = 0; i < 2; i++) {
          this.tom('square', 1250, 1250, 0.07, 0.06, i * 0.2);
          this.tom('square', 940, 940, 0.07, 0.06, i * 0.2 + 0.09);
        }
        break;
      case 'drone_mergulho':
        this.tom('sine', 1600, 280, 0.45, 0.1);
        this.chiado(0.45, 0.08, 'bandpass', 800, 2500, 0, 1.5);
        break;
      case 'drone_pouso':
        this.baque(0.3, 130, 50, 0.2);
        this.metal(600, 0.2, 0.06);
        break;
      case 'torreta_mira':
        this.tom('sine', 500, 1800, 0.5, 0.06, 0, null, 0.3);
        this.tom('square', 1800, 1800, 0.04, 0.04, 0.48);
        break;
      case 'torreta_tiro':
        this.tom('square', 1500, 180, 0.16, 0.1);
        this.chiado(0.1, 0.15, 'bandpass', 3000, 800, 0, 1);
        break;
      case 'alucinacao_some':
        for (let i = 0; i < 4; i++) this.tom('square', aleatorio(300, 1800), aleatorio(200, 900), 0.03, 0.05, i * 0.035);
        this.chiado(0.25, 0.06, 'bandpass', 3000, 400, 0, 4);
        break;
      case 'alucinacao_volta':
        this.chiado(0.25, 0.06, 'bandpass', 400, 3000, 0, 4, false, 0.2);
        this.tom('sine', 200, 800, 0.25, 0.05, 0, null, 0.2);
        break;

      /* ---------------- Boss: geral ---------------- */
      case 'boss_golpe': {
        this.eco(0.4);
        const sujo = this.sujo();
        this.baque(0.9, 190, 38, 0.45);
        this.tom('square', 95, 50, 0.2, 0.18, 0, sujo);
        this.metal(240, 0.6, 0.18);
        this.chiado(0.3, 0.35, 'lowpass', 3000, 300, 0, 0.7, false, 0.003, sujo);
        this.tom('sine', 2200, 1800, 0.25, 0.05, 0.03);
        break;
      }
      case 'boss_quique':
        this.metal(520, 0.25, 0.12);
        this.fm(240, 600, 0.5, 1, 0.18, 0.1, 0, 'triangle');
        break;
      case 'boss_derrotado':
        this.eco(0.45);
        this.tom('sawtooth', 520, 38, 1.6, 0.14, 0, this.sujo());
        this.tom('square', 260, 30, 1.6, 0.06);
        for (let i = 0; i < 8; i++) this.chiado(0.04, 0.12, 'highpass', 3000, 3000, 0.1 + i * aleatorio(0.08, 0.16));
        this.metal(160, 1.2, 0.14, 0.2);
        break;
      case 'boss_aviso':
        this.tom('square', 988, 988, 0.08, 0.06);
        this.tom('square', 740, 740, 0.12, 0.06, 0.1);
        break;
      case 'boss_fala':
        for (let i = 0; i < 4; i++) this.tom('sawtooth', aleatorio(90, 160), aleatorio(80, 140), 0.06, 0.05, i * 0.07);
        break;
      case 'holograma':
        this.eco(0.35);
        this.fm(880, 1760, 3.01, 0.4, 1.6, 0.05);
        this.chiado(1.6, 0.05, 'highpass', 6000, 3000, 0, 0.7, false, 0.4);
        [0, 3, 7, 12, 15, 19, 24].forEach((n, i) => this.tom('sine', nota(n + 3), nota(n + 3), 0.3, 0.04, 0.12 + i * 0.16));
        break;
      case 'pixels_juntam':
        for (let i = 0; i < 26; i++) {
          const f = 300 * Math.pow(2, i / 7);
          this.tom('square', f, f, 0.025, 0.025, i * 0.045);
        }
        this.chiado(1.2, 0.05, 'bandpass', 500, 5000, 0, 3, false, 1);
        break;
      case 'glitch':
        for (let i = 0; i < 9; i++) {
          this.tom('square', aleatorio(80, 2400), aleatorio(80, 2400), 0.03, 0.05, i * 0.035);
          if (i % 3 === 0) this.chiado(0.03, 0.08, 'bandpass', aleatorio(800, 5000), 1000, i * 0.035, 6);
        }
        break;
      case 'recompilar':
        this.eco(0.3);
        this.arpejo([0, 4, 7, 12, 16, 19, 24].map((n) => nota(n - 9)), 0.05, 'square', 0.05, 0.08);
        this.tom('sawtooth', 110, 440, 0.4, 0.06, 0.35, this.sujo(), 0.05);
        for (const n of [-9, -5, -2, 3]) this.tom('triangle', nota(n + 12), nota(n + 12), 0.5, 0.04, 0.4);
        break;
      case 'soco':
        this.baque(0.6, 220, 60, 0.14);
        this.chiado(0.09, 0.35, 'lowpass', 3500, 600, 0, 0.7, false, 0.002);
        this.tom('square', aleatorio(140, 200), 70, 0.08, 0.1, 0, this.sujo());
        break;
      case 'explosao':
        this.explosao(1);
        break;
      case 'chao_racha':
        this.eco(0.3);
        for (let i = 0; i < 12; i++) this.chiado(0.03, aleatorio(0.1, 0.25), 'highpass', aleatorio(1500, 4000), 1200, aleatorio(0, 0.75), 1);
        this.fm(75, 55, 1.4, 2, 0.8, 0.12, 0, 'sawtooth');
        break;
      case 'chao_quebra':
        this.explosao(1.2);
        for (let i = 0; i < 6; i++) this.metal(aleatorio(180, 700), 0.3, 0.08, 0.1 + i * aleatorio(0.06, 0.12));
        break;
      case 'queda_longa':
        this.chiado(1.0, 0.25, 'bandpass', 2400, 300, 0, 1.2, false, 0.05);
        this.tom('sine', 900, 140, 1.0, 0.07);
        break;
      case 'pouso_pesado':
        this.eco(0.35);
        this.baque(0.9, 120, 30, 0.6);
        this.chiado(0.5, 0.35, 'lowpass', 1500, 150, 0, 0.7, true);
        this.metal(200, 0.5, 0.1, 0.02);
        break;

      /* ---------------- Copycat ---------------- */
      case 'vapor_aviso':
        this.chiado(0.9, 0.12, 'highpass', 2500, 4500, 0, 0.8, false, 0.8);
        for (let i = 0; i < 4; i++) this.chiado(0.05, 0.08, 'bandpass', 1500, 1500, 0.2 + i * 0.18, 2);
        this.tom('sine', 300, 320, 0.9, 0.03, 0, null, 0.5);
        break;
      case 'vapor_jato':
        this.eco(0.2);
        this.chiado(0.75, 0.38, 'bandpass', 1500, 2600, 0, 0.5, false, 0.015);
        this.chiado(0.75, 0.25, 'lowpass', 700, 300, 0, 0.7, true, 0.015);
        this.chiado(0.4, 0.15, 'highpass', 6000, 4000, 0.05);
        break;
      case 'copycat_arremessado':
        this.fm(300, 950, 0.5, 1.5, 0.35, 0.12, 0, 'triangle');
        this.tom('square', 900, 400, 0.2, 0.05, 0.05);
        this.chiado(0.3, 0.12, 'bandpass', 600, 2000, 0, 1.5);
        break;
      case 'atordoado':
        for (let i = 0; i < 6; i++) this.tom('sine', i % 2 ? 2400 : 1980, i % 2 ? 2600 : 2150, 0.07, 0.05, i * 0.09);
        break;

      /* ---------------- Titã ---------------- */
      case 'tita_preparo':
        this.tom('sawtooth', 70, 170, 0.6, 0.08, 0, null, 0.2);
        this.chiado(0.6, 0.08, 'highpass', 2000, 4000, 0, 1, false, 0.3);
        break;
      case 'tita_investida': {
        this.eco(0.2);
        const sujo = this.sujo();
        this.tom('sawtooth', 55, 75, 0.9, 0.18, 0, sujo, 0.05);
        this.tom('square', 110, 150, 0.9, 0.06, 0, sujo, 0.05);
        for (let i = 0; i < 5; i++) this.baque(0.4, 110, 40, 0.15, 0.08 + i * 0.16);
        break;
      }
      case 'tita_parede':
        this.explosao(0.9);
        this.metal(130, 1.0, 0.2);
        for (let i = 0; i < 5; i++) this.chiado(0.08, 0.1, 'lowpass', 1500, 400, 0.15 + i * 0.09, 1, true);
        break;
      case 'tita_mira':
        this.tom('sine', 600, 1700, 0.6, 0.06, 0, null, 0.4);
        for (let i = 0; i < 3; i++) this.tom('square', 1700, 1700, 0.03, 0.04, 0.35 + i * 0.09);
        break;
      case 'tita_tiro':
        this.eco(0.3);
        this.baque(0.75, 160, 38, 0.4);
        this.chiado(0.45, 0.4, 'lowpass', 3000, 200, 0, 0.7, false, 0.002, this.sujo());
        this.chiado(0.08, 0.3, 'highpass', 3000, 1500);
        break;
      case 'tita_salto':
        this.chiado(0.45, 0.2, 'lowpass', 400, 2000, 0, 1, true, 0.05);
        this.tom('sawtooth', 60, 220, 0.45, 0.08, 0, null, 0.05);
        this.chiado(0.3, 0.12, 'highpass', 3000, 5000);
        break;
      case 'tita_pisao':
        this.explosao(1.1);
        this.tom('sine', 55, 25, 1.2, 0.5);
        this.chiado(1.2, 0.2, 'bandpass', 400, 90, 0.1, 1.5, true, 0.05);
        break;
      case 'tita_travado':
        this.chiado(0.9, 0.18, 'highpass', 2200, 700, 0, 0.8, false, 0.02);
        this.tom('sawtooth', 220, 55, 0.7, 0.08, 0, this.sujo());
        for (let i = 0; i < 5; i++) this.chiado(0.03, 0.12, 'highpass', 4000, 4000, 0.2 + i * aleatorio(0.1, 0.2));
        break;

      /* ---------------- Águia ---------------- */
      case 'aguia_grito': {
        this.eco(0.45);
        const sujo = this.sujo();
        this.fm(1900, 950, 1.48, 2.2, 0.75, 0.12);
        this.tom('sawtooth', 2300, 1150, 0.7, 0.06, 0, sujo, 0.03);
        this.tom('sawtooth', 2310, 1170, 0.7, 0.04, 0.01, sujo, 0.03);
        this.chiado(0.6, 0.06, 'bandpass', 3500, 1800, 0, 3);
        break;
      }
      case 'aguia_asa':
        this.chiado(0.16, 0.14, 'lowpass', 1100, 250, 0, 0.8, true, 0.03);
        break;
      case 'aguia_pena':
        this.chiado(0.16, 0.1, 'highpass', 5000, 1800, 0, 1);
        this.metal(2400, 0.14, 0.04);
        break;
      case 'aguia_rasante':
        this.chiado(0.5, 0.3, 'bandpass', 400, 3000, 0, 1.2, false, 0.4);
        this.chiado(0.6, 0.3, 'bandpass', 3000, 300, 0.5, 1.2, false, 0.02);
        this.tom('sawtooth', 110, 90, 1.1, 0.07, 0, null, 0.3);
        break;
      case 'aguia_mergulho':
        this.tom('sine', 2600, 380, 0.6, 0.1);
        this.chiado(0.6, 0.15, 'bandpass', 1200, 3000, 0, 1.5, false, 0.3);
        break;
      case 'aguia_impacto':
        this.explosao(0.8);
        this.metal(950, 0.4, 0.1, 0.02);
        this.metal(1300, 0.35, 0.08, 0.05);
        break;

      /* ---------------- Caveira ---------------- */
      case 'braco_aviso':
        this.arpejo([nota(0), nota(7), nota(12)], 0.06, 'square', 0.06, 0.06);
        this.tom('sawtooth', 120, 240, 0.25, 0.04, 0, null, 0.1);
        break;
      case 'serra_pousa':
        this.metal(620, 0.4, 0.14);
        this.chiado(0.3, 0.2, 'highpass', 4000, 2500);
        this.baque(0.3, 150, 60, 0.2);
        break;
      case 'laser_carga':
        this.tom('sawtooth', 160, 1500, 1.0, 0.06, 0, null, 0.8);
        this.tom('sine', 320, 3000, 1.0, 0.05, 0, null, 0.8);
        break;
      case 'laser_disparo':
        this.eco(0.3);
        this.tom('square', 2000, 180, 0.25, 0.1, 0, this.sujo());
        this.chiado(0.3, 0.3, 'highpass', 2000, 800, 0, 0.7);
        this.baque(0.4, 90, 40, 0.3);
        break;
      case 'canhao_tiro':
        this.baque(0.5, 240, 70, 0.22);
        this.tom('sine', 420, 110, 0.2, 0.1);
        this.chiado(0.2, 0.2, 'lowpass', 1800, 300, 0, 0.7, true);
        this.tom('sine', 800, 1600, 0.6, 0.03, 0.2, null, 0.4); // assobio da bomba subindo
        break;
      case 'garra_trava':
        this.metal(1250, 0.12, 0.1);
        this.tom('square', 2200, 2200, 0.03, 0.05, 0.02);
        this.tom('sawtooth', 300, 120, 0.15, 0.05);
        break;
      case 'garra_impacto':
        this.eco(0.3);
        this.baque(0.8, 140, 35, 0.4);
        this.metal(310, 0.6, 0.16);
        this.chiado(0.35, 0.3, 'lowpass', 2500, 250, 0, 0.7, true, 0.003, this.sujo());
        break;
      case 'caveira_gira':
        this.fm(180, 900, 0.25, 3, 0.7, 0.06, 0, 'sawtooth');
        this.chiado(0.7, 0.12, 'bandpass', 600, 2400, 0, 2, false, 0.3);
        break;
      case 'caveira_pouso':
        this.explosao(0.9);
        this.metal(240, 0.8, 0.16, 0.02);
        break;
      case 'caveira_sobe':
        this.chiado(0.9, 0.18, 'bandpass', 700, 1600, 0, 1, false, 0.2);
        this.tom('sawtooth', 80, 170, 0.9, 0.06, 0, null, 0.2);
        break;

      /* ---------------- Cérebro e rebase ---------------- */
      case 'leque_aviso':
        // "HA-HA-HA": sílabas de risada robótica, com formante
        for (let i = 0; i < 4; i++) {
          this.fm(260 - i * 12, 210 - i * 12, 3.5, 0.8, 0.12, 0.1, i * 0.14, 'sawtooth');
          this.chiado(0.1, 0.05, 'bandpass', 1100, 900, i * 0.14, 4);
        }
        break;
      case 'leque_onda':
        for (let i = 0; i < 4; i++) this.tom('sine', 900 - i * 80, 220, 0.07, 0.08, i * 0.025);
        this.chiado(0.12, 0.12, 'bandpass', 1800, 600, 0, 1.2);
        this.baque(0.25, 200, 80, 0.12);
        break;
      case 'chuva_aviso': {
        this.eco(0.3);
        const sujo = this.sujo();
        this.fm(70, 55, 0.51, 3, 0.7, 0.14, 0, 'sawtooth');
        this.tom('square', 140, 110, 0.7, 0.05, 0, sujo, 0.08);
        break;
      }
      case 'anel_lanca':
        this.tom('sine', 300, 1100, 0.3, 0.06);
        this.chiado(0.3, 0.08, 'bandpass', 600, 3000, 0, 2);
        this.metal(1800, 0.25, 0.03);
        break;
      case 'olho_abrindo':
        this.chiado(0.4, 0.14, 'lowpass', 300, 1400, 0, 3, true, 0.05);
        this.fm(140, 320, 0.7, 2, 0.45, 0.08, 0, 'triangle');
        this.tom('sine', 2600, 2600, 0.2, 0.04, 0.4);
        break;
      case 'olho_ferido':
        this.eco(0.35);
        this.chiado(0.35, 0.3, 'lowpass', 1800, 200, 0, 1, true, 0.003);
        this.fm(950, 220, 1.5, 2.5, 0.5, 0.1, 0.02, 'sawtooth');
        this.baque(0.6, 160, 45, 0.3);
        break;
      case 'rebase_terminal':
        this.chiado(0.9, 0.15, 'lowpass', 400, 900, 0, 0.8, true, 0.2);
        this.tom('sawtooth', 50, 90, 0.9, 0.06, 0, null, 0.2);
        this.metal(400, 0.3, 0.08, 0.9);
        this.tom('sine', 200, 1000, 0.15, 0.06, 1.0);
        this.tom('square', 1500, 1500, 0.05, 0.04, 1.15);
        break;
      case 'rebase_errado': {
        // Trombone triste ("uá uá uá uááá")
        const notas = [nota(-6), nota(-7), nota(-8)];
        const sujo = this.sujo();
        notas.forEach((f, i) => this.tom('sawtooth', f, f * 0.97, 0.3, 0.05, i * 0.33, sujo, 0.04));
        this.fm(nota(-9), nota(-10), 0.008, 1, 0.9, 0.06, 1.0, 'sawtooth');
        break;
      }
      case 'rebase_pick':
        this.tom('triangle', nota(10), nota(10), 0.12, 0.08);
        this.tom('triangle', nota(15), nota(15), 0.3, 0.08, 0.1);
        this.chiado(0.25, 0.04, 'highpass', 3000, 7000, 0, 1, false, 0.2);
        break;
      case 'rebase_certo': {
        this.eco(0.4);
        this.baque(0.8, 160, 40, 0.5);
        this.metal(330, 0.8, 0.14);
        this.arpejo([nota(-2), nota(2), nota(5), nota(10), nota(14), nota(17)], 0.06, 'square', 0.06, 0.12, 0.1);
        for (const n of [10, 14, 17]) this.tom('sawtooth', nota(n - 12), nota(n - 12), 1.2, 0.035, 0.5, null, 0.05);
        break;
      }
      case 'placa_drop':
        for (let i = 0; i < 6; i++) {
          this.tom('square', 120, 118, 0.06, 0.06, i * 0.12, this.sujo());
          this.chiado(0.04, 0.1, 'highpass', 3500, 3500, i * 0.12 + 0.02);
        }
        break;
      case 'plataforma_cai':
        this.eco(0.45);
        this.chiado(2.2, 0.5, 'lowpass', 500, 120, 0, 0.7, true, 0.3);
        this.fm(90, 55, 1.33, 2.5, 1.5, 0.08, 0.1, 'sawtooth');
        for (let i = 0; i < 7; i++) this.metal(aleatorio(150, 500), 0.4, 0.09, 0.2 + i * aleatorio(0.15, 0.3));
        this.baque(0.7, 90, 30, 0.8, 1.2);
        break;
      case 'splash_lava':
        this.eco(0.45);
        this.chiado(1.6, 0.7, 'lowpass', 1400, 140, 0, 0.7, true, 0.01, this.sujo());
        this.baque(0.8, 100, 30, 0.8);
        for (let i = 0; i < 10; i++) this.tom('sine', aleatorio(150, 350), aleatorio(500, 900), 0.08, 0.1, 0.3 + i * aleatorio(0.08, 0.2));
        this.chiado(1.4, 0.2, 'highpass', 3000, 5000, 0.2, 0.7, false, 0.1);
        break;
      case 'joinha_sobe':
        this.tom('sawtooth', 90, 300, 1.0, 0.06, 0, null, 0.1);
        this.chiado(1.0, 0.12, 'lowpass', 400, 1500, 0, 1, true, 0.05);
        for (let i = 0; i < 6; i++) this.tom('sine', aleatorio(160, 300), aleatorio(500, 800), 0.07, 0.07, i * 0.15);
        this.metal(800, 0.3, 0.06, 1.0);
        break;
      case 'joinha_brilho':
        this.eco(0.5);
        this.tom('sine', 2637, 2637, 0.5, 0.08);
        this.tom('triangle', 3951, 3951, 0.6, 0.05, 0.06);
        this.tom('sine', 5274, 5274, 0.4, 0.03, 0.12);
        break;
      case 'joinha_afunda':
        this.tom('sawtooth', 280, 70, 3.0, 0.04, 0, null, 0.2);
        for (let i = 0; i < 14; i++) this.tom('sine', aleatorio(120, 260), aleatorio(400, 700), 0.08, 0.06, i * aleatorio(0.15, 0.25));
        break;
      case 'fade_branco':
        this.eco(0.6);
        this.chiado(1.6, 0.12, 'highpass', 400, 9000, 0, 0.7, false, 1.2);
        for (const n of [3, 7, 10, 15]) this.tom('sine', nota(n + 12), nota(n + 12), 1.8, 0.025, 0, null, 1.0);
        break;

      /* ---------------- Final ---------------- */
      case 'passarinho': {
        const base = aleatorio(2600, 3400);
        const vezes = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < vezes; i++) {
          this.tom('sine', base, base * 1.35, 0.05, 0.03, i * 0.11);
          this.tom('sine', base * 1.35, base * 1.05, 0.05, 0.025, i * 0.11 + 0.05);
        }
        break;
      }
      case 'ponto_bip':
        this.tom('square', 1760, 1760, 0.1, 0.06);
        this.tom('sine', 2093, 2093, 0.16, 0.06, 0.11);
        break;
      case 'atualizacao':
        this.eco(0.2);
        this.tom('triangle', 1318, 1318, 0.15, 0.07);
        this.tom('triangle', 1760, 1760, 0.3, 0.07, 0.12);
        break;
      case 'clique':
        this.chiado(0.015, 0.12, 'highpass', 3000);
        this.tom('square', 3200, 2400, 0.012, 0.04);
        break;
    }
  }

  /* =========================================================================
   * LAÇOS
   * ========================================================================= */

  private ruidoEmLaco(marrom: boolean): AudioBufferSourceNode {
    const f = this.ctx!.createBufferSource();
    f.buffer = marrom ? this.ruidoMarrom : this.ruidoBranco;
    f.loop = true;
    return f;
  }

  private filtro(tipo: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
    const f = this.ctx!.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  /** LFO ligado a um parâmetro (vento que varia, tremolo da serra...). */
  private lfo(freq: number, profundidade: number, alvo: AudioParam, fontes: AudioScheduledSourceNode[]): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = profundidade;
    o.connect(g).connect(alvo);
    fontes.push(o);
  }

  private criarLaco(nome: NomeLacoFaseFinal): Laco {
    const ctx = this.ctx!;
    const ganho = ctx.createGain();
    ganho.gain.value = 0;
    ganho.connect(this.saida!);
    const fontes: AudioScheduledSourceNode[] = [];
    const osc = (tipo: OscillatorType, f: number, destino: AudioNode, vol: number): OscillatorNode => {
      const o = ctx.createOscillator();
      o.type = tipo;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = vol;
      o.connect(g).connect(destino);
      fontes.push(o);
      return o;
    };

    switch (nome) {
      case 'chuva': {
        const r = this.ruidoEmLaco(false);
        r.connect(this.filtro('highpass', 900)).connect(this.filtro('lowpass', 7000)).connect(ganho);
        const r2 = this.ruidoEmLaco(true);
        const g2 = ctx.createGain();
        g2.gain.value = 0.5;
        r2.connect(this.filtro('lowpass', 400)).connect(g2).connect(ganho);
        this.lfo(0.13, 0.25, g2.gain, fontes);
        fontes.push(r, r2);
        break;
      }
      case 'lava': {
        const r = this.ruidoEmLaco(true);
        const g = ctx.createGain();
        g.gain.value = 0.8;
        r.connect(this.filtro('lowpass', 260)).connect(g).connect(ganho);
        this.lfo(0.3, 0.3, g.gain, fontes);
        const crepita = this.ruidoEmLaco(false);
        const gc = ctx.createGain();
        gc.gain.value = 0.08;
        crepita.connect(this.filtro('bandpass', 2500, 2)).connect(gc).connect(ganho);
        this.lfo(7, 0.07, gc.gain, fontes);
        osc('sine', 42, ganho, 0.25);
        fontes.push(r, crepita);
        break;
      }
      case 'predio': {
        const r = this.ruidoEmLaco(true);
        r.connect(this.filtro('lowpass', 500)).connect(ganho);
        osc('sine', 60, ganho, 0.12);
        osc('sine', 120, ganho, 0.05);
        osc('triangle', 180.5, ganho, 0.015);
        fontes.push(r);
        break;
      }
      case 'vento': {
        const r = this.ruidoEmLaco(false);
        const f = this.filtro('bandpass', 600, 0.8);
        r.connect(f).connect(ganho);
        this.lfo(0.11, 280, f.frequency, fontes);
        const r2 = this.ruidoEmLaco(true);
        r2.connect(this.filtro('lowpass', 300)).connect(ganho);
        fontes.push(r, r2);
        break;
      }
      case 'serra': {
        const f = this.filtro('bandpass', 1300, 1.5);
        const trem = ctx.createGain();
        trem.gain.value = 0.7;
        f.connect(trem).connect(ganho);
        osc('sawtooth', 142, f, 0.5);
        osc('sawtooth', 213, f, 0.35);
        osc('square', 284.5, f, 0.15);
        this.lfo(26, 0.3, trem.gain, fontes);
        const raspa = this.ruidoEmLaco(false);
        const gr = ctx.createGain();
        gr.gain.value = 0.35;
        raspa.connect(this.filtro('highpass', 3500)).connect(gr).connect(ganho);
        fontes.push(raspa);
        break;
      }
      case 'laser': {
        const f = this.filtro('lowpass', 2000, 2);
        f.connect(ganho);
        osc('sawtooth', 98, f, 0.4);
        osc('sawtooth', 99.6, f, 0.4);
        osc('square', 196, f, 0.15);
        const brilho = osc('sine', 1760, ganho, 0.06);
        this.lfo(9, 25, brilho.frequency, fontes);
        const chia = this.ruidoEmLaco(false);
        const gc = ctx.createGain();
        gc.gain.value = 0.2;
        chia.connect(this.filtro('highpass', 5000)).connect(gc).connect(ganho);
        fontes.push(chia);
        break;
      }
      case 'motor': {
        const f = this.filtro('lowpass', 220);
        f.connect(ganho);
        osc('sawtooth', 48, f, 0.7);
        osc('sawtooth', 48.7, f, 0.5);
        const r = this.ruidoEmLaco(true);
        r.connect(this.filtro('lowpass', 600)).connect(ganho);
        fontes.push(r);
        break;
      }
    }
    for (const f of fontes) f.start();
    return { ganho, fontes, alvo: 0 };
  }

  public destruir(): void {
    if (this.destruido) return;
    this.destruido = true;
    this.cena.events.off(EVENTO_SOM_FASE_FINAL, this.aoEvento, this);
    this.cena.events.off(EVENTO_LACO_FASE_FINAL, this.aoLaco, this);
    document.removeEventListener('keydown', this.aoTeclar, true);
    document.removeEventListener('keydown', this.retomar);
    document.removeEventListener('pointerdown', this.retomar);
    const ctx = this.ctx;
    for (const laco of this.lacos.values()) {
      try {
        if (ctx) laco.ganho.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        const fim = (ctx?.currentTime ?? 0) + 0.4;
        for (const f of laco.fontes) f.stop(fim);
        window.setTimeout(() => laco.ganho.disconnect(), 600);
      } catch {
        // Já parado
      }
    }
    this.lacos.clear();
    // Deixa os efeitos que ainda soam terminarem antes de soltar a saída
    const saida = this.saida;
    const reverb = this.reverb;
    window.setTimeout(() => {
      try {
        reverb?.disconnect();
        saida?.disconnect();
      } catch {
        // Já desconectado
      }
    }, 2500);
  }

  /** Para testes: dispara um som direto, sem posição. */
  public testar(nome: NomeSomFaseFinal): void {
    this.tocar(nome, 1, 0);
  }

  /** Para testes: estado dos laços. */
  public descreverLacos(): Record<string, number> {
    const r: Record<string, number> = {};
    for (const [nome, l] of this.lacos) r[nome] = l.alvo;
    return r;
  }
}

/** Curva de saturação suave (tanh), para dar "crocância" sem estourar. */
function criarCurvaDistorcao(ganho: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curva = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curva[i] = Math.tanh(x * ganho) / Math.tanh(ganho);
  }
  return curva;
}
