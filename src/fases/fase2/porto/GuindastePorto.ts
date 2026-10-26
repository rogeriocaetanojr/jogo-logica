import Phaser from 'phaser';
import type { CenaFase2 } from '../CenaFase2';
import { COR, ESCALA, Pincel, texturaPixel } from './ArtePorto';
import { PROF } from './EfeitosPorto';
import { desenharPainelLed } from './ObjetosPorto';

export const ALTURA_CONTEINER = 16 * ESCALA;
export const LARGURA_CONTEINER = 32 * ESCALA;

/** Textura do contêiner a partir do código usado nos desafios. */
export function texturaDoCodigo(codigo: string): string {
  switch (codigo) {
    case 'VRM':
      return 'pb-cont-0';
    case 'AZL':
      return 'pb-cont-1';
    case 'AMA':
      return 'pb-cont-2';
    case 'VRD':
      return 'pb-cont-3';
    default:
      return 'pb-cont-canhao';
  }
}

export interface BlocoConteiner {
  img: Phaser.GameObjects.Image;
  zona: Phaser.GameObjects.Zone;
  codigo: string;
}

/**
 * Pilha física de contêineres: cada bloco tem visual e corpo estático (o jogador sobe nas pilhas).
 */
export class PilhaFisica {
  public readonly blocos: BlocoConteiner[] = [];
  public readonly x: number;
  public readonly chao: number;
  private readonly cena: CenaFase2;

  constructor(cena: CenaFase2, x: number, chao: number) {
    this.cena = cena;
    this.x = x;
    this.chao = chao;
  }

  get altura(): number {
    return this.blocos.length;
  }

  /** Linha do topo da pilha (onde o próximo contêiner encosta). */
  get topoY(): number {
    return this.chao - this.blocos.length * ALTURA_CONTEINER;
  }

  criar(codigo: string): BlocoConteiner {
    const img = this.cena.add.image(this.x, 0, texturaDoCodigo(codigo)).setScale(ESCALA).setDepth(PROF.plataformas + 1);
    const zona = this.cena.add.zone(this.x, 0, LARGURA_CONTEINER, ALTURA_CONTEINER);
    this.cena.physics.add.existing(zona, true);
    this.cena.solidos.add(zona);
    const bloco = { img, zona, codigo };
    this.colocar(bloco);
    return bloco;
  }

  colocar(bloco: BlocoConteiner): void {
    const y = this.topoY - ALTURA_CONTEINER / 2;
    bloco.img.setPosition(this.x, y);
    bloco.zona.setPosition(this.x, y);
    const body = bloco.zona.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = true;
    body.updateFromGameObject();
    this.blocos.push(bloco);
  }

  retirar(): BlocoConteiner | undefined {
    const bloco = this.blocos.pop();
    if (bloco) (bloco.zona.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    return bloco;
  }

  /** O jogador está em pé sobre o topo desta pilha? */
  jogadorNoTopo(): boolean {
    const j = this.cena.jogador;
    return Math.abs(j.x - this.x) < LARGURA_CONTEINER / 2 + 10 && Math.abs(j.pes - this.topoY) < 10;
  }
}

/**
 * Portêiner (guindaste de pórtico) com carrinho, spreader e painel de LED que escreve push()/pop().
 */
export class GuindastePortico {
  public carroX: number;
  public ganchoY: number;
  public segurando: BlocoConteiner | null = null;
  private readonly cena: CenaFase2;
  private readonly vigaY: number;
  private readonly carro: Phaser.GameObjects.Image;
  private readonly spreader: Phaser.GameObjects.Image;
  private readonly cabos: Phaser.GameObjects.Graphics;
  private readonly ledTextura: Phaser.Textures.CanvasTexture | null;
  private readonly ledChave: string;
  private ledTexto = '';
  private ledCor: string = COR.fogoLaranja;

  constructor(cena: CenaFase2, chave: string, x0: number, x1: number, vigaY: number, chao: number, ledX: number, ledY: number) {
    this.cena = cena;
    this.vigaY = vigaY;
    const largura = Math.round((x1 - x0) / ESCALA);
    const altura = Math.round((chao - vigaY) / ESCALA);
    texturaPixel(cena, `${chave}-estrutura`, largura, altura + 6, (p) => desenharPortico(p, largura, altura + 6));
    cena.add.image(x0, vigaY - 6 * ESCALA, `${chave}-estrutura`).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.estruturas - 2);
    texturaPixel(cena, 'pb-guindaste-carro', 20, 9, (p) => {
      p.px(0, 0, 20, 7, '#3A3438');
      p.px(1, 1, 18, 1, '#5A5458');
      p.px(3, 2, 6, 3, '#1A2A30');
      p.px(4, 3, 4, 1, COR.virus);
      p.disco(4, 7, 2, '#141212');
      p.disco(15, 7, 2, '#141212');
    });
    texturaPixel(cena, 'pb-guindaste-spreader', 34, 5, (p) => {
      p.px(0, 1, 34, 3, COR.advertencia);
      p.px(0, 1, 34, 1, '#FFF1A8');
      p.px(0, 4, 3, 1, '#2A2426');
      p.px(31, 4, 3, 1, '#2A2426');
      p.px(15, 0, 4, 1, '#3A3438');
    });
    this.carroX = (x0 + x1) / 2;
    this.ganchoY = vigaY + 120;
    this.carro = cena.add.image(this.carroX, vigaY, 'pb-guindaste-carro').setScale(ESCALA).setDepth(PROF.estruturas + 3);
    this.spreader = cena.add.image(this.carroX, this.ganchoY, 'pb-guindaste-spreader').setScale(ESCALA).setDepth(PROF.plataformas + 3);
    this.cabos = cena.add.graphics().setDepth(PROF.estruturas + 2);

