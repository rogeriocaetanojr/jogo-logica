import Phaser from 'phaser';
import type { CenaFase3 } from '../CenaFase3';
import { PROF } from '../trechos/TrechoLixao';
import { COR, ESCALA, grade, hexNum, texturaPixel } from './ArteLixao';
import type { Pincel } from './ArteLixao';
import { ALTURA_TELA, CHAO_Y, LARGURA_TELA, TIPOS_RECICLAVEIS } from './TiposLixao';

/** Índice do trecho da arena (noite) em TRECHOS. */
export const TRECHO_ARENA = 3;

/** Posições na arena, em x relativo ao trecho 4 (ver Trecho4Noite). */
const ARENA = {
  /** Borda esquerda e direita da área travada (exatamente uma tela). */
  INICIO: 512,
  FIM: 512 + LARGURA_TELA,
  /** Passou deste x, a câmera trava e a luta começa. */
  GATILHO: 600,
  /** Onde o jogador volta ao morrer durante a luta. */
  RENASCER: 620,
  /** Centro do monstro ao começar e faixa em que ele anda. */
  MONSTRO_INICIO: 1350,
  MONSTRO_MIN: 760,
  MONSTRO_MAX: 1440,
  /** Centro do contêiner de reciclagem, no canto direito. */
  CONTEINER: 1724,
  /** Onde o Recicla comemora no final. */
  RECICLA: 1100,
} as const;

export const CHEFAO = {
  VIDA: 10,
  /** Velocidade de andar atrás do jogador (px/s), multiplicada pelo fator de lentidão. */
  VELOCIDADE: 70,
  /** Cada acerto multiplica o fator de lentidão por isto, até o mínimo. */
  LENTIDAO_POR_ACERTO: 0.92,
  LENTIDAO_MINIMA: 0.45,
  /** Intervalo entre ataques com o fator 1 (cresce conforme ele fica lento). */
  INTERVALO_ATAQUE_MS: 2200,
  /** Boca aberta antes de cada ataque. */
  PREPARO_MS: 450,
  /** Sucata em arco: tempo de voo até o jogador e gravidade. */
  SUCATA_VOO_MS: 1100,
  SUCATA_GRAVIDADE: 900,
  /** Faíscas: quantas, distância entre elas e duração no chão. */
  FAISCAS: 3,
  FAISCA_ESPACO: 128,
  FAISCA_MS: 2400,
  /** Choque no chão: meia largura, aviso piscando e tempo ativo. */
  CHOQUE_MEIA_LARGURA: 176,
  CHOQUE_AVISO_MS: 900,
  CHOQUE_ATIVO_MS: 350,
  /** Empurrar o monstro derrotado (px/s). */
  VELOCIDADE_EMPURRAO: 90,
  /** Recicláveis na arena: a cada intervalo, repõe até haver este mínimo no chão. */
  MUNICAO_INTERVALO_MS: 2500,
  MUNICAO_MINIMA: 3,
  /** Compactação no contêiner e espera até a vitória. */
  COMPACTAR_MS: 900,
} as const;

/** Monstro em pixels de arte e a hitbox dentro dele (px de mundo). */
const MONSTRO_W = 48;
const MONSTRO_H = 40;
const HITBOX = { LARGURA: 160, ALTURA: 140 } as const;
const CONTEINER_W = 26;
const CONTEINER_H = 20;

/** Barra de vida no topo da tela. */
const BARRA = { LARGURA: 520, ALTURA: 22, Y: 20 } as const;

type Ataque = 'sucata' | 'faiscas' | 'choque';
const ORDEM_ATAQUES: readonly Ataque[] = ['sucata', 'faiscas', 'choque'];

type Estado = 'dormindo' | 'lutando' | 'derrotado' | 'compactado';

