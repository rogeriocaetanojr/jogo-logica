import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { AndarFaseFinal } from './andares/AndarFaseFinal';
import { TOTAL_ANDARES, obterAndar } from './andares/configAndares';
import { avatarHtml, retratoMegaBrain } from './ArteFaseFinal';
import { ClimaFaseFinal } from './ClimaFaseFinal';
import {
  ANDAR_FASE_FINAL,
  CAMERA_FASE_FINAL,
  CENA_FASE_FINAL,
  CHECKPOINTS_FASE_FINAL,
  EXTERIOR_FASE_FINAL,
  INTERACAO_FASE_FINAL,
  TRANSICAO_ELEVADOR,
} from './constantesFaseFinal';
import {
  ANUNCIOS_ANDAR,
  FALANTES,
  HUD_FASE_FINAL,
  NOTIFICACOES_FASE_FINAL,
  TEXTOS_ANDAR,
  DRONE_TCHAU,
  FALA_RECEPCIONISTA_ERRO,
  textoDestinoElevador,
  textoPassageirosElevador,
  TEXTOS_TERMO,
  falasValdir,
} from './DialogosFaseFinal';
import { ExteriorFaseFinal } from './exterior/ExteriorFaseFinal';
import { TEX_EXTERIOR, retratoValdir } from './exterior/TexturasExterior';
import {
  ACOES_FASE_FINAL,
  type ContextoPuzzleAndar,
  type ContextoTermo,
  interpretarComandoFaseFinal,
} from './InterpretadorFaseFinal';
import { JogadorFaseFinal, type Ponto } from './JogadorFaseFinal';
import { NpcFaseFinal } from './NpcFaseFinal';
import { TEX_DRONE_CAPTCHA, gerarTexturaDrone } from './npcs/TexturasNpc';
import { ESTADO_INICIAL_PUZZLE } from './puzzles/avaliadoresPuzzle';
import { ERROS_PARA_DICA, PUZZLES, TEXTOS_PUZZLE } from './puzzles/definicoesPuzzles';
import type { DadosErroPuzzle } from './puzzles/tiposPuzzle';
import { LegendaMegaBrain, balaoFala } from './BalaoFala';

/** Contexto do terminal do andar antes de saber qual andar é. */
function contextoAndarVazio(): ContextoPuzzleAndar {
  return {
    puzzle: 'andar',
    id: 'sequencia',
    resolvido: false,
    erros: 0,
    estado: { ...ESTADO_INICIAL_PUZZLE },
    fatos: { numeroAndar: 1, humanos: 0 },
  };
}

/** Dados passados ao reiniciar a cena para trocar de trecho. */
export interface DadosCenaFaseFinal {
  trecho?: 'exterior' | 'andar';
  andar?: number;
  mortes?: number;
}

type EstadoCena = 'pan' | 'chegada' | 'livre' | 'transicao';

interface Checkpoint {
  id: string;
  ponto: Ponto;
}

const E = EXTERIOR_FASE_FINAL;
const A = ANDAR_FASE_FINAL;
const FONTE = 'Consolas, Courier New, monospace';

/**
 * Fase Final: Mega Brain World.
 * Cada trecho (exterior, andar 1..5) é a mesma cena reiniciada com dados diferentes:
 * o exterior tem o pan, o Valdir e o termo; os andares são montados por AndarFaseFinal
 * a partir de configAndares.ts. O boss e o final entram nas próximas etapas.
 */
export class CenaFaseFinal extends CenaBase {
  private trecho: 'exterior' | 'andar' = 'exterior';
  private numeroAndar: number = 1;
  private mortes: number = 0;
  private estado: EstadoCena = 'pan';
  private congelado: boolean = false;
  private checkpoint: Checkpoint = { id: 'inicio', ponto: { ...E.SPAWN } };

  private jogador!: JogadorFaseFinal;
  private textoObjetivo!: Phaser.GameObjects.Text;
  private textoNotificacao!: Phaser.GameObjects.Text;
  private avatarMegaBrain: string = '';

