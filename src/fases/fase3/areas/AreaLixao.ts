import Phaser from 'phaser';
import type { CenaFase3 } from '../CenaFase3';
import { BORDA_CHAO, COR, ESCALA, aleatorio, desenharChao, desenharMuralha, grade, hexNum, texturaPixel } from '../lixao/ArteLixao';
import type { CorLixao, Pincel } from '../lixao/ArteLixao';
import { ALTURA_TELA, AREAS, CHAO_Y } from '../lixao/TiposLixao';
import type { InfoArea } from '../lixao/TiposLixao';

/** Profundidades de desenho comuns ao mapa. */
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

/** Visual de um trecho: céu, camadas distantes e quanto o clima esfria o cenário. */
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

/** Distância do ponto de exercício até a barreira de entulho que ele libera. */
const DISTANCIA_BARREIRA = 160;
const LARGURA_BARREIRA = 64;

/**
 * Base dos 6 trechos do mapa contínuo do Lixão Eletrônico. Cada trecho começa em `offset`
 * (x de mundo) e tem largura própria; monta seu chão, o ponto de exercício (que também é
 * checkpoint), a barreira que o exercício libera e os obstáculos e a decoração do trecho.
 * Céu, parallax e clima são do mapa inteiro (ver CenarioLixao).
 */
export abstract class AreaLixao {
  /** Início do trecho em x de mundo (definido pela FabricaAreas). */
  public offset = 0;
  public largura = 3840;
  /** Posição X do ponto de exercício, relativa ao início do trecho. */
  protected xExercicioLocal = 1800;
  public marcador!: Phaser.GameObjects.Sprite;
  public readonly info: InfoArea;
  /** Cores, astro e tinta do clima do trecho. */
  public abstract readonly tema: TemaArea;
  /** Semente do cenário (cada trecho tem chão diferente, sempre igual entre visitas). */
  protected abstract readonly semente: number;

  protected readonly cena: CenaFase3;
  private resolvido = false;
  private barreira?: { img: Phaser.GameObjects.Image; corpo: Phaser.GameObjects.Rectangle };

  constructor(cena: CenaFase3, indice: number) {
    this.cena = cena;
    this.info = AREAS[indice];
  }

  /** Fim do trecho em x de mundo. */
  get fim(): number {
    return this.offset + this.largura;
  }

  /** Ponto de exercício em x de mundo. */
  get xExercicio(): number {
    return grade(this.offset + this.xExercicioLocal);
  }

  /** Onde o jogador aparece ao entrar no trecho (atalho de depuração). */
  get inicio(): { x: number; y: number } {
    return { x: this.offset + 160, y: CHAO_Y - 80 };
  }

  get exercicioResolvido(): boolean {
    return this.resolvido;
  }

  contem(x: number): boolean {
    return x >= this.offset && x < this.fim;
  }

  /** Monta o trecho (chamado uma vez no create da cena, depois de definido o offset). */
  construir(): void {
    this.criarChao();
    this.criarMarcador();
    this.criarBarreira();
    this.decorar();
  }

  /** Obstáculos e detalhes próprios do trecho. */
  protected decorar(): void {}

  /** Exercício resolvido: a barreira de entulho desaba e libera o caminho. */
  resolverExercicio(): void {
    if (this.resolvido) return;
    this.resolvido = true;
    const barreira = this.barreira;
    if (!barreira) return;
    this.cena.solidos.remove(barreira.corpo, true, true);
    this.cena.tweens.add({
      targets: barreira.img,
      y: barreira.img.y + ALTURA_TELA,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeIn',
      onComplete: () => barreira.img.destroy(),
    });
    this.cena.cameras.main.shake(300, 0.006);
  }

  /* =========================================================================
   * CONSTRUÇÃO
   * Coordenadas x dos helpers são relativas ao início do trecho.
   * ========================================================================= */

  protected chave(nome: string): string {
    return `lx-a${this.info.numero}-${nome}`;
  }

  /** Registra o objeto para receber a tinta do clima atual (nunca o que é ciano). */
  protected tingir<T extends Phaser.GameObjects.Components.Tint>(obj: T): T {
    this.cena.cenario.registrarTingivel(obj);
    return obj;
  }

