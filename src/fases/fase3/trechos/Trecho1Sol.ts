import { CEU, COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { LAYOUTS } from './LayoutLixao';
import { TrechoLixao } from './TrechoLixao';
import type { TemaTrecho } from './TrechoLixao';

/**
 * Trecho 1: Portão do Lixão. Sol, sem efeito de clima: ensina os mecanismos.
 * Esteiras (uma contra o avanço) e prensas em onda; a torre do exercício sobe até o terminal
 * no alto, onde o acerto ergue a ponte sobre o vão e um elevador desce ao chão; a torre de
 * retorno leva à alavanca do portão; um botão-alvo sobre o fosso estende a ponte. Level design
 * em LayoutLixao.
 */
export class Trecho1Sol extends TrechoLixao {
  public readonly tema: TemaTrecho = {
    ceu: CEU.sol,
    astro: 'sol',
    nuvem: COR.ceuSol8,
    horizonte: COR.horizonteEscuro,
  };
  protected readonly semente = 101;
  protected override readonly buracos = LAYOUTS[0].buracos;

  /** Munição solta pelo chão, longe dos buracos e do terminal. */
  public override readonly reciclaveis = LAYOUTS[0].reciclaveis;

  constructor(cena: CenaFase3) {
    super(cena, 0);
    this.largura = LAYOUTS[0].largura;
    this.definirExercicio(LAYOUTS[0].exercicio);
  }

  protected override decorar(): void {
    this.montarLayout(LAYOUTS[0]);
    this.decoracao(300, 'lx-fios');
    for (let x = 2040; x < 2500; x += 520) this.decoracao(x, 'lx-engrenagem', false, 5);
    for (let x = 3260; x < this.largura - 120; x += 440) this.decoracao(x, 'lx-placa', x % 3 === 0, 1);
  }
}
