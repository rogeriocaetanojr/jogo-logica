import Phaser from 'phaser';
import { CenaBase } from '../compartilhado/CenaBase';
import { GerenciadorEstado, type TipoPersonagem } from '../nucleo/GerenciadorEstado';

interface DadosCenaSelecao {
  proximaCena?: string;
  dadosProximaCena?: unknown;
}

/**
 * CenaSelecaoPersonagem: Tela de seleção de operador na câmara de criogenia/clonagem.
 * Alvares na cápsula âmbar à esquerda e Reis na cápsula vermelha à direita,
 * identificados por plaquinhas metálicas estilizadas no chão em frente a cada base.
 */
export class CenaSelecaoPersonagem extends CenaBase {
  private proximaCena?: string;
  private dadosProximaCena?: unknown;
  private personagemFocado: TipoPersonagem = 'alvares';
  private isTransicaoAtiva: boolean = false;

  // Sprites e Efeitos das Cápsulas
  private spriteAlvares!: Phaser.GameObjects.Sprite;
  private spriteReis!: Phaser.GameObjects.Sprite;
  private luzCapsulaAlvares!: Phaser.GameObjects.Graphics;
  private luzCapsulaReis!: Phaser.GameObjects.Graphics;
  private tweenLuzAlvares?: Phaser.Tweens.Tween;
  private tweenLuzReis?: Phaser.Tweens.Tween;

  // Plaquinhas Metálicas no Chão (Identificação dos Personagens)
  private containerPlacaAlvares!: Phaser.GameObjects.Container;
  private containerPlacaReis!: Phaser.GameObjects.Container;
  private fundoPlacaAlvares!: Phaser.GameObjects.Graphics;
  private fundoPlacaReis!: Phaser.GameObjects.Graphics;
  private textoPlacaAlvares!: Phaser.GameObjects.Text;
  private textoPlacaReis!: Phaser.GameObjects.Text;
  private tweenPulsoPlacaAlvares?: Phaser.Tweens.Tween;
  private tweenPulsoPlacaReis?: Phaser.Tweens.Tween;

  // Coordenadas das Cápsulas alinhadas ao cenário de fundo (1280x720)
  private readonly POS_ALVARES = { x: 346, y: 430, w: 180, h: 320 };
  private readonly POS_REIS = { x: 928, y: 430, w: 180, h: 320 };

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

    if (!this.textures.exists('selecao_capsulas')) {
      this.load.image('selecao_capsulas', 'assets/hub/selecao_capsulas.png');
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

  override create(): void {
    super.create();

    const { width, height } = this.scale;
    this.isTransicaoAtiva = false;
    this.personagemFocado = GerenciadorEstado.obterPersonagem();

    this.cameras.main.setBackgroundColor('#030712');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 1. Cenário de Fundo (Câmara Criogênica com 2 Cápsulas)
    this.criarCenarioFundo(width, height);

    // 2. Cabeçalho Minimalista e Botão [ESC]
    this.criarHeaderSuperior(width);

    // 3. Efeitos de Luz e Sprites dos Personagens dentro das Cápsulas
    this.criarEfeitosECapsulas();

    // 4. Plaquinhas Metálicas no Chão em frente a cada base
    this.criarPlaquetasMetalicas();

    // 5. Configuração de Controles (Teclado e Cliques)
    this.configurarControles();

    // 6. Atualização Inicial do Estado de Foco
    this.aplicarFocoPersonagem(this.personagemFocado, false);

    // 7. Efeito CRT scanlines global
    this.criarEfeitoCRT(width, height, 0.035);
  }

  private criarCenarioFundo(width: number, height: number): void {
    const chaveFundo = this.textures.exists('selecao_capsulas')
      ? 'selecao_capsulas'
      : 'cenario_hub';
    const fundo = this.add.image(width / 2, height / 2, chaveFundo);
    fundo.setDisplaySize(width, height);
    fundo.setDepth(0);
  }

  private criarHeaderSuperior(width: number): void {
    // Header minimalista em texto neon no topo
    const container = this.add.container(width / 2, 36);
    container.setDepth(40);

    const titulo = this.add.text(
      0,
      0,
      '> TERMINAL DE PROTOCOLO // SELEÇÃO DE OPERADOR DE CAMPO',
      {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        color: '#00e5ff',
        fontStyle: 'bold',
        letterSpacing: 1.5,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: '#00e5ff',
          blur: 10,
          fill: true,
        },
      }
    );
    titulo.setOrigin(0.5);
    container.add(titulo);

    // Botão discreto no canto superior esquerdo: [ESC] RETORNAR AO HUB
    const btnVoltar = this.add.container(25, 22);
    btnVoltar.setDepth(45);

    const fundoBtn = this.add.graphics();
    const desenharBtn = (hover: boolean) => {
      fundoBtn.clear();
      fundoBtn.fillStyle(hover ? 0x0c2238 : 0x040f1c, 0.9);
      fundoBtn.fillRoundedRect(0, 0, 195, 30, 4);
      fundoBtn.lineStyle(hover ? 1.5 : 1, hover ? 0x00ffcc : 0x00e5ff, hover ? 1 : 0.6);
      fundoBtn.strokeRoundedRect(0, 0, 195, 30, 4);
    };
    desenharBtn(false);

    const textoVoltar = this.add.text(97, 15, '[ESC] RETORNAR AO HUB', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '11px',
      color: '#00e5ff',
      fontStyle: 'bold',
    });
    textoVoltar.setOrigin(0.5);

