import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;
  private totem!: Phaser.GameObjects.Image;
  private promptText!: Phaser.GameObjects.Text;
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

  private isTerminalOpen: boolean = false;
  private terminalOverlay: HTMLElement | null = null;
  private terminalInput: HTMLInputElement | null = null;

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#10141d');

    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Terminal Hub - Conexao Estabelecida', {
        fontSize: '28px',
        color: '#58a6ff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.createGround();
    this.createTotem();
    this.createPlayer();
    this.setupControls();
    this.setupTerminal();
  }

  update(): void {
    if (!this.player || !this.player.body) return;

    // Distância horizontal até o totem
    const dist = Math.abs(this.player.x - this.totem.x);
    const isNearTotem = dist < 80;
    this.promptText.setVisible(isNearTotem && !this.isTerminalOpen);

    // Abrir terminal com tecla E quando próximo
    if (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      if (isNearTotem && !this.isTerminalOpen) {
        this.openTerminal();
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
      this.player.setVelocityY(-450);
    }

    // Pulo variável: cortar velocidade vertical se o jogador soltar o botão durante a subida
    if (!isJumpDown && this.player.body.velocity.y < -150) {
      this.player.setVelocityY(-150);
    }
  }

  private createGround(): void {
    if (!this.textures.exists('ground')) {
      const g = this.add.graphics();
      // Base cinza escuro
      g.fillStyle(0x18202c, 1);
      g.fillRect(0, 0, 1280, 40);
      // Linha de acento verde cibernético no topo
      g.fillStyle(0x00ff88, 1);
      g.fillRect(0, 0, 1280, 3);
      g.generateTexture('ground', 1280, 40);
      g.destroy();
    }

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(640, 700, 'ground');
  }

  private createTotem(): void {
    if (!this.textures.exists('totem')) {
      const g = this.make.graphics();
      // Retângulo verde neon / hacker #00ff66
      g.fillStyle(0x00ff66, 1);
      g.fillRect(0, 0, 32, 48);
      // Painel/tela de terminal interno
      g.fillStyle(0x0a1410, 1);
      g.fillRect(4, 6, 24, 20);
      g.fillStyle(0x00ff66, 0.9);
      g.fillRect(6, 10, 12, 2);
      g.fillRect(6, 14, 16, 2);
      g.fillRect(6, 18, 8, 2);
      g.generateTexture('totem', 32, 48);
      g.destroy();
    }

    // Posicionado em X = 550 sobre o piso (Y = 656)
    this.totem = this.add.image(550, 656, 'totem');

    // Texto de instrução acima do totem
    this.promptText = this.add
      .text(550, 615, '[E] HACKEAR', {
        fontSize: '16px',
        color: '#ffee00',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  private createPlayer(): void {
    if (!this.textures.exists('player')) {
      const g = this.make.graphics();
      // Corpo ciano / azul neon de 32x48 pixels
      g.fillStyle(0x00e5ff, 1);
      g.fillRoundedRect(0, 0, 32, 48, 4);
      // Detalhe de visor futurista
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(6, 10, 20, 6);
      g.generateTexture('player', 32, 48);
      g.destroy();
    }

    this.player = this.physics.add.sprite(100, 500, 'player');
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms);
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

  private setupTerminal(): void {
    this.terminalOverlay = document.getElementById('terminal-overlay');
    this.terminalInput = document.getElementById('terminal-input') as HTMLInputElement | null;

    if (this.terminalInput) {
      // Impede que as teclas digitadas no input (como WASD, espaço, setas) afetem o Phaser
      this.terminalInput.addEventListener('keydown', (e: KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          this.closeTerminal();
        }
      });
    }

    // Suporte a fechar com Escape via janela global
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isTerminalOpen) {
        this.closeTerminal();
      }
    });
  }

  private openTerminal(): void {
    this.isTerminalOpen = true;
    this.player.setVelocityX(0);

    if (this.terminalOverlay) {
      this.terminalOverlay.classList.remove('hidden');
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
