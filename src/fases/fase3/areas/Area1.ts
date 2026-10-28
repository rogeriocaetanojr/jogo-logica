import { COR } from '../lixao/ArteLixao';
import { CHAO_Y } from '../lixao/TiposLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao, PROF } from './AreaLixao';

/** Área 1: Portão do Lixão. Ensolarado, sem efeito de clima (aprendizado). */
export class Area1 extends AreaLixao {
  protected readonly coresCeu = [COR.ceuBege, COR.ceuAreia, COR.ceuLaranja];
  protected readonly semente = 101;

  constructor(cena: CenaFase3) {
    super(cena, 0);
  }

  protected override decorar(): void {
    // Engrenagens enferrujadas fincadas no chão
    for (let x = 300; x < this.largura - 200; x += 520) {
      this.cena.add.image(x, CHAO_Y + 8, 'lx-engrenagem').setScale(4).setRotation(x * 0.01).setDepth(PROF.objetos);
    }
  }
}
