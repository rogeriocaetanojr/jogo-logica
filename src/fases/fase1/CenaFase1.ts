import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase1 } from './InterpretadorFase1';
import type { SentinelaFase1 } from './SentinelaFase1';
import { JogadorFase1 } from './JogadorFase1';
import { VentoFase1, lerParametrosEscada } from './VentoFase1';
import { PlataformasInstaveisFase1 } from './PlataformasFase1';
import { gerarTexturasFase1 } from './TexturasFase1';
import { BossHelioFase1 } from './BossHelioFase1';
import { HudLutaFase1 } from './HudLutaFase1';
import { TempestadeFase1 } from './TempestadeFase1';
import { CenarioFase1 } from './CenarioFase1';
import { SomFase1, emitirSom } from './SomFase1';
import { MusicaFase1 } from './MusicaFase1';
import { lerMudoSalvo, salvarMudo } from '../../hub/MusicaHub';
import {
  construirNivelFase1,
  desenharEscudoSentinela,
  type ElementosNivelFase1,
} from './NivelFase1';
import {
  DIALOGO_RADIO_ABERTURA,
  ERROS_INSISTENTES_FASE1,
  TERMINAL_OCIOSO_FASE1,
  TEXTOS_HELIO,
  TEXTOS_TERMINAL_FASE1,
  comentarioEntradaTotem,
  dialogoRadioVitoria,
  introHelio,
  piadaDeMorte,
  type ContextoDialogoFase1,
} from './DialogosFase1';
import type {
  Coordenada2D,
  FeedbackErroFase1,
  ParametrosEscadaVento,
  SnapshotCheckpointFase1,
  TotemFase1,
} from './tiposFase1';
import {
  MUNDO_FASE1,
  CAMERA_FASE1,
  CHECKPOINTS_FASE1,
  DISTANCIA_INTERACAO_TOTEM_PADRAO,
  ERROS_PARA_ESQUELETO,
  FEEL_FASE1,
  SOM_FASE1,
  TERMINAL_OCIOSO_MS,
  SENTINELAS_FASE1,
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_PORTAO,
  TOTEM_4_SEQUENCIADOR,
  TOTEM_5_HELIO,
  ARENA_FASE1,
  BOSS_HELIO_FASE1,
  NPCS_FASE1,
} from './constantesFase1';

/**
 * Cada personagem fala num tom: o Helio grave e áspero, o Sucatinha agudo de robô,
 * o Mago arrastado, o Pombo ligeiro. O rótulo vem do Comunicador ("> NOME // PAPEL").
 */
function vozDoFalante(falante: string): { frequencia: number; forma: OscillatorType } {
  const nome = falante.toUpperCase();
  if (nome.includes('HELIO')) return { frequencia: 150, forma: 'sawtooth' };
  if (nome.includes('SUCATINHA')) return { frequencia: 880, forma: 'square' };
  if (nome.includes('MAGO')) return { frequencia: 260, forma: 'triangle' };
  if (nome.includes('POMBO')) return { frequencia: 640, forma: 'square' };
  return { frequencia: 480, forma: 'square' };
}

const CHECKPOINTS_EM_ORDEM = [
  CHECKPOINTS_FASE1.CP1,
  CHECKPOINTS_FASE1.CP2,
  CHECKPOINTS_FASE1.CP3,
  CHECKPOINTS_FASE1.CP3B,
  CHECKPOINTS_FASE1.CP4,
  CHECKPOINTS_FASE1.CP5,
] as const;

/**
 * CenaFase1: Céu Partido.
 * Orquestra os módulos da fase (jogador, vento, plataformas, nível, sentinelas e NPCs),
 * os 4 desafios lógicos do terminal e o sistema de checkpoint com reset limpo no respawn.
 */
export class CenaFase1 extends CenaBase {
  private jogador!: JogadorFase1;
  private vento!: VentoFase1;
  private instaveis!: PlataformasInstaveisFase1;
  private nivel!: ElementosNivelFase1;

  // Estado dos desafios e do respawn (desafios resolvidos continuam resolvidos ao morrer)
  private totensResolvidos = new Set<string>();
  private snapshotAtual!: SnapshotCheckpointFase1;
  private textoNotificacaoCheckpoint?: Phaser.GameObjects.Text;
  private portaArenaFechada: boolean = false;
  private faseConcluida: boolean = false;

  // Luta contra o Helio (os tempos usam o relógio da cena, this.time.now)
  private helio!: BossHelioFase1;
  private hudLuta!: HudLutaFase1;
  private lutaHelio: 'aguardando' | 'intro' | 'lutando' | 'morrendo' | 'recomecando' | 'derrotado' | 'vencida' =
    'aguardando';
  private coracoes: number = BOSS_HELIO_FASE1.CORACOES;
  private invulneravelAte: number = 0;
  private hitstopAte: number = 0;
  private portalAberto: boolean = false;
  private falaAtual?: Phaser.GameObjects.Text;
  private tempestade!: TempestadeFase1;
  private cenario!: CenarioFase1;
  private som!: SomFase1;
  private musica!: MusicaFase1;
  private teclaMudo?: Phaser.Input.Keyboard.Key;

  // Sons de interface: voz das falas, avisos de [E] e varredura das sentinelas
  private textoDialogoAnterior: string = '';
  private falanteAnterior: string = '';
  private letrasDesdeBipe: number = 0;
  private dialogoAtivoAntes: boolean = false;
  private promptsVisiveisAntes: number = 0;
  private scannerMs: number = 0;

  // Placa de pressão do portão (Desafio 3): só troca o rótulo quando o estado muda
  private placaPisada: boolean = false;

  // Terminal: totem conectado, erros por totem (liberam o esqueleto no help) e simulação do Desafio 4
  private totemAberto?: TotemFase1;
  private errosPorTotem = new Map<string, number>();
  private simulacaoRajadas: 'nenhuma' | 'agendada' | 'rodando' = 'nenhuma';

  // Memória da jogatina para as falas reativas (NPCs, Helio, terminal e rádio)
  private mortes: number = 0;
  private errosTotais: number = 0;
  private conversasNpcs = new Set<string>();
  private totensComentados = new Set<string>();
  private terminalOciosoMs: number = 0;
  private falasOciosasUsadas: number = 0;

  // Flag de congelamento seguro do mundo durante terminal ou diálogos
  private jogoCongeladoPorMenu: boolean = false;

  constructor() {
    super('CenaFase1', 'fase1');
  }

