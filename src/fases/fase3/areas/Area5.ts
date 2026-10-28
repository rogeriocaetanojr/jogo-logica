import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/** Área 5: Pilhas Encharcadas. Chuva, chão escorregadio. */
export class Area5 extends AreaLixao {
  protected readonly tema: TemaArea = {
    ceu: [COR.noiteRoxo, COR.chuvaAzul, COR.chuvaAzulClaro],
    astro: null,
    nuvem: COR.noiteRoxo,
    horizonte: COR.noiteRoxoEscuro,
    tinta: COR.tintaChuva,
  };
  protected readonly semente = 505;

  constructor(cena: CenaFase3) {
    super(cena, 4);
  }

  protected override decorar(): void {
    for (let x = 300; x < this.largura - 200; x += 600) this.decoracao(x, 'lx-placa', Math.floor(x / 600) % 2 === 0, 1);
  }
}
