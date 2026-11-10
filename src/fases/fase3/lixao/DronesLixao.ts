import Phaser from 'phaser';
import { LAYOUTS } from '../trechos/LayoutLixao';
import type { CenaFase3 } from '../CenaFase3';
import { PROF } from '../trechos/TrechoLixao';
import { COR, ESCALA, folhaPixel, grade, hexNum, texturaPixel } from './ArteLixao';
import { ALTURA_TELA, CHAO_Y, TIPOS_RECICLAVEIS, TRECHOS } from './TiposLixao';
import type { Clima } from './TiposLixao';

/** Eventos da cena para o som: tiro de sucata e drone derrubado. */
export const EVENTO_TIRO_DRONE = 'lixao-tiro-drone';
export const EVENTO_DRONE_DERRUBADO = 'lixao-drone-derrubado';

/** Dados dos eventos de drone. */
export interface DadosDrone {
  x: number;
  y: number;
}

/**
 * Drones por trecho, em x relativo ao trecho (ver os comentários [DRONE] em trechos/TrechoN).
 * Um só e lento no sol, poucos na névoa e mais na chuva. A arena não tem: o chefão ocupa o
 * espaço, mas a variante da noite já existe se um entrar ali.
 */
export const DRONES_POR_TRECHO: readonly (readonly (readonly [number, number])[])[] = [...LAYOUTS.map((l) => l.drones), []];

/** Comportamento de cada clima. */
interface Variante {
  /** Velocidade da patrulha (px/s). */
  velocidade: number;
  /** Distância horizontal em que o drone vê o jogador. */
  visao: number;
  /** Depois de ver, chega até esta distância antes de atirar; null atira de onde está. */
  aproxima: number | null;
  /** Deixa faíscas no chão enquanto patrulha. */
  faiscas: boolean;
  /** Tempo parado entre um tiro e o próximo aviso. */
  recargaMs: number;
}

/**
 * Variantes por clima. No sol o drone é normal (e lento). Na poeira vê pouco, mas chega mais
 * perto. Na chuva deixa faíscas no chão. À noite só o LED aparece: o corpo fica abaixo do
 * véu de escuridão e o LED acima dele (ver PROF).
 */
export const VARIANTES: Record<Clima, Variante> = {
  sol: { velocidade: 45, visao: 420, aproxima: null, faiscas: false, recargaMs: 2400 },
  nevoa: { velocidade: 70, visao: 240, aproxima: 150, faiscas: false, recargaMs: 1800 },
  chuva: { velocidade: 70, visao: 380, aproxima: null, faiscas: true, recargaMs: 1800 },
  noite: { velocidade: 60, visao: 360, aproxima: null, faiscas: false, recargaMs: 2000 },
};

export const DRONE = {
  /** Distância vertical máxima para ver o jogador. */
  VISAO_VERTICAL: 360,
  /** Meia distância da patrulha em volta do ponto marcado. */
  PATRULHA: 160,
  /** LED piscando antes do tiro. */
  AVISO_MS: 700,
  PISCA_AVISO_MS: 80,
  /** Tiro alto (se esquiva abaixando): rápido e quase reto, passa acima do jogador abaixado. */
  TIRO_ALTO_VELOCIDADE: 600,
  /** Alturas do tiro acima dos pés do jogador. */
  TIRO_ALTO_ACIMA: 92,
  /** Tiro baixo (se esquiva pulando): arco lento que chega aos pés. */
  TIRO_BAIXO_VELOCIDADE: 320,
  TIRO_BAIXO_ACIMA: 12,
  GRAVIDADE_TIRO: 900,
  /** Meia largura da sucata para acertar o jogador. */
  RAIO_TIRO: 8,
  /** Gravidade da queda do drone derrubado (px/s²). */
  GRAVIDADE_QUEDA: 1400,
  FAISCA_QUEDA_MS: 50,
  /** Chuva: intervalo entre faíscas soltas e quanto tempo cada uma fica no chão. */
  FAISCA_INTERVALO_MS: 1600,
  FAISCA_CHAO_MS: 3000,
  /** Nos últimos ms a faísca do chão pisca avisando que vai sumir. */
  FAISCA_PISCA_FIM_MS: 800,
} as const;

