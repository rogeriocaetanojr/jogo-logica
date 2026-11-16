import Phaser from 'phaser';
import type { CenaFase3 } from '../CenaFase3';
import {
  BORDA_CHAO,
  COR,
  ENTULHO,
  MEIA_LARGURA_ENTULHO,
  ESCALA,
  aleatorio,
  bayer,
  desenharBlocoSucata,
  desenharCano,
  desenharChao,
  desenharFardo,
  desenharFosso,
  desenharBarreira,
  desenharViga,
  desenharPilhaEletronicos,
  grade,
  hexNum,
  texturaPixel,
} from '../lixao/ArteLixao';
import type { CorLixao, Pincel } from '../lixao/ArteLixao';
import { ALTURA_TELA, CHAO_Y, TRECHOS } from '../lixao/TiposLixao';
import { ALTURA_BARREIRA, ALTURA_ESPINHOS, CORREDOR, ESCADA, LAYOUTS } from './LayoutLixao';
import type { ExercicioLayout, LayoutTrecho, ObstaculoExercicio } from './LayoutLixao';
import type { InfoTrecho, TipoReciclavel } from '../lixao/TiposLixao';
import { TelaoAviso } from '../lixao/TelaoAviso';
import type { Aviso } from '../lixao/TelaoAviso';

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
export interface TemaTrecho {
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
 * Obstáculo do caminho logo depois do ponto de exercício, que o exercício libera: entulho
 * que desaba, vão sem ponte que ganha uma ponte ou portão de sucata que sobe.
 */
export type { ObstaculoExercicio };

/** Largura máxima de um trecho. */
export const LARGURA_MAXIMA_TRECHO = 7040;
/** Altura total de uma barreira com espinhos (sólida): passa do pulo máximo de 225 px. */
const BARREIRA = ALTURA_BARREIRA + ALTURA_ESPINHOS;
/**
 * Colinas de entulho no chão: escada de degraus baixos na colisão (o jogador sobe andando,
 * ver JogadorLixao) com o desenho inclinado por cima. Só em chão livre de mecanismos baixos.
 */
export const COLINA = {
  /** Altura de cada degrau da colisão (px). */
  DEGRAU: 8,
  /** Avanço horizontal de cada degrau (px): inclinação de 1 para 2. */
  PASSO: 16,
  ALTURAS: [16, 24, 32],
  /** Topo plano mínimo e máximo (px). */
  TOPO_MIN: 32,
  TOPO_MAX: 256,
  /** Distância livre exigida de buracos, mecanismos e itens (px). */
  MARGEM: 80,
  /** Elementos com o topo a esta altura ou mais não impedem colina embaixo (px). */
  ALTO_IGNORADO: 200,
} as const;

export interface Colina {
  /** Borda esquerda (relativa ao trecho), largura total e altura do topo. */
  x: number;
  w: number;
  alt: number;
}

/** Distância mínima entre uma decoração de chão e a beira de um buraco. */
const MARGEM_BURACO = 40;
/** Altura livre sob um cano baixo: só cabe o jogador abaixado (em pé ele tem 96 px). */
const VAO_ABAIXADO = 72;
/**
 * Largura de toda passagem baixa: 2 blocos de 64 px, cerca de 1 s abaixado (110 px/s).
 * Nenhuma passagem é mais larga que isto.
 */
const LARGURA_PASSAGEM_BAIXA = 128;
/**
 * Base dos 4 trechos do mapa contínuo do Lixão Eletrônico. Cada trecho começa em `offset`
 * (x de mundo) e tem largura própria; monta seu chão com buracos, o terminal do exercício no
 * alto da torre (que também é checkpoint), o obstáculo à frente dele no mesmo nível e os
 * mecanismos e a decoração do trecho (LayoutLixao). Não há divisa no fim: o trecho seguinte
 * continua o chão e só o clima muda. Céu, parallax e clima são do mapa inteiro (ver CenarioLixao).
 *
 * Nenhuma estrutura sólida passa de 3 blocos com espinhos (232 px), mais que o pulo de 225 px.
 */
export abstract class TrechoLixao {
  /** Início do trecho em x de mundo (definido pela FabricaTrechos). */
  public offset = 0;
  /** Largura do trecho; no máximo LARGURA_MAXIMA_TRECHO. */
  public largura = 5120;
  /**
   * Posição X do ponto de exercício, relativa ao início do trecho; null no trecho sem
   * exercício (a arena), cujo checkpoint é a entrada.
   */
  protected xExercicioLocal: number | null = null;
  /**
   * Exercício do trecho (LayoutLixao): terminal no alto da torre e o obstáculo à frente no
   * mesmo nível. Ausente na arena.
   */
  protected exercicio?: ExercicioLayout;
  /**
   * Buracos no chão como [x, largura], relativos ao trecho e múltiplos de 4. Nenhum buraco
   * tem fundo: cair nele mata e devolve ao checkpoint (ver CenaFase3).
   */
  protected buracos: ReadonlyArray<readonly [number, number]> = [];
  /**
   * Recicláveis soltos pelo chão do caminho como [x, tipo], relativos ao trecho (ver
   * QuedasLixao). Ficam sobre o sólido mais alto do ponto e não somem.
   */
  public readonly reciclaveis: ReadonlyArray<readonly [number, TipoReciclavel]> = [];
  public marcador?: Phaser.GameObjects.Sprite;
  public readonly info: InfoTrecho;
  /** Telão no céu, no começo do trecho, explicando os perigos (opcional). */
  public readonly aviso?: Aviso;
  /** Cores, astro e tinta do clima do trecho. */
  public abstract readonly tema: TemaTrecho;
  /** Semente do cenário (cada trecho tem chão diferente, sempre igual entre visitas). */
  protected abstract readonly semente: number;

