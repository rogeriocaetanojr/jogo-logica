import Phaser from 'phaser';
import type { ResultadoComando } from '../../../compartilhado/tipos';
import { COR, CORES_CONTEINER, ESCALA, aleatorio, sombrear, texturaPixel } from '../porto/ArtePorto';
import { desenharCeu, desenharCidade, desenharGuindaste, desenharPilhaFundo, desenharPoste, desenharTorreServidor } from '../porto/CenariosPorto';
import { ModeloPilha } from '../porto/DesafiosPorto';
import type { EventoPilha, NomePilha } from '../porto/DesafiosPorto';
import { DICAS_BOIA, FALAS, GRAVACOES_PORTUS } from '../porto/DialogosPorto';
import { PROF } from '../porto/EfeitosPorto';
import { ALTURA_CONTEINER, GuindastePortico, LARGURA_CONTEINER, PilhaFisica } from '../porto/GuindastePorto';
import type { BlocoConteiner } from '../porto/GuindastePorto';
import { EmpilhadeiraZumbi, Gaivirus, GarraGuindaste, JanelaPopup } from '../porto/InimigosPorto';
import { texturaConteinerAberto, texturaPlaca, texturaPortao } from '../porto/ObjetosPorto';
import { ESPUMA_MAXIMA } from '../porto/TiposPorto';
import { AreaPorto } from './AreaBase';

const CHAO = 640;
const cacheLuzes = new Map<string, Array<[number, number]>>();

/**
 * ÁREA 2 — PÁTIO DAS PILHAS.
 * Pilhas de contêineres de até 5 andares; portêineres bugados pegam e soltam contêineres sozinhos
 * (painéis de LED mostram push() e pop()). No meio fica o Desafio 1: Pilha.
 */
export class Area2Patio extends AreaPorto {
  // Guindaste bugado que solta contêineres (sombra avisa 1 s antes)
  private guindasteQueda!: GuindastePortico;
  private estadoQueda: 'seguindo' | 'aviso' | 'caindo' | 'espera' = 'seguindo';
  private quedaAte = 0;
  private sombraQueda!: Phaser.GameObjects.Ellipse;

  // Guindaste cíclico (escada que muda) entre as pilhas P e Q
  private guindasteCiclo!: GuindastePortico;
  private pilhaP!: PilhaFisica;
  private pilhaQ!: PilhaFisica;
  private passoCiclo = 0;
  private cicloOcupado = false;
  private proximoCiclo = 0;

  // Desafio 1
  private guindasteDesafio!: GuindastePortico;
  private pilhas!: Record<NomePilha, PilhaFisica>;
  private modelo = new ModeloPilha();
  private filaEventos: EventoPilha[] = [];
  private animando = false;
  private canhaoEntregue = false;
  private itemCanhao: Phaser.GameObjects.Image | null = null;
  private estivadores: Phaser.GameObjects.Sprite[] = [];
  private portao!: Phaser.GameObjects.Image;
  private paredePortao!: Phaser.GameObjects.Zone;
  private proximaRajada = 0;
  private errosDesafio = 0;

