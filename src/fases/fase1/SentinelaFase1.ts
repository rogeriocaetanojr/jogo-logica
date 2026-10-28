import Phaser from 'phaser';
import type { ConfigSentinela, EstadoSentinela, TipoDeteccaoSentinela } from './tiposFase1';
import { SENTINELAS_FASE1 } from './constantesFase1';

/**
 * Avisos da sentinela para a cena, que decide o que acontece com o jogador.
 */
export interface EventosSentinela {
  /** Alerta máximo: o jogador foi visto e deve voltar ao checkpoint. */
  aoDetectar: (sentinela: SentinelaFase1) => void;
  /** A rajada lateral saiu na direção em que a sentinela olha. */
  aoRajar: (sentinela: SentinelaFase1) => void;
}

/**
 * Entidade modularizada de Drone Sentinela da Fase 1: Céu Partido.
 * Encapsula física Arcade independente de FPS (delta-time), cone de visão triangular,
 * pulso eólico descendente, rajada lateral telegrafada e o modo balsa depois de hackeada.
 */
export class SentinelaFase1 {
  public cena: Phaser.Scene;
  public id: string;
  public sprite: Phaser.Physics.Arcade.Sprite;
  public coneGrafico: Phaser.GameObjects.Graphics;
  public graficoPulso: Phaser.GameObjects.Graphics;

  public xInicial: number;
  public yInicial: number;
  public minX: number;
  public maxX: number;
  public velocidade: number;
  public direcao: number = 1; // 1 = direita, -1 = esquerda
  public alcanceVisao: number;
  public aberturaCone: number;
  public deteccao: TipoDeteccaoSentinela;

  public emAlerta: boolean = false;
  public hackeada: boolean = false;
  public escudoAtivo: boolean = false;
  public podeDispararPulso: boolean = true;

  public estado: EstadoSentinela = 'scanner';
  public timerEstadoMs: number = 0;

  // Rajada lateral: tempo dentro de mirando/rajando e recarga até poder mirar de novo
  private timerAcaoMs: number = 0;
  private recargaRajadaAte: number = 0;

  // Balsa sobre a qual a sentinela fica pousada depois de hackeada
  private plataformaAlvo?: { readonly x: number; readonly y: number };

  constructor(cena: Phaser.Scene, id: string, cfg: ConfigSentinela) {
    this.cena = cena;
    this.id = id;
    this.xInicial = cfg.x;
    this.yInicial = cfg.y;
    this.minX = cfg.minX;
    this.maxX = cfg.maxX;
    this.velocidade = cfg.velocidade;
    this.podeDispararPulso = cfg.podeDispararPulso;
    this.deteccao = cfg.deteccao;
    this.alcanceVisao = SENTINELAS_FASE1.ALCANCE_VISAO_PADRAO;
    this.aberturaCone = SENTINELAS_FASE1.ABERTURA_CONE_PADRAO;

    // Sprite físico Arcade
    this.sprite = this.cena.physics.add.sprite(cfg.x, cfg.y, 'sentinela-drone');
    this.sprite.setDepth(SENTINELAS_FASE1.PROFUNDIDADE_SPRITE);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.sprite.setVelocityX(this.velocidade);

    // Gráficos dedicados
    this.coneGrafico = this.cena.add.graphics();
    this.coneGrafico.setDepth(SENTINELAS_FASE1.PROFUNDIDADE_CONE);

    this.graficoPulso = this.cena.add.graphics();
    this.graficoPulso.setDepth(SENTINELAS_FASE1.PROFUNDIDADE_PULSO);
  }

