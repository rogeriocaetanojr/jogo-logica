import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/** Área 1: Portão do Lixão. Ensolarado, sem efeito de clima (aprendizado). */
export class Area1 extends AreaLixao {
  protected readonly tema: TemaArea = {
    ceu: [COR.ceuPoeiraClaro, COR.ceuPoeira, COR.horizonte],
    astro: 'sol',
    nuvem: COR.ceuPoeiraClaro,
    horizonte: COR.horizonteEscuro,
  };
  protected readonly semente = 101;

  constructor(cena: CenaFase3) {
    super(cena, 0);
  }

  protected override decorar(): void {
    // Engrenagens enferrujadas meio enterradas e cabos rompidos
    for (let x = 300; x < this.largura - 200; x += 520) {
      this.decoracao(x, 'lx-engrenagem', Math.floor(x / 520) % 2 === 0, 5);
      this.decoracao(x + 180, 'lx-fios', Math.floor(x / 520) % 3 === 0);
    }
  }
}
