import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase3 } from './InterpretadorFase3';
import { PROF } from './areas/AreaLixao';
import type { AreaLixao } from './areas/AreaLixao';
import { CenarioLixao } from './areas/CenarioLixao';
import { criarTrechos } from './areas/FabricaAreas';
import { COR, gerarTexturasLixao } from './lixao/ArteLixao';
import { HudLixao } from './lixao/HudLixao';
import { JogadorLixao } from './lixao/JogadorLixao';
import { ALTURA_TELA, AREAS, CHAO_Y, DEBUG, FADE_MORTE_MS, LARGURA_TELA } from './lixao/TiposLixao';

/** Distância horizontal para interagir com o ponto de exercício. */
const ALCANCE_INTERACAO = 80;
/** Antes do fim do mapa, a distância em que a fase é concluída. */
const MARGEM_FIM = 80;

/**
 * CenaFase3: LIXÃO ELETRÔNICO.
 * Mapa único e contínuo com os 6 trechos em sequência. Só orquestra: monta cenário e
 * trechos, o jogador, a câmera e o terminal, e acompanha em que trecho o jogador está.
 * Céu e clima ficam em areas/CenarioLixao; cada trecho fica em areas/AreaN.
 */
export class CenaFase3 extends CenaBase {
  public trechos: AreaLixao[] = [];
  public cenario!: CenarioLixao;
  /** Sólidos de todos os trechos (chão, obstáculos e barreiras). */
  public solidos!: Phaser.Physics.Arcade.StaticGroup;
  /** Perigos que tiram 1 bateria ao encostar. */
  public perigos!: Phaser.Physics.Arcade.StaticGroup;
  public jogador!: JogadorLixao;
  /**
   * Onde o jogador volta ao morrer: o início da área mais avançada em que entrou ou, depois
   * de encostar no terminal dela, o ponto de exercício.
   */
  public checkpoint = { x: 0, trecho: 0 };
  private hud!: HudLixao;

  private indiceTrecho = 0;
  /** Trecho cujo terminal está aberto, que recebe o resultado dos comandos. */
  private trechoTerminal?: AreaLixao;
  private teclas!: Record<string, Phaser.Input.Keyboard.Key>;
  private textoPrompt!: Phaser.GameObjects.Text;
  private textoArea!: Phaser.GameObjects.Text;
  private fisicaPausada = false;
  private concluindo = false;
  private morrendo = false;

  constructor() {
    super('CenaFase3', 'fase3');
  }

  override init(): void {
    this.indiceTrecho = 0;
    this.trechoTerminal = undefined;
    this.fisicaPausada = false;
    this.concluindo = false;
    this.morrendo = false;
  }

