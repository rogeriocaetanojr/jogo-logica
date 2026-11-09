import Phaser from 'phaser';
import { COR, ESCALA, aleatorio, folhaPixel, hexNum, hexRgb, texturaPixel } from '../lixao/ArteLixao';
import type { Pincel } from '../lixao/ArteLixao';
import { caboPendurado, escolher, marcasVazias, pecaCidade, pecaMaquina, pilhaMista } from '../lixao/ArteFundo';
import type { EstiloCidade, Marcas, ObjetoPilha, PecaCidade, PecaMaquina } from '../lixao/ArteFundo';
import type { EstadoClima } from '../lixao/ClimaLixao';
import { ALTURA_TELA, CHAO_Y, LARGURA_TELA } from '../lixao/TiposLixao';
import type { Clima } from '../lixao/TiposLixao';
import { PROF } from './TrechoLixao';
import type { TrechoLixao } from './TrechoLixao';

/** Fatores de parallax das camadas novas (o céu, 0.1 e 0.25 ficam no CenarioLixao). */
export const PARALLAX_FUNDO = { cidade: 0.18, maquinas: 0.4, pilhas: 0.55 } as const;

/** Profundidades: cidade entre nuvens e horizonte, máquinas e pilhas antes da névoa (22). */
const PROF_FUNDO = { passantes: PROF.nuvens + 1, cidade: PROF.nuvens + 2, maquinas: 15, pilhas: PROF.pilhas } as const;

/** Opacidade das camadas: quanto mais longe, mais apagada contra o céu. */
const ALPHA = { cidade: 0.7, maquinas: 0.78, pilhas: 0.9 } as const;

/** Cores de fundo de cada clima, da camada mais distante à mais próxima. */
export const CORES_FUNDO: Record<Clima, { longe: string; meio: string; perto: string }> = {
  sol: { longe: COR.fundoSolLonge, meio: COR.fundoSolMeio, perto: COR.fundoSolPerto },
  nevoa: { longe: COR.fundoNevoaLonge, meio: COR.fundoNevoaMeio, perto: COR.fundoNevoaPerto },
  chuva: { longe: COR.fundoChuvaLonge, meio: COR.fundoChuvaMeio, perto: COR.fundoChuvaPerto },
  noite: { longe: COR.fundoNoiteLonge, meio: COR.fundoNoiteMeio, perto: COR.fundoNoitePerto },
};

/** Cores do fundo já interpoladas pelo CenarioLixao na troca de clima. */
export interface CoresFundo {
  longe: number;
  meio: number;
  perto: number;
}

/** Visual de cada clima no fundo: peças da cidade, máquinas e objetos das pilhas. */
interface Identidade {
  cidade: EstiloCidade;
  pecasCidade: Partial<Record<PecaCidade, number>>;
  maquinas: Partial<Record<PecaMaquina, number>>;
  objetos: Partial<Record<ObjetoPilha, number>>;
  /** Chance de um cabo pendurado entre duas pilhas vizinhas. */
  cabos: number;
  /** Poças com reflexo de luz entre as pilhas. */
  pocas: boolean;
}

