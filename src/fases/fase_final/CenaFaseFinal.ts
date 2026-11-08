import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { avatarHtml } from './ArteFaseFinal';
import { ClimaFaseFinal } from './ClimaFaseFinal';
import {
  CAMERA_FASE_FINAL,
  CENA_FASE_FINAL,
  CHECKPOINTS_FASE_FINAL,
  EXTERIOR_FASE_FINAL,
  INTERACAO_FASE_FINAL,
} from './constantesFaseFinal';
import { HUD_FASE_FINAL, NOTIFICACOES_FASE_FINAL, TEXTOS_TERMO, falasValdir } from './DialogosFaseFinal';
import { ExteriorFaseFinal } from './exterior/ExteriorFaseFinal';
import { TEX_EXTERIOR, retratoValdir } from './exterior/TexturasExterior';
import { ACOES_FASE_FINAL, type ContextoTermo, interpretarComandoFaseFinal } from './InterpretadorFaseFinal';
import { JogadorFaseFinal, type Ponto } from './JogadorFaseFinal';
import { NpcFaseFinal } from './NpcFaseFinal';

type EstadoCena = 'pan' | 'livre' | 'transicao';

interface Checkpoint {
  id: string;
  ponto: Ponto;
}

const E = EXTERIOR_FASE_FINAL;

/**
 * Fase Final: Mega Brain World.
 * Etapa 1: exterior da torre (pan de abertura, Valdir, termo de ciência e porta).
 * Os andares, o boss e o final entram nas próximas etapas.
 */
export class CenaFaseFinal extends CenaBase {
  private estado: EstadoCena = 'pan';
  private exterior!: ExteriorFaseFinal;
  private clima!: ClimaFaseFinal;
  private jogador!: JogadorFaseFinal;
  private valdir!: NpcFaseFinal;
  private promptTermo!: Phaser.GameObjects.Text;
  private textoObjetivo!: Phaser.GameObjects.Text;
  private textoNotificacao!: Phaser.GameObjects.Text;

  private congelado: boolean = false;
  private checkpoint: Checkpoint = { id: 'inicio', ponto: { ...E.SPAWN } };
  private contextoTermo: ContextoTermo = { puzzle: 'termo', aceito: false, recusas: 0, invalidos: 0 };
  private conversouComValdir: boolean = false;
  private avatarValdir: string = '';

  constructor() {
    super('CenaFaseFinal', 'fase_final');
  }

  init(): void {
    this.estado = 'pan';
    this.congelado = false;
    this.checkpoint = { id: 'inicio', ponto: { ...E.SPAWN } };
    this.contextoTermo = { puzzle: 'termo', aceito: false, recusas: 0, invalidos: 0 };
    this.conversouComValdir = false;
  }

  create(): void {
    super.create();
    const alturaMundo = E.CHAO_Y + 100 - E.TOPO_MUNDO_Y;
    this.physics.world.setBounds(0, E.TOPO_MUNDO_Y, E.LARGURA, alturaMundo);
    this.cameras.main.setBounds(0, E.TOPO_MUNDO_Y, E.LARGURA, alturaMundo);
    this.cameras.main.setBackgroundColor('#05050c');
    this.cameras.main.fadeIn(CENA_FASE_FINAL.FADE_IN_MS, 0, 0, 0);

    this.exterior = new ExteriorFaseFinal(this);
    this.jogador = new JogadorFaseFinal(this, E.SPAWN);
    this.physics.add.collider(this.jogador.sprite, this.exterior.solidos);
    this.clima = new ClimaFaseFinal(this, E.CHAO_Y);

    this.criarValdir();
    this.criarHud();
    this.configurarTerminal();
    this.criarEfeitoCRT(this.scale.width, this.scale.height, CENA_FASE_FINAL.OPACIDADE_CRT);

    this.estado = 'pan';
    this.exterior.iniciarPan(HUD_FASE_FINAL.PULAR_PAN, E.SPAWN, () => this.comecarJogo());
  }

