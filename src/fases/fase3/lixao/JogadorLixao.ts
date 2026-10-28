import Phaser from 'phaser';
import { GerenciadorEstado, type TipoPersonagem } from '../../../nucleo/GerenciadorEstado';

/**
 * Parâmetros de movimento do jogador no lixão (px/s e px/s²). Cada jogador guarda uma cópia
 * em `parametros`, para o clima (por exemplo a chuva na frenagem) poder alterá-la por área.
 */
export const MOVIMENTO_LIXAO = {
  VELOCIDADE: 240,
  VELOCIDADE_ABAIXADO: 110,
  ACELERACAO_CHAO: 2400,
  ACELERACAO_AR: 1600,
  FRENAGEM_CHAO: 2800,
  FRENAGEM_AR: 1000,
  /** Velocidade vertical inicial do pulo (negativa sobe). */
  IMPULSO_PULO: -520,
  /** Gravidade somada ao soltar o pulo ainda subindo: soltar cedo dá um pulo curto. */
  GRAVIDADE_PULO_CURTO: 1500,
  /** Janela para pular logo depois de sair de uma beirada. */
  TEMPO_COYOTE_MS: 110,
  /** Janela em que um pulo apertado antes de tocar o chão ainda vale. */
  TEMPO_BUFFER_PULO_MS: 110,
} as const;

export type ParametrosMovimento = { -readonly [K in keyof typeof MOVIMENTO_LIXAO]: number };

/** Hitbox em pé (na escala do quadro de 128x128) e achatamento visual ao abaixar. */
const HITBOX = { LARGURA: 44, ALTURA: 96, OFFSET_X: 42, OFFSET_Y: 26 } as const;
const ESCALA_Y_ABAIXADO = 0.6;
const PROFUNDIDADE = 60;

/**
 * Jogador da Fase 3 (Alvares ou Reis): anda com aceleração e frenagem suaves, pula com
 * altura variável (segurar pula mais alto) e abaixa reduzindo a hitbox.
 */
export class JogadorLixao {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly tipoPersonagem: TipoPersonagem;
  public readonly parametros: ParametrosMovimento = { ...MOVIMENTO_LIXAO };

  private readonly cena: Phaser.Scene;
  private teclas: Phaser.Input.Keyboard.Key[][] = [];
  private abaixado = false;
  private tempoUltimaVezNoChao = -9999;
  private tempoUltimoPulo = -9999;
  /** Verdadeiro do início do pulo até o topo, enquanto soltar o botão ainda encurta o pulo. */
  private puloCortavel = false;

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

  atualizar(tempo: number, delta: number): void {
    const p = this.parametros;
    const corpo = this.corpo;
    const dt = delta / 1000;
    const [esquerda, direita, pulo, abaixar] = this.teclas.map((grupo) => grupo.some((t) => t.isDown));
    const puloAgora = this.teclas[2]?.some((t) => Phaser.Input.Keyboard.JustDown(t)) ?? false;
    const noChao = corpo.blocked.down || corpo.touching.down;

    if (noChao) this.tempoUltimaVezNoChao = tempo;
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
    this.sprite.setVelocityX(vx + Phaser.Math.Clamp(alvo - vx, -passo, passo));

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

    if (!noChao) this.tocarAnimacao('jump');
    else if (this.abaixado) this.tocarAnimacao('idle');
    else this.tocarAnimacao(direcao !== 0 ? 'run' : 'idle');
  }

  /** Para o jogador (terminal aberto, troca de área). */
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
