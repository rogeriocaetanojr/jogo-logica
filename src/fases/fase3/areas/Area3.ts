import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/** Área 3: Tempestade de Pó. Empoeirado, pouca visibilidade. */
export class Area3 extends AreaLixao {
  protected readonly tema: TemaArea = {
    ceu: [COR.ceuPoeira, COR.horizonte, COR.horizonteEscuro],
    astro: null,
    nuvem: COR.horizonte,
    horizonte: COR.horizonteEscuro,
    tinta: COR.tintaPo,
  };
  protected readonly semente = 303;

  constructor(cena: CenaFase3) {
    super(cena, 2);
  }

  protected override decorar(): void {
    for (let x = 420; x < this.largura - 200; x += 760) this.decoracao(x, 'lx-engrenagem', false, 6);
  }
}
