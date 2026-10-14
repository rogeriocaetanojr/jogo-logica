import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import { GerenciadorEstado, type TipoPersonagem } from '../../nucleo/GerenciadorEstado';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase1 } from './InterpretadorFase1';
import type {
  ColunaVento,
  SentinelaInimiga,
  PlataformaRachada,
  PilarMovel,
} from './tiposFase1';
import {
  MUNDO_FASE1,
  CAMERA_FASE1,
  JOGADOR_FASE1,
  VENTO_FASE1,
  MARMORE_RACHADO_FASE1,
  SENTINELAS_FASE1,
  CHECKPOINTS_FASE1,
  DISTANCIA_INTERACAO_TOTEM_PADRAO,
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_DDA,
  TOTEM_4_PORTAO,
  TOTEM_5_SEQUENCIADOR,
  TOTEM_6_ARQUITETO,
  SANTUARIO_FASE1,
  BLOCO_1_LEVEL_DESIGN,
} from './constantesFase1';

/**
 * CenaFase1: Céu Partido (Onda 2 Expandida).
 * Implementa todos os 6 desafios lógicos com humor sarcástico / ácido,
 * sem entregar as respostas prontas no terminal, integrando física Arcade e estética luminosa Stitch.
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

  // =========================================================================
  // OS 6 TOTENS E ESTADOS DOS PUZZLES (ONDA 2 EXPANDIDA)
  // =========================================================================

  // Puzzle 1: "O Teste de Alcoolemia da Sentinela" (not / and)
  private totem1!: Phaser.GameObjects.Image;
  private promptTotem1!: Phaser.GameObjects.Text;
  private totem1Resolvido: boolean = false;
  private sentinela1?: SentinelaInimiga;
  private barreiraEscudoSentinela?: Phaser.Physics.Arcade.Sprite;
  private graficoEscudo?: Phaser.GameObjects.Graphics;

  // Puzzle 2: "A Balança Hipócrita de Nuvens" (if/elif/else com altitude)
  private totem2!: Phaser.GameObjects.Image;
  private promptTotem2!: Phaser.GameObjects.Text;
  private totem2Resolvido: boolean = false;
  private elevadorNuvem!: Phaser.Physics.Arcade.Sprite;

  // Puzzle 3: "A Sentinela com DDA" (Debug de Limite de Patrulha / Loop)
  private totem3!: Phaser.GameObjects.Image;
  private promptTotem3!: Phaser.GameObjects.Text;
  private totem3Resolvido: boolean = false;
  private sentinelaB02?: SentinelaInimiga;

  // Puzzle 4: "O Portão com Crise Existencial" (Precedência (A or B) and C)
  private totem4!: Phaser.GameObjects.Image;
  private promptTotem4!: Phaser.GameObjects.Text;
  private totem4Resolvido: boolean = false;
  private portaoMilenar!: Phaser.Physics.Arcade.Sprite;
  private colisorPortao?: Phaser.Physics.Arcade.Collider;

  // Puzzle 5: "O Sequenciador de Rajadas" (Parâmetros de Ritmo e Força)
  private totem5!: Phaser.GameObjects.Image;
  private promptTotem5!: Phaser.GameObjects.Text;
  private totem5Resolvido: boolean = false;
  private colunasEscada: ColunaVento[] = [];
  private tempoCicloEscada: number = 0;
  private intervaloEscadaSegundos: number = 1.5;
  private forcaEscadaPixels: number = 450;
  private escadaRajadasAtiva: boolean = false;

  // Puzzle 6: "O Desafio do Arquiteto Preguiçoso" (Filtro for com if)
  private totem6!: Phaser.GameObjects.Image;
  private promptTotem6!: Phaser.GameObjects.Text;
  private totem6Resolvido: boolean = false;
  private pilaresMoveis: PilarMovel[] = [];
  private grupoPilares!: Phaser.Physics.Arcade.StaticGroup;

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
    this.grupoPilares = this.physics.add.staticGroup();

    // 6. Jogador (CRÍTICO: criado antes de registrar colisores para não causar erro de objeto indefinido)
    this.criarJogador();

    // 7. Construção dos 3 Blocos de Level Design com os 6 Puzzles
    this.construirBloco1_Introducao(alturaMundo);
    this.construirBloco2_PuzzlesECodigo(alturaMundo);
    this.construirBloco3_EscadaEAntecamara(alturaMundo);

    // 8. Colisões com o Jogador
    this.physics.add.collider(this.jogador, this.plataformasEstaticas);
    this.physics.add.collider(this.jogador, this.nuvensSolidas);
    this.physics.add.collider(this.jogador, this.grupoPilares);
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
          'Utilize as correntes de vento verticais para planar segurando o pulo. Cuidado com o mármore rachado e os totens de controle!',
      },
    ]);
  }

  /**
   * Gera todas as texturas procedurais com alta fidelidade visual à paleta do Stitch.
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
      // Brilho tênue âmbar saindo das fendas
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

    // 7. Inimigo: Sentinela-Nuvem (Drone com olho vermelho)
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

    // 8. Portão Milenar
    if (!this.textures.exists('portao-milenar')) {
      const g = this.make.graphics();
      const w = 40;
      const h = 200;
      g.fillStyle(0x0f172a, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0x38bdf8, 0.4);
      g.fillRect(4, 4, w - 8, h - 8);
      g.fillStyle(0xf59e0b, 1);
      g.fillRect(0, 0, w, 8);
      g.fillRect(0, h - 8, w, 8);
      g.lineStyle(2, 0x38bdf8, 0.9);
      g.beginPath();
      g.moveTo(w / 2, 20);
      g.lineTo(w / 2, h - 20);
      g.strokePath();
      g.generateTexture('portao-milenar', w, h);
      g.destroy();
    }

    // 9. Placa Rúnica de Sinalização
    if (!this.textures.exists('placa-runica')) {
      const g = this.make.graphics();
      const w = 150;
      const h = 34;
      g.fillStyle(0x1e293b, 0.92);
      g.fillRoundedRect(0, 0, w, h, 6);
      g.lineStyle(2, 0xfbbf24, 0.85);
      g.strokeRoundedRect(0, 0, w, h, 6);
      g.generateTexture('placa-runica', w, h);
      g.destroy();
    }

    // 10. Portal do Santuário
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

    // Camada 1: Névoa e nuvens distantes
    const nuvensDistantes = this.add.graphics();
    nuvensDistantes.setDepth(-8);
    nuvensDistantes.fillStyle(0xf5d0fe, 0.45);
    for (let x = 40; x < larguraMundo; x += 360) {
      nuvensDistantes.fillEllipse(x, 460, 280, 110);
      nuvensDistantes.fillEllipse(x + 120, 420, 220, 90);
    }
    nuvensDistantes.setScrollFactor(0.15, 0.1);

    // Camada 2: Ruínas celestiais e arcos de mármore
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

    // Camada 3: Nuvens médias bem iluminadas
    const nuvensMedias = this.add.graphics();
    nuvensMedias.setDepth(-4);
    nuvensMedias.fillStyle(0xffffff, 0.65);
    for (let x = 80; x < larguraMundo; x += 440) {
      nuvensMedias.fillCircle(x, 540, 60);
      nuvensMedias.fillCircle(x + 50, 520, 80);
    }
    nuvensMedias.setScrollFactor(0.55, 0.3);
  }

  /**
   * Inicializa a sprite física do Jogador com Hitbox ajustada e spritesheet real.
   */
  private criarJogador(): void {
    const estado = GerenciadorEstado.obterInstancia();
    this.tipoPersonagem = estado.obterPersonagem();
    const chave = `${this.tipoPersonagem}_idle`;

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
   * BLOCO 1: Introdução ao Ar (x: 0 a 1800).
   * Plataformas de nuvem + mármore rachado intercaladas, 2 colunas de vento para ensinar o planar.
   */
  private construirBloco1_Introducao(_alturaMundo: number): void {
    // Chão inicial de mármore sólido
    const cfgChao = BLOCO_1_LEVEL_DESIGN.CHAO_INICIAL;
    const chaoInicial = this.plataformasEstaticas.create(cfgChao.x, cfgChao.y, 'marmore-bloco');
    chaoInicial.setScale(cfgChao.scaleX, cfgChao.scaleY).refreshBody();

    // Colunas decorativas na entrada
    for (const pos of BLOCO_1_LEVEL_DESIGN.COLUNAS_DECORATIVAS) {
      this.add.image(pos.x, pos.y, 'coluna-marmore').setDepth(2);
    }

    // Primeira Nuvem Sólida
    const nuvem1 = this.nuvensSolidas.create(
      BLOCO_1_LEVEL_DESIGN.NUVEM_1.x,
      BLOCO_1_LEVEL_DESIGN.NUVEM_1.y,
      'nuvem-solida'
    );
    nuvem1.refreshBody();

    // Coluna de Vento 1
    const c1 = VENTO_FASE1.COLUNA_1;
    this.criarColunaVento(c1.x, c1.y, c1.largura, c1.altura, c1.forca, c1.ativa);

    // Mármore Rachado 1
    this.criarPlataformaRachada(
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_1.x,
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_1.y
    );

    // Segunda Nuvem Sólida
    const nuvem2 = this.nuvensSolidas.create(
      BLOCO_1_LEVEL_DESIGN.NUVEM_2.x,
      BLOCO_1_LEVEL_DESIGN.NUVEM_2.y,
      'nuvem-solida'
    );
    nuvem2.refreshBody();

    // Coluna de Vento 2
    const c2 = VENTO_FASE1.COLUNA_2;
    this.criarColunaVento(c2.x, c2.y, c2.largura, c2.altura, c2.forca, c2.ativa);

    // Sequência de Mármore Rachado 2 e 3
    this.criarPlataformaRachada(
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_2.x,
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_2.y
    );
    this.criarPlataformaRachada(
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_3.x,
      BLOCO_1_LEVEL_DESIGN.MARMORE_RACHADO_3.y
    );

    // Platô de Chegada do Bloco 1 / Início do Checkpoint 1
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
   * BLOCO 2: Puzzles 1, 2 e 3 (x: 1800 a 3600).
   * - Totem 1: Teste de Alcoolemia da Sentinela (not / and)
   * - Totem 2: Balança Hipócrita de Nuvens (if/elif/else altitude 350)
   * - Totem 3: Sentinela com DDA (patrulha limite 2300)
   */
  private construirBloco2_PuzzlesECodigo(_alturaMundo: number): void {
    // =========================================================================
    // PUZZLE 1: Totem 1 - "O Teste de Alcoolemia da Sentinela" (x: 1880, y: 480)
    // =========================================================================
    const platoTotem1 = this.plataformasEstaticas.create(1880, 540, 'marmore-bloco');
    platoTotem1.setScale(1.2, 1.0).refreshBody();

    this.totem1 = this.add.image(TOTEM_1_ALCOOLEMIA.X, TOTEM_1_ALCOOLEMIA.Y, 'totem-celestial');

    this.promptTotem1 = this.criarPromptTexto(
      TOTEM_1_ALCOOLEMIA.X,
      TOTEM_1_ALCOOLEMIA.Y - 50,
      '[E] CONECTAR AO TESTE DE ALCOOLEMIA'
    );

    // Sentinela A-01 e Barreira de Escudo
    const s1 = SENTINELAS_FASE1.SENTINELA_1;
    this.sentinela1 = this.criarSentinela(s1.x, s1.y, s1.minX, s1.maxX, s1.velocidade);
    this.sentinela1.escudoAtivo = true;

    // Barreira física do escudo que bloqueia a passagem até ser desativada
    this.barreiraEscudoSentinela = this.physics.add.sprite(2160, 430, 'marmore-bloco');
    this.barreiraEscudoSentinela.setVisible(false);
    this.barreiraEscudoSentinela.setScale(0.2, 3.5);
    this.barreiraEscudoSentinela.setImmovable(true);
    (this.barreiraEscudoSentinela.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.physics.add.collider(this.jogador, this.barreiraEscudoSentinela);

    // Gráfico de energia do escudo
    this.graficoEscudo = this.add.graphics();
    this.graficoEscudo.setDepth(8);

    // Plataforma abaixo da Sentinela A-01
    const platSobSentinela = this.plataformasEstaticas.create(2140, 590, 'marmore-bloco');
    platSobSentinela.refreshBody();

    // =========================================================================
    // PUZZLE 2: Totem 2 - "A Balança Hipócrita de Nuvens" (x: 2480, y: 534)
    // =========================================================================
    const platoTotem2 = this.plataformasEstaticas.create(2480, 590, 'marmore-bloco');
    platoTotem2.refreshBody();

    this.totem2 = this.add.image(TOTEM_2_BALANCA.X, TOTEM_2_BALANCA.Y, 'totem-celestial');

    this.promptTotem2 = this.criarPromptTexto(
      TOTEM_2_BALANCA.X,
      TOTEM_2_BALANCA.Y - 50,
      '[E] AJUSTAR BALANÇA DE NUVENS'
    );

    // Placa informativa de altitude no cenário
    this.add.image(TOTEM_2_BALANCA.X + 65, TOTEM_2_BALANCA.Y - 45, 'placa-runica').setDepth(2);
    this.add
      .text(TOTEM_2_BALANCA.X + 65, TOTEM_2_BALANCA.Y - 45, 'ALTITUDE ALVO: 350', {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '11px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
      .setDepth(3);

    // Elevador de mármore/nuvem que inicia descalibrado em y: 540 e sobe para y: 350
    this.elevadorNuvem = this.physics.add.sprite(
      TOTEM_2_BALANCA.ELEVADOR_X,
      TOTEM_2_BALANCA.ELEVADOR_Y_INICIAL,
      'nuvem-solida'
    );
    this.elevadorNuvem.setImmovable(true);
    (this.elevadorNuvem.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.physics.add.collider(this.jogador, this.elevadorNuvem);

    // Platô elevado de recepção após o elevador
    const platoAposElevador = this.plataformasEstaticas.create(2820, 390, 'marmore-bloco');
    platoAposElevador.setScale(1.2, 1.0).refreshBody();

    // =========================================================================
    // PUZZLE 3: Totem 3 - "A Sentinela com DDA" (x: 3000, y: 414)
    // =========================================================================
    const platoTotem3 = this.plataformasEstaticas.create(3000, 470, 'marmore-bloco');
    platoTotem3.refreshBody();

    this.totem3 = this.add.image(TOTEM_3_DDA.X, TOTEM_3_DDA.Y, 'totem-celestial');

    this.promptTotem3 = this.criarPromptTexto(
      TOTEM_3_DDA.X,
      TOTEM_3_DDA.Y - 50,
      '[E] CORRIGIR ALCANCE DA SENTINELA'
    );

    // Placa com o limite gravado
    this.add.image(TOTEM_3_DDA.X + 65, TOTEM_3_DDA.Y - 45, 'placa-runica').setDepth(2);
    this.add
      .text(TOTEM_3_DDA.X + 65, TOTEM_3_DDA.Y - 45, 'LIMITE = 2300', {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '11px',
        color: '#38bdf8',
      })
      .setOrigin(0.5)
      .setDepth(3);

    // Sentinela B-02 com loop curto bloqueando o corredor
    const sb = SENTINELAS_FASE1.SENTINELA_B02;
    this.sentinelaB02 = this.criarSentinela(sb.x, sb.y, sb.minX, sb.maxX, sb.velocidade);

    // Corredor estreito vigiado
    const corredorMarmore = this.plataformasEstaticas.create(3200, 450, 'marmore-bloco');
    corredorMarmore.setScale(1.6, 1.0).refreshBody();

    // Mármore rachado na saída do corredor
    this.criarPlataformaRachada(3420, 440);

    // Platô de Chegada do Bloco 2 / Checkpoint 2
    const platoBloco2 = this.plataformasEstaticas.create(3600, 470, 'marmore-bloco');
    platoBloco2.setScale(1.4, 1.2).refreshBody();

    const marcoCP2 = this.add.image(3560, 390, 'coluna-marmore');
    marcoCP2.setScale(0.8, 0.6);
  }

  /**
   * BLOCO 3: Puzzles 4, 5 e 6 + Santuário Final (x: 3600 a 5400).
   * - Totem 4: Portão com Crise Existencial (precedência)
   * - Totem 5: Sequenciador de Rajadas (função parametrizada e física)
   * - Totem 6: Desafio do Arquiteto Preguiçoso (for com filtro)
   * - Santuário Celestial com Portal
   */
  private construirBloco3_EscadaEAntecamara(alturaMundo: number): void {
    // =========================================================================
    // PUZZLE 4: Totem 4 - "O Portão com Crise Existencial" (x: 3620, y: 450)
    // =========================================================================
    this.totem4 = this.add.image(TOTEM_4_PORTAO.X, TOTEM_4_PORTAO.Y, 'totem-celestial');

    this.promptTotem4 = this.criarPromptTexto(
      TOTEM_4_PORTAO.X,
      TOTEM_4_PORTAO.Y - 50,
      '[E] CONECTAR AO PORTÃO MILENAR'
    );

    // Portão Milenar sólido bloqueando a passagem para o terceiro bloco
    this.portaoMilenar = this.physics.add.sprite(
      TOTEM_4_PORTAO.X_PORTAO,
      TOTEM_4_PORTAO.Y_PORTAO,
      'portao-milenar'
    );
    this.portaoMilenar.setImmovable(true);
    (this.portaoMilenar.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.colisorPortao = this.physics.add.collider(this.jogador, this.portaoMilenar);

    // =========================================================================
    // PUZZLE 5: Totem 5 - "O Sequenciador de Rajadas" (x: 4100, y: 434)
    // =========================================================================
    // Nuvem de apoio do Totem 5
    const nuvemTotem5 = this.nuvensSolidas.create(4100, 490, 'nuvem-solida');
    nuvemTotem5.refreshBody();

    this.totem5 = this.add.image(TOTEM_5_SEQUENCIADOR.X, TOTEM_5_SEQUENCIADOR.Y, 'totem-celestial');

    this.promptTotem5 = this.criarPromptTexto(
      TOTEM_5_SEQUENCIADOR.X,
      TOTEM_5_SEQUENCIADOR.Y - 50,
      '[E] SINCRONIZAR ESCADA DE RAJADAS'
    );

    // As 3 Colunas de Vento em Escada (iniciam inativas aguardando calibração)
    const e1 = TOTEM_5_SEQUENCIADOR.COLUNA_ESCADA_1;
    const e2 = TOTEM_5_SEQUENCIADOR.COLUNA_ESCADA_2;
    const e3 = TOTEM_5_SEQUENCIADOR.COLUNA_ESCADA_3;
    const col1 = this.criarColunaVento(e1.x, e1.y, e1.largura, e1.altura, e1.forca, e1.ativa);
    const col2 = this.criarColunaVento(e2.x, e2.y, e2.largura, e2.altura, e2.forca, e2.ativa);
    const col3 = this.criarColunaVento(e3.x, e3.y, e3.largura, e3.altura, e3.forca, e3.ativa);
    this.colunasEscada = [col1, col2, col3];

    // Plataformas de mármore rachado intercaladas na escada
    this.criarPlataformaRachada(4350, 420);
    this.criarPlataformaRachada(4530, 360);

    // Platô de saída pós-escada de vento
    const platoAposEscada = this.plataformasEstaticas.create(4760, 340, 'marmore-bloco');
    platoAposEscada.setScale(1.2, 1.0).refreshBody();

    // =========================================================================
    // PUZZLE 6: Totem 6 - "O Desafio do Arquiteto Preguiçoso" (x: 4860, y: 270)
    // =========================================================================
    const platoTotem6 = this.plataformasEstaticas.create(4860, 330, 'marmore-bloco');
    platoTotem6.setScale(0.8, 1.0).refreshBody();

    this.totem6 = this.add.image(TOTEM_6_ARQUITETO.X, TOTEM_6_ARQUITETO.Y, 'totem-celestial');

    this.promptTotem6 = this.criarPromptTexto(
      TOTEM_6_ARQUITETO.X,
      TOTEM_6_ARQUITETO.Y - 50,
      '[E] INSPECIONAR PILARES DA ANTECÂMARA'
    );

    // Os 4 Pilares móveis da antecâmara
    this.pilaresMoveis = [];
    for (const cfg of TOTEM_6_ARQUITETO.PILARES_CONFIG) {
      const texture = cfg.rachado ? 'marmore-rachado' : 'marmore-bloco';
      const sprite = this.grupoPilares.create(cfg.x, cfg.y, texture) as Phaser.Physics.Arcade.Sprite;
      sprite.setScale(0.35, 1.0).refreshBody();

      if (cfg.rachado) {
        sprite.setTint(0xfca5a5); // Tonalidade avermelhada avisando rachadura estrutural
      }

      this.pilaresMoveis.push({
        id: cfg.id,
        sprite,
        rachado: cfg.rachado,
        recolhido: false,
        yOriginal: cfg.y,
      });
    }

    // =========================================================================
    // ANTECÂMARA FINAL: O SANTUÁRIO CELESTIAL (x: 5200 a 5400)
    // =========================================================================
    const chaoSantuario = this.plataformasEstaticas.create(
      SANTUARIO_FASE1.CHAO.x,
      alturaMundo - SANTUARIO_FASE1.CHAO.yOffset,
      'marmore-bloco'
    );
    chaoSantuario.setScale(SANTUARIO_FASE1.CHAO.scaleX, SANTUARIO_FASE1.CHAO.scaleY).refreshBody();

    // Colunas Douradas Intactas
    for (const xCol of SANTUARIO_FASE1.COLUNAS_DOURADAS_X) {
      this.add.image(xCol, alturaMundo - SANTUARIO_FASE1.COLUNAS_DOURADAS_Y_OFFSET, 'coluna-dourada').setDepth(2);
    }

    // Feixes de luz celestial
    const luzSantuario = this.add.graphics();
    luzSantuario.fillStyle(0xfef08a, 0.18);
    luzSantuario.fillTriangle(5020, 0, 4940, 660, 5100, 660);
    luzSantuario.fillTriangle(5280, 0, 5180, 660, 5380, 660);

    // Portal Final
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
   * Helper para criação de textos de prompt de interação com totens.
   */
  private criarPromptTexto(x: number, y: number, texto: string): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, texto, {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '11px',
      color: '#38bdf8',
      backgroundColor: '#090d16',
      padding: { x: 6, y: 3 },
    });
    t.setOrigin(0.5);
    t.setVisible(false);
    t.setDepth(90);
    return t;
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
   * Instancia uma entidade de coluna de vento com física e partículas ascendentes.
   */
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
    const qtd = VENTO_FASE1.PARTICULAS_QUANTIDADE;

    for (let i = 0; i < qtd; i++) {
      particulas.push({
        x: x - largura / 2 + VENTO_FASE1.PADDING_PARTICULAS_X + Math.random() * (largura - VENTO_FASE1.PADDING_PARTICULAS_X * 2),
        y: y - altura / 2 + Math.random() * altura,
        velY: VENTO_FASE1.PARTICULAS_VEL_Y_MIN + Math.random() * (VENTO_FASE1.PARTICULAS_VEL_Y_MAX - VENTO_FASE1.PARTICULAS_VEL_Y_MIN),
        alfa: VENTO_FASE1.PARTICULAS_ALFA_MIN + Math.random() * (VENTO_FASE1.PARTICULAS_ALFA_MAX - VENTO_FASE1.PARTICULAS_ALFA_MIN),
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

  /**
   * Instancia um drone sentinela inimigo.
   */
  private criarSentinela(
    x: number,
    y: number,
    minX: number,
    maxX: number,
    velocidade: number
  ): SentinelaInimiga {
    const sprite = this.physics.add.sprite(x, y, 'sentinela-drone');
    sprite.setDepth(SENTINELAS_FASE1.PROFUNDIDADE_SPRITE);
    (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    sprite.setVelocityX(velocidade);

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

  /**
   * Conecta o terminal ao interpretador da Fase 1 e vincula todas as ações aos puzzles.
   */
  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFase1);

    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      if (resultado.acao === 'DESATIVAR_ESCUDO_SENTINELA') {
        this.executarDesativarEscudoSentinela();
      } else if (resultado.acao === 'ESTABILIZAR_ELEVADOR') {
        this.executarEstabilizarElevador();
      } else if (resultado.acao === 'EXPANDIR_PATRULHA_SENTINELA') {
        this.executarExpandirPatrulhaSentinela();
      } else if (resultado.acao === 'ABRIR_PORTAO_EXISTENCIAL') {
        this.executarAbrirPortaoExistencial();
      } else if (resultado.acao === 'ATIVAR_ESCADA_RAJADAS') {
        this.executarAtivacaoEscadaRajadas(resultado.valor);
      } else if (resultado.acao === 'RECOLHER_PILARES_RACHADOS') {
        this.executarRecolherPilaresRachados();
      }
    });
  }

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);

    if (!this.jogador || !this.jogador.body) return;

    const corpo = this.jogador.body as Phaser.Physics.Arcade.Body;

    // 1. Congelamento Seguro no Terminal e Diálogos
    const emMenuOuDialogo = Boolean(this.terminal?.estaAberto || this.comunicador?.estaAtivo);
    if (emMenuOuDialogo) {
      this.jogador.setVelocity(0, 0);
      corpo.setAllowGravity(false);
      this.jogador.anims.play(`${this.tipoPersonagem}_idle`, true);
      return;
    }

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

    // 6. Ciclo e física da Escada de Rajadas (Puzzle 5)
    this.tratarCicloEscadaRajadas(delta);

    // 7. Renderização do Escudo da Sentinela A-01 (Puzzle 1)
    this.tratarEscudoSentinela1(tempo);

    // 8. Patrulha e detecção das Sentinelas
    this.tratarSentinelas(tempo);

    // 9. Interação com os 6 Totens
    this.tratarInteracaoTotens();

    // 10. Chegada ao Santuário Final
    this.verificarFinalizacaoFase();
  }

  /**
   * Mecânica de Plataforma: Pulo com Coyote Time / Jump Buffer + planar no ar e correntes de vento.
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

    if (noChao) {
      this.tempoUltimaVezNoChao = tempo;
    }

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

    if (dentroDeColunaAtiva) {
      velX -= VENTO_FASE1.FORCA_VENTO_LATERAL;
    }

    this.jogador.setVelocityX(velX);

    // --- Pulo com Coyote Time e Jump Buffer ---
    const podePularCoyote = (tempo - this.tempoUltimaVezNoChao) <= JOGADOR_FASE1.TEMPO_COYOTE_MS;
    const bufferPuloAtivo = (tempo - this.tempoUltimoPressionarPulo) <= JOGADOR_FASE1.TEMPO_JUMP_BUFFER_MS;

    if (bufferPuloAtivo && podePularCoyote) {
      this.jogador.setVelocityY(JOGADOR_FASE1.VELOCIDADE_PULO);
      this.tempoUltimoPressionarPulo = -9999;
      this.tempoUltimaVezNoChao = -9999;
    }

    // --- Mecânica de Vento e Planar Vertical ---
    let modoPlaneioAtivo = false;

    if (dentroDeColunaAtiva) {
      if (puloSegurado) {
        this.jogador.setVelocityY(-forcaVentoAtual);
        modoPlaneioAtivo = true;
      } else {
        if (corpo.velocity.y > 0) {
          this.jogador.setVelocityY(
            Math.max(0, corpo.velocity.y - VENTO_FASE1.SUSTENTACAO_PASSIVA_DELTA)
          );
        }
      }
    } else {
      // Planar Livre no ar fora de jatos
      if (!noChao && puloSegurado && corpo.velocity.y > 0) {
        this.jogador.setVelocityY(
          Math.min(corpo.velocity.y, JOGADOR_FASE1.VELOCIDADE_MAX_PLANAR)
        );
        modoPlaneioAtivo = true;
      }
    }

    // Tint visual e animação do personagem
    if (modoPlaneioAtivo) {
      this.jogador.setTint(JOGADOR_FASE1.TINT_VENTO);
    } else {
      this.jogador.clearTint();
    }

    if (noChao) {
      if (velX !== 0) {
        this.jogador.anims.play(`${this.tipoPersonagem}_run`, true);
      } else {
        this.jogador.anims.play(`${this.tipoPersonagem}_idle`, true);
      }
    } else {
      this.jogador.anims.play(`${this.tipoPersonagem}_jump`, true);
    }
  }

  /**
   * Ciclo dinâmico das 3 colunas de vento da escada (Puzzle 5).
   */
  private tratarCicloEscadaRajadas(delta: number): void {
    if (!this.escadaRajadasAtiva || this.colunasEscada.length === 0) return;

    this.tempoCicloEscada += delta;
    const periodoMs = this.intervaloEscadaSegundos * 1000;
    const tempoTotalCiclo = periodoMs * 3;
    const tempoNoCiclo = this.tempoCicloEscada % tempoTotalCiclo;
    const colunaAtivaIndex = Math.floor(tempoNoCiclo / periodoMs);

    for (let i = 0; i < this.colunasEscada.length; i++) {
      this.colunasEscada[i].ativa = i === colunaAtivaIndex;
    }
  }

  /**
   * Renderização gráfica pulsante do escudo da Sentinela A-01 (Puzzle 1).
   */
  private tratarEscudoSentinela1(tempo: number): void {
    if (!this.graficoEscudo) return;

    if (this.totem1Resolvido) {
      this.graficoEscudo.clear();
      return;
    }

    this.graficoEscudo.clear();
    const alfaOscilante = 0.5 + Math.sin(tempo * 0.006) * 0.25;

    // Barreira vertical reluzente
    this.graficoEscudo.fillStyle(0x0284c7, alfaOscilante * 0.35);
    this.graficoEscudo.fillRect(2150, 330, 20, 200);

    this.graficoEscudo.lineStyle(2, 0x38bdf8, alfaOscilante);
    this.graficoEscudo.strokeRect(2150, 330, 20, 200);

    // Linhas de energia eólica
    this.graficoEscudo.lineStyle(1.5, 0xa5f3fc, 0.8);
    const deslocamentoY = (tempo * 0.1) % 40;
    for (let y = 340 + deslocamentoY; y < 520; y += 40) {
      this.graficoEscudo.lineBetween(2152, y, 2168, y);
    }
  }

  /**
   * Gerenciamento de quebra e respawn das plataformas de mármore rachado.
   */
  private tratarPlataformasRachadas(tempo: number): void {
    for (const plat of this.plataformasRachadas) {
      if (plat.rachando && !plat.quebrada) {
        plat.sprite.x =
          plat.xOriginal +
          Math.sin(tempo * MARMORE_RACHADO_FASE1.TREMOR_VELOCIDADE) *
            MARMORE_RACHADO_FASE1.TREMOR_AMPLITUDE;

        if (tempo - plat.tempoRachando > MARMORE_RACHADO_FASE1.TEMPO_TELEGRAPH_MS) {
          plat.quebrada = true;
          plat.rachando = false;
          plat.sprite.x = plat.xOriginal;
          plat.sprite.setVisible(false);
          plat.sprite.disableBody(true, true);

          this.time.delayedCall(MARMORE_RACHADO_FASE1.TEMPO_RESPAWN_MS, () => {
            plat.quebrada = false;
            plat.sprite.setVisible(true);
            plat.sprite.enableBody(false, plat.xOriginal, plat.yOriginal, true, true);
            plat.sprite.setAlpha(0);
            this.tweens.add({
              targets: plat.sprite,
              alpha: 1,
              duration: MARMORE_RACHADO_FASE1.DURACAO_FADE_IN_MS,
            });
          });
        }
      }
    }
  }

  private tratarColisaoMarmoreRachado(sprite: Phaser.Physics.Arcade.Sprite): void {
    const plat = this.plataformasRachadas.find((p) => p.sprite === sprite);
    if (plat && !plat.rachando && !plat.quebrada) {
      plat.rachando = true;
      plat.tempoRachando = this.time.now;
      plat.sprite.setTint(JOGADOR_FASE1.TINT_RACHANDO);
    }
  }

  /**
   * Renderização e física de partículas ascendentes em todas as colunas de vento ativas.
   */
  private tratarColunasVento(delta: number): void {
    const dt = delta / 1000;

    for (const col of this.colunasVento) {
      col.grafico.clear();
      if (!col.ativa) continue;

      const metadeL = col.largura / 2;
      const metadeA = col.altura / 2;
      const topoY = col.y - metadeA;
      const baseColY = col.y + metadeA;

      col.grafico.fillStyle(VENTO_FASE1.COR_FUNDO_COLUNA, VENTO_FASE1.ALFA_FUNDO_COLUNA);
      col.grafico.fillRect(col.x - metadeL, topoY, col.largura, col.altura);

      col.grafico.lineStyle(
        VENTO_FASE1.ESPESSURA_BORDA_COLUNA,
        VENTO_FASE1.COR_BORDA_COLUNA,
        VENTO_FASE1.ALFA_BORDA_COLUNA
      );
      col.grafico.lineBetween(col.x - metadeL, topoY, col.x - metadeL, baseColY);
      col.grafico.lineBetween(col.x + metadeL, topoY, col.x + metadeL, baseColY);

      col.grafico.fillStyle(0xffffff, 0.7);
      for (const p of col.particulas) {
        p.y -= p.velY * dt;
        if (p.y < topoY) {
          p.y = baseColY;
          p.x =
            col.x -
            metadeL +
            VENTO_FASE1.PADDING_PARTICULAS_X +
            Math.random() * (col.largura - VENTO_FASE1.PADDING_PARTICULAS_X * 2);
        }
        col.grafico.fillRect(
          p.x,
          p.y,
          VENTO_FASE1.LARGURA_PARTICULA,
          VENTO_FASE1.ALTURA_PARTICULA
        );
      }
    }
  }

  /**
   * Patrulha e detecção óptica das Sentinelas com cone de visão triangular.
   */
  private tratarSentinelas(tempo: number): void {
    for (const s of this.sentinelas) {
      s.coneGrafico.clear();

      if (!s.hackeada) {
        if (s.sprite.x >= s.maxX) {
          s.sprite.setVelocityX(-s.velocidade);
          s.direcao = -1;
        } else if (s.sprite.x <= s.minX) {
          s.sprite.setVelocityX(s.velocidade);
          s.direcao = 1;
        }
      }

      s.sprite.y =
        s.yInicial +
        Math.sin(tempo * SENTINELAS_FASE1.OSCILACAO_Y_VEL) *
          SENTINELAS_FASE1.OSCILACAO_Y_AMP;

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

      const corCone = s.hackeada
        ? SENTINELAS_FASE1.COR_CONE_HACKEADA
        : SENTINELAS_FASE1.COR_CONE_ALERTA;
      s.coneGrafico.fillStyle(corCone, SENTINELAS_FASE1.ALFA_CONE_FUNDO);
      s.coneGrafico.fillTriangle(pontaX, pontaY, p1x, p1y, p2x, p2y);

      s.coneGrafico.lineStyle(1.5, corCone, SENTINELAS_FASE1.ALFA_CONE_BORDA);
      s.coneGrafico.strokeTriangle(pontaX, pontaY, p1x, p1y, p2x, p2y);

      // Detecção do jogador no cone de alerta
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

  /**
   * Monitoramento de proximidade e acionamento dos 6 Totens de controle.
   */
  private tratarInteracaoTotens(): void {
    const interagirApertado =
      this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir);

    // Totem 1: "O Teste de Alcoolemia da Sentinela" (x: 1880)
    const distT1 = Phaser.Math.Distance.Between(this.jogador.x, this.jogador.y, this.totem1.x, this.totem1.y);
    const pertoT1 = distT1 < DISTANCIA_INTERACAO_TOTEM_PADRAO && !this.totem1Resolvido;
    this.promptTotem1.setVisible(pertoT1);
    if (pertoT1 && interagirApertado) {
      this.abrirTerminalTotem({
        ID: TOTEM_1_ALCOOLEMIA.ID,
        TITULO: TOTEM_1_ALCOOLEMIA.TITULO,
        DIALOGO_INICIAL: TOTEM_1_ALCOOLEMIA.DIALOGO_INICIAL,
        VARIAVEIS_DISPONIVEIS: TOTEM_1_ALCOOLEMIA.VARIAVEIS_DISPONIVEIS,
        FUNCOES_DISPONIVEIS: TOTEM_1_ALCOOLEMIA.FUNCOES_DISPONIVEIS,
      });
      return;
    }

    // Totem 2: "A Balança Hipócrita de Nuvens" (x: 2480)
    const distT2 = Phaser.Math.Distance.Between(this.jogador.x, this.jogador.y, this.totem2.x, this.totem2.y);
    const pertoT2 = distT2 < DISTANCIA_INTERACAO_TOTEM_PADRAO && !this.totem2Resolvido;
    this.promptTotem2.setVisible(pertoT2);
    if (pertoT2 && interagirApertado) {
      this.abrirTerminalTotem({
        ID: TOTEM_2_BALANCA.ID,
        TITULO: TOTEM_2_BALANCA.TITULO,
        DIALOGO_INICIAL: TOTEM_2_BALANCA.DIALOGO_INICIAL,
        VARIAVEIS_DISPONIVEIS: TOTEM_2_BALANCA.VARIAVEIS_DISPONIVEIS,
        FUNCOES_DISPONIVEIS: TOTEM_2_BALANCA.FUNCOES_DISPONIVEIS,
      });
      return;
    }

    // Totem 3: "A Sentinela com DDA" (x: 3000)
    const distT3 = Phaser.Math.Distance.Between(this.jogador.x, this.jogador.y, this.totem3.x, this.totem3.y);
    const pertoT3 = distT3 < DISTANCIA_INTERACAO_TOTEM_PADRAO && !this.totem3Resolvido;
    this.promptTotem3.setVisible(pertoT3);
    if (pertoT3 && interagirApertado) {
      this.abrirTerminalTotem({
        ID: TOTEM_3_DDA.ID,
        TITULO: TOTEM_3_DDA.TITULO,
        DIALOGO_INICIAL: TOTEM_3_DDA.DIALOGO_INICIAL,
        VARIAVEIS_DISPONIVEIS: TOTEM_3_DDA.VARIAVEIS_DISPONIVEIS,
        FUNCOES_DISPONIVEIS: TOTEM_3_DDA.FUNCOES_DISPONIVEIS,
      });
      return;
    }

    // Totem 4: "O Portão com Crise Existencial" (x: 3620)
    const distT4 = Phaser.Math.Distance.Between(this.jogador.x, this.jogador.y, this.totem4.x, this.totem4.y);
    const pertoT4 = distT4 < DISTANCIA_INTERACAO_TOTEM_PADRAO && !this.totem4Resolvido;
    this.promptTotem4.setVisible(pertoT4);
    if (pertoT4 && interagirApertado) {
      this.abrirTerminalTotem({
        ID: TOTEM_4_PORTAO.ID,
        TITULO: TOTEM_4_PORTAO.TITULO,
        DIALOGO_INICIAL: TOTEM_4_PORTAO.DIALOGO_INICIAL,
        VARIAVEIS_DISPONIVEIS: TOTEM_4_PORTAO.VARIAVEIS_DISPONIVEIS,
        FUNCOES_DISPONIVEIS: TOTEM_4_PORTAO.FUNCOES_DISPONIVEIS,
      });
      return;
    }

    // Totem 5: "O Sequenciador de Rajadas" (x: 4100) - permite reconfiguração contínua
    const distT5 = Phaser.Math.Distance.Between(this.jogador.x, this.jogador.y, this.totem5.x, this.totem5.y);
    const pertoT5 = distT5 < DISTANCIA_INTERACAO_TOTEM_PADRAO;
    this.promptTotem5.setVisible(pertoT5);
    if (pertoT5) {
      this.promptTotem5.setText(
        this.totem5Resolvido
          ? '[E] RECALIBRAR ESCADA DE RAJADAS'
          : '[E] SINCRONIZAR ESCADA DE RAJADAS'
      );
    }
    if (pertoT5 && interagirApertado) {
      this.abrirTerminalTotem({
        ID: TOTEM_5_SEQUENCIADOR.ID,
        TITULO: TOTEM_5_SEQUENCIADOR.TITULO,
        DIALOGO_INICIAL: TOTEM_5_SEQUENCIADOR.DIALOGO_INICIAL,
        VARIAVEIS_DISPONIVEIS: TOTEM_5_SEQUENCIADOR.VARIAVEIS_DISPONIVEIS,
        FUNCOES_DISPONIVEIS: TOTEM_5_SEQUENCIADOR.FUNCOES_DISPONIVEIS,
      });
      return;
    }

    // Totem 6: "O Desafio do Arquiteto Preguiçoso" (x: 4860)
    const distT6 = Phaser.Math.Distance.Between(this.jogador.x, this.jogador.y, this.totem6.x, this.totem6.y);
    const pertoT6 = distT6 < DISTANCIA_INTERACAO_TOTEM_PADRAO && !this.totem6Resolvido;
    this.promptTotem6.setVisible(pertoT6);
    if (pertoT6 && interagirApertado) {
      this.abrirTerminalTotem({
        ID: TOTEM_6_ARQUITETO.ID,
        TITULO: TOTEM_6_ARQUITETO.TITULO,
        DIALOGO_INICIAL: TOTEM_6_ARQUITETO.DIALOGO_INICIAL,
        VARIAVEIS_DISPONIVEIS: TOTEM_6_ARQUITETO.VARIAVEIS_DISPONIVEIS,
        FUNCOES_DISPONIVEIS: TOTEM_6_ARQUITETO.FUNCOES_DISPONIVEIS,
      });
      return;
    }
  }

  /**
   * Abre o terminal formatado para o puzzle correspondente sem entregar código pronto.
   * Apresenta o diálogo de humor sarcástico, lista variáveis/sensores e funções, e aguarda entrada do jogador.
   */
  private abrirTerminalTotem(config: {
    ID: string;
    TITULO: string;
    DIALOGO_INICIAL: string;
    VARIAVEIS_DISPONIVEIS: readonly string[];
    FUNCOES_DISPONIVEIS: readonly string[];
  }): void {
    this.jogador.setVelocity(0, 0);

    this.terminal.definirContexto({
      totemAtivo: config.ID,
    });

    const linhasIniciais: string[] = [
      `=== ${config.TITULO} ===`,
      '',
      `"${config.DIALOGO_INICIAL}"`,
      '',
      '-------------------------------------------------------',
      'SENSORES / VARIÁVEIS DISPONÍVEIS:',
      ...config.VARIAVEIS_DISPONIVEIS.map((v) => `  > ${v}`),
      '',
      'FUNÇÕES DISPONÍVEIS:',
      ...config.FUNCOES_DISPONIVEIS.map((f) => `  > ${f}`),
      '-------------------------------------------------------',
      '> Digite sua lógica em Python:',
    ];

    this.terminal.abrir({
      titulo: config.TITULO,
      linhasIniciais,
    });
  }

  // =========================================================================
  // EXECUÇÃO DAS AÇÕES DOS 6 PUZZLES
  // =========================================================================

  private executarDesativarEscudoSentinela(): void {
    this.totem1Resolvido = true;
    if (this.sentinela1) {
      this.sentinela1.escudoAtivo = false;
    }

    if (this.barreiraEscudoSentinela) {
      this.barreiraEscudoSentinela.destroy();
    }

    if (this.graficoEscudo) {
      this.tweens.add({
        targets: this.graficoEscudo,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.graficoEscudo?.clear();
        },
      });
    }

    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      this.cameras.main.flash(200, 255, 255, 255);
      this.mostrarNotificacaoCurta('ESCUDO DESATIVADO // CORREDOR LIVRE!');
    });
  }

  private executarEstabilizarElevador(): void {
    this.totem2Resolvido = true;

    this.tweens.add({
      targets: this.elevadorNuvem,
      y: TOTEM_2_BALANCA.ALTITUDE_ALVO,
      duration: 1600,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        (this.elevadorNuvem.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
      },
    });

    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      this.cameras.main.shake(250, 0.004);
      this.mostrarNotificacaoCurta('ELEVADOR ALINHADO NA ALTITUDE 350!');
    });
  }

  private executarExpandirPatrulhaSentinela(): void {
    this.totem3Resolvido = true;

    if (this.sentinelaB02) {
      this.sentinelaB02.minX = TOTEM_3_DDA.LIMITE_PLACA;
      this.sentinelaB02.maxX = 3300;
      this.sentinelaB02.direcao = -1;
      this.sentinelaB02.sprite.setVelocityX(-this.sentinelaB02.velocidade);
    }

    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      this.mostrarNotificacaoCurta('SENTINELA B-02 // ALCANCE EXPANDIDO ATÉ 2300!');
    });
  }

  private executarAbrirPortaoExistencial(): void {
    this.totem4Resolvido = true;

    if (this.colisorPortao) {
      this.colisorPortao.destroy();
    }

    this.tweens.add({
      targets: this.portaoMilenar,
      y: TOTEM_4_PORTAO.Y_PORTAO + 160,
      alpha: 0.15,
      duration: 1400,
      ease: 'Quad.easeInOut',
    });

    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      this.cameras.main.shake(300, 0.005);
      this.mostrarNotificacaoCurta('PORTÃO MILENAR ABERTO // BLOCO 3 LIBERADO!');
    });
  }

  private executarAtivacaoEscadaRajadas(valor?: unknown): void {
    this.totem5Resolvido = true;

    if (typeof valor === 'object' && valor !== null) {
      const v = valor as { ordem?: string; intervalo?: number; forca?: number };
      if (typeof v.intervalo === 'number' && !isNaN(v.intervalo)) {
        this.intervaloEscadaSegundos = v.intervalo;
      }
      if (typeof v.forca === 'number' && !isNaN(v.forca)) {
        this.forcaEscadaPixels = v.forca;
      }
    }

    for (const col of this.colunasEscada) {
      col.forca = this.forcaEscadaPixels;
    }

    this.escadaRajadasAtiva = true;
    this.tempoCicloEscada = 0;

    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      this.mostrarNotificacaoCurta(
        `ESCADA DE RAJADAS ATIVADA // INTERVALO: ${this.intervaloEscadaSegundos}s | FORÇA: ${this.forcaEscadaPixels}px`
      );
    });
  }

  private executarRecolherPilaresRachados(): void {
    this.totem6Resolvido = true;

    for (const pilar of this.pilaresMoveis) {
      if (pilar.rachado) {
        pilar.recolhido = true;
        (pilar.sprite.body as Phaser.Physics.Arcade.StaticBody).checkCollision.none = true;

        this.tweens.add({
          targets: pilar.sprite,
          y: pilar.yOriginal + 320,
          alpha: 0,
          duration: 1200,
          ease: 'Cubic.easeIn',
        });
      }
    }

    this.time.delayedCall(800, () => {
      this.terminal.fechar();
      this.cameras.main.shake(350, 0.005);
      this.mostrarNotificacaoCurta('PILARES RACHADOS RECOLHIDOS // ENTRADA DO SANTUÁRIO SEGURA!');
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
      this.exibirAnimacaoCheckpoint('CHECKPOINT 2 REGISTRADO // ANTECÂMARA');
    }

    // Queda no abismo
    if (this.jogador.y > CHECKPOINTS_FASE1.LIMITE_QUEDA_Y) {
      this.respawnNoCheckpoint('QUEDA NO ABISMO DO CÉU!');
    }
  }

  private respawnNoCheckpoint(motivo: string): void {
    const corpo = this.jogador.body as Phaser.Physics.Arcade.Body | null;
    if (corpo) {
      corpo.reset(this.checkpointAtual.x, this.checkpointAtual.y);
    } else {
      this.jogador.setPosition(this.checkpointAtual.x, this.checkpointAtual.y);
      this.jogador.setVelocity(0, 0);
    }

    this.tempoUltimaVezNoChao = -9999;
    this.tempoUltimoPressionarPulo = -9999;

    this.cameras.main.flash(200, 255, 255, 255);
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
                  'Magnífico, Hacker! Você superou os seis totens do Céu Partido, decifrou as armadilhas lógicas e alcançou o Santuário.',
              },
              {
                falante: '> CANAL REBELDE // TRANSMISSÃO CELESTIAL',
                texto:
                  'O setor 1 foi totalmente liberado. Pressione ENTER para retornar vitorioso ao Hub!',
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