  protected readonly cena: CenaFase3;
  private resolvido = false;
  private bloqueio?: { img: Phaser.GameObjects.Image; corpo: Phaser.GameObjects.Rectangle };
  private rndObstaculos?: () => number;

  constructor(cena: CenaFase3, indice: number) {
    this.cena = cena;
    this.info = TRECHOS[indice];
  }

  /** Fim do trecho em x de mundo. */
  get fim(): number {
    return this.offset + this.largura;
  }

  /** Ponto de exercício em x de mundo; null no trecho sem exercício. */
  get xExercicio(): number | null {
    return this.xExercicioLocal === null ? null : grade(this.offset + this.xExercicioLocal);
  }

  /** Onde o jogador aparece ao entrar no trecho (atalho de depuração e primeiro checkpoint). */
  get inicio(): { x: number; y: number } {
    return { x: this.offset + 160, y: CHAO_Y - 80 };
  }

  get exercicioResolvido(): boolean {
    return this.resolvido;
  }

  /** Altura (y de mundo) da plataforma do terminal: o terminal fica no alto da torre. */
  get yExercicio(): number {
    return CHAO_Y - (this.exercicio?.alt ?? 0);
  }

  /** Usa o exercício do layout: terminal, altura e obstáculo. */
  protected definirExercicio(ex: ExercicioLayout): void {
    this.exercicio = ex;
    this.xExercicioLocal = ex.x;
  }

  /**
   * Chão firme em x (relativo ao trecho), numa faixa de meia largura informada: fora dos
   * buracos, do obstáculo do exercício e da área do terminal. Usado para espalhar poças e decoração.
   */
  chaoLivre(x: number, meiaLargura: number): boolean {
    if (this.colinas.some((c) => x + meiaLargura > c.x - 16 && x - meiaLargura < c.x + c.w + 16)) return false;
    return this.chaoPlanoLivre(x, meiaLargura);
  }

  private colinasCache?: Colina[];

  /** Colinas do trecho, sorteadas uma vez com a semente (sempre as mesmas). */
  get colinas(): readonly Colina[] {
    this.colinasCache ??= this.sortearColinas();
    return this.colinasCache;
  }

