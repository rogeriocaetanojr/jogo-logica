import Phaser from 'phaser';
import type { ResultadoComando } from '../../../compartilhado/tipos';
import { COR, ESCALA, aleatorio, hash3, larguraTexto, texturaPixel } from '../porto/ArtePorto';
import { desenharCarreta, desenharCeu, desenharCidade, desenharTorreServidor } from '../porto/CenariosPorto';
import { ModeloCarretas } from '../porto/DesafiosPorto';
import type { EventoCarreta } from '../porto/DesafiosPorto';
import { DICAS_BOIA, FALAS, GRAVACOES_PORTUS } from '../porto/DialogosPorto';
import { PROF } from '../porto/EfeitosPorto';
import { BarrilBugado, GarraGuindaste, ManchaViva } from '../porto/InimigosPorto';
import { texturaCarretaPetroleo, texturaConteinerAberto, texturaPlaca, texturaPortao, texturaTambores } from '../porto/ObjetosPorto';
import { AreaPorto } from './AreaBase';

const CHAO = 640;
const VELOCIDADE_FOGO = 150;
const INICIO_DRENO = 5900;
const cacheLuzes = new Map<string, Array<[number, number]>>();

interface CarretaTombada {
  x: number;
  explodiu: boolean;
  img: Phaser.GameObjects.Image;
  plataforma: Phaser.GameObjects.Zone;
  chamas: Phaser.GameObjects.Sprite | null;
  queimaAte: number;
}

interface CarretaDreno {
  valor: number;
  cont: Phaser.GameObjects.Container;
}

/**
 * ÁREA 5 — TERMINAL DE COMBUSTÍVEL (fuga).
 * O fogo corre pelo óleo do chão, vindo de trás; carretas tombadas explodem em sequência.
 * Espuma no óleo cria plataformas e corta o caminho do fogo. O Desafio 4 (ordenação) trava o portão de saída.
 */
export class Area5Terminal extends AreaPorto {
  private fogoX = -400;
  private fogoAtivo = false;
  private modoLento = false;
  private bloqueadoAte = 0;
  private chamasOnda: Phaser.GameObjects.Sprite[] = [];
  private frenteOnda!: Phaser.GameObjects.Sprite;
  private brilhoOnda!: Phaser.GameObjects.Image;
  private plumaOnda!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tanques: CarretaTombada[] = [];
  private modelo = new ModeloCarretas();
  private carretasDreno: CarretaDreno[] = [];
  private portaoSaida!: Phaser.GameObjects.Image;
  private paredeSaida!: Phaser.GameObjects.Zone;
  private proximoBarril = 0;
  private erros = 0;
  private animandoTroca = Promise.resolve();

