import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/**
 * Trecho 2: Vale dos Monitores. Ensolarado, placas de circuito espalhadas pelo chão.
 * Introduz o abaixar: canos baixos cada vez mais longos, misturados a pulos. Sai por um vão sem ponte.
 */
export class Area2 extends AreaLixao {
  public readonly tema: TemaArea = {
    ceu: [COR.ceuPoeiraClaro, COR.ceuPoeira, COR.horizonte],
    astro: 'sol',
    nuvem: COR.ceuPoeiraClaro,
    horizonte: COR.horizonteEscuro,
  };
  protected readonly semente = 202;
  protected override readonly buracos = [
    [1800, 160],
    [3000, 160],
  ] as const;

  constructor(cena: CenaFase3) {
    super(cena, 1);
    this.largura = 4480;
    this.xExercicioLocal = 3680;
    this.saida = 'vao';
  }

  protected override decorar(): void {
    // Primeiro cano baixo, curto, em chão livre
    this.passagemBaixa('cano-1', 400, 240);
    // [WALL-E] 700: passa abaixado por baixo do cano, mostrando o caminho

    this.bloco('bloco-1', 900, 48);
    // Cano longo: segurar o abaixar por mais tempo
    this.passagemBaixa('cano-2', 1200, 400);

    // Buraco (1800, 160 px) e depois pulo alto seguido de cano
    // [DRONE] 2000: drone atirando sucata na altura da cabeça, que se esquiva abaixando
    this.bloco('bloco-2', 2200, 96);
    this.passagemBaixa('cano-3', 2400, 320);

    // Buraco (3000, 160 px) com aterrissagem curta antes do último cano
    this.passagemBaixa('cano-4', 3320, 200);

    for (let x = 260; x < this.largura - 200; x += 440) {
      this.decoracao(x, 'lx-placa', x % 3 === 0, 1);
    }
  }
}
