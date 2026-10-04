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
 * janela de transmissão narrativa inicial e bloqueio estrito do Boss Final.
 */
export class CenaHub extends Phaser.Scene {
  private gerenciadorEstado: GerenciadorEstado;
  private isTransicaoAtiva: boolean = false;
  private personagemAtivo: TipoPersonagem = 'alvares';
  private jogador!: Phaser.Physics.Arcade.Sprite;
  private chao!: Phaser.Physics.Arcade.StaticGroup;

  // Caixa de Mensagem Narrativa e Alerta de Bloqueio do Boss
  private containerDialogoHub?: Phaser.GameObjects.Container;
  private containerAvisoBloqueio?: Phaser.GameObjects.Container;

  // Indicador de Interação e Proximidade de Portas
  private portaEmProximidade: PortaHubConfig | null = null;
  private containerIndicadorPorta?: Phaser.GameObjects.Container;

  // Controles de Movimentação e Interação
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclasWASD?: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    enter: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };

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
    this.portaEmProximidade = null;

    // 1. Limpeza defensiva de overlays do DOM
    this.limparOverlaysDOM();

    this.cameras.main.setBackgroundColor('#040810');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 2. Renderização do Cenário de Fundo (cenario_hub)
    const chaveFundo = this.textures.exists('cenario_hub') ? 'cenario_hub' : 'hub_fundo';
    const fundo = this.add.image(width / 2, height / 2, chaveFundo);
    fundo.setDisplaySize(width, height);
    fundo.setDepth(0);

    // 3. Plataforma de colisão do chão metálico
    this.criarChaoFisico(width);

    // 4. Criação das 7 Zonas Interativas e Efeitos Visuais Sutis dos Portais
    this.criarPortaisAlinhados();

    // 5. Instanciação do Operador na passarela horizontal com física Arcade
    this.criarOperadorCenario();

    // 6. Indicador Flutuante de Proximidade das Portas
    this.criarIndicadorProximidade();

    // 7. Botão de Seleção de Operador no canto superior direito
    this.criarBotaoOperadorPremium(width);

    // 8. Janela de Mensagem Narrativa Central do Hub
    this.criarJanelaNarrativaHub(width, height);

    // 9. Efeito CRT scanlines global
    this.criarEfeitoCRT(width, height);

    // 10. Configuração de Controles (Setas, WASD, Enter, Espaço e atalhos [0]-[6], [P])
    this.configurarControles();
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
   * com hover visual limpo (apenas brilho neon sutil, sem exibir detalhes ou desafios).
   */
  private criarPortaisAlinhados(): void {
    for (const cfg of CONFIG_PORTAS) {
      // 1. Gráfico de Efeito de Pulso Luminoso / Holograma do Portal
      const holograma = this.add.graphics();
      holograma.setDepth(6);
      this.hologramasPortais.push(holograma);

      const desenharHolograma = (intensidade: number, emFoco: boolean) => {
        holograma.clear();
        const cor = cfg.corTema;

        if (cfg.isBoss) {
          // Efeito visual do Portal do Boss Final: energia vermelha e sirenes pulsantes
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

      // Hover limpo: apenas efeito visual sutil de brilho/pulso luminoso, sem textos detalhados
      hitArea.on('pointerover', () => {
        desenharHolograma(2.2, true);

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

        this.tweens.add({
          targets: holograma,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 180,
          ease: 'Quad.easeOut',
        });
      });

      // Clique: valida travas do Boss ou movimenta o operador até o portal
      hitArea.on('pointerdown', () => {
        this.tentarAcessarPortal(cfg);
      });
    }
  }

  override update(): void {
    if (this.isTransicaoAtiva || !this.jogador || !this.jogador.body) return;

    // Se o diálogo narrativo inicial estiver ativo, trava a movimentação
    if (this.containerDialogoHub) {
      this.jogador.setVelocityX(0);
      if (this.anims.exists(`${this.personagemAtivo}_idle`)) {
        this.jogador.anims.play(`${this.personagemAtivo}_idle`, true);
      }
      return;
    }

    const isLeft = (this.cursors?.left.isDown ?? false) || (this.teclasWASD?.left.isDown ?? false);
    const isRight = (this.cursors?.right.isDown ?? false) || (this.teclasWASD?.right.isDown ?? false);
    const velocidade = 230;

    if (isLeft && !isRight) {
      this.jogador.setVelocityX(-velocidade);
      this.jogador.setFlipX(true);
      if (this.anims.exists(`${this.personagemAtivo}_run`)) {
        this.jogador.anims.play(`${this.personagemAtivo}_run`, true);
      }
    } else if (isRight && !isLeft) {
      this.jogador.setVelocityX(velocidade);
      this.jogador.setFlipX(false);
      if (this.anims.exists(`${this.personagemAtivo}_run`)) {
        this.jogador.anims.play(`${this.personagemAtivo}_run`, true);
      }
    } else {
      this.jogador.setVelocityX(0);
      if (this.anims.exists(`${this.personagemAtivo}_idle`)) {
        this.jogador.anims.play(`${this.personagemAtivo}_idle`, true);
      }
    }

    // Atualiza detecção de proximidade com as 7 portas
    this.atualizarProximidadePortas();

    // Verificação de tecla ENTER ou ESPAÇO para entrar no setor em foco
    const apertouEnter = this.teclasWASD?.enter && Phaser.Input.Keyboard.JustDown(this.teclasWASD.enter);
    const apertouEspaco = this.teclasWASD?.space && Phaser.Input.Keyboard.JustDown(this.teclasWASD.space);
    if ((apertouEnter || apertouEspaco) && this.portaEmProximidade) {
      this.tentarAcessarPortal(this.portaEmProximidade);
    }
  }

  /**
   * Plataforma estática de colisão alinhada com a grade metálica do piso do Hub (topo em Y = 592).
   */
  private criarChaoFisico(width: number): void {
    this.chao = this.physics.add.staticGroup();
    const barra = this.add.rectangle(width / 2, 604, width, 24, 0x000000, 0);
    this.physics.add.existing(barra, true);
    this.chao.add(barra);
  }

  /**
   * Instancia o operador ativo com física Arcade ativada, gravidade e colisão no chão.
   */
  private criarOperadorCenario(): void {
    this.registrarAnimacoes();

    const chaveSprite = this.personagemAtivo === 'reis' ? 'reis' : 'alvares';
    this.jogador = this.physics.add.sprite(480, 520, chaveSprite);
    this.jogador.setDepth(20);
    this.jogador.setCollideWorldBounds(true);

    const body = this.jogador.body as Phaser.Physics.Arcade.Body;
    body.setSize(44, 96);
    body.setOffset(42, 26);

    this.physics.add.collider(this.jogador, this.chao);

    if (this.anims.exists(`${this.personagemAtivo}_idle`)) {
      this.jogador.anims.play(`${this.personagemAtivo}_idle`, true);
    }
  }

  /**
   * Indicador flutuante para notificar a tecla de entrada sobre o portal em foco,
   * posicionado na parte inferior da tela na cor branca para legibilidade ideal.
   */
  private criarIndicadorProximidade(): void {
    const { width, height } = this.scale;
    this.containerIndicadorPorta = this.add.container(width / 2, height - 48);
    this.containerIndicadorPorta.setDepth(55);
    this.containerIndicadorPorta.setVisible(false);

    const fundo = this.add.graphics();
    fundo.name = 'fundoIndicador';

    const textoPrompt = this.add.text(0, 0, '', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
      letterSpacing: 1.5,
    });
    textoPrompt.setOrigin(0.5);
    textoPrompt.name = 'textoPrompt';

    this.containerIndicadorPorta.add([fundo, textoPrompt]);
  }

  /**
   * Verifica a distância horizontal do jogador até cada portal e atualiza o estado de foco.
   */
  private atualizarProximidadePortas(): void {
    if (!this.jogador) return;

    let portaMaisProxima: PortaHubConfig | null = null;
    let menorDistancia = Infinity;

    for (const cfg of CONFIG_PORTAS) {
      const dx = Math.abs(this.jogador.x - cfg.xPorta);
      const raio = cfg.isBoss ? 120 : 64;
      if (dx <= raio && dx < menorDistancia) {
        menorDistancia = dx;
        portaMaisProxima = cfg;
      }
    }

    if (portaMaisProxima !== this.portaEmProximidade) {
      this.portaEmProximidade = portaMaisProxima;
      if (portaMaisProxima) {
        this.exibirIndicadorPorta(portaMaisProxima);
      } else {
        this.ocultarIndicadorPorta();
      }
    }
  }

  /**
   * Renderiza a etiqueta na parte inferior da tela com fundo contrastante e texto em branco.
   */
  private exibirIndicadorPorta(cfg: PortaHubConfig): void {
    if (!this.containerIndicadorPorta) return;

    const fundo = this.containerIndicadorPorta.getByName('fundoIndicador') as Phaser.GameObjects.Graphics;
    const texto = this.containerIndicadorPorta.getByName('textoPrompt') as Phaser.GameObjects.Text;
    if (!fundo || !texto) return;

    const isBoss = cfg.isBoss === true;
    const isTutorial = cfg.numero === 0;
    const bossLiberado = !isBoss || this.gerenciadorEstado.todasFasesAnterioresConcluidas();

    let strTexto = '';
    if (isBoss && !bossLiberado) {
      strTexto = '[ ACESSO RESTRITO // PORTAL BLOQUEADO ]';
    } else if (isTutorial || isBoss) {
      strTexto = `[ ENTER / ESPAÇO ] ENTRAR: ${cfg.rotuloSetor}`;
    } else {
      strTexto = '[ ENTER / ESPAÇO ] ENTRAR';
    }

    texto.setText(strTexto);
    texto.setColor('#ffffff');

    const padH = 24;
    const largura = Math.max(280, texto.width + padH * 2);
    const altura = 34;

    const corBorda = !bossLiberado ? 0xef4444 : 0xffffff;

    fundo.clear();
    // Fundo escuro de alto contraste
    fundo.fillStyle(0x050c18, 0.95);
    fundo.fillRoundedRect(-largura / 2, -altura / 2, largura, altura, 6);
    // Borda na cor branca (ou vermelha se o boss estiver bloqueado)
    fundo.lineStyle(1.8, corBorda, 0.95);
    fundo.strokeRoundedRect(-largura / 2, -altura / 2, largura, altura, 6);

    // Linha de acento tecnológico sutil no topo do card
    fundo.lineStyle(1, corBorda, 0.4);
    fundo.lineBetween(-largura / 2 + 10, -altura / 2 + 4, largura / 2 - 10, -altura / 2 + 4);

    const { width, height } = this.scale;
    this.containerIndicadorPorta.setPosition(width / 2, height - 48);
    this.containerIndicadorPorta.setVisible(true);
    this.containerIndicadorPorta.setAlpha(0);

    this.tweens.killTweensOf(this.containerIndicadorPorta);
    this.tweens.add({
      targets: this.containerIndicadorPorta,
      alpha: 1,
      duration: 140,
      ease: 'Quad.easeOut',
    });
  }

  /**
   * Oculta o indicador de interação com transição suave.
   */
  private ocultarIndicadorPorta(): void {
    if (!this.containerIndicadorPorta || !this.containerIndicadorPorta.visible) return;

    this.tweens.add({
      targets: this.containerIndicadorPorta,
      alpha: 0,
      duration: 100,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (!this.portaEmProximidade) {
          this.containerIndicadorPorta?.setVisible(false);
        }
      },
    });
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
   * Janela Narrativa do Hub Central com a identidade visual dos terminais/comunicadores.
   * Apresenta as instruções do ambiente livre e pode ser fechada com ENTER ou clique.
   */
  private criarJanelaNarrativaHub(width: number, height: number): void {
    const container = this.add.container(width / 2, height / 2 - 30);
    container.setDepth(85);
    this.containerDialogoHub = container;

    const largura = 720;
    const altura = 290;

    // Fundo escuro translúcido com borda neon ciano
    const fundo = this.add.graphics();
    fundo.fillStyle(0x040a14, 0.95);
    fundo.fillRoundedRect(-largura / 2, -altura / 2, largura, altura, 10);
    fundo.lineStyle(2, 0x00e5ff, 0.95);
    fundo.strokeRoundedRect(-largura / 2, -altura / 2, largura, altura, 10);

    // Barra de cabeçalho
    fundo.fillStyle(0x0b192c, 0.98);
    fundo.fillRoundedRect(-largura / 2 + 3, -altura / 2 + 3, largura - 6, 38, 8);
    fundo.lineStyle(1, 0x00e5ff, 0.5);
    fundo.lineBetween(-largura / 2 + 3, -altura / 2 + 41, largura / 2 - 3, -altura / 2 + 41);

    // Indicador LED verde de transmissão recebida
    const led = this.add.graphics();
    led.fillStyle(0x00ff88, 1);
    led.fillCircle(-largura / 2 + 22, -altura / 2 + 22, 5);

    this.tweens.add({
      targets: led,
      alpha: { from: 0.4, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: 'Sine.easeInOut',
    });

    // Título do cabeçalho
    const textoCabecalho = this.add.text(
      -largura / 2 + 38,
      -altura / 2 + 22,
      '> TERMINAL CENTRAL // TRANSMISSÃO RECEBIDA',
      {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '13px',
        color: '#00e5ff',
        fontStyle: 'bold',
        letterSpacing: 1,
      }
    );
    textoCabecalho.setOrigin(0, 0.5);

    // Corpo da mensagem narrativa
    const corpoTexto =
      'Bem-vindo ao Hub Central de Depuração.\n' +
      'A partir deste setor, não há uma ordem linear rígida: você é livre para explorar os setores de 1 a 5 no ritmo que preferir.\n\n' +
      '• PORTAL 0: Protocolo de Boot (Tutorial e calibragem dos sistemas).\n' +
      '• PORTAL 6: Núcleo do Mega Brain (Setor Final) — ACESSO BLOQUEADO.';

    const textoMensagem = this.add.text(0, -altura / 2 + 118, corpoTexto, {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '13px',
      color: '#e2e8f0',
      lineSpacing: 6,
      align: 'left',
      wordWrap: { width: largura - 50 },
    });
    textoMensagem.setOrigin(0.5, 0.5);

    // Botão / Aviso de fechar no rodapé
    const btnFecharG = this.add.graphics();
    const btnLargura = 280;
    const btnAltura = 34;
    const btnY = altura / 2 - 28;

    const desenharBtn = (hover: boolean) => {
      btnFecharG.clear();
      btnFecharG.fillStyle(hover ? 0x0e2840 : 0x061524, 0.95);
      btnFecharG.fillRoundedRect(-btnLargura / 2, btnY - btnAltura / 2, btnLargura, btnAltura, 6);
      btnFecharG.lineStyle(hover ? 2 : 1.2, hover ? 0x00ff88 : 0x00e5ff, hover ? 1 : 0.7);
      btnFecharG.strokeRoundedRect(-btnLargura / 2, btnY - btnAltura / 2, btnLargura, btnAltura, 6);
    };
    desenharBtn(false);

    const textoBtn = this.add.text(0, btnY, '[ ENTER / CLIQUE PARA FECHAR ]', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '12px',
      color: '#00ff88',
      fontStyle: 'bold',
    });
    textoBtn.setOrigin(0.5);

    const hitAreaFechar = this.add.rectangle(0, btnY, btnLargura, btnAltura, 0x000000, 0.001);
    hitAreaFechar.setInteractive({ useHandCursor: true });

    hitAreaFechar.on('pointerover', () => {
      desenharBtn(true);
      textoBtn.setColor('#ffffff');
    });

    hitAreaFechar.on('pointerout', () => {
      desenharBtn(false);
      textoBtn.setColor('#00ff88');
    });

    const fecharDialogo = () => {
      if (!this.containerDialogoHub) return;
      this.tweens.add({
        targets: this.containerDialogoHub,
        alpha: 0,
        scale: 0.95,
        duration: 200,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.containerDialogoHub?.destroy();
          this.containerDialogoHub = undefined;
        },
      });
    };

    hitAreaFechar.on('pointerdown', fecharDialogo);

    container.add([
      fundo,
      led,
      textoCabecalho,
      textoMensagem,
      btnFecharG,
      textoBtn,
      hitAreaFechar,
    ]);

    // Animação de entrada suave da janela
    container.setScale(0.95);
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: 'Back.easeOut',
    });

    // Teclas Enter ou Espaço fecham a caixa de mensagem narrativa
    if (this.input.keyboard) {
      const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      const fecharComTecla = () => {
        enterKey.off('down', fecharComTecla);
        spaceKey.off('down', fecharComTecla);
        fecharDialogo();
      };
      enterKey.once('down', fecharComTecla);
      spaceKey.once('down', fecharComTecla);
    }
  }

  /**
   * Valida o acesso ao portal. Se for o Portal 6 (Boss Final) e as fases 0 a 5
   * não estiverem todas concluídas, dispara o efeito de trava e o aviso do Mega Brain.
   */
  private tentarAcessarPortal(cfg: PortaHubConfig, imediato: boolean = false): void {
    if (this.isTransicaoAtiva) return;

    // Se o diálogo narrativo estiver visível, fecha ao selecionar um portal
    if (this.containerDialogoHub) {
      this.containerDialogoHub.destroy();
      this.containerDialogoHub = undefined;
    }

    // Validação estrita do Portal 6 (Boss Final)
    if (cfg.numero === 6) {
      const bossLiberado = this.gerenciadorEstado.todasFasesAnterioresConcluidas();
      if (!bossLiberado) {
        this.exibirAvisoBloqueioBoss();
        return;
      }
    }

    if (imediato) {
      this.limparRecursosETransicionar(cfg.chaveCena);
    } else {
      this.moverPersonagemAtePortaEEntrar(cfg);
    }
  }

  /**
   * Efeito de trava e alerta de acesso negado pelo Mega Brain.
   */
  private exibirAvisoBloqueioBoss(): void {
    // Efeito de tremor e flash vermelho
    this.cameras.main.shake(250, 0.012);
    this.cameras.main.flash(200, 255, 30, 40, true);

    if (this.containerAvisoBloqueio) {
      this.containerAvisoBloqueio.destroy();
    }

    const { width } = this.scale;
    const container = this.add.container(width / 2, 70);
    container.setDepth(90);
    this.containerAvisoBloqueio = container;

    const largura = 740;
    const altura = 64;

    const fundo = this.add.graphics();
    fundo.fillStyle(0x1a060a, 0.96);
    fundo.fillRoundedRect(-largura / 2, -altura / 2, largura, altura, 8);
    fundo.lineStyle(2, 0xef4444, 1);
    fundo.strokeRoundedRect(-largura / 2, -altura / 2, largura, altura, 8);

    const textoAlerta = this.add.text(
      0,
      0,
      "[ACESSO NEGADO] Protocolo de contenção ativo.\nComplete todos os setores do barramento antes de desafiar o Núcleo.",
      {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '13px',
        color: '#ff4444',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 4,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: '#ff2222',
          blur: 10,
          fill: true,
        },
      }
    );
    textoAlerta.setOrigin(0.5);

    container.add([fundo, textoAlerta]);

    // Animação de entrada e saída automática após 3.5 segundos
    container.setScale(0.92);
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(3500, () => {
      if (this.containerAvisoBloqueio === container) {
        this.tweens.add({
          targets: container,
          alpha: 0,
          scale: 0.95,
          duration: 300,
          ease: 'Sine.easeIn',
          onComplete: () => {
            container.destroy();
            if (this.containerAvisoBloqueio === container) {
              this.containerAvisoBloqueio = undefined;
            }
          },
        });
      }
    });
  }

  /**
   * Move o operador até o portal escolhido, executa a virada de costas e inicia a fase.
   */
  private moverPersonagemAtePortaEEntrar(cfg: PortaHubConfig): void {
    if (this.isTransicaoAtiva) return;
    this.isTransicaoAtiva = true;

    if (!this.jogador) {
      this.limparRecursosETransicionar(cfg.chaveCena);
      return;
    }

    // Trava física e movimentação imediatamente
    this.jogador.setVelocity(0, 0);
    if (this.jogador.body) {
      (this.jogador.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }
    this.ocultarIndicadorPorta();

    const destinoX = cfg.xPorta;
    const destinoY = 535;

    // Orienta o operador para a esquerda ou direita
    const olhandoEsquerda = destinoX < this.jogador.x;
    this.jogador.setFlipX(olhandoEsquerda);

    const distancia = Math.abs(this.jogador.x - destinoX);

    // Se já estiver posicionado em frente à porta (andou até ela)
    if (distancia < 20) {
      this.jogador.setPosition(destinoX, destinoY);
      this.executarAnimacaoEntrada(cfg, destinoY);
      return;
    }

    // Se veio de clique do mouse de longe, corre até o portal
    if (this.anims.exists(`${this.personagemAtivo}_run`)) {
      this.jogador.anims.play(`${this.personagemAtivo}_run`, true);
    }

    const duracaoMovimento = Math.max(250, Math.min(800, distancia * 1.5));

    this.tweens.add({
      targets: this.jogador,
      x: destinoX,
      y: destinoY,
      duration: duracaoMovimento,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.executarAnimacaoEntrada(cfg, destinoY);
      },
    });
  }

  private executarAnimacaoEntrada(cfg: PortaHubConfig, destinoY: number): void {
    this.jogador.anims.stop();
    // Vira de costas para a porta
    this.jogador.setFrame(2);

    // Flash sutil de abertura de portal
    const corFlash = cfg.isBoss ? { r: 255, g: 30, b: 60 } : { r: 0, g: 255, b: 180 };
    this.cameras.main.flash(180, corFlash.r, corFlash.g, corFlash.b);

    // Entra no portal com encolhimento e fade
    this.tweens.add({
      targets: this.jogador,
      y: destinoY - 12,
      scale: 0.72,
      alpha: 0.1,
      duration: 250,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.limparRecursosETransicionar(cfg.chaveCena);
      },
    });
  }

  /**
   * Limpa rigorosamente todos os tweens, listeners do teclado e timers da cena
   * antes de iniciar a nova fase, eliminando qualquer risco de vazamento de memória.
   */
  private limparRecursosETransicionar(chaveCena: string, dados?: any): void {
    if (this.containerDialogoHub) {
      this.containerDialogoHub.destroy();
      this.containerDialogoHub = undefined;
    }

    if (this.containerAvisoBloqueio) {
      this.containerAvisoBloqueio.destroy();
      this.containerAvisoBloqueio = undefined;
    }

    if (this.containerIndicadorPorta) {
      this.containerIndicadorPorta.destroy();
      this.containerIndicadorPorta = undefined;
    }

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
   * Configura os controles completos de teclado:
   * - Movimentação horizontal com WASD e Setas
   * - Confirmação de entrada nas portas com ENTER e ESPAÇO
   * - Atalhos diretos [0] a [6] para acessar os portais
   * - Tecla [P] para seleção de operador
   */
  private configurarControles(): void {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.teclasWASD = {
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };

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
          this.tentarAcessarPortal(cfg, true);
        }
      });
    }
  }

  /**
   * Atualiza o operador ativo e recarrega sua textura no Hub.
   */
  public atualizarOperadorAtivo(): void {
    this.personagemAtivo = GerenciadorEstado.obterPersonagem();
    if (this.jogador) {
      this.jogador.setTexture(this.personagemAtivo);
      if (this.anims.exists(`${this.personagemAtivo}_idle`)) {
        this.jogador.anims.play(`${this.personagemAtivo}_idle`, true);
      }
    }
  }

  private abrirSelecaoPersonagem(): void {
    if (this.isTransicaoAtiva) return;
    this.limparRecursosETransicionar('CenaSelecaoPersonagem', { proximaCena: 'CenaHub' });
  }
}
