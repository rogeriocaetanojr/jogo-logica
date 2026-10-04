import Phaser from 'phaser';
import { GerenciadorEstado, type TipoPersonagem } from '../nucleo/GerenciadorEstado';

interface PortaHubConfig {
  numero: number;
  idFase: string;
  chaveCena: string;
  rotuloSetor: string;
  nomeMissao: string;
  corTema: number;
  corHex: string;
  xPorta: number;
  yPorta: number;
  largura: number;
  altura: number;
  isBoss?: boolean;
}

const CONFIG_PORTAS: PortaHubConfig[] = [
  {
    numero: 0,
    idFase: 'fase0_tutorial',
    chaveCena: 'CenaTutorial',
    rotuloSetor: 'SETOR 0: TUTORIAL',
    nomeMissao: 'O Despertar do Kernel',
    corTema: 0x22c55e,
    corHex: '#22c55e',
    xPorta: 98,
    yPorta: 488,
    largura: 116,
    altura: 196,
  },
  {
    numero: 1,
    idFase: 'fase1',
    chaveCena: 'CenaFase1',
    rotuloSetor: 'SETOR 1: CONDICIONAIS',
    nomeMissao: 'Painéis Condicionais e Portas Lógicas',
    corTema: 0x06b6d4,
    corHex: '#06b6d4',
    xPorta: 251,
    yPorta: 488,
    largura: 116,
    altura: 196,
  },
  {
    numero: 2,
    idFase: 'fase2',
    chaveCena: 'CenaFase2',
    rotuloSetor: 'SETOR 2: LOOPS',
    nomeMissao: 'Esteiras de Repetição e Automação',
    corTema: 0x38bdf8,
    corHex: '#38bdf8',
    xPorta: 414,
    yPorta: 488,
    largura: 116,
    altura: 196,
  },
  {
    numero: 3,
    idFase: 'fase3',
    chaveCena: 'CenaFase3',
    rotuloSetor: 'SETOR 3: HARDWARE',
    nomeMissao: 'Lixão de Hardware e Registradores',
    corTema: 0x3b82f6,
    corHex: '#3b82f6',
    xPorta: 569,
    yPorta: 488,
    largura: 116,
    altura: 196,
  },
  {
    numero: 4,
    idFase: 'fase4',
    chaveCena: 'CenaFase4',
    rotuloSetor: 'SETOR 4: FUNÇÕES',
    nomeMissao: 'Módulos e Pilha de Execução',
    corTema: 0xa855f7,
    corHex: '#a855f7',
    xPorta: 726,
    yPorta: 488,
    largura: 116,
    altura: 196,
  },
  {
    numero: 5,
    idFase: 'fase5',
    chaveCena: 'CenaFase5',
    rotuloSetor: 'SETOR 5: DADOS',
    nomeMissao: 'Estruturas de Dados e Roteamento',
    corTema: 0xec4899,
    corHex: '#ec4899',
    xPorta: 882,
    yPorta: 488,
    largura: 116,
    altura: 196,
  },
  {
    numero: 6,
    idFase: 'fase_final',
    chaveCena: 'CenaFaseFinal',
    rotuloSetor: 'SETOR 6: NÚCLEO DO MEGA BRAIN',
    nomeMissao: 'Confronto Definitivo // Boss Final',
    corTema: 0xef4444,
    corHex: '#ef4444',
    xPorta: 1112,
    yPorta: 422,
    largura: 232,
    altura: 328,
    isBoss: true,
  },
];

/**
 * CenaHub: Hub Central com 7 portais alinhados horizontalmente no piso,
 * incluindo o portal colossal do Boss Final (Mega Brain) na extrema direita.
 */
export class CenaHub extends Phaser.Scene {
  private gerenciadorEstado: GerenciadorEstado;
  private isTransicaoAtiva: boolean = false;
  private personagemAtivo: TipoPersonagem = 'alvares';
  private spritePersonagem!: Phaser.GameObjects.Sprite;

  // Componentes do Tooltip / Painel de Status Superior
  private containerTooltip!: Phaser.GameObjects.Container;
  private fundoTooltip!: Phaser.GameObjects.Graphics;
  private textoTooltipLinha1!: Phaser.GameObjects.Text;
  private textoTooltipLinha2!: Phaser.GameObjects.Text;

