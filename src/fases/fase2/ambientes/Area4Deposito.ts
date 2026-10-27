import Phaser from 'phaser';
import type { ResultadoComando } from '../../../compartilhado/tipos';
import { COR, ESCALA, aleatorio, hash3, texturaPixel } from '../porto/ArtePorto';
import { Borrachao } from '../porto/ChefesPorto';
import { ModeloValvulas } from '../porto/DesafiosPorto';
import type { EventoValvula } from '../porto/DesafiosPorto';
import { DICAS_BOIA, FALAS, GRAVACOES_PORTUS } from '../porto/DialogosPorto';
import { PROF } from '../porto/EfeitosPorto';
import type { FocoIncendio } from '../porto/FogoPorto';
import { Fumace } from '../porto/InimigosPorto';
import { texturaPortao } from '../porto/ObjetosPorto';
import { AreaPorto } from './AreaBase';

const CHAO = 3620;
const PASSO = 370;
const PISO_ARENA = 520;
const SHELF_ALTURA = 16;

/** Linha do topo da prateleira N (1 a 8). */
function yPrateleira(n: number): number {
  return CHAO - n * PASSO;
}

/** Extensão horizontal da prateleira (ímpares à esquerda, pares à direita). */
function xPrateleira(n: number): [number, number] {
  return n % 2 === 1 ? [40, 760] : [520, 1240];
}

interface PneuRolando {
  img: Phaser.Physics.Arcade.Image;
  chama: Phaser.GameObjects.Sprite;
  dir: number;
  criadoEm: number;
}

/**
 * ÁREA 4 — DEPÓSITO DE PNEUS EM CHAMAS (seção vertical).
 * O operador sobe pelas prateleiras numeradas; quanto mais alto, mais densa a fumaça.
 * Desafio 3 (vetores e índices) nos sprinklers e o miniboss BORRACHÃO.EXE no topo.
 */
export class Area4Deposito extends AreaPorto {
  private modelo = new ModeloValvulas();
  private focosPrateleira = new Map<number, FocoIncendio>();
  private placas = new Map<number, Phaser.GameObjects.Image>();
  private pneus: PneuRolando[] = [];
  private grupoPneus!: Phaser.Physics.Arcade.Group;
  private proximoPneu = 0;
  private chefe: Borrachao | null = null;
  private lutaIniciada = false;
  private ventiladores: Array<{ area: Phaser.Geom.Rectangle; dir: number; ligadoAte: number; helice: Phaser.GameObjects.Image }> = [];
  private erros = 0;
  private portaSaida!: Phaser.GameObjects.Image;

  override construir(): void {
    this.largura = 1280;
    this.altura = 3700;
    this.inicio = { x: 170, y: CHAO - 48 };
    this.volumeOndas = 0;
    this.volumeFogo = 1;
    const cena = this.cena;
    const resolvido = cena.estado.desafios[2];
    this.modelo = new ModeloValvulas();
    if (resolvido) this.modelo.fogo = new Array(8).fill(false);
    this.focosPrateleira = new Map();
    this.placas = new Map();
    this.pneus = [];
    this.ventiladores = [];
    this.lutaIniciada = false;
    this.chefe = null;

    this.construirFundo();
    this.grupoPneus = cena.physics.add.group();
    cena.physics.add.collider(this.grupoPneus, cena.solidos);

    // Chão do galpão e paredes
    texturaPixel(cena, 'pb-a4-chao', 320, 25, (p) => {
      p.px(0, 0, 320, 25, '#2A2224');
      p.px(0, 0, 320, 1, '#5A4A48');
      for (let x = 0; x < 320; x += 16) p.px(x, 1, 1, 24, '#1A1414');
      p.faixaAdvertencia(0, 1, 320, 2);
    });
    cena.add.image(0, CHAO, 'pb-a4-chao').setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.plataformas);
    cena.solido(0, CHAO, 1280, 100);