interface Sucata {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Faisca {
  img: Phaser.GameObjects.Sprite;
  restante: number;
}

interface Choque {
  faixa: Phaser.GameObjects.Rectangle;
  x: number;
  tempo: number;
}

/**
 * Monstro de Sucata, o chefão da arena da noite, e o fim da fase.
 *
 * Ao entrar na arena, a câmera trava numa tela e paredes invisíveis fecham as bordas. O
 * monstro anda atrás do jogador e alterna três ataques: sucata em arco, faíscas no chão e
 * choque no chão com aviso piscando. Cada reciclável que acerta tira 1 de vida e o deixa mais
 * lento. Com a vida zerada ele para; o jogador o empurra andando contra ele até o contêiner,
 * que o compacta. Aí o céu clareia, o Recicla comemora e a fase termina (ver CenaFase3).
 *
 * O monstro é um sólido (fica em `cena.solidos`): o jogador não o atravessa e consegue
 * empurrá-lo. Só avança em `atualizar`, que a cena não chama com a física pausada.
 */
export class ChefaoLixao {
  private readonly cena: CenaFase3;
  private readonly aoAtingir: (origemX: number) => void;
  /** Chamado quando o monstro é compactado: a cena cuida da vitória. */
  public aoCompactar?: () => void;

  private estado: Estado = 'dormindo';
  private offset = 0;
  private x = 0;
  private vida: number = CHEFAO.VIDA;
  private lentidao = 1;
  private esperaAtaque = 0;
  private preparo = 0;
  private proximoAtaque = 0;
  private esperaMunicao = 0;
  private arenaTravada = false;

  private corpo!: Phaser.GameObjects.Image;
  private solido!: Phaser.GameObjects.Rectangle;
  /** Pontos de luz sobre o corpo, para o monstro aparecer no escuro da noite. */
  private readonly luzes: { x: number; y: number; dx: number }[] = [];
  private conteiner!: Phaser.GameObjects.Image;
  private recicla?: Phaser.GameObjects.Image[];

  private readonly sucatas: Sucata[] = [];
  private readonly faiscas: Faisca[] = [];
  private readonly choques: Choque[] = [];

  private barraFundo!: Phaser.GameObjects.Graphics;
  private barraVida!: Phaser.GameObjects.Graphics;
  private barraTexto!: Phaser.GameObjects.Text;

  constructor(cena: CenaFase3, aoAtingir: (origemX: number) => void) {
    this.cena = cena;
    this.aoAtingir = aoAtingir;
  }

  /** Cria texturas, monstro, contêiner e barra (chamar depois de montar os trechos). */
  construir(): void {
    this.gerarTexturas();
    this.offset = this.cena.trechos[TRECHO_ARENA].offset;

    const xConteiner = grade(this.offset + ARENA.CONTEINER);
    this.conteiner = this.cena.add
      .image(xConteiner, CHAO_Y, 'lx-conteiner')
      .setOrigin(0.5, 1)
      .setScale(ESCALA)
      .setDepth(PROF.objetos);
    this.cena.cenario.registrarTingivel(this.conteiner);

    this.corpo = this.cena.add.image(0, CHAO_Y, 'lx-monstro-0').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.objetos + 2);
    this.solido = this.cena.add.rectangle(0, CHAO_Y - HITBOX.ALTURA / 2, HITBOX.LARGURA, HITBOX.ALTURA, 0, 0);
    this.cena.solidos.add(this.solido);
    for (const dx of [-56, 0, 56]) {
      const luz = { x: 0, y: CHAO_Y - 90, dx };
      this.luzes.push(luz);
      this.cena.cenario.clima.registrarLuz(luz, 'led');
    }

    this.criarBarra();
    this.reiniciar();
  }

  get derrotado(): boolean {
    return this.estado === 'derrotado' || this.estado === 'compactado';
  }

  /** O jogador está dentro da área travada da arena? */
  get arenaAtiva(): boolean {
    return this.arenaTravada;
  }

  /** x de mundo onde o jogador renasce durante a luta. */
  get xRenascer(): number {
    return grade(this.offset + ARENA.RENASCER);
  }

