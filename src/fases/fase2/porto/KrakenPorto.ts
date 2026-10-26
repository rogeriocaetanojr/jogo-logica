import Phaser from 'phaser';
import type { CenaFase2 } from '../CenaFase2';
import { COR, ESCALA, folhaPixel, hash3, larguraTexto, texturaPixel } from './ArtePorto';
import { PROF } from './EfeitosPorto';
import { ALTURA_CONTEINER, LARGURA_CONTEINER } from './GuindastePorto';

/**
 * BOSS — KRAKEN.EXE: o PORTUS corrompido pelo MegaBrain, fundido com o óleo da baía e os cabos
 * do servidor. Polvo gigante de cabos e petróleo com um monitor rachado no lugar dos olhos.
 *
 * Etapa 1 (100% a 60%) — FILA: 4 tentáculos acendem numerados em ordem; o primeiro a acender é o
 *   primeiro a golpear. Depois do golpe, fica preso 2 s com um conector exposto: patch nele.
 * Etapa 2 (60% a 30%) — PILHA: contêineres empilhados como escudos; só o escudo do topo pisca e
 *   pode ser quebrado, do último ao primeiro, até o núcleo ficar exposto.
 * Etapa 3 (30% a 0%) — VETORES: chuva de óleo e maré alta; 8 tomadas numeradas de 0 a 7.
 *   A BOIA anuncia o índice e o jogador desliga a tomada certa.
 */

export interface TomadaArena {
  indice: number;
  x: number;
  y: number;
  img: Phaser.GameObjects.Image;
  rotulo: Phaser.GameObjects.Image;
  desligada: boolean;
}

interface Tentaculo {
  numero: number;
  baseX: number;
  alvoX: number;
  lado: number;
  estado: 'oculto' | 'aceso' | 'golpeando' | 'preso' | 'recolhendo';
  ordem: number;
  progresso: number;
  presoAte: number;
  grafico: Phaser.GameObjects.Graphics;
  rotulo: Phaser.GameObjects.Text;
  conector: Phaser.GameObjects.Image;
  acertos: number;
}

interface Escudo {
  img: Phaser.GameObjects.Image;
  vida: number;
}

