import { COR } from '../lixao/ArteLixao';
import { DEBUG } from '../lixao/TiposLixao';
import type { CenaFase3 } from '../CenaFase3';
import { TrechoLixao } from './TrechoLixao';
import type { TemaTrecho } from './TrechoLixao';

/**
 * Trecho 1: Portão do Lixão. Sol, sem efeito de clima (aprendizado).
 * Primeira metade só de andar e pular: degraus, vigas suspensas e buracos curtos. No meio, o
 * primeiro exercício derruba um entulho do caminho. Depois, o abaixar: canos baixos cada vez
 * mais longos, misturados a pulos.
 */
export class Trecho1Sol extends TrechoLixao {
  public readonly tema: TemaTrecho = {
    ceu: [COR.ceuPoeiraClaro, COR.ceuPoeira, COR.horizonte],
    astro: 'sol',
    nuvem: COR.ceuPoeiraClaro,
    horizonte: COR.horizonteEscuro,
  };
  protected readonly semente = 101;
  protected override readonly buracos = [
    [1280, 128],
    [2200, 160],
    [4240, 160],
  ] as const;

  /** Munição solta pelo chão, longe dos buracos e do terminal. */
  public override readonly reciclaveis = [
    [1200, 'lata'],
    [2050, 'placa'],
    [3300, 'monitor'],
    [4460, 'bateria'],
    [4950, 'lata'],
  ] as const;

  constructor(cena: CenaFase3) {
    super(cena, 0);
    this.largura = 5120;
    this.xExercicioLocal = 2560;
    this.obstaculo = 'entulho';
  }

  protected override decorar(): void {
    if (DEBUG) this.perigo('espinho-teste', 400, 'lx-espinho');

    // Pulo curto e pulo segurado; vigas subindo a partir do bloco alto
    this.bloco('bloco-baixo', 520, 48);
    this.bloco('bloco-alto', 680, 96);
    this.viga('viga-1', 860, 172);
    this.viga('viga-2', 1060, 224);

    // Primeiro buraco (1280, 128 px), curto e com chão largo dos dois lados

    // Subida com retorno: muro alto em 1820; sobe na viga baixa (1628), volta para a
    // esquerda até a viga alta (1404) e de lá pula de volta sobre o muro
    this.zigueZague('zz', 1820);

    // Segundo buraco (2200, 160 px): pede pulo com corrida
    // Exercício em 2560; entulho em 2720 que desaba ao resolver

    // Primeiro cano baixo, curto, em chão livre
    this.passagemBaixa('cano-1', 2960);

    this.bloco('bloco-1', 3360, 48);
    // Segundo cano, também curto
    this.passagemBaixa('cano-2', 3700);
    // [DRONE] 3500: o único drone do sol, lento, entre os canos (DRONES_POR_TRECHO em DronesLixao)
    // [QUEDA DE LIXO] 4100: entre o cano longo e o último buraco
    // [RECICLA] 3440 a 4180: patrulha passando por baixo do cano longo (PATRULHA_RECICLA em RoboLixao)

    // Buraco (4240, 160 px) com aterrissagem curta antes do último cano
    this.passagemBaixa('cano-3', 4600);

    // Engrenagens enferrujadas meio enterradas, cabos rompidos e placas, longe dos obstáculos
    this.decoracao(300, 'lx-fios');
    for (let x = 2040; x < 2500; x += 520) this.decoracao(x, 'lx-engrenagem', false, 5);
    for (let x = 3260; x < this.largura - 120; x += 440) this.decoracao(x, 'lx-placa', x % 3 === 0, 1);
  }
}