  /**
   * Atualização frame a frame com dependência estrita de delta (independente de FPS).
   */
  public update(
    tempo: number,
    delta: number,
    jogador: Phaser.Physics.Arcade.Sprite,
    emCongelamento: boolean,
    eventos: EventosSentinela
  ): void {
    if (this.estado === 'plataforma') {
      this.seguirPlataforma();
      return;
    }

    if (this.hackeada || this.estado === 'desativada') {
      this.coneGrafico.clear();
      this.graficoPulso.clear();
      return;
    }

    if (emCongelamento) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    // 1. Oscilação vertical suave em Y
    this.sprite.y =
      this.yInicial +
      Math.sin(tempo * SENTINELAS_FASE1.OSCILACAO_Y_VEL) *
        SENTINELAS_FASE1.OSCILACAO_Y_AMP;

    // 2. Rajada lateral: a mira e o sopro têm prioridade sobre patrulha e pulso
    if (this.estado === 'mirando') {
      this.timerAcaoMs += delta;
      this.renderizarConeVisao();
      if (this.timerAcaoMs >= SENTINELAS_FASE1.TEMPO_MIRA_MS) {
        this.estado = 'rajando';
        this.timerAcaoMs = 0;
        this.coneGrafico.clear();
        eventos.aoRajar(this);
      }
      return;
    }
    if (this.estado === 'rajando') {
      this.timerAcaoMs += delta;
      this.renderizarRajada();
      if (this.timerAcaoMs >= SENTINELAS_FASE1.TEMPO_RAJADA_MS) {
        this.estado = 'scanner';
        this.timerAcaoMs = 0;
        this.recargaRajadaAte = tempo + SENTINELAS_FASE1.RECARGA_RAJADA_MS;
        this.graficoPulso.clear();
        this.sprite.setVelocityX(this.direcao * this.velocidade);
      }
      return;
    }

    // 3. Máquina de estados: Scanner vs Pulso Eólico
    if (this.podeDispararPulso) {
      this.timerEstadoMs += delta;

      if (this.estado === 'scanner') {
        if (this.timerEstadoMs >= SENTINELAS_FASE1.TEMPO_SCANNER_MS) {
          this.transicionarParaCarregandoPulso();
        }
      } else if (this.estado === 'carregando_pulso') {
        this.renderizarCarregandoPulso(tempo);
        if (this.timerEstadoMs >= SENTINELAS_FASE1.TEMPO_CARGA_PULSO_MS) {
          this.dispararPulsoEolico(jogador);
        }
        return; // Não patrulha nem escaneia enquanto carrega o pulso
      } else if (this.estado === 'disparando_pulso') {
        this.renderizarDisparoPulso();
        if (this.timerEstadoMs >= SENTINELAS_FASE1.TEMPO_DISPARO_PULSO_MS) {
          this.transicionarParaScanner();
        }
        return;
      }
    }

    // 4. Patrulha horizontal independente de FPS
    if (this.direcao === 1) {
      if (this.sprite.x >= this.maxX) {
        this.sprite.x = this.maxX;
        this.direcao = -1;
        this.sprite.setVelocityX(-this.velocidade);
        this.sprite.setFlipX(true);
      } else {
        this.sprite.setVelocityX(this.velocidade);
        this.sprite.setFlipX(false);
      }
    } else {
      if (this.sprite.x <= this.minX) {
        this.sprite.x = this.minX;
        this.direcao = 1;
        this.sprite.setVelocityX(this.velocidade);
        this.sprite.setFlipX(false);
      } else {
        this.sprite.setVelocityX(-this.velocidade);
        this.sprite.setFlipX(true);
      }
    }

    // Salvaguarda adicional contra overshoot de quadros
    if (this.sprite.x > this.maxX) {
      this.sprite.x = this.maxX;
      this.direcao = -1;
      this.sprite.setVelocityX(-this.velocidade);
    } else if (this.sprite.x < this.minX) {
      this.sprite.x = this.minX;
      this.direcao = 1;
      this.sprite.setVelocityX(this.velocidade);
    }

    // 5. Renderização do cone de visão e detecção óptica
    this.renderizarConeVisao();
    this.verificarDeteccaoJogador(jogador, tempo, eventos);
  }

  private transicionarParaCarregandoPulso(): void {
    this.estado = 'carregando_pulso';
    this.timerEstadoMs = 0;
    this.sprite.setVelocityX(0);
    this.coneGrafico.clear();
  }

