import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { ACAO_LINHA_PARCIAL, ACAO_RESOLVER, interpretarComandoFase3 } from './InterpretadorFase3';
import { PROF } from './trechos/TrechoLixao';
import type { TrechoLixao } from './trechos/TrechoLixao';
import { CenarioLixao } from './trechos/CenarioLixao';
import { criarTrechos } from './trechos/FabricaTrechos';
import { ArremessoLixao, gerarTexturasReciclaveis } from './lixao/ArremessoLixao';
import { COR, gerarTexturasLixao } from './lixao/ArteLixao';
import { DronesLixao } from './lixao/DronesLixao';
import { ChefaoLixao } from './lixao/ChefaoLixao';
import { CLIMAS } from './lixao/ClimaLixao';
import { EXERCICIOS, LIMPEZA_POR_EXERCICIO } from './lixao/ExerciciosLixao';
import type { ContextoExercicio } from './lixao/ExerciciosLixao';
import { HudLixao } from './lixao/HudLixao';
import { MecanismosLixao } from './lixao/MecanismosLixao';
import { SomLixao } from './lixao/SomLixao';
import { JogadorLixao } from './lixao/JogadorLixao';
import { QuedasLixao } from './lixao/QuedasLixao';
import { RoboLixao } from './lixao/RoboLixao';
import { ALTURA_TELA, CHAO_Y, DEBUG, FADE_MORTE_MS, TOPO_MUNDO, TRECHOS } from './lixao/TiposLixao';

/** Distância horizontal para interagir com o ponto de exercício. */
const ALCANCE_INTERACAO = 80;
/** Abaixo da tela, a distância em que cair num buraco mata. */
const QUEDA_FATAL = 120;
/** Tempo em que o aviso "Checkpoint salvo" fica na tela. */
const AVISO_CHECKPOINT_MS = 2000;
/** Depois de acertar, o terminal fecha sozinho para o jogador ver o obstáculo abrir. */
const FECHAR_APOS_ACERTO_MS = 700;
/** Depois do monstro compactado: céu clareando e comemoração antes de voltar ao hub. */
const VITORIA_MS = 5000;
/** Mostrar um portão ou ponte abrindo: ida da câmera, tempo parado nele e volta. */
const EVENTO = { IDA_MS: 450, PARADO_MS: 1000, VOLTA_MS: 450 } as const;

/** Onde o jogador volta ao morrer; `ordem` só cresce ao longo da fase. */
export interface PontoCheckpoint {
  x: number;
  y: number;
  trecho: number;
  ordem: number;
}

/**
 * CenaFase3: LIXÃO ELETRÔNICO.
 * Mapa único e contínuo com os 4 trechos em sequência, sem divisa entre eles: só o clima
 * muda. Só orquestra: monta cenário e trechos, o jogador, a câmera e o terminal, e acompanha
 * em que trecho o jogador está. Céu e clima ficam em trechos/CenarioLixao; cada trecho fica
 * em trechos/TrechoN.
 */
export class CenaFase3 extends CenaBase {
  public trechos: TrechoLixao[] = [];
  public cenario!: CenarioLixao;
  /** Sólidos de todos os trechos (chão, obstáculos e barreiras). */
  public solidos!: Phaser.Physics.Arcade.StaticGroup;
  /** Perigos que tiram 1 bateria ao encostar. */
  public perigos!: Phaser.Physics.Arcade.StaticGroup;
  public jogador!: JogadorLixao;
  /** Lixo caindo das pilhas e recicláveis no chão (munição do arremesso). */
  public quedas!: QuedasLixao;
  /** Pegar (F), mirar e arremessar recicláveis. */
  public arremesso!: ArremessoLixao;
  /** Drones que patrulham, atiram sucata e caem com um reciclável certeiro. */
  public drones!: DronesLixao;
  /** Recicla, o robô reciclador: recolhe lixo temporário e entrega itens ao jogador. */
  public recicla!: RoboLixao;
  /** Esteiras, prensas, frágeis, guindastes, choques, ímãs, portões, botões e checkpoints extras. */
  public mecanismos!: MecanismosLixao;
  /** Monstro de Sucata, contêiner e o fim da fase na arena da noite. */
  public chefao!: ChefaoLixao;
  /**
   * Onde o jogador volta ao morrer: o último ponto de exercício ativado (o início da fase
   * conta como o primeiro) ou a entrada da arena, que não tem exercício.
   */
  public checkpoint: PontoCheckpoint = { x: 0, y: CHAO_Y - 4, trecho: 0, ordem: 0 };
  private hud!: HudLixao;
  public som!: SomLixao;