  /** Ao morrer na arena: monstro de volta com vida cheia, ataques e projéteis limpos. */
  reiniciar(): void {
    if (this.estado === 'compactado') return;
    this.x = grade(this.offset + ARENA.MONSTRO_INICIO);
    this.vida = CHEFAO.VIDA;
    this.lentidao = 1;
    this.esperaAtaque = CHEFAO.INTERVALO_ATAQUE_MS;
    this.preparo = 0;
    this.proximoAtaque = 0;
    this.esperaMunicao = 0;
    this.estado = this.arenaTravada ? 'lutando' : 'dormindo';
    for (const s of this.sucatas) s.img.destroy();
    for (const f of this.faiscas) f.img.destroy();
    for (const c of this.choques) c.faixa.destroy();
    this.sucatas.length = 0;
    this.faiscas.length = 0;
    this.choques.length = 0;
    this.corpo.setAlpha(1).setScale(ESCALA).setAngle(0).clearTint();
    this.posicionar();
    this.desenharBarra();
  }

  /** Reciclável em voo em (x, y) acerta o monstro? Tira vida e o deixa mais lento. */
  atingir(x: number, y: number): boolean {
    if (this.estado === 'compactado') return false;
    const meio = HITBOX.LARGURA / 2;
    if (Math.abs(x - this.x) > meio || y < CHAO_Y - HITBOX.ALTURA || y > CHAO_Y) return false;
    if (this.estado !== 'lutando') return true;
    this.vida -= 1;
    this.lentidao = Math.max(CHEFAO.LENTIDAO_MINIMA, this.lentidao * CHEFAO.LENTIDAO_POR_ACERTO);
    // Pisca ao levar o golpe
    this.corpo.setAlpha(0.35);
    this.cena.time.delayedCall(90, () => this.corpo.setAlpha(1));
    this.cena.tweens.add({ targets: this.corpo, angle: { from: x < this.x ? 4 : -4, to: 0 }, duration: 260, ease: 'Back.easeOut' });
    if (this.vida <= 0) this.derrotar();
    this.desenharBarra();
    return true;
  }

  atualizar(delta: number): void {
    if (!this.arenaTravada) {
      if (this.cena.jogador.x >= this.offset + ARENA.GATILHO) this.travarArena();
      return;
    }
    this.atualizarSucatas(delta);
    this.atualizarFaiscas(delta);
    this.atualizarChoques(delta);
    if (this.estado === 'lutando') {
      this.lutar(delta);
      this.reporMunicao(delta);
      this.tocarJogador();
    } else if (this.estado === 'derrotado') {
      this.empurrar(delta);
    }
    this.posicionar();
  }

  /* =========================================================================
   * ARENA
   * ========================================================================= */

  /** Trava câmera e bordas na arena, muda o checkpoint e acorda o monstro. */
  private travarArena(): void {
    this.arenaTravada = true;
    const inicio = this.offset + ARENA.INICIO;
    this.cena.cameras.main.setBounds(inicio, 0, LARGURA_TELA, ALTURA_TELA);
    // Paredes invisíveis do topo da tela ao chão nas duas bordas
    for (const x of [inicio - 16, this.offset + ARENA.FIM + 16]) {
      this.cena.solidos.add(this.cena.add.rectangle(x, CHAO_Y / 2, 32, CHAO_Y, 0, 0));
    }
    this.cena.checkpoint = { x: this.xRenascer, y: CHAO_Y - 4, trecho: TRECHO_ARENA, ordem: TRECHO_ARENA * 100 + 90 };
    this.estado = 'lutando';
    this.esperaAtaque = CHEFAO.INTERVALO_ATAQUE_MS;
    this.barraFundo.setVisible(true);
    this.barraVida.setVisible(true);
    this.barraTexto.setVisible(true);
    this.desenharBarra();
    this.cena.cameras.main.shake(400, 0.008);
  }

