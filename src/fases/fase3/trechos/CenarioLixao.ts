import Phaser from 'phaser';
import { COR, ESCALA, aleatorio, bayer, hexRgb, texturaPixel } from '../lixao/ArteLixao';
import type { Pincel } from '../lixao/ArteLixao';
import { CORES_FUNDO, FundoLixao } from './FundoLixao';
import { ALTURA_TELA, CHAO_Y, LARGURA_TELA } from '../lixao/TiposLixao';
import type { Clima } from '../lixao/TiposLixao';
import { ClimaLixao, EFEITOS_CLIMA } from '../lixao/ClimaLixao';
import type { EstadoClima } from '../lixao/ClimaLixao';
import { PROF } from './TrechoLixao';
import type { TrechoLixao } from './TrechoLixao';

/**
 * Fatores de parallax das camadas de céu. Cidade (0.18), máquinas (0.4) e pilhas (0.55)
 * ficam no FundoLixao.
 */
const PARALLAX = { ceu: 0, nuvens: 0.1, horizonte: 0.25 } as const;

/** Duração da transição de clima e tema ao trocar de trecho (a única passagem entre eles). */
const DURACAO_TRANSICAO_MS = 3000;

/** Valores que a transição interpola entre o tema de saída e o de chegada. */
interface Visual {
  tinta: Rgb;
  nuvem: Rgb;
  horizonte: Rgb;
  /** Cores de fundo do clima (cidade, máquinas e pilhas), sem a tinta do primeiro plano. */
  fundoLonge: Rgb;
  fundoMeio: Rgb;
  fundoPerto: Rgb;
  clima: EstadoClima;
}

function visualDe(trecho: TrechoLixao, clima: Clima = trecho.info.clima): Visual {
  const tema = trecho.tema;
  const fundo = CORES_FUNDO[clima];
  const longe = hexRgb(fundo.longe);
  const meio = hexRgb(fundo.meio);
  return {
    tinta: hexRgb(tema.tinta ?? COR.luz),
    nuvem: hexRgb(tema.nuvem),
    // Montanhas do horizonte: entre a cidade (longe) e as máquinas (meio)
    horizonte: misturar(longe, meio, 0.5),
    fundoLonge: longe,
    fundoMeio: meio,
    fundoPerto: hexRgb(fundo.perto),
    clima: { ...EFEITOS_CLIMA[clima] },
  };
}

type Rgb = [number, number, number];

function rgbNum(c: Rgb): number {
  return (c[0] << 16) | (c[1] << 8) | c[2];
}

function misturar(a: Rgb, b: Rgb, t: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;
}

/**
 * Cenário do mapa contínuo: céu de cada trecho, nuvens, horizonte e pilhas em parallax
 * cobrindo o mundo inteiro, e os efeitos de clima. Ao trocar de trecho, céu, tinta, cores
 * distantes e partículas mudam em fade de alguns segundos. Os efeitos de clima em si ficam
 * em ClimaLixao; aqui só se decide a intensidade de cada um.
 */
export class CenarioLixao {
  private readonly cena: Phaser.Scene;
  private readonly trechos: readonly TrechoLixao[];
  private readonly larguraMundo: number;
  private readonly ceus: Phaser.GameObjects.Image[] = [];
  private nuvens!: Phaser.GameObjects.Image;
  private horizonte!: Phaser.GameObjects.Image;
  /** Cidade, máquinas e pilhas com detalhes animados, por trecho. */
  private fundo!: FundoLixao;
  private readonly tingiveis: Phaser.GameObjects.Components.Tint[] = [];
  public readonly clima: ClimaLixao;

  private indiceAtual = -1;
  private de!: Visual;
  private para!: Visual;
  private progresso = 1;

  constructor(cena: Phaser.Scene, trechos: readonly TrechoLixao[]) {
    this.cena = cena;
    this.trechos = trechos;
    this.larguraMundo = trechos[trechos.length - 1].fim;
    this.clima = new ClimaLixao(cena);
  }

  /** Monta céus, camadas e clima (antes dos trechos, que registram seus objetos tingíveis). */
  construir(): void {
    this.trechos.forEach((t) => this.criarCeu(t));
    this.criarNuvens();
    this.criarHorizonte();
    this.fundo = new FundoLixao(this.cena, this.trechos, this.larguraMundo);
    this.fundo.construir();
    this.clima.construir();
  }