export function gerarTexturasKraken(cena: Phaser.Scene): void {
  // Cabeça: massa de óleo e cabos com monitor rachado (quadro 0 normal, 1 dano, 2 glitch)
  folhaPixel(cena, 'pb-kraken-cabeca', 72, 58, 3, (p, q) => {
    const oleo = '#141012';
    const oleo2 = '#241A22';
    p.elipse(36, 34, 34, 24, oleo);
    p.elipse(36, 30, 30, 20, oleo2);
    for (let i = 0; i < 30; i++) {
      const x = 6 + Math.floor(hash3(i, 1, 4) * 60);
      const y = 14 + Math.floor(hash3(i, 2, 4) * 38);
      p.ponto(x, y, [COR.oleoRoxo, COR.oleoCiano, COR.oleoAmarelo][i % 3]);
    }
    // Cabos
    for (const [x0, cor] of [
      [14, '#3A3438'],
      [24, '#8A2A18'],
      [48, '#2B5C9A'],
      [58, '#3A3438'],
    ] as const) {
      p.linha(x0, 10, x0 + 4, 54, cor);
      p.linha(x0 + 1, 10, x0 + 5, 54, cor);
    }
    // Monitor rachado
    p.px(18, 10, 36, 24, '#2A2830');
    p.px(20, 12, 32, 20, q === 1 ? '#3A0A0A' : '#061A0E');
    const olho = q === 1 ? '#FF4A3A' : COR.virus;
    if (q === 2) {
      for (let y = 13; y < 31; y += 2) p.px(21 + (y % 6), y, 18 + (y % 9), 1, COR.virus);
    } else {
      p.px(25, 18, 7, 5, olho);
      p.px(40, 18, 7, 5, olho);
      p.px(27, 20, 3, 2, '#061A0E');
      p.px(42, 20, 3, 2, '#061A0E');
      p.px(28, 27, 16, 2, olho);
    }
    p.linha(31, 12, 37, 22, '#C8C2B4');
    p.linha(37, 22, 34, 31, '#C8C2B4');
    p.px(26, 34, 20, 3, '#2A2830');
    p.texto('PORTUS', 24, 35, '#5A5658');
  });
  // Núcleo exposto
  folhaPixel(cena, 'pb-kraken-nucleo', 18, 18, 2, (p, q) => {
    p.disco(9, 9, 8, '#0A1A10');
    p.disco(9, 9, 6, q === 0 ? COR.virus : '#B8FFCC');
    p.disco(9, 9, 3, '#FFFFFF');
    p.linha(1, 9, 17, 9, '#0A1A10');
  });
  if (!cena.anims.exists('pb-anim-kraken-nucleo')) {
    cena.anims.create({ key: 'pb-anim-kraken-nucleo', frames: [0, 1].map((f) => ({ key: 'pb-kraken-nucleo', frame: f })), frameRate: 8, repeat: -1 });
  }
  // Conector exposto na ponta do tentáculo
  texturaPixel(cena, 'pb-kraken-conector', 9, 9, (p) => {
    p.px(1, 1, 7, 7, '#3A3438');
    p.px(2, 2, 5, 5, COR.virus);
    p.px(3, 3, 1, 3, '#0A1A10');
    p.px(5, 3, 1, 3, '#0A1A10');
  });
  // Escudo (contêiner) e versão piscando
  texturaPixel(cena, 'pb-kraken-escudo', 32, 16, (p) => {
    p.px(0, 0, 32, 16, '#3A3438');
    for (let x = 2; x < 30; x += 2) p.px(x, 2, 1, 12, '#2A2628');
    p.px(0, 0, 32, 2, '#5A5658');
    p.px(0, 14, 32, 2, '#1A1414');
    p.textoCentro('{}', 16, 6, COR.virus);
  });
  // Tomada numerada
  folhaPixel(cena, 'pb-tomada', 12, 14, 2, (p, q) => {
    p.px(0, 0, 12, 14, '#1A1414');
    p.px(1, 1, 10, 12, q === 0 ? '#3A3438' : '#2A3A2A');
    p.px(3, 3, 2, 4, '#0E0A0A');
    p.px(7, 3, 2, 4, '#0E0A0A');
    p.px(4, 9, 4, 2, q === 0 ? COR.virus : '#3A5A3A');
    p.px(5, 13, 2, 1, '#8A847C');
  });
}

export class Kraken {
  public vida = 100;
  public etapa = 0;
  public ativo = false;
  public derrotado = false;
  public tomadaPedida = -1;

  private readonly cena: CenaFase2;
  private readonly cabeca: Phaser.GameObjects.Sprite;
  private readonly brilhoCabeca: Phaser.GameObjects.Image;
  private readonly nucleo: Phaser.GameObjects.Sprite;
  private readonly baseCabecaY: number;
  private readonly centroX: number;
  private readonly piso: number;
  private tentaculos: Tentaculo[] = [];
  private escudos: Escudo[] = [];
  private nucleoExpostoAte = 0;
  private acertosNucleo = 0;
  private proximoCiclo = 0;
  private filaGolpes: Tentaculo[] = [];
  private proximaGota = 0;
  private proximaVarrida = 0;
  private varrida: { x: number; dir: number; grafico: Phaser.GameObjects.Graphics } | null = null;
  private readonly tomadas: TomadaArena[];
  private anuncios = 0;
  private readonly aoMudarEtapa: (etapa: number) => void;
  private readonly aoDerrotar: () => void;
  private readonly aoAnunciar: (texto: string) => void;