    this.ledChave = `${chave}-led`;
    this.ledTextura = cena.textures.exists(this.ledChave)
      ? (cena.textures.get(this.ledChave) as Phaser.Textures.CanvasTexture)
      : cena.textures.createCanvas(this.ledChave, 70, 11);
    this.ledTextura?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    cena.add.image(ledX, ledY, this.ledChave).setScale(ESCALA).setDepth(PROF.emissivo);
    this.led('AGUARDANDO');
    this.atualizar();
  }

  led(texto: string, cor: string = COR.fogoLaranja): void {
    if (!this.ledTextura || (texto === this.ledTexto && cor === this.ledCor)) return;
    this.ledTexto = texto;
    this.ledCor = cor;
    const ctx = this.ledTextura.getContext();
    ctx.clearRect(0, 0, 70, 11);
    desenharPainelLed(new Pincel(ctx), 70, 11, texto, cor);
    this.ledTextura.refresh();
  }

  private tween(alvo: { carroX?: number; ganchoY?: number }, duracao: number): Promise<void> {
    return new Promise((resolver) => {
      this.cena.tweens.add({ targets: this, ...alvo, duration: duracao, ease: 'Sine.easeInOut', onComplete: () => resolver() });
    });
  }

  async moverPara(x: number, duracao = 450): Promise<void> {
    this.cena.som.tocar('guindaste');
    await this.tween({ carroX: x }, duracao);
  }

  async descerAte(yTopoCarga: number, duracao = 380): Promise<void> {
    // O spreader encosta no topo da carga (ou do contêiner seguro, se houver)
    const alvo = yTopoCarga - (this.segurando ? ALTURA_CONTEINER : 0) - 2 * ESCALA;
    await this.tween({ ganchoY: alvo }, duracao);
  }

  async subir(duracao = 380): Promise<void> {
    await this.tween({ ganchoY: this.vigaY + 70 }, duracao);
  }

  pegar(bloco: BlocoConteiner): void {
    this.segurando = bloco;
    bloco.img.setDepth(PROF.plataformas + 2);
  }

  soltar(): BlocoConteiner | null {
    const b = this.segurando;
    this.segurando = null;
    if (b) b.img.setDepth(PROF.plataformas + 1);
    return b;
  }

  /** Redesenha cabos e posiciona carrinho, spreader e carga (chamar todo quadro). */
  atualizar(): void {
    this.carro.setPosition(Math.round(this.carroX), this.vigaY);
    this.spreader.setPosition(Math.round(this.carroX), Math.round(this.ganchoY));
    this.cabos.clear();
    this.cabos.fillStyle(0x2a2426, 1);
    const topo = this.vigaY + 12;
    const altura = this.ganchoY - topo;
    if (altura > 0) {
      this.cabos.fillRect(Math.round(this.carroX) - 40, topo, 4, altura);
      this.cabos.fillRect(Math.round(this.carroX) + 36, topo, 4, altura);
    }
    if (this.segurando) {
      this.segurando.img.setPosition(Math.round(this.carroX), Math.round(this.ganchoY + 2 * ESCALA + ALTURA_CONTEINER / 2));
    }
  }

  tremer(): void {
    this.cena.tweens.add({ targets: this, carroX: this.carroX + 10, duration: 50, yoyo: true, repeat: 5 });
  }
}

/** Estrutura do pórtico: duas pernas em treliça e a viga superior com faixa de advertência. */
function desenharPortico(p: Pincel, w: number, h: number): void {
  const aco = '#4A3A3A';
  const acoC = '#6A4A44';
  const vermelho = '#8A2A22';
  // Viga
  p.px(0, 0, w, 6, aco);
  p.px(0, 0, w, 1, acoC);
  for (let x = 0; x < w; x += 6) p.linha(x, 5, x + 3, 1, vermelho);
  p.faixaAdvertencia(0, 6, w, 1);
  // Pernas
  for (const x0 of [0, w - 6]) {
    p.px(x0, 6, 6, h - 6, aco);
    p.px(x0, 6, 1, h - 6, acoC);
    for (let y = 10; y < h - 4; y += 8) {
      p.linha(x0, y, x0 + 5, y + 4, vermelho);
      p.linha(x0 + 5, y, x0, y + 4, vermelho);
    }
    p.px(x0 - 1, h - 3, 8, 3, '#2A2426');
  }
  p.textoCentro('PORTUS', w / 2, 1, COR.virus);
}
