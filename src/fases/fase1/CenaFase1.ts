import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase1 } from './InterpretadorFase1';
import type { SentinelaFase1 } from './SentinelaFase1';
import { JogadorFase1 } from './JogadorFase1';
import { VentoFase1, lerParametrosEscada } from './VentoFase1';
import { PlataformasRachadasFase1 } from './PlataformasFase1';
import { gerarTexturasFase1 } from './TexturasFase1';
import {
  construirNivelFase1,
  criarCenarioParallaxFase1,
  desenharEscudoSentinela,
  type ElementosNivelFase1,
} from './NivelFase1';
import { DIALOGO_RADIO_ABERTURA, DIALOGO_RADIO_VITORIA } from './DialogosFase1';
import type { Coordenada2D, SnapshotCheckpointFase1, TotemFase1 } from './tiposFase1';
import {
  MUNDO_FASE1,
  CAMERA_FASE1,
  CHECKPOINTS_FASE1,
  DISTANCIA_INTERACAO_TOTEM_PADRAO,
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_PORTAO,
  TOTEM_4_SEQUENCIADOR,
  SANTUARIO_FASE1,
} from './constantesFase1';

const CHECKPOINTS_EM_ORDEM = [
  CHECKPOINTS_FASE1.CP1,
  CHECKPOINTS_FASE1.CP2,
  CHECKPOINTS_FASE1.CP3,
  CHECKPOINTS_FASE1.CP4,
] as const;

/**
 * CenaFase1: Céu Partido.
 * Orquestra os módulos da fase (jogador, vento, mármore rachado, nível, sentinelas e NPCs),
 * os 4 desafios lógicos do terminal e o sistema de snapshot com reset limpo no respawn.
 */
export class CenaFase1 extends CenaBase {
  private jogador!: JogadorFase1;
  private vento!: VentoFase1;
  private rachados!: PlataformasRachadasFase1;
  private nivel!: ElementosNivelFase1;

  // Estado dos desafios e do respawn
  private totensResolvidos = new Set<string>();
  private snapshotAtual!: SnapshotCheckpointFase1;
  private textoNotificacaoCheckpoint?: Phaser.GameObjects.Text;
  private faseConcluida: boolean = false;

  // Flag de congelamento seguro do mundo durante terminal ou diálogos
  private jogoCongeladoPorMenu: boolean = false;

  constructor() {
    super('CenaFase1', 'fase1');
  }