  constructor(
    cena: CenaFase2,
    centroX: number,
    piso: number,
    tomadas: TomadaArena[],
    eventos: { aoMudarEtapa: (etapa: number) => void; aoDerrotar: () => void; aoAnunciar: (texto: string) => void }
  ) {
    this.cena = cena;
    this.centroX = centroX;
    this.piso = piso;
    this.tomadas = tomadas;
    this.aoMudarEtapa = eventos.aoMudarEtapa;
    this.aoDerrotar = eventos.aoDerrotar;
    this.aoAnunciar = eventos.aoAnunciar;
    gerarTexturasKraken(cena);
    this.baseCabecaY = piso - 250;
    this.cabeca = cena.add.sprite(centroX, piso + 260, 'pb-kraken-cabeca', 0).setScale(ESCALA).setDepth(PROF.estruturas - 5);
    this.brilhoCabeca = cena.efeitos.brilho(centroX, this.baseCabecaY, 200, COR.virus, 0.18, 1, PROF.estruturas - 4);
    this.brilhoCabeca.setVisible(false);
    this.nucleo = cena.add.sprite(centroX, this.baseCabecaY + 60, 'pb-kraken-nucleo', 0).setScale(ESCALA).setDepth(PROF.inimigos).setVisible(false);
  }

  emergir(): Promise<void> {
    this.cena.som.tocar('explosao');
    this.cena.cameras.main.shake(1200, 0.01);
    return new Promise((resolver) => {
      this.cena.tweens.add({
        targets: this.cabeca,
        y: this.baseCabecaY,
        duration: 1800,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.brilhoCabeca.setVisible(true);
          resolver();
        },
      });
    });
  }

  iniciar(): void {
    this.ativo = true;
    this.etapa = 1;
    this.cena.hud.mostrarChefe('KRAKEN.EXE', 100);
    this.criarTentaculos();
    this.proximoCiclo = this.cena.time.now + 1200;
  }

  /* ---------------- Etapa 1: FILA ---------------- */

  private criarTentaculos(): void {
    const posicoes = [
      { baseX: 120, alvoX: 330, lado: -1 },
      { baseX: 1160, alvoX: 950, lado: 1 },
      { baseX: 60, alvoX: 520, lado: -1 },
      { baseX: 1220, alvoX: 760, lado: 1 },
    ];
    this.tentaculos = posicoes.map((p, i) => {
      const grafico = this.cena.add.graphics().setDepth(PROF.inimigos + 1);
      const rotulo = this.cena.add
        .text(0, 0, String(i + 1), { fontFamily: 'Consolas, monospace', fontSize: '22px', color: '#0A1A10', fontStyle: 'bold', backgroundColor: '#5CFF8A', padding: { x: 6, y: 1 } })
        .setOrigin(0.5)
        .setDepth(PROF.emissivo)
        .setVisible(false);
      const conector = this.cena.add.image(0, 0, 'pb-kraken-conector').setScale(ESCALA).setDepth(PROF.emissivo).setVisible(false);
      return { numero: i + 1, ...p, estado: 'oculto', ordem: 0, progresso: 0, presoAte: 0, grafico, rotulo, conector, acertos: 0 } as Tentaculo;
    });
  }

  /** Inicia um ciclo: os 4 tentáculos acendem em uma ordem sorteada e golpeiam na mesma ordem. */
  private cicloFila(): void {
    const ordem = Phaser.Utils.Array.Shuffle([...this.tentaculos]);
    this.filaGolpes = [];
    ordem.forEach((t, i) => {
      this.cena.time.delayedCall(i * 650, () => {
        if (this.etapa !== 1) return;
        t.estado = 'aceso';
        t.ordem = i + 1;
        t.progresso = 0;
        t.acertos = 0;
        t.rotulo.setText(`${t.numero}`).setVisible(true);
        this.filaGolpes.push(t);
        this.cena.som.tocar('sirene');
      });
    });
    // Golpes: o primeiro a acender é o primeiro a golpear
    this.cena.time.delayedCall(4 * 650 + 700, () => this.proximoGolpe());
  }

  private proximoGolpe(): void {
    if (this.etapa !== 1) return;
    const t = this.filaGolpes.shift();
    if (!t) {
      this.proximoCiclo = this.cena.time.now + 1500;
      return;
    }
    t.estado = 'golpeando';
    this.cena.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 420,
      ease: 'Quad.easeIn',
      onUpdate: (tw) => (t.progresso = tw.getValue() ?? 0),
      onComplete: () => {
        this.cena.cameras.main.shake(180, 0.01);
        this.cena.som.tocar('explosao');
        const j = this.cena.jogador;
        if (!j.morto && Math.abs(j.x - t.alvoX) < 110 && j.pes > this.piso - 40) j.receberDano(3, t.alvoX, 400);
        t.estado = 'preso';
        t.presoAte = this.cena.time.now + 2000;
        t.conector.setVisible(true);
        this.cena.time.delayedCall(800, () => this.proximoGolpe());
      },
    });
  }

  /* ---------------- Etapa 2: PILHA ---------------- */

  private empilharEscudos(): void {
    this.nucleo.setVisible(false);
    const x = this.centroX;
    for (const e of this.escudos) e.img.destroy();
    this.escudos = [];
    for (let i = 0; i < 4; i++) {
      this.cena.time.delayedCall(i * 380, () => {
        if (this.etapa !== 2) return;
        const y = this.piso - ALTURA_CONTEINER / 2 - i * ALTURA_CONTEINER - 24;
        const img = this.cena.add.image(x, y - 300, 'pb-kraken-escudo').setScale(ESCALA).setDepth(PROF.inimigos + 2);
        this.cena.tweens.add({ targets: img, y, duration: 300, ease: 'Bounce.easeOut' });
        this.escudos.push({ img, vida: 3 });
        this.cena.som.tocar('guindaste');
        this.aoAnunciar(`push(escudo${i + 1})`);
      });
    }
  }

  /* ---------------- Etapa 3: VETORES ---------------- */

  private anunciarTomada(): void {
    let livres = this.tomadas.filter((t) => !t.desligada);
    if (livres.length === 0) {
      for (const t of this.tomadas) {
        t.desligada = false;
        t.img.setFrame(0);
      }
      livres = [...this.tomadas];
    }
    const alvo = livres[Math.floor(Math.random() * livres.length)];
    this.tomadaPedida = alvo.indice;
    this.anuncios++;
    // Alterna entre o índice direto e a posição ordinal (que precisa ser traduzida para índice)
    const texto = this.anuncios % 2 === 1 ? `tomadas[${alvo.indice}]` : `a ${alvo.indice + 1}ª tomada`;
    this.aoAnunciar(texto);
  }

  /** O jogador desligou uma tomada (E). Retorna true se era a certa. */
  desligarTomada(indice: number): boolean {
    if (this.etapa !== 3 || this.derrotado) return false;
    const t = this.tomadas[indice];
    if (t.desligada) return false;
    if (indice === this.tomadaPedida) {
      t.desligada = true;
      t.img.setFrame(1);
      this.cena.efeitos.faisca(t.x, t.y);
      this.cena.efeitos.explosao(this.centroX, this.baseCabecaY, 1.2);
      this.cena.som.tocar('acerto');
      this.sofrer(10);
      this.cabeca.setFrame(1);
      this.cena.time.delayedCall(400, () => this.cabeca.setFrame(0));
      if (!this.derrotado) this.cena.time.delayedCall(900, () => this.anunciarTomada());
      return true;
    }
    this.cena.som.tocar('glitch');
    this.cena.efeitos.faisca(t.x, t.y);
    this.cena.jogador.receberDano(2, t.x);
    this.vida = Math.min(30, this.vida + 3);
    this.cena.hud.atualizarChefe(this.vida);
    this.cena.efeitos.textoFlutuante(t.x, t.y - 60, `ESSA É A tomadas[${indice}]! PEDIDO: ÍNDICE ${this.tomadaPedida}`, '#FF4A3A', 13);
    return false;
  }

  /* ---------------- Comum ---------------- */

  private sofrer(dano: number): void {
    if (this.derrotado) return;
    const limite = this.etapa === 1 ? 60 : this.etapa === 2 ? 30 : 0;
    this.vida = Math.max(limite, this.vida - dano);
    this.cena.hud.atualizarChefe(this.vida);
    this.cabeca.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.cena.time.delayedCall(80, () => this.cabeca.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    if (this.vida <= limite) this.avancarEtapa();
  }

  private avancarEtapa(): void {
    if (this.etapa === 3) {
      this.derrotar();
      return;
    }
    this.etapa++;
    for (const t of this.tentaculos) {
      t.estado = 'recolhendo';
      t.rotulo.setVisible(false);
      t.conector.setVisible(false);
    }
    this.filaGolpes = [];
    this.cabeca.setFrame(2);
    this.cena.cameras.main.shake(600, 0.012);
    this.cena.som.tocar('glitch');
    this.aoMudarEtapa(this.etapa);
    this.cena.time.delayedCall(700, () => {
      this.cabeca.setFrame(0);
      for (const t of this.tentaculos) {
        t.estado = 'oculto';
        t.grafico.clear();
      }
    });
  }

  /** Chamado pela área depois do diálogo de cada etapa. */
  comecarEtapa(): void {
    if (this.etapa === 2) this.empilharEscudos();
    if (this.etapa === 3) {
      for (const e of this.escudos) e.img.destroy();
      this.escudos = [];
      this.nucleo.setVisible(false);
      this.cena.time.delayedCall(600, () => this.anunciarTomada());
    }
  }

  levarPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    if (!this.ativo || this.derrotado) return false;
    if (this.etapa === 1) {
      for (const t of this.tentaculos) {
        if (t.estado !== 'preso' && t.estado !== 'golpeando') continue;
        const ponta = this.pontaTentaculo(t);
        if (Phaser.Math.Distance.Between(tiro.x, tiro.y, ponta.x, ponta.y - 30) < 60) {
          if (t.estado === 'preso' && t.acertos < 3) {
            t.acertos++;
            this.cena.efeitos.faisca(tiro.x, tiro.y);
            this.cena.som.tocar('inimigo');
            this.sofrer(4);
          } else {
            this.cena.efeitos.faisca(tiro.x, tiro.y);
            this.cena.som.tocar('tink');
          }
          return true;
        }
      }
      return false;
    }
    if (this.etapa === 2) {
      // Núcleo exposto
      if (this.nucleo.visible && Phaser.Math.Distance.Between(tiro.x, tiro.y, this.nucleo.x, this.nucleo.y) < 50) {
        this.cena.efeitos.faisca(tiro.x, tiro.y);
        // Até 5 acertos por janela: é preciso derrubar a pilha de escudos mais de uma vez
        if (this.acertosNucleo < 5) {
          this.acertosNucleo++;
          this.cena.som.tocar('inimigo');
          this.sofrer(3);
        } else {
          this.cena.som.tocar('tink');
        }
        return true;
      }
      for (let i = this.escudos.length - 1; i >= 0; i--) {
        const e = this.escudos[i];
        const b = e.img.getBounds();
        if (!b.contains(tiro.x, tiro.y)) continue;
        const topo = i === this.escudos.length - 1;
        if (topo) {
          e.vida--;
          this.cena.efeitos.faisca(tiro.x, tiro.y);
          this.cena.som.tocar('tink');
          if (e.vida <= 0) {
            this.cena.efeitos.explosao(e.img.x, e.img.y, 1);
            e.img.destroy();
            this.escudos.pop();
            this.aoAnunciar(`pop() -> escudo${i + 1} caiu`);
            if (this.escudos.length === 0) {
              this.nucleo.setVisible(true).setPosition(this.centroX, this.piso - 90);
              this.nucleo.play({ key: 'pb-anim-kraken-nucleo', repeat: -1 });
              this.nucleoExpostoAte = this.cena.time.now + 4500;
              this.acertosNucleo = 0;
              this.cena.efeitos.textoFlutuante(this.centroX, this.piso - 180, 'NÚCLEO EXPOSTO! PATCH!', COR.virus, 15);
            }
          }
        } else {
          this.cena.efeitos.faisca(tiro.x, tiro.y);
          this.cena.som.tocar('tink');
          this.cena.efeitos.textoFlutuante(e.img.x, e.img.y - 40, 'SÓ O TOPO!', '#FF4A3A', 14);
        }
        return true;
      }
    }
    return false;
  }

  private pontaTentaculo(t: Tentaculo): { x: number; y: number } {
    const k = t.estado === 'preso' ? 1 : t.estado === 'golpeando' ? t.progresso : t.estado === 'aceso' ? 0 : -0.3;
    const altoY = this.piso - 360;
    const x = Phaser.Math.Linear(t.baseX, t.alvoX, Math.max(0, k));
    const y = Phaser.Math.Linear(altoY, this.piso - 6, Math.max(0, k));
    return { x, y };
  }

  private desenharTentaculo(t: Tentaculo, tempo: number): void {
    const g = t.grafico;
    g.clear();
    if (t.estado === 'oculto') return;
    const nivelAgua = this.cena.agua?.nivel ?? this.piso + 60;
    const ponta = this.pontaTentaculo(t);
    const base = { x: t.baseX, y: nivelAgua + 40 };
    const segmentos = 16;
    for (let i = 0; i <= segmentos; i++) {
      const k = i / segmentos;
      const onda = Math.sin(tempo / 180 + i * 0.7 + t.numero) * (1 - k) * 24 * (t.estado === 'aceso' ? 1 : 0.4);
      const x = Phaser.Math.Linear(base.x, ponta.x, k) + onda;
      const curva = Math.sin(k * Math.PI) * -90;
      const y = Phaser.Math.Linear(base.y, ponta.y, k) + curva * (t.estado === 'preso' ? 0.3 : 1);
      const r = Phaser.Math.Linear(30, 12, k);
      g.fillStyle(0x141012, 1);
      g.fillCircle(Math.round(x / 4) * 4, Math.round(y / 4) * 4, r);
      g.fillStyle(i % 3 === 0 ? 0x2b5c9a : i % 3 === 1 ? 0x8a2a18 : 0x3a3438, 1);
      g.fillRect(Math.round(x / 4) * 4 - 4, Math.round(y / 4) * 4 - 4, 8, 8);
      if (i % 4 === 0) {
        g.fillStyle([0x6b3fa0, 0x2fa4a8, 0xc9b03a][i % 3], 1);
        g.fillRect(Math.round(x / 4) * 4 + 8, Math.round(y / 4) * 4 - 8, 4, 4);
      }
    }
    if (t.estado === 'aceso' || t.estado === 'golpeando') {
      g.fillStyle(0x5cff8a, 0.25 + 0.2 * Math.sin(tempo / 80));
      g.fillCircle(ponta.x, ponta.y - 10, 40);
    }
    t.rotulo.setPosition(ponta.x, ponta.y - 70);
    t.conector.setPosition(ponta.x, ponta.y - 30);
  }

  atualizar(tempo: number, delta: number): void {
    if (this.derrotado) return;
    // Cabeça respira acima da água
    this.cabeca.y = this.baseCabecaY + Math.sin(tempo / 700) * 10;
    this.brilhoCabeca.setPosition(this.cabeca.x, this.cabeca.y);
    if (!this.ativo) return;

    if (this.etapa === 1) {
      if (tempo > this.proximoCiclo && this.filaGolpes.length === 0 && this.tentaculos.every((t) => t.estado === 'oculto' || t.estado === 'recolhendo')) {
        this.proximoCiclo = Number.MAX_SAFE_INTEGER;
        this.cicloFila();
      }
      for (const t of this.tentaculos) {
        if (t.estado === 'preso' && tempo > t.presoAte) {
          t.estado = 'recolhendo';
          t.conector.setVisible(false);
          t.rotulo.setVisible(false);
          this.cena.time.delayedCall(600, () => {
            if (t.estado === 'recolhendo') t.estado = 'oculto';
            if (this.tentaculos.every((x) => x.estado === 'oculto') && this.filaGolpes.length === 0) {
              this.proximoCiclo = this.cena.time.now + 1200;
            }
          });
        }
      }
    }
    for (const t of this.tentaculos) this.desenharTentaculo(t, tempo);

    if (this.etapa === 2) {
      // Escudos piscando: só o do topo
      this.escudos.forEach((e, i) => {
        const topo = i === this.escudos.length - 1;
        e.img.setTint(topo && Math.floor(tempo / 160) % 2 === 0 ? 0x9cffb8 : 0xffffff);
      });
      if (this.nucleo.visible && tempo > this.nucleoExpostoAte) {
        this.nucleo.setVisible(false);
        this.empilharEscudos();
      }
      // Tentáculo varre o chão de tempos em tempos (pule!)
      if (!this.varrida && tempo > this.proximaVarrida && this.escudos.length > 0) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.varrida = { x: dir > 0 ? -60 : 1340, dir, grafico: this.cena.add.graphics().setDepth(PROF.inimigos + 1) };
        this.cena.som.tocar('sirene');
      }
      if (this.varrida) {
        const v = this.varrida;
        v.x += v.dir * 520 * (delta / 1000);
        v.grafico.clear();
        v.grafico.fillStyle(0x141012, 1);
        v.grafico.fillRoundedRect(v.x - 90, this.piso - 34, 180, 30, 14);
        v.grafico.fillStyle(0x5cff8a, 1);
        v.grafico.fillRect(v.x + v.dir * 70, this.piso - 26, 8, 8);
        const j = this.cena.jogador;
        if (!j.morto && Math.abs(j.x - v.x) < 90 && j.pes > this.piso - 34) j.receberDano(2, v.x - v.dir * 50, 320);
        if (v.x < -120 || v.x > 1400) {
          v.grafico.destroy();
          this.varrida = null;
          this.proximaVarrida = tempo + 3800;
        }
      }
    }

    if (this.etapa === 3 && tempo > this.proximaGota) {
      // Chuva de óleo (com sombra) e fogo na plataforma
      this.proximaGota = tempo + 420;
      const j = this.cena.jogador;
      const x = Phaser.Math.Clamp(j.x + (Math.random() - 0.5) * 500, 40, 1240);
      this.cena.armas.dispararInimigo(x, -20, 0, 300, 'pb-gota-oleo', {
        gravidade: 700,
        dano: 2,
        tamanho: [4, 6],
        vida: 4000,
        aoMorrer: (gx, gy) => {
          if (Math.random() < 0.3 && gy > this.piso - 40) this.cena.efeitos.vapor(gx, gy);
        },
      });
    }
  }

  private derrotar(): void {
    this.derrotado = true;
    this.ativo = false;
    this.tomadaPedida = -1;
    this.cena.hud.esconderChefe();
    for (const t of this.tentaculos) {
      t.grafico.destroy();
      t.rotulo.destroy();
      t.conector.destroy();
    }
    this.varrida?.grafico.destroy();
    for (let i = 0; i < 10; i++) {
      this.cena.time.delayedCall(i * 160, () =>
        this.cena.efeitos.explosao(this.centroX + (Math.random() - 0.5) * 260, this.baseCabecaY + (Math.random() - 0.5) * 160, 1.6)
      );
    }
    this.cena.som.tocar('explosao');
    this.cena.cameras.main.shake(1500, 0.014);
    this.cabeca.setFrame(2);
    this.cena.tweens.add({ targets: [this.cabeca, this.brilhoCabeca], y: this.piso + 400, alpha: 0, delay: 1200, duration: 2200, ease: 'Sine.easeIn' });
    this.cena.time.delayedCall(3200, () => this.aoDerrotar());
  }
}

/** Rótulo com o índice da tomada (0 a 7). */
export function texturaRotuloIndice(cena: Phaser.Scene, indice: number): string {
  const chave = `pb-tomada-rotulo-${indice}`;
  const txt = `[${indice}]`;
  texturaPixel(cena, chave, larguraTexto(txt) + 4, 8, (p) => {
    p.px(0, 0, larguraTexto(txt) + 4, 8, '#0A1A10');
    p.texto(txt, 2, 1, COR.virus);
  });
  return chave;
}

export const LARGURA_ESCUDO = LARGURA_CONTEINER;
