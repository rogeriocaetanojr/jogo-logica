import Phaser from 'phaser';
import { COR, hexNum, texturaBrilho } from '../ArteFaseFinal';
import { ANDAR_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';
import type { ConfigBloqueio } from './tiposAndar';
import { texAndar } from './TexturasAndar';

const A = ANDAR_FASE_FINAL;
const ALTURA_VAO = A.CHAO_Y - A.TETO_Y;
const PROF = -12; // atrás do teto: portões que sobem somem dentro dele

/**
 * O obstáculo que o puzzle do andar controla. Cada tipo bloqueia a passagem de um jeito
 * e tem sua animação de liberar. As consequências de código errado entram na etapa 3.
 */
export class BloqueioPuzzle {
  public liberado: boolean = false;
  public readonly cfg: ConfigBloqueio;

  private readonly cena: Phaser.Scene;
  private readonly solidos: Phaser.Physics.Arcade.StaticGroup;
  private readonly paredes: Phaser.GameObjects.Zone[] = [];
  private readonly portoes: Phaser.GameObjects.Image[] = [];
  private readonly placas: Phaser.GameObjects.Image[] = [];
  private feixes?: Phaser.GameObjects.Graphics;
  private brilhosLaser: Phaser.GameObjects.Image[] = [];

  constructor(cena: Phaser.Scene, cfg: ConfigBloqueio, solidos: Phaser.Physics.Arcade.StaticGroup) {
    this.cena = cena;
    this.cfg = cfg;
    this.solidos = solidos;

    switch (cfg.tipo) {
      case 'catraca':
        this.criarCatraca();
        break;
      case 'laser':
        this.criarLaser();
        break;
      case 'ponte':
        this.criarPonte();
        break;
      case 'comportas':
        this.criarComportas();
        break;
      case 'elevador':
        this.liberado = false;
        break;
    }
  }

  /** Vão que a ponte precisa cobrir (o construtor do andar tira o chão daqui). */
  public static vaoDaPonte(cfg: ConfigBloqueio): { x0: number; x1: number } | undefined {
    if (cfg.tipo !== 'ponte') return undefined;
    return { x0: cfg.x, x1: cfg.x + (cfg.placas ?? 5) * (cfg.larguraPlaca ?? 96) };
  }

  private parede(x: number, largura: number): void {
    const zona = this.cena.add.zone(x, A.TETO_Y + ALTURA_VAO / 2, largura, ALTURA_VAO);
    this.solidos.add(zona);
    this.paredes.push(zona);
  }

  private criarCatraca(): void {
    const x = this.cfg.x;
    this.cena.add.image(x - 70, A.CHAO_Y, texAndar.catraca).setOrigin(0.5, 1).setScale(ESCALA_ARTE).setDepth(-15);
    this.portoes.push(
      this.cena.add.image(x, A.CHAO_Y, texAndar.portaoVidro).setOrigin(0.5, 1).setScale(ESCALA_ARTE).setDepth(PROF)
    );
    this.parede(x, 60);
  }

  private criarLaser(): void {
    const x = this.cfg.x;
    for (const dx of [-24, 0, 24]) {
      this.cena.add.image(x + dx, A.TETO_Y, texAndar.emissorLaser).setOrigin(0.5, 0).setScale(ESCALA_ARTE).setDepth(PROF + 1);
      this.cena.add
        .image(x + dx, A.CHAO_Y, texAndar.emissorLaser)
        .setOrigin(0.5, 0)
        .setScale(ESCALA_ARTE, -ESCALA_ARTE)
        .setDepth(PROF + 1);
      this.brilhosLaser.push(
        this.cena.add
          .image(x + dx, A.TETO_Y + ALTURA_VAO / 2, texturaBrilho(this.cena))
          .setScale(0.5, 4.6)
          .setTint(hexNum(COR.vermelho))
          .setAlpha(0.25)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(PROF)
      );
    }
    this.feixes = this.cena.add.graphics().setDepth(PROF + 0.5);
    this.parede(x, 70);
  }

  private criarPonte(): void {
    const n = this.cfg.placas ?? 5;
    const largura = this.cfg.larguraPlaca ?? 96;
    for (let i = 0; i < n; i++) {
      const placa = this.cena.add
        .image(this.cfg.x + largura * i + largura / 2, A.CHAO_Y, texAndar.placaPonte)
        .setOrigin(0.5, 0)
        .setDisplaySize(largura, A.ESPESSURA_PLACA)
        .setDepth(6)
        .setVisible(false);
      this.placas.push(placa);
    }
  }

  private criarComportas(): void {
    const esp = this.cfg.espacamento ?? 200;
    for (let i = 0; i < 3; i++) {
      const x = this.cfg.x + i * esp;
      this.portoes.push(
        this.cena.add.image(x, A.CHAO_Y, texAndar.comporta).setOrigin(0.5, 1).setScale(ESCALA_ARTE).setDepth(PROF)
      );
      this.cena.add
        .text(x, A.TETO_Y + 30, `COMPORTA ${i + 1}`, {
          fontFamily: 'Consolas, Courier New, monospace',
          fontSize: '11px',
          color: COR.ciano,
          backgroundColor: 'rgba(5,5,12,0.8)',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(PROF + 3);
      this.parede(x, 72);
    }
  }

  public update(tempo: number): void {
    if (!this.feixes) return;
    const g = this.feixes;
    g.clear();
    if (this.liberado) return;
    const x = this.cfg.x;
    const tremor = Math.sin(tempo / 40) * 0.15;
    for (const dx of [-24, 0, 24]) {
      g.lineStyle(6, hexNum(COR.vermelho), 0.35 + tremor);
      g.lineBetween(x + dx, A.TETO_Y + 22, x + dx, A.CHAO_Y - 22);
      g.lineStyle(2, 0xffd6dc, 0.9);
      g.lineBetween(x + dx, A.TETO_Y + 22, x + dx, A.CHAO_Y - 22);
    }
  }

  /** Abre a passagem com a animação do tipo. */
  public liberar(aoTerminar?: () => void): void {
    if (this.liberado) return;
    this.liberado = true;
    const d = A.ABRIR_BLOQUEIO_MS;

    const removerParedes = () => {
      for (const z of this.paredes) this.solidos.remove(z, true, true);
      this.paredes.length = 0;
    };

    switch (this.cfg.tipo) {
      case 'catraca':
        this.cena.tweens.add({ targets: this.portoes[0], y: A.TETO_Y + 10, duration: d, ease: 'Cubic.easeIn' });
        removerParedes();
        this.cena.time.delayedCall(d, () => aoTerminar?.());
        break;
      case 'laser':
        for (const b of this.brilhosLaser) this.cena.tweens.add({ targets: b, alpha: 0, duration: 300 });
        removerParedes();
        this.cena.time.delayedCall(300, () => aoTerminar?.());
        break;
      case 'ponte':
        this.placas.forEach((placa, i) => {
          this.cena.time.delayedCall(i * A.INTERVALO_PLACA_MS, () => {
            placa.setVisible(true).setY(A.CHAO_Y + 40).setAlpha(0);
            this.cena.tweens.add({ targets: placa, y: A.CHAO_Y, alpha: 1, duration: 180, ease: 'Back.easeOut' });
            const zona = this.cena.add.zone(placa.x, A.CHAO_Y + A.ESPESSURA_PLACA / 2, placa.displayWidth, A.ESPESSURA_PLACA);
            this.solidos.add(zona);
          });
        });
        this.cena.time.delayedCall(this.placas.length * A.INTERVALO_PLACA_MS + 200, () => aoTerminar?.());
        break;
      case 'comportas':
        this.portoes.forEach((portao, i) => {
          this.cena.time.delayedCall(i * A.INTERVALO_COMPORTA_MS, () => {
            this.cena.tweens.add({ targets: portao, y: A.TETO_Y + 10, duration: d, ease: 'Cubic.easeIn' });
            const zona = this.paredes[i];
            if (zona) this.solidos.remove(zona, true, true);
          });
        });
        this.cena.time.delayedCall(2 * A.INTERVALO_COMPORTA_MS + d, () => {
          this.paredes.length = 0;
          aoTerminar?.();
        });
        break;
      case 'elevador':
        aoTerminar?.();
        break;
    }
  }
}