const IDENTIDADE: Record<Clima, Identidade> = {
  // Sol: cidade e guindastes ao longe, pilhas puxadas para placas e bobinas
  sol: {
    cidade: { cor: COR.fundoValorClaro, janelas: 0, letreiros: 0, escala: 1, ledsTorre: false },
    pecasCidade: { predio: 4, guindaste: 3, montanha: 2, torre: 1, chamine: 1 },
    maquinas: { esteira: 3, guindaste: 3, prensa: 2, ventilador: 1, antena: 1 },
    objetos: { placa: 5, bobina: 4, engrenagem: 2, monitor: 2, teclado: 1, gabinete: 1, celular: 1, ventoinha: 1 },
    cabos: 0.3,
    pocas: false,
  },
  // Névoa: silhuetas grandes meio apagadas, torres e chaminés
  nevoa: {
    cidade: { cor: COR.fundoValorClaro, janelas: 0, letreiros: 0, escala: 1.35, ledsTorre: false },
    pecasCidade: { torre: 3, chamine: 3, predio: 2, montanha: 1 },
    maquinas: { prensa: 3, antena: 2, guindaste: 2, ventilador: 2, esteira: 1 },
    objetos: { monitor: 3, gabinete: 3, teclado: 2, ventoinha: 2, engrenagem: 2, placa: 1, celular: 1 },
    cabos: 0.35,
    pocas: false,
  },
  // Chuva: poças refletindo luzes, cabos pingando, letreiros neon quebrados
  chuva: {
    cidade: { cor: COR.fundoValorClaro, janelas: 0.1, letreiros: 0.3, escala: 1, ledsTorre: true },
    pecasCidade: { predio: 5, torre: 2, chamine: 1, montanha: 1 },
    maquinas: { antena: 3, prensa: 2, esteira: 2, ventilador: 2, guindaste: 1 },
    objetos: { monitor: 3, teclado: 3, celular: 3, placa: 2, gabinete: 2, ventoinha: 1, bobina: 1 },
    cabos: 0.75,
    pocas: true,
  },
  // Noite: janelas acesas, LEDs e letreiros; lua e estrelas ficam no céu
  noite: {
    cidade: { cor: COR.fundoValorClaro, janelas: 0.35, letreiros: 0.25, escala: 1, ledsTorre: true },
    pecasCidade: { predio: 5, torre: 2, montanha: 1, guindaste: 1 },
    maquinas: { prensa: 3, antena: 3, esteira: 1, guindaste: 1, ventilador: 1 },
    objetos: { gabinete: 4, monitor: 3, placa: 2, celular: 2, teclado: 1, ventoinha: 1 },
    cabos: 0.4,
    pocas: false,
  },
};

/** Marcas de uma camada já em px de mundo, com o fator de parallax e o clima do trecho. */
interface MarcasCamada {
  fator: number;
  prof: number;
  m: Marcas;
}

interface Particula {
  obj: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
}

interface Passante {
  img: Phaser.GameObjects.Sprite;
  velocidade: number;
  yBase: number;
  fase: number;
}

const LIMITE_FUMACA = 40;
const QTD_ESTRELAS = 16;
const QTD_PASSANTES = 3;

/**
 * Fundo detalhado do Lixão: três camadas novas de parallax geradas uma vez em textura, a
 * partir de listas de peças sorteadas com semente fixa (o mesmo resultado a cada partida,
 * sem tira repetida). Cada trecho do mapa ocupa a faixa da camada que aparece atrás dele e
 * tem identidade própria (ver IDENTIDADE). Por cima, só detalhes pequenos animados: LEDs,
 * letreiros piscando, fumaça, faíscas, gotas, ganchos balançando, estrelas e passantes ao longe.
 */
export class FundoLixao {
  private readonly cena: Phaser.Scene;
  private readonly trechos: readonly TrechoLixao[];
  private readonly larguraMundo: number;
  /** Camadas e objetos tingidos com cada cor de fundo (nunca com a tinta do primeiro plano). */
  private readonly tingidos: Record<keyof CoresFundo, Phaser.GameObjects.Components.Tint[]> = { longe: [], meio: [], perto: [] };
  private cores: CoresFundo = { longe: hexNum(COR.luz), meio: hexNum(COR.luz), perto: hexNum(COR.luz) };

  private readonly camadas: MarcasCamada[] = [];
  private readonly leds: Phaser.GameObjects.Rectangle[] = [];
  private readonly letreiros: { obj: Phaser.GameObjects.Rectangle[]; espera: number }[] = [];
  private readonly reflexos: Phaser.GameObjects.Rectangle[] = [];
  private readonly particulas: Particula[] = [];
  private readonly estrelas: Phaser.GameObjects.Rectangle[] = [];
  private readonly passantes: Passante[] = [];

  private tempo = 0;
  private esperaLed = 0;
  private esperaFumaca = 0;
  private esperaFaisca = 0;
  private esperaGota = 0;
  private clima: EstadoClima = { poeira: 0, chuva: 0, noite: 0 };
  private readonly rnd = aleatorio(4242);

  constructor(
    cena: Phaser.Scene,
    trechos: readonly TrechoLixao[],
    larguraMundo: number
  ) {
    this.cena = cena;
    this.trechos = trechos;
    this.larguraMundo = larguraMundo;
  }