  override construir(): void {
    this.largura = 5760;
    this.inicio = { x: 170, y: CHAO - 48 };
    this.volumeOndas = 0.1;
    this.volumeFogo = 0.3;
    const cena = this.cena;
    this.modelo = new ModeloPilha();
    this.filaEventos = [];
    this.animando = false;
    this.canhaoEntregue = cena.estado.desafios[0];
    this.passoCiclo = 0;
    this.cicloOcupado = false;
    this.estivadores = [];
    this.itemCanhao = null;

    this.construirFundo();
    this.camada('pb-a2-chao', 1, PROF.plataformas, (p, w) => {
      p.px(0, 0, w, 20, '#4A5058');
      p.px(0, 0, w, 1, '#7A8088');
      for (let x = 0; x < w; x += 24) p.px(x, 6, 12, 1, COR.advertencia);
      for (let x = 0; x < w; x++) for (let y = 1; y < 20; y++) if ((x * 7 + y * 13) % 29 === 0) p.ponto(x, y, '#3A4048');
      p.px(0, 12, w, 8, '#3A4048');
    }, { alturaArte: 20, y: CHAO });
    cena.solido(0, CHAO, this.largura, 120);

    texturaPlaca(cena, 'pb-a2-placa', ['PATIO DAS PILHAS', 'LIMITE: 5 ANDARES'], COR.contVerde);
    cena.imagem('pb-a2-placa', 360, CHAO, PROF.estruturas);

    // --- Seção A: empilhadeira, contêineres caindo e CRACA ---
    this.pilhaEstatica(560, ['AMA', 'VRM']);
    this.pilhaEstatica(1620, ['AZL', 'VRD', 'AMA']);
    cena.inimigos.adicionar(new EmpilhadeiraZumbi(cena, 800, CHAO - 40, 680, 1420));
    cena.inimigos.adicionar(new Gaivirus(cena, 1200, 290));
    this.guindasteQueda = new GuindastePortico(cena, 'pb-a2-gq', 820, 1500, 150, CHAO, 740, 300);
    this.guindasteQueda.led('SOLTAR()', '#FF5A4A');
    this.sombraQueda = cena.add.ellipse(0, CHAO - 2, LARGURA_CONTEINER, 14, 0x000000, 0).setDepth(PROF.plataformas + 2);
    texturaConteinerAberto(cena);
    cena.imagem('pb-obj-cont-aberto', 1860, CHAO, PROF.estruturas);
    cena.criarCraca(1850, CHAO - 8);

    // --- Seção B: escada que muda (guindaste cíclico) ---
    this.pilhaQ = new PilhaFisica(cena, 2140, CHAO);
    for (const c of ['VRM', 'AZL', 'AMA']) this.pilhaQ.criar(c);
    this.pilhaP = new PilhaFisica(cena, 2400, CHAO);
    this.pilhaEstatica(2560, ['VRD', 'AMA', 'AZL', 'VRM', 'VRD']);
    this.guindasteCiclo = new GuindastePortico(cena, 'pb-a2-gc', 2020, 2520, 150, CHAO, 1930, 330);
    cena.inimigos.adicionar(new Gaivirus(cena, 2300, 260, 200));
    cena.gatilho(2500, 2640, () => cena.registrarCheckpoint(2560, 260, 'CHECKPOINT: TOPO DAS PILHAS'), 0, 330);

    // --- Seção C: Desafio 1 ---
    const xs: Record<NomePilha, number> = { A: 3250, B: 3460, C: 3670 };
    this.pilhas = {
      A: new PilhaFisica(cena, xs.A, CHAO),
      B: new PilhaFisica(cena, xs.B, CHAO),
      C: new PilhaFisica(cena, xs.C, CHAO),
    };
    if (!this.canhaoEntregue) {
      for (const nome of ['A', 'B', 'C'] as NomePilha[]) for (const c of this.modelo.pilhas[nome]) this.pilhas[nome].criar(c);
    } else {
      // Desafio já resolvido (área reiniciada): pilhas na configuração final
      this.pilhas.A.criar('VRM');
      for (const c of ['AMA', 'VRM', 'AZL', 'VRD']) this.pilhas.B.criar(c);
      for (const c of ['AZL', 'AMA']) this.pilhas.C.criar(c);
    }
    for (const nome of ['A', 'B', 'C'] as NomePilha[]) {
      texturaPixel(cena, `pb-a2-rotulo-${nome}`, 31, 7, (p) => {
        p.px(0, 0, 31, 7, '#1A1414');
        p.textoCentro(`PILHA ${nome}`, 15.5, 1, COR.advertencia);
      });
      cena.imagem(`pb-a2-rotulo-${nome}`, xs[nome], CHAO + 30, PROF.plataformas + 2);
    }
    this.guindasteDesafio = new GuindastePortico(cena, 'pb-a2-gd', 3110, 3810, 140, CHAO, 3010, 420);
    this.guindasteDesafio.led(this.canhaoEntregue ? 'CONCLUIDO' : 'PILHA A: 5/4 !!', this.canhaoEntregue ? COR.virus : '#FF5A4A');
    const console1 = cena.add.sprite(2960, CHAO, 'pb-console-amarelo', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.npcs);
    console1.play('pb-anim-console-amarelo');
    cena.interativo(2960, CHAO - 50, '[E] PAINEL DO GUINDASTE (DESAFIO 1)', () => this.abrirPainel(), () => !this.canhaoEntregue);
    cena.gatilho(2840, 2920, () => cena.falar(FALAS.desafio1Intro, undefined, 'a2-d1-intro'));

    // Estivadores travados e portão
    for (const x of [3790, 3860]) {
      const e = cena.add.sprite(x, CHAO, 'pb-estivador', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.npcs);
      if (this.canhaoEntregue) e.setFrame(4);
      else e.play('pb-anim-estivador');
      this.estivadores.push(e);
    }
    cena.interativo(3825, CHAO - 50, '[E] ESTIVADORES', () =>
      cena.falar(this.canhaoEntregue ? [['estivador', 'Valeu de novo, operador! O portão está aberto.']] : FALAS.estivadorTravado)
    );
    texturaPortao(cena, 'pb-a2-portao', 'PORTAO TRAVADO');
    this.portao = cena.imagem('pb-a2-portao', 3965, CHAO, PROF.estruturas + 1);
    this.paredePortao = cena.solido(3920, 0, 90, CHAO);
    if (this.canhaoEntregue) this.abrirPortao(false);

    // --- Seção D: depois do portão (precisa da espuma) ---
    cena.criarHidrante(4070, CHAO);
    cena.fogo.criar({ id: 'a2-f1', x: 4420, y: CHAO, tamanho: 'm', largura: 3, vida: 3, soEspuma: true, barreira: { largura: 160, altura: 400 } });
    this.pilhaEstatica(4950, ['VRM', 'AZL', 'AMA']);
    cena.fogo.criar({ id: 'a2-f2', x: 4950, y: CHAO - 3 * ALTURA_CONTEINER, tamanho: 'p', largura: 2, vida: 2, soEspuma: true });
    this.pilhaEstatica(4700, ['VRD']);
    cena.gatilho(4150, 4220, () => cena.inimigos.adicionar(new JanelaPopup(cena, cena.jogador.x + 320, 330)));
    cena.inimigos.adicionar(new GarraGuindaste(cena, 4700, 110, CHAO, 4560, 5250));
    cena.inimigos.adicionar(new EmpilhadeiraZumbi(cena, 5150, CHAO - 40, 5050, 5500));
    cena.inimigos.adicionar(new Gaivirus(cena, 5000, 250));
    cena.criarGravacaoPortus(2, 5380, CHAO, GRAVACOES_PORTUS[1]);
    texturaPortao(cena, 'pb-a2-saida', 'CAIS DA FILA');
    cena.imagem('pb-a2-saida', 5630, CHAO, PROF.estruturas).setFrame(1);
    cena.gatilho(5690, 5900, () => cena.concluirArea());

    for (const [x, y] of [
      [560, 470],
      [1000, 560],
      [1620, 400],
      [2140, 380],
      [2560, 260],
      [3030, 560],
      [4070, 520],
      [4700, 520],
      [4950, 380],
      [5450, 560],
    ]) {
      cena.criarLacre(x, y);
    }
    this.proximaRajada = cena.time.now + 9000;
  }

