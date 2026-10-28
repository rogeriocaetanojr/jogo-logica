import Phaser from 'phaser';
import type { ResultadoComando } from '../../../compartilhado/tipos';
import type { CenaFase3 } from '../CenaFase3';
import {
  BORDA_CHAO,
  COR,
  ESCALA,
  aleatorio,
  bayer,
  desenharChao,
  desenharPilha,
  grade,
  hexNum,
  texturaPixel,
} from '../lixao/ArteLixao';
import type { CorLixao, Pincel, TipoPilha } from '../lixao/ArteLixao';
import { ALTURA_TELA, AREAS, CHAO_Y, LARGURA_TELA } from '../lixao/TiposLixao';
import type { InfoArea } from '../lixao/TiposLixao';

/** Profundidades de desenho comuns às áreas. */
export const PROF = {
  ceu: 0,
  nuvens: 5,
  horizonte: 10,
  pilhas: 20,
  chao: 30,
  objetos: 40,
  jogador: 60,
  clima: 80,
  escuro: 90,
  textos: 100,
} as const;

/** Visual de uma área: céu, camadas distantes e quanto o clima esfria o cenário. */
export interface TemaArea {
  /** Cores do céu de cima para baixo. */
  ceu: readonly CorLixao[];
  /** Sol, lua ou nada atrás da poeira. */
  astro: 'sol' | 'lua' | null;
  /** Faixas de nuvem e poeira (camada lenta). */
  nuvem: CorLixao;
  /** Silhueta das montanhas de lixo no horizonte. */
  horizonte: CorLixao;
  /** Tinta multiplicada sobre pilhas, chão e decoração; ausente no tempo aberto. */
  tinta?: CorLixao;
}

