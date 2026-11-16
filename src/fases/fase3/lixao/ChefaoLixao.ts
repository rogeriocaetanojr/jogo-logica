import Phaser from 'phaser';
import type { CenaFase3 } from '../CenaFase3';
import { PROF } from '../trechos/TrechoLixao';
import { COR_LINHA, COR_LINHA_APAGADA, TelaoAviso } from './TelaoAviso';
import { COR, ESCALA, grade, hexNum, texturaPixel } from './ArteLixao';
import type { Pincel } from './ArteLixao';
import { ALTURA_TELA, CHAO_Y, LARGURA_TELA, TIPOS_RECICLAVEIS } from './TiposLixao';
import { GARRA_ARREMESSO, QUADRO_MONSTRO, SUCATAS_MONSTRO, gerarTexturasMonstro } from './ArteMonstroLixao';

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
  VIDA: 12,
  /** Velocidade de andar atrás do jogador (px/s), multiplicada pelo fator de lentidão. */
  VELOCIDADE: 70,
  /** Cada acerto multiplica o fator de lentidão por isto, até o mínimo. */
  LENTIDAO_POR_ACERTO: 0.92,
  LENTIDAO_MINIMA: 0.45,
  /** Intervalo entre ataques com o fator 1 (cresce conforme ele fica lento). */
  INTERVALO_ATAQUE_MS: 2600,
  /** Depois de cada ataque ele fica tonto: só leva dano nessa janela. */
  TONTO_MS: 2600,
  /** Folga extra (px) em volta da hitbox para o acerto valer enquanto tonto. */
  MARGEM_ACERTO: 56,
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
  CHOQUE_AVISO_MS: 1200,
  CHOQUE_ATIVO_MS: 350,
  /** Empurrar o monstro derrotado (px/s). */
  VELOCIDADE_EMPURRAO: 90,
  /** Entrada na arena: câmera indo até o monstro, ele acordando e o começo da luta (ms). */
  ENTRADA_PAN_MS: 1400,
  ENTRADA_ACORDA_MS: 900,
  ENTRADA_FIM_MS: 2900,
  /** Investida ao arremessar: quanto avança (px) e quanto dura a pose de arremesso. */
  INVESTIDA: 18,
  POSE_ARREMESSO_MS: 380,
  POSE_DOR_MS: 260,
  /** Intervalo entre os passos da esteira e o arrasto ao ser empurrado (som). */
  PASSO_MS: 420,
  ARRASTO_MS: 240,
  /** Fumaça da chaminé. */
  FUMACA_MS: 900,
  /** Recicláveis na arena: a cada intervalo, repõe até haver este mínimo no chão. */
  MUNICAO_INTERVALO_MS: 1800,
  MUNICAO_MINIMA: 4,
  /** Compactação no contêiner e espera até a vitória. */
  COMPACTAR_MS: 900,
} as const;

/** Hitbox do monstro (px de mundo). */
const HITBOX = { LARGURA: 160, ALTURA: 140 } as const;
const CONTEINER_W = 26;
const CONTEINER_H = 20;

/** Telão no céu da arena com o passo a passo para derrotar o monstro. */
const PASSOS = ['PEGUE UM RECICLÁVEL [F]', 'ESPERE ELE FICAR TONTO  * * *', 'ARREMESSE NELE!'] as const;

/**
 * Falas curtas do monstro (balão acima dele). Cada grupo tem a chance de sair quando o
 * momento acontece; entre duas falas há um intervalo mínimo para não virar tagarelice.
 */