  private renderizarCarregandoPulso(tempo: number): void {
    this.coneGrafico.clear();
    this.graficoPulso.clear();

    const progresso = Math.min(1, this.timerEstadoMs / SENTINELAS_FASE1.TEMPO_CARGA_PULSO_MS);
    const raioCarga = 20 + progresso * 35 + Math.sin(tempo * 0.03) * 6;

    this.graficoPulso.lineStyle(2, SENTINELAS_FASE1.COR_CARGA_PULSO, 0.85);
    this.graficoPulso.strokeCircle(this.sprite.x, this.sprite.y, raioCarga);

    this.graficoPulso.fillStyle(SENTINELAS_FASE1.COR_CARGA_PULSO, 0.25 * progresso);
    this.graficoPulso.fillCircle(this.sprite.x, this.sprite.y, raioCarga);

    // Faíscas no centro
    this.graficoPulso.fillStyle(0xffffff, 0.9);
    this.graficoPulso.fillCircle(this.sprite.x, this.sprite.y, 6 + Math.random() * 4);
  }

  private dispararPulsoEolico(jogador: Phaser.Physics.Arcade.Sprite): void {
    this.estado = 'disparando_pulso';
    this.timerEstadoMs = 0;

    // Efeito sonoro/câmera
    this.cena.cameras.main.shake(180, 0.005);

    // Verificação de área do impacto e empurrão descendente no jogador
    const distAoJogador = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      jogador.x,
      jogador.y
    );