/** Fatores de parallax: as 3 camadas de céu e a camada de pilhas. */
const PARALLAX = { ceu: 0, nuvens: 0.1, horizonte: 0.25, pilhas: 0.55 } as const;

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
  /** Cores, astro e tinta do clima da área. */
  protected abstract readonly tema: TemaArea;
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
    this.criarNuvens();
    this.criarHorizonte();
    this.criarPilhas();
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

  /** Aplica a tinta do clima (pilhas, chão e decoração; nunca no que é ciano). */
  protected tingir<T extends Phaser.GameObjects.Components.Tint>(obj: T): T {
    if (this.tema.tinta) obj.setTint(hexNum(this.tema.tinta));
    return obj;
  }

  /** Decoração de chão em pixel art, alinhada à grade e tingida pelo clima. */
  protected decoracao(x: number, chave: string, espelhar = false, afundar = 0): Phaser.GameObjects.Image {
    const img = this.cena.add
      .image(grade(x), CHAO_Y + afundar * ESCALA, chave)
      .setOrigin(0.5, 1)
      .setScale(ESCALA)
      .setFlipX(espelhar)
      .setDepth(PROF.objetos);
    return this.tingir(img);
  }

  /**
   * Obstáculo sólido em pixel art: textura do tamanho exato do corpo de colisão, alinhada
   * à grade. x e y são o canto superior esquerdo, em coordenadas de mundo.
   */
  protected solido(
    nome: string,
    x: number,
    y: number,
    largura: number,
    altura: number,
    desenhar: (p: Pincel, w: number, h: number) => void
  ): Phaser.GameObjects.Image {
    const gx = grade(x);
    const gy = grade(y);
    const w = Math.round(largura / ESCALA);
    const h = Math.round(altura / ESCALA);
    texturaPixel(this.cena, this.chave(nome), w, h, (p) => desenhar(p, w, h));
    const img = this.cena.add.image(gx, gy, this.chave(nome)).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.objetos);
    const corpo = this.cena.add.rectangle(gx + (w * ESCALA) / 2, gy + (h * ESCALA) / 2, w * ESCALA, h * ESCALA, 0, 0);
    this.solidos.add(corpo);
    return this.tingir(img);
  }

  /** Camada 1 do céu (fixa): degradê pontilhado com sol ou lua. */
  private criarCeu(): void {
    const { ceu, astro } = this.tema;
    const w = LARGURA_TELA / ESCALA;
    const h = ALTURA_TELA / ESCALA;
    texturaPixel(this.cena, this.chave('ceu'), w, h, (p) => {
      p.degradePontilhado(0, 0, w, h, ceu);
      if (astro === 'sol') {
        // Sol baixo e abafado pela poeira
        for (let y = -16; y <= 16; y++) {
          for (let x = -16; x <= 16; x++) {
            const d = Math.sqrt(x * x + y * y);
            if (d <= 9) p.ponto(236 + x, 46 + y, COR.ceuPoeiraClaro);
            else if (d <= 16 && (16 - d) / 7 > bayer(x + 16, y + 16) * 1.6) p.ponto(236 + x, 46 + y, COR.ceuPoeiraClaro);
          }
        }
      } else if (astro === 'lua') {
        p.disco(250, 34, 7, COR.ceuPoeiraClaro);
        p.disco(253, 32, 6, ceu[0]);
      }
    });
    this.cena.add.image(0, 0, this.chave('ceu')).setOrigin(0, 0).setScale(ESCALA).setScrollFactor(PARALLAX.ceu).setDepth(PROF.ceu);
  }

  /** Camada 2 do céu: faixas de nuvem e poeira pontilhadas. */
  private criarNuvens(): void {
    const rnd = aleatorio(this.semente + 11);
    const cor = this.tema.nuvem;
    this.camada(this.chave('nuvens'), PARALLAX.nuvens, PROF.nuvens, (p, w) => {
      for (let x = Math.floor(rnd() * 40); x < w; x += 50 + Math.floor(rnd() * 60)) {
        const cy = 14 + Math.floor(rnd() * 70);
        const meio = 18 + Math.floor(rnd() * 26);
        const espessura = 2 + Math.floor(rnd() * 3);
        for (let dy = -espessura; dy <= espessura; dy++) {
          for (let dx = -meio; dx <= meio; dx++) {
            const densidade = (1 - Math.abs(dx) / meio) * (1 - Math.abs(dy) / (espessura + 1)) * 1.5;
            if (densidade > bayer(x + dx, cy + dy)) p.ponto(x + dx, cy + dy, cor);
          }
        }
      }
    });
  }

  /** Camada 3 do céu: montanhas de lixo distantes e guindastes em silhueta. */
  private criarHorizonte(): void {
    const rnd = aleatorio(this.semente + 23);
    const cor = this.tema.horizonte;
    const base = CHAO_Y / ESCALA + 2;
    this.tingir(
      this.camada(this.chave('horizonte'), PARALLAX.horizonte, PROF.horizonte, (p, w) => {
        let x = -20;
        while (x < w) {
          const larg = 50 + Math.floor(rnd() * 70);
          const alt = 14 + Math.floor(rnd() * 30);
          const cx = x + larg / 2;
          for (let xx = x; xx < x + larg; xx++) {
            const t = 1 - Math.abs(xx - cx) / (larg / 2);
            const topo = Math.round(base - alt * Math.sqrt(Math.max(0, t)) + rnd() * 2);
            p.px(xx, topo, 1, base - topo, cor);
          }
          if (rnd() < 0.3) {
            // Guindaste do lixão
            const gx = Math.round(cx);
            const topo = base - alt - 22;
            p.px(gx, topo, 2, base - topo, cor);
            p.linha(gx - 14, topo + 1, gx + 22, topo + 1, cor);
            p.linha(gx, topo - 4, gx - 14, topo + 1, cor);
            p.linha(gx + 1, topo - 4, gx + 22, topo + 1, cor);
            p.px(gx + 18, topo + 2, 1, 8, cor);
            p.px(gx + 17, topo + 10, 3, 2, cor);
          }
          x += larg - 14;
        }
      })
    );
  }

  /** Camada de pilhas: monitores, placas e cabos alternados ao longo da área. */
  private criarPilhas(): void {
    const rnd = aleatorio(this.semente + 37);
    const tipos: readonly TipoPilha[] = ['monitores', 'placas', 'cabos'];
    const base = CHAO_Y / ESCALA + 1;
    let anterior = -1;
    this.tingir(
      this.camada(this.chave('pilhas'), PARALLAX.pilhas, PROF.pilhas, (p, w) => {
        let x = 10 + Math.floor(rnd() * 20);
        while (x < w) {
          const larg = 40 + Math.floor(rnd() * 40);
          const alt = 26 + Math.floor(rnd() * 36);
          // Nunca o mesmo tipo duas vezes seguidas
          let i = Math.floor(rnd() * 3);
          if (i === anterior) i = (i + 1) % 3;
          anterior = i;
          desenharPilha(p, tipos[i], x + larg / 2, base, larg, alt, rnd);
          x += Math.round(larg * 0.8 + rnd() * 40);
        }
      })
    );
  }

  /** Chão de sucata com colisão na linha CHAO_Y. */
  private criarChao(): void {
    const w = Math.ceil(this.largura / ESCALA);
    const h = Math.ceil((ALTURA_TELA - CHAO_Y) / ESCALA) + BORDA_CHAO;
    const rnd = aleatorio(this.semente);
    texturaPixel(this.cena, this.chave('chao'), w, h, (p) => desenharChao(p, w, h, rnd));
    this.tingir(
      this.cena.add
        .image(0, CHAO_Y - BORDA_CHAO * ESCALA, this.chave('chao'))
        .setOrigin(0, 0)
        .setScale(ESCALA)
        .setDepth(PROF.chao)
    );

    const corpo = this.cena.add.rectangle(this.largura / 2, CHAO_Y + 40, this.largura, 80, 0, 0);
    this.solidos.add(corpo);
  }

  /** Ponto de exercício: terminal com LED ciano piscando e brilho neon (acima da escuridão). */
  private criarMarcador(): void {
    const x = grade(this.xExercicio);
    this.marcador = this.cena.add.sprite(x, CHAO_Y, 'lx-terminal', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.objetos);
    const brilho = this.cena.add
      .image(x, CHAO_Y - 64, 'lx-brilho')
      .setTint(hexNum(COR.neonCiano))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(ESCALA)
      .setAlpha(0.45)
      .setDepth(PROF.escuro + 1);
    this.cena.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        const aceso = this.marcador.frame.name !== '0';
        this.marcador.setFrame(aceso ? 0 : 1);
        brilho.setAlpha(aceso ? 0.45 : 0.2);
      },
    });
  }

  private criarSaida(): void {
    this.saida = this.cena.add
      .image(grade(this.xSaida), CHAO_Y, 'lx-saida')
      .setOrigin(0.5, 1)
      .setScale(ESCALA)
      .setDepth(PROF.escuro + 1);
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
          scale: { min: ESCALA, max: ESCALA * 2 },
          alpha: { start: 0.7, end: 0 },
          quantity: 4,
          frequency: 40,
          tint: [hexNum(COR.ceuPoeira), hexNum(COR.horizonte)],
        })
        .setScrollFactor(0)
        .setDepth(PROF.clima);
      this.cena.add
        .rectangle(0, 0, LARGURA_TELA, ALTURA_TELA, hexNum(COR.horizonte), 0.3)
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
          scaleX: ESCALA,
          scaleY: ESCALA * 4,
          alpha: 0.5,
          quantity: 6,
          frequency: 16,
          tint: hexNum(COR.tintaChuva),
        })
        .setScrollFactor(0)
        .setDepth(PROF.clima);
    } else if (clima === 'noite') {
      this.cena.add
        .rectangle(0, 0, LARGURA_TELA, ALTURA_TELA, hexNum(COR.noiteRoxoEscuro), 0.45)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(PROF.escuro);
    }
  }
}
