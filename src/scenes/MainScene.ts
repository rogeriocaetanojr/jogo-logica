import Phaser from 'phaser';
import { parseCommand } from '../utils/CommandParser';
import { DialogueSystem } from '../utils/DialogueSystem';

export class MainScene extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;

  // Totem 1 (Barreira)
  private totemBarrier!: Phaser.GameObjects.Image;
  private promptTextBarrier!: Phaser.GameObjects.Text;

  // Totem 2 (Física)
  private totemPhysics!: Phaser.GameObjects.Image;
  private promptTextPhysics!: Phaser.GameObjects.Text;

  private currentInteractingTotem: 'barrier' | 'physics' | null = null;

  private barriers!: Phaser.Physics.Arcade.StaticGroup;
  private barrier?: Phaser.Physics.Arcade.Sprite;
  private barrierCollider?: Phaser.Physics.Arcade.Collider;

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

  // Variáveis físicas do jogador
  private jumpForce: number = 450;
  private isRespawning: boolean = false;

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

    // Textos de ambientação pelo mapa expandido
    this.add
      .text(640, 200, 'Terminal Hub - Conexao Estabelecida', {
        fontSize: '28px',
        color: '#58a6ff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.add
      .text(1175, 450, '// SETOR 1: O ABISMO DE RECURSAO (450px) //', {
        fontSize: '18px',
        color: '#ff4d4d',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.add
      .text(1650, 580, '✓ ZONA SEGURA: MARGEM OPOSTA ALCANCADA', {
        fontSize: '18px',
        color: '#00ff88',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.createGroundAndAbyss();
    this.createTotems();
    this.createPlayer();
    this.createBarrier();
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
      this.promptTextPhysics.setVisible(false);
      this.player.setVelocityX(0);
      return;
    }

    // Se o jogador cair no fundo do abismo
    if (this.player.y > 720) {
      this.handleSpikeHit();
      return;
    }

    // Checagem de proximidade dos totens
    const distBarrier = Math.abs(this.player.x - this.totemBarrier.x);
    const isNearBarrierTotem = distBarrier < 80;
    this.promptTextBarrier.setVisible(
      isNearBarrierTotem && !this.isTerminalOpen && Boolean(this.barrier)
    );

    const distPhysics = Math.abs(this.player.x - this.totemPhysics.x);
    const isNearPhysicsTotem = distPhysics < 80;
    this.promptTextPhysics.setVisible(isNearPhysicsTotem && !this.isTerminalOpen);

    // Identifica com qual totem o jogador está interagindo
    if (isNearPhysicsTotem) {
      this.currentInteractingTotem = 'physics';
    } else if (isNearBarrierTotem) {
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

    // Pulo estilo Mega Man com força de pulo dinâmica
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
    const cutThreshold = -Math.min(150, this.jumpForce / 3);
    if (!isJumpDown && this.player.body.velocity.y < cutThreshold) {
      this.player.setVelocityY(cutThreshold);
    }
  }

  private createGroundAndAbyss(): void {
    // Texturas para os dois segmentos de piso
    // Piso 1: X = 0 a 950 (largura 950, centro 475)
    if (!this.textures.exists('ground-section-1')) {
      const g = this.make.graphics();
      g.fillStyle(0x18202c, 1);
      g.fillRect(0, 0, 950, 40);
      g.fillStyle(0x00ff88, 1);
      g.fillRect(0, 0, 950, 3);
      g.generateTexture('ground-section-1', 950, 40);
      g.destroy();
    }

    // Piso 2: X = 1400 a 2560 (largura 1160, centro 1980)
    if (!this.textures.exists('ground-section-2')) {
      const g = this.make.graphics();
      g.fillStyle(0x18202c, 1);
      g.fillRect(0, 0, 1160, 40);
      g.fillStyle(0x00ff88, 1);
      g.fillRect(0, 0, 1160, 3);
      g.generateTexture('ground-section-2', 1160, 40);
      g.destroy();
    }

    // Textura dos espinhos vermelhos neon no abismo (X = 950 a 1400, largura 450)
    if (!this.textures.exists('spikes-abyss')) {
      const g = this.make.graphics();
      g.fillStyle(0xff1744, 1);
      const spikeW = 15;
      const count = 450 / spikeW;
      for (let i = 0; i < count; i++) {
        const x = i * spikeW;
        g.beginPath();
        g.moveTo(x, 20);
        g.lineTo(x + spikeW / 2, 0);
        g.lineTo(x + spikeW, 20);
        g.closePath();
        g.fillPath();
      }
      g.generateTexture('spikes-abyss', 450, 20);
      g.destroy();
    }

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(475, 700, 'ground-section-1');
    this.platforms.create(1980, 700, 'ground-section-2');

    this.spikes = this.physics.add.staticGroup();
    // Espinhos posicionados no fundo do abismo em Y = 710
    this.spikes.create(1175, 710, 'spikes-abyss');
  }

  private handleSpikeHit(): void {
    if (this.isRespawning) return;
    this.isRespawning = true;

    // Respawn imediato na última posição segura antes do abismo (X = 900, Y = 600)
    this.player.setPosition(900, 600);
    this.player.setVelocity(0, 0);

    // Efeito visual rápido de flash na câmera e piscar no player sem travar o jogo
    this.cameras.main.flash(180, 255, 30, 60);

    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      yoyo: true,
      repeat: 3,
      duration: 70,
      onComplete: () => {
        this.player.setAlpha(1);
        this.isRespawning = false;
      },
    });
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

    if (!this.textures.exists('totem-physics')) {
      const g = this.make.graphics();
      g.fillStyle(0x00e5ff, 1);
      g.fillRect(0, 0, 32, 48);
      g.fillStyle(0x051520, 1);
      g.fillRect(4, 6, 24, 20);
      g.fillStyle(0x00e5ff, 0.9);
      g.fillRect(6, 10, 14, 2);
      g.fillRect(6, 14, 10, 2);
      g.fillRect(6, 18, 16, 2);
      g.generateTexture('totem-physics', 32, 48);
      g.destroy();
    }

    // Totem 1: Barreira (X = 550, Y = 656)
    this.totemBarrier = this.add.image(550, 656, 'totem');
    this.promptTextBarrier = this.add
      .text(550, 615, '[E] HACKEAR', {
        fontSize: '16px',
        color: '#ffee00',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Totem 2: Puzzle de Física (X = 920, Y = 656)
    this.totemPhysics = this.add.image(920, 656, 'totem-physics');
    this.promptTextPhysics = this.add
      .text(920, 615, '[E] HACKEAR FÍSICA', {
        fontSize: '16px',
        color: '#00e5ff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  private createBarrier(): void {
    if (!this.textures.exists('barrier')) {
      const g = this.make.graphics();
      g.fillStyle(0xff2a2a, 1);
      g.fillRect(0, 0, 24, 120);
      g.fillStyle(0xff7700, 0.85);
      g.fillRect(4, 0, 16, 120);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(10, 0, 4, 120);
      g.generateTexture('barrier', 24, 120);
      g.destroy();
    }

    this.barriers = this.physics.add.staticGroup();
    this.barrier = this.barriers.create(850, 620, 'barrier') as Phaser.Physics.Arcade.Sprite;
    this.barrierCollider = this.physics.add.collider(this.player, this.barriers);
  }

  private disableBarrier(): void {
    if (this.barrier) {
      this.barrier.destroy();
      this.barrier = undefined;
    }
    if (this.barrierCollider) {
      this.barrierCollider.destroy();
      this.barrierCollider = undefined;
    }
    this.promptTextBarrier.setVisible(false);
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

    // Detecção de contato com espinhos
    this.physics.add.overlap(this.player, this.spikes, () => {
      this.handleSpikeHit();
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
        speaker: 'MEGA BRAIN [IA SUPREMA]',
        avatar: '🤖',
        text: "Olha só... mais um 'desenvolvedor raiz' achando que vai me derrotar digitando sintaxe na mão.",
      },
      {
        speaker: 'MEGA BRAIN [IA SUPREMA]',
        avatar: '🤖',
        text: 'Eu sou o MEGA BRAIN. Eu gerei 400 bibliotecas genéricas enquanto você dava um pulo.',
      },
      {
        speaker: 'MEGA BRAIN [IA SUPREMA]',
        avatar: '🤖',
        text: 'Quer passar daquela barreira? Vai ter que usar a cabeça... se é que você lembra como se pensa sem um autocomplete.',
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

    const result = parseCommand(value);

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
      } else if (result.action === 'SET_GRAVITY' && result.value !== undefined) {
        this.physics.world.gravity.y = result.value;
      } else if (result.action === 'SET_JUMP_FORCE' && result.value !== undefined) {
        this.jumpForce = result.value;
      }

      setTimeout(() => {
        this.closeTerminal();
      }, 1000);
    }
  }

  private openTerminal(totemType: 'barrier' | 'physics'): void {
    if (this.dialogueSystem && this.dialogueSystem.isActive) return;

    this.isTerminalOpen = true;
    this.player.setVelocityX(0);

    if (this.terminalOverlay) {
      this.terminalOverlay.classList.remove('hidden');
    }

    // Adiciona log contextual específico ao abrir cada totem
    if (this.terminalOutput) {
      if (totemType === 'physics') {
        const info = document.createElement('div');
        info.className = 'log-line info';
        info.textContent =
          'PROPRIEDADES DO SISTEMA: gravidade_mundo = 600. O abismo tem 450px de largura. Você precisa alterar a gravidade ou a forca_pulo para conseguir saltar.';
        this.terminalOutput.appendChild(info);
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
