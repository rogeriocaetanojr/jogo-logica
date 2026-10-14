import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import { GerenciadorEstado, type TipoPersonagem } from '../../nucleo/GerenciadorEstado';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase1 } from './InterpretadorFase1';
import type { ColunaVento, SentinelaInimiga, PlataformaRachada } from './tiposFase1';
import {
  MUNDO_FASE1,
  CAMERA_FASE1,
  JOGADOR_FASE1,
  VENTO_FASE1,
  MARMORE_RACHADO_FASE1,
  SENTINELAS_FASE1,
  CHECKPOINTS_FASE1,
  PUZZLE_1_FASE1,
  PUZZLE_2_FASE1,
  PUZZLE_3_FASE1,
  SANTUARIO_FASE1,
  BLOCO_1_LEVEL_DESIGN,
} from './constantesFase1';

/**
 * CenaFase1: Céu Partido (Plataforma Aérea, Condicionais, Debugging e Funções Parametrizadas).
 * Estética fiel ao Stitch: céu lilás/rosa em degradê luminoso, nuvens em parallax,
 * mármore claro com frisos dourados, colunas de vento translúcidas e drones sentinela com olho vermelho.
 */
export class CenaFase1 extends CenaBase {
  // Entidades e física
  private jogador!: Phaser.Physics.Arcade.Sprite;
  private tipoPersonagem: TipoPersonagem = 'alvares';
  private plataformasEstaticas!: Phaser.Physics.Arcade.StaticGroup;
  private nuvensSolidas!: Phaser.Physics.Arcade.StaticGroup;
  private grupoMarmoreRachado!: Phaser.Physics.Arcade.StaticGroup;
  private plataformasRachadas: PlataformaRachada[] = [];

  // Mecânicas de Vento
  private colunasVento: ColunaVento[] = [];

  // Inimigos Sentinela
  private sentinelas: SentinelaInimiga[] = [];

  // Checkpoints
  private checkpointAtual: { x: number; y: number } = {
    x: CHECKPOINTS_FASE1.INICIAL.x,
    y: CHECKPOINTS_FASE1.INICIAL.y,
  };
  private textoNotificacaoCheckpoint?: Phaser.GameObjects.Text;

  // Puzzle 1: Condicional dos Altares
  private altarAAtivo: boolean = false;
  private altarBAtivo: boolean = false;
  private spriteAltarA!: Phaser.GameObjects.Sprite;
  private spriteAltarB!: Phaser.GameObjects.Sprite;
  private totemCondicional!: Phaser.GameObjects.Image;
  private promptCondicional!: Phaser.GameObjects.Text;
  private superColunaVento?: ColunaVento;
  private zonaDecolagemBounds!: Phaser.Geom.Rectangle;
  private graficoZonaDecolagem!: Phaser.GameObjects.Graphics;

  // Puzzle 2: Sentinela Hackeável (Debugging de operador)
  private totemSentinela!: Phaser.GameObjects.Image;
  private promptSentinela!: Phaser.GameObjects.Text;
  private sentinelaHackeavel?: SentinelaInimiga;
  private sentinelaHackeada: boolean = false;

  // Puzzle 3: Função com Parâmetros (Escada de Vento)
  private totemRajada!: Phaser.GameObjects.Image;
  private promptRajada!: Phaser.GameObjects.Text;
  private escadaRajadasAtiva: boolean = false;
  private colunasEscada: ColunaVento[] = [];
  private tempoCicloEscada: number = 0;
  private alturaEscadaPixels: number = 430;
  private atrasoEscadaSegundos: number = 1.5;

  // Antecâmara Final / Portal do Santuário
  private portalFinal!: Phaser.GameObjects.Sprite;
  private faseConcluida: boolean = false;

  // Controles
  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclasWASD?: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private teclaEspaco?: Phaser.Input.Keyboard.Key;
  private teclaInteragir?: Phaser.Input.Keyboard.Key;

  // Temporizadores para Coyote Time e Jump Buffer
  private tempoUltimaVezNoChao: number = -9999;
  private tempoUltimoPressionarPulo: number = -9999;

  constructor() {
    super('CenaFase1', 'fase1');
  }

