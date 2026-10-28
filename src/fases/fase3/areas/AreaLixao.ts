import Phaser from 'phaser';
import type { ResultadoComando } from '../../../compartilhado/tipos';
import type { CenaFase3 } from '../CenaFase3';
import { COR, ESCALA, aleatorio, hexNum, texturaPixel } from '../lixao/ArteLixao';
import type { Pincel } from '../lixao/ArteLixao';
import { ALTURA_TELA, AREAS, CHAO_Y, LARGURA_TELA } from '../lixao/TiposLixao';
import type { InfoArea } from '../lixao/TiposLixao';

/** Profundidades de desenho comuns às áreas. */
export const PROF = {
  ceu: 0,
  fundo: 10,
  meio: 20,
  chao: 30,
  objetos: 40,
  jogador: 60,
  clima: 80,
  escuro: 90,
  textos: 100,
} as const;

/**
 * Base das 6 áreas do Lixão Eletrônico. Cada área monta céu e pilhas de lixo em parallax,
 * chão, o ponto de exercício (que também é checkpoint) e a saída para a área seguinte.
 */
export abstract class AreaLixao {
  public largura = 3840;
  public readonly altura = ALTURA_TELA;
  public inicio = { x: 160, y: CHAO_Y - 80 };
  /** Posição X do ponto de exercício. */
  public xExercicio = 1800;
  /** Posição X da saída (fim da área). */
  public xSaida = 3640;
  public readonly solidos: Phaser.Physics.Arcade.StaticGroup;
  public marcador!: Phaser.GameObjects.Sprite;
  public saida!: Phaser.GameObjects.Image;

  protected readonly cena: CenaFase3;
  protected readonly info: InfoArea;
  /** Cores do céu de cima para baixo. */
  protected abstract readonly coresCeu: readonly string[];
  /** Semente do cenário (cada área tem pilhas diferentes, sempre iguais entre visitas). */
  protected abstract readonly semente: number;

  constructor(cena: CenaFase3, indice: number) {
    this.cena = cena;
    this.info = AREAS[indice];
    this.solidos = cena.physics.add.staticGroup();
  }

  /** Monta o mundo (chamado uma vez no create da cena). */
  construir(): void {
    this.criarCeu();
    this.criarPilhas('fundo', 0.3, PROF.fundo, 0.55, 40);
    this.criarPilhas('meio', 0.6, PROF.meio, 0.85, 70);
    this.criarChao();
    this.criarMarcador();
    this.criarSaida();
    this.decorar();
    this.criarClima();
  }

  /** Detalhes próprios da área (chamado depois do chão e antes do clima). */
  protected decorar(): void {}

  atualizar(_tempo: number, _delta: number): void {}

  aoResultadoTerminal(_resultado: ResultadoComando): void {}

  /* =========================================================================
   * CONSTRUÇÃO
   * ========================================================================= */

  /**
   * Camada de parallax em pixel art. A largura cobre o mundo inteiro com o fator informado.
   */
  protected camada(
    chave: string,
    fator: number,
    profundidade: number,
    desenhar: (p: Pincel, largura: number, altura: number) => void
  ): Phaser.GameObjects.Image {
    const larguraArte = Math.ceil((LARGURA_TELA + (this.largura - LARGURA_TELA) * fator) / ESCALA) + 2;
    const alturaArte = Math.ceil(ALTURA_TELA / ESCALA);
    texturaPixel(this.cena, chave, larguraArte, alturaArte, (p) => desenhar(p, larguraArte, alturaArte));
    return this.cena.add.image(0, 0, chave).setOrigin(0, 0).setScale(ESCALA).setScrollFactor(fator, 0).setDepth(profundidade);
  }

  private chave(nome: string): string {
    return `lx-a${this.info.numero}-${nome}`;
  }

  private criarCeu(): void {
    const cores = this.coresCeu;
    texturaPixel(this.cena, this.chave('ceu'), LARGURA_TELA / ESCALA, ALTURA_TELA / ESCALA, (p) =>
      p.degradePontilhado(0, 0, LARGURA_TELA / ESCALA, ALTURA_TELA / ESCALA, cores)
    );
    this.cena.add.image(0, 0, this.chave('ceu')).setOrigin(0, 0).setScale(ESCALA).setScrollFactor(0).setDepth(PROF.ceu);
  }

