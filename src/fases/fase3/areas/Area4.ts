import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';

/** Área 4: Calha de Cabos. Chuva, chão escorregadio. */
export class Area4 extends AreaLixao {
  protected readonly coresCeu = [COR.ceuChuva, COR.ceuChuvaBaixo];
  protected readonly semente = 404;

  constructor(cena: CenaFase3) {
    super(cena, 3);
  }
}