  create(): void {
    super.create();

    // Reinicia o estado (a instância da cena é reaproveitada entre visitas)
    this.totensResolvidos = new Set<string>();
    this.portaArenaFechada = false;
    this.lutaHelio = 'aguardando';
    this.coracoes = BOSS_HELIO_FASE1.CORACOES;
    this.invulneravelAte = 0;
    this.hitstopAte = 0;
    this.portalAberto = false;
    this.placaPisada = false;
    this.faseConcluida = false;
    this.totemAberto = undefined;
    this.errosPorTotem = new Map<string, number>();
    this.simulacaoRajadas = 'nenhuma';
    this.jogoCongeladoPorMenu = false;
    this.mortes = 0;
    this.errosTotais = 0;
    this.conversasNpcs = new Set<string>();
    this.totensComentados = new Set<string>();
    this.terminalOciosoMs = 0;
    this.falasOciosasUsadas = 0;

    // 1. Inicializa o Snapshot com o Checkpoint 0
    this.snapshotAtual = {
      idCheckpoint: 'cp0_inicial',
      pontoSpawn: { ...CHECKPOINTS_FASE1.INICIAL },
    };

    // 2. Limites do Mundo e Câmera com fundo lilás celestial
    this.physics.world.setBounds(0, 0, MUNDO_FASE1.LARGURA, MUNDO_FASE1.ALTURA + MUNDO_FASE1.PADDING_INFERIOR);
    this.cameras.main.setBounds(0, 0, MUNDO_FASE1.LARGURA, MUNDO_FASE1.ALTURA);
    this.cameras.main.setBackgroundColor(MUNDO_FASE1.COR_FUNDO);
    this.cameras.main.fadeIn(MUNDO_FASE1.FADE_IN_MS, 255, 255, 255);

    // 3. HUD Superior e CRT Retrô
    this.criarHUDSuperior('FASE 1 // CÉU PARTIDO');
    this.criarEfeitoCRT(1280, 720, MUNDO_FASE1.OPACIDADE_CRT);

    // 4. Texturas procedurais e cenário de fundo em parallax
    gerarTexturasFase1(this);
    this.cenario = new CenarioFase1(this);

    // 5. Sistemas da fase e jogador (criado antes de registrar colisores)
    this.vento = new VentoFase1(this);
    this.instaveis = new PlataformasInstaveisFase1(this);
    this.jogador = new JogadorFase1(this, this.snapshotAtual.pontoSpawn);

    // 6. Construção dos 4 blocos de level design com os 4 desafios, sentinelas e NPCs
    this.nivel = construirNivelFase1(this, this.jogador.sprite, this.vento, this.instaveis, {
      contexto: () => this.contextoDialogos(),
      aoConversar: (idNpc) => {
        this.conversasNpcs.add(idNpc);
        emitirSom(this, 'npc');
      },
    });

    // 7. Colisões com o Jogador
    const spriteJogador = this.jogador.sprite;
    this.physics.add.collider(spriteJogador, this.nivel.plataformasEstaticas);
    this.physics.add.collider(spriteJogador, this.nivel.nuvensSolidas);
    this.physics.add.collider(spriteJogador, this.instaveis.grupo, (_jog, plat) => {
      this.instaveis.aoPisar(plat as Phaser.Physics.Arcade.Sprite);
    });
    for (const movel of this.nivel.plataformasMoveis) {
      this.physics.add.collider(spriteJogador, movel.sprite);
    }

    // 7b. Boss Helio (escondido até a porta da arena fechar) e o HUD da luta
    this.helio = new BossHelioFase1(this);
    this.hudLuta = new HudLutaFase1(this);
    this.tempestade = new TempestadeFase1(this);

    // 7c. Som e trilha da fase (o mudo escolhido com [M] fica salvo no navegador)
    this.som = new SomFase1(this);
    this.musica = new MusicaFase1();
    this.teclaMudo = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.aplicarMudo(this.lerMudoSalvo(), false);
    this.musica.iniciar();
    this.textoDialogoAnterior = '';
    this.falanteAnterior = '';
    this.dialogoAtivoAntes = false;
    this.promptsVisiveisAntes = 0;
    this.scannerMs = 0;
    document.addEventListener('keydown', this.aoTeclarNoTerminal, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('keydown', this.aoTeclarNoTerminal, true);
      this.musica.destruir();
      this.som.destruir();
      this.sound.mute = false;
    });

    // 8. Integração com o Terminal
    this.configurarTerminal();

    // 9. Câmera seguindo o jogador com suavidade
    this.cameras.main.startFollow(spriteJogador, true, CAMERA_FASE1.LERP_X, CAMERA_FASE1.LERP_Y);
    this.cameras.main.setDeadzone(CAMERA_FASE1.DEADZONE_LARGURA, CAMERA_FASE1.DEADZONE_ALTURA);

