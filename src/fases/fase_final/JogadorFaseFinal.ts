import Phaser from 'phaser';
import { GerenciadorEstado, type TipoPersonagem } from '../../nucleo/GerenciadorEstado';
import { FEEL_FASE_FINAL, JOGADOR_FASE_FINAL } from './constantesFaseFinal';

export interface Ponto {
  x: number;
  y: number;
}

interface Poeira {
  x: number;
  y: number;
  vx: number;
  vy: number;
  raio: number;
  vidaMs: number;
}

/**
 * Jogador da Fase Final (Alvares ou Reis). Adaptado do JogadorFase1, sem vento nem planeio:
 * aceleração em rampa, coyote time, jump buffer, pulo variável, quique do pisão e empurrão de dano.
 * O sprite físico fica invisível; quem aparece é `visual`, que estica e achata sem mexer na hitbox.
 */
export class JogadorFaseFinal {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly tipoPersonagem: TipoPersonagem;

  private readonly visual: Phaser.GameObjects.Sprite;
  private readonly graficoPoeira: Phaser.GameObjects.Graphics;
  private poeira: Poeira[] = [];
  private esticarX: number = 1;
  private esticarY: number = 1;
  private estavaNoChao: boolean = false;
  private velocidadeYAnterior: number = 0;
  private acumuladorPassoMs: number = 0;

  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclasWASD?: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key };
  private teclaEspaco?: Phaser.Input.Keyboard.Key;
  private teclaInteragir?: Phaser.Input.Keyboard.Key;

  private tempoUltimaVezNoChao: number = -9999;
  private tempoUltimoPressionarPulo: number = -9999;
  private puloCurtoPendente: boolean = false;
  private tempoAtual: number = 0;
  private controleTravadoAte: number = 0;

  constructor(cena: Phaser.Scene, spawn: Ponto) {
    this.tipoPersonagem = GerenciadorEstado.obterInstancia().obterPersonagem();

    this.sprite = cena.physics.add.sprite(spawn.x, spawn.y, this.tipoPersonagem, 0);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(JOGADOR_FASE_FINAL.PROFUNDIDADE);
    this.corpo.setSize(JOGADOR_FASE_FINAL.HITBOX_LARGURA, JOGADOR_FASE_FINAL.HITBOX_ALTURA);
    this.corpo.setOffset(JOGADOR_FASE_FINAL.HITBOX_OFFSET_X, JOGADOR_FASE_FINAL.HITBOX_OFFSET_Y);
    this.sprite.setVisible(false);
    this.tocarAnimacao('idle');

    this.visual = cena.add.sprite(spawn.x, spawn.y, this.tipoPersonagem, 0);
    this.visual.setDepth(JOGADOR_FASE_FINAL.PROFUNDIDADE);
    this.graficoPoeira = cena.add.graphics();
    this.graficoPoeira.setDepth(JOGADOR_FASE_FINAL.PROFUNDIDADE - 0.5);

    cena.events.on(Phaser.Scenes.Events.POST_UPDATE, this.sincronizarVisual, this);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cena.events.off(Phaser.Scenes.Events.POST_UPDATE, this.sincronizarVisual, this);
    });

    if (cena.input?.keyboard) {
      const teclado = cena.input.keyboard;
      this.cursores = teclado.createCursorKeys();
      this.teclasWASD = {
        w: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        d: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.teclaEspaco = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.teclaInteragir = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.E);
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

  get noChao(): boolean {
    return this.corpo.blocked.down || this.corpo.touching.down;
  }

  /** Consome o aperto da tecla E neste quadro (chamar uma única vez por quadro). */
  public interagirApertado(): boolean {
    return Boolean(this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir));
  }

  /** Quique para cima depois de pisar num inimigo, mantendo o controle horizontal. */
  public quicar(velocidadeY: number): void {
    this.sprite.setVelocityY(velocidadeY);
    this.puloCurtoPendente = false;
    this.esticarX = FEEL_FASE_FINAL.PULO.x;
    this.esticarY = FEEL_FASE_FINAL.PULO.y;
  }

  /** Arremessa o jogador e ignora as setas por um instante, para o empurrão não ser anulado. */
  public aplicarEmpurrao(velocidadeX: number, velocidadeY: number, duracaoMs: number): void {
    this.sprite.setVelocity(velocidadeX, velocidadeY);
    this.controleTravadoAte = this.tempoAtual + duracaoMs;
    this.puloCurtoPendente = false;
  }

  public update(tempo: number, delta: number): void {
    const corpo = this.corpo;
    const dt = delta / 1000;
    const j = JOGADOR_FASE_FINAL;
    const f = FEEL_FASE_FINAL;
    this.tempoAtual = tempo;
    const controleLivre = tempo >= this.controleTravadoAte;

    const esquerda = (this.cursores?.left.isDown || this.teclasWASD?.a.isDown) ?? false;
    const direita = (this.cursores?.right.isDown || this.teclasWASD?.d.isDown) ?? false;
    const puloSegurado =
      (this.cursores?.up.isDown || this.teclasWASD?.w.isDown || this.teclaEspaco?.isDown) ?? false;
    const puloApertadoAgora =
      (this.cursores?.up && Phaser.Input.Keyboard.JustDown(this.cursores.up)) ||
      (this.teclasWASD?.w && Phaser.Input.Keyboard.JustDown(this.teclasWASD.w)) ||
      (this.teclaEspaco && Phaser.Input.Keyboard.JustDown(this.teclaEspaco));

    const noChao = this.noChao;
    if (noChao) this.tempoUltimaVezNoChao = tempo;

    // Pouso: achata e levanta poeira, mais forte quanto mais rápido caía
    if (noChao && !this.estavaNoChao && this.velocidadeYAnterior > f.VELOCIDADE_MIN_ATERRISSAGEM) {
      const impacto = Math.min(1, this.velocidadeYAnterior / f.VELOCIDADE_IMPACTO_MAX);
      this.esticarX = 1 + f.ATERRISSAGEM.x * impacto;
      this.esticarY = 1 - f.ATERRISSAGEM.y * impacto;
      this.soltarPoeira(Math.ceil(2 + impacto * 4), 1 + impacto);
    }
    this.estavaNoChao = noChao;

    if (puloApertadoAgora) this.tempoUltimoPressionarPulo = tempo;

    let alvoX = 0;
    if (controleLivre && esquerda) {
      alvoX = -j.VELOCIDADE_X;
      this.sprite.setFlipX(true);
    } else if (controleLivre && direita) {
      alvoX = j.VELOCIDADE_X;
      this.sprite.setFlipX(false);
    }
    const andando = alvoX !== 0;

    if (controleLivre) {
      const aceleracao = andando
        ? noChao
          ? j.ACELERACAO_CHAO
          : j.ACELERACAO_AR
        : noChao
          ? j.FRENAGEM_CHAO
          : j.FRENAGEM_AR;
      const atual = corpo.velocity.x;
      const passo = aceleracao * dt;
      this.sprite.setVelocityX(atual + Phaser.Math.Clamp(alvoX - atual, -passo, passo));
    }

    const coyote = tempo - this.tempoUltimaVezNoChao <= j.TEMPO_COYOTE_MS;
    const buffer = tempo - this.tempoUltimoPressionarPulo <= j.TEMPO_JUMP_BUFFER_MS;
    if (buffer && coyote) {
      this.sprite.setVelocityY(j.VELOCIDADE_PULO);
      this.tempoUltimoPressionarPulo = -9999;
      this.tempoUltimaVezNoChao = -9999;
      this.puloCurtoPendente = true;
      this.esticarX = f.PULO.x;
      this.esticarY = f.PULO.y;
      this.soltarPoeira(3, 0.8);
    }

    // Pulo variável: soltar durante a subida aumenta a gravidade e encurta o pulo em curva
    if (this.puloCurtoPendente) {
      if (corpo.velocity.y >= 0) this.puloCurtoPendente = false;
      else if (!puloSegurado) this.sprite.setVelocityY(corpo.velocity.y + j.GRAVIDADE_EXTRA_PULO_CURTO * dt);
    }

    const retorno = Math.min(1, dt * f.RETORNO_FORMA);
    this.esticarX += (1 - this.esticarX) * retorno;
    this.esticarY += (1 - this.esticarY) * retorno;

    if (noChao && andando && Math.abs(corpo.velocity.x) > f.VELOCIDADE_MIN_PASSO) {
      this.acumuladorPassoMs += delta;
      if (this.acumuladorPassoMs >= f.PASSO_INTERVALO_MS) {
        this.acumuladorPassoMs = 0;
        this.soltarPoeira(1, 0.5);
      }
    } else {
      this.acumuladorPassoMs = f.PASSO_INTERVALO_MS * 0.6;
    }
    this.atualizarPoeira(delta);
    this.velocidadeYAnterior = corpo.velocity.y;

    if (!noChao) this.tocarAnimacao('jump');
    else this.tocarAnimacao(andando ? 'run' : 'idle');
  }

  /** Para o jogador e desliga a gravidade enquanto o terminal, um diálogo ou uma cutscene está aberto. */
  public congelar(): void {
    this.sprite.setVelocity(0, 0);
    this.corpo.setAllowGravity(false);
    this.tocarAnimacao('idle');
  }

  public liberarGravidade(): void {
    this.corpo.setAllowGravity(true);
  }

  /** Parado de pé, sem input (pan da câmera, cutscenes): mantém a gravidade e zera o passo. */
  public ficarParado(): void {
    this.sprite.setVelocityX(0);
    if (this.noChao) this.tocarAnimacao('idle');
  }

  /** Teleporta para o ponto com física e temporizadores zerados. */
  public respawnar(ponto: Ponto): void {
    const corpo = this.corpo;
    corpo.reset(ponto.x, ponto.y);
    corpo.setVelocity(0, 0);
    corpo.setAcceleration(0, 0);
    corpo.setAllowGravity(true);
    this.sprite.clearTint();
    this.sprite.setAlpha(1);
    this.sprite.setAngle(0);
    this.sprite.setScale(1);
    this.sprite.setFlipX(false);
    this.tocarAnimacao('idle');
    this.tempoUltimaVezNoChao = -9999;
    this.tempoUltimoPressionarPulo = -9999;
    this.puloCurtoPendente = false;
    this.controleTravadoAte = 0;
    this.esticarX = 1;
    this.esticarY = 1;
    this.estavaNoChao = false;
    this.velocidadeYAnterior = 0;
    this.poeira = [];
    this.graficoPoeira.clear();
  }

  /** Copia o sprite físico para o visível, aplicando esticar/achatar ancorado nos pés. */
  private sincronizarVisual(): void {
    const origem = this.sprite;
    const v = this.visual;
    if (v.texture.key !== origem.texture.key || v.frame.name !== origem.frame.name) {
      v.setTexture(origem.texture.key, origem.frame.name);
    }
    v.setFlipX(origem.flipX);
    v.setAlpha(origem.alpha);
    if (origem.isTinted) v.setTint(origem.tintTopLeft);
    else v.clearTint();
    v.setAngle(origem.angle);
    v.setScale(origem.scaleX * this.esticarX, origem.scaleY * this.esticarY);
    const pes = this.corpo.bottom;
    v.setPosition(origem.x, pes - (pes - origem.y) * this.esticarY);
  }

  private soltarPoeira(quantidade: number, forca: number): void {
    const f = FEEL_FASE_FINAL.POEIRA;
    const pes = this.corpo.bottom;
    for (let i = 0; i < quantidade; i++) {
      const lado = i % 2 === 0 ? -1 : 1;
      this.poeira.push({
        x: this.sprite.x + lado * (4 + Math.random() * 10),
        y: pes - 2,
        vx: lado * (30 + Math.random() * 50) * forca,
        vy: -(10 + Math.random() * 30) * forca,
        raio: f.RAIO_MIN + Math.random() * (f.RAIO_MAX - f.RAIO_MIN),
        vidaMs: f.VIDA_MS,
      });
    }
  }

  private atualizarPoeira(delta: number): void {
    const f = FEEL_FASE_FINAL.POEIRA;
    const dt = delta / 1000;
    this.graficoPoeira.clear();
    for (let i = this.poeira.length - 1; i >= 0; i--) {
      const p = this.poeira[i];
      p.vidaMs -= delta;
      if (p.vidaMs <= 0) {
        this.poeira.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      const vida = p.vidaMs / f.VIDA_MS;
      this.graficoPoeira.fillStyle(f.COR, f.ALFA * vida);
      this.graficoPoeira.fillCircle(p.x, p.y, p.raio * (1.6 - vida * 0.6));
    }
  }

  private tocarAnimacao(nome: 'idle' | 'run' | 'jump'): void {
    this.sprite.anims.play(`${this.tipoPersonagem}_${nome}`, true);
  }
}