  /** Aplica as cores de fundo do clima (interpoladas na troca de trecho). */
  aplicarCores(cores: CoresFundo): void {
    this.cores = cores;
    for (const chave of ['longe', 'meio', 'perto'] as const) {
      for (const obj of this.tingidos[chave]) obj.setTint(cores[chave]);
    }
  }

  private tingir<T extends Phaser.GameObjects.Components.Tint>(chave: keyof CoresFundo, obj: T): T {
    this.tingidos[chave].push(obj);
    return obj;
  }

  construir(): void {
    this.gerarTexturas();
    this.criarCidade();
    this.criarMaquinas();
    this.criarPilhas();
    this.criarDetalhes();
  }

  /** A cada quadro (também com o terminal aberto): só os detalhes pequenos se mexem. */
  atualizar(delta: number, clima: EstadoClima): void {
    this.clima = clima;
    this.tempo += delta;
    this.piscarLeds(delta);
    this.piscarLetreiros(delta);
    this.soltarFumaca(delta);
    this.soltarFaiscas(delta);
    this.pingar(delta);
    this.atualizarCeu();
    this.atualizarPassantes(delta);
  }

  /* =========================================================================
   * CAMADAS ESTÁTICAS
   * ========================================================================= */

  /** Largura da camada em px de arte para o fator de parallax. */
  private larguraArte(fator: number): number {
    return Math.ceil((LARGURA_TELA + (this.larguraMundo - LARGURA_TELA) * fator) / ESCALA) + 2;
  }

  /** Clima do trecho que aparece atrás de `xArte` numa camada com este fator. */
  private climaEm(xArte: number, fator: number): Clima {
    const xMundo = (xArte * ESCALA) / fator;
    const t = this.trechos.find((tr) => xMundo < tr.fim) ?? this.trechos[this.trechos.length - 1];
    return t.info.clima;
  }

  private camada(chave: string, fator: number, prof: number, alpha: number, desenhar: (p: Pincel, w: number, m: Marcas) => void): Phaser.GameObjects.Image {
    const w = this.larguraArte(fator);
    const h = Math.ceil(ALTURA_TELA / ESCALA);
    const m = marcasVazias();
    texturaPixel(this.cena, chave, w, h, (p) => desenhar(p, w, m));
    this.neutralizar(chave);
    this.camadas.push({ fator, prof, m });
    return this.cena.add.image(0, 0, chave).setOrigin(0, 0).setScale(ESCALA).setScrollFactor(fator, 0).setDepth(prof).setAlpha(alpha);
  }

  /** Cidade abandonada distante (0.18): prédios, torres, guindastes e chaminés numa cor só. */
  private criarCidade(): void {
    const rnd = aleatorio(515);
    const base = Math.round(CHAO_Y / ESCALA) - 6;
    const cidade = this.camada('lx-fundo-cidade', PARALLAX_FUNDO.cidade, PROF_FUNDO.cidade, ALPHA.cidade, (p, w, m) => {
      let x = -10;
      let anterior: PecaCidade | undefined;
      while (x < w) {
        const id = IDENTIDADE[this.climaEm(x, PARALLAX_FUNDO.cidade)];
        const peca = escolher(rnd, id.pecasCidade, anterior);
        anterior = peca;
        x += pecaCidade(p, peca, x, base, rnd, id.cidade, m);
      }
    });
    this.tingir('longe', cidade);
    // Janelas acesas numa textura própria, sem a cor do clima: ficam amarelas
    const marcas = this.camadas[this.camadas.length - 1].m;
    texturaPixel(this.cena, 'lx-fundo-janelas', cidade.width, cidade.height, (p) => {
      for (const [x, y] of marcas.janelas) p.px(x, y, 1, 2, COR.janela);
    });
    this.cena.add
      .image(0, 0, 'lx-fundo-janelas')
      .setOrigin(0, 0)
      .setScale(ESCALA)
      .setScrollFactor(PARALLAX_FUNDO.cidade, 0)
      .setDepth(PROF_FUNDO.cidade)
      .setAlpha(0.9);
  }

