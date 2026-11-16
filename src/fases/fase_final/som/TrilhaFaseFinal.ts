import type Phaser from 'phaser';
import { MUSICA_FASE_FINAL } from '../constantesFaseFinal';

export type FaixaFaseFinal = 'entrada' | 'torre' | 'introBoss' | 'tema' | 'creditos';

const M = MUSICA_FASE_FINAL;

interface ConfigFaixa {
  arquivo: string;
  volume: number;
  /**
   * 'fluxo' toca por streaming (HTMLAudioElement), para faixas longas; 'memoria' decodifica
   * tudo e permite um laço sem emenda com início e fim exatos (loopStart/loopEnd).
   */
  modo: 'fluxo' | 'memoria';
  laco?: { inicio: number; fim: number };
}

const FAIXAS: Record<FaixaFaseFinal, ConfigFaixa> = {
  entrada: { arquivo: 'megaBrainEntrance.mp3', volume: M.VOLUMES.entrada, modo: 'fluxo' },
  torre: { arquivo: 'megaBrainTower.mp3', volume: M.VOLUMES.torre, modo: 'fluxo' },
  introBoss: { arquivo: 'megaBrainBossfightIntro.mp3', volume: M.VOLUMES.introBoss, modo: 'memoria' },
  // Tema cortado em 3 s de introdução + um laço de 94,43 s (o arquivo original tem 30 min repetindo)
  tema: {
    arquivo: 'megaBrainTheme.mp3',
    volume: M.VOLUMES.tema,
    modo: 'memoria',
    laco: { inicio: M.LACO_TEMA.INICIO_S, fim: M.LACO_TEMA.INICIO_S + M.LACO_TEMA.PERIODO_S },
  },
  creditos: { arquivo: 'credits.mp3', volume: M.VOLUMES.creditos, modo: 'fluxo' },
};

interface EstadoFaixa {
  ganho: GainNode;
  elemento?: HTMLAudioElement;
  buffer?: AudioBuffer;
  carregando?: Promise<void>;
  fonte?: AudioBufferSourceNode;
  /** Quando a fonte em memória começou (para saber a posição). */
  inicioFonte: number;
  tocando: boolean;
  /** Tocar assim que o buffer terminar de decodificar. */
  pendente: boolean;
  /** Invalida desligamentos agendados quando a faixa volta antes do fade acabar. */
  geracao: number;
}

/**
 * Trilha da Fase Final. Uma instância só para o jogo inteiro: a cena da fase é reiniciada a cada
 * trecho (andar, forma do boss), e a música precisa continuar de onde estava em vez de recomeçar.
 *
 * Tudo passa pelo contexto de áudio do Phaser, então o mudo do jogo ([M]) cala a trilha também.
 * As faixas longas tocam por streaming (MediaElementSource); a introdução do boss e o tema ficam
 * em memória para o laço não ter emenda. Com o terminal ou um diálogo aberto, a trilha fica
 * abafada (mais baixa e com filtro), para dar para ler.
 */
export class TrilhaFaseFinal {
  private static instancia?: TrilhaFaseFinal;

  private readonly ctx: AudioContext;
  private readonly abafador: BiquadFilterNode;
  private readonly volumeGeral: GainNode;
  private readonly faixas = new Map<FaixaFaseFinal, EstadoFaixa>();
  private atual: FaixaFaseFinal | null = null;
  private abafada: boolean = false;
  private aguardandoGesto: boolean = false;

  /** A trilha da fase (cria na primeira vez). Sem Web Audio, devolve undefined e o jogo segue mudo. */
  public static obter(cena: Phaser.Scene): TrilhaFaseFinal | undefined {
    if (TrilhaFaseFinal.instancia) return TrilhaFaseFinal.instancia;
    const gerenciador = cena.sound as Phaser.Sound.WebAudioSoundManager;
    if (!gerenciador || !('context' in gerenciador)) return undefined;
    try {
      TrilhaFaseFinal.instancia = new TrilhaFaseFinal(gerenciador.context, gerenciador.destination ?? gerenciador.context.destination);
    } catch {
      return undefined;
    }
    return TrilhaFaseFinal.instancia;
  }

