import Phaser from 'phaser';
import { emitirSom } from '../som/eventosSom';
import { COR, hexNum, texturaBrilho } from '../ArteFaseFinal';
import { BOSS_FASE_FINAL, ESCALA_ARTE, FINAL_FASE_FINAL, SOM_FASE_FINAL } from '../constantesFaseFinal';
import { TEXTOS_FINAL } from '../DialogosFaseFinal';
import { TEX_EXTERIOR } from '../exterior/TexturasExterior';
import { VAO_QUEDA } from '../boss/configArenas';
import { estouro, fumaca } from '../boss/EfeitosBoss';
import { TEX_FINAL, gerarTexturasFinal } from './TexturasFinal';

const F = FINAL_FASE_FINAL;
const B = BOSS_FASE_FINAL;
const S = ESCALA_ARTE;
const FONTE = 'Consolas, Courier New, monospace';

/**
 * Depois que o cérebro some na lava, sobe uma mão robótica fazendo joinha (paródia de cena
 * clássica de filme). Ela espera a fala ("Eu volto. Na próxima atualização.") e afunda devagar.
 */
export function joinhaNaLava(
  cena: Phaser.Scene,
  x: number,
  lavaY: number,
  falar: (depois: () => void) => void,
  aoTerminar: () => void
): void {
  const J = F.JOINHA;
  gerarTexturasFinal(cena);
  // Atrás da superfície da lava (profundidade 9): só a parte de cima aparece
  const mao = cena.add.sprite(x, lavaY + 30, TEX_FINAL.JOINHA, 0).setOrigin(0.5, 0).setScale(J.ESCALA).setDepth(8.5);
  const pisca = cena.time.addEvent({
    delay: 380,
    loop: true,
    callback: () => mao.setFrame(mao.frame.name === '0' ? 1 : 0),
  });
  fumaca(cena, x, lavaY - 10, 1.2, 0x3a2a2a, 700);
  cena.cameras.main.shake(260, 0.004);
  emitirSom(cena, 'joinha_sobe', x);

  cena.tweens.add({
    targets: mao,
    y: lavaY - J.ALTURA_VISIVEL,
    duration: J.SOBE_MS,
    ease: 'Back.easeOut',
    onComplete: () => {
      brilhoNoPolegar(cena, x + 12, lavaY - J.ALTURA_VISIVEL + 4);
      emitirSom(cena, 'joinha_brilho', x);
      cena.time.delayedCall(J.PAUSA_ANTES_FALA_MS, () =>
        falar(() => {
          emitirSom(cena, 'joinha_afunda', x);
          cena.tweens.add({
            targets: mao,
            y: lavaY + 20,
            angle: { from: 0, to: 4 },
            duration: J.AFUNDA_MS,
            ease: 'Sine.easeIn',
            onComplete: () => {
              pisca.remove();
              mao.destroy();
              estouro(cena, x, lavaY, 22, 0xffb03a, 0x8a1a0a, 10);
              fumaca(cena, x, lavaY - 14, 0.8, 0x3a2a2a, 600);
              cena.time.delayedCall(J.PAUSA_DEPOIS_MS, aoTerminar);
            },
          });
        })
      );
    },
  });
}

/** Estrelinha de desenho animado no polegar. */
function brilhoNoPolegar(cena: Phaser.Scene, x: number, y: number): void {
  const estrela = cena.add.star(x, y, 4, 3, 16, 0xffffff).setDepth(10).setScale(0).setBlendMode(Phaser.BlendModes.ADD);
  cena.tweens.add({
    targets: estrela,
    scale: 1.2,
    angle: 90,
    duration: 260,
    yoyo: true,
    hold: 120,
    onComplete: () => estrela.destroy(),
  });
}

/* =========================================================================
 * TERRAÇO AO AMANHECER
 * ========================================================================= */

export interface GanchosFinal {
  /** Fala do protagonista; `depois` roda quando o jogador fecha a última linha. */
  falarJogador(depois: () => void): void;
  falarValdir(depois: () => void): void;
  /** O jogador vira para a câmera (true) ou fica de costas olhando o sol (false). */
  virarJogador(deFrente: boolean, olharEsquerda: boolean): void;
  comecarCreditos(): void;
}

interface Passaro {
  x: number;
  y: number;
  velocidade: number;
  fase: number;
}

/**
 * Cenário extra do terraço no amanhecer (sol nascendo, raios, nuvens, pássaros, buraco interditado,
 * relógio de ponto) e a sequência: protagonista → Valdir batendo o ponto → créditos.
 * O piso, a mureta e os prédios vêm do ArenaBoss no modo amanhecer.
 */
