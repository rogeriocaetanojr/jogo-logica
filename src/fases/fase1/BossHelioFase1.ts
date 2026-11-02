import Phaser from 'phaser';
import { CORES_FASE1 } from './ArteFase1';
import { emitirSom } from './SomFase1';
import { ARENA_FASE1, BOSS_HELIO_FASE1 } from './constantesFase1';

export type AtaqueHelio = 'rajada' | 'salto' | 'chuva';

/**
 * Estados do Helio:
 * - inativo: antes da luta (ou esperando o recomeço);
 * - aviso: telegrafa o próximo ataque;
 * - atacando / pausa: executa o ataque e respira antes do próximo;
 * - tonto: janela de 2,5 s em que pisar na cabeça conta como golpe;
 * - ferido: reação ao golpe, invulnerável;
 * - derrotado: de joelhos, esperando o comando do núcleo;
 * - desligado: fim da luta.
 */
export type EstadoHelio = 'inativo' | 'aviso' | 'atacando' | 'pausa' | 'tonto' | 'ferido' | 'derrotado' | 'desligado';

type FaseChuva = 'subindo' | 'chovendo' | 'descendo';

interface ProjetilHelio {
  tipo: 'onda' | 'choque' | 'pena';
  x: number;
  y: number;
  vx: number;
  vy: number;
  largura: number;
  altura: number;
  /** Penas: tempo mostrando a sombra antes de cair. */
  esperaMs: number;
  /** Penas: duração total do aviso, para a sombra escurecer conforme a queda se aproxima. */
  avisoTotalMs: number;
}

/**
 * Avisos do Helio para a cena, que cuida de corações, empurrão, hitstop e HUD.
 */
export interface EventosHelio {
  /** Um ataque ou o corpo do Helio atingiu o jogador; direcaoX indica para onde empurrar. */
  aoFerirJogador: (direcaoX: number) => void;
  /** Pisão válido na cabeça durante a tontura. */
  aoSerPisado: () => void;
}

const B = BOSS_HELIO_FASE1;
const A = ARENA_FASE1;

/**
 * Boss da Fase 1, no estilo Bowser: ataques em padrão claro (rajada rasteira, salto com pisão
 * e chuva de penas), leve variação na ordem e uma janela de tontura em que se pisa na cabeça.
 * Cada golpe o deixa mais rápido e com mais projéteis. Três golpes e ele cai de joelhos.
 */
export class BossHelioFase1 {
  public readonly sprite: Phaser.GameObjects.Sprite;
  public vida: number = B.VIDA;
  public estado: EstadoHelio = 'inativo';
  public ataqueAtual?: AtaqueHelio;

  private readonly cena: Phaser.Scene;
  private readonly efeitos: Phaser.GameObjects.Graphics;
  private projeteis: ProjetilHelio[] = [];
  private filaAtaques: AtaqueHelio[] = [];
  private timerMs: number = 0;
  private alvoX: number = B.X_INICIAL;

  // Estado interno de cada ataque
  private ondasRestantes: number = 0;
  private proximaOndaMs: number = 0;
  private saltosRestantes: number = 0;
  private salto?: { x0: number; x1: number; progresso: number };
  private pausaSaltoMs: number = 0;
  private faseChuva: FaseChuva = 'subindo';

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    this.sprite = cena.add.sprite(B.X_INICIAL, A.CHAO_Y, 'boss-helio');
    this.sprite.setOrigin(0.5, 1); // Pés no chão: escalar não descola o Helio do piso
    this.sprite.setDepth(B.PROFUNDIDADE);
    this.sprite.setVisible(false);

