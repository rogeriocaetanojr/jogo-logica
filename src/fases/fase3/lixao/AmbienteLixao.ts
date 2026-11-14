import Phaser from 'phaser';
import { COR, ESCALA, aleatorio, folhaPixel, grade, hexNum, texturaPixel } from './ArteLixao';
import type { EstadoClima } from './ClimaLixao';
import { CHAO_Y, LARGURA_TELA } from './TiposLixao';
import type { TrechoLixao } from '../trechos/TrechoLixao';

/**
 * Ambiente vivo do Lixão, por cima do chão e sem colisão: sacolas e papéis voando com o vento,
 * enxames de moscas sobre o entulho e fumaça tóxica subindo do chão. Tudo depende do clima:
 * na poeira voa mais lixo, na chuva quase nada voa e as moscas somem, à noite a fumaça rareia.
 */

/** Profundidade: à frente do chão e do entulho, atrás dos objetos e do jogador. */
const PROF_AMBIENTE = 36;

const AMBIENTE = {
  /** Lixo voando na tela ao mesmo tempo (no máximo; o clima reduz). */
  VOADORES: 9,
  /** Distância entre focos de moscas/fumaça no chão (px de mundo). */
  ESPACO_FOCOS: 520,
  MOSCAS_POR_ENXAME: 6,
  /** Intervalo entre baforadas de fumaça tóxica. */
  FUMACA_MS: 260,
  LIMITE_FUMACA: 24,
} as const;

interface Voador {
  img: Phaser.GameObjects.Sprite;
  vx: number;
  fase: number;
  amplitude: number;
  yBase: number;
}

interface Foco {
  x: number;
  moscas: Phaser.GameObjects.Rectangle[];
  fase: number;
  fumega: boolean;
}

export class AmbienteLixao {
  private readonly cena: Phaser.Scene;
  private readonly trechos: readonly TrechoLixao[];
  private readonly voadores: Voador[] = [];
  private readonly focos: Foco[] = [];
  private fumacas = 0;
  private esperaFumaca = 0;
  private tempo = 0;
  private clima: EstadoClima = { poeira: 0, chuva: 0, noite: 0 };
  private readonly rnd = aleatorio(5150);

  constructor(cena: Phaser.Scene, trechos: readonly TrechoLixao[]) {
    this.cena = cena;
    this.trechos = trechos;
  }

  construir(): void {
    this.gerarTexturas();
    for (let i = 0; i < AMBIENTE.VOADORES; i++) this.criarVoador(i);
    this.criarFocos();
  }

  atualizar(delta: number, clima: EstadoClima): void {
    this.clima = clima;
    this.tempo += delta;
    this.moverVoadores(delta);
    this.moverMoscas();
    this.soltarFumaca(delta);
  }

  /* ========================================================================= */

  private criarVoador(i: number): void {
    const chave = i % 3 === 0 ? 'lx-amb-papel' : 'lx-amb-sacola';
    const img = this.cena.add.sprite(0, 0, chave, 0).setScale(ESCALA).setScrollFactor(0).setDepth(PROF_AMBIENTE);
    const v: Voador = { img, vx: 0, fase: this.rnd() * 10, amplitude: 0, yBase: 0 };
    this.reposicionar(v, this.rnd() * LARGURA_TELA);
    this.voadores.push(v);
  }

  /** Volta o voador para uma borda da tela, numa altura e velocidade novas. */
  private reposicionar(v: Voador, x?: number): void {
    const vento = 40 + this.clima.poeira * 110;
    v.vx = -(vento + this.rnd() * 60);
    v.amplitude = 10 + this.rnd() * 30;
    v.yBase = 300 + this.rnd() * 300;
    v.img.setPosition(x ?? LARGURA_TELA + 40, v.yBase);
  }

  private moverVoadores(delta: number): void {
    const ativos = Math.round(AMBIENTE.VOADORES * Math.max(0.15, 0.55 + this.clima.poeira * 0.45 - this.clima.chuva * 0.4));
    const dt = delta / 1000;
    const rajada = 1 + this.clima.poeira * 0.8;
    this.voadores.forEach((v, i) => {
      v.img.setVisible(i < ativos);
      v.fase += dt * 3;
      const x = v.img.x + v.vx * dt * rajada;
      v.img.setPosition(x, v.yBase + Math.sin(v.fase) * v.amplitude);
      v.img.setAngle(Math.sin(v.fase * 0.7) * 25);
      v.img.setFrame(Math.floor(v.fase * 2) % 2);
      if (x < -40) this.reposicionar(v);
    });
  }