  /** Repõe recicláveis temporários longe do monstro e do contêiner. */
  private reporMunicao(delta: number): void {
    this.esperaMunicao -= delta;
    if (this.esperaMunicao > 0) return;
    this.esperaMunicao = CHEFAO.MUNICAO_INTERVALO_MS;
    const min = this.offset + ARENA.INICIO + 64;
    const max = this.offset + ARENA.CONTEINER - 96;
    const naArena = this.cena.quedas.disponiveis.filter((r) => r.x >= min && r.x <= max).length;
    if (naArena >= CHEFAO.MUNICAO_MINIMA) return;
    for (let tentativa = 0; tentativa < 8; tentativa++) {
      const x = Phaser.Math.Between(min, max);
      if (Math.abs(x - this.x) < HITBOX.LARGURA) continue;
      const tipo = TIPOS_RECICLAVEIS[Phaser.Math.Between(0, TIPOS_RECICLAVEIS.length - 1)];
      this.cena.quedas.largar(tipo, x);
      return;
    }
  }

  /* =========================================================================
   * LUTA
   * ========================================================================= */

  private lutar(delta: number): void {
    const jogador = this.cena.jogador;
    if (this.preparo > 0) {
      this.preparo -= delta;
      if (this.preparo <= 0) this.atacar(ORDEM_ATAQUES[this.proximoAtaque]);
      return;
    }
    // Anda atrás do jogador, dentro da faixa
    const alvo = Phaser.Math.Clamp(jogador.x, this.offset + ARENA.MONSTRO_MIN, this.offset + ARENA.MONSTRO_MAX);
    const dx = alvo - this.x;
    if (Math.abs(dx) > 40) this.x += Math.sign(dx) * CHEFAO.VELOCIDADE * this.lentidao * (delta / 1000);

    this.esperaAtaque -= delta;
    if (this.esperaAtaque <= 0) {
      this.esperaAtaque = CHEFAO.INTERVALO_ATAQUE_MS / this.lentidao;
      this.preparo = CHEFAO.PREPARO_MS;
    }
  }

  private atacar(ataque: Ataque): void {
    this.proximoAtaque = (this.proximoAtaque + 1) % ORDEM_ATAQUES.length;
    if (ataque === 'sucata') this.jogarSucata();
    else if (ataque === 'faiscas') this.soltarFaiscas();
    else this.prepararChoque();
  }

  /** Encostar no monstro vivo tira 1 bateria. */
  private tocarJogador(): void {
    const c = this.cena.jogador.corpo;
    const meio = HITBOX.LARGURA / 2 + 6;
    if (c.right > this.x - meio && c.left < this.x + meio && c.bottom > CHAO_Y - HITBOX.ALTURA - 6) this.aoAtingir(this.x);
  }

  /** Sucata em arco: sai da boca e cai onde o jogador está agora. */
  private jogarSucata(): void {
    const jogador = this.cena.jogador;
    const x0 = this.x;
    const y0 = CHAO_Y - 120;
    const t = CHEFAO.SUCATA_VOO_MS / 1000;
    const vx = (jogador.x - x0) / t;
    const vy = (jogador.y - 40 - y0 - 0.5 * CHEFAO.SUCATA_GRAVIDADE * t * t) / t;
    const img = this.cena.add.image(x0, y0, 'lx-monstro-sucata').setScale(ESCALA).setDepth(PROF.escuro + 1);
    this.sucatas.push({ img, x: x0, y: y0, vx, vy });
  }

  private atualizarSucatas(delta: number): void {
    const s = delta / 1000;
    const c = this.cena.jogador.corpo;
    for (let i = this.sucatas.length - 1; i >= 0; i--) {
      const p = this.sucatas[i];
      p.vy += CHEFAO.SUCATA_GRAVIDADE * s;
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.img.setPosition(grade(p.x), grade(p.y)).setAngle(p.img.angle + 360 * s);
      const acertou = p.x > c.left && p.x < c.right && p.y > c.top && p.y < c.bottom;
      if (acertou) this.aoAtingir(p.x);
      // Atravessa o próprio monstro; para em qualquer outro sólido ou no chão
      const noMonstro = Math.abs(p.x - this.x) < HITBOX.LARGURA / 2 && p.y > CHAO_Y - HITBOX.ALTURA;
      if (acertou || p.y >= CHAO_Y || (!noMonstro && this.cena.solidoEm(p.x, p.y))) {
        this.estilhacos(p.x, Math.min(p.y, CHAO_Y), [COR.sucataClara, COR.cobre], 5);
        p.img.destroy();
        this.sucatas.splice(i, 1);
      }
    }
  }