    this.efeitos = cena.add.graphics();
    this.efeitos.setDepth(B.PROFUNDIDADE_EFEITOS);
  }

  /** Golpes já recebidos (0 a 3). */
  get golpes(): number {
    return B.VIDA - this.vida;
  }

  /** Multiplicador de velocidade: cada golpe acelera tempos e projéteis em 15%. */
  get fator(): number {
    return 1 + B.ACELERACAO_POR_GOLPE * this.golpes;
  }

  private get indiceFase(): number {
    return Math.min(this.golpes, 2);
  }

  /**
   * Volta ao começo: vida cheia, parado no lado direito da arena, sem projéteis.
   */
  public reiniciar(): void {
    this.vida = B.VIDA;
    this.estado = 'inativo';
    this.ataqueAtual = undefined;
    this.projeteis = [];
    this.filaAtaques = [];
    this.salto = undefined;
    this.timerMs = 0;
    this.sprite.setPosition(B.X_INICIAL, A.CHAO_Y);
    this.sprite.setScale(1);
    this.sprite.setAngle(0);
    this.sprite.setAlpha(1);
    this.sprite.clearTint();
    this.efeitos.clear();
  }

  public iniciarLuta(): void {
    this.sprite.setVisible(true);
    this.proximoCiclo();
  }

  /**
   * Comando do núcleo aceito: o Helio se desfaz numa nuvem de penas.
   */
  public desligar(): void {
    this.estado = 'desligado';
    this.projeteis = [];
    this.efeitos.clear();
    this.cena.tweens.add({
      targets: this.sprite,
      alpha: 0,
      angle: -25,
      scaleX: 0.6,
      scaleY: 0.2,
      duration: 1400,
      ease: 'Cubic.easeIn',
      onComplete: () => this.sprite.setVisible(false),
    });
  }

  public update(tempo: number, delta: number, jogador: Phaser.Physics.Arcade.Sprite, eventos: EventosHelio): void {
    if (this.estado === 'inativo' || this.estado === 'desligado') return;

    this.alvoX = jogador.x;
    const deltaAcelerado = delta * this.fator;

    switch (this.estado) {
      case 'aviso':
        this.timerMs += deltaAcelerado;
        if (this.timerMs >= this.duracaoTelegrafia()) this.iniciarAtaque();
        break;
      case 'atacando':
        this.atualizarAtaque(deltaAcelerado);
        break;
      case 'pausa':
        this.timerMs += deltaAcelerado;
        if (this.timerMs >= B.PAUSA_ENTRE_ATAQUES_MS) this.proximoAtaque();
        break;
      case 'tonto':
        // A janela de tontura não acelera: é a recompensa por sobreviver ao ciclo
        this.timerMs += delta;
        if (this.timerMs >= B.TONTO_MS) this.proximoCiclo();
        break;
      case 'ferido':
        this.timerMs += delta;
        if (this.timerMs >= B.FERIDO_MS) this.proximoCiclo();
        break;
      case 'derrotado':
        break;
    }

    this.atualizarProjeteis(delta);
    this.verificarJogador(jogador, eventos);
    this.renderizar(tempo);
  }

  // ===========================================================================
  // SEQUÊNCIA DE ATAQUES
  // ===========================================================================

  /**
   * Um ciclo: rajada e salto em ordem sorteada, depois a chuva de penas, depois a tontura.
   */
  private proximoCiclo(): void {
    this.sprite.clearTint();
    this.sprite.setScale(1);
    const abertura = Phaser.Utils.Array.Shuffle<AtaqueHelio>(['rajada', 'salto']);
    this.filaAtaques = [...abertura, 'chuva'];
    this.proximoAtaque();
  }

  private proximoAtaque(): void {
    const ataque = this.filaAtaques.shift();
    if (!ataque) {
      this.estado = 'tonto';
      this.ataqueAtual = undefined;
      this.timerMs = 0;
      emitirSom(this.cena, 'boss_tonto', this.sprite.x);
      return;
    }
    this.ataqueAtual = ataque;
    this.estado = 'aviso';
    this.timerMs = 0;
    emitirSom(this.cena, 'boss_aviso', this.sprite.x);
  }

  private duracaoTelegrafia(): number {
    switch (this.ataqueAtual) {
      case 'rajada':
        return B.TELEGRAFIA_RAJADA_MS;
      case 'salto':
        return B.TELEGRAFIA_SALTO_MS;
      default:
        return B.TELEGRAFIA_CHUVA_MS;
    }
  }

  private iniciarAtaque(): void {
    this.estado = 'atacando';
    this.timerMs = 0;
    this.sprite.setScale(1);

    switch (this.ataqueAtual) {
      case 'rajada':
        this.ondasRestantes = B.ONDAS_POR_GOLPES[this.indiceFase];
        this.proximaOndaMs = 0;
        break;
      case 'salto':
        this.saltosRestantes = B.SALTOS_POR_GOLPES[this.indiceFase];
        this.comecarSalto();
        break;
      case 'chuva':
        this.faseChuva = 'subindo';
        break;
    }
  }

  private terminarAtaque(): void {
    this.estado = 'pausa';
    this.timerMs = 0;
  }

  private atualizarAtaque(deltaAcelerado: number): void {
    switch (this.ataqueAtual) {
      case 'rajada': {
        this.proximaOndaMs -= deltaAcelerado;
        if (this.ondasRestantes > 0 && this.proximaOndaMs <= 0) {
          this.lancarOnda();
          this.ondasRestantes--;
          this.proximaOndaMs = B.INTERVALO_ONDAS_MS;
        }
        if (this.ondasRestantes === 0 && !this.existeProjetil('onda')) this.terminarAtaque();
        break;
      }

      case 'salto': {
        if (this.salto) {
          this.salto.progresso += deltaAcelerado / B.SALTO_MS;
          const p = Math.min(1, this.salto.progresso);
          this.sprite.x = Phaser.Math.Linear(this.salto.x0, this.salto.x1, p);
          this.sprite.y = A.CHAO_Y - 4 * B.SALTO_ALTURA * p * (1 - p);
          if (p >= 1) this.aterrissar();
        } else if (this.pausaSaltoMs > 0) {
          this.pausaSaltoMs -= deltaAcelerado;
        } else if (this.saltosRestantes > 0) {
          this.comecarSalto();
        } else if (!this.existeProjetil('choque')) {
          this.terminarAtaque();
        }
        break;
      }

      case 'chuva': {
        this.timerMs += deltaAcelerado;
        if (this.faseChuva === 'subindo') {
          const p = Math.min(1, this.timerMs / B.SUBIDA_MS);
          this.sprite.y = A.CHAO_Y - B.ALTURA_VOO * Phaser.Math.Easing.Sine.Out(p);
          if (p >= 1) {
            this.lancarPenas();
            this.faseChuva = 'chovendo';
          }
        } else if (this.faseChuva === 'chovendo') {
          if (!this.existeProjetil('pena')) {
            this.faseChuva = 'descendo';
            this.timerMs = 0;
          }
        } else {
          const p = Math.min(1, this.timerMs / B.SUBIDA_MS);
          this.sprite.y = A.CHAO_Y - B.ALTURA_VOO * (1 - Phaser.Math.Easing.Sine.In(p));
          if (p >= 1) {
            this.sprite.y = A.CHAO_Y;
            this.terminarAtaque();
          }
        }
        break;
      }
    }
  }

  private comecarSalto(): void {
    this.saltosRestantes--;
    emitirSom(this.cena, 'boss_salto', this.sprite.x);
    const destino = Phaser.Math.Clamp(this.alvoX, A.LIMITE_ESQUERDO, A.LIMITE_DIREITO);
    this.salto = { x0: this.sprite.x, x1: destino, progresso: 0 };
  }

  private aterrissar(): void {
    this.salto = undefined;
    this.sprite.y = A.CHAO_Y;
    this.pausaSaltoMs = B.PAUSA_POS_SALTO_MS;
    this.cena.cameras.main.shake(220, 0.008);
    emitirSom(this.cena, 'boss_choque', this.sprite.x);

    // Ondas de choque correndo pelo chão para os dois lados
    for (const direcao of [-1, 1]) {
      this.projeteis.push({
        tipo: 'choque',
        x: this.sprite.x + direcao * (B.LARGURA_CORPO / 2),
        y: A.CHAO_Y - B.CHOQUE_ALTURA / 2,
        vx: direcao * B.CHOQUE_VELOCIDADE * this.fator,
        vy: 0,
        largura: B.CHOQUE_LARGURA,
        altura: B.CHOQUE_ALTURA,
        esperaMs: 0,
        avisoTotalMs: 0,
      });
    }
  }

  private lancarOnda(): void {
    const direcao = this.alvoX >= this.sprite.x ? 1 : -1;
    emitirSom(this.cena, 'boss_onda', this.sprite.x);
    this.projeteis.push({
      tipo: 'onda',
      x: this.sprite.x + direcao * (B.LARGURA_CORPO / 2),
      y: A.CHAO_Y - B.ONDA_ALTURA / 2,
      vx: direcao * B.ONDA_VELOCIDADE * this.fator,
      vy: 0,
      largura: B.ONDA_LARGURA,
      altura: B.ONDA_ALTURA,
      esperaMs: 0,
      avisoTotalMs: 0,
    });
  }

  /**
   * A primeira pena mira onde o jogador está; as outras se espalham pela arena sem se sobrepor.
   */
  private lancarPenas(): void {
    emitirSom(this.cena, 'boss_penas');
    const quantidade = B.PENAS_POR_GOLPES[this.indiceFase];
    const posicoes: number[] = [Phaser.Math.Clamp(this.alvoX, A.LIMITE_ESQUERDO, A.LIMITE_DIREITO)];

    for (let tentativa = 0; posicoes.length < quantidade && tentativa < 200; tentativa++) {
      const x = Phaser.Math.Between(A.LIMITE_ESQUERDO, A.LIMITE_DIREITO);
      if (posicoes.every((p) => Math.abs(p - x) >= B.DISTANCIA_MIN_PENAS)) posicoes.push(x);
    }

    posicoes.forEach((x, i) => {
      const aviso = (B.AVISO_PENA_MS + i * B.ESPACAMENTO_PENAS_MS) / this.fator;
      this.projeteis.push({
        tipo: 'pena',
        x,
        y: -B.PENA_ALTURA,
        vx: 0,
        vy: B.PENA_VELOCIDADE * this.fator,
        largura: B.PENA_LARGURA,
        altura: B.PENA_ALTURA,
        esperaMs: aviso,
        avisoTotalMs: aviso,
      });
    });
  }

  private existeProjetil(tipo: ProjetilHelio['tipo']): boolean {
    return this.projeteis.some((p) => p.tipo === tipo);
  }

  private atualizarProjeteis(delta: number): void {
    const dt = delta / 1000;
    const limiteEsquerdo = A.LIMITE_ESQUERDO - 120;
    const limiteDireito = A.LIMITE_DIREITO + 120;

    this.projeteis = this.projeteis.filter((p) => {
      if (p.tipo === 'pena') {
        if (p.esperaMs > 0) {
          p.esperaMs -= delta;
          return true;
        }
        p.y += p.vy * dt;
        const chegou = p.y + p.altura / 2 >= A.CHAO_Y;
        if (chegou) emitirSom(this.cena, 'pena_impacto', p.x, 0.7);
        return !chegou;
      }
      p.x += p.vx * dt;
      return p.x > limiteEsquerdo && p.x < limiteDireito;
    });
  }

  // ===========================================================================
  // CONTATO COM O JOGADOR
  // ===========================================================================

  private retanguloCorpo(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.sprite.x - B.LARGURA_CORPO / 2,
      this.sprite.y - B.ALTURA_CORPO,
      B.LARGURA_CORPO,
      B.ALTURA_CORPO
    );
  }

  private verificarJogador(jogador: Phaser.Physics.Arcade.Sprite, eventos: EventosHelio): void {
    const corpoJogador = jogador.body as Phaser.Physics.Arcade.Body;
    const rJogador = new Phaser.Geom.Rectangle(corpoJogador.x, corpoJogador.y, corpoJogador.width, corpoJogador.height);
    const rHelio = this.retanguloCorpo();
    const direcaoParaJogador = jogador.x >= this.sprite.x ? 1 : -1;

    // Pisão: caindo, com os pés na altura do topo da cabeça e por cima dela
    const sobreposicaoX = rJogador.right > rHelio.left && rJogador.left < rHelio.right;
    const pesNaCabeca = Math.abs(rJogador.bottom - rHelio.top) <= B.ZONA_PISAO;
    if (this.estado === 'tonto' && corpoJogador.velocity.y > 0 && sobreposicaoX && pesNaCabeca) {
      this.receberPisao();
      eventos.aoSerPisado();
      return;
    }

    // Encostar no Helio machuca, exceto quando ele está tonto, ferido ou derrotado
    const corpoPerigoso = this.estado === 'aviso' || this.estado === 'atacando' || this.estado === 'pausa';
    if (corpoPerigoso && Phaser.Geom.Intersects.RectangleToRectangle(rJogador, rHelio)) {
      eventos.aoFerirJogador(direcaoParaJogador);
      return;
    }

    for (const p of this.projeteis) {
      if (p.tipo === 'pena' && p.esperaMs > 0) continue;
      const rProjetil = new Phaser.Geom.Rectangle(p.x - p.largura / 2, p.y - p.altura / 2, p.largura, p.altura);
      if (Phaser.Geom.Intersects.RectangleToRectangle(rJogador, rProjetil)) {
        const direcao = p.vx !== 0 ? Math.sign(p.vx) : jogador.x >= p.x ? 1 : -1;
        eventos.aoFerirJogador(direcao);
        return;
      }
    }
  }

  private receberPisao(): void {
    this.vida--;
    this.timerMs = 0;
    if (this.vida <= 0) {
      this.estado = 'derrotado';
      this.projeteis = [];
      this.sprite.setScale(1.1, 0.78); // De joelhos
      this.sprite.setTint(0x94a3b8);
      return;
    }
    this.estado = 'ferido';
  }

  // ===========================================================================
  // DESENHO
  // ===========================================================================

  private renderizar(tempo: number): void {
    const g = this.efeitos;
    g.clear();

    this.renderizarEstado(g, tempo);

    for (const p of this.projeteis) {
      if (p.tipo === 'onda') this.desenharOnda(g, p, tempo);
      else if (p.tipo === 'choque') this.desenharChoque(g, p, tempo);
      else if (p.esperaMs > 0) this.desenharAvisoPena(g, p, tempo);
      else this.desenharPena(g, p, tempo);
    }
  }

  /**
   * Onda de vento rasteira: um mini-tornado (anéis empilhados que balançam e alargam para cima),
   * com núcleo ciano, riscos de rastro para trás e poeira no pé. Pule por cima.
   */
  private desenharOnda(g: Phaser.GameObjects.Graphics, p: ProjetilHelio, tempo: number): void {
    const frente = Math.sign(p.vx) || 1;
    const base = p.y + p.altura / 2;
    const topo = p.y - p.altura / 2;
    const aneis = 6;

    // Rastro: riscos ondulados atrás do tornado
    for (let k = 0; k < 4; k++) {
      const y = topo + 12 + k * 13;
      const comprimento = 30 + ((k * 17 + tempo / 8) % 30);
      const inicio = p.x - frente * (p.largura / 2 + 4);
      g.lineStyle(k % 2 ? 2 : 3, k % 2 ? CORES_FASE1.CIANO_CLARO : 0xffffff, 0.75 - k * 0.12);
      g.beginPath();
      g.moveTo(inicio, y);
      g.lineTo(inicio - frente * comprimento * 0.5, y + Math.sin(tempo * 0.02 + k) * 3);
      g.lineTo(inicio - frente * comprimento, y);
      g.strokePath();
    }

    // Halo e núcleo
    g.fillStyle(CORES_FASE1.CIANO, 0.22);
    g.fillEllipse(p.x, p.y, p.largura + 22, p.altura + 10);
    g.fillStyle(CORES_FASE1.VENTO, 0.85);
    g.fillTriangle(p.x - p.largura / 2 - 4, topo, p.x + p.largura / 2 + 4, topo, p.x, base);

    // Anéis girando: largos em cima, finos embaixo
    for (let k = 0; k < aneis; k++) {
      const t = k / (aneis - 1);
      const y = base - 6 - t * (p.altura - 10);
      const largura = 12 + t * (p.largura + 6);
      const balanco = Math.sin(tempo * 0.02 + k * 0.9) * 5 * t;
      g.lineStyle(3, CORES_FASE1.CIANO, 0.9);
      g.strokeEllipse(p.x + balanco, y + 1, largura, 9);
      g.lineStyle(2, 0xffffff, 1);
      g.beginPath();
      const giro = tempo * 0.015 + k;
      g.arc(p.x + balanco, y, largura / 2, giro, giro + Math.PI * 0.9);
      g.strokePath();
    }

    // Poeira e pedrinhas levantadas no pé
    g.fillStyle(CORES_FASE1.MARMORE_SOMBRA, 0.8);
    for (let k = 0; k < 4; k++) {
      const angulo = tempo * 0.02 + (k * Math.PI) / 2;
      g.fillCircle(p.x + Math.cos(angulo) * 16, base - 4 + Math.sin(angulo) * 3, 4 - (k % 2));
    }
  }

  /**
   * Onda de choque do pisão: estouro de poeira dourada rente ao chão, com arco de impacto e
   * lascas de mármore pulando. Pule no tempo certo.
   */
  private desenharChoque(g: Phaser.GameObjects.Graphics, p: ProjetilHelio, tempo: number): void {
    const frente = Math.sign(p.vx) || 1;
    const base = p.y + p.altura / 2;

    g.fillStyle(CORES_FASE1.OURO, 0.25);
    g.fillEllipse(p.x - frente * 14, base - 4, p.largura + 34, 14);
    g.fillStyle(CORES_FASE1.OURO_CLARO, 0.9);
    g.fillEllipse(p.x, base - p.altura / 2 + 2, p.largura, p.altura);
    g.fillStyle(CORES_FASE1.OURO, 1);
    g.fillEllipse(p.x + frente * 4, base - p.altura / 2 + 4, p.largura * 0.7, p.altura * 0.7);

    // Arco de impacto na frente
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.arc(p.x, base, p.largura / 2 + 2, frente > 0 ? -Math.PI / 2 : Math.PI, frente > 0 ? 0 : -Math.PI / 2);
    g.strokePath();
    g.lineStyle(2, CORES_FASE1.OURO_ESCURO, 1);
    g.beginPath();
    g.arc(p.x - frente * 6, base, p.largura / 2 - 6, frente > 0 ? -Math.PI / 2 : Math.PI, frente > 0 ? 0 : -Math.PI / 2);
    g.strokePath();

    // Lascas de mármore saltando
    for (let k = 0; k < 4; k++) {
      const ciclo = ((tempo / 260 + k * 0.25) % 1);
      const lx = p.x - frente * (6 + k * 7);
      const ly = base - 6 - Math.sin(ciclo * Math.PI) * (16 + k * 4);
      g.fillStyle(k % 2 ? CORES_FASE1.MARMORE : CORES_FASE1.MARMORE_ESCURO, 1);
      g.fillRect(lx, ly, 4, 4);
    }
  }

  /**
   * Aviso de pena: feixe de luz dourada descendo até o ponto de queda, com losangos correndo
   * para baixo e um alvo no chão que fecha e escurece até a queda.
   */
  private desenharAvisoPena(g: Phaser.GameObjects.Graphics, p: ProjetilHelio, tempo: number): void {
    const urgencia = 1 - p.esperaMs / p.avisoTotalMs;
    const chao = A.CHAO_Y - 3;

    g.fillStyle(CORES_FASE1.OURO_CLARO, 0.08 + urgencia * 0.14);
    g.fillTriangle(p.x - 4, 60, p.x + 4, 60, p.x + 22, chao);
    g.fillTriangle(p.x - 4, 60, p.x - 22, chao, p.x + 22, chao);
    g.fillStyle(CORES_FASE1.ALERTA, 0.35 + urgencia * 0.5);
    for (let y = 70 + ((tempo * 0.25) % 40); y < chao - 20; y += 40) {
      g.fillTriangle(p.x, y - 6, p.x + 4, y, p.x - 4, y);
      g.fillTriangle(p.x, y + 6, p.x + 4, y, p.x - 4, y);
    }

    const raio = 30 - urgencia * 14;
    g.fillStyle(0x1e1b4b, 0.3 + urgencia * 0.45);
    g.fillEllipse(p.x, chao, 26 + urgencia * 28, 8 + urgencia * 6);
    g.lineStyle(2, CORES_FASE1.ALERTA, 0.5 + urgencia * 0.5);
    g.strokeEllipse(p.x, chao, raio * 2, raio * 0.5);
    g.lineBetween(p.x - raio - 6, chao, p.x - raio + 2, chao);
    g.lineBetween(p.x + raio - 2, chao, p.x + raio + 6, chao);
  }

  /**
   * Pena caindo: haste dourada, barbas brancas em gomos inclinados com ponta magenta (a capa
   * do Helio), balançando, com rastro de brilho e a sombra no chão.
   */
  private desenharPena(g: Phaser.GameObjects.Graphics, p: ProjetilHelio, tempo: number): void {
    g.fillStyle(0x1e1b4b, 0.65);
    g.fillEllipse(p.x, A.CHAO_Y - 3, 46, 12);

    const meia = p.altura / 2;
    const balanco = Math.sin(tempo * 0.03 + p.x) * 3;
    const topoX = p.x + balanco;

    // Rastro
    g.fillStyle(CORES_FASE1.OURO_CLARO, 0.25);
    g.fillTriangle(topoX - 6, p.y - meia, topoX + 6, p.y - meia, p.x, p.y - meia - 60);
    g.fillStyle(0xffffff, 0.9);
    for (let k = 1; k <= 3; k++) g.fillRect(p.x + Math.sin(tempo * 0.02 + k) * 6, p.y - meia - k * 16, 2, 2);

    // Barbas da pena (gomos dos dois lados da haste)
    const gomos = 6;
    for (let k = 0; k < gomos; k++) {
      const t = k / gomos;
      const y = p.y - meia + 4 + t * (p.altura - 12);
      const x = topoX + (p.x - topoX) * t;
      const largura = (p.largura / 2) * Math.sin(Math.PI * (0.15 + t * 0.85));
      const cor = k < 2 ? CORES_FASE1.HELIO_CAPA : k % 2 ? 0xffffff : CORES_FASE1.NUVEM_SOMBRA;
      g.fillStyle(cor, 1);
      g.fillTriangle(x, y, x - largura, y - 5, x - largura + 2, y + 6);
      g.fillTriangle(x, y, x + largura, y - 5, x + largura - 2, y + 6);
    }
    // Haste dourada
    g.lineStyle(2, CORES_FASE1.OURO_ESCURO, 1);
    g.lineBetween(topoX, p.y - meia, p.x, p.y + meia);
    g.fillStyle(CORES_FASE1.OURO, 1);
    g.fillTriangle(p.x - 2, p.y + meia - 6, p.x + 2, p.y + meia - 6, p.x, p.y + meia + 2);
  }

  /**
   * Marca no chão onde o Helio vai cair: sombra escura com anel laranja, que cresce durante o salto.
   */
  private desenharAlvoSalto(g: Phaser.GameObjects.Graphics, x: number, progresso: number): void {
    const largura = 80 + progresso * 40;
    g.fillStyle(0x1e1b4b, 0.4 + progresso * 0.4);
    g.fillEllipse(x, A.CHAO_Y - 3, largura, 16);
    g.lineStyle(3, 0xf97316, 0.9);
    g.strokeEllipse(x, A.CHAO_Y - 3, largura + 10, 20);
  }

  private renderizarEstado(g: Phaser.GameObjects.Graphics, tempo: number): void {
    const topoCabeca = this.sprite.y - B.ALTURA_CORPO;
    const piscando = Math.floor(tempo / 100) % 2 === 0;

    switch (this.estado) {
      case 'aviso': {
        // Pisca em amarelo e mostra o que vem: redemoinho (rajada), agachamento (salto), penas (chuva)
        if (piscando) this.sprite.setTint(0xfde68a);
        else this.sprite.clearTint();

        if (this.ataqueAtual === 'rajada') {
          const frente = this.alvoX >= this.sprite.x ? 1 : -1;
          g.lineStyle(3, 0xe0f2fe, 0.9);
          for (let i = 0; i < 3; i++) {
            g.strokeCircle(this.sprite.x + frente * 60, A.CHAO_Y - 30, 10 + ((tempo / 6 + i * 12) % 30));
          }
        } else if (this.ataqueAtual === 'salto') {
          this.sprite.setScale(1.08, 0.86);
          this.desenharAlvoSalto(g, Phaser.Math.Clamp(this.alvoX, A.LIMITE_ESQUERDO, A.LIMITE_DIREITO), 0);
        } else {
          g.fillStyle(0xffffff, 0.9);
          for (let i = 0; i < 4; i++) {
            const angulo = tempo * 0.006 + (i * Math.PI) / 2;
            g.fillEllipse(this.sprite.x + Math.cos(angulo) * 50, topoCabeca - 20 + Math.sin(angulo) * 12, 8, 18);
          }
        }
        break;
      }
      case 'atacando':
      case 'pausa':
        this.sprite.clearTint();
        if (this.salto) {
          this.desenharAlvoSalto(g, this.salto.x1, this.salto.progresso);
        }
        break;
      case 'tonto': {
        // Cabeça brilhando e estrelas girando: hora de pisar
        this.sprite.setTint(Math.floor(tempo / 160) % 2 === 0 ? 0xfef08a : 0xffffff);
        g.fillStyle(0xfef08a, 0.35);
        g.fillCircle(this.sprite.x, topoCabeca + 18, 30);
        g.fillStyle(0xfbbf24, 1);
        for (let i = 0; i < 3; i++) {
          const angulo = tempo * 0.008 + (i * Math.PI * 2) / 3;
          g.fillCircle(this.sprite.x + Math.cos(angulo) * 34, topoCabeca - 12 + Math.sin(angulo) * 8, 6);
        }
        // Barra da janela de tontura acabando
        const restante = 1 - this.timerMs / B.TONTO_MS;
        g.fillStyle(0x1e293b, 0.8);
        g.fillRect(this.sprite.x - 40, topoCabeca - 40, 80, 6);
        g.fillStyle(0xfbbf24, 1);
        g.fillRect(this.sprite.x - 40, topoCabeca - 40, 80 * restante, 6);
        break;
      }
      case 'ferido':
        if (piscando) this.sprite.setTint(0xf87171);
        else this.sprite.clearTint();
        break;
      default:
        break;
    }
  }
}