  /** Focos sobre o chão livre de cada trecho: enxame de moscas e, às vezes, fumaça tóxica. */
  private criarFocos(): void {
    for (const t of this.trechos) {
      for (let x = 260; x < t.largura - 100; x += AMBIENTE.ESPACO_FOCOS + Math.floor(this.rnd() * 200)) {
        if (!t.chaoLivre(x, 48)) continue;
        const moscas: Phaser.GameObjects.Rectangle[] = [];
        for (let k = 0; k < AMBIENTE.MOSCAS_POR_ENXAME; k++) {
          moscas.push(this.cena.add.rectangle(0, 0, ESCALA, ESCALA, hexNum(COR.contorno)).setDepth(PROF_AMBIENTE).setVisible(false));
        }
        this.focos.push({ x: grade(t.offset + x), moscas, fase: this.rnd() * 100, fumega: this.rnd() < 0.5 });
      }
    }
  }

  private naTela(x: number, margem = 80): boolean {
    const vista = this.cena.cameras.main.worldView;
    return x > vista.x - margem && x < vista.right + margem;
  }

  private moverMoscas(): void {
    const visiveis = this.clima.chuva < 0.5;
    const t = this.tempo / 1000;
    for (const f of this.focos) {
      const ver = visiveis && this.naTela(f.x);
      f.moscas.forEach((m, k) => {
        m.setVisible(ver);
        if (!ver) return;
        const a = t * (2.2 + k * 0.37) + f.fase + k;
        m.setPosition(grade(f.x + Math.cos(a) * (14 + k * 3)), grade(CHAO_Y - 40 + Math.sin(a * 1.7) * 14));
      });
    }
  }

  private soltarFumaca(delta: number): void {
    this.esperaFumaca -= delta;
    if (this.esperaFumaca > 0) return;
    this.esperaFumaca = AMBIENTE.FUMACA_MS * (1 + this.clima.chuva * 2 + this.clima.noite);
    for (const f of this.focos) {
      if (!f.fumega || this.fumacas >= AMBIENTE.LIMITE_FUMACA || !this.naTela(f.x) || this.rnd() < 0.5) continue;
      this.fumacas++;
      const puff = this.cena.add
        .image(f.x + (this.rnd() - 0.5) * 30, CHAO_Y - 8, 'lx-poeira')
        .setScale(ESCALA * 2)
        .setTint(hexNum(COR.chorume))
        .setAlpha(0.35)
        .setDepth(PROF_AMBIENTE);
      this.cena.tweens.add({
        targets: puff,
        y: puff.y - 120 - this.rnd() * 80,
        x: puff.x - 20 - this.rnd() * 40 * (1 + this.clima.poeira),
        scale: ESCALA * 6,
        alpha: 0,
        duration: 2600 + this.rnd() * 1200,
        onComplete: () => {
          puff.destroy();
          this.fumacas--;
        },
      });
    }
  }

  private gerarTexturas(): void {
    // Sacola plástica inflando e murchando
    folhaPixel(this.cena, 'lx-amb-sacola', 7, 7, 2, (p, q) => {
      if (q === 0) {
        p.disco(3, 3, 3, COR.sombraSucata);
        p.ponto(2, 2, COR.sucataClara);
        p.ponto(1, 0, COR.sombraSucata);
        p.ponto(5, 0, COR.sombraSucata);
      } else {
        p.px(1, 2, 5, 4, COR.sombraSucata);
        p.px(2, 3, 2, 1, COR.sucataClara);
        p.ponto(0, 1, COR.sombraSucata);
        p.ponto(6, 1, COR.sombraSucata);
      }
    });
    // Folha de papel dobrando no vento
    folhaPixel(this.cena, 'lx-amb-papel', 5, 4, 2, (p, q) => {
      p.px(0, q === 0 ? 1 : 0, 5, q === 0 ? 2 : 4, COR.sucataClara);
      p.ponto(1, q === 0 ? 1 : 1, COR.sucata);
      p.ponto(3, 2, COR.sucata);
    });
    texturaPixel(this.cena, 'lx-poeira', 1, 1, (p) => p.ponto(0, 0, COR.luz));
  }
}
