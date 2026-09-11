import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;

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
}
