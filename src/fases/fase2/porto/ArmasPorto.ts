import Phaser from 'phaser';
import type { CenaFase2 } from '../CenaFase2';
import { ESCALA, hexNum } from './ArtePorto';
import { PROF } from './EfeitosPorto';
import { PlataformaMovel } from './PlataformasPorto';

interface TiroPatch {
  img: Phaser.Physics.Arcade.Image;
  criadoEm: number;
}

interface BolaEspuma {
  img: Phaser.Physics.Arcade.Image;
  criadaEm: number;
}

interface PlataformaEspuma {
  plat: PlataformaMovel;
  sprite: Phaser.GameObjects.Sprite;
  criadaEm: number;
  sobreAgua: boolean;
}

export interface ProjetilInimigo {
  img: Phaser.Physics.Arcade.Image;
  criadoEm: number;
  vida: number;
  dano: number;
  aoMorrer?: (x: number, y: number) => void;
}

const VIDA_PLATAFORMA = 4000;

/**
 * Ferramentas do operador e projéteis:
 * Pistola de Patch (ataque), Extintor básico (3 jatos) e Canhão de Espuma
 * (apaga fogo e, na água ou no óleo, cria plataformas que duram 4 s).
 */
export class ArmasPorto {
  public readonly grupoTiros: Phaser.Physics.Arcade.Group;
  public readonly grupoEspuma: Phaser.Physics.Arcade.Group;
  public readonly grupoInimigo: Phaser.Physics.Arcade.Group;
  public readonly tiros: TiroPatch[] = [];
  public readonly bolas: BolaEspuma[] = [];
  public readonly projeteisInimigos: ProjetilInimigo[] = [];
  public readonly plataformas: PlataformaEspuma[] = [];
  /** Retângulos de óleo no chão onde a espuma vira plataforma e corta o fogo. */
  public zonasOleo: Phaser.Geom.Rectangle[] = [];

  private readonly cena: CenaFase2;

  constructor(cena: CenaFase2) {
    this.cena = cena;
    this.grupoTiros = cena.physics.add.group({ allowGravity: false });
    this.grupoEspuma = cena.physics.add.group();
    this.grupoInimigo = cena.physics.add.group({ allowGravity: false });

    cena.physics.add.collider(this.grupoTiros, cena.solidos, (tiro) => {
      const img = tiro as Phaser.Physics.Arcade.Image;
      this.cena.efeitos.faisca(img.x, img.y);
      this.removerTiro(img);
    });
    cena.physics.add.collider(this.grupoEspuma, cena.solidos, (bola) => {
      this.estourarEspuma(bola as Phaser.Physics.Arcade.Image, true);
    });
    cena.physics.add.collider(this.grupoInimigo, cena.solidos, (proj) => {
      this.removerProjetil(proj as Phaser.Physics.Arcade.Image);
    });
  }

  /* ---------------- Pistola de Patch ---------------- */

  dispararPatch(x: number, y: number, dir: number): boolean {
    if (this.tiros.length >= 3) return false;
    const img = this.grupoTiros.create(x, y, 'pb-patch') as Phaser.Physics.Arcade.Image;
    img.setScale(ESCALA).setDepth(PROF.projeteis).setFlipX(dir < 0);
    const body = img.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(8, 5);
    body.setVelocityX(dir * 760);
    this.tiros.push({ img, criadoEm: this.cena.time.now });
    this.cena.som.tocar('tiro');
    this.cena.efeitos.brilhoRapido(x, y, 26, '#4FD8E8', 0.8);
    return true;
  }

  removerTiro(img: Phaser.GameObjects.GameObject): void {
    const i = this.tiros.findIndex((t) => t.img === img);
    if (i >= 0) this.tiros.splice(i, 1);
    img.destroy();
  }

  /* ---------------- Extintor básico ---------------- */

  usarExtintor(x: number, y: number, dir: number): void {
    const emissor = this.cena.add.particles(x, y, 'pb-pixel', {
      speedX: { min: dir * 260, max: dir * 420 },
      speedY: { min: -70, max: 60 },
      lifespan: { min: 300, max: 520 },
      scale: { start: ESCALA * 1.2, end: ESCALA * 2.6 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xf2eee2, 0xd8d4c8, 0xffffff],
      frequency: 12,
      quantity: 3,
    });
    emissor.setDepth(PROF.projeteis);
    this.cena.time.delayedCall(380, () => emissor.stop());
    this.cena.time.delayedCall(1100, () => emissor.destroy());
    this.cena.som.tocar('extintor');
    const x1 = x + dir * 210;
    this.cena.time.delayedCall(140, () => {
      this.cena.fogo.jatoEmArea(x, x1, y - 120, y + 110, 'extintor');
    });
  }

