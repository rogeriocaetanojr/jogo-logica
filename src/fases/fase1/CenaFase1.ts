import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase1 } from './InterpretadorFase1';
import type { SentinelaFase1 } from './SentinelaFase1';
import { JogadorFase1 } from './JogadorFase1';
import { VentoFase1, lerParametrosEscada } from './VentoFase1';
import { PlataformasInstaveisFase1 } from './PlataformasFase1';
import { gerarTexturasFase1 } from './TexturasFase1';
import {
  construirNivelFase1,
  criarCenarioParallaxFase1,
  desenharEscudoSentinela,
  type ElementosNivelFase1,
} from './NivelFase1';
import { DIALOGO_RADIO_ABERTURA, DIALOGO_RADIO_VITORIA, TEXTOS_TERMINAL_FASE1 } from './DialogosFase1';
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
  SENTINELAS_FASE1,
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_PORTAO,
  TOTEM_4_SEQUENCIADOR,
  ARENA_FASE1,
} from './constantesFase1';

const CHECKPOINTS_EM_ORDEM = [
  CHECKPOINTS_FASE1.CP1,
  CHECKPOINTS_FASE1.CP2,
  CHECKPOINTS_FASE1.CP3,
  CHECKPOINTS_FASE1.CP4,
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

  // Terminal: totem conectado, erros por totem (liberam o esqueleto no help) e simulação do Desafio 4
  private totemAberto?: TotemFase1;
  private errosPorTotem = new Map<string, number>();
  private simulacaoRajadas: 'nenhuma' | 'agendada' | 'rodando' = 'nenhuma';

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
    this.faseConcluida = false;
    this.totemAberto = undefined;
    this.errosPorTotem = new Map<string, number>();
    this.simulacaoRajadas = 'nenhuma';
    this.jogoCongeladoPorMenu = false;

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
    criarCenarioParallaxFase1(this);

    // 5. Sistemas da fase e jogador (criado antes de registrar colisores)
    this.vento = new VentoFase1(this);
    this.instaveis = new PlataformasInstaveisFase1(this);
    this.jogador = new JogadorFase1(this, this.snapshotAtual.pontoSpawn);

    // 6. Construção dos 4 blocos de level design com os 4 desafios, sentinelas e NPCs
    this.nivel = construirNivelFase1(this, this.jogador.sprite, this.vento, this.instaveis);

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
        case 'FEEDBACK_ERRO':
          this.tratarFeedbackErro(resultado.valor);
          break;
      }
    });
  }

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);

    if (!this.jogador?.sprite.body) return;

    // 1. Congelamento Seguro no Terminal e Diálogos
    const emMenuOuDialogo = Boolean(
      this.terminal?.estaAberto || this.comunicador?.estaAtivo || this.simulacaoRajadas !== 'nenhuma'
    );
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

    // 2. Checkpoints, queda no abismo e a porta da arena
    this.verificarLimitesECheckpoints();
    if (!this.portaArenaFechada && this.jogador.x >= ARENA_FASE1.PORTA.gatilhoX) {
      this.fecharPortaArena();
    }

    // 3. Movimentação, Coyote Time, Jump Buffer e Mecânica de Planar no Vento
    this.jogador.update(tempo, delta, this.vento);

    // 4. Plataformas que somem e plataformas móveis
    this.instaveis.update(tempo);
    for (const movel of this.nivel.plataformasMoveis) {
      movel.update(delta);
    }

    // 5. Colunas, zonas de vento contrário, gêiseres e a Escada de Rajadas (Desafio 4)
    this.vento.update(tempo, delta);

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

    // 8. Interação com NPCs e com os 4 Totens (sem conflito)
    this.tratarInteracoes();

    // 9. Chegada ao portal da arena
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
    this.mostrarNotificacaoCurta('PORTA SELADA // AGORA É VOCÊ E O VENTO');
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
    this.exibirAnimacaoCheckpoint(nomeNotificacao);
  }

  /**
   * Devolve o jogador ao último checkpoint com o mundo em estado limpo.
   * - Plataformas que somem voltam intactas.
   * - Sentinelas não hackeadas voltam às rotas iniciais.
   * - Desafios resolvidos continuam resolvidos (escudo, elevador, portão e escada não voltam atrás).
   */
  private restaurarSnapshot(motivo: string): void {
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
    if (distPortal >= ARENA_FASE1.DISTANCIA_PORTAL) return;

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