  create(): void {
    super.create();

    // Reinicia o estado (a instância da cena é reaproveitada entre visitas)
    this.totensResolvidos = new Set<string>();
    this.faseConcluida = false;
    this.jogoCongeladoPorMenu = false;

    // 1. Inicializa o Snapshot com o Checkpoint 0
    this.snapshotAtual = {
      idCheckpoint: 'cp0_inicial',
      pontoSpawn: { ...CHECKPOINTS_FASE1.INICIAL },
      totensResolvidos: [],
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
    criarCenarioParallaxFase1(this);

    // 5. Sistemas da fase e jogador (criado antes de registrar colisores)
    this.vento = new VentoFase1(this);
    this.rachados = new PlataformasRachadasFase1(this);
    this.jogador = new JogadorFase1(this, this.snapshotAtual.pontoSpawn);

    // 6. Construção dos 3 Blocos de Level Design com os 4 Desafios, Sentinelas e NPCs
    this.nivel = construirNivelFase1(this, this.jogador.sprite, this.vento, this.rachados);

    // 7. Colisões com o Jogador
    const spriteJogador = this.jogador.sprite;
    this.physics.add.collider(spriteJogador, this.nivel.plataformasEstaticas);
    this.physics.add.collider(spriteJogador, this.nivel.nuvensSolidas);
    this.physics.add.collider(spriteJogador, this.rachados.grupo, (_jog, plat) => {
      this.rachados.aoPisar(plat as Phaser.Physics.Arcade.Sprite);
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
      }
    });
  }

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);

    if (!this.jogador?.sprite.body) return;

    // 1. Congelamento Seguro no Terminal e Diálogos
    const emMenuOuDialogo = Boolean(this.terminal?.estaAberto || this.comunicador?.estaAtivo);
    if (emMenuOuDialogo) {
      if (!this.jogoCongeladoPorMenu) {
        this.jogoCongeladoPorMenu = true;
        this.congelarJogo();
      }
      this.jogador.congelar();

      for (const s of this.nivel.sentinelas) {
        s.congelar();
      }

      // Evita que plataformas que estavam rachando quebrem durante a digitação
      this.rachados.adiarRachaduras(delta);
      return;
    }

    if (this.jogoCongeladoPorMenu) {
      this.jogoCongeladoPorMenu = false;
      this.descongelarJogo();
    }

    // 2. Checkpoints e queda no abismo
    this.verificarLimitesECheckpoints();

    // 3. Movimentação, Coyote Time, Jump Buffer e Mecânica de Planar no Vento
    this.jogador.update(tempo, delta, this.vento);

    // 4. Mármore rachado
    this.rachados.update(tempo);

    // 5. Colunas de vento e ciclo da Escada de Rajadas (Desafio 4)
    this.vento.update(tempo, delta);

    // 6. Escudo da Sentinela A-01 (Desafio 1)
    if (this.totensResolvidos.has(TOTEM_1_ALCOOLEMIA.ID)) {
      this.nivel.graficoEscudo.clear();
    } else {
      desenharEscudoSentinela(this.nivel.graficoEscudo, tempo);
    }

    // 7. Sentinelas (FPS independente + Pulso Eólico)
    for (const s of this.nivel.sentinelas) {
      s.update(tempo, delta, this.jogador.sprite, emMenuOuDialogo, (sentinela) => {
        this.dispararAlarmeSentinela(sentinela);
      });
    }

    // 8. Interação com NPCs e com os 4 Totens (sem conflito)
    this.tratarInteracoes();

    // 9. Chegada ao Santuário Final
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

  private abrirTerminalTotem(totem: TotemFase1): void {
    this.congelarJogo();
    this.jogoCongeladoPorMenu = true;

    this.terminal.definirContexto({ totemAtivo: totem.id });

    const { TITULO, DIALOGO_INICIAL, VARIAVEIS_DISPONIVEIS, FUNCOES_DISPONIVEIS } = totem.textos;
    const linhasIniciais: string[] = [
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

    this.terminal.abrir({ titulo: TITULO, linhasIniciais });
  }

  // =========================================================================
  // EXECUÇÃO DAS AÇÕES DOS 4 DESAFIOS
  // =========================================================================

  /**
   * Fecha o terminal pouco depois do acerto, para o jogador ler a mensagem de sucesso.
   */
  private fecharTerminalComFeedback(notificacao: string, efeito: () => void): void {
    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      efeito();
      this.mostrarNotificacaoCurta(notificacao);
    });
  }

  private executarDesativarEscudoSentinela(): void {
    this.totensResolvidos.add(TOTEM_1_ALCOOLEMIA.ID);
    this.nivel.sentinela1.hackear();
    this.nivel.barreiraEscudo.destroy();

    this.tweens.add({
      targets: this.nivel.graficoEscudo,
      alpha: 0,
      duration: 500,
      onComplete: () => this.nivel.graficoEscudo.clear(),
    });

    this.fecharTerminalComFeedback('SENTINELA HACKEADA // CORREDOR LIVRE!', () =>
      this.cameras.main.flash(200, 255, 255, 255)
    );
  }

  private executarEstabilizarElevador(): void {
    this.totensResolvidos.add(TOTEM_2_BALANCA.ID);
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
    this.nivel.colisorPortao.destroy();

    this.tweens.add({
      targets: this.nivel.portaoMilenar,
      y: TOTEM_3_PORTAO.Y_PORTAO + TOTEM_3_PORTAO.DESLOCAMENTO_ABERTO_Y,
      alpha: TOTEM_3_PORTAO.ALFA_ABERTO,
      duration: 1400,
      ease: 'Quad.easeInOut',
    });

    this.fecharTerminalComFeedback('PORTÃO MILENAR ABERTO // BLOCO 3 LIBERADO!', () =>
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

  // =========================================================================
  // SISTEMA DE SNAPSHOT E RESPAWN LIMPO
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

  /**
   * Salva o snapshot com o progresso do jogador ao alcançar um novo checkpoint.
   */
  private salvarSnapshotCheckpoint(idCheckpoint: string, ponto: Coordenada2D, nomeNotificacao: string): void {
    this.snapshotAtual = {
      idCheckpoint,
      pontoSpawn: { ...ponto },
      totensResolvidos: [...this.totensResolvidos],
    };

    this.exibirAnimacaoCheckpoint(nomeNotificacao);
  }

  /**
   * Restaura o mundo e o jogador para um estado limpo baseado no último snapshot salvo.
   * - Plataformas rachadas retornam intactas.
   * - Sentinelas ativas retornam às rotas iniciais.
   * - Puzzles concluídos até o checkpoint permanecem abertos/resolvidos.
   */
  private restaurarSnapshot(motivo: string): void {
    const ponto = this.snapshotAtual.pontoSpawn;

    this.jogador.respawnar(ponto);

    // Centraliza câmera instantaneamente no ponto de spawn seguro
    this.cameras.main.centerOn(ponto.x, ponto.y);

    // 1. Reset instantâneo de todas as plataformas de mármore rachado
    this.rachados.resetar();

    // 2. Reset de Sentinelas ativas às posições iniciais
    for (const s of this.nivel.sentinelas) {
      s.resetarPosicao();
    }

    // 3. Reconciliação dos puzzles concluídos no snapshot
    this.totensResolvidos = new Set(this.snapshotAtual.totensResolvidos);

    if (this.totensResolvidos.has(TOTEM_1_ALCOOLEMIA.ID)) {
      this.nivel.barreiraEscudo.destroy();
      this.nivel.graficoEscudo.clear();
      this.nivel.sentinela1.hackear();
    }

    const elevador = this.nivel.elevadorNuvem;
    if (elevador.body) {
      const elevadorY = this.totensResolvidos.has(TOTEM_2_BALANCA.ID)
        ? TOTEM_2_BALANCA.ALTITUDE_ALVO
        : TOTEM_2_BALANCA.ELEVADOR_Y_INICIAL;
      elevador.y = elevadorY;
      (elevador.body as Phaser.Physics.Arcade.Body).reset(TOTEM_2_BALANCA.ELEVADOR_X, elevadorY);
    }

    if (this.totensResolvidos.has(TOTEM_3_PORTAO.ID)) {
      this.nivel.portaoMilenar.y = TOTEM_3_PORTAO.Y_PORTAO + TOTEM_3_PORTAO.DESLOCAMENTO_ABERTO_Y;
      this.nivel.portaoMilenar.setAlpha(TOTEM_3_PORTAO.ALFA_ABERTO);
      this.nivel.colisorPortao.destroy();
    }

    if (this.jogoCongeladoPorMenu) {
      this.jogoCongeladoPorMenu = false;
      this.descongelarJogo();
    }

    this.cameras.main.flash(200, 255, 255, 255);
    this.mostrarNotificacaoCurta(motivo);
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
    });
    txt.setOrigin(0.5);
    txt.setDepth(9995);

    this.tweens.add({
      targets: txt,
      y: txt.y - 30,
      alpha: 0,
      duration: 1600,
      onComplete: () => txt.destroy(),
    });
  }

  private verificarFinalizacaoFase(): void {
    if (this.faseConcluida) return;

    const portal = this.nivel.portalFinal;
    const distPortal = Phaser.Math.Distance.Between(this.jogador.x, this.jogador.y, portal.x, portal.y);
    if (distPortal >= SANTUARIO_FASE1.DISTANCIA_PORTAL) return;

    this.faseConcluida = true;
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
        this.comunicador.iniciarDialogo(DIALOGO_RADIO_VITORIA, () => {
          this.retornarAoHub();
        });
      },
    });
  }
}
