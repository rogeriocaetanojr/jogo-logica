import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { TrechoLixao } from './TrechoLixao';
import type { TemaTrecho } from './TrechoLixao';

/**
 * Trecho 2: Tempestade de Pó. Névoa de poeira, pouca visibilidade.
 * Plataformas verticais: buracos largos demais para pular, cruzados subindo por vigas, e uma
 * torre de blocos. No meio, o exercício estende uma ponte sobre um vão.
 */
export class Trecho2Nevoa extends TrechoLixao {
  public readonly tema: TemaTrecho = {
    ceu: [COR.ceuPoeira, COR.horizonte, COR.horizonteEscuro],
    astro: null,
    nuvem: COR.horizonte,
    horizonte: COR.horizonteEscuro,
    tinta: COR.tintaPo,
  };
  protected readonly semente = 303;
  protected override readonly buracos = [
    [1000, 500],
    [3700, 512],
  ] as const;

  /** Munição solta pelo chão, longe dos buracos e do terminal. */
  public override readonly reciclaveis = [
    [450, 'placa'],
    [1600, 'lata'],
    [2350, 'bateria'],
    [3450, 'monitor'],
    [4400, 'lata'],
    [4900, 'placa'],
  ] as const;

  constructor(cena: CenaFase3) {
    super(cena, 1);
    this.largura = 5120;
    this.xExercicioLocal = 2560;
    this.obstaculo = 'vao';
  }

  protected override decorar(): void {
    this.bloco('bloco-entrada', 300, 48);

    // Escada de vigas sobre o buraco de 500 px: sobe até 400 px e desce do outro lado.
    // Cair das duas primeiras vigas leva ao chão; das duas últimas, ao buraco.
    this.viga('escada-1', 600, 150);
    this.viga('escada-2', 820, 290);
    this.viga('escada-3', 1080, 400, 160);
    this.viga('escada-4', 1340, 260);
    // [QUEDA DE LIXO] 1150: lixo caindo sobre a viga mais alta, com sombra visível na poeira

    // Torre de blocos com duas vigas acima dela; desce de volta ao chão depois de 2308
    this.bloco('torre-1', 1700, 96);
    this.bloco('torre-2', 1764, 192);
    this.viga('torre-viga-1', 1940, 300);
    this.viga('torre-viga-2', 2180, 400);
    // [DRONE] 2060: drone pairando entre as vigas da torre
    // [WALL-E] 2400: aparece varrendo o pó perto do terminal

    // Exercício em 2560; vão de 576 px em 2720 que ganha ponte ao resolver
    // [QUEDA DE LIXO] 3500: pilha desabando no trecho plano depois da ponte

    // Buraco de 512 px cruzado por três vigas baixas
    this.viga('ponte-1', 3770, 120, 96);
    this.viga('ponte-2', 3960, 200, 96);
    this.viga('ponte-3', 4100, 140, 96);
    // [QUEDA DE LIXO] 4500: na reta antes da chuva

    for (let x = 420; x < this.largura - 200; x += 760) this.decoracao(x, 'lx-engrenagem', false, 6);
  }
}
