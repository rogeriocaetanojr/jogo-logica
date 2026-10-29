import { COR } from '../lixao/ArteLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/**
 * Trecho 6: Arena da Sucata. Noite; arena do Monstro de Sucata (chefão).
 * Arena plana sem buracos entre 512 e 1792, com pilhas em degrau nas duas bordas, que se
 * sobem dos dois lados. Sai por um portão.
 */
export class Area6 extends AreaLixao {
  public readonly tema: TemaArea = {
    ceu: [COR.noiteRoxoEscuro, COR.noiteRoxo],
    astro: 'lua',
    nuvem: COR.noiteRoxo,
    horizonte: COR.noiteRoxoEscuro,
    tinta: COR.tintaNoite,
  };
  protected readonly semente = 606;

  constructor(cena: CenaFase3) {
    super(cena, 5);
    // Arena mais curta: cabe em pouco mais de uma tela
    this.largura = 2560;
    this.xExercicioLocal = 2160;
    this.saida = 'portao';
  }

  protected override decorar(): void {
    // Pilha da borda esquerda: entrada da arena
    this.bloco('pilha-esq-1', 320, 48);
    this.bloco('pilha-esq-2', 384, 96);
    this.bloco('pilha-esq-3', 448, 48);

    // Arena plana (512 a 1792)
    // [CHEFÃO] 1500: Monstro de Sucata surge do lixo; ataques de sucata, faíscas e choque no chão
    // [CHEFÃO] 1700: contêiner de reciclagem, para onde o monstro é empurrado no fim
    // [QUEDA DE LIXO] as pilhas das bordas desabam durante a luta e servem de munição
    // [WALL-E] 1100: comemora no centro da arena depois da vitória

    // Pilha da borda direita: saída da arena
    this.bloco('pilha-dir-1', 1792, 48);
    this.bloco('pilha-dir-2', 1856, 96);
    this.bloco('pilha-dir-3', 1920, 48);
  }
}
