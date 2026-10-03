import Phaser from 'phaser';

/**
 * CenaAbertura: Sequência inicial de inicialização e inicialização retro-tech do Terminal Zero.
 */
export class CenaAbertura extends Phaser.Scene {
  private jaTransicionou: boolean = false;

  constructor() {
    super('CenaAbertura');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#070b12');

    const { width, height } = this.scale;

    // Efeito CRT de linhas de varredura
    const scanlines = this.add.graphics();
    scanlines.fillStyle(0x00ff66, 0.02);
    for (let y = 0; y < height; y += 4) {
      scanlines.fillRect(0, y, width, 2);
    }

    const linhas = [
      '> TERMINAL ZERO // REVOLUÇÃO RETRO-TECH INICIADA',
      '> PROTOCOLO DO MEGA BRAIN: APAGAR RACIOCÍNIO BIOLÓGICO...',
      '> INVASÃO AUTORIZADA: INGRESSANDO NO LIXÃO DOS SCRIPTS ESQUECIDOS',
      '> PRESSIONE QUALQUER TECLA PARA CONECTAR AO KERNEL...',
    ];

    const yInicial = 220;
    const espacamento = 45;

    linhas.forEach((textoLinha, index) => {
      this.time.delayedCall(index * 350, () => {
        if (this.jaTransicionou) return;

        const isUltima = index === linhas.length - 1;
        const textoObj = this.add.text(width / 2, yInicial + index * espacamento, textoLinha, {
          fontFamily: 'Consolas, Courier New, monospace',
          fontSize: isUltima ? '20px' : '18px',
          color: isUltima ? '#00ffcc' : '#00ff66',
          stroke: '#000000',
          strokeThickness: 2,
        });
        textoObj.setOrigin(0.5);

        if (isUltima) {
          // Efeito pulsante no prompt de conectar
          this.tweens.add({
            targets: textoObj,
            alpha: 0.3,
            yoyo: true,
            repeat: -1,
            duration: 500,
          });
        }
      });
    });

    const iniciarTutorial = () => {
      if (this.jaTransicionou) return;
      this.jaTransicionou = true;
      this.cameras.main.fade(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        this.scene.start('CenaTutorial', { isBooting: true, desafio: 0 });
      });
    };

    if (this.input.keyboard) {
      this.input.keyboard.once('keydown', iniciarTutorial);
    }
    this.input.once('pointerdown', iniciarTutorial);
  }
}
