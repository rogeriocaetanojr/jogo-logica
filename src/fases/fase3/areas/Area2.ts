import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/** Trecho 2: Vale dos Monitores. Ensolarado, placas de circuito espalhadas pelo chão. */
export class Area2 extends AreaLixao {
  public readonly tema: TemaArea = {
    ceu: [COR.ceuPoeiraClaro, COR.ceuPoeira, COR.horizonte],
    astro: 'sol',
    nuvem: COR.ceuPoeiraClaro,
    horizonte: COR.horizonteEscuro,
  };
  protected readonly semente = 202;

  constructor(cena: CenaFase3) {
    super(cena, 1);
  }

  protected override decorar(): void {
    for (let x = 260; x < this.largura - 200; x += 440) {
      this.decoracao(x, 'lx-placa', x % 3 === 0, 1);
    }
  }
}
