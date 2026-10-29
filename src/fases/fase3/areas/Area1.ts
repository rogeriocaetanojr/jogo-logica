import { COR } from '../lixao/ArteLixao';
import { DEBUG } from '../lixao/TiposLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/**
 * Trecho 1: Portão do Lixão. Ensolarado, sem efeito de clima (aprendizado).
 * Só andar e pular: degraus, vigas suspensas e dois buracos curtos. Sai por uma muralha de entulho.
 */
export class Area1 extends AreaLixao {
  public readonly tema: TemaArea = {
    ceu: [COR.ceuPoeiraClaro, COR.ceuPoeira, COR.horizonte],
    astro: 'sol',
    nuvem: COR.ceuPoeiraClaro,
    horizonte: COR.horizonteEscuro,
  };
  protected readonly semente = 101;
  protected override readonly buracos = [
    [1440, 128],
    [2400, 192],
  ] as const;

  constructor(cena: CenaFase3) {
    super(cena, 0);
    this.largura = 3840;
    this.xExercicioLocal = 3120;
    this.saida = 'entulho';
  }

  protected override decorar(): void {
    // [WALL-E] 300: primeira aparição, limpando o portão enquanto o jogador aprende a andar
    if (DEBUG) this.perigo('espinho-teste', 400, 'lx-espinho');

    // Pulo curto e pulo segurado; vigas subindo a partir do bloco alto
    this.bloco('bloco-baixo', 520, 48);
    this.bloco('bloco-alto', 680, 96);
    this.viga('viga-1', 860, 172);
    this.viga('viga-2', 1060, 224);

    // Primeiro buraco (1440, 128 px), curto e com chão largo dos dois lados

    // Morrinho de sucata: sobe e desce em degraus
    this.bloco('morro-1', 1800, 48);
    this.bloco('morro-2', 1864, 96);
    this.bloco('morro-3', 1928, 48);

    // Segundo buraco (2400, 192 px): pede pulo com corrida
    // [DRONE] 2800: um drone lento patrulhando o chão, sem atirar (só para desviar)

    // Engrenagens enferrujadas meio enterradas e cabos rompidos, longe dos obstáculos
    this.decoracao(300, 'lx-fios');
    for (let x = 2040; x < this.largura - 200; x += 520) {
      this.decoracao(x, 'lx-engrenagem', Math.floor(x / 520) % 2 === 0, 5);
      this.decoracao(x + 180, 'lx-fios', Math.floor(x / 520) % 3 === 0);
    }
  }
}