  /** Faixas x ocupadas por buraco, mecanismo baixo, item, queda ou patrulha: sem colina. */
  private faixasOcupadas(): [number, number][] {
    const layout = LAYOUTS[TRECHOS.indexOf(this.info)];
    const faixas: [number, number][] = [[0, 400], [this.largura - 240, this.largura]];
    for (const [x] of this.reciclaveis) faixas.push([x, x]);
    if (!layout) {
      // Arena do chefão: só o chão antes das pilhas da entrada
      faixas.push([300, this.largura]);
      return faixas;
    }
    for (const e of layout.elementos) {
      // O que fica no alto não atrapalha: sobra vão livre para o jogador em pé sobre a colina
      if ('alt' in e && e.alt >= COLINA.ALTO_IGNORADO) continue;
      const w = 'w' in e ? e.w : 0;
      const fim = e.tipo === 'guindaste' ? e.ate + w : e.tipo === 'garra' ? e.ate + 40 : e.tipo === 'baixa' ? e.x + 128 : e.x + w;
      faixas.push([e.tipo === 'garra' ? e.x - 40 : e.x, fim]);
    }
    for (const [x, alt] of layout.quedas) if (alt === 0) faixas.push([x, x]);
    faixas.push([layout.patrulhaRecicla[0], layout.patrulhaRecicla[1]]);
    return faixas;
  }

  private sortearColinas(): Colina[] {
    const rnd = aleatorio(this.semente + 313);
    const faixas = this.faixasOcupadas();
    const m = COLINA.MARGEM;
    const colinas: Colina[] = [];
    let x = 400;
    while (x < this.largura) {
      const alt = COLINA.ALTURAS[Math.floor(rnd() * COLINA.ALTURAS.length)];
      const rampa = (alt / COLINA.DEGRAU) * COLINA.PASSO;
      const topo = COLINA.TOPO_MIN + Math.floor((rnd() * (COLINA.TOPO_MAX - COLINA.TOPO_MIN)) / 16) * 16;
      const w = rampa * 2 + topo;
      const livre =
        this.chaoPlanoLivre(x + w / 2, w / 2 + 40) && !faixas.some(([a, b]) => x + w + m > a && x - m < b);
      if (livre) {
        colinas.push({ x, w, alt });
        x += w + 160 + Math.floor(rnd() * 320);
      } else x += 32;
    }
    return colinas;
  }

  /** Chão sem buraco, terminal nem obstáculo (ignora as colinas). */
  private chaoPlanoLivre(x: number, meiaLargura: number): boolean {
    const ex = this.exercicio;
    if (ex) {
      const fimObstaculo = ex.xObstaculo + ex.largura;
      if (x + meiaLargura > ex.x - 120 && x - meiaLargura < fimObstaculo + 60) return false;
    }
    if (x - meiaLargura < 0 || x + meiaLargura > this.largura) return false;
    return !this.buracos.some(([bx, bl]) => x + meiaLargura > bx - MARGEM_BURACO && x - meiaLargura < bx + bl + MARGEM_BURACO);
  }

  contem(x: number): boolean {
    return x >= this.offset && x < this.fim;
  }

  /** Monta o trecho (chamado uma vez no create da cena, depois de definido o offset). */
  construir(): void {
    if (this.largura > LARGURA_MAXIMA_TRECHO) console.warn(`Trecho ${this.info.numero} passa de ${LARGURA_MAXIMA_TRECHO} px.`);
    this.criarChao();
    this.colinas.forEach((c, i) => this.criarColina(c, i));
    this.criarMarcador();
    if (this.aviso) new TelaoAviso(this.cena, this.offset + 640, this.aviso);
    this.criarObstaculo();
    this.decorar();
    this.entulhar();
  }

  /** Intervalo médio entre peças de entulho no chão; menor deixa o trecho mais poluído. */
  protected espacoEntulho = 110;

  /**
   * Entulho denso pelo chão inteiro (fora de buracos, terminal e obstáculo): sucata sorteada
   * com semente fixa, às vezes em grupos de 2 ou 3 peças sobrepostas. Fica atrás dos
   * recicláveis e do jogador, sem colisão.
   */
  private entulhar(): void {
    const rnd = aleatorio(this.semente + 777);
    let x = 40 + Math.floor(rnd() * 60);
    while (x < this.largura - 40) {
      const grupo = rnd() < 0.3 ? 2 + Math.floor(rnd() * 2) : 1;
      for (let g = 0; g < grupo; g++) {
        const gx = x + g * (16 + Math.floor(rnd() * 24));
        if (!this.chaoLivre(gx, MEIA_LARGURA_ENTULHO)) continue;
        const chave = ENTULHO[Math.floor(rnd() * ENTULHO.length)];
        const afundar = chave.startsWith('lx-ent-monte') ? 2 : Math.floor(rnd() * 2);
        const img = this.cena.add
          .image(grade(this.offset + gx), CHAO_Y + afundar * ESCALA, chave)
          .setOrigin(0.5, 1)
          .setScale(ESCALA)
          .setFlipX(rnd() < 0.5)
          .setDepth(PROF.chao + 1 + g);
        this.tingir(img);
      }
      x += Math.round(this.espacoEntulho * (0.5 + rnd()));
    }
  }