  /** Máquinas paradas (0.4): esteiras, prensas, guindastes, antenas e ventiladores. */
  private criarMaquinas(): void {
    const rnd = aleatorio(828);
    const base = Math.round(CHAO_Y / ESCALA) + 1;
    this.tingir(
      'meio',
      this.camada('lx-fundo-maquinas', PARALLAX_FUNDO.maquinas, PROF_FUNDO.maquinas, ALPHA.maquinas, (p, w, m) => {
        let x = 4 + Math.floor(rnd() * 30);
        let anterior: PecaMaquina | undefined;
        while (x < w) {
          const id = IDENTIDADE[this.climaEm(x, PARALLAX_FUNDO.maquinas)];
          const peca = escolher(rnd, id.maquinas, anterior);
          anterior = peca;
          x += pecaMaquina(p, peca, x, base, rnd, m) + Math.floor(rnd() * 50);
        }
      })
    );
  }

  /** Pilhas de lixo eletrônico (0.55) com objetos reconhecíveis, cabos e poças. */
  private criarPilhas(): void {
    const rnd = aleatorio(37);
    const base = Math.round(CHAO_Y / ESCALA) + 1;
    this.tingir(
      'perto',
      this.camada('lx-fundo-pilhas', PARALLAX_FUNDO.pilhas, PROF_FUNDO.pilhas, ALPHA.pilhas, (p, w, m) => {
        let x = 10 + Math.floor(rnd() * 20);
        let topoAnterior: { x: number; y: number } | null = null;
        while (x < w) {
          const id = IDENTIDADE[this.climaEm(x, PARALLAX_FUNDO.pilhas)];
          const larg = 30 + Math.floor(rnd() * 56);
          const alt = 18 + Math.floor(rnd() * 44);
          const cx = x + larg / 2;
          const topo = pilhaMista(p, cx, base, larg, alt, rnd, id.objetos, m);
          // Antena ou cabo em pé no topo de algumas pilhas
          if (rnd() < 0.25) {
            p.linha(cx, topo, cx + 2, topo - 8, COR.fundoValorEscuro);
            m.faiscas.push([Math.round(cx + 2), topo - 8]);
          }
          if (topoAnterior && rnd() < id.cabos) {
            caboPendurado(p, topoAnterior.x, topoAnterior.y + 4, cx - larg / 4, topo + 4, 4 + rnd() * 8, COR.contorno, m);
          }
          topoAnterior = { x: Math.round(cx + larg / 4), y: topo };
          const vao = Math.round(rnd() * 34) - 6;
          if (id.pocas && vao > 8) {
            // Poça rasa no vão entre pilhas, com reflexo de luz animado
            const px0 = Math.round(x + larg);
            p.px(px0, base - 1, vao, 2, COR.chuvaAzul);
            p.px(px0 + 1, base - 1, vao - 2, 1, COR.chuvaAzulClaro);
            m.reflexos.push([px0 + 2, base - 1, Math.max(2, vao - 6)]);
          }
          x += Math.round(larg * 0.75) + Math.max(0, vao);
        }
      })
    );
  }

  /* =========================================================================
   * DETALHES ANIMADOS
   * ========================================================================= */