  /** Faíscas no chão em volta do jogador (perigo por alguns segundos). */
  private soltarFaiscas(): void {
    const centro = this.cena.jogador.x;
    const min = this.offset + ARENA.INICIO + 32;
    const max = this.offset + ARENA.FIM - 32;
    for (let i = 0; i < CHEFAO.FAISCAS; i++) {
      const x = grade(Phaser.Math.Clamp(centro + (i - (CHEFAO.FAISCAS - 1) / 2) * CHEFAO.FAISCA_ESPACO, min, max));
      const img = this.cena.add
        .sprite(x, CHAO_Y, 'lx-faisca', 0)
        .setOrigin(0.5, 1)
        .setScale(ESCALA)
        .setDepth(PROF.escuro + 1)
        .play('lx-faisca-chiado');
      this.cena.cenario.clima.registrarLuz(img, 'faisca');
      this.faiscas.push({ img, restante: CHEFAO.FAISCA_MS });
      this.estilhacos(x, CHAO_Y - 8, [COR.bateriaAmarela, COR.perigo], 3);
    }
  }

  private atualizarFaiscas(delta: number): void {
    const c = this.cena.jogador.corpo;
    for (let i = this.faiscas.length - 1; i >= 0; i--) {
      const f = this.faiscas[i];
      f.restante -= delta;
      if (f.restante <= 0) {
        f.img.destroy();
        this.faiscas.splice(i, 1);
        continue;
      }
      if (f.restante < 600) f.img.setVisible(Math.floor(f.restante / 100) % 2 === 0);
      const meio = (f.img.displayWidth / 2) * 0.8;
      if (f.img.x + meio > c.left && f.img.x - meio < c.right && f.img.y - f.img.displayHeight < c.bottom && f.img.y > c.top) {
        this.aoAtingir(f.img.x);
      }
    }
  }

  /** Choque no chão: faixa piscando sob o jogador e, depois do aviso, dano a quem estiver no chão. */
  private prepararChoque(): void {
    const largura = CHEFAO.CHOQUE_MEIA_LARGURA * 2;
    const x = grade(
      Phaser.Math.Clamp(this.cena.jogador.x, this.offset + ARENA.INICIO + largura / 2, this.offset + ARENA.FIM - largura / 2)
    );
    const faixa = this.cena.add
      .rectangle(x, CHAO_Y - ESCALA, largura, ESCALA * 2, hexNum(COR.perigo))
      .setDepth(PROF.escuro + 1)
      .setAlpha(0.8);
    this.choques.push({ faixa, x, tempo: 0 });
  }

  private atualizarChoques(delta: number): void {
    const jogador = this.cena.jogador;
    for (let i = this.choques.length - 1; i >= 0; i--) {
      const ch = this.choques[i];
      ch.tempo += delta;
      if (ch.tempo < CHEFAO.CHOQUE_AVISO_MS) {
        // Aviso: pisca cada vez mais rápido
        const passo = ch.tempo < CHEFAO.CHOQUE_AVISO_MS / 2 ? 150 : 70;
        ch.faixa.setVisible(Math.floor(ch.tempo / passo) % 2 === 0);
        continue;
      }
      if (ch.tempo - delta < CHEFAO.CHOQUE_AVISO_MS) {
        // Começo do choque: faixa alta e cheia, tremor curto
        ch.faixa.setVisible(true).setAlpha(1).setSize(CHEFAO.CHOQUE_MEIA_LARGURA * 2, ESCALA * 6).setY(CHAO_Y - ESCALA * 3);
        ch.faixa.setFillStyle(hexNum(COR.bateriaAmarela));
        this.cena.cameras.main.shake(150, 0.004);
      }
      const noChao = jogador.corpo.blocked.down || jogador.corpo.touching.down;
      if (noChao && Math.abs(jogador.x - ch.x) < CHEFAO.CHOQUE_MEIA_LARGURA) this.aoAtingir(ch.x);
      if (ch.tempo >= CHEFAO.CHOQUE_AVISO_MS + CHEFAO.CHOQUE_ATIVO_MS) {
        ch.faixa.destroy();
        this.choques.splice(i, 1);
      }
    }
  }

