import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';

/** Área 3: Tempestade de Pó. Empoeirado, pouca visibilidade. */
export class Area3 extends AreaLixao {
  protected readonly coresCeu = [COR.ceuAreia, COR.ceuLaranja, COR.ceuPo];
  protected readonly semente = 303;

  constructor(cena: CenaFase3) {
    super(cena, 2);
  }
}
