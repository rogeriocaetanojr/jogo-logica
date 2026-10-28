import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';

/** Área 5: Pilhas Encharcadas. Chuva, chão escorregadio. */
export class Area5 extends AreaLixao {
  protected readonly coresCeu = [COR.ceuNoiteBaixo, COR.ceuChuva, COR.ceuChuvaBaixo];
  protected readonly semente = 505;

  constructor(cena: CenaFase3) {
    super(cena, 4);
  }
}
