import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';

/** Área 6: Arena da Sucata. Noite; arena do Monstro de Sucata (chefão). */
export class Area6 extends AreaLixao {
  protected readonly coresCeu = [COR.ceuNoite, COR.ceuNoiteBaixo];
  protected readonly semente = 606;

  constructor(cena: CenaFase3) {
    super(cena, 5);
    // Arena mais curta: cabe em pouco mais de uma tela
    this.largura = 2560;
    this.xExercicio = 1100;
    this.xSaida = 2380;
  }
}