    // 10. Notificação visual de Checkpoint
    this.textoNotificacaoCheckpoint = this.add.text(640, 120, 'CHECKPOINT SINCRONIZADO', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '15px',
      color: '#fbbf24',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      padding: { x: 10, y: 5 },
    });
    this.textoNotificacaoCheckpoint.setOrigin(0.5);
    this.textoNotificacaoCheckpoint.setScrollFactor(0);
    this.textoNotificacaoCheckpoint.setAlpha(0);
    this.textoNotificacaoCheckpoint.setDepth(9990);

    // 11. Transmissão Inicial de Rádio Rebelde
    this.comunicador.iniciarDialogo(DIALOGO_RADIO_ABERTURA);
  }

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFase1);

    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      this.terminalOciosoMs = 0;
      switch (resultado.acao) {
        case 'DESATIVAR_ESCUDO_SENTINELA':
          this.executarDesativarEscudoSentinela();
          break;
        case 'ESTABILIZAR_ELEVADOR':
          this.executarEstabilizarElevador();
          break;
        case 'ABRIR_PORTAO_EXISTENCIAL':
          this.executarAbrirPortaoExistencial();
          break;
        case 'ATIVAR_ESCADA_RAJADAS':
          this.executarAtivacaoEscadaRajadas(resultado.valor);
          break;
        case 'DESLIGAR_HELIO':
          this.executarDesligarHelio();
          break;
        case 'FEEDBACK_ERRO':
          this.tratarFeedbackErro(resultado.valor);
          break;
      }
    });
  }

  /** Clique de tecla enquanto o jogador digita no terminal; Enter tem som de envio. */
  private aoTeclarNoTerminal = (evento: KeyboardEvent): void => {
    if (!this.terminal?.estaAberto) return;
    if (evento.key === 'Enter') emitirSom(this, 'enviar');
    else if (evento.key.length === 1 || evento.key === 'Backspace') emitirSom(this, 'tecla');
  };

  /**
   * Sons que não pertencem a um objeto só: a voz de quem fala (um bipe por sílaba, enquanto o
   * texto aparece), o plim quando surge um [E] por perto e a varredura das sentinelas.
   */
  private atualizarSonsDeInterface(delta: number, emMenuOuDialogo: boolean): void {
    const ativo = this.comunicador?.estaAtivo ?? false;
    if (ativo && !this.dialogoAtivoAntes) emitirSom(this, 'dialogo_abrir');
    this.dialogoAtivoAntes = ativo;

    if (ativo) {
      const texto = document.getElementById('dialog-text')?.textContent ?? '';
      const falante = document.getElementById('dialog-speaker')?.textContent ?? '';
      const novaFala = falante !== this.falanteAnterior || !texto.startsWith(this.textoDialogoAnterior);
      if (novaFala) {
        if (this.textoDialogoAnterior) emitirSom(this, 'dialogo_avancar');
        this.textoDialogoAnterior = '';
        this.letrasDesdeBipe = SOM_FASE1.VOZ_LETRAS_POR_BIPE;
      }
      const novas = texto.slice(this.textoDialogoAnterior.length).replace(/\s/g, '').length;
      this.letrasDesdeBipe += novas;
      // Um bipe por quadro no máximo: pular o texto inteiro não vira uma rajada de bipes
      if (novas > 0 && this.letrasDesdeBipe >= SOM_FASE1.VOZ_LETRAS_POR_BIPE) {
        this.letrasDesdeBipe = 0;
        const voz = vozDoFalante(falante);
        this.som.voz(voz.frequencia, voz.forma);
      }
      this.textoDialogoAnterior = texto;
      this.falanteAnterior = falante;
    } else {
      this.textoDialogoAnterior = '';
      this.falanteAnterior = '';
    }

    if (emMenuOuDialogo) return;

    const visiveis =
      this.nivel.npcs.filter((npc) => npc.promptTexto.visible).length +
      this.nivel.totens.filter((totem) => totem.prompt.visible).length;
    if (visiveis > this.promptsVisiveisAntes) emitirSom(this, 'prompt');
    this.promptsVisiveisAntes = visiveis;

    this.scannerMs += delta;
    if (this.scannerMs >= SOM_FASE1.SCANNER_INTERVALO_MS) {
      this.scannerMs = 0;
      for (const s of this.nivel.sentinelas) {
        if (s.hackeada || s.estado === 'desativada' || s.estado === 'plataforma') continue;
        emitirSom(this, 'scanner', s.sprite.x, 0.8);
      }
    }
  }

  private lerMudoSalvo(): boolean {
    try {
      return lerMudoSalvo();
    } catch {
      return false;
    }
  }

  /**
   * Liga ou desliga todo o som da fase ([M]) e guarda a escolha no navegador.
   */
  private aplicarMudo(mudo: boolean, avisar: boolean): void {
    this.sound.mute = mudo;
    this.musica.definirMudo(mudo);
    salvarMudo(mudo);
    if (avisar) {
      this.mostrarNotificacaoCurta(mudo ? 'SOM DESLIGADO // [M] PARA LIGAR' : 'SOM LIGADO // [M] PARA DESLIGAR');
      if (!mudo) emitirSom(this, 'mudo');
    }
  }

  /**
   * O que os textos reativos precisam saber da jogatina.
   */
  private contextoDialogos(): ContextoDialogoFase1 {
    return {
      mortes: this.mortes,
      erros: this.errosTotais,
      totensResolvidos: this.totensResolvidos.size,
      conversouCom: (idNpc) => this.conversasNpcs.has(idNpc),
    };
  }

  /**
   * Terminal aberto e parado por muito tempo: ele puxa assunto (uma fala por vez, sem repetir em seguida).
   */
  private vigiarTerminalOcioso(delta: number): void {
    if (!this.terminal?.estaAberto || this.simulacaoRajadas !== 'nenhuma') {
      this.terminalOciosoMs = 0;
      return;
    }
    this.terminalOciosoMs += delta;
    if (this.terminalOciosoMs < TERMINAL_OCIOSO_MS) return;
    this.terminalOciosoMs = 0;
    const fala = TERMINAL_OCIOSO_FASE1[this.falasOciosasUsadas % TERMINAL_OCIOSO_FASE1.length];
    this.falasOciosasUsadas++;
    this.terminal.imprimirLinha(fala, 'info');
  }

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);

    if (!this.jogador?.sprite.body) return;

    // O céu continua vivo mesmo com o terminal aberto
    this.cenario.atualizar(delta);
    this.vigiarTerminalOcioso(delta);

    // 1. Congelamento Seguro no Terminal e Diálogos
    const emMenuOuDialogo = Boolean(
      this.terminal?.estaAberto || this.comunicador?.estaAtivo || this.simulacaoRajadas !== 'nenhuma'
    );
    // Som e trilha seguem vivos com o jogo congelado: a música abaixa para dar para ler
    this.musica.definirAbafada(emMenuOuDialogo);
    this.musica.atualizar(delta);
    this.som.definirPausado(emMenuOuDialogo);
    this.som.definirTempestade(this.tempestade.intensidadeAtual);
    this.som.atualizar();
    this.atualizarSonsDeInterface(delta, emMenuOuDialogo);
    if (this.teclaMudo && Phaser.Input.Keyboard.JustDown(this.teclaMudo) && !emMenuOuDialogo) {
      this.aplicarMudo(!this.sound.mute, true);
    }

    if (emMenuOuDialogo) {
      if (!this.jogoCongeladoPorMenu) {
        this.jogoCongeladoPorMenu = true;
        this.congelarJogo();
      }
      this.jogador.congelar();

      for (const s of this.nivel.sentinelas) {
        s.congelar();
      }

      // Evita que plataformas que estavam sendo pisadas sumam durante a digitação
      this.instaveis.adiarRachaduras(delta);

      // Durante a simulação do Desafio 4, só a escada de vento se move
      if (this.simulacaoRajadas === 'rodando') {
        this.vento.update(tempo, delta);
      }
      return;
    }

    if (this.jogoCongeladoPorMenu) {
      this.jogoCongeladoPorMenu = false;
      this.descongelarJogo();
    }

    // Hitstop do pisão no Helio: o mundo fica parado por um instante
    if (this.time.now < this.hitstopAte) return;

    // 2. Checkpoints, queda no abismo e a porta da arena
    this.verificarLimitesECheckpoints();
    if (!this.portaArenaFechada && this.jogador.x >= ARENA_FASE1.PORTA.gatilhoX) {
      this.fecharPortaArena();
    }

    // 3. Movimentação, Coyote Time, Jump Buffer e Mecânica de Planar no Vento
    // Durante a animação de morte o jogador não responde ao teclado
    if (this.lutaHelio !== 'morrendo') {
      this.jogador.update(tempo, delta, this.vento);
    }

    // 4. Plataformas que somem e plataformas móveis
    this.instaveis.update(tempo);
    for (const movel of this.nivel.plataformasMoveis) {
      movel.update(delta);
    }

    // 5. Colunas, zonas de vento contrário, gêiseres e a Escada de Rajadas (Desafio 4)
    this.vento.update(tempo, delta);

    // Tempestade da arena e a placa de pressão do portão (Desafio 3)
    this.tempestade.update(delta);
    this.atualizarPlacaPressao();

    // 6. Escudo da Sentinela A-01 (Desafio 1)
    if (this.totensResolvidos.has(TOTEM_1_ALCOOLEMIA.ID)) {
      this.nivel.graficoEscudo.clear();
    } else {
      desenharEscudoSentinela(this.nivel.graficoEscudo, tempo);
    }

    // 7. Sentinelas (patrulha, pulso eólico, rajada lateral e alerta máximo)
    for (const s of this.nivel.sentinelas) {
      s.update(tempo, delta, this.jogador.sprite, emMenuOuDialogo, {
        aoDetectar: (sentinela) => this.dispararAlarmeSentinela(sentinela),
        aoRajar: (sentinela) => this.aplicarRajadaSentinela(sentinela),
      });
    }

    // 8. Luta contra o Helio (ataques, pisão) e o piscar de invulnerabilidade
    if (this.lutaHelio === 'lutando' || this.lutaHelio === 'derrotado') {
      this.helio.update(tempo, delta, this.jogador.sprite, {
        aoFerirJogador: (direcaoX) => this.ferirJogador(direcaoX),
        aoSerPisado: () => this.aoPisarHelio(),
      });
    }
    if (this.lutaHelio === 'lutando') {
      const agora = this.time.now;
      const piscando = agora < this.invulneravelAte && Math.floor(agora / 80) % 2 === 0;
      this.jogador.sprite.setAlpha(piscando ? 0.35 : 1);
    }

    // 9. Interação com NPCs e com os totens (sem conflito)
    this.tratarInteracoes();

    // 10. Chegada ao portal da arena (só depois do Helio desligado)
    this.verificarFinalizacaoFase();
  }

  private dispararAlarmeSentinela(sentinela: SentinelaFase1): void {
    const laser = this.add.graphics();
    laser.lineStyle(3, 0xff0055, 1);
    laser.lineBetween(sentinela.sprite.x, sentinela.sprite.y, this.jogador.x, this.jogador.y);

    this.cameras.main.flash(200, 255, 100, 100);

    this.time.delayedCall(160, () => {
      laser.destroy();
      this.restaurarSnapshot('SENTINELA DISPAROU: DETECTADO NO ESPAÇO AÉREO!');
    });
  }

  /**
   * A rajada só atinge o jogador se ele estiver na frente da sentinela e perto o bastante.
   */
  private aplicarRajadaSentinela(sentinela: SentinelaFase1): void {
    const s = SENTINELAS_FASE1;
    const dx = this.jogador.x - sentinela.sprite.x;
    const dy = this.jogador.y - sentinela.sprite.y;
    const naFrente = dx * sentinela.direcao >= 0;
    if (!naFrente || Math.abs(dx) > s.ALCANCE_RAJADA || Math.abs(dy) > s.ALTURA_RAJADA) return;

    this.jogador.aplicarEmpurrao(sentinela.direcao * s.EMPURRAO_X, s.EMPURRAO_Y, s.DURACAO_EMPURRAO_MS);
    this.cameras.main.shake(150, 0.004);
  }

  /**
   * Monitoramento de proximidade e acionamento de NPCs e dos 4 Totens de controle.
   * Prioriza NPCs para evitar conflito de tecla E.
   */
  private tratarInteracoes(): void {
    const interagirApertado = this.jogador.interagirApertado();

    // 1. Interação prioritária com NPCs
    for (const npc of this.nivel.npcs) {
      if (npc.update(this.jogador.x, this.jogador.y, interagirApertado, this.comunicador)) {
        return;
      }
    }

    // 2. Interação com os Totens (os reabríveis continuam disponíveis depois de resolvidos)
    for (const totem of this.nivel.totens) {
      const resolvido = this.totensResolvidos.has(totem.id);
      const dist = Phaser.Math.Distance.Between(this.jogador.x, this.jogador.y, totem.imagem.x, totem.imagem.y);
      const perto = dist < DISTANCIA_INTERACAO_TOTEM_PADRAO && (totem.reabrivel || !resolvido);

      totem.prompt.setVisible(perto);
      if (perto && totem.textos.PROMPT_RESOLVIDO) {
        totem.prompt.setText(resolvido ? totem.textos.PROMPT_RESOLVIDO : totem.textos.PROMPT);
      }

      if (perto && interagirApertado) {
        this.abrirTerminalTotem(totem);
        return;
      }
    }
  }

  private abrirTerminalTotem(totem: TotemFase1, linhasExtras: string[] = []): void {
    this.congelarJogo();
    this.jogoCongeladoPorMenu = true;
    this.totemAberto = totem;

    this.terminal.definirContexto({
      totemAtivo: totem.id,
      errosNoTotem: this.errosPorTotem.get(totem.id) ?? 0,
    });

    this.terminal.abrir({ titulo: totem.textos.TITULO, linhasIniciais: this.linhasEnunciado(totem) });
    emitirSom(this, 'terminal_abrir');
    this.terminalOciosoMs = 0;

    // Na primeira visita, o totem comenta o histórico do jogador (se houver o que comentar)
    if (!this.totensComentados.has(totem.id)) {
      this.totensComentados.add(totem.id);
      const comentario = comentarioEntradaTotem(totem.id, this.contextoDialogos());
      if (comentario) linhasExtras = [comentario, ...linhasExtras];
    }

    // Avisos extras ficam fora do enunciado, que o comando "enunciado" reimprime
    for (const linha of linhasExtras) {
      this.terminal.imprimirLinha(linha, 'info');
    }
  }

  /**
   * Enunciado do totem: fala de abertura, sensores e funções disponíveis.
   */
  private linhasEnunciado(totem: TotemFase1): string[] {
    const { TITULO, DIALOGO_INICIAL, VARIAVEIS_DISPONIVEIS, FUNCOES_DISPONIVEIS } = totem.textos;
    return [
      `=== ${TITULO} ===`,
      '',
      `"${DIALOGO_INICIAL}"`,
      '',
      '-------------------------------------------------------',
      'SENSORES / VARIÁVEIS DISPONÍVEIS:',
      ...VARIAVEIS_DISPONIVEIS.map((v) => `  > ${v}`),
      '',
      'FUNÇÕES DISPONÍVEIS:',
      ...FUNCOES_DISPONIVEIS.map((f) => `  > ${f}`),
      '-------------------------------------------------------',
      '> Digite sua lógica em Python:',
    ];
  }

  // =========================================================================
  // FEEDBACK DE ERRO E SIMULAÇÃO DO DESAFIO 4
  // =========================================================================

  /**
   * Imprime a dica objetiva, conta o erro do totem aberto e dispara a simulação quando houver.
   */
  private tratarFeedbackErro(valor: unknown): void {
    let feedback: FeedbackErroFase1 = {};
    if (typeof valor === 'string') {
      try {
        feedback = JSON.parse(valor) as FeedbackErroFase1;
      } catch {
        feedback = {};
      }
    }

    if (feedback.dica) {
      this.terminal.imprimirLinha(feedback.dica, 'info');
    }

    const totem = this.totemAberto;
    if (!totem) return;

    const erros = (this.errosPorTotem.get(totem.id) ?? 0) + 1;
    this.errosPorTotem.set(totem.id, erros);
    this.errosTotais++;
    emitirSom(this, 'terminal_erro');
    const insistente = ERROS_INSISTENTES_FASE1[erros];
    if (insistente) this.terminal.imprimirLinha(insistente, 'info');
    this.terminal.definirContexto({ totemAtivo: totem.id, errosNoTotem: erros });
    if (erros === ERROS_PARA_ESQUELETO) {
      this.terminal.imprimirLinha(TEXTOS_TERMINAL_FASE1.AVISO_ESQUELETO, 'info');
    }

    if (feedback.simulacao) {
      this.simularRajadasErradas(totem, feedback.simulacao);
    }
  }

  /**
   * Fecha o terminal, roda a escada com os valores errados por alguns segundos
   * (com o jogador congelado, para não poder usá-la) e reabre o terminal.
   */
  private simularRajadasErradas(totem: TotemFase1, parametros: ParametrosEscadaVento): void {
    if (this.simulacaoRajadas !== 'nenhuma') return;
    this.simulacaoRajadas = 'agendada';

    this.time.delayedCall(TOTEM_4_SEQUENCIADOR.SIMULACAO_ATRASO_MS, () => {
      this.simulacaoRajadas = 'rodando';
      this.terminal.fechar();
      this.vento.iniciarSimulacaoEscada(parametros);
      const faixa = this.criarFaixaFixa(TEXTOS_TERMINAL_FASE1.FAIXA_SIMULACAO);

      this.time.delayedCall(TOTEM_4_SEQUENCIADOR.SIMULACAO_MS, () => {
        faixa.destroy();
        this.vento.encerrarSimulacaoEscada();
        this.simulacaoRajadas = 'nenhuma';
        this.abrirTerminalTotem(totem, [TEXTOS_TERMINAL_FASE1.SIMULACAO_ENCERRADA]);
      });
    });
  }

  /**
   * Faixa de texto presa à tela. Não usa tween, porque os tweens ficam pausados com o mundo congelado.
   */
  private criarFaixaFixa(texto: string): Phaser.GameObjects.Text {
    const faixa = this.add.text(640, 160, texto, {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '15px',
      color: '#38bdf8',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      padding: { x: 10, y: 5 },
    });
    faixa.setOrigin(0.5);
    faixa.setScrollFactor(0);
    faixa.setDepth(9990);
    return faixa;
  }

  // =========================================================================
  // EXECUÇÃO DAS AÇÕES DOS 4 DESAFIOS
  // =========================================================================

  /**
   * Fecha o terminal pouco depois do acerto, para o jogador ler a mensagem de sucesso.
   */
  private fecharTerminalComFeedback(notificacao: string, efeito: () => void): void {
    emitirSom(this, 'terminal_acerto');
    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      efeito();
      this.mostrarNotificacaoCurta(notificacao);
    });
  }

  private executarDesativarEscudoSentinela(): void {
    this.totensResolvidos.add(TOTEM_1_ALCOOLEMIA.ID);
    this.nivel.barreiraEscudo.destroy();

    // A sentinela que patrulhava o vão vira a balsa que atravessa o mesmo vão
    const sentinela = this.nivel.sentinela1;
    const balsa = this.nivel.balsaSentinela;
    balsa.ativarEm(sentinela.sprite.x, TOTEM_1_ALCOOLEMIA.BALSA.y, sentinela.direcao);
    sentinela.transformarEmPlataforma(balsa.sprite);

    this.tweens.add({
      targets: this.nivel.graficoEscudo,
      alpha: 0,
      duration: 500,
      onComplete: () => this.nivel.graficoEscudo.clear(),
    });

    this.fecharTerminalComFeedback('SENTINELA HACKEADA // ELA AGORA É SUA BALSA!', () =>
      this.cameras.main.flash(200, 255, 255, 255)
    );
  }

  private executarEstabilizarElevador(): void {
    this.totensResolvidos.add(TOTEM_2_BALANCA.ID);
    emitirSom(this, 'elevador');
    const elevador = this.nivel.elevadorNuvem;

    this.tweens.add({
      targets: elevador,
      y: TOTEM_2_BALANCA.ALTITUDE_ALVO,
      duration: 1600,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        (elevador.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
      },
    });

    this.fecharTerminalComFeedback(`ELEVADOR ALINHADO NA ALTITUDE ${TOTEM_2_BALANCA.ALTITUDE_ALVO}!`, () =>
      this.cameras.main.shake(250, 0.004)
    );
  }

  private executarAbrirPortaoExistencial(): void {
    this.totensResolvidos.add(TOTEM_3_PORTAO.ID);
    this.time.delayedCall(800, () => emitirSom(this, 'portao'));
    this.nivel.colisorPortao.destroy();

    this.tweens.add({
      targets: this.nivel.portaoMilenar,
      y: TOTEM_3_PORTAO.Y_PORTAO + TOTEM_3_PORTAO.DESLOCAMENTO_ABERTO_Y,
      alpha: TOTEM_3_PORTAO.ALFA_ABERTO,
      duration: 1400,
      ease: 'Quad.easeInOut',
    });

    this.fecharTerminalComFeedback('PORTÃO MILENAR ABERTO // ESCADA À VISTA!', () =>
      this.cameras.main.shake(300, 0.005)
    );
  }

  private executarAtivacaoEscadaRajadas(valor?: unknown): void {
    this.totensResolvidos.add(TOTEM_4_SEQUENCIADOR.ID);
    this.vento.ativarEscada(lerParametrosEscada(valor));

    this.fecharTerminalComFeedback(
      `ESCADA DE RAJADAS ATIVADA // INTERVALO: ${this.vento.intervaloEscadaSegundos}s | FORÇA: ${this.vento.forcaEscadaPixels}px`,
      () => {}
    );
  }

  /**
   * A porta sobe atrás do jogador ao entrar na arena: dali não tem volta.
   */
  private fecharPortaArena(): void {
    this.portaArenaFechada = true;
    const porta = this.nivel.portaArena;
    (porta.body as Phaser.Physics.Arcade.Body).enable = true;
    this.nivel.colisorPortaArena.active = true;

    this.tweens.add({
      targets: porta,
      y: ARENA_FASE1.PORTA.y,
      alpha: 1,
      duration: 700,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        (porta.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
      },
    });

    this.cameras.main.shake(300, 0.006);
    emitirSom(this, 'porta_arena');
    this.mostrarNotificacaoCurta('PORTA SELADA // AGORA É VOCÊ E O VENTO');
    this.iniciarIntroHelio();
  }

  // =========================================================================
  // LUTA CONTRA O HELIO
  // =========================================================================

  /**
   * A porta fechou: o Pombo foge, a câmera trava na arena e o Helio desce do céu para provocar.
   */
  private iniciarIntroHelio(): void {
    this.lutaHelio = 'intro';
    this.tempestade.iniciar();
    this.musica.iniciarLuta();
    this.cameras.main.zoomTo(FEEL_FASE1.ZOOM_INTRO, FEEL_FASE1.ZOOM_INTRO_MS, 'Sine.easeInOut');
    this.travarCameraArena(true);

    // As sentinelas que ficaram para trás saem de serviço (o cone da S-03 invadia o canto da arena)
    for (const s of this.nivel.sentinelas) {
      s.desativar();
    }

    const pombo = this.nivel.npcs.find((npc) => npc.id === NPCS_FASE1.POMBO.ID);
    if (pombo) {
      this.nivel.npcs = this.nivel.npcs.filter((npc) => npc !== pombo);
      pombo.promptTexto.setVisible(false);
      this.tweens.killTweensOf(pombo.sprite);
      this.tweens.add({
        targets: pombo.sprite,
        x: pombo.sprite.x - 260,
        y: pombo.sprite.y - 420,
        alpha: 0,
        duration: 1200,
        ease: 'Quad.easeIn',
        onComplete: () => pombo.destruir(),
      });
    }

    const helio = this.helio.sprite;
    helio.setVisible(true);
    helio.setPosition(BOSS_HELIO_FASE1.X_INICIAL, -40);
    this.tweens.add({
      targets: helio,
      y: ARENA_FASE1.CHAO_Y,
      duration: 900,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.cameras.main.shake(300, 0.01);
        emitirSom(this, 'boss_entrada');
        this.comunicador.iniciarDialogo(introHelio(this.contextoDialogos()), () => this.comecarLuta());
      },
    });
  }

  private comecarLuta(): void {
    this.lutaHelio = 'lutando';
    this.cameras.main.zoomTo(1, FEEL_FASE1.ZOOM_VOLTA_MS, 'Sine.easeInOut');
    this.coracoes = BOSS_HELIO_FASE1.CORACOES;
    this.hudLuta.mostrar();
    this.atualizarHudLuta();
    this.helio.iniciarLuta();
  }

  /**
   * Um ataque acertou: perde um coração, leva um empurrão e fica 1 s piscando e invulnerável.
   * Sem corações, volta ao checkpoint da arena e a luta recomeça do zero.
   */
  private ferirJogador(direcaoX: number): void {
    const b = BOSS_HELIO_FASE1;
    if (this.lutaHelio !== 'lutando' || this.time.now < this.invulneravelAte) return;

    this.coracoes--;
    emitirSom(this, 'dano');
    this.invulneravelAte = this.time.now + b.INVULNERAVEL_MS;
    this.atualizarHudLuta();
    this.cameras.main.flash(150, 255, 80, 80);

    if (this.coracoes <= 0) {
      this.morrerNaLuta();
      return;
    }
    this.jogador.aplicarEmpurrao(direcaoX * b.EMPURRAO_DANO_X, b.EMPURRAO_DANO_Y, b.DURACAO_EMPURRAO_DANO_MS);
  }

  /**
   * Pisão válido: hitstop, quique, deboche do Helio. No terceiro, ele cai de joelhos
   * e o totem do núcleo aparece para o comando final.
   */
  private aoPisarHelio(): void {
    const b = BOSS_HELIO_FASE1;

    this.hitstopAte = this.time.now + b.HITSTOP_MS;
    this.physics.world.pause();
    this.time.delayedCall(b.HITSTOP_MS, () => {
      if (!this.jogoCongeladoPorMenu) this.physics.world.resume();
    });

    this.jogador.quicar(b.QUIQUE_PISAO);
    emitirSom(this, 'pisao');
    this.invulneravelAte = this.time.now + b.INVULNERAVEL_MS / 2;
    this.cameras.main.flash(120, 255, 255, 255);
    this.cameras.main.shake(200, 0.008);
    this.atualizarHudLuta();

    if (this.helio.vida > 0) {
      this.falaFlutuante(TEXTOS_HELIO.GOLPES[this.helio.golpes - 1] ?? TEXTOS_HELIO.GOLPES[0]);
      return;
    }

    this.lutaHelio = 'derrotado';
    emitirSom(this, 'boss_derrotado');
    this.musica.suspenseDerrota();
    this.jogador.sprite.setAlpha(1);
    this.falaFlutuante(TEXTOS_HELIO.DERROTADO, 4000);

    const totem = this.nivel.totemFinal;
    this.nivel.totens.push(totem);
    this.tweens.add({ targets: totem.imagem, alpha: 1, duration: 800 });
    this.mostrarNotificacaoCurta('O NÚCLEO DO HELIO ESTÁ EXPOSTO // USE O TOTEM');
  }

  /**
   * Os corações acabaram: o jogador gira, encolhe e some devagar enquanto a tela apaga.
   * Com a tela escura, volta ao checkpoint da arena e a luta recomeça; a tela reacende em seguida.
   */
  private morrerNaLuta(): void {
    const b = BOSS_HELIO_FASE1;
    const cor = b.MORTE_COR_FADE;
    const sprite = this.jogador.sprite;

    this.lutaHelio = 'morrendo';
    emitirSom(this, 'queda');
    this.jogador.congelar();
    sprite.setAlpha(1);
    sprite.setTint(0xf87171);
    this.cameras.main.shake(300, 0.006);

    this.tweens.add({
      targets: sprite,
      angle: 540,
      scaleX: 0.4,
      scaleY: 0.4,
      alpha: 0,
      y: sprite.y - 50,
      duration: b.MORTE_ANIMACAO_MS,
      ease: 'Sine.easeInOut',
    });

    this.cameras.main.fadeOut(b.MORTE_FADE_SAIDA_MS, cor.r, cor.g, cor.b);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.tweens.killTweensOf(sprite);
      sprite.setAngle(0);
      sprite.setScale(1);
      // restaurarSnapshot só recomeça a luta quando ela está em andamento
      this.lutaHelio = 'lutando';
      this.restaurarSnapshot('O HELIO TE SOPROU DE VOLTA AO CHECKPOINT!', false);
      this.cameras.main.fadeIn(b.MORTE_FADE_ENTRADA_MS, cor.r, cor.g, cor.b);
    });
  }

  /**
   * Acende a placa de pressão do portão e troca o rótulo enquanto o jogador está em pé sobre ela.
   */
  private atualizarPlacaPressao(): void {
    const t3 = TOTEM_3_PORTAO;
    const placa = this.nivel.placaPressao;
    const corpo = this.jogador.corpo;
    const noChao = corpo.blocked.down || corpo.touching.down;
    const pisando =
      noChao &&
      this.jogador.x >= placa.xMin &&
      this.jogador.x <= placa.xMax &&
      Math.abs(corpo.bottom - t3.PLACA.y) <= 4;

    if (pisando === this.placaPisada) return;
    this.placaPisada = pisando;
    emitirSom(this, pisando ? 'placa' : 'placa_solta', placa.imagem.x);

    if (pisando) placa.imagem.setTint(0x6ee7b7);
    else placa.imagem.clearTint();
    placa.rotulo.setText(`placa_pressionada = ${pisando ? 'True' : 'False'}`);
    placa.rotulo.setColor(pisando ? t3.COR_SENSOR_LIGADO : t3.COR_SENSOR_DESLIGADO);
  }

  /**
   * Recomeça a luta do zero (vida cheia para os dois), com uma provocação do Helio.
   */
  private recomecarLuta(): void {
    this.lutaHelio = 'recomecando';
    this.helio.reiniciar();
    this.helio.sprite.setVisible(true);
    this.coracoes = BOSS_HELIO_FASE1.CORACOES;
    this.invulneravelAte = 0;
    this.atualizarHudLuta();
    this.travarCameraArena(false);

    this.time.delayedCall(BOSS_HELIO_FASE1.ATRASO_RECOMECO_MS, () => {
      if (this.lutaHelio !== 'recomecando') return;
      this.falaFlutuante(Phaser.Utils.Array.GetRandom([...TEXTOS_HELIO.RECOMECO]));
      this.lutaHelio = 'lutando';
      this.helio.iniciarLuta();
    });
  }

  private executarDesligarHelio(): void {
    this.totensResolvidos.add(TOTEM_5_HELIO.ID);
    this.lutaHelio = 'vencida';

    this.fecharTerminalComFeedback('HELIO DESLIGADO // PORTAL DO SANTUÁRIO ABERTO!', () => {
      this.helio.desligar();
      emitirSom(this, 'desligar');
      this.time.delayedCall(1400, () => emitirSom(this, 'portal'));
      this.musica.aoVencer();
      this.tempestade.encerrar();
      this.hudLuta.esconder();
      this.falaFlutuante(TEXTOS_HELIO.DESLIGADO);
      this.cameras.main.shake(400, 0.01);

      const portal = this.nivel.portalFinal;
      portal.setVisible(true);
      this.tweens.add({ targets: portal, alpha: 1, duration: 900 });
      this.portalAberto = true;
      this.cameras.main.startFollow(this.jogador.sprite, true, CAMERA_FASE1.LERP_X, CAMERA_FASE1.LERP_Y);
    });
  }

  /**
   * Durante a luta a câmera fica parada mostrando a arena inteira (ela tem a largura da tela).
   */
  private travarCameraArena(suave: boolean): void {
    const centro = ARENA_FASE1.CAMERA_CENTRO;
    this.cameras.main.stopFollow();
    if (suave) {
      this.cameras.main.pan(centro.x, centro.y, 700, 'Sine.easeInOut');
    } else {
      this.cameras.main.centerOn(centro.x, centro.y);
    }
  }

  private atualizarHudLuta(): void {
    this.hudLuta.atualizar(this.helio.vida, BOSS_HELIO_FASE1.VIDA, this.coracoes, BOSS_HELIO_FASE1.CORACOES);
  }

  /**
   * Fala curta sobre o Helio que some sozinha, sem pausar a luta.
   */
  private falaFlutuante(texto: string, duracaoMs: number = 2600): void {
    // Uma fala por vez: a nova substitui a anterior em vez de empilhar balões
    this.falaAtual?.destroy();
    emitirSom(this, 'helio_fala');

    const helio = this.helio.sprite;
    const visao = this.cameras.main.worldView;
    const fala = this.add.text(helio.x, helio.y - BOSS_HELIO_FASE1.ALTURA_CORPO - 60, texto, {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#fde68a',
      backgroundColor: 'rgba(30, 27, 75, 0.9)',
      padding: { x: 8, y: 5 },
      align: 'center',
      wordWrap: { width: 340 },
    });
    fala.setOrigin(0.5, 1);
    fala.setDepth(9500);
    // Mantém o balão dentro da tela, mesmo com o Helio voando ou encostado na borda
    fala.x = Phaser.Math.Clamp(fala.x, visao.x + 190, visao.right - 190);
    fala.y = Math.max(fala.y, visao.y + 150);
    this.falaAtual = fala;

    this.tweens.add({
      targets: fala,
      alpha: 0,
      delay: duracaoMs,
      duration: 500,
      onComplete: () => {
        fala.destroy();
        if (this.falaAtual === fala) this.falaAtual = undefined;
      },
    });
  }

  // =========================================================================
  // CHECKPOINTS E RESPAWN LIMPO
  // =========================================================================

  private verificarLimitesECheckpoints(): void {
    const { x, y } = this.jogador;

    // Apenas salva checkpoints se o jogador estiver em altura segura (não despencando no abismo)
    if (y < CHECKPOINTS_FASE1.LIMITE_QUEDA_Y - CHECKPOINTS_FASE1.MARGEM_ALTURA_SEGURA) {
      // Índice do próximo checkpoint ainda não alcançado (0 = nenhum salvo além do inicial)
      const nivelAtual =
        CHECKPOINTS_EM_ORDEM.findIndex((cp) => cp.ID === this.snapshotAtual.idCheckpoint) + 1;

      const alcancado = CHECKPOINTS_EM_ORDEM.find(
        (cp, i) => i >= nivelAtual && x >= cp.GATILHO_X && y < cp.GATILHO_Y_MAX
      );
      if (alcancado) {
        this.salvarSnapshotCheckpoint(alcancado.ID, alcancado.PONTO, alcancado.NOME);
      }
    }

    // Queda no abismo
    if (y > CHECKPOINTS_FASE1.LIMITE_QUEDA_Y) {
      this.restaurarSnapshot('QUEDA NO ABISMO DO CÉU!');
    }
  }

  private salvarSnapshotCheckpoint(idCheckpoint: string, ponto: Coordenada2D, nomeNotificacao: string): void {
    this.snapshotAtual = { idCheckpoint, pontoSpawn: { ...ponto } };
    emitirSom(this, 'checkpoint');
    this.exibirAnimacaoCheckpoint(nomeNotificacao);
  }

  /**
   * Devolve o jogador ao último checkpoint com o mundo em estado limpo.
   * - Plataformas que somem voltam intactas.
   * - Sentinelas não hackeadas voltam às rotas iniciais.
   * - Desafios resolvidos continuam resolvidos (escudo, elevador, portão e escada não voltam atrás).
   */
  private restaurarSnapshot(motivo: string, comFlash: boolean = true): void {
    const ponto = this.snapshotAtual.pontoSpawn;

    this.jogador.respawnar(ponto);

    // Centraliza câmera instantaneamente no ponto de spawn seguro
    this.cameras.main.centerOn(ponto.x, ponto.y);

    this.instaveis.resetar();
    for (const s of this.nivel.sentinelas) {
      s.resetarPosicao();
    }

    if (this.jogoCongeladoPorMenu) {
      this.jogoCongeladoPorMenu = false;
      this.descongelarJogo();
    }

    if (comFlash) {
      this.cameras.main.flash(200, 255, 255, 255);
      emitirSom(this, 'queda');
    }
    this.mortes++;
    this.time.delayedCall(250, () => emitirSom(this, 'renascer'));
    const piada = piadaDeMorte(this.mortes);
    this.mostrarNotificacaoCurta(piada ? `${motivo}\n${piada}` : motivo);

    // Morrer durante a luta (corações ou queda) recomeça o Helio do zero
    if (this.lutaHelio === 'lutando') {
      this.recomecarLuta();
    }
  }

  /**
   * Congela o jogo completamente durante a abertura do terminal ou caixa de diálogo.
   * - Para física do Arcade e o jogador
   * - Para imediatamente todas as sentinelas ativas
   * - Pausa tweens da cena
   */
  private congelarJogo(): void {
    this.jogador?.congelar();

    for (const s of this.nivel.sentinelas) {
      s.congelar();
    }

    this.physics.world.pause();
    this.tweens.pauseAll();
  }

  /**
   * Descongela o mundo e retoma a movimentação de sentinelas e física do jogador.
   */
  private descongelarJogo(): void {
    if (!this.faseConcluida) {
      this.jogador.liberarGravidade();
    }

    this.physics.world.resume();
    this.tweens.resumeAll();

    for (const s of this.nivel.sentinelas) {
      s.descongelar();
    }
  }

  private exibirAnimacaoCheckpoint(texto: string): void {
    if (!this.textoNotificacaoCheckpoint) return;
    this.textoNotificacaoCheckpoint.setText(texto);
    this.textoNotificacaoCheckpoint.setAlpha(1);

    this.tweens.add({
      targets: this.textoNotificacaoCheckpoint,
      alpha: 0,
      duration: 1800,
      delay: 1000,
    });
  }

  private mostrarNotificacaoCurta(mensagem: string): void {
    const txt = this.add.text(this.jogador.x, this.jogador.y - 70, mensagem, {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#fbbf24',
      backgroundColor: '#090d16',
      padding: { x: 8, y: 4 },
      align: 'center',
    });
    txt.setOrigin(0.5);
    txt.setDepth(9995);

    // Perto da borda da tela, o aviso desliza para dentro em vez de sair cortado
    const visao = this.cameras.main.worldView;
    const meiaLargura = txt.width / 2 + 10;
    txt.x = Phaser.Math.Clamp(txt.x, visao.x + meiaLargura, visao.right - meiaLargura);

    this.tweens.add({
      targets: txt,
      y: txt.y - 30,
      alpha: 0,
      // Aviso com piada (duas linhas) fica mais tempo para dar tempo de ler
      duration: mensagem.includes('\n') ? 3200 : 1600,
      onComplete: () => txt.destroy(),
    });
  }

  private verificarFinalizacaoFase(): void {
    if (this.faseConcluida || !this.portalAberto) return;

    const portal = this.nivel.portalFinal;
    const distPortal = Phaser.Math.Distance.Between(this.jogador.x, this.jogador.y, portal.x, portal.y);
    if (distPortal >= ARENA_FASE1.DISTANCIA_PORTAL) return;

    this.faseConcluida = true;
    emitirSom(this, 'vitoria');
    this.jogador.sprite.setVelocity(0, 0);
    this.jogador.corpo.allowGravity = false;

    this.tweens.add({
      targets: this.jogador.sprite,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.concluirFaseAtual();
        this.comunicador.iniciarDialogo(dialogoRadioVitoria(this.contextoDialogos()), () => {
          this.retornarAoHub();
        });
      },
    });
  }
}
