import { CEU, COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { LAYOUTS } from './LayoutLixao';
import { TrechoLixao } from './TrechoLixao';
import type { TemaTrecho } from './TrechoLixao';

/**
 * Trecho 2: Tempestade de Pó. Névoa: complica com plataformas frágeis e de guindaste.
 * Frágeis sobre um fosso, guindaste sobre outro, torre do exercício com frágeis e guindastes
 * (o acerto desce uma plataforma sobre o vão), ilha da alavanca alcançada por frágeis e um
 * guindaste, e portão com botão-alvo. Level design em LayoutLixao.
 */
export class Trecho2Nevoa extends TrechoLixao {
  public readonly tema: TemaTrecho = {
    ceu: CEU.nevoa,
    astro: null,
    nuvem: COR.ceuNevoa7,
    horizonte: COR.horizonteEscuro,
    tinta: COR.tintaPo,
  };
  protected readonly semente = 303;
  protected override readonly buracos = LAYOUTS[1].buracos;

  /** Munição solta pelo chão, longe dos buracos e do terminal. */
  public override readonly reciclaveis = LAYOUTS[1].reciclaveis;

  constructor(cena: CenaFase3) {
    super(cena, 1);
    this.largura = LAYOUTS[1].largura;
    this.definirExercicio(LAYOUTS[1].exercicio);
  }

  protected override decorar(): void {
    this.montarLayout(LAYOUTS[1]);
    for (let x = 420; x < this.largura - 200; x += 760) this.decoracao(x, 'lx-engrenagem', false, 6);
  }
}
