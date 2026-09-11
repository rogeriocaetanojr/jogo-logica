import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

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
    this.createPlayer();
    this.setupControls();
  }

  update(): void {
    if (!this.player || !this.player.body) return;

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
    }
  }
}
