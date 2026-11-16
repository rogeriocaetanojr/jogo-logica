import Phaser from 'phaser';
import { emitirSom } from '../som/eventosSom';
import { COR, hexNum, texturaBrilho } from '../ArteFaseFinal';
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
import { Particulas } from './EfeitosBoss';
import { TEX_BOSS, gerarTexturasBoss } from './TexturasBoss';
import { COR_AMANHECER, TEX_FINAL, gerarTexturasFinal } from '../final/TexturasFinal';

const N = BOSS_FASE_FINAL.NUCLEO;

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
  private pisoMeio?: Phaser.GameObjects.TileSprite;
  private zonaMeio?: Phaser.GameObjects.Zone;
  // Núcleo (forma 5)
  private lava?: Phaser.GameObjects.Graphics;
  private particulasLava?: Particulas;
  private acumuladorBrasaMs: number = 0;
  private plataformaBoss: Array<Phaser.GameObjects.TileSprite | Phaser.GameObjects.Sprite | Phaser.GameObjects.Image> = [];
  private zonaPlataformaBoss?: Phaser.GameObjects.Zone;
  private placaCommit?: Phaser.GameObjects.Sprite;
  private correntesBoss?: Phaser.GameObjects.Graphics;
  private pistao?: Phaser.GameObjects.TileSprite;

  /** `amanhecer`: o terraço da cena final, com céu claro e o letreiro apagado. */
  constructor(cena: Phaser.Scene, cfg: ConfigArena, buracoNoTeto: boolean, amanhecer: boolean = false) {
    this.cena = cena;
    this.cfg = cfg;
    gerarTexturasExterior(cena);
    gerarTexturasAndar(cena, cfg.tema);
    gerarTexturasBoss(cena);

    this.solidos = cena.physics.add.staticGroup();
    this.umaVia = cena.physics.add.staticGroup();

    if (amanhecer) gerarTexturasFinal(cena);
    if (cfg.tipo === 'terraco') this.criarTerraco(amanhecer);
    else this.criarSala(buracoNoTeto);
    if (cfg.tipo === 'nucleo') this.criarNucleo();
    else this.criarPiso();
    this.criarPlataformas();
  }

  /* =======================================================================
   * CENÁRIO
   * ======================================================================= */

  private criarTerraco(amanhecer: boolean): void {
    const cena = this.cena;
    const largura = B.LARGURA;
    cena.add.image(0, 0, amanhecer ? TEX_FINAL.CEU_AMANHECER : TEX_EXTERIOR.CEU).setOrigin(0).setScale(4).setDepth(-100);
    // No topo da torre mais alta: a cidade fica toda lá embaixo
    cena.add
      .tileSprite(0, 360, (largura + 200) / S, 220, TEX_EXTERIOR.SKYLINE_LONGE)
      .setOrigin(0)
      .setScale(S)
      .setDepth(-90)
      .setTint(amanhecer ? COR_AMANHECER.cidadeLonge : 0xffffff);
    cena.add
      .tileSprite(-80, 440, (largura + 300) / S, 260, TEX_EXTERIOR.SKYLINE_PERTO)
      .setOrigin(0)
      .setScale(S)
      .setDepth(-80)
      .setTint(amanhecer ? COR_AMANHECER.cidadePerto : 0xffffff);

    const letreiro = cena.add.image(930, B.CHAO_Y - 28, TEX_BOSS.TERRACO_LETREIRO).setOrigin(0.5, 1).setScale(S).setDepth(-50);
    // Depois da luta o letreiro fica apagado e torto
    if (amanhecer) letreiro.setTint(0x6a6478).setAngle(-4);
    cena.add
      .image(930, B.CHAO_Y - 160, TEX_EXTERIOR.CONE_LUZ)
      .setVisible(!amanhecer)
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

    if (buracoNoTeto) {
      const buracos = this.cfg.tipo === 'nucleo' ? N.BURACOS_TETO : [[VAO_QUEDA.x0, VAO_QUEDA.x1] as const];
      for (const [x0, x1] of buracos) this.desenharBuracoNoTeto(x0, x1);
    }
  }

  /** Por onde os dois acabaram de cair: rombo no teto com vergalhões e fios pendurados. */
  private desenharBuracoNoTeto(x0: number, x1: number): void {
    const g = this.cena.add.graphics().setDepth(-8);
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
   * NÚCLEO: LAVA, PLATAFORMAS SUSPENSAS E O MECANISMO DO COMMIT 9b40
   * ======================================================================= */

  private criarNucleo(): void {
    const cena = this.cena;
    const pj = N.PLATAFORMA_JOGADOR;
    const pb = N.PLATAFORMA_BOSS;

    // Brilho de fogo subindo da lava pelas paredes
    const brilho = cena.add.graphics().setDepth(-9).setBlendMode(Phaser.BlendModes.ADD);
    brilho.fillGradientStyle(0xff5a1a, 0xff5a1a, 0xff5a1a, 0xff5a1a, 0, 0, 0.45, 0.45);
    brilho.fillRect(0, 260, B.LARGURA, N.LAVA_Y - 260);
    for (const x of [200, 640, 1080]) {
      cena.add
        .image(x, N.LAVA_Y, texturaBrilho(cena))
        .setTint(0xff7a1a)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(5, 2.2)
        .setAlpha(0.35)
        .setDepth(-8);
    }

    // Correntes do teto segurando as plataformas
    const correntes = cena.add.graphics().setDepth(7);
    this.desenharCorrente(correntes, pj.x0 + 40, pj.topo);
    this.desenharCorrente(correntes, pj.x1 - 30, pj.topo);
    this.correntesBoss = cena.add.graphics().setDepth(7);
    this.desenharCorrente(this.correntesBoss, pb.x0 + 24, pb.topo);
    this.desenharCorrente(this.correntesBoss, pb.x1 - 24, pb.topo);

    // Plataforma do jogador
    cena.add
      .tileSprite(pj.x0, pj.topo, (pj.x1 - pj.x0) / S, 24, TEX_BOSS.LAJE_JOGADOR)
      .setOrigin(0)
      .setScale(S)
      .setDepth(8);
    this.solidos.add(cena.add.zone((pj.x0 + pj.x1) / 2, pj.topo + 15, pj.x1 - pj.x0, 30));

    // Plataforma do Mega Brain, o pistão que a sustenta e a placa do commit
    const xPistao = (pb.x0 + pb.x1) / 2;
    this.pistao = cena.add
      .tileSprite(xPistao, pb.topo + 40, 28, (A.ALTURA - pb.topo) / S, TEX_BOSS.PISTAO)
      .setOrigin(0.5, 0)
      .setScale(S)
      .setDepth(7.5);
    const laje = cena.add
      .tileSprite(pb.x0, pb.topo, (pb.x1 - pb.x0) / S, 24, TEX_BOSS.LAJE_BOSS)
      .setOrigin(0)
      .setScale(S)
      .setDepth(8);
    this.placaCommit = cena.add.sprite(xPistao, pb.topo + 30, TEX_BOSS.PLACA_COMMIT, 0).setScale(S).setDepth(8.5);
    const brilhoPlaca = cena.add
      .image(xPistao, pb.topo + 30, texturaBrilho(cena))
      .setTint(hexNum(COR.janelaQuente))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.8, 0.5)
      .setAlpha(0.35)
      .setDepth(8.4);
    this.zonaPlataformaBoss = cena.add.zone(xPistao, pb.topo + 15, pb.x1 - pb.x0, 30);
    this.solidos.add(this.zonaPlataformaBoss);
    this.plataformaBoss = [laje, this.placaCommit, brilhoPlaca];

    // Ressaltos de uma via para alcançar os olhos
    for (const r of N.RESSALTOS) {
      const cfg = { tipo: 'passarela' as const, x: r.x, topo: r.topo, largura: r.largura };
      cena.add.image(r.x, r.topo, texturaPlataforma(cena, cfg, this.cfg.tema)).setOrigin(0.5, 0).setScale(S).setDepth(8);
      this.umaVia.add(cena.add.zone(r.x, r.topo + 8, r.largura, 16));
      this.desenharCorrente(correntes, r.x, r.topo);
    }

    this.lava = cena.add.graphics().setDepth(9);
    this.particulasLava = new Particulas(cena, 9.5);
  }

  /** Corrente do teto até um ponto (elos alternados). */
  private desenharCorrente(g: Phaser.GameObjects.Graphics, x: number, ate: number): void {
    for (let y = A.TETO_Y; y < ate; y += 10) {
      const largo = Math.floor(y / 10) % 2 === 0;
      g.fillStyle(0x14121c, 1);
      g.fillRect(x - (largo ? 4 : 2), y, largo ? 8 : 4, 10);
      g.fillStyle(largo ? 0x4a5172 : 0x7b84aa, 1);
      g.fillRect(x - (largo ? 3 : 1), y + 1, largo ? 6 : 2, 8);
    }
  }

  /** Lava ondulando, bolhas, línguas de fogo e brasas subindo. */
  public update(tempo: number, delta: number): void {
    const g = this.lava;
    if (!g) return;
    g.clear();
    const superficie = (x: number) => N.LAVA_Y + Math.sin(x / 40 + tempo / 400) * 4 + Math.sin(x / 17 - tempo / 250) * 2;
    const pontos: Phaser.Math.Vector2[] = [];
    for (let x = 0; x <= B.LARGURA; x += 16) pontos.push(new Phaser.Math.Vector2(x, superficie(x)));
    pontos.push(new Phaser.Math.Vector2(B.LARGURA, A.ALTURA), new Phaser.Math.Vector2(0, A.ALTURA));
    g.fillStyle(0x8a1a0a, 1);
    g.fillPoints(pontos, true);
    // Faixas de calor (laranja e amarelo) logo abaixo da superfície
    for (let x = 0; x < B.LARGURA; x += 16) {
      const y = superficie(x);
      g.fillStyle(0xff5a1a, 1);
      g.fillRect(x, y, 16, 10);
      g.fillStyle(0xffb03a, 1);
      g.fillRect(x, y, 16, 3);
      if (Math.sin(x * 0.7 + tempo / 300) > 0.6) {
        g.fillStyle(0xfff0a0, 1);
        g.fillRect(x + 4, y, 6, 2);
      }
    }
    // Bolhas que estouram (posições fixas, fase pelo tempo)
    for (let i = 0; i < 14; i++) {
      const x = 40 + i * 91;
      const t = ((tempo / (900 + (i % 4) * 170) + i * 0.37) % 1 + 1) % 1;
      const r = 2 + t * 7;
      g.fillStyle(t > 0.85 ? 0xfff0a0 : 0xff7a1a, 1 - t * 0.6);
      g.fillCircle(x, superficie(x) + 8 - t * 10, r);
    }
    // Línguas de fogo subindo e descendo
    for (let i = 0; i < 9; i++) {
      const x = 70 + i * 140;
      const h = 18 + Math.max(0, Math.sin(tempo / 260 + i * 1.3)) * 34;
      const y = superficie(x);
      g.fillStyle(0xff5a1a, 0.85);
      g.fillTriangle(x - 12, y, x + 12, y, x + Math.sin(tempo / 120 + i) * 6, y - h);
      g.fillStyle(0xffd36b, 0.9);
      g.fillTriangle(x - 6, y, x + 6, y, x + Math.sin(tempo / 120 + i) * 4, y - h * 0.6);
    }
    // Brasas
    this.acumuladorBrasaMs += delta;
    if (this.acumuladorBrasaMs >= 90 && this.particulasLava) {
      this.acumuladorBrasaMs = 0;
      const x = ((tempo * 7.3) % B.LARGURA + B.LARGURA) % B.LARGURA;
      this.particulasLava.emitir(x, N.LAVA_Y, {
        quantidade: 2,
        angulo: -Math.PI / 2,
        abertura: 0.4,
        velocidade: [40, 120],
        vidaMs: [900, 1600],
        tamanho: [2, 3],
        cores: [0xffb03a, 0xff5a1a, 0xfff0a0],
        gravidade: -20,
        arrasto: 0.99,
      });
    }
  }

  /** drop 9b40: a placa vira DROP, a plataforma se desmancha, o pistão afunda e as correntes caem. */
  public derrubarPlataformaBoss(): void {
    const meio = (N.PLATAFORMA_BOSS.x0 + N.PLATAFORMA_BOSS.x1) / 2;
    emitirSom(this.cena, 'placa_drop', meio);
    this.cena.time.delayedCall(500, () => emitirSom(this.cena, 'plataforma_cai', meio));
    const cena = this.cena;
    const pb = N.PLATAFORMA_BOSS;
    if (this.zonaPlataformaBoss) (this.zonaPlataformaBoss.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.placaCommit?.setFrame(1);
    let pisca = 0;
    cena.time.addEvent({
      delay: 90,
      repeat: 8,
      callback: () => {
        pisca++;
        this.placaCommit?.setVisible(pisca % 2 === 0);
      },
    });
    cena.time.delayedCall(800, () => {
      for (const obj of this.plataformaBoss) {
        cena.tweens.add({
          targets: obj,
          y: obj.y + 260,
          alpha: 0,
          angle: 8,
          duration: 1100,
          ease: 'Quad.easeIn',
        });
      }
      this.particulasLava?.detritos((pb.x0 + pb.x1) / 2, pb.topo, 30, [0x4a5172, 0x1c1a28, 0xff2a3d, 0xffd36b], N.LAVA_Y);
      if (this.pistao) cena.tweens.add({ targets: this.pistao, y: A.ALTURA + 40, duration: 1400, ease: 'Quad.easeIn' });
      if (this.correntesBoss) cena.tweens.add({ targets: this.correntesBoss, y: 300, alpha: 0, duration: 900, ease: 'Quad.easeIn' });
      cena.cameras.main.shake(600, 0.008);
    });
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
    if (!this.zonaMeio || !this.pisoMeio) return;
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
