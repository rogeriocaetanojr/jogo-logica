import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { AndarFaseFinal } from './andares/AndarFaseFinal';
import { TOTAL_ANDARES, obterAndar } from './andares/configAndares';
import { avatarHtml, retratoMegaBrain } from './ArteFaseFinal';
import { ClimaFaseFinal } from './ClimaFaseFinal';
import {
  ANDAR_FASE_FINAL,
  BOSS_FASE_FINAL,
  CAMERA_FASE_FINAL,
  CENA_FASE_FINAL,
  CHECKPOINTS_FASE_FINAL,
  ESCALA_ARTE,
  EXTERIOR_FASE_FINAL,
  FINAL_FASE_FINAL,
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
  FALAS_BOSS,
  TEXTOS_BOSS,
  TEXTOS_REBASE,
  PIADAS_MORTE_ANDAR,
  textoDestinoElevador,
  textoPassageirosElevador,
  TEXTOS_TERMO,
  TEXTOS_FINAL,
  falasValdir,
  linhasCreditos,
} from './DialogosFaseFinal';
import { ExteriorFaseFinal } from './exterior/ExteriorFaseFinal';
import { TEX_EXTERIOR, retratoValdir } from './exterior/TexturasExterior';
import {
  ACOES_FASE_FINAL,
  type ContextoPuzzleAndar,
  type ContextoRebase,
  type ContextoTermo,
  interpretarComandoFaseFinal,
} from './InterpretadorFaseFinal';
import { JogadorFaseFinal, type Ponto } from './JogadorFaseFinal';
import { NpcFaseFinal } from './NpcFaseFinal';
import { TEX_DRONE_CAPTCHA, gerarTexturaDrone } from './npcs/TexturasNpc';
import { ESTADO_INICIAL_PUZZLE } from './puzzles/avaliadoresPuzzle';
import { texAndar } from './andares/TexturasAndar';
import { ERROS_PARA_DICA, PUZZLES, TEXTOS_PUZZLE } from './puzzles/definicoesPuzzles';
import type { DadosErroPuzzle } from './puzzles/tiposPuzzle';
import { LegendaMegaBrain, balaoFala } from './BalaoFala';
import { CombateFaseFinal } from './CombateFaseFinal';
import { InimigosFaseFinal } from './inimigos/InimigosFaseFinal';
import { ArenaBoss } from './boss/ArenaBoss';
import { ARENAS } from './boss/configArenas';
import type { FormaBoss } from './boss/FormaBoss';
import { FormaAguia } from './boss/FormaAguia';
import { FormaCaveira } from './boss/FormaCaveira';
import { FormaCerebro } from './boss/FormaCerebro';
import { estadoInicialRebase, listarRebase } from './boss/RebaseFaseFinal';
import { FormaCopycat } from './boss/FormaCopycat';
import { FormaTita } from './boss/FormaTita';
import { HudBoss } from './boss/HudBoss';
import { QUADROS_BOSS, TEX_BOSS, caminhoCopycat } from './boss/TexturasBoss';
import { type AparenciaForma, brigaEQueda, cerebroViraCopycat, quedaEMorfose } from './boss/TransicaoBoss';
import { TerracoAmanhecer, joinhaNaLava } from './final/CutsceneFinal';
import { CreditosFaseFinal } from './final/CreditosFaseFinal';
import { retratoProtagonista } from './final/TexturasFinal';

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
  trecho?: Trecho;
  andar?: number;
  /** Forma do boss (trecho 'boss'): 1 terraço ... 5 núcleo. */
  forma?: number;
  /** Como se chega na arena: saindo do elevador (forma 1), caindo do andar de cima ou depois de morrer. */
  chegada?: ChegadaBoss;
  mortes?: number;
}

type Trecho = 'exterior' | 'andar' | 'boss' | 'final';
type ChegadaBoss = 'elevador' | 'queda' | 'revanche';
type IdForma = 1 | 2 | 3 | 4 | 5;

/** Etapa da luta final no núcleo: luta → terminal do rebase → queda na lava. */
type FaseNucleo = 'luta' | 'rebase' | 'queda';

