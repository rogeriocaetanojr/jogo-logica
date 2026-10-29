import Phaser from 'phaser';
import type { CenaFase3 } from '../CenaFase3';
import {
  BORDA_CHAO,
  COR,
  ESCALA,
  aleatorio,
  desenharBlocoSucata,
  desenharCano,
  desenharChao,
  desenharFosso,
  desenharMuralha,
  desenharPortao,
  desenharViga,
  grade,
  hexNum,
  texturaPixel,
} from '../lixao/ArteLixao';
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

/**
 * Obstáculo logo depois do ponto de exercício, que o exercício libera: muralha de entulho
 * que desaba, vão sem ponte que ganha uma ponte ou portão que sobe.
 */
export type SaidaArea = 'entulho' | 'vao' | 'portao';

/** Largura máxima de um trecho. */
export const LARGURA_MAXIMA_AREA = 5120;
/** Distância do ponto de exercício até o obstáculo de saída. */
const DISTANCIA_SAIDA = 160;
/**
 * Largura de cada obstáculo de saída. O vão passa do alcance do pulo com corrida (cerca de
 * 490 px somando o coyote time e a largura da hitbox), então só se cruza pela ponte.
 */
const LARGURA_SAIDA: Record<SaidaArea, number> = { entulho: 64, vao: 576, portao: 64 };
/** Distância mínima entre uma decoração de chão e a beira de um buraco. */
const MARGEM_BURACO = 40;
/** Altura livre sob um cano baixo: só cabe o jogador abaixado (em pé ele tem 96 px). */
const VAO_ABAIXADO = 72;

/**
 * Base dos 6 trechos do mapa contínuo do Lixão Eletrônico. Cada trecho começa em `offset`
 * (x de mundo) e tem largura própria; monta seu chão com buracos, o ponto de exercício (que
 * também é checkpoint), o obstáculo de saída que o exercício libera e os obstáculos e a
 * decoração do trecho. Céu, parallax e clima são do mapa inteiro (ver CenarioLixao).
 *
 * Alcance do pulo (gravidade 600, impulso 520): cerca de 225 px de altura e 416 px de
 * distância no mesmo nível. Buracos dos trechos ficam em até 192 px e degraus em até 144 px.
 */
export abstract class AreaLixao {
  /** Início do trecho em x de mundo (definido pela FabricaAreas). */
  public offset = 0;
  /** Largura do trecho; no máximo LARGURA_MAXIMA_AREA. */
  public largura = 3840;
  /** Posição X do ponto de exercício, relativa ao início do trecho. */
  protected xExercicioLocal = 1800;
  /** Obstáculo que bloqueia a saída até o exercício ser resolvido. */
  protected saida: SaidaArea = 'entulho';
  /**
   * Buracos no chão como [x, largura], relativos ao trecho e múltiplos de 4. Nenhum buraco
   * tem fundo: cair nele mata e devolve ao checkpoint (ver CenaFase3).
   */
  protected buracos: ReadonlyArray<readonly [number, number]> = [];
  public marcador!: Phaser.GameObjects.Sprite;
  public readonly info: InfoArea;
  /** Cores, astro e tinta do clima do trecho. */
  public abstract readonly tema: TemaArea;
  /** Semente do cenário (cada trecho tem chão diferente, sempre igual entre visitas). */
  protected abstract readonly semente: number;

  protected readonly cena: CenaFase3;
  private resolvido = false;
  private bloqueio?: { img: Phaser.GameObjects.Image; corpo: Phaser.GameObjects.Rectangle };
  private rndObstaculos?: () => number;

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

  /** Onde o jogador aparece ao entrar no trecho (atalho de depuração e primeiro checkpoint). */
  get inicio(): { x: number; y: number } {
    return { x: this.offset + 160, y: CHAO_Y - 80 };
  }

  get exercicioResolvido(): boolean {
    return this.resolvido;
  }

  /** Início do obstáculo de saída, relativo ao trecho. */
  protected get xSaidaLocal(): number {
    return this.xExercicioLocal + DISTANCIA_SAIDA;
  }

  contem(x: number): boolean {
    return x >= this.offset && x < this.fim;
  }

  /** Monta o trecho (chamado uma vez no create da cena, depois de definido o offset). */
  construir(): void {
    if (this.largura > LARGURA_MAXIMA_AREA) console.warn(`Área ${this.info.numero} passa de ${LARGURA_MAXIMA_AREA} px.`);
    this.criarChao();
    this.criarMarcador();
    this.criarSaida();
    this.decorar();
  }

  /** Obstáculos e detalhes próprios do trecho. */
  protected decorar(): void {}