export class TerracoAmanhecer {
  private readonly cena: Phaser.Scene;
  private readonly sol: Phaser.GameObjects.Image;
  private readonly brilhoSol: Phaser.GameObjects.Image;
  private readonly raios: Phaser.GameObjects.Graphics;
  private readonly nuvens: Phaser.GameObjects.Image[] = [];
  private readonly graficoPassaros: Phaser.GameObjects.Graphics;
  private readonly passaros: Passaro[] = [];
  private readonly relogio: Phaser.GameObjects.Sprite;
  private readonly valdir: Phaser.GameObjects.Sprite;
  private tempoMs: number = 0;
  private proximoPiadoMs: number = 1500;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    const sol = F.SOL;
    this.raios = cena.add.graphics().setDepth(-96).setBlendMode(Phaser.BlendModes.ADD);
    this.brilhoSol = cena.add
      .image(sol.x, sol.deY, texturaBrilho(cena))
      .setTint(0xffb877)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(5)
      .setAlpha(0.55)
      .setDepth(-95.5);
    this.sol = cena.add.image(sol.x, sol.deY, TEX_FINAL.SOL).setScale(S).setDepth(-95);

    [
      { x: 180, y: 120, escala: 2.2, alfa: 0.75 },
      { x: 620, y: 200, escala: 3, alfa: 0.6 },
      { x: 1100, y: 140, escala: 2.4, alfa: 0.7 },
      { x: 860, y: 270, escala: 2.8, alfa: 0.55 },
    ].forEach((n) => {
      this.nuvens.push(
        cena.add.image(n.x, n.y, TEX_FINAL.NUVEM).setScale(n.escala, n.escala * 0.8).setAlpha(n.alfa).setDepth(-94)
      );
    });

    this.graficoPassaros = cena.add.graphics().setDepth(-60);
    for (let i = 0; i < 5; i++) {
      this.passaros.push({ x: -60 - i * 70, y: 150 + (i % 3) * 22 + i * 4, velocidade: 55 + (i % 2) * 12, fase: i * 0.9 });
    }

    // O buraco da primeira briga: remendado com tábua, fita zebrada e cones
    const remendo = cena.add.graphics().setDepth(6);
    const larguraVao = VAO_QUEDA.x1 - VAO_QUEDA.x0 - 20;
    remendo.fillStyle(0x6b4a2a, 1);
    remendo.fillRect(VAO_QUEDA.x0 + 10, B.CHAO_Y - 2, larguraVao, 8);
    remendo.fillStyle(0x8a6238, 1);
    remendo.fillRect(VAO_QUEDA.x0 + 10, B.CHAO_Y - 2, larguraVao, 2);
    for (let x = VAO_QUEDA.x0 + 10; x < VAO_QUEDA.x1 - 10; x += 24) {
      remendo.fillStyle(0xffd23a, 1);
      remendo.fillRect(x, B.CHAO_Y - 40, 12, 5);
      remendo.fillStyle(0x14121c, 1);
      remendo.fillRect(x + 12, B.CHAO_Y - 40, 12, 5);
    }
    for (const x of [VAO_QUEDA.x0 + 4, VAO_QUEDA.x1 - 4]) {
      cena.add.image(x, B.CHAO_Y, TEX_FINAL.CONE).setOrigin(0.5, 1).setScale(S).setDepth(7);
    }

    this.relogio = cena.add
      .sprite(F.VALDIR.RELOGIO_X, B.CHAO_Y, TEX_FINAL.RELOGIO_PONTO, 0)
      .setOrigin(0.5, 1)
      .setScale(S)
      .setDepth(-20);
    this.valdir = cena.add
      .sprite(F.VALDIR.PORTA_X, B.CHAO_Y, TEX_EXTERIOR.VALDIR, 0)
      .setOrigin(0.5, 1)
      .setScale(S)
      .setDepth(9)
      .setAlpha(0);
    this.valdir.play('ff-valdir-respira');