function contextoRebaseNovo(): ContextoRebase {
  return { puzzle: 'rebase', estado: estadoInicialRebase(), resolvido: false, tentativas: 0 };
}

/** Como cada forma aparece ao cair junto na arena seguinte (antes de se transformar). */
function aparenciaDaForma(forma: number, personagem: string): AparenciaForma {
  switch (forma) {
    case 1:
      return { textura: TEX_BOSS.copycat(personagem), quadro: 3, escala: 1, origemY: 121 / 128 };
    case 2:
      return { textura: TEX_BOSS.TITA, quadro: QUADROS_BOSS.TITA.TRAVADO, escala: ESCALA_ARTE, origemY: 1 };
    case 3:
      return { textura: TEX_BOSS.AGUIA, quadro: QUADROS_BOSS.AGUIA.PRESA, escala: ESCALA_ARTE, origemY: 1 };
    default:
      return { textura: TEX_BOSS.CAVEIRA, quadro: QUADROS_BOSS.CAVEIRA.TONTA, escala: ESCALA_ARTE, origemY: 1 };
  }
}

type EstadoCena = 'pan' | 'chegada' | 'livre' | 'transicao';

interface Checkpoint {
  id: string;
  ponto: Ponto;
}

const E = EXTERIOR_FASE_FINAL;
const A = ANDAR_FASE_FINAL;
const B = BOSS_FASE_FINAL;
const FONTE = 'Consolas, Courier New, monospace';

/**
 * Fase Final: Mega Brain World.
 * Cada trecho (exterior, andar 1..5) é a mesma cena reiniciada com dados diferentes:
 * o exterior tem o pan, o Valdir e o termo; os andares são montados por AndarFaseFinal
 * a partir de configAndares.ts. O boss e o final entram nas próximas etapas.
 */
export class CenaFaseFinal extends CenaBase {
  private trecho: Trecho = 'exterior';
  private numeroAndar: number = 1;
  private numeroForma: number = 1;
  private chegadaBoss: ChegadaBoss = 'elevador';
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
  private inimigos?: InimigosFaseFinal;
  private combate?: CombateFaseFinal;
  private contextoPuzzle: ContextoPuzzleAndar = contextoAndarVazio();
  private emConsequencia: boolean = false;
  private legenda!: LegendaMegaBrain;
  private promptTerminal?: Phaser.GameObjects.Text;
  private promptElevador?: Phaser.GameObjects.Text;
  private tentativasElevadorTravado: number = 0;

  // Boss
  private arena?: ArenaBoss;
  private boss?: FormaBoss;
  private hudBoss?: HudBoss;
  private faseNucleo: FaseNucleo = 'luta';
  private contextoRebase: ContextoRebase = contextoRebaseNovo();
  private terminalRebase?: Phaser.GameObjects.Sprite;
  private promptRebase?: Phaser.GameObjects.Text;
  private reacaoRebase?: Phaser.Time.TimerEvent;

  // Final
  private amanhecer?: TerracoAmanhecer;
  private creditos?: CreditosFaseFinal;

  constructor() {
    super('CenaFaseFinal', 'fase_final');
  }

  init(dados?: DadosCenaFaseFinal): void {
    this.trecho = dados?.trecho ?? 'exterior';
    this.numeroAndar = dados?.andar ?? 1;
    this.numeroForma = dados?.forma ?? 1;
    this.chegadaBoss = dados?.chegada ?? 'elevador';
    this.mortes = dados?.mortes ?? 0;
    this.estado = this.trecho === 'exterior' ? 'pan' : 'chegada';
    this.congelado = false;
    this.checkpoint = { id: 'inicio', ponto: { ...E.SPAWN } };
    this.exterior = undefined;
    this.clima = undefined;
    this.valdir = undefined;
    this.andar = undefined;
    this.inimigos = undefined;
    this.combate = undefined;
    this.contextoTermo = { puzzle: 'termo', aceito: false, recusas: 0, invalidos: 0 };
    this.conversouComValdir = false;
    this.contextoPuzzle = contextoAndarVazio();
    this.emConsequencia = false;
    this.tentativasElevadorTravado = 0;
    this.arena = undefined;
    this.boss = undefined;
    this.hudBoss = undefined;
    this.faseNucleo = 'luta';
    this.contextoRebase = contextoRebaseNovo();
    this.terminalRebase = undefined;
    this.promptRebase = undefined;
    this.reacaoRebase = undefined;
    this.amanhecer = undefined;
    this.creditos = undefined;
  }