  /** Silhuetas de montanhas de sucata, com placas e fios de cobre nas mais próximas. */
  private criarPilhas(nome: string, fator: number, profundidade: number, escuridao: number, alturaMax: number): void {
    const rnd = aleatorio(this.semente + fator * 1000);
    const corBase = escuridao < 0.7 ? COR.sucata : COR.sucataEscura;
    this.camada(this.chave(nome), fator, profundidade, (p, w, h) => {
      const base = h - 16;
      let x = -10;
      while (x < w) {
        const larg = 30 + Math.floor(rnd() * 50);
        const alt = 15 + Math.floor(rnd() * alturaMax);
        const cx = x + larg / 2;
        for (let xx = x; xx < x + larg; xx++) {
          const t = 1 - Math.abs(xx - cx) / (larg / 2);
          const topo = Math.round(base - alt * Math.sqrt(Math.max(0, t)) + rnd() * 2);
          p.px(xx, topo, 1, h - topo, corBase);
        }
        if (escuridao > 0.7) {
          for (let i = 0; i < 4; i++) {
            const px = x + 6 + rnd() * (larg - 12);
            const py = base - rnd() * alt * 0.6;
            if (rnd() < 0.5) p.px(px, py, 4, 3, COR.placa);
            else p.linha(px, py, px + 4, py - 3, COR.cobreEscuro);
          }
        }
        x += larg - 8;
      }
    });
  }

  private criarChao(): void {
    const w = Math.ceil(this.largura / ESCALA);
    const h = Math.ceil((ALTURA_TELA - CHAO_Y) / ESCALA);
    const rnd = aleatorio(this.semente);
    texturaPixel(this.cena, this.chave('chao'), w, h, (p) => {
      p.px(0, 0, w, h, COR.sucataEscura);
      p.px(0, 0, w, 1, COR.sucata);
      for (let i = 0; i < w / 6; i++) {
        const x = rnd() * w;
        const y = 2 + rnd() * (h - 3);
        const r = rnd();
        if (r < 0.3) p.px(x, y, 3, 2, COR.placaEscura);
        else if (r < 0.5) p.ponto(x, y, COR.cobreEscuro);
        else p.ponto(x, y, COR.contorno);
      }
    });
    this.cena.add.image(0, CHAO_Y, this.chave('chao')).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.chao);

    const corpo = this.cena.add.rectangle(this.largura / 2, CHAO_Y + 40, this.largura, 80, 0, 0);
    this.solidos.add(corpo);
  }

  private criarMarcador(): void {
    this.marcador = this.cena.add
      .sprite(this.xExercicio, CHAO_Y, 'lx-terminal', 0)
      .setOrigin(0.5, 1)
      .setScale(ESCALA)
      .setDepth(PROF.objetos);
    this.cena.add
      .image(this.xExercicio, CHAO_Y - 56, 'lx-brilho')
      .setTint(hexNum(COR.neon))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.6)
      .setAlpha(0.5)
      .setDepth(PROF.objetos);
    this.cena.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => this.marcador.setFrame(this.marcador.frame.name === '0' ? 1 : 0),
    });
  }

  private criarSaida(): void {
    this.saida = this.cena.add.image(this.xSaida, CHAO_Y, 'lx-saida').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.objetos);
  }

  /** Efeito do clima da área: poeira, chuva ou escuridão. Ensolarado não tem efeito. */
  private criarClima(): void {
    const clima = this.info.clima;
    if (clima === 'empoeirado') {
      this.cena.add
        .particles(0, 0, 'lx-poeira', {
          x: { min: 0, max: LARGURA_TELA },
          y: { min: 0, max: ALTURA_TELA },
          lifespan: 4000,
          speedX: { min: -220, max: -120 },
          speedY: { min: -10, max: 20 },
          scale: { min: 1, max: 3 },
          alpha: { start: 0.6, end: 0 },
          quantity: 4,
          frequency: 40,
          tint: [hexNum(COR.ceuAreia), hexNum(COR.ceuPo)],
        })
        .setScrollFactor(0)
        .setDepth(PROF.clima);
      this.cena.add
        .rectangle(0, 0, LARGURA_TELA, ALTURA_TELA, hexNum(COR.ceuPo), 0.35)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(PROF.clima);
    } else if (clima === 'chuva') {
      this.cena.add
        .particles(0, 0, 'lx-poeira', {
          x: { min: -100, max: LARGURA_TELA + 100 },
          y: -10,
          lifespan: 900,
          speedY: { min: 800, max: 1000 },
          speedX: -120,
          scaleX: 0.5,
          scaleY: 4,
          alpha: 0.5,
          quantity: 6,
          frequency: 16,
          tint: 0xaabbee,
        })
        .setScrollFactor(0)
        .setDepth(PROF.clima);
    } else if (clima === 'noite') {
      this.cena.add
        .rectangle(0, 0, LARGURA_TELA, ALTURA_TELA, hexNum(COR.ceuNoite), 0.45)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(PROF.escuro);
    }
  }
}