  /* ---------------- Canhão de Espuma ---------------- */

  dispararEspuma(x: number, y: number, dir: number, mira: 'normal' | 'alto' | 'baixo'): void {
    const img = this.grupoEspuma.create(x, y, 'pb-bola-espuma') as Phaser.Physics.Arcade.Image;
    img.setScale(ESCALA).setDepth(PROF.projeteis);
    const body = img.body as Phaser.Physics.Arcade.Body;
    body.setSize(5, 5);
    body.setGravityY(250);
    const vel = mira === 'alto' ? [320, -520] : mira === 'baixo' ? [520, -60] : [470, -300];
    body.setVelocity(dir * vel[0], vel[1]);
    this.bolas.push({ img, criadaEm: this.cena.time.now });
    this.cena.som.tocar('espuma');
  }

  private estourarEspuma(img: Phaser.Physics.Arcade.Image, bateuSolido: boolean): void {
    const i = this.bolas.findIndex((b) => b.img === img);
    if (i < 0) return;
    this.bolas.splice(i, 1);
    const x = img.x;
    const y = img.y;
    img.destroy();
    if (bateuSolido) {
      const oleo = this.zonasOleo.find((r) => x >= r.x && x <= r.right && y >= r.y - 40 && y <= r.bottom + 20);
      if (oleo) {
        this.criarPlataforma(x, oleo.y - 12, false);
        this.cena.aoEspumaNoOleo(x, oleo);
        return;
      }
    }
    this.cena.efeitos.vapor(x, y - 6, 0.8);
  }

  private criarPlataforma(x: number, y: number, sobreAgua: boolean): void {
    if (this.plataformas.length >= 5) this.removerPlataforma(this.plataformas[0]);
    const plat = new PlataformaMovel(this.cena.grupoMoveis, this.cena, x, y, 26 * ESCALA - 8, 5 * ESCALA, true);
    const sprite = this.cena.add.sprite(x, y, 'pb-plat-espuma', 0).setScale(ESCALA).setDepth(PROF.agua + 2);
    plat.anexar(sprite, 0, -2);
    this.plataformas.push({ plat, sprite, criadaEm: this.cena.time.now, sobreAgua });
    this.cena.som.tocar('espuma');
  }

  private removerPlataforma(p: PlataformaEspuma): void {
    const i = this.plataformas.indexOf(p);
    if (i >= 0) this.plataformas.splice(i, 1);
    this.cena.efeitos.vapor(p.plat.x, p.plat.y - 8, 1.1);
    p.plat.destruir();
  }

  /** Existe espuma cobrindo o óleo nesta posição (barreira contra o fogo)? */
  espumaEm(x: number, margem = 60): boolean {
    return this.plataformas.some((p) => !p.sobreAgua && Math.abs(p.plat.x - x) < margem);
  }

  /* ---------------- Projéteis inimigos ---------------- */

  dispararInimigo(
    x: number,
    y: number,
    vx: number,
    vy: number,
    textura: string,
    opcoes: { quadro?: number; gravidade?: number; dano?: number; vida?: number; tamanho?: [number, number]; aoMorrer?: (x: number, y: number) => void } = {}
  ): ProjetilInimigo {
    const img = this.grupoInimigo.create(x, y, textura, opcoes.quadro ?? 0) as Phaser.Physics.Arcade.Image;
    img.setScale(ESCALA).setDepth(PROF.projeteis);
    const body = img.body as Phaser.Physics.Arcade.Body;
    if (opcoes.tamanho) body.setSize(opcoes.tamanho[0], opcoes.tamanho[1]);
    if (opcoes.gravidade) {
      body.setAllowGravity(true);
      body.setGravityY(opcoes.gravidade - 600);
    }
    body.setVelocity(vx, vy);
    const proj: ProjetilInimigo = { img, criadoEm: this.cena.time.now, vida: opcoes.vida ?? 3000, dano: opcoes.dano ?? 2, aoMorrer: opcoes.aoMorrer };
    this.projeteisInimigos.push(proj);
    return proj;
  }