  create(): void {
    super.create();

    const larguraMundo = MUNDO_FASE1.LARGURA;
    const alturaMundo = MUNDO_FASE1.ALTURA;

    // 1. Limites do Mundo e Câmera com fundo lilás celestial
    this.physics.world.setBounds(0, 0, larguraMundo, alturaMundo + MUNDO_FASE1.PADDING_INFERIOR);
    this.cameras.main.setBounds(0, 0, larguraMundo, alturaMundo);
    this.cameras.main.setBackgroundColor(MUNDO_FASE1.COR_FUNDO);
    this.cameras.main.fadeIn(MUNDO_FASE1.FADE_IN_MS, 255, 255, 255);

    // 2. HUD Superior e CRT Retrô
    this.criarHUDSuperior('FASE 1 // CÉU PARTIDO');
    this.criarEfeitoCRT(1280, 720, MUNDO_FASE1.OPACIDADE_CRT);

    // 3. Texturas procedurais na paleta luminosa do Stitch
    this.gerarTexturasProcedurais();

    // 4. Cenário de Fundo Luminoso e Nuvens em Parallax
    this.criarCenarioParallax(larguraMundo, alturaMundo);

    // 5. Grupos de Física
    this.plataformasEstaticas = this.physics.add.staticGroup();
    this.nuvensSolidas = this.physics.add.staticGroup();
    this.grupoMarmoreRachado = this.physics.add.staticGroup();

    // 6. Jogador (CRÍTICO: criado antes de registrar colisores para não causar erro de objeto indefinido)
    this.criarJogador();

    // 7. Construção da Estrutura dos 3 Blocos
    this.construirBloco1_Introducao(alturaMundo);
    this.construirBloco2_PuzzlesECodigo(alturaMundo);
    this.construirBloco3_EscadaEAntecamara(alturaMundo);

    // 8. Colisões com o Jogador
    this.physics.add.collider(this.jogador, this.plataformasEstaticas);
    this.physics.add.collider(this.jogador, this.nuvensSolidas);
    this.physics.add.collider(
      this.jogador,
      this.grupoMarmoreRachado,
      (_jog, plat) => {
        this.tratarColisaoMarmoreRachado(plat as Phaser.Physics.Arcade.Sprite);
      }
    );

    // 9. Controles do Teclado
    this.configurarControles();

    // 10. Integração com o Terminal
    this.configurarTerminal();

    // 11. Câmera seguindo o jogador com suavidade
    this.cameras.main.startFollow(this.jogador, true, CAMERA_FASE1.LERP_X, CAMERA_FASE1.LERP_Y);
    this.cameras.main.setDeadzone(CAMERA_FASE1.DEADZONE_LARGURA, CAMERA_FASE1.DEADZONE_ALTURA);

    // 12. Notificação visual de Checkpoint
    this.textoNotificacaoCheckpoint = this.add.text(
      640,
      120,
      'CHECKPOINT SINCRONIZADO',
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '15px',
        color: '#fbbf24',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 10, y: 5 },
      }
    );
    this.textoNotificacaoCheckpoint.setOrigin(0.5);
    this.textoNotificacaoCheckpoint.setScrollFactor(0);
    this.textoNotificacaoCheckpoint.setAlpha(0);
    this.textoNotificacaoCheckpoint.setDepth(9990);

    // 13. Transmissão Inicial de Rádio Rebelde
    this.comunicador.iniciarDialogo([
      {
        falante: '> CANAL REBELDE // TRANSMISSÃO CELESTIAL',
        texto:
          'Atenção, Hacker! Você alcançou o Céu Partido, o setor aerodinâmico controlado pela IA.',
      },
      {
        falante: '> CANAL REBELDE // TRANSMISSÃO CELESTIAL',
        texto:
          'Utilize as correntes de vento verticais para planar segurando o pulo. Cuidado com o mármore rachado e os drones Sentinela!',
      },
    ]);
  }

  /**
   * Gera todas as texturas procedurais com alta fidelidade visual à paleta do Stitch:
   * Céu lilás/rosa luminoso, mármore off-white com frisos dourados, nuvens fofas e drones escuros com olho vermelho.
   * Nota: A textura órfã 'player' foi eliminada em favor dos spritesheets reais do GerenciadorEstado.
   */
  private gerarTexturasProcedurais(): void {
    // 1. Mármore Claro com Friso Dourado (Superfície sólida)
    if (!this.textures.exists('marmore-bloco')) {
      const g = this.make.graphics();
      const w = 240;
      const h = 36;
      g.fillStyle(0xf8fafc, 1);
      g.fillRoundedRect(0, 0, w, h, 4);
      g.fillStyle(0xe2e8f0, 1);
      g.fillRect(2, h - 6, w - 4, 4);
      // Friso superior dourado reluzente
      g.fillStyle(0xf59e0b, 1);
      g.fillRect(0, 0, w, 5);
      g.fillStyle(0xfef08a, 0.9);
      g.fillRect(2, 1, w - 4, 2);
      // Veios sutis de mármore
      g.lineStyle(1, 0xcbd5e1, 0.8);
      g.beginPath();
      g.moveTo(40, 5);
      g.lineTo(70, 30);
      g.moveTo(150, 5);
      g.lineTo(190, 28);
      g.strokePath();
      g.generateTexture('marmore-bloco', w, h);
      g.destroy();
    }

    // 2. Mármore Rachado (Fragilidade visível com telegraph de 0.4s)
    if (!this.textures.exists('marmore-rachado')) {
      const g = this.make.graphics();
      const w = 180;
      const h = 32;
      g.fillStyle(0xf1f5f9, 1);
      g.fillRoundedRect(0, 0, w, h, 4);
      g.fillStyle(0xd97706, 0.9);
      g.fillRect(0, 0, w, 4);
      // Rachaduras visíveis profundas
      g.lineStyle(2, 0x64748b, 1);
      g.beginPath();
      g.moveTo(50, 0);
      g.lineTo(65, 14);
      g.lineTo(55, 22);
      g.lineTo(75, 32);
      g.moveTo(120, 0);
      g.lineTo(110, 12);
      g.lineTo(135, 20);
      g.lineTo(125, 32);
      g.strokePath();
      // Brilho tênue ambar saindo das fendas
      g.lineStyle(1, 0xfbbf24, 0.9);
      g.beginPath();
      g.moveTo(51, 1);
      g.lineTo(66, 15);
      g.strokePath();
      g.generateTexture('marmore-rachado', w, h);
      g.destroy();
    }

    // 3. Nuvem Sólida (Plataforma fofa branca e lilás pastel)
    if (!this.textures.exists('nuvem-solida')) {
      const g = this.make.graphics();
      const w = 200;
      const h = 44;
      g.fillStyle(0xfff1f2, 0.95);
      g.fillRoundedRect(10, 10, w - 20, h - 10, 15);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(40, 20, 18);
      g.fillCircle(85, 16, 22);
      g.fillCircle(135, 18, 20);
      g.fillCircle(170, 22, 16);
      g.fillStyle(0xe9d5ff, 0.6);
      g.fillRoundedRect(15, h - 12, w - 30, 8, 4);
      g.generateTexture('nuvem-solida', w, h);
      g.destroy();
    }

    // 4. Coluna de Mármore Arquitetônica Antiga
    if (!this.textures.exists('coluna-marmore')) {
      const g = this.make.graphics();
      const w = 48;
      const h = 260;
      g.fillStyle(0xf8fafc, 1);
      g.fillRect(8, 20, w - 16, h - 40);
      g.lineStyle(2, 0xcbd5e1, 0.7);
      g.lineBetween(16, 20, 16, h - 20);
      g.lineBetween(24, 20, 24, h - 20);
      g.lineBetween(32, 20, 32, h - 20);
      g.fillStyle(0xf59e0b, 1);
      g.fillRect(0, 0, w, 20);
      g.fillRect(0, h - 20, w, 20);
      g.fillStyle(0xfef08a, 0.95);
      g.fillRect(4, 4, w - 8, 4);
      g.fillRect(4, h - 8, w - 8, 4);
      g.generateTexture('coluna-marmore', w, h);
      g.destroy();
    }

    // 5. Coluna Dourada Majestosa do Santuário (Bloco 3 final)
    if (!this.textures.exists('coluna-dourada')) {
      const g = this.make.graphics();
      const w = 56;
      const h = 320;
      g.fillStyle(0xfffbeb, 1);
      g.fillRect(10, 24, w - 20, h - 48);
      g.fillStyle(0xfbbf24, 1);
      g.fillRect(0, 0, w, 24);
      g.fillRect(0, h - 24, w, 24);
      g.fillStyle(0xd97706, 1);
      g.fillRect(6, 6, w - 12, 12);
      g.fillRect(6, h - 18, w - 12, 12);
      g.lineStyle(2, 0xf59e0b, 0.8);
      g.lineBetween(18, 24, 18, h - 24);
      g.lineBetween(28, 24, 28, h - 24);
      g.lineBetween(38, 24, 38, h - 24);
      g.generateTexture('coluna-dourada', w, h);
      g.destroy();
    }

    // 6. Totem Celestial de Comando
    if (!this.textures.exists('totem-celestial')) {
      const g = this.make.graphics();
      const w = 52;
      const h = 70;
      g.fillStyle(0x0f172a, 1);
      g.fillRoundedRect(4, 12, w - 8, h - 12, 6);
      g.fillStyle(0xf59e0b, 1);
      g.fillRect(8, h - 8, w - 16, 6);
      g.fillStyle(0x38bdf8, 0.35);
      g.fillRoundedRect(8, 16, w - 16, 32, 4);
      g.fillStyle(0x00e5ff, 1);
      g.fillRect(14, 22, w - 28, 4);
      g.fillRect(14, 30, w - 34, 4);
      g.fillRect(14, 38, w - 24, 4);
      g.fillStyle(0xa855f7, 1);
      g.fillCircle(w / 2, 8, 6);
      g.generateTexture('totem-celestial', w, h);
      g.destroy();
    }

    // 7. Altar de Ativação Rúnico
    if (!this.textures.exists('altar-runico')) {
      const g = this.make.graphics();
      const w = 64;
      const h = 24;
      g.fillStyle(0x334155, 1);
      g.fillRoundedRect(0, 8, w, 16, 4);
      g.fillStyle(0xf59e0b, 0.8);
      g.fillRect(4, 10, w - 8, 4);
      g.fillStyle(0x64748b, 1);
      g.fillCircle(w / 2, 10, 8);
      g.generateTexture('altar-runico', w, h);
      g.destroy();
    }

    // 7b. Altar Ativado
    if (!this.textures.exists('altar-runico-on')) {
      const g = this.make.graphics();
      const w = 64;
      const h = 24;
      g.fillStyle(0x1e293b, 1);
      g.fillRoundedRect(0, 8, w, 16, 4);
      g.fillStyle(0x10b981, 1);
      g.fillRect(4, 10, w - 8, 4);
      g.fillStyle(0x34d399, 1);
      g.fillCircle(w / 2, 10, 8);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(w / 2, 8, 3);
      g.generateTexture('altar-runico-on', w, h);
      g.destroy();
    }

    // 8. Inimigo: Sentinela-Nuvem (Drone com olho vermelho do Stitch)
    if (!this.textures.exists('sentinela-drone')) {
      const g = this.make.graphics();
      const w = 64;
      const h = 64;
      g.fillStyle(0x18181b, 1);
      g.fillRoundedRect(8, 12, 48, 40, 10);
      g.fillStyle(0x27272a, 1);
      g.fillRect(12, 16, 40, 8);
      g.fillStyle(0x52525b, 1);
      g.fillRect(2, 26, 8, 12);
      g.fillRect(54, 26, 8, 12);
      g.fillStyle(0xef4444, 0.35);
      g.fillCircle(32, 34, 16);
      g.fillStyle(0xff0055, 1);
      g.fillCircle(32, 34, 10);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(34, 32, 3);
      g.generateTexture('sentinela-drone', w, h);
      g.destroy();
    }

    // 9. Portal do Santuário
    if (!this.textures.exists('portal-santuario')) {
      const g = this.make.graphics();
      const w = 96;
      const h = 160;
      g.fillStyle(0xf59e0b, 1);
      g.fillRoundedRect(0, 0, w, h, 20);
      g.fillStyle(0xfef08a, 1);
      g.fillRoundedRect(6, 6, w - 12, h - 12, 16);
      g.fillStyle(0x4a044e, 1);
      g.fillRoundedRect(14, 14, w - 28, h - 28, 12);
      g.fillStyle(0xc084fc, 0.9);
      g.fillEllipse(w / 2, h / 2, 26, 50);
      g.fillStyle(0xffffff, 0.95);
      g.fillEllipse(w / 2, h / 2, 10, 24);
      g.generateTexture('portal-santuario', w, h);
      g.destroy();
    }
  }

  /**
   * Constrói o fundo em degradê do Céu Partido (lilás/rosa luminoso) e nuvens em Parallax.
   */
  private criarCenarioParallax(larguraMundo: number, _alturaMundo: number): void {
    // 1. Degradê de céu contínuo suave: lilás luminoso descendo para rosa e pêssego
    const gradiente = this.add.graphics();
    gradiente.setDepth(-10);
    gradiente.fillGradientStyle(
      0x8b5cf6, // topo esquerdo: lilás vibrante
      0xa855f7, // topo direito
      0xf472b6, // base esquerda: rosa celestial
      0xfbcfe8, // base direita: pêssego suave
      1
    );
    gradiente.fillRect(0, 0, 1280, 720);
    gradiente.setScrollFactor(0);

    // 2. Camada 1 de Parallax: Névoa e nuvens distantes (fator 0.15)
    const nuvensDistantes = this.add.graphics();
    nuvensDistantes.setDepth(-8);
    nuvensDistantes.fillStyle(0xf5d0fe, 0.45);
    for (let x = 40; x < larguraMundo; x += 360) {
      nuvensDistantes.fillEllipse(x, 460, 280, 110);
      nuvensDistantes.fillEllipse(x + 120, 420, 220, 90);
    }
    nuvensDistantes.setScrollFactor(0.15, 0.1);

    // 3. Camada 2 de Parallax: Ruínas celestiais e arcos de mármore ao longe (fator 0.35)
    const ruinasDistantes = this.add.graphics();
    ruinasDistantes.setDepth(-6);
    ruinasDistantes.fillStyle(0xffedd5, 0.55);
    for (let x = 180; x < larguraMundo; x += 520) {
      ruinasDistantes.fillRect(x, 320, 24, 180);
      ruinasDistantes.fillRect(x + 60, 320, 24, 180);
      ruinasDistantes.fillRect(x - 10, 310, 104, 16);
      ruinasDistantes.fillCircle(x + 42, 280, 30);
    }
    ruinasDistantes.setScrollFactor(0.35, 0.2);

    // 4. Camada 3 de Parallax: Nuvens médias bem iluminadas (fator 0.55)
    const nuvensMedias = this.add.graphics();
    nuvensMedias.setDepth(-4);
    nuvensMedias.fillStyle(0xffffff, 0.65);
    for (let x = 80; x < larguraMundo; x += 440) {
      nuvensMedias.fillCircle(x, 540, 60);
      nuvensMedias.fillCircle(x + 50, 520, 80);
      nuvensMedias.fillCircle(x + 110, 540, 60);
    }
    nuvensMedias.setScrollFactor(0.55, 0.3);
  }

  private criarJogador(): void {
    this.tipoPersonagem = GerenciadorEstado.obterPersonagem();
    const chave = this.tipoPersonagem === 'reis' ? 'reis' : 'alvares';
    this.jogador = this.physics.add.sprite(
      this.checkpointAtual.x,
      this.checkpointAtual.y,
      chave
    );
    this.jogador.setCollideWorldBounds(true);
    this.jogador.setDepth(JOGADOR_FASE1.PROFUNDIDADE);
    const body = this.jogador.body as Phaser.Physics.Arcade.Body;
    body.setSize(JOGADOR_FASE1.HITBOX_LARGURA, JOGADOR_FASE1.HITBOX_ALTURA);
    body.setOffset(JOGADOR_FASE1.HITBOX_OFFSET_X, JOGADOR_FASE1.HITBOX_OFFSET_Y);
    this.jogador.anims.play(`${this.tipoPersonagem}_idle`, true);
  }

  /**
   * BLOCO 1: Introdução ao Ar (x: 0 a 1600).
   * Plataformas de nuvem + mármore rachado intercaladas, 2 colunas de vento para ensinar o planar.
   */
  private construirBloco1_Introducao(_alturaMundo: number): void {
    // 1. Chão inicial de mármore sólido largo e seguro
    const cfgChao = BLOCO_1_LEVEL_DESIGN.CHAO_INICIAL;
    const chaoInicial = this.plataformasEstaticas.create(cfgChao.x, cfgChao.y, 'marmore-bloco');
    chaoInicial.setScale(cfgChao.scaleX, cfgChao.scaleY).refreshBody();

    // Colunas decorativas na entrada
    for (const pos of BLOCO_1_LEVEL_DESIGN.COLUNAS_DECORATIVAS) {
      this.add.image(pos.x, pos.y, 'coluna-marmore').setDepth(2);
    }

    // 2. Primeira Nuvem Sólida
    const nuvem1 = this.nuvensSolidas.create(
      BLOCO_1_LEVEL_DESIGN.NUVEM_1.x,
      BLOCO_1_LEVEL_DESIGN.NUVEM_1.y,
      'nuvem-solida'
    );
    nuvem1.refreshBody();

    // 3. Coluna de Vento 1: Ensina a planar sobre vão de nuvem
    const c1 = VENTO_FASE1.COLUNA_1;
    this.criarColunaVento(c1.x, c1.y, c1.largura, c1.altura, c1.forca, c1.ativa);

    // 4. Plataforma de Mármore Rachado 1 (telegraph de 0.4s)
    this.criarPlataformaRachada(
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_1.x,
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_1.y
    );

    // 5. Segunda Nuvem Sólida intermediária
    const nuvem2 = this.nuvensSolidas.create(
      BLOCO_1_LEVEL_DESIGN.NUVEM_2.x,
      BLOCO_1_LEVEL_DESIGN.NUVEM_2.y,
      'nuvem-solida'
    );
    nuvem2.refreshBody();

    // 6. Coluna de Vento 2: Impulso médio entre blocos rachados
    const c2 = VENTO_FASE1.COLUNA_2;
    this.criarColunaVento(c2.x, c2.y, c2.largura, c2.altura, c2.forca, c2.ativa);

    // 7. Sequência de Mármore Rachado 2 e 3
    this.criarPlataformaRachada(
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_2.x,
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_2.y
    );
    this.criarPlataformaRachada(
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_3.x,
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_3.y
    );

    // 8. Platô de Chegada do Bloco 1 / Início do Checkpoint 1
    const platoBloco1 = this.plataformasEstaticas.create(
      BLOCO_1_LEVEL_DESIGN.PLATO_CHEGADA.x,
      BLOCO_1_LEVEL_DESIGN.PLATO_CHEGADA.y,
      'marmore-bloco'
    );
    platoBloco1
      .setScale(BLOCO_1_LEVEL_DESIGN.PLATO_CHEGADA.scaleX, BLOCO_1_LEVEL_DESIGN.PLATO_CHEGADA.scaleY)
      .refreshBody();

    // Obelisco marcador de Checkpoint 1
    const marcoCP1 = this.add.image(
      BLOCO_1_LEVEL_DESIGN.OBELISCO_CP1.x,
      BLOCO_1_LEVEL_DESIGN.OBELISCO_CP1.y,
      'coluna-marmore'
    );
    marcoCP1.setScale(
      BLOCO_1_LEVEL_DESIGN.OBELISCO_CP1.scaleX,
      BLOCO_1_LEVEL_DESIGN.OBELISCO_CP1.scaleY
    );
  }

  /**
   * BLOCO 2: Puzzles de Código + Primeiro Inimigo (x: 1600 a 3500).
   * - Inimigo Sentinela-Nuvem com cone de visão simples.
   * - Puzzle 1 (Totem condicional): ativa super vento se altar A e altar B estiverem ativos E jogador na zona.
   * - Puzzle 2 (Sentinela hackeável): debugging de operador de comparação alheio.
   */
  private construirBloco2_PuzzlesECodigo(_alturaMundo: number): void {
    // 1. Ilhas de aproximação ao primeiro inimigo
    const nuvemEntrada2 = this.nuvensSolidas.create(1940, 540, 'nuvem-solida');
    nuvemEntrada2.refreshBody();

    // 2. Sentinela 1 (Inimigo de patrulha fixa/curta com cone de visão vermelho)
    const s1 = SENTINELAS_FASE1.SENTINELA_1;
    this.criarSentinela(s1.x, s1.y, s1.minX, s1.maxX, s1.velocidade);

    // Plataforma abaixo da sentinela (passagem com timing)
    const platSobSentinela = this.plataformasEstaticas.create(2140, 590, 'marmore-bloco');
    platSobSentinela.refreshBody();

    // =========================================================================
    // PUZZLE 1: Super Coluna de Vento com Altares Condicionais (x: 2250 a 2750)
    // =========================================================================

    // Altar Alfa (Elevado na esquerda)
    const nuvemAltarA = this.nuvensSolidas.create(
      PUZZLE_1_FASE1.ALTAR_A_NUVEM.x,
      PUZZLE_1_FASE1.ALTAR_A_NUVEM.y,
      'nuvem-solida'
    );
    nuvemAltarA.setScale(PUZZLE_1_FASE1.ALTAR_A_NUVEM.scaleX, PUZZLE_1_FASE1.ALTAR_A_NUVEM.scaleY).refreshBody();
    this.spriteAltarA = this.add.sprite(
      PUZZLE_1_FASE1.ALTAR_A_SPRITE.x,
      PUZZLE_1_FASE1.ALTAR_A_SPRITE.y,
      'altar-runico'
    );

    // Zona de Decolagem e Totem Central
    const platoTotem1 = this.plataformasEstaticas.create(
      PUZZLE_1_FASE1.PLATO_TOTEM.x,
      PUZZLE_1_FASE1.PLATO_TOTEM.y,
      'marmore-bloco'
    );
    platoTotem1.setScale(PUZZLE_1_FASE1.PLATO_TOTEM.scaleX, PUZZLE_1_FASE1.PLATO_TOTEM.scaleY).refreshBody();

    this.totemCondicional = this.add.image(
      PUZZLE_1_FASE1.TOTEM.x,
      PUZZLE_1_FASE1.TOTEM.y,
      'totem-celestial'
    );

    this.promptCondicional = this.add.text(
      PUZZLE_1_FASE1.PROMPT.x,
      PUZZLE_1_FASE1.PROMPT.y,
      '[E] CONECTAR AO PAINEL CONDICIONAL',
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '12px',
        color: '#38bdf8',
        backgroundColor: '#090d16',
        padding: { x: 6, y: 3 },
      }
    );
    this.promptCondicional.setOrigin(0.5);
    this.promptCondicional.setVisible(false);

    // Marcação visual da Zona de Decolagem no piso
    this.zonaDecolagemBounds = new Phaser.Geom.Rectangle(
      PUZZLE_1_FASE1.ZONA_DECOLAGEM.x,
      PUZZLE_1_FASE1.ZONA_DECOLAGEM.y,
      PUZZLE_1_FASE1.ZONA_DECOLAGEM.largura,
      PUZZLE_1_FASE1.ZONA_DECOLAGEM.altura
    );
    this.graficoZonaDecolagem = this.add.graphics();
    this.desenharZonaDecolagem(false);

    // Altar Beta (Elevado na direita)
    const nuvemAltarB = this.nuvensSolidas.create(
      PUZZLE_1_FASE1.ALTAR_B_NUVEM.x,
      PUZZLE_1_FASE1.ALTAR_B_NUVEM.y,
      'nuvem-solida'
    );
    nuvemAltarB.setScale(PUZZLE_1_FASE1.ALTAR_B_NUVEM.scaleX, PUZZLE_1_FASE1.ALTAR_B_NUVEM.scaleY).refreshBody();
    this.spriteAltarB = this.add.sprite(
      PUZZLE_1_FASE1.ALTAR_B_SPRITE.x,
      PUZZLE_1_FASE1.ALTAR_B_SPRITE.y,
      'altar-runico'
    );

    // Super Coluna de Vento (Inicia desativada; ativada após o Puzzle 1)
    const sc = PUZZLE_1_FASE1.SUPER_COLUNA;
    this.superColunaVento = this.criarColunaVento(sc.x, sc.y, sc.largura, sc.altura, sc.forca, sc.ativa);

    // Platô elevado alcançado pela super coluna
    const platoElevado2 = this.plataformasEstaticas.create(
      PUZZLE_1_FASE1.PLATO_ELEVADO.x,
      PUZZLE_1_FASE1.PLATO_ELEVADO.y,
      'marmore-bloco'
    );
    platoElevado2.refreshBody();

    // =========================================================================
    // PUZZLE 2: Sentinela Hackeável (Sentinela B-02 com bug proposital no operador)
    // =========================================================================

    // Platô do Totem de Debug da Sentinela
    const platoTotem2 = this.plataformasEstaticas.create(
      PUZZLE_2_FASE1.PLATO_TOTEM.x,
      PUZZLE_2_FASE1.PLATO_TOTEM.y,
      'marmore-bloco'
    );
    platoTotem2.refreshBody();

    this.totemSentinela = this.add.image(
      PUZZLE_2_FASE1.TOTEM.x,
      PUZZLE_2_FASE1.TOTEM.y,
      'totem-celestial'
    );

    this.promptSentinela = this.add.text(
      PUZZLE_2_FASE1.PROMPT.x,
      PUZZLE_2_FASE1.PROMPT.y,
      '[E] ANALISAR CÓDIGO DA SENTINELA B-02',
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '12px',
        color: '#f59e0b',
        backgroundColor: '#090d16',
        padding: { x: 6, y: 3 },
      }
    );
    this.promptSentinela.setOrigin(0.5);
    this.promptSentinela.setVisible(false);

    // Sentinela B-02: Inicialmente bloqueia o corredor estreito de mármore (entre 3100 e 3280)
    const sb = SENTINELAS_FASE1.SENTINELA_B02;
    this.sentinelaHackeavel = this.criarSentinela(sb.x, sb.y, sb.minX, sb.maxX, sb.velocidade);

    // Corredor estreito de mármore vigiado
    const corredorMarmore = this.plataformasEstaticas.create(
      PUZZLE_2_FASE1.CORREDOR_MARMORE.x,
      PUZZLE_2_FASE1.CORREDOR_MARMORE.y,
      'marmore-bloco'
    );
    corredorMarmore.setScale(PUZZLE_2_FASE1.CORREDOR_MARMORE.scaleX, PUZZLE_2_FASE1.CORREDOR_MARMORE.scaleY).refreshBody();

    // Plataforma de Mármore Rachado na saída do corredor
    this.criarPlataformaRachada(
      PUZZLE_2_FASE1.MARMORE_RACHADO_SAIDA.x,
      PUZZLE_2_FASE1.MARMORE_RACHADO_SAIDA.y
    );

    // Platô de Chegada do Bloco 2 / Início do Checkpoint 2
    const platoBloco2 = this.plataformasEstaticas.create(
      PUZZLE_2_FASE1.PLATO_BLOCO_2.x,
      PUZZLE_2_FASE1.PLATO_BLOCO_2.y,
      'marmore-bloco'
    );
    platoBloco2.setScale(PUZZLE_2_FASE1.PLATO_BLOCO_2.scaleX, PUZZLE_2_FASE1.PLATO_BLOCO_2.scaleY).refreshBody();

    const marcoCP2 = this.add.image(
      PUZZLE_2_FASE1.OBELISCO_CP2.x,
      PUZZLE_2_FASE1.OBELISCO_CP2.y,
      'coluna-marmore'
    );
    marcoCP2.setScale(PUZZLE_2_FASE1.OBELISCO_CP2.scaleX, PUZZLE_2_FASE1.OBELISCO_CP2.scaleY);
  }

  /**
   * BLOCO 3: Combinação Final (Vento + Rachadura + Inimigo + Função com Parâmetros)
   * Termina na antecâmara de mármore intacto e dourado antes da próxima área.
   */
  private construirBloco3_EscadaEAntecamara(alturaMundo: number): void {
    // 1. Plataforma de apoio com mármore rachado inicial
    this.criarPlataformaRachada(
      PUZZLE_3_FASE1.MARMORE_RACHADO_INICIAL.x,
      PUZZLE_3_FASE1.MARMORE_RACHADO_INICIAL.y
    );

    // 2. Sentinela aérea que vigia a entrada da fenda de vento
    const s3 = SENTINELAS_FASE1.SENTINELA_3;
    this.criarSentinela(s3.x, s3.y, s3.minX, s3.maxX, s3.velocidade);

    // 3. Nuvem sólida intermediária com o Totem da Escada de Vento
    const nuvemTotem3 = this.nuvensSolidas.create(
      PUZZLE_3_FASE1.NUVEM_TOTEM.x,
      PUZZLE_3_FASE1.NUVEM_TOTEM.y,
      'nuvem-solida'
    );
    nuvemTotem3.refreshBody();

    this.totemRajada = this.add.image(
      PUZZLE_3_FASE1.TOTEM.x,
      PUZZLE_3_FASE1.TOTEM.y,
      'totem-celestial'
    );

    this.promptRajada = this.add.text(
      PUZZLE_3_FASE1.PROMPT.x,
      PUZZLE_3_FASE1.PROMPT.y,
      '[E] PROGRAMAR ESCADA DE RAJADAS',
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '12px',
        color: '#ec4899',
        backgroundColor: '#090d16',
        padding: { x: 6, y: 3 },
      }
    );
    this.promptRajada.setOrigin(0.5);
    this.promptRajada.setVisible(false);

    // =========================================================================
    // PUZZLE 3: Escada de 3 Rajadas Cronometradas (Função com parâmetros)
    // =========================================================================
    const e1 = PUZZLE_3_FASE1.COLUNA_ESCADA_1;
    const e2 = PUZZLE_3_FASE1.COLUNA_ESCADA_2;
    const e3 = PUZZLE_3_FASE1.COLUNA_ESCADA_3;
    const col1 = this.criarColunaVento(e1.x, e1.y, e1.largura, e1.altura, e1.forca, e1.ativa);
    const col2 = this.criarColunaVento(e2.x, e2.y, e2.largura, e2.altura, e2.forca, e2.ativa);
    const col3 = this.criarColunaVento(e3.x, e3.y, e3.largura, e3.altura, e3.forca, e3.ativa);
    this.colunasEscada = [col1, col2, col3];

    // Plataformas de mármore rachado suspensas entre as colunas
    this.criarPlataformaRachada(
      PUZZLE_3_FASE1.MARMORE_RACHADO_1.x,
      PUZZLE_3_FASE1.MARMORE_RACHADO_1.y
    );
    this.criarPlataformaRachada(
      PUZZLE_3_FASE1.MARMORE_RACHADO_2.x,
      PUZZLE_3_FASE1.MARMORE_RACHADO_2.y
    );

    // Nuvem de chegada pós-escada
    const nuvemPosEscada = this.nuvensSolidas.create(
      PUZZLE_3_FASE1.NUVEM_POS_ESCADA.x,
      PUZZLE_3_FASE1.NUVEM_POS_ESCADA.y,
      'nuvem-solida'
    );
    nuvemPosEscada.refreshBody();

    // =========================================================================
    // ANTECÂMARA FINAL: O SANTUÁRIO CELESTIAL (x: 4950 a 5400)
    // =========================================================================
    const chaoSantuario = this.plataformasEstaticas.create(
      SANTUARIO_FASE1.CHAO.x,
      alturaMundo - SANTUARIO_FASE1.CHAO.yOffset,
      'marmore-bloco'
    );
    chaoSantuario.setScale(SANTUARIO_FASE1.CHAO.scaleX, SANTUARIO_FASE1.CHAO.scaleY).refreshBody();

    // Fileira de Colunas Douradas Intactas e Solenes
    for (const xCol of SANTUARIO_FASE1.COLUNAS_DOURADAS_X) {
      this.add.image(xCol, alturaMundo - SANTUARIO_FASE1.COLUNAS_DOURADAS_Y_OFFSET, 'coluna-dourada').setDepth(2);
    }

    // Estandartes de luz celestial no santuário
    const luzSantuario = this.add.graphics();
    luzSantuario.fillStyle(0xfef08a, 0.18);
    luzSantuario.fillTriangle(5020, 0, 4940, 660, 5100, 660);
    luzSantuario.fillTriangle(5280, 0, 5180, 660, 5380, 660);

    // Portal de Conclusão / Transição
    this.portalFinal = this.add.sprite(
      SANTUARIO_FASE1.PORTAL.x,
      alturaMundo - SANTUARIO_FASE1.PORTAL.yOffset,
      'portal-santuario'
    );
    this.portalFinal.setDepth(3);

    this.tweens.add({
      targets: this.portalFinal,
      scaleX: 1.05,
      scaleY: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 1200,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Cria uma plataforma de mármore rachado dentro do grupo estático dedicado.
   */
  private criarPlataformaRachada(x: number, y: number): void {
    const sprite = this.grupoMarmoreRachado.create(
      x,
      y,
      'marmore-rachado'
    ) as Phaser.Physics.Arcade.Sprite;
    sprite.refreshBody();

    const platObj: PlataformaRachada = {
      sprite,
      rachando: false,
      quebrada: false,
      tempoRachando: 0,
      xOriginal: x,
      yOriginal: y,
    };

    this.plataformasRachadas.push(platObj);
  }

  /**
   * Trata o efeito de quebra progressiva (0.4s telegraph) e regeneração da plataforma rachada.
   */
  private tratarColisaoMarmoreRachado(sprite: Phaser.Physics.Arcade.Sprite): void {
    const corpo = this.jogador.body as Phaser.Physics.Arcade.Body | null;
    if (!corpo || (!corpo.blocked.down && !corpo.touching.down)) return;

    const platObj = this.plataformasRachadas.find(p => p.sprite === sprite);
    if (!platObj || platObj.rachando || platObj.quebrada) return;

    platObj.rachando = true;
    platObj.tempoRachando = this.time.now;
    sprite.setTint(JOGADOR_FASE1.TINT_RACHANDO); // Telegraph avermelhado claro

    this.time.delayedCall(MARMORE_RACHADO_FASE1.TEMPO_TELEGRAPH_MS, () => {
      platObj.quebrada = true;
      platObj.rachando = false;
      sprite.disableBody(true, true); // Some colisão e sprite

      // Regeneração amigável após 3 segundos
      this.time.delayedCall(MARMORE_RACHADO_FASE1.TEMPO_RESPAWN_MS, () => {
        platObj.quebrada = false;
        sprite.enableBody(true, platObj.xOriginal, platObj.yOriginal, true, true);
        sprite.clearTint();
        sprite.setAlpha(0);
        this.tweens.add({
          targets: sprite,
          alpha: 1,
          duration: MARMORE_RACHADO_FASE1.DURACAO_FADE_IN_MS,
        });
      });
    });
  }

  private criarColunaVento(
    x: number,
    y: number,
    largura: number,
    altura: number,
    forca: number,
    ativa: boolean
  ): ColunaVento {
    const grafico = this.add.graphics();
    grafico.setDepth(VENTO_FASE1.PROFUNDIDADE_GRAFICO);

    const particulas: { x: number; y: number; velY: number; alfa: number }[] = [];
    for (let i = 0; i < VENTO_FASE1.PARTICULAS_QUANTIDADE; i++) {
      particulas.push({
        x: Phaser.Math.Between(
          x - largura / 2 + VENTO_FASE1.PADDING_PARTICULAS_X,
          x + largura / 2 - VENTO_FASE1.PADDING_PARTICULAS_X
        ),
        y: Phaser.Math.Between(y - altura / 2, y + altura / 2),
        velY: Phaser.Math.Between(VENTO_FASE1.PARTICULAS_VEL_Y_MIN, VENTO_FASE1.PARTICULAS_VEL_Y_MAX),
        alfa: Phaser.Math.FloatBetween(VENTO_FASE1.PARTICULAS_ALFA_MIN, VENTO_FASE1.PARTICULAS_ALFA_MAX),
      });
    }

    const coluna: ColunaVento = {
      x,
      y,
      largura,
      altura,
      forca,
      ativa,
      grafico,
      particulas,
    };

    this.colunasVento.push(coluna);
    return coluna;
  }

  private criarSentinela(
    x: number,
    y: number,
    minX: number,
    maxX: number,
    velocidade: number
  ): SentinelaInimiga {
    const sprite = this.physics.add.sprite(x, y, 'sentinela-drone');
    (sprite.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (sprite.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    sprite.setDepth(SENTINELAS_FASE1.PROFUNDIDADE_SPRITE);

    const coneGrafico = this.add.graphics();
    coneGrafico.setDepth(SENTINELAS_FASE1.PROFUNDIDADE_CONE);

    const sentinela: SentinelaInimiga = {
      sprite,
      coneGrafico,
      xInicial: x,
      yInicial: y,
      minX,
      maxX,
      velocidade,
      direcao: 1,
      alcanceVisao: SENTINELAS_FASE1.ALCANCE_VISAO_PADRAO,
      aberturaCone: SENTINELAS_FASE1.ABERTURA_CONE_PADRAO,
      emAlerta: false,
      hackeada: false,
    };

    this.sentinelas.push(sentinela);
    return sentinela;
  }

  private configurarControles(): void {
    if (this.input?.keyboard) {
      this.cursores = this.input.keyboard.createCursorKeys();
      this.teclasWASD = {
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.teclaEspaco = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.teclaInteragir = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }
  }

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFase1);

    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      if (resultado.acao === 'ATIVAR_VENTO_CONDICIONAL') {
        this.executarAtivacaoVentoCondicional();
      } else if (resultado.acao === 'HACKEAR_SENTINELA') {
        this.executarHackSentinela();
      } else if (resultado.acao === 'ATIVAR_ESCADA_RAJADAS') {
        this.executarAtivacaoEscadaRajadas(resultado.valor);
      }
    });
  }

  private desenharZonaDecolagem(ativa: boolean): void {
    this.graficoZonaDecolagem.clear();
    const cor = ativa ? 0x10b981 : 0x0284c7;
    this.graficoZonaDecolagem.fillStyle(cor, 0.3);
    this.graficoZonaDecolagem.fillRect(
      this.zonaDecolagemBounds.x,
      this.zonaDecolagemBounds.y,
      this.zonaDecolagemBounds.width,
      this.zonaDecolagemBounds.height
    );
    this.graficoZonaDecolagem.lineStyle(2, cor, 0.9);
    this.graficoZonaDecolagem.strokeRect(
      this.zonaDecolagemBounds.x,
      this.zonaDecolagemBounds.y,
      this.zonaDecolagemBounds.width,
      this.zonaDecolagemBounds.height
    );
  }

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);

    if (!this.jogador || !this.jogador.body) return;

    const corpo = this.jogador.body as Phaser.Physics.Arcade.Body;

    // 1. Congelamento Seguro no Terminal e Diálogos (Correção do Problema 8)
    const emMenuOuDialogo = Boolean(this.terminal?.estaAberto || this.comunicador?.estaAtivo);
    if (emMenuOuDialogo) {
      this.jogador.setVelocity(0, 0);
      corpo.setAllowGravity(false);
      this.jogador.anims.play(`${this.tipoPersonagem}_idle`, true);
      return;
    }

    // Restaura a gravidade caso tenha sido desativada pelo terminal/diálogo (e a fase não tenha sido concluída)
    if (!this.faseConcluida && !corpo.allowGravity) {
      corpo.setAllowGravity(true);
    }

    // 2. Atualização e verificação de Checkpoint e Queda
    this.verificarLimitesECheckpoints();

    // 3. Movimentação, Coyote Time, Jump Buffer e Mecânica de Planar no Vento
    this.tratarMovimentoEPlanar(tempo);

    // 4. Atualização das plataformas de Mármore Rachado
    this.tratarPlataformasRachadas(tempo);

    // 5. Renderização e física das Colunas de Vento
    this.tratarColunasVento(delta);

    // 6. Patrulha e detecção das Sentinelas-Nuvem
    this.tratarSentinelas(tempo);

    // 7. Verificação dos Altares do Puzzle 1
    this.tratarAltaresEPuzzle1();

    // 8. Interação com os Totens
    this.tratarInteracaoTotens();

    // 9. Chegada ao Santuário Final
    this.verificarFinalizacaoFase();
  }

  /**
   * Mecânica de Plataforma: Pulo com Coyote Time / Jump Buffer + "planar no ar e correntes de vento".
   */
  private tratarMovimentoEPlanar(tempo: number): void {
    const corpo = this.jogador.body as Phaser.Physics.Arcade.Body | null;
    if (!corpo) return;

    const esquerda =
      (this.cursores?.left.isDown || this.teclasWASD?.a.isDown) ?? false;
    const direita =
      (this.cursores?.right.isDown || this.teclasWASD?.d.isDown) ?? false;
    const puloSegurado =
      (this.cursores?.up.isDown ||
        this.teclasWASD?.w.isDown ||
        this.teclaEspaco?.isDown) ??
      false;

    const puloApertadoAgora =
      (this.cursores?.up && Phaser.Input.Keyboard.JustDown(this.cursores.up)) ||
      (this.teclasWASD?.w && Phaser.Input.Keyboard.JustDown(this.teclasWASD.w)) ||
      (this.teclaEspaco && Phaser.Input.Keyboard.JustDown(this.teclaEspaco));

    const noChao = corpo.blocked.down || corpo.touching.down;

    // Atualiza temporizador de contato com o chão para Coyote Time
    if (noChao) {
      this.tempoUltimaVezNoChao = tempo;
    }

    // Registra buffer de pulo quando a tecla for pressionada
    if (puloApertadoAgora) {
      this.tempoUltimoPressionarPulo = tempo;
    }

    // Verificação de presença em Coluna de Vento Ativa
    let dentroDeColunaAtiva = false;
    let forcaVentoAtual = 0;

    for (const col of this.colunasVento) {
      if (!col.ativa) continue;

      const metadeL = col.largura / 2;
      const metadeA = col.altura / 2;
      const dentroX =
        this.jogador.x >= col.x - metadeL && this.jogador.x <= col.x + metadeL;
      const dentroY =
        this.jogador.y >= col.y - metadeA && this.jogador.y <= col.y + metadeA;

      if (dentroX && dentroY) {
        dentroDeColunaAtiva = true;
        forcaVentoAtual = col.forca;
        break;
      }
    }

    // --- Movimentação Lateral com Empurrão de Vento ---
    let velX = 0;
    if (esquerda) {
      velX = -JOGADOR_FASE1.VELOCIDADE_X;
      this.jogador.setFlipX(true);
    } else if (direita) {
      velX = JOGADOR_FASE1.VELOCIDADE_X;
      this.jogador.setFlipX(false);
    }

    // Força contínua de arraste para a esquerda dentro do fluxo de vento
    if (dentroDeColunaAtiva) {
      velX -= VENTO_FASE1.FORCA_VENTO_LATERAL;
    }

    this.jogador.setVelocityX(velX);

    // --- Pulo com Coyote Time e Jump Buffer ---
    const podePularCoyote = (tempo - this.tempoUltimaVezNoChao) <= JOGADOR_FASE1.TEMPO_COYOTE_MS;
    const bufferPuloAtivo = (tempo - this.tempoUltimoPressionarPulo) <= JOGADOR_FASE1.TEMPO_JUMP_BUFFER_MS;

    if (bufferPuloAtivo && podePularCoyote) {
      this.jogador.setVelocityY(JOGADOR_FASE1.VELOCIDADE_PULO);
      // Consome o buffer e o coyote time
      this.tempoUltimoPressionarPulo = -9999;
      this.tempoUltimaVezNoChao = -9999;
    }

    // --- Mecânica de Vento e Planar Vertical ---
    let modoPlaneioAtivo = false;

    if (dentroDeColunaAtiva) {
      if (puloSegurado) {
        // Segurando pulo no vento: jato vertical ascensional eleva o jogador
        this.jogador.setVelocityY(-forcaVentoAtual);
        modoPlaneioAtivo = true;
      } else {
        // Sem segurar pulo no vento: não catapulta! Apenas leve sustentação/amortecimento se estiver caindo
        if (corpo.velocity.y > 0) {
          this.jogador.setVelocityY(
            Math.max(0, corpo.velocity.y - VENTO_FASE1.SUSTENTACAO_PASSIVA_DELTA)
          );
        }
      }
    } else if (!noChao && puloSegurado) {
      // Fora do vento mas no ar segurando pulo: Mecânica de Planar suave com velocidade de descida controlada
      if (corpo.velocity.y > JOGADOR_FASE1.VELOCIDADE_MAX_PLANAR) {
        this.jogador.setVelocityY(JOGADOR_FASE1.VELOCIDADE_MAX_PLANAR);
      }
      modoPlaneioAtivo = true;
    }

    // Feedback visual do modo de planeio ou sustentação
    if (modoPlaneioAtivo || dentroDeColunaAtiva) {
      this.jogador.setTint(JOGADOR_FASE1.TINT_VENTO);
    } else {
      this.jogador.clearTint();
    }

    // Máquina de animações
    if (!noChao) {
      this.jogador.anims.play(`${this.tipoPersonagem}_jump`, true);
    } else if (esquerda || direita) {
      this.jogador.anims.play(`${this.tipoPersonagem}_run`, true);
    } else {
      this.jogador.anims.play(`${this.tipoPersonagem}_idle`, true);
    }
  }

  private tratarPlataformasRachadas(tempo: number): void {
    for (const plat of this.plataformasRachadas) {
      if (plat.rachando && !plat.quebrada) {
        const tremor = Math.sin(tempo * MARMORE_RACHADO_FASE1.TREMOR_VELOCIDADE) * MARMORE_RACHADO_FASE1.TREMOR_AMPLITUDE;
        plat.sprite.setX(plat.xOriginal + tremor);
      }
    }
  }

  private tratarColunasVento(delta: number): void {
    if (this.escadaRajadasAtiva && this.colunasEscada.length === 3) {
      this.tempoCicloEscada += delta;
      const periodo = Math.max(200, this.atrasoEscadaSegundos * 1000);
      const faseAtual = Math.floor((this.tempoCicloEscada % (periodo * 3)) / periodo);

      this.colunasEscada[0].ativa = faseAtual === 0;
      this.colunasEscada[1].ativa = faseAtual === 1;
      this.colunasEscada[2].ativa = faseAtual === 2;
    }

    for (const col of this.colunasVento) {
      col.grafico.clear();
      if (!col.ativa) continue;

      const metadeL = col.largura / 2;
      const metadeA = col.altura / 2;

      // Coluna translúcida ciano/branca
      col.grafico.fillStyle(VENTO_FASE1.COR_FUNDO_COLUNA, VENTO_FASE1.ALFA_FUNDO_COLUNA);
      col.grafico.fillRect(col.x - metadeL, col.y - metadeA, col.largura, col.altura);

      col.grafico.lineStyle(
        VENTO_FASE1.ESPESSURA_BORDA_COLUNA,
        VENTO_FASE1.COR_BORDA_COLUNA,
        VENTO_FASE1.ALFA_BORDA_COLUNA
      );
      col.grafico.strokeRect(col.x - metadeL, col.y - metadeA, col.largura, col.altura);

      // Partículas ascendentes
      col.grafico.fillStyle(0xffffff, 0.9);
      for (const p of col.particulas) {
        p.y -= (p.velY * delta) / 1000;
        if (p.y < col.y - metadeA) {
          p.y = col.y + metadeA;
          p.x = Phaser.Math.Between(
            col.x - metadeL + VENTO_FASE1.PADDING_PARTICULAS_X,
            col.x + metadeL - VENTO_FASE1.PADDING_PARTICULAS_X
          );
        }
        col.grafico.fillRect(p.x, p.y, VENTO_FASE1.LARGURA_PARTICULA, VENTO_FASE1.ALTURA_PARTICULA);
      }
    }
  }

  private tratarSentinelas(tempo: number): void {
    for (const s of this.sentinelas) {
      s.coneGrafico.clear();

      if (!s.hackeada) {
        s.sprite.x += s.direcao * s.velocidade * (1 / 60);

        if (s.sprite.x >= s.maxX) {
          s.sprite.x = s.maxX;
          s.direcao = -1;
          s.sprite.setFlipX(true);
        } else if (s.sprite.x <= s.minX) {
          s.sprite.x = s.minX;
          s.direcao = 1;
          s.sprite.setFlipX(false);
        }
      } else {
        if (s.sprite.x < SENTINELAS_FASE1.HACKEADA_LIMITE_X) {
          s.sprite.x += SENTINELAS_FASE1.HACKEADA_VELOCIDADE * (1 / 60);
          s.sprite.setFlipX(false);
          s.direcao = 1;
        }
      }

      s.sprite.y = s.yInicial + Math.sin(tempo * SENTINELAS_FASE1.OSCILACAO_Y_VEL) * SENTINELAS_FASE1.OSCILACAO_Y_AMP;

      const anguloBase = s.direcao === 1 ? 0 : 180;
      const pontaX = s.sprite.x + s.direcao * SENTINELAS_FASE1.OFFSET_PONTA_CONE_X;
      const pontaY = s.sprite.y;

      const dist = s.alcanceVisao;
      const rad1 = Phaser.Math.DegToRad(anguloBase - s.aberturaCone / 2);
      const rad2 = Phaser.Math.DegToRad(anguloBase + s.aberturaCone / 2);

      const p1x = pontaX + Math.cos(rad1) * dist;
      const p1y = pontaY + Math.sin(rad1) * dist;
      const p2x = pontaX + Math.cos(rad2) * dist;
      const p2y = pontaY + Math.sin(rad2) * dist;

      const corCone = s.hackeada ? SENTINELAS_FASE1.COR_CONE_HACKEADA : SENTINELAS_FASE1.COR_CONE_ALERTA;
      s.coneGrafico.fillStyle(corCone, SENTINELAS_FASE1.ALFA_CONE_FUNDO);
      s.coneGrafico.fillTriangle(pontaX, pontaY, p1x, p1y, p2x, p2y);

      s.coneGrafico.lineStyle(1.5, corCone, SENTINELAS_FASE1.ALFA_CONE_BORDA);
      s.coneGrafico.strokeTriangle(pontaX, pontaY, p1x, p1y, p2x, p2y);

      // Verificação de detecção somente se estiver dentro da distância máxima
      if (!s.hackeada && !this.faseConcluida) {
        const distAoDrone = Phaser.Math.Distance.Between(
          this.jogador.x,
          this.jogador.y,
          s.sprite.x,
          s.sprite.y
        );

        if (distAoDrone <= s.alcanceVisao) {
          const dentroDoCone = this.verificarPontoNoTriangulo(
            this.jogador.x,
            this.jogador.y,
            pontaX,
            pontaY,
            p1x,
            p1y,
            p2x,
            p2y
          );

          if (dentroDoCone) {
            this.dispararAlarmeSentinela(s);
            break;
          }
        }
      }
    }
  }

  private dispararAlarmeSentinela(sentinela: SentinelaInimiga): void {
    sentinela.emAlerta = true;

    const laser = this.add.graphics();
    laser.lineStyle(3, 0xff0055, 1);
    laser.lineBetween(sentinela.sprite.x, sentinela.sprite.y, this.jogador.x, this.jogador.y);

    this.cameras.main.flash(200, 255, 100, 100);

    this.time.delayedCall(160, () => {
      laser.destroy();
      sentinela.emAlerta = false;
      this.respawnNoCheckpoint('SENTINELA DISPAROU: DETECTADO NO ESPAÇO AÉREO!');
    });
  }

  private verificarPontoNoTriangulo(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ): boolean {
    const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
    const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
    const temNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const temPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(temNeg && temPos);
  }

  private tratarAltaresEPuzzle1(): void {
    const distA = Phaser.Math.Distance.Between(
      this.jogador.x,
      this.jogador.y,
      this.spriteAltarA.x,
      this.spriteAltarA.y
    );
    if (distA < PUZZLE_1_FASE1.DISTANCIA_ATIVACAO_ALTAR && !this.altarAAtivo) {
      this.altarAAtivo = true;
      this.spriteAltarA.setTexture('altar-runico-on');
      this.mostrarNotificacaoCurta('ALTAR ALFA ATIVADO [altar_a = True]');
    }

    const distB = Phaser.Math.Distance.Between(
      this.jogador.x,
      this.jogador.y,
      this.spriteAltarB.x,
      this.spriteAltarB.y
    );
    if (distB < PUZZLE_1_FASE1.DISTANCIA_ATIVACAO_ALTAR && !this.altarBAtivo) {
      this.altarBAtivo = true;
      this.spriteAltarB.setTexture('altar-runico-on');
      this.mostrarNotificacaoCurta('ALTAR BETA ATIVADO [altar_b = True]');
    }

    const naZona =
      this.jogador.x >= this.zonaDecolagemBounds.x &&
      this.jogador.x <= this.zonaDecolagemBounds.x + this.zonaDecolagemBounds.width &&
      this.jogador.y >= this.zonaDecolagemBounds.y - PUZZLE_1_FASE1.ZONA_TOLERANCIA_Y &&
      this.jogador.y <= this.zonaDecolagemBounds.y + PUZZLE_1_FASE1.ZONA_TOLERANCIA_Y;

    this.desenharZonaDecolagem(naZona);
  }

  private tratarInteracaoTotens(): void {
    // Totem 1: Condicionais (x: 2480)
    const distT1 = Phaser.Math.Distance.Between(
      this.jogador.x,
      this.jogador.y,
      this.totemCondicional.x,
      this.totemCondicional.y
    );
    const pertoT1 = distT1 < PUZZLE_1_FASE1.DISTANCIA_INTERACAO_TOTEM && !this.superColunaVento?.ativa;
    this.promptCondicional.setVisible(pertoT1);

    if (pertoT1 && this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir)) {
      this.abrirTerminalTotem1();
      return;
    }

    // Totem 2: Sentinela Debug (x: 2960)
    const distT2 = Phaser.Math.Distance.Between(
      this.jogador.x,
      this.jogador.y,
      this.totemSentinela.x,
      this.totemSentinela.y
    );
    const pertoT2 = distT2 < PUZZLE_2_FASE1.DISTANCIA_INTERACAO_TOTEM && !this.sentinelaHackeada;
    this.promptSentinela.setVisible(pertoT2);

    if (pertoT2 && this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir)) {
      this.abrirTerminalTotem2();
      return;
    }

    // Totem 3: Escada de Rajadas (x: 4100) - permite recalibração contínua
    const distT3 = Phaser.Math.Distance.Between(
      this.jogador.x,
      this.jogador.y,
      this.totemRajada.x,
      this.totemRajada.y
    );
    const pertoT3 = distT3 < PUZZLE_3_FASE1.DISTANCIA_INTERACAO_TOTEM;
    this.promptRajada.setVisible(pertoT3);
    if (pertoT3) {
      this.promptRajada.setText(
        this.escadaRajadasAtiva
          ? '[E] RECALIBRAR ESCADA DE RAJADAS'
          : '[E] PROGRAMAR ESCADA DE RAJADAS'
      );
    }

    if (pertoT3 && this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir)) {
      this.abrirTerminalTotem3();
      return;
    }
  }

  private abrirTerminalTotem1(): void {
    this.jogador.setVelocityX(0);

    const naZona =
      this.jogador.x >= this.zonaDecolagemBounds.x &&
      this.jogador.x <= this.zonaDecolagemBounds.x + this.zonaDecolagemBounds.width;

    this.terminal.definirContexto({
      totemAtivo: 'totem_condicional',
      altarA: this.altarAAtivo,
      altarB: this.altarBAtivo,
      naZona,
    });

    this.terminal.abrir({
      titulo: 'PAINEL EÓLICO CENTRAL // PUZZLE 1: CONDICIONAL',
      linhasIniciais: [
        '=== CONTROLE DE PRESSÃO ATMOSFÉRICA ===',
        `> TELEMETRIA ATUAL:`,
        `>   altar_a = ${this.altarAAtivo ? 'True' : 'False'}`,
        `>   altar_b = ${this.altarBAtivo ? 'True' : 'False'}`,
        `>   na_zona = ${naZona ? 'True' : 'False'}`,
        '> DIRETRIZ: Acione a super corrente apenas quando ambos os altares estiverem ligados E você estiver na zona demarcada.',
        "> INSTRUÇÃO: if altar_a and altar_b and na_zona: ativar_vento()",
        '> Digite o código condicional:',
      ],
    });
  }

  private abrirTerminalTotem2(): void {
    this.jogador.setVelocityX(0);

    this.terminal.definirContexto({
      totemAtivo: 'totem_sentinela',
    });

    this.terminal.abrir({
      titulo: 'TERMINAL DE MANUTENÇÃO // SENTINELA B-02 (DEBUG)',
      linhasIniciais: [
        '=== SCRIPT DE VIGILÂNCIA DA SENTINELA ===',
        '# CÓDIGO COM BUG LOCALIZADO:',
        'while True:',
        '    # Bug: operador faz a sentinela virar muito cedo e vigiar o corredor!',
        '    if sentinela.x < limite_direita:',
        '        sentinela.virar_esquerda()',
        '    else:',
        '        sentinela.avancar()',
        '-------------------------------------------------------',
        '> OBJETIVO: Corrija o operador relacional para que a sentinela ultrapasse o corredor.',
        '> Digite a linha corrigida (ex: if sentinela.x >= limite_direita: sentinela.virar_esquerda()):',
      ],
    });
  }

  private abrirTerminalTotem3(): void {
    this.jogador.setVelocityX(0);

    this.terminal.definirContexto({
      totemAtivo: 'totem_rajada',
    });

    this.terminal.abrir({
      titulo: 'GERADOR DE FLUXO EM ESCADA // PUZZLE 3: FUNÇÃO COM PARÂMETROS',
      linhasIniciais: [
        '=== ESPECIFICAÇÃO DA ESCADA DE VENTO ===',
        `> CALIBRAÇÃO ATUAL: altura=${this.alturaEscadaPixels}px | atraso=${this.atrasoEscadaSegundos}s`,
        '> FUNÇÃO DISPONÍVEL: programar_rajada(altura, atraso)',
        '> PARÂMETROS OBRIGATÓRIOS:',
        '>   - altura (pixels): elevação vertical gerada pelas rajadas (ex: 450)',
        '>   - atraso (segundos): intervalo rítmico entre as 3 colunas (ideal: 1.5)',
        '-------------------------------------------------------',
        '> A física do jogo responderá EXATAMENTE aos valores submetidos.',
        '> Digite a chamada da função:',
      ],
    });
  }

  private executarAtivacaoVentoCondicional(): void {
    if (this.superColunaVento) {
      this.superColunaVento.ativa = true;
    }

    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      this.cameras.main.shake(300, 0.005);
      this.mostrarNotificacaoCurta('SUPER CORRENTE DE VENTO ATIVADA!');
    });
  }

  private executarHackSentinela(): void {
    this.sentinelaHackeada = true;
    if (this.sentinelaHackeavel) {
      this.sentinelaHackeavel.hackeada = true;
    }

    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      this.mostrarNotificacaoCurta('SENTINELA REDIRECIONADA // CAMINHO LIVRE!');
    });
  }

  private executarAtivacaoEscadaRajadas(valor?: unknown): void {
    let altura = 430;
    let atraso = 1.5;

    if (typeof valor === 'object' && valor !== null) {
      const v = valor as { altura?: number; atraso?: number };
      if (typeof v.altura === 'number' && !isNaN(v.altura)) altura = v.altura;
      if (typeof v.atraso === 'number' && !isNaN(v.atraso)) atraso = v.atraso;
    } else if (typeof valor === 'string') {
      try {
        const v = JSON.parse(valor);
        if (v.altura) altura = Number(v.altura);
        if (v.atraso) atraso = Number(v.atraso);
      } catch {}
    } else if (typeof valor === 'number' && !isNaN(valor)) {
      altura = valor;
    }

    this.alturaEscadaPixels = altura;
    this.atrasoEscadaSegundos = atraso;

    // Conecta diretamente a força vertical das colunas à altura programada
    for (const col of this.colunasEscada) {
      col.forca = altura;
    }

    this.escadaRajadasAtiva = true;
    this.tempoCicloEscada = 0;

    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      const msg =
        altura < 400
          ? `ESCADA CALIBRADA (${altura}px, ${atraso}s) - AVISO: VENTO MUITO FRACO!`
          : `ESCADA DE RAJADAS ATIVADA // ALTURA: ${altura}px | INTERVALO: ${atraso}s`;
      this.mostrarNotificacaoCurta(msg);
    });
  }

  private verificarLimitesECheckpoints(): void {
    if (
      this.jogador.x >= CHECKPOINTS_FASE1.GATILHO_CP1_X &&
      this.checkpointAtual.x < CHECKPOINTS_FASE1.GATILHO_CP1_X
    ) {
      this.checkpointAtual = {
        x: CHECKPOINTS_FASE1.PONTO_CP1.x,
        y: CHECKPOINTS_FASE1.PONTO_CP1.y,
      };
      this.exibirAnimacaoCheckpoint('CHECKPOINT 1 REGISTRADO // SETOR CENTRAL');
    } else if (
      this.jogador.x >= CHECKPOINTS_FASE1.GATILHO_CP2_X &&
      this.checkpointAtual.x < CHECKPOINTS_FASE1.GATILHO_CP2_X
    ) {
      this.checkpointAtual = {
        x: CHECKPOINTS_FASE1.PONTO_CP2.x,
        y: CHECKPOINTS_FASE1.PONTO_CP2.y,
      };
      this.exibirAnimacaoCheckpoint('CHECKPOINT 2 REGISTRADO // FENDA FINAL');
    }

    // Queda no abismo
    if (this.jogador.y > CHECKPOINTS_FASE1.LIMITE_QUEDA_Y) {
      this.respawnNoCheckpoint('QUEDA NO ABISMO DO CÉU!');
    }
  }

  private respawnNoCheckpoint(motivo: string): void {
    this.jogador.setVelocity(0, 0);
    this.cameras.main.flash(200, 255, 255, 255);

    this.jogador.setPosition(this.checkpointAtual.x, this.checkpointAtual.y);
    this.mostrarNotificacaoCurta(motivo);
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

    const distPortal = Phaser.Math.Distance.Between(
      this.jogador.x,
      this.jogador.y,
      this.portalFinal.x,
      this.portalFinal.y
    );

    if (distPortal < SANTUARIO_FASE1.DISTANCIA_PORTAL) {
      this.faseConcluida = true;
      this.jogador.setVelocity(0, 0);
      (this.jogador.body as Phaser.Physics.Arcade.Body).allowGravity = false;

      this.tweens.add({
        targets: this.jogador,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          this.concluirFaseAtual();

          this.comunicador.iniciarDialogo(
            [
              {
                falante: '> CANAL REBELDE // TRANSMISSÃO CELESTIAL',
                texto:
                  'Excelente trabalho, Hacker! Você dominou o planar aerodinâmico, depurou a sentinela e sincronizou as funções parametrizadas.',
              },
              {
                falante: '> CANAL REBELDE // TRANSMISSÃO CELESTIAL',
                texto:
                  'O Setor 1: Céu Partido foi liberado com maestria. Pressione ENTER para retornar vitorioso ao Hub!',
              },
            ],
            () => {
              this.retornarAoHub();
            }
          );
        },
      });
    }
  }
}