  registrarTingivel(obj: Phaser.GameObjects.Components.Tint): void {
    this.tingiveis.push(obj);
  }

  /** Troca o tema de destino; com `imediato`, aplica sem transição (início da fase). */
  definirTrecho(indice: number, imediato = false): void {
    if (indice === this.indiceAtual) return;
    const destino = visualDe(this.trechos[indice]);
    this.de = imediato || !this.para ? destino : this.visualAtual();
    this.para = destino;
    this.indiceAtual = indice;
    this.progresso = imediato ? 1 : 0;
    this.aplicar();
  }

  /**
   * Depuração: aplica na hora o tema e os efeitos de um clima, sem mudar o céu do trecho.
   * Vale até o próximo trecho ou até `null`, que volta ao clima do trecho atual.
   */
  forcarClima(clima: Clima | null): void {
    const trecho = this.trechos[this.indiceAtual];
    const modelo = clima ? (this.trechos.find((t) => t.info.clima === clima) ?? trecho) : trecho;
    this.de = this.para = visualDe(modelo, clima ?? trecho.info.clima);
    this.progresso = 1;
    this.aplicar();
  }

  atualizar(delta: number): void {
    this.fundo.atualizar(delta, this.visualAtual().clima);
    if (this.progresso >= 1) return;
    this.progresso = Math.min(1, this.progresso + delta / DURACAO_TRANSICAO_MS);
    this.aplicar();
  }

  /* =========================================================================
   * TRANSIÇÃO
   * ========================================================================= */

  private visualAtual(): Visual {
    const t = this.suavizado();
    const lerp3 = (a: Rgb, b: Rgb) => misturar(a, b, t);
    const lerp = (a: number, b: number) => a + (b - a) * t;
    return {
      tinta: lerp3(this.de.tinta, this.para.tinta),
      nuvem: lerp3(this.de.nuvem, this.para.nuvem),
      horizonte: lerp3(this.de.horizonte, this.para.horizonte),
      fundoLonge: lerp3(this.de.fundoLonge, this.para.fundoLonge),
      fundoMeio: lerp3(this.de.fundoMeio, this.para.fundoMeio),
      fundoPerto: lerp3(this.de.fundoPerto, this.para.fundoPerto),
      clima: {
        poeira: lerp(this.de.clima.poeira, this.para.clima.poeira),
        chuva: lerp(this.de.clima.chuva, this.para.clima.chuva),
        noite: lerp(this.de.clima.noite, this.para.clima.noite),
      },
    };
  }

  private suavizado(): number {
    const t = this.progresso;
    return t * t * (3 - 2 * t);
  }

  private aplicar(): void {
    const v = this.visualAtual();
    const t = this.suavizado();

    // Céu: o do trecho atual surge por cima do anterior, que some quando a transição acaba
    this.ceus.forEach((ceu, i) => {
      if (i === this.indiceAtual) ceu.setAlpha(t).setDepth(PROF.ceu + 1);
      else ceu.setDepth(PROF.ceu).setAlpha(t >= 1 ? 0 : ceu.alpha);
    });

    this.nuvens.setTint(rgbNum(v.nuvem));
    this.horizonte.setTint(rgbNum(v.horizonte));
    const tinta = rgbNum(v.tinta);
    for (const obj of this.tingiveis) obj.setTint(tinta);
    this.fundo.aplicarCores({ longe: rgbNum(v.fundoLonge), meio: rgbNum(v.fundoMeio), perto: rgbNum(v.fundoPerto) });

    this.clima.aplicar(v.clima as EstadoClima);
  }

  /* =========================================================================
   * CONSTRUÇÃO
   * ========================================================================= */

  /** Camada de parallax em pixel art que cobre o mundo inteiro com o fator informado. */
  private camada(
    chave: string,
    fator: number,
    profundidade: number,
    desenhar: (p: Pincel, largura: number, altura: number) => void
  ): Phaser.GameObjects.Image {
    const larguraArte = Math.ceil((LARGURA_TELA + (this.larguraMundo - LARGURA_TELA) * fator) / ESCALA) + 2;
    const alturaArte = Math.ceil(ALTURA_TELA / ESCALA);
    texturaPixel(this.cena, chave, larguraArte, alturaArte, (p) => desenhar(p, larguraArte, alturaArte));
    return this.cena.add.image(0, 0, chave).setOrigin(0, 0).setScale(ESCALA).setScrollFactor(fator, 0).setDepth(profundidade);
  }

