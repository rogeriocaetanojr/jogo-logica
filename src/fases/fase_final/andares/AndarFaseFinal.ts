import Phaser from 'phaser';
import { COR, avatarHtml, hexNum, texturaBrilho } from '../ArteFaseFinal';
import { FALAS_NPC } from '../DialogosFaseFinal';
import { NpcFaseFinal } from '../NpcFaseFinal';
import { animNpc, gerarTexturasNpc, retratoNpc, texNpc } from '../npcs/TexturasNpc';
import { ANDAR_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';
import { TelaoFaseFinal } from '../TelaoFaseFinal';
import { TEX_EXTERIOR, gerarTexturasExterior } from '../exterior/TexturasExterior';
import { BloqueioPuzzle } from './BloqueioPuzzle';
import { ElevadorFaseFinal } from './ElevadorFaseFinal';
import type { ConfigAndar, ConfigBuraco } from './tiposAndar';
import {
  MODULO_PAREDE,
  alturaPlataforma,
  gerarTexturasAndar,
  texAndar,
  texturaDecoracao,
  texturaPlataforma,
} from './TexturasAndar';

const A = ANDAR_FASE_FINAL;
const S = ESCALA_ARTE;

/**
 * Constrói um andar inteiro a partir da configuração: cidade pelas janelas, parede, teto,
 * piso com vãos, decoração do tema, plataformas, terminal do puzzle, bloqueio e elevadores.
 * Não tem nada específico de um andar: tudo vem de `ConfigAndar`.
 */
export class AndarFaseFinal {
  public readonly cfg: ConfigAndar;
  /** Colide por todos os lados (chão, blocos, portões). */
  public readonly solidos: Phaser.Physics.Arcade.StaticGroup;
  /** Só o tampo, e só por cima (mesas e passarelas). */
  public readonly umaVia: Phaser.Physics.Arcade.StaticGroup;
  public readonly bloqueio: BloqueioPuzzle;
  public readonly elevadorSaida: ElevadorFaseFinal;
  public readonly elevadorEntrada?: ElevadorFaseFinal;
  public readonly terminal: Phaser.GameObjects.Sprite;
  public readonly spawn: { x: number; y: number };

  public readonly npcs: NpcFaseFinal[] = [];

  private readonly cena: Phaser.Scene;
  private readonly teloes: TelaoFaseFinal[] = [];

  constructor(cena: Phaser.Scene, cfg: ConfigAndar) {
    this.cena = cena;
    this.cfg = cfg;
    const tema = cfg.tema;
    gerarTexturasExterior(cena); // céu e skyline (ficam em cache entre andares)
    gerarTexturasAndar(cena, tema);

    this.solidos = cena.physics.add.staticGroup();
    this.umaVia = cena.physics.add.staticGroup();

    this.criarFundo();
    this.criarDecoracao();

    const vaoPonte = BloqueioPuzzle.vaoDaPonte(cfg.puzzle.bloqueio);
    const buracos = vaoPonte ? [...cfg.buracos, vaoPonte] : [...cfg.buracos];
    this.criarPiso(buracos);
    this.criarPlataformas();

    // Entrada: porta do saguão (andar 1) ou elevador
    const xEntrada = cfg.entrada === 'porta' ? A.ENTRADA_PORTA_X : A.ENTRADA_ELEVADOR_X;
    if (cfg.entrada === 'porta') {
      cena.add.image(xEntrada, A.CHAO_Y, texAndar.portaSaguao).setOrigin(0.5, 1).setScale(S).setDepth(-22);
    } else {
      this.elevadorEntrada = new ElevadorFaseFinal(cena, xEntrada, tema, cfg.numero, true);
    }
    this.spawn = { x: xEntrada, y: A.CHAO_Y - 88 };

    this.elevadorSaida = new ElevadorFaseFinal(cena, cfg.elevadorX, tema, cfg.numero, false);

    this.terminal = cena.add
      .sprite(cfg.puzzle.terminalX, A.CHAO_Y, texAndar.terminal(tema), 0)
      .setOrigin(0.5, 1)
      .setScale(S)
      .setDepth(-18);
    this.terminal.play(`${texAndar.terminal(tema)}-pisca`);
    cena.add
      .image(cfg.puzzle.terminalX, A.CHAO_Y - 84, texturaBrilho(cena))
      .setScale(0.8)
      .setTint(hexNum(COR.vermelho))
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-19);

    this.bloqueio = new BloqueioPuzzle(cena, cfg.puzzle.bloqueio, this.solidos);
    this.criarNpcs();
  }

  /** Quantos humanos há no andar (o puzzle de variáveis conta isso). */
  public get humanos(): number {
    return this.cfg.npcs.filter((n) => n.humano).length;
  }

  public npc(id: string): NpcFaseFinal | undefined {
    return this.npcs.find((n) => n.id === id);
  }

  private criarNpcs(): void {
    for (const n of this.cfg.npcs) {
      gerarTexturasNpc(this.cena, n.aparencia);
      const falas = FALAS_NPC[n.id];
      const avatar = avatarHtml(retratoNpc(n.aparencia), n.id.toUpperCase());
      this.npcs.push(
        new NpcFaseFinal(this.cena, {
          id: n.id,
          x: n.x,
          pesY: A.CHAO_Y,
          textura: texNpc(n.aparencia),
          animacao: animNpc(n.aparencia),
          prompt: '[E] FALAR',
          raioInteracao: 90,
          humano: n.humano,
          falas: (visita) => {
            if (!falas) return [];
            const textos = visita === 0 ? falas.primeira : [falas.repeticoes[(visita - 1) % falas.repeticoes.length]];
            return textos.map((texto) => ({ falante: falas.falante, texto, avatar }));
          },
        })
      );
    }
  }

  /* =======================================================================
   * FUNDO: CÉU, CIDADE, PAREDE E TETO
   * ======================================================================= */

  private criarFundo(): void {
    const cena = this.cena;
    const { tema, largura } = this.cfg;
    const larguraTela = cena.scale.width;

    cena.add.image(0, 0, TEX_EXTERIOR.CEU).setOrigin(0).setScale(4).setScrollFactor(0).setDepth(-100);
    // Cidade vista pelas janelas: mais baixa a cada andar
    cena.add
      .tileSprite(0, 150 + this.cfg.alturaCidade, (larguraTela + 400) / S, 220, TEX_EXTERIOR.SKYLINE_LONGE)
      .setOrigin(0)
      .setScale(S)
      .setScrollFactor(0.12, 1)
      .setDepth(-90);
    cena.add
      .tileSprite(0, 210 + this.cfg.alturaCidade, (larguraTela + 900) / S, 260, TEX_EXTERIOR.SKYLINE_PERTO)
      .setOrigin(0)
      .setScale(S)
      .setScrollFactor(0.3, 1)
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

    // Luz das luminárias do teto (uma por módulo)
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
  }

  /* =======================================================================
   * PISO E VÃOS
   * ======================================================================= */

  private criarPiso(buracos: ConfigBuraco[]): void {
    const cena = this.cena;
    const { tema, largura } = this.cfg;
    const ordenados = [...buracos].sort((a, b) => a.x0 - b.x0);

    // Segmentos de chão entre os vãos
    let inicio = 0;
    const segmentos: Array<[number, number]> = [];
    for (const b of ordenados) {
      if (b.x0 > inicio) segmentos.push([inicio, b.x0]);
      inicio = b.x1;
    }
    if (inicio < largura) segmentos.push([inicio, largura]);

    for (const [x0, x1] of segmentos) {
      cena.add
        .tileSprite(x0, A.CHAO_Y, (x1 - x0) / S, (A.ALTURA - A.CHAO_Y) / S, texAndar.piso(tema))
        .setOrigin(0)
        .setScale(S)
        .setDepth(5)
        .setTilePosition(x0 / S, 0);
      const zona = cena.add.zone((x0 + x1) / 2, A.CHAO_Y + 60, x1 - x0, 120);
      this.solidos.add(zona);
    }

    // Vãos: poço escuro, bordas com faixa de advertência e brilho vermelho lá embaixo
    const g = cena.add.graphics().setDepth(4);
    for (const b of ordenados) {
      const w = b.x1 - b.x0;
      g.fillStyle(0x020208, 1);
      g.fillRect(b.x0, A.CHAO_Y, w, A.ALTURA - A.CHAO_Y);
      g.fillGradientStyle(0x020208, 0x020208, hexNum(COR.vermelhoEscuro), hexNum(COR.vermelhoEscuro), 1, 1, 0.5, 0.5);
      g.fillRect(b.x0, A.CHAO_Y + 40, w, A.ALTURA - A.CHAO_Y - 40);
      for (const xb of [b.x0, b.x1 - 8]) {
        for (let y = A.CHAO_Y; y < A.ALTURA; y += 16) {
          g.fillStyle(hexNum(COR.janelaQuente), 0.9);
          g.fillRect(xb, y, 8, 8);
          g.fillStyle(0x111111, 1);
          g.fillRect(xb, y + 8, 8, 8);
        }
      }
    }
  }

  /* =======================================================================
   * PLATAFORMAS E DECORAÇÃO
   * ======================================================================= */

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

  private criarDecoracao(): void {
    const cena = this.cena;
    for (const d of this.cfg.decoracao) {
      if (d.tipo === 'telao') {
        this.teloes.push(
          new TelaoFaseFinal(cena, { x: d.x, y: 250, largura: 260, altura: 104, slogan: d.slogan ?? 0, profundidade: -38 }, 4200)
        );
        continue;
      }
      const { chave, quadros } = texturaDecoracao(cena, d.tipo, this.cfg.tema, d.texto);
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
  }

  public update(tempo: number, delta: number): void {
    for (const t of this.teloes) t.update(tempo, delta);
    this.bloqueio.update(tempo);
  }

  /** Puzzle resolvido: terminal fica verde, o bloqueio abre e o elevador destrava. */
  public resolverPuzzle(aoTerminar?: () => void): void {
    this.terminal.stop();
    this.terminal.setFrame(2);
    this.bloqueio.liberar(() => {
      this.elevadorSaida.destravar();
      // No andar 2 o puzzle é o próprio elevador: ele chega e abre as portas
      if (this.cfg.puzzle.bloqueio.tipo === 'elevador') this.elevadorSaida.abrir();
      aoTerminar?.();
    });
  }
}
