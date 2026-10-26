import Phaser from 'phaser';
import type { CenaFase2 } from '../CenaFase2';
import { COR, ESCALA, folhaPixel, hash3 } from './ArtePorto';
import { PROF } from './EfeitosPorto';

/* =========================================================================
 * MINIBOSS — BORRACHÃO.EXE
 * Montanha de pneus em chamas com um vírus no centro (olho verde). Rola de um lado
 * ao outro, quica nas paredes e cospe borracha em brasa. Espuma esfria os pneus e
 * faz ele parar 3 s, mostrando o núcleo: patch no núcleo. 4 ciclos.
 * ========================================================================= */

export function gerarTexturasBorrachao(cena: Phaser.Scene): void {
  folhaPixel(cena, 'pb-borrachao', 48, 40, 3, (p, q) => {
    const frio = q === 2;
    const pneu = frio ? '#3A4A5A' : '#141212';
    const borda = frio ? '#7A9AAA' : '#3A3636';
    const pneus: Array<[number, number, number]> = [
      [8, 33, 7],
      [22, 34, 8],
      [37, 33, 7],
      [14, 22, 7],
      [31, 22, 7],
      [23, 11, 7],
    ];
    for (const [cx, cy, r] of pneus) {
      p.elipse(cx, cy, r + 1, r - 1, pneu);
      p.elipse(cx, cy, r - 2, r - 4, frio ? '#2A3440' : '#0A0808');
      p.px(cx - r + 1, cy - r + 2, r * 2 - 2, 1, borda);
      if (!frio) {
        p.ponto(cx - 2 + (q % 2), cy - r + 2, COR.fogoLaranja);
        p.ponto(cx + 3, cy + 1, COR.fogoBrasa);
      }
    }
    // Núcleo do vírus (olho verde)
    const abertura = frio ? 4 : q === 0 ? 2 : 1;
    p.elipse(23, 24, 5, abertura, '#0A1A10');
    p.elipse(23, 24, 4, Math.max(1, abertura - 1), COR.virus);
    p.px(22, 24 - Math.max(0, abertura - 2), 2, Math.max(1, abertura * 2 - 3), '#0A1A10');
    if (frio) {
      for (let i = 0; i < 18; i++) p.ponto(4 + Math.floor(hash3(i, 1, 9) * 40), 6 + Math.floor(hash3(i, 2, 9) * 30), COR.espuma);
    }
  });
  if (!cena.anims.exists('pb-anim-borrachao')) {
    cena.anims.create({ key: 'pb-anim-borrachao', frames: [0, 1].map((f) => ({ key: 'pb-borrachao', frame: f })), frameRate: 6, repeat: -1 });
  }
}

export class Borrachao {
  public vida = 12;
  public derrotado = false;
  public ativo = false;
  private readonly cena: CenaFase2;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly chamas: Phaser.GameObjects.Sprite;
  private readonly brilho: Phaser.GameObjects.Image;
  private readonly olho: Phaser.GameObjects.Image;
  private readonly x0: number;
  private readonly x1: number;
  private readonly chao: number;
  private x: number;
  private dir = -1;
  private estado: 'rolando' | 'frio' = 'rolando';
  private frioAte = 0;
  private acertosNoCiclo = 0;
  private proximoCuspe = 0;
  private aoDerrotar: () => void;

  constructor(cena: CenaFase2, x: number, chao: number, x0: number, x1: number, aoDerrotar: () => void) {
    this.cena = cena;
    this.x = x;
    this.chao = chao;
    this.x0 = x0;
    this.x1 = x1;
    this.aoDerrotar = aoDerrotar;
    gerarTexturasBorrachao(cena);
    this.sprite = cena.add.sprite(x, chao, 'pb-borrachao', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.inimigos);
    this.sprite.play('pb-anim-borrachao');
    this.chamas = cena.add.sprite(x, chao - 120, 'pb-fogo-g', 0).setOrigin(0.5, 1).setScale(ESCALA * 1.1).setDepth(PROF.emissivo);
    this.chamas.play('pb-anim-fogo-g');
    this.brilho = cena.efeitos.brilho(x, chao - 80, 220, COR.fogoLaranja, 0.5);
    this.olho = cena.add.image(x, chao - 64, 'pb-pixel').setDisplaySize(4 * ESCALA, 2 * ESCALA).setTint(0x5cff8a).setDepth(PROF.emissivo);
  }

  get centro(): { x: number; y: number } {
    return { x: this.x, y: this.chao - 64 };
  }

  iniciar(): void {
    this.ativo = true;
    this.cena.hud.mostrarChefe('BORRACHÃO.EXE', 12);
  }