/** Tamanho do drone em pixels de arte. */
const DRONE_W = 16;
const DRONE_H = 10;

type Estado = 'patrulha' | 'aproximando' | 'aviso' | 'recarga' | 'caindo' | 'derrubado';

interface Drone {
  readonly origemX: number;
  /** Altura de voo (y de mundo): drones guardam plataformas no alto das torres. */
  readonly origemY: number;
  readonly variante: Variante;
  corpo: Phaser.GameObjects.Sprite;
  led: Phaser.GameObjects.Image;
  estado: Estado;
  x: number;
  y: number;
  direcao: number;
  tempo: number;
  vy: number;
  /** Alterna tiro alto e baixo. */
  tiroAlto: boolean;
  esperaFaisca: number;
  esperaFaiscaQueda: number;
}

interface Tiro {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface FaiscaChao {
  img: Phaser.GameObjects.Sprite;
  restante: number;
}

/**
 * Drones do lixão. Patrulham na horizontal em voo baixo; ao ver o jogador, param, piscam o
 * LED e atiram sucata em arco, alternando um tiro alto (abaixar) e um baixo (pular). A sucata
 * tira 1 bateria. Um reciclável certeiro derruba o drone (ver ArremessoLixao): ele cai
 * soltando faíscas e larga um reciclável no chão. Ao morrer, todos voltam.
 *
 * Tudo avança à mão em `atualizar`: `pausar` congela drones, tiros e faíscas.
 */
export class DronesLixao {
  private readonly cena: CenaFase3;
  private readonly aoAtingir: (origemX: number) => void;
  private readonly drones: Drone[] = [];
  private readonly tiros: Tiro[] = [];
  private readonly faiscas: FaiscaChao[] = [];
  private pausado = false;

  constructor(cena: CenaFase3, aoAtingir: (origemX: number) => void) {
    this.cena = cena;
    this.aoAtingir = aoAtingir;
  }

  /** Cria texturas e drones (chamar depois de montar os trechos). */
  construir(): void {
    this.gerarTexturas();
    this.cena.trechos.forEach((trecho, i) => {
      const variante = VARIANTES[TRECHOS[i].clima];
      for (const [xLocal, alturaVoo] of DRONES_POR_TRECHO[i] ?? []) {
        const corpo = this.cena.add.sprite(0, 0, 'lx-drone', 0).setScale(ESCALA).setDepth(PROF.objetos + 2);
        this.cena.cenario.registrarTingivel(corpo);
        // LED acima do véu: na névoa e à noite é o que se vê do drone
        const led = this.cena.add.image(0, 0, 'lx-drone-led').setScale(ESCALA).setDepth(PROF.escuro + 1);
        const drone: Drone = {
          origemX: grade(trecho.offset + xLocal),
          origemY: grade(CHAO_Y - alturaVoo),
          variante,
          corpo,
          led,
          estado: 'patrulha',
          x: 0,
          y: 0,
          direcao: 1,
          tempo: 0,
          vy: 0,
          tiroAlto: true,
          esperaFaisca: 0,
          esperaFaiscaQueda: 0,
        };
        this.reposicionar(drone);
        this.drones.push(drone);
      }
    });
  }

  /** Congela drones, tiros e faíscas (terminal aberto). */
  pausar(): void {
    this.pausado = true;
    for (const d of this.drones) d.corpo.anims?.pause();
  }

  retomar(): void {
    this.pausado = false;
    for (const d of this.drones) d.corpo.anims?.resume();
  }

