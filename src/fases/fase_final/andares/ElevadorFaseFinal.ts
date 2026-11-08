import Phaser from 'phaser';
import { COR, hexNum, texturaBrilho } from '../ArteFaseFinal';
import { ANDAR_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';
import type { TemaAndar } from './tiposAndar';
import { texAndar } from './TexturasAndar';

const A = ANDAR_FASE_FINAL;
const E = A.ELEVADOR;

/** Profundidades: folhas atrás do jogador normalmente, e na frente dele durante a viagem. */
const PROF_QUADRO = -22;
const PROF_FOLHAS = -21;
const PROF_FOLHAS_FRENTE = 30;

/**
 * Elevador com quadro, duas folhas que recolhem para os lados, visor com o número do andar
 * e luz de estado (vermelha travado, acento do andar liberado).
 */
export class ElevadorFaseFinal {
  public readonly x: number;
  public destravado: boolean;
  public aberto: boolean = false;

  private readonly cena: Phaser.Scene;
  private readonly folhaEsquerda: Phaser.GameObjects.Image;
  private readonly folhaDireita: Phaser.GameObjects.Image;
  private readonly visor: Phaser.GameObjects.Text;
  private readonly luz: Phaser.GameObjects.Image;
  private readonly corLiberado: number;

  constructor(cena: Phaser.Scene, x: number, tema: TemaAndar, numeroVisor: number, destravado: boolean) {
    this.cena = cena;
    this.x = x;
    this.destravado = destravado;
    this.corLiberado = hexNum(tema.acento);

    cena.add.image(x, A.CHAO_Y, texAndar.elevador(tema)).setOrigin(0.5, 1).setScale(ESCALA_ARTE).setDepth(PROF_QUADRO);
    const topoFolhas = A.CHAO_Y;
    this.folhaEsquerda = cena.add
      .image(x - E.LARGURA_FOLHA, topoFolhas, texAndar.folhaElevador(tema))
      .setOrigin(0, 1)
      .setScale(ESCALA_ARTE)
      .setDepth(PROF_FOLHAS);
    // Espelhada (escala negativa): com origem 0 ela ancora na borda externa e cresce para dentro
    this.folhaDireita = cena.add
      .image(x + E.LARGURA_FOLHA, topoFolhas, texAndar.folhaElevador(tema))
      .setOrigin(0, 1)
      .setScale(-ESCALA_ARTE, ESCALA_ARTE)
      .setDepth(PROF_FOLHAS);

    const yVisor = A.CHAO_Y - E.ALTURA + 18;
    this.visor = cena.add
      .text(x, yVisor, String(numeroVisor), {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: destravado ? COR.ciano : COR.vermelho,
      })
      .setOrigin(0.5)
      .setDepth(PROF_QUADRO + 0.5);
    this.luz = cena.add
      .image(x + 36, yVisor, texturaBrilho(cena))
      .setScale(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(PROF_QUADRO + 0.6);
    this.atualizarLuz();
  }

  /** O jogador está na frente da porta. */
  public naPorta(xJogador: number): boolean {
    return Math.abs(xJogador - this.x) <= E.RAIO_ENTRADA;
  }

  public destravar(): void {
    if (this.destravado) return;
    this.destravado = true;
    this.visor.setColor(COR.ciano);
    this.atualizarLuz();
    this.cena.tweens.add({ targets: this.luz, scale: 0.6, duration: 180, yoyo: true, repeat: 2 });
  }

  public definirVisor(texto: string): void {
    this.visor.setText(texto);
  }

  /** Folhas na frente do jogador (viagem) ou atrás (andando pelo andar). */
  public folhasNaFrente(frente: boolean): void {
    const prof = frente ? PROF_FOLHAS_FRENTE : PROF_FOLHAS;
    this.folhaEsquerda.setDepth(prof);
    this.folhaDireita.setDepth(prof);
  }

  public abrir(duracaoMs: number = E.PORTA_MS, aoTerminar?: () => void): void {
    this.aberto = true;
    this.animarFolhas(0.08, duracaoMs, aoTerminar);
  }

  public fechar(duracaoMs: number = E.PORTA_MS, aoTerminar?: () => void): void {
    this.aberto = false;
    this.animarFolhas(1, duracaoMs, aoTerminar);
  }

  /** Abre ou fecha sem animação. */
  public definirAberto(aberto: boolean): void {
    this.aberto = aberto;
    const escala = aberto ? 0.08 : 1;
    this.folhaEsquerda.scaleX = ESCALA_ARTE * escala;
    this.folhaDireita.scaleX = -ESCALA_ARTE * escala;
  }

  private animarFolhas(fator: number, duracaoMs: number, aoTerminar?: () => void): void {
    this.cena.tweens.add({
      targets: this.folhaEsquerda,
      scaleX: ESCALA_ARTE * fator,
      duration: duracaoMs,
      ease: 'Cubic.easeInOut',
    });
    this.cena.tweens.add({
      targets: this.folhaDireita,
      scaleX: -ESCALA_ARTE * fator,
      duration: duracaoMs,
      ease: 'Cubic.easeInOut',
      onComplete: () => aoTerminar?.(),
    });
  }

  private atualizarLuz(): void {
    this.luz.setTint(this.destravado ? this.corLiberado : hexNum(COR.vermelho));
  }
}
