import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { TrechoLixao } from './TrechoLixao';
import type { TemaTrecho } from './TrechoLixao';

/**
 * Trecho 3: Pilhas Encharcadas. Chuva, chão escorregadio.
 * Retas longas, onde a frenagem lenta da chuva pesa, com buracos espaçados e blocos baixos.
 * No meio, o exercício ergue um portão de sucata. Depois, um cano baixo no meio da reta e uma
 * plataforma curta entre buracos, onde é preciso frear escorregando.
 */
export class Trecho3Chuva extends TrechoLixao {
  public readonly tema: TemaTrecho = {
    ceu: [COR.chuvaAzul, COR.chuvaAzulClaro],
    astro: null,
    nuvem: COR.chuvaAzul,
    horizonte: COR.noiteRoxo,
    tinta: COR.tintaChuva,
  };
  protected readonly semente = 404;
  protected override readonly buracos = [
    [760, 160],
    [2200, 160],
    [3700, 160],
    [4100, 160],
  ] as const;

  /** Munição solta pelo chão, longe dos buracos e do terminal. */
  public override readonly reciclaveis = [
    [500, 'lata'],
    [1300, 'bateria'],
    [2000, 'placa'],
    [2950, 'monitor'],
    [3500, 'lata'],
    [3980, 'placa'],
    [4800, 'bateria'],
  ] as const;

  constructor(cena: CenaFase3) {
    super(cena, 2);
    this.largura = 5120;
    this.xExercicioLocal = 2560;
    this.obstaculo = 'portao';
  }

  protected override decorar(): void {
    // Reta de 900 px: o jogador sente o escorregão antes do primeiro buraco
    // [DRONE] 600: drone soltando faíscas na chuva, em voo baixo

    // Depois do buraco (760, 160 px), subida com retorno: muro alto em 1440, viga baixa
    // (1248), volta à viga alta (1024) e pula de volta sobre o muro. Escorregar na viga pesa.
    this.zigueZague('zz', 1440);
    // Bloco baixo: frear antes ou pular por cima
    this.bloco('bloco-2', 1900, 48);
    // [QUEDA DE LIXO] 1700: entre os blocos, onde parar escorregando é difícil
    // [RECICLA] 1590 a 1880: recolhe a sucata molhada entre os blocos

    // Buraco (2200, 160 px) e o terminal logo depois
    // Exercício em 2560; portão de sucata em 2720 que sobe ao resolver

    // Cano baixo curto no meio da reta: abaixar escorregando
    this.passagemBaixa('cano', 3100);
    // [DRONE] 2900: drone soltando faíscas logo antes do cano
    // [QUEDA DE LIXO] 3550: pilha desabando antes dos buracos

    // Plataforma curta de 240 px entre os buracos 3700 e 4100: frear sem cair
    // [DRONE] 3980: drone parado acima da plataforma curta

    this.bloco('bloco-3', 4500, 48);
    // [DRONE] 4600: drone soltando faíscas sobre o último bloco
    // [QUEDA DE LIXO] 4700: pilha desabando no caminho da arena

    for (let x = 340; x < this.largura - 200; x += 380) this.decoracao(x, 'lx-fios', Math.floor(x / 380) % 2 === 0);
  }
}