  override iniciar(): void {
    this.cena.falar(FALAS.patioEntrada, undefined, 'a2-entrada');
  }

  private pilhaEstatica(x: number, codigos: string[]): PilhaFisica {
    const p = new PilhaFisica(this.cena, x, CHAO);
    for (const c of codigos) p.criar(c);
    return p;
  }

  private construirFundo(): void {
    this.camada('pb-a2-ceu', 0, PROF.ceu, (p, w, h) => desenharCeu(p, w, h, 'entardecer', 104, 120, 50));
    this.camada('pb-a2-cidade', 0.1, PROF.distante, (p, w) => {
      cacheLuzes.set('a2-janelas', desenharCidade(p, 0, w, 112, 9, false));
      cacheLuzes.set('a2-torre', desenharTorreServidor(p, 380, 114, false));
    });
    this.luzesVirus(cacheLuzes.get('a2-janelas') ?? [], 0.1, PROF.distante + 1, 0.55);
    this.luzesVirus(cacheLuzes.get('a2-torre') ?? [], 0.1, PROF.distante + 1, 0.85);
    this.camada('pb-a2-guindastes', 0.25, PROF.meio, (p, w) => {
      p.px(0, 118, w, 62, '#34262C');
      for (let x = 60; x < w; x += 110) desenharGuindaste(p, x, 122, false);
      for (let i = 0; i < 18; i++) desenharPilhaFundo(p, 10 + i * 34, 122, 2 + (i % 4), i, false, 0.35);
    });
    this.camada('pb-a2-paredes', 0.5, PROF.proximo, (p, w) => {
      const r = aleatorio(77);
      p.px(0, 152, w, 28, '#2A2428');
      for (let x = 0; x < w; x += 13) {
        const n = 2 + Math.floor(r() * 4);
        desenharPilhaFundo(p, x, 160, n, Math.floor(r() * 4), false, 0.5);
      }
      for (let x = 40; x < w; x += 120) desenharPoste(p, x, 160, 46, false);
      for (let x = 0; x < w; x += 6) p.ponto(x, 159, sombrear(CORES_CONTEINER[(x / 6) % 4], 0.6));
    });
  }