  private indiceTrecho = 0;
  /** Depuração: posição em CLIMAS do clima forçado pela tecla C; -1 segue o trecho. */
  private climaForcado = -1;
  /** Trecho cujo terminal está aberto, que recebe o resultado dos comandos. */
  private trechoTerminal?: TrechoLixao;
  /** Estado da sessão do terminal aberto: exercício e linha pendente (ver ExerciciosLixao). */
  private contextoTerminal?: ContextoExercicio;
  /** Câmera mostrando um portão ou ponte abrindo: a física fica pausada. */
  private cinematica = false;
  private exerciciosResolvidos = 0;
  private teclas!: Record<string, Phaser.Input.Keyboard.Key>;
  private textoPrompt!: Phaser.GameObjects.Text;
  private fisicaPausada = false;
  private concluindo = false;
  private morrendo = false;
  /** Monstro compactado: sem mais perigos, só a comemoração até voltar ao hub. */
  private vitoria = false;

  constructor() {
    super('CenaFase3', 'fase3');
  }

  override init(): void {
    this.indiceTrecho = 0;
    this.climaForcado = -1;
    this.trechoTerminal = undefined;
    this.contextoTerminal = undefined;
    this.cinematica = false;
    this.exerciciosResolvidos = 0;
    this.fisicaPausada = false;
    this.concluindo = false;
    this.morrendo = false;
    this.vitoria = false;
  }

