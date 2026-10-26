import Phaser from 'phaser';
import type { CenaFase2 } from '../CenaFase2';
import { COR, ESCALA } from './ArtePorto';
import { PROF } from './EfeitosPorto';

export type TamanhoFoco = 'p' | 'm' | 'g';

export interface OpcoesFoco {
  /** Identificador único: focos com id entram na contagem dos 12 focos do Índice de Fumaça. */
  id?: string;
  x: number;
  /** Linha da base das chamas (chão). */
  y: number;
  tamanho: TamanhoFoco;
  /** Quantas chamas lado a lado (incêndios largos). */
  largura?: number;
  /** Jatos necessários para apagar (padrão por tamanho). */
  vida?: number;
  /** Cria uma barreira sólida enquanto queima (caminho bloqueado). */
  barreira?: { largura: number; altura: number };
  /** Só a espuma do canhão apaga (o extintor básico não dá conta). */
  soEspuma?: boolean;
  /** Só o sprinkler do painel apaga (prateleiras altas do depósito). */
  soSprinkler?: boolean;
  /** Emite fumaça preta. */
  fumaca?: boolean;
  /** Profundidade de desenho (padrão: camada do fogo). */
  profundidade?: number;
  aoApagar?: (silencioso: boolean) => void;
}

const DADOS_TAMANHO: Record<TamanhoFoco, { textura: string; anim: string; w: number; h: number; vida: number; raio: number }> = {
  p: { textura: 'pb-fogo-p', anim: 'pb-anim-fogo-p', w: 10, h: 16, vida: 1, raio: 70 },
  m: { textura: 'pb-fogo-m', anim: 'pb-anim-fogo-m', w: 18, h: 24, vida: 2, raio: 110 },
  g: { textura: 'pb-fogo-g', anim: 'pb-anim-fogo-g', w: 30, h: 34, vida: 3, raio: 160 },
};

/**
 * Foco de incêndio: chamas animadas, brilho aditivo, fumaça e área de dano.
 */
export class FocoIncendio {
  public readonly id: string | null;
  public readonly x: number;
  public y: number;
  public readonly largura: number;
  public readonly altura: number;
  public readonly soEspuma: boolean;
  public readonly soSprinkler: boolean;
  private avisoEm = 0;
  public vidaMax: number;
  public vida: number;
  public apagado = false;

  private readonly cena: CenaFase2;
  private readonly chamas: Phaser.GameObjects.Sprite[] = [];
  private readonly brilho: Phaser.GameObjects.Image;
  private readonly fumaca: Phaser.GameObjects.Particles.ParticleEmitter | null;
  private readonly barreira: Phaser.GameObjects.Zone | null = null;
  private readonly aoApagar?: (silencioso: boolean) => void;

  constructor(cena: CenaFase2, opcoes: OpcoesFoco) {
    this.cena = cena;
    const dados = DADOS_TAMANHO[opcoes.tamanho];
    const n = opcoes.largura ?? 1;
    this.id = opcoes.id ?? null;
    this.x = opcoes.x;
    this.y = opcoes.y;
    this.soEspuma = opcoes.soEspuma ?? false;
    this.soSprinkler = opcoes.soSprinkler ?? false;
    this.vidaMax = opcoes.vida ?? dados.vida * Math.max(1, Math.ceil(n / 2));
    this.vida = this.vidaMax;
    this.aoApagar = opcoes.aoApagar;
    const larguraChama = dados.w * ESCALA * 0.8;
    this.largura = larguraChama * n + dados.w * ESCALA * 0.2;
    this.altura = dados.h * ESCALA;

    for (let i = 0; i < n; i++) {
      const cx = this.x - ((n - 1) * larguraChama) / 2 + i * larguraChama;
      const s = cena.add.sprite(Math.round(cx), this.y, dados.textura, 0);
      s.setOrigin(0.5, 1).setScale(ESCALA).setDepth(opcoes.profundidade ?? PROF.fogo);
      s.play({ key: dados.anim, startFrame: (i * 3) % 10 });
      if (i % 2 === 1) s.setFlipX(true);
      this.chamas.push(s);
    }
    this.brilho = cena.efeitos.brilho(this.x, this.y - this.altura * 0.4, dados.raio + n * 20, COR.fogoLaranja, 0.42);
    this.fumaca =
      opcoes.fumaca === false
        ? null
        : cena.efeitos.pluma(this.x, this.y - this.altura, {
            largura: this.largura * 0.6,
            raio: opcoes.tamanho === 'p' ? 5 : 9,
            frequencia: opcoes.tamanho === 'g' ? 220 : 380,
            iluminada: true,
            profundidade: PROF.fogo - 1,
            vida: 4200,
          });

    if (opcoes.barreira) {
      const b = opcoes.barreira;
      this.barreira = cena.add.zone(this.x, this.y - b.altura / 2, b.largura, b.altura);
      cena.physics.add.existing(this.barreira, true);
      cena.solidos.add(this.barreira);
    }
  }

  /** Retângulo de dano das chamas. */
  contem(x: number, y: number, margem = 0): boolean {
    if (this.apagado) return false;
    const fator = this.vida / this.vidaMax;
    const alt = this.altura * (0.45 + 0.55 * fator);
    return Math.abs(x - this.x) < this.largura / 2 + margem && y > this.y - alt - margem && y < this.y + 8 + margem;
  }