  /* ---------------- Desafio 1 ---------------- */

  private abrirPainel(): void {
    const cena = this.cena;
    cena.abrirDesafio('pilha', this.modelo, 'PAINEL DO GUINDASTE // PÁTIO DAS PILHAS // DESAFIO 1: PILHA', [
      'O guindaste só pega o contêiner do TOPO e só coloca no TOPO de outra pilha.',
      'Limite de 4 contêineres por pilha por causa do vento (a pilhaA está com 5!).',
    ]);
  }

  override aoResultadoTerminal(resultado: ResultadoComando, desafio: string): void {
    if (desafio !== 'pilha') return;
    const novos = this.modelo.eventos.splice(0);
    this.filaEventos.push(...novos);
    if (resultado.acao === 'PILHA_TOPO') {
      this.guindasteDesafio.led('SO O TOPO!', '#FF3A2A');
      this.guindasteDesafio.tremer();
      this.cena.cameras.main.shake(200, 0.006);
    }
    if (!resultado.sucesso && resultado.acao !== 'LIMPAR_TERMINAL') {
      this.errosDesafio++;
      if (this.errosDesafio === 3) this.cena.imprimirNoTerminal(`[DICA DA BOIA] "${DICAS_BOIA[0]}"`);
    }
    void this.processarFila();
  }

  private async processarFila(): Promise<void> {
    if (this.animando) return;
    this.animando = true;
    const g = this.guindasteDesafio;
    while (this.filaEventos.length > 0) {
      const ev = this.filaEventos.shift() as EventoPilha;
      const pilha = this.pilhas[ev.pilha];
      const r = this.filaEventos.length > 2 ? 0.55 : 0.8;
      if (ev.tipo === 'pop') {
        g.led(`PILHA${ev.pilha}.POP()`);
        await g.moverPara(pilha.x, 420 * r);
        await g.descerAte(pilha.topoY, 340 * r);
        const bloco = pilha.retirar();
        if (bloco) g.pegar(bloco);
        await g.subir(340 * r);
      } else {
        g.led(`PILHA${ev.pilha}.PUSH(C)`);
        await g.moverPara(pilha.x, 420 * r);
        await g.descerAte(pilha.topoY, 340 * r);
        const bloco = g.soltar();
        if (bloco) pilha.colocar(bloco);
        this.cena.cameras.main.shake(80, 0.002);
        await g.subir(340 * r);
      }
    }
    this.animando = false;
    if (this.modelo.concluido && !this.canhaoEntregue && g.segurando) await this.entregarCanhao();
  }

