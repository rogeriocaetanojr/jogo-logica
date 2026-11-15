import Phaser from 'phaser';
import { COR, hexNum } from '../ArteFaseFinal';
import { ANDAR_FASE_FINAL, BOSS_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';
import { TEX_EXTERIOR, gerarTexturasExterior } from '../exterior/TexturasExterior';
import {
  MODULO_PAREDE,
  alturaPlataforma,
  gerarTexturasAndar,
  texAndar,
  texturaDecoracao,
  texturaPlataforma,
} from '../andares/TexturasAndar';
import { type ConfigArena, VAO_QUEDA } from './configArenas';
import { TEX_BOSS, gerarTexturasBoss } from './TexturasBoss';

const A = ANDAR_FASE_FINAL;
const B = BOSS_FASE_FINAL;
const S = ESCALA_ARTE;

/**
 * Uma arena do boss: uma tela com chão inteiro (o trecho do meio quebra na transição),
 * plataformas de uma via e o cenário do tema. O terraço é ao ar livre; as outras são salas
 * com parede, teto e, quando se chega caindo, um buraco no teto.
 */
export class ArenaBoss {
  public readonly cfg: ConfigArena;
  public readonly solidos: Phaser.Physics.Arcade.StaticGroup;
  public readonly umaVia: Phaser.Physics.Arcade.StaticGroup;

  private readonly cena: Phaser.Scene;
  private pisoMeio!: Phaser.GameObjects.TileSprite;
  private zonaMeio!: Phaser.GameObjects.Zone;

  constructor(cena: Phaser.Scene, cfg: ConfigArena, buracoNoTeto: boolean) {
    this.cena = cena;
    this.cfg = cfg;
    gerarTexturasExterior(cena);
    gerarTexturasAndar(cena, cfg.tema);
    gerarTexturasBoss(cena);

    this.solidos = cena.physics.add.staticGroup();
    this.umaVia = cena.physics.add.staticGroup();

    if (cfg.tipo === 'terraco') this.criarTerraco();
    else this.criarSala(buracoNoTeto);
    this.criarPiso();
    this.criarPlataformas();
  }

  /* =======================================================================
   * CENÁRIO
   * ======================================================================= */

  private criarTerraco(): void {
    const cena = this.cena;
    const largura = B.LARGURA;
    cena.add.image(0, 0, TEX_EXTERIOR.CEU).setOrigin(0).setScale(4).setDepth(-100);
    // No topo da torre mais alta: a cidade fica toda lá embaixo
    cena.add
      .tileSprite(0, 360, (largura + 200) / S, 220, TEX_EXTERIOR.SKYLINE_LONGE)
      .setOrigin(0)
      .setScale(S)
      .setDepth(-90);
    cena.add
      .tileSprite(-80, 440, (largura + 300) / S, 260, TEX_EXTERIOR.SKYLINE_PERTO)
      .setOrigin(0)
      .setScale(S)
      .setDepth(-80);

    cena.add.image(930, B.CHAO_Y - 28, TEX_BOSS.TERRACO_LETREIRO).setOrigin(0.5, 1).setScale(S).setDepth(-50);
    cena.add
      .image(930, B.CHAO_Y - 160, TEX_EXTERIOR.CONE_LUZ)
      .setScale(2.4, 1.4)
      .setTint(hexNum(COR.vermelho))
      .setAlpha(0.12)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-49);
    cena.add.image(1190, B.CHAO_Y - 28, TEX_BOSS.TERRACO_CAIXA).setOrigin(0.5, 1).setScale(S).setDepth(-45);
    const antena = cena.add.sprite(350, B.CHAO_Y - 28, TEX_BOSS.TERRACO_ANTENA, 0).setOrigin(0.5, 1).setScale(S).setDepth(-46);
    const anim = 'ff-terraco-antena-pisca';
    if (!cena.anims.exists(anim)) {
      cena.anims.create({
        key: anim,
        frames: cena.anims.generateFrameNumbers(TEX_BOSS.TERRACO_ANTENA, { frames: [0, 1] }),
        frameRate: 1.5,
        repeat: -1,
      });
    }
    antena.play(anim);

    // Mureta na borda do terraço, atrás de tudo que fica no chão
    cena.add
      .tileSprite(0, B.CHAO_Y - 28, largura / S, 14, TEX_BOSS.TERRACO_MURETA)
      .setOrigin(0)
      .setScale(S)
      .setDepth(-30);
    cena.add.image(110, B.CHAO_Y, TEX_BOSS.TERRACO_ACESSO).setOrigin(0.5, 1).setScale(S).setDepth(-25);
  }

  private criarSala(buracoNoTeto: boolean): void {
    const cena = this.cena;
    const { tema, alturaCidade, decoracao } = this.cfg;
    const largura = B.LARGURA;

    cena.add.image(0, 0, TEX_EXTERIOR.CEU).setOrigin(0).setScale(4).setDepth(-100);
    cena.add
      .tileSprite(0, 150 + alturaCidade, (largura + 400) / S, 220, TEX_EXTERIOR.SKYLINE_LONGE)
      .setOrigin(0)
      .setScale(S)
      .setDepth(-90);
    cena.add
      .tileSprite(-120, 210 + alturaCidade, (largura + 900) / S, 260, TEX_EXTERIOR.SKYLINE_PERTO)
      .setOrigin(0)
      .setScale(S)
      .setDepth(-80);
    cena.add
      .tileSprite(0, A.TETO_Y, Math.ceil(largura / S), (A.CHAO_Y - A.TETO_Y) / S, texAndar.parede(tema))
      .setOrigin(0)
      .setScale(S)
      .setDepth(-60);
    cena.add
      .tileSprite(0, 0, Math.ceil(largura / S), A.TETO_Y / S, texAndar.teto(tema))
      .setOrigin(0)
      .setScale(S)
      .setDepth(-10);

    const modulo = MODULO_PAREDE * S;
    for (let x = modulo / 2; x < largura; x += modulo) {
      cena.add
        .image(x, A.TETO_Y - 4, TEX_EXTERIOR.CONE_LUZ)
        .setOrigin(0.5, 0)
        .setScale(1.1, 1.6)
        .setTint(hexNum(tema.luz))
        .setAlpha(0.1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(-9);
    }

    for (const d of decoracao) {
      if (d.tipo === 'telao') continue;
      const { chave, quadros } = texturaDecoracao(cena, d.tipo, tema, d.texto);
      const naParede = d.tipo === 'cartaz';
      const img = cena.add
        .sprite(d.x, naParede ? 280 : A.CHAO_Y, chave, 0)
        .setOrigin(0.5, naParede ? 0.5 : 1)
        .setScale(S)
        .setDepth(d.tipo === 'cabos' ? -39 : -40);
      if (quadros > 1) {
        const anim = `${chave}-anim`;
        if (!cena.anims.exists(anim)) {
          cena.anims.create({
            key: anim,
            frames: cena.anims.generateFrameNumbers(chave, { start: 0, end: quadros - 1 }),
            frameRate: 3,
            repeat: -1,
          });
        }
        img.play(anim);
      }
    }

    if (buracoNoTeto) this.desenharBuracoNoTeto();
  }

  /** Por onde os dois acabaram de cair: rombo no teto com vergalhões e fios pendurados. */
  private desenharBuracoNoTeto(): void {
    const g = this.cena.add.graphics().setDepth(-8);
    const { x0, x1 } = VAO_QUEDA;
    const recortes = [0, 14, 6, 22, 10, 26, 8, 18, 4, 16, 0];
    const passo = (x1 - x0) / (recortes.length - 1);
    const pontos = [new Phaser.Math.Vector2(x0, 0)];
    recortes.forEach((r, i) => pontos.push(new Phaser.Math.Vector2(x0 + i * passo, A.TETO_Y - 6 + r)));
    pontos.push(new Phaser.Math.Vector2(x1, 0));
    g.fillStyle(0x020208, 1);
    g.fillPoints(pontos, true);
    g.lineStyle(2, hexNum(COR.metal), 1);
    for (const [x, comp] of [
      [x0 + 30, 40],
      [x0 + 110, 58],
      [x1 - 50, 34],
    ] as const) {
      g.lineBetween(x, A.TETO_Y, x + 6, A.TETO_Y + comp);
    }
    g.lineStyle(2, hexNum(COR.magenta), 0.9);
    g.lineBetween(x0 + 70, A.TETO_Y, x0 + 64, A.TETO_Y + 70);
    g.fillStyle(hexNum(COR.janelaQuente), 1);
    g.fillCircle(x0 + 64, A.TETO_Y + 72, 3);
  }

  /* =======================================================================
   * PISO E PLATAFORMAS
   * ======================================================================= */

  private criarPiso(): void {
    const cena = this.cena;
    const { tema } = this.cfg;
    const altura = (A.ALTURA - B.CHAO_Y) / S;
    const segmentos: Array<[number, number]> = [
      [0, VAO_QUEDA.x0],
      [VAO_QUEDA.x0, VAO_QUEDA.x1],
      [VAO_QUEDA.x1, B.LARGURA],
    ];
    segmentos.forEach(([x0, x1], i) => {
      const piso = cena.add
        .tileSprite(x0, B.CHAO_Y, (x1 - x0) / S, altura, texAndar.piso(tema))
        .setOrigin(0)
        .setScale(S)
        .setDepth(5)
        .setTilePosition(x0 / S, 0);
      const zona = cena.add.zone((x0 + x1) / 2, B.CHAO_Y + 60, x1 - x0, 120);
      this.solidos.add(zona);
      if (i === 1) {
        this.pisoMeio = piso;
        this.zonaMeio = zona;
      }
    });
  }

  private criarPlataformas(): void {
    const cena = this.cena;
    for (const p of this.cfg.plataformas) {
      const chave = texturaPlataforma(cena, p, this.cfg.tema);
      const altura = alturaPlataforma(p);
      cena.add.image(p.x, p.topo, chave).setOrigin(0.5, 0).setScale(S).setDepth(8);
      if (p.tipo === 'mesa' || p.tipo === 'passarela') {
        this.umaVia.add(cena.add.zone(p.x, p.topo + 8, p.largura, 16));
      } else {
        this.solidos.add(cena.add.zone(p.x, p.topo + altura / 2, p.largura, altura));
      }
    }
  }

  /* =======================================================================
   * TRANSIÇÃO: O CHÃO RACHA E CAI
   * ======================================================================= */

  /** Rachaduras crescendo a partir do centro do vão (progresso 0..1). */
  public rachar(g: Phaser.GameObjects.Graphics, progresso: number): void {
    const cx = (VAO_QUEDA.x0 + VAO_QUEDA.x1) / 2;
    const meia = ((VAO_QUEDA.x1 - VAO_QUEDA.x0) / 2 + 30) * progresso;
    const zigue = [0, 8, -6, 12, -4, 10, -8, 6, 0];
    g.clear();
    g.lineStyle(3, 0x05050c, 1);
    for (const lado of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx, B.CHAO_Y + 2);
      zigue.forEach((z, i) => {
        const f = (i + 1) / zigue.length;
        g.lineTo(cx + lado * meia * f, B.CHAO_Y + 4 + Math.abs(z) + f * 10);
      });
      g.strokePath();
    }
    // Rachaduras descendo pela laje
    g.lineStyle(2, 0x05050c, 1);
    for (const dx of [-60, -20, 30, 70]) {
      const comp = 70 * progresso;
      g.lineBetween(cx + dx * progresso, B.CHAO_Y + 6, cx + dx * progresso + dx * 0.2, B.CHAO_Y + 6 + comp);
    }
  }

  /** O trecho do meio despenca (com destroços) e deixa o poço escuro. */
  public quebrarChao(): void {
    const cena = this.cena;
    (this.zonaMeio.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    const w = VAO_QUEDA.x1 - VAO_QUEDA.x0;
    cena.add
      .rectangle(VAO_QUEDA.x0, B.CHAO_Y, w, A.ALTURA - B.CHAO_Y, 0x020208)
      .setOrigin(0)
      .setDepth(4);
    cena.tweens.add({
      targets: this.pisoMeio,
      y: A.ALTURA + 80,
      angle: 9,
      duration: 700,
      ease: 'Quad.easeIn',
    });
    const cor = hexNum(this.cfg.tema.piso);
    for (let i = 0; i < 8; i++) {
      const x = VAO_QUEDA.x0 + 15 + i * (w / 8);
      const pedaco = cena.add
        .rectangle(x, B.CHAO_Y + 4, 14 + (i % 3) * 6, 10 + (i % 2) * 6, i % 2 ? cor : 0x3f4462)
        .setDepth(6);
      cena.tweens.add({
        targets: pedaco,
        y: A.ALTURA + 60,
        x: x + (i - 3.5) * 14,
        angle: (i % 2 ? 1 : -1) * 220,
        duration: 600 + (i % 4) * 90,
        ease: 'Quad.easeIn',
        onComplete: () => pedaco.destroy(),
      });
    }
  }
}
