import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/** Área 4: Calha de Cabos. Chuva, chão escorregadio. */
export class Area4 extends AreaLixao {
  protected readonly tema: TemaArea = {
    ceu: [COR.chuvaAzul, COR.chuvaAzulClaro],
    astro: null,
    nuvem: COR.chuvaAzul,
    horizonte: COR.noiteRoxo,
    tinta: COR.tintaChuva,
  };
  protected readonly semente = 404;

  constructor(cena: CenaFase3) {
    super(cena, 3);
  }

  protected override decorar(): void {
    for (let x = 340; x < this.largura - 200; x += 380) this.decoracao(x, 'lx-fios', Math.floor(x / 380) % 2 === 0);
  }
}