  override construir(): void {
    this.largura = 7680;
    this.inicio = { x: 200, y: CHAO - 48 };
    this.volumeOndas = 0;
    this.volumeFogo = 1;
    const cena = this.cena;
    const resolvido = cena.estado.desafios[3];
    this.modelo = new ModeloCarretas();
    this.fogoX = -400;
    this.fogoAtivo = false;
    this.modoLento = false;
    this.chamasOnda = [];
    this.tanques = [];
    this.carretasDreno = [];
    cena.fumaca.densidadeAlvo = 0.58;

    this.construirFundo();

    // Chão do terminal coberto de óleo
    this.camada('pb-a5-chao', 1, PROF.plataformas, (p, w) => {
      p.px(0, 0, w, 20, '#2A2628');
      p.px(0, 0, w, 1, '#5A5054');
      for (let x = 0; x < w; x++) {
        const oleo = Math.sin(x * 0.013) > -0.6;
        if (oleo) {
          p.px(x, 0, 1, 3, '#141012');
          if (hash3(x, 1, 5) > 0.82) p.ponto(x, 1, [COR.oleoRoxo, COR.oleoCiano, COR.oleoAmarelo][x % 3]);
        }
        if (hash3(x, 7, 2) > 0.95) p.ponto(x, 6 + (x % 9), '#1E1A1C');
      }
      for (let x = 0; x < w; x += 24) p.px(x, 10, 12, 1, '#C8B890');
    }, { alturaArte: 20, y: CHAO });
    cena.solido(0, CHAO, this.largura, 120);
    for (let x = 0; x < this.largura; x += 4) {
      if (Math.sin(x / ESCALA * 0.013) > -0.6) {
        const ini = x;
        while (x < this.largura && Math.sin(x / ESCALA * 0.013) > -0.6) x += 4;
        cena.zonasOleo.push(new Phaser.Geom.Rectangle(ini, CHAO - 4, x - ini, 12));
      }
    }
    cena.armas.zonasOleo = cena.zonasOleo;

    texturaPlaca(cena, 'pb-a5-placa', ['TERMINAL DE', 'COMBUSTIVEL'], '#C8401E');
    cena.imagem('pb-a5-placa', 420, CHAO, PROF.estruturas);

    // Carretas tombadas (plataformas que explodem quando o fogo chega)
    texturaCarretaPetroleo(cena, 'pb-a5-tombada', true);
    for (const x of [1500, 2900, 4300, 5100]) this.criarTombada(x);

    // Focos de incêndio (contam no Índice de Fumaça)
    cena.fogo.criar({ id: 'a5-f1', x: 1950, y: CHAO, tamanho: 'm', largura: 2, vida: 2 });
    cena.fogo.criar({ id: 'a5-f2', x: 3700, y: CHAO, tamanho: 'g', largura: 2, vida: 3, soEspuma: true, barreira: { largura: 150, altura: 420 } });
    cena.fogo.criar({ id: 'a5-f3', x: 4700, y: CHAO, tamanho: 'm', largura: 2, vida: 2 });

    // Inimigos
    cena.inimigos.adicionar(new ManchaViva(cena, 2300, CHAO - 30));
    cena.inimigos.adicionar(new ManchaViva(cena, 4000, CHAO - 30));
    cena.inimigos.adicionar(new GarraGuindaste(cena, 3200, 100, CHAO, 3050, 3500));
    texturaTambores(cena);
    for (const x of [2600, 4900, 5600]) cena.imagem('pb-obj-tambores', x, CHAO, PROF.estruturas);

    cena.criarHidrante(1150, CHAO);
    cena.criarHidrante(3350, CHAO);
    cena.criarHidrante(5550, CHAO);
    texturaConteinerAberto(cena);
    cena.imagem('pb-obj-cont-aberto', 4520, CHAO, PROF.estruturas);
    cena.criarCraca(4510, CHAO - 8);
    cena.criarGravacaoPortus(5, 5780, CHAO, GRAVACOES_PORTUS[4]);

    for (const [x, chave] of [
      [2000, 'CHECKPOINT: PÁTIO DE TANQUES'],
      [3900, 'CHECKPOINT: BOMBAS'],
      [5300, 'CHECKPOINT: DRENO À VISTA'],
    ] as const) {
      cena.gatilho(x, x + 80, () => cena.registrarCheckpoint(x + 40, CHAO - 48, chave));
    }

    // Onda de fogo
    for (let i = 0; i < 14; i++) {
      const s = cena.add.sprite(-500, CHAO + 4, 'pb-fogo-faixa', i % 10).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.emissivo - 1);
      s.play({ key: 'pb-anim-fogo-faixa', startFrame: (i * 3) % 10 });
      this.chamasOnda.push(s);
    }
    this.frenteOnda = cena.add.sprite(-500, CHAO + 4, 'pb-fogo-g', 0).setOrigin(0.5, 1).setScale(ESCALA * 1.3).setDepth(PROF.emissivo);
    this.frenteOnda.play('pb-anim-fogo-g');
    this.brilhoOnda = cena.efeitos.brilho(-500, CHAO - 80, 340, COR.fogoLaranja, 0.55);
    this.plumaOnda = cena.efeitos.pluma(-500, CHAO - 120, { largura: 300, raio: 14, frequencia: 140, vida: 6000, escalaFinal: 2.4, profundidade: PROF.fumacaFrente - 2 });

    // Desafio 4: dreno com 6 carretas
    this.construirDreno(resolvido);