  override preload(): void {
    super.preload();
    for (const personagem of ['alvares', 'reis']) {
      const chave = TEX_BOSS.copycat(personagem);
      if (!this.textures.exists(chave)) {
        this.load.spritesheet(chave, caminhoCopycat(personagem), { frameWidth: 128, frameHeight: 128 });
      }
    }
  }

  create(): void {
    super.create();
    this.terminal.definirInterpretador(interpretarComandoFaseFinal);
    this.avatarMegaBrain = avatarHtml(retratoMegaBrain(), 'MEGA BRAIN');
    this.cameras.main.setBackgroundColor('#05050c');

    if (this.trecho === 'andar') this.montarAndar();
    else if (this.trecho === 'boss') this.montarBoss();
    else if (this.trecho === 'final') this.montarFinal();
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
    // O terminal fica aberto para o jogador ler a resposta; ele fecha com ESC quando quiser
    this.time.delayedCall(600, () => {
      this.terminal.imprimirLinha(TEXTOS_TERMO.FECHAR, 'info');
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
    this.inimigos = new InimigosFaseFinal(this, cfg.inimigos, this.andar.solidos);
    this.combate = new CombateFaseFinal(this, this.jogador, () => this.morrerNoAndar());

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
      // Do último andar o elevador sobe para o terraço, onde começa o boss
      const ultimo = this.numeroAndar >= TOTAL_ANDARES;
      const destino: DadosCenaFaseFinal = ultimo
        ? { trecho: 'boss', forma: 1, chegada: 'elevador' }
        : { trecho: 'andar', andar: this.numeroAndar + 1 };
      this.mostrarViagem(this.numeroAndar, ultimo ? 'T' : this.numeroAndar + 1, () => {
        this.cameras.main.fadeOut(t.FADE_MS, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.irPara(destino));
      });
    });
  }