    // Prateleiras numeradas 1 a 8, degraus intermediários e placas
    texturaPixel(cena, 'pb-a4-prateleira', 180, 6, (p) => {
      p.px(0, 0, 180, 4, '#4A3E40');
      p.px(0, 0, 180, 1, '#8A6A5A');
      p.faixaAdvertencia(0, 4, 180, 2, '#C8401E');
    });
    texturaPixel(cena, 'pb-a4-degrau', 40, 6, (p) => {
      p.px(0, 0, 40, 5, '#3A3236');
      p.px(0, 0, 40, 1, '#7A5A50');
      for (let x = 2; x < 40; x += 8) p.px(x, 2, 4, 3, '#141212');
    });
    texturaPixel(cena, 'pb-a4-pilar', 3, 93, (p) => {
      p.px(0, 0, 3, 93, '#2E2628');
      p.px(0, 0, 1, 93, '#4A3E40');
    });
    for (let n = 0; n <= 8; n++) {
      const y = n === 0 ? CHAO : yPrateleira(n);
      if (n >= 1) {
        const [x0, x1] = xPrateleira(n);
        cena.add.image(x0, y, 'pb-a4-prateleira').setOrigin(0, 0).setScale(ESCALA).setCrop(0, 0, (x1 - x0) / ESCALA, 6).setDepth(PROF.plataformas);
        cena.solido(x0, y, x1 - x0, SHELF_ALTURA, true);
        for (const px of [x0 + 8, x1 - 20, (x0 + x1) / 2]) cena.add.image(px, y + 20, 'pb-a4-pilar').setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.estruturas - 1);
        this.pneusDecorativos(x0, x1, y, n);
        this.criarPlaca(n, n % 2 === 1 ? x1 - 40 : x0 + 40, y + 34);
      }
      // Degrau intermediário até a próxima prateleira
      if (n < 8) {
        const yd = y - PASSO / 2;
        const xd = n % 2 === 1 ? 840 : 280;
        cena.add.image(xd, yd, 'pb-a4-degrau').setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.plataformas);
        cena.solido(xd, yd, 160, SHELF_ALTURA, true);
      }
    }

    // Focos nas prateleiras 3, 6 e 8 (só o sprinkler alcança)
    const focos: Array<[number, string, number, number]> = [
      [3, 'a4-f1', 180, 560],
      [6, 'a4-f2', 780, 1100],
      [8, 'a4-f3', 700, 840],
    ];
    for (const [n, id, x0, x1] of focos) {
      const y = yPrateleira(n);
      const altura = n === 8 ? y - PISO_ARENA : 300;
      const foco = cena.fogo.criar({
        id,
        x: (x0 + x1) / 2,
        y,
        tamanho: 'm',
        largura: Math.max(2, Math.round((x1 - x0) / 60)),
        vida: 1,
        soSprinkler: true,
        barreira: { largura: x1 - x0, altura },
        profundidade: PROF.emissivo,
      });
      this.focosPrateleira.set(n - 1, foco);
      this.atualizarPlaca(n);
    }

    // Consoles repetidores do painel de sprinklers
    for (const [n, x] of [
      [2, 900],
      [5, 420],
      [7, 420],
    ] as const) {
      const y = yPrateleira(n);
      const c = cena.add.sprite(x, y, 'pb-console-vermelho', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.npcs);
      c.play('pb-anim-console-vermelho');
      cena.interativo(x, y - 50, '[E] PAINEL DE SPRINKLERS (DESAFIO 3)', () => this.abrirPainel(), () => !this.modelo.concluido);
      cena.gatilho(0, 1280, () => cena.registrarCheckpoint(x, y - 48, `CHECKPOINT: PRATELEIRA ${n}`), y - 120, y);
    }
    cena.gatilho(0, 1280, () => cena.falar(FALAS.desafio3Intro, undefined, 'a4-d3-intro'), yPrateleira(2) - 100, yPrateleira(2) + 10);

    // Hidrantes, PORTUS, ventiladores, Fumacês
    cena.criarHidrante(300, CHAO);
    cena.criarHidrante(1180, yPrateleira(4));
    cena.criarHidrante(120, yPrateleira(7));
    cena.criarGravacaoPortus(4, 160, yPrateleira(5), GRAVACOES_PORTUS[3]);
    this.criarVentilador(1236, yPrateleira(4) - 60, -1);
    this.criarVentilador(44, yPrateleira(7) - 60, 1);
    for (const y of [2700, 1950, 1250, 900]) cena.inimigos.adicionar(new Fumace(cena, 640, y));

    // Arena do miniboss no topo
    texturaPixel(cena, 'pb-a4-piso-arena', 320, 8, (p) => {
      p.px(0, 0, 320, 8, '#3A3236');
      p.px(0, 0, 320, 1, '#8A6A5A');
      p.faixaAdvertencia(0, 6, 320, 2);
    });
    cena.add.image(0, PISO_ARENA, 'pb-a4-piso-arena').setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.plataformas);
    // Piso sólido com uma abertura de mão única (x 520 a 700) por onde se entra
    cena.solido(0, PISO_ARENA, 520, 32);
    cena.solido(700, PISO_ARENA, 580, 32);
    cena.solido(520, PISO_ARENA, 180, 32, true);
    texturaPortao(cena, 'pb-a4-saida', 'TERMINAL');
    this.portaSaida = cena.imagem('pb-a4-saida', 1180, PISO_ARENA, PROF.estruturas);
    this.portaSaida.setFrame(cena.estado.minibossDerrotado ? 1 : 0);
    if (!cena.estado.minibossDerrotado) {
      this.chefe = new Borrachao(cena, 300, PISO_ARENA, 120, 1160, () => this.aoDerrotarChefe());
    }
    cena.gatilho(0, 1280, () => this.iniciarLuta(), 0, PISO_ARENA - 60);
    cena.gatilho(1150, 1280, () => {
      if (cena.estado.minibossDerrotado) cena.concluirArea();
    }, 0, PISO_ARENA);

    for (let n = 1; n <= 8; n++) {
      const [x0, x1] = xPrateleira(n);
      cena.criarLacre(n % 2 === 1 ? x0 + 120 : x1 - 120, yPrateleira(n) - 60);
    }
    cena.criarKit(640, CHAO - 60);
    if (cena.estado.minibossDerrotado) cena.fumaca.densidadeAlvo = 0.22;
  }

  override iniciar(): void {
    this.cena.falar(FALAS.depositoEntrada, undefined, 'a4-entrada');
  }

  private construirFundo(): void {
    // Parede do galpão com janelas incandescentes (rolagem vertical lenta)
    this.camada(
      'pb-a4-parede',
      0,
      PROF.ceu,
      (p, w, h) => {
        p.degradePontilhado(0, 0, w, h, ['#140C0C', '#1E1010', '#2A1412', '#3A1A14', '#2A1412', '#1A0E0E'], 1);
        const r = aleatorio(44);
        for (let y = 10; y < h; y += 46) {
          for (let x = 12; x < w - 30; x += 70) {
            if (r() < 0.6) {
              p.px(x, y, 26, 14, '#0E0808');
              const quente = r() < 0.5;
              for (let yy = 1; yy < 13; yy++) p.px(x + 1, y + yy, 24, 1, quente ? (yy > 8 ? '#C8401E' : '#6E1E14') : '#1E1212');
              p.px(x + 12, y, 1, 14, '#0E0808');
            }
          }
          p.px(0, y + 30, w, 1, '#24161A');
        }
        // Silhuetas de racks com pneus
        for (let y = 40; y < h; y += 90) {
          for (let x = 0; x < w; x += 2) if (hash3(x, y, 2) > 0.5) p.ponto(x, y + Math.floor(hash3(x, y, 3) * 3), '#0A0606');
        }
      },
      { fatorY: 0.6 }
    );
    this.cena.efeitos.brasas(640, CHAO - 40, 1200, PROF.fumacaFrente, 1).setFrequency(60);
  }

  private pneusDecorativos(x0: number, x1: number, y: number, n: number): void {
    const chave = `pb-a4-pneus-${n % 2}`;
    texturaPixel(this.cena, chave, 180, 12, (p) => {
      for (let x = 2; x < 176; x += 9) {
        const altura = hash3(x, n % 2, 5) > 0.5 ? 2 : 1;
        for (let k = 0; k < altura; k++) {
          p.elipse(x + 4, 9 - k * 5, 4, 2, '#141212');
          p.px(x + 2, 8 - k * 5, 5, 1, '#3A3636');
        }
      }
    });
    this.cena.add.image(x0, y, chave).setOrigin(0, 1).setScale(ESCALA).setCrop(0, 0, (x1 - x0) / ESCALA, 12).setDepth(PROF.estruturas);
  }

  private criarPlaca(n: number, x: number, y: number): void {
    const chave = `pb-a4-placa-${n}`;
    texturaPixel(this.cena, chave, 13, 11, (p) => {
      p.px(0, 0, 13, 11, '#1A1414');
      p.px(1, 1, 11, 9, COR.advertencia);
      p.textoCentro(String(n), 6.5, 3, '#1A1414');
    });
    const img = this.cena.add.image(x, y, chave).setScale(ESCALA).setDepth(PROF.estruturas + 2);
    this.placas.set(n, img);
  }

  /** Placa de prateleira em chamas brilha através da fumaça. */
  private atualizarPlaca(n: number): void {
    const img = this.placas.get(n);
    if (!img) return;
    const queimando = this.modelo.fogo[n - 1];
    img.setDepth(queimando ? PROF.emissivo : PROF.estruturas + 2).setTint(queimando ? 0xffd8a0 : 0xffffff);
  }

  private criarVentilador(x: number, y: number, dir: number): void {
    const cena = this.cena;
    texturaPixel(cena, 'pb-a4-ventilador', 14, 14, (p) => {
      p.disco(7, 7, 6, '#3A3438');
      p.disco(7, 7, 5, '#1A1414');
      p.px(6, 1, 2, 12, '#8A847C');
      p.px(1, 6, 12, 2, '#8A847C');
      p.disco(7, 7, 1, COR.advertencia);
    });
    const helice = cena.add.image(x, y, 'pb-a4-ventilador').setScale(ESCALA).setDepth(PROF.estruturas + 3);
    const area = new Phaser.Geom.Rectangle(dir > 0 ? x : x - 700, y - 120, 700, 240);
    const v = { area, dir, ligadoAte: 0, helice };
    this.ventiladores.push(v);
    cena.interativo(x + dir * 40, y + 30, '[E] LIGAR VENTILADOR', () => {
      v.ligadoAte = cena.time.now + 9000;
      cena.som.tocar('guindaste');
      cena.hud.aviso('VENTILADOR LIGADO: DISPERSA OS FUMACÊS', COR.telaBoia, 1600);
    }, () => cena.time.now > v.ligadoAte);
  }

  /* ---------------- Desafio 3 ---------------- */

  private abrirPainel(): void {
    this.cena.abrirDesafio('vetor', this.modelo, 'PAINEL DE SPRINKLERS // DEPÓSITO DE PNEUS // DESAFIO 3: VETORES E ÍNDICES', [
      '8 válvulas: valvula[0] até valvula[7], uma para cada prateleira. As placas vão de 1 a 8.',
      'Sensores de calor cegos pela fumaça: leia as placas das prateleiras em chamas.',
    ]);
  }

  override aoResultadoTerminal(resultado: ResultadoComando, desafio: string): void {
    if (desafio !== 'vetor') return;
    const eventos = this.modelo.eventos.splice(0) as EventoValvula[];
    eventos.forEach((ev, i) => this.cena.time.delayedCall(i * 450, () => this.executarEvento(ev)));
    if (!resultado.sucesso && resultado.acao !== 'LIMPAR_TERMINAL') {
      this.erros++;
      if (this.erros === 2) this.cena.imprimirNoTerminal(`[DICA DA BOIA] "${DICAS_BOIA[2]}"`);
    }
    if (resultado.acao === 'VETOR_CONCLUIDO') {
      this.cena.estado.desafios[2] = true;
      this.cena.fecharTerminalEm(2600);
      this.cena.time.delayedCall(3000, () => this.cena.falar(FALAS.desafio3Fim));
    }
  }

  private executarEvento(ev: EventoValvula): void {
    const cena = this.cena;
    if (ev.tipo === 'fora') {
      cena.som.tocar('glitch');
      cena.cameras.main.flash(250, 92, 255, 138);
      cena.cameras.main.shake(300, 0.01);
      cena.hud.aviso('GLITCH: ÍNDICE FORA DO LIMITE! UM INIMIGO ESCAPOU', COR.virus);
      const j = cena.jogador;
      cena.inimigos.adicionar(new Fumace(cena, Phaser.Math.Clamp(j.x + 260, 80, 1200), j.y - 140));
      return;
    }
    const n = ev.indice + 1;
    const [x0, x1] = xPrateleira(n);
    const yCano = yPrateleira(n) - PASSO + 40;
    // Chuva do sprinkler sobre a prateleira escolhida
    const chuva = cena.add.particles((x0 + x1) / 2, yCano, 'pb-pixel', {
      x: { min: -(x1 - x0) / 2, max: (x1 - x0) / 2 },
      speedY: { min: 380, max: 520 },
      lifespan: 700,
      scale: { start: ESCALA, end: ESCALA * 0.5 },
      tint: [0x8ad8e8, 0xc8f0ff, 0x4fd8e8],
      alpha: 0.85,
      frequency: 8,
      quantity: 2,
    });
    chuva.setDepth(PROF.emissivo);
    cena.som.tocar('vapor');
    cena.time.delayedCall(2600, () => chuva.stop());
    cena.time.delayedCall(3400, () => chuva.destroy());
    const foco = this.focosPrateleira.get(ev.indice);
    if (ev.apagou && foco) {
      cena.time.delayedCall(700, () => {
        foco.receberJato(1, 'sprinkler');
        this.atualizarPlaca(n);
      });
    }
  }

  /* ---------------- Miniboss ---------------- */

  private iniciarLuta(): void {
    if (this.lutaIniciada || !this.chefe) return;
    this.lutaIniciada = true;
    this.cena.registrarCheckpoint(200, PISO_ARENA - 48, 'CHECKPOINT: ARENA');
    this.cena.falar(FALAS.minibossIntro, () => this.chefe?.iniciar());
  }

  private aoDerrotarChefe(): void {
    const cena = this.cena;
    cena.estado.minibossDerrotado = true;
    cena.fumaca.densidadeAlvo = 0.22;
    this.portaSaida.setFrame(1);
    cena.som.tocar('item');
    cena.falar(FALAS.minibossFim);
  }

  override atingirPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    return this.chefe ? this.chefe.levarPatch(tiro) : false;
  }

  override atingirEspuma(bola: Phaser.Physics.Arcade.Image): boolean {
    if (this.chefe?.levarEspuma(bola)) return true;
    for (const p of this.pneus) {
      if (Math.abs(p.img.x - bola.x) < 30 && Math.abs(p.img.y - bola.y) < 30) {
        this.removerPneu(p, true);
        return true;
      }
    }
    return false;
  }

  /* ---------------- Atualização ---------------- */

  override atualizar(tempo: number, delta: number): void {
    const cena = this.cena;
    const j = cena.jogador;
    // Quanto mais alto, mais densa a fumaça (o miniboss derrotado baixa para leve)
    if (!cena.estado.minibossDerrotado) {
      const k = Phaser.Math.Clamp((CHAO - j.y) / (CHAO - PISO_ARENA), 0, 1);
      cena.fumaca.densidadeAlvo = j.y < PISO_ARENA ? 0.58 : 0.6 + k * 0.36;
    }
    this.chefe?.atualizar(tempo, delta);

    // Pneus em chamas rolando pelas prateleiras 5 e 7
    if (tempo > this.proximoPneu && j.y < yPrateleira(3) && j.y > PISO_ARENA) {
      this.proximoPneu = tempo + 4200;
      const n = j.y < yPrateleira(6) ? 7 : 5;
      this.lancarPneu(60, yPrateleira(n) - 30, 1);
    }
    for (const p of [...this.pneus]) {
      const body = p.img.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(p.dir * 190);
      p.img.rotation += p.dir * delta * 0.012;
      p.chama.setPosition(p.img.x, p.img.y - 10);
      if (tempo - p.criadoEm > 9000 || body.blocked.right || body.blocked.left || p.img.y > CHAO) {
        this.removerPneu(p, false);
        continue;
      }
      if (!j.morto && Math.abs(j.x - p.img.x) < 40 && Math.abs(j.y + 20 - p.img.y) < 60) j.receberDano(2, p.img.x);
    }

    // Ventiladores dispersam Fumacês
    for (const v of this.ventiladores) {
      const ligado = tempo < v.ligadoAte;
      if (ligado) {
        v.helice.rotation += delta * 0.03;
        cena.inimigos.ventilar(v.area, v.dir);
      }
    }
  }

  private lancarPneu(x: number, y: number, dir: number): void {
    const img = this.grupoPneus.create(x, y, 'pb-lixo', 0) as Phaser.Physics.Arcade.Image;
    img.setScale(ESCALA * 1.4).setDepth(PROF.inimigos);
    const body = img.body as Phaser.Physics.Arcade.Body;
    body.setSize(8, 5);
    const chama = this.cena.add.sprite(x, y, 'pb-fogo-p', 0).setOrigin(0.5, 1).setScale(ESCALA * 0.8).setDepth(PROF.emissivo);
    chama.play('pb-anim-fogo-p');
    this.pneus.push({ img, chama, dir, criadoEm: this.cena.time.now });
  }

  private removerPneu(p: PneuRolando, apagado: boolean): void {
    const i = this.pneus.indexOf(p);
    if (i >= 0) this.pneus.splice(i, 1);
    if (apagado) this.cena.efeitos.vapor(p.img.x, p.img.y);
    p.img.destroy();
    p.chama.destroy();
  }
}