  /** Ao morrer: todos os drones voltam inteiros ao ponto deles; tiros e faíscas somem. */
  reiniciar(): void {
    for (const d of this.drones) this.reposicionar(d);
    for (const t of this.tiros) t.img.destroy();
    this.tiros.length = 0;
    for (const f of this.faiscas) f.img.destroy();
    this.faiscas.length = 0;
  }

  /**
   * Reciclável em voo em (x, y): se acertar um drone no ar, derruba e devolve true (o item
   * faz o próprio impacto).
   */
  atingir(x: number, y: number): boolean {
    const meioW = (DRONE_W * ESCALA) / 2 + ESCALA;
    const meioH = (DRONE_H * ESCALA) / 2 + ESCALA;
    const alvo = this.drones.find((d) => this.voando(d) && Math.abs(x - d.x) <= meioW && Math.abs(y - d.y) <= meioH);
    if (!alvo) return false;
    this.derrubar(alvo);
    return true;
  }

  atualizar(delta: number): void {
    if (this.pausado) return;
    for (const d of this.drones) this.atualizarDrone(d, delta);
    for (let i = this.tiros.length - 1; i >= 0; i--) {
      if (this.avancarTiro(this.tiros[i], delta)) this.tiros.splice(i, 1);
    }
    this.atualizarFaiscas(delta);
  }

  /* =========================================================================
   * DRONE
   * ========================================================================= */

  private voando(d: Drone): boolean {
    return d.estado !== 'caindo' && d.estado !== 'derrubado';
  }

  private reposicionar(d: Drone): void {
    d.estado = 'patrulha';
    d.x = d.origemX;
    d.y = d.origemY;
    d.direcao = 1;
    d.tempo = 0;
    d.vy = 0;
    d.tiroAlto = true;
    d.esperaFaisca = DRONE.FAISCA_INTERVALO_MS;
    d.corpo.setVisible(true).setAngle(0).setAlpha(1).play('lx-drone-voo', true);
    d.led.setVisible(true);
    this.desenhar(d);
  }

  private atualizarDrone(d: Drone, delta: number): void {
    d.tempo += delta;
    const s = delta / 1000;
    const jogador = this.cena.jogador;
    const dx = jogador.x - d.x;
    // Só vê quem está mais ou menos na mesma altura (torres)
    const ve = Math.abs(dx) <= d.variante.visao && Math.abs(jogador.y - 48 - d.y) <= DRONE.VISAO_VERTICAL;

    switch (d.estado) {
      case 'patrulha': {
        d.x += d.direcao * d.variante.velocidade * s;
        if (Math.abs(d.x - d.origemX) >= DRONE.PATRULHA) {
          d.x = d.origemX + Math.sign(d.x - d.origemX) * DRONE.PATRULHA;
          d.direcao *= -1;
        } else if (this.bateNaFrente(d)) {
          // Muralha de cano ou portão no caminho: dá meia-volta
          d.direcao *= -1;
        }
        if (d.variante.faiscas) this.soltarFaiscas(d, delta);
        if (ve) this.mudar(d, d.variante.aproxima !== null && Math.abs(dx) > d.variante.aproxima ? 'aproximando' : 'aviso');
        break;
      }
      case 'aproximando': {
        // Poeira: vê pouco, então chega mais perto antes de atirar
        d.direcao = Math.sign(dx) || d.direcao;
        if (!this.bateNaFrente(d)) d.x += d.direcao * d.variante.velocidade * 1.6 * s;
        if (!ve) this.mudar(d, 'patrulha');
        else if (Math.abs(dx) <= (d.variante.aproxima ?? 0)) this.mudar(d, 'aviso');
        break;
      }
      case 'aviso':
        d.led.setVisible(Math.floor(d.tempo / DRONE.PISCA_AVISO_MS) % 2 === 0);
        if (d.tempo >= DRONE.AVISO_MS) {
          d.led.setVisible(true);
          this.atirar(d);
          this.mudar(d, 'recarga');
        }
        break;
      case 'recarga':
        if (d.tempo >= d.variante.recargaMs) this.mudar(d, ve ? 'aviso' : 'patrulha');
        break;
      case 'caindo':
        this.cair(d, delta);
        return;
      case 'derrubado':
        return;
    }
    this.desenhar(d);
  }

