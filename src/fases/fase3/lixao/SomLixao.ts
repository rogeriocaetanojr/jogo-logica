import Phaser from 'phaser';
import { EVENTO_ARREMESSO, EVENTO_IMPACTO, type DadosArremesso } from './ArremessoLixao';
import { EVENTO_DRONE_DERRUBADO, EVENTO_TIRO_DRONE, type DadosDrone } from './DronesLixao';
import { EVENTO_QUEDA, type DadosQueda } from './QuedasLixao';
import { EVENTO_RECICLA_ENTREGA, EVENTO_RECICLA_RECOLHE } from './RoboLixao';
import { EVENTO_JOGADOR, type DadosSomJogador } from './JogadorLixao';
import type { TipoReciclavel } from './TiposLixao';

/** Volume dos efeitos da fase (0 a 1), antes do mudo compartilhado do jogo. */
const VOLUME = 0.42;
/** Panorâmica máxima na borda da tela e distância fora da tela em que um som some. */
const PAN_MAX = 0.7;
const ALCANCE_FORA = 520;

const aleatorio = (min: number, max: number): number => min + Math.random() * (max - min);

/**
 * Efeitos sonoros do Lixão, todos sintetizados com WebAudio pelo contexto do Phaser (seguem o
 * mudo do jogo): passos do jogador, pulo e pouso, pegar e arremessar sucata (cada tipo com seu
 * impacto: lata, placa, bateria e monitor de tubo), drones, Recicla, prensas, choques, ímãs,
 * elevadores, portões, terminal e o Monstro de Sucata. Cada som sai do lado da tela onde
 * acontece e fica mais baixo longe dela. Os módulos da fase emitem eventos (arremesso, impacto,
 * tiro de drone...) que esta classe escuta; o resto a cena chama direto.
 */