    // Faixas de cinema (descem/sobem nas bordas da tela)
    const w = cena.scale.width;
    const h = cena.scale.height;
    for (const topo of [true, false]) {
      const faixa = cena.add
        .rectangle(0, topo ? -F.FAIXA_CINEMA : h, w, F.FAIXA_CINEMA, 0x000000)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(10002);
      cena.tweens.add({ targets: faixa, y: topo ? 0 : h - F.FAIXA_CINEMA, duration: 900, ease: 'Sine.easeOut' });
    }
  }

  /** Começa a sequência: sol nascendo, fala do protagonista, Valdir, créditos. */
  public iniciar(g: GanchosFinal): void {
    const cena = this.cena;
    cena.tweens.add({
      targets: [this.sol, this.brilhoSol],
      y: F.SOL.ateY,
      duration: F.SOL.SUBIDA_MS,
      ease: 'Sine.easeOut',
    });
    g.virarJogador(false, false);
    cena.time.delayedCall(F.PAUSA_INICIAL_MS, () => {
      g.virarJogador(true, false);
      cena.time.delayedCall(350, () => g.falarJogador(() => this.entrarValdir(g)));
    });
  }

  private entrarValdir(g: GanchosFinal): void {
    const cena = this.cena;
    const v = this.valdir;
    const V = F.VALDIR;
    cena.time.delayedCall(F.PAUSA_VALDIR_MS, () => {
      g.virarJogador(true, true);
      v.setFlipX(true);
      cena.tweens.add({ targets: v, alpha: 1, duration: 300 });
      this.andar(v, V.PONTO_X, () => {
        // Bate o ponto
        this.relogio.setFrame(1);
        emitirSom(this.cena, 'ponto_bip', V.RELOGIO_X);
        this.textoFlutuante(V.RELOGIO_X, B.CHAO_Y - 108, TEXTOS_FINAL.BIP, '#5aff8a', 22);
        this.textoFlutuante(V.RELOGIO_X + 60, B.CHAO_Y - 140, TEXTOS_FINAL.PONTO, '#eef0ff', 13);
        cena.time.delayedCall(900, () =>
          g.falarValdir(() => {
            this.relogio.setFrame(0);
            v.setFlipX(false);
            this.andar(v, V.PORTA_X, () => {
              cena.tweens.add({ targets: v, alpha: 0, duration: 300 });
              g.virarJogador(true, false);
              cena.time.delayedCall(F.PAUSA_ANTES_CREDITOS_MS, () => g.comecarCreditos());
            });
          })
        );
      });
    });
  }

  /** Caminhada do Valdir: desliza com um balanço de passo. */
  private andar(alvo: Phaser.GameObjects.Sprite, paraX: number, depois: () => void): void {
    const V = F.VALDIR;
    const passo = this.cena.tweens.add({ targets: alvo, y: B.CHAO_Y - 4, duration: 160, yoyo: true, repeat: -1 });
    this.cena.tweens.add({
      targets: alvo,
      x: paraX,
      duration: V.ANDAR_MS * (Math.abs(paraX - alvo.x) / (V.PONTO_X - V.PORTA_X)),
      ease: 'Linear',
      onComplete: () => {
        passo.stop();
        alvo.setY(B.CHAO_Y);
        depois();
      },
    });
  }

  private textoFlutuante(x: number, y: number, texto: string, cor: string, tamanho: number): void {
    const t = this.cena.add
      .text(x, y, texto, {
        fontFamily: FONTE,
        fontSize: `${tamanho}px`,
        fontStyle: 'bold',
        color: cor,
        stroke: '#05050c',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.cena.tweens.add({
      targets: t,
      y: y - 26,
      alpha: { from: 1, to: 0 },
      delay: 900,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  public update(delta: number): void {
    this.tempoMs += delta;
    this.proximoPiadoMs -= delta;
    if (this.proximoPiadoMs <= 0) {
      const [min, max] = SOM_FASE_FINAL.PASSARINHO_MS;
      this.proximoPiadoMs = min + Math.random() * (max - min);
      const p = this.passaros[Math.floor(Math.random() * this.passaros.length)];
      emitirSom(this.cena, 'passarinho', p ? Phaser.Math.Clamp(p.x, 0, B.LARGURA) : undefined, 0.8);
    }
    const dt = delta / 1000;
    for (const n of this.nuvens) {
      n.x += 6 * dt;
      if (n.x > 1500) n.x = -220;
    }
    // Raios de sol girando devagar
    const r = this.raios;
    r.clear();
    const { x, y } = this.sol;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + this.tempoMs / 9000;
      const abertura = 0.07;
      r.fillStyle(0xffd8a0, 0.07);
      r.fillTriangle(
        x,
        y,
        x + Math.cos(a - abertura) * 900,
        y + Math.sin(a - abertura) * 900,
        x + Math.cos(a + abertura) * 900,
        y + Math.sin(a + abertura) * 900
      );
    }
    // Pássaros batendo asa
    const g = this.graficoPassaros;
    g.clear();
    g.lineStyle(2, hexNum(COR.noite1), 0.85);
    for (const p of this.passaros) {
      p.x += p.velocidade * dt;
      if (p.x > 1360) p.x = -80;
      const asa = Math.sin(this.tempoMs / 120 + p.fase) * 5;
      g.lineBetween(p.x - 7, p.y - asa, p.x, p.y);
      g.lineBetween(p.x, p.y, p.x + 7, p.y - asa);
    }
  }
}