  override create(): void {
    super.create();
    gerarTexturasLixao(this);
    gerarTexturasReciclaveis(this);

    this.solidos = this.physics.add.staticGroup();
    this.perigos = this.physics.add.staticGroup();
    this.trechos = criarTrechos(this);
    this.cenario = new CenarioLixao(this, this.trechos);
    this.cenario.construir();
    this.som = new SomLixao(this);
    this.mecanismos = new MecanismosLixao(this, (x) => this.aoTocarPerigo(x));
    this.trechos.forEach((t) => t.construir());
    this.cenario.clima.criarPocas(this.trechos);
    this.cenario.definirTrecho(0, true);

    const larguraMundo = this.trechos[this.trechos.length - 1].fim;
    this.physics.world.setBounds(0, TOPO_MUNDO, larguraMundo, ALTURA_TELA - TOPO_MUNDO);
    // Sem borda embaixo: o jogador cai pelos buracos (ver QUEDA_FATAL)
    this.physics.world.setBoundsCollision(true, true, true, false);
    // A câmera sobe com o jogador pelas torres, até o topo do mundo
    this.cameras.main.setBounds(0, TOPO_MUNDO, larguraMundo, ALTURA_TELA - TOPO_MUNDO);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.criarJogador();
    this.quedas = new QuedasLixao(this, (x) => this.aoTocarPerigo(x));
    this.quedas.construir();
    this.drones = new DronesLixao(this, (x) => this.aoTocarPerigo(x));
    this.drones.construir();
    this.recicla = new RoboLixao(this);
    this.recicla.construir();
    this.chefao = new ChefaoLixao(this, (x) => this.aoTocarPerigo(x));
    this.chefao.construir();
    this.chefao.aoCompactar = () => this.vencer();
    this.arremesso = new ArremessoLixao(this);
    this.configurarTeclas();
    this.configurarTerminal();

    this.textoPrompt = this.add
      .text(0, 0, '', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '16px',
        color: COR.neonCiano,
        backgroundColor: COR.contorno,
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(PROF.textos)
      .setVisible(false);

    this.criarHUDSuperior('LIXÃO ELETRÔNICO');
    this.hud = new HudLixao(this);
    this.atualizarTextoClima();
    this.hud.atualizarVida(this.jogador.vida);
    this.arremesso.aoMudarItem = (tipo) => this.hud.atualizarItem(tipo);
    this.criarEfeitoCRT(this.scale.width, this.scale.height, 0.02);
  }

  private criarJogador(): void {
    const inicio = this.trechos[0].inicio;
    this.checkpoint = { x: inicio.x, y: CHAO_Y - 4, trecho: 0, ordem: 0 };
    this.jogador = new JogadorLixao(this, inicio.x, inicio.y);
    this.physics.add.collider(this.jogador.sprite, this.solidos);
    this.physics.add.overlap(this.jogador.sprite, this.perigos, (_j, perigo) =>
      this.aoTocarPerigo((perigo as Phaser.GameObjects.Image).x)
    );
    this.cameras.main.startFollow(this.jogador.sprite, true, 0.08, 0.08);
  }

  private configurarTeclas(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const K = Phaser.Input.Keyboard.KeyCodes;
    // Movimento fica no JogadorLixao; aqui só interação e atalhos de depuração
    const nomes: Record<string, number> = { E: K.E };
    if (DEBUG) {
      const numeros = [K.ONE, K.TWO, K.THREE, K.FOUR];
      numeros.forEach((codigo, i) => (nomes[`TRECHO${i}`] = codigo));
      // L libera o obstáculo do trecho atual sem resolver o exercício
      nomes.LIBERAR = K.L;
      // C troca o clima na hora (sol, névoa, chuva, noite, o do trecho)
      nomes.CLIMA = K.C;
      // R traz o Recicla do trecho atual até o jogador
      nomes.RECICLA = K.R;
    }
    this.teclas = {};
    for (const [nome, codigo] of Object.entries(nomes)) this.teclas[nome] = kb.addKey(codigo, false);
  }

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFase3);
    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      if (resultado.acao === 'CLEAR_TERMINAL') {
        this.terminal.limpar();
        return;
      }
      if (resultado.acao === ACAO_LINHA_PARCIAL && this.contextoTerminal) {
        this.contextoTerminal.linhaPendente = String(resultado.valor ?? '');
        return;
      }
      if (resultado.acao === ACAO_RESOLVER) this.resolverExercicioAberto();
    });
  }

  /** Abre o terminal do trecho com o enunciado do exercício dele no topo. */
  private abrirTerminal(trecho: TrechoLixao): void {
    const indice = this.trechos.indexOf(trecho);
    const exercicio = EXERCICIOS[indice];
    this.trechoTerminal = trecho;
    this.contextoTerminal = { exercicio: indice, linhaPendente: '', resolvido: trecho.exercicioResolvido };
    this.terminal.abrir({
      titulo: `LIXÃO // TERMINAL ${indice + 1}`,
      contexto: this.contextoTerminal,
      linhasIniciais: trecho.exercicioResolvido
        ? ['Exercício deste trecho já resolvido. O caminho está livre.']
        : exercicio
          ? [...exercicio.enunciado]
          : ['Este terminal não tem exercício instalado.'],
    });
  }

  /** Acerto no terminal: libera o obstáculo, sobe o medidor, bipa e fecha o terminal. */
  private resolverExercicioAberto(): void {
    const trecho = this.trechoTerminal;
    if (!trecho || trecho.exercicioResolvido) return;
    trecho.resolverExercicio();
    if (this.contextoTerminal) this.contextoTerminal.resolvido = true;
    this.exerciciosResolvidos++;
    this.hud.atualizarLimpo(this.exerciciosResolvidos * LIMPEZA_POR_EXERCICIO);
    this.som.bipesAcerto();
    this.time.delayedCall(FECHAR_APOS_ACERTO_MS, () => {
      if (this.trechoTerminal === trecho) this.terminal.fecharForcado();
    });
  }

  /* =========================================================================
   * LOOP
   * ========================================================================= */

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);
    if (!this.jogador || !this.cenario) return;

    // Terminal aberto pausa a física (drones e perigos); o cenário segue animado
    const pausado = this.terminal.estaAberto || this.concluindo || this.morrendo || this.cinematica;
    if (pausado !== this.fisicaPausada) {
      this.fisicaPausada = pausado;
      if (pausado) this.jogador.parar();
      if (pausado) this.arremesso.esconderMira();
      if (pausado) this.physics.world.pause();
      else this.physics.world.resume();
    }

    this.cenario.atualizar(delta);
    this.cenario.clima.atualizar(delta, this.jogador);
    if (pausado) return;

    if (DEBUG) this.atualizarAtalhosDebug();
    this.jogador.atualizar(tempo, delta);
    this.mecanismos.atualizar(delta);
    if (!this.vitoria) this.quedas.atualizar(delta, this.indiceTrecho);
    this.drones.atualizar(delta);
    this.chefao.atualizar(delta);
    this.recicla.atualizar(delta);
    this.arremesso.atualizar(delta);
    // Caiu num buraco: perde a vida toda e volta ao checkpoint
    if (this.jogador.y > ALTURA_TELA + QUEDA_FATAL) {
      this.morrer();
      return;
    }
    this.atualizarTrechoAtual();
    this.atualizarInteracoes();
  }

  /** Descobre o trecho pela posição do jogador; ao mudar, troca clima e HUD. */
  private atualizarTrechoAtual(): void {
    const x = this.jogador.x;
    const indice = this.trechos.findIndex((t) => t.contem(x));
    if (indice < 0 || indice === this.indiceTrecho) return;
    this.indiceTrecho = indice;
    this.climaForcado = -1;
    this.cenario.definirTrecho(indice);
    this.atualizarTextoClima();
    // Trecho sem exercício (a arena): a entrada dele é o checkpoint
    const trecho = this.trechos[indice];
    if (trecho.xExercicio === null) this.salvarCheckpoint({ x: trecho.inicio.x, y: CHAO_Y - 4, trecho: indice, ordem: indice * 100 });
  }

  /** Algum sólido (chão, bloco, viga, muralha) contém o ponto (x, y) do mundo. */
  solidoEm(x: number, y: number): boolean {
    for (const obj of this.solidos.getChildren()) {
      const corpo = (obj as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody | null;
      if (corpo && corpo.enable && x >= corpo.left && x <= corpo.right && y >= corpo.top && y <= corpo.bottom) return true;
    }
    return false;
  }

  /* =========================================================================
   * DANO E CHECKPOINT
   * ========================================================================= */

  /**
   * Salva o checkpoint se ele for mais adiante na fase que o atual (pela `ordem`), com aviso.
   * Devolve true se salvou.
   */
  salvarCheckpoint(ponto: PontoCheckpoint): boolean {
    if (ponto.ordem <= this.checkpoint.ordem) return false;
    this.checkpoint = ponto;
    this.hud.mostrarAviso('Checkpoint salvo', AVISO_CHECKPOINT_MS);
    this.som.bipesCheckpoint();
    return true;
  }

  /**
   * Mostra algo abrindo longe do jogador: pausa a física, leva a câmera até (x, y), roda
   * `acao` e fica ali por 1 s antes de voltar ao jogador.
   */
  mostrarEvento(x: number, y: number, acao: () => void): void {
    const cam = this.cameras.main;
    this.cinematica = true;
    cam.stopFollow();
    cam.pan(x, y, EVENTO.IDA_MS, 'Sine.easeInOut');
    this.time.delayedCall(EVENTO.IDA_MS, () => {
      acao();
      this.som.bipesAcerto();
    });
    this.time.delayedCall(EVENTO.IDA_MS + EVENTO.PARADO_MS, () => {
      cam.pan(this.jogador.x, this.jogador.y - 48, EVENTO.VOLTA_MS, 'Sine.easeInOut');
    });
    this.time.delayedCall(EVENTO.IDA_MS + EVENTO.PARADO_MS + EVENTO.VOLTA_MS, () => {
      cam.startFollow(this.jogador.sprite, true, 0.08, 0.08);
      this.cinematica = false;
    });
  }

  private aoTocarPerigo(origemX: number): void {
    if (this.morrendo || this.vitoria || !this.jogador.receberDano(origemX)) return;
    this.hud.atualizarVida(this.jogador.vida);
    this.cameras.main.shake(120, 0.004);
    if (this.jogador.vida <= 0) this.morrer();
  }

  /** Vida zerada: fade, volta ao último checkpoint com vida cheia e reaparece. */
  private morrer(): void {
    this.morrendo = true;
    this.terminal.fecharForcado();
    this.cameras.main.fadeOut(FADE_MORTE_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const { x, y, trecho } = this.checkpoint;
      this.physics.world.resume();
      this.jogador.renascer(x, y);
      this.mecanismos.reiniciar();
      this.quedas.reiniciar();
      this.drones.reiniciar();
      this.recicla.reiniciar();
      this.chefao.reiniciar();
      this.arremesso.reiniciar();
      this.fisicaPausada = false;
      this.indiceTrecho = trecho;
      this.cenario.definirTrecho(trecho, true);
      this.atualizarTextoClima();
      this.hud.atualizarVida(this.jogador.vida);
      this.cameras.main.centerOn(x, Math.min(y - 48, ALTURA_TELA / 2));
      this.cameras.main.fadeIn(FADE_MORTE_MS, 0, 0, 0);
      this.morrendo = false;
    });
  }

  private atualizarTextoClima(): void {
    this.hud.atualizarClima(TRECHOS[this.indiceTrecho].clima);
  }

  private atualizarInteracoes(): void {
    const x = this.jogador.x;
    const trecho = this.trechos[this.indiceTrecho];
    const xExercicio = trecho.xExercicio;
    const pertoExercicio = xExercicio !== null && Math.abs(x - xExercicio) < ALCANCE_INTERACAO;

    // Terminal no alto da torre: só vale na plataforma dele
    const yTerminal = trecho.yExercicio;
    const pertoNoChao = pertoExercicio && Math.abs(this.jogador.y - yTerminal) < 30;
    const alavanca = this.mecanismos.alavancaPerto();
    this.textoPrompt.setVisible(pertoNoChao || alavanca !== null);
    if (xExercicio !== null && pertoNoChao) {
      // Chegar ao terminal salva o checkpoint nele (meio do trecho)
      this.salvarCheckpoint({ x: xExercicio, y: yTerminal - 4, trecho: this.indiceTrecho, ordem: this.indiceTrecho * 100 + 50 });
      this.textoPrompt.setPosition(xExercicio, yTerminal - 100).setText('[E] Terminal');
      if (Phaser.Input.Keyboard.JustDown(this.teclas.E)) this.abrirTerminal(trecho);
    } else if (alavanca) {
      this.textoPrompt.setPosition(alavanca.x, alavanca.y - 70).setText('[E] Alavanca');
      if (Phaser.Input.Keyboard.JustDown(this.teclas.E)) this.mecanismos.puxarAlavanca();
    }
  }

  private atualizarAtalhosDebug(): void {
    if (Phaser.Input.Keyboard.JustDown(this.teclas.LIBERAR)) {
      this.trechoTerminal = this.trechos[this.indiceTrecho];
      this.resolverExercicioAberto();
    }
    if (Phaser.Input.Keyboard.JustDown(this.teclas.RECICLA)) this.recicla.trazerAteJogador(this.indiceTrecho);
    if (Phaser.Input.Keyboard.JustDown(this.teclas.CLIMA)) {
      this.climaForcado = this.climaForcado + 1 < CLIMAS.length ? this.climaForcado + 1 : -1;
      const clima = this.climaForcado >= 0 ? CLIMAS[this.climaForcado] : null;
      this.cenario.forcarClima(clima);
      if (clima) this.hud.atualizarClima(clima, `DEBUG ${clima.toUpperCase()}`);
      else this.atualizarTextoClima();
    }
    for (let i = 0; i < this.trechos.length; i++) {
      const tecla = this.teclas[`TRECHO${i}`];
      if (tecla && Phaser.Input.Keyboard.JustDown(tecla)) {
        const inicio = this.trechos[i].inicio;
        this.jogador.corpo.reset(inicio.x, Math.min(inicio.y, CHAO_Y));
        this.cameras.main.centerOn(inicio.x, ALTURA_TELA / 2);
        return;
      }
    }
  }

  /**
   * Monstro compactado: o céu clareia da noite para o sol, o medidor vai a 100%, o Recicla
   * comemora e a mensagem de fase concluída aparece antes de voltar ao hub.
   */
  private vencer(): void {
    if (this.vitoria) return;
    this.vitoria = true;
    this.cenario.definirTrecho(0);
    this.hud.atualizarClima(TRECHOS[0].clima);
    this.hud.atualizarLimpo(100);
    this.chefao.comemorar();
    this.som.bipesAcerto();
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 60, 'LIXÃO LIMPO!\nFase concluída', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '40px',
        align: 'center',
        color: COR.ceuPoeiraClaro,
        backgroundColor: COR.contorno,
        padding: { x: 24, y: 14 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9998);
    this.time.delayedCall(VITORIA_MS, () => this.concluirFase());
  }

  /** Fim da fase: conclui e volta ao hub. */
  private concluirFase(): void {
    if (this.concluindo) return;
    this.concluindo = true;
    this.terminal.fecharForcado();
    this.concluirFaseAtual();
    this.retornarAoHub();
  }
}
