import Phaser from 'phaser';
import { GerenciadorEstado, type TipoPersonagem } from '../nucleo/GerenciadorEstado';

interface PortaHubConfig {
  numero: number;
  idFase: string;
  chaveCena: string;
  rotulo: string;
  // Coordenadas da porta
  xPorta: number;
  yPorta: number;
  // Coordenadas da placa neon
  xPlaca: number;
  yPlaca: number;
  desenharPortaEstrutural?: boolean;
}

const COR_NEON_PADRAO = 0x00ff66; // Verde neon uniforme de alto contraste
const COR_TEXTO_PADRAO = '#00ff66';

const CONFIG_PORTAS: PortaHubConfig[] = [
  {
    numero: 0,
    idFase: 'fase0_tutorial',
    chaveCena: 'CenaTutorial',
    rotulo: 'FASE TUTORIAL',
    xPorta: 162,
    yPorta: 235,
    xPlaca: 162,
    yPlaca: 165,
  },
  {
    numero: 1,
    idFase: 'fase1',
    chaveCena: 'CenaFase1',
    rotulo: 'FASE 1',
    xPorta: 430,
    yPorta: 355,
    xPlaca: 430,
    yPlaca: 285,
    desenharPortaEstrutural: true,
  },
  {
    numero: 2,
    idFase: 'fase2',
    chaveCena: 'CenaFase2',
    rotulo: 'FASE 2',
    xPorta: 765,
    yPorta: 355,
    xPlaca: 765,
    yPlaca: 285,
  },
  {
    numero: 3,
    idFase: 'fase3',
    chaveCena: 'CenaFase3',
    rotulo: 'FASE 3',
    xPorta: 1110,
    yPorta: 175,
    xPlaca: 1110,
    yPlaca: 105,
  },
  {
    numero: 4,
    idFase: 'fase4',
    chaveCena: 'CenaFase4',
    rotulo: 'FASE 4',
    xPorta: 162,
    yPorta: 580,
    xPlaca: 162,
    yPlaca: 520,
  },
  {
    numero: 5,
    idFase: 'fase5',
    chaveCena: 'CenaFase5',
    rotulo: 'FASE 5',
    xPorta: 635,
    yPorta: 580,
    xPlaca: 635,
    yPlaca: 520,
  },
  {
    numero: 6,
    idFase: 'fase_final',
    chaveCena: 'CenaFaseFinal',
    rotulo: 'FASE FINAL',
    xPorta: 1110,
    yPorta: 580,
    xPlaca: 1110,
    yPlaca: 520,
  },
];

/**
 * CenaHub: Hub Central padronizado com placas monocromáticas verdes de alto contraste,
 * animação do operador caminhando até a porta escolhida e botão premium de seleção.
 */
export class CenaHub extends Phaser.Scene {
  private gerenciadorEstado: GerenciadorEstado;
  private isTransicaoAtiva: boolean = false;
  private personagemAtivo: TipoPersonagem = 'alvares';
  private spritePersonagem!: Phaser.GameObjects.Sprite;

  constructor() {
    super('CenaHub');
    this.gerenciadorEstado = GerenciadorEstado.obterInstancia();
  }