  // Exterior
  private exterior?: ExteriorFaseFinal;
  private clima?: ClimaFaseFinal;
  private valdir?: NpcFaseFinal;
  private promptTermo?: Phaser.GameObjects.Text;
  private contextoTermo: ContextoTermo = { puzzle: 'termo', aceito: false, recusas: 0, invalidos: 0 };
  private conversouComValdir: boolean = false;

  // Andar
  private andar?: AndarFaseFinal;
  private contextoPuzzle: ContextoPuzzleAndar = contextoAndarVazio();
  private emConsequencia: boolean = false;
  private legenda!: LegendaMegaBrain;
  private promptTerminal?: Phaser.GameObjects.Text;
  private promptElevador?: Phaser.GameObjects.Text;
  private tentativasElevadorTravado: number = 0;

  constructor() {
    super('CenaFaseFinal', 'fase_final');
  }

  init(dados?: DadosCenaFaseFinal): void {
    this.trecho = dados?.trecho ?? 'exterior';
    this.numeroAndar = dados?.andar ?? 1;
    this.mortes = dados?.mortes ?? 0;
    this.estado = this.trecho === 'exterior' ? 'pan' : 'chegada';
    this.congelado = false;
    this.checkpoint = { id: 'inicio', ponto: { ...E.SPAWN } };
    this.exterior = undefined;
    this.clima = undefined;
    this.valdir = undefined;
    this.andar = undefined;
    this.contextoTermo = { puzzle: 'termo', aceito: false, recusas: 0, invalidos: 0 };
    this.conversouComValdir = false;
    this.contextoPuzzle = contextoAndarVazio();
    this.emConsequencia = false;
    this.tentativasElevadorTravado = 0;
  }

  create(): void {
    super.create();
    this.terminal.definirInterpretador(interpretarComandoFaseFinal);
    this.avatarMegaBrain = avatarHtml(retratoMegaBrain(), 'MEGA BRAIN');
    this.cameras.main.setBackgroundColor('#05050c');

    if (this.trecho === 'andar') this.montarAndar();
    else this.montarExterior();

    this.criarEfeitoCRT(this.scale.width, this.scale.height, CENA_FASE_FINAL.OPACIDADE_CRT);
  }

  /* =========================================================================
   * HUD COMUM
   * ========================================================================= */

  private criarHud(setor: string, objetivo: string): void {
    this.criarHUDSuperior(setor);
    const prof = CENA_FASE_FINAL.PROFUNDIDADE_HUD;
    this.textoObjetivo = this.add
      .text(20, 48, objetivo, {
        fontFamily: FONTE,
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
        fontFamily: FONTE,
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
  }

  private criarPrompt(x: number, y: number, texto: string, cor: string): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, texto, {
        fontFamily: FONTE,
        fontSize: '12px',
        color: cor,
        backgroundColor: 'rgba(5, 5, 12, 0.85)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(90)
      .setVisible(false);
  }

  private seguirJogador(): void {
    const c = CAMERA_FASE_FINAL;
    const cam = this.cameras.main;
    cam.startFollow(this.jogador.sprite, true, c.LERP_X, c.LERP_Y);
    cam.setDeadzone(c.DEADZONE_LARGURA, c.DEADZONE_ALTURA);
  }

  /* =========================================================================
   * EXTERIOR
   * ========================================================================= */

  private montarExterior(): void {
    const alturaMundo = E.CHAO_Y + 100 - E.TOPO_MUNDO_Y;
    this.physics.world.setBounds(0, E.TOPO_MUNDO_Y, E.LARGURA, alturaMundo);
    this.physics.world.checkCollision.down = true;
    this.cameras.main.setBounds(0, E.TOPO_MUNDO_Y, E.LARGURA, alturaMundo);
    this.cameras.main.fadeIn(CENA_FASE_FINAL.FADE_IN_MS, 0, 0, 0);

    this.exterior = new ExteriorFaseFinal(this);
    this.jogador = new JogadorFaseFinal(this, E.SPAWN);
    this.physics.add.collider(this.jogador.sprite, this.exterior.solidos);
    this.clima = new ClimaFaseFinal(this, E.CHAO_Y);

    this.criarValdir();
    this.criarHud(HUD_FASE_FINAL.SETOR, HUD_FASE_FINAL.OBJETIVOS.PORTEIRO);
    this.promptTermo = this.criarPrompt(
      E.TERMINAL_TERMO.x,
      E.CHAO_Y + INTERACAO_FASE_FINAL.OFFSET_PROMPT_Y - 40,
      HUD_FASE_FINAL.PROMPT_TERMO,
      '#ff2bd6'
    );

    this.estado = 'pan';
    this.exterior.iniciarPan(HUD_FASE_FINAL.PULAR_PAN, E.SPAWN, () => {
      if (this.estado !== 'pan') return;
      this.estado = 'livre';
      this.seguirJogador();
      this.tweens.add({ targets: this.textoObjetivo, alpha: 1, duration: 500 });
    });
  }

  private criarValdir(): void {
    const avatar = avatarHtml(retratoValdir(), 'VALDIR');
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
        falasValdir(visita, { termoAceito: this.contextoTermo.aceito, recusas: this.contextoTermo.recusas }, avatar),
    });
    this.valdir.aoTerminarConversa = () => {
      if (this.conversouComValdir) return;
      this.conversouComValdir = true;
      if (!this.contextoTermo.aceito) this.definirObjetivo(HUD_FASE_FINAL.OBJETIVOS.TERMO);
    };
  }

