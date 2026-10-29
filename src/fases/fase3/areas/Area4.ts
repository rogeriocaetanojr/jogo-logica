import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/**
 * Trecho 4: Calha de Cabos. Chuva, chão escorregadio.
 * Trechos longos de chão, onde a frenagem lenta da chuva pesa, com buracos bem espaçados e
 * blocos baixos. Sai por uma muralha de entulho.
 */
export class Area4 extends AreaLixao {
  public readonly tema: TemaArea = {
    ceu: [COR.chuvaAzul, COR.chuvaAzulClaro],
    astro: null,
    nuvem: COR.chuvaAzul,
    horizonte: COR.noiteRoxo,
    tinta: COR.tintaChuva,
  };
  protected readonly semente = 404;
  protected override readonly buracos = [
    [1200, 160],
    [2400, 192],
    [3800, 160],
  ] as const;

  constructor(cena: CenaFase3) {
    super(cena, 3);
    this.largura = 5120;
    this.xExercicioLocal = 4320;
    this.saida = 'entulho';
  }

  protected override decorar(): void {
    // Reta de 1200 px: o jogador sente o escorregão antes do primeiro buraco
    // [DRONE] 700: drone soltando faíscas na chuva, em voo baixo

    // Reta longa depois do buraco (1200, 160 px)
    // [DRONE] 1800 e 2100: dupla de drones, um alto e um baixo
    // [WALL-E] 2000: passa na direção contrária, recolhendo sucata molhada

    // Depois do buraco (2400, 192 px), blocos baixos espaçados: frear antes ou pular por cima
    this.bloco('bloco-1', 3000, 48);
    this.bloco('bloco-2', 3400, 48);
    // [QUEDA DE LIXO] 3200: entre os blocos, onde parar escorregando é difícil

    // Buraco (3800, 160 px) e reta até o terminal
    // [DRONE] 4100: drone guardando o terminal

    for (let x = 340; x < this.largura - 200; x += 380) this.decoracao(x, 'lx-fios', Math.floor(x / 380) % 2 === 0);
  }
}
