import Phaser from 'phaser';
import type { ResultadoComando } from '../../../compartilhado/tipos';
import { COR, ESCALA, bayer, hexRgb, rgbHex, texturaPixel } from '../porto/ArtePorto';
import { AguaPorto } from '../porto/AguaPorto';
import {
  desenharCarreta,
  desenharCeu,
  desenharCidade,
  desenharDepositoPneus,
  desenharGuindaste,
  desenharNavio,
  desenharPier,
  desenharPilhaFundo,
  desenharTorreServidor,
} from '../porto/CenariosPorto';
import { ModeloFila } from '../porto/DesafiosPorto';
import type { EventoFila } from '../porto/DesafiosPorto';
import { DICAS_BOIA, FALAS, GRAVACOES_PORTUS } from '../porto/DialogosPorto';
import { PROF } from '../porto/EfeitosPorto';
import type { FocoIncendio } from '../porto/FogoPorto';
import { AguaVirus, Gaivirus, ManchaViva, SiriScript } from '../porto/InimigosPorto';
import { texturaNavio, texturaPainelChegadas, texturaPlaca, texturaPortao } from '../porto/ObjetosPorto';
import type { InfoNavio, TipoNavio } from '../porto/ObjetosPorto';
import type { PlataformaMovel } from '../porto/PlataformasPorto';
import { AreaPorto } from './AreaBase';

const PIER = 560;
const NIVEL_AGUA = 616;
const X_FRENTE = 4200;
const ESPACO = 400;
const X_ESPERA_INTRUSO = 4330;
const X_ATRACADOURO = 4960;
const cacheLuzes = new Map<string, Array<[number, number]>>();

interface NavioFila {
  nome: string;
  tipo: TipoNavio;
  info: InfoNavio;
  img: Phaser.GameObjects.Image;
  plats: Array<{ plat: PlataformaMovel; dx: number; alt: number }>;
  x: number;
  borda: number;
  fase: number;
  ativo: boolean;
}

/**
 * ÁREA 3 — CAIS DA FILA.
 * Mar poluído verde-lodo com óleo furta-cor, lixo boiando e óleo em chamas. Navios esperam em fila;
 * o jogador pula entre os conveses e controla o portão do cais (Desafio 2: Fila).
 */
export class Area3Cais extends AreaPorto {
  private modelo = new ModeloFila();
  private navios = new Map<string, NavioFila>();
  private filaEventos: EventoFila[] = [];
  private animando = false;
  private focosAgua: FocoIncendio[] = [];
  private focosCais: FocoIncendio[] = [];
  private painel!: Phaser.GameObjects.Image;
  private estacas: Phaser.GameObjects.Image[] = [];
  private erros = 0;

