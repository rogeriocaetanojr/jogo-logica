import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/**
 * Trecho 5: Pilhas Encharcadas. Chuva, chão escorregadio.
 * Trechos longos de chão alternados com plataformas curtas entre buracos, onde é preciso frear
 * escorregando, e um cano baixo no meio da reta. Sai por um vão sem ponte.
 */
export class Area5 extends AreaLixao {
  public readonly tema: TemaArea = {
    ceu: [COR.noiteRoxo, COR.chuvaAzul, COR.chuvaAzulClaro],
    astro: null,
    nuvem: COR.noiteRoxo,
    horizonte: COR.noiteRoxoEscuro,
    tinta: COR.tintaChuva,
  };
  protected readonly semente = 505;
  protected override readonly buracos = [
    [900, 160],
    [1500, 192],
    [2800, 160],
    [3200, 160],
  ] as const;

  constructor(cena: CenaFase3) {
    super(cena, 4);
    this.largura = 5120;
    this.xExercicioLocal = 4320;
    this.saida = 'vao';
  }

  protected override decorar(): void {
    // Plataforma de 440 px entre os buracos 900 e 1500
    // [QUEDA DE LIXO] 1280: no meio da plataforma, para forçar frear ou acelerar

    // Reta longa com cano baixo: abaixar escorregando
    this.passagemBaixa('cano', 2200, 320);
    // [DRONE] 1900: drone soltando faíscas logo antes do cano

    // Plataforma curta de 240 px entre os buracos 2800 e 3200: frear sem cair
    // [DRONE] 3080: drone parado acima da plataforma curta

    this.bloco('bloco', 3700, 48);
    // [QUEDA DE LIXO] 3900 e 4100: pilhas desabando no caminho do terminal
    // [WALL-E] 4200: espera ao lado do terminal e cruza a ponte depois do exercício

    for (let x = 300; x < this.largura - 200; x += 600) this.decoracao(x, 'lx-placa', Math.floor(x / 600) % 2 === 0, 1);
  }
}
