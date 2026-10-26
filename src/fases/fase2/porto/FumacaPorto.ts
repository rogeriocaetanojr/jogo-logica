import Phaser from 'phaser';
import { ESCALA } from './ArtePorto';
import { PROF } from './EfeitosPorto';
import type { NivelFumaca } from './TiposPorto';

const LARGURA = 320;
const ALTURA = 180;

/** Densidade base de cada nível de fumaça do documento (leve, densa e sufocante; média no cais). */
export const DENSIDADE_NIVEL: Record<NivelFumaca, number> = {
  leve: 0.22,
  media: 0.5,
  densa: 0.72,
  sufocante: 0.92,
};

/**
 * Mecânica central da fase: a tela escurece fora de um círculo de visão em volta do operador.
 * Agachar aumenta o círculo (a fumaça sobe), o filtro de máscara dobra a visão por 60 s
 * e cada foco apagado (Índice de Fumaça menor) devolve um pouco de visão.
 */
export class FumacaPorto {
  public densidadeAlvo = 0.22;
  public rajada = 0;
  public reducaoFumace = 0;
  public noite = false;
  public filtroAte = 0;

  private densidade = 0.22;
  private raioSuave = 120;
  private readonly cena: Phaser.Scene;
  private readonly textura: Phaser.Textures.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly imagem: Phaser.GameObjects.Image;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    const chave = 'pb-mascara-fumaca';
    const existente = cena.textures.exists(chave) ? (cena.textures.get(chave) as Phaser.Textures.CanvasTexture) : null;
    this.textura = existente ?? (cena.textures.createCanvas(chave, LARGURA, ALTURA) as Phaser.Textures.CanvasTexture);
    this.textura.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.ctx = this.textura.getContext();
    this.imagem = cena.add.image(0, 0, chave).setOrigin(0, 0).setScale(ESCALA).setScrollFactor(0).setDepth(PROF.mascara);
  }

  definirNivel(nivel: NivelFumaca): void {
    this.densidadeAlvo = DENSIDADE_NIVEL[nivel];
  }

  /** Densidade efetiva (0 = limpo, 1 = sufocante), já com rajadas. */
  get densidadeAtual(): number {
    return this.densidade;
  }

  get filtroAtivo(): boolean {
    return this.cena.time.now < this.filtroAte;
  }

  ativarFiltro(ms: number): void {
    this.filtroAte = this.cena.time.now + ms;
  }

  /** Raio de visão em pixels de arte. */
  calcularRaio(agachado: boolean, indice: number): number {
    let raio = 150 - this.densidade * 122;
    raio *= 1 + ((100 - indice) / 100) * 0.55;
    if (agachado) raio *= 1.4;
    if (this.filtroAtivo) raio *= 2;
    raio *= 1 - 0.5 * this.reducaoFumace;
    return Math.max(16, raio);
  }

  /**
   * Redesenha a máscara (canvas 320x180 exibido em 4x) centrada na lanterna do operador.
   */
  atualizar(delta: number, telaX: number, telaY: number, agachado: boolean, indice: number): void {
    const alvo = Math.min(1, this.densidadeAlvo + this.rajada);
    const k = Math.min(1, (delta / 1000) * 1.6);
    this.densidade += (alvo - this.densidade) * k;
    const raioAlvo = this.calcularRaio(agachado, indice);
    this.raioSuave += (raioAlvo - this.raioSuave) * Math.min(1, (delta / 1000) * 5);

    const opacidade = Math.min(0.95, this.densidade * 1.08);
    if (opacidade < 0.02) {
      this.imagem.setVisible(false);
      return;
    }
    this.imagem.setVisible(true);

    const ctx = this.ctx;
    const cx = Math.round(telaX / ESCALA);
    const cy = Math.round(telaY / ESCALA);
    const r = Math.round(this.raioSuave);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, LARGURA, ALTURA);
    ctx.globalAlpha = opacidade;
    ctx.fillStyle = this.noite ? '#07070C' : '#140F0E';
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    ctx.globalCompositeOperation = 'destination-out';
    for (const [fator, a] of [
      [1, 0.3],
      [0.84, 0.55],
      [0.68, 0.8],
      [0.52, 1],
    ] as const) {
      ctx.globalAlpha = a;
      this.disco(cx, cy, Math.round(r * fator));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.textura.refresh();
  }

  private disco(cx: number, cy: number, r: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    const y0 = Math.max(-r, -cy - 1);
    const y1 = Math.min(r, ALTURA - cy + 1);
    for (let dy = y0; dy <= y1; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
      ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  }

  esconder(): void {
    this.imagem.setVisible(false);
    this.densidadeAlvo = 0;
    this.densidade = 0;
  }

  /** Dissipa a fumaça gradualmente (final da fase). */
  dissipar(duracao: number): void {
    const inicio = this.densidadeAlvo;
    this.cena.tweens.addCounter({
      from: 1,
      to: 0,
      duration: duracao,
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        this.densidadeAlvo = inicio * v;
        this.rajada = 0;
      },
    });
  }
}