  private criarDetalhes(): void {
    for (const c of this.camadas) {
      const climaDe = (xArte: number) => this.climaEm(xArte, c.fator);
      for (const [x, y, cor] of c.m.leds) {
        const noite = climaDe(x) === 'noite' || climaDe(x) === 'chuva';
        this.leds.push(
          this.cena.add
            .rectangle(x * ESCALA, y * ESCALA, ESCALA, ESCALA, hexNum(cor))
            .setOrigin(0, 0)
            .setScrollFactor(c.fator, 0)
            .setDepth(c.prof + 1)
            .setAlpha(noite ? 1 : 0.6)
        );
      }
      for (const [x, y, w] of c.m.letreiros) {
        const largura = w * ESCALA;
        const corpo = this.cena.add
          .rectangle(x * ESCALA, y * ESCALA, largura, ESCALA * 2, hexNum(COR.neonRosa))
          .setOrigin(0, 0)
          .setScrollFactor(c.fator, 0)
          .setDepth(c.prof + 1);
        // Pedaço queimado do letreiro
        const queimado = this.cena.add
          .rectangle(x * ESCALA + Math.floor(this.rnd() * (largura - ESCALA * 2)), y * ESCALA, ESCALA * 2, ESCALA * 2, hexNum(COR.neonRosaEscuro))
          .setOrigin(0, 0)
          .setScrollFactor(c.fator, 0)
          .setDepth(c.prof + 2);
        this.letreiros.push({ obj: [corpo, queimado], espera: this.rnd() * 3000 });
      }
      for (const [x, y, w] of c.m.reflexos) {
        const cor = this.rnd() < 0.5 ? COR.neonRosa : COR.janela;
        this.reflexos.push(
          this.cena.add
            .rectangle(x * ESCALA, y * ESCALA, w * ESCALA, ESCALA, hexNum(cor))
            .setOrigin(0, 0)
            .setScrollFactor(c.fator, 0)
            .setDepth(c.prof + 1)
            .setAlpha(0.4)
        );
      }
      for (const [x, y, comprimento] of c.m.ganchos) {
        const gancho = this.cena.add
          .image(x * ESCALA, y * ESCALA, this.texturaGancho(comprimento))
          .setOrigin(0.5, 0)
          .setScale(ESCALA)
          .setScrollFactor(c.fator, 0)
          .setDepth(c.prof + 1)
          .setAlpha(ALPHA.maquinas);
        this.tingir('meio', gancho);
        // Guindaste balançando devagar
        this.cena.tweens.add({
          targets: gancho,
          angle: { from: -5, to: 5 },
          duration: 2400 + this.rnd() * 1400,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          delay: this.rnd() * 1500,
        });
      }
    }

    // Estrelas cintilando na noite (as fixas estão desenhadas no céu da noite)
    for (let i = 0; i < QTD_ESTRELAS; i++) {
      this.estrelas.push(
        this.cena.add
          .rectangle(Math.floor(this.rnd() * 320) * ESCALA, Math.floor(this.rnd() * 80) * ESCALA, ESCALA, ESCALA, hexNum(COR.luz))
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(PROF.ceu + 2)
          .setAlpha(0)
      );
    }

    // Pássaros (dia) ou drones (chuva e noite) passando ao longe
    for (let i = 0; i < QTD_PASSANTES; i++) {
      const img = this.cena.add.sprite(0, 0, 'lx-fundo-passaro', 0).setScale(ESCALA).setScrollFactor(0).setDepth(PROF_FUNDO.passantes).setAlpha(0.7);
      const p: Passante = { img, velocidade: 0, yBase: 0, fase: 0 };
      this.reposicionarPassante(p, this.rnd() * LARGURA_TELA);
      this.passantes.push(p);
    }
  }

  /** x de tela de um objeto numa camada com fator `fator`. */
  private naTela(xMundo: number, fator: number, margem = 40): boolean {
    const sx = xMundo - this.cena.cameras.main.scrollX * fator;
    return sx > -margem && sx < LARGURA_TELA + margem;
  }

  private piscarLeds(delta: number): void {
    this.esperaLed -= delta;
    if (this.esperaLed > 0) return;
    this.esperaLed = 220;
    for (const led of this.leds) if (this.rnd() < 0.1) led.setVisible(!led.visible);
    for (const r of this.reflexos) r.setAlpha(0.25 + this.rnd() * 0.3);
  }

  /** Letreiros quebrados: apagam e acendem em rajadas curtas. */
  private piscarLetreiros(delta: number): void {
    for (const l of this.letreiros) {
      l.espera -= delta;
      if (l.espera > 0) continue;
      const aceso = !l.obj[0].visible;
      l.obj.forEach((o) => o.setVisible(aceso));
      l.espera = aceso ? 400 + this.rnd() * 3000 : 60 + this.rnd() * 220;
    }
  }

