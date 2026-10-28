import Phaser from 'phaser';
import { COR, ESCALA, aleatorio, bayer, desenharPilha, hexNum, hexRgb, texturaPixel } from '../lixao/ArteLixao';
import type { Pincel, TipoPilha } from '../lixao/ArteLixao';
import { ALTURA_TELA, CHAO_Y, LARGURA_TELA } from '../lixao/TiposLixao';
import type { Clima } from '../lixao/TiposLixao';
import { PROF } from './AreaLixao';
import type { AreaLixao } from './AreaLixao';

/** Fatores de parallax: as 3 camadas de céu e a camada de pilhas. */
const PARALLAX = { ceu: 0, nuvens: 0.1, horizonte: 0.25, pilhas: 0.55 } as const;

/** Duração da transição de clima e tema ao trocar de trecho. */
const DURACAO_TRANSICAO_MS = 3000;

/** Intensidade dos efeitos de cada clima (0 desligado, 1 ligado por inteiro). */
interface EstadoClima {
  poeira: number;
  chuva: number;
  noite: number;
}

const EFEITOS: Record<Clima, EstadoClima> = {
  ensolarado: { poeira: 0, chuva: 0, noite: 0 },
  empoeirado: { poeira: 1, chuva: 0, noite: 0 },
  chuva: { poeira: 0, chuva: 1, noite: 0 },
  noite: { poeira: 0, chuva: 0, noite: 1 },
};

/** Valores que a transição interpola entre o tema de saída e o de chegada. */
interface Visual {
  tinta: Rgb;
  nuvem: Rgb;
  horizonte: Rgb;
  clima: EstadoClima;
}

function visualDe(trecho: AreaLixao): Visual {
  const tema = trecho.tema;
  return {
    tinta: hexRgb(tema.tinta ?? COR.luz),
    nuvem: hexRgb(tema.nuvem),
    horizonte: hexRgb(tema.horizonte),
    clima: { ...EFEITOS[trecho.info.clima] },
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
 * distantes e partículas mudam em fade de alguns segundos.
 */
export class CenarioLixao {
  private readonly cena: Phaser.Scene;
  private readonly trechos: readonly AreaLixao[];
  private readonly larguraMundo: number;
  private readonly ceus: Phaser.GameObjects.Image[] = [];
  private nuvens!: Phaser.GameObjects.Image;
  private horizonte!: Phaser.GameObjects.Image;
  private readonly tingiveis: Phaser.GameObjects.Components.Tint[] = [];
  private poeira!: Phaser.GameObjects.Particles.ParticleEmitter;
  private veuPoeira!: Phaser.GameObjects.Rectangle;
  private chuva!: Phaser.GameObjects.Particles.ParticleEmitter;
  private veuNoite!: Phaser.GameObjects.Rectangle;

  private indiceAtual = -1;
  private de!: Visual;
  private para!: Visual;
  private progresso = 1;

  constructor(cena: Phaser.Scene, trechos: readonly AreaLixao[]) {
    this.cena = cena;
    this.trechos = trechos;
    this.larguraMundo = trechos[trechos.length - 1].fim;
  }

  /** Monta céus, camadas e clima (antes dos trechos, que registram seus objetos tingíveis). */
  construir(): void {
    this.trechos.forEach((t) => this.criarCeu(t));
    this.criarNuvens();
    this.criarHorizonte();
    this.criarPilhas();
    this.criarClima();
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

  atualizar(delta: number): void {
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

    this.poeira.setAlpha(v.clima.poeira);
    this.poeira.emitting = v.clima.poeira > 0.01;
    this.veuPoeira.setAlpha(0.3 * v.clima.poeira);
    this.chuva.setAlpha(0.5 * v.clima.chuva);
    this.chuva.emitting = v.clima.chuva > 0.01;
    this.veuNoite.setAlpha(0.45 * v.clima.noite);
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
  private criarCeu(trecho: AreaLixao): void {
    const { ceu, astro } = trecho.tema;
    const chave = `lx-a${trecho.info.numero}-ceu`;
    const w = LARGURA_TELA / ESCALA;
    const h = ALTURA_TELA / ESCALA;
    texturaPixel(this.cena, chave, w, h, (p) => {
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
    });
  }

  /** Camada de pilhas: monitores, placas e cabos alternados ao longo do mapa. */
  private criarPilhas(): void {
    const rnd = aleatorio(37);
    const tipos: readonly TipoPilha[] = ['monitores', 'placas', 'cabos'];
    const base = CHAO_Y / ESCALA + 1;
    let anterior = -1;
    this.registrarTingivel(
      this.camada('lx-pilhas', PARALLAX.pilhas, PROF.pilhas, (p, w) => {
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

  /** Poeira, chuva e escuridão do mapa; a intensidade de cada um segue o trecho atual. */
  private criarClima(): void {
    this.poeira = this.cena.add
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
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(PROF.clima);
    this.veuPoeira = this.cena.add
      .rectangle(0, 0, LARGURA_TELA, ALTURA_TELA, hexNum(COR.horizonte), 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(PROF.clima)
      .setAlpha(0);
    this.chuva = this.cena.add
      .particles(0, 0, 'lx-poeira', {
        x: { min: -100, max: LARGURA_TELA + 100 },
        y: -10,
        lifespan: 900,
        speedY: { min: 800, max: 1000 },
        speedX: -120,
        scaleX: ESCALA,
        scaleY: ESCALA * 4,
        quantity: 6,
        frequency: 16,
        tint: hexNum(COR.tintaChuva),
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(PROF.clima);
    this.veuNoite = this.cena.add
      .rectangle(0, 0, LARGURA_TELA, ALTURA_TELA, hexNum(COR.noiteRoxoEscuro), 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(PROF.escuro)
      .setAlpha(0);
  }
}
