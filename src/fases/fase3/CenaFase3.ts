import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase3 } from './InterpretadorFase3';
import { PROF } from './areas/AreaLixao';
import type { AreaLixao } from './areas/AreaLixao';
import { criarArea } from './areas/FabricaAreas';
import { COR, gerarTexturasLixao } from './lixao/ArteLixao';
import { JogadorLixao } from './lixao/JogadorLixao';
import { AREAS, DEBUG } from './lixao/TiposLixao';
import type { DadosCenaLixao } from './lixao/TiposLixao';

/** Distância horizontal para interagir com o ponto de exercício ou a saída. */
const ALCANCE_INTERACAO = 80;

/**
 * CenaFase3: LIXÃO ELETRÔNICO.
 * Só orquestra: carrega a área atual, o jogador, a câmera e o terminal.
 * Cenário, clima e objetos de cada área ficam em areas/.
 */
export class CenaFase3 extends CenaBase {
  public area!: AreaLixao;
  public jogador!: JogadorLixao;

  private indiceArea = 0;
  private teclas!: Record<string, Phaser.Input.Keyboard.Key>;
  private textoPrompt!: Phaser.GameObjects.Text;
  private fisicaPausada = false;
  private transicionando = false;

  constructor() {
    super('CenaFase3', 'fase3');
  }

  override init(dados?: DadosCenaLixao): void {
    this.indiceArea = Phaser.Math.Clamp(dados?.area ?? 0, 0, AREAS.length - 1);
    this.fisicaPausada = false;
    this.transicionando = false;
  }

  override create(): void {
    super.create();
    gerarTexturasLixao(this);

    this.area = criarArea(this, this.indiceArea);
    this.area.construir();

    this.physics.world.setBounds(0, 0, this.area.largura, this.area.altura);
    this.cameras.main.setBounds(0, 0, this.area.largura, this.area.altura);
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

    const info = AREAS[this.indiceArea];
    this.criarHUDSuperior(`ÁREA ${info.numero}/${AREAS.length} · ${info.rotuloClima}`);
    this.criarEfeitoCRT(this.scale.width, this.scale.height, 0.02);
  }

  private criarJogador(): void {
    this.jogador = new JogadorLixao(this, this.area.inicio.x, this.area.inicio.y);
    this.physics.add.collider(this.jogador.sprite, this.area.solidos);
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
      this.area.aoResultadoTerminal(resultado);
    });
  }

  private abrirTerminal(): void {
    const info = AREAS[this.indiceArea];
    this.terminal.abrir({
      titulo: `LIXÃO // ÁREA ${info.numero} - ${info.nome.toUpperCase()}`,
      linhasIniciais: ['Exercício ainda não definido.', 'Digite "ajuda" para ver os comandos.'],
    });
  }

  /* =========================================================================
   * LOOP
   * ========================================================================= */

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);
    if (!this.jogador || !this.area) return;

    // Terminal aberto pausa a física (drones e perigos); o cenário segue animado
    const pausado = this.terminal.estaAberto || this.transicionando;
    if (pausado !== this.fisicaPausada) {
      this.fisicaPausada = pausado;
      if (pausado) this.jogador.parar();
      if (pausado) this.physics.world.pause();
      else this.physics.world.resume();
    }

    this.area.atualizar(tempo, delta);
    if (pausado) return;

    if (DEBUG) this.atualizarAtalhosDebug();
    this.jogador.atualizar(tempo, delta);
    this.atualizarInteracoes();
  }

  private atualizarInteracoes(): void {
    const x = this.jogador.x;
    const pertoExercicio = Math.abs(x - this.area.xExercicio) < ALCANCE_INTERACAO;

    this.textoPrompt.setVisible(pertoExercicio);
    if (pertoExercicio) {
      this.textoPrompt.setPosition(this.area.xExercicio, this.area.marcador.y - 100).setText('[E] Terminal');
      if (Phaser.Input.Keyboard.JustDown(this.teclas.E)) this.abrirTerminal();
    }

    if (x > this.area.xSaida - ALCANCE_INTERACAO / 2) this.irParaArea(this.indiceArea + 1);
  }

  private atualizarAtalhosDebug(): void {
    for (let i = 0; i < AREAS.length; i++) {
      const tecla = this.teclas[`AREA${i}`];
      if (tecla && Phaser.Input.Keyboard.JustDown(tecla)) {
        this.irParaArea(i);
        return;
      }
    }
  }

  /** Troca de área com fade. Depois da última, conclui a fase e volta ao hub. */
  private irParaArea(indice: number): void {
    if (this.transicionando) return;
    this.transicionando = true;

    if (indice >= AREAS.length) {
      this.concluirFaseAtual();
      this.retornarAoHub();
      return;
    }

    this.terminal.fecharForcado();
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.restart({ area: indice } satisfies DadosCenaLixao));
  }
}