export class SomLixao {
  private readonly cena: Phaser.Scene;
  private readonly ctx: AudioContext | null;
  private readonly saida: GainNode | null = null;
  private readonly ruido: AudioBuffer | null = null;
  private readonly ruidoMarrom: AudioBuffer | null = null;
  private readonly curva: Float32Array<ArrayBuffer> | null = null;
  /** Destino da receita em execução (volume e pan do som). */
  private bus: AudioNode | null = null;
  private terminalAberto: () => boolean = () => false;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    const gerenciador = cena.sound as Phaser.Sound.WebAudioSoundManager;
    this.ctx = gerenciador && 'context' in gerenciador ? gerenciador.context : null;
    if (this.ctx) {
      try {
        const ctx = this.ctx;
        this.saida = ctx.createGain();
        this.saida.gain.value = VOLUME;
        const limitador = ctx.createDynamicsCompressor();
        limitador.threshold.value = -10;
        limitador.ratio.value = 10;
        limitador.attack.value = 0.003;
        limitador.release.value = 0.2;
        this.saida.connect(limitador).connect(gerenciador.destination ?? ctx.destination);
        this.ruido = this.criarRuido(1.5, false);
        this.ruidoMarrom = this.criarRuido(2, true);
        this.curva = criarCurva(14);
      } catch {
        this.saida = null;
      }
    }
    const ev = cena.events;
    ev.on(EVENTO_ARREMESSO, (d: DadosArremesso) => this.posicionado(d.x, () => this.arremesso(d.tipo)));
    ev.on(EVENTO_IMPACTO, (d: DadosArremesso) => this.posicionado(d.x, () => this.impacto(d.tipo)));
    ev.on(EVENTO_TIRO_DRONE, (d: DadosDrone) => this.posicionado(d.x, () => this.tiroDrone()));
    ev.on(EVENTO_DRONE_DERRUBADO, (d: DadosDrone) => this.posicionado(d.x, () => this.droneDerrubado()));
    ev.on(EVENTO_QUEDA, (d: DadosQueda) => this.posicionado(d.x, () => this.quedaLixo()));
    ev.on(EVENTO_RECICLA_RECOLHE, (d: { x: number }) => this.posicionado(d.x, () => this.reciclaRecolhe()));
    ev.on(EVENTO_RECICLA_ENTREGA, (d: { x: number }) => this.posicionado(d.x, () => this.reciclaEntrega()));
    ev.on(EVENTO_JOGADOR, (d: DadosSomJogador) => {
      if (d.acao === 'pulo') this.pulo(d.x);
      else if (d.acao === 'pouso') this.pouso(d.x, d.forca);
      else this.passo(d.x);
    });
    document.addEventListener('keydown', this.aoTeclar, true);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('keydown', this.aoTeclar, true);
      for (const nome of [EVENTO_ARREMESSO, EVENTO_IMPACTO, EVENTO_TIRO_DRONE, EVENTO_DRONE_DERRUBADO, EVENTO_QUEDA, EVENTO_RECICLA_RECOLHE, EVENTO_RECICLA_ENTREGA, EVENTO_JOGADOR]) ev.off(nome);
    });
  }

  /** Liga o clique das teclas enquanto o terminal estiver aberto. */
  definirTerminal(aberto: () => boolean): void {
    this.terminalAberto = aberto;
  }

  private aoTeclar = (e: KeyboardEvent): void => {
    if (!this.terminalAberto()) return;
    if (e.key === 'Enter') this.tocar(() => this.enviar());
    else if (e.key.length === 1 || e.key === 'Backspace') this.tocar(() => this.tecla());
  };

  /* =========================================================================
   * API: sons chamados pela cena e pelos mecanismos
   * ========================================================================= */

  /** Acerto no terminal (máquina destravando): arpejo subindo com brilho. */
  bipesAcerto(): void {
    this.tocar(() => {
      [660, 880, 1320, 1760].forEach((f, i) => this.tom('square', f, f, 0.09, 0.08, i * 0.08));
      this.tom('triangle', 1760, 1760, 0.35, 0.06, 0.32);
    });
  }

  /** Checkpoint salvo: dois bipes subindo e um zumbido de bateria carregando. */
  bipesCheckpoint(): void {
    this.tocar(() => {
      this.tom('square', 880, 880, 0.06, 0.08);
      this.tom('square', 1320, 1320, 0.1, 0.08, 0.08);
      this.tom('sawtooth', 120, 480, 0.45, 0.05, 0.05);
    });
  }

  /** Aviso de perigo de um mecanismo: dois bipes graves de alarme. */
  aviso(x?: number): void {
    this.talvez(x, () => {
      this.tom('square', 330, 330, 0.07, 0.08);
      this.tom('square', 330, 330, 0.07, 0.08, 0.11);
    });
  }

  /** Prensa batendo: pancada grave de metal com parciais desafinados e poeira. */
  batida(x?: number): void {
    this.talvez(x, () => {
      this.baque(0.6, 140, 40, 0.3);
      this.metal(320, 0.45, 0.22);
      this.chiado(0.25, 0.25, 'lowpass', 2000, 300, 0, 1, true);
    });
  }

  /** Choque ligando: estalo elétrico e zumbido de 60 Hz crepitando. */
  choque(x?: number): void {
    this.talvez(x, () => {
      this.chiado(0.05, 0.35, 'highpass', 4000, 2000);
      this.tom('sawtooth', 60, 60, 0.5, 0.12, 0, this.sujo());
      for (let i = 0; i < 6; i++) this.chiado(0.03, 0.2, 'bandpass', aleatorio(2500, 6000), 2000, i * aleatorio(0.05, 0.09), 4);
    });
  }

  pulo(x: number): void {
    this.posicionado(x, () => {
      this.tom('square', 240, 520, 0.09, 0.05);
      this.chiado(0.06, 0.06, 'bandpass', 900, 1800, 0, 2);
    });
  }

  /** Pouso: baque e cascalho, mais forte quanto maior a queda (0 a 1). */
  pouso(x: number, forca: number): void {
    this.posicionado(x, () => {
      this.chiado(0.12, 0.08 + forca * 0.18, 'lowpass', 1600, 400, 0, 1, true);
      this.tom('sine', 110, 50, 0.1, 0.1 + forca * 0.2);
      for (let i = 0; i < 2 + Math.round(forca * 3); i++) this.chiado(0.02, 0.06, 'highpass', aleatorio(3000, 5000), 3000, i * 0.02 + 0.02);
    });
  }

  /** Passo no chão de sucata: estalinho de cascalho, com um tilintar às vezes. */
  passo(x: number): void {
    this.posicionado(x, () => {
      this.chiado(0.04, 0.05, 'bandpass', aleatorio(1200, 2200), 800, 0, 2, true);
      if (Math.random() < 0.25) this.metal(aleatorio(1400, 2200), 0.08, 0.02);
    });
  }

  /** Pegou um reciclável: "plim" e roçar de metal. */
  pegar(x: number): void {
    this.posicionado(x, () => {
      this.chiado(0.05, 0.08, 'highpass', 2500, 4000);
      this.tom('triangle', 880, 1320, 0.08, 0.07, 0.02);
    });
  }

  dano(x: number): void {
    this.posicionado(x, () => {
      this.tom('square', 420, 110, 0.22, 0.12, 0, this.sujo());
      this.metal(260, 0.25, 0.1);
      this.chiado(0.12, 0.15, 'bandpass', 1800, 600, 0, 1.5);
    });
  }

  /** Bateria acabou: zumbido descendo e desligando. */
  morte(): void {
    this.tocar(() => {
      this.tom('sawtooth', 440, 40, 0.9, 0.1, 0, this.sujo());
      [523, 440, 349, 262].forEach((f, i) => this.tom('square', f, f * 0.98, 0.12, 0.06, 0.1 + i * 0.12));
    });
  }

  quedaFatal(): void {
    this.tocar(() => {
      this.baque(0.7, 160, 35, 0.4);
      this.metal(200, 0.5, 0.15);
      this.chiado(0.4, 0.3, 'lowpass', 2500, 200, 0, 1, true);
    });
  }

  terminalAbrir(): void {
    this.tocar(() => {
      this.chiado(0.15, 0.05, 'highpass', 6000, 3000);
      this.tom('sine', 200, 900, 0.12, 0.06);
      this.tom('square', 1200, 1200, 0.04, 0.04, 0.14);
    });
  }

  terminalErro(): void {
    this.tocar(() => {
      this.tom('square', 220, 220, 0.12, 0.07, 0, this.sujo());
      this.tom('square', 160, 160, 0.2, 0.07, 0.14, this.sujo());
    });
  }

  /** Ímã ligando: zumbido elétrico subindo que dura enquanto ele está ligado. */
  imaLiga(x: number, duracaoS: number): void {
    this.posicionado(x, () => {
      this.chiado(0.06, 0.25, 'highpass', 4000, 2500);
      this.tom('sawtooth', 50, 100, 0.25, 0.09, 0, null, 0.05);
      // Zumbido contínuo com vibrato, sumindo no fim
      const ctx = this.ctx!;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.value = 100;
      o2.type = 'square';
      o2.frequency.value = 200.6;
      f.type = 'lowpass';
      f.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.2);
      g.gain.setValueAtTime(0.07, t + Math.max(0.3, duracaoS - 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, t + duracaoS);
      const lfo = ctx.createOscillator();
      const prof = ctx.createGain();
      lfo.frequency.value = 7;
      prof.gain.value = 6;
      lfo.connect(prof).connect(o.frequency);
      o.connect(f);
      o2.connect(f);
      f.connect(g).connect(this.bus!);
      for (const n of [o, o2, lfo]) {
        n.start(t);
        n.stop(t + duracaoS + 0.05);
      }
    });
  }

  imaDesliga(x: number): void {
    this.posicionado(x, () => {
      this.tom('sawtooth', 120, 40, 0.3, 0.06);
      this.metal(600, 0.2, 0.05, 0.05);
    });
  }

  /** Elevador partindo: tranco, motor zumbindo pelo tempo da viagem. */
  elevadorPartida(x: number, duracaoS: number): void {
    this.posicionado(x, () => {
      this.metal(240, 0.3, 0.12);
      this.baque(0.3, 120, 50, 0.2);
      this.tom('sawtooth', 55, 75, duracaoS, 0.05, 0.05, this.filtro('lowpass', 400), 0.3);
      this.chiado(duracaoS, 0.05, 'lowpass', 700, 500, 0.05, 1, true, 0.3);
    });
  }

  elevadorChegada(x: number): void {
    this.posicionado(x, () => {
      this.baque(0.4, 110, 45, 0.25);
      this.metal(330, 0.4, 0.12);
      this.tom('sine', 1320, 1320, 0.25, 0.04, 0.1);
    });
  }

  /** Plataforma frágil: rangido e estalos antes de ceder. */
  fragilRacha(x: number): void {
    this.posicionado(x, () => {
      for (let i = 0; i < 5; i++) this.chiado(0.03, 0.14, 'highpass', aleatorio(1500, 3500), 1200, i * aleatorio(0.06, 0.12));
      this.tom('sawtooth', 90, 70, 0.4, 0.04);
    });
  }

  fragilCai(x: number): void {
    this.posicionado(x, () => {
      this.chiado(0.5, 0.25, 'lowpass', 1800, 200, 0, 1, true);
      this.metal(400, 0.3, 0.1, 0.05);
    });
  }

  /** Portão recolhendo ou ponte subindo: motor pesado e trava no fim. */
  mecanismoAbrindo(x: number): void {
    this.posicionado(x, () => {
      this.tom('sawtooth', 50, 80, 0.8, 0.07, 0, this.filtro('lowpass', 500), 0.1);
      this.chiado(0.8, 0.08, 'lowpass', 600, 300, 0, 1, true, 0.1);
      this.metal(260, 0.3, 0.15, 0.8);
      this.baque(0.3, 100, 40, 0.2, 0.8);
    });
  }

  alavanca(x: number): void {
    this.posicionado(x, () => {
      this.metal(700, 0.12, 0.12);
      this.tom('square', 300, 180, 0.08, 0.06, 0.03);
      this.baque(0.25, 150, 60, 0.1, 0.06);
    });
  }

  /* ---------------- Monstro de Sucata ---------------- */

  /** Acordando: ronco grave de motor velho e chapas batendo. */
  monstroAcorda(x: number): void {
    this.posicionado(x, () => {
      this.fm(55, 80, 0.5, 4, 1.4, 0.16, 0, 'sawtooth');
      this.tom('square', 70, 110, 1.2, 0.05, 0, this.sujo(), 0.3);
      for (let i = 0; i < 6; i++) this.metal(aleatorio(150, 450), 0.25, 0.08, 0.2 + i * aleatorio(0.1, 0.18));
    });
  }

  /** Passo de esteira do monstro: rangido e baque. */
  monstroPasso(x: number): void {
    this.posicionado(x, () => {
      this.baque(0.25, 90, 40, 0.15);
      this.chiado(0.08, 0.07, 'bandpass', 900, 500, 0, 3, true);
    });
  }

  /** Preparando o arremesso: servo subindo e chapas tremendo. */
  monstroPreparo(x: number): void {
    this.posicionado(x, () => {
      this.tom('sawtooth', 120, 360, 0.4, 0.06, 0, this.filtro('lowpass', 1200), 0.15);
      for (let i = 0; i < 4; i++) this.metal(aleatorio(300, 600), 0.1, 0.05, i * 0.09);
    });
  }

  /** Arremesso: rosnado curto e o assobio da sucata saindo. */
  monstroArremesso(x: number): void {
    this.posicionado(x, () => {
      this.fm(90, 60, 0.5, 3, 0.35, 0.12, 0, 'sawtooth');
      this.chiado(0.35, 0.14, 'bandpass', 600, 2400, 0, 2);
    });
  }

  /** Sucata do monstro batendo no chão. */
  sucataCai(x: number): void {
    this.posicionado(x, () => {
      this.metal(aleatorio(250, 400), 0.35, 0.14);
      this.baque(0.3, 130, 50, 0.15);
    });
  }

  /** Acertou o monstro tonto: pancada na lataria e um gemido de motor. */
  monstroAcertado(x: number): void {
    this.posicionado(x, () => {
      this.metal(180, 0.5, 0.2);
      this.baque(0.4, 160, 50, 0.2);
      this.fm(140, 80, 0.5, 2, 0.4, 0.08, 0.05, 'sawtooth');
    });
  }

  /** Lixo quicando na carcaça fora da janela: "tónc" seco. */
  monstroQuica(x: number): void {
    this.posicionado(x, () => this.metal(520, 0.2, 0.09));
  }

  monstroTonto(x: number): void {
    this.posicionado(x, () => {
      for (let i = 0; i < 6; i++) this.tom('sine', i % 2 ? 2400 : 1980, i % 2 ? 2600 : 2150, 0.07, 0.04, i * 0.1);
      this.tom('sawtooth', 160, 70, 0.5, 0.04, 0, this.filtro('lowpass', 600));
    });
  }

  monstroDerrotado(x: number): void {
    this.posicionado(x, () => {
      this.tom('sawtooth', 300, 30, 1.6, 0.1, 0, this.sujo());
      for (let i = 0; i < 8; i++) this.metal(aleatorio(150, 600), 0.3, 0.07, i * aleatorio(0.08, 0.16));
      this.chiado(1.2, 0.12, 'lowpass', 1200, 150, 0.2, 1, true, 0.1);
    });
  }

  /** Empurrando o monstro derrotado: chapa arrastando no chão. */
  monstroArrasta(x: number): void {
    this.posicionado(x, () => this.chiado(0.25, 0.06, 'bandpass', aleatorio(500, 900), 400, 0, 3, true));
  }

  /** Compactação no contêiner: prensa hidráulica e lata esmagando. */
  compactar(x: number): void {
    this.posicionado(x, () => {
      this.chiado(0.5, 0.2, 'highpass', 2000, 800, 0, 1);
      this.baque(0.7, 120, 30, 0.5, 0.5);
      for (let i = 0; i < 6; i++) this.metal(aleatorio(200, 700), 0.2, 0.07, 0.4 + i * 0.05);
    });
  }

  /** Voz do monstro nas falas: sílabas graves de motor engasgado. */
  monstroFala(x: number): void {
    this.posicionado(x, () => {
      for (let i = 0; i < 4; i++) this.fm(aleatorio(70, 110), aleatorio(60, 90), 1.5, 2, 0.09, 0.06, i * 0.1, 'sawtooth');
    });
  }

  /** Vitória: fanfarra curta de bipes. */
  vitoria(): void {
    this.tocar(() => {
      const notas = [523, 659, 784, 1047, 784, 1047];
      notas.forEach((f, i) => this.tom('square', f, f, i === notas.length - 1 ? 0.5 : 0.12, 0.08, i * 0.12));
      this.tom('triangle', 262, 262, 1.0, 0.08, 0.6);
    });
  }

  /* =========================================================================
   * Sons dos eventos dos módulos
   * ========================================================================= */

  /** Arremesso: "fuum" de ar, mais grave e lento quanto mais pesado. */
  private arremesso(tipo: TipoReciclavel): void {
    const peso = { lata: 1, placa: 1.5, bateria: 2, monitor: 3 }[tipo];
    this.chiado(0.22 + peso * 0.04, 0.16, 'bandpass', 2200 / peso, 600 / peso, 0, 1.5);
    this.tom('sine', 300 / peso, 140 / peso, 0.15, 0.05);
  }

  /** Impacto com a cara de cada tipo de sucata. */
  private impacto(tipo: TipoReciclavel): void {
    switch (tipo) {
      case 'lata':
        this.metal(aleatorio(900, 1200), 0.3, 0.2);
        this.tom('square', 700, 350, 0.08, 0.05);
        break;
      case 'placa':
        for (let i = 0; i < 4; i++) this.chiado(0.02, 0.18, 'highpass', aleatorio(2500, 5000), 2000, i * 0.025);
        this.tom('triangle', 500, 260, 0.08, 0.06);
        break;
      case 'bateria':
        this.baque(0.4, 180, 60, 0.15);
        this.chiado(0.4, 0.1, 'highpass', 5000, 3000, 0.05, 1);
        this.tom('sawtooth', 1200, 200, 0.25, 0.04, 0.05);
        break;
      case 'monitor':
        this.baque(0.5, 140, 40, 0.25);
        // Tubo estourando: chiado agudo de vidro e cacos tilintando
        this.chiado(0.4, 0.3, 'highpass', 3000, 6000, 0, 1);
        for (let i = 0; i < 6; i++) this.metal(aleatorio(2500, 4500), 0.12, 0.05, 0.05 + i * aleatorio(0.03, 0.07));
        break;
    }
  }

  private tiroDrone(): void {
    this.tom('square', 1100, 300, 0.12, 0.07);
    this.chiado(0.08, 0.1, 'bandpass', 2000, 800, 0, 2);
  }

  private droneDerrubado(): void {
    this.chiado(0.08, 0.3, 'highpass', 4000, 2000);
    this.tom('square', 900, 120, 0.6, 0.06, 0.05);
    this.tom('sawtooth', 300, 60, 0.6, 0.04, 0.05);
    this.baque(0.35, 140, 40, 0.25, 0.6);
    this.metal(500, 0.25, 0.1, 0.6);
  }

  /** Item caindo de uma pilha: assobio curto descendo. */
  private quedaLixo(): void {
    this.tom('sine', 1500, 500, 0.4, 0.04);
  }

  private reciclaRecolhe(): void {
    this.tom('square', 660, 990, 0.06, 0.05);
    this.chiado(0.08, 0.05, 'bandpass', 1200, 2400, 0, 3);
  }

  private reciclaEntrega(): void {
    this.tom('square', 990, 990, 0.06, 0.05);
    this.tom('square', 1320, 1320, 0.1, 0.05, 0.08);
    this.tom('triangle', 1980, 1980, 0.12, 0.04, 0.16);
  }

  private tecla(): void {
    this.chiado(0.02, 0.08, 'bandpass', aleatorio(2500, 3800), 2000, 0, 3);
    this.tom('square', aleatorio(1500, 2100), 1400, 0.012, 0.02);
  }

  private enviar(): void {
    this.chiado(0.03, 0.1, 'bandpass', 2000, 1500, 0, 2);
    this.tom('square', 880, 1320, 0.06, 0.05, 0.02);
  }

  /* =========================================================================
   * SÍNTESE
   * ========================================================================= */

  private get pronto(): boolean {
    if (!this.ctx || !this.saida) return false;
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    return this.ctx.state === 'running';
  }

  /** Toca uma receita sem posição (centro da tela, volume cheio). */
  private tocar(receita: () => void): void {
    this.comBus(1, 0, receita);
  }

  /** Toca na posição x do mundo: pan pelo lado da tela e volume menor longe dela. */
  private posicionado(x: number, receita: () => void): void {
    const cam = this.cena.cameras.main;
    const dx = x - cam.worldView.centerX;
    const pan = Phaser.Math.Clamp(dx / (cam.width / 2), -1, 1) * PAN_MAX;
    const volume = Phaser.Math.Clamp(1 - Math.max(0, Math.abs(dx) - cam.width / 2) / ALCANCE_FORA, 0, 1);
    if (volume < 0.03) return;
    this.comBus(volume, pan, receita);
  }

  private talvez(x: number | undefined, receita: () => void): void {
    if (x === undefined) this.tocar(receita);
    else this.posicionado(x, receita);
  }

  private comBus(volume: number, pan: number, receita: () => void): void {
    if (!this.pronto) return;
    const ctx = this.ctx!;
    try {
      const g = ctx.createGain();
      g.gain.value = volume;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p).connect(this.saida!);
      this.bus = g;
      receita();
    } catch {
      // Áudio indisponível
    } finally {
      this.bus = null;
    }
  }

  private criarRuido(segundos: number, marrom: boolean): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * segundos), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < d.length; i++) {
      const b = Math.random() * 2 - 1;
      if (marrom) {
        ultimo = (ultimo + 0.02 * b) / 1.02;
        d[i] = ultimo * 3.5;
      } else d[i] = b;
    }
    return buf;
  }

  private sujo(): AudioNode {
    const w = this.ctx!.createWaveShaper();
    w.curve = this.curva;
    w.connect(this.bus!);
    return w;
  }

  private filtro(tipo: BiquadFilterType, freq: number): AudioNode {
    const f = this.ctx!.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = freq;
    f.connect(this.bus!);
    return f;
  }

  private tom(tipo: OscillatorType, f0: number, f1: number, dur: number, vol: number, atraso = 0, saida: AudioNode | null = null, ataque = 0.005): void {
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
    o.connect(g).connect(saida ?? this.bus!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private chiado(dur: number, vol: number, filtro: BiquadFilterType, f0: number, f1 = f0, atraso = 0, q = 1, marrom = false, ataque = 0.008): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + atraso;
    const fonte = ctx.createBufferSource();
    fonte.buffer = marrom ? this.ruidoMarrom : this.ruido;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(30, f0), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fonte.connect(f).connect(g).connect(this.bus!);
    fonte.start(t, Math.random() * 0.8);
    fonte.stop(t + dur + 0.05);
  }

  private baque(vol: number, f0 = 150, f1 = 40, dur = 0.3, atraso = 0): void {
    this.tom('sine', f0, f1, dur, vol, atraso);
    this.chiado(0.02, vol * 0.4, 'highpass', 2500, 2500, atraso);
  }

  /** Pancada metálica: parciais inarmônicas que decaem (lata, chapa, sino). */
  private metal(f: number, dur: number, vol: number, atraso = 0): void {
    [1, 2.76, 5.4, 8.93].forEach((p, i) => this.tom('sine', f * p, f * p * 0.995, dur / (1 + i * 0.6), vol / (1 + i * 1.2), atraso, null, 0.002));
  }

  private fm(f0: number, f1: number, razao: number, indice: number, dur: number, vol: number, atraso = 0, tipo: OscillatorType = 'sine'): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + atraso;
    const port = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const prof = ctx.createGain();
    const g = ctx.createGain();
    port.type = tipo;
    port.frequency.setValueAtTime(f0, t);
    port.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    mod.frequency.setValueAtTime(f0 * razao, t);
    prof.gain.setValueAtTime(f0 * indice, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    mod.connect(prof).connect(port.frequency);
    port.connect(g).connect(this.bus!);
    port.start(t);
    mod.start(t);
    port.stop(t + dur + 0.05);
    mod.stop(t + dur + 0.05);
  }
}

function criarCurva(ganho: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const c = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * ganho) / Math.tanh(ganho);
  }
  return c;
}