  /* =========================================================================
   * DERROTA E COMPACTAÇÃO
   * ========================================================================= */

  private derrotar(): void {
    this.estado = 'derrotado';
    this.preparo = 0;
    for (const c of this.choques) c.faixa.destroy();
    this.choques.length = 0;
    this.cena.cameras.main.shake(300, 0.01);
    this.estilhacos(this.x, CHAO_Y - 100, [COR.sucataClara, COR.cobre, COR.verdePlaca], 12);
  }

  /** Derrotado: andar contra ele o empurra; ao chegar no contêiner, é compactado. */
  private empurrar(delta: number): void {
    const c = this.cena.jogador.corpo;
    const encostado = (lado: 'left' | 'right') => c.blocked[lado] || c.touching[lado];
    const passo = CHEFAO.VELOCIDADE_EMPURRAO * (delta / 1000);
    if (this.cena.jogador.x < this.x && encostado('right')) this.x += passo;
    else if (this.cena.jogador.x > this.x && encostado('left')) this.x = Math.max(this.offset + ARENA.MONSTRO_MIN, this.x - passo);

    const bordaConteiner = this.conteiner.x - (CONTEINER_W * ESCALA) / 2;
    if (this.x + HITBOX.LARGURA / 2 >= bordaConteiner + 8) this.compactar();
  }