  /** Obstáculos e detalhes próprios do trecho. */
  protected decorar(): void {}

  /**
   * Monta o level design do LayoutLixao: vigas e passagens baixas aqui; esteiras,
   * prensas, frágeis, guindastes, choques, ímãs, portões, alavancas, botões, pontes e
   * checkpoints extras em cena.mecanismos.
   */
  protected montarLayout(layout: LayoutTrecho): void {
    layout.elementos.forEach((e, i) => {
      const nome = `${e.tipo}-${i}`;
      if (e.tipo === 'viga') this.viga(nome, e.x, e.alt, e.w);
      else if (e.tipo === 'baixa') this.passagemBaixa(nome, e.x);
      else this.cena.mecanismos.adicionar(e, this.offset, TRECHOS.indexOf(this.info));
    });
  }

  /**
   * Exercício resolvido (ou tecla de depuração): libera o caminho no nível do terminal. O vão
   * ganha uma ponte subindo, ou uma plataforma descendo do alto, ou o portão sobe e some.
   */
  resolverExercicio(): void {
    const ex = this.exercicio;
    if (this.resolvido || !ex) return;
    this.resolvido = true;
    if (ex.obstaculo === 'choque') {
      this.cortarEnergia();
      return;
    }
    if (ex.obstaculo === 'escada') {
      this.construirEscada(ex);
      return;
    }
    this.cena.cameras.main.shake(300, 0.006);
    if (ex.obstaculo !== 'portao') {
      this.criarPassagem(ex);
      return;
    }
    const bloqueio = this.bloqueio;
    if (!bloqueio) return;
    this.cena.solidos.remove(bloqueio.corpo, true, true);
    this.cena.tweens.add({
      targets: bloqueio.img,
      y: bloqueio.img.y - BARREIRA,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => bloqueio.img.destroy(),
    });
  }

  /* =========================================================================
   * CONSTRUÇÃO
   * Coordenadas x dos helpers são relativas ao início do trecho.
   * ========================================================================= */

  protected chave(nome: string): string {
    return `lx-t${this.info.numero}-${nome}`;
  }

  /** Registra o objeto para receber a tinta do clima atual (nunca o que é ciano). */
  protected tingir<T extends Phaser.GameObjects.Components.Tint>(obj: T): T {
    this.cena.cenario.registrarTingivel(obj);
    return obj;
  }

