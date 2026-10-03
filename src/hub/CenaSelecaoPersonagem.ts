import Phaser from 'phaser';
import { CenaBase } from '../compartilhado/CenaBase';
import { GerenciadorEstado, type TipoPersonagem } from '../nucleo/GerenciadorEstado';

interface DadosCenaSelecao {
  proximaCena?: string;
  dadosProximaCena?: unknown;
}

/**
 * CenaSelecaoPersonagem: Tela de seleção de operador hacker retro cyberpunk.
 * Permite ao jogador alternar entre os protagonistas Alvares e Reis.
 */
export class CenaSelecaoPersonagem extends CenaBase {
  private proximaCena?: string;
  private dadosProximaCena?: unknown;
  private personagemAtual: TipoPersonagem = 'alvares';

  private cardAlvares!: Phaser.GameObjects.Container;
  private cardReis!: Phaser.GameObjects.Container;
  private badgeAlvares!: Phaser.GameObjects.Container;
  private badgeReis!: Phaser.GameObjects.Container;

  private teclaUm?: Phaser.Input.Keyboard.Key;
  private teclaUmNum?: Phaser.Input.Keyboard.Key;
  private teclaDois?: Phaser.Input.Keyboard.Key;
  private teclaDoisNum?: Phaser.Input.Keyboard.Key;
  private isTransicaoAtiva: boolean = false;

  constructor() {
    super('CenaSelecaoPersonagem', 'selecao_personagem');
  }

  override init(dados?: DadosCenaSelecao): void {
    if (dados) {
      this.proximaCena = dados.proximaCena;
      this.dadosProximaCena = dados.dadosProximaCena;
    }
  }

  override preload(): void {
    super.preload();
  }

  override create(): void {
    super.create();

    const { width, height } = this.scale;
    this.isTransicaoAtiva = false;
    this.personagemAtual = GerenciadorEstado.obterPersonagem();

    this.cameras.main.setBackgroundColor('#050811');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.criarCenarioFundo(width, height);
    this.criarCabecalho(width);
    this.criarBotaoVoltar(width);
    this.criarCardsPersonagens(width, height);
    this.configurarTeclas();
    this.criarRodape(width, height);

    this.criarEfeitoCRT(width, height, 0.035);
  }

