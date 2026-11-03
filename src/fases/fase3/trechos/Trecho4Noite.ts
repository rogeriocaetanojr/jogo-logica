import { COR } from '../lixao/ArteLixao';
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
    ceu: [COR.noiteRoxoEscuro, COR.noiteRoxo],
    astro: 'lua',
    nuvem: COR.noiteRoxo,
    horizonte: COR.noiteRoxoEscuro,
    tinta: COR.tintaNoite,
  };
  protected readonly semente = 606;

  /** Munição solta pelo chão, longe dos buracos e do terminal. */
  public override readonly reciclaveis = [
    [700, 'lata'],
    [1100, 'placa'],
    [1500, 'monitor'],
    [1700, 'bateria'],
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
    // [CHEFÃO] 1500: Monstro de Sucata surge do lixo; ataques de sucata, faíscas e choque no chão
    // [CHEFÃO] 1700: contêiner de reciclagem, para onde o monstro é empurrado no fim
    // [QUEDA DE LIXO] 400 e 1880: as pilhas das bordas desabam durante a luta e servem de munição
    // [RECICLA] 1100: comemora no centro da arena depois da vitória

    // Pilha da borda direita
    this.bloco('pilha-dir-1', 1792, 48);
    this.bloco('pilha-dir-2', 1856, 96);
    this.bloco('pilha-dir-3', 1920, 48);
  }
}