  /** Há sólido logo à frente do drone, na altura do voo. */
  private bateNaFrente(d: Drone): boolean {
    return this.cena.solidoEm(d.x + d.direcao * ((DRONE_W * ESCALA) / 2 + ESCALA), d.y);
  }

  private mudar(d: Drone, estado: Estado): void {
    d.estado = estado;
    d.tempo = 0;
  }

  /** Corpo e LED na grade, com uma oscilação de um pixel de arte enquanto voa. */
  private desenhar(d: Drone): void {
    const oscilacao = this.voando(d) ? Math.round(Math.sin(this.cena.time.now / 220)) * ESCALA : 0;
    const x = grade(d.x);
    const y = grade(d.y) + oscilacao;
    d.corpo.setPosition(x, y).setFlipX(d.direcao < 0);
    // LED no visor, um pouco abaixo do centro do corpo
    d.led.setPosition(x, y + ESCALA);
  }

  /* =========================================================================
   * TIRO
   * ========================================================================= */

  /**
   * Sucata em arco até o jogador: o tiro alto passa quase reto na altura da cabeça e o baixo
   * cai nos pés. O tempo de voo sai da distância, então o arco sempre chega no x do jogador.
   */
  private atirar(d: Drone): void {
    const jogador = this.cena.jogador;
    const x0 = d.x;
    const y0 = d.y + (DRONE_H * ESCALA) / 2;
    const dx = jogador.x - x0;
    const alto = d.tiroAlto;
    d.tiroAlto = !alto;
    const velocidade = alto ? DRONE.TIRO_ALTO_VELOCIDADE : DRONE.TIRO_BAIXO_VELOCIDADE;
    const alvoY = jogador.y - (alto ? DRONE.TIRO_ALTO_ACIMA : DRONE.TIRO_BAIXO_ACIMA);
    const t = Phaser.Math.Clamp(Math.abs(dx) / velocidade, 0.35, 1.4);
    const g = DRONE.GRAVIDADE_TIRO;
    const vx = dx / t;
    const vy = (alvoY - y0 - (g * t * t) / 2) / t;
    d.direcao = Math.sign(dx) || d.direcao;
    const img = this.cena.add.image(x0, y0, 'lx-drone-sucata').setScale(ESCALA).setDepth(PROF.escuro + 1);
    this.tiros.push({ img, x: x0, y: y0, vx, vy });
    const dados: DadosDrone = { x: x0, y: y0 };
    this.cena.events.emit(EVENTO_TIRO_DRONE, dados);
  }

  /** Avança um tiro; devolve true quando ele acerta, bate num sólido ou sai da tela. */
  private avancarTiro(t: Tiro, delta: number): boolean {
    const s = delta / 1000;
    t.vy += DRONE.GRAVIDADE_TIRO * s;
    t.x += t.vx * s;
    t.y += t.vy * s;
    t.img.setPosition(grade(t.x), grade(t.y)).setAngle(t.img.angle + delta * 0.6);

    const corpo = this.cena.jogador.corpo;
    const r = DRONE.RAIO_TIRO;
    if (t.x + r > corpo.left && t.x - r < corpo.right && t.y + r > corpo.top && t.y - r < corpo.bottom) {
      this.aoAtingir(t.x);
      t.img.destroy();
      return true;
    }
    if (t.y > ALTURA_TELA + 40 || this.cena.solidoEm(t.x, t.y)) {
      if (t.y <= ALTURA_TELA) this.estilhacos(t.x, t.y, [COR.sucataClara, COR.sucata], 4, 32);
      t.img.destroy();
      return true;
    }
    return false;
  }

  /* =========================================================================
   * DERRUBADO
   * ========================================================================= */