  /** Painel do visor do elevador: número atual, seta subindo, próximo número (ou T de terraço). */
  private mostrarViagem(de: number, para: number | string, aoTerminar: () => void): void {
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
   * BOSS: MEGA BRAIN (formas 1 a 5 e o rebase final)
   * ========================================================================= */

  /** Uma arena por forma. Morrer recomeça a forma atual (checkpoint por forma). */
  private montarBoss(): void {
    const forma = this.numeroForma;
    const cfg = ARENAS[Math.min(forma, 5)];
    const chegouCaindo = this.chegadaBoss === 'queda';
    this.physics.world.setBounds(0, B.TOPO_MUNDO_Y, B.LARGURA, A.ALTURA - B.TOPO_MUNDO_Y);
    this.physics.world.checkCollision.down = false;
    this.cameras.main.setBounds(0, 0, B.LARGURA, A.ALTURA);

    const nucleo = cfg.tipo === 'nucleo';
    this.arena = new ArenaBoss(this, cfg, chegouCaindo && cfg.tipo !== 'terraco');
    const pontoInicial = nucleo ? B.NUCLEO.SPAWN : B.SPAWN_JOGADOR;
    const spawn = chegouCaindo
      ? { x: nucleo ? B.NUCLEO.QUEDA_JOGADOR_X : B.QUEDA_JOGADOR.x, y: B.QUEDA_JOGADOR.y }
      : this.chegadaBoss === 'elevador'
        ? { x: 110, y: B.SPAWN_JOGADOR.y }
        : { ...pontoInicial };
    this.jogador = new JogadorFaseFinal(this, spawn);
    this.physics.add.collider(this.jogador.sprite, this.arena.solidos);
    this.physics.add.collider(this.jogador.sprite, this.arena.umaVia, undefined, (j, p) => {
      const corpoJ = (j as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
      const corpoP = (p as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.StaticBody;
      return corpoJ.velocity.y >= 0 && corpoJ.bottom <= corpoP.top + 12;
    });
    this.checkpoint = { id: `forma${forma}`, ponto: { ...pontoInicial } };
    this.legenda = new LegendaMegaBrain(this);
    if (cfg.tipo === 'terraco') this.clima = new ClimaFaseFinal(this, B.CHAO_Y);
    this.cameras.main.fadeIn(TRANSICAO_ELEVADOR.FADE_MS, 0, 0, 0);
    this.estado = 'chegada';

    const textos = FALAS_BOSS[forma as IdForma];
    this.combate = new CombateFaseFinal(this, this.jogador, () => this.morrerNoBoss());
    this.boss = this.criarForma(forma as IdForma);
    this.criarHud(TEXTOS_BOSS.SETOR(textos.arena), textos.objetivo);
    this.hudBoss = new HudBoss(this, TEXTOS_BOSS.HUD(forma, textos.nome), this.boss.vidaMaxima);
    const boss = this.boss;

    switch (this.chegadaBoss) {
      case 'revanche':
        // Depois de morrer: sem cutscene, só uma provocação e a luta recomeça
        this.time.delayedCall(450, () => {
          boss.falar(textos.revanche[(this.mortes - 1 + textos.revanche.length) % textos.revanche.length], 1600);
          this.time.delayedCall(B.PREPARO_MS + 300, () => this.comecarLuta());
        });
        break;
      case 'queda':
        this.cameras.main.shake(300, 0.006);
        quedaEMorfose(
          this,
          aparenciaDaForma(forma - 1, this.jogador.tipoPersonagem),
          boss.sprite,
          () => this.apresentarForma(),
          nucleo ? { x: B.CEREBRO.X, chaoY: B.NUCLEO.PLATAFORMA_BOSS.topo } : undefined
        );
        break;
      case 'elevador':
        this.mostrarNotificacao(TEXTOS_BOSS.CHEGADA_TERRACO, 2000);
        boss.sprite.setAlpha(0);
        this.time.delayedCall(1200, () => cerebroViraCopycat(this, boss.sprite, () => this.apresentarForma()));
        break;
    }
  }

  private criarForma(forma: IdForma): FormaBoss {
    switch (forma) {
      case 1:
        return new FormaCopycat(this, this.jogador.tipoPersonagem);
      case 2:
        return new FormaTita(this);
      case 3:
        return new FormaAguia(this);
      case 4:
        return new FormaCaveira(this);
      case 5:
        return new FormaCerebro(this);
    }
  }

  /** Fala de entrada da forma (diálogo), depois a luta começa. */
  private apresentarForma(): void {
    const forma = this.numeroForma as IdForma;
    const textos = FALAS_BOSS[forma];
    const avatar = this.avatarMegaBrain;
    this.comunicador.iniciarDialogo(
      [{ falante: TEXTOS_BOSS.FALANTE(forma, textos.nome), texto: textos.entrada, avatar }],
      () => this.time.delayedCall(B.PREPARO_MS, () => this.comecarLuta())
    );
  }

  private comecarLuta(): void {
    if (!this.boss || this.estado !== 'chegada') return;
    this.estado = 'livre';
    this.tweens.add({ targets: this.textoObjetivo, alpha: 1, duration: 500 });
    this.hudBoss?.mostrar();
    this.boss.iniciar();
  }

  /** Um quadro de luta: pisões, quiques e dano; no último pisão começa a transição. */
  private atualizarBoss(delta: number): void {
    const boss = this.boss;
    const combate = this.combate;
    if (!boss || !combate) return;
    const r = boss.update(delta, this.jogador, combate.podeLevarDano);
    if (r.golpe) {
      combate.pisou(B.QUIQUE_GOLPE);
      this.hudBoss?.atualizar(boss.vida);
      this.cameras.main.flash(120, 255, 255, 255);
      this.cameras.main.shake(180, 0.008);
      // Hitstop: o mundo para por um instante no impacto
      this.physics.world.pause();
      this.time.delayedCall(B.HITSTOP_MS, () => {
        if (!this.congelado) this.physics.world.resume();
      });
    } else if (r.quique) {
      combate.pisou(B.QUIQUE_SEM_JANELA);
    } else if (r.danoDeX !== undefined) {
      combate.ferir(r.danoDeX);
    }
    combate.update();
    if (boss.estado === 'derrotado' && this.estado === 'livre') {
      if (this.numeroForma >= 5) {
        if (this.faseNucleo === 'luta') this.iniciarRebase();
      } else {
        this.encerrarForma();
      }
    }
    if (this.numeroForma >= 5 && this.estado === 'livre' && this.jogador.corpo.bottom >= B.NUCLEO.LAVA_Y - 4) this.tocarLava();
  }

  /* -------------------------------------------------------------------------
   * NÚCLEO: LAVA, TERMINAL DO REBASE E QUEDA DO MEGA BRAIN
   * ------------------------------------------------------------------------- */

  /** Lava tira um coração (na luta) e devolve o jogador à plataforma. Durante o rebase só devolve. */
  private tocarLava(): void {
    this.cameras.main.flash(220, 255, 120, 30);
    this.mostrarNotificacao(TEXTOS_BOSS.LAVA, 1600);
    if (this.faseNucleo === 'luta' && this.combate) {
      this.combate.queimar();
      if (this.estado !== 'livre') return; // morreu: a cena recomeça a forma
    }
    this.jogador.respawnar(this.checkpoint.ponto);
  }

  /** Último olho fechado: o Mega Brain se recolhe e o terminal do rebase sobe na plataforma. */
  private iniciarRebase(): void {
    const boss = this.boss;
    if (!(boss instanceof FormaCerebro)) return;
    this.faseNucleo = 'rebase';
    boss.recolher();
    this.hudBoss?.esconder();
    this.definirObjetivo(TEXTOS_BOSS.OBJETIVO_REBASE);
    this.mostrarNotificacao(TEXTOS_BOSS.TERMINAL_SURGIU, 2400);
    const tema = ARENAS[5].tema;
    const x = 150;
    const topo = B.NUCLEO.PLATAFORMA_JOGADOR.topo;
    this.terminalRebase = this.add.sprite(x, topo + 120, texAndar.terminal(tema), 0).setOrigin(0.5, 1).setScale(ESCALA_ARTE).setDepth(7.8);
    const anim = `${texAndar.terminal(tema)}-pisca`;
    if (this.anims.exists(anim)) this.terminalRebase.play(anim);
    this.tweens.add({ targets: this.terminalRebase, y: topo, duration: 900, ease: 'Back.easeOut' });
    this.cameras.main.shake(500, 0.004);
    this.promptRebase = this.criarPrompt(x, topo - 140, TEXTOS_BOSS.PROMPT_REBASE, '#ffd36b');
  }

  private interacoesRebase(apertouE: boolean): void {
    if (this.faseNucleo !== 'rebase' || !this.terminalRebase) return;
    const perto = Math.abs(this.jogador.x - this.terminalRebase.x) <= A.RAIO_TERMINAL && this.jogador.noChao;
    this.promptRebase?.setVisible(perto);
    if (perto && apertouE) this.abrirRebase();
  }

  private linhasDoRebase(): string[] {
    return listarRebase(this.contextoRebase.estado).map((l) => l.texto);
  }

  private abrirRebase(): void {
    this.promptRebase?.setVisible(false);
    this.terminal.abrir({
      titulo: TEXTOS_REBASE.TITULO,
      linhasIniciais: [
        ...TEXTOS_REBASE.ENUNCIADO,
        '',
        TEXTOS_REBASE.CABECALHO,
        ...this.linhasDoRebase(),
        ...TEXTOS_REBASE.COMO_RESPONDER,
      ],
      contexto: this.contextoRebase,
      aoSubmeter: (resultado) => this.aoSubmeterRebase(resultado),
      permitirFecharComEsc: true,
    });
  }

  /** Depois de cada comando: reimprime o editor do rebase e o Mega Brain reage na tela. */
  private aoSubmeterRebase(resultado: ResultadoComando): void {
    const ultimo = this.contextoRebase.ultimo;
    const boss = this.boss;
    if (!ultimo || ultimo.status === 'formato' || ultimo.status === 'continuar') return;
    this.terminal.imprimirLinha(TEXTOS_REBASE.CABECALHO, 'info');
    for (const linha of listarRebase(this.contextoRebase.estado)) {
      this.terminal.imprimirLinha(linha.texto, linha.acao === 'drop' ? 'erro' : 'info');
    }
    if (!(boss instanceof FormaCerebro)) return;
    if (resultado.acao === ACOES_FASE_FINAL.REBASE_RESOLVIDO) {
      this.derrubarMegaBrain(boss);
      return;
    }
    if (ultimo.status === 'alterado' && ultimo.acao === 'drop') {
      const reacoes: Record<string, number> = {
        a1f3: QUADROS_BOSS.ROSTO.VERGONHA,
        '7c2e': QUADROS_BOSS.ROSTO.RISADA,
        d5e1: QUADROS_BOSS.ROSTO.TONTO,
      };
      boss.mostrarRosto(reacoes[ultimo.hash] ?? QUADROS_BOSS.ROSTO.NEUTRO);
      this.reacaoRebase?.remove();
      this.reacaoRebase = this.time.delayedCall(2500, () => boss.mostrarRosto(QUADROS_BOSS.ROSTO.PROCESSANDO));
    }
  }

  /** drop 9b40: a plataforma some e o Mega Brain afunda na lava, devagar e dramático. */
  private derrubarMegaBrain(boss: FormaCerebro): void {
    this.faseNucleo = 'queda';
    this.reacaoRebase?.remove();
    this.time.delayedCall(1600, () => {
      this.terminal.fecharForcado();
      this.estado = 'transicao';
      this.jogador.ficarParado();
      this.promptRebase?.setVisible(false);
      this.textoObjetivo.setAlpha(0);
      this.arena?.derrubarPlataformaBoss();
      this.time.delayedCall(1300, () => boss.cairNaLava(() => this.joinhaFinal()));
    });
  }

  /** O cérebro sumiu na lava: a mão sobe fazendo joinha, ele promete voltar e tudo fica branco. */
  private joinhaFinal(): void {
    const falante = TEXTOS_FINAL.FALANTE_MEGA_BRAIN;
    const avatar = this.avatarMegaBrain;
    joinhaNaLava(
      this,
      B.CEREBRO.X,
      B.NUCLEO.LAVA_Y,
      (depois) => this.comunicador.iniciarDialogo(TEXTOS_FINAL.VOLTO.map((texto) => ({ falante, texto, avatar })), depois),
      () => {
        this.cameras.main.fadeOut(FINAL_FASE_FINAL.FADE_BRANCO_MS, 255, 255, 255);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.irPara({ trecho: 'final' }));
      }
    );
  }

  /* =========================================================================
   * FINAL: TERRAÇO AO AMANHECER E CRÉDITOS
   * ========================================================================= */

  private montarFinal(): void {
    const F = FINAL_FASE_FINAL;
    this.physics.world.setBounds(0, 0, B.LARGURA, A.ALTURA);
    this.physics.world.checkCollision.down = true;
    this.cameras.main.setBounds(0, 0, B.LARGURA, A.ALTURA);
    this.arena = new ArenaBoss(this, ARENAS[1], false, true);
    this.jogador = new JogadorFaseFinal(this, F.JOGADOR);
    this.physics.add.collider(this.jogador.sprite, this.arena.solidos);
    this.criarHud(TEXTOS_BOSS.SETOR(FALAS_BOSS[1].arena), '');
    this.estado = 'transicao';
    // A fase está vencida a partir daqui: sair pelo ESC nos créditos não perde nada
    this.concluirFaseAtual();
    this.cameras.main.fadeIn(F.FADE_ENTRADA_MS, 255, 255, 255);

    const personagem = this.jogador.tipoPersonagem;
    const avatarJogador = avatarHtml(retratoProtagonista(this, personagem), personagem.toUpperCase());
    const avatarValdir = avatarHtml(retratoValdir(), 'VALDIR');
    this.amanhecer = new TerracoAmanhecer(this);
    this.amanhecer.iniciar({
      falarJogador: (depois) =>
        this.comunicador.iniciarDialogo(
          [{ falante: TEXTOS_FINAL.FALANTE_JOGADOR[personagem], texto: TEXTOS_FINAL.FALA_JOGADOR[personagem], avatar: avatarJogador }],
          depois
        ),
      falarValdir: (depois) =>
        this.comunicador.iniciarDialogo(
          [TEXTOS_FINAL.VALDIR, TEXTOS_FINAL.VALDIR_EXTRA[personagem]].map((texto) => ({
            falante: FALANTES.VALDIR,
            texto,
            avatar: avatarValdir,
          })),
          depois
        ),
      virarJogador: (deFrente, olharEsquerda) => this.jogador.pose(deFrente ? 0 : 2, olharEsquerda),
      comecarCreditos: () => {
        this.creditos = new CreditosFaseFinal(this, linhasCreditos(personagem, this.mortes), () => this.retornarAoHub());
      },
    });
  }

  /** Forma vencida: briga na poeira, o chão quebra e os dois caem para a próxima arena. */
  private encerrarForma(): void {
    const boss = this.boss;
    const arena = this.arena;
    if (!boss || !arena) return;
    this.estado = 'transicao';
    this.textoObjetivo.setAlpha(0);
    this.hudBoss?.esconder();
    brigaEQueda(this, arena, boss.sprite, this.jogador, () =>
      this.irPara({ trecho: 'boss', forma: this.numeroForma + 1, chegada: 'queda' })
    );
  }

  /** Corações acabaram na luta: recomeça a forma atual. */
  private morrerNoBoss(): void {
    if (this.estado !== 'livre') return;
    this.estado = 'transicao';
    this.mortes++;
    this.jogador.congelar();
    this.jogador.sprite.setTint(0xff2a3d);
    this.mostrarNotificacao(`${TEXTOS_BOSS.MORTE}\n${this.piadaDeMorte()}`, 2000);
    this.cameras.main.fadeOut(700, 30, 0, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.irPara({ trecho: 'boss', forma: this.numeroForma, chegada: 'revanche' });
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
    this.arena?.update(tempo, delta);
    if (this.trecho === 'final') {
      this.amanhecer?.update(delta);
      this.creditos?.update(delta);
      return;
    }
    // A queda do Mega Brain na lava continua animando com o jogador parado
    if (this.faseNucleo === 'queda' && this.boss) this.boss.update(delta, this.jogador, false);

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
      this.promptRebase?.setVisible(false);
      return;
    }
    if (this.congelado) this.descongelar();

    this.jogador.update(tempo, delta);
    if (this.trecho === 'boss') {
      this.atualizarBoss(delta);
      const apertouE = this.jogador.interagirApertado();
      if (this.estado === 'livre') this.interacoesRebase(apertouE);
      return;
    }
    if (this.inimigos && this.combate) {
      const r = this.inimigos.update(delta, this.jogador, this.combate.podeLevarDano);
      if (r.pisoes > 0) this.combate.pisou();
      if (r.danoDeX !== undefined) this.combate.ferir(r.danoDeX);
      this.combate.update();
      if (this.estado !== 'livre') return; // morreu neste quadro
    }
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
    if (this.trecho === 'andar') {
      this.inimigos?.resetar();
      this.combate?.restaurar();
      this.mostrarNotificacao(`${TEXTOS_ANDAR.QUEDA}\n${this.piadaDeMorte()}`, 2400);
    }
  }

  /** Corações acabaram: tela apaga, volta à entrada do andar com os inimigos no lugar. */
  private morrerNoAndar(): void {
    if (this.estado !== 'livre') return;
    this.estado = 'transicao';
    this.mortes++;
    this.jogador.congelar();
    this.jogador.sprite.setTint(0xff2a3d);
    this.cameras.main.fadeOut(450, 30, 0, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.jogador.respawnar(this.checkpoint.ponto);
      this.jogador.liberarGravidade();
      this.inimigos?.resetar();
      this.combate?.restaurar();
      this.cameras.main.fadeIn(400, 0, 0, 0);
      this.mostrarNotificacao(`${TEXTOS_ANDAR.MORTE}\n${this.piadaDeMorte()}`, 2600);
      this.estado = 'livre';
    });
  }

  private piadaDeMorte(): string {
    return PIADAS_MORTE_ANDAR[(this.mortes - 1) % PIADAS_MORTE_ANDAR.length];
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
