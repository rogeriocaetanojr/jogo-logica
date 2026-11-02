import Phaser from 'phaser';
import { GerenciadorEstado, type TipoPersonagem } from '../../nucleo/GerenciadorEstado';
import type { Coordenada2D } from './tiposFase1';
import type { VentoFase1 } from './VentoFase1';
import { FEEL_FASE1, JOGADOR_FASE1, VENTO_FASE1 } from './constantesFase1';
import { EVENTO_ESTADO_SOM_FASE1, emitirSom } from './SomFase1';

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
 * Nuvenzinha de poeira levantada ao pular, pousar e correr.
 */
interface Poeira {
  x: number;
  y: number;
  vx: number;
  vy: number;
  raio: number;
  vidaMs: number;
}

/**
 * Jogador da Fase 1 (Alvares ou Reis): sprite físico, teclado, movimento, coyote time,
 * jump buffer, pulo variável e o planar dentro e fora das colunas de vento.
 */
export class JogadorFase1 {
  /** Sprite físico: guarda corpo, animação e estado. Fica invisível; quem aparece é `visual`. */
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly tipoPersonagem: TipoPersonagem;

  // Cópia visível do sprite, que estica, achata e inclina sem mexer no corpo físico
  // (o corpo do Arcade escala junto com o sprite, e a hitbox não pode mudar)
  private readonly visual: Phaser.GameObjects.Sprite;
  private readonly cena: Phaser.Scene;
  private readonly graficoPoeira: Phaser.GameObjects.Graphics;
  private poeira: Poeira[] = [];
  private esticarX: number = 1;
  private esticarY: number = 1;
  private inclinacao: number = 0;
  private estavaNoChao: boolean = false;
  private velocidadeYAnterior: number = 0;
  private acumuladorPassoMs: number = 0;
  private planandoAntes: boolean = false;
  private naColunaAntes: boolean = false;

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

  // Empurrões (rajada das sentinelas) tiram o controle horizontal por um instante
  private tempoAtual: number = 0;
  private controleTravadoAte: number = 0;

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

