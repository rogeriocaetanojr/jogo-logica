import Phaser from 'phaser';
import { GerenciadorEstado, type TipoPersonagem } from '../../../nucleo/GerenciadorEstado';
import { DANO, MOVIMENTO_LIXAO, VIDA_MAXIMA } from './TiposLixao';
import { QUEDA_MORTAL } from '../trechos/LayoutLixao';

export { MOVIMENTO_LIXAO };

/**
 * Parâmetros de movimento do jogador no lixão (px/s e px/s²). Cada jogador guarda uma cópia
 * em `parametros`, para o clima (por exemplo a chuva na frenagem) poder alterá-la por trecho.
 * Os valores ficam em TiposLixao (MOVIMENTO_LIXAO).
 */
export type ParametrosMovimento = { -readonly [K in keyof typeof MOVIMENTO_LIXAO]: number };

/** Hitbox em pé (na escala do quadro de 128x128) e achatamento visual ao abaixar. */
const HITBOX = { LARGURA: 44, ALTURA: 96, OFFSET_X: 42, OFFSET_Y: 26 } as const;
const ESCALA_Y_ABAIXADO = 0.6;
const PROFUNDIDADE = 60;
/** Maior degrau que o jogador sobe ou desce andando, sem pular (colinas do chão). */
const DEGRAU_MAX = 10;
/** Queda mais alta que QUEDA_MORTAL (do ponto mais alto no ar até o pouso) é fatal. */
export { QUEDA_MORTAL };

/**
 * Jogador da Fase 3 (Alvares ou Reis): anda com aceleração e frenagem suaves, pula com
 * altura variável (segurar pula mais alto) e abaixa reduzindo a hitbox. Guarda a vida em
 * baterias; o dano dá invencibilidade piscando e um empurrão para trás.
 */
export class JogadorLixao {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly tipoPersonagem: TipoPersonagem;
  public readonly parametros: ParametrosMovimento = { ...MOVIMENTO_LIXAO };
  public vida = VIDA_MAXIMA;

  private readonly cena: Phaser.Scene;
  private teclas: Phaser.Input.Keyboard.Key[][] = [];
  private abaixado = false;
  private tempoUltimaVezNoChao = -9999;
  private tempoUltimoPulo = -9999;
  /** Verdadeiro do início do pulo até o topo, enquanto soltar o botão ainda encurta o pulo. */
  private puloCortavel = false;
  private tempoAtual = 0;
  private invencivelAte = 0;
  private controleTravadoAte = 0;
  /** Ponto mais alto (menor y) desde que saiu do chão; null no chão. */
  private yMaisAlto: number | null = null;
  /** Pousou de uma queda maior que QUEDA_MORTAL (a cena consome e mata). */
  private quedaFatal = false;
  /** Sólidos onde o jogador pisa: usados para subir e descer degraus baixos andando. */
  public solidos?: Phaser.Physics.Arcade.StaticGroup;