  override create(): void {
    super.create();
    gerarTexturasLixao(this);

    this.solidos = this.physics.add.staticGroup();
    this.perigos = this.physics.add.staticGroup();
    this.trechos = criarTrechos(this);
    this.cenario = new CenarioLixao(this, this.trechos);
    this.cenario.construir();
    this.trechos.forEach((t) => t.construir());
    this.cenario.definirTrecho(0, true);

    const larguraMundo = this.trechos[this.trechos.length - 1].fim;
    this.physics.world.setBounds(0, 0, larguraMundo, ALTURA_TELA);
    this.cameras.main.setBounds(0, 0, larguraMundo, ALTURA_TELA);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.criarJogador();
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
    this.textoArea = this.add
      .text(LARGURA_TELA - 20, 16, '', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '13px',
        color: COR.ceuPoeiraClaro,
        backgroundColor: COR.contorno,
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(9998);
    this.atualizarTextoArea();
    this.hud = new HudLixao(this);
    this.hud.atualizarVida(this.jogador.vida);
    this.criarEfeitoCRT(this.scale.width, this.scale.height, 0.02);
  }

  private criarJogador(): void {
    const inicio = this.trechos[0].inicio;
    this.checkpoint = { x: inicio.x, trecho: 0 };
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
      const numeros = [K.ONE, K.TWO, K.THREE, K.FOUR, K.FIVE, K.SIX];
      numeros.forEach((codigo, i) => (nomes[`AREA${i}`] = codigo));
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
      if (resultado.acao === 'RESOLVER_EXERCICIO') this.trechoTerminal?.resolverExercicio();
    });
  }

  private abrirTerminal(trecho: AreaLixao): void {
    this.trechoTerminal = trecho;
    const info = trecho.info;
    this.terminal.abrir({
      titulo: `LIXÃO // ÁREA ${info.numero} - ${info.nome.toUpperCase()}`,
      linhasIniciais: trecho.exercicioResolvido
        ? ['Exercício desta área já resolvido. O caminho está livre.']
        : ['Exercício ainda não definido. Digite "ok" para liberar a passagem.', 'Digite "ajuda" para ver os comandos.'],
    });
  }

  /* =========================================================================
   * LOOP
   * ========================================================================= */

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);
    if (!this.jogador || !this.cenario) return;

    // Terminal aberto pausa a física (drones e perigos); o cenário segue animado
    const pausado = this.terminal.estaAberto || this.concluindo || this.morrendo;
    if (pausado !== this.fisicaPausada) {
      this.fisicaPausada = pausado;
      if (pausado) this.jogador.parar();
      if (pausado) this.physics.world.pause();
      else this.physics.world.resume();
    }

    this.cenario.atualizar(delta);
    if (pausado) return;

    if (DEBUG) this.atualizarAtalhosDebug();
    this.jogador.atualizar(tempo, delta);
    this.atualizarTrechoAtual();
    this.atualizarInteracoes();
  }

  /** Descobre o trecho pela posição do jogador; ao mudar, troca clima e HUD. */
  private atualizarTrechoAtual(): void {
    const x = this.jogador.x;
    const indice = this.trechos.findIndex((t) => t.contem(x));
    if (indice < 0 || indice === this.indiceTrecho) return;
    this.indiceTrecho = indice;
    this.cenario.definirTrecho(indice);
    this.atualizarTextoArea();
    // Entrar numa área nova faz do início dela o primeiro ponto de volta
    if (indice > this.checkpoint.trecho) this.checkpoint = { x: this.trechos[indice].inicio.x, trecho: indice };
  }

  /* =========================================================================
   * DANO E CHECKPOINT
   * ========================================================================= */

  private aoTocarPerigo(origemX: number): void {
    if (this.morrendo || !this.jogador.receberDano(origemX)) return;
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
      const { x, trecho } = this.checkpoint;
      this.physics.world.resume();
      this.jogador.renascer(x, CHAO_Y - 4);
      this.fisicaPausada = false;
      this.indiceTrecho = trecho;
      this.cenario.definirTrecho(trecho, true);
      this.atualizarTextoArea();
      this.hud.atualizarVida(this.jogador.vida);
      this.cameras.main.centerOn(x, ALTURA_TELA / 2);
      this.cameras.main.fadeIn(FADE_MORTE_MS, 0, 0, 0);
      this.morrendo = false;
    });
  }

  private atualizarTextoArea(): void {
    const info = AREAS[this.indiceTrecho];
    this.textoArea.setText(`ÁREA ${info.numero}/${AREAS.length} · ${info.rotuloClima}`);
  }

  private atualizarInteracoes(): void {
    const x = this.jogador.x;
    const trecho = this.trechos[this.indiceTrecho];
    const pertoExercicio = Math.abs(x - trecho.xExercicio) < ALCANCE_INTERACAO;

    this.textoPrompt.setVisible(pertoExercicio);
    if (pertoExercicio) {
      // Provisório: encostar no terminal ativa o checkpoint (na T1 passa a ser ao abrir o terminal)
      this.checkpoint = { x: trecho.xExercicio, trecho: this.indiceTrecho };
      this.textoPrompt.setPosition(trecho.xExercicio, trecho.marcador.y - 100).setText('[E] Terminal');
      if (Phaser.Input.Keyboard.JustDown(this.teclas.E)) this.abrirTerminal(trecho);
    }

    const fimMapa = this.trechos[this.trechos.length - 1].fim;
    if (x > fimMapa - MARGEM_FIM) this.concluirFase();
  }

  private atualizarAtalhosDebug(): void {
    for (let i = 0; i < this.trechos.length; i++) {
      const tecla = this.teclas[`AREA${i}`];
      if (tecla && Phaser.Input.Keyboard.JustDown(tecla)) {
        const inicio = this.trechos[i].inicio;
        this.jogador.corpo.reset(inicio.x, Math.min(inicio.y, CHAO_Y));
        this.cameras.main.centerOn(inicio.x, ALTURA_TELA / 2);
        return;
      }
    }
  }

  /** Fim do trecho 6: conclui a fase e volta ao hub. */
  private concluirFase(): void {
    if (this.concluindo) return;
    this.concluindo = true;
    this.terminal.fecharForcado();
    this.concluirFaseAtual();
    this.retornarAoHub();
  }
}