  private compactar(): void {
    this.estado = 'compactado';
    this.cena.solidos.remove(this.solido, true, true);
    for (const l of this.luzes) l.y = -9999;
    this.barraFundo.setVisible(false);
    this.barraVida.setVisible(false);
    this.barraTexto.setVisible(false);
    this.cena.tweens.add({
      targets: this.corpo,
      x: this.conteiner.x,
      scaleX: ESCALA * 0.5,
      scaleY: ESCALA * 0.15,
      duration: CHEFAO.COMPACTAR_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.corpo.setVisible(false);
        this.cena.cameras.main.shake(350, 0.012);
        this.estilhacos(this.conteiner.x, CHAO_Y - CONTEINER_H * ESCALA, [COR.sucataClara, COR.cobre, COR.verdePlacaClaro], 14);
        this.cena.tweens.add({ targets: this.conteiner, scaleY: { from: ESCALA * 0.85, to: ESCALA }, duration: 300, ease: 'Back.easeOut' });
        this.aoCompactar?.();
      },
    });
  }

  /** Final: o Recicla entra no meio da arena e pula comemorando. */
  comemorar(): void {
    if (this.recicla) return;
    const x = grade(this.offset + ARENA.RECICLA);
    const corpo = this.cena.add.image(x, CHAO_Y, 'lx-recicla-0').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.objetos + 1);
    const olhos = this.cena.add.image(x, CHAO_Y, 'lx-recicla-olhos').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.escuro + 1);
    this.recicla = [corpo, olhos];
    this.cena.tweens.add({ targets: this.recicla, y: CHAO_Y - 48, duration: 260, ease: 'Quad.easeOut', yoyo: true, repeat: -1, repeatDelay: 120 });
    this.cena.time.addEvent({
      delay: 760,
      loop: true,
      callback: () => this.recicla?.forEach((img) => img.setFlipX(!img.flipX)),
    });
  }

  /* =========================================================================
   * DESENHO
   * ========================================================================= */

  private posicionar(): void {
    if (this.estado === 'compactado') return;
    this.x = Phaser.Math.Clamp(this.x, this.offset + ARENA.MONSTRO_MIN, this.offset + ARENA.CONTEINER);
    const x = grade(this.x);
    const boca = this.estado === 'lutando' && this.preparo > 0;
    const quadro = this.derrotado ? 'lx-monstro-derrotado' : boca ? 'lx-monstro-1' : 'lx-monstro-0';
    this.corpo.setTexture(quadro).setPosition(x, CHAO_Y);
    if (this.estado === 'lutando') this.corpo.setFlipX(this.cena.jogador.x > this.x);
    // Tremor ao preparar um ataque
    if (boca) this.corpo.setX(x + (Math.floor(this.preparo / 50) % 2 === 0 ? ESCALA : -ESCALA));
    this.solido.setPosition(x, CHAO_Y - HITBOX.ALTURA / 2);
    (this.solido.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.luzes.forEach((l) => (l.x = x + l.dx));
  }

  private criarBarra(): void {
    const x = LARGURA_TELA / 2 - BARRA.LARGURA / 2;
    this.barraFundo = this.cena.add.graphics().setScrollFactor(0).setDepth(9998).setVisible(false);
    this.barraFundo.fillStyle(hexNum(COR.contorno), 1).fillRect(x - 4, BARRA.Y - 4, BARRA.LARGURA + 8, BARRA.ALTURA + 8);
    this.barraFundo.fillStyle(hexNum(COR.sombraSucata), 1).fillRect(x, BARRA.Y, BARRA.LARGURA, BARRA.ALTURA);
    this.barraVida = this.cena.add.graphics().setScrollFactor(0).setDepth(9998).setVisible(false);
    this.barraTexto = this.cena.add
      .text(LARGURA_TELA / 2, BARRA.Y + BARRA.ALTURA / 2, '', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        color: COR.luz,
        stroke: COR.contorno,
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9998)
      .setVisible(false);
  }

  private desenharBarra(): void {
    if (!this.barraVida) return;
    const x = LARGURA_TELA / 2 - BARRA.LARGURA / 2;
    this.barraVida.clear();
    if (this.derrotado) {
      // Vida zerada: a barra inteira vira o aviso de empurrar
      this.barraVida.fillStyle(hexNum(COR.verdePlaca), 1).fillRect(x, BARRA.Y, BARRA.LARGURA, BARRA.ALTURA);
      this.barraTexto.setText('EMPURRE ATÉ O CONTÊINER!');
      return;
    }
    const fracao = Math.max(0, this.vida) / CHEFAO.VIDA;
    this.barraVida.fillStyle(hexNum(COR.perigo), 1).fillRect(x, BARRA.Y, Math.round(BARRA.LARGURA * fracao), BARRA.ALTURA);
    this.barraVida.fillStyle(hexNum(COR.luz), 0.25).fillRect(x, BARRA.Y, Math.round(BARRA.LARGURA * fracao), 4);
    this.barraTexto.setText('MONSTRO DE SUCATA');
  }

  /** Pedaços de um pixel de arte espirrando para cima e caindo. */
  private estilhacos(x: number, y: number, cores: readonly string[], quantidade: number): void {
    for (let i = 0; i < quantidade; i++) {
      const caco = this.cena.add.rectangle(x, y, ESCALA, ESCALA, hexNum(cores[i % cores.length])).setDepth(PROF.escuro + 1);
      const angulo = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const d = 40 + Math.random() * 60;
      this.cena.tweens.add({
        targets: caco,
        x: grade(x + Math.cos(angulo) * d),
        y: grade(y + Math.sin(angulo) * d * 0.6 + 30),
        alpha: 0,
        duration: 350 + Math.random() * 250,
        ease: 'Quad.easeOut',
        onComplete: () => caco.destroy(),
      });
    }
  }

  private gerarTexturas(): void {
    texturaPixel(this.cena, 'lx-monstro-0', MONSTRO_W, MONSTRO_H, (p) => desenharMonstro(p, 'normal'));
    texturaPixel(this.cena, 'lx-monstro-1', MONSTRO_W, MONSTRO_H, (p) => desenharMonstro(p, 'boca'));
    texturaPixel(this.cena, 'lx-monstro-derrotado', MONSTRO_W, MONSTRO_H, (p) => desenharMonstro(p, 'derrotado'));
    texturaPixel(this.cena, 'lx-monstro-sucata', 7, 6, (p) => {
      p.caixa(0, 0, 7, 6, COR.sucataClara);
      p.px(1, 1, 3, 2, COR.cobre);
      p.ponto(4, 3, COR.sombraSucata);
    });
    texturaPixel(this.cena, 'lx-conteiner', CONTEINER_W, CONTEINER_H, desenharConteiner);
  }
}

