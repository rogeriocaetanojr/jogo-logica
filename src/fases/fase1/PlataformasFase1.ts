import Phaser from 'phaser';
import type { ConfigPlataformaMovel, PlataformaInstavel, TipoPlataformaInstavel } from './tiposFase1';
import { JOGADOR_FASE1, MARMORE_RACHADO_FASE1, NUVEM_EFEMERA_FASE1 } from './constantesFase1';

const TEXTURA_POR_TIPO: Record<TipoPlataformaInstavel, string> = {
  rachado: 'marmore-rachado',
  efemera: 'nuvem-efemera',
};

/**
 * Plataformas que somem depois de pisadas e voltam alguns segundos depois:
 * - mármore rachado: treme em vermelho e quebra de uma vez;
 * - nuvem efêmera: vai ficando transparente até sumir.
 */
export class PlataformasInstaveisFase1 {
  public readonly grupo: Phaser.Physics.Arcade.StaticGroup;
  public readonly plataformas: PlataformaInstavel[] = [];

  private cena: Phaser.Scene;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    this.grupo = cena.physics.add.staticGroup();
  }

  public criar(x: number, y: number, tipo: TipoPlataformaInstavel): void {
    const sprite = this.grupo.create(x, y, TEXTURA_POR_TIPO[tipo]) as Phaser.Physics.Arcade.Sprite;
    sprite.refreshBody();

    this.plataformas.push({
      tipo,
      sprite,
      rachando: false,
      quebrada: false,
      tempoRachando: 0,
      xOriginal: x,
      yOriginal: y,
    });
  }

  /**
   * Callback de colisão do jogador: começa a contagem para a plataforma sumir.
   */
  public aoPisar(sprite: Phaser.Physics.Arcade.Sprite): void {
    const plat = this.plataformas.find((p) => p.sprite === sprite);
    if (plat && !plat.rachando && !plat.quebrada) {
      plat.rachando = true;
      plat.tempoRachando = this.cena.time.now;
      if (plat.tipo === 'rachado') {
        plat.sprite.setTint(JOGADOR_FASE1.TINT_RACHANDO);
      }
    }
  }

  public update(tempo: number): void {
    for (const plat of this.plataformas) {
      if (!plat.rachando || plat.quebrada) continue;

      const decorrido = tempo - plat.tempoRachando;

      if (plat.tipo === 'rachado') {
        plat.sprite.x =
          plat.xOriginal +
          Math.sin(tempo * MARMORE_RACHADO_FASE1.TREMOR_VELOCIDADE) * MARMORE_RACHADO_FASE1.TREMOR_AMPLITUDE;
        if (decorrido > MARMORE_RACHADO_FASE1.TEMPO_TELEGRAPH_MS) {
          this.quebrar(plat, MARMORE_RACHADO_FASE1.TEMPO_RESPAWN_MS, MARMORE_RACHADO_FASE1.DURACAO_FADE_IN_MS);
        }
      } else {
        const progresso = Math.min(1, decorrido / NUVEM_EFEMERA_FASE1.TEMPO_DISSIPAR_MS);
        plat.sprite.setAlpha(1 - progresso * (1 - NUVEM_EFEMERA_FASE1.ALFA_MINIMO));
        if (decorrido > NUVEM_EFEMERA_FASE1.TEMPO_DISSIPAR_MS) {
          this.quebrar(plat, NUVEM_EFEMERA_FASE1.TEMPO_RESPAWN_MS, NUVEM_EFEMERA_FASE1.DURACAO_FADE_IN_MS);
        }
      }
    }
  }

  /**
   * Adia o sumiço das plataformas que estavam sendo pisadas enquanto o mundo está congelado.
   */
  public adiarRachaduras(delta: number): void {
    for (const plat of this.plataformas) {
      if (plat.rachando) {
        plat.tempoRachando += delta;
      }
    }
  }

  /**
   * Devolve todas as plataformas intactas às posições originais (respawn de checkpoint).
   */
  public resetar(): void {
    for (const plat of this.plataformas) {
      plat.rachando = false;
      plat.quebrada = false;
      plat.sprite.x = plat.xOriginal;
      plat.sprite.y = plat.yOriginal;
      plat.sprite.setVisible(true);
      plat.sprite.setAlpha(1);
      plat.sprite.clearTint();
      plat.sprite.enableBody(false, plat.xOriginal, plat.yOriginal, true, true);
    }
  }

  private quebrar(plat: PlataformaInstavel, tempoRespawnMs: number, duracaoFadeInMs: number): void {
    plat.quebrada = true;
    plat.rachando = false;
    plat.sprite.x = plat.xOriginal;
    plat.sprite.setVisible(false);
    plat.sprite.disableBody(true, true);

    this.cena.time.delayedCall(tempoRespawnMs, () => {
      plat.quebrada = false;
      plat.sprite.setVisible(true);
      plat.sprite.enableBody(false, plat.xOriginal, plat.yOriginal, true, true);
      plat.sprite.setAlpha(0);
      this.cena.tweens.add({ targets: plat.sprite, alpha: 1, duration: duracaoFadeInMs });
    });
  }
}