    if (distAoJogador <= SENTINELAS_FASE1.RAIO_PULSO_MAX) {
      const corpo = jogador.body as Phaser.Physics.Arcade.Body | null;
      if (corpo) {
        // Empurra violentamente para baixo
        jogador.setVelocityY(SENTINELAS_FASE1.FORCA_PULSO_DESCENDENTE);
        jogador.setTint(0x38bdf8);
        this.cena.time.delayedCall(300, () => {
          if (!this.hackeada) jogador.clearTint();
        });
      }
    }
  }

  private renderizarDisparoPulso(): void {
    this.graficoPulso.clear();
    const progresso = Math.min(1, this.timerEstadoMs / SENTINELAS_FASE1.TEMPO_DISPARO_PULSO_MS);
    const raioAtual = 30 + progresso * (SENTINELAS_FASE1.RAIO_PULSO_MAX - 30);
    const alfaAtual = 1 - progresso;

    // Onda circular de choque e rajadas descendentes
    this.graficoPulso.lineStyle(4, SENTINELAS_FASE1.COR_DISPARO_PULSO, alfaAtual);
    this.graficoPulso.strokeCircle(this.sprite.x, this.sprite.y, raioAtual);

    this.graficoPulso.fillStyle(0x38bdf8, alfaAtual * 0.2);
    this.graficoPulso.fillCircle(this.sprite.x, this.sprite.y, raioAtual);

    // Linhas verticais de empuxo descendente
    this.graficoPulso.lineStyle(2, 0xffffff, alfaAtual * 0.8);
    for (let offset = -40; offset <= 40; offset += 20) {
      this.graficoPulso.lineBetween(
        this.sprite.x + offset,
        this.sprite.y + 10,
        this.sprite.x + offset,
        this.sprite.y + 60 + progresso * 80
      );
    }
  }

  /**
   * Linhas de vento saindo da sentinela na direção em que ela olha.
   */
  private renderizarRajada(): void {
    this.graficoPulso.clear();
    const progresso = Math.min(1, this.timerAcaoMs / SENTINELAS_FASE1.TEMPO_RAJADA_MS);
    const inicioX = this.sprite.x + this.direcao * 20;
    const fimX = inicioX + this.direcao * SENTINELAS_FASE1.ALCANCE_RAJADA * progresso;

    this.graficoPulso.lineStyle(3, 0xffffff, 1 - progresso * 0.6);
    for (let i = -2; i <= 2; i++) {
      const y = this.sprite.y + i * 14;
      this.graficoPulso.lineBetween(inicioX, y, fimX - this.direcao * Math.abs(i) * 30, y);
    }
  }

  private transicionarParaScanner(): void {
    this.estado = 'scanner';
    this.timerEstadoMs = 0;
    this.graficoPulso.clear();
    this.sprite.setVelocityX(this.direcao * this.velocidade);
  }

  private renderizarConeVisao(): void {
    this.coneGrafico.clear();

    const anguloBase = this.direcao === 1 ? 0 : 180;
    const pontaX = this.sprite.x + this.direcao * SENTINELAS_FASE1.OFFSET_PONTA_CONE_X;
    const pontaY = this.sprite.y;

    const dist = this.alcanceVisao;
    const rad1 = Phaser.Math.DegToRad(anguloBase - this.aberturaCone / 2);
    const rad2 = Phaser.Math.DegToRad(anguloBase + this.aberturaCone / 2);

    const p1x = pontaX + Math.cos(rad1) * dist;
    const p1y = pontaY + Math.sin(rad1) * dist;
    const p2x = pontaX + Math.cos(rad2) * dist;
    const p2y = pontaY + Math.sin(rad2) * dist;

    // Mirando, o cone pisca em branco: é o aviso de que a rajada vai sair
    let corCone: number = this.emAlerta ? 0xff0055 : SENTINELAS_FASE1.COR_CONE_ALERTA;
    let alfaFundo: number = SENTINELAS_FASE1.ALFA_CONE_FUNDO;
    if (this.estado === 'mirando') {
      const piscada = Math.floor(this.timerAcaoMs / SENTINELAS_FASE1.INTERVALO_PISCAR_MIRA_MS) % 2 === 0;
      corCone = piscada ? SENTINELAS_FASE1.COR_MIRA : SENTINELAS_FASE1.COR_CONE_ALERTA;
      alfaFundo = 0.35;
    }

    this.coneGrafico.fillStyle(corCone, alfaFundo);
    this.coneGrafico.fillTriangle(pontaX, pontaY, p1x, p1y, p2x, p2y);

    this.coneGrafico.lineStyle(1.5, corCone, SENTINELAS_FASE1.ALFA_CONE_BORDA);
    this.coneGrafico.strokeTriangle(pontaX, pontaY, p1x, p1y, p2x, p2y);
  }

  private verificarDeteccaoJogador(
    jogador: Phaser.Physics.Arcade.Sprite,
    tempo: number,
    eventos: EventosSentinela
  ): void {
    if (this.emAlerta) return;
    if (this.deteccao === 'rajada' && tempo < this.recargaRajadaAte) return;

    const distAoDrone = Phaser.Math.Distance.Between(
      jogador.x,
      jogador.y,
      this.sprite.x,
      this.sprite.y
    );

    if (distAoDrone > this.alcanceVisao) return;

    const anguloBase = this.direcao === 1 ? 0 : 180;
    const pontaX = this.sprite.x + this.direcao * SENTINELAS_FASE1.OFFSET_PONTA_CONE_X;
    const pontaY = this.sprite.y;

    const rad1 = Phaser.Math.DegToRad(anguloBase - this.aberturaCone / 2);
    const rad2 = Phaser.Math.DegToRad(anguloBase + this.aberturaCone / 2);

    const p1x = pontaX + Math.cos(rad1) * this.alcanceVisao;
    const p1y = pontaY + Math.sin(rad1) * this.alcanceVisao;
    const p2x = pontaX + Math.cos(rad2) * this.alcanceVisao;
    const p2y = pontaY + Math.sin(rad2) * this.alcanceVisao;

    const dentroDoCone = this.pontoEmTriangulo(
      jogador.x,
      jogador.y,
      pontaX,
      pontaY,
      p1x,
      p1y,
      p2x,
      p2y
    );

    if (!dentroDoCone) return;

    if (this.deteccao === 'respawn') {
      this.emAlerta = true;
      eventos.aoDetectar(this);
    } else {
      this.estado = 'mirando';
      this.timerAcaoMs = 0;
      this.sprite.setVelocityX(0);
    }
  }

  private pontoEmTriangulo(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ): boolean {
    const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
    const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
    const temNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const temPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(temNeg && temPos);
  }

  /**
   * Hackeada, a sentinela entra em sobrecarga, fica verde e pousa sobre a balsa,
   * acompanhando-a dali em diante. O jogador vê que o drone que bloqueava agora o carrega.
   */
  public transformarEmPlataforma(plataforma: { readonly x: number; readonly y: number }): void {
    if (this.hackeada) return;

    this.hackeada = true;
    this.estado = 'plataforma';
    this.emAlerta = false;
    this.escudoAtivo = false;
    this.plataformaAlvo = plataforma;

    this.coneGrafico.clear();
    this.graficoPulso.clear();

    const corpo = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (corpo) {
      corpo.setVelocity(0, 0);
      corpo.enable = false;
    }

    // Sobrecarga piscando em amarelo/cinza com faíscas procedurais, terminando em verde
    let piscadas = 0;
    this.cena.time.addEvent({
      delay: 80,
      repeat: 6,
      callback: () => {
        piscadas++;
        this.sprite.setTint(piscadas % 2 === 0 ? 0xfbbf24 : 0x64748b);

        const faisca = this.cena.add.graphics();
        faisca.setDepth(10);
        faisca.lineStyle(2, 0xfef08a, 1);
        const fx = this.sprite.x + (Math.random() - 0.5) * 40;
        const fy = this.sprite.y + (Math.random() - 0.5) * 40;
        faisca.lineBetween(fx, fy, fx + (Math.random() - 0.5) * 30, fy + (Math.random() - 0.5) * 30);
        this.cena.time.delayedCall(120, () => faisca.destroy());

        if (piscadas === 7) this.sprite.setTint(SENTINELAS_FASE1.COR_CONE_HACKEADA);
      },
    });

    this.seguirPlataforma();
  }

  private seguirPlataforma(): void {
    if (!this.plataformaAlvo) return;
    this.sprite.setPosition(
      this.plataformaAlvo.x,
      this.plataformaAlvo.y - SENTINELAS_FASE1.ALTURA_SOBRE_PLATAFORMA
    );
  }

  /**
   * Restaura a sentinela à posição e rota inicial de patrulha no respawn de checkpoint.
   * Se já estiver hackeada, mantém seu estado.
   */
  public resetarPosicao(): void {
    if (this.hackeada) return;

    this.sprite.setPosition(this.xInicial, this.yInicial);
    this.direcao = 1;
    this.sprite.setVelocity(this.velocidade, 0);
    this.sprite.setFlipX(false);
    this.sprite.clearTint();
    this.sprite.setAlpha(1);
    this.sprite.setVisible(true);

    const corpo = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (corpo) {
      corpo.enable = true;
      corpo.checkCollision.none = false;
    }

    this.emAlerta = false;
    this.estado = 'scanner';
    this.timerEstadoMs = 0;
    this.timerAcaoMs = 0;
    this.recargaRajadaAte = 0;
    this.coneGrafico.clear();
    this.graficoPulso.clear();
  }

  /**
   * Pausa imediatamente a movimentação da sentinela durante abertura de terminais ou diálogos.
   */
  public congelar(): void {
    if (this.hackeada || this.estado === 'desativada') return;
    const corpo = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (corpo) {
      this.sprite.setVelocity(0, 0);
    }
  }

  /**
   * Retoma a movimentação de patrulha após fechamento do terminal ou diálogo.
   */
  public descongelar(): void {
    if (this.hackeada || this.estado === 'desativada') return;
    const corpo = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (corpo && this.estado === 'scanner') {
      this.sprite.setVelocityX(this.direcao * this.velocidade);
    }
  }

  public destruir(): void {
    this.coneGrafico.destroy();
    this.graficoPulso.destroy();
    this.sprite.destroy();
  }
}