    this.cena = cena;
    this.sprite.setVisible(false);
    this.visual = cena.add.sprite(spawn.x, spawn.y, `${this.tipoPersonagem}_idle`);
    this.visual.setDepth(JOGADOR_FASE1.PROFUNDIDADE);
    this.graficoPoeira = cena.add.graphics();
    this.graficoPoeira.setDepth(JOGADOR_FASE1.PROFUNDIDADE - 0.5);
    cena.events.on(Phaser.Scenes.Events.POST_UPDATE, this.sincronizarVisual, this);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cena.events.off(Phaser.Scenes.Events.POST_UPDATE, this.sincronizarVisual, this);
    });

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

  /**
   * Arremessa o jogador e ignora as setas por um instante, para o empurrão não ser anulado.
   */
  /**
   * Quique para cima depois de pisar num inimigo, mantendo o controle horizontal.
   */
  public quicar(velocidadeY: number): void {
    this.sprite.setVelocityY(velocidadeY);
    this.puloCurtoPendente = false;
    this.esticarX = FEEL_FASE1.PULO.x;
    this.esticarY = FEEL_FASE1.PULO.y;
  }

  public aplicarEmpurrao(velocidadeX: number, velocidadeY: number, duracaoMs: number): void {
    this.sprite.setVelocity(velocidadeX, velocidadeY);
    this.controleTravadoAte = this.tempoAtual + duracaoMs;
    this.puloCurtoPendente = false;
  }

  public update(tempo: number, delta: number, vento: VentoFase1): void {
    const corpo = this.corpo;
    const dt = delta / 1000;
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

    const noChao = corpo.blocked.down || corpo.touching.down;

    if (noChao) {
      this.tempoUltimaVezNoChao = tempo;
    }

    // Pouso: achata na hora e levanta poeira, mais forte quanto mais rápido caía
    if (noChao && !this.estavaNoChao && this.velocidadeYAnterior > FEEL_FASE1.VELOCIDADE_MIN_ATERRISSAGEM) {
      const impacto = Math.min(1, this.velocidadeYAnterior / FEEL_FASE1.VELOCIDADE_IMPACTO_MAX);
      this.esticarX = 1 + FEEL_FASE1.ATERRISSAGEM.x * impacto;
      this.esticarY = 1 - FEEL_FASE1.ATERRISSAGEM.y * impacto;
      this.soltarPoeira(Math.ceil(2 + impacto * 4), 1 + impacto);
      emitirSom(this.cena, 'aterrissar', undefined, 0.4 + impacto * 0.6);
    }
    this.estavaNoChao = noChao;

    if (puloApertadoAgora) {
      this.tempoUltimoPressionarPulo = tempo;
    }

    const colunaAtual = vento.colunaAtivaEm(this.sprite.x, this.sprite.y);
    const zonaContraria = vento.zonaContrariaEm(this.sprite.x, this.sprite.y);

    // Movimento horizontal: a entrada do jogador decide a direção; o vento contrário só soma um arraste
    let velX = 0;
    if (controleLivre && esquerda) {
      velX = -JOGADOR_FASE1.VELOCIDADE_X;
      this.sprite.setFlipX(true);
    } else if (controleLivre && direita) {
      velX = JOGADOR_FASE1.VELOCIDADE_X;
      this.sprite.setFlipX(false);
    }
    const andando = velX !== 0;

    if (zonaContraria) {
      velX -= zonaContraria.forca;
    }

    // A velocidade acompanha o alvo em rampa: acelera ao andar e desliza até parar ao soltar
    if (controleLivre) {
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
    }

    const podePularCoyote = tempo - this.tempoUltimaVezNoChao <= JOGADOR_FASE1.TEMPO_COYOTE_MS;
    const bufferPuloAtivo = tempo - this.tempoUltimoPressionarPulo <= JOGADOR_FASE1.TEMPO_JUMP_BUFFER_MS;

    if (bufferPuloAtivo && podePularCoyote) {
      this.sprite.setVelocityY(JOGADOR_FASE1.VELOCIDADE_PULO);
      this.tempoUltimoPressionarPulo = -9999;
      this.tempoUltimaVezNoChao = -9999;
      this.puloCurtoPendente = true;
      this.esticarX = FEEL_FASE1.PULO.x;
      this.esticarY = FEEL_FASE1.PULO.y;
      this.soltarPoeira(3, 0.8);
      emitirSom(this.cena, 'pulo');
    }

    // Gêiser em erupção: um impulso único para cima, que não é cortado ao soltar o pulo
    const impulsoGeiser = vento.consumirImpulsoGeiser(this.sprite.x, this.sprite.y);
    if (impulsoGeiser !== undefined) {
      this.sprite.setVelocityY(-impulsoGeiser);
      this.puloCurtoPendente = false;
      this.esticarX = FEEL_FASE1.PULO.x;
      this.esticarY = FEEL_FASE1.PULO.y;
      emitirSom(this.cena, 'impulso');
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

    // Sensação de movimento: forma volta ao normal, inclina ao planar, passos e poeira
    const retorno = Math.min(1, dt * FEEL_FASE1.RETORNO_FORMA);
    this.esticarX += (1 - this.esticarX) * retorno;
    this.esticarY += (1 - this.esticarY) * retorno;
    const alvoInclinacao = planando ? (this.sprite.flipX ? -1 : 1) * FEEL_FASE1.INCLINACAO_PLANEIO_GRAUS : 0;
    this.inclinacao += (alvoInclinacao - this.inclinacao) * Math.min(1, dt * FEEL_FASE1.INCLINACAO_SUAVIZACAO);

    if (noChao && Math.abs(corpo.velocity.x) > FEEL_FASE1.VELOCIDADE_MIN_PASSO && andando) {
      this.acumuladorPassoMs += delta;
      if (this.acumuladorPassoMs >= FEEL_FASE1.PASSO_INTERVALO_MS) {
        this.acumuladorPassoMs = 0;
        this.soltarPoeira(1, 0.5);
        emitirSom(this.cena, 'passo');
      }
    } else {
      this.acumuladorPassoMs = FEEL_FASE1.PASSO_INTERVALO_MS * 0.6;
    }

    this.atualizarPoeira(delta);

    // Abrir o "paraquedas" e entrar numa corrente de vento têm som próprio
    const naColuna = Boolean(colunaAtual);
    if (planando && !this.planandoAntes) emitirSom(this.cena, 'planar_inicio');
    if (naColuna && !this.naColunaAntes) emitirSom(this.cena, 'coluna_entrar');
    this.planandoAntes = planando;
    this.naColunaAntes = naColuna;

    this.cena.events.emit(EVENTO_ESTADO_SOM_FASE1, {
      planando,
      naColuna: Boolean(colunaAtual),
      naZonaContraria: Boolean(zonaContraria),
    });
    this.velocidadeYAnterior = corpo.velocity.y;

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
    this.sprite.setAlpha(1);
    this.sprite.setFlipX(false);
    this.tocarAnimacao('idle');

    this.tempoUltimaVezNoChao = -9999;
    this.tempoUltimoPressionarPulo = -9999;
    this.puloCurtoPendente = false;
    this.controleTravadoAte = 0;

    this.esticarX = 1;
    this.esticarY = 1;
    this.inclinacao = 0;
    this.estavaNoChao = false;
    this.velocidadeYAnterior = 0;
    this.poeira = [];
    this.graficoPoeira.clear();

    this.fiapos = [];
    this.acumuladorRastroMs = 0;
    this.graficoRastro.clear();
  }

  /**
   * Copia o sprite físico para o sprite visível, aplicando esticar/achatar (ancorado nos pés) e inclinação.
   * Roda depois da física a cada quadro, inclusive com o jogo congelado e durante a animação de morte.
   */
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
    v.setAngle(origem.angle + this.inclinacao);
    v.setScale(origem.scaleX * this.esticarX, origem.scaleY * this.esticarY);

    // Os pés ficam parados no chão enquanto o resto estica ou achata
    const pes = this.corpo.bottom;
    v.setPosition(origem.x, pes - (pes - origem.y) * this.esticarY);
  }

  /**
   * Levanta poeira nos pés, para os dois lados.
   */
  private soltarPoeira(quantidade: number, forca: number): void {
    const f = FEEL_FASE1.POEIRA;
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
    const f = FEEL_FASE1.POEIRA;
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
