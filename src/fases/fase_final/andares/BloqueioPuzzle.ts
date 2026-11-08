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

  /* =======================================================================
   * CONSEQUÊNCIAS DO CÓDIGO ERRADO (a passagem continua fechada no fim)
   * ======================================================================= */

  /** Catraca: o portão sobe um pouco e bate de volta na cara do jogador. */
  public consequenciaCatraca(aoTerminar: () => void): void {
    const portao = this.portoes[0];
    if (!portao) return aoTerminar();
    this.cena.tweens.chain({
      targets: portao,
      tweens: [
        { y: A.CHAO_Y - 170, duration: 220, ease: 'Quad.easeOut' },
        { y: A.CHAO_Y - 170, duration: 260 },
        { y: A.CHAO_Y, duration: 200, ease: 'Bounce.easeOut' },
      ],
      onComplete: () => {
        this.cena.cameras.main.shake(180, 0.006);
        this.cena.time.delayedCall(400, aoTerminar);
      },
    });
  }

  /** Laser: drones do Mega Brain atravessam a barreira de boa; o último dá tchau. */
  public consequenciaLaser(texturaDrone: string, animDrone: string, aoTerminar: (ultimo: Phaser.GameObjects.Sprite) => void): void {
    const x = this.cfg.x;
    const drones: Phaser.GameObjects.Sprite[] = [];
    [300, 380, 460].forEach((y, i) => {
      const d = this.cena.add.sprite(x + 520 + i * 70, y, texturaDrone).setScale(ESCALA_ARTE).setDepth(40).play(animDrone);
      d.setFlipX(false);
      drones.push(d);
      this.cena.tweens.add({
        targets: d,
        x: i === 2 ? x - 150 : x - 900,
        y: y + Math.sin(i) * 20,
        duration: 1900 + i * 250,
        ease: i === 2 ? 'Sine.easeOut' : 'Linear',
        onComplete: () => {
          if (i < 2) d.destroy();
        },
      });
    });
    const ultimo = drones[2];
    this.cena.time.delayedCall(2500, () => {
      this.cena.tweens.add({ targets: ultimo, angle: 20, duration: 140, yoyo: true, repeat: 3 });
      aoTerminar(ultimo);
      this.cena.time.delayedCall(1500, () => {
        this.cena.tweens.add({ targets: ultimo, x: x - 900, y: 200, alpha: 0, duration: 900, onComplete: () => ultimo.destroy() });
      });
    });
  }

  /**
   * Ponte com o número errado de placas: menos de 5 deixa buraco, mais de 5 empilha uma
   * montanha no começo do vão. Depois de um instante tudo despenca e o vão volta a ficar vazio.
   */
  public consequenciaPonte(quantidade: number, aoTerminar: () => void): void {
    const largura = this.cfg.larguraPlaca ?? 96;
    const temporarias: Phaser.GameObjects.Image[] = [];
    const visiveis = Math.min(quantidade, 5 + 30); // a montanha tem limite de bom senso
    const intervalo = Math.max(40, Math.min(160, 1400 / Math.max(1, visiveis)));

    for (let i = 0; i < visiveis; i++) {
      this.cena.time.delayedCall(i * intervalo, () => {
        let px: number;
        let py: number;
        if (i < 5) {
          px = this.cfg.x + largura * i + largura / 2;
          py = A.CHAO_Y;
        } else {
          // Placas extras: pilha torta em cima das primeiras
          const k = i - 5;
          const camada = Math.floor(k / 3);
          px = this.cfg.x + largura * 0.5 + (k % 3) * largura * 0.55 + (camada % 2) * 20;
          py = A.CHAO_Y - (camada + 1) * (A.ESPESSURA_PLACA - 4);
        }
        const placa = this.cena.add
          .image(px, py - 30, texAndar.placaPonte)
          .setOrigin(0.5, 0)
          .setDisplaySize(largura, A.ESPESSURA_PLACA)
          .setDepth(6 + i * 0.01)
          .setAngle(i < 5 ? 0 : ((i * 37) % 13) - 6)
          .setAlpha(0);
        this.cena.tweens.add({ targets: placa, y: py, alpha: 1, duration: 120 });
        temporarias.push(placa);
      });
    }

    const fim = visiveis * intervalo + 1300;
    this.cena.time.delayedCall(fim, () => {
      this.cena.cameras.main.shake(260, 0.005);
      temporarias.forEach((placa, i) => {
        this.cena.tweens.add({
          targets: placa,
          y: placa.y + 260,
          angle: placa.angle + (i % 2 === 0 ? 40 : -40),
          alpha: 0,
          delay: (i % 6) * 40,
          duration: 600,
          ease: 'Quad.easeIn',
          onComplete: () => placa.destroy(),
        });
      });
      this.cena.time.delayedCall(800, aoTerminar);
    });
  }

  /** Rótulo de código sobre uma comporta (ex.: "abrir_comporta(2)"), com a cor do estado. */
  private rotuloComporta(indice: number, texto: string, cor: string): Phaser.GameObjects.Text {
    const x = this.cfg.x + indice * (this.cfg.espacamento ?? 200);
    const rotulo = this.cena.add
      .text(x, A.TETO_Y + 130, texto, {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: cor,
        backgroundColor: 'rgba(5,5,12,0.92)',
        padding: { x: 7, y: 4 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(PROF + 5)
      .setScale(0.7)
      .setAlpha(0);
    this.cena.tweens.add({ targets: rotulo, scale: 1, alpha: 1, duration: 140, ease: 'Back.easeOut' });
    return rotulo;
  }

  /**
   * Comportas com a função errada: as três chamadas rodam uma por vez. Cada uma mostra seu
   * "abrir_comporta(n)" sobre a comporta que deveria abrir, mas por dentro abre sempre a mesma (`numero`).
   * A comporta certa recebe "ok"; as outras ficam marcadas como travadas.
   */
  public consequenciaComportas(numero: number, aoTerminar: () => void): void {
    const alvo = this.portoes[numero - 1];
    if (!alvo) return aoTerminar();
    const rotulos: Phaser.GameObjects.Text[] = [];
    const passo = 1250;

    for (let i = 1; i <= 3; i++) {
      const inicio = (i - 1) * passo;
      this.cena.time.delayedCall(inicio, () => {
        const chamada = this.rotuloComporta(i - 1, `abrir_comporta(${i})`, COR.janelaQuente);
        rotulos.push(chamada);
        // A comporta que a função realmente abre sobe e desce
        this.cena.time.delayedCall(350, () => {
          this.cena.tweens.chain({
            targets: alvo,
            tweens: [
              { y: A.CHAO_Y - 200, duration: 260, ease: 'Quad.easeOut' },
              { y: A.CHAO_Y - 200, duration: 250 },
              { y: A.CHAO_Y, duration: 220, ease: 'Quad.easeIn' },
            ],
          });
        });
        // Resultado: a comporta pedida abriu ou não
        this.cena.time.delayedCall(800, () => {
          const abriu = i === numero;
          chamada.setText(abriu ? `abrir_comporta(${i})\nOK` : `abrir_comporta(${i})\nTRAVADA`);
          chamada.setColor(abriu ? COR.ciano : COR.vermelho);
          if (!abriu) this.cena.cameras.main.shake(100, 0.002);
        });
      });
    }

    this.cena.time.delayedCall(2 * passo + 1250, () => {
      this.cena.time.delayedCall(700, () => {
        for (const r of rotulos) this.cena.tweens.add({ targets: r, alpha: 0, duration: 250, onComplete: () => r.destroy() });
        this.cena.time.delayedCall(300, aoTerminar);
      });
    });
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
            const rotulo = this.rotuloComporta(i, `abrir_comporta(${i + 1})\nOK`, COR.ciano);
            this.cena.tweens.add({ targets: rotulo, alpha: 0, delay: 1300, duration: 300, onComplete: () => rotulo.destroy() });
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
