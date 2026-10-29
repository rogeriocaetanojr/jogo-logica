import Phaser from 'phaser';
import { COR, ESCALA, aleatorio, bayer, grade, hexNum, hexRgb, texturaPixel } from './ArteLixao';
import type { JogadorLixao } from './JogadorLixao';
import { MOVIMENTO_LIXAO } from './JogadorLixao';
import { ALTURA_TELA, CHAO_Y, LARGURA_TELA } from './TiposLixao';
import type { Clima } from './TiposLixao';

/** Intensidade dos efeitos de cada clima (0 desligado, 1 ligado por inteiro). */
export interface EstadoClima {
  poeira: number;
  chuva: number;
  noite: number;
}

/** Efeitos de cada clima do plano; cada área escolhe o seu em AREAS (TiposLixao). */
export const EFEITOS_CLIMA: Record<Clima, EstadoClima> = {
  ensolarado: { poeira: 0, chuva: 0, noite: 0 },
  empoeirado: { poeira: 1, chuva: 0, noite: 0 },
  chuva: { poeira: 0, chuva: 1, noite: 0 },
  noite: { poeira: 0, chuva: 0, noite: 1 },
};

/** Ordem da tecla de depuração que troca o clima. */
export const CLIMAS: readonly Clima[] = ['ensolarado', 'empoeirado', 'chuva', 'noite'];

/** Chuva: o chão molhado multiplica a frenagem e a aceleração do jogador no chão. */
export const CHUVA = {
  FATOR_FRENAGEM_CHAO: 0.15,
  FATOR_ACELERACAO_CHAO: 0.75,
  /** Distância média entre poças e meia largura de uma poça (px de mundo). */
  ESPACO_POCAS: 280,
  MEIA_LARGURA_POCA: 40,
} as const;

/** Escuridão: opacidade do véu e raio da luz em volta do jogador, por clima (px de mundo). */
const VEU = {
  POEIRA_ALPHA: 0.86,
  NOITE_ALPHA: 0.94,
  RAIO_POEIRA: 300,
  RAIO_NOITE: 140,
  /** Raio da luz de um LED ciano (terminal) ou de uma fonte de faísca. */
  RAIO_LED: 96,
  RAIO_FAISCA: 72,
} as const;

/** Profundidades: o véu fica acima do cenário e do jogador, abaixo do brilho neon e da HUD. */
const PROF_CLIMA = 80;
const PROF_VEU = 90;

/** Fonte de luz no mundo que fura a escuridão (LED ciano, faísca). */
interface Luz {
  alvo: { x: number; y: number; active?: boolean };
  raio: number;
}

/** Algo que diz se um x de mundo tem chão firme (sem buraco nem obstáculo de saída). */
export interface ChaoDoTrecho {
  readonly offset: number;
  readonly largura: number;
  readonly info: { clima: Clima };
  chaoLivre(xLocal: number, meiaLargura: number): boolean;
}

/**
 * Efeitos de clima do Lixão: poeira com névoa que só deixa ver perto do jogador, chuva com
 * poças, respingos, tinta azul e chão escorregadio, e noite quase preta com luzes pequenas.
 *
 * A escuridão (névoa ou noite) é uma única RenderTexture do tamanho da tela: a cada quadro
 * é preenchida com a cor do véu e furada com pincéis de luz pontilhados, na grade da arte.
 * Só é redesenhada enquanto algum véu está ligado.
 */
export class ClimaLixao {
  private readonly cena: Phaser.Scene;
  private estado: EstadoClima = { ...EFEITOS_CLIMA.ensolarado };
  private readonly luzes: Luz[] = [];
  private readonly pocas: Phaser.GameObjects.Image[] = [];