  atualizar(tempo: number, delta: number): void {
    if (!this.ativo || this.derrotado) return;
    const dt = delta / 1000;
    const j = this.cena.jogador;
    if (this.estado === 'rolando') {
      this.x += this.dir * 300 * dt;
      if (this.x < this.x0) {
        this.x = this.x0;
        this.dir = 1;
        this.cena.cameras.main.shake(140, 0.006);
      } else if (this.x > this.x1) {
        this.x = this.x1;
        this.dir = -1;
        this.cena.cameras.main.shake(140, 0.006);
      }
      const quique = Math.abs(Math.sin(tempo / 160)) * 14;
      this.sprite.setPosition(this.x, this.chao - quique);
      this.sprite.setAngle(Math.sin(tempo / 120) * 4);
      if (tempo > this.proximoCuspe) {
        this.proximoCuspe = tempo + 1500;
        for (const vx of [-1, 1]) {
          const alvo = j.x > this.x ? 1 : -1;
          this.cena.armas.dispararInimigo(this.x, this.chao - 130, (vx === alvo ? 260 : 140) * vx, -420, 'pb-borracha', {
            gravidade: 900,
            dano: 2,
            tamanho: [5, 5],
            vida: 2600,
          });
        }
      }
      // Contato esmaga
      if (!j.morto && Math.abs(j.x - this.x) < 90 && j.pes > this.chao - 150) j.receberDano(3, this.x, 420);
    } else {
      this.sprite.setPosition(this.x, this.chao).setAngle(0);
      if (tempo > this.frioAte || this.acertosNoCiclo >= 3) this.reacender();
    }
    this.chamas.setPosition(this.sprite.x, this.sprite.y - 116);
    this.brilho.setPosition(this.sprite.x, this.sprite.y - 80);
    this.olho.setPosition(this.sprite.x, this.sprite.y - 64).setVisible(this.estado === 'frio' || Math.floor(tempo / 200) % 2 === 0);
  }

  private reacender(): void {
    this.estado = 'rolando';
    this.acertosNoCiclo = 0;
    this.sprite.play('pb-anim-borrachao');
    this.chamas.setVisible(true);
    this.brilho.setVisible(true);
    this.cena.som.tocar('explosao');
    this.cena.efeitos.textoFlutuante(this.x, this.chao - 200, 'REACENDEU!', '#FF8A6A', 14);
  }

  levarEspuma(bola: Phaser.Physics.Arcade.Image): boolean {
    if (!this.ativo || this.derrotado) return false;
    if (Math.abs(bola.x - this.x) > 100 || bola.y < this.chao - 200 || bola.y > this.chao + 10) return false;
    if (this.estado === 'rolando') {
      this.estado = 'frio';
      this.frioAte = this.cena.time.now + 3000;
      this.acertosNoCiclo = 0;
      this.sprite.anims.stop();
      this.sprite.setFrame(2);
      this.chamas.setVisible(false);
      this.brilho.setVisible(false);
      this.cena.efeitos.vapor(this.x, this.chao - 100, 2.5);
      this.cena.som.tocar('vapor');
      this.cena.efeitos.textoFlutuante(this.x, this.chao - 200, 'NÚCLEO EXPOSTO! PATCH!', COR.virus, 14);
    }
    return true;
  }

  levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (!this.ativo || this.derrotado) return false;
    if (Math.abs(tiro.x - this.x) > 96 || tiro.y < this.chao - 170 || tiro.y > this.chao) return false;
    const noNucleo = Math.abs(tiro.y - (this.chao - 64)) < 44;
    if (this.estado === 'frio' && noNucleo) {
      this.vida--;
      this.acertosNoCiclo++;
      this.cena.hud.atualizarChefe(this.vida);
      this.cena.efeitos.faisca(tiro.x, tiro.y);
      this.cena.som.tocar('inimigo');
      this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.cena.time.delayedCall(70, () => this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
      if (this.vida <= 0) this.derrotar();
    } else {
      this.cena.efeitos.faisca(tiro.x, tiro.y);
      this.cena.som.tocar('tink');
      if (this.estado === 'rolando') this.cena.efeitos.textoFlutuante(this.x, this.chao - 210, 'ESFRIE COM ESPUMA PRIMEIRO!', '#C8C2B4', 12);
    }
    return true;
  }

  private derrotar(): void {
    this.derrotado = true;
    this.ativo = false;
    this.cena.hud.esconderChefe();
    for (let i = 0; i < 6; i++) {
      this.cena.time.delayedCall(i * 180, () => this.cena.efeitos.explosao(this.x + (Math.random() - 0.5) * 140, this.chao - Math.random() * 130, 1.4));
    }
    this.cena.som.tocar('explosao');
    this.cena.cameras.main.shake(700, 0.012);
    this.chamas.destroy();
    this.brilho.destroy();
    this.olho.destroy();
    this.cena.tweens.add({ targets: this.sprite, alpha: 0, delay: 900, duration: 800, onComplete: () => this.sprite.destroy() });
    this.cena.time.delayedCall(1400, () => this.aoDerrotar());
  }
}
