import Phaser from 'phaser';
import { GerenciadorEstado, type TipoPersonagem } from '../../nucleo/GerenciadorEstado';
import type { Coordenada2D } from './tiposFase1';
import type { VentoFase1 } from './VentoFase1';
import { JOGADOR_FASE1, VENTO_FASE1 } from './constantesFase1';

/**
 * Fiapo de ar deixado para trás durante o planeio.
 */
interface FiapoPlaneio {
  x: number;
  y: number;
  direcao: number;
  vidaMs: number;
}

/**
 * Jogador da Fase 1 (Alvares ou Reis): sprite físico, teclado, movimento, coyote time,
 * jump buffer, pulo variável e o planar dentro e fora das colunas de vento.
 */
export class JogadorFase1 {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly tipoPersonagem: TipoPersonagem;

  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclasWASD?: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private teclaEspaco?: Phaser.Input.Keyboard.Key;
  private teclaInteragir?: Phaser.Input.Keyboard.Key;

  // Temporizadores para Coyote Time e Jump Buffer
  private tempoUltimaVezNoChao: number = -9999;
  private tempoUltimoPressionarPulo: number = -9999;

  // Verdadeiro entre o início de um pulo normal e o momento em que ele pode ser cortado
  private puloCurtoPendente: boolean = false;

  // Rastro visual do planeio
  private readonly graficoRastro: Phaser.GameObjects.Graphics;
  private fiapos: FiapoPlaneio[] = [];
  private acumuladorRastroMs: number = 0;

