import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/**
 * Trecho 3: Tempestade de Pó. Empoeirado, pouca visibilidade.
 * Mais plataformas verticais: buracos largos demais para pular, cruzados subindo por vigas,
 * e uma torre de blocos. Sai por um portão.
 */
export class Area3 extends AreaLixao {
  public readonly tema: TemaArea = {
    ceu: [COR.ceuPoeira, COR.horizonte, COR.horizonteEscuro],
    astro: null,
    nuvem: COR.horizonte,
    horizonte: COR.horizonteEscuro,
    tinta: COR.tintaPo,
  };
  protected readonly semente = 303;
  protected override readonly buracos = [
    [1000, 500],
    [2700, 512],
  ] as const;

  constructor(cena: CenaFase3) {
    super(cena, 2);
    this.largura = 4480;
    this.xExercicioLocal = 3680;
    this.saida = 'portao';
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

    // Torre de blocos com duas vigas acima dela; desce de volta ao chão depois de 2508
    this.bloco('torre-1', 1900, 96);
    this.bloco('torre-2', 1964, 192);
    this.viga('torre-viga-1', 2140, 300);
    this.viga('torre-viga-2', 2380, 400);
    // [DRONE] 2260: drone pairando entre as vigas da torre

    // Buraco de 512 px cruzado por três vigas baixas
    this.viga('ponte-1', 2770, 120, 96);
    this.viga('ponte-2', 2960, 200, 96);
    this.viga('ponte-3', 3100, 140, 96);
    // [QUEDA DE LIXO] 3350 e 3500: duas pilhas desabando no trecho plano antes do terminal
    // [WALL-E] 3500: aparece varrendo o pó perto do terminal

    for (let x = 420; x < this.largura - 200; x += 760) this.decoracao(x, 'lx-engrenagem', false, 6);
  }
}