  /** Para testes e depuração, sem criar. */
  public static existente(): TrilhaFaseFinal | undefined {
    return TrilhaFaseFinal.instancia;
  }

  private constructor(ctx: AudioContext, destino: AudioNode) {
    this.ctx = ctx;
    this.volumeGeral = ctx.createGain();
    this.volumeGeral.gain.value = 1;
    this.abafador = ctx.createBiquadFilter();
    this.abafador.type = 'lowpass';
    this.abafador.frequency.value = 20000;
    this.abafador.Q.value = 0.5;
    this.volumeGeral.connect(this.abafador).connect(destino);
  }

  private url(arquivo: string): string {
    return `${import.meta.env.BASE_URL}assets/fase_final/musica/${arquivo}`;
  }

  private estado(nome: FaixaFaseFinal): EstadoFaixa {
    let e = this.faixas.get(nome);
    if (e) return e;
    const cfg = FAIXAS[nome];
    const ganho = this.ctx.createGain();
    ganho.gain.value = 0;
    ganho.connect(this.volumeGeral);
    e = { ganho, inicioFonte: 0, tocando: false, pendente: false, geracao: 0 };
    if (cfg.modo === 'fluxo') {
      const el = new Audio(this.url(cfg.arquivo));
      el.loop = true;
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      this.ctx.createMediaElementSource(el).connect(ganho);
      e.elemento = el;
    }
    this.faixas.set(nome, e);
    return e;
  }

  /** Baixa e decodifica as faixas em memória com antecedência (chamar ao entrar na torre). */
  public preCarregar(): void {
    for (const nome of ['introBoss', 'tema'] as FaixaFaseFinal[]) this.carregar(nome);
  }

  private carregar(nome: FaixaFaseFinal): Promise<void> {
    const e = this.estado(nome);
    if (e.buffer) return Promise.resolve();
    if (e.carregando) return e.carregando;
    e.carregando = fetch(this.url(FAIXAS[nome].arquivo))
      .then((r) => r.arrayBuffer())
      .then((dados) => this.ctx.decodeAudioData(dados))
      .then((buf) => {
        e.buffer = buf;
        if (e.pendente && this.atual === nome) this.iniciarFonte(nome, e);
        e.pendente = false;
      })
      .catch(() => {
        e.carregando = undefined;
      });
    return e.carregando;
  }

  /**
   * Toca uma faixa com fade, apagando as outras. Se ela já está tocando, só ajusta o volume
   * (a música da torre segue de um andar para o outro). `doZero` recomeça do início.
   */
  public tocar(nome: FaixaFaseFinal, fadeS: number = M.FADE_PADRAO_S, doZero: boolean = false): void {
    try {
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      for (const outra of this.faixas.keys()) if (outra !== nome) this.apagar(outra, fadeS);
      this.atual = nome;
      const e = this.estado(nome);
      e.geracao++;
      const cfg = FAIXAS[nome];
      const t = this.ctx.currentTime;
      e.ganho.gain.cancelScheduledValues(t);
      e.ganho.gain.setValueAtTime(e.tocando ? e.ganho.gain.value : 0.0001, t);
      e.ganho.gain.linearRampToValueAtTime(cfg.volume, t + Math.max(0.05, fadeS));

      if (cfg.modo === 'fluxo' && e.elemento) {
        if (doZero || !e.tocando) e.elemento.currentTime = 0;
        e.tocando = true;
        this.tocarElemento(e.elemento);
      } else if (!e.tocando || doZero) {
        if (e.buffer) this.iniciarFonte(nome, e);
        else {
          e.pendente = true;
          this.carregar(nome);
        }
      }
    } catch {
      // Áudio indisponível
    }
  }

