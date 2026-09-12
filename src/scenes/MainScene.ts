import Phaser from 'phaser';
import { parseCommand } from '../utils/CommandParser';
import { DialogueSystem } from '../utils/DialogueSystem';

export class MainScene extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;

  // Totem 1 (Comporta Hidráulica)
  private totemBarrier!: Phaser.GameObjects.Image;
  private promptTextBarrier!: Phaser.GameObjects.Text;
  private beaconBarrier!: Phaser.GameObjects.Arc;

  // Totem 2 (Regulador Elétrico)
  private totemElectric!: Phaser.GameObjects.Image;
  private promptTextElectric!: Phaser.GameObjects.Text;
  private beaconElectric!: Phaser.GameObjects.Arc;

  private currentInteractingTotem: 'barrier' | 'electric' | null = null;

  // Comporta Hidráulica
  private barriers!: Phaser.Physics.Arcade.StaticGroup;
  private barrier?: Phaser.Physics.Arcade.Sprite;
  private barrierCollider?: Phaser.Physics.Arcade.Collider;
  private gateLockText?: Phaser.GameObjects.Text;

  // Zona de Choque Elétrico (X = 1000 a 1350)
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
  private jumpForce: number = 450;

  private isTerminalOpen: boolean = false;
  private terminalOverlay: HTMLElement | null = null;
  private terminalOutput: HTMLElement | null = null;
  private terminalInput: HTMLInputElement | null = null;

  private dialogueSystem!: DialogueSystem;

  constructor() {
    super('MainScene');
  }

  create(): void {
    // 1. Expansão do Mundo da MainScene para 2560 pixels
    this.physics.world.setBounds(0, 0, 2560, 720);
    this.cameras.main.setBounds(0, 0, 2560, 720);
    this.cameras.main.setBackgroundColor('#070b12');

    this.createScenery();
    this.createGround();
    this.createShockZone();
    this.createTotems();
    this.createPlayer();
    this.createHydraulicGate();
    this.setupControls();
    this.setupTerminal();
    this.setupDialogue();

    // Câmera segue o jogador suavemente
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  update(): void {
    if (!this.player || !this.player.body) return;

    // Se o diálogo estiver ativo, trava totalmente o jogador e esconde prompts
    if (this.dialogueSystem && this.dialogueSystem.isActive) {
      this.promptTextBarrier.setVisible(false);
      this.promptTextElectric.setVisible(false);
      this.player.setVelocityX(0);
      return;
    }

    // Se o jogador estiver em estado de choque (knockback ativo por 0.3s)
    if (this.isShocked) {
      return;
    }

    // Checagem de proximidade dos totens
    const distBarrier = Math.abs(this.player.x - this.totemBarrier.x);
    const isNearBarrierTotem = distBarrier < 80;
    this.promptTextBarrier.setVisible(
      isNearBarrierTotem && !this.isTerminalOpen && Boolean(this.barrier)
    );

    const distElectric = Math.abs(this.player.x - this.totemElectric.x);
    const isNearElectricTotem = distElectric < 80;
    this.promptTextElectric.setVisible(
      isNearElectricTotem && !this.isTerminalOpen && this.isShockActive
    );

    // Identifica com qual totem o jogador está interagindo
    if (isNearElectricTotem && this.isShockActive) {
      this.currentInteractingTotem = 'electric';
    } else if (isNearBarrierTotem && this.barrier) {
      this.currentInteractingTotem = 'barrier';
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
      this.player.setVelocityX(-200);
      this.player.setFlipX(true); // Olha para a esquerda
    } else if (isRightDown) {
      this.player.setVelocityX(200);
      this.player.setFlipX(false); // Olha para a direita
    } else {
      this.player.setVelocityX(0);
    }

    // Pulo estilo Mega Man
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
    const cutThreshold = -150;
    if (!isJumpDown && this.player.body.velocity.y < cutThreshold) {
      this.player.setVelocityY(cutThreshold);
    }
  }

  private createScenery(): void {
    // 1. Céu com degradê do azul-petróleo profundo #070b12 no topo até #141b26 na base (cobertura ampla para ultrawide)
    if (!this.textures.exists('cyberpunk-sky')) {
      const g = this.make.graphics();
      const skyW = 3800;
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
    this.add.image(1300, 360, 'cyberpunk-sky').setDepth(-10);

    // 2. Elementos de cenário estáticos de fundo (Lixão dos Scripts Esquecidos)
    const bgGraphics = this.add.graphics().setDepth(-5);

    // Cabos industriais pendurados descendo do teto cobrindo toda a extensão horizontal
    bgGraphics.lineStyle(2, 0x0c141e, 0.9);
    const cableXs = [
      -40, 100, 240, 420, 580, 760, 940, 1120, 1300, 1480, 1660, 1840, 2020, 2200, 2380, 2560, 2740, 2920,
    ];
    cableXs.forEach((cx) => {
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
    });

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
    // Piso Industrial Reforçado: metal com costuras, parafusos/rebites e borda desgastada (estendido para ultrawide)
    if (!this.textures.exists('ground-industrial')) {
      const g = this.make.graphics();
      const w = 3800;
      const h = 200;

      // Base metálica escura preenchendo até o fundo
      g.fillStyle(0x19212c, 1);
      g.fillRect(0, 0, w, h);

      // Borda superior metálica chanfrada e desgastada
      g.fillStyle(0x4b5563, 1);
      g.fillRect(0, 0, w, 4);
      g.fillStyle(0x9ca3af, 0.85);
      g.fillRect(0, 0, w, 1);

      // Placas de metal industriais a cada 80px
      for (let x = 0; x < w; x += 80) {
        // Costura / junta de solda
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

      g.generateTexture('ground-industrial', w, h);
      g.destroy();
    }

    this.platforms = this.physics.add.staticGroup();
    // Centro X = 1500, Y = 780 (com altura 200, a superfície do piso permanece em Y = 680)
    this.platforms.create(1500, 780, 'ground-industrial');
  }

  private createShockZone(): void {
    const width = 350; // X = 1000 a X = 1350
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

    this.shockZone = this.physics.add.sprite(1175, 672, 'shock-zone-active');
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

    this.player.setVelocity(-250, -150);
    this.cameras.main.flash(200, 255, 230, 50);

    const alert = this.add
      .text(this.player.x, this.player.y - 45, 'PERIGO: 220V / Corrente Crítica!', {
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

    // Totem 1: Comporta Hidráulica (X = 520, Y = 653)
    this.totemBarrier = this.add.image(520, 653, 'totem-crt-vintage');
    this.promptTextBarrier = this.add
      .text(520, 610, '[E] DESTRAVAR COMPORTA', {
        fontSize: '15px',
        color: '#ffee00',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Luz de status no topo do Totem 1 (verde)
    this.beaconBarrier = this.add.circle(520, 624, 3, 0x00ff66);
    this.tweens.add({
      targets: this.beaconBarrier,
      alpha: { from: 0.2, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 400,
    });

    // Totem 2: Regulador Elétrico (X = 920, Y = 653)
    this.totemElectric = this.add.image(920, 653, 'totem-crt-vintage');
    this.promptTextElectric = this.add
      .text(920, 610, '[E] CALIBRAR CIRCUITO', {
        fontSize: '15px',
        color: '#ffeb3b',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Luz de status no topo do Totem 2 (amarela)
    this.beaconElectric = this.add.circle(920, 624, 3, 0xffeb3b);
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
    this.barrier = this.barriers.create(650, 340, 'hydraulic-gate-heavy') as Phaser.Physics.Arcade.Sprite;
    this.barrierCollider = this.physics.add.collider(this.player, this.barriers);

    // Painel luminoso de trava [LOCKED] no centro da comporta na altura dos olhos
    this.gateLockText = this.add
      .text(650, 600, '[LOCKED]', {
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
    // Redesenho do Jogador: Rebelde Retro-Tech com jaqueta escura, visor ciano neon e contorno de 1px
    if (!this.textures.exists('player')) {
      const g = this.make.graphics();
      const w = 32;
      const h = 48;

      // 1px contorno escuro bem definido
      g.fillStyle(0x05070a, 1);
      g.fillRoundedRect(0, 0, w, h, 4);

      // Botas industriais e pernas articuladas
      g.fillStyle(0x1f2937, 1);
      g.fillRect(5, 34, 9, 11); // Perna esquerda
      g.fillRect(18, 34, 9, 11); // Perna direita
      // Botas pesadas
      g.fillStyle(0x475569, 1);
      g.fillRect(4, 41, 11, 6);
      g.fillRect(17, 41, 11, 6);

      // Corpo: Jaqueta de hacker grafite com detalhes neon
      g.fillStyle(0x111827, 1);
      g.fillRect(4, 18, 24, 18);

      // Frisos cibernéticos neon na jaqueta (roxo e ciano)
      g.fillStyle(0x8b5cf6, 1);
      g.fillRect(14, 18, 4, 18);
      g.fillStyle(0x00e5ff, 0.85);
      g.fillRect(6, 32, 20, 2);

      // Capuz / Cabeça cibernética
      g.fillStyle(0x1f2937, 1);
      g.fillRoundedRect(5, 3, 22, 17, 3);

      // Visor luminoso ciano neon (voltado para a direita por padrão)
      g.fillStyle(0x00e5ff, 1);
      g.fillRect(14, 8, 12, 6);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(17, 9, 8, 2);

      g.generateTexture('player', w, h);
      g.destroy();
    }

    this.player = this.physics.add.sprite(100, 500, 'player');
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms);

    // Detecção de contato com a zona de choque
    this.physics.add.overlap(this.player, this.shockZone, () => {
      if (this.isShockActive) {
        this.handleShock();
      }
    });
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
        speaker: 'O ESTAGIÁRIO FANTASMA',
        avatar: '👻',
        text: 'Ei! Carne nova no ferro-velho! Cuidado onde pisa, o chão aqui é 90% cabos desencapados e 10% código descartado por alucinação de IA.',
      },
      {
        speaker: 'O ESTAGIÁRIO FANTASMA',
        avatar: '👻',
        text: 'O Mega Brain trancou a comporta hidráulica logo à frente. O estagiário da IA declarou a chave como uma string em vez de inteiro e foi tomar café.',
      },
      {
        speaker: 'O ESTAGIÁRIO FANTASMA',
        avatar: '👻',
        text: 'Aperte [E] no terminal da esteira. Se você não souber a diferença entre um texto e um número, estamos todos fritos.',
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
      if (result.action === 'DISABLE_BARRIER') {
        this.disableBarrier();
      } else if (result.action === 'DISABLE_SHOCK') {
        this.disableShockZone();
      }

      setTimeout(() => {
        this.closeTerminal();
      }, 1000);
    }
  }

  private openTerminal(totemType: 'barrier' | 'electric'): void {
    if (this.dialogueSystem && this.dialogueSystem.isActive) return;

    this.isTerminalOpen = true;
    this.player.setVelocityX(0);

    if (this.terminalOverlay) {
      this.terminalOverlay.classList.remove('hidden');
    }

    if (this.terminalOutput) {
      // Limpeza Inteligente: limpa logs anteriores para que o terminal sempre abra enxuto
      this.terminalOutput.innerHTML = '';

      if (totemType === 'barrier') {
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