  private criarValdir(): void {
    this.avatarValdir = avatarHtml(retratoValdir(), 'VALDIR');
    this.valdir = new NpcFaseFinal(this, {
      id: 'valdir',
      x: E.VALDIR.x,
      pesY: E.CHAO_Y,
      textura: TEX_EXTERIOR.VALDIR,
      animacao: 'ff-valdir-respira',
      prompt: HUD_FASE_FINAL.PROMPT_VALDIR,
      raioInteracao: E.VALDIR.raioInteracao,
      humano: true,
      falas: (visita) =>
        falasValdir(
          visita,
          { termoAceito: this.contextoTermo.aceito, recusas: this.contextoTermo.recusas },
          this.avatarValdir
        ),
    });
    this.valdir.aoTerminarConversa = () => {
      if (!this.conversouComValdir) {
        this.conversouComValdir = true;
        if (!this.contextoTermo.aceito) this.definirObjetivo(HUD_FASE_FINAL.OBJETIVOS.TERMO);
      }
    };
  }

  private criarHud(): void {
    this.criarHUDSuperior(HUD_FASE_FINAL.SETOR);
    const prof = CENA_FASE_FINAL.PROFUNDIDADE_HUD;
    this.textoObjetivo = this.add
      .text(20, 48, HUD_FASE_FINAL.OBJETIVOS.PORTEIRO, {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '13px',
        color: '#22e5ff',
        backgroundColor: 'rgba(5, 5, 12, 0.75)',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(prof)
      .setAlpha(0);

    this.textoNotificacao = this.add
      .text(this.scale.width / 2, 110, '', {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#eef0ff',
        align: 'center',
        backgroundColor: 'rgba(5, 5, 12, 0.85)',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(prof + 1)
      .setAlpha(0);

    this.promptTermo = this.add
      .text(E.TERMINAL_TERMO.x, E.CHAO_Y + INTERACAO_FASE_FINAL.OFFSET_PROMPT_Y - 40, HUD_FASE_FINAL.PROMPT_TERMO, {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '12px',
        color: '#ff2bd6',
        backgroundColor: 'rgba(5, 5, 12, 0.85)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(90)
      .setVisible(false);
  }

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFaseFinal);
  }

  /** Fim do pan: a câmera passa a seguir o jogador. */
  private comecarJogo(): void {
    if (this.estado !== 'pan') return;
    this.estado = 'livre';
    const c = CAMERA_FASE_FINAL;
    const cam = this.cameras.main;
    cam.startFollow(this.jogador.sprite, true, c.LERP_X, c.LERP_Y);
    cam.setDeadzone(c.DEADZONE_LARGURA, c.DEADZONE_ALTURA);
    this.tweens.add({ targets: this.textoObjetivo, alpha: 1, duration: 500 });
  }

  /* =========================================================================
   * LAÇO
   * ========================================================================= */

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);
    if (!this.jogador) return;

    this.exterior.update(tempo, delta);
    this.clima.update(tempo, delta);

    if (this.estado !== 'livre') {
      this.jogador.ficarParado();
      return;
    }

    const menuAberto = this.terminal.estaAberto || this.comunicador.estaAtivo;
    if (menuAberto) {
      if (!this.congelado) this.congelar();
      this.valdir.esconderPrompt();
      this.promptTermo.setVisible(false);
      return;
    }
    if (this.congelado) this.descongelar();

    this.jogador.update(tempo, delta);
    this.tratarInteracoes();
    this.verificarEntradaNaTorre();

    if (this.jogador.y > E.CHAO_Y + 300) this.voltarAoCheckpoint();
  }

  private tratarInteracoes(): void {
    const apertouE = this.jogador.interagirApertado();
    const { x, y } = this.jogador;

    if (this.valdir.update(x, y, apertouE, this.comunicador)) return;

    const pertoDoTermo =
      !this.contextoTermo.aceito &&
      Math.abs(x - E.TERMINAL_TERMO.x) <= E.TERMINAL_TERMO.raioInteracao &&
      this.jogador.noChao;
    this.promptTermo.setVisible(pertoDoTermo);
    if (pertoDoTermo && apertouE) this.abrirTermo();
  }

  /* =========================================================================
   * TERMO DE CIÊNCIA
   * ========================================================================= */

  private abrirTermo(): void {
    this.promptTermo.setVisible(false);
    this.terminal.abrir({
      titulo: TEXTOS_TERMO.TITULO,
      linhasIniciais: [...TEXTOS_TERMO.ENUNCIADO],
      contexto: this.contextoTermo,
      aoSubmeter: (resultado) => this.aoSubmeterTermo(resultado),
      permitirFecharComEsc: true,
    });
  }

  private aoSubmeterTermo(resultado: ResultadoComando): void {
    switch (resultado.acao) {
      case ACOES_FASE_FINAL.TERMO_RECUSADO:
        this.contextoTermo.recusas++;
        this.terminal.imprimirLinha(TEXTOS_TERMO.PERGUNTA, 'info');
        break;
      case ACOES_FASE_FINAL.TERMO_INVALIDO:
        this.contextoTermo.invalidos++;
        this.terminal.imprimirLinha(TEXTOS_TERMO.PERGUNTA, 'info');
        break;
      case ACOES_FASE_FINAL.TERMO_ACEITO:
        this.aceitarTermo();
        break;
    }
  }

  private aceitarTermo(): void {
    if (this.contextoTermo.aceito) return;
    this.contextoTermo.aceito = true;
    this.time.delayedCall(1400, () => {
      this.terminal.fecharForcado();
      this.exterior.abrirPorta();
      this.cameras.main.shake(220, 0.003);
      const cp = CHECKPOINTS_FASE_FINAL.TERMO;
      this.salvarCheckpoint(cp.id, cp.ponto, cp.nome);
      this.definirObjetivo(HUD_FASE_FINAL.OBJETIVOS.ENTRAR);
      this.mostrarNotificacao(NOTIFICACOES_FASE_FINAL.PORTA_ABERTA);
    });
  }

  /* =========================================================================
   * ENTRADA NA TORRE (os andares entram na etapa 2)
   * ========================================================================= */

  private verificarEntradaNaTorre(): void {
    if (!this.exterior.portaAberta || this.jogador.x < E.PORTA.GATILHO_ENTRADA_X) return;
    this.estado = 'transicao';
    this.jogador.ficarParado();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.jogador.respawnar(this.checkpoint.ponto);
      this.cameras.main.fadeIn(500, 0, 0, 0);
      this.mostrarNotificacao(HUD_FASE_FINAL.ANDARES_EM_CONSTRUCAO, 3000);
      this.estado = 'livre';
    });
  }