  override construir(): void {
    this.largura = 6400;
    this.inicio = { x: 170, y: PIER - 48 };
    this.volumeOndas = 0.9;
    this.volumeFogo = 0.5;
    const cena = this.cena;
    const resolvido = cena.estado.desafios[1];
    this.modelo = new ModeloFila();
    this.navios = new Map();
    this.filaEventos = [];
    this.animando = false;
    this.focosAgua = [];
    this.focosCais = [];
    this.estacas = [];

    this.construirFundo();

    // Mar com maré
    cena.agua = new AguaPorto(cena, {
      nivel: NIVEL_AGUA,
      mare: { amplitude: 22, periodo: 9000 },
      limpeza: resolvido ? 1 : 0,
      manchas: [
        { x: 2300, profundidade: 22, rx: 22, ry: 3 },
        { x: 2900, profundidade: 40, rx: 16, ry: 2 },
        { x: 3350, profundidade: 18, rx: 26, ry: 3 },
        { x: 3900, profundidade: 50, rx: 18, ry: 3 },
        { x: 4400, profundidade: 26, rx: 24, ry: 3 },
        { x: 1200, profundidade: 30, rx: 20, ry: 3 },
        { x: 600, profundidade: 44, rx: 16, ry: 2 },
      ],
      reflexos: resolvido
        ? []
        : [
            { x0: 2700, x1: 2920, forca: 1 },
            { x0: 3480, x1: 3680, forca: 1 },
            { x0: 4860, x1: 5260, forca: 1 },
          ],
      lixo: [
        { tipo: 0, x: 2470 },
        { tipo: 1, x: 2350 },
        { tipo: 2, x: 3200 },
        { tipo: 3, x: 3560 },
        { tipo: 4, x: 3950 },
        { tipo: 1, x: 4420 },
        { tipo: 2, x: 2780 },
        { tipo: 0, x: 4050 },
      ],
    });
    cena.solido(0, 712, this.largura, 40);

    // Píer inicial
    this.pier(0, 1900);
    cena.criarHidrante(760, PIER);
    texturaPainelChegadas(cena);
    this.painel = cena.imagem('pb-painel-chegadas', 990, PIER, PROF.estruturas);
    cena.criarCraca(1130, PIER);
    cena.criarGravacaoPortus(3, 1560, PIER, GRAVACOES_PORTUS[2]);
    texturaPlaca(cena, 'pb-a3-placa', ['CAIS DA FILA', 'PORTAO ->'], COR.contAzul);
    cena.imagem('pb-a3-placa', 360, PIER, PROF.estruturas);
    cena.inimigos.adicionar(new ManchaViva(cena, 520, PIER - 30));
    cena.inimigos.adicionar(new SiriScript(cena, 1400, PIER - 30, 1250, 1760));

    // Estacas de atracação que a maré cobre e revela
    texturaPixel(cena, 'pb-a3-estaca', 8, 30, (p) => {
      p.px(0, 0, 8, 30, '#2E2B2A');
      p.px(0, 0, 8, 2, '#5A5650');
      p.px(0, 4, 8, 2, '#3F5A2E');
      p.px(1, 1, 6, 1, COR.advertencia);
    });
    for (const x of [1965, 2035]) {
      this.estacas.push(cena.imagem('pb-a3-estaca', x, 606, PROF.plataformas, 0));
      cena.solido(x - 16, 606, 32, 120, true);
    }

    // Navios na fila (popa à esquerda, proa para o portão)
    const tipos: Record<string, TipoNavio> = {
      CARGUEIRO: 'CARGUEIRO',
      PETROLEIRO: 'PETROLEIRO',
      PESQUEIRO: 'PESQUEIRO',
      BALSA: 'BALSA',
      GRANELEIRO: 'GRANELEIRO',
      REBOCADOR: 'REBOCADOR',
    };
    if (!resolvido) {
      this.modelo.fila.forEach((nome, i) => this.criarNavio(nome, tipos[nome], X_FRENTE - ESPACO * i));
    } else {
      this.criarNavio('REBOCADOR', 'REBOCADOR', X_ATRACADOURO - 140);
    }

    // Óleo em chamas entre os navios (contam no Índice de Fumaça)
    this.focosAgua.push(cena.fogo.criar({ id: 'a3-f1', x: 2810, y: NIVEL_AGUA, tamanho: 'p', largura: 2, vida: 2, soEspuma: true }));
    this.focosAgua.push(cena.fogo.criar({ id: 'a3-f2', x: 3578, y: NIVEL_AGUA, tamanho: 'p', largura: 2, vida: 2, soEspuma: true }));
    cena.inimigos.adicionar(new AguaVirus(cena, 2380, 0));
    cena.inimigos.adicionar(new AguaVirus(cena, 3215, 2));
    cena.inimigos.adicionar(new Gaivirus(cena, 3000, 270));
    cena.inimigos.adicionar(new Gaivirus(cena, 4000, 250));

    // Torre do portão do cais (Desafio 2)
    texturaPixel(cena, 'pb-a3-torre', 60, 60, (p) => {
      p.px(0, 0, 60, 6, '#4A4448');
      p.px(0, 0, 60, 1, '#6A6468');
      p.faixaAdvertencia(0, 6, 60, 2);
      for (const x of [4, 28, 52]) {
        p.px(x, 8, 4, 52, '#2E2B2A');
        p.px(x, 40, 4, 3, '#3F5A2E');
      }
      p.linha(6, 10, 30, 40, '#3A3436');
      p.linha(30, 10, 54, 40, '#3A3436');
    });
    cena.imagem('pb-a3-torre', 4600, PIER + 200, PROF.estruturas, 1).setY(PIER - 40 + 240);
    cena.solido(4480, PIER - 40, 240, 24);
    const console2 = cena.add.sprite(4640, PIER - 40, 'pb-console-azul', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.npcs);
    console2.play('pb-anim-console-azul');
    cena.interativo(4640, PIER - 90, '[E] PORTÃO DO CAIS (DESAFIO 2)', () => this.abrirPainel(), () => !cena.estado.desafios[1]);
    cena.criarHidrante(4520, PIER - 40);
    cena.gatilho(4470, 4730, () => {
      cena.registrarCheckpoint(4560, PIER - 90, 'CHECKPOINT: TORRE DO PORTÃO');
      cena.falar(FALAS.desafio2Intro, undefined, 'a3-d2-intro');
    }, 0, PIER);
    // Passarela até o cais do depósito
    cena.solido(4720, PIER - 20, 100, 16, true);

    // Cais do depósito (em chamas até o rebocador atracar)
    this.pier(4800, this.largura);
    if (!resolvido) {
      this.focosCais.push(cena.fogo.criar({ x: 5060, y: PIER, tamanho: 'g', largura: 3, vida: 99, soEspuma: true, barreira: { largura: 220, altura: 560 } }));
      this.focosCais.push(cena.fogo.criar({ x: 4870, y: NIVEL_AGUA, tamanho: 'm', largura: 2, vida: 99, soEspuma: true }));
    }
    texturaPortao(cena, 'pb-a3-saida', 'DEPOSITO');
    cena.imagem('pb-a3-saida', 6250, PIER, PROF.estruturas).setFrame(1);
    cena.gatilho(6290, 6500, () => cena.concluirArea());

    for (const [x, y] of [
      [450, 480],
      [1000, 400],
      [1965, 560],
      [2200, 440],
      [2600, 450],
      [3000, 500],
      [3400, 430],
      [3800, 440],
      [4200, 400],
      [5600, 480],
    ]) {
      cena.criarLacre(x, y);
    }
  }