const FALAS = {
  acordar: { chance: 1, linhas: ['Quem mexeu no meu lixo?'] },
  voltou: { chance: 1, linhas: ['Voltou? Tem sucata pra todo mundo.', 'De novo? Eu não enferrujo.'] },
  preparo: { chance: 0.3, linhas: ['Toma sucata!', 'Pega essa!', 'Tem mais de onde veio.'] },
  dor: { chance: 0.45, linhas: ['Ai! Minha lataria!', 'Isso amassa, sabia?', 'Ei! Sem reciclar!'] },
  quica: { chance: 0.6, linhas: ['Nem fez cosquinha.', 'Espera eu ficar tonto, ué.'] },
  tonto: { chance: 0.35, linhas: ['Tudo... girando...', 'Meus parafusos...'] },
  metade: { chance: 1, linhas: ['Para de me jogar coisas!'] },
  derrotado: { chance: 1, linhas: ['Tá bom... pode me levar.'] },
} as const;
type Fala = keyof typeof FALAS;
const FALA = { DURACAO_MS: 2200, INTERVALO_MS: 3800, ACIMA: HITBOX.ALTURA + 96 } as const;

/** Barra de vida no topo da tela. */
const BARRA = { LARGURA: 520, ALTURA: 22, Y: 20 } as const;

