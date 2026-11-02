import Phaser from 'phaser';
import { TEMPESTADE_FASE1 } from './constantesFase1';

interface Gota {
  x: number;
  y: number;
  velocidade: number;
  comprimento: number;
}

const T = TEMPESTADE_FASE1;
const LARGURA_TELA = 1280;
const ALTURA_TELA = 720;

/**
 * Tempestade da arena do Helio, presa à tela:
 * - o céu escurece atrás das plataformas (o cenário de jogo continua legível);
 * - nuvens carregadas fecham o topo;
 * - chuva inclinada pelo vento cai na frente de tudo;
 * - raios cortam o céu de tempos em tempos, com clarão e um tremor leve de trovão.
 * Entra e sai em fade, controlado pela intensidade (0 a 1).
 */
export class TempestadeFase1 {
  private readonly cena: Phaser.Scene;
  private readonly ceu: Phaser.GameObjects.Graphics;
  private readonly raio: Phaser.GameObjects.Graphics;
  private readonly chuva: Phaser.GameObjects.Graphics;
  private readonly gotas: Gota[] = [];

  private intensidade: number = 0;
  private ativa: boolean = false;
  private proximoRaioMs: number = 0;
  private raioRestanteMs: number = 0;
  private pontosRaio: Phaser.Math.Vector2[] = [];

  constructor(cena: Phaser.Scene) {
    this.cena = cena;

    this.ceu = cena.add.graphics().setScrollFactor(0).setDepth(T.PROFUNDIDADE_CEU);
    this.raio = cena.add.graphics().setScrollFactor(0).setDepth(T.PROFUNDIDADE_CEU + 0.5);
    this.chuva = cena.add.graphics().setScrollFactor(0).setDepth(T.PROFUNDIDADE_CHUVA);

    for (let i = 0; i < T.GOTAS_QUANTIDADE; i++) {
      this.gotas.push(this.novaGota(true));
    }
  }

  public iniciar(): void {
    this.ativa = true;
    this.proximoRaioMs = this.sortearIntervaloRaio();
    this.cena.tweens.add({ targets: this, intensidade: 1, duration: T.ENTRADA_MS, ease: 'Sine.easeOut' });
  }

  /**
   * O céu abre devagar e a chuva para.
   */
  public encerrar(): void {
    this.ativa = false;
    this.cena.tweens.add({ targets: this, intensidade: 0, duration: T.SAIDA_MS, ease: 'Sine.easeIn' });
  }

  public update(delta: number): void {
    if (this.intensidade <= 0.001) {
      if (!this.ativa) {
        this.ceu.clear();
        this.chuva.clear();
        this.raio.clear();
      }
      return;
    }

    this.desenharCeu();
    this.atualizarChuva(delta);
    this.atualizarRaios(delta);
  }

  private desenharCeu(): void {
    const g = this.ceu;
    g.clear();

    // Clarão do raio: o céu acende por um instante
    const clarao = this.raioRestanteMs > T.RAIO_DURACAO_MS - 90;
    g.fillStyle(clarao ? 0xe0e7ff : T.COR_CEU, (clarao ? 0.35 : T.ALFA_CEU) * this.intensidade);
    g.fillRect(0, 0, LARGURA_TELA, ALTURA_TELA);

    // Nuvens carregadas fechando o topo
    g.fillStyle(T.COR_NUVENS, T.ALFA_NUVENS * this.intensidade);
    for (let x = -60; x < LARGURA_TELA + 120; x += 170) {
      g.fillEllipse(x, 30 + ((x / 170) % 2) * 18, 280, 110);
    }
  }

  private atualizarChuva(delta: number): void {
    const dt = delta / 1000;
    const g = this.chuva;
    g.clear();
    if (!this.ativa && this.intensidade < 0.15) return;

    g.lineStyle(2, 0xc7d2fe, T.ALFA_GOTAS * this.intensidade);
    for (const gota of this.gotas) {
      gota.y += gota.velocidade * dt;
      gota.x += gota.velocidade * T.GOTA_INCLINACAO * dt;
      if (gota.y > ALTURA_TELA + 20 || gota.x < -40) {
        Object.assign(gota, this.novaGota(false));
      }
      g.lineBetween(gota.x, gota.y, gota.x - gota.comprimento * T.GOTA_INCLINACAO, gota.y - gota.comprimento);
    }
  }

  private atualizarRaios(delta: number): void {
    this.raio.clear();

    if (this.raioRestanteMs > 0) {
      this.raioRestanteMs -= delta;
      const alfa = Math.max(0, this.raioRestanteMs / T.RAIO_DURACAO_MS) * this.intensidade;
      this.raio.lineStyle(6, 0xa5b4fc, alfa * 0.5);
      this.raio.strokePoints(this.pontosRaio);
      this.raio.lineStyle(2, 0xffffff, alfa);
      this.raio.strokePoints(this.pontosRaio);
      return;
    }

    if (!this.ativa) return;
    this.proximoRaioMs -= delta;
    if (this.proximoRaioMs <= 0) {
      this.dispararRaio();
      this.proximoRaioMs = this.sortearIntervaloRaio();
    }
  }

  /**
   * Raio em zigue-zague do topo da tela até o meio do céu, seguido de um tremor curto de trovão.
   */
  private dispararRaio(): void {
    let x = Phaser.Math.Between(120, LARGURA_TELA - 120);
    let y = 0;
    this.pontosRaio = [new Phaser.Math.Vector2(x, y)];
    while (y < 320) {
      x += Phaser.Math.Between(-36, 36);
      y += Phaser.Math.Between(26, 52);
      this.pontosRaio.push(new Phaser.Math.Vector2(x, y));
    }
    this.raioRestanteMs = T.RAIO_DURACAO_MS;
    this.cena.time.delayedCall(220, () => this.cena.cameras.main.shake(260, 0.003));
  }

  private sortearIntervaloRaio(): number {
    return Phaser.Math.Between(T.RAIO_INTERVALO_MIN_MS, T.RAIO_INTERVALO_MAX_MS);
  }

  private novaGota(espalhar: boolean): Gota {
    return {
      x: Phaser.Math.Between(0, LARGURA_TELA + 200),
      y: espalhar ? Phaser.Math.Between(-ALTURA_TELA, ALTURA_TELA) : Phaser.Math.Between(-80, -10),
      velocidade: Phaser.Math.Between(T.GOTA_VELOCIDADE_MIN, T.GOTA_VELOCIDADE_MAX),
      comprimento: Phaser.Math.Between(T.GOTA_COMPRIMENTO_MIN, T.GOTA_COMPRIMENTO_MAX),
    };
  }
}
