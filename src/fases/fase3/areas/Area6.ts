import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/** Trecho 6: Arena da Sucata. Noite; arena do Monstro de Sucata (chefão). */
export class Area6 extends AreaLixao {
  public readonly tema: TemaArea = {
    ceu: [COR.noiteRoxoEscuro, COR.noiteRoxo],
    astro: 'lua',
    nuvem: COR.noiteRoxo,
    horizonte: COR.noiteRoxoEscuro,
    tinta: COR.tintaNoite,
  };
  protected readonly semente = 606;

  constructor(cena: CenaFase3) {
    super(cena, 5);
    // Arena mais curta: cabe em pouco mais de uma tela
    this.largura = 2560;
    this.xExercicioLocal = 1100;
  }
}