  /** Fumaça saindo das chaminés e escapes visíveis, com um limite de baforadas vivas. */
  private soltarFumaca(delta: number): void {
    this.esperaFumaca -= delta;
    if (this.esperaFumaca > 0) return;
    this.esperaFumaca = 320;
    for (const c of this.camadas) {
      for (const [x, y] of c.m.fumaca) {
        if (this.particulas.length >= LIMITE_FUMACA) return;
        if (this.rnd() < 0.55 || !this.naTela(x * ESCALA, c.fator)) continue;
        const puff = this.cena.add
          .image(x * ESCALA, y * ESCALA, 'lx-poeira')
          .setScale(ESCALA * 2)
          .setTint(this.cores.longe)
          .setScrollFactor(c.fator, 0)
          .setDepth(c.prof + 1)
          .setAlpha(0.5);
        const part: Particula = { obj: puff };
        this.particulas.push(part);
        this.cena.tweens.add({
          targets: puff,
          y: puff.y - 60 - this.rnd() * 40,
          x: puff.x + 10 + this.rnd() * 30,
          scale: ESCALA * 4,
          alpha: 0,
          duration: 2200 + this.rnd() * 800,
          onComplete: () => this.removerParticula(part),
        });
      }
    }
  }

  /** Faíscas ocasionais em motores e cabos; mais frequentes e fortes à noite. */
  private soltarFaiscas(delta: number): void {
    this.esperaFaisca -= delta;
    if (this.esperaFaisca > 0) return;
    const noite = this.clima.noite;
    this.esperaFaisca = noite > 0.5 ? 300 : this.clima.chuva > 0.5 ? 700 : 1400;
    const candidatos: [number, number, MarcasCamada][] = [];
    for (const c of this.camadas) for (const [x, y] of c.m.faiscas) if (this.naTela(x * ESCALA, c.fator, 0)) candidatos.push([x, y, c]);
    if (candidatos.length === 0) return;
    const [x, y, c] = candidatos[Math.floor(this.rnd() * candidatos.length)];
    for (let i = 0; i < 4; i++) {
      const cor = i % 2 === 0 ? COR.janela : COR.bateriaAmarela;
      const caco = this.cena.add
        .rectangle(x * ESCALA, y * ESCALA, ESCALA, ESCALA, hexNum(cor))
        .setScrollFactor(c.fator, 0)
        .setDepth(c.prof + 1)
        .setAlpha(noite > 0.5 ? 1 : 0.75);
      const ang = -Math.PI / 2 + (this.rnd() - 0.5) * 2.6;
      this.cena.tweens.add({
        targets: caco,
        x: caco.x + Math.cos(ang) * 20,
        y: caco.y + Math.sin(ang) * 14 + 10,
        alpha: 0,
        duration: 260 + this.rnd() * 160,
        onComplete: () => caco.destroy(),
      });
    }
  }

  /** Gotas pingando dos cabos no trecho de chuva. */
  private pingar(delta: number): void {
    if (this.clima.chuva < 0.3) return;
    this.esperaGota -= delta;
    if (this.esperaGota > 0) return;
    this.esperaGota = 120;
    const candidatos: [number, number, MarcasCamada][] = [];
    for (const c of this.camadas) {
      for (const [x, y] of c.m.gotas) {
        if (this.climaEm(x, c.fator) === 'chuva' && this.naTela(x * ESCALA, c.fator, 0)) candidatos.push([x, y, c]);
      }
    }
    if (candidatos.length === 0) return;
    const [x, y, c] = candidatos[Math.floor(this.rnd() * candidatos.length)];
    const gota = this.cena.add
      .rectangle(x * ESCALA, y * ESCALA, ESCALA, ESCALA * 2, hexNum(COR.chuvaAzulClaro))
      .setScrollFactor(c.fator, 0)
      .setDepth(c.prof + 1);
    this.cena.tweens.add({ targets: gota, y: gota.y + 48, alpha: 0, duration: 420, ease: 'Quad.easeIn', onComplete: () => gota.destroy() });
  }

  /** Estrelas cintilam conforme a noite aparece. */
  private atualizarCeu(): void {
    const noite = this.clima.noite;
    for (let i = 0; i < this.estrelas.length; i++) {
      const brilho = 0.4 + 0.6 * Math.abs(Math.sin(this.tempo / (700 + i * 90) + i));
      this.estrelas[i].setAlpha(noite * brilho);
    }
  }

