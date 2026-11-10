import { CEU, COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { LAYOUTS } from './LayoutLixao';
import { TrechoLixao } from './TrechoLixao';
import type { TemaTrecho } from './TrechoLixao';

/**
 * Trecho 3: Pilhas Encharcadas. Chuva e chão escorregadio: combina tudo.
 * Choques em poças, ímãs sobre buracos e poças, torre do exercício com frágeis, esteira e ímã
 * (o acerto abre o portão da passarela no alto), torre de retorno e botão-alvo com choque na
 * área de arremesso. Level design em LayoutLixao.
 */
export class Trecho3Chuva extends TrechoLixao {
  public readonly tema: TemaTrecho = {
    ceu: CEU.chuva,
    astro: null,
    nuvem: COR.ceuChuva7,
    horizonte: COR.noiteRoxo,
    tinta: COR.tintaChuva,
  };
  protected readonly semente = 404;
  protected override readonly buracos = LAYOUTS[2].buracos;

  /** Munição solta pelo chão, longe dos buracos e do terminal. */
  public override readonly reciclaveis = LAYOUTS[2].reciclaveis;

  constructor(cena: CenaFase3) {
    super(cena, 2);
    this.largura = LAYOUTS[2].largura;
    this.definirExercicio(LAYOUTS[2].exercicio);
  }

  protected override decorar(): void {
    this.montarLayout(LAYOUTS[2]);
    for (let x = 340; x < this.largura - 200; x += 380) this.decoracao(x, 'lx-fios', Math.floor(x / 380) % 2 === 0);
  }
}
