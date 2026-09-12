import Phaser from 'phaser';
import { parseCommand } from '../utils/CommandParser';
import { DialogueSystem } from '../utils/DialogueSystem';

export class MainScene extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;

  // Totem 1 (Comporta Hidráulica)
  private totemBarrier!: Phaser.GameObjects.Image;
  private promptTextBarrier!: Phaser.GameObjects.Text;

  // Totem 2 (Regulador Elétrico)
  private totemElectric!: Phaser.GameObjects.Image;
  private promptTextElectric!: Phaser.GameObjects.Text;

  private currentInteractingTotem: 'barrier' | 'electric' | null = null;

  private barriers!: Phaser.Physics.Arcade.StaticGroup;
  private barrier?: Phaser.Physics.Arcade.Sprite;
  private barrierCollider?: Phaser.Physics.Arcade.Collider;

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
    this.cameras.main.setBackgroundColor('#10141d');

    // 1. Expansão do Mundo da MainScene para 2560 pixels
    this.physics.world.setBounds(0, 0, 2560, 720);
    this.cameras.main.setBounds(0, 0, 2560, 720);

    // Marcador visual na margem segura após o obstáculo elétrico
    this.add
      .text(1650, 580, '✓ ZONA SEGURA: CIRCUITO ULTRAPASSADO', {
        fontSize: '18px',
        color: '#00ff88',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

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

    // Movimentação horizontal
    const isLeftDown =
      (this.cursors?.left.isDown ?? false) ||
      (this.wasdKeys?.left.isDown ?? false);
    const isRightDown =
      (this.cursors?.right.isDown ?? false) ||
      (this.wasdKeys?.right.isDown ?? false);

    if (isLeftDown) {
      this.player.setVelocityX(-200);
    } else if (isRightDown) {
      this.player.setVelocityX(200);
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

  private createGround(): void {
    // Piso contínuo por toda a extensão do mundo (2560px)
    if (!this.textures.exists('ground-full')) {
      const g = this.make.graphics();
      g.fillStyle(0x18202c, 1);
      g.fillRect(0, 0, 2560, 40);
      g.fillStyle(0x00ff88, 1);
      g.fillRect(0, 0, 2560, 3);
      g.generateTexture('ground-full', 2560, 40);
      g.destroy();
    }

    this.platforms = this.physics.add.staticGroup();
    // Centro X = 1280, Y = 700 (superfície do piso em Y = 680)
    this.platforms.create(1280, 700, 'ground-full');
  }

  private createShockZone(): void {
    const width = 350; // X = 1000 a X = 1350
    const height = 16;

    // Textura da poça eletrificada com faíscas amarelas/ciano
    if (!this.textures.exists('shock-zone-active')) {
      const g = this.make.graphics();
      // Poça condutora escura
      g.fillStyle(0x0a192f, 0.95);
      g.fillRect(0, 4, width, 12);
      // Fios de cobre desencapados
      g.fillStyle(0xd97706, 1);
      g.fillRect(0, 8, width, 4);

      // Faíscas elétricas em zigue-zague amarelo e ciano
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

    // Textura neutra e inofensiva após estabilizar
    if (!this.textures.exists('shock-zone-neutral')) {
      const g = this.make.graphics();
      g.fillStyle(0x272e39, 0.95);
      g.fillRect(0, 4, width, 12);
      g.fillStyle(0x475569, 1);
      g.fillRect(0, 8, width, 4);
      g.generateTexture('shock-zone-neutral', width, height);
      g.destroy();
    }

    // Centro X = 1175, apoiado sobre a superfície do piso em Y = 680 (centro Y = 672)
    this.shockZone = this.physics.add.sprite(1175, 672, 'shock-zone-active');
    const shockBody = this.shockZone.body as Phaser.Physics.Arcade.Body;
    shockBody.setAllowGravity(false);
    shockBody.setImmovable(true);

    // Efeito de faíscas elétricas piscando suavemente (alpha via tween)
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

    // Knockback horizontal para trás e impulso vertical leve
    this.player.setVelocity(-250, -150);

    // Flash amarelo na tela
    this.cameras.main.flash(200, 255, 230, 50);

    // Alerta temporário na tela
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

    // Perde controle por 0.3s
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
    if (!this.textures.exists('totem')) {
      const g = this.make.graphics();
      g.fillStyle(0x00ff66, 1);
      g.fillRect(0, 0, 32, 48);
      g.fillStyle(0x0a1410, 1);
      g.fillRect(4, 6, 24, 20);
      g.fillStyle(0x00ff66, 0.9);
      g.fillRect(6, 10, 12, 2);
      g.fillRect(6, 14, 16, 2);
      g.fillRect(6, 18, 8, 2);
      g.generateTexture('totem', 32, 48);
      g.destroy();
    }

    if (!this.textures.exists('totem-electric')) {
      const g = this.make.graphics();
      g.fillStyle(0xffeb3b, 1);
      g.fillRect(0, 0, 32, 48);
      g.fillStyle(0x1a1505, 1);
      g.fillRect(4, 6, 24, 20);
      g.fillStyle(0xffeb3b, 0.9);
      g.fillRect(6, 10, 14, 2);
      g.fillRect(6, 14, 10, 2);
      g.fillRect(6, 18, 16, 2);
      g.generateTexture('totem-electric', 32, 48);
      g.destroy();
    }

    // Totem 1: Comporta Hidráulica (X = 520, Y = 656)
    this.totemBarrier = this.add.image(520, 656, 'totem');
    this.promptTextBarrier = this.add
      .text(520, 615, '[E] DESTRAVAR COMPORTA', {
        fontSize: '16px',
        color: '#ffee00',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Totem 2: Regulador Elétrico (X = 920, Y = 656)
    this.totemElectric = this.add.image(920, 656, 'totem-electric');
    this.promptTextElectric = this.add
      .text(920, 615, '[E] CALIBRAR CIRCUITO', {
        fontSize: '16px',
        color: '#ffeb3b',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  private createHydraulicGate(): void {
    if (!this.textures.exists('hydraulic-gate')) {
      const g = this.make.graphics();
      const w = 36;
      const h = 680;

      g.fillStyle(0x232730, 1);
      g.fillRect(0, 0, w, h);

      g.fillStyle(0x3e4756, 1);
      g.fillRect(0, 0, 4, h);
      g.fillRect(w - 4, 0, 4, h);

      for (let y = 0; y < h; y += 60) {
        g.fillStyle(0x181a20, 1);
        g.fillRect(4, y, w - 8, 4);
        g.fillStyle(0x8a97a8, 1);
        g.fillCircle(8, y + 10, 2);
        g.fillCircle(w - 8, y + 10, 2);
      }

      const drawStripes = (startY: number, sectionHeight: number) => {
        g.fillStyle(0x111827, 1);
        g.fillRect(4, startY, w - 8, sectionHeight);
        g.fillStyle(0xfacc15, 1);
        for (let sy = startY - 20; sy < startY + sectionHeight; sy += 16) {
          g.beginPath();
          g.moveTo(4, sy);
          g.lineTo(w - 4, sy + 12);
          g.lineTo(w - 4, sy + 18);
          g.lineTo(4, sy + 6);
          g.closePath();
          g.fillPath();
        }
      };

      drawStripes(40, 70);
      drawStripes(h - 120, 70);

      g.generateTexture('hydraulic-gate', w, h);
      g.destroy();
    }

    this.barriers = this.physics.add.staticGroup();
    this.barrier = this.barriers.create(650, 340, 'hydraulic-gate') as Phaser.Physics.Arcade.Sprite;
    this.barrierCollider = this.physics.add.collider(this.player, this.barriers);
  }

  private disableBarrier(): void {
    if (this.barrierCollider) {
      this.barrierCollider.destroy();
      this.barrierCollider = undefined;
    }
    this.promptTextBarrier.setVisible(false);

    if (this.barrier) {
      this.tweens.add({
        targets: this.barrier,
        y: -340,
        duration: 900,
        ease: 'Power2',
        onComplete: () => {
          if (this.barrier) {
            this.barrier.destroy();
            this.barrier = undefined;
          }
          if (this.barriers) {
            this.barriers.clear(true, true);
          }
        },
      });
    }
  }

  private createPlayer(): void {
    if (!this.textures.exists('player')) {
      const g = this.make.graphics();
      g.fillStyle(0x00e5ff, 1);
      g.fillRoundedRect(0, 0, 32, 48, 4);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(6, 10, 20, 6);
      g.generateTexture('player', 32, 48);
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

    if (this.terminalOutput) {
      const cmdElement = document.createElement('div');
      cmdElement.className = 'log-line command';
      cmdElement.textContent = `> ${value}`;
      this.terminalOutput.appendChild(cmdElement);

      const respElement = document.createElement('div');
      respElement.className = `log-line ${result.success ? 'success' : 'error'}`;
      respElement.textContent = result.message;
      this.terminalOutput.appendChild(respElement);

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