  override iniciar(): void {
    this.cena.falar(FALAS.caisEntrada, undefined, 'a3-entrada');
  }

  private pier(x0: number, x1: number): void {
    const cena = this.cena;
    const chave = `pb-a3-pier-${x0}`;
    const w = Math.ceil((x1 - x0) / ESCALA);
    texturaPixel(cena, chave, w, 40, (p) => desenharPier(p, 0, w, 0, 40, false));
    cena.add.image(x0, PIER, chave).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.plataformas);
    cena.solido(x0, PIER, x1 - x0, 44);
  }

  private criarNavio(nome: string, tipo: TipoNavio, x: number): NavioFila {
    const cena = this.cena;
    const info = texturaNavio(cena, tipo);
    const img = cena.add.image(x, NIVEL_AGUA, info.chave).setOrigin(0.5, info.conves / info.h).setScale(ESCALA).setDepth(PROF.estruturas + 1);
    const borda = tipo === 'BALSA' || tipo === 'PESQUEIRO' ? 36 : 48;
    const plats = info.plataformas.map(([x0, x1, alt]) => {
      const largura = (x1 - x0) * ESCALA;
      const dx = ((x0 + x1) / 2 - info.w / 2) * ESCALA;
      const plat = cena.plataformaMovel(x + dx, NIVEL_AGUA - borda - alt * ESCALA + 6, largura, 12, true);
      return { plat, dx, alt };
    });
    const navio: NavioFila = { nome, tipo, info, img, plats, x, borda, fase: Math.random() * 6, ativo: true };
    this.navios.set(nome, navio);
    this.posicionarNavio(navio, true);
    return navio;
  }

  private posicionarNavio(n: NavioFila, teleporte = false): void {
    const nivel = this.cena.agua?.nivel ?? NIVEL_AGUA;
    const balanco = Math.sin(this.cena.time.now / 900 + n.fase) * 3;
    const convesY = nivel - n.borda + balanco;
    n.img.setPosition(Math.round(n.x), Math.round(convesY));
    for (const p of n.plats) {
      const px = n.x + p.dx;
      const py = convesY - p.alt * ESCALA + 6;
      if (teleporte) p.plat.teleportar(px, py);
      else p.plat.moverPara(px, py);
    }
  }

  private construirFundo(): void {
    this.camada('pb-a3-ceu', 0, PROF.ceu, (p, w, h) => desenharCeu(p, w, h, 'entardecer', 104, 236, 48));
    this.camada('pb-a3-cidade', 0.1, PROF.distante, (p, w) => {
      cacheLuzes.set('a3-janelas', desenharCidade(p, 0, w, 108, 13, false));
      cacheLuzes.set('a3-torre', desenharTorreServidor(p, 330, 110, false));
    });
    this.luzesVirus(cacheLuzes.get('a3-janelas') ?? [], 0.1, PROF.distante + 1, 0.55);
    this.luzesVirus(cacheLuzes.get('a3-torre') ?? [], 0.1, PROF.distante + 1, 0.85);
    // Navios distantes e guindastes (0.25x)
    this.camada('pb-a3-navios', 0.25, PROF.meio, (p, w) => {
      for (let x = 30; x < w; x += 150) desenharGuindaste(p, x, 112, false, 0.8);
      for (let x = 10; x < w - 60; x += 95) desenharNavio(p, x, 114, 70, Math.floor(x), false, 'BUG');
    });
    // Margem do outro lado da baía com o depósito em chamas e a carreta tombada (0.5x)
    const fatorProx = 0.5;
    this.camada('pb-a3-margem', fatorProx, PROF.proximo, (p, w) => {
      // Mar estático ao fundo com pontilhado verde-lodo e reflexos laranja
      const rampa = ['#2A3A2A', '#1E2A22', '#141C18'].map(hexRgb);
      for (let y = 128; y < 180; y++) {
        const k = (y - 128) / 52;
        for (let x = 0; x < w; x++) {
          const i = k < 0.4 ? 0 : k < 0.75 ? 1 : 2;
          const c = (k * 3) % 1 > bayer(x, y) && i < 2 ? rampa[i + 1] : rampa[i];
          let cor = rgbHex(c);
          if (Math.sin(x * 0.3 + y * 13.7) > 0.9) cor = '#3E5236';
          if (y < 136 && (x % 260) > 110 && (x % 260) < 170 && Math.sin(x * 0.55 + y * 9.1) > 0.8) cor = '#C8501E';
          p.ponto(x, y, cor);
        }
      }
      p.px(0, 118, w, 10, '#4A4744');
      p.px(0, 118, w, 1, '#6A6662');
      for (let x = 0; x < w; x += 8) {
        p.px(x, 121, 4, 1, COR.advertencia);
      }
      for (let x = 20; x < w; x += 260) {
        desenharCarreta(p, x, 104, false);
        desenharPilhaFundo(p, x + 60, 118, 3, x, false, 0.2);
        desenharPilhaFundo(p, x + 74, 118, 2, x + 1, false, 0.2);
        desenharDepositoPneus(p, x + 110, 118, false);
      }
    }, {});
    // Chamas dos depósitos ao fundo
    for (let xArte = 130; xArte < 1200; xArte += 260) {
      const x = xArte * ESCALA + 90;
      const s = this.cena.add.sprite(x, 100 * ESCALA, 'pb-fogo-g', 0).setOrigin(0.5, 1).setScale(ESCALA * 0.6).setScrollFactor(fatorProx, 0).setDepth(PROF.proximo + 1);
      s.play({ key: 'pb-anim-fogo-g', startFrame: xArte % 10 });
      this.cena.efeitos.brilho(x, 96 * ESCALA, 120, COR.fogoLaranja, 0.32, fatorProx, PROF.proximo + 2);
      this.cena.efeitos.pluma(x, 84 * ESCALA, { largura: 60, raio: 14, frequencia: 520, fator: fatorProx, profundidade: PROF.proximo + 3, vida: 10000, escalaFinal: 2.2 });
    }
  }

  /* ---------------- Desafio 2 ---------------- */

  private abrirPainel(): void {
    this.cena.abrirDesafio('fila', this.modelo, 'PORTÃO DO CAIS // CAIS DA FILA // DESAFIO 2: FILA', [
      '=== CONTROLE DO PORTÃO DO CAIS ===',
      '> O REBOCADOR-BOMBEIRO está no FIM da fila de 6 navios.',
      '> Só o navio da FRENTE atraca. Navios novos entram no FIM.',
      '> Um script do MegaBrain faz navios-vírus furarem a fila: bloqueie-os mandando para o fim!',
      '>',
      '>   fila.dequeue()        // o navio da frente atraca',
      '>   fila.enqueue(navio)   // um navio novo entra no fim',
      '>',
      this.modelo.desenhar(),
      '>',
      '> Digite "ajuda" para o manual ou "dica" para a dica da BOIA.',
    ]);
  }

  override aoResultadoTerminal(resultado: ResultadoComando, desafio: string): void {
    if (desafio !== 'fila') return;
    this.filaEventos.push(...this.modelo.eventos.splice(0));
    if (resultado.acao === 'FILA_BUZINA') {
      this.cena.som.tocar('buzina');
      for (const n of this.navios.values()) {
        if (!n.ativo) continue;
        const x0 = n.x;
        this.cena.tweens.add({ targets: n, x: x0 + 40, duration: 220, yoyo: true, ease: 'Sine.easeInOut' });
      }
      this.cena.cameras.main.shake(300, 0.004);
    }
    if (!resultado.sucesso && resultado.acao !== 'LIMPAR_TERMINAL') {
      this.erros++;
      if (this.erros === 3) this.cena.imprimirNoTerminal(`[DICA DA BOIA] "${DICAS_BOIA[1]}"`);
    }
    void this.processar();
  }

  private moverNavio(n: NavioFila, x: number, duracao: number): Promise<void> {
    return new Promise((resolver) => {
      this.cena.tweens.add({ targets: n, x, duration: duracao, ease: 'Sine.easeInOut', onComplete: () => resolver() });
    });
  }

  private realinharFila(): Promise<void> {
    const promessas = this.modelo.fila.map((nome, i) => {
      const n = this.navios.get(nome);
      return n ? this.moverNavio(n, X_FRENTE - ESPACO * i, 700) : Promise.resolve();
    });
    return Promise.all(promessas).then(() => undefined);
  }

  private async atracar(n: NavioFila, permanecer = false): Promise<void> {
    this.cena.som.tocar('buzina');
    await this.moverNavio(n, X_ATRACADOURO - (permanecer ? 140 : 0), 900);
    if (permanecer) return;
    n.ativo = false;
    this.cena.tweens.add({
      targets: n.img,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        n.img.destroy();
        for (const p of n.plats) p.plat.destruir();
        this.cena.plataformasMoveis = this.cena.plataformasMoveis.filter((pm) => !n.plats.some((p) => p.plat === pm));
      },
    });
  }

  private async processar(): Promise<void> {
    if (this.animando) return;
    this.animando = true;
    const cena = this.cena;
    while (this.filaEventos.length > 0) {
      const ev = this.filaEventos.shift() as EventoFila;
      const n = this.navios.get(ev.navio);
      if (ev.tipo === 'atracou' && n) {
        const rebocador = ev.navio === 'REBOCADOR';
        await Promise.all([this.atracar(n, rebocador), this.realinharFila()]);
        if (rebocador) await this.rebocadorLimpa(n);
      } else if (ev.tipo === 'furou' && n) {
        await this.moverNavio(n, X_FRENTE + 60, 400);
        await this.atracar(n);
        cena.hud.aviso('O NAVIO-VÍRUS FUROU A FILA! VÍRUS NO CAIS!', '#FF4A3A');
        cena.inimigos.adicionar(new Gaivirus(cena, 4700, 260, 160));
        cena.inimigos.adicionar(new Gaivirus(cena, 4300, 220, 200));
      } else if (ev.tipo === 'enfileirou' && n) {
        n.img.setDepth(PROF.estruturas);
        const i = this.modelo.fila.indexOf(ev.navio);
        await this.moverNavio(n, X_FRENTE - ESPACO * i, 1600);
        n.img.setDepth(PROF.estruturas + 1);
      } else if (ev.tipo === 'intruso') {
        const virus = this.criarNavio(ev.navio, 'VIRUS', X_ATRACADOURO + 300);
        virus.img.setDepth(PROF.estruturas).setTint(0xb8ffcc);
        cena.som.tocar('glitch');
        await this.moverNavio(virus, X_ESPERA_INTRUSO, 1200);
        cena.imprimirNoTerminal(`!! ${ev.navio} está tentando FURAR a fila !!`, 'erro');
      }
    }
    this.animando = false;
  }

  private async rebocadorLimpa(rebocador: NavioFila): Promise<void> {
    const cena = this.cena;
    cena.estado.desafios[1] = true;
    cena.fecharTerminalEm(1200);
    // Canhões d'água do rebocador sobre o cais em chamas
    const jatos = [0, 1].map((i) =>
      cena.add.particles(rebocador.x + 40 + i * 30, (cena.agua?.nivel ?? NIVEL_AGUA) - 80, 'pb-bola-espuma', {
        speedX: { min: 260, max: 380 },
        speedY: { min: -420, max: -300 },
        gravityY: 500,
        lifespan: 1600,
        scale: { start: ESCALA * 0.8, end: ESCALA * 1.4 },
        alpha: { start: 0.9, end: 0.2 },
        frequency: 25,
      }).setDepth(PROF.fumacaFrente)
    );
    cena.som.tocar('espuma');
    await new Promise<void>((r) => cena.time.delayedCall(2200, () => r()));
    for (const f of [...this.focosCais, ...this.focosAgua]) f.apagar();
    cena.agua?.reflexos.splice(0);
    cena.agua?.limpar(5000);
    await new Promise<void>((r) => cena.time.delayedCall(1400, () => r()));
    for (const j of jatos) {
      j.stop();
      cena.time.delayedCall(1800, () => j.destroy());
    }
    cena.hud.aviso('REBOCADOR-BOMBEIRO LIMPOU O CAIS!', COR.telaBoia, 2600);
    cena.falar(FALAS.desafio2Fim);
  }

  /* ---------------- Atualização ---------------- */

  private atualizarNavios(): void {
    for (const n of this.navios.values()) if (n.ativo) this.posicionarNavio(n);
    const nivel = this.cena.agua?.nivel ?? NIVEL_AGUA;
    for (const f of this.focosAgua) f.reposicionar(nivel);
    if (this.focosCais[1]) this.focosCais[1].reposicionar(nivel);
  }

  override atualizarPausado(): void {
    this.atualizarNavios();
  }

  override atualizar(tempo: number): void {
    this.atualizarNavios();
    this.painel.setFrame(Math.floor(tempo / 600) % 2);
  }

  override aoReviver(): void {
    // Se o operador caiu na água, revive no último checkpoint seco (já tratado pela cena)
  }
}