  private derrubar(d: Drone): void {
    this.mudar(d, 'caindo');
    d.vy = -120;
    d.led.setVisible(false);
    d.corpo.anims.stop();
    d.corpo.setFrame(2);
    const dados: DadosDrone = { x: d.x, y: d.y };
    this.cena.events.emit(EVENTO_DRONE_DERRUBADO, dados);
  }

  /** Queda girando e soltando faíscas; ao tocar o chão, larga um reciclável. */
  private cair(d: Drone, delta: number): void {
    const s = delta / 1000;
    d.vy += DRONE.GRAVIDADE_QUEDA * s;
    d.y += d.vy * s;
    d.corpo.setPosition(grade(d.x), grade(d.y)).setAngle(d.corpo.angle + d.direcao * delta * 0.4);

    d.esperaFaiscaQueda -= delta;
    if (d.esperaFaiscaQueda <= 0) {
      d.esperaFaiscaQueda = DRONE.FAISCA_QUEDA_MS;
      this.estilhacos(d.x, d.y, [COR.bateriaAmarela, COR.luz], 2, 40);
    }

    const base = d.y + (DRONE_H * ESCALA) / 2;
    if (base > ALTURA_TELA + 40) {
      // Caiu num buraco: some sem largar nada
      this.mudar(d, 'derrubado');
      d.corpo.setVisible(false);
      return;
    }
    if (!this.cena.solidoEm(d.x, base)) return;

    this.mudar(d, 'derrubado');
    d.corpo.setVisible(false);
    this.estilhacos(d.x, base, [COR.bateriaAmarela, COR.cobreClaro, COR.sucataClara, COR.luz], 12, 72);
    this.cena.cameras.main.shake(120, 0.003);
    const tipo = TIPOS_RECICLAVEIS[Math.floor(Math.random() * TIPOS_RECICLAVEIS.length)];
    this.cena.quedas.largar(tipo, d.x);
  }

  /* =========================================================================
   * FAÍSCAS NO CHÃO (CHUVA)
   * ========================================================================= */

  private soltarFaiscas(d: Drone, delta: number): void {
    d.esperaFaisca -= delta;
    if (d.esperaFaisca > 0) return;
    d.esperaFaisca = DRONE.FAISCA_INTERVALO_MS;
    const y = this.chaoAbaixo(d.x, d.y);
    if (y === null) return;
    const img = this.cena.add
      .sprite(grade(d.x), y, 'lx-faisca', 0)
      .setOrigin(0.5, 1)
      .setScale(ESCALA)
      .setDepth(PROF.objetos + 1)
      .play('lx-faisca-chiado');
    this.cena.cenario.clima.registrarLuz(img, 'faisca');
    this.faiscas.push({ img, restante: DRONE.FAISCA_CHAO_MS });
  }

  private atualizarFaiscas(delta: number): void {
    const corpo = this.cena.jogador.corpo;
    for (let i = this.faiscas.length - 1; i >= 0; i--) {
      const f = this.faiscas[i];
      f.restante -= delta;
      if (f.restante <= 0) {
        f.img.destroy();
        this.faiscas.splice(i, 1);
        continue;
      }
      if (f.restante < DRONE.FAISCA_PISCA_FIM_MS) f.img.setVisible(Math.floor(f.restante / 100) % 2 === 0);
      const meio = (f.img.displayWidth / 2) * 0.8;
      if (f.img.x + meio > corpo.left && f.img.x - meio < corpo.right && f.img.y > corpo.top && f.img.y - f.img.displayHeight < corpo.bottom) {
        this.aoAtingir(f.img.x);
      }
    }
  }

  /** Topo do primeiro sólido abaixo de (x, y); null sobre um buraco. */
  private chaoAbaixo(x: number, y: number): number | null {
    for (let yy = grade(y); yy <= ALTURA_TELA; yy += ESCALA) {
      if (this.cena.solidoEm(x, yy)) return yy;
    }
    return null;
  }