  constructor(cena: Phaser.Scene, spawn: Coordenada2D) {
    this.tipoPersonagem = GerenciadorEstado.obterInstancia().obterPersonagem();

    this.sprite = cena.physics.add.sprite(spawn.x, spawn.y, `${this.tipoPersonagem}_idle`);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(JOGADOR_FASE1.PROFUNDIDADE);
    this.corpo.setSize(JOGADOR_FASE1.HITBOX_LARGURA, JOGADOR_FASE1.HITBOX_ALTURA);
    this.corpo.setOffset(JOGADOR_FASE1.HITBOX_OFFSET_X, JOGADOR_FASE1.HITBOX_OFFSET_Y);
    this.tocarAnimacao('idle');

    this.graficoRastro = cena.add.graphics();
    this.graficoRastro.setDepth(JOGADOR_FASE1.RASTRO_PLANEIO.PROFUNDIDADE);

    if (cena.input?.keyboard) {
      const teclado = cena.input.keyboard;
      this.cursores = teclado.createCursorKeys();
      this.teclasWASD = {
        w: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.S),
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

  /**
   * Consome o aperto da tecla E neste quadro (chamar uma única vez por quadro).
   */
  public interagirApertado(): boolean {
    return Boolean(this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir));
  }

  public update(tempo: number, delta: number, vento: VentoFase1): void {
    const corpo = this.corpo;
    const dt = delta / 1000;

    const esquerda = (this.cursores?.left.isDown || this.teclasWASD?.a.isDown) ?? false;
    const direita = (this.cursores?.right.isDown || this.teclasWASD?.d.isDown) ?? false;
    const puloSegurado =
      (this.cursores?.up.isDown || this.teclasWASD?.w.isDown || this.teclaEspaco?.isDown) ?? false;

    const puloApertadoAgora =
      (this.cursores?.up && Phaser.Input.Keyboard.JustDown(this.cursores.up)) ||
      (this.teclasWASD?.w && Phaser.Input.Keyboard.JustDown(this.teclasWASD.w)) ||
      (this.teclaEspaco && Phaser.Input.Keyboard.JustDown(this.teclaEspaco));

    const noChao = corpo.blocked.down || corpo.touching.down;

    if (noChao) {
      this.tempoUltimaVezNoChao = tempo;
    }

    if (puloApertadoAgora) {
      this.tempoUltimoPressionarPulo = tempo;
    }

    const colunaAtual = vento.colunaAtivaEm(this.sprite.x, this.sprite.y);
    const zonaContraria = vento.zonaContrariaEm(this.sprite.x, this.sprite.y);

    // Movimento horizontal: a entrada do jogador decide a direção; o vento contrário só soma um arraste
    let velX = 0;
    if (esquerda) {
      velX = -JOGADOR_FASE1.VELOCIDADE_X;
      this.sprite.setFlipX(true);
    } else if (direita) {
      velX = JOGADOR_FASE1.VELOCIDADE_X;
      this.sprite.setFlipX(false);
    }
    const andando = velX !== 0;

    if (zonaContraria) {
      velX -= zonaContraria.forca;
    }

    // A velocidade acompanha o alvo em rampa: acelera ao andar e desliza até parar ao soltar
    const aceleracao = andando
      ? noChao
        ? JOGADOR_FASE1.ACELERACAO_CHAO
        : JOGADOR_FASE1.ACELERACAO_AR
      : noChao
        ? JOGADOR_FASE1.FRENAGEM_CHAO
        : JOGADOR_FASE1.FRENAGEM_AR;
    const velAtualX = corpo.velocity.x;
    const passoX = aceleracao * dt;
    this.sprite.setVelocityX(velAtualX + Phaser.Math.Clamp(velX - velAtualX, -passoX, passoX));

    const podePularCoyote = tempo - this.tempoUltimaVezNoChao <= JOGADOR_FASE1.TEMPO_COYOTE_MS;
    const bufferPuloAtivo = tempo - this.tempoUltimoPressionarPulo <= JOGADOR_FASE1.TEMPO_JUMP_BUFFER_MS;

    if (bufferPuloAtivo && podePularCoyote) {
      this.sprite.setVelocityY(JOGADOR_FASE1.VELOCIDADE_PULO);
      this.tempoUltimoPressionarPulo = -9999;
      this.tempoUltimaVezNoChao = -9999;
      this.puloCurtoPendente = true;
    }

    let planando = false;

    if (colunaAtual) {
      // Dentro da coluna, o vento assume o controle vertical: segurar sobe, soltar desce devagar
      this.puloCurtoPendente = false;

      if (puloSegurado) {
        this.sprite.setVelocityY(-colunaAtual.forca);
      } else {
        const vy = corpo.velocity.y;
        const convergencia = Math.min(1, dt * VENTO_FASE1.DESCIDA_COLUNA_SUAVIZACAO);
        this.sprite.setVelocityY(vy + (VENTO_FASE1.DESCIDA_COLUNA_VEL - vy) * convergencia);
      }
    } else {
      // Pulo variável: soltar o botão durante a subida aumenta a gravidade, encurtando o pulo em curva
      if (this.puloCurtoPendente) {
        if (corpo.velocity.y >= 0) {
          this.puloCurtoPendente = false;
        } else if (!puloSegurado) {
          this.sprite.setVelocityY(corpo.velocity.y + JOGADOR_FASE1.GRAVIDADE_EXTRA_PULO_CURTO * dt);
        }
      }

      // Planar: segurar o pulo durante a queda limita a velocidade de descida
      if (!noChao && puloSegurado && corpo.velocity.y > 0) {
        this.sprite.setVelocityY(Math.min(corpo.velocity.y, JOGADOR_FASE1.VELOCIDADE_MAX_PLANAR));
        planando = true;
      }
    }

    if (colunaAtual && puloSegurado) {
      this.sprite.setTint(JOGADOR_FASE1.TINT_VENTO);
    } else if (planando) {
      this.sprite.setTint(JOGADOR_FASE1.TINT_PLANEIO);
    } else {
      this.sprite.clearTint();
    }

    this.atualizarRastro(delta, planando);

    if (noChao) {
      this.tocarAnimacao(andando ? 'run' : 'idle');
    } else {
      this.tocarAnimacao('jump');
    }
  }

  /**
   * Imobiliza o jogador no ar enquanto o terminal ou um diálogo está aberto.
   */
  public congelar(): void {
    this.sprite.setVelocity(0, 0);
    this.corpo.setAllowGravity(false);
    this.tocarAnimacao('idle');
  }

  public liberarGravidade(): void {
    this.corpo.setAllowGravity(true);
  }

  /**
   * Teleporta o jogador para o ponto de spawn com física e temporizadores zerados.
   */
  public respawnar(ponto: Coordenada2D): void {
    const corpo = this.corpo;
    corpo.reset(ponto.x, ponto.y);
    corpo.setVelocity(0, 0);
    corpo.setAcceleration(0, 0);
    corpo.setAllowGravity(true);
    corpo.blocked.none = true;
    corpo.touching.none = true;

    this.sprite.clearTint();
    this.sprite.setFlipX(false);
    this.tocarAnimacao('idle');

    this.tempoUltimaVezNoChao = -9999;
    this.tempoUltimoPressionarPulo = -9999;
    this.puloCurtoPendente = false;

    this.fiapos = [];
    this.acumuladorRastroMs = 0;
    this.graficoRastro.clear();
  }

  /**
   * Solta fiapos de ar atrás do jogador enquanto ele planeia e desenha os que ainda estão vivos.
   */
  private atualizarRastro(delta: number, planando: boolean): void {
    const r = JOGADOR_FASE1.RASTRO_PLANEIO;
    const dt = delta / 1000;

    if (planando) {
      this.acumuladorRastroMs += delta;
      while (this.acumuladorRastroMs >= r.INTERVALO_MS) {
        this.acumuladorRastroMs -= r.INTERVALO_MS;
        const direcao = this.sprite.flipX ? -1 : 1;
        this.fiapos.push({
          x: this.sprite.x - direcao * r.RECUO_X,
          y: this.sprite.y + r.OFFSET_Y_MIN + Math.random() * (r.OFFSET_Y_MAX - r.OFFSET_Y_MIN),
          direcao,
          vidaMs: r.VIDA_MS,
        });
      }
    } else {
      this.acumuladorRastroMs = 0;
    }

    this.graficoRastro.clear();
    for (let i = this.fiapos.length - 1; i >= 0; i--) {
      const fiapo = this.fiapos[i];
      fiapo.vidaMs -= delta;
      if (fiapo.vidaMs <= 0) {
        this.fiapos.splice(i, 1);
        continue;
      }

      fiapo.x -= fiapo.direcao * r.VELOCIDADE_X * dt;
      this.graficoRastro.lineStyle(r.ESPESSURA, r.COR, r.ALFA * (fiapo.vidaMs / r.VIDA_MS));
      this.graficoRastro.lineBetween(fiapo.x, fiapo.y, fiapo.x + fiapo.direcao * r.COMPRIMENTO, fiapo.y);
    }
  }

  private tocarAnimacao(nome: 'idle' | 'run' | 'jump'): void {
    this.sprite.anims.play(`${this.tipoPersonagem}_${nome}`, true);
  }
}