  /**
   * Recebe um jato (espuma, extintor ou sprinkler). Retorna true se o foco apagou.
   */
  receberJato(quantidade: number, origem: 'espuma' | 'extintor' | 'sprinkler' | 'cenario'): boolean {
    if (this.apagado) return false;
    if (this.soSprinkler && origem !== 'sprinkler' && origem !== 'cenario') {
      if (this.cena.time.now > this.avisoEm) {
        this.avisoEm = this.cena.time.now + 1500;
        this.cena.efeitos.textoFlutuante(this.x, this.y - this.altura - 10, 'FOGO NOS PNEUS: SÓ O SPRINKLER APAGA!', '#FF8A6A', 12);
      }
      return false;
    }
    if (origem === 'extintor' && this.soEspuma) {
      this.cena.efeitos.textoFlutuante(this.x, this.y - this.altura - 10, 'FOGO GRANDE DEMAIS PARA O EXTINTOR!', '#FF8A6A', 12);
      return false;
    }
    this.vida -= quantidade;
    this.cena.efeitos.vapor(this.x + (Math.random() - 0.5) * this.largura * 0.5, this.y - this.altura * 0.5);
    this.cena.som.tocar('vapor');
    if (this.vida <= 0) {
      this.apagar();
      return true;
    }
    const fator = this.vida / this.vidaMax;
    for (const s of this.chamas) {
      this.cena.tweens.add({ targets: s, scaleY: ESCALA * (0.45 + 0.55 * fator), duration: 250 });
    }
    this.brilho.setAlpha(0.42 * (0.4 + 0.6 * fator));
    return false;
  }

  apagar(silencioso = false): void {
    if (this.apagado) return;
    this.apagado = true;
    this.vida = 0;
    for (const s of this.chamas) {
      this.cena.tweens.add({
        targets: s,
        scaleY: 0,
        alpha: 0,
        duration: 600,
        onComplete: () => s.destroy(),
      });
    }
    this.cena.tweens.killTweensOf(this.brilho);
    this.cena.tweens.add({ targets: this.brilho, alpha: 0, duration: 700, onComplete: () => this.brilho.destroy() });
    if (this.fumaca) {
      this.fumaca.stop();
      this.cena.time.delayedCall(4500, () => this.fumaca?.destroy());
    }
    if (this.barreira) {
      this.barreira.destroy();
    }
    // Marca de queimado e fumacinha branca de vapor
    const marca = this.cena.add.image(this.x, this.y, 'pb-marca-queimado').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.estruturas + 1);
    marca.setDisplaySize(this.largura * 0.9, 3 * ESCALA);
    if (!silencioso) {
      for (let i = 0; i < 3; i++) {
        this.cena.time.delayedCall(i * 140, () => this.cena.efeitos.vapor(this.x + (i - 1) * this.largura * 0.3, this.y - 20, 1.3));
      }
      this.cena.som.tocar('apagar');
      this.cena.aoApagarFoco(this);
    }
    this.aoApagar?.(silencioso);
  }

  /** Move a base do foco (óleo em chamas boiando com a maré). */
  reposicionar(y: number): void {
    if (this.apagado || Math.abs(y - this.y) < 1) return;
    const dy = y - this.y;
    this.y = y;
    for (const s of this.chamas) s.y += dy;
    this.brilho.y += dy;
    if (this.fumaca) this.fumaca.y += dy;
  }

  destruir(): void {
    for (const s of this.chamas) s.destroy();
    this.brilho.destroy();
    this.fumaca?.destroy();
    this.barreira?.destroy();
  }
}

/**
 * Cria, atualiza e consulta os focos de incêndio de uma área.
 */
export class GerenciadorFogo {
  public readonly focos: FocoIncendio[] = [];
  private readonly cena: CenaFase2;

  constructor(cena: CenaFase2) {
    this.cena = cena;
    if (!cena.textures.exists('pb-marca-queimado')) {
      const g = cena.make.graphics({}, false);
      g.fillStyle(0x141010, 0.85);
      g.fillRect(0, 0, 8, 3);
      g.fillStyle(0x2a2020, 1);
      g.fillRect(1, 0, 6, 1);
      g.generateTexture('pb-marca-queimado', 8, 3);
      g.destroy();
    }
  }

  /**
   * Cria um foco. Se o id já consta como apagado no estado (área reiniciada), cria só a marca.
   */
  criar(opcoes: OpcoesFoco): FocoIncendio {
    const foco = new FocoIncendio(this.cena, opcoes);
    if (opcoes.id && this.cena.estado.focosApagados.includes(opcoes.id)) {
      foco.apagar(true);
    }
    this.focos.push(foco);
    return foco;
  }

  ativos(): FocoIncendio[] {
    return this.focos.filter((f) => !f.apagado);
  }

  /** Primeiro foco ativo que contém o ponto. */
  focoEm(x: number, y: number, margem = 0): FocoIncendio | null {
    for (const f of this.focos) if (f.contem(x, y, margem)) return f;
    return null;
  }

  /** Aplica um jato em todos os focos dentro do retângulo informado. */
  jatoEmArea(x0: number, x1: number, y0: number, y1: number, origem: 'espuma' | 'extintor' | 'sprinkler'): number {
    let atingidos = 0;
    for (const f of this.focos) {
      if (f.apagado) continue;
      const dentroX = f.x + f.largura / 2 > Math.min(x0, x1) && f.x - f.largura / 2 < Math.max(x0, x1);
      const dentroY = f.y > y0 && f.y - f.altura < y1;
      if (dentroX && dentroY) {
        f.receberJato(1, origem);
        atingidos++;
      }
    }
    return atingidos;
  }

  /** Dano ao jogador que encostar nas chamas. */
  atualizar(): void {
    const j = this.cena.jogador;
    if (j.morto) return;
    for (const f of this.focos) {
      if (f.contem(j.x, j.y + 30, 6) || f.contem(j.x, j.y - 20, 0)) {
        j.receberDano(2, f.x);
        break;
      }
    }
  }
}