  private async entregarCanhao(): Promise<void> {
    const cena = this.cena;
    const g = this.guindasteDesafio;
    g.led('ENTREGANDO...', COR.virus);
    await g.moverPara(3110 + 70, 700);
    await g.descerAte(CHAO, 600);
    const bloco = g.soltar() as BlocoConteiner;
    await g.subir();
    cena.fecharTerminal();
    // O contêiner de emergência abre e revela o Canhão de Espuma
    bloco.img.setPosition(3180, CHAO - ALTURA_CONTEINER / 2);
    cena.efeitos.vapor(3180, CHAO - 60, 2);
    cena.som.tocar('explosao');
    cena.cameras.main.shake(200, 0.006);
    this.itemCanhao = cena.add.image(3180, CHAO - 100, 'pb-canhao-item').setScale(ESCALA).setDepth(PROF.itens);
    cena.tweens.add({ targets: this.itemCanhao, y: CHAO - 116, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    cena.efeitos.brilho(3180, CHAO - 100, 70, COR.espuma, 0.5);
    g.led('CONCLUIDO', COR.virus);
    cena.hud.aviso('PEGUE O CANHÃO DE ESPUMA!', COR.espuma);
  }

  private pegarCanhao(): void {
    const cena = this.cena;
    if (!this.itemCanhao) return;
    this.itemCanhao.destroy();
    this.itemCanhao = null;
    this.canhaoEntregue = true;
    cena.estado.desafios[0] = true;
    cena.estado.temCanhao = true;
    cena.estado.espuma = ESPUMA_MAXIMA;
    cena.hud.atualizar();
    cena.som.tocar('item');
    cena.hud.aviso('CANHÃO DE ESPUMA OBTIDO!', COR.espuma, 2500);
    cena.falar(FALAS.desafio1Fim, () => {
      for (const e of this.estivadores) {
        e.anims.stop();
        e.setFrame(4);
      }
      cena.falar(FALAS.estivadorLivre, () => this.abrirPortao(true));
    });
  }

  private abrirPortao(animar: boolean): void {
    this.portao.setFrame(1);
    this.paredePortao.destroy();
    if (animar) {
      this.cena.som.tocar('guindaste');
      this.cena.cameras.main.shake(250, 0.006);
      this.cena.hud.aviso('ATALHO ABERTO PELOS ESTIVADORES!', COR.telaBoia);
    }
  }

  /* ---------------- Atualização ---------------- */

  override atualizarPausado(): void {
    this.guindasteDesafio.atualizar();
    this.guindasteCiclo.atualizar();
    this.guindasteQueda.atualizar();
  }

  override atualizar(tempo: number): void {
    this.atualizarPausado();
    this.atualizarQueda(tempo);
    this.atualizarCiclo(tempo);
    if (this.itemCanhao && Phaser.Math.Distance.Between(this.cena.jogador.x, this.cena.jogador.y, this.itemCanhao.x, this.itemCanhao.y) < 80) {
      this.pegarCanhao();
    }
    // Fumaça leve, com rajadas
    if (tempo > this.proximaRajada) {
      this.proximaRajada = tempo + 13000;
      this.cena.hud.aviso('RAJADA DE FUMAÇA! AGACHE PARA ENXERGAR MELHOR', '#C8C2B4', 1800);
      this.cena.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 4500,
        onUpdate: (tw) => {
          this.cena.fumaca.rajada = Math.sin((tw.getValue() ?? 0) * Math.PI) * 0.42;
        },
      });
    }
  }