    const hitAreaVoltar = this.add.rectangle(97, 15, 195, 30, 0x000000, 0.001);
    hitAreaVoltar.setInteractive({ useHandCursor: true });

    hitAreaVoltar.on('pointerover', () => {
      desenharBtn(true);
      textoVoltar.setColor('#ffffff');
    });

    hitAreaVoltar.on('pointerout', () => {
      desenharBtn(false);
      textoVoltar.setColor('#00e5ff');
    });

    hitAreaVoltar.on('pointerdown', () => {
      this.voltarParaHub();
    });

    btnVoltar.add([fundoBtn, textoVoltar, hitAreaVoltar]);
  }

  /**
   * Configura os sprites de Alvares e Reis centralizados dentro das cápsulas,
   * aplicando filtro de pixel art nítido e camadas de luz holográfica.
   */
  private criarEfeitosECapsulas(): void {
    this.registrarAnimacoes();

    // 1. Feixes de Luz Volumétricos das Cápsulas (BlendMode ADD)
    this.luzCapsulaAlvares = this.add.graphics();
    this.luzCapsulaAlvares.setDepth(8);
    this.luzCapsulaAlvares.setBlendMode(Phaser.BlendModes.ADD);

    this.luzCapsulaReis = this.add.graphics();
    this.luzCapsulaReis.setDepth(8);
    this.luzCapsulaReis.setBlendMode(Phaser.BlendModes.ADD);

    // 2. Sprite de ALVARES (Cápsula da Esquerda - Luz Âmbar)
    this.spriteAlvares = this.add.sprite(
      this.POS_ALVARES.x,
      this.POS_ALVARES.y,
      'alvares',
      0
    );
    this.spriteAlvares.setScale(1.85);
    this.spriteAlvares.setDepth(15);
    if (this.spriteAlvares.texture) {
      this.spriteAlvares.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // 3. Sprite de REIS (Cápsula da Direita - Luz Vermelha)
    this.spriteReis = this.add.sprite(
      this.POS_REIS.x,
      this.POS_REIS.y,
      'reis',
      0
    );
    this.spriteReis.setScale(1.85);
    this.spriteReis.setDepth(15);
    if (this.spriteReis.texture) {
      this.spriteReis.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // 4. Áreas Interativas sobre as Cápsulas de Vidro
    const hitAreaAlvares = this.add.rectangle(
      this.POS_ALVARES.x,
      this.POS_ALVARES.y,
      this.POS_ALVARES.w,
      this.POS_ALVARES.h,
      0x000000,
      0.001
    );
    hitAreaAlvares.setDepth(25);
    hitAreaAlvares.setInteractive({ useHandCursor: true });

    hitAreaAlvares.on('pointerdown', () => {
      if (this.personagemFocado === 'alvares') {
        this.confirmarEscolha('alvares');
      } else {
        this.aplicarFocoPersonagem('alvares', true);
      }
    });

    const hitAreaReis = this.add.rectangle(
      this.POS_REIS.x,
      this.POS_REIS.y,
      this.POS_REIS.w,
      this.POS_REIS.h,
      0x000000,
      0.001
    );
    hitAreaReis.setDepth(25);
    hitAreaReis.setInteractive({ useHandCursor: true });

    hitAreaReis.on('pointerdown', () => {
      if (this.personagemFocado === 'reis') {
        this.confirmarEscolha('reis');
      } else {
        this.aplicarFocoPersonagem('reis', true);
      }
    });
  }

  /**
   * Cria as plaquinhas metálicas estilizadas no chão, em frente à base de cada cápsula.
   */
  private criarPlaquetasMetalicas(): void {
    const yPlacas = 618;
    const largura = 144;
    const altura = 30;

    // 1. Placa da Cápsula Esquerda (Alvares)
    this.containerPlacaAlvares = this.add.container(this.POS_ALVARES.x, yPlacas);
    this.containerPlacaAlvares.setDepth(30);

    this.fundoPlacaAlvares = this.add.graphics();
    this.textoPlacaAlvares = this.add.text(0, 0, 'ALVARES', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '14px',
      color: '#ffcc00',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    this.textoPlacaAlvares.setOrigin(0.5);

    const hitPlacaAlvares = this.add.rectangle(0, 0, largura, altura, 0x000000, 0.001);
    hitPlacaAlvares.setInteractive({ useHandCursor: true });
    hitPlacaAlvares.on('pointerdown', () => {
      if (this.personagemFocado === 'alvares') {
        this.confirmarEscolha('alvares');
      } else {
        this.aplicarFocoPersonagem('alvares', true);
      }
    });

    this.containerPlacaAlvares.add([
      this.fundoPlacaAlvares,
      this.textoPlacaAlvares,
      hitPlacaAlvares,
    ]);

    // 2. Placa da Cápsula Direita (Reis)
    this.containerPlacaReis = this.add.container(this.POS_REIS.x, yPlacas);
    this.containerPlacaReis.setDepth(30);

    this.fundoPlacaReis = this.add.graphics();
    this.textoPlacaReis = this.add.text(0, 0, 'REIS', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '14px',
      color: '#ff3344',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    this.textoPlacaReis.setOrigin(0.5);

    const hitPlacaReis = this.add.rectangle(0, 0, largura, altura, 0x000000, 0.001);
    hitPlacaReis.setInteractive({ useHandCursor: true });
    hitPlacaReis.on('pointerdown', () => {
      if (this.personagemFocado === 'reis') {
        this.confirmarEscolha('reis');
      } else {
        this.aplicarFocoPersonagem('reis', true);
      }
    });

    this.containerPlacaReis.add([
      this.fundoPlacaReis,
      this.textoPlacaReis,
      hitPlacaReis,
    ]);
  }

  private desenharFundoPlaca(
    g: Phaser.GameObjects.Graphics,
    corTema: number,
    ativa: boolean
  ): void {
    const largura = 144;
    const altura = 30;

    g.clear();

    // Chapa metálica cinza escuro translúcida
    g.fillStyle(0x0c1422, ativa ? 0.94 : 0.72);
    g.fillRoundedRect(-largura / 2, -altura / 2, largura, altura, 4);

    // Contorno neon com a cor do personagem
    g.lineStyle(ativa ? 2 : 1, corTema, ativa ? 0.95 : 0.4);
    g.strokeRoundedRect(-largura / 2, -altura / 2, largura, altura, 4);

    // Rebites metálicos nos quatro cantos da placa
    const corRebites = ativa ? corTema : 0x475569;
    g.fillStyle(corRebites, ativa ? 0.8 : 0.35);
    g.fillCircle(-largura / 2 + 5, -altura / 2 + 5, 1.5);
    g.fillCircle(largura / 2 - 5, -altura / 2 + 5, 1.5);
    g.fillCircle(-largura / 2 + 5, altura / 2 - 5, 1.5);
    g.fillCircle(largura / 2 - 5, altura / 2 - 5, 1.5);
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
          frames: this.anims.generateFrameNumbers(t, { frames: [0, 1] }),
          frameRate: 6,
          repeat: -1,
        });
      }
    }
  }

  /**
   * Atualiza os efeitos visuais, feixes de luz e estado das plaquinhas conforme o operador focado.
   */
  private aplicarFocoPersonagem(escolha: TipoPersonagem, animar: boolean): void {
    this.personagemFocado = escolha;
    const isAlvares = escolha === 'alvares';

    // 1. Estado de ALVARES (Esquerda - Âmbar)
    if (isAlvares) {
      this.spriteAlvares.clearTint();
      this.spriteAlvares.setAlpha(1.0);
      if (animar && this.anims.exists('alvares_run')) {
        this.spriteAlvares.anims.play('alvares_run', true);
        this.time.delayedCall(450, () => {
          if (this.personagemFocado === 'alvares' && this.anims.exists('alvares_idle')) {
            this.spriteAlvares.anims.play('alvares_idle', true);
          }
        });
      } else if (this.anims.exists('alvares_idle')) {
        this.spriteAlvares.anims.play('alvares_idle', true);
      }
      this.desenharLuzCapsula(this.luzCapsulaAlvares, this.POS_ALVARES, 0xffcc00, true);

      // Plaquinha Alvares Ativa: 100% opacidade e pulso luminoso
      this.desenharFundoPlaca(this.fundoPlacaAlvares, 0xffcc00, true);
      this.containerPlacaAlvares.setAlpha(1.0);
      this.iniciarPulsoPlaca('alvares');
    } else {
      this.spriteAlvares.setTint(0x555555);
      this.spriteAlvares.setAlpha(0.55);
      this.spriteAlvares.anims.stop();
      this.spriteAlvares.setFrame(0);
      this.desenharLuzCapsula(this.luzCapsulaAlvares, this.POS_ALVARES, 0xffcc00, false);

      // Plaquinha Alvares Inativa: esmaecida (alpha ~0.55)
      this.desenharFundoPlaca(this.fundoPlacaAlvares, 0xffcc00, false);
      this.containerPlacaAlvares.setAlpha(0.55);
      this.pararPulsoPlaca('alvares');
    }

    // 2. Estado de REIS (Direita - Vermelho)
    if (!isAlvares) {
      this.spriteReis.clearTint();
      this.spriteReis.setAlpha(1.0);
      if (animar && this.anims.exists('reis_run')) {
        this.spriteReis.anims.play('reis_run', true);
        this.time.delayedCall(450, () => {
          if (this.personagemFocado === 'reis' && this.anims.exists('reis_idle')) {
            this.spriteReis.anims.play('reis_idle', true);
          }
        });
      } else if (this.anims.exists('reis_idle')) {
        this.spriteReis.anims.play('reis_idle', true);
      }
      this.desenharLuzCapsula(this.luzCapsulaReis, this.POS_REIS, 0xff3344, true);

      // Plaquinha Reis Ativa: 100% opacidade e pulso luminoso
      this.desenharFundoPlaca(this.fundoPlacaReis, 0xff3344, true);
      this.containerPlacaReis.setAlpha(1.0);
      this.iniciarPulsoPlaca('reis');
    } else {
      this.spriteReis.setTint(0x555555);
      this.spriteReis.setAlpha(0.55);
      this.spriteReis.anims.stop();
      this.spriteReis.setFrame(0);
      this.desenharLuzCapsula(this.luzCapsulaReis, this.POS_REIS, 0xff3344, false);

      // Plaquinha Reis Inativa: esmaecida (alpha ~0.55)
      this.desenharFundoPlaca(this.fundoPlacaReis, 0xff3344, false);
      this.containerPlacaReis.setAlpha(0.55);
      this.pararPulsoPlaca('reis');
    }
  }

  private iniciarPulsoPlaca(tipo: TipoPersonagem): void {
    if (tipo === 'alvares') {
      if (!this.tweenPulsoPlacaAlvares) {
        this.tweenPulsoPlacaAlvares = this.tweens.add({
          targets: this.containerPlacaAlvares,
          scale: { from: 1.0, to: 1.04 },
          duration: 750,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      if (!this.tweenPulsoPlacaReis) {
        this.tweenPulsoPlacaReis = this.tweens.add({
          targets: this.containerPlacaReis,
          scale: { from: 1.0, to: 1.04 },
          duration: 750,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  private pararPulsoPlaca(tipo: TipoPersonagem): void {
    if (tipo === 'alvares') {
      if (this.tweenPulsoPlacaAlvares) {
        this.tweenPulsoPlacaAlvares.stop();
        this.tweenPulsoPlacaAlvares = undefined;
      }
      this.containerPlacaAlvares.setScale(1.0);
    } else {
      if (this.tweenPulsoPlacaReis) {
        this.tweenPulsoPlacaReis.stop();
        this.tweenPulsoPlacaReis = undefined;
      }
      this.containerPlacaReis.setScale(1.0);
    }
  }

  /**
   * Desenha o feixe de luz volumétrico vertical e o glow na base da cápsula.
   */
  private desenharLuzCapsula(
    g: Phaser.GameObjects.Graphics,
    pos: { x: number; y: number; w: number; h: number },
    cor: number,
    ativa: boolean
  ): void {
    g.clear();

    if (ativa) {
      // Feixe de luz vertical translúcido dentro do vidro
      g.fillStyle(cor, 0.14);
      g.fillRoundedRect(pos.x - pos.w / 2 + 10, pos.y - pos.h / 2 + 15, pos.w - 20, pos.h - 30, 10);

      // Núcleo de luz central
      g.fillStyle(0xffffff, 0.08);
      g.fillRect(pos.x - 30, pos.y - pos.h / 2 + 20, 60, pos.h - 40);

      // Glow elíptico na base metálica
      g.fillStyle(cor, 0.35);
      g.fillEllipse(pos.x, pos.y + pos.h / 2 - 25, pos.w - 30, 36);

      // Contorno neon suave do tubo
      g.lineStyle(2, cor, 0.6);
      g.strokeRoundedRect(pos.x - pos.w / 2 + 10, pos.y - pos.h / 2 + 15, pos.w - 20, pos.h - 30, 10);

      // Tween de pulso de luz contínuo na cápsula ativa
      if (cor === 0xffcc00) {
        if (!this.tweenLuzAlvares) {
          this.tweenLuzAlvares = this.tweens.add({
            targets: g,
            alpha: { from: 0.7, to: 1.0 },
            yoyo: true,
            repeat: -1,
            duration: 900,
            ease: 'Sine.easeInOut',
          });
        }
      } else {
        if (!this.tweenLuzReis) {
          this.tweenLuzReis = this.tweens.add({
            targets: g,
            alpha: { from: 0.7, to: 1.0 },
            yoyo: true,
            repeat: -1,
            duration: 900,
            ease: 'Sine.easeInOut',
          });
        }
      }
    } else {
      // Estado inativo: brilho residual mínimo
      g.fillStyle(cor, 0.03);
      g.fillRoundedRect(pos.x - pos.w / 2 + 10, pos.y - pos.h / 2 + 15, pos.w - 20, pos.h - 30, 10);
      g.setAlpha(0.6);

      if (cor === 0xffcc00 && this.tweenLuzAlvares) {
        this.tweenLuzAlvares.stop();
        this.tweenLuzAlvares = undefined;
      } else if (cor === 0xff3344 && this.tweenLuzReis) {
        this.tweenLuzReis.stop();
        this.tweenLuzReis = undefined;
      }
    }
  }

  /**
   * Configuração dos atalhos de teclado:
   * - Teclas [1] / [A] / [LEFT]: foca Alvares
   * - Teclas [2] / [D] / [RIGHT]: foca Reis
   * - Teclas [ENTER] / [SPACE]: confirma
   * - Tecla [ESC]: retorna ao Hub
   */
  private configurarControles(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown-ESC', () => {
      this.voltarParaHub();
    });

    const focarAlvares = () => this.aplicarFocoPersonagem('alvares', true);
    const focarReis = () => this.aplicarFocoPersonagem('reis', true);

    this.input.keyboard.on('keydown-ONE', focarAlvares);
    this.input.keyboard.on('keydown-NUMPAD_ONE', focarAlvares);
    this.input.keyboard.on('keydown-LEFT', focarAlvares);
    this.input.keyboard.on('keydown-A', focarAlvares);

    this.input.keyboard.on('keydown-TWO', focarReis);
    this.input.keyboard.on('keydown-NUMPAD_TWO', focarReis);
    this.input.keyboard.on('keydown-RIGHT', focarReis);
    this.input.keyboard.on('keydown-D', focarReis);

    const confirmar = () => this.confirmarEscolha(this.personagemFocado);
    this.input.keyboard.on('keydown-ENTER', confirmar);
    this.input.keyboard.on('keydown-SPACE', confirmar);
  }

  /**
   * Confirmação do operador selecionado, salvamento no GerenciadorEstado e transição.
   */
  private confirmarEscolha(escolha: TipoPersonagem): void {
    if (this.isTransicaoAtiva) return;
    this.isTransicaoAtiva = true;

    // 1. Salva a escolha no estado global persistente
    GerenciadorEstado.definirPersonagem(escolha);

    // 2. Efeito de flash de luz na cápsula escolhida
    const corFlash = escolha === 'alvares' ? { r: 255, g: 204, b: 0 } : { r: 255, g: 51, b: 68 };
    this.cameras.main.flash(220, corFlash.r, corFlash.g, corFlash.b);

    // 3. Leve pulso de escala no sprite e na plaqueta escolhida
    const spriteAlvo = escolha === 'alvares' ? this.spriteAlvares : this.spriteReis;
    const placaAlvo = escolha === 'alvares' ? this.containerPlacaAlvares : this.containerPlacaReis;

    this.tweens.add({
      targets: spriteAlvo,
      scale: 1.95,
      duration: 160,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });

    this.tweens.add({
      targets: placaAlvo,
      scale: 1.08,
      duration: 160,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });

    // 4. Fade-out suave da câmera e transição direta para o Tutorial
    this.time.delayedCall(400, () => {
      this.transicionarAposEscolha();
    });
  }

  private transicionarAposEscolha(): void {
    if (this.isTransicaoAtiva && this.cameras.main.fadeEffect.isRunning) return;
    this.isTransicaoAtiva = true;

    // Limpeza rigorosa de tweens e listeners
    this.tweens.killAll();
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }
    this.input.removeAllListeners();

    this.cameras.main.fade(280, 0, 0, 0);
    this.time.delayedCall(280, () => {
      this.time.removeAllEvents();
      if (this.proximaCena) {
        this.scene.start(this.proximaCena, this.dadosProximaCena as object | undefined);
      } else {
        this.scene.start('CenaTutorial', { iniciarAposBoot: true });
      }
    });
  }

  private voltarParaHub(): void {
    if (this.isTransicaoAtiva && this.cameras.main.fadeEffect.isRunning) return;
    this.isTransicaoAtiva = true;

    // Limpeza rigorosa de tweens e listeners
    this.tweens.killAll();
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }
    this.input.removeAllListeners();

    this.cameras.main.fade(280, 0, 0, 0);
    this.time.delayedCall(280, () => {
      this.time.removeAllEvents();
      this.scene.start(this.proximaCena || 'CenaHub');
    });
  }
}
