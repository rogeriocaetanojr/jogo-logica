import Phaser from 'phaser';
import { COR, hexNum } from '../lixao/ArteLixao';
import { CHAO_Y } from '../lixao/TiposLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao, PROF } from './AreaLixao';

/** Área 2: Vale dos Monitores. Ensolarado, placas de circuito com LEDs ainda acesos. */
export class Area2 extends AreaLixao {
  protected readonly coresCeu = [COR.ceuBege, COR.ceuAreia, COR.ceuLaranja];
  protected readonly semente = 202;

  constructor(cena: CenaFase3) {
    super(cena, 1);
  }

  protected override decorar(): void {
    for (let x = 260; x < this.largura - 200; x += 440) {
      this.cena.add.image(x, CHAO_Y + 4, 'lx-placa').setOrigin(0.5, 1).setScale(4).setDepth(PROF.objetos);
      const led = this.cena.add
        .image(x + 22, CHAO_Y - 10, 'lx-brilho')
        .setTint(hexNum(COR.neon))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.4)
        .setDepth(PROF.objetos);
      this.cena.tweens.add({ targets: led, alpha: { from: 0.2, to: 1 }, yoyo: true, repeat: -1, duration: 500 + (x % 700) });
    }
  }
}