  constructor(cena: Phaser.Scene, x: number, y: number) {
    this.cena = cena;
    this.tipoPersonagem = GerenciadorEstado.obterPersonagem();
    const textura = this.tipoPersonagem === 'reis' ? 'reis' : 'alvares';

    // Origem nos pés: achatar ao abaixar mantém o jogador apoiado no chão
    this.sprite = cena.physics.add.sprite(x, y, textura).setOrigin(0.5, 1).setDepth(PROFUNDIDADE);
    this.sprite.setCollideWorldBounds(true);
    this.corpo.setSize(HITBOX.LARGURA, HITBOX.ALTURA).setOffset(HITBOX.OFFSET_X, HITBOX.OFFSET_Y);
    this.tocarAnimacao('idle');

    const kb = cena.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      // Ordem: esquerda, direita, pulo, abaixar
      this.teclas = [[K.A, K.LEFT], [K.D, K.RIGHT], [K.W, K.UP, K.SPACE], [K.S, K.DOWN]].map((codigos) =>
        codigos.map((c) => kb.addKey(c, false))
      );
    }
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get corpo(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get estaAbaixado(): boolean {
    return this.abaixado;
  }

  get estaInvencivel(): boolean {
    return this.tempoAtual < this.invencivelAte;
  }

  /**
   * Tira 1 bateria e empurra para longe de `origemX`. Ignorado durante a invencibilidade.
   * Devolve true se o dano foi aplicado.
   */
  receberDano(origemX: number): boolean {
    if (this.vida <= 0 || this.estaInvencivel) return false;
    this.vida -= 1;
    this.invencivelAte = this.tempoAtual + DANO.INVENCIBILIDADE_MS;
    this.controleTravadoAte = this.tempoAtual + DANO.CONTROLE_TRAVADO_MS;
    const lado = this.sprite.x < origemX ? -1 : 1;
    this.sprite.setVelocity(lado * DANO.EMPURRAO_X, DANO.EMPURRAO_Y);
    this.puloCortavel = false;
    return true;
  }

  /** Volta ao ponto informado parado, em pé e com vida cheia (renascer no checkpoint). */
  renascer(x: number, y: number): void {
    this.definirAbaixado(false);
    this.corpo.reset(x, y);
    this.vida = VIDA_MAXIMA;
    this.invencivelAte = 0;
    this.controleTravadoAte = 0;
    this.puloCortavel = false;
    this.tempoUltimaVezNoChao = -9999;
    this.tempoUltimoPulo = -9999;
    this.yMaisAlto = null;
    this.quedaFatal = false;
    this.sprite.setAlpha(1).setFlipX(false);
    this.tocarAnimacao('idle');
  }

  atualizar(tempo: number, delta: number): void {
    const p = this.parametros;
    const corpo = this.corpo;
    const dt = delta / 1000;
    this.tempoAtual = tempo;
    const controleLivre = tempo >= this.controleTravadoAte;
    const [esquerda, direita, pulo, abaixar] = this.teclas.map((grupo) => grupo.some((t) => t.isDown));
    const puloAgora = this.teclas[2]?.some((t) => Phaser.Input.Keyboard.JustDown(t)) ?? false;
    const noChao = corpo.blocked.down || corpo.touching.down;

    if (noChao) this.tempoUltimaVezNoChao = tempo;
    this.medirQueda(noChao);
    if (puloAgora) this.tempoUltimoPulo = tempo;

    // Abaixar só no chão; levantar só se houver espaço acima da cabeça
    if (abaixar && noChao) this.definirAbaixado(true);
    else if (this.abaixado && (!abaixar || !noChao) && this.cabeLevantado()) this.definirAbaixado(false);

    // Movimento horizontal em rampa: acelera até o alvo e freia até parar ao soltar
    const direcao = esquerda === direita ? 0 : esquerda ? -1 : 1;
    if (direcao !== 0) this.sprite.setFlipX(direcao < 0);
    const alvo = direcao * (this.abaixado ? p.VELOCIDADE_ABAIXADO : p.VELOCIDADE);
    const taxa = direcao !== 0 ? (noChao ? p.ACELERACAO_CHAO : p.ACELERACAO_AR) : noChao ? p.FRENAGEM_CHAO : p.FRENAGEM_AR;
    const passo = taxa * dt;
    const vx = corpo.velocity.x;
    if (controleLivre) this.sprite.setVelocityX(vx + Phaser.Math.Clamp(alvo - vx, -passo, passo));

    this.acompanharDegraus(noChao, direcao, dt, tempo);

    // Pulo com coyote time e buffer; abaixado não pula
    const podePular = tempo - this.tempoUltimaVezNoChao <= p.TEMPO_COYOTE_MS;
    const pediuPulo = tempo - this.tempoUltimoPulo <= p.TEMPO_BUFFER_PULO_MS;
    if (pediuPulo && podePular && !this.abaixado) {
      this.sprite.setVelocityY(p.IMPULSO_PULO);
      this.tempoUltimoPulo = -9999;
      this.tempoUltimaVezNoChao = -9999;
      this.puloCortavel = true;
    }

    // Pulo variável: soltar o botão na subida soma gravidade e encurta o arco
    if (this.puloCortavel) {
      if (corpo.velocity.y >= 0) this.puloCortavel = false;
      else if (!pulo) this.sprite.setVelocityY(corpo.velocity.y + p.GRAVIDADE_PULO_CURTO * dt);
    }

    // Invencível: pisca
    this.sprite.setAlpha(this.estaInvencivel && Math.floor(tempo / DANO.PISCA_MS) % 2 === 0 ? 0.25 : 1);

    if (!noChao) this.tocarAnimacao('jump');
    else if (this.abaixado) this.tocarAnimacao('idle');
    else this.tocarAnimacao(direcao !== 0 ? 'run' : 'idle');
  }

  /** Mede a altura de cada queda; ao pousar de mais de QUEDA_MORTAL, marca a queda fatal. */
  private medirQueda(noChao: boolean): void {
    const y = this.corpo.bottom;
    if (!noChao) {
      this.yMaisAlto = this.yMaisAlto === null ? y : Math.min(this.yMaisAlto, y);
      return;
    }
    if (this.yMaisAlto !== null && y - this.yMaisAlto > QUEDA_MORTAL) this.quedaFatal = true;
    this.yMaisAlto = null;
  }

  /** Esquece a queda em andamento (teleporte de depuração). */
  esquecerQueda(): void {
    this.yMaisAlto = null;
    this.quedaFatal = false;
  }

  /** Devolve true uma vez depois de uma queda fatal. */
  consumirQuedaFatal(): boolean {
    const fatal = this.quedaFatal;
    this.quedaFatal = false;
    return fatal;
  }

  /** Topo do sólido mais alto que cruza o retângulo, ou null. */
  private topoSolido(x: number, y: number, w: number, h: number): number | null {
    const grupo = this.solidos;
    if (!grupo || w <= 0 || h <= 0) return null;
    const corpos = this.cena.physics.overlapRect(x, y, w, h, false, true) as Phaser.Physics.Arcade.StaticBody[];
    let topo: number | null = null;
    for (const c of corpos) if (grupo.contains(c.gameObject)) topo = topo === null ? c.top : Math.min(topo, c.top);
    return topo;
  }

  /**
   * Degraus baixos (colinas): andando contra um degrau de até DEGRAU_MAX, sobe antes de
   * bater; saindo de um degrau logo depois de estar no chão, desce colado sem cair.
   */
  private acompanharDegraus(noChao: boolean, direcao: number, dt: number, tempo: number): void {
    const corpo = this.corpo;
    const vx = corpo.velocity.x;
    const dir = Math.sign(vx) || direcao;
    if (noChao && dir !== 0) {
      const alcance = Math.abs(vx) * dt + 4;
      const x = dir > 0 ? corpo.right : corpo.left - alcance;
      const topo = this.topoSolido(x, corpo.bottom - DEGRAU_MAX, alcance, DEGRAU_MAX - 1);
      if (topo !== null) {
        const subir = corpo.bottom - topo;
        const livre = this.topoSolido(x, topo - corpo.height, alcance, corpo.height - 1) === null;
        if (subir > 0 && subir <= DEGRAU_MAX && livre) this.sprite.y -= subir;
      }
      return;
    }
    if (!noChao && corpo.velocity.y >= 0 && !this.puloCortavel && tempo - this.tempoUltimaVezNoChao < 120) {
      const topo = this.topoSolido(corpo.left + 2, corpo.bottom, corpo.width - 4, DEGRAU_MAX + 1);
      if (topo !== null && topo - corpo.bottom > 0 && topo - corpo.bottom <= DEGRAU_MAX) this.sprite.y += topo - corpo.bottom;
    }
  }

  /** Para o jogador (terminal aberto, morte). */
  parar(): void {
    this.sprite.setVelocity(0, 0);
    this.puloCortavel = false;
    if (this.corpo.blocked.down) this.tocarAnimacao('idle');
  }

  /** Achata o sprite; a hitbox acompanha a escala e encolhe para baixo da cabeça. */
  private definirAbaixado(abaixado: boolean): void {
    if (abaixado === this.abaixado) return;
    this.abaixado = abaixado;
    this.sprite.setScale(1, abaixado ? ESCALA_Y_ABAIXADO : 1);
  }

  /** Confere se a hitbox em pé caberia sem encostar em nenhum sólido. */
  private cabeLevantado(): boolean {
    const corpo = this.corpo;
    const alturaExtra = HITBOX.ALTURA - corpo.height;
    const acima = this.cena.physics.overlapRect(corpo.x + 1, corpo.y - alturaExtra, corpo.width - 2, alturaExtra, false, true);
    return acima.length === 0;
  }

  private tocarAnimacao(nome: 'idle' | 'run' | 'jump'): void {
    this.sprite.anims.play(`${this.tipoPersonagem}_${nome}`, true);
  }
}