  removerProjetil(img: Phaser.GameObjects.GameObject): void {
    const i = this.projeteisInimigos.findIndex((p) => p.img === img);
    if (i >= 0) {
      const p = this.projeteisInimigos[i];
      this.projeteisInimigos.splice(i, 1);
      p.aoMorrer?.(p.img.x, p.img.y);
    }
    img.destroy();
  }

  /* ---------------- Atualização ---------------- */

  atualizar(): void {
    const agora = this.cena.time.now;
    const cam = this.cena.cameras.main;
    const j = this.cena.jogador;

    for (const t of [...this.tiros]) {
      if (!t.img.active) continue;
      const fora = t.img.x < cam.scrollX - 60 || t.img.x > cam.scrollX + cam.width + 60;
      if (agora - t.criadoEm > 900 || fora) {
        this.removerTiro(t.img);
        continue;
      }
      if (this.cena.atingirComPatch(t.img)) {
        this.removerTiro(t.img);
      }
    }

    const agua = this.cena.agua;
    for (const b of [...this.bolas]) {
      if (!b.img.active) continue;
      if (agora - b.criadaEm > 3000) {
        this.estourarEspuma(b.img, false);
        continue;
      }
      const foco = this.cena.fogo.focoEm(b.img.x, b.img.y, 18);
      if (foco) {
        foco.receberJato(1, 'espuma');
        this.estourarEspuma(b.img, false);
        continue;
      }
      if (this.cena.atingirComEspuma(b.img)) {
        this.estourarEspuma(b.img, false);
        continue;
      }
      if (agua && agua.existeAgua(b.img.x) && b.img.y >= agua.nivel - 4) {
        const x = b.img.x;
        this.bolas.splice(this.bolas.indexOf(b), 1);
        b.img.destroy();
        this.cena.efeitos.respingo(x, agua.nivel);
        this.criarPlataforma(x, agua.nivel - 6, true);
        continue;
      }
      const oleo = this.zonasOleo.find((r) => b.img.x >= r.x && b.img.x <= r.right && b.img.y >= r.y - 6 && b.img.y <= r.bottom);
      if (oleo) {
        const x = b.img.x;
        this.bolas.splice(this.bolas.indexOf(b), 1);
        b.img.destroy();
        this.criarPlataforma(x, oleo.y - 12, false);
        this.cena.aoEspumaNoOleo(x, oleo);
      }
    }

    for (const p of [...this.plataformas]) {
      const idade = agora - p.criadaEm;
      if (idade > VIDA_PLATAFORMA) {
        this.removerPlataforma(p);
        continue;
      }
      if (idade > VIDA_PLATAFORMA - 1000) p.sprite.setFrame(Math.floor(agora / 90) % 2);
      if (p.sobreAgua && agua) p.plat.moverPara(p.plat.alvoX, agua.nivel - 6);
    }

    for (const p of [...this.projeteisInimigos]) {
      if (!p.img.active) continue;
      if (agora - p.criadoEm > p.vida) {
        this.removerProjetil(p.img);
        continue;
      }
      if (!j.morto && Math.abs(p.img.x - j.x) < 26 && Math.abs(p.img.y - j.y) < 50) {
        j.receberDano(p.dano, p.img.x);
        this.removerProjetil(p.img);
        continue;
      }
      if (agua && agua.existeAgua(p.img.x) && p.img.y > agua.nivel + 10) {
        this.removerProjetil(p.img);
      }
    }
  }

  /** Lança partículas de espuma em arco (canhões da torre no final). */
  chuvaDeEspuma(x: number, y: number, vx: number): Phaser.GameObjects.Particles.ParticleEmitter {
    const emissor = this.cena.add.particles(x, y, 'pb-bola-espuma', {
      speedX: { min: vx * 0.85, max: vx * 1.15 },
      speedY: { min: -560, max: -420 },
      gravityY: 380,
      lifespan: 3200,
      scale: { start: ESCALA * 0.8, end: ESCALA * 1.6 },
      alpha: { start: 1, end: 0.2 },
      frequency: 30,
      tint: hexNum('#FFFFFF'),
    });
    emissor.setDepth(PROF.fumacaFrente);
    return emissor;
  }

  destruir(): void {
    for (const p of [...this.plataformas]) p.plat.destruir();
    this.plataformas.length = 0;
  }
}
