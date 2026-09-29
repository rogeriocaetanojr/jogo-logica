import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import imgFundoFase3 from '../../assets/fase3/fundo_fase3.jpg';

/**
 * Dimensões e parâmetros operacionais do mundo da Fase 3
 */
const LARGURA_MUNDO = 4200;
const ALTURA_MUNDO = 720;
const VELOCIDADE_CAMERA_NORMAL = 480; // pixels por segundo
const VELOCIDADE_CAMERA_TURBO = 1280; // pixels por segundo com SHIFT

/**
 * CenaFase3: Setor do Lixão de Hardware / Vale dos Silícios Mortos (Estilo Wall-E).
 * Cenografia construída com base na imagem de referência conceitual em tons âmbar/sépia,
 * com camadas em Parallax, iluminação pulsante de monitores CRT e modo de inspeção de câmera.
 */
export class CenaFase3 extends CenaBase {
  // Controles de inspeção de câmera
  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclaA?: Phaser.Input.Keyboard.Key;
  private teclaD?: Phaser.Input.Keyboard.Key;
  private teclaShift?: Phaser.Input.Keyboard.Key;

  // Interação via mouse
  private isArrastandoMouse: boolean = false;
  private ultimoMouseX: number = 0;

  // Emitter de partículas da atmosfera
  private emissorPoeira?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('CenaFase3', 'fase3');
  }

  preload(): void {
    // Carrega a imagem de referência fornecida pelo usuário
    this.load.image('fase3-fundo-referencia', imgFundoFase3);
  }

  create(): void {
    super.create();

    // 1. Configuração do Mundo e Câmera
    this.physics.world.setBounds(0, 0, LARGURA_MUNDO, ALTURA_MUNDO);
    this.cameras.main.setBounds(0, 0, LARGURA_MUNDO, ALTURA_MUNDO);
    this.cameras.main.setBackgroundColor('#160c07');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // 2. Geração de Texturas Procedurais de Detalhes
    this.gerarTexturasProcedurais();

    // 3. Construção das Camadas em Parallax com Base na Arte de Referência
    this.criarCamada4CeuAtmosferico();
    this.criarCamada3FundoReferencia();
    this.criarCamada2IluminacaoEDetalhes();
    this.criarCamada1PrimeiroPlanoSilhuetas();

    // 4. Atmosfera de Fumaça, Fuligem e Partículas
    this.criarAtmosferaParticulas();

    // 5. Configuração dos Controles de Navegação da Câmera
    this.configurarControlesCamera();
    this.criarEfeitoCRT(this.scale.width, this.scale.height, 0.02);
  }

  // =========================================================================
  // GERAÇÃO DE TEXTURAS PROCEDURAIS
  // =========================================================================

  private gerarTexturasProcedurais(): void {
    // Partícula de poeira âmbar e cinza
    if (!this.textures.exists('f3-particula-ambar')) {
      const g = this.make.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 3);
      g.generateTexture('f3-particula-ambar', 8, 8);
      g.destroy();
    }

    // Brilho difuso para os monitores CRT
    if (!this.textures.exists('f3-glow-crt')) {
      const g = this.make.graphics();
      g.fillStyle(0xf59e0b, 0.25);
      g.fillCircle(24, 24, 22);
      g.fillStyle(0xfde047, 0.55);
      g.fillCircle(24, 24, 14);
      g.fillStyle(0xfffbeb, 0.85);
      g.fillCircle(24, 24, 6);
      g.generateTexture('f3-glow-crt', 48, 48);
      g.destroy();
    }

    // Engrenagem enferrujada de primeiro plano
    if (!this.textures.exists('f3-engrenagem')) {
      const g = this.make.graphics();
      const cx = 28;
      const cy = 28;
      const rExt = 24;
      const rInt = 16;
      const numDentes = 8;

      g.fillStyle(0x0e0805, 1); // Silhueta quase preta com tom enferrujado
      g.beginPath();
      for (let i = 0; i < numDentes * 2; i++) {
        const ang = (i * Math.PI) / numDentes;
        const r = i % 2 === 0 ? rExt : rInt;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();

      // Furo central da engrenagem
      g.fillStyle(0x1a0f08, 1);
      g.fillCircle(cx, cy, 7);

      g.generateTexture('f3-engrenagem', 56, 56);
      g.destroy();
    }

    // Placa de Circuito Impresso em silhueta
    if (!this.textures.exists('f3-pcb-silhueta')) {
      const g = this.make.graphics();
      g.fillStyle(0x140c08, 1);
      g.fillRect(0, 0, 52, 34);

      // Trilhas douradas/cobre oxidadas
      g.lineStyle(1, 0x85441e, 0.8);
      g.beginPath();
      g.moveTo(4, 6);
      g.lineTo(18, 6);
      g.lineTo(24, 12);
      g.lineTo(46, 12);
      g.moveTo(8, 26);
      g.lineTo(28, 26);
      g.lineTo(34, 18);
      g.lineTo(48, 18);
      g.strokePath();

      // Chip microprocessador
      g.fillStyle(0x080402, 1);
      g.fillRect(10, 10, 20, 14);

      g.generateTexture('f3-pcb-silhueta', 52, 34);
      g.destroy();
    }
  }

  // =========================================================================
  // CAMADA 4: CÉU ATMOSFÉRICO DE POLUIÇÃO E FUMAÇA (scrollFactor: 0.05)
  // =========================================================================

  private criarCamada4CeuAtmosferico(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.setScrollFactor(0.05);
    g.setDepth(5);

    // Degradê vertical profundo de fumaça e poluição sépia/âmbar
    g.fillGradientStyle(0x28150c, 0x28150c, 0x4f2a15, 0x753e1b, 1);
    g.fillRect(0, 0, width * 1.5, height * 0.65);

    g.fillGradientStyle(0x753e1b, 0x753e1b, 0x160c07, 0x160c07, 1);
    g.fillRect(0, height * 0.65, width * 1.5, height * 0.35);

    // Sol/Lua velado pelo smog âmbar
    g.fillStyle(0xfef08a, 0.12);
    g.fillCircle(840, 170, 75);
    g.fillStyle(0xfde047, 0.22);
    g.fillCircle(840, 170, 48);
    g.fillStyle(0xfffbeb, 0.38);
    g.fillCircle(840, 170, 24);
  }

  // =========================================================================
  // CAMADA 3: CENÁRIO DA IMAGEM DE REFERÊNCIA EM PARALLAX (scrollFactor: 0.35)
  // =========================================================================

  private criarCamada3FundoReferencia(): void {
    const scrollFactor = 0.35;
    const container = this.add.container(0, 0);
    container.setScrollFactor(scrollFactor);
    container.setDepth(15);

    // A imagem tem proporção 1024 x 571.
    // Escalamos para altura total de 720px:
    // Largura resultante = 720 * (1024 / 571) = ~1291.5px
    const alturaPainel = 720;
    const larguraPainel = (1024 / 571) * alturaPainel;

    // Para cobrir a extensão de 4200px com scrollFactor 0.35:
    // (4200 - 1280) * 0.35 + 1280 = 2302px necessários
    // Encadeamos 4 painéis cobrindo mais de 5100px com folga absoluta!
    const totalPaineis = 4;

    for (let i = 0; i < totalPaineis; i++) {
      const xPos = i * (larguraPainel - 1); // -1 para evitar linha de fresta entre painéis
      const painel = this.add.image(xPos, 0, 'fase3-fundo-referencia');
      painel.setOrigin(0, 0);
      painel.setDisplaySize(larguraPainel, alturaPainel);

      // Alterna espelhamento horizontal no 2º e 4º painel para criar variação orgânica
      if (i % 2 === 1) {
        painel.setFlipX(true);
      }

      container.add(painel);
    }
  }

  // =========================================================================
  // CAMADA 2: ILUMINAÇÃO DINÂMICA, GLOW CRT E LEDS (scrollFactor: 0.35)
  // =========================================================================

  private criarCamada2IluminacaoEDetalhes(): void {
    const scrollFactor = 0.35;
    const container = this.add.container(0, 0);
    container.setScrollFactor(scrollFactor);
    container.setDepth(25);

    const alturaPainel = 720;
    const larguraPainel = (1024 / 571) * alturaPainel;
    const totalPaineis = 4;

    // Coordenadas relativas dos monitores CRT acesos e servidores na imagem de referência
    // (Normalizadas para a escala de 1291 x 720)
    const posicoesMonitoresRef = [
      { rx: 90, ry: 480, escala: 0.9 },
      { rx: 170, ry: 660, escala: 1.1 },
      { rx: 575, ry: 660, escala: 1.0 },
      { rx: 710, ry: 580, escala: 1.15 },
      { rx: 755, ry: 500, escala: 0.85 },
      { rx: 855, ry: 420, escala: 0.8 },
      { rx: 940, ry: 640, escala: 1.1 },
      { rx: 960, ry: 430, escala: 0.75 },
    ];

    const posicoesServidoresRef = [
      { rx: 160, ry: 330, w: 90, h: 120 },
      { rx: 360, ry: 540, w: 70, h: 90 },
      { rx: 670, ry: 340, w: 90, h: 180 },
      { rx: 860, ry: 230, w: 100, h: 220 },
    ];

    // Distribui os pontos de iluminação dinâmicos em cada painel ao longo do mapa
    for (let p = 0; p < totalPaineis; p++) {
      const offsetX = p * (larguraPainel - 1);
      const isFlipped = p % 2 === 1;

      // 1. Glow e pulso térmico âmbar nos monitores CRT
      posicoesMonitoresRef.forEach((m) => {
        const xReal = isFlipped ? offsetX + (larguraPainel - m.rx) : offsetX + m.rx;
        const yReal = m.ry;

        const glow = this.add.image(xReal, yReal, 'f3-glow-crt');
        glow.setScale(m.escala);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        container.add(glow);

        // Tween de respiração da iluminação âmbar
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.45, to: 0.9 },
          scale: { from: m.escala * 0.92, to: m.escala * 1.15 },
          yoyo: true,
          repeat: -1,
          duration: 1200 + Math.random() * 1600,
          ease: 'Sine.easeInOut',
        });
      });

      // 2. LEDs moribundos piscando nas frentes dos servidores
      posicoesServidoresRef.forEach((s) => {
        const baseX = isFlipped ? offsetX + (larguraPainel - s.rx) : offsetX + s.rx;
        const numLeds = 8 + Math.floor(Math.random() * 5);

        for (let l = 0; l < numLeds; l++) {
          const lx = baseX + (Math.random() - 0.5) * s.w;
          const ly = s.ry + (Math.random() - 0.5) * s.h;
          const isVerde = Math.random() < 0.4;
          const corLed = isVerde ? 0x22c55e : 0xef4444;

          const led = this.add.circle(lx, ly, 2, corLed, 0.9);
          container.add(led);

          this.tweens.add({
            targets: led,
            alpha: { from: 0.1, to: 1.0 },
            yoyo: true,
            repeat: -1,
            duration: 400 + Math.random() * 1200,
            delay: Math.random() * 1500,
          });
        }
      });
    }
  }

  // =========================================================================
  // CAMADA 1: PRIMEIRO PLANO CENOGRÁFICO DE SILHUETAS (scrollFactor: 0.8)
  // =========================================================================

  private criarCamada1PrimeiroPlanoSilhuetas(): void {
    const scrollFactor = 0.8;
    const container = this.add.container(0, 0);
    container.setScrollFactor(scrollFactor);
    container.setDepth(40);

    const g = this.add.graphics();
    container.add(g);

    // 2920 * 0.8 + 1280 = ~3616px. Cobrimos até 4300px
    const larguraTotal = 4300;

    // 1. Silhueta do solo em dunas escuras de sucata (como no rodapé da imagem de referência)
    g.fillStyle(0x0a0503, 1);
    g.beginPath();
    g.moveTo(-50, 720);

    for (let x = -50; x <= larguraTotal; x += 80) {
      const yChao = 655 + Math.sin(x * 0.015) * 18 + Math.cos(x * 0.035) * 8;
      g.lineTo(x, yChao);
    }
    g.lineTo(larguraTotal, 720);
    g.lineTo(-50, 720);
    g.closePath();
    g.fillPath();

    // 2. Engrenagens enferrujadas e dentes metálicos quebrados fincados na terra
    for (let x = 60; x < larguraTotal; x += 180 + Math.random() * 140) {
      const yBase = 650 + Math.sin(x * 0.015) * 16;
      const engrenagem = this.add.image(x, yBase + 12, 'f3-engrenagem');
      engrenagem.setRotation((Math.random() - 0.5) * 0.8);
      container.add(engrenagem);
    }

    // 3. Fios desencapados e raízes de cabos serpenteando (estilo da imagem de referência)
    g.lineStyle(2.5, 0x090503, 1);
    for (let x = 80; x < larguraTotal; x += 140) {
      const yBase = 655 + Math.sin(x * 0.015) * 16;

      // Raiz de cabo curvado
      g.beginPath();
      g.moveTo(x, yBase + 10);
      this.desenharCurva(g, x, yBase + 10, x + 25, yBase - 25, x + 55, yBase - 15);
      g.strokePath();

      // Tentáculos/fios desencapados abertos na ponta
      g.lineStyle(1.4, 0xb45309, 0.9); // Cobre enferrujado exposto
      g.beginPath();
      g.moveTo(x + 55, yBase - 15);
      g.lineTo(x + 65, yBase - 28);
      g.moveTo(x + 55, yBase - 15);
      g.lineTo(x + 72, yBase - 18);
      g.moveTo(x + 55, yBase - 15);
      g.lineTo(x + 68, yBase - 8);
      g.strokePath();
      g.lineStyle(2.5, 0x090503, 1);
    }

    // 4. Placas de advertência industriais na paleta sépia/âmbar
    this.criarPlacasAdvertencia(container);
  }

  private criarPlacasAdvertencia(container: Phaser.GameObjects.Container): void {
    const dadosPlacas = [
      {
        x: 420,
        y: 630,
        rot: -0.09,
        titulo: 'SETOR 404',
        subtitulo: 'HARDWARE NÃO ENCONTRADO',
      },
      {
        x: 1480,
        y: 625,
        rot: 0.08,
        titulo: 'PERIGO // OBSOLESCÊNCIA',
        subtitulo: 'DESCARTE DE HARDWARE AUTORIZADO',
      },
      {
        x: 2580,
        y: 635,
        rot: -0.06,
        titulo: 'VALE DOS SILÍCIOS MORTOS',
        subtitulo: 'ZONA DE RADIAÇÃO TÉRMICA CRT',
      },
      {
        x: 3680,
        y: 628,
        rot: 0.12,
        titulo: 'TERMINAL DE SUCATA 0xDEAD',
        subtitulo: 'FIM DO BARRAMENTO DE DADOS',
      },
    ];

    dadosPlacas.forEach((placa) => {
      const painel = this.add.container(placa.x, placa.y);
      painel.setRotation(placa.rot);

      // Haste enferrujada
      const haste = this.add.rectangle(0, 32, 6, 65, 0x221108);

      // Placa de ferro com ferrugem
      const fundo = this.add.rectangle(0, 0, 190, 48, 0x160c07);
      fundo.setStrokeStyle(2, 0xd97706, 0.7);

      // Faixa de perigo âmbar
      const faixa = this.add.rectangle(0, -18, 190, 5, 0xf59e0b);

      const txtTitulo = this.add.text(0, -7, placa.titulo, {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '11px',
        color: '#f59e0b',
        fontStyle: 'bold',
      });
      txtTitulo.setOrigin(0.5);

      const txtSub = this.add.text(0, 9, placa.subtitulo, {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '8.5px',
        color: '#d4b395',
      });
      txtSub.setOrigin(0.5);

      painel.add([haste, fundo, faixa, txtTitulo, txtSub]);
      container.add(painel);
    });
  }

  // =========================================================================
  // ATMOSFERA DE PARTÍCULAS E POEIRA
  // =========================================================================

  private criarAtmosferaParticulas(): void {
    // Emitter de partículas em tons âmbar/dourado e fuligem
    this.emissorPoeira = this.add.particles(0, 0, 'f3-particula-ambar', {
      x: { min: -100, max: LARGURA_MUNDO + 100 },
      y: { min: -30, max: 20 },
      lifespan: { min: 6000, max: 12000 },
      speedY: { min: 12, max: 34 },
      speedX: { min: -15, max: 25 },
      scale: { start: 0.75, end: 0.15 },
      alpha: { start: 0.5, end: 0 },
      quantity: 3,
      frequency: 160,
      tint: [0xf59e0b, 0xfde047, 0xb45309, 0x78350f, 0x57301c],
    });

    this.emissorPoeira.setDepth(50);

    // Névoa rasteira adicional em degradê âmbar
    const névoa = this.add.graphics();
    névoa.setDepth(35);
    névoa.setScrollFactor(0.55);
    névoa.fillGradientStyle(0xb45309, 0xb45309, 0x160c07, 0x160c07, 0.18);
    névoa.fillRect(0, 520, 3600, 200);
  }

  // =========================================================================
  // MODO DE INSPEÇÃO DE CÂMERA E CONTROLES
  // =========================================================================

  private configurarControlesCamera(): void {
    if (this.input.keyboard) {
      this.cursores = this.input.keyboard.createCursorKeys();
      this.teclaA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.teclaD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.teclaShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    }

    // Suporte a arrastar a câmera com o Mouse (Pan horizontal)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isArrastandoMouse = true;
      this.ultimoMouseX = pointer.x;
    });

    this.input.on('pointerup', () => {
      this.isArrastandoMouse = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isArrastandoMouse) {
        const deltaX = pointer.x - this.ultimoMouseX;
        this.cameras.main.scrollX = Phaser.Math.Clamp(
          this.cameras.main.scrollX - deltaX * 1.4,
          0,
          LARGURA_MUNDO - this.scale.width
        );
        this.ultimoMouseX = pointer.x;
      }
    });

    // Suporte à rodinha do mouse para rolar o mapa
    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: unknown[],
        _deltaX: number,
        deltaY: number
      ) => {
        this.cameras.main.scrollX = Phaser.Math.Clamp(
          this.cameras.main.scrollX + (deltaY > 0 ? 160 : -160),
          0,
          LARGURA_MUNDO - this.scale.width
        );
      }
    );
  }

  // =========================================================================
  // LOOP DE ATUALIZAÇÃO (UPDATE)
  // =========================================================================

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);

    const deltaSegundos = delta / 1000;
    this.atualizarMovimentoCamera(deltaSegundos);
  }

  private atualizarMovimentoCamera(deltaSegundos: number): void {
    const isTurbo = this.teclaShift?.isDown ?? false;
    const velocidade = isTurbo ? VELOCIDADE_CAMERA_TURBO : VELOCIDADE_CAMERA_NORMAL;

    let moverDirecao = 0;

    const esquerda = (this.cursores?.left.isDown ?? false) || (this.teclaA?.isDown ?? false);
    const direita = (this.cursores?.right.isDown ?? false) || (this.teclaD?.isDown ?? false);

    if (esquerda) moverDirecao -= 1;
    if (direita) moverDirecao += 1;

    if (moverDirecao !== 0) {
      const scrollMaxX = LARGURA_MUNDO - this.scale.width;
      this.cameras.main.scrollX = Phaser.Math.Clamp(
        this.cameras.main.scrollX + moverDirecao * velocidade * deltaSegundos,
        0,
        scrollMaxX
      );
    }
  }

  private desenharCurva(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    cx: number,
    cy: number,
    x2: number,
    y2: number,
    passos: number = 8
  ): void {
    for (let i = 1; i <= passos; i++) {
      const t = i / passos;
      const inv = 1 - t;
      const px = inv * inv * x1 + 2 * inv * t * cx + t * t * x2;
      const py = inv * inv * y1 + 2 * inv * t * cy + t * t * y2;
      g.lineTo(px, py);
    }
  }
}
