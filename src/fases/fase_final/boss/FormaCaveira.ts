import Phaser from 'phaser';
import { COR, hexNum, texturaBrilho } from '../ArteFaseFinal';
import { BOSS_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';
import { FALAS_BOSS, FALAS_EXTRAS_BOSS } from '../DialogosFaseFinal';
import type { JogadorFaseFinal } from '../JogadorFaseFinal';
import { FormaBoss, type Retangulo, ret, suave } from './FormaBoss';
import { Particulas, clarao, estouro, explosao, fumaca } from './EfeitosBoss';
import { QUADROS_BOSS, TEX_BOSS } from './TexturasBoss';

const B = BOSS_FASE_FINAL;
const K = B.CAVEIRA;
const Y_NO_CHAO = B.CHAO_Y - 64;
const QC = QUADROS_BOSS.CAVEIRA;
/** Topo das colunas de laser (logo abaixo do teto da sala). */
const A_TOPO = 70;

type IdBraco = 'serra' | 'laser' | 'canhao' | 'garra';
/** Ordem fixa e anunciada: o braço da vez acende. */
const ORDEM: readonly IdBraco[] = ['serra', 'laser', 'canhao', 'garra'];

type PassoCaveira = 'aviso' | 'ataque' | 'retorno' | 'pausa' | 'giraDesce' | 'noChao' | 'sobe';

interface Braco {
  id: IdBraco;
  sprite: Phaser.GameObjects.Sprite;
  /** Posição de repouso relativa ao crânio. */
  dx: number;
  dy: number;
  x: number;
  y: number;
}

interface Bomba {
  deX: number;
  deY: number;
  alvoX: number;
  /** ms desde o disparo (negativo = ainda não saiu). */
  t: number;
}

/**
 * Forma 4 — Caveira tecnológica: crânio flutuando com quatro braços. Um braço ataca por vez,
 * na ordem serra → laser → canhão → garra; o da vez acende antes. Depois do ciclo completo,
 * a caveira gira e desce até o chão: janela do pisão.
 */
export class FormaCaveira extends FormaBoss {
  public readonly sprite: Phaser.GameObjects.Sprite;
  private readonly bracos: Braco[];
  private readonly cabos: Phaser.GameObjects.Graphics;
  private passo: PassoCaveira = 'pausa';
  private relogioMs: number = 0;
  private x: number = K.X;
  private y: number = Y_NO_CHAO;
  private indiceBraco: number = 0;
  private ciclo: number = 0;
  // Estado do ataque em andamento
  private serraDir: -1 | 1 = 1;
  private serraNoChao: boolean = false;
  private bombas: Bomba[] = [];
  private explosoes: Array<{ x: number; t: number }> = [];
  private garraX: number = 0;
  private garraFase: 'mira' | 'trava' | 'desce' | 'chao' = 'mira';
  private retornoDe = { x: 0, y: 0 };
  private sobeDeY: number = Y_NO_CHAO;
  private readonly particulas: Particulas;
  /** Feixes aditivos do laser (um por coluna possível). */
  private readonly feixes: Phaser.GameObjects.Image[] = [];
  private acumuladorFaiscaMs: number = 0;
  private acumuladorTremeMs: number = 0;
  private laserDisparou: boolean = false;

  constructor(cena: Phaser.Scene) {
    super(cena, FALAS_BOSS[4]);
    this.cabos = cena.add.graphics().setDepth(16);
    this.particulas = new Particulas(cena, 19);
    for (let i = 0; i < 3; i++) {
      this.feixes.push(
        cena.add
          .image(0, 0, texturaBrilho(cena))
          .setTint(hexNum(COR.vermelho))
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(16.5)
          .setVisible(false)
      );
    }
    this.sprite = cena.add.sprite(this.x, this.y, TEX_BOSS.CAVEIRA, 0).setScale(ESCALA_ARTE).setDepth(18);
    const slots: Array<[IdBraco, string, number, number]> = [
      ['serra', TEX_BOSS.BRACO_SERRA, -160, -30],
      ['laser', TEX_BOSS.BRACO_LASER, -96, 80],
      ['canhao', TEX_BOSS.BRACO_CANHAO, 96, 80],
      ['garra', TEX_BOSS.BRACO_GARRA, 160, -30],
    ];
    this.bracos = slots.map(([id, tex, dx, dy]) => ({
      id,
      dx,
      dy,
      x: this.x + dx,
      y: this.y + dy,
      sprite: cena.add.sprite(this.x + dx, this.y + dy, tex, 0).setScale(ESCALA_ARTE).setDepth(18).setAlpha(0),
    }));
  }

  public get vulneravel(): boolean {
    return this.passo === 'noChao';
  }

  /** Sobe do chão (onde caiu) para a altura de voo, com os braços aparecendo. */
  protected aoIniciar(): void {
    for (const b of this.bracos) b.sprite.setAlpha(1);
    this.iniciarPasso('sobe');
  }

  private iniciarPasso(passo: PassoCaveira): void {
    this.passo = passo;
    this.relogioMs = 0;
    if (passo === 'sobe') this.sobeDeY = this.y;
  }

  private get bracoDaVez(): Braco {
    return this.bracos[this.indiceBraco];
  }

  private repouso(b: Braco): { x: number; y: number } {
    const flutua = Math.sin(this.tempoMs / 300 + b.dx) * 5;
    // No chão os braços de baixo encostam no piso em vez de atravessá-lo
    return { x: this.x + b.dx, y: Math.min(this.y + b.dy + flutua, B.CHAO_Y - 24) };
  }

  protected cabeca(): Retangulo {
    return ret(this.x, this.y - 44, 90, 26);
  }

  protected corpoPerigoso(): Retangulo | null {
    return null; // o crânio não machuca: quem ataca são os braços
  }

  protected perigos(): Retangulo[] {
    const lista: Retangulo[] = [];
    if (this.passo !== 'ataque') {
      for (const e of this.explosoes) lista.push(ret(e.x, B.CHAO_Y - 30, K.CANHAO.RAIO_EXPLOSAO * 2, 60));
      return lista;
    }
    const braco = this.bracoDaVez;
    switch (braco.id) {
      case 'serra':
        lista.push(ret(braco.x, braco.y, K.SERRA.RAIO * 2 - 4, K.SERRA.RAIO * 2 - 4));
        break;
      case 'laser':
        if (this.relogioMs >= K.LASER.AVISO_MS) {
          for (const cx of this.colunasLaser()) lista.push(ret(cx, 360, K.LASER.LARGURA - 10, 720));
        }
        break;
      case 'garra':
        if (this.garraFase === 'desce' || this.garraFase === 'chao') lista.push(ret(braco.x, braco.y + 10, K.GARRA.LARGURA, 60));
        break;
      case 'canhao':
        break;
    }
    for (const e of this.explosoes) lista.push(ret(e.x, B.CHAO_Y - 30, K.CANHAO.RAIO_EXPLOSAO * 2, 60));
    return lista;
  }

  protected pontoDeFala(): { x: number; y: number } {
    return { x: this.x, y: this.y - 76 };
  }

  private colunasLaser(): readonly number[] {
    return this.ciclo % 2 === 0 ? K.LASER.COLUNAS_A : K.LASER.COLUNAS_B;
  }

  private alvosCanhao(): readonly number[] {
    return this.ciclo % 2 === 0 ? K.CANHAO.ALVOS_A : K.CANHAO.ALVOS_B;
  }

  protected atualizarAtaque(delta: number, jogador: JogadorFaseFinal): void {
    const dt = delta / 1000;
    this.relogioMs += delta;
    this.atualizarExplosoes(delta);
    let giro = 0;

    switch (this.passo) {
      case 'pausa':
        if (this.relogioMs >= K.ENTRE_BRACOS_MS) this.iniciarPasso('aviso');
        break;
      case 'aviso':
        if (this.relogioMs >= K.AVISO_BRACO_MS) this.comecarAtaque();
        break;
      case 'ataque':
        this.atualizarBraco(delta, dt, jogador);
        break;
      case 'retorno': {
        const b = this.bracoDaVez;
        const k = suave(this.relogioMs / 500);
        const r = this.repouso(b);
        b.x = this.retornoDe.x + (r.x - this.retornoDe.x) * k;
        b.y = this.retornoDe.y + (r.y - this.retornoDe.y) * k;
        if (this.relogioMs >= 500) {
          this.indiceBraco++;
          if (this.indiceBraco >= ORDEM.length) {
            this.indiceBraco = 0;
            this.falar(FALAS_EXTRAS_BOSS.CAVEIRA_DESCE, 1300);
            this.iniciarPasso('giraDesce');
          } else {
            this.iniciarPasso('pausa');
          }
        }
        break;
      }
      case 'giraDesce': {
        const k = suave(this.relogioMs / K.GIRA_DESCE_MS);
        this.y = K.Y_FLUTUA + (Y_NO_CHAO - K.Y_FLUTUA) * k;
        giro = 360 * k;
        if (this.relogioMs >= K.GIRA_DESCE_MS) {
          this.cena.cameras.main.shake(260, 0.01);
          estouro(this.cena, this.x, B.CHAO_Y - 10, 60, hexNum(COR.janelaQuente));
          this.particulas.detritos(this.x, B.CHAO_Y - 4, 12, [0x3f4462, 0x2a2434, hexNum(COR.janelaQuente)], B.CHAO_Y);
          fumaca(this.cena, this.x - 40, B.CHAO_Y - 10, 1.2, 0x5a5468, 700);
          fumaca(this.cena, this.x + 40, B.CHAO_Y - 10, 1.2, 0x5a5468, 700);
          this.iniciarPasso('noChao');
        }
        break;
      }
      case 'noChao':
        this.sprite.setFrame(QC.TONTA);
        if (this.relogioMs >= K.NO_CHAO_MS) this.iniciarPasso('sobe');
        break;
      case 'sobe': {
        this.sprite.setFrame(QC.NORMAL);
        const k = suave(this.relogioMs / K.SOBE_MS);
        this.y = this.sobeDeY + (K.Y_FLUTUA - this.sobeDeY) * k;
        if (this.relogioMs >= K.SOBE_MS) {
          this.y = K.Y_FLUTUA;
          this.ciclo++;
          this.iniciarPasso('pausa');
        }
        break;
      }
    }

    if (this.passo === 'aviso' || this.passo === 'ataque') this.sprite.setFrame(QC.BOCA);
    else if (this.passo === 'pausa' || this.passo === 'retorno')
      this.sprite.setFrame(Math.floor(this.tempoMs / 400) % 2 === 0 ? QC.NORMAL : QC.ACESA);

    // Braços parados acompanham o crânio
    for (const b of this.bracos) {
      if ((this.passo === 'ataque' || this.passo === 'retorno') && b === this.bracoDaVez) continue;
      const r = this.repouso(b);
      b.x = r.x;
      b.y = r.y;
    }
    for (const b of this.bracos) b.sprite.setPosition(b.x, b.y);
    const flutua = this.passo === 'noChao' || this.passo === 'giraDesce' ? 0 : Math.sin(this.tempoMs / 400) * 6;
    this.sprite.setPosition(this.x, this.y + flutua).setAngle(giro);
  }

  private comecarAtaque(): void {
    const b = this.bracoDaVez;
    this.iniciarPasso('ataque');
    this.falar(FALAS_EXTRAS_BOSS.CAVEIRA_BRACOS[b.id], 900);
    switch (b.id) {
      case 'serra':
        // Alterna o lado a cada ciclo
        this.serraDir = this.ciclo % 2 === 0 ? 1 : -1;
        this.serraNoChao = false;
        this.retornoDe = { x: b.x, y: b.y };
        break;
      case 'canhao':
        this.bombas = this.alvosCanhao().map((alvoX, i) => ({ deX: b.x, deY: b.y + 20, alvoX, t: -i * K.CANHAO.ENTRE_BOMBAS_MS }));
        break;
      case 'garra':
        this.garraFase = 'mira';
        this.garraX = b.x;
        break;
      case 'laser':
        break;
    }
  }

  private atualizarBraco(delta: number, dt: number, jogador: JogadorFaseFinal): void {
    const b = this.bracoDaVez;
    switch (b.id) {
      case 'serra': {
        const inicioX = this.serraDir > 0 ? 70 : B.LARGURA - 70;
        const chaoY = B.CHAO_Y - K.SERRA.RAIO;
        if (!this.serraNoChao) {
          const k = suave(this.relogioMs / K.SERRA.DESCE_MS);
          b.x = this.retornoDe.x + (inicioX - this.retornoDe.x) * k;
          b.y = this.retornoDe.y + (chaoY - this.retornoDe.y) * k;
          if (this.relogioMs >= K.SERRA.DESCE_MS) {
            this.serraNoChao = true;
            estouro(this.cena, b.x, B.CHAO_Y - 10, 34, 0xffffff);
            this.particulas.faiscas(b.x, B.CHAO_Y - 4, -Math.PI / 2, Math.PI * 0.6, 16, B.CHAO_Y);
            this.cena.cameras.main.shake(140, 0.006);
          }
        } else {
          b.x += this.serraDir * K.SERRA.VELOCIDADE * dt;
          b.y = chaoY;
          // Faíscas raspando no chão e o chão tremendo de leve
          this.acumuladorFaiscaMs += delta;
          while (this.acumuladorFaiscaMs >= 25) {
            this.acumuladorFaiscaMs -= 25;
            const tras = this.serraDir > 0 ? -Math.PI * 0.82 : -Math.PI * 0.18;
            this.particulas.faiscas(b.x - this.serraDir * 10, B.CHAO_Y - 2, tras, 0.35, 3, B.CHAO_Y);
          }
          this.acumuladorTremeMs += delta;
          if (this.acumuladorTremeMs >= 160) {
            this.acumuladorTremeMs = 0;
            this.cena.cameras.main.shake(120, 0.0025);
          }
          const fim = this.serraDir > 0 ? B.LARGURA - 70 : 70;
          if ((this.serraDir > 0 && b.x >= fim) || (this.serraDir < 0 && b.x <= fim)) this.voltarBraco();
        }
        b.sprite.setFrame(Math.floor(this.tempoMs / 35) % 4);
        break;
      }
      case 'laser': {
        // Sobe para o alto do centro enquanto as colunas acendem
        const r = { x: this.x, y: 90 };
        b.x += (r.x - b.x) * Math.min(1, dt * 6);
        b.y += (r.y - b.y) * Math.min(1, dt * 6);
        const carregando = this.relogioMs < K.LASER.AVISO_MS;
        b.sprite.setFrame(carregando ? 1 : 2);
        if (carregando) {
          // Energia subindo das marcas no chão
          this.acumuladorFaiscaMs += delta;
          if (this.acumuladorFaiscaMs >= 60) {
            this.acumuladorFaiscaMs = 0;
            for (const cx of this.colunasLaser()) {
              this.particulas.emitir(cx, B.CHAO_Y - 4, {
                quantidade: 2,
                angulo: -Math.PI / 2,
                abertura: 0.25,
                velocidade: [120, 260],
                vidaMs: [250, 450],
                tamanho: [2, 3],
                cores: [hexNum(COR.vermelho), 0xffd0d6],
                gravidade: -100,
                espalhar: K.LASER.LARGURA / 2,
              });
            }
          }
        } else {
          if (!this.laserDisparou) {
            this.laserDisparou = true;
            clarao(this.cena, hexNum(COR.vermelho), 0.28, 350);
            this.cena.cameras.main.shake(K.LASER.DISPARO_MS, 0.007);
            for (const cx of this.colunasLaser()) estouro(this.cena, cx, B.CHAO_Y - 8, 30, 0xffd0d6);
          }
          this.acumuladorFaiscaMs += delta;
          if (this.acumuladorFaiscaMs >= 40) {
            this.acumuladorFaiscaMs = 0;
            for (const cx of this.colunasLaser()) this.particulas.faiscas(cx, B.CHAO_Y - 4, -Math.PI / 2, Math.PI * 0.45, 3, B.CHAO_Y);
          }
        }
        if (this.relogioMs >= K.LASER.AVISO_MS + K.LASER.DISPARO_MS) this.voltarBraco();
        break;
      }
      case 'canhao': {
        let restantes = 0;
        for (const bomba of this.bombas) {
          const antes = bomba.t;
          bomba.t += delta;
          if (antes < 0 && bomba.t >= 0) {
            // Disparo: clarão na boca, coice e fumaça
            b.sprite.setFrame(1);
            this.cena.time.delayedCall(90, () => b.sprite.setFrame(0));
            b.y -= 8;
            fumaca(this.cena, b.x, b.y + 30, 0.6, 0x8a8698, 400);
            this.cena.cameras.main.shake(70, 0.003);
          }
          if (bomba.t > 0 && bomba.t < K.CANHAO.VOO_MS && Math.floor(bomba.t / 50) !== Math.floor(antes / 50)) {
            const pos = this.posicaoBomba(bomba);
            this.particulas.emitir(pos.x, pos.y, {
              quantidade: 1,
              velocidade: [10, 30],
              vidaMs: [300, 500],
              tamanho: [4, 7],
              cores: [0x6b6478, 0x8a8698],
              gravidade: -40,
              forma: 'circulo',
            });
          }
          if (antes < K.CANHAO.VOO_MS && bomba.t >= K.CANHAO.VOO_MS) {
            this.explosoes.push({ x: bomba.alvoX, t: 0 });
            explosao(this.cena, this.particulas, bomba.alvoX, B.CHAO_Y - 24, 1.1, B.CHAO_Y);
            clarao(this.cena, 0xff8a2a, 0.16, 220);
            this.cena.cameras.main.shake(160, 0.008);
          }
          if (bomba.t < K.CANHAO.VOO_MS) restantes++;
        }
        if (restantes === 0) {
          this.bombas = [];
          this.voltarBraco();
        }
        break;
      }
      case 'garra': {
        const g = K.GARRA;
        if (this.garraFase === 'mira') {
          const alvo = Phaser.Math.Clamp(jogador.x, 80, B.LARGURA - 80);
          this.garraX += Phaser.Math.Clamp(alvo - this.garraX, -700 * dt, 700 * dt);
          b.x = this.garraX;
          b.y += (150 - b.y) * Math.min(1, dt * 6);
          if (this.relogioMs >= g.MIRA_MS - g.TRAVA_MS) {
            this.garraFase = 'trava';
          }
        } else if (this.garraFase === 'trava') {
          b.sprite.setFrame(0);
          if (this.relogioMs >= g.MIRA_MS) this.garraFase = 'desce';
        } else if (this.garraFase === 'desce') {
          b.y += g.VELOCIDADE * dt;
          b.sprite.setFrame(1);
          if (b.y >= B.CHAO_Y - 30) {
            b.y = B.CHAO_Y - 30;
            this.garraFase = 'chao';
            this.relogioMs = 0;
            this.cena.cameras.main.shake(220, 0.012);
            clarao(this.cena, 0xffffff, 0.14, 160);
            estouro(this.cena, b.x, B.CHAO_Y - 12, 50, hexNum(COR.janelaQuente));
            this.particulas.detritos(b.x, B.CHAO_Y - 4, 12, [0x3f4462, 0x2a2434, hexNum(COR.janelaQuente)], B.CHAO_Y);
            this.particulas.faiscas(b.x, B.CHAO_Y - 4, -Math.PI / 2, Math.PI * 0.5, 10, B.CHAO_Y);
            fumaca(this.cena, b.x - 30, B.CHAO_Y - 8, 1, 0x5a5468, 600);
            fumaca(this.cena, b.x + 30, B.CHAO_Y - 8, 1, 0x5a5468, 600);
          }
        } else if (this.relogioMs >= g.NO_CHAO_MS) {
          b.sprite.setFrame(0);
          this.voltarBraco();
        }
        break;
      }
    }
  }

  private posicaoBomba(bomba: Bomba): { x: number; y: number } {
    const k = Math.max(0, bomba.t) / K.CANHAO.VOO_MS;
    return {
      x: bomba.deX + (bomba.alvoX - bomba.deX) * k,
      y: bomba.deY + (B.CHAO_Y - 10 - bomba.deY) * k - Math.sin(k * Math.PI) * 180,
    };
  }

  private voltarBraco(): void {
    const b = this.bracoDaVez;
    this.laserDisparou = false;
    this.acumuladorFaiscaMs = 0;
    b.sprite.setAngle(0);
    this.retornoDe = { x: b.x, y: b.y };
    this.iniciarPasso('retorno');
  }

  private atualizarExplosoes(delta: number): void {
    for (const e of this.explosoes) e.t += delta;
    this.explosoes = this.explosoes.filter((e) => e.t < K.CANHAO.EXPLOSAO_MS);
  }

  protected desenharEfeitos(): void {
    const g = this.efeitos;
    // Cabos do crânio até cada braço
    this.cabos.clear();
    if (this.estado !== 'derrotado') {
      for (const b of this.bracos) {
        if (b.sprite.alpha === 0) continue;
        const daVez = this.estado === 'atacando' && b === this.bracoDaVez && (this.passo === 'aviso' || this.passo === 'ataque');
        this.cabos.lineStyle(2, daVez ? hexNum(COR.vermelho) : hexNum(COR.magenta), daVez ? 0.9 : 0.35);
        this.cabos.lineBetween(this.sprite.x, this.sprite.y, b.x, b.y);
      }
    }
    for (const f of this.feixes) f.setVisible(false);
    if (this.estado !== 'atacando') {
      for (const b of this.bracos) b.sprite.clearTint().setScale(ESCALA_ARTE);
      return;
    }

    // Braço da vez acende (aviso e ataque)
    for (const b of this.bracos) {
      const daVez = b === this.bracoDaVez && (this.passo === 'aviso' || this.passo === 'ataque');
      if (daVez && this.passo === 'aviso') {
        const pisca = Math.floor(this.tempoMs / 110) % 2 === 0;
        b.sprite.setTint(pisca ? hexNum(COR.vermelho) : 0xffffff).setScale(ESCALA_ARTE * (pisca ? 1.15 : 1));
        this.desenharAviso(b.x, b.y - 30);
      } else {
        b.sprite.clearTint().setScale(ESCALA_ARTE);
      }
    }

    const braco = this.bracoDaVez;
    if (this.passo === 'aviso' && braco.id === 'laser') this.desenharColunas(false);
    if (this.passo === 'ataque') {
      if (braco.id === 'laser') this.desenharColunas(this.relogioMs >= K.LASER.AVISO_MS);
      if (braco.id === 'serra' && !this.serraNoChao) {
        // Marca de onde a serra vai rolar
        const inicioX = this.serraDir > 0 ? 70 : B.LARGURA - 70;
        this.tracejado(inicioX, B.CHAO_Y - 4, inicioX + this.serraDir * 300, B.CHAO_Y - 4, hexNum(COR.vermelho), 0.8, 3);
      }
      if (braco.id === 'garra' && (this.garraFase === 'mira' || this.garraFase === 'trava')) {
        const travada = this.garraFase === 'trava';
        g.fillStyle(0x000000, 0.45);
        g.fillEllipse(braco.x, B.CHAO_Y - 3, K.GARRA.LARGURA + 20, 14);
        this.tracejado(braco.x, braco.y + 30, braco.x, B.CHAO_Y, hexNum(COR.vermelho), travada ? 1 : 0.5, travada ? 3 : 2);
      }
      for (const bomba of this.bombas) {
        if (bomba.t >= K.CANHAO.VOO_MS) continue;
        const k = Math.max(0, bomba.t) / K.CANHAO.VOO_MS;
        // Marcador no chão cresce até a explosão
        g.lineStyle(3, hexNum(COR.vermelho), 0.5 + k * 0.5);
        g.strokeEllipse(bomba.alvoX, B.CHAO_Y - 4, K.CANHAO.RAIO_EXPLOSAO * 2 * (0.4 + k * 0.6), 16);
        if (bomba.t < 0) continue;
        const { x, y } = this.posicaoBomba(bomba);
        const pisca = Math.floor(bomba.t / 80) % 2 === 0;
        g.fillStyle(hexNum(COR.vermelho), 0.25);
        g.fillCircle(x, y, 18);
        g.fillStyle(0x05050c, 1);
        g.fillCircle(x, y, 12);
        g.fillStyle(0x3b4060, 1);
        g.fillCircle(x - 1, y - 1, 10);
        g.fillStyle(0x7b84aa, 1);
        g.fillCircle(x - 4, y - 4, 3);
        g.fillStyle(pisca ? 0xffffff : hexNum(COR.vermelho), 1);
        g.fillCircle(x + 3, y + 2, 3);
      }
    }
    for (const e of this.explosoes) {
      const k = e.t / K.CANHAO.EXPLOSAO_MS;
      g.fillStyle(0xff5a1a, 0.7 * (1 - k));
      g.fillCircle(e.x, B.CHAO_Y - 24, K.CANHAO.RAIO_EXPLOSAO * (0.7 + k * 0.5));
      g.fillStyle(hexNum(COR.janelaQuente), 0.85 * (1 - k));
      g.fillCircle(e.x, B.CHAO_Y - 24, K.CANHAO.RAIO_EXPLOSAO * (0.5 + k * 0.3));
      g.fillStyle(0xffffff, 0.9 * (1 - k));
      g.fillCircle(e.x, B.CHAO_Y - 24, K.CANHAO.RAIO_EXPLOSAO * 0.3);
    }
    if (this.passo === 'noChao') {
      this.desenharTontura(this.x, this.y - 70);
      this.desenharAlvoCabeca(this.x, this.y - 60);
    }
  }

  /** Colunas do laser: finas e piscando no aviso, grossas no disparo. */
  private desenharColunas(disparando: boolean): void {
    const g = this.efeitos;
    const altura = B.CHAO_Y - A_TOPO;
    this.colunasLaser().forEach((cx, i) => {
      if (disparando) {
        // Feixe: halo aditivo pulsando, corpo vermelho ondulando e miolo branco
        const pulso = 0.85 + Math.sin(this.tempoMs / 25 + i) * 0.15;
        this.feixes[i]
          .setVisible(true)
          .setPosition(cx, A_TOPO + altura / 2)
          .setScale((K.LASER.LARGURA * 2.6 * pulso) / 128, (altura * 1.25) / 128)
          .setAlpha(0.85);
        for (let y = A_TOPO; y < B.CHAO_Y; y += 8) {
          const onda = Math.sin(y / 18 + this.tempoMs / 30) * 3;
          g.fillStyle(hexNum(COR.vermelho), 0.7);
          g.fillRect(cx - K.LASER.LARGURA / 2 + onda, y, K.LASER.LARGURA, 8);
          g.fillStyle(0xffe0e4, 0.95);
          g.fillRect(cx - K.LASER.LARGURA / 6 - onda * 0.5, y, K.LASER.LARGURA / 3, 8);
        }
        g.fillStyle(0xffffff, 1);
        g.fillRect(cx - 3, A_TOPO, 6, altura);
        // Marca de queimado no chão
        g.fillStyle(0xffd36b, 0.8);
        g.fillEllipse(cx, B.CHAO_Y - 2, K.LASER.LARGURA * 1.6, 10);
      } else {
        const pisca = Math.floor(this.tempoMs / 90) % 2 === 0;
        g.fillStyle(hexNum(COR.vermelho), pisca ? 0.7 : 0.3);
        g.fillRect(cx - 2, A_TOPO, 4, B.CHAO_Y - A_TOPO);
        g.lineStyle(2, hexNum(COR.vermelho), 0.5);
        g.strokeRect(cx - K.LASER.LARGURA / 2, B.CHAO_Y - 10, K.LASER.LARGURA, 10);
      }
    });
  }

  protected aoSerAtingido(): void {
    this.bombas = [];
    this.explosoes = [];
    this.laserDisparou = false;
    for (const f of this.feixes) f.setVisible(false);
    this.sprite.setFrame(QC.TONTA);
  }

  /** Depois do pisão: braços voltam ao lugar e o ciclo recomeça do primeiro braço. */
  protected aoRetomar(): void {
    this.indiceBraco = 0;
    this.ciclo++;
    this.sprite.setFrame(QC.NORMAL);
    this.iniciarPasso('sobe');
  }

  protected destruirExtras(): void {
    this.cabos.destroy();
    this.particulas.limpar();
    for (const f of this.feixes) f.destroy();
    for (const b of this.bracos) b.sprite.destroy();
  }
}
