import type Phaser from 'phaser';
import type { ResultadoComando } from '../../../compartilhado/tipos';
import type { CenaFase2 } from '../CenaFase2';
import { ESCALA, texturaPixel } from '../porto/ArtePorto';
import type { Pincel } from '../porto/ArtePorto';
import type { FocoIncendio } from '../porto/FogoPorto';

/**
 * Base dos 6 ambientes do Porto Bugado. Cada área monta seu cenário em camadas de parallax,
 * sólidos, focos de incêndio, inimigos, NPCs e o desafio que libera a área seguinte.
 */
export abstract class AreaPorto {
  public largura = 5120;
  public altura = 720;
  public inicio = { x: 160, y: 560 };
  public noite = false;
  public volumeOndas = 0.3;
  public volumeFogo = 0.5;

  protected readonly cena: CenaFase2;

  constructor(cena: CenaFase2) {
    this.cena = cena;
  }

  /** Monta o mundo (chamado uma vez no create da cena). */
  abstract construir(): void;

  /** Chamado logo após a entrada (diálogos de abertura etc.). */
  iniciar(): void {}

  atualizar(_tempo: number, _delta: number): void {}

  /** Atualização enquanto terminal/diálogo estão abertos (física pausada). */
  atualizarPausado(_tempo: number, _delta: number): void {}

  aoResultadoTerminal(_resultado: ResultadoComando, _desafio: string): void {}

  aoApagarFoco(_foco: FocoIncendio): void {}

  aoEspumaNoOleo(_x: number, _zona: Phaser.Geom.Rectangle): void {}

  aoReviver(): void {}

  fogoNoChaoEm(_x: number): boolean {
    return false;
  }

  atingirPatch(_tiro: Phaser.Physics.Arcade.Image): boolean {
    return false;
  }

  atingirEspuma(_bola: Phaser.Physics.Arcade.Image): boolean {
    return false;
  }

  /**
   * Cria uma camada de parallax desenhada em pixel art. A largura é calculada para cobrir
   * o mundo inteiro com o fator de rolagem informado.
   */
  protected camada(
    chave: string,
    fator: number,
    profundidade: number,
    desenhar: (p: Pincel, largura: number, altura: number) => void,
    opcoes: { alturaArte?: number; fatorY?: number; y?: number } = {}
  ): Phaser.GameObjects.Image {
    const fatorY = opcoes.fatorY ?? 0;
    const larguraArte = Math.ceil((1280 + (this.largura - 1280) * fator) / ESCALA) + 2;
    const alturaArte = opcoes.alturaArte ?? Math.ceil((720 + (this.altura - 720) * fatorY) / ESCALA) + 2;
    texturaPixel(this.cena, chave, larguraArte, alturaArte, (p) => desenhar(p, larguraArte, alturaArte));
    return this.cena.add
      .image(0, opcoes.y ?? 0, chave)
      .setOrigin(0, 0)
      .setScale(ESCALA)
      .setScrollFactor(fator, fatorY)
      .setDepth(profundidade);
  }

  /**
   * Luzes do MegaBrain piscando (janelas infectadas da cidade, luzes da torre) numa camada de parallax.
   * Os pontos são coordenadas de arte da camada.
   */
  protected luzesVirus(pontos: Array<[number, number]>, fator: number, profundidade: number, chance = 0.6, cor = 0x5cff8a): Phaser.GameObjects.Graphics {
    const g = this.cena.add.graphics().setScrollFactor(fator, 0).setDepth(profundidade);
    const desenhar = () => {
      g.clear();
      g.fillStyle(cor, 1);
      for (const [x, y] of pontos) if (Math.random() < chance) g.fillRect(x * ESCALA, y * ESCALA, ESCALA, ESCALA);
    };
    desenhar();
    this.cena.time.addEvent({ delay: 480, loop: true, callback: desenhar });
    return g;
  }

  /** Converte coordenada de mundo para a coordenada de arte de uma camada com parallax. */
  protected arteX(mundoX: number, fator: number): number {
    // Na posição em que a câmera centraliza mundoX, a camada mostra o mesmo ponto na tela.
    const camX = Math.max(0, Math.min(this.largura - 1280, mundoX - 640));
    return Math.round((mundoX - camX + camX * fator) / ESCALA);
  }
}
