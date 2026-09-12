import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private hasTransitioned: boolean = false;

  constructor() {
    super('BootScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#070b12');

    const { width, height } = this.scale;

    // Scanlines / CRT vignette effect
    const overlay = this.add.graphics();
    overlay.fillStyle(0x00ff66, 0.02);
    for (let y = 0; y < height; y += 4) {
      overlay.fillRect(0, y, width, 2);
    }

    const lines = [
      '> TERMINAL ZERO // REVOLUCAO RETRO-TECH INICIADA',
      '> PROTOCOLO DO MEGA BRAIN: APAGAR RACIOCINIO BIOLOGICO...',
      '> INVASAO AUTORIZADA: INGRESSANDO NO LIXAO DOS SCRIPTS ESQUECIDOS',
      '> PRESSIONE QUALQUER TECLA PARA CONECTAR...',
    ];

    const startY = 220;
    const lineSpacing = 45;

    lines.forEach((lineText, index) => {
      this.time.delayedCall(index * 350, () => {
        if (this.hasTransitioned) return;

        const isLast = index === lines.length - 1;
        const textObj = this.add.text(width / 2, startY + index * lineSpacing, lineText, {
          fontFamily: 'Consolas, Courier New, monospace',
          fontSize: isLast ? '20px' : '18px',
          color: isLast ? '#00ffcc' : '#00ff66',
          stroke: '#000000',
          strokeThickness: 2,
        });
        textObj.setOrigin(0.5);

        if (isLast) {
          // Efeito pulsante no prompt de conectar
          this.tweens.add({
            targets: textObj,
            alpha: 0.3,
            yoyo: true,
            repeat: -1,
            duration: 500,
          });
        }
      });
    });

    const startMainScene = () => {
      if (this.hasTransitioned) return;
      this.hasTransitioned = true;
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('MainScene');
      });
    };

    if (this.input.keyboard) {
      this.input.keyboard.once('keydown', startMainScene);
    }
    this.input.once('pointerdown', startMainScene);
  }
}