  // Lista de referências para limpeza rigorosa
  private hologramasPortais: Phaser.GameObjects.Graphics[] = [];
  private hitboxesPortais: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super('CenaHub');
    this.gerenciadorEstado = GerenciadorEstado.obterInstancia();
  }

  preload(): void {
    if (!this.textures.exists('cenario_hub')) {
      this.load.image('cenario_hub', 'assets/hub/cenario_hub.png');
    }

    if (!this.textures.exists('alvares')) {
      this.load.spritesheet('alvares', 'assets/personagens/alvares.png', {
        frameWidth: 128,
        frameHeight: 128,
      });
    }

    if (!this.textures.exists('reis')) {
      this.load.spritesheet('reis', 'assets/personagens/reis.png', {
        frameWidth: 128,
        frameHeight: 128,
      });
    }
  }

  create(): void {
    const { width, height } = this.scale;
    this.isTransicaoAtiva = false;
    this.personagemAtivo = GerenciadorEstado.obterPersonagem();
    this.hologramasPortais = [];
    this.hitboxesPortais = [];

    // 1. Limpeza defensiva de overlays do DOM
    this.limparOverlaysDOM();

    this.cameras.main.setBackgroundColor('#040810');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 2. Renderização do Cenário de Fundo (cenario_hub)
    const chaveFundo = this.textures.exists('cenario_hub') ? 'cenario_hub' : 'hub_fundo';
    const fundo = this.add.image(width / 2, height / 2, chaveFundo);
    fundo.setDisplaySize(width, height);
    fundo.setDepth(0);

    // 3. Criação das 7 Zonas Interativas e Efeitos dos Portais
    this.criarPortaisAlinhados();

    // 4. Instanciação do Operador na passarela horizontal (Y alinhado ao piso metálico)
    this.criarOperadorCenario();

    // 5. Tooltip / Painel de Status Superior Dinâmico
    this.criarPainelStatusSuperior(width);

    // 6. Botão de Seleção de Operador no canto superior direito
    this.criarBotaoOperadorPremium(width);

    // 7. Efeito CRT scanlines global
    this.criarEfeitoCRT(width, height);

    // 8. Suporte a Atalhos de Teclado ([0] a [6] e [P])
    this.configurarTeclasAtalho();
  }

  private limparOverlaysDOM(): void {
    const terminalOverlay = document.getElementById('terminal-overlay');
    if (terminalOverlay) {
      terminalOverlay.classList.add('hidden');
    }
    const dialogOverlay = document.getElementById('dialog-overlay');
    if (dialogOverlay) {
      dialogOverlay.classList.add('hidden');
    }
  }

  /**
   * Mapeia os 7 portais alinhados da esquerda para a direita,
   * configurando áreas interativas, pulsos holográficos e feedback no hover/clique.
   */
  private criarPortaisAlinhados(): void {
    const listaFases = this.gerenciadorEstado.obterListaFases();

    for (const cfg of CONFIG_PORTAS) {
      const infoFase = listaFases.find((f) => f.id === cfg.idFase);
      const isConcluida = infoFase ? this.gerenciadorEstado.estaConcluida(infoFase.id) : false;
      const isDesbloqueada = infoFase
        ? infoFase.desbloqueada || isConcluida || cfg.numero === 0
        : cfg.numero === 0;

      // 1. Gráfico de Efeito de Pulso Luminoso / Holograma do Portal
      const holograma = this.add.graphics();
      holograma.setDepth(6);
      this.hologramasPortais.push(holograma);

      const desenharHolograma = (intensidade: number, emFoco: boolean) => {
        holograma.clear();
        const cor = cfg.corTema;

        if (cfg.isBoss) {
          // Efeito especial do Portal do Boss Final: energia pulsante vermelha e sirenes
          holograma.fillStyle(0xff1133, 0.08 * intensidade);
          holograma.fillRoundedRect(
            cfg.xPorta - cfg.largura / 2,
            cfg.yPorta - cfg.altura / 2,
            cfg.largura,
            cfg.altura,
            12
          );

          // Contorno de alerta vibrante
          holograma.lineStyle(emFoco ? 3.5 : 2, 0xff2244, 0.6 * intensidade);
          holograma.strokeRoundedRect(
            cfg.xPorta - cfg.largura / 2,
            cfg.yPorta - cfg.altura / 2,
            cfg.largura,
            cfg.altura,
            12
          );

          // Luzes de sirene no topo do Boss Portal
          holograma.fillStyle(0xff0033, 0.4 * intensidade);
          holograma.fillCircle(cfg.xPorta - 82, cfg.yPorta - cfg.altura / 2 + 18, 10);
          holograma.fillCircle(cfg.xPorta + 82, cfg.yPorta - cfg.altura / 2 + 18, 10);
        } else {
          // Portais comuns (0 a 5): feixe holográfico e aura de porta
          holograma.fillStyle(cor, 0.06 * intensidade);
          holograma.fillRoundedRect(
            cfg.xPorta - cfg.largura / 2,
            cfg.yPorta - cfg.altura / 2,
            cfg.largura,
            cfg.altura,
            8
          );

          // Borda neon destacada
          holograma.lineStyle(emFoco ? 2.8 : 1.5, cor, 0.5 * intensidade);
          holograma.strokeRoundedRect(
            cfg.xPorta - cfg.largura / 2,
            cfg.yPorta - cfg.altura / 2,
            cfg.largura,
            cfg.altura,
            8
          );
        }
      };

      // Desenho em repouso
      desenharHolograma(1, false);

      // Tween de pulso luminoso contínuo suave no holograma
      this.tweens.add({
        targets: holograma,
        alpha: { from: 0.65, to: 1.0 },
        yoyo: true,
        repeat: -1,
        duration: cfg.isBoss ? 800 : 1400 + cfg.numero * 120,
        ease: 'Sine.easeInOut',
      });

      // 2. Área Retangular Interativa / Hitbox exatamente sobre o portal
      const hitArea = this.add.rectangle(
        cfg.xPorta,
        cfg.yPorta,
        cfg.largura,
        cfg.altura,
        0x000000,
        0.001
      );
      hitArea.setDepth(25);
      hitArea.setInteractive({ useHandCursor: true });
      this.hitboxesPortais.push(hitArea);

      // Status descritivo para o tooltip
      const statusLabel = isConcluida ? 'CONCLUÍDO' : isDesbloqueada ? 'PRONTO' : 'BLOQUEADO';
      const corStatus = isConcluida ? '#10b981' : isDesbloqueada ? '#00e5ff' : '#ef4444';

      // Feedback no Hover: pulso luminoso, leve tween e tooltip superior discreto
      hitArea.on('pointerover', () => {
        desenharHolograma(2.2, true);

        // Atualiza a caixa de diálogo/tooltip superior discreta
        this.atualizarPainelStatus(
          cfg.rotuloSetor,
          `MISSÃO: ${cfg.nomeMissao}  |  STATUS: [ ${statusLabel} ]`,
          cfg.corHex,
          corStatus
        );

        // Leve tween de elevação / brilho no holograma
        this.tweens.add({
          targets: holograma,
          scaleX: 1.025,
          scaleY: 1.02,
          duration: 180,
          ease: 'Quad.easeOut',
        });
      });

      hitArea.on('pointerout', () => {
        desenharHolograma(1, false);
        this.resetarPainelStatus();

        this.tweens.add({
          targets: holograma,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 180,
          ease: 'Quad.easeOut',
        });
      });

      // Feedback ao Clicar: o operador caminha até o portal e ingressa na fase
      hitArea.on('pointerdown', () => {
        this.moverPersonagemAtePortaEEntrar(cfg);
      });
    }
  }

  /**
   * Instancia o operador na passarela metálica com base em Y=535
   * para que seus pés descansem perfeitamente na área caminhável do piso.
   */
  private criarOperadorCenario(): void {
    this.registrarAnimacoes();

    const chaveSprite = this.personagemAtivo === 'reis' ? 'reis' : 'alvares';
    // Posição inicial no centro do corredor caminhável
    this.spritePersonagem = this.add.sprite(480, 535, chaveSprite);
    this.spritePersonagem.setDepth(18);

    if (this.anims.exists(`${this.personagemAtivo}_idle`)) {
      this.spritePersonagem.anims.play(`${this.personagemAtivo}_idle`, true);
    }
  }

  private registrarAnimacoes(): void {
    const tipos: TipoPersonagem[] = ['alvares', 'reis'];
    for (const t of tipos) {
      if (!this.textures.exists(t)) continue;

      if (!this.anims.exists(`${t}_idle`)) {
        this.anims.create({
          key: `${t}_idle`,
          frames: this.anims.generateFrameNumbers(t, { frames: [0] }),
          frameRate: 1,
          repeat: -1,
        });
      }

      if (!this.anims.exists(`${t}_run`)) {
        this.anims.create({
          key: `${t}_run`,
          frames: this.anims.generateFrameNumbers(t, { frames: [1] }),
          frameRate: 8,
          repeat: -1,
        });
      }
    }
  }

  /**
   * Painel de Status / Tooltip Superior Dinâmico (discreto, estilo terminal CRT sci-fi).
   */
  private criarPainelStatusSuperior(width: number): void {
    const painelX = width / 2 - 40;
    const painelY = 38;

    this.containerTooltip = this.add.container(painelX, painelY);
    this.containerTooltip.setDepth(55);

    this.fundoTooltip = this.add.graphics();
    this.desenharFundoTooltip(0x06111e, 0x00ff88, 1.5);

    this.textoTooltipLinha1 = this.add.text(0, -9, 'CENTRAL DE OPERAÇÕES // TERMINAL DO HUB', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '12px',
      color: '#00ff88',
      fontStyle: 'bold',
      letterSpacing: 1,
    });
    this.textoTooltipLinha1.setOrigin(0.5);

    this.textoTooltipLinha2 = this.add.text(
      0,
      9,
      'PASSE O MOUSE SOBRE UM PORTAL OU USE AS TECLAS [0] A [6]',
      {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '10px',
        color: '#94a3b8',
      }
    );
    this.textoTooltipLinha2.setOrigin(0.5);

    this.containerTooltip.add([
      this.fundoTooltip,
      this.textoTooltipLinha1,
      this.textoTooltipLinha2,
    ]);
  }

  private desenharFundoTooltip(corFundo: number, corBorda: number, espessura: number): void {
    const largura = 540;
    const altura = 46;

    this.fundoTooltip.clear();
    this.fundoTooltip.fillStyle(corFundo, 0.94);
    this.fundoTooltip.fillRoundedRect(-largura / 2, -altura / 2, largura, altura, 6);

    this.fundoTooltip.lineStyle(espessura, corBorda, 0.9);
    this.fundoTooltip.strokeRoundedRect(-largura / 2, -altura / 2, largura, altura, 6);

    // Friso decorativo sutil
    this.fundoTooltip.lineStyle(1, corBorda, 0.4);
    this.fundoTooltip.lineBetween(-largura / 2 + 16, -altura / 2 + 3, largura / 2 - 16, -altura / 2 + 3);
  }

  private atualizarPainelStatus(
    linha1: string,
    linha2: string,
    corTema: string,
    corStatus: string
  ): void {
    this.textoTooltipLinha1.setText(linha1);
    this.textoTooltipLinha1.setColor(corTema);

    this.textoTooltipLinha2.setText(linha2);
    this.textoTooltipLinha2.setColor(corStatus);

    const corHexNum = parseInt(corTema.replace('#', '0x'), 16);
    this.desenharFundoTooltip(0x0a1628, corHexNum, 2.2);

    this.tweens.add({
      targets: this.containerTooltip,
      scale: 1.02,
      duration: 120,
      ease: 'Quad.easeOut',
    });
  }

  private resetarPainelStatus(): void {
    this.textoTooltipLinha1.setText('CENTRAL DE OPERAÇÕES // TERMINAL DO HUB');
    this.textoTooltipLinha1.setColor('#00ff88');

    this.textoTooltipLinha2.setText('PASSE O MOUSE SOBRE UM PORTAL OU USE AS TECLAS [0] A [6]');
    this.textoTooltipLinha2.setColor('#94a3b8');

    this.desenharFundoTooltip(0x06111e, 0x00ff88, 1.5);

    this.tweens.add({
      targets: this.containerTooltip,
      scale: 1.0,
      duration: 140,
      ease: 'Quad.easeOut',
    });
  }

  /**
   * Move o operador até o portal escolhido, executa a virada de costas e inicia a fase.
   */
  private moverPersonagemAtePortaEEntrar(cfg: PortaHubConfig): void {
    if (this.isTransicaoAtiva) return;
    this.isTransicaoAtiva = true;

    if (!this.spritePersonagem) {
      this.limparRecursosETransicionar(cfg.chaveCena);
      return;
    }

    const destinoX = cfg.xPorta;
    const destinoY = 535;

    // Orienta o operador para a esquerda ou direita
    const olhandoEsquerda = destinoX < this.spritePersonagem.x;
    this.spritePersonagem.setFlipX(olhandoEsquerda);

    // Inicia a animação de corrida
    if (this.anims.exists(`${this.personagemAtivo}_run`)) {
      this.spritePersonagem.anims.play(`${this.personagemAtivo}_run`, true);
    }

    const distancia = Math.abs(this.spritePersonagem.x - destinoX);
    const duracaoMovimento = Math.max(300, Math.min(850, distancia * 1.5));

    this.tweens.add({
      targets: this.spritePersonagem,
      x: destinoX,
      y: destinoY,
      duration: duracaoMovimento,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.spritePersonagem.anims.stop();
        // Vira de costas para a porta
        this.spritePersonagem.setFrame(2);

        // Flash sutil de abertura de portal
        const corFlash = cfg.isBoss ? { r: 255, g: 30, b: 60 } : { r: 0, g: 255, b: 180 };
        this.cameras.main.flash(180, corFlash.r, corFlash.g, corFlash.b);

        // Entra no portal com encolhimento e fade
        this.tweens.add({
          targets: this.spritePersonagem,
          y: destinoY - 12,
          scale: 0.72,
          alpha: 0.1,
          duration: 250,
          ease: 'Sine.easeIn',
          onComplete: () => {
            this.limparRecursosETransicionar(cfg.chaveCena);
          },
        });
      },
    });
  }

  /**
   * Limpa rigorosamente todos os tweens, listeners do teclado e timers da cena
   * antes de iniciar a nova fase, eliminando qualquer risco de vazamento de memória.
   */
  private limparRecursosETransicionar(chaveCena: string, dados?: any): void {
    // 1. Remove interatividade de todas as hitboxes
    for (const h of this.hitboxesPortais) {
      h.disableInteractive();
      h.removeAllListeners();
    }
    this.hitboxesPortais = [];

    // 2. Mata todos os tweens do Hub
    this.tweens.killAll();

    // 3. Remove todos os listeners do teclado
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }

    // 4. Remove listeners globais de input e eventos de tempo
    this.input.removeAllListeners();

    // 5. Fade out limpo e transição para a cena alvo
    this.cameras.main.fade(280, 0, 0, 0);
    this.time.delayedCall(280, () => {
      this.time.removeAllEvents();
      this.scene.start(chaveCena, dados);
    });
  }

  /**
   * Botão de Seleção de Operador no canto superior direito.
   */
  private criarBotaoOperadorPremium(width: number): void {
    const btnX = width - 135;
    const btnY = 38;

    const container = this.add.container(btnX, btnY);
    container.setDepth(60);

    const nomeOperador = this.personagemAtivo === 'reis' ? 'REIS' : 'ALVARES';
    const corTema = this.personagemAtivo === 'reis' ? 0xf87171 : 0xfacc15;
    const corTexto = this.personagemAtivo === 'reis' ? '#f87171' : '#facc15';
    const letraInicial = this.personagemAtivo === 'reis' ? 'R' : 'A';

    const btnFundo = this.add.graphics();
    const desenharFundo = (isHover: boolean) => {
      btnFundo.clear();
      btnFundo.fillStyle(isHover ? 0x0f253a : 0x06111e, isHover ? 0.98 : 0.92);
      btnFundo.fillRoundedRect(-105, -22, 210, 44, 8);

      btnFundo.lineStyle(isHover ? 2.5 : 1.8, isHover ? 0x00ffcc : corTema, 0.95);
      btnFundo.strokeRoundedRect(-105, -22, 210, 44, 8);

      btnFundo.lineStyle(1.2, 0x00ffcc, isHover ? 0.9 : 0.4);
      btnFundo.lineBetween(-85, -18, 85, -18);
    };

    desenharFundo(false);

    const emblemaG = this.add.graphics();
    emblemaG.fillStyle(0x0c1b2c, 1);
    emblemaG.fillCircle(-78, 0, 14);
    emblemaG.lineStyle(1.6, corTema, 0.95);
    emblemaG.strokeCircle(-78, 0, 14);

    const textoEmblema = this.add.text(-78, 0, letraInicial, {
      fontFamily: 'Consolas, monospace',
      fontSize: '13px',
      color: corTexto,
      fontStyle: 'bold',
    });
    textoEmblema.setOrigin(0.5);

    const textoSub = this.add.text(-56, -7, 'OPERADOR ATIVO', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '9px',
      color: '#94a3b8',
      letterSpacing: 1,
    });
    textoSub.setOrigin(0, 0.5);

    const textoPrincipal = this.add.text(-56, 7, `[P] ${nomeOperador}`, {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '13px',
      color: corTexto,
      fontStyle: 'bold',
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: corTexto,
        blur: 8,
        fill: true,
      },
    });
    textoPrincipal.setOrigin(0, 0.5);

    const ledG = this.add.graphics();
    ledG.fillStyle(0x10b981, 1);
    ledG.fillCircle(88, 0, 4);

    this.tweens.add({
      targets: ledG,
      alpha: { from: 0.3, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine.easeInOut',
    });

    const hitArea = this.add.rectangle(0, 0, 210, 44, 0x000000, 0.001);
    hitArea.setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      desenharFundo(true);
      container.setScale(1.03);
    });

    hitArea.on('pointerout', () => {
      desenharFundo(false);
      container.setScale(1.0);
    });

    hitArea.on('pointerdown', () => {
      this.abrirSelecaoPersonagem();
    });

    container.add([btnFundo, emblemaG, textoEmblema, textoSub, textoPrincipal, ledG, hitArea]);
  }

  private criarEfeitoCRT(width: number, height: number): void {
    const scanlines = this.add.graphics();
    scanlines.fillStyle(0x00100a, 0.035);

    for (let y = 0; y < height; y += 4) {
      scanlines.fillRect(0, y, width, 2);
    }
    scanlines.setDepth(99);
  }

  /**
   * Configura os atalhos de teclado:
   * - Teclas [0] a [6] carregam imediatamente a fase correspondente.
   * - Tecla [P] abre a seleção de operador.
   */
  private configurarTeclasAtalho(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown-P', () => {
      this.abrirSelecaoPersonagem();
    });

    const mapaIndices: { [key: string]: number } = {
      ZERO: 0,
      NUMPAD_ZERO: 0,
      ONE: 1,
      NUMPAD_ONE: 1,
      TWO: 2,
      NUMPAD_TWO: 2,
      THREE: 3,
      NUMPAD_THREE: 3,
      FOUR: 4,
      NUMPAD_FOUR: 4,
      FIVE: 5,
      NUMPAD_FIVE: 5,
      SIX: 6,
      NUMPAD_SIX: 6,
    };

    for (const [tecla, indice] of Object.entries(mapaIndices)) {
      this.input.keyboard.on(`keydown-${tecla}`, () => {
        const cfg = CONFIG_PORTAS[indice];
        if (cfg) {
          // Teclas numéricas carregam imediatamente a fase correspondente
          this.limparRecursosETransicionar(cfg.chaveCena);
        }
      });
    }
  }

  private abrirSelecaoPersonagem(): void {
    if (this.isTransicaoAtiva) return;
    this.limparRecursosETransicionar('CenaSelecaoPersonagem', { proximaCena: 'CenaHub' });
  }
}