  /**
   * Decoração de chão em pixel art, alinhada à grade e tingida pelo clima. É pulada se cair
   * sobre o terminal, o obstáculo ou um buraco, para não esconder o que é interativo nem flutuar.
   */
  protected decoracao(x: number, chave: string, espelhar = false, afundar = 0): void {
    if (!this.chaoLivre(x, 0)) return;
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
   * Passagem baixa: cano com vão de 72 px até o chão e, em cima, um andaime vazado com
   * espinhos até 232 px, mais alto que o pulo: só passa abaixado.
   */
  protected passagemBaixa(nome: string, x: number): void {
    const largura = LARGURA_PASSAGEM_BAIXA;
    const baseCano = CHAO_Y - VAO_ABAIXADO;
    // A cena mostra "[S] Agachar" quando o jogador chega perto
    this.cena.passagensBaixas.push({ x: this.offset + x, largura });
    this.solido(`${nome}-cano`, x, baseCano - 24, largura, 24, desenharCano);
    const topo = CHAO_Y - BARREIRA;
    this.solido(`${nome}-andaime`, x, topo, largura, baseCano - 24 - topo, (p, w, h) => desenharBarreira(p, w, h, 'andaime'));
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

  /** Chão de sucata do trecho em segmentos, separados pelos buracos. */
  private criarChao(): void {
    const vaos = [...this.buracos];
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

  /**
   * Colina de entulho: degraus de COLINA.DEGRAU px na colisão e, por cima, terra com crosta
   * de sucata inclinada passando pelo meio de cada degrau.
   */
  private criarColina(c: Colina, indice: number): void {
    const n = c.alt / COLINA.DEGRAU;
    for (let k = 1; k <= n; k++) {
      const recuo = (k - 1) * COLINA.PASSO;
      const corpo = this.cena.add.rectangle(
        this.offset + c.x + c.w / 2,
        CHAO_Y - k * COLINA.DEGRAU + COLINA.DEGRAU / 2,
        c.w - recuo * 2,
        COLINA.DEGRAU,
        0,
        0
      );
      this.cena.solidos.add(corpo);
    }
    const w = Math.round(c.w / ESCALA);
    const baixo = 3;
    const h = Math.round(c.alt / ESCALA) + 2 + baixo;
    const rnd = aleatorio(this.semente + indice * 29 + 3);
    texturaPixel(this.cena, this.chave(`colina-${indice}`), w, h, (p) => {
      for (let i = 0; i < w; i++) {
        const d = Math.min(i, w - 1 - i) * ESCALA;
        const altura = Math.min(c.alt, d / 2 + COLINA.DEGRAU / 2);
        const topo = h - baixo - Math.round(altura / ESCALA);
        p.px(i, topo, 1, h - topo, COR.terra);
        for (let y = topo + 4; y < h; y++) if ((y - topo) / 14 > bayer(i, y)) p.ponto(i, y, COR.terraEscura);
        p.px(i, topo, 1, 2, COR.sombraSucata);
        p.ponto(i, topo, rnd() < 0.6 ? COR.sucataClara : COR.sucata);
        if (rnd() < 0.2) p.ponto(i, topo + 1 + Math.floor(rnd() * 2), COR.contorno);
        if (rnd() < 0.04) p.ponto(i, topo - 1, COR.sucataClara);
      }
      // Lixo enterrado e chorume na encosta
      for (let i = 6 + Math.floor(rnd() * 6); i < w - 8; i += 10 + Math.floor(rnd() * 14)) {
        const d = Math.min(i, w - 1 - i) * ESCALA;
        const topo = h - baixo - Math.round(Math.min(c.alt, d / 2 + 4) / ESCALA);
        if (h - topo < 7) continue;
        const y = topo + 3 + Math.floor(rnd() * Math.max(1, h - topo - 6));
        if (rnd() < 0.5) p.caixa(i, y, 5 + Math.floor(rnd() * 4), 3, COR.sucata);
        else p.px(i, y, 6, 2, COR.verdePlacaEscuro);
        if (rnd() < 0.3) p.px(i + 2, topo + 2, 1, 2 + Math.floor(rnd() * 3), COR.chorumeEscuro);
      }
    });
    this.tingir(
      this.cena.add
        .image(this.offset + c.x, CHAO_Y + baixo * ESCALA, this.chave(`colina-${indice}`))
        .setOrigin(0, 1)
        .setScale(ESCALA)
        .setDepth(PROF.chao + 0.5)
    );
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
    if (x === null) return;
    const y = this.yExercicio;
    const marcador = this.cena.add.sprite(x, y, 'lx-terminal', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.objetos);
    const brilho = this.cena.add
      .image(x, y - 64, 'lx-brilho')
      .setTint(hexNum(COR.neonCiano))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(ESCALA)
      .setAlpha(0.45)
      .setDepth(PROF.escuro + 1);
    this.marcador = marcador;
    // LED ciano: fura a escuridão da noite
    this.cena.cenario.clima.registrarLuz(brilho);
    this.cena.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        const aceso = marcador.frame.name !== '0';
        marcador.setFrame(aceso ? 0 : 1);
        brilho.setAlpha(aceso ? 0.45 : 0.2);
      },
    });
  }

  /**
   * Obstáculo do exercício no nível do terminal. Vão e plataforma são só o espaço vazio até o
   * patamar (ver LayoutLixao); o portão é uma barreira com espinhos sobre a passarela.
   */
  private criarObstaculo(): void {
    const ex = this.exercicio;
    if (!ex || ex.obstaculo !== 'portao') return;
    const topo = this.yExercicio - BARREIRA;
    this.bloqueio = this.solido('obstaculo', ex.xObstaculo, topo, ex.largura, BARREIRA, (p, w, h) => desenharBarreira(p, w, h, 'portao'));
  }