  /* =========================================================================
   * CHECKPOINTS, CONGELAMENTO E HUD
   * ========================================================================= */

  private salvarCheckpoint(id: string, ponto: Ponto, nome: string): void {
    this.checkpoint = { id, ponto: { ...ponto } };
    this.mostrarNotificacao(nome, 1800);
  }

  private voltarAoCheckpoint(): void {
    this.jogador.respawnar(this.checkpoint.ponto);
    this.cameras.main.flash(200, 255, 255, 255);
  }

  private congelar(): void {
    this.congelado = true;
    this.jogador.congelar();
    this.physics.world.pause();
  }

  private descongelar(): void {
    this.congelado = false;
    this.physics.world.resume();
    this.jogador.liberarGravidade();
  }

  private definirObjetivo(texto: string): void {
    this.textoObjetivo.setText(texto);
    this.tweens.killTweensOf(this.textoObjetivo);
    this.textoObjetivo.setAlpha(0.2);
    this.tweens.add({ targets: this.textoObjetivo, alpha: 1, duration: 200, yoyo: true, repeat: 2, onComplete: () => this.textoObjetivo.setAlpha(1) });
  }

  private mostrarNotificacao(texto: string, duracaoMs: number = 2400): void {
    const t = this.textoNotificacao;
    this.tweens.killTweensOf(t);
    t.setText(texto).setAlpha(1);
    this.tweens.add({ targets: t, alpha: 0, delay: duracaoMs, duration: 500 });
  }
}