  /** Guindaste bugado: persegue o operador e solta contêineres (a sombra avisa 1 s antes). */
  private atualizarQueda(tempo: number): void {
    const g = this.guindasteQueda;
    const j = this.cena.jogador;
    const dentro = j.x > 820 && j.x < 1500;
    switch (this.estadoQueda) {
      case 'seguindo': {
        const alvo = Phaser.Math.Clamp(j.x, 900, 1420);
        g.carroX += Phaser.Math.Clamp(alvo - g.carroX, -3, 3);
        if (dentro && Math.abs(alvo - g.carroX) < 6 && tempo > this.quedaAte) {
          this.estadoQueda = 'aviso';
          this.quedaAte = tempo + 1000;
          const bloco = { img: this.cena.add.image(g.carroX, 0, `pb-cont-${Math.floor(Math.random() * 4)}`).setScale(ESCALA).setDepth(PROF.plataformas + 2), zona: this.cena.add.zone(0, 0, 1, 1), codigo: 'X' };
          g.pegar(bloco);
          g.led('SOLTAR()', '#FF3A2A');
        }
        break;
      }
      case 'aviso': {
        const k = 1 - (this.quedaAte - tempo) / 1000;
        this.sombraQueda.setPosition(g.carroX, CHAO - 2).setFillStyle(0x000000, 0.2 + k * 0.5).setScale(0.5 + k * 0.5, 1);
        if (tempo > this.quedaAte) {
          this.estadoQueda = 'caindo';
          const bloco = g.soltar();
          if (bloco) {
            bloco.zona.destroy();
            const x = bloco.img.x;
            this.cena.tweens.add({
              targets: bloco.img,
              y: CHAO - ALTURA_CONTEINER / 2,
              duration: 320,
              ease: 'Quad.easeIn',
              onComplete: () => {
                this.cena.cameras.main.shake(160, 0.008);
                this.cena.som.tocar('explosao');
                this.cena.efeitos.vapor(x - 40, CHAO - 10);
                this.cena.efeitos.vapor(x + 40, CHAO - 10);
                if (Math.abs(this.cena.jogador.x - x) < LARGURA_CONTEINER / 2 + 16 && this.cena.jogador.pes > CHAO - 90) {
                  this.cena.jogador.receberDano(3, x);
                }
                this.sombraQueda.setFillStyle(0x000000, 0);
                this.cena.tweens.add({ targets: bloco.img, alpha: 0, delay: 900, duration: 500, onComplete: () => bloco.img.destroy() });
                this.estadoQueda = 'espera';
                this.quedaAte = this.cena.time.now + 1600;
              },
            });
          }
        }
        break;
      }
      case 'espera':
        if (tempo > this.quedaAte) {
          this.estadoQueda = 'seguindo';
          this.quedaAte = tempo + 600;
          g.led('SOLTAR()', '#FF5A4A');
        }
        break;
      default:
        break;
    }
  }

  /**
   * Guindaste cíclico: move contêineres entre Q e P sem parar (P vira uma escada que cresce e diminui).
   * Sequência: Q->P, Q->P (P chega a 2 andares), pausa, P->Q, P->Q.
   */
  private atualizarCiclo(tempo: number): void {
    if (this.cicloOcupado || tempo < this.proximoCiclo) return;
    const ordem: Array<['pop' | 'push', 'P' | 'Q']> = [
      ['pop', 'Q'],
      ['push', 'P'],
      ['pop', 'Q'],
      ['push', 'P'],
      ['pop', 'P'],
      ['push', 'Q'],
      ['pop', 'P'],
      ['push', 'Q'],
    ];
    const [op, nome] = ordem[this.passoCiclo % ordem.length];
    const pilha = nome === 'P' ? this.pilhaP : this.pilhaQ;
    // Não mexe na pilha em que o operador está em pé
    if (pilha.jogadorNoTopo()) {
      this.guindasteCiclo.led('AGUARDANDO...', '#C8C2B4');
      this.proximoCiclo = tempo + 500;
      return;
    }
    this.cicloOcupado = true;
    const g = this.guindasteCiclo;
    const executar = async () => {
      g.led(`PILHA${nome}.${op === 'pop' ? 'POP()' : 'PUSH(C)'}`);
      await g.moverPara(pilha.x, 700);
      await g.descerAte(pilha.topoY, 500);
      if (op === 'pop') {
        const b = pilha.retirar();
        if (b) g.pegar(b);
      } else {
        const b = g.soltar();
        if (b) pilha.colocar(b);
      }
      await g.subir(500);
      this.passoCiclo++;
      // Pausa maior quando P está no ponto mais alto (hora de pular para o muro)
      this.proximoCiclo = this.cena.time.now + (this.pilhaP.altura === 2 && op === 'push' ? 3200 : 500);
      this.cicloOcupado = false;
    };
    void executar();
  }
}