    for (const [x, y] of [
      [700, 560],
      [1500, 500],
      [2200, 560],
      [2900, 500],
      [3400, 560],
      [4300, 500],
      [5100, 500],
      [5700, 560],
    ]) {
      cena.criarLacre(x, y);
    }
  }

  override iniciar(): void {
    this.cena.falar(
      FALAS.terminalEntrada,
      () => {
        this.cena.time.delayedCall(1200, () => {
          if (!this.cena.estado.desafios[3]) {
            this.fogoAtivo = true;
            this.cena.som.tocar('explosao');
            this.cena.cameras.main.shake(400, 0.01);
            this.cena.hud.aviso('O FOGO ESTÁ VINDO PELO ÓLEO! CORRA!', '#FF4A3A', 2500);
          }
        });
      },
      'a5-entrada'
    );
    if (this.cena.estado.falasVistas.includes('a5-entrada') && !this.cena.estado.desafios[3]) {
      this.cena.time.delayedCall(1500, () => (this.fogoAtivo = true));
    }
  }

  private construirFundo(): void {
    this.camada('pb-a5-ceu', 0, PROF.ceu, (p, w, h) => desenharCeu(p, w, h, 'fumacento', 104, 70, 40));
    this.camada('pb-a5-cidade', 0.1, PROF.distante, (p, w) => {
      cacheLuzes.set('a5-janelas', desenharCidade(p, 0, w, 110, 21, false));
      cacheLuzes.set('a5-torre', desenharTorreServidor(p, 520, 112, false));
    });
    this.luzesVirus(cacheLuzes.get('a5-janelas') ?? [], 0.1, PROF.distante + 1, 0.55);
    this.luzesVirus(cacheLuzes.get('a5-torre') ?? [], 0.1, PROF.distante + 1, 0.85);
    // Tanques de armazenamento em chamas
    const fator = 0.3;
    this.camada('pb-a5-tanques', fator, PROF.meio, (p, w) => {
      const r = aleatorio(55);
      p.px(0, 124, w, 56, '#241A1C');
      for (let x = 20; x < w; x += 90 + Math.floor(r() * 40)) {
        const larg = 40 + Math.floor(r() * 20);
        const alt = 26 + Math.floor(r() * 14);
        p.px(x, 124 - alt, larg, alt, '#4A4044');
        p.elipse(x + larg / 2, 124 - alt, larg / 2, 3, '#5A5054');
        for (let yy = 124 - alt + 4; yy < 124; yy += 6) p.px(x, yy, larg, 1, '#3A3034');
        p.px(x + 4, 124 - alt + 8, larg - 8, 3, '#C8401E');
        p.texto('GAS', x + larg / 2 - 5, 124 - alt + 14, '#E8E2D2');
      }
      for (let x = 0; x < w; x += 6) p.px(x, 118, 3, 1, '#3A3034');
    });
    for (let i = 0; i < 6; i++) {
      const x = 400 + i * 900;
      const s = this.cena.add.sprite(x, 95 * ESCALA, 'pb-fogo-g', i).setOrigin(0.5, 1).setScale(ESCALA * 0.8).setScrollFactor(fator, 0).setDepth(PROF.meio + 1);
      s.play({ key: 'pb-anim-fogo-g', startFrame: (i * 2) % 10 });
      this.cena.efeitos.pluma(x, 80 * ESCALA, { largura: 80, raio: 14, frequencia: 450, fator, profundidade: PROF.meio + 2, vida: 11000, escalaFinal: 2.6 });
      this.cena.efeitos.brilho(x, 90 * ESCALA, 160, COR.fogoLaranja, 0.3, fator, PROF.meio + 3);
    }
    // Dutos e carretas em silhueta (0.55x)
    this.camada('pb-a5-dutos', 0.55, PROF.proximo, (p, w) => {
      p.px(0, 138, w, 2, '#3A3034');
      p.px(0, 146, w, 2, '#3A3034');
      for (let x = 0; x < w; x += 40) {
        p.px(x, 132, 2, 28, '#2A2226');
        p.px(x + 10, 140, 6, 6, '#4A3E42');
      }
      for (let x = 60; x < w; x += 230) desenharCarreta(p, x, 146, false, Math.floor(x / 230) % 2 === 0);
    });
  }

  private criarTombada(x: number): void {
    const cena = this.cena;
    const img = cena.imagem('pb-a5-tombada', x, CHAO + 4, PROF.estruturas + 2);
    const plataforma = cena.solido(x - 96, CHAO - 56, 192, 16, true);
    this.tanques.push({ x, explodiu: false, img, plataforma, chamas: null, queimaAte: 0 });
  }

  private explodirTanque(t: CarretaTombada): void {
    const cena = this.cena;
    t.explodiu = true;
    for (let i = 0; i < 4; i++) cena.time.delayedCall(i * 120, () => cena.efeitos.explosao(t.x + (i - 1.5) * 50, CHAO - 50 - Math.random() * 40, 1.8));
    cena.som.tocar('explosao');
    cena.cameras.main.shake(500, 0.016);
    t.img.setTint(0x5a4a48);
    t.chamas = cena.add.sprite(t.x, CHAO - 50, 'pb-fogo-faixa', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.emissivo - 1);
    t.chamas.play('pb-anim-fogo-faixa');
    t.queimaAte = cena.time.now + 6000;
    const j = cena.jogador;
    if (Math.abs(j.x - t.x) < 200 && j.y > CHAO - 260) j.receberDano(3, t.x, 420);
  }

  /* ---------------- Desafio 4: dreno ---------------- */

  private construirDreno(resolvido: boolean): void {
    const cena = this.cena;
    // Parede de dutos do dreno
    texturaPixel(cena, 'pb-a5-dreno', 300, 60, (p) => {
      p.px(0, 0, 300, 60, '#2A2226');
      for (let y = 6; y < 54; y += 12) {
        p.px(0, y, 300, 4, '#4A3E42');
        p.px(0, y, 300, 1, '#6A5A5E');
      }
      for (let x = 10; x < 300; x += 46) {
        p.px(x, 0, 6, 60, '#3A3034');
        p.disco(x + 3, 30, 4, '#8A2A18');
        p.disco(x + 3, 30, 2, '#C8401E');
      }
      p.textoCentro('DRENO DE EMERGENCIA', 150, 1, COR.advertencia);
    });
    cena.add.image(6150, CHAO - 120, 'pb-a5-dreno').setOrigin(0, 1).setScale(ESCALA).setDepth(PROF.estruturas - 3);

    texturaCarretaPetroleo(cena, 'pb-a5-carreta', false);
    const valores = resolvido ? [...this.modelo.pressao].sort((a, b) => a - b) : this.modelo.pressao;
    if (resolvido) this.modelo.pressao = [...valores];
    valores.forEach((v, i) => {
      const chave = `pb-a5-pressao-${v}`;
      const txt = `${v} PSI`;
      texturaPixel(cena, chave, larguraTexto(txt) + 6, 9, (p) => {
        p.px(0, 0, larguraTexto(txt) + 6, 9, '#0E0A0A');
        p.moldura(0, 0, larguraTexto(txt) + 6, 9, COR.advertencia);
        p.texto(txt, 3, 2, COR.virus);
      });
      const carreta = cena.add.image(0, 0, 'pb-a5-carreta').setOrigin(0.5, 1).setScale(ESCALA);
      const medidor = cena.add.image(0, -88, chave).setScale(ESCALA * 0.75);
      const indice = cena.add.text(0, 14, `[${i}]`, { fontFamily: 'Consolas, monospace', fontSize: '13px', color: '#F2C230', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0);
      const cont = cena.add.container(this.xDreno(i), CHAO + 4, [carreta, medidor, indice]).setDepth(PROF.estruturas + 1);
      this.carretasDreno.push({ valor: v, cont });
    });

    const console4 = cena.add.sprite(6040, CHAO, 'pb-console-laranja', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.npcs);
    console4.play('pb-anim-console-laranja');
    cena.interativo(6040, CHAO - 50, '[E] DRENO DAS CARRETAS (DESAFIO 4)', () => this.abrirPainel(), () => !cena.estado.desafios[3]);
    cena.gatilho(INICIO_DRENO, INICIO_DRENO + 100, () => {
      this.modoLento = true;
      cena.registrarCheckpoint(INICIO_DRENO + 60, CHAO - 48, 'CHECKPOINT: DRENO');
      cena.falar(FALAS.desafio4Intro, undefined, 'a5-d4-intro');
    });

    texturaPortao(cena, 'pb-a5-saida', 'TORRE');
    this.portaoSaida = cena.imagem('pb-a5-saida', 7520, CHAO, PROF.estruturas);
    this.paredeSaida = cena.solido(7480, 0, 80, CHAO);
    if (resolvido) this.abrirSaida(false);
    cena.gatilho(7600, 7800, () => cena.concluirArea());
  }

  private xDreno(i: number): number {
    return 6260 + i * 200;
  }

  private abrirPainel(): void {
    this.cena.abrirDesafio('ordenacao', this.modelo, 'DRENO DAS CARRETAS // TERMINAL DE COMBUSTÍVEL // DESAFIO 4: ORDENAÇÃO', [
      '=== DRENO DE EMERGÊNCIA ===',
      '> 6 carretas precisam ser ligadas ao dreno em ordem CRESCENTE de pressão.',
      '> O guindaste só troca duas carretas VIZINHAS de lugar (como no bubble sort).',
      '> Cada troca certa empurra o fogo para trás. Troca que piora a ordem: vapor e o fogo avança!',
      '>',
      '>   se pressao[i] > pressao[i+1]:',
      '>       trocar(i, i+1)',
      '>',
      this.modelo.desenhar(),
      '>',
      '> Digite "ajuda" para o manual ou "dica" para a dica da BOIA.',
    ]);
  }

  override aoResultadoTerminal(resultado: ResultadoComando, desafio: string): void {
    if (desafio !== 'ordenacao') return;
    const eventos = this.modelo.eventos.splice(0) as EventoCarreta[];
    for (const ev of eventos) {
      this.animandoTroca = this.animandoTroca.then(() => this.animarTroca(ev));
    }
    if (!resultado.sucesso && resultado.acao !== 'LIMPAR_TERMINAL') {
      this.erros++;
      if (this.erros === 2) this.cena.imprimirNoTerminal(`[DICA DA BOIA] "${DICAS_BOIA[3]}"`);
    }
    if (resultado.acao === 'ORDEM_CONCLUIDA') {
      this.animandoTroca = this.animandoTroca.then(() => this.concluirDesafio());
    }
  }

  private animarTroca(ev: EventoCarreta): Promise<void> {
    const cena = this.cena;
    const a = this.carretasDreno[ev.i];
    const b = this.carretasDreno[ev.i + 1];
    this.carretasDreno[ev.i] = b;
    this.carretasDreno[ev.i + 1] = a;
    (a.cont.list[2] as Phaser.GameObjects.Text).setText(`[${ev.i + 1}]`);
    (b.cont.list[2] as Phaser.GameObjects.Text).setText(`[${ev.i}]`);
    cena.som.tocar('guindaste');
    if (ev.piorou) {
      cena.som.tocar('vapor');
      cena.efeitos.vapor(a.cont.x, CHAO - 80, 2);
      this.fogoX += 90;
      cena.hud.aviso('TROCA PIOROU A ORDEM: O FOGO AVANÇOU!', '#FF4A3A', 1400);
    } else {
      this.fogoX = Math.max(-400, this.fogoX - 170);
      const jato = cena.armas.chuvaDeEspuma(this.xDreno(ev.i), CHAO - 120, -420);
      cena.time.delayedCall(600, () => jato.stop());
      cena.time.delayedCall(4000, () => jato.destroy());
    }
    const subir = (c: Phaser.GameObjects.Container, x: number) =>
      new Promise<void>((resolver) => {
        cena.tweens.chain({
          targets: c,
          tweens: [
            { y: CHAO - 90, duration: 220, ease: 'Sine.easeOut' },
            { x, duration: 320, ease: 'Sine.easeInOut' },
            { y: CHAO + 4, duration: 200, ease: 'Bounce.easeOut' },
          ],
          onComplete: () => resolver(),
        });
      });
    return Promise.all([subir(a.cont, this.xDreno(ev.i + 1)), subir(b.cont, this.xDreno(ev.i))]).then(() => undefined);
  }

  private concluirDesafio(): void {
    const cena = this.cena;
    cena.estado.desafios[3] = true;
    this.fogoAtivo = false;
    const jato = cena.armas.chuvaDeEspuma(6400, CHAO - 200, -520);
    cena.time.delayedCall(2500, () => jato.stop());
    cena.time.delayedCall(6000, () => jato.destroy());
    this.apagarOnda();
    this.abrirSaida(true);
    cena.fecharTerminalEm(1500);
    cena.time.delayedCall(1800, () => cena.falar(FALAS.desafio4Fim));
  }

  private apagarOnda(): void {
    for (const s of [...this.chamasOnda, this.frenteOnda]) {
      this.cena.tweens.add({ targets: s, scaleY: 0, alpha: 0, duration: 1200 });
    }
    this.cena.tweens.add({ targets: this.brilhoOnda, alpha: 0, duration: 1200 });
    this.plumaOnda.stop();
  }

  private abrirSaida(animar: boolean): void {
    this.portaoSaida.setFrame(1);
    this.paredeSaida.destroy();
    if (animar) {
      this.cena.som.tocar('item');
      this.cena.hud.aviso('PORTÃO ABERTO! PARA A TORRE DO SERVIDOR!', COR.virus, 2500);
    }
  }

  /* ---------------- Atualização ---------------- */

  override fogoNoChaoEm(x: number): boolean {
    return this.fogoAtivo && x < this.fogoX;
  }

  override aoEspumaNoOleo(x: number): void {
    if (this.fogoAtivo && x > this.fogoX && x - this.fogoX < 260) {
      this.bloqueadoAte = this.cena.time.now + 4000;
      this.cena.efeitos.textoFlutuante(x, CHAO - 80, 'ESPUMA SEGURA O FOGO!', COR.espuma, 13);
    }
  }

  override aoReviver(): void {
    if (this.fogoAtivo) this.fogoX = Math.min(this.fogoX, this.cena.checkpoint.x - 650);
  }

  override atualizarPausado(_tempo: number, delta: number): void {
    // Enquanto o operador pensa no terminal, o fogo avança devagar
    if (this.fogoAtivo && this.modoLento) {
      this.fogoX += (12 * delta) / 1000;
      this.aplicarDanoFogo();
    }
    this.posicionarOnda();
  }

  override atualizar(tempo: number, delta: number): void {
    const cena = this.cena;
    const j = cena.jogador;
    if (this.fogoAtivo) {
      let vel = this.modoLento ? 14 : VELOCIDADE_FOGO;
      // Espuma no óleo à frente do fogo corta o caminho
      if (tempo < this.bloqueadoAte && cena.armas.espumaEm(this.fogoX + 60, 90)) vel = 0;
      // Fogo nunca fica longe demais (pressão constante na fuga)
      if (!this.modoLento && j.x - this.fogoX > 1100) vel *= 2.2;
      this.fogoX += (vel * delta) / 1000;
      for (const t of this.tanques) if (!t.explodiu && this.fogoX > t.x - 120) this.explodirTanque(t);
      this.aplicarDanoFogo();
    }
    for (const t of this.tanques) {
      if (t.chamas && tempo > t.queimaAte) {
        t.chamas.destroy();
        t.chamas = null;
      }
      if (t.chamas && !j.morto && Math.abs(j.x - t.x) < 96 && Math.abs(j.pes - (CHAO - 56)) < 12) j.receberDano(2, t.x);
    }
    this.posicionarOnda();

    // Barris bugados rolando na direção do operador
    if (tempo > this.proximoBarril && j.x > 1800 && j.x < INICIO_DRENO) {
      this.proximoBarril = tempo + 3600;
      cena.inimigos.adicionar(new BarrilBugado(cena, j.x + 700, CHAO - 60, -1));
    }
  }

  private aplicarDanoFogo(): void {
    const j = this.cena.jogador;
    if (!j.morto && j.x < this.fogoX + 20 && j.pes > CHAO - 140) {
      if (j.receberDano(2, j.x - 100, 380)) this.cena.efeitos.textoFlutuante(j.x, j.y - 80, 'O FOGO ALCANÇOU VOCÊ!', '#FF4A3A', 13);
    }
  }

  private posicionarOnda(): void {
    const cam = this.cena.cameras.main;
    const visivel = this.fogoAtivo || this.frenteOnda.alpha > 0.01;
    this.chamasOnda.forEach((s, i) => {
      const x = this.fogoX - 60 - i * 170;
      s.setPosition(Math.round(x), CHAO + 4).setVisible(visivel && x > cam.scrollX - 200);
    });
    this.frenteOnda.setPosition(Math.round(this.fogoX), CHAO + 4);
    this.brilhoOnda.setPosition(this.fogoX - 120, CHAO - 90);
    this.plumaOnda.setPosition(this.fogoX - 200, CHAO - 140);
  }
}
