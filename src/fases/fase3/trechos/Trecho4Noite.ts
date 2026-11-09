import { CEU, COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { TrechoLixao } from './TrechoLixao';
import type { TemaTrecho } from './TrechoLixao';

/**
 * Trecho 4: Arena da Sucata. Noite; arena do Monstro de Sucata (chefão).
 * Sem exercício: o checkpoint é a entrada da arena. Arena plana sem buracos entre 512 e
 * 1792, com pilhas em degrau nas duas bordas, que se sobem dos dois lados.
 */
export class Trecho4Noite extends TrechoLixao {
  public readonly tema: TemaTrecho = {
    ceu: CEU.noite,
    astro: 'lua',
    nuvem: COR.noiteRoxo,
    horizonte: COR.noiteRoxoEscuro,
    tinta: COR.tintaNoite,
  };
  protected readonly semente = 606;

  /** Munição solta pelo chão, longe dos buracos e do terminal. */
  public override readonly reciclaveis = [
    [640, 'lata'],
    [900, 'bateria'],
    [1100, 'placa'],
    [1500, 'monitor'],
  ] as const;

  constructor(cena: CenaFase3) {
    super(cena, 3);
    // Arena mais curta: cabe em pouco mais de uma tela
    this.largura = 2560;
    this.xExercicioLocal = null;
  }

  protected override decorar(): void {
    // Pilha da borda esquerda: entrada da arena
    this.bloco('pilha-esq-1', 320, 48);
    this.bloco('pilha-esq-2', 384, 96);
    this.bloco('pilha-esq-3', 448, 48);

    // Arena plana (512 a 1792)
    // Chefão, contêiner (1724) e o Recicla comemorando (1100) ficam em lixao/ChefaoLixao
    // [QUEDA DE LIXO] 400 e 1880: pilhas das bordas, fora da área travada da luta

    // Pilha da borda direita
    this.bloco('pilha-dir-1', 1792, 48);
    this.bloco('pilha-dir-2', 1856, 96);
    this.bloco('pilha-dir-3', 1920, 48);
  }
}