  private criarCenarioFundo(width: number, height: number): void {
    const g = this.add.graphics();

    // Gradiente sutil escuro hacker
    g.fillGradientStyle(0x03060a, 0x03060a, 0x081018, 0x081018, 1);
    g.fillRect(0, 0, width, height);

    // Grid hacker retrô
    g.lineStyle(1, 0x00ffcc, 0.035);
    for (let x = 0; x < width; x += 40) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, height);
      g.strokePath();
    }
    for (let y = 0; y < height; y += 40) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(width, y);
      g.strokePath();
    }

    // Partículas de poeira digital flutuando
    if (!this.textures.exists('particula-selecao')) {
      const gp = this.make.graphics();
      gp.fillStyle(0x00ffcc, 1);
      gp.fillCircle(2, 2, 2);
      gp.generateTexture('particula-selecao', 4, 4);
      gp.destroy();
    }

    const emitter = this.add.particles(0, 0, 'particula-selecao', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: 5000,
      speedY: { min: -15, max: -35 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.35, end: 0 },
      frequency: 200,
      quantity: 1,
    });
    emitter.setDepth(1);
  }

  private criarCabecalho(width: number): void {
    const container = this.add.container(width / 2, 60);

    const titulo = this.add.text(
      0,
      -12,
      '> TERMINAL DE BOOT // SELEÇÃO DE OPERADOR DE CAMPO',
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '24px',
        color: '#00ffcc',
        stroke: '#000000',
        strokeThickness: 4,
      }
    );
    titulo.setOrigin(0.5);

    const subtitulo = this.add.text(
      0,
      22,
      'Escolha o perfil de execução para aceder aos setores industriais.',
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '14px',
        color: '#94a3b8',
        letterSpacing: 1,
      }
    );
    subtitulo.setOrigin(0.5);

    container.add([titulo, subtitulo]);
    container.setDepth(10);
  }

  private criarBotaoVoltar(_width: number): void {
    const container = this.add.container(25, 25);

    const fundo = this.add.rectangle(0, 0, 200, 36, 0x09111c, 0.85);
    fundo.setOrigin(0, 0);
    fundo.setStrokeStyle(1, 0x00ffcc, 0.4);
    fundo.setInteractive({ useHandCursor: true });

    const texto = this.add.text(100, 18, '[ESC] VOLTAR AO HUB', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#00ffcc',
      fontStyle: 'bold',
    });
    texto.setOrigin(0.5);

    container.add([fundo, texto]);
    container.setDepth(20);

    fundo.on('pointerover', () => {
      fundo.setFillStyle(0x13263a, 0.95);
      fundo.setStrokeStyle(2, 0x00ffcc, 1);
    });

    fundo.on('pointerout', () => {
      fundo.setFillStyle(0x09111c, 0.85);
      fundo.setStrokeStyle(1, 0x00ffcc, 0.4);
    });

    fundo.on('pointerdown', () => {
      this.voltarParaHub();
    });
  }

  private criarCardsPersonagens(width: number, height: number): void {
    const cardLargura = 440;
    const cardAltura = 470;
    const centroY = height / 2 + 30;

    const posXAlvares = width / 2 - 250;
    const posXReis = width / 2 + 250;

    // CARD 1: ALVARES
    this.cardAlvares = this.criarCard({
      tipo: 'alvares',
      x: posXAlvares,
      y: centroY,
      largura: cardLargura,
      altura: cardAltura,
      nome: 'ALVARES',
      corPrimaria: 0xeab308,
      corHex: '#facc15',
      corBordaHex: '#eab308',
      subtitulo: 'Jaqueta Amarela // Ágil e Dinâmico',
      lore: 'Especialista ágil // Traje de exploração amarelo e manoplas cibernéticas.',
      teclaAtalho: '[1]',
    });

    // CARD 2: REIS
    this.cardReis = this.criarCard({
      tipo: 'reis',
      x: posXReis,
      y: centroY,
      largura: cardLargura,
      altura: cardAltura,
      nome: 'REIS',
      corPrimaria: 0xd92d3a,
      corHex: '#f87171',
      corBordaHex: '#ef4444',
      subtitulo: 'Sobretudo Vermelho // Analítico e Blindado',
      lore: 'Operador tático veterano // Frio, calculista e blindado contra ruídos do sistema.',
      teclaAtalho: '[2]',
    });

    this.atualizarBadgesAtivos();
  }

  private criarCard(config: {
    tipo: TipoPersonagem;
    x: number;
    y: number;
    largura: number;
    altura: number;
    nome: string;
    corPrimaria: number;
    corHex: string;
    corBordaHex: string;
    subtitulo: string;
    lore: string;
    teclaAtalho: string;
  }): Phaser.GameObjects.Container {
    const container = this.add.container(config.x, config.y);
    container.setDepth(10);

    const isAtivo = this.personagemAtual === config.tipo;

    // Fundo do card
    const fundo = this.add.rectangle(
      0,
      0,
      config.largura,
      config.altura,
      0x070e17,
      0.9
    );
    fundo.setStrokeStyle(
      isAtivo ? 2 : 1,
      isAtivo ? config.corPrimaria : 0x1e293b,
      isAtivo ? 0.9 : 0.6
    );
    fundo.setInteractive({ useHandCursor: true });

    // Barra superior com o nome
    const topoBarra = this.add.rectangle(
      0,
      -config.altura / 2 + 25,
      config.largura - 10,
      38,
      config.corPrimaria,
      0.15
    );
    topoBarra.setStrokeStyle(1, config.corPrimaria, 0.4);

    const textoNome = this.add.text(
      0,
      -config.altura / 2 + 25,
      `OPERADOR // ${config.nome}`,
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '18px',
        color: config.corHex,
        fontStyle: 'bold',
      }
    );
    textoNome.setOrigin(0.5);

    // Plataforma circular holográfica sob o personagem
    const baseHolo = this.add.ellipse(0, 30, 160, 32, config.corPrimaria, 0.18);
    baseHolo.setStrokeStyle(2, config.corPrimaria, 0.5);

    // Sprite do personagem no quadro 0 (Idle)
    const sprite = this.add.sprite(0, -35, config.tipo, 0);
    sprite.setScale(1.5);

    // Tween de oscilação suave (idle hover)
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 8,
      duration: 1200 + (config.tipo === 'reis' ? 150 : 0),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtítulo
    const textoSubtitulo = this.add.text(0, 68, config.subtitulo, {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#e2e8f0',
      fontStyle: 'bold',
    });
    textoSubtitulo.setOrigin(0.5);

    // Lore / descrição
    const textoLore = this.add.text(0, 115, config.lore, {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '12px',
      color: '#94a3b8',
      align: 'center',
      wordWrap: { width: config.largura - 50 },
      lineSpacing: 4,
    });
    textoLore.setOrigin(0.5);

    // Botão de Selecionar
    const botaoY = config.altura / 2 - 45;
    const fundoBotao = this.add.rectangle(
      0,
      botaoY,
      config.largura - 60,
      44,
      config.corPrimaria,
      0.2
    );
    fundoBotao.setStrokeStyle(1.5, config.corPrimaria, 0.8);
    fundoBotao.setInteractive({ useHandCursor: true });

    const textoBotao = this.add.text(
      0,
      botaoY,
      `CONFIRMAR OPERADOR ${config.teclaAtalho}`,
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '14px',
        color: config.corHex,
        fontStyle: 'bold',
      }
    );
    textoBotao.setOrigin(0.5);

    // Badge de "OPERADOR ATIVO"
    const badgeContainer = this.add.container(
      0,
      -config.altura / 2 - 12
    );
    const badgeFundo = this.add.rectangle(0, 0, 160, 24, 0x00ffcc, 0.95);
    badgeFundo.setStrokeStyle(1, 0xffffff, 0.8);
    const badgeTexto = this.add.text(0, 0, '● OPERADOR ATIVO', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '11px',
      color: '#050811',
      fontStyle: 'bold',
    });
    badgeTexto.setOrigin(0.5);
    badgeContainer.add([badgeFundo, badgeTexto]);
    badgeContainer.setVisible(isAtivo);

    if (config.tipo === 'alvares') {
      this.badgeAlvares = badgeContainer;
    } else {
      this.badgeReis = badgeContainer;
    }

    container.add([
      fundo,
      topoBarra,
      textoNome,
      baseHolo,
      sprite,
      textoSubtitulo,
      textoLore,
      fundoBotao,
      textoBotao,
      badgeContainer,
    ]);

    // Interações de Mouse no Card
    const aplicarHover = (hover: boolean) => {
      if (this.isTransicaoAtiva) return;
      if (hover) {
        fundo.setFillStyle(0x0e1b2a, 0.98);
        fundo.setStrokeStyle(2, config.corPrimaria, 1);
        fundoBotao.setFillStyle(config.corPrimaria, 0.35);
        this.tweens.add({
          targets: container,
          scale: 1.02,
          duration: 160,
          ease: 'Power1',
        });
      } else {
        fundo.setFillStyle(0x070e17, 0.9);
        const ativo = GerenciadorEstado.obterPersonagem() === config.tipo;
        fundo.setStrokeStyle(ativo ? 2 : 1, ativo ? config.corPrimaria : 0x1e293b, ativo ? 0.9 : 0.6);
        fundoBotao.setFillStyle(config.corPrimaria, 0.2);
        this.tweens.add({
          targets: container,
          scale: 1.0,
          duration: 160,
          ease: 'Power1',
        });
      }
    };

    fundo.on('pointerover', () => aplicarHover(true));
    fundo.on('pointerout', () => aplicarHover(false));
    fundoBotao.on('pointerover', () => aplicarHover(true));
    fundoBotao.on('pointerout', () => aplicarHover(false));

    fundo.on('pointerdown', () => this.selecionarPersonagem(config.tipo));
    fundoBotao.on('pointerdown', () => this.selecionarPersonagem(config.tipo));

    return container;
  }

  private configurarTeclas(): void {
    if (this.input.keyboard) {
      this.teclaUm = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
      this.teclaUmNum = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE);
      this.teclaDois = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
      this.teclaDoisNum = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO);
    }
  }

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);

    if (this.isTransicaoAtiva) return;

    if (
      (this.teclaUm && Phaser.Input.Keyboard.JustDown(this.teclaUm)) ||
      (this.teclaUmNum && Phaser.Input.Keyboard.JustDown(this.teclaUmNum))
    ) {
      this.selecionarPersonagem('alvares');
    } else if (
      (this.teclaDois && Phaser.Input.Keyboard.JustDown(this.teclaDois)) ||
      (this.teclaDoisNum && Phaser.Input.Keyboard.JustDown(this.teclaDoisNum))
    ) {
      this.selecionarPersonagem('reis');
    }
  }

  private selecionarPersonagem(escolha: TipoPersonagem): void {
    if (this.isTransicaoAtiva) return;
    this.isTransicaoAtiva = true;

    // Salva a escolha no estado global persistente
    GerenciadorEstado.definirPersonagem(escolha);
    this.personagemAtual = escolha;
    this.atualizarBadgesAtivos();

    // Feedback visual
    this.cameras.main.flash(200, 0, 255, 204);

    const cardAlvo = escolha === 'alvares' ? this.cardAlvares : this.cardReis;
    this.tweens.add({
      targets: cardAlvo,
      scale: 1.05,
      duration: 180,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
    });

    // Mensagem de confirmação na tela
    const aviso = this.add.text(
      this.scale.width / 2,
      this.scale.height - 70,
      `[OPERADOR ${escolha.toUpperCase()} CONFIRMADO COM SUCESSO]`,
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '15px',
        color: escolha === 'alvares' ? '#facc15' : '#f87171',
        fontStyle: 'bold',
        backgroundColor: '#050811',
        padding: { x: 14, y: 6 },
      }
    );
    aviso.setOrigin(0.5);
    aviso.setDepth(30);

    this.time.delayedCall(600, () => {
      this.voltarParaHub();
    });
  }

  private atualizarBadgesAtivos(): void {
    const atual = GerenciadorEstado.obterPersonagem();
    if (this.badgeAlvares) {
      this.badgeAlvares.setVisible(atual === 'alvares');
    }
    if (this.badgeReis) {
      this.badgeReis.setVisible(atual === 'reis');
    }
  }

  private voltarParaHub(): void {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      if (this.proximaCena) {
        this.scene.start(this.proximaCena, this.dadosProximaCena as object | undefined);
      } else {
        this.scene.start('CenaHub');
      }
    });
  }

  private criarRodape(width: number, height: number): void {
    const rodape = this.add.text(
      width / 2,
      height - 25,
      '[1] Selecionar Alvares  |  [2] Selecionar Reis  |  [ESC] Voltar ao Hub',
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '12px',
        color: '#64748b',
      }
    );
    rodape.setOrigin(0.5);
    rodape.setDepth(10);
  }
}