type Ataque = 'sucata' | 'faiscas' | 'choque';
/** Só a sucata em arco: faíscas e choque no chão foram tirados para a luta ficar mais justa. */
const ORDEM_ATAQUES: readonly Ataque[] = ['sucata'];

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
 * choque no chão com aviso piscando. Depois de cada ataque fica tonto por um tempo, e só aí
 * cada reciclável que acerta (com folga extra na mira) tira 1 de vida e o deixa mais
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
  /** Tempo até ficar tonto (o ataque ainda está acontecendo) e tempo restante tonto. */
  private atrasoTonto = 0;
  private tonto = 0;
  private estrelas!: Phaser.GameObjects.Text;
  private passos: Phaser.GameObjects.Text[] = [];
  /** Setas pulando sobre os recicláveis da arena. */
  private readonly setas: Phaser.GameObjects.Text[] = [];
  private arenaTravada = false;
  /** Entrada em andamento (câmera indo até o monstro, que ainda está acordando). */
  private entrando = false;
  /** Pose forçada por um tempo (arremesso, dor) e o avanço da investida (tween). */
  private poseForcada: number | null = null;
  private poseAte = 0;
  private readonly visual = { avanco: 0 };
  private andando = false;
  private esperaPasso = 0;
  private esperaArrasto = 0;
  private esperaFumaca = 0;
  private xAnterior = 0;
  private balao!: Phaser.GameObjects.Text;
  private ultimaFala = -Infinity;
  private falouMetade = false;
  private zz!: Phaser.GameObjects.Text;

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

    this.corpo = this.cena.add.image(0, CHAO_Y, 'lx-monstro', QUADRO_MONSTRO.DORMINDO).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.objetos + 2);
    this.solido = this.cena.add.rectangle(0, CHAO_Y - HITBOX.ALTURA / 2, HITBOX.LARGURA, HITBOX.ALTURA, 0, 0);
    this.cena.solidos.add(this.solido);
    for (const dx of [-56, 0, 56]) {
      const luz = { x: 0, y: CHAO_Y - 90, dx };
      this.luzes.push(luz);
      this.cena.cenario.clima.registrarLuz(luz, 'led');
    }

    this.estrelas = this.cena.add
      .text(0, CHAO_Y - HITBOX.ALTURA - 24, '* * *', { fontFamily: 'monospace', fontSize: '22px', color: '#ffe14d' })
      .setOrigin(0.5)
      .setDepth(PROF.escuro + 2)
      .setVisible(false);

    this.balao = this.cena.add
      .text(0, 0, '', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '16px',
        color: COR.contorno,
        backgroundColor: '#F2E6C8',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setDepth(PROF.textos)
      .setVisible(false);
    this.zz = this.cena.add
      .text(0, 0, 'z Z', { fontFamily: 'monospace', fontSize: '20px', color: COR.ceuPoeiraClaro, stroke: COR.contorno, strokeThickness: 4 })
      .setOrigin(0.5, 1)
      .setDepth(PROF.escuro + 2);

    this.criarMonitor();
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
    this.atrasoTonto = 0;
    this.tonto = 0;
    this.estado = this.arenaTravada ? 'lutando' : 'dormindo';
    this.poseForcada = null;
    this.visual.avanco = 0;
    this.falouMetade = false;
    this.cena.tweens.killTweensOf(this.visual);
    if (this.arenaTravada) this.cena.time.delayedCall(900, () => this.falar('voltou', true));
    else this.balao?.setVisible(false);
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

  /** Meio da carcaça durante a luta (alvo da mira pelo teclado). */
  get alvo(): { x: number; y: number } | null {
    return this.estado === 'lutando' ? { x: this.x, y: CHAO_Y - HITBOX.ALTURA * 0.55 } : null;
  }

  /** Reciclável em voo em (x, y) acerta o monstro? Tira vida e o deixa mais lento. */
  atingir(x: number, y: number): boolean {
    if (this.estado === 'compactado') return false;
    const margem = this.tonto > 0 ? CHEFAO.MARGEM_ACERTO : 0;
    const meio = HITBOX.LARGURA / 2 + margem;
    if (Math.abs(x - this.x) > meio || y < CHAO_Y - HITBOX.ALTURA - margem || y > CHAO_Y) return false;
    if (this.estado !== 'lutando') return true;
    if (this.tonto <= 0) {
      // Fora da janela de tontura o lixo só quica na carcaça
      this.estilhacos(x, y, [COR.sucataClara], 3);
      this.cena.som.monstroQuica(this.x);
      this.falar('quica');
      return true;
    }
    this.vida -= 1;
    this.cena.som.monstroAcertado(this.x);
    this.forcarPose(QUADRO_MONSTRO.DOR, CHEFAO.POSE_DOR_MS);
    if (!this.falouMetade && this.vida <= CHEFAO.VIDA / 2 && this.vida > 0) {
      this.falouMetade = true;
      this.falar('metade', true);
    } else if (this.vida > 0) this.falar('dor');
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
    this.atualizarEnfeites(delta);
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
    this.atualizarMonitor();
    this.atualizarSetas();
  }

  /* =========================================================================
   * TELÃO E SETAS
   * ========================================================================= */

  /** Telão no céu da arena mostrando como vencer (o passo atual pisca). */
  private criarMonitor(): void {
    const cx = this.offset + ARENA.INICIO + LARGURA_TELA / 2;
    this.passos = new TelaoAviso(this.cena, cx, {
      titulo: 'COMO DERROTAR O MONSTRO',
      linhas: PASSOS.map((p, i) => ` ${i + 1}. ${p}`),
    }).linhas;
  }

  /** Destaca no telão o passo que o jogador precisa fazer agora. */
  private atualizarMonitor(): void {
    let atual = 0;
    if (this.derrotado) atual = -1;
    else if (this.cena.arremesso?.itemNaMao) atual = this.tonto > 0 ? 2 : 1;
    const pisca = Math.floor(this.cena.time.now / 300) % 2 === 0;
    this.passos.forEach((t, i) => {
      const ativo = i === atual;
      t.setText(`${ativo ? '>' : ' '}${i + 1}. ${PASSOS[i]}`);
      t.setColor(ativo ? (pisca ? '#ffffff' : COR_LINHA) : COR_LINHA_APAGADA).setAlpha(ativo ? 1 : 0.7);
    });
    if (atual === -1) {
      this.passos[0].setText(' VENCEU! EMPURRE ELE ATÉ').setColor('#ffffff').setAlpha(1);
      this.passos[1].setText(' O CONTÊINER DE RECICLAGEM').setColor('#ffffff').setAlpha(1);
      this.passos[2].setText('').setAlpha(0);
    }
  }

  /** Setas amarelas pulando em cima de cada reciclável da arena (enquanto de mãos vazias). */
  private atualizarSetas(): void {
    const mostrar = this.arenaTravada && this.estado === 'lutando' && !this.cena.arremesso?.itemNaMao;
    const min = this.offset + ARENA.INICIO;
    const max = this.offset + ARENA.FIM;
    const alvos = mostrar ? this.cena.quedas.disponiveis.filter((r) => r.x >= min && r.x <= max) : [];
    while (this.setas.length < alvos.length) {
      this.setas.push(
        this.cena.add
          .text(0, 0, '▼', { fontFamily: 'monospace', fontSize: '26px', color: '#ffe14d', stroke: '#1A1210', strokeThickness: 5 })
          .setOrigin(0.5, 1)
          .setDepth(PROF.escuro + 2)
      );
    }
    const pulo = Math.abs(Math.sin(this.cena.time.now / 180)) * 10;
    this.setas.forEach((seta, i) => {
      const r = alvos[i];
      seta.setVisible(!!r);
      if (r) seta.setPosition(grade(r.x), grade(r.y - 44 - pulo));
    });
  }

  /* =========================================================================
   * ARENA
   * ========================================================================= */

  /**
   * Entrada na arena sem tranco: fecha as bordas e muda o checkpoint, pausa a física, leva a
   * câmera devagar até a arena, o monstro acorda (olhos piscando, ronco e um tremor leve), fala
   * e a barra de vida aparece; só então a câmera trava na arena e a luta começa.
   */
  private travarArena(): void {
    this.arenaTravada = true;
    this.entrando = true;
    const inicio = this.offset + ARENA.INICIO;
    // Paredes invisíveis do topo da tela ao chão nas duas bordas
    for (const x of [inicio - 16, this.offset + ARENA.FIM + 16]) {
      this.cena.solidos.add(this.cena.add.rectangle(x, CHAO_Y / 2, 32, CHAO_Y, 0, 0));
    }
    this.cena.checkpoint = { x: this.xRenascer, y: CHAO_Y - 4, trecho: TRECHO_ARENA, ordem: TRECHO_ARENA * 100 + 90 };
    const cam = this.cena.cameras.main;
    this.cena.definirCinematica(true);
    cam.stopFollow();
    cam.pan(inicio + LARGURA_TELA / 2, cam.midPoint.y, CHEFAO.ENTRADA_PAN_MS, 'Sine.easeInOut');
    const tempo = this.cena.time;
    // Acordando: olhos piscam entre fechado e aberto e ele se ergue
    tempo.delayedCall(CHEFAO.ENTRADA_ACORDA_MS, () => {
      this.zz.setVisible(false);
      this.cena.som.monstroAcorda(this.x);
      [0, 140, 260, 420].forEach((ms, i) =>
        tempo.delayedCall(ms, () => this.corpo.setFrame(i % 2 === 0 ? QUADRO_MONSTRO.ANDAR[0] : QUADRO_MONSTRO.DORMINDO))
      );
      tempo.delayedCall(560, () => {
        this.corpo.setFrame(QUADRO_MONSTRO.PREPARO);
        this.cena.tweens.add({ targets: this.corpo, scaleY: { from: ESCALA * 0.92, to: ESCALA }, duration: 320, ease: 'Back.easeOut' });
        cam.shake(220, 0.003);
      });
      tempo.delayedCall(900, () => {
        this.corpo.setFrame(QUADRO_MONSTRO.ANDAR[0]);
        this.falar('acordar', true);
        for (const barra of [this.barraFundo, this.barraVida, this.barraTexto]) {
          barra.setVisible(true).setAlpha(0);
          this.cena.tweens.add({ targets: barra, alpha: 1, duration: 500 });
        }
        this.desenharBarra();
      });
    });
    tempo.delayedCall(CHEFAO.ENTRADA_FIM_MS, () => {
      cam.setBounds(inicio, 0, LARGURA_TELA, ALTURA_TELA);
      cam.startFollow(this.cena.jogador.sprite, true, 0.08, 0.08);
      this.entrando = false;
      this.estado = 'lutando';
      this.esperaAtaque = CHEFAO.INTERVALO_ATAQUE_MS;
      this.cena.definirCinematica(false);
    });
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
    if (this.atrasoTonto > 0) {
      this.atrasoTonto -= delta;
      if (this.atrasoTonto <= 0) {
        this.tonto = CHEFAO.TONTO_MS;
        this.cena.som.monstroTonto(this.x);
        this.falar('tonto');
      }
    }
    if (this.tonto > 0) {
      // Tonto: parado, sem atacar, esperando apanhar
      this.tonto -= delta;
      return;
    }
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
      // Ergue a sucata acima da cabeça encolhendo o corpo, como quem toma impulso
      this.cena.som.monstroPreparo(this.x);
      this.cena.tweens.add({ targets: this.corpo, scaleY: { from: ESCALA, to: ESCALA * 0.94 }, scaleX: { from: ESCALA, to: ESCALA * 1.04 }, duration: CHEFAO.PREPARO_MS, ease: 'Sine.easeOut' });
      this.falar('preparo');
    }
  }

  private atacar(ataque: Ataque): void {
    this.proximoAtaque = (this.proximoAtaque + 1) % ORDEM_ATAQUES.length;
    // Investida curta para a frente, esticando o braço, e volta
    this.forcarPose(QUADRO_MONSTRO.ARREMESSO, CHEFAO.POSE_ARREMESSO_MS);
    this.cena.tweens.killTweensOf(this.visual);
    this.cena.tweens.add({ targets: this.visual, avanco: { from: 0, to: CHEFAO.INVESTIDA }, duration: 110, ease: 'Quad.easeOut', yoyo: true, hold: 120 });
    this.cena.tweens.add({ targets: this.corpo, scaleY: ESCALA, scaleX: ESCALA, duration: 120, ease: 'Back.easeOut' });
    if (ataque === 'sucata') this.cena.som.monstroArremesso(this.x);
    if (ataque === 'sucata') this.jogarSucata();
    else if (ataque === 'faiscas') this.soltarFaiscas();
    else this.prepararChoque();
    // Fica tonto quando o ataque termina
    this.atrasoTonto =
      ataque === 'sucata' ? CHEFAO.SUCATA_VOO_MS : ataque === 'faiscas' ? 500 : CHEFAO.CHOQUE_AVISO_MS + CHEFAO.CHOQUE_ATIVO_MS;
  }

  /** Encostar no monstro vivo tira 1 bateria. */
  private tocarJogador(): void {
    if (this.tonto > 0) return;
    const c = this.cena.jogador.corpo;
    const meio = HITBOX.LARGURA / 2 + 6;
    if (c.right > this.x - meio && c.left < this.x + meio && c.bottom > CHAO_Y - HITBOX.ALTURA - 6) this.aoAtingir(this.x);
  }

  /** Sucata em arco: sai da garra esticada e cai onde o jogador está agora. */
  private jogarSucata(): void {
    const jogador = this.cena.jogador;
    const lado = jogador.x > this.x ? 1 : -1;
    const x0 = this.x - lado * GARRA_ARREMESSO.DX * ESCALA;
    const y0 = CHAO_Y - GARRA_ARREMESSO.ALTURA * ESCALA;
    const t = CHEFAO.SUCATA_VOO_MS / 1000;
    const vx = (jogador.x - x0) / t;
    const vy = (jogador.y - 40 - y0 - 0.5 * CHEFAO.SUCATA_GRAVIDADE * t * t) / t;
    const img = this.cena.add
      .image(x0, y0, `lx-monstro-sucata-${Phaser.Math.Between(0, SUCATAS_MONSTRO - 1)}`)
      .setScale(ESCALA)
      .setDepth(PROF.escuro + 1);
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
        this.cena.som.sucataCai(p.x);
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
    this.cena.cameras.main.shake(300, 0.006);
    this.estilhacos(this.x, CHAO_Y - 100, [COR.sucataClara, COR.cobre, COR.verdePlaca], 12);
    this.cena.som.monstroDerrotado(this.x);
    this.poseForcada = null;
    this.cena.tweens.killTweensOf(this.visual);
    this.visual.avanco = 0;
    this.cena.time.delayedCall(700, () => this.falar('derrotado', true));
  }

  /** Derrotado: andar contra ele o empurra; ao chegar no contêiner, é compactado. */
  private empurrar(delta: number): void {
    const c = this.cena.jogador.corpo;
    const encostado = (lado: 'left' | 'right') => c.blocked[lado] || c.touching[lado];
    const passo = CHEFAO.VELOCIDADE_EMPURRAO * (delta / 1000);
    const antes = this.x;
    if (this.cena.jogador.x < this.x && encostado('right')) this.x += passo;
    else if (this.cena.jogador.x > this.x && encostado('left')) this.x = Math.max(this.offset + ARENA.MONSTRO_MIN, this.x - passo);
    this.esperaArrasto -= delta;
    if (this.x !== antes && this.esperaArrasto <= 0) {
      this.esperaArrasto = CHEFAO.ARRASTO_MS;
      this.cena.som.monstroArrasta(this.x);
    }

    const bordaConteiner = this.conteiner.x - (CONTEINER_W * ESCALA) / 2;
    if (this.x + HITBOX.LARGURA / 2 >= bordaConteiner + 8) this.compactar();
  }

  private compactar(): void {
    this.estado = 'compactado';
    this.balao.setVisible(false);
    this.cena.som.compactar(this.conteiner.x);
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
    const agora = this.cena.time.now;
    const boca = this.estado === 'lutando' && this.preparo > 0;
    const tontoAgora = this.estado === 'lutando' && this.tonto > 0;
    if (this.poseForcada !== null && agora >= this.poseAte) this.poseForcada = null;
    let quadro: number = QUADRO_MONSTRO.ANDAR[0];
    if (this.derrotado) quadro = QUADRO_MONSTRO.DERROTADO;
    else if (this.estado === 'dormindo') quadro = QUADRO_MONSTRO.DORMINDO;
    else if (this.poseForcada !== null) quadro = this.poseForcada;
    else if (tontoAgora) quadro = QUADRO_MONSTRO.TONTO[Math.floor(agora / 220) % 2];
    else if (boca) quadro = QUADRO_MONSTRO.PREPARO;
    else quadro = QUADRO_MONSTRO.ANDAR[Math.floor(agora / (this.andando ? 140 : 520)) % 2];
    if (!this.entrando) this.corpo.setFrame(quadro);
    const lado = this.corpo.flipX ? 1 : -1;
    // Andando a esteira sacode o corpo um pixel de arte
    const sacode = this.andando && !boca && !tontoAgora && Math.floor(agora / 140) % 2 === 0 ? ESCALA : 0;
    this.corpo.setPosition(x + lado * grade(this.visual.avanco), CHAO_Y - sacode);
    if (this.estado === 'lutando' && this.poseForcada === null) this.corpo.setFlipX(this.cena.jogador.x > this.x);
    // Tremor ao preparar um ataque
    if (boca) this.corpo.setX(x + (Math.floor(this.preparo / 50) % 2 === 0 ? ESCALA : -ESCALA));
    this.solido.setPosition(x, CHAO_Y - HITBOX.ALTURA / 2);
    (this.solido.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.luzes.forEach((l) => (l.x = x + l.dx));
    // Tonto: balança, fica amarelado e mostra estrelas girando
    const tonto = this.estado === 'lutando' && this.tonto > 0;
    this.estrelas.setVisible(tonto);
    if (tonto) {
      const t = this.cena.time.now;
      this.corpo.setAngle(Math.sin(t / 120) * 4).setTint(Math.floor(t / 200) % 2 === 0 ? 0xffffff : 0xfff2a0);
      this.estrelas.setPosition(x + Math.sin(t / 150) * 14, CHAO_Y - HITBOX.ALTURA - 24 + Math.cos(t / 150) * 4);
    } else if (this.estado === 'lutando') {
      this.corpo.clearTint();
      if (this.preparo <= 0 && this.corpo.angle !== 0 && !this.cena.tweens.isTweening(this.corpo)) this.corpo.setAngle(0);
    }
  }

  /** Segura uma pose (arremesso, dor) por um tempo, por cima da pose normal. */
  private forcarPose(quadro: number, ms: number): void {
    this.poseForcada = quadro;
    this.poseAte = this.cena.time.now + ms;
  }

  /**
   * Balão de fala curto acima do monstro. Sai com a chance do grupo e respeita o intervalo
   * entre falas; `sempre` ignora os dois (falas de momentos importantes).
   */
  private falar(fala: Fala, sempre = false): void {
    if (this.estado === 'compactado') return;
    const agora = this.cena.time.now;
    const grupo = FALAS[fala];
    if (!sempre && (agora - this.ultimaFala < FALA.INTERVALO_MS || Math.random() > grupo.chance)) return;
    this.ultimaFala = agora;
    const texto = grupo.linhas[Phaser.Math.Between(0, grupo.linhas.length - 1)];
    this.balao.setText(texto).setVisible(true).setAlpha(0);
    this.posicionarBalao();
    this.cena.tweens.killTweensOf(this.balao);
    this.cena.tweens.add({ targets: this.balao, alpha: 1, duration: 140 });
    this.cena.tweens.add({ targets: this.balao, alpha: 0, delay: FALA.DURACAO_MS, duration: 300, onComplete: () => this.balao.setVisible(false) });
    this.cena.som.monstroFala(this.x);
  }

  /** Balão acima do monstro, sem sair da tela (na entrada, pela câmera onde ela vai parar). */
  private posicionarBalao(): void {
    const cam = this.cena.cameras.main.worldView;
    const esq = this.entrando ? this.offset + ARENA.INICIO : cam.x;
    const meia = this.balao.width / 2 + 8;
    this.balao.setPosition(grade(Phaser.Math.Clamp(this.x, esq + meia, esq + LARGURA_TELA - meia)), grade(CHAO_Y - FALA.ACIMA));
  }

  /** Balão seguindo o monstro, "z Z" dormindo, fumaça da chaminé e o som da esteira. */
  private atualizarEnfeites(delta: number): void {
    const agora = this.cena.time.now;
    this.andando = this.estado === 'lutando' && Math.abs(this.x - this.xAnterior) > 0.01;
    this.xAnterior = this.x;
    if (this.balao.visible) this.posicionarBalao();
    const dormindo = this.estado === 'dormindo' && !this.entrando;
    this.zz.setVisible(dormindo);
    if (dormindo) {
      const ciclo = (agora % 1800) / 1800;
      this.zz.setPosition(grade(this.x - 40 + ciclo * 16), grade(CHAO_Y - HITBOX.ALTURA - 10 - ciclo * 30)).setAlpha(1 - ciclo * 0.8);
    }
    if (this.estado === 'compactado') return;
    // Fumaça: mais densa e escura quando ele está bravo
    this.esperaFumaca -= delta;
    if (this.esperaFumaca <= 0 && this.estado !== 'derrotado') {
      this.esperaFumaca = this.estado === 'lutando' ? CHEFAO.FUMACA_MS * 0.6 : CHEFAO.FUMACA_MS * 1.6;
      const lado = this.corpo.flipX ? -1 : 1;
      const fx = this.corpo.x + lado * 12 * ESCALA;
      const fy = this.corpo.y - 50 * ESCALA + 12 * ESCALA;
      const fumaca = this.cena.add.circle(fx, fy, ESCALA * 2, hexNum(this.estado === 'lutando' ? COR.sombraSucata : COR.sucata), 0.8).setDepth(PROF.objetos + 1);
      this.cena.tweens.add({
        targets: fumaca,
        y: fy - 60,
        x: fx + lado * 10,
        scale: 2.4,
        alpha: 0,
        duration: 1300,
        ease: 'Sine.easeOut',
        onComplete: () => fumaca.destroy(),
      });
    }
    if (this.andando) {
      this.esperaPasso -= delta;
      if (this.esperaPasso <= 0) {
        this.esperaPasso = CHEFAO.PASSO_MS;
        this.cena.som.monstroPasso(this.x);
      }
    }
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
    gerarTexturasMonstro(this.cena);
    texturaPixel(this.cena, 'lx-conteiner', CONTEINER_W, CONTEINER_H, desenharConteiner);
  }
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
