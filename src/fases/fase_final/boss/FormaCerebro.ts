import Phaser from 'phaser';
import { COR, hexNum, texturaBrilho } from '../ArteFaseFinal';
import { BOSS_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';
import { FALAS_BOSS } from '../DialogosFaseFinal';
import type { JogadorFaseFinal } from '../JogadorFaseFinal';
import { Particulas, clarao, estouro, explosao, fumaca } from './EfeitosBoss';
import { FormaBoss, type Retangulo, ret } from './FormaBoss';
import { QUADROS_BOSS, TEX_BOSS } from './TexturasBoss';

const B = BOSS_FASE_FINAL;
const K = B.CEREBRO;
const N = B.NUCLEO;
const QO = QUADROS_BOSS.OLHO;
const QR = QUADROS_BOSS.ROSTO;

type PassoCerebro = 'pausa' | 'avisoLeque' | 'leque' | 'avisoChuva' | 'chuva' | 'olhoAbrindo' | 'olhoAberto';

interface Emoji {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
}

interface Anel {
  img: Phaser.GameObjects.Image;
  deX: number;
  deY: number;
  alvoX: number;
  chaoY: number;
  /** ms desde o lançamento (negativo = ainda não saiu). */
  t: number;
}

/** Altura do chão sob um x da arena (onde o anel explode). */
function chaoEm(x: number): number {
  if (x <= N.PLATAFORMA_JOGADOR.x1) return N.PLATAFORMA_JOGADOR.topo;
  if (x >= N.PLATAFORMA_BOSS.x0) return N.PLATAFORMA_BOSS.topo;
  return N.LAVA_Y;
}

/**
 * Forma 5 — Cérebro Seráfico: cérebro gigante com muitos olhos, anéis girando, cabos e uma tela
 * com um rosto de emoji. Flutua sobre a plataforma de sustentação (commit 9b40), em cima da lava.
 * Sequência fixa: leque de emojis → chuva de anéis → um olho grande abre (janela do pisão).
 * Os olhos abrem em ordem (esquerda, centro, direita); um pisão por olho.
 */
export class FormaCerebro extends FormaBoss {
  public readonly sprite: Phaser.GameObjects.Sprite;
  private readonly olhos: Phaser.GameObjects.Sprite[];
  private readonly rosto: Phaser.GameObjects.Sprite;
  private readonly halo: Phaser.GameObjects.Image;
  private readonly atras: Phaser.GameObjects.Graphics;
  private readonly frente: Phaser.GameObjects.Graphics;
  private readonly particulas: Particulas;
  private passo: PassoCerebro = 'pausa';
  private relogioMs: number = 0;
  private ciclo: number = 0;
  private ondasDisparadas: number = 0;
  private emojis: Emoji[] = [];
  private aneis: Anel[] = [];
  private explosoes: Array<{ x: number; y: number; t: number }> = [];
  private readonly feridos: boolean[] = [false, false, false];
  private olhoAtual: number = 0;
  private alvoIrisX: number = 0;
  private alvoIrisY: number = 0;
  /** Velocidade dos anéis (diminui quando ele está "processando"). */
  private giro: number = 1;
  private anguloAneis: number = 0;
  /** Deslocamento da queda na lava (etapa final). */
  private quedaY: number = 0;
  private inclinacao: number = 0;

  constructor(cena: Phaser.Scene) {
    super(cena, FALAS_BOSS[5], K.PISOES);
    this.atras = cena.add.graphics().setDepth(17.4);
    this.halo = cena.add
      .image(K.X, K.Y, texturaBrilho(cena))
      .setTint(hexNum(COR.magenta))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.4, 2.8)
      .setAlpha(0.35)
      .setDepth(17.3);
    this.sprite = cena.add.sprite(K.X, K.Y, TEX_BOSS.SERAFICO, 0).setScale(ESCALA_ARTE).setDepth(18);
    this.olhos = K.OLHOS.map((o) =>
      cena.add.sprite(K.X + o.x, K.Y + o.y, TEX_BOSS.OLHO_GRANDE, QO.FECHADO).setScale(ESCALA_ARTE).setDepth(18.4)
    );
    this.rosto = cena.add.sprite(K.X, K.Y + 16, TEX_BOSS.ROSTO, QR.NEUTRO).setScale(ESCALA_ARTE).setDepth(18.4);
    this.frente = cena.add.graphics().setDepth(18.7);
    this.particulas = new Particulas(cena, 20);
    // Na chegada (queda + transformação) as partes seguem o sprite, que a cena move e esconde
    cena.events.on(Phaser.Scenes.Events.POST_UPDATE, this.sincronizarNaChegada, this);
    cena.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      cena.events.off(Phaser.Scenes.Events.POST_UPDATE, this.sincronizarNaChegada, this)
    );
    this.sincronizarNaChegada();
  }

  private sincronizarNaChegada(): void {
    if (this.estado !== 'intro' || !this.sprite.active) return;
    const visivel = this.sprite.visible && this.sprite.alpha > 0;
    for (const parte of [this.halo, this.rosto, ...this.olhos]) parte.setVisible(visivel);
    if (!visivel) {
      this.atras.clear();
      this.frente.clear();
      return;
    }
    this.tempoMs += 16;
    this.frente.clear();
    this.desenharPartes(this.sprite.x, this.sprite.y, false);
  }

  public get vulneravel(): boolean {
    return this.passo === 'olhoAberto';
  }

  /** Durante a queda e as reações ao rebase, a cena troca o rosto. */
  public mostrarRosto(quadro: number): void {
    this.rosto.setFrame(quadro);
  }

  protected aoIniciar(): void {
    for (const parte of [this.halo, this.rosto, ...this.olhos]) parte.setVisible(true);
    this.iniciarPasso('pausa');
  }

  private iniciarPasso(passo: PassoCerebro): void {
    this.passo = passo;
    this.relogioMs = 0;
  }

  private get centroY(): number {
    return K.Y + Math.sin(this.tempoMs / 600) * 8 + this.quedaY;
  }

  private posicaoOlho(i: number): { x: number; y: number } {
    return { x: K.X + K.OLHOS[i].x, y: this.centroY + K.OLHOS[i].y };
  }

  protected cabeca(): Retangulo {
    if (this.passo === 'olhoAberto') {
      const o = this.posicaoOlho(this.olhoAtual);
      return ret(o.x, o.y - 4, 56, 30);
    }
    // Pisar no alto do cérebro fora da janela só quica
    return ret(K.X, this.centroY - 78, 220, 30);
  }

  protected corpoPerigoso(): Retangulo | null {
    return null; // a carne não machuca: quem machuca são os projéteis
  }

  protected perigos(): Retangulo[] {
    const lista = this.emojis.map((e) => ret(e.img.x, e.img.y, K.LEQUE.RAIO * 2, K.LEQUE.RAIO * 2));
    for (const e of this.explosoes) lista.push(ret(e.x, e.y - 28, K.CHUVA.RAIO_EXPLOSAO * 2, 60));
    return lista;
  }

  protected pontoDeFala(): { x: number; y: number } {
    return { x: K.X, y: this.centroY - 130 };
  }

  protected atualizarAtaque(delta: number, jogador: JogadorFaseFinal): void {
    const dt = delta / 1000;
    this.relogioMs += delta;
    this.moverProjeteis(delta, dt);
    this.alvoIrisX = jogador.x;
    this.alvoIrisY = jogador.y;

    switch (this.passo) {
      case 'pausa':
        this.rosto.setFrame(QR.NEUTRO);
        if (this.relogioMs >= K.PAUSA_MS) this.iniciarPasso('avisoLeque');
        break;
      case 'avisoLeque':
        this.rosto.setFrame(QR.RISADA);
        if (this.relogioMs >= K.LEQUE.AVISO_MS) {
          this.ondasDisparadas = 0;
          this.iniciarPasso('leque');
        }
        break;
      case 'leque':
        if (this.ondasDisparadas < K.LEQUE.ONDAS && this.relogioMs >= this.ondasDisparadas * K.LEQUE.ENTRE_ONDAS_MS) {
          this.dispararOnda(this.ondasDisparadas);
          this.ondasDisparadas++;
        }
        if (this.relogioMs >= K.LEQUE.ONDAS * K.LEQUE.ENTRE_ONDAS_MS + 500) this.iniciarPasso('avisoChuva');
        break;
      case 'avisoChuva':
        this.rosto.setFrame(QR.RAIVA);
        if (this.relogioMs >= K.CHUVA.AVISO_MS) {
          this.lancarAneis();
          this.iniciarPasso('chuva');
        }
        break;
      case 'chuva':
        if (this.aneis.length === 0 && this.explosoes.length === 0) {
          this.olhoAtual = this.feridos.findIndex((f) => !f);
          if (this.olhoAtual < 0) this.olhoAtual = 0;
          this.iniciarPasso('olhoAbrindo');
        }
        break;
      case 'olhoAbrindo': {
        this.rosto.setFrame(QR.SUSTO);
        const olho = this.olhos[this.olhoAtual];
        olho.setFrame(this.relogioMs < K.OLHO_ABRINDO_MS / 2 ? QO.ABRINDO : QO.ABERTO);
        if (this.relogioMs >= K.OLHO_ABRINDO_MS) {
          const o = this.posicaoOlho(this.olhoAtual);
          estouro(this.cena, o.x, o.y, 30, 0xffffff, 0x05050c, 18.9);
          this.iniciarPasso('olhoAberto');
        }
        break;
      }
      case 'olhoAberto':
        this.olhos[this.olhoAtual].setFrame(QO.ABERTO);
        if (this.relogioMs >= K.OLHO_ABERTO_MS) {
          this.olhos[this.olhoAtual].setFrame(QO.FECHADO);
          this.ciclo++;
          this.iniciarPasso('pausa');
        }
        break;
    }
  }

  private dispararOnda(indice: number): void {
    const desloc = indice % 2 === 1 ? K.LEQUE.DESLOCAMENTO_IMPAR : 0;
    const x = K.X;
    const y = this.centroY + 16;
    // Jogador atrás do chefe (à direita): o leque espelha e vai para o lado dele
    const atras = this.alvoIrisX > K.X + 40;
    for (const graus of K.LEQUE.ANGULOS) {
      const a = (((atras ? 180 - graus : graus) + (atras ? -desloc : desloc)) * Math.PI) / 180;
      const img = this.cena.add.image(x, y, TEX_BOSS.EMOJI, Phaser.Math.Between(0, 5)).setScale(ESCALA_ARTE).setDepth(19);
      this.emojis.push({ img, vx: Math.cos(a) * K.LEQUE.VELOCIDADE, vy: Math.sin(a) * K.LEQUE.VELOCIDADE });
    }
    estouro(this.cena, x, y, 34, 0xffd84a, 0x05050c, 18.9);
    this.cena.cameras.main.shake(90, 0.003);
  }

  private lancarAneis(): void {
    const alvos: number[] = [...(this.ciclo % 2 === 0 ? K.CHUVA.ALVOS_A : K.CHUVA.ALVOS_B)];
    // Um anel sempre mira onde o jogador está se ele se esconde atrás do chefe
    if (this.alvoIrisX > K.X + 40) alvos.push(Phaser.Math.Clamp(this.alvoIrisX, N.PLATAFORMA_BOSS.x0 + 30, N.PLATAFORMA_BOSS.x1 - 30));
    alvos.forEach((alvoX, i) => {
      const img = this.cena.add.image(K.X, this.centroY - 60, TEX_BOSS.ANEL).setScale(2.4).setDepth(19).setVisible(false);
      this.aneis.push({ img, deX: K.X, deY: this.centroY - 60, alvoX, chaoY: chaoEm(alvoX), t: -i * K.CHUVA.ENTRE_MS });
    });
  }

  private posicaoAnel(a: Anel): { x: number; y: number } {
    const k = Math.max(0, a.t) / K.CHUVA.VOO_MS;
    return {
      x: a.deX + (a.alvoX - a.deX) * k,
      y: a.deY + (a.chaoY - 16 - a.deY) * k - Math.sin(k * Math.PI) * 300,
    };
  }

  private moverProjeteis(delta: number, dt: number): void {
    for (const e of this.emojis) {
      e.img.x += e.vx * dt;
      e.img.y += e.vy * dt;
      e.img.angle += 120 * dt;
    }
    this.emojis = this.emojis.filter((e) => {
      const fora = e.img.x < -40 || e.img.y > 760 || e.img.y < -40;
      if (fora) e.img.destroy();
      return !fora;
    });

    const restantes: Anel[] = [];
    for (const a of this.aneis) {
      const antes = a.t;
      a.t += delta;
      if (a.t < 0) {
        restantes.push(a);
        continue;
      }
      if (antes < 0) fumaca(this.cena, a.deX, a.deY, 0.5, hexNum(COR.magenta), 400);
      if (a.t >= K.CHUVA.VOO_MS) {
        a.img.destroy();
        this.explosoes.push({ x: a.alvoX, y: a.chaoY, t: 0 });
        explosao(this.cena, this.particulas, a.alvoX, a.chaoY - 20, 0.9, a.chaoY);
        this.cena.cameras.main.shake(120, 0.006);
        continue;
      }
      const pos = this.posicaoAnel(a);
      a.img.setVisible(true).setPosition(pos.x, pos.y).setAngle(a.t * 0.6);
      restantes.push(a);
    }
    this.aneis = restantes;
    for (const e of this.explosoes) e.t += delta;
    this.explosoes = this.explosoes.filter((e) => e.t < K.CHUVA.EXPLOSAO_MS);
  }

  /* -------------------------------------------------------------------------
   * DESENHO: anéis, cabos, íris do olho aberto, avisos
   * ------------------------------------------------------------------------- */

  protected desenharEfeitos(): void {
    const g = this.efeitos;
    const f = this.frente;
    f.clear();
    if (this.estado === 'intro') return;
    this.desenharPartes(K.X, this.centroY, true);

    if (this.estado === 'atacando') {
      if (this.passo === 'avisoLeque') {
        this.desenharAviso(K.X, this.centroY - 110);
        // Tela brilhando antes do leque
        f.lineStyle(3, 0xffd84a, Math.floor(this.tempoMs / 90) % 2 === 0 ? 1 : 0.3);
        f.strokeRect(K.X - 34, this.centroY + 16 - 26, 68, 52);
      }
      if (this.passo === 'avisoChuva') this.desenharAviso(K.X, this.centroY - 110);
      // Marcadores no chão onde os anéis vão cair
      for (const a of this.aneis) {
        const k = Math.max(0, a.t) / K.CHUVA.VOO_MS;
        g.lineStyle(3, hexNum(COR.magenta), 0.5 + k * 0.5);
        g.strokeEllipse(a.alvoX, a.chaoY - 4, K.CHUVA.RAIO_EXPLOSAO * 2 * (0.4 + k * 0.6), 14);
      }
      // Olho aberto: íris vermelha seguindo o jogador e seta de alvo
      if (this.passo === 'olhoAberto' || (this.passo === 'olhoAbrindo' && this.relogioMs >= K.OLHO_ABRINDO_MS / 2)) {
        const o = this.posicaoOlho(this.olhoAtual);
        const ang = Math.atan2(this.alvoIrisY - o.y, this.alvoIrisX - o.x);
        const ix = o.x + Math.cos(ang) * 8;
        const iy = o.y + Math.sin(ang) * 4;
        f.fillStyle(hexNum(COR.vermelho), 1);
        f.fillCircle(ix, iy, 8);
        f.fillStyle(0x05050c, 1);
        f.fillCircle(ix, iy, 4);
        f.fillStyle(0xffffff, 1);
        f.fillCircle(ix - 2, iy - 2, 2);
        if (this.passo === 'olhoAberto') {
          this.desenharAlvoCabeca(o.x, o.y - 18);
          // Pulsa mais rápido quando a janela está acabando
          const resta = K.OLHO_ABERTO_MS - this.relogioMs;
          const pisca = resta < 1000 && Math.floor(this.tempoMs / 90) % 2 === 0;
          f.lineStyle(2, pisca ? hexNum(COR.vermelho) : hexNum(COR.ciano), 0.9);
          f.strokeEllipse(o.x, o.y, 64, 44);
        }
      }
    }
    for (const e of this.explosoes) {
      const k = e.t / K.CHUVA.EXPLOSAO_MS;
      g.fillStyle(hexNum(COR.magenta), 0.6 * (1 - k));
      g.fillCircle(e.x, e.y - 24, K.CHUVA.RAIO_EXPLOSAO * (0.6 + k * 0.5));
    }
  }

  /** Flutuação, anéis girando (metade atrás, metade na frente) e cabos até a plataforma. */
  private desenharPartes(bx: number, cy: number, moverSprite: boolean): void {
    if (moverSprite) this.sprite.setPosition(bx, cy).setAngle(this.inclinacao);
    this.sprite.setFrame(Math.floor(this.tempoMs / 2400) % 5 === 4 ? 1 : 0);
    this.halo.setPosition(bx, cy).setAlpha(0.28 + Math.sin(this.tempoMs / 300) * 0.08);
    this.olhos.forEach((o, i) => o.setPosition(bx + K.OLHOS[i].x, cy + K.OLHOS[i].y).setAngle(this.inclinacao));
    this.rosto.setPosition(bx, cy + 16).setAngle(this.inclinacao);

    this.anguloAneis += 0.012 * this.giro;
    const a = this.atras;
    const f = this.frente;
    a.clear();
    const aneis = [
      { rx: 190, ry: 46, inclina: 0.22, fase: this.anguloAneis },
      { rx: 165, ry: 70, inclina: -0.38, fase: -this.anguloAneis * 1.3 + 1 },
    ];
    for (const anel of aneis) {
      const passos = 48;
      for (let i = 0; i < passos; i++) {
        const t0 = (i / passos) * Math.PI * 2;
        const t1 = ((i + 1) / passos) * Math.PI * 2;
        const ponto = (t: number) => {
          const x = Math.cos(t) * anel.rx;
          const y = Math.sin(t) * anel.ry;
          return {
            x: bx + x * Math.cos(anel.inclina) - y * Math.sin(anel.inclina),
            y: cy + x * Math.sin(anel.inclina) + y * Math.cos(anel.inclina),
          };
        };
        const p0 = ponto(t0);
        const p1 = ponto(t1);
        const naFrente = Math.sin((t0 + t1) / 2) > 0;
        const g = naFrente ? f : a;
        g.lineStyle(5, 0x7a5a18, 1);
        g.lineBetween(p0.x, p0.y, p1.x, p1.y);
        g.lineStyle(2, 0xffd36b, 1);
        g.lineBetween(p0.x, p0.y - 1, p1.x, p1.y - 1);
      }
      // Olhinhos presos no anel, girando junto
      for (let k = 0; k < 6; k++) {
        const t = anel.fase + (k / 6) * Math.PI * 2;
        const x = Math.cos(t) * anel.rx;
        const y = Math.sin(t) * anel.ry;
        const px = bx + x * Math.cos(anel.inclina) - y * Math.sin(anel.inclina);
        const py = cy + x * Math.sin(anel.inclina) + y * Math.cos(anel.inclina);
        const g = Math.sin(t) > 0 ? f : a;
        g.fillStyle(0x05050c, 1);
        g.fillCircle(px, py, 7);
        g.fillStyle(0xf2f0f6, 1);
        g.fillCircle(px, py, 6);
        g.fillStyle(hexNum(COR.vermelho), 1);
        g.fillCircle(px, py, 3);
      }
    }
    // Cabos pendurados até o mecanismo da plataforma
    if (this.quedaY < 40) {
      const topoPlataforma = N.PLATAFORMA_BOSS.topo;
      [-60, -24, 24, 60].forEach((dx, i) => {
        const x0 = bx + dx * 0.6;
        const y0 = cy + 90;
        const x1 = bx + dx * 1.6;
        const balanço = Math.sin(this.tempoMs / 500 + i) * 10;
        a.lineStyle(4, 0x14121c, 1);
        a.beginPath();
        a.moveTo(x0, y0);
        for (let s = 1; s <= 8; s++) {
          const k = s / 8;
          a.lineTo(x0 + (x1 - x0) * k + Math.sin(k * Math.PI) * balanço, y0 + (topoPlataforma - y0) * k);
        }
        a.strokePath();
        a.lineStyle(1, i % 2 ? hexNum(COR.ciano) : hexNum(COR.magenta), 0.9);
        a.lineBetween(x0, y0, x1, topoPlataforma);
      });
    }
  }

  protected aoSerAtingido(): void {
    this.feridos[this.olhoAtual] = true;
    const o = this.posicaoOlho(this.olhoAtual);
    this.olhos[this.olhoAtual].setFrame(QO.FERIDO);
    this.rosto.setFrame(QR.TONTO);
    this.limparProjeteis();
    estouro(this.cena, o.x, o.y, 50, hexNum(COR.ciano));
    this.particulas.faiscas(o.x, o.y, -Math.PI / 2, Math.PI, 20);
    clarao(this.cena, 0xffffff, 0.2, 200);
  }

  protected aoRetomar(): void {
    this.ciclo++;
    this.rosto.setFrame(QR.RAIVA);
    this.iniciarPasso('pausa');
  }

  private limparProjeteis(): void {
    for (const e of this.emojis) e.img.destroy();
    for (const a of this.aneis) a.img.destroy();
    this.emojis = [];
    this.aneis = [];
    this.explosoes = [];
  }

  /** Derrotado: recolhe os ataques e fica "Processando..." enquanto o jogador faz o rebase. */
  public recolher(): void {
    this.limparProjeteis();
    this.giro = 0.25;
    this.rosto.setFrame(QR.PROCESSANDO);
    for (const [i, o] of this.olhos.entries()) o.setFrame(this.feridos[i] ? QO.FERIDO : QO.FECHADO);
  }

  /** Sem a plataforma: afunda devagar e dramaticamente na lava. */
  public cairNaLava(aoTerminar: () => void): void {
    this.rosto.setFrame(QR.SUSTO);
    // Passa para trás da superfície da lava (profundidade 9) para afundar nela
    this.halo.setDepth(8);
    this.atras.setDepth(8.1);
    this.sprite.setDepth(8.2);
    for (const o of this.olhos) o.setDepth(8.3);
    this.rosto.setDepth(8.3);
    this.frente.setDepth(8.4);
    this.giro = 2.5;
    const cena = this.cena;
    let respingou = false;
    let joinha = false;
    cena.tweens.addCounter({
      from: 0,
      to: 1,
      duration: N.QUEDA_CEREBRO_MS,
      ease: 'Sine.easeIn',
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        this.quedaY = k * 520;
        this.inclinacao = Math.sin(k * Math.PI * 3) * 6;
        // Passado o susto, afunda fazendo joinha na tela
        if (!joinha && tw.progress > 0.35) {
          joinha = true;
          this.rosto.setFrame(QR.JOINHA);
        }
        if (!respingou && this.centroY + 90 >= N.LAVA_Y) {
          respingou = true;
          cena.cameras.main.shake(900, 0.012);
          clarao(cena, 0xff7a1a, 0.35, 500);
          for (let i = 0; i < 4; i++) {
            cena.time.delayedCall(i * 120, () => {
              this.particulas.emitir(K.X + (i - 1.5) * 50, N.LAVA_Y, {
                quantidade: 18,
                angulo: -Math.PI / 2,
                abertura: Math.PI * 0.4,
                velocidade: [200, 520],
                vidaMs: [500, 900],
                tamanho: [4, 8],
                cores: [0xff7a1a, 0xffd36b, 0xff3a1a],
                gravidade: 900,
                forma: 'circulo',
              });
              fumaca(cena, K.X + (i - 1.5) * 60, N.LAVA_Y - 20, 1.6, 0x3a2a2a, 900);
            });
          }
        }
      },
      onComplete: () => aoTerminar(),
    });
  }

  protected destruirExtras(): void {
    this.cena.events.off(Phaser.Scenes.Events.POST_UPDATE, this.sincronizarNaChegada, this);
    this.limparProjeteis();
    this.particulas.limpar();
    this.atras.destroy();
    this.frente.destroy();
    this.halo.destroy();
    this.rosto.destroy();
    for (const o of this.olhos) o.destroy();
  }
}