  preload(): void {
    if (!this.textures.exists('hub_fundo')) {
      this.load.image('hub_fundo', 'assets/cenarios/hub_fundo.png');
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

    // 1. Limpeza defensiva de overlays do DOM
    this.limparOverlaysDOM();

    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 2. Renderização do Cenário de Fundo limpo
    if (this.textures.exists('hub_fundo')) {
      const fundo = this.add.image(width / 2, height / 2, 'hub_fundo');
      fundo.setDisplaySize(width, height);
      fundo.setDepth(0);
    }

    // 3. Brilho sutil dos monitores CRT da arte
    this.criarBrilhoMonitores();

    // 4. Criação das 7 Portas com Placas Padronizadas (uma única cor, sem tooltip)
    this.criarPortasSetores();

    // 5. Instanciação do Operador na passarela central
    this.criarOperadorCenario();

    // 6. Botão Premium Elegante no canto superior direito para Escolha do Operador
    this.criarBotaoOperadorPremium(width);

    // 7. Efeito CRT scanlines global
    this.criarEfeitoCRT(width, height);

    // 8. Atalhos do Teclado ([0] a [6] e [P])
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

  private criarBrilhoMonitores(): void {
    const glow = this.add.graphics();
    glow.fillStyle(0x00ff88, 0.035);
    glow.fillCircle(550, 260, 110);
    glow.fillCircle(870, 520, 95);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(1);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.5, to: 0.9 },
      yoyo: true,
      repeat: -1,
      duration: 1400,
      ease: 'Sine.easeInOut',
    });
  }

  private criarPortasSetores(): void {
    const listaFases = this.gerenciadorEstado.obterListaFases();

    for (const cfg of CONFIG_PORTAS) {
      const infoFase = listaFases.find((f) => f.id === cfg.idFase);
      const isConcluida = infoFase ? this.gerenciadorEstado.estaConcluida(infoFase.id) : false;
      const isDesbloqueada = infoFase ? infoFase.desbloqueada || isConcluida || cfg.numero === 0 : true;

      // Desenha a porta 1 adicional do mezanino esquerdo para completar os 7 setores
      if (cfg.desenharPortaEstrutural) {
        this.desenharPortaAdicional(cfg.xPorta, cfg.yPorta, isConcluida, isDesbloqueada);
      }

      // Container da Placa Padronizada
      const containerPlaca = this.add.container(cfg.xPlaca, cfg.yPlaca);
      containerPlaca.setDepth(20);

      // Placa com formato e estilo padronizados para todas
      const placaLargura = 148;
      const placaAltura = 34;

      const placaG = this.add.graphics();
      // Fundo escuro de alto contraste para não se confundir com o fundo
      placaG.fillStyle(0x040810, 0.98);
      placaG.fillRoundedRect(-placaLargura / 2, -placaAltura / 2, placaLargura, placaAltura, 6);
      // Borda neon verde uniforme
      placaG.lineStyle(2, COR_NEON_PADRAO, 0.95);
      placaG.strokeRoundedRect(-placaLargura / 2, -placaAltura / 2, placaLargura, placaAltura, 6);

      // Texto único, nítido e padronizado
      const textoPlaca = this.add.text(0, 0, cfg.rotulo, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        color: COR_TEXTO_PADRAO,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: COR_TEXTO_PADRAO,
          blur: 10,
          stroke: true,
          fill: true,
        },
      });
      textoPlaca.setOrigin(0.5);

      containerPlaca.add([placaG, textoPlaca]);

      // Hit area cobrindo a porta e a placa para o clique
      const alturaHit = Math.max(130, (cfg.yPorta + 65) - (cfg.yPlaca - 18));
      const centroHitY = (cfg.yPorta + cfg.yPlaca) / 2;

      const hitArea = this.add.rectangle(cfg.xPorta, centroHitY, 120, alturaHit, 0x000000, 0.001);
      hitArea.setDepth(25);
      hitArea.setInteractive({ useHandCursor: true });

      // Feedback visual ao passar o mouse (Hover sem tooltip)
      hitArea.on('pointerover', () => {
        placaG.clear();
        placaG.fillStyle(0x081525, 1);
        placaG.fillRoundedRect(-placaLargura / 2, -placaAltura / 2, placaLargura, placaAltura, 6);
        placaG.lineStyle(2.5, 0xffffff, 1);
        placaG.strokeRoundedRect(-placaLargura / 2, -placaAltura / 2, placaLargura, placaAltura, 6);
      });

      hitArea.on('pointerout', () => {
        placaG.clear();
        placaG.fillStyle(0x040810, 0.98);
        placaG.fillRoundedRect(-placaLargura / 2, -placaAltura / 2, placaLargura, placaAltura, 6);
        placaG.lineStyle(2, COR_NEON_PADRAO, 0.95);
        placaG.strokeRoundedRect(-placaLargura / 2, -placaAltura / 2, placaLargura, placaAltura, 6);
      });

      // Feedback ao clicar: o boneco caminha até a porta e entra nela
      hitArea.on('pointerdown', () => {
        this.moverPersonagemAtePortaEEntrar(cfg);
      });
    }
  }

  private desenharPortaAdicional(x: number, y: number, isConcluida: boolean, isDesbloqueada: boolean): void {
    const portaG = this.add.graphics();
    portaG.setDepth(5);

    // Batente metálico chanfrado industrial
    portaG.fillStyle(0x131a24, 0.98);
    portaG.fillRoundedRect(x - 38, y - 50, 76, 100, 6);
    portaG.lineStyle(2, 0x2d3748, 1);
    portaG.strokeRoundedRect(x - 38, y - 50, 76, 100, 6);

    // Folha de aço da porta
    portaG.fillStyle(0x1f2937, 1);
    portaG.fillRect(x - 32, y - 44, 64, 92);

    // Frisos chanfrados e zíper vertical
    portaG.fillStyle(0x111827, 1);
    portaG.fillRect(x - 3, y - 44, 6, 92);
    portaG.fillStyle(0x374151, 1);
    portaG.fillRect(x - 30, y - 25, 60, 3);
    portaG.fillRect(x - 30, y, 60, 3);
    portaG.fillRect(x - 30, y + 25, 60, 3);

    // Luz de status superior
    const corLuzStatus = isConcluida ? 0x10b981 : isDesbloqueada ? 0x00e5ff : 0xef4444;
    portaG.fillStyle(corLuzStatus, 1);
    portaG.fillRect(x - 22, y - 46, 44, 4);

    // Terminal leitor biométrico lateral
    const tx = x + 46;
    portaG.fillStyle(0x0f172a, 1);
    portaG.fillRoundedRect(tx - 8, y - 9, 16, 28, 3);
    portaG.fillStyle(corLuzStatus, 0.85);
    portaG.fillRect(tx - 5, y - 5, 10, 12);
  }

  private criarOperadorCenario(): void {
    this.registrarAnimacoes();

    const chaveSprite = this.personagemAtivo === 'reis' ? 'reis' : 'alvares';
    // Posição inicial natural na passarela do mezanino central
    this.spritePersonagem = this.add.sprite(610, 370, chaveSprite);
    this.spritePersonagem.setDepth(15);

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
   * Move o personagem andando até a porta escolhida, executa a animação de entrada
   * (virando de costas / frame 2) e em seguida redireciona para a cena da fase.
   */
  private moverPersonagemAtePortaEEntrar(cfg: PortaHubConfig): void {
    if (this.isTransicaoAtiva) return;
    this.isTransicaoAtiva = true;

    if (!this.spritePersonagem) {
      this.iniciarFaseDireto(cfg.chaveCena);
      return;
    }

    const destinoX = cfg.xPorta;
    const destinoY = cfg.yPorta + 12;

    // Orienta o personagem na direção da porta (direita ou esquerda)
    const olhandoEsquerda = destinoX < this.spritePersonagem.x;
    this.spritePersonagem.setFlipX(olhandoEsquerda);

    // Inicia a animação de corrida
    if (this.anims.exists(`${this.personagemAtivo}_run`)) {
      this.spritePersonagem.anims.play(`${this.personagemAtivo}_run`, true);
    }

    // Calcula duração do percurso com base na distância (velocidade uniforme)
    const distancia = Phaser.Math.Distance.Between(
      this.spritePersonagem.x,
      this.spritePersonagem.y,
      destinoX,
      destinoY
    );
    const duracaoMovimento = Math.max(380, Math.min(1000, distancia * 1.6));

    // Move o personagem até a porta
    this.tweens.add({
      targets: this.spritePersonagem,
      x: destinoX,
      y: destinoY,
      duration: duracaoMovimento,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        // Chegou na porta: para a animação de corrida
        this.spritePersonagem.anims.stop();
        // Vira de costas para entrar na porta (frame 2 do spritesheet oficial)
        this.spritePersonagem.setFrame(2);

        // Flash sutil na câmera / leitor da porta
        this.cameras.main.flash(180, 0, 255, 102);

        // Animação de entrar na porta (dá um passo para dentro, encolhe e desvanece)
        this.tweens.add({
          targets: this.spritePersonagem,
          y: destinoY - 10,
          scale: 0.72,
          alpha: 0.1,
          duration: 280,
          ease: 'Sine.easeIn',
          onComplete: () => {
            this.cameras.main.fade(280, 0, 0, 0);
            this.time.delayedCall(280, () => {
              this.scene.start(cfg.chaveCena);
            });
          },
        });
      },
    });
  }

  private iniciarFaseDireto(chaveCena: string): void {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start(chaveCena);
    });
  }

  /**
   * Botão de Seleção de Operador no canto superior direito.
   * Não possui caixa ou texto "HUB" na tela, destacando o botão.
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

    // Fundo do botão em estilo cápsula sci-fi chanfrada
    const btnFundo = this.add.graphics();
    const desenharFundo = (isHover: boolean) => {
      btnFundo.clear();
      // Fundo escuro com leve gradiente e opacidade alta
      btnFundo.fillStyle(isHover ? 0x0f253a : 0x06111e, isHover ? 0.98 : 0.92);
      btnFundo.fillRoundedRect(-105, -22, 210, 44, 8);

      // Borda neon com brilho marcante
      btnFundo.lineStyle(isHover ? 2.5 : 1.8, isHover ? 0x00ffcc : corTema, 0.95);
      btnFundo.strokeRoundedRect(-105, -22, 210, 44, 8);

      // Friso superior cibernético
      btnFundo.lineStyle(1.2, 0x00ffcc, isHover ? 0.9 : 0.4);
      btnFundo.lineBetween(-85, -18, 85, -18);
    };

    desenharFundo(false);

    // Emblema circular holográfico com a inicial do operador
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

    // Rótulo da Linha 1: "OPERADOR ATIVO"
    const textoSub = this.add.text(-56, -7, 'OPERADOR ATIVO', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '9px',
      color: '#94a3b8',
      letterSpacing: 1,
    });
    textoSub.setOrigin(0, 0.5);

    // Rótulo da Linha 2: "[P] ALVARES" ou "[P] REIS"
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

    // LED indicador verde pulsante de status
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

    // Hit area interativa do botão
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
    scanlines.fillStyle(0x00100a, 0.04);

    for (let y = 0; y < height; y += 4) {
      scanlines.fillRect(0, y, width, 2);
    }
    scanlines.setDepth(99);
  }

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
          this.moverPersonagemAtePortaEEntrar(cfg);
        }
      });
    }
  }

  private abrirSelecaoPersonagem(): void {
    if (this.isTransicaoAtiva) return;
    this.isTransicaoAtiva = true;

    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('CenaSelecaoPersonagem', { proximaCena: 'CenaHub' });
    });
  }
}