  private interacoesExterior(apertouE: boolean): void {
    const { x, y } = this.jogador;
    if (this.valdir?.update(x, y, apertouE, this.comunicador)) return;

    const pertoDoTermo =
      !this.contextoTermo.aceito &&
      Math.abs(x - E.TERMINAL_TERMO.x) <= E.TERMINAL_TERMO.raioInteracao &&
      this.jogador.noChao;
    this.promptTermo?.setVisible(pertoDoTermo);
    if (pertoDoTermo && apertouE) this.abrirTermo();

    if (this.exterior?.portaAberta && x >= E.PORTA.GATILHO_ENTRADA_X) this.entrarNaTorre();
  }

  private abrirTermo(): void {
    this.promptTermo?.setVisible(false);
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
      this.exterior?.abrirPorta();
      this.cameras.main.shake(220, 0.003);
      const cp = CHECKPOINTS_FASE_FINAL.TERMO;
      this.salvarCheckpoint(cp.id, cp.ponto, cp.nome);
      this.definirObjetivo(HUD_FASE_FINAL.OBJETIVOS.ENTRAR);
      this.mostrarNotificacao(NOTIFICACOES_FASE_FINAL.PORTA_ABERTA);
    });
  }

  private entrarNaTorre(): void {
    this.estado = 'transicao';
    this.jogador.ficarParado();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.irPara({ trecho: 'andar', andar: 1 });
    });
  }

  /* =========================================================================
   * ANDARES
   * ========================================================================= */

  private montarAndar(): void {
    const cfg = obterAndar(this.numeroAndar);
    this.physics.world.setBounds(0, 0, cfg.largura, A.ALTURA);
    this.physics.world.checkCollision.down = false;
    this.cameras.main.setBounds(0, 0, cfg.largura, A.ALTURA);

    this.andar = new AndarFaseFinal(this, cfg);
    this.contextoPuzzle = {
      ...contextoAndarVazio(),
      id: cfg.puzzle.id,
      fatos: { numeroAndar: cfg.numero, humanos: this.andar.humanos },
    };
    this.legenda = new LegendaMegaBrain(this);
    this.jogador = new JogadorFaseFinal(this, this.andar.spawn);
    this.physics.add.collider(this.jogador.sprite, this.andar.solidos);
    this.physics.add.collider(this.jogador.sprite, this.andar.umaVia, undefined, (j, p) => {
      const corpoJ = (j as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
      const corpoP = (p as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.StaticBody;
      return corpoJ.velocity.y >= 0 && corpoJ.bottom <= corpoP.top + 12;
    });
    this.checkpoint = { id: `andar${cfg.numero}`, ponto: { ...this.andar.spawn } };

    this.criarHud(TEXTOS_ANDAR.setor(cfg.numero, cfg.nome), TEXTOS_ANDAR.OBJETIVO_PUZZLE);
    this.promptTerminal = this.criarPrompt(cfg.puzzle.terminalX, A.CHAO_Y - 140, TEXTOS_ANDAR.PROMPT_TERMINAL, cfg.tema.acento);
    this.promptElevador = this.criarPrompt(cfg.elevadorX, A.CHAO_Y - A.ELEVADOR.ALTURA - 24, '', cfg.tema.acento);

    this.cameras.main.centerOn(this.andar.spawn.x, A.ALTURA / 2);
    this.seguirJogador();
    this.estado = 'chegada';
    this.cameras.main.fadeIn(TRANSICAO_ELEVADOR.FADE_MS, 0, 0, 0);

    const elevador = this.andar.elevadorEntrada;
    if (elevador) {
      // Chega dentro do elevador: portas abrem e o jogador sai
      elevador.definirAberto(false);
      elevador.folhasNaFrente(true);
      this.time.delayedCall(TRANSICAO_ELEVADOR.FADE_MS + 200, () => {
        elevador.abrir(A.ELEVADOR.PORTA_MS, () => {
          elevador.folhasNaFrente(false);
          this.chegarNoAndar();
        });
      });
    } else {
      this.time.delayedCall(TRANSICAO_ELEVADOR.FADE_MS, () => this.chegarNoAndar());
    }
  }

  private chegarNoAndar(): void {
    if (!this.andar) return;
    const cfg = this.andar.cfg;
    this.estado = 'livre';
    this.tweens.add({ targets: this.textoObjetivo, alpha: 1, duration: 500 });
    this.mostrarBannerAndar(cfg.numero, cfg.nome, cfg.conceito);
    const anuncio = ANUNCIOS_ANDAR[cfg.numero];
    if (anuncio) {
      this.time.delayedCall(TRANSICAO_ELEVADOR.NOME_ANDAR_MS, () => {
        if (this.estado !== 'livre' || this.terminal.estaAberto) return;
        this.comunicador.iniciarDialogo([{ falante: FALANTES.MEGA_BRAIN, texto: anuncio, avatar: this.avatarMegaBrain }]);
      });
    }
  }

  private interacoesAndar(apertouE: boolean): void {
    const andar = this.andar;
    if (!andar) return;
    const { x, y } = this.jogador;
    const cfg = andar.cfg;

    for (const npc of andar.npcs) {
      if (npc.update(x, y, apertouE, this.comunicador)) return;
    }

    const pertoTerminal =
      !this.contextoPuzzle.resolvido &&
      !this.emConsequencia &&
      Math.abs(x - cfg.puzzle.terminalX) <= A.RAIO_TERMINAL &&
      this.jogador.noChao;
    this.promptTerminal?.setVisible(pertoTerminal);
    if (pertoTerminal && apertouE) {
      this.abrirTerminalAndar();
      return;
    }

    const elevador = andar.elevadorSaida;
    const pertoElevador = elevador.naPorta(x) && this.jogador.noChao && !this.emConsequencia;
    this.promptElevador
      ?.setText(elevador.destravado ? TEXTOS_ANDAR.PROMPT_ELEVADOR : TEXTOS_ANDAR.PROMPT_ELEVADOR_TRAVADO)
      .setVisible(pertoElevador);
    if (!pertoElevador || !apertouE) return;
    if (elevador.destravado) {
      this.viajarDeElevador();
    } else {
      const avisos = TEXTOS_ANDAR.ELEVADOR_TRAVADO;
      this.mostrarNotificacao(avisos[Math.min(this.tentativasElevadorTravado, avisos.length - 1)], 1800);
      this.tentativasElevadorTravado++;
      this.cameras.main.shake(120, 0.002);
    }
  }

  /** Terminal do puzzle: enunciado, código atual do Mega Brain e como responder. */
  private abrirTerminalAndar(): void {
    const def = PUZZLES[this.contextoPuzzle.id];
    this.promptTerminal?.setVisible(false);
    this.terminal.abrir({
      titulo: `ANDAR ${this.numeroAndar} // ${def.titulo}`,
      linhasIniciais: [
        ...def.enunciado,
        '',
        TEXTOS_PUZZLE.CABECALHO_CODIGO,
        ...def.codigo(this.contextoPuzzle.estado),
        '',
        ...def.comoResponder,
        TEXTOS_PUZZLE.AJUDA_COMANDOS,
      ],
      contexto: this.contextoPuzzle,
      aoSubmeter: (resultado) => this.aoSubmeterPuzzle(resultado),
      permitirFecharComEsc: true,
    });
  }

  private aoSubmeterPuzzle(resultado: ResultadoComando): void {
    if (resultado.acao === ACOES_FASE_FINAL.PUZZLE_RESOLVIDO) {
      this.resolverPuzzleDoAndar();
      return;
    }
    if (resultado.acao !== ACOES_FASE_FINAL.PUZZLE_ERRADO) return;
    const ultimo = this.contextoPuzzle.ultimo;
    if (ultimo?.status !== 'errado') return;

    // Código válido, mas errado: fecha o terminal para o jogador ver o que o código fez
    this.contextoPuzzle.erros++;
    this.emConsequencia = true;
    this.time.delayedCall(1300, () => {
      this.terminal.fecharForcado();
      this.mostrarConsequencia(ultimo.dados, () => {
        this.emConsequencia = false;
        this.comentarErro();
      });
    });
  }

  /** O que o código errado faz no cenário, por tipo de bloqueio. */
  private mostrarConsequencia(dados: DadosErroPuzzle, aoTerminar: () => void): void {
    const andar = this.andar;
    if (!andar) return aoTerminar();
    const bloqueio = andar.bloqueio;
    switch (andar.cfg.puzzle.bloqueio.tipo) {
      case 'catraca': {
        const recepcionista = andar.npc('recepcionista');
        if (recepcionista) {
          this.time.delayedCall(250, () =>
            balaoFala(this, recepcionista.sprite.x, recepcionista.sprite.y - 130, FALA_RECEPCIONISTA_ERRO)
          );
        }
        bloqueio.consequenciaCatraca(aoTerminar);
        break;
      }
      case 'elevador': {
        const destino = dados.destino ?? 0;
        const passageiros = dados.passageiros ?? 0;
        const humanos = dados.humanos ?? 0;
        const aviso =
          destino !== this.numeroAndar + 1
            ? textoDestinoElevador(destino, this.numeroAndar)
            : textoPassageirosElevador(passageiros, humanos);
        andar.elevadorSaida.viagemFantasma(this.numeroAndar, destino, () => this.mostrarNotificacao(aviso, 2600), aoTerminar);
        break;
      }
      case 'laser':
        gerarTexturaDrone(this);
        bloqueio.consequenciaLaser(TEX_DRONE_CAPTCHA, `${TEX_DRONE_CAPTCHA}-voa`, (drone) => {
          balaoFala(this, drone.x, drone.y - 26, DRONE_TCHAU, 1500);
          this.time.delayedCall(1200, aoTerminar);
        });
        break;
      case 'ponte':
        bloqueio.consequenciaPonte(dados.placas ?? 0, aoTerminar);
        break;
      case 'comportas':
        bloqueio.consequenciaComportas(dados.comporta ?? 1, aoTerminar);
        break;
    }
  }

  /** Comentário do Mega Brain depois do erro; a partir do 3º erro vem com a dica. */
  private comentarErro(): void {
    const def = PUZZLES[this.contextoPuzzle.id];
    const erros = this.contextoPuzzle.erros;
    const comentario = def.comentarios[(erros - 1) % def.comentarios.length];
    this.legenda.mostrar(TEXTOS_PUZZLE.FALANTE_LEGENDA, comentario, erros >= ERROS_PARA_DICA ? def.dica : undefined);
  }

  private resolverPuzzleDoAndar(): void {
    if (this.contextoPuzzle.resolvido || !this.andar) return;
    this.contextoPuzzle.resolvido = true;
    const def = PUZZLES[this.contextoPuzzle.id];
    this.time.delayedCall(1300, () => {
      this.terminal.fecharForcado();
      this.andar?.resolverPuzzle();
      this.definirObjetivo(TEXTOS_ANDAR.OBJETIVO_ELEVADOR);
      this.mostrarNotificacao(TEXTOS_ANDAR.PUZZLE_RESOLVIDO);
      this.time.delayedCall(900, () => this.legenda.mostrar(TEXTOS_PUZZLE.FALANTE_LEGENDA, def.comentarioAcerto));
    });
  }

  /** Portas fecham com o jogador dentro, o visor sobe e a cena reinicia no próximo andar. */
  private viajarDeElevador(): void {
    const andar = this.andar;
    if (!andar) return;
    const elevador = andar.elevadorSaida;
    const t = TRANSICAO_ELEVADOR;
    this.estado = 'transicao';
    this.promptElevador?.setVisible(false);
    this.jogador.respawnar({ x: elevador.x, y: this.jogador.y });
    elevador.folhasNaFrente(true);
    elevador.fechar(t.PORTA_FECHA_MS, () => {
      if (this.numeroAndar >= TOTAL_ANDARES) {
        // O terraço (boss) entra na etapa 5
        this.mostrarNotificacao(TEXTOS_ANDAR.TERRACO_EM_OBRAS, 2600);
        this.time.delayedCall(900, () =>
          elevador.abrir(A.ELEVADOR.PORTA_MS, () => {
            elevador.folhasNaFrente(false);
            this.estado = 'livre';
          })
        );
        return;
      }
      this.mostrarViagem(this.numeroAndar, this.numeroAndar + 1, () => {
        this.cameras.main.fadeOut(t.FADE_MS, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.irPara({ trecho: 'andar', andar: this.numeroAndar + 1 });
        });
      });
    });
  }

  /** Painel do visor do elevador: número atual, seta subindo, próximo número. */
  private mostrarViagem(de: number, para: number, aoTerminar: () => void): void {
    const t = TRANSICAO_ELEVADOR;
    const { width, height } = this.scale;
    const prof = CENA_FASE_FINAL.PROFUNDIDADE_HUD + 10;
    const fundo = this.add.rectangle(0, 0, width, height, 0x05050c, 0).setOrigin(0).setScrollFactor(0).setDepth(prof);
    const visor = this.add
      .text(width / 2, height / 2 - 30, String(de), {
        fontFamily: FONTE,
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#ff2a3d',
        backgroundColor: '#05070f',
        padding: { x: 40, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(prof + 1)
      .setAlpha(0);
    visor.setShadow(0, 0, '#ff2a3d', 18, false, true);
    const piadas = TEXTOS_ANDAR.VIAGEM;
    const legenda = this.add
      .text(width / 2, height / 2 + 70, `${TEXTOS_ANDAR.SUBINDO}\n${piadas[(de - 1) % piadas.length]}`, {
        fontFamily: FONTE,
        fontSize: '15px',
        color: '#22e5ff',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(prof + 1)
      .setAlpha(0);

    this.tweens.add({ targets: fundo, fillAlpha: 0.88, duration: 250 });
    this.tweens.add({ targets: [visor, legenda], alpha: 1, duration: 250 });
    const passo = t.VISOR_MS / 3;
    this.time.delayedCall(passo, () => visor.setText('▲'));
    this.time.delayedCall(passo * 2, () => {
      visor.setText(String(para)).setColor('#22e5ff');
      visor.setShadow(0, 0, '#22e5ff', 18, false, true);
    });
    this.time.delayedCall(t.VISOR_MS, aoTerminar);
  }

  private mostrarBannerAndar(numero: number, nome: string, conceito: string): void {
    const { width } = this.scale;
    const prof = CENA_FASE_FINAL.PROFUNDIDADE_HUD + 2;
    const titulo = this.add
      .text(width / 2, 250, TEXTOS_ANDAR.BANNER_TITULO(numero), {
        fontFamily: FONTE,
        fontSize: '54px',
        fontStyle: 'bold',
        color: '#eef0ff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(prof)
      .setAlpha(0);
    titulo.setShadow(0, 0, this.andar?.cfg.tema.acento ?? '#22e5ff', 16, false, true);
    const sub = this.add
      .text(width / 2, 300, TEXTOS_ANDAR.BANNER_SUBTITULO(nome, conceito), {
        fontFamily: FONTE,
        fontSize: '17px',
        color: this.andar?.cfg.tema.acento ?? '#22e5ff',
        backgroundColor: 'rgba(5, 5, 12, 0.8)',
        padding: { x: 12, y: 5 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(prof)
      .setAlpha(0);
    this.tweens.add({
      targets: [titulo, sub],
      alpha: 1,
      duration: 350,
      hold: TRANSICAO_ELEVADOR.NOME_ANDAR_MS - 700,
      yoyo: true,
      onComplete: () => {
        titulo.destroy();
        sub.destroy();
      },
    });
  }

  /* =========================================================================
   * LAÇO
   * ========================================================================= */

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);
    if (!this.jogador) return;

    this.exterior?.update(tempo, delta);
    this.clima?.update(tempo, delta);
    this.andar?.update(tempo, delta);

    if (this.estado !== 'livre') {
      this.jogador.ficarParado();
      return;
    }

    if (this.terminal.estaAberto || this.comunicador.estaAtivo) {
      if (!this.congelado) this.congelar();
      this.valdir?.esconderPrompt();
      this.andar?.npcs.forEach((n) => n.esconderPrompt());
      this.promptTermo?.setVisible(false);
      this.promptTerminal?.setVisible(false);
      this.promptElevador?.setVisible(false);
      return;
    }
    if (this.congelado) this.descongelar();

    this.jogador.update(tempo, delta);
    const apertouE = this.jogador.interagirApertado();
    if (this.trecho === 'exterior') this.interacoesExterior(apertouE);
    else this.interacoesAndar(apertouE);

    if (this.jogador.y > A.LIMITE_QUEDA_Y) this.cair();
  }

  /* =========================================================================
   * CHECKPOINTS, CONGELAMENTO E UTILITÁRIOS
   * ========================================================================= */

  private irPara(dados: DadosCenaFaseFinal): void {
    this.terminal.fecharForcado();
    this.comunicador.finalizarDialogo();
    this.scene.restart({ ...dados, mortes: this.mortes });
  }

  private salvarCheckpoint(id: string, ponto: Ponto, nome: string): void {
    this.checkpoint = { id, ponto: { ...ponto } };
    this.mostrarNotificacao(nome, 1800);
  }

  private cair(): void {
    this.mortes++;
    this.jogador.respawnar(this.checkpoint.ponto);
    this.cameras.main.flash(200, 255, 255, 255);
    if (this.trecho === 'andar') this.mostrarNotificacao(TEXTOS_ANDAR.QUEDA, 1800);
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
    this.tweens.add({
      targets: this.textoObjetivo,
      alpha: 1,
      duration: 200,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.textoObjetivo.setAlpha(1),
    });
  }

  private mostrarNotificacao(texto: string, duracaoMs: number = 2400): void {
    const t = this.textoNotificacao;
    this.tweens.killTweensOf(t);
    t.setText(texto).setAlpha(1);
    this.tweens.add({ targets: t, alpha: 0, delay: duracaoMs, duration: 500 });
  }
}