  private poeira!: Phaser.GameObjects.Particles.ParticleEmitter;
  private chuva!: Phaser.GameObjects.Particles.ParticleEmitter;
  private respingos!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tintaChuva!: Phaser.GameObjects.Rectangle;
  private veu!: Phaser.GameObjects.RenderTexture;
  private acumuladoRespingo = 0;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
  }

  construir(): void {
    this.criarTexturas();
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
      // Por cima da névoa: o pó passa voando na frente de tudo
      .setDepth(PROF_VEU + 2);
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
      .setDepth(PROF_CLIMA);
    // Respingos no chão: emitidos à mão em x de mundo, em atualizar()
    this.respingos = this.cena.add
      .particles(0, 0, 'lx-poeira', {
        lifespan: 260,
        speedX: { min: -70, max: 70 },
        speedY: { min: -170, max: -90 },
        gravityY: 900,
        scale: ESCALA,
        alpha: { start: 0.9, end: 0 },
        tint: hexNum(COR.tintaChuva),
        emitting: false,
      })
      .setDepth(PROF_CLIMA);
    this.tintaChuva = this.cena.add
      .rectangle(0, 0, LARGURA_TELA, ALTURA_TELA, hexNum(COR.chuvaAzul), 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(PROF_CLIMA)
      .setAlpha(0);
    this.veu = this.cena.add
      .renderTexture(0, 0, LARGURA_TELA, ALTURA_TELA)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(PROF_VEU)
      .setVisible(false);
  }

  /** Fonte de luz que fura a escuridão. Objetos destruídos (active false) deixam de iluminar. */
  registrarLuz(alvo: Luz['alvo'], tipo: 'led' | 'faisca' = 'led'): void {
    this.luzes.push({ alvo, raio: tipo === 'led' ? VEU.RAIO_LED : VEU.RAIO_FAISCA });
  }

  /** Poças espalhadas pelo chão firme dos trechos de chuva (chamar depois de montar os trechos). */
  criarPocas(trechos: readonly ChaoDoTrecho[]): void {
    for (const trecho of trechos) {
      if (EFEITOS_CLIMA[trecho.info.clima].chuva === 0) continue;
      const rnd = aleatorio(trecho.offset + 7);
      for (let x = 120; x < trecho.largura - 120; x += CHUVA.ESPACO_POCAS * (0.6 + rnd() * 0.8)) {
        if (!trecho.chaoLivre(x, CHUVA.MEIA_LARGURA_POCA)) continue;
        const poca = this.cena.add
          .image(grade(trecho.offset + x), CHAO_Y + ESCALA, rnd() < 0.5 ? 'lx-poca' : 'lx-poca-larga')
          .setOrigin(0.5, 0.5)
          .setScale(ESCALA)
          .setDepth(PROF_CLIMA - 45)
          .setAlpha(0);
        this.pocas.push(poca);
      }
    }
  }

  /** Aplica as intensidades de clima (a transição entre trechos fica no CenarioLixao). */
  aplicar(estado: EstadoClima): void {
    this.estado = { ...estado };
    const { poeira, chuva, noite } = this.estado;
    this.poeira.setAlpha(poeira);
    this.poeira.emitting = poeira > 0.01;
    this.chuva.setAlpha(0.5 * chuva);
    this.chuva.emitting = chuva > 0.01;
    this.tintaChuva.setAlpha(0.16 * chuva);
    for (const poca of this.pocas) poca.setAlpha(0.8 * chuva);
    this.veu.setVisible(poeira > 0.01 || noite > 0.01);
  }

  /** A cada quadro: chão escorregadio, respingos e o véu furado em volta das luzes. */
  atualizar(delta: number, jogador: JogadorLixao): void {
    this.aplicarChaoMolhado(jogador);
    this.emitirRespingos(delta);
    if (this.veu.visible) this.desenharVeu(jogador);
  }

  /* =========================================================================
   * EFEITOS
   * ========================================================================= */

  /** Na chuva, frenagem bem menor e aceleração um pouco menor no chão, proporcional à intensidade. */
  private aplicarChaoMolhado(jogador: JogadorLixao): void {
    const c = this.estado.chuva;
    const p = jogador.parametros;
    p.FRENAGEM_CHAO = MOVIMENTO_LIXAO.FRENAGEM_CHAO * (1 + (CHUVA.FATOR_FRENAGEM_CHAO - 1) * c);
    p.ACELERACAO_CHAO = MOVIMENTO_LIXAO.ACELERACAO_CHAO * (1 + (CHUVA.FATOR_ACELERACAO_CHAO - 1) * c);
  }

  private emitirRespingos(delta: number): void {
    const c = this.estado.chuva;
    if (c <= 0.01) return;
    // Cerca de 40 respingos por segundo na tela, metade deles nas poças visíveis
    this.acumuladoRespingo += (delta / 1000) * 40 * c;
    const cam = this.cena.cameras.main;
    const visiveis = this.pocas.filter((p) => p.x > cam.scrollX && p.x < cam.scrollX + LARGURA_TELA);
    while (this.acumuladoRespingo >= 1) {
      this.acumuladoRespingo -= 1;
      const poca = visiveis.length > 0 && Math.random() < 0.5 ? visiveis[Math.floor(Math.random() * visiveis.length)] : null;
      const x = poca ? poca.x + (Math.random() - 0.5) * 60 : cam.scrollX + Math.random() * LARGURA_TELA;
      this.respingos.emitParticleAt(x, CHAO_Y);
    }
  }

  /**
   * Véu de névoa ou de noite: cor e opacidade seguem a mistura dos dois, e a luz em volta do
   * jogador tem 300 px na névoa e 140 px na noite. LEDs e faíscas só furam a noite.
   */
  private desenharVeu(jogador: JogadorLixao): void {
    const { poeira, noite } = this.estado;
    const peso = noite / Math.max(0.0001, poeira + noite);
    const cor = misturar(COR.horizonte, COR.noiteRoxoEscuro, peso);
    const alpha = Math.max(poeira * VEU.POEIRA_ALPHA, noite * VEU.NOITE_ALPHA);
    // Só dois raios (um pincel cada): a luz troca de tamanho no meio da transição
    const raio = peso < 0.5 ? VEU.RAIO_POEIRA : VEU.RAIO_NOITE;
    const cam = this.cena.cameras.main;

    this.veu.clear().fill(cor, alpha);
    // Luz do jogador centrada no peito (a origem do sprite fica nos pés)
    this.furar(jogador.x - cam.scrollX, jogador.y - 48 - cam.scrollY, raio);
    if (noite > 0.01) {
      for (const luz of this.luzes) {
        if (luz.alvo.active === false) continue;
        const sx = luz.alvo.x - cam.scrollX;
        if (sx < -luz.raio || sx > LARGURA_TELA + luz.raio) continue;
        this.furar(sx, luz.alvo.y - cam.scrollY, luz.raio);
      }
    }
    this.veu.render();
  }

  /** Apaga o véu com o pincel de luz do raio mais próximo, alinhado à grade da arte. */
  private furar(x: number, y: number, raio: number): void {
    this.veu.stamp(this.pincel(raio), undefined, grade(x), grade(y), {
      scale: ESCALA,
      blendMode: Phaser.BlendModes.ERASE,
    });
  }

  /* =========================================================================
   * TEXTURAS
   * ========================================================================= */

  /** Pincel de luz: disco cheio no meio e borda pontilhada que some aos poucos. */
  private pincel(raio: number): string {
    const r = Math.round(raio / ESCALA);
    const chave = `lx-luz-${r}`;
    if (this.cena.textures.exists(chave)) return chave;
    return texturaPixel(this.cena, chave, r * 2 + 1, r * 2 + 1, (p) => {
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const d = Math.sqrt(x * x + y * y) / r;
          if (d > 1) continue;
          const densidade = d < 0.55 ? 1 : (1 - d) / 0.45;
          if (densidade > bayer(x + r, y + r)) p.ponto(x + r, y + r, COR.luz);
        }
      }
    });
  }

  /** Poças rasas: lâmina azul com reflexo claro do céu de chuva. */
  private criarTexturas(): void {
    const poca = (chave: string, w: number) =>
      texturaPixel(this.cena, chave, w, 3, (p) => {
        p.px(1, 0, w - 2, 3, COR.chuvaAzul);
        p.px(0, 1, w, 1, COR.chuvaAzul);
        p.px(2, 1, w - 4, 1, COR.chuvaAzulClaro);
        p.px(Math.floor(w / 3), 0, 3, 1, COR.tintaChuva);
      });
    poca('lx-poca', 14);
    poca('lx-poca-larga', 20);
    // Pincéis usados pelo véu, gerados antes para não travar o primeiro quadro escuro
    [VEU.RAIO_POEIRA, VEU.RAIO_NOITE, VEU.RAIO_LED, VEU.RAIO_FAISCA].forEach((r) => this.pincel(r));
  }
}

function misturar(a: string, b: string, t: number): number {
  const [ar, ag, ab] = hexRgb(a);
  const [br, bg, bb] = hexRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return (c(ar, br) << 16) | (c(ag, bg) << 8) | c(ab, bb);
}