  /** Camada 1 do céu (fixa): degradê pontilhado com sol ou lua, uma imagem por trecho. */
  private criarCeu(trecho: TrechoLixao): void {
    const { ceu, astro } = trecho.tema;
    const chave = `lx-t${trecho.info.numero}-ceu`;
    const w = LARGURA_TELA / ESCALA;
    const h = ALTURA_TELA / ESCALA;
    texturaPixel(this.cena, chave, w, h, (p) => {
      // Como na Fase 2: degradê até o horizonte (y 104) e a cor mais clara sólida abaixo
      const horizonteCeu = 104;
      p.degradePontilhado(0, 0, w, horizonteCeu, ceu);
      p.px(0, horizonteCeu, w, h - horizonteCeu, ceu[ceu.length - 1]);
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
        // Estrelas fixas (as que cintilam ficam no FundoLixao)
        const rndEstrelas = aleatorio(trecho.info.numero * 31);
        for (let i = 0; i < 70; i++) {
          const ex = Math.floor(rndEstrelas() * w);
          const ey = Math.floor(rndEstrelas() * h * 0.55);
          p.ponto(ex, ey, rndEstrelas() < 0.2 ? COR.janela : COR.tintaNoite);
        }
        p.disco(250, 34, 7, COR.ceuPoeiraClaro);
        p.disco(253, 32, 6, ceu[0]);
      }
    });
    this.ceus.push(
      this.cena.add.image(0, 0, chave).setOrigin(0, 0).setScale(ESCALA).setScrollFactor(PARALLAX.ceu).setDepth(PROF.ceu).setAlpha(0)
    );
  }

  /** Camada 2 do céu: faixas de nuvem e poeira pontilhadas, em branco para receber a cor do tema. */
  private criarNuvens(): void {
    const rnd = aleatorio(11);
    this.nuvens = this.camada('lx-nuvens', PARALLAX.nuvens, PROF.nuvens, (p, w) => {
      for (let x = Math.floor(rnd() * 40); x < w; x += 50 + Math.floor(rnd() * 60)) {
        const cy = 14 + Math.floor(rnd() * 70);
        const meio = 18 + Math.floor(rnd() * 26);
        const espessura = 2 + Math.floor(rnd() * 3);
        for (let dy = -espessura; dy <= espessura; dy++) {
          for (let dx = -meio; dx <= meio; dx++) {
            const densidade = (1 - Math.abs(dx) / meio) * (1 - Math.abs(dy) / (espessura + 1)) * 1.5;
            if (densidade > bayer(x + dx, cy + dy)) p.ponto(x + dx, cy + dy, COR.luz);
          }
        }
      }
    });
  }

  /** Camada 3 do céu: montanhas de lixo distantes e guindastes em silhueta, em branco. */
  private criarHorizonte(): void {
    const rnd = aleatorio(23);
    const cor = COR.luz;
    const base = CHAO_Y / ESCALA + 2;
    this.horizonte = this.camada('lx-horizonte', PARALLAX.horizonte, PROF.horizonte, (p, w) => {
      let x = -20;
      while (x < w) {
        const larg = 50 + Math.floor(rnd() * 70);
        const alt = 14 + Math.floor(rnd() * 30);
        const cx = x + larg / 2;
        // Recortes variados: monte redondo, encosta reta ou platô em degraus, com pontas de sucata
        const perfil = rnd();
        for (let xx = x; xx < x + larg; xx++) {
          const t = Math.max(0, 1 - Math.abs(xx - cx) / (larg / 2));
          const forma = perfil < 0.4 ? Math.sqrt(t) : perfil < 0.7 ? t : Math.round(Math.min(1, t * 2) * 4) / 4;
          const ponta = rnd() < 0.05 ? 2 + Math.floor(rnd() * 5) : 0;
          const topo = Math.round(base - alt * forma - ponta + rnd() * 2);
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
    });
  }
}