/**
 * Plataforma móvel de mão única (só colide por cima) que vai e volta entre dois pontos,
 * pausando nas pontas. Move-se por velocidade, para o Arcade carregar quem está em cima.
 * Pode nascer inativa e ser ligada depois (ex.: a balsa da sentinela hackeada).
 */
export class PlataformaMovelFase1 {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;

  private readonly mundo: Phaser.Physics.Arcade.World;
  private readonly inicio: Phaser.Math.Vector2;
  private readonly fim: Phaser.Math.Vector2;
  private readonly velocidade: number;
  private readonly pausaMs: number;
  private indoParaFim: boolean = true;
  private pausaRestanteMs: number = 0;
  private ativa: boolean;

  constructor(cena: Phaser.Scene, cfg: ConfigPlataformaMovel, textura: string, ativa: boolean = true) {
    this.mundo = cena.physics.world;
    this.inicio = new Phaser.Math.Vector2(cfg.x, cfg.y);
    this.fim = new Phaser.Math.Vector2(cfg.x + cfg.deslocamentoX, cfg.y + cfg.deslocamentoY);
    this.velocidade = cfg.velocidade;
    this.pausaMs = cfg.pausaMs;
    this.ativa = ativa;

    this.sprite = cena.physics.add.sprite(cfg.x, cfg.y, textura);
    const corpo = this.corpo;
    corpo.setAllowGravity(false);
    corpo.setImmovable(true);
    corpo.checkCollision.down = false;
    corpo.checkCollision.left = false;
    corpo.checkCollision.right = false;

    if (!ativa) {
      this.sprite.setVisible(false);
      corpo.enable = false;
    }
  }

  get corpo(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * Liga uma plataforma inativa num ponto da rota, seguindo na direção indicada (1 = rumo ao fim).
   */
  public ativarEm(x: number, y: number, direcao: number): void {
    const xNaRota = Phaser.Math.Clamp(x, Math.min(this.inicio.x, this.fim.x), Math.max(this.inicio.x, this.fim.x));
    this.ativa = true;
    this.indoParaFim = direcao >= 0;
    this.pausaRestanteMs = 0;
    this.sprite.setVisible(true);
    this.corpo.enable = true;
    this.corpo.reset(xNaRota, y);
  }

  public update(delta: number): void {
    if (!this.ativa) return;

    if (this.pausaRestanteMs > 0) {
      this.pausaRestanteMs -= delta;
      this.corpo.setVelocity(0, 0);
      return;
    }

    const alvo = this.indoParaFim ? this.fim : this.inicio;
    const dx = alvo.x - this.sprite.x;
    const dy = alvo.y - this.sprite.y;
    const distancia = Math.hypot(dx, dy);

    // O Arcade move o corpo em passos fixos da física, não a cada quadro. Em telas de alta taxa de
    // atualização o quadro é mais curto que o passo, e comparar só com o quadro fazia o corpo pular
    // para os dois lados do destino sem nunca "chegar". Vale o maior dos dois passos.
    const passoQuadro = (this.velocidade * delta) / 1000;
    const passoFisico = this.velocidade / (this.mundo.fps || 60);
    const passo = Math.max(passoQuadro, passoFisico);

    if (distancia <= passo) {
      this.corpo.reset(alvo.x, alvo.y);
      this.indoParaFim = !this.indoParaFim;
      this.pausaRestanteMs = this.pausaMs;
      return;
    }

    this.corpo.setVelocity((dx / distancia) * this.velocidade, (dy / distancia) * this.velocidade);
  }
}