  /**
   * Exercício resolvido (ou tecla de depuração): libera a saída. O entulho desaba, o
   * portão sobe e o vão ganha uma ponte.
   */
  resolverExercicio(): void {
    if (this.resolvido) return;
    this.resolvido = true;
    this.cena.cameras.main.shake(300, 0.006);
    if (this.saida === 'vao') {
      this.criarPonte();
      return;
    }
    const bloqueio = this.bloqueio;
    if (!bloqueio) return;
    this.cena.solidos.remove(bloqueio.corpo, true, true);
    const desaba = this.saida === 'entulho';
    this.cena.tweens.add({
      targets: bloqueio.img,
      y: bloqueio.img.y + (desaba ? ALTURA_TELA : -CHAO_Y),
      alpha: desaba ? 0 : 1,
      duration: desaba ? 900 : 1200,
      ease: desaba ? 'Quad.easeIn' : 'Sine.easeInOut',
      onComplete: () => bloqueio.img.destroy(),
    });
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
   * sobre o terminal, a saída ou um buraco, para não esconder o que é interativo nem flutuar.
   */
  protected decoracao(x: number, chave: string, espelhar = false, afundar = 0): void {
    const fimSaida = this.xSaidaLocal + LARGURA_SAIDA[this.saida];
    const livre = x < this.xExercicioLocal - 120 || x > fimSaida + 60;
    const sobreBuraco = this.buracos.some(([bx, bl]) => x > bx - MARGEM_BURACO && x < bx + bl + MARGEM_BURACO);
    if (!livre || sobreBuraco) return;
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

  /** Bloco de sucata prensada apoiado no chão; x é a borda esquerda. */
  protected bloco(nome: string, x: number, altura: number, largura = 64): void {
    this.solido(nome, x, CHAO_Y - altura, largura, altura, (p, w, h) => desenharBlocoSucata(p, w, h, this.rnd));
  }

  /** Viga suspensa com o topo `altura` px acima do chão; x é a borda esquerda. */
  protected viga(nome: string, x: number, altura: number, largura = 128): void {
    this.solido(nome, x, CHAO_Y - altura, largura, 20, desenharViga);
  }

  /**
   * Passagem baixa: cano com vão de 72 px até o chão e muralha de entulho até o topo da
   * tela em cima, então só passa abaixado (não dá para pular por cima).
   */
  protected passagemBaixa(nome: string, x: number, largura: number): void {
    const baseCano = CHAO_Y - VAO_ABAIXADO;
    this.solido(`${nome}-cano`, x, baseCano - 24, largura, 24, desenharCano);
    this.solido(`${nome}-muralha`, x, 0, largura, baseCano - 24, (p, w, h) => desenharMuralha(p, w, h, this.rnd));
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

  /** Sorteio dos obstáculos do trecho (sempre o mesmo entre visitas). */
  private get rnd(): () => number {
    this.rndObstaculos ??= aleatorio(this.semente + 51);
    return this.rndObstaculos;
  }

  /** Chão de sucata do trecho em segmentos, separados pelos buracos e pelo vão de saída. */
  private criarChao(): void {
    const vaos = [...this.buracos];
    if (this.saida === 'vao') vaos.push([this.xSaidaLocal, LARGURA_SAIDA.vao]);
    vaos.sort((a, b) => a[0] - b[0]);
    let x = 0;
    vaos.forEach(([inicio, largura], i) => {
      this.criarSegmentoChao(i, x, inicio);
      this.criarFosso(i, inicio, largura);
      x = inicio + largura;
    });
    this.criarSegmentoChao(vaos.length, x, this.largura);
  }

  /** Um segmento de chão, com colisão na linha CHAO_Y e beirada escura junto aos buracos. */
  private criarSegmentoChao(indice: number, de: number, ate: number): void {
    if (ate <= de) return;
    const largura = ate - de;
    const w = Math.ceil(largura / ESCALA);
    const h = Math.ceil((ALTURA_TELA - CHAO_Y) / ESCALA) + BORDA_CHAO;
    const rnd = aleatorio(this.semente + indice * 13);
    texturaPixel(this.cena, this.chave(`chao-${indice}`), w, h, (p) => {
      desenharChao(p, w, h, rnd);
      if (de > 0) p.px(0, BORDA_CHAO, 1, h - BORDA_CHAO, COR.contorno);
      if (ate < this.largura) p.px(w - 1, BORDA_CHAO, 1, h - BORDA_CHAO, COR.contorno);
    });
    this.tingir(
      this.cena.add
        .image(this.offset + de, CHAO_Y - BORDA_CHAO * ESCALA, this.chave(`chao-${indice}`))
        .setOrigin(0, 0)
        .setScale(ESCALA)
        .setDepth(PROF.chao)
    );

    const corpo = this.cena.add.rectangle(this.offset + de + largura / 2, CHAO_Y + 40, largura, 80, 0, 0);
    this.cena.solidos.add(corpo);
  }

  /** Boca escura do buraco, atrás do chão; não tem colisão. */
  private criarFosso(indice: number, x: number, largura: number): void {
    const w = Math.ceil(largura / ESCALA);
    const h = Math.ceil((ALTURA_TELA - CHAO_Y) / ESCALA);
    const rnd = aleatorio(this.semente + indice * 17 + 5);
    texturaPixel(this.cena, this.chave(`fosso-${indice}`), w, h, (p) => desenharFosso(p, w, h, rnd));
    this.tingir(
      this.cena.add
        .image(this.offset + x, CHAO_Y, this.chave(`fosso-${indice}`))
        .setOrigin(0, 0)
        .setScale(ESCALA)
        .setDepth(PROF.chao - 1)
    );
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
   * Obstáculo de saída logo depois do ponto de exercício. Entulho e portão vão do chão ao
   * topo da tela; o vão já é um buraco do chão (ver criarChao) e só ganha a ponte ao resolver.
   */
  private criarSaida(): void {
    if (this.saida === 'vao') return;
    const rnd = aleatorio(this.semente + 91);
    this.bloqueio = this.solido(
      'saida',
      this.xSaidaLocal,
      0,
      LARGURA_SAIDA[this.saida],
      CHAO_Y,
      this.saida === 'portao' ? desenharPortao : (p, w, h) => desenharMuralha(p, w, h, rnd)
    );
  }

  /** Ponte de viga sobre o vão de saída, com o topo rente ao chão. */
  private criarPonte(): void {
    const ponte = this.solido('ponte', this.xSaidaLocal, CHAO_Y, LARGURA_SAIDA.vao, 20, desenharViga);
    const y = ponte.img.y;
    ponte.img.setAlpha(0).setY(y + 40);
    this.cena.tweens.add({ targets: ponte.img, y, alpha: 1, duration: 600, ease: 'Back.easeOut' });
  }
}