  /**
   * Decoração de chão em pixel art, alinhada à grade e tingida pelo clima. É pulada se cair
   * sobre o terminal ou a barreira, para não esconder o que é interativo.
   */
  protected decoracao(x: number, chave: string, espelhar = false, afundar = 0): void {
    const livre = x < this.xExercicioLocal - 120 || x > this.xExercicioLocal + DISTANCIA_BARREIRA + LARGURA_BARREIRA + 60;
    if (!livre) return;
    const img = this.cena.add
      .image(grade(this.offset + x), CHAO_Y + afundar * ESCALA, chave)
      .setOrigin(0.5, 1)
      .setScale(ESCALA)
      .setFlipX(espelhar)
      .setDepth(PROF.objetos);
    this.tingir(img);
  }

  /**
   * Obstáculo sólido em pixel art: textura do tamanho exato do corpo de colisão, alinhada
   * à grade. x e y são o canto superior esquerdo.
   */
  protected solido(
    nome: string,
    x: number,
    y: number,
    largura: number,
    altura: number,
    desenhar: (p: Pincel, w: number, h: number) => void
  ): { img: Phaser.GameObjects.Image; corpo: Phaser.GameObjects.Rectangle } {
    const gx = grade(this.offset + x);
    const gy = grade(y);
    const w = Math.round(largura / ESCALA);
    const h = Math.round(altura / ESCALA);
    texturaPixel(this.cena, this.chave(nome), w, h, (p) => desenhar(p, w, h));
    const img = this.cena.add.image(gx, gy, this.chave(nome)).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.objetos);
    const corpo = this.cena.add.rectangle(gx + (w * ESCALA) / 2, gy + (h * ESCALA) / 2, w * ESCALA, h * ESCALA, 0, 0);
    this.cena.solidos.add(corpo);
    this.tingir(img);
    return { img, corpo };
  }

  /** Perigo apoiado no chão: encostar tira 1 bateria (ver CenaFase3). x é o centro. */
  protected perigo(nome: string, x: number, chave: string): Phaser.GameObjects.Image {
    const img = this.cena.add
      .image(grade(this.offset + x), CHAO_Y, chave)
      .setOrigin(0.5, 1)
      .setScale(ESCALA)
      .setDepth(PROF.objetos)
      .setName(this.chave(nome));
    this.cena.perigos.add(img);
    return img;
  }

  /** Chão de sucata do trecho, com colisão na linha CHAO_Y. */
  private criarChao(): void {
    const w = Math.ceil(this.largura / ESCALA);
    const h = Math.ceil((ALTURA_TELA - CHAO_Y) / ESCALA) + BORDA_CHAO;
    const rnd = aleatorio(this.semente);
    texturaPixel(this.cena, this.chave('chao'), w, h, (p) => desenharChao(p, w, h, rnd));
    this.tingir(
      this.cena.add
        .image(this.offset, CHAO_Y - BORDA_CHAO * ESCALA, this.chave('chao'))
        .setOrigin(0, 0)
        .setScale(ESCALA)
        .setDepth(PROF.chao)
    );

    const corpo = this.cena.add.rectangle(this.offset + this.largura / 2, CHAO_Y + 40, this.largura, 80, 0, 0);
    this.cena.solidos.add(corpo);
  }

  /** Ponto de exercício: terminal com LED ciano piscando e brilho neon (acima da escuridão). */
  private criarMarcador(): void {
    const x = this.xExercicio;
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

  /**
   * Barreira provisória de entulho logo depois do ponto de exercício: vai do chão ao topo
   * da tela e só cai quando o exercício do trecho é resolvido.
   */
  private criarBarreira(): void {
    const rnd = aleatorio(this.semente + 91);
    this.barreira = this.solido(
      'barreira',
      this.xExercicioLocal + DISTANCIA_BARREIRA,
      0,
      LARGURA_BARREIRA,
      CHAO_Y,
      (p, w, h) => desenharMuralha(p, w, h, rnd)
    );
  }
}