  private iniciarFonte(nome: FaixaFaseFinal, e: EstadoFaixa): void {
    if (!e.buffer) return;
    this.pararFonte(e);
    const cfg = FAIXAS[nome];
    const fonte = this.ctx.createBufferSource();
    fonte.buffer = e.buffer;
    fonte.loop = true;
    if (cfg.laco) {
      fonte.loopStart = cfg.laco.inicio;
      fonte.loopEnd = Math.min(cfg.laco.fim, e.buffer.duration);
    }
    fonte.connect(e.ganho);
    fonte.start();
    e.fonte = fonte;
    e.inicioFonte = this.ctx.currentTime;
    e.tocando = true;
  }

  private pararFonte(e: EstadoFaixa): void {
    if (!e.fonte) return;
    try {
      e.fonte.stop();
      e.fonte.disconnect();
    } catch {
      // Já parada
    }
    e.fonte = undefined;
  }

  private tocarElemento(el: HTMLAudioElement): void {
    el.play()?.catch(() => {
      // O navegador pode barrar o som até um gesto do jogador: tenta de novo no próximo
      if (this.aguardandoGesto) return;
      this.aguardandoGesto = true;
      document.addEventListener('keydown', this.tentarDeNovo);
      document.addEventListener('pointerdown', this.tentarDeNovo);
    });
  }

  private tentarDeNovo = (): void => {
    this.aguardandoGesto = false;
    document.removeEventListener('keydown', this.tentarDeNovo);
    document.removeEventListener('pointerdown', this.tentarDeNovo);
    this.ctx.resume().catch(() => {});
    if (!this.atual) return;
    const e = this.faixas.get(this.atual);
    if (e?.elemento && e.tocando && e.elemento.paused) this.tocarElemento(e.elemento);
  };

  /** Fade até o silêncio e, no fim, pausa (fluxo) ou para (memória). */
  private apagar(nome: FaixaFaseFinal, fadeS: number): void {
    const e = this.faixas.get(nome);
    if (!e || !e.tocando) return;
    e.pendente = false;
    const t = this.ctx.currentTime;
    e.ganho.gain.cancelScheduledValues(t);
    e.ganho.gain.setValueAtTime(e.ganho.gain.value, t);
    e.ganho.gain.linearRampToValueAtTime(0, t + Math.max(0.05, fadeS));
    const geracao = ++e.geracao;
    window.setTimeout(() => {
      if (e.geracao !== geracao) return; // voltou a tocar no meio do fade
      e.tocando = false;
      e.elemento?.pause();
      this.pararFonte(e);
    }, Math.max(0.05, fadeS) * 1000 + 80);
  }

  /** Cala tudo (fim da luta, saída da fase). */
  public parar(fadeS: number = M.FADE_PADRAO_S): void {
    this.atual = null;
    for (const nome of this.faixas.keys()) this.apagar(nome, fadeS);
  }

  /** Terminal ou diálogo aberto: a trilha abaixa e fica abafada, para dar para ler. */
  public abafar(abafada: boolean): void {
    if (abafada === this.abafada) return;
    this.abafada = abafada;
    try {
      const t = this.ctx.currentTime;
      this.volumeGeral.gain.setTargetAtTime(abafada ? M.FATOR_ABAFADO : 1, t, 0.12);
      this.abafador.frequency.setTargetAtTime(abafada ? M.FILTRO_ABAFADO_HZ : 20000, t, 0.12);
    } catch {
      // Áudio indisponível
    }
  }

  /** Para testes e depuração. */
  public descrever(): { atual: FaixaFaseFinal | null; abafada: boolean; faixas: Record<string, { tocando: boolean; volume: number; tempo: number }> } {
    const faixas: Record<string, { tocando: boolean; volume: number; tempo: number }> = {};
    for (const [nome, e] of this.faixas) {
      const tempo = e.elemento ? e.elemento.currentTime : e.fonte ? this.ctx.currentTime - e.inicioFonte : 0;
      faixas[nome] = { tocando: e.tocando, volume: +e.ganho.gain.value.toFixed(3), tempo: +tempo.toFixed(1) };
    }
    return { atual: this.atual, abafada: this.abafada, faixas };
  }
}
