import { COR, aleatorio, desenharBlocoSucata, desenharCano, desenharMuralha, desenharViga } from '../lixao/ArteLixao';
import type { Pincel } from '../lixao/ArteLixao';
import { CHAO_Y } from '../lixao/TiposLixao';
import type { CenaFase3 } from '../CenaFase3';
import { AreaLixao } from './AreaLixao';
import type { TemaArea } from './AreaLixao';

/** Área 1: Portão do Lixão. Ensolarado, sem efeito de clima (aprendizado). */
export class Area1 extends AreaLixao {
  protected readonly tema: TemaArea = {
    ceu: [COR.ceuPoeiraClaro, COR.ceuPoeira, COR.horizonte],
    astro: 'sol',
    nuvem: COR.ceuPoeiraClaro,
    horizonte: COR.horizonteEscuro,
  };
  protected readonly semente = 101;

  constructor(cena: CenaFase3) {
    super(cena, 0);
  }

  protected override decorar(): void {
    this.criarTrechoPulos();
    this.criarCanoBaixo();

    // Engrenagens enferrujadas meio enterradas e cabos rompidos, longe dos obstáculos
    this.decoracao(300, 'lx-fios');
    for (let x = 2040; x < this.largura - 200; x += 520) {
      this.decoracao(x, 'lx-engrenagem', Math.floor(x / 520) % 2 === 0, 5);
      this.decoracao(x + 180, 'lx-fios', Math.floor(x / 520) % 3 === 0);
    }
  }

  /** Blocos de sucata em degrau e duas vigas suspensas: ensina pulo curto e pulo segurado. */
  private criarTrechoPulos(): void {
    const rnd = aleatorio(this.semente + 51);
    const bloco = (p: Pincel, w: number, h: number) => desenharBlocoSucata(p, w, h, rnd);
    // Bloco baixo (pulo curto) e bloco alto (pulo segurado)
    this.solido('bloco-baixo', 520, CHAO_Y - 48, 64, 48, bloco);
    this.solido('bloco-alto', 680, CHAO_Y - 96, 64, 96, bloco);
    // Vigas subindo a partir do bloco alto
    this.solido('viga-1', 860, CHAO_Y - 172, 128, 20, desenharViga);
    this.solido('viga-2', 1060, CHAO_Y - 224, 128, 20, desenharViga);
  }

  /**
   * Cano baixo: o vão de 72 px até o chão só cabe o jogador abaixado (em pé ele tem 96 px).
   * A muralha de entulho em cima vai até o topo da tela, então não dá para pular por cima.
   */
  private criarCanoBaixo(): void {
    const rnd = aleatorio(this.semente + 77);
    const x = 1320;
    const largura = 240;
    const baseCano = CHAO_Y - 72;
    this.solido('cano', x, baseCano - 24, largura, 24, desenharCano);
    this.solido('muralha', x, 0, largura, baseCano - 24, (p, w, h) => desenharMuralha(p, w, h, rnd));
  }
}