/**
 * Monstro de Sucata em 48x40, olhando para a esquerda: um amontoado de chapas, placas e
 * canos de cobre com dois olhos de perigo e uma bocarra de grade. `boca` abre a mandíbula
 * (prepara ataque); `derrotado` apaga os olhos e entorta o corpo para baixo.
 */
function desenharMonstro(p: Pincel, pose: 'normal' | 'boca' | 'derrotado'): void {
  const caido = pose === 'derrotado' ? 3 : 0;
  // Corpo: monte arredondado de sucata
  for (let y = 4 + caido; y < 36; y++) {
    const meia = Math.round(10 + (y - 4 - caido) * 0.5);
    const cx = 24;
    p.px(cx - meia - 1, y, meia * 2 + 2, 1, COR.contorno);
    p.px(cx - meia, y, meia * 2, 1, y < 14 + caido ? COR.sucataClara : COR.sucata);
  }
  // Chapas de cobre e uma placa de circuito no peito
  p.caixa(28, 14 + caido, 10, 6, COR.cobre);
  p.px(29, 15 + caido, 8, 1, COR.cobreClaro);
  p.caixa(14, 22 + caido, 12, 8, COR.verdePlaca);
  p.px(16, 24 + caido, 8, 1, COR.cobreClaro);
  p.px(18, 26 + caido, 1, 3, COR.cobreClaro);
  p.px(21, 25 + caido, 1, 4, COR.verdePlacaClaro);
  p.caixa(34, 24 + caido, 8, 6, COR.cobreEscuro);
  // Canos saindo das costas
  p.caixa(36, 2 + caido, 3, 8, COR.cobre);
  p.caixa(40, 6 + caido, 3, 7, COR.cobreEscuro);
  // Olhos
  const corOlho = pose === 'derrotado' ? COR.sombraSucata : COR.perigo;
  p.caixa(12, 9 + caido, 6, 4, corOlho);
  p.caixa(20, 9 + caido, 5, 4, corOlho);
  if (pose !== 'derrotado') {
    p.ponto(13, 10, COR.luz);
    p.ponto(21, 10, COR.luz);
  }
  // Boca de grade: fechada ou escancarada
  const altura = pose === 'boca' ? 6 : 2;
  p.px(8, 15 + caido, 16, altura + 2, COR.contorno);
  for (let x = 9; x < 23; x += 3) p.px(x, 16 + caido, 1, altura, COR.sucataClara);
  // Pés de esteira
  p.caixa(6, 35, 16, 5, COR.sombraSucata);
  p.caixa(26, 35, 16, 5, COR.sombraSucata);
  for (let x = 8; x < 40; x += 3) p.ponto(x, 37, COR.sucataClara);
}

/** Contêiner de reciclagem 26x20: caçamba verde com tampa e o símbolo de três setas. */
function desenharConteiner(p: Pincel): void {
  p.caixa(1, 4, 24, 16, COR.verdePlaca);
  p.px(2, 5, 22, 1, COR.verdePlacaClaro);
  p.caixa(0, 1, 26, 4, COR.verdePlacaEscuro);
  p.px(1, 0, 24, 1, COR.contorno);
  // Símbolo: três setas em triângulo
  p.px(11, 8, 4, 1, COR.luz);
  p.px(9, 10, 1, 3, COR.luz);
  p.px(16, 10, 1, 3, COR.luz);
  p.px(10, 14, 6, 1, COR.luz);
  // Rodas
  p.caixa(3, 18, 4, 2, COR.contorno);
  p.caixa(19, 18, 4, 2, COR.contorno);
}
