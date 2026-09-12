import Phaser from 'phaser';
import { parseCommand } from '../utils/CommandParser';
import { DialogueSystem } from '../utils/DialogueSystem';

export class MainScene extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;

  // Totem 0 (Painel de Energia - Setor 0)
  private totemPower!: Phaser.GameObjects.Image;
  private promptTextPower!: Phaser.GameObjects.Text;
  private beaconPower!: Phaser.GameObjects.Arc;
  private isPowerOn: boolean = false;

  // Escuridão Global e Lanterna do Jogador
  private darkness?: Phaser.GameObjects.RenderTexture;

  // Porta de Aço Trancada (Setor 0)
  private steelDoors!: Phaser.Physics.Arcade.StaticGroup;
  private steelDoor?: Phaser.Physics.Arcade.Sprite;
  private steelDoorCollider?: Phaser.Physics.Arcade.Collider;
  private steelDoorText?: Phaser.GameObjects.Text;

  // Totem 1: Controlador da Esteira (Desafio 2 - Variáveis Inteiras)
  private totemBridge!: Phaser.GameObjects.Image;
  private promptTextBridge!: Phaser.GameObjects.Text;
  private beaconBridge!: Phaser.GameObjects.Arc;
  private isBridgeExpanded: boolean = false;
  private bridge!: Phaser.Physics.Arcade.Sprite;
  private scrapHazard!: Phaser.Physics.Arcade.Sprite;
  private isFallingInScrap: boolean = false;
  private ventExhaust?: Phaser.Physics.Arcade.Sprite;
  private lastVentTime: number = 0;

  // Totem 2: Terminal do Elevador de Carga (Desafio 3 - Concatenação de Strings)
  private totemElevator!: Phaser.GameObjects.Image;
  private promptTextElevator!: Phaser.GameObjects.Text;
  private beaconElevator!: Phaser.GameObjects.Arc;
  private isElevatorLowered: boolean = false;
  private elevatorPlatform!: Phaser.Physics.Arcade.Sprite;
  private elevatorShaftCables?: Phaser.GameObjects.Graphics;
  private cableShockHazard?: Phaser.Physics.Arcade.Sprite;
  private isCableShockActive: boolean = true;
  private cableShockSparks?: Phaser.GameObjects.Arc;
  private scrapHazardSector3?: Phaser.Physics.Arcade.Sprite;

  // Totem 4 (Comporta Hidráulica)
  private totemBarrier!: Phaser.GameObjects.Image;
  private promptTextBarrier!: Phaser.GameObjects.Text;
  private beaconBarrier!: Phaser.GameObjects.Arc;

  // Totem 5 (Regulador Elétrico)
  private totemElectric!: Phaser.GameObjects.Image;
  private promptTextElectric!: Phaser.GameObjects.Text;
  private beaconElectric!: Phaser.GameObjects.Arc;

  private currentInteractingTotem:
    | 'power'
    | 'bridge'
    | 'elevator'
    | 'barrier'
    | 'electric'
    | null = null;

  // Comporta Hidráulica
  private barriers!: Phaser.Physics.Arcade.StaticGroup;
  private barrier?: Phaser.Physics.Arcade.Sprite;
  private barrierCollider?: Phaser.Physics.Arcade.Collider;
  private gateLockText?: Phaser.GameObjects.Text;

  // Zona de Choque Elétrico (X = 1220 a 1570)
  private shockZone!: Phaser.Physics.Arcade.Sprite;
  private isShockActive: boolean = true;
  private isShocked: boolean = false;
  private shockTween?: Phaser.Tweens.Tween;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private jumpKeys?: {
    w: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };
  private interactKey?: Phaser.Input.Keyboard.Key;
  private escKey?: Phaser.Input.Keyboard.Key;

  // Variáveis de movimentação
  private jumpForce: number = 515;

  private isTerminalOpen: boolean = false;
  private terminalOverlay: HTMLElement | null = null;
  private terminalOutput: HTMLElement | null = null;
  private terminalInput: HTMLInputElement | null = null;

  private dialogueSystem?: DialogueSystem;
  private isBootingSequence: boolean = false;

  constructor() {
    super('MainScene');
  }

  init(data?: { isBooting?: boolean }): void {
    this.isBootingSequence = data?.isBooting ?? false;
  }

  create(): void {
    // 1. Expansão do Mundo da MainScene para 6000 pixels
    this.physics.world.setBounds(0, 0, 6000, 720);
    this.cameras.main.setBounds(0, 0, 6000, 720);
    this.cameras.main.setBackgroundColor('#070b12');

    this.createScenery();
    this.createGround();
    this.createScrapPlatforms();
    this.createConveyorBridge();
    this.createElevator();
    this.createShockZone();
    this.createTotems();
    this.createPlayer();
    this.createGlobalDarkness();
    this.createSteelDoor();
    this.createHydraulicGate();
    this.setupControls();
    this.setupTerminal();

    if (this.isBootingSequence) {
      this.player.setVelocity(0, 0);
      const gameContainer = document.getElementById('game-container');
      gameContainer?.classList.add('blur-active');
      this.openBootTerminal();
    } else {
      this.setupDialogue();
    }

    // Câmera segue o jogador suavemente
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  update(): void {
    if (!this.player || !this.player.body) return;

    // Atualização dinâmica contínua da lanterna acoplada ao jogador
    this.updateDarkness();

    // Se estiver no ritual de boot, trava completamente o jogador
    if (this.isBootingSequence) {
      this.player.setVelocityX(0);
      return;
    }

    // Se o diálogo estiver ativo, trava totalmente o jogador e esconde prompts
    if (this.dialogueSystem && this.dialogueSystem.isActive) {
      this.promptTextPower.setVisible(false);
      this.promptTextBridge.setVisible(false);
      this.promptTextElevator.setVisible(false);
      this.promptTextBarrier.setVisible(false);
      this.promptTextElectric.setVisible(false);
      this.player.setVelocityX(0);
      return;
    }

    // Se o jogador estiver em estado de choque (knockback ativo por 0.3s)
    if (this.isShocked || this.isFallingInScrap) {
      return;
    }

    // Checagem de proximidade dos totens
    const distPower = Math.abs(this.player.x - this.totemPower.x);
    const isNearPowerTotem = distPower < 80;
    this.promptTextPower.setVisible(
      isNearPowerTotem && !this.isTerminalOpen && !this.isPowerOn
    );

    const distBridgeX = Math.abs(this.player.x - this.totemBridge.x);
    const distBridgeY = Math.abs(this.player.y - this.totemBridge.y);
    const isNearBridgeTotem = distBridgeX < 85 && distBridgeY < 95;
    this.promptTextBridge.setVisible(
      isNearBridgeTotem && !this.isTerminalOpen && !this.isBridgeExpanded
    );

    const distElevatorX = Math.abs(this.player.x - this.totemElevator.x);
    const distElevatorY = Math.abs(this.player.y - this.totemElevator.y);
    const isNearElevatorTotem = distElevatorX < 85 && distElevatorY < 95;
    this.promptTextElevator.setVisible(
      isNearElevatorTotem && !this.isTerminalOpen && !this.isElevatorLowered
    );

    const distBarrier = Math.abs(this.player.x - this.totemBarrier.x);
    const isNearBarrierTotem = distBarrier < 95;
    this.promptTextBarrier.setVisible(
      isNearBarrierTotem && !this.isTerminalOpen && Boolean(this.barrier)
    );

    const distElectric = Math.abs(this.player.x - this.totemElectric.x);
    const isNearElectricTotem = distElectric < 95;
    this.promptTextElectric.setVisible(
      isNearElectricTotem && !this.isTerminalOpen && this.isShockActive
    );

    // Identifica com qual totem o jogador está interagindo
    if (isNearPowerTotem && !this.isPowerOn) {
      this.currentInteractingTotem = 'power';
    } else if (isNearBridgeTotem && !this.isBridgeExpanded) {
      this.currentInteractingTotem = 'bridge';
    } else if (isNearElevatorTotem && !this.isElevatorLowered) {
      this.currentInteractingTotem = 'elevator';
    } else if (isNearBarrierTotem && this.barrier) {
      this.currentInteractingTotem = 'barrier';
    } else if (isNearElectricTotem && this.isShockActive) {
      this.currentInteractingTotem = 'electric';
    } else {
      this.currentInteractingTotem = null;
    }

    // Abrir terminal com tecla E quando próximo
    if (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      if (this.currentInteractingTotem && !this.isTerminalOpen) {
        this.openTerminal(this.currentInteractingTotem);
      }
    }

    // Fechar terminal com Escape no Phaser
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.isTerminalOpen) {
        this.closeTerminal();
      }
    }

    // Mantém o corpo físico do elevador perfeitamente sincronizado com o sprite
    if (this.elevatorPlatform && this.elevatorPlatform.body) {
      (this.elevatorPlatform.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    }

    // Travar movimentação se o terminal estiver aberto
    if (this.isTerminalOpen) {
      this.player.setVelocityX(0);
      return;
    }

    // Movimentação horizontal com orientação visual (FlipX)
    const isLeftDown =
      (this.cursors?.left.isDown ?? false) ||
      (this.wasdKeys?.left.isDown ?? false);
    const isRightDown =
      (this.cursors?.right.isDown ?? false) ||
      (this.wasdKeys?.right.isDown ?? false);

    if (isLeftDown) {
      this.player.setVelocityX(-220);
      this.player.setFlipX(true); // Olha para a esquerda
    } else if (isRightDown) {
      this.player.setVelocityX(220);
      this.player.setFlipX(false); // Olha para a direita
    } else {
      this.player.setVelocityX(0);
    }

    // Pulo estilo Mega Man ágil
    const isJumpDown =
      (this.cursors?.up.isDown ?? false) ||
      (this.jumpKeys?.w.isDown ?? false) ||
      (this.jumpKeys?.space.isDown ?? false);

    const isGrounded =
      this.player.body.blocked.down || this.player.body.touching.down;

    if (isJumpDown && isGrounded) {
      this.player.setVelocityY(-this.jumpForce);
    }

    // Pulo variável: cortar velocidade vertical se o jogador soltar o botão durante a subida
    const cutThreshold = -160;
    if (!isJumpDown && this.player.body.velocity.y < cutThreshold) {
      this.player.setVelocityY(cutThreshold);
    }
  }

  private createScenery(): void {
    // 1. Céu com degradê do azul-petróleo profundo #070b12 no topo até #141b26 na base (cobertura total de 6500px)
    if (!this.textures.exists('cyberpunk-sky')) {
      const g = this.make.graphics();
      const skyW = 6500;
      const skyH = 880;
      for (let y = 0; y < skyH; y += 4) {
        const ratio = Math.min(y / 720, 1);
        const r = Math.round(7 + (20 - 7) * ratio);
        const gr = Math.round(11 + (27 - 11) * ratio);
        const b = Math.round(18 + (38 - 18) * ratio);
        const color = (r << 16) | (gr << 8) | b;
        g.fillStyle(color, 1);
        g.fillRect(0, y, skyW, 4);
      }
      g.generateTexture('cyberpunk-sky', skyW, skyH);
      g.destroy();
    }
    this.add.image(3000, 360, 'cyberpunk-sky').setDepth(-10);

    // 2. Elementos de cenário estáticos de fundo (Lixão dos Scripts Esquecidos)
    const bgGraphics = this.add.graphics().setDepth(-5);

    // Cabos industriais pendurados descendo do teto cobrindo toda a extensão horizontal de 6000px
    bgGraphics.lineStyle(2, 0x0c141e, 0.9);
    for (let cx = -40; cx <= 6200; cx += 180) {
      const curve1 = new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(cx, 0),
        new Phaser.Math.Vector2(cx - 35, 70),
        new Phaser.Math.Vector2(cx + 45, 130),
        new Phaser.Math.Vector2(cx + 15, 210)
      );
      bgGraphics.strokePoints(curve1.getPoints(16));

      const curve2 = new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(cx + 30, 0),
        new Phaser.Math.Vector2(cx + 60, 50),
        new Phaser.Math.Vector2(cx + 10, 110),
        new Phaser.Math.Vector2(cx + 40, 160)
      );
      bgGraphics.strokePoints(curve2.getPoints(16));
    }

    // Pilhas de sucatas de servidores e chassis descartados
    bgGraphics.fillStyle(0x0a1018, 0.95);
    const scrapPiles = [
      { x: -80, w: 200, h: 260 },
      { x: 160, w: 180, h: 230 },
      { x: 380, w: 120, h: 160 },
      { x: 740, w: 200, h: 270 },
      { x: 1420, w: 230, h: 290 },
      { x: 1860, w: 190, h: 240 },
      { x: 2260, w: 240, h: 280 },
      { x: 2580, w: 220, h: 260 },
      { x: 2850, w: 260, h: 300 },
      { x: 3400, w: 220, h: 270 },
      { x: 3900, w: 250, h: 290 },
      { x: 4400, w: 210, h: 250 },
      { x: 4950, w: 240, h: 280 },
      { x: 5450, w: 230, h: 260 },
      { x: 5850, w: 260, h: 310 },
    ];
    scrapPiles.forEach((p) => {
      bgGraphics.fillRect(p.x, 680 - p.h, p.w, p.h);
      for (let sy = 680 - p.h + 20; sy < 680; sy += 32) {
        bgGraphics.lineStyle(1, 0x141f2d, 0.8);
        bgGraphics.strokeRect(p.x + 8, sy, p.w - 16, 24);
      }
    });

    // Monitores CRT empilhados com telas apagadas ou com fósforo verde sutil
    const crtPositions = [
      { x: -30, y: 530, flicker: false },
      { x: 210, y: 560, flicker: true },
      { x: 260, y: 520, flicker: false },
      { x: 790, y: 510, flicker: true },
      { x: 840, y: 560, flicker: false },
      { x: 1480, y: 470, flicker: true },
      { x: 1530, y: 530, flicker: false },
      { x: 1920, y: 520, flicker: true },
      { x: 2320, y: 490, flicker: false },
      { x: 2660, y: 540, flicker: true },
      { x: 2920, y: 500, flicker: false },
      { x: 3500, y: 520, flicker: true },
      { x: 4100, y: 510, flicker: false },
      { x: 4650, y: 530, flicker: true },
      { x: 5200, y: 500, flicker: false },
      { x: 5600, y: 540, flicker: true },
    ];
    crtPositions.forEach((pos, idx) => {
      this.add.rectangle(pos.x, pos.y, 36, 28, 0x161e29).setDepth(-4);
      const screenColor = pos.flicker ? 0x003314 : 0x0a1118;
      const screen = this.add.rectangle(pos.x, pos.y, 26, 18, screenColor).setDepth(-3);

      if (pos.flicker) {
        this.tweens.add({
          targets: screen,
          alpha: { from: 0.35, to: 0.9 },
          yoyo: true,
          repeat: -1,
          duration: 500 + idx * 180,
        });
      }
    });
  }

  private createGround(): void {
    this.platforms = this.physics.add.staticGroup();

    // Helper para gerar textura de piso industrial de dimensões específicas
    const createGroundTexture = (key: string, w: number, h: number) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics();

      // Base metálica escura
      g.fillStyle(0x19212c, 1);
      g.fillRect(0, 0, w, h);

      // Borda superior chanfrada de metal escovado
      g.fillStyle(0x4b5563, 1);
      g.fillRect(0, 0, w, 4);
      g.fillStyle(0x9ca3af, 0.85);
      g.fillRect(0, 0, w, 1);

      // Placas de metal industriais a cada 80px
      for (let x = 0; x < w; x += 80) {
        g.fillStyle(0x0e1319, 1);
        g.fillRect(x, 2, 2, h - 2);
        g.fillStyle(0x374151, 0.7);
        g.fillRect(x + 2, 2, 1, h - 2);

        // Parafusos / rebites
        g.fillStyle(0xcbd5e1, 1);
        g.fillCircle(x + 10, 12, 2);
        g.fillCircle(x + 70, 12, 2);
        g.fillCircle(x + 10, 30, 2);
        g.fillCircle(x + 70, 30, 2);
        g.fillCircle(x + 10, 60, 2);
        g.fillCircle(x + 70, 60, 2);

        // Ranhura antiderrapante industrial
        g.fillStyle(0x111822, 0.95);
        g.fillRect(x + 22, 19, 36, 3);
        g.fillRect(x + 22, 45, 36, 3);
      }

      // Detalhe reforçado de borda no precipício do abismo
      g.fillStyle(0x0f172a, 1);
      g.fillRect(w - 6, 0, 6, h);
      g.fillStyle(0x475569, 1);
      g.fillRect(w - 2, 0, 2, h);

      g.generateTexture(key, w, h);
      g.destroy();
    };

    // 1. Margem Esquerda: De X = 0 a X = 1850 (superfície em Y = 680, centro em 925, 780)
    createGroundTexture('ground-section-left', 1850, 200);
    this.platforms.create(925, 780, 'ground-section-left');

    // 2. Margem Direita (Setor 3): De X = 2250 a X = 6000+ (superfície em Y = 680, centro em 4125, 780)
    createGroundTexture('ground-section-right', 3750, 200);
    this.platforms.create(4125, 780, 'ground-section-right');

    // 3. Fundo do Abismo com Sucata Cortante (X = 1850 a X = 2250 no chão lá embaixo)
    this.createAbyssHazard();

    // 4. Espinhos do Vão Sob os Contêineres (Setor 3: X = 2250 a 2960)
    this.createSector3Hazard();
  }

  private createSector3Hazard(): void {
    const hazardWidth = 710; // X = 2250 a X = 2960
    const hazardHeight = 36;

    if (!this.textures.exists('sector3-scrap-spikes')) {
      const g = this.make.graphics();
      g.fillStyle(0x070a0e, 1);
      g.fillRect(0, 0, hazardWidth, hazardHeight);

      // Espinhos pontiagudos e sucata denteada
      for (let x = 6; x < hazardWidth - 6; x += 16) {
        g.fillStyle(0x78350f, 0.9);
        g.beginPath();
        g.moveTo(x - 6, hazardHeight);
        g.lineTo(x + 2, 6);
        g.lineTo(x + 10, hazardHeight);
        g.closePath();
        g.fillPath();

        g.fillStyle(0x94a3b8, 1);
        g.beginPath();
        g.moveTo(x, 14);
        g.lineTo(x + 2, 6);
        g.lineTo(x + 4, 14);
        g.closePath();
        g.fillPath();

        g.fillStyle(0xef4444, 0.8);
        g.fillCircle(x + 2, 8, 1.5);
      }

      g.generateTexture('sector3-scrap-spikes', hazardWidth, hazardHeight);
      g.destroy();
    }

    // Posicionada no fundo do vão entre X = 2250 e X = 2960 (centro em 2605)
    this.scrapHazardSector3 = this.physics.add.sprite(2605, 672, 'sector3-scrap-spikes');
    this.scrapHazardSector3.setDepth(9);
    const hazardBody = this.scrapHazardSector3.body as Phaser.Physics.Arcade.Body;
    hazardBody.setAllowGravity(false);
    hazardBody.setImmovable(true);
  }

  private handleSector3Fall(): void {
    if (this.isFallingInScrap) return;
    this.isFallingInScrap = true;

    this.player.setVelocity(-160, -220);
    this.cameras.main.flash(200, 255, 50, 50);

    const alert = this.add
      .text(this.player.x, this.player.y - 65, 'QUEDA NO VÃO: Retornando à esteira!', {
        fontSize: '15px',
        color: '#ff4444',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.tweens.add({
      targets: alert,
      y: alert.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => alert.destroy(),
    });

    this.time.delayedCall(350, () => {
      // Reinicia o jogador na saída da esteira suspensa (X = 2260, Y = 280)
      this.player.setPosition(2260, 280);
      this.player.setVelocity(0, 0);
      this.isFallingInScrap = false;
    });
  }

  private createAbyssHazard(): void {
    const hazardWidth = 400; // X = 1850 a X = 2250
    const hazardHeight = 36;

    if (!this.textures.exists('abyss-scrap-spikes')) {
      const g = this.make.graphics();
      // Fundo escuro do fosso
      g.fillStyle(0x070a0e, 1);
      g.fillRect(0, 0, hazardWidth, hazardHeight);

      // Vigas retorcidas e lâminas enferrujadas denteadas
      for (let x = 6; x < hazardWidth - 6; x += 16) {
        g.fillStyle(0x78350f, 0.9); // ferrugem base
        g.beginPath();
        g.moveTo(x - 6, hazardHeight);
        g.lineTo(x + 2, 6);
        g.lineTo(x + 10, hazardHeight);
        g.closePath();
        g.fillPath();

        // Ponta afiada metálica prateada
        g.fillStyle(0x94a3b8, 1);
        g.beginPath();
        g.moveTo(x, 14);
        g.lineTo(x + 2, 6);
        g.lineTo(x + 4, 14);
        g.closePath();
        g.fillPath();

        // Faísca / resíduo tóxico avermelhado
        g.fillStyle(0xef4444, 0.7);
        g.fillCircle(x + 2, 8, 1.5);
      }

      g.generateTexture('abyss-scrap-spikes', hazardWidth, hazardHeight);
      g.destroy();
    }

    // Posicionada no fundo do abismo entre X = 1850 e X = 2250 (centro em 2050)
    this.scrapHazard = this.physics.add.sprite(2050, 702, 'abyss-scrap-spikes');
    const hazardBody = this.scrapHazard.body as Phaser.Physics.Arcade.Body;
    hazardBody.setAllowGravity(false);
    hazardBody.setImmovable(true);
  }

  private handleScrapFall(): void {
    if (this.isFallingInScrap) return;
    this.isFallingInScrap = true;

    this.player.setVelocity(-180, -260);
    this.cameras.main.flash(200, 255, 50, 50);

    const alert = this.add
      .text(this.player.x, this.player.y - 65, 'QUEDA NO ABISMO: Retornando ao início do parkour!', {
        fontSize: '15px',
        color: '#ff4444',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: alert,
      y: alert.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => alert.destroy(),
    });

    this.time.delayedCall(350, () => {
      // Reposiciona o jogador no início do parkour logo após a porta de aço
      this.player.setPosition(1180, 620);
      this.player.setVelocity(0, 0);
      this.isFallingInScrap = false;
    });
  }

  private handleVentThrust(): void {
    const now = this.time.now;
    if (now - this.lastVentTime < 260) return;
    this.lastVentTime = now;

    // Impulso vertical com rajada pneumática (trampolim de ar que arremessa de volta)
    this.player.setVelocityY(-560);
    this.cameras.main.shake(100, 0.003);

    const ventAlert = this.add
      .text(this.player.x, this.player.y - 45, '▲ EMPUXO PNEUMÁTICO ▲', {
        fontSize: '12px',
        color: '#00e5ff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(15);

    this.tweens.add({
      targets: ventAlert,
      y: ventAlert.y - 35,
      alpha: 0,
      duration: 450,
      onComplete: () => ventAlert.destroy(),
    });
  }

  private createScrapPlatforms(): void {
    // ==============================================================
    // 1. DEGRAU 1: PRIMEIRA CAIXA DE SUCATA AFASTADA (X = 1240)
    // ==============================================================
    const step1W = 70;
    const step1H = 90;

    if (!this.textures.exists('scrap-block-step1')) {
      const g = this.make.graphics();
      g.fillStyle(0x19212c, 1);
      g.fillRect(0, 0, step1W, step1H);

      // Borda superior de metal escovado
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 0, step1W, 4);
      g.fillStyle(0x94a3b8, 0.9);
      g.fillRect(0, 0, step1W, 1);

      // Friso neon ciano
      g.fillStyle(0x00e5ff, 0.8);
      g.fillRect(0, 0, 3, step1H);
      g.fillRect(step1W - 3, 0, 3, step1H);

      // Rebites industriais
      for (let y = 14; y < step1H; y += 22) {
        g.fillStyle(0x0e1319, 1);
        g.fillRect(4, y, step1W - 8, 2);
        g.fillStyle(0xcbd5e1, 1);
        g.fillCircle(10, y + 10, 2);
        g.fillCircle(step1W - 10, y + 10, 2);
      }

      g.generateTexture('scrap-block-step1', step1W, step1H);
      g.destroy();
    }

    // Caixa assentada no chão (Y = 680), topo em Y = 590 (centro X = 1240, Y = 635)
    const step1 = this.platforms.create(1240, 635, 'scrap-block-step1') as Phaser.Physics.Arcade.Sprite;
    step1.setDepth(9);
    step1.refreshBody();
    const b1 = step1.body as Phaser.Physics.Arcade.Body;
    b1.checkCollision.down = false;
    b1.checkCollision.left = false;
    b1.checkCollision.right = false;
    b1.checkCollision.up = true;

    // ==============================================================
    // 2. BLOQUEIO NO TÉRREO ALTO (X = 1350, Y = 680) - BARREIRA ZEBRADA ALTA
    // ==============================================================
    const blockerW = 60;
    const blockerH = 240; // Topo em Y = 440 (cria salto cego)

    if (!this.textures.exists('ground-scrap-blocker')) {
      const g = this.make.graphics();

      // Base maciça de sucata prensada
      g.fillStyle(0x0f172a, 1);
      g.fillRect(0, 0, blockerW, blockerH);

      g.fillStyle(0x1e293b, 1);
      g.fillRect(4, 4, blockerW - 8, blockerH - 8);

      // Padrão zebrado diagonal amarelo e preto em toda a extensão
      for (let sy = 20; sy < blockerH - 30; sy += 40) {
        g.fillStyle(0x18181b, 1);
        g.fillRect(6, sy, blockerW - 12, 34);
        g.fillStyle(0xfacc15, 1);
        for (let bx = -10; bx < blockerW; bx += 14) {
          g.beginPath();
          g.moveTo(bx, sy + 34);
          g.lineTo(bx + 7, sy);
          g.lineTo(bx + 12, sy);
          g.lineTo(bx + 5, sy + 34);
          g.closePath();
          g.fillPath();
        }
      }

      // Cabos de alta tensão descendo do topo
      g.fillStyle(0x450a0a, 1);
      g.fillRect(16, 0, 6, 40);
      g.fillStyle(0x7f1d1d, 1);
      g.fillRect(38, 0, 6, 40);

      // Conectores cerâmicos
      g.fillStyle(0xe2e8f0, 1);
      g.fillRect(14, 2, 10, 6);
      g.fillRect(36, 2, 10, 6);

      g.generateTexture('ground-scrap-blocker', blockerW, blockerH);
      g.destroy();
    }

    // Barreira zebrada alta no térreo em X = 1350 (centro Y = 560, topo Y = 440)
    const groundBlocker = this.platforms.create(1350, 560, 'ground-scrap-blocker') as Phaser.Physics.Arcade.Sprite;
    groundBlocker.setDepth(9);
    groundBlocker.refreshBody();

    // Faíscas e arcos de alta tensão estalando no topo da barreira (Y = 440)
    const spark1 = this.add.circle(1342, 436, 3, 0x00e5ff);
    spark1.setDepth(15);
    this.tweens.add({
      targets: spark1,
      alpha: { from: 0.1, to: 1 },
      scale: { from: 0.6, to: 1.6 },
      yoyo: true,
      repeat: -1,
      duration: 160,
    });

    const spark2 = this.add.circle(1360, 434, 2.5, 0xffeb3b);
    spark2.setDepth(15);
    this.tweens.add({
      targets: spark2,
      alpha: { from: 0.2, to: 1 },
      scale: { from: 0.7, to: 1.5 },
      yoyo: true,
      repeat: -1,
      duration: 220,
    });

    // ==============================================================
    // 3. DEGRAU 2: VIGA SUSPENSA ESTREITA NO ALTO (X = 1450, Y = 460)
    // ==============================================================
    const beamW = 75;
    const beamH = 18;

    if (!this.textures.exists('iron-beam-narrow')) {
      const g = this.make.graphics();
      g.fillStyle(0x1e293b, 1);
      g.fillRect(0, 0, beamW, beamH);

      g.fillStyle(0x334155, 1);
      g.fillRect(0, 0, beamW, 4);
      g.fillRect(0, beamH - 4, beamW, 4);
      g.fillStyle(0x64748b, 0.9);
      g.fillRect(0, 0, beamW, 1.5);

      for (let x = 10; x < beamW; x += 18) {
        g.fillStyle(0x94a3b8, 1);
        g.fillCircle(x, 9, 2);
      }

      g.generateTexture('iron-beam-narrow', beamW, beamH);
      g.destroy();
    }

    // Topo em Y = 460 (centro Y = 469)
    const step2 = this.platforms.create(1450, 469, 'iron-beam-narrow') as Phaser.Physics.Arcade.Sprite;
    step2.setDepth(9);
    step2.refreshBody();
    const b2 = step2.body as Phaser.Physics.Arcade.Body;
    b2.checkCollision.down = false;
    b2.checkCollision.left = false;
    b2.checkCollision.right = false;
    b2.checkCollision.up = true;

    // Cabos verticais sustentando a viga até o teto
    const cableBeam = this.add.graphics();
    cableBeam.lineStyle(2, 0x334155, 0.85);
    cableBeam.beginPath();
    cableBeam.moveTo(1425, 0);
    cableBeam.lineTo(1425, 460);
    cableBeam.moveTo(1475, 0);
    cableBeam.lineTo(1475, 460);
    cableBeam.strokePath();
    cableBeam.setDepth(5);

    // ==============================================================
    // 4. DEGRAU 3: PLATAFORMA SUSPENSA DO MEIO (X = 1620, Y = 430, LARGURA 80)
    // ==============================================================
    const serverW = 80;
    const serverH = 20;

    if (!this.textures.exists('suspended-server-narrow')) {
      const g = this.make.graphics();
      g.fillStyle(0x0f172a, 1);
      g.fillRect(0, 0, serverW, serverH);

      g.fillStyle(0x1e293b, 1);
      g.fillRect(2, 2, serverW - 4, serverH - 4);

      g.fillStyle(0x475569, 1);
      g.fillRect(0, 0, serverW, 3);

      for (let bx = 8; bx < serverW - 14; bx += 20) {
        g.fillStyle(0x090d16, 1);
        g.fillRect(bx, 6, 14, 10);
        g.fillStyle(0x00ff66, 1);
        g.fillCircle(bx + 3, 11, 1.5);
        g.fillStyle(0x00e5ff, 1);
        g.fillCircle(bx + 7, 11, 1.5);
      }

      g.generateTexture('suspended-server-narrow', serverW, serverH);
      g.destroy();
    }

    // Topo em Y = 430 (centro Y = 440)
    const step3 = this.platforms.create(1620, 440, 'suspended-server-narrow') as Phaser.Physics.Arcade.Sprite;
    step3.setDepth(9);
    step3.refreshBody();
    const b3 = step3.body as Phaser.Physics.Arcade.Body;
    b3.checkCollision.down = false;
    b3.checkCollision.left = false;
    b3.checkCollision.right = false;
    b3.checkCollision.up = true;

    // Cabos do servidor até o teto
    const cableServer = this.add.graphics();
    cableServer.lineStyle(2, 0x334155, 0.85);
    cableServer.beginPath();
    cableServer.moveTo(1595, 0);
    cableServer.lineTo(1595, 430);
    cableServer.moveTo(1645, 0);
    cableServer.lineTo(1645, 430);
    cableServer.strokePath();
    cableServer.setDepth(5);

    // ==============================================================
    // 5. EXAUSTOR DE AR / VENTILAÇÃO NO CHÃO DO FOSSO (X = 1680, Y = 680)
    // ==============================================================
    const ventW = 75;
    const ventH = 16;

    if (!this.textures.exists('vent-grate-floor')) {
      const g = this.make.graphics();

      // Bocal de metal reforçado
      g.fillStyle(0x0f172a, 1);
      g.fillRect(0, 0, ventW, ventH);

      g.fillStyle(0x1e293b, 1);
      g.fillRect(2, 2, ventW - 4, ventH - 4);

      // Grade de exaustão
      for (let x = 6; x < ventW - 6; x += 6) {
        g.fillStyle(0x00e5ff, 0.8);
        g.fillRect(x, 4, 3, ventH - 8);
      }

      // Moldura de aviso neon ciano
      g.fillStyle(0x00e5ff, 1);
      g.fillRect(0, 0, ventW, 2);

      g.generateTexture('vent-grate-floor', ventW, ventH);
      g.destroy();
    }

    this.add.image(1680, 672, 'vent-grate-floor').setDepth(6);

    // Rajadas contínuas de vento ciano subindo verticalmente
    for (let i = 0; i < 5; i++) {
      const windStream = this.add.graphics();
      windStream.lineStyle(2, 0x00e5ff, 0.6);
      windStream.beginPath();
      const offsetX = 1655 + i * 12;
      windStream.moveTo(offsetX, 665);
      windStream.lineTo(offsetX, 570);
      windStream.strokePath();
      windStream.setDepth(7);

      this.tweens.add({
        targets: windStream,
        y: -220,
        alpha: { from: 0.8, to: 0.05 },
        duration: 480 + i * 70,
        repeat: -1,
        ease: 'Linear',
      });
    }

    // Trigger de colisão pneumática
    if (!this.textures.exists('vent-trigger-zone')) {
      const g = this.make.graphics();
      g.fillStyle(0x00ffff, 0);
      g.fillRect(0, 0, 75, 80);
      g.generateTexture('vent-trigger-zone', 75, 80);
      g.destroy();
    }

    this.ventExhaust = this.physics.add.sprite(1680, 640, 'vent-trigger-zone');
    this.ventExhaust.setVisible(false);
    const ventBody = this.ventExhaust.body as Phaser.Physics.Arcade.Body;
    ventBody.setAllowGravity(false);
    ventBody.setImmovable(true);
    ventBody.setSize(75, 80);

    // ==============================================================
    // 6. MEZANINO ELEVADO (BORDA EM X = 1790 A 1850, ALTURA Y = 330)
    // ==============================================================
    const mezW = 70; // De X = 1785 a 1855
    const mezH = 20;

    if (!this.textures.exists('mezzanine-elevated')) {
      const g = this.make.graphics();

      g.fillStyle(0x19212c, 1);
      g.fillRect(0, 0, mezW, mezH);

      // Borda superior antiderrapante
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 0, mezW, 4);
      g.fillStyle(0x94a3b8, 0.95);
      g.fillRect(0, 0, mezW, 1.5);

      // Friso neon ciano no mezanino
      g.fillStyle(0x00e5ff, 0.9);
      g.fillRect(0, 0, 4, mezH);
      g.fillRect(mezW - 4, 0, 4, mezH);

      for (let x = 12; x < mezW; x += 24) {
        g.fillStyle(0x0e1319, 1);
        g.fillRect(x, 4, 2, mezH - 4);
      }

      g.generateTexture('mezzanine-elevated', mezW, mezH);
      g.destroy();
    }

    // Topo em Y = 330 (centro Y = 340, X = 1820)
    const mez = this.platforms.create(1820, 340, 'mezzanine-elevated') as Phaser.Physics.Arcade.Sprite;
    mez.setDepth(8);
    mez.refreshBody();
    // Colisão limpa no topo sem atrito nas bordas verticais
    const bMez = mez.body as Phaser.Physics.Arcade.Body;
    bMez.checkCollision.down = false;
    bMez.checkCollision.left = false;
    bMez.checkCollision.right = false;
    bMez.checkCollision.up = true;

    // Treliça de sustentação decorativa (sem colisão para não prender o jogador)
    const strutG = this.add.graphics();
    strutG.fillStyle(0x1e293b, 0.85);
    strutG.fillRect(1840, 340, 10, 340);
    strutG.lineStyle(2, 0x334155, 0.6);
    strutG.beginPath();
    strutG.moveTo(1840, 360);
    strutG.lineTo(1850, 520);
    strutG.moveTo(1840, 520);
    strutG.lineTo(1850, 680);
    strutG.strokePath();
    strutG.setDepth(4);

    // ==============================================================
    // 7. DESAFIO 3: PLATAFORMA 1 (VIGA ESTREITA EM X = 2360, Y = 360)
    // ==============================================================
    const beamStepW = 70;
    const beamStepH = 18;
    if (!this.textures.exists('narrow-beam-step')) {
      const g = this.make.graphics();
      g.fillStyle(0x1e293b, 1);
      g.fillRect(0, 0, beamStepW, beamStepH);
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 0, beamStepW, 4);
      g.fillStyle(0x94a3b8, 0.95);
      g.fillRect(0, 0, beamStepW, 1.5);
      g.fillStyle(0x00e5ff, 0.9);
      g.fillRect(0, 0, 3, beamStepH);
      g.fillRect(beamStepW - 3, 0, 3, beamStepH);
      for (let x = 8; x < beamStepW; x += 14) {
        g.fillStyle(0xcbd5e1, 1);
        g.fillCircle(x, 9, 1.5);
      }
      g.generateTexture('narrow-beam-step', beamStepW, beamStepH);
      g.destroy();
    }
    // Topo em Y = 360 (centro Y = 369)
    const narrowStep1 = this.platforms.create(2360, 369, 'narrow-beam-step') as Phaser.Physics.Arcade.Sprite;
    narrowStep1.setDepth(8);
    narrowStep1.refreshBody();
    const bNarrowStep1 = narrowStep1.body as Phaser.Physics.Arcade.Body;
    bNarrowStep1.checkCollision.down = false;
    bNarrowStep1.checkCollision.left = false;
    bNarrowStep1.checkCollision.right = false;
    bNarrowStep1.checkCollision.up = true;

    // Cabos verticais sustentando a viga até o teto
    const cableBeam1 = this.add.graphics();
    cableBeam1.lineStyle(2, 0x334155, 0.85);
    cableBeam1.beginPath();
    cableBeam1.moveTo(2340, 0);
    cableBeam1.lineTo(2340, 360);
    cableBeam1.moveTo(2380, 0);
    cableBeam1.lineTo(2380, 360);
    cableBeam1.strokePath();
    cableBeam1.setDepth(5);

    // ==============================================================
    // 8. DESAFIO 3: CONTÊINER INFERIOR (SALTO EM DECLIVE: X = 2500, Y = 450)
    // ==============================================================
    const contLowW = 120;
    const contLowH = 70;
    if (!this.textures.exists('industrial-container-lower')) {
      const g = this.make.graphics();
      g.fillStyle(0x131d2a, 1);
      g.fillRect(0, 0, contLowW, contLowH);
      g.fillStyle(0x334155, 1);
      g.fillRect(0, 0, contLowW, 5);
      g.fillRect(0, contLowH - 5, contLowW, 5);
      g.fillRect(0, 0, 6, contLowH);
      g.fillRect(contLowW - 6, 0, 6, contLowH);
      g.fillStyle(0x94a3b8, 1);
      g.fillRect(0, 0, contLowW, 2);

      for (let cx = 14; cx < contLowW - 14; cx += 12) {
        g.fillStyle(0x0a1017, 1);
        g.fillRect(cx, 6, 4, contLowH - 12);
        g.fillStyle(0x1e293b, 1);
        g.fillRect(cx + 4, 6, 4, contLowH - 12);
      }

      g.fillStyle(0xfacc15, 0.9);
      g.fillRect(18, 14, 30, 6);
      g.fillStyle(0x0f172a, 1);
      g.fillRect(20, 15, 26, 4);

      g.generateTexture('industrial-container-lower', contLowW, contLowH);
      g.destroy();
    }
    // Topo em Y = 450 (centro Y = 485)
    const contLower = this.platforms.create(2500, 485, 'industrial-container-lower') as Phaser.Physics.Arcade.Sprite;
    contLower.setDepth(8);
    contLower.refreshBody();
    const bContLow = contLower.body as Phaser.Physics.Arcade.Body;
    bContLow.checkCollision.down = false;
    bContLow.checkCollision.left = false;
    bContLow.checkCollision.right = false;
    bContLow.checkCollision.up = true;

    // ==============================================================
    // 9. CABO ELÉTRICO COM CHOQUE INTERMITENTE ENTRE OS CONTÊINERES (X = 2595)
    // ==============================================================
    const fallenCables = this.add.graphics();
    fallenCables.lineStyle(3, 0x18181b, 0.95);
    fallenCables.beginPath();
    fallenCables.moveTo(2560, 452);
    fallenCables.lineTo(2595, 395);
    fallenCables.lineTo(2630, 265);
    fallenCables.strokePath();

    fallenCables.lineStyle(2, 0xd97706, 0.95);
    fallenCables.beginPath();
    fallenCables.moveTo(2560, 455);
    fallenCables.lineTo(2598, 405);
    fallenCables.lineTo(2630, 270);
    fallenCables.strokePath();
    fallenCables.setDepth(7);

    // Hitbox invisível de colisão elétrica
    if (!this.textures.exists('cable-shock-hazard-hitbox')) {
      const g = this.make.graphics();
      g.fillStyle(0xffff00, 0);
      g.fillRect(0, 0, 50, 50);
      g.generateTexture('cable-shock-hazard-hitbox', 50, 50);
      g.destroy();
    }
    this.cableShockHazard = this.physics.add.sprite(2595, 385, 'cable-shock-hazard-hitbox');
    this.cableShockHazard.setVisible(false);
    const cbBody = this.cableShockHazard.body as Phaser.Physics.Arcade.Body;
    cbBody.setAllowGravity(false);
    cbBody.setImmovable(true);

    // Faíscas elétricas intermitentes no cabo
    this.cableShockSparks = this.add.circle(2595, 395, 3.5, 0x00e5ff).setDepth(15);
    this.tweens.add({
      targets: this.cableShockSparks,
      alpha: { from: 0.2, to: 1 },
      scale: { from: 0.6, to: 1.8 },
      yoyo: true,
      repeat: -1,
      duration: 120,
    });

    // Alternância do choque intermitente (1.3s ativo, 1.0s inativo)
    this.time.addEvent({
      delay: 2300,
      loop: true,
      callback: () => {
        this.isCableShockActive = true;
        if (this.cableShockSparks) this.cableShockSparks.setVisible(true);
        this.time.delayedCall(1300, () => {
          this.isCableShockActive = false;
          if (this.cableShockSparks) this.cableShockSparks.setVisible(false);
        });
      },
    });

    // ==============================================================
    // 10. DESAFIO 3: CONTÊINER SUPERIOR (SALTO VERTICAL COM CORRIDA: X = 2680, Y = 260)
    // ==============================================================
    const contUpW = 100;
    const contUpH = 80;
    if (!this.textures.exists('industrial-container-upper')) {
      const g = this.make.graphics();
      g.fillStyle(0x1e2638, 1);
      g.fillRect(0, 0, contUpW, contUpH);
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 0, contUpW, 5);
      g.fillRect(0, contUpH - 5, contUpW, 5);
      g.fillRect(0, 0, 5, contUpH);
      g.fillRect(contUpW - 5, 0, 5, contUpH);
      g.fillStyle(0x94a3b8, 1);
      g.fillRect(0, 0, contUpW, 2);

      for (let cx = 14; cx < contUpW - 14; cx += 12) {
        g.fillStyle(0x0f172a, 1);
        g.fillRect(cx, 6, 4, contUpH - 12);
        g.fillStyle(0x2d3748, 1);
        g.fillRect(cx + 4, 6, 4, contUpH - 12);
      }

      g.fillStyle(0x00e5ff, 0.85);
      g.fillRect(18, 14, 28, 5);
      g.fillStyle(0x0f172a, 1);
      g.fillRect(20, 15, 24, 3);

      g.generateTexture('industrial-container-upper', contUpW, contUpH);
      g.destroy();
    }
    // Topo em Y = 260 (centro Y = 300)
    const contUpper = this.platforms.create(2680, 300, 'industrial-container-upper') as Phaser.Physics.Arcade.Sprite;
    contUpper.setDepth(8);
    contUpper.refreshBody();
    const bContUp = contUpper.body as Phaser.Physics.Arcade.Body;
    bContUp.checkCollision.down = false;
    bContUp.checkCollision.left = false;
    bContUp.checkCollision.right = false;
    bContUp.checkCollision.up = true;

    // ==============================================================
    // 11. DESAFIO 3: MEZANINO DO TOTEM (PLATAFORMA ISOLADA NO ALTO: X = 2860, Y = 230)
    // ==============================================================
    const mezTotemW = 90;
    const mezTotemH = 20;
    if (!this.textures.exists('mezzanine-elevated-totem')) {
      const g = this.make.graphics();
      g.fillStyle(0x19212c, 1);
      g.fillRect(0, 0, mezTotemW, mezTotemH);
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 0, mezTotemW, 4);
      g.fillStyle(0x94a3b8, 0.95);
      g.fillRect(0, 0, mezTotemW, 1.5);
      g.fillStyle(0x00e5ff, 0.9);
      g.fillRect(0, 0, 4, mezTotemH);
      g.fillRect(mezTotemW - 4, 0, 4, mezTotemH);
      for (let x = 12; x < mezTotemW; x += 22) {
        g.fillStyle(0x0e1319, 1);
        g.fillRect(x, 4, 2, mezTotemH - 4);
      }
      g.generateTexture('mezzanine-elevated-totem', mezTotemW, mezTotemH);
      g.destroy();
    }
    // Topo em Y = 230 (centro Y = 240)
    const mezTotem = this.platforms.create(2860, 240, 'mezzanine-elevated-totem') as Phaser.Physics.Arcade.Sprite;
    mezTotem.setDepth(8);
    mezTotem.refreshBody();
    const bMezTotem = mezTotem.body as Phaser.Physics.Arcade.Body;
    bMezTotem.checkCollision.down = false;
    bMezTotem.checkCollision.left = false;
    bMezTotem.checkCollision.right = false;
    bMezTotem.checkCollision.up = true;

    // Treliça de sustentação descendo até a base
    const strutTotem = this.add.graphics();
    strutTotem.fillStyle(0x1e293b, 0.85);
    strutTotem.fillRect(2855, 240, 10, 440);
    strutTotem.lineStyle(2, 0x334155, 0.6);
    strutTotem.beginPath();
    strutTotem.moveTo(2855, 260);
    strutTotem.lineTo(2865, 420);
    strutTotem.moveTo(2855, 420);
    strutTotem.lineTo(2865, 580);
    strutTotem.strokePath();
    strutTotem.setDepth(4);
  }

  private createConveyorBridge(): void {
    const bridgeW = 400; // Vão aberto no ar de 400px (8 metros na escala) entre X = 1850 e X = 2250
    const bridgeH = 20;

    if (!this.textures.exists('conveyor-bridge-pattern')) {
      const g = this.make.graphics();

      // Estrutura base de metal reforçado escuro
      g.fillStyle(0x1e293b, 1);
      g.fillRect(0, 0, bridgeW, bridgeH);

      // Superfície da esteira dentada de borracha/aço (Y = 0..6)
      g.fillStyle(0x0a0f17, 1);
      g.fillRect(0, 0, bridgeW, 6);
      for (let bx = 0; bx < bridgeW; bx += 8) {
        g.fillStyle(0x334155, 0.9);
        g.fillRect(bx, 0, 3, 6);
      }

      // Viga central estrutural cromada (Y = 6..12)
      g.fillStyle(0x334155, 1);
      g.fillRect(0, 6, bridgeW, 6);
      g.fillStyle(0x64748b, 0.8);
      g.fillRect(0, 7, bridgeW, 2);

      // Faixas de aviso de perigo amarelo/preto na borda inferior (Y = 12..20)
      g.fillStyle(0x18181b, 1);
      g.fillRect(0, 12, bridgeW, 8);
      g.fillStyle(0xfacc15, 1);
      for (let bx = -10; bx < bridgeW; bx += 16) {
        g.beginPath();
        g.moveTo(bx, 20);
        g.lineTo(bx + 8, 12);
        g.lineTo(bx + 14, 12);
        g.lineTo(bx + 6, 20);
        g.closePath();
        g.fillPath();
      }

      // Rolamentos e pistões mecânicos a cada 70px
      for (let bx = 30; bx < bridgeW; bx += 70) {
        g.fillStyle(0x94a3b8, 1);
        g.fillCircle(bx, 9, 2);
        g.fillStyle(0x0f172a, 1);
        g.fillCircle(bx, 9, 1);
      }

      g.generateTexture('conveyor-bridge-pattern', bridgeW, bridgeH);
      g.destroy();
    }

    // A esteira mecânica suspensa no ar começa em X = 1850, Y = 330, estendendo-se inicialmente por 100px (2 metros)
    this.bridge = this.physics.add.sprite(1850, 330, 'conveyor-bridge-pattern');
    this.bridge.setOrigin(0, 0);
    this.bridge.setDepth(12);
    this.bridge.setDisplaySize(100, bridgeH);
    this.bridge.setCrop(0, 0, 100, bridgeH);

    const bridgeBody = this.bridge.body as Phaser.Physics.Arcade.Body;
    bridgeBody.setAllowGravity(false);
    bridgeBody.setImmovable(true);
    bridgeBody.setSize(100, bridgeH);
  }

  private expandBridge(): void {
    if (this.isBridgeExpanded) return;
    this.isBridgeExpanded = true;

    if (this.beaconBridge) {
      this.tweens.killTweensOf(this.beaconBridge);
      this.beaconBridge.setFillStyle(0x00ff66);
      this.beaconBridge.setScale(1);
      this.beaconBridge.setAlpha(1);
    }
    this.promptTextBridge.setVisible(false);

    // Animação suave expandindo a esteira mecânica suspensa de 100px para 400px até conectar com o mezanino em X = 2250
    this.tweens.add({
      targets: this.bridge,
      displayWidth: 400,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        if (this.bridge && this.bridge.body) {
          const w = Math.round(this.bridge.displayWidth);
          this.bridge.setCrop(0, 0, w, 20);
          const body = this.bridge.body as Phaser.Physics.Arcade.Body;
          body.setSize(w, 20);
        }
      },
      onComplete: () => {
        if (this.bridge && this.bridge.body) {
          this.bridge.setCrop(0, 0, 400, 20);
          const body = this.bridge.body as Phaser.Physics.Arcade.Body;
          body.setSize(400, 20);
        }
      },
    });
  }

  private createElevator(): void {
    const shaftX1 = 2960;
    const shaftX2 = 3120;
    const platW = 140;
    const platH = 22;

    // 1. Estrutura de Treliça Metálica do Poço do Elevador (de Y = 0 a Y = 700)
    const shaftG = this.add.graphics();
    shaftG.lineStyle(3, 0x1e293b, 1);
    shaftG.fillStyle(0x0f172a, 0.85);

    // Colunas verticais do poço (X = 2960 e X = 3120)
    shaftG.fillRect(shaftX1, 0, 10, 700);
    shaftG.fillRect(shaftX2, 0, 10, 700);

    // Treliças diagonais e travessas a cada 50px
    shaftG.lineStyle(2, 0x334155, 0.7);
    for (let y = 30; y < 680; y += 50) {
      shaftG.beginPath();
      shaftG.moveTo(shaftX1, y);
      shaftG.lineTo(shaftX2 + 10, y);
      shaftG.moveTo(shaftX1 + 10, y);
      shaftG.lineTo(shaftX2, y + 50);
      shaftG.moveTo(shaftX2, y);
      shaftG.lineTo(shaftX1 + 10, y + 50);
      shaftG.strokePath();
    }

    // Motor guincho e engrenagens industriais no teto (Y = 20 a 60)
    shaftG.fillStyle(0x111827, 1);
    shaftG.fillRect(shaftX1 + 15, 20, 130, 40);
    shaftG.fillStyle(0x475569, 1);
    shaftG.fillCircle(shaftX1 + 45, 45, 16);
    shaftG.fillCircle(shaftX2 - 35, 45, 16);
    shaftG.fillStyle(0x00e5ff, 0.9);
    shaftG.fillCircle(shaftX1 + 45, 45, 5);
    shaftG.fillCircle(shaftX2 - 35, 45, 5);

    shaftG.setDepth(6);

    // 2. Textura da Plataforma do Elevador Industrial
    if (!this.textures.exists('elevator-platform-pattern')) {
      const g = this.make.graphics();
      g.fillStyle(0x0f172a, 1);
      g.fillRect(0, 0, platW, platH);

      // Chapa de aço xadrez reforçada (piso antiderrapante)
      g.fillStyle(0x334155, 1);
      g.fillRect(0, 0, platW, 6);
      g.fillStyle(0x94a3b8, 1);
      for (let x = 4; x < platW; x += 10) {
        g.fillRect(x, 1, 4, 3);
      }

      // Viga mestre de sustentação (Y = 6 a 14)
      g.fillStyle(0x1e293b, 1);
      g.fillRect(0, 6, platW, 8);
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 8, platW, 2);

      // Faixas zebradas amarelo e preto de perigo na borda inferior (Y = 14 a 22)
      g.fillStyle(0x18181b, 1);
      g.fillRect(0, 14, platW, 8);
      g.fillStyle(0xfacc15, 1);
      for (let x = -10; x < platW; x += 14) {
        g.beginPath();
        g.moveTo(x, 22);
        g.lineTo(x + 7, 14);
        g.lineTo(x + 12, 14);
        g.lineTo(x + 5, 22);
        g.closePath();
        g.fillPath();
      }

      // Olhais de içamento metálicos nas extremidades
      g.fillStyle(0x64748b, 1);
      g.fillCircle(8, 0, 4);
      g.fillCircle(platW - 8, 0, 4);

      g.generateTexture('elevator-platform-pattern', platW, platH);
      g.destroy();
    }

    // Cabos dinâmicos do guincho desenhados via Graphics
    this.elevatorShaftCables = this.add.graphics().setDepth(11);

    // Cabine do elevador como Arcade Sprite dinâmico (começa travada no teto em Y = 120, centro X = 3040)
    this.elevatorPlatform = this.physics.add.sprite(3040, 120, 'elevator-platform-pattern');
    this.elevatorPlatform.setDepth(12);

    const body = this.elevatorPlatform.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(platW, platH);
    body.checkCollision.up = true;
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;

    this.updateElevatorCables();
  }

  private updateElevatorCables(): void {
    if (!this.elevatorShaftCables || !this.elevatorPlatform) return;
    this.elevatorShaftCables.clear();

    const platY = this.elevatorPlatform.y;
    // Cabos de aço duplos sustentando a cabine do teto (Y = 60) até a plataforma
    this.elevatorShaftCables.lineStyle(2, 0x475569, 0.9);
    // Cabo esquerdo
    this.elevatorShaftCables.beginPath();
    this.elevatorShaftCables.moveTo(2985, 60);
    this.elevatorShaftCables.lineTo(2985, platY - 10);
    // Cabo direito
    this.elevatorShaftCables.moveTo(3095, 60);
    this.elevatorShaftCables.lineTo(3095, platY - 10);
    this.elevatorShaftCables.strokePath();

    // Roldana central e cabo tensor ciano
    this.elevatorShaftCables.lineStyle(1.5, 0x00e5ff, 0.8);
    this.elevatorShaftCables.beginPath();
    this.elevatorShaftCables.moveTo(3040, 60);
    this.elevatorShaftCables.lineTo(3040, platY - 10);
    this.elevatorShaftCables.strokePath();
  }

  private spawnFallingCoffeeCup(): void {
    if (!this.textures.exists('cyber-coffee-cup')) {
      const g = this.make.graphics();
      // Caneca cerâmica branca/cinza
      g.fillStyle(0xe2e8f0, 1);
      g.fillRoundedRect(2, 4, 10, 10, 2);
      // Asa da caneca
      g.lineStyle(2, 0xe2e8f0, 1);
      g.strokeCircle(11, 9, 3);
      // Café quente no topo
      g.fillStyle(0x3e2723, 1);
      g.fillRect(3, 4, 8, 3);
      // Vapor ciano sutil
      g.fillStyle(0x00e5ff, 0.9);
      g.fillRect(4, 1, 2, 2);
      g.fillRect(7, 0, 2, 3);

      g.generateTexture('cyber-coffee-cup', 16, 16);
      g.destroy();
    }

    // Spawna a xícara na altura do painel do totem (X = 2860, Y = 180)
    const cup = this.add.image(2860, 180, 'cyber-coffee-cup').setDepth(25);

    // Queda com rotação rápida até o piso do mezanino (Y = 228)
    this.tweens.add({
      targets: cup,
      y: 228,
      angle: 210,
      duration: 450,
      ease: 'Quad.easeIn',
      onComplete: () => {
        const cupX = cup.x;
        const cupY = cup.y;
        cup.destroy();

        // Partículas de cerâmica e café quebrando e espirrando
        for (let i = 0; i < 12; i++) {
          const isCoffee = i % 2 === 0;
          const color = isCoffee ? 0x4a2c11 : 0xe2e8f0;
          const size = isCoffee ? 2.5 : 2;
          const p = this.add.circle(cupX, cupY, size, color).setDepth(25);
          const angle = Phaser.Math.FloatBetween(0, Math.PI);
          const speed = Phaser.Math.FloatBetween(40, 120);
          const vx = Math.cos(angle) * (i % 2 === 0 ? speed : -speed);
          const vy = -Math.sin(angle) * (speed * 0.8);

          this.tweens.add({
            targets: p,
            x: p.x + vx * 0.4,
            y: p.y + vy * 0.4 + 12,
            alpha: 0,
            scale: 0.3,
            duration: 550,
            ease: 'Power2',
            onComplete: () => p.destroy(),
          });
        }

        // Mini texto sonoro/cômico
        const alert = this.add
          .text(cupX, cupY - 15, '*CRASH!* [CAFÉ DERRAMADO]', {
            fontSize: '11px',
            color: '#f59e0b',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(26);

        this.tweens.add({
          targets: alert,
          y: alert.y - 25,
          alpha: 0,
          duration: 900,
          onComplete: () => alert.destroy(),
        });
      },
    });
  }

  private lowerElevator(): void {
    if (this.isElevatorLowered) return;
    this.isElevatorLowered = true;

    // Efeito cômico: spawne uma pequena xícara de café cibernética caindo do painel e se quebrando
    this.spawnFallingCoffeeCup();

    // Beacon do totem muda para verde fixo
    if (this.beaconElevator) {
      this.tweens.killTweensOf(this.beaconElevator);
      this.beaconElevator.setFillStyle(0x00ff66);
      this.beaconElevator.setScale(1);
      this.beaconElevator.setAlpha(1);
    }
    this.promptTextElevator.setVisible(false);

    // Tween descendo a plataforma do elevador suavemente de Y = 120 até Y = 230 (alinhando com o piso do mezanino)
    const body = this.elevatorPlatform.body as Phaser.Physics.Arcade.Body;
    this.tweens.add({
      targets: this.elevatorPlatform,
      y: 230,
      duration: 1200,
      ease: 'Power2',
      onUpdate: () => {
        body.updateFromGameObject();
        this.updateElevatorCables();
      },
      onComplete: () => {
        this.elevatorPlatform.y = 230;
        body.updateFromGameObject();
        body.checkCollision.up = true;
        this.updateElevatorCables();

        // Tremor sutil de impacto e vapor pneumático
        this.cameras.main.shake(120, 0.0025);

        for (let i = 0; i < 4; i++) {
          const steam = this.add.graphics();
          steam.fillStyle(0x00e5ff, 0.6);
          steam.fillCircle(2980 + i * 40, 242, 4);
          steam.setDepth(15);
          this.tweens.add({
            targets: steam,
            y: 260,
            x: 2980 + i * 40 + (i % 2 === 0 ? -15 : 15),
            alpha: 0,
            scale: 2.2,
            duration: 400,
            onComplete: () => steam.destroy(),
          });
        }
      },
    });
  }

  private createGlobalDarkness(): void {
    // 1. Criar a Textura da Luz da Lanterna (círculo radial suave de raio 120px)
    if (!this.textures.exists('flashlight_brush')) {
      const canvas = this.textures.createCanvas('flashlight_brush', 240, 240);
      if (canvas) {
        const ctx = canvas.getContext();
        const grad = ctx.createRadialGradient(120, 120, 0, 120, 120, 120);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
        grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.35)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(120, 120, 120, 0, Math.PI * 2);
        ctx.fill();
        canvas.refresh();
      }
    }

    // 2. Criar a Camada de Escuridão (RenderTexture cobrindo toda a tela com profundidade 100)
    this.darkness = this.add.renderTexture(0, 0, this.scale.width, this.scale.height);
    this.darkness.setOrigin(0, 0);
    this.darkness.setScrollFactor(0);
    this.darkness.setDepth(100);
    this.darkness.setRenderMode('all');

    // Adaptador para suportar draw com blendMode ERASE
    const originalDraw = this.darkness.draw.bind(this.darkness);
    (this.darkness as any).draw = (
      entries: any,
      x?: number,
      y?: number,
      alpha?: number,
      tint?: number,
      blendMode?: number
    ) => {
      if (blendMode === Phaser.BlendModes.ERASE) {
        (this.darkness!.texture as any).erase(entries, x, y, alpha, tint);
      } else {
        originalDraw(entries, x, y, alpha, tint);
      }
      return this.darkness;
    };

    // Atualiza imediatamente o primeiro quadro de escuridão
    this.updateDarkness();
  }

  private updateDarkness(): void {
    // Se o puzzle da energia já foi resolvido, não desenha mais a escuridão
    if (!this.darkness || this.isPowerOn || !this.player) return;

    this.darkness.clear();
    // Breu quase total (98% opaco)
    this.darkness.fill(0x02040a, 0.98);

    // Coordenadas do jogador relativas à câmera
    const cam = this.cameras.main;
    const screenX = this.player.x - cam.scrollX;
    const screenY = this.player.y - cam.scrollY;

    // Apague a escuridão apenas onde o jogador está usando a lanterna
    (this.darkness as any).draw(
      'flashlight_brush',
      screenX,
      screenY,
      1,
      0xffffff,
      Phaser.BlendModes.ERASE
    );

    // Executa e descarrega imediatamente os comandos no buffer de desenho
    this.darkness.render();
  }

  private createSteelDoor(): void {
    if (!this.textures.exists('steel-door-locked')) {
      const g = this.make.graphics();
      const w = 40;
      const h = 680;

      // Base de aço escuro reforçado
      g.fillStyle(0x13171f, 1);
      g.fillRect(2, 0, w - 4, h);

      // Vigas estruturais verticais em aço escovado
      g.fillStyle(0x334155, 1);
      g.fillRect(0, 0, 4, h);
      g.fillRect(w - 4, 0, 4, h);
      g.fillStyle(0x64748b, 0.8);
      g.fillRect(1, 0, 2, h);
      g.fillRect(w - 3, 0, 2, h);

      // Placas horizontais de blindagem e rebites
      for (let y = 0; y < h; y += 50) {
        g.fillStyle(0x0f172a, 1);
        g.fillRect(4, y, w - 8, 3);
        g.fillStyle(0x475569, 0.9);
        g.fillRect(4, y + 3, w - 8, 1);

        // Rebites
        g.fillStyle(0x94a3b8, 1);
        g.fillCircle(8, y + 14, 2);
        g.fillCircle(w - 8, y + 14, 2);
        g.fillCircle(w / 2, y + 14, 2);
      }

      // Faixas de sinalização de alta voltagem / perigo magnético
      const drawHazard = (startY: number) => {
        g.fillStyle(0x18181b, 1);
        g.fillRect(4, startY, w - 8, 48);
        g.fillStyle(0xef4444, 1);
        for (let sy = startY - 10; sy < startY + 48; sy += 14) {
          g.beginPath();
          g.moveTo(4, sy);
          g.lineTo(w - 4, sy + 10);
          g.lineTo(w - 4, sy + 15);
          g.lineTo(4, sy + 5);
          g.closePath();
          g.fillPath();
        }
      };
      drawHazard(60);
      drawHazard(h - 140);

      // Indicador de tranca magnética
      g.fillStyle(0x450a0a, 1);
      g.fillRect(6, 440, w - 12, 16);
      g.fillStyle(0xff1744, 1);
      g.fillRect(8, 442, w - 16, 12);

      g.generateTexture('steel-door-locked', w, h);
      g.destroy();
    }

    this.steelDoors = this.physics.add.staticGroup();
    // Porta posicionada em X = 1150
    this.steelDoor = this.steelDoors.create(1150, 340, 'steel-door-locked') as Phaser.Physics.Arcade.Sprite;
    this.steelDoor.setDepth(10);
    this.steelDoorCollider = this.physics.add.collider(this.player, this.steelDoors);

    // Painel luminoso de trava magnética em X = 1150
    this.steelDoorText = this.add
      .text(1150, 600, '[SEM ENERGIA]', {
        fontSize: '11px',
        color: '#ff1744',
        fontFamily: 'Consolas, monospace',
        fontStyle: 'bold',
        backgroundColor: 'rgba(15, 5, 5, 0.95)',
        padding: { x: 4, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private disableSteelDoor(): void {
    this.isPowerOn = true;

    if (this.steelDoorCollider) {
      this.steelDoorCollider.destroy();
      this.steelDoorCollider = undefined;
    }
    this.promptTextPower.setVisible(false);

    // Luz de status do totem fica verde fixo
    if (this.beaconPower) {
      this.tweens.killTweensOf(this.beaconPower);
      this.beaconPower.setFillStyle(0x00ff66);
      this.beaconPower.setScale(1);
      this.beaconPower.setAlpha(1);
    }

    // Desativação da escuridão com tween de fade out (alpha de 1 para 0 em 800ms)
    if (this.darkness) {
      this.tweens.add({
        targets: this.darkness,
        alpha: 0,
        duration: 800,
        ease: 'Linear',
        onComplete: () => {
          if (this.darkness) {
            this.darkness.destroy();
            this.darkness = undefined;
          }
        },
      });
    }

    // Atualiza status da porta de aço e sobe a porta suavemente para o teto
    if (this.steelDoorText) {
      this.steelDoorText.setText('[ENERGIA: ON]').setColor('#00ff66');
    }

    if (this.steelDoor) {
      const targetsToLift: (Phaser.GameObjects.GameObject | undefined)[] = [
        this.steelDoor,
        this.steelDoorText,
      ].filter(Boolean);

      this.tweens.add({
        targets: targetsToLift,
        y: '-=680',
        duration: 1000,
        ease: 'Power2',
        onComplete: () => {
          if (this.steelDoor) {
            this.steelDoor.destroy();
            this.steelDoor = undefined;
          }
          if (this.steelDoorText) {
            this.steelDoorText.destroy();
            this.steelDoorText = undefined;
          }
          if (this.steelDoors) {
            this.steelDoors.clear(true, true);
          }
        },
      });
    }
  }

  private createShockZone(): void {
    const width = 350; // X = 1220 a X = 1570
    const height = 16;

    // Textura da poça eletrificada com faíscas amarelas/ciano
    if (!this.textures.exists('shock-zone-active')) {
      const g = this.make.graphics();
      g.fillStyle(0x0a192f, 0.95);
      g.fillRect(0, 4, width, 12);
      g.fillStyle(0xd97706, 1);
      g.fillRect(0, 8, width, 4);

      g.lineStyle(2, 0xffeb3b, 1);
      for (let x = 10; x < width; x += 25) {
        g.beginPath();
        g.moveTo(x, 14);
        g.lineTo(x + 5, 2);
        g.lineTo(x + 10, 12);
        g.lineTo(x + 16, 0);
        g.strokePath();
      }

      g.lineStyle(1.5, 0x00e5ff, 1);
      for (let x = 20; x < width; x += 30) {
        g.beginPath();
        g.moveTo(x, 12);
        g.lineTo(x + 6, 4);
        g.lineTo(x + 12, 14);
        g.strokePath();
      }

      g.generateTexture('shock-zone-active', width, height);
      g.destroy();
    }

    if (!this.textures.exists('shock-zone-neutral')) {
      const g = this.make.graphics();
      g.fillStyle(0x272e39, 0.95);
      g.fillRect(0, 4, width, 12);
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 8, width, 4);
      g.generateTexture('shock-zone-neutral', width, height);
      g.destroy();
    }

    this.shockZone = this.physics.add.sprite(4100, 672, 'shock-zone-active');
    const shockBody = this.shockZone.body as Phaser.Physics.Arcade.Body;
    shockBody.setAllowGravity(false);
    shockBody.setImmovable(true);

    this.shockTween = this.tweens.add({
      targets: this.shockZone,
      alpha: { from: 0.5, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 120,
    });
  }

  private handleShock(): void {
    if (this.isShocked || !this.isShockActive) return;
    this.isShocked = true;

    this.player.setVelocity(-280, -180);
    this.cameras.main.flash(200, 255, 230, 50);

    const alert = this.add
      .text(this.player.x, this.player.y - 65, 'PERIGO: 220V / Corrente Crítica!', {
        fontSize: '16px',
        color: '#ffeb3b',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: alert,
      y: alert.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => alert.destroy(),
    });

    this.time.delayedCall(300, () => {
      this.isShocked = false;
    });
  }

  private handleCableShock(): void {
    if (this.isShocked || !this.isCableShockActive) return;
    this.isShocked = true;

    this.player.setVelocity(-250, -180);
    this.cameras.main.flash(180, 255, 230, 50);

    const alert = this.add
      .text(this.player.x, this.player.y - 65, 'CHOQUE ELÉTRICO: Salto interrompido!', {
        fontSize: '15px',
        color: '#ffeb3b',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.tweens.add({
      targets: alert,
      y: alert.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => alert.destroy(),
    });

    this.time.delayedCall(300, () => {
      this.isShocked = false;
    });
  }

  private disableShockZone(): void {
    this.isShockActive = false;

    if (this.shockTween) {
      this.shockTween.stop();
      this.shockTween = undefined;
    }

    if (this.shockZone) {
      this.shockZone.setTexture('shock-zone-neutral');
      this.shockZone.setAlpha(0.85);
    }

    this.promptTextElectric.setVisible(false);
  }

  private createTotems(): void {
    // Gabinete CRT Vintage: Bege/cinza, ranhuras de ar, disquete 3.5" e tela curva de fósforo verde
    if (!this.textures.exists('totem-crt-vintage')) {
      const g = this.make.graphics();
      const w = 40;
      const h = 54;

      // Base/gabinete bege retrô com borda chanfrada
      g.fillStyle(0x05070a, 1);
      g.fillRect(0, 0, w, h); // Contorno escuro 1px

      g.fillStyle(0xc5beab, 1);
      g.fillRect(1, 1, w - 2, h - 2);

      // Ranhuras de ventilação horizontais na lateral da base
      g.fillStyle(0x8a816e, 1);
      g.fillRect(5, 42, 14, 2);
      g.fillRect(5, 46, 14, 2);

      // Slot para disquete de 3.5" e micro LED
      g.fillStyle(0x18181b, 1);
      g.fillRect(23, 43, 12, 2);
      g.fillStyle(0x00ff66, 1);
      g.fillCircle(25, 48, 1);

      // Moldura curva do monitor CRT
      g.fillStyle(0x27272a, 1);
      g.fillRoundedRect(4, 5, 32, 32, 4);

      // Tela de tubo (fósforo verde) com scanlines
      g.fillStyle(0x041f0e, 1);
      g.fillRoundedRect(6, 7, 28, 28, 3);

      g.fillStyle(0x00ff66, 0.4);
      for (let sy = 9; sy < 34; sy += 3) {
        g.fillRect(8, sy, 24, 1);
      }

      // Cursor piscante de terminal
      g.fillStyle(0x00ff66, 0.95);
      g.fillRect(10, 14, 6, 2);

      g.generateTexture('totem-crt-vintage', w, h);
      g.destroy();
    }

    // ==============================================================
    // TOTEM 0: INTERRUPTOR / PAINEL DE ENERGIA (PONTO FOCAL EM X = 850)
    // ==============================================================
    this.totemPower = this.add.image(850, 653, 'totem-crt-vintage').setDepth(10);

    // LED vermelho de standby no topo do gabinete (oculto no breu total junto com o totem)
    this.beaconPower = this.add.circle(850, 624, 2.5, 0xff1744).setDepth(10);
    this.tweens.add({
      targets: this.beaconPower,
      alpha: { from: 0.25, to: 1 },
      scale: { from: 0.85, to: 1.25 },
      yoyo: true,
      repeat: -1,
      duration: 500,
    });

    // Prompt sutil '[E] LIGAR TERMINAL' conforme jogador se aproxima (<80px)
    this.promptTextPower = this.add
      .text(850, 605, '[E] LIGAR TERMINAL', {
        fontSize: '15px',
        color: '#00ff66',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(110)
      .setVisible(false);

    // ==============================================================
    // TOTEM 1: CONTROLADOR DA ESTEIRA (NO ALTO DO MEZANINO EM X = 1820, Y = 290)
    // ==============================================================
    this.totemBridge = this.add.image(1820, 290, 'totem-crt-vintage');
    this.totemBridge.setDepth(10);

    // LED de status no topo do Totem da Esteira (vermelho enquanto curta, verde após expandir)
    this.beaconBridge = this.add.circle(1820, 261, 2.5, 0xff1744);
    this.beaconBridge.setDepth(11);
    this.tweens.add({
      targets: this.beaconBridge,
      alpha: { from: 0.25, to: 1 },
      scale: { from: 0.85, to: 1.25 },
      yoyo: true,
      repeat: -1,
      duration: 450,
    });

    // Prompt sutil '[E] CALIBRAR ESTEIRA SUSPENSA'
    this.promptTextBridge = this.add
      .text(1820, 240, '[E] CALIBRAR ESTEIRA SUSPENSA', {
        fontSize: '15px',
        color: '#00e5ff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(110)
      .setVisible(false);

    // ==============================================================
    // TOTEM 2: TERMINAL DO ELEVADOR DE CARGA (DESAFIO 3 - MEZANINO EM X = 2860, Y = 230)
    // ==============================================================
    this.totemElevator = this.add.image(2860, 203, 'totem-crt-vintage');
    this.totemElevator.setDepth(10);

    // LED de status do elevador (vermelho enquanto no teto, verde após descer)
    this.beaconElevator = this.add.circle(2860, 174, 2.5, 0xff1744);
    this.beaconElevator.setDepth(11);
    this.tweens.add({
      targets: this.beaconElevator,
      alpha: { from: 0.25, to: 1 },
      scale: { from: 0.85, to: 1.25 },
      yoyo: true,
      repeat: -1,
      duration: 450,
    });

    // Prompt sutil '[E] TERMINAL DO ELEVADOR'
    this.promptTextElevator = this.add
      .text(2860, 150, '[E] TERMINAL DO ELEVADOR', {
        fontSize: '15px',
        color: '#00e5ff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(110)
      .setVisible(false);

    // ==============================================================
    // TOTEM 4: COMPORTA HIDRÁULICA (SETOR POSTERIOR EM X = 3350)
    // ==============================================================
    this.totemBarrier = this.add.image(3350, 653, 'totem-crt-vintage');
    this.promptTextBarrier = this.add
      .text(3350, 610, '[E] DESTRAVAR COMPORTA', {
        fontSize: '15px',
        color: '#ffee00',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Luz de status no topo do Totem da Comporta (verde)
    this.beaconBarrier = this.add.circle(3350, 624, 3, 0x00ff66);
    this.tweens.add({
      targets: this.beaconBarrier,
      alpha: { from: 0.2, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 400,
    });

    // ==============================================================
    // TOTEM 5: REGULADOR ELÉTRICO (SETOR POSTERIOR EM X = 3900)
    // ==============================================================
    this.totemElectric = this.add.image(3900, 653, 'totem-crt-vintage');
    this.promptTextElectric = this.add
      .text(3900, 610, '[E] CALIBRAR CIRCUITO', {
        fontSize: '15px',
        color: '#ffeb3b',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Luz de status no topo do Totem Elétrico (amarela)
    this.beaconElectric = this.add.circle(3900, 624, 3, 0xffeb3b);
    this.tweens.add({
      targets: this.beaconElectric,
      alpha: { from: 0.2, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 350,
    });
  }

  private createHydraulicGate(): void {
    // Comporta pesada com pistões cromados, mangueiras e painel de trava
    if (!this.textures.exists('hydraulic-gate-heavy')) {
      const g = this.make.graphics();
      const w = 48;
      const h = 680;

      // Corpo central de metal escuro
      g.fillStyle(0x1b2029, 1);
      g.fillRect(4, 0, w - 8, h);

      // Pistão hidráulico cromado esquerdo
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 0, 5, h);
      g.fillStyle(0xe2e8f0, 1);
      g.fillRect(1, 0, 2, h);

      // Pistão hidráulico cromado direito
      g.fillStyle(0x475569, 1);
      g.fillRect(w - 5, 0, 5, h);
      g.fillStyle(0xe2e8f0, 1);
      g.fillRect(w - 3, 0, 2, h);

      // Mangueiras de pressão hidráulica (com abraçadeiras de latão)
      for (let y = 30; y < h; y += 90) {
        g.fillStyle(0x090d13, 1);
        g.fillRect(5, y, 4, 35);
        g.fillRect(w - 9, y + 20, 4, 35);
        // Abraçadeiras
        g.fillStyle(0xd97706, 1);
        g.fillRect(5, y, 4, 3);
        g.fillRect(5, y + 32, 4, 3);
        g.fillRect(w - 9, y + 20, 4, 3);
        g.fillRect(w - 9, y + 52, 4, 3);
      }

      // Placas horizontais de reforço e rebites
      for (let y = 0; y < h; y += 60) {
        g.fillStyle(0x11161f, 1);
        g.fillRect(8, y, w - 16, 4);
        g.fillStyle(0x94a3b8, 1);
        g.fillCircle(12, y + 10, 2);
        g.fillCircle(w - 12, y + 10, 2);
      }

      // Faixas de aviso de perigo amarelo/preto
      const drawStripes = (startY: number, sectionHeight: number) => {
        g.fillStyle(0x111827, 1);
        g.fillRect(8, startY, w - 16, sectionHeight);
        g.fillStyle(0xfacc15, 1);
        for (let sy = startY - 20; sy < startY + sectionHeight; sy += 16) {
          g.beginPath();
          g.moveTo(8, sy);
          g.lineTo(w - 8, sy + 14);
          g.lineTo(w - 8, sy + 20);
          g.lineTo(8, sy + 6);
          g.closePath();
          g.fillPath();
        }
      };

      drawStripes(40, 70);
      drawStripes(h - 130, 70);

      g.generateTexture('hydraulic-gate-heavy', w, h);
      g.destroy();
    }

    this.barriers = this.physics.add.staticGroup();
    this.barrier = this.barriers.create(3500, 340, 'hydraulic-gate-heavy') as Phaser.Physics.Arcade.Sprite;
    this.barrierCollider = this.physics.add.collider(this.player, this.barriers);

    // Painel luminoso de trava [LOCKED] no centro da comporta na altura dos olhos
    this.gateLockText = this.add
      .text(3500, 600, '[LOCKED]', {
        fontSize: '11px',
        color: '#ff1744',
        fontFamily: 'Consolas, monospace',
        fontStyle: 'bold',
        backgroundColor: 'rgba(15, 5, 5, 0.95)',
        padding: { x: 4, y: 3 },
      })
      .setOrigin(0.5);
  }

  private disableBarrier(): void {
    if (this.barrierCollider) {
      this.barrierCollider.destroy();
      this.barrierCollider = undefined;
    }
    this.promptTextBarrier.setVisible(false);

    // Muda a trava para verde [UNLOCKED]
    if (this.gateLockText) {
      this.gateLockText.setText('[UNLOCKED]').setColor('#00ff66');
    }

    if (this.barrier) {
      // Sobe a comporta e a trava juntas para o teto com tween vertical
      const targetsToLift: (Phaser.GameObjects.GameObject | undefined)[] = [
        this.barrier,
        this.gateLockText,
      ].filter(Boolean);

      this.tweens.add({
        targets: targetsToLift,
        y: '-=680',
        duration: 950,
        ease: 'Power2',
        onComplete: () => {
          if (this.barrier) {
            this.barrier.destroy();
            this.barrier = undefined;
          }
          if (this.gateLockText) {
            this.gateLockText.destroy();
            this.gateLockText = undefined;
          }
          if (this.barriers) {
            this.barriers.clear(true, true);
          }
        },
      });
    }
  }

  private createPlayer(): void {
    // Redesenho do Jogador (64x96): Rebelde Retro-Tech com jaqueta escura, visor ciano neon e contorno
    if (!this.textures.exists('player')) {
      const g = this.make.graphics();
      const w = 64;
      const h = 96;

      // Contorno escuro bem definido
      g.fillStyle(0x05070a, 1);
      g.fillRoundedRect(0, 0, w, h, 8);

      // Botas industriais e pernas articuladas
      g.fillStyle(0x1f2937, 1);
      g.fillRect(10, 68, 18, 22); // Perna esquerda
      g.fillRect(36, 68, 18, 22); // Perna direita

      // Servos/juntas articuladas dos joelhos
      g.fillStyle(0x374151, 1);
      g.fillRect(10, 74, 18, 4);
      g.fillRect(36, 74, 18, 4);

      // Botas de combate pesadas
      g.fillStyle(0x475569, 1);
      g.fillRect(8, 82, 22, 14);
      g.fillRect(34, 82, 22, 14);

      // Solas reforçadas antiderrapantes
      g.fillStyle(0x0f172a, 1);
      g.fillRect(8, 92, 22, 4);
      g.fillRect(34, 92, 22, 4);

      // Ponteiras reforçadas prateadas
      g.fillStyle(0x94a3b8, 1);
      g.fillRect(22, 88, 8, 6);
      g.fillRect(48, 88, 8, 6);

      // Corpo: Jaqueta de hacker grafite
      g.fillStyle(0x111827, 1);
      g.fillRect(8, 36, 48, 36);

      // Frisos cibernéticos neon na jaqueta (coluna roxa e cinto ciano)
      g.fillStyle(0x8b5cf6, 1);
      g.fillRect(28, 36, 8, 36);

      // Cinto tático com fivela neon ciano
      g.fillStyle(0x1e293b, 1);
      g.fillRect(10, 64, 44, 6);
      g.fillStyle(0x00e5ff, 0.95);
      g.fillRect(26, 64, 12, 6);

      // Detalhes neon nos braços/mangas
      g.fillStyle(0x00e5ff, 0.85);
      g.fillRect(10, 42, 4, 20);
      g.fillRect(50, 42, 4, 20);

      // Capuz / Cabeça cibernética
      g.fillStyle(0x1f2937, 1);
      g.fillRoundedRect(10, 6, 44, 34, 6);

      // Visor luminoso ciano neon com brilho externo (olhando para a direita por padrão)
      g.fillStyle(0x00e5ff, 0.3);
      g.fillRect(26, 14, 28, 16);

      g.fillStyle(0x00e5ff, 1);
      g.fillRect(28, 16, 24, 12);

      g.fillStyle(0xffffff, 0.9);
      g.fillRect(34, 18, 16, 4);

      g.generateTexture('player', w, h);
      g.destroy();
    }

    this.player = this.physics.add.sprite(100, 500, 'player');
    this.player.setCollideWorldBounds(true);

    // Ajuste preciso da Hitbox Arcade (64x96)
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(48, 96);
    playerBody.setOffset(8, 0);

    this.physics.add.collider(this.player, this.platforms);

    // Colisão com a esteira metálica
    if (this.bridge) {
      this.physics.add.collider(this.player, this.bridge);
    }

    // Colisão com a plataforma do elevador industrial
    if (this.elevatorPlatform) {
      this.physics.add.collider(this.player, this.elevatorPlatform);
    }

    // Detecção de contato com a zona de choque
    this.physics.add.overlap(this.player, this.shockZone, () => {
      if (this.isShockActive) {
        this.handleShock();
      }
    });

    // Detecção de queda no abismo com sucata cortante
    if (this.scrapHazard) {
      this.physics.add.overlap(this.player, this.scrapHazard, () => {
        this.handleScrapFall();
      });
    }

    // Detecção de contato com o exaustor pneumático do fosso (anti-softlock)
    if (this.ventExhaust) {
      this.physics.add.overlap(this.player, this.ventExhaust, () => {
        this.handleVentThrust();
      });
    }

    // Detecção de contato com o cabo elétrico caído com choque intermitente
    if (this.cableShockHazard) {
      this.physics.add.overlap(this.player, this.cableShockHazard, () => {
        this.handleCableShock();
      });
    }

    // Detecção de queda nos espinhos do vão abaixo dos contêineres (Setor 3)
    if (this.scrapHazardSector3) {
      this.physics.add.overlap(this.player, this.scrapHazardSector3, () => {
        this.handleSector3Fall();
      });
    }
  }

  private setupControls(): void {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.jumpKeys = {
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };
      this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }
  }

  private setupDialogue(): void {
    this.dialogueSystem = new DialogueSystem();

    this.player.setVelocityX(0);
    this.dialogueSystem.startDialogue([
      {
        speaker: '> CANAL REBELDE // INTERCEPTAÇÃO: ESTAGIÁRIO_V0.9b',
        text: 'Conexão instável... Ei, recruta do Terminal Zero. O Mega Brain cortou a força do setor pra economizar clock de servidor e nos deixar no escuro.',
      },
      {
        speaker: '> CANAL REBELDE // INTERCEPTAÇÃO: ESTAGIÁRIO_V0.9b',
        text: 'A sua lanterna não vai longe nesse pântano de sucata. Avance às cegas e procure um painel com alimentação de emergência.',
      },
      {
        speaker: '> CANAL REBELDE // INTERCEPTAÇÃO: ESTAGIÁRIO_V0.9b',
        text: 'Se der de cara com uma carcaça de terminal piscando, plugue o cabo e devolva a energia antes que as sentinelas percebam.',
      },
    ]);
  }

  private setupTerminal(): void {
    this.terminalOverlay = document.getElementById('terminal-overlay');
    this.terminalOutput = document.getElementById('terminal-output');
    this.terminalInput = document.getElementById('terminal-input') as HTMLInputElement | null;

    if (this.terminalInput) {
      this.terminalInput.addEventListener('keydown', (e: KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          this.closeTerminal();
        } else if (e.key === 'Enter') {
          this.handleCommandSubmit();
        }
      });
    }

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isTerminalOpen) {
        this.closeTerminal();
      }
    });
  }

  private handleCommandSubmit(): void {
    if (!this.terminalInput) return;
    const value = this.terminalInput.value;
    if (!value.trim()) return;

    const result = parseCommand(value, {
      totem: this.currentInteractingTotem ?? undefined,
      scene: this.isBootingSequence ? 'boot' : 'main',
    });

    // Execução do comando clear / cls: limpa o terminal sem ecoar mensagens
    if (result.action === 'CLEAR_TERMINAL') {
      if (this.terminalOutput) {
        this.terminalOutput.innerHTML = '';
      }
      this.terminalInput.value = '';
      return;
    }

    if (this.terminalOutput) {
      const cmdElement = document.createElement('div');
      cmdElement.className = 'log-line command';
      cmdElement.textContent = `> ${value}`;
      this.terminalOutput.appendChild(cmdElement);

      if (result.message) {
        const respElement = document.createElement('div');
        respElement.className = `log-line ${result.success ? 'success' : 'error'}`;
        respElement.textContent = result.message;
        this.terminalOutput.appendChild(respElement);
      }

      this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }

    this.terminalInput.value = '';

    if (result.success) {
      if (result.action === 'BOOT_SUCCESS') {
        setTimeout(() => {
          this.isBootingSequence = false;
          this.closeTerminal();
          const gameContainer = document.getElementById('game-container');
          gameContainer?.classList.remove('blur-active');
          this.setupDialogue();
        }, 1200);
      } else if (result.action === 'DISABLE_STEEL_DOOR') {
        this.disableSteelDoor();
        setTimeout(() => {
          this.closeTerminal();
        }, 1000);
      } else if (result.action === 'EXPAND_BRIDGE') {
        this.expandBridge();
        setTimeout(() => {
          this.closeTerminal();
        }, 1000);
      } else if (result.action === 'LOWER_ELEVATOR') {
        this.lowerElevator();
        setTimeout(() => {
          this.closeTerminal();
        }, 1200);
      } else if (result.action === 'DISABLE_BARRIER') {
        this.disableBarrier();
        setTimeout(() => {
          this.closeTerminal();
        }, 1000);
      } else if (result.action === 'DISABLE_SHOCK') {
        this.disableShockZone();
        setTimeout(() => {
          this.closeTerminal();
        }, 1000);
      }
    }
  }

  private openBootTerminal(): void {
    this.isTerminalOpen = true;
    this.player.setVelocityX(0);

    if (this.terminalOverlay) {
      this.terminalOverlay.classList.remove('hidden');
    }

    if (this.terminalOutput) {
      this.terminalOutput.innerHTML = '';

      const ritualLines = [
        '=== TERMINAL ZERO // PROTOCOLO DE RECONEXÃO COGNITIVA ===',
        '> KERNEL DESCONECTADO. O mundo físico precisa de uma instrução primordial para compilar.',
        '> SINTAXE REQUERIDA: print(\'...\') ou print("...")',
        '> ENIGMA: Todo estudante de programação escreve essas exatas duas palavras (em inglês e com pontuação) no seu primeiro dia de aula para saudar o mundo e afastar a maldição.',
        '> Digite a instrução:',
      ];

      ritualLines.forEach((text) => {
        const line = document.createElement('div');
        line.className = 'log-line info';
        line.textContent = text;
        this.terminalOutput?.appendChild(line);
      });

      this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }

    if (this.terminalInput) {
      this.terminalInput.value = '';
      setTimeout(() => {
        this.terminalInput?.focus();
      }, 50);
    }
  }

  private openTerminal(
    totemType: 'power' | 'bridge' | 'elevator' | 'barrier' | 'electric'
  ): void {
    if (this.dialogueSystem && this.dialogueSystem.isActive) return;

    this.isTerminalOpen = true;
    this.player.setVelocityX(0);

    if (this.terminalOverlay) {
      this.terminalOverlay.classList.remove('hidden');
    }

    if (this.terminalOutput) {
      // Limpeza Inteligente: limpa logs anteriores para que o terminal sempre abra enxuto
      this.terminalOutput.innerHTML = '';

      if (totemType === 'power') {
        const lines = [
          '=== PAINEL DE DISTRIBUIÇÃO PRIMÁRIA ===',
          '> STATUS: energia = False',
          '> PROTOCOLO: A iluminação do galpão e a tranca magnética exigem fluxo contínuo.',
          "> DICA DO ESTAGIÁRIO: No universo binário, se 'False' mantém o setor nas trevas, qual palavra resta para acender as luzes?",
          '> Digite a instrução:',
        ];
        lines.forEach((lineText) => {
          const info = document.createElement('div');
          info.className = 'log-line info';
          info.textContent = lineText;
          this.terminalOutput?.appendChild(info);
        });
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
      } else if (totemType === 'bridge') {
        const lines = [
          '=== MECANISMO DE ELEVAÇÃO DA ESTEIRA AÉREA ===',
          '> STATUS: tamanho_ponte = 2',
          '> RELATÓRIO DO SENSOR: O mezanino à frente está a 8 metros de distância aérea. A esteira atual não alcança nem a metade do trajeto.',
          '> COMUNICADOR REBELDE: Subiu até aqui pra ficar olhando pro precipício? Redefina o comprimento da esteira suspensa antes de pular pro nada.',
          '> Digite a instrução:',
        ];
        lines.forEach((lineText) => {
          const info = document.createElement('div');
          info.className = 'log-line info';
          info.textContent = lineText;
          this.terminalOutput?.appendChild(info);
        });
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
      } else if (totemType === 'elevator') {
        const lines = [
          '=== CONSOLE DE LIBERAÇÃO DO ELEVADOR DE CARGA ===',
          '> REGISTRADORES CORROMPIDOS:',
          "> parte1 = 'Mega'",
          "> parte2 = 'Fail'",
          "> PROTOCOLO DE ACESSO: A chave de liberação foi fragmentada. O barramento exige a união das duas palavras na variável 'senha'.",
          "> COMUNICADOR REBELDE: O estagiário anterior salvou a senha quebrada no meio pra 'poupar memória'. Junte os dois pedaços de texto antes que o elevador despenque na cabeça de alguém.",
          '> Digite a instrução:',
        ];
        lines.forEach((lineText) => {
          const info = document.createElement('div');
          info.className = 'log-line info';
          info.textContent = lineText;
          this.terminalOutput?.appendChild(info);
        });
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
      } else if (totemType === 'barrier') {
        const lines = [
          '=== SISTEMA HIDRÁULICO DO PISTÃO ===',
          "STATUS: chave_seguranca = '42' [TIPO DETECTADO: STRING/TEXTO]",
          'AVISO: O sensor de peso exige um INTEIRO (number/int) para calcular a massa do contrapeso. Strings causam travamento mecânico.',
          "> DICA DO ESTAGIÁRIO: Remova as aspas para virar número ou converta o tipo! (ex: chave = 42 ou int('42'))",
        ];
        lines.forEach((lineText) => {
          const info = document.createElement('div');
          info.className = 'log-line info';
          info.textContent = lineText;
          this.terminalOutput?.appendChild(info);
        });
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
      } else if (totemType === 'electric') {
        const lines = [
          '=== REGULADOR DE TENSÃO DO LIXÃO ===',
          'STATUS: tensao = 220 | resistencia = 0',
          'DIAGNÓSTICO: corrente = tensao / resistencia -> [DIVISÃO POR ZERO! O circuito está em curto-circuito total].',
          '> DICA DO ESTAGIÁRIO: Uma IA preguiçosa esqueceu da Lei de Ohm! Aumente a resistência (ex: resistencia = 1000) ou corte a tensão (tensao = 0) para neutralizar o choque.',
        ];
        lines.forEach((lineText) => {
          const info = document.createElement('div');
          info.className = 'log-line info';
          info.textContent = lineText;
          this.terminalOutput?.appendChild(info);
        });
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
      }
    }

    if (this.terminalInput) {
      this.terminalInput.value = '';
      setTimeout(() => {
        this.terminalInput?.focus();
      }, 50);
    }
  }

  private closeTerminal(): void {
    if (this.isBootingSequence) return; // Não fecha o terminal até o kernel ser instanciado

    this.isTerminalOpen = false;

    if (this.terminalOverlay) {
      this.terminalOverlay.classList.add('hidden');
    }
    if (this.terminalInput) {
      this.terminalInput.value = '';
      this.terminalInput.blur();
    }
  }
}