  /** O exercício deste trecho pode ser rodado de novo depois de resolvido (corredor). */
  get exercicioRepetivel(): boolean {
    return this.exercicio?.obstaculo === 'choque';
  }

  /** Exercício 3: corta a energia do corredor; também usado ao rodar o código de novo. */
  cortarEnergia(): void {
    this.cena.mecanismos.desligarGrupo('corredor', CORREDOR.DESLIGADO_MS);
    this.cena.cameras.main.shake(150, 0.004);
  }

  /**
   * Exercício 2: o Recicla chega andando, empilha os degraus um a um (com bipe e poeira),
   * comemora e vai embora. Cada degrau é sólido quando assenta.
   */
  private construirEscada(ex: ExercicioLayout): void {
    const xEscada = this.offset + ex.xObstaculo;
    const robo = this.cena.add
      .image(grade(xEscada - 120), CHAO_Y, 'lx-recicla-0')
      .setOrigin(0.5, 1)
      .setScale(ESCALA)
      .setDepth(PROF.objetos + 2);
    this.tingir(robo);
    let quadro = 0;
    const passos = this.cena.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => robo.setTexture((quadro++ % 2 === 0 ? 'lx-recicla-1' : 'lx-recicla-0')),
    });
    const degrau = (k: number): void => {
      if (k >= ESCADA.DEGRAUS) {
        // Comemora pulando e volta pelo caminho
        passos.remove();
        robo.setTexture('lx-recicla-0');
        this.cena.tweens.add({
          targets: robo,
          y: CHAO_Y - 24,
          duration: 160,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            robo.setFlipX(true);
            this.cena.tweens.add({ targets: robo, x: robo.x - 400, alpha: 0, duration: 1800, onComplete: () => robo.destroy() });
          },
        });
        return;
      }
      const x = ex.xObstaculo + k * ESCADA.LARGURA;
      const altura = (k + 1) * ESCADA.PASSO;
      // Anda até a frente do degrau, pega o bloco e ele sobe do chão até a altura
      this.cena.tweens.add({
        targets: robo,
        x: grade(this.offset + x - 24),
        duration: 350,
        onComplete: () => {
          robo.setTexture('lx-recicla-pega');
          const bloco = this.solido(`escada-${k}`, x, CHAO_Y - altura, ESCADA.LARGURA, altura, (p, w, h) => desenharPilhaEletronicos(p, w, h, this.rnd));
          const yFinal = bloco.img.y;
          bloco.img.setY(yFinal + altura).setAlpha(0.6);
          this.cena.som.bipesCheckpoint();
          this.cena.tweens.add({
            targets: bloco.img,
            y: yFinal,
            alpha: 1,
            duration: 380,
            ease: 'Back.easeOut',
            onComplete: () => {
              this.poeiraImpacto(grade(this.offset + x), CHAO_Y - 24, ESCADA.LARGURA);
              this.cena.time.delayedCall(180, () => degrau(k + 1));
            },
          });
        },
      });
    };
    this.cena.tweens.add({ targets: robo, x: grade(xEscada - 24), duration: 700, onComplete: () => degrau(0) });
  }

  /**
   * Vão do exercício 1 (triagem): uma prensa desce do alto trazendo a sucata separada, esmaga
   * tudo num fardo sobre o vão (tranco, poeira e tremor) e sobe de volta. O fardo vira a
   * passagem, rente à plataforma do terminal; o corpo sólido só aparece no impacto.
   */
  private criarFardoPrensado(ex: ExercicioLayout): void {
    const x = grade(this.offset + ex.xObstaculo);
    const topo = grade(this.yExercicio);
    const wa = Math.round(ex.largura / ESCALA);
    const ha = 10;
    const rnd = aleatorio(this.semente + 999);
    texturaPixel(this.cena, this.chave('fardo'), wa, ha, (p) => desenharFardo(p, wa, ha, rnd));
    texturaPixel(this.cena, this.chave('prensa-fardo'), wa + 8, 14, (p) => {
      p.caixa(0, 0, wa + 8, 14, COR.musgo);
      p.px(1, 1, wa + 6, 2, COR.musgoClaro);
      for (let i = 3; i < wa + 5; i += 4) p.px(i, 5, 2, 4, COR.musgoEscuro);
      p.px(0, 12, wa + 8, 2, COR.contorno);
      for (let i = 1; i < wa + 7; i += 2) p.ponto(i, 13, COR.perigo);
    });
    const subida = 420;
    const fardo = this.tingir(
      this.cena.add.image(x, topo - subida, this.chave('fardo')).setOrigin(0, 0).setScale(ESCALA, ESCALA * 1.8).setDepth(PROF.objetos)
    );
    const prensa = this.tingir(
      this.cena.add
        .image(x - 16, topo - subida, this.chave('prensa-fardo'))
        .setOrigin(0, 1)
        .setScale(ESCALA)
        .setDepth(PROF.objetos + 1)
    );
    const haste = this.cena.add
      .rectangle(x + ex.largura / 2, topo - subida - 14 * ESCALA, 24, 900, hexNum(COR.musgoEscuro))
      .setOrigin(0.5, 1)
      .setDepth(PROF.objetos);
    // Desce carregando a sucata solta (alta), esmaga no vão e o fardo assenta compacto
    this.cena.tweens.add({
      targets: [fardo, prensa, haste],
      y: `+=${subida}`,
      duration: 650,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.cena.cameras.main.shake(260, 0.01);
        this.solido('passagem-corpo', ex.xObstaculo, this.yExercicio, ex.largura, 20, () => undefined).img.setVisible(false);
        this.poeiraImpacto(x, topo, ex.largura);
        this.cena.tweens.add({ targets: fardo, scaleY: ESCALA, duration: 140, ease: 'Back.easeOut' });
        this.cena.tweens.add({ targets: prensa, y: topo - 6, duration: 140, yoyo: true });
        this.cena.tweens.add({
          targets: [prensa, haste],
          y: `-=${subida}`,
          alpha: 0,
          delay: 500,
          duration: 900,
          ease: 'Sine.easeIn',
          onComplete: () => {
            prensa.destroy();
            haste.destroy();
          },
        });
      },
    });
  }

  /** Baforada de poeira dos dois lados do impacto da prensa. */
  private poeiraImpacto(x: number, y: number, largura: number): void {
    for (let i = 0; i < 14; i++) {
      const lado = i % 2 === 0 ? -1 : 1;
      const px = lado < 0 ? x : x + largura;
      const caco = this.cena.add
        .rectangle(px, y + 8 + Math.random() * 24, ESCALA * 2, ESCALA * 2, hexNum(i % 3 === 0 ? COR.cobre : COR.sucataClara))
        .setDepth(PROF.objetos + 2);
      this.cena.tweens.add({
        targets: caco,
        x: px + lado * (30 + Math.random() * 60),
        y: caco.y - 20 - Math.random() * 30,
        alpha: 0,
        duration: 500 + Math.random() * 300,
        ease: 'Quad.easeOut',
        onComplete: () => caco.destroy(),
      });
    }
  }

  /**
   * Passagem sobre o vão do exercício, rente à plataforma do terminal: a ponte sobe de baixo
   * (vão) ou a plataforma desce do alto pendurada num cabo (plataforma).
   */
  private criarPassagem(ex: ExercicioLayout): void {
    if (ex.obstaculo === 'vao') {
      this.criarFardoPrensado(ex);
      return;
    }
    const passagem = this.solido('passagem', ex.xObstaculo, this.yExercicio, ex.largura, 20, desenharViga);
    const y = passagem.img.y;
    // Plataforma descendo do alto, com os cabos acompanhando
    const cabos = [ex.xObstaculo + 24, ex.xObstaculo + ex.largura - 24].map((cx) =>
      this.cena.add
        .rectangle(grade(this.offset + cx), y, ESCALA, 900, hexNum(COR.contorno))
        .setOrigin(0.5, 1)
        .setDepth(PROF.objetos - 1)
    );
    const subida = 320;
    passagem.img.setY(y - subida);
    cabos.forEach((c) => c.setY(y - subida));
    this.cena.tweens.add({ targets: [passagem.img, ...cabos], y: `+=${subida}`, duration: 1000, ease: 'Sine.easeOut' });
  }
}