  /* =========================================================================
   * APOIO
   * ========================================================================= */

  /** Pedaços de um pixel de arte espirrando para cima e caindo. */
  private estilhacos(x: number, y: number, cores: readonly string[], quantidade: number, alcance: number): void {
    for (let i = 0; i < quantidade; i++) {
      const caco = this.cena.add.rectangle(x, y, ESCALA, ESCALA, hexNum(cores[i % cores.length])).setDepth(PROF.escuro + 1);
      const angulo = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const d = alcance * (0.4 + Math.random() * 0.6);
      this.cena.tweens.add({
        targets: caco,
        x: grade(x + Math.cos(angulo) * d),
        y: grade(y + Math.sin(angulo) * d * 0.6 + alcance * 0.4),
        alpha: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => caco.destroy(),
      });
    }
  }

  private gerarTexturas(): void {
    // Quadros 0 e 1: hélices girando; quadro 2: derrubado (hélices tortas, visor apagado)
    folhaPixel(this.cena, 'lx-drone', DRONE_W, DRONE_H, 3, (p, q) => {
      // Hélices sobre dois braços
      if (q === 0) {
        p.px(0, 0, 6, 1, COR.sucataClara);
        p.px(10, 0, 6, 1, COR.sucataClara);
      } else if (q === 1) {
        p.px(2, 0, 2, 1, COR.sucataClara);
        p.px(12, 0, 2, 1, COR.sucataClara);
      } else {
        p.linha(1, 0, 4, 1, COR.sucataClara);
        p.px(11, 1, 4, 1, COR.sucataClara);
      }
      p.px(2, 1, 2, 2, COR.contorno);
      p.px(12, 1, 2, 2, COR.contorno);
      p.px(3, 3, 10, 1, COR.contorno);
      // Corpo de carcaça com visor escuro (o LED fica numa imagem separada)
      p.caixa(4, 3, 8, 5, COR.sucata);
      p.px(5, 4, 6, 1, COR.sucataClara);
      p.px(6, 5, 4, 2, COR.sombraSucata);
      // Garra de sucata embaixo
      p.px(5, 8, 1, 2, COR.contorno);
      p.px(10, 8, 1, 2, COR.contorno);
      p.px(7, 8, 2, 1, COR.cobreEscuro);
    });
    if (!this.cena.anims.exists('lx-drone-voo')) {
      this.cena.anims.create({
        key: 'lx-drone-voo',
        frames: this.cena.anims.generateFrameNumbers('lx-drone', { frames: [0, 1] }),
        frameRate: 16,
        repeat: -1,
      });
    }
    texturaPixel(this.cena, 'lx-drone-led', 2, 1, (p) => p.px(0, 0, 2, 1, COR.neonCiano));
    // Sucata do tiro: chapa torta com contorno de perigo
    texturaPixel(this.cena, 'lx-drone-sucata', 4, 4, (p) => {
      p.caixa(0, 0, 4, 4, COR.sucataClara, COR.perigo);
      p.ponto(1, 1, COR.sucata);
    });
    // Faísca no chão: dois quadros de chiado no vermelho de perigo
    folhaPixel(this.cena, 'lx-faisca', 8, 5, 2, (p, q) => {
      p.px(1, 4, 6, 1, COR.perigo);
      if (q === 0) {
        p.ponto(2, 2, COR.perigo);
        p.ponto(5, 1, COR.luz);
        p.ponto(6, 3, COR.perigo);
      } else {
        p.ponto(1, 3, COR.perigo);
        p.ponto(3, 1, COR.luz);
        p.ponto(5, 2, COR.perigo);
      }
    });
    if (!this.cena.anims.exists('lx-faisca-chiado')) {
      this.cena.anims.create({
        key: 'lx-faisca-chiado',
        frames: this.cena.anims.generateFrameNumbers('lx-faisca', { frames: [0, 1] }),
        frameRate: 12,
        repeat: -1,
      });
    }
  }
}
