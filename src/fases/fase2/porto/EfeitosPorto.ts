import Phaser from 'phaser';
import { COR, ESCALA, hexNum } from './ArtePorto';

/** Camadas de profundidade usadas em toda a fase. */
export const PROF = {
  ceu: -100,
  distante: -90,
  meio: -80,
  proximo: -70,
  fumacaFundo: -60,
  estruturas: 0,
  plataformas: 10,
  npcs: 15,
  itens: 18,
  inimigos: 20,
  jogador: 25,
  projeteis: 28,
  agua: 30,
  frente: 35,
  fogo: 40,
  brilho: 42,
  fumacaFrente: 45,
  mascara: 50,
  emissivo: 55,
  textos: 60,
  hud: 9000,
} as const;

/**
 * Efeitos visuais de curta duração (explosões, vapor, respingos, faíscas, textos flutuantes),
 * plumas de fumaça e brilhos de fogo.
 */
export class EfeitosPorto {
  private readonly cena: Phaser.Scene;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
  }

  private animado(x: number, y: number, textura: string, anim: string, escala = ESCALA, profundidade: number = PROF.fogo): Phaser.GameObjects.Sprite {
    const s = this.cena.add.sprite(Math.round(x), Math.round(y), textura, 0);
    s.setScale(escala).setDepth(profundidade);
    s.play(anim);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    return s;
  }

  explosao(x: number, y: number, escala = 1): void {
    this.animado(x, y, 'pb-explosao', 'pb-anim-explosao', ESCALA * escala, PROF.emissivo);
    this.brilhoRapido(x, y, 90 * escala, COR.fogoLaranja, 0.9);
  }

  vapor(x: number, y: number, escala = 1): void {
    const s = this.animado(x, y, 'pb-vapor', 'pb-anim-vapor', ESCALA * escala, PROF.fumacaFrente);
    s.setAlpha(0.85);
    this.cena.tweens.add({ targets: s, y: y - 30, duration: 500 });
  }

  respingo(x: number, y: number): void {
    this.animado(x, y - 18, 'pb-respingo', 'pb-anim-respingo', ESCALA, PROF.agua + 1);
  }

  faisca(x: number, y: number): void {
    this.animado(x, y, 'pb-faisca', 'pb-anim-faisca', ESCALA, PROF.emissivo);
  }

  /** Brilho aditivo que some rapidamente (clarões). */
  brilhoRapido(x: number, y: number, raio: number, cor: string, alpha: number): void {
    const img = this.cena.add.image(x, y, 'pb-brilho');
    img.setBlendMode(Phaser.BlendModes.ADD).setTint(hexNum(cor)).setAlpha(alpha).setDepth(PROF.brilho);
    img.setDisplaySize(raio * 2, raio * 2);
    this.cena.tweens.add({ targets: img, alpha: 0, duration: 380, onComplete: () => img.destroy() });
  }

  /** Brilho aditivo contínuo com tremulação (luz do fogo). */
  brilho(x: number, y: number, raio: number, cor: string, alpha: number, fator = 1, profundidade: number = PROF.brilho): Phaser.GameObjects.Image {
    const img = this.cena.add.image(x, y, 'pb-brilho');
    img.setBlendMode(Phaser.BlendModes.ADD).setTint(hexNum(cor)).setAlpha(alpha).setDepth(profundidade);
    img.setDisplaySize(raio * 2, raio * 2);
    img.setScrollFactor(fator);
    this.cena.tweens.add({
      targets: img,
      alpha: { from: alpha * 0.8, to: alpha },
      duration: 90 + Math.random() * 80,
      yoyo: true,
      repeat: -1,
    });
    return img;
  }

  textoFlutuante(x: number, y: number, texto: string, cor = '#F2C230', tamanho = 13): void {
    const t = this.cena.add.text(x, y, texto, {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: `${tamanho}px`,
      color: cor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    t.setOrigin(0.5).setDepth(PROF.textos);
    this.cena.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 1300, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  /**
   * Pluma de fumaça preta subindo e derivando para a esquerda (como na cena de referência).
   */
  pluma(
    x: number,
    y: number,
    opcoes: { largura?: number; frequencia?: number; raio?: 5 | 9 | 14; vida?: number; fator?: number; profundidade?: number; iluminada?: boolean; escalaFinal?: number; alpha?: number } = {}
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const largura = opcoes.largura ?? 40;
    const raio = opcoes.raio ?? 9;
    const textura = opcoes.iluminada ? `pb-fumaca-luz-${raio}` : `pb-fumaca-${raio}`;
    const emissor = this.cena.add.particles(x, y, textura, {
      x: { min: -largura / 2, max: largura / 2 },
      lifespan: opcoes.vida ?? 7000,
      speedY: { min: -40, max: -24 },
      speedX: { min: -22, max: -8 },
      scale: { start: ESCALA * 0.35, end: ESCALA * (opcoes.escalaFinal ?? 1.6) },
      alpha: { start: opcoes.alpha ?? 0.85, end: 0 },
      frequency: opcoes.frequencia ?? 260,
      quantity: 1,
    });
    emissor.setDepth(opcoes.profundidade ?? PROF.fumacaFundo);
    emissor.setScrollFactor(opcoes.fator ?? 1);
    return emissor;
  }

  /** Brasas subindo de um foco de fogo. */
  brasas(x: number, y: number, largura: number, profundidade: number = PROF.fogo, fator = 1): Phaser.GameObjects.Particles.ParticleEmitter {
    const emissor = this.cena.add.particles(x, y, 'pb-pixel', {
      x: { min: -largura / 2, max: largura / 2 },
      lifespan: { min: 700, max: 1700 },
      speedY: { min: -120, max: -50 },
      speedX: { min: -40, max: 10 },
      scale: ESCALA,
      alpha: { start: 1, end: 0 },
      color: [hexNum('#FFE08A'), hexNum(COR.fogoLaranja), hexNum('#A8341A')],
      frequency: 140,
    });
    emissor.setDepth(profundidade).setScrollFactor(fator);
    return emissor;
  }

  /** Cinzas caindo em diagonal sobre a tela inteira (camada da frente). */
  cinzas(densidade: number, noite: boolean): Phaser.GameObjects.Particles.ParticleEmitter {
    const emissor = this.cena.add.particles(0, 0, 'pb-pixel', {
      x: { min: -40, max: 1320 },
      y: -8,
      lifespan: 6000,
      speedY: { min: 30, max: 75 },
      speedX: { min: -45, max: -20 },
      scale: ESCALA,
      alpha: { start: 0.7, end: 0.5 },
      tint: noite ? hexNum('#6A6878') : hexNum('#9A8C80'),
      frequency: Math.max(20, 160 - densidade * 120),
      quantity: 1,
    });
    emissor.setScrollFactor(0).setDepth(PROF.fumacaFrente);
    return emissor;
  }
}