  private atualizarPassantes(delta: number): void {
    const maquinas = this.clima.chuva + this.clima.noite > 0.5;
    for (const p of this.passantes) {
      p.img.x -= (p.velocidade * delta) / 1000;
      p.fase += delta;
      p.img.y = p.yBase + Math.round(Math.sin(p.fase / 600) * 2) * ESCALA;
      const chave = maquinas ? 'lx-fundo-drone' : 'lx-fundo-passaro';
      if (p.img.texture.key !== chave) p.img.setTexture(chave, 0);
      p.img.setFrame(Math.floor(p.fase / (maquinas ? 300 : 180)) % 2).setTint(this.cores.perto);
      if (p.img.x < -40) this.reposicionarPassante(p, LARGURA_TELA + 40 + this.rnd() * 600);
    }
  }

  private reposicionarPassante(p: Passante, x: number): void {
    p.velocidade = 25 + this.rnd() * 35;
    p.yBase = Math.round((70 + this.rnd() * 150) / ESCALA) * ESCALA;
    p.img.setPosition(x, p.yBase);
  }

  private removerParticula(part: Particula): void {
    part.obj.destroy();
    const i = this.particulas.indexOf(part);
    if (i >= 0) this.particulas.splice(i, 1);
  }

  /* =========================================================================
   * TEXTURAS DOS DETALHES
   * ========================================================================= */

  private texturaGancho(comprimento: number): string {
    return texturaPixel(this.cena, `lx-fundo-gancho-${comprimento}`, 5, comprimento + 5, (p) => {
      p.px(2, 0, 1, comprimento, COR.fundoValorEscuro);
      p.px(1, comprimento, 3, 2, COR.fundoValorMedio);
      p.px(1, comprimento + 2, 1, 2, COR.fundoValorEscuro);
      p.px(3, comprimento + 2, 1, 3, COR.fundoValorEscuro);
      p.px(2, comprimento + 4, 1, 1, COR.fundoValorEscuro);
    });
  }

  /**
   * Converte a textura da camada em 3 valores neutros (claro, médio, escuro) pelo brilho de
   * cada pixel: tira verde, cobre e marrom e baixa o contraste interno. A cor vem da tinta.
   */
  private neutralizar(chave: string): void {
    const tex = this.cena.textures.get(chave) as Phaser.Textures.CanvasTexture;
    const ctx = tex.getContext();
    const { width, height } = tex;
    const img = ctx.getImageData(0, 0, width, height);
    const d = img.data;
    const [claro, medio, escuro] = [COR.fundoValorClaro, COR.fundoValorMedio, COR.fundoValorEscuro].map(hexRgb);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const brilho = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = brilho > 150 ? claro : brilho > 100 ? medio : escuro;
      d[i] = v[0];
      d[i + 1] = v[1];
      d[i + 2] = v[2];
    }
    ctx.putImageData(img, 0, 0);
    tex.refresh();
  }

  private gerarTexturas(): void {
    // Pássaro: asas para cima e para baixo
    folhaPixel(this.cena, 'lx-fundo-passaro', 5, 3, 2, (p, q) => {
      p.ponto(2, 1, COR.fundoValorEscuro);
      if (q === 0) {
        p.ponto(1, 0, COR.fundoValorEscuro);
        p.ponto(3, 0, COR.fundoValorEscuro);
        p.ponto(0, 0, COR.fundoValorEscuro);
        p.ponto(4, 0, COR.fundoValorEscuro);
      } else {
        p.ponto(1, 1, COR.fundoValorEscuro);
        p.ponto(3, 1, COR.fundoValorEscuro);
        p.ponto(0, 2, COR.fundoValorEscuro);
        p.ponto(4, 2, COR.fundoValorEscuro);
      }
    });
    // Drone distante: corpo e LED verde piscando (não é interativo: nada de ciano)
    folhaPixel(this.cena, 'lx-fundo-drone', 7, 3, 2, (p, q) => {
      p.px(0, 0, 3, 1, COR.fundoValorEscuro);
      p.px(4, 0, 3, 1, COR.fundoValorEscuro);
      p.px(2, 1, 3, 2, COR.fundoValorEscuro);
      if (q === 0) p.ponto(3, 2, COR.janela);
    });
  }
}
