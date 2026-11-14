import Phaser from 'phaser';
import type { CenaFase3 } from '../CenaFase3';
import { PROF } from '../trechos/TrechoLixao';
import { ALTURA_BARREIRA, ALTURA_ESPINHOS, CORREDOR } from '../trechos/LayoutLixao';
import type { Elemento } from '../trechos/LayoutLixao';
import { COR, ESCALA, aleatorio, desenharBarreira, folhaPixel, grade, hexNum, texturaPixel } from './ArteLixao';
import type { Pincel } from './ArteLixao';
import { CHAO_Y } from './TiposLixao';

/** Ritmos e forças dos mecanismos do ferro-velho. */
export const MECANISMO = {
  /** Prensa: ciclo total e fases (ms desde o início do ciclo). */
  PRENSA_CICLO: 2600,
  PRENSA_AVISO: 1300,
  PRENSA_DESCE: 1800,
  PRENSA_EMBAIXO: 1920,
  PRENSA_SOBE: 2300,
  /** Altura do curso da cabeça da prensa acima da superfície. */
  PRENSA_CURSO: 200,
  /** Frágil: tremor antes de cair e tempo até voltar. */
  FRAGIL_TREMOR_MS: 500,
  FRAGIL_VOLTA_MS: 3000,
  /** Choque: desligado, aviso piscando e ligado. */
  CHOQUE_CICLO: 3200,
  CHOQUE_AVISO: 1800,
  CHOQUE_LIGA: 2500,
  /** Ímã: desligado, aviso e ligado; alcance e força do puxão (px/s). */
  IMA_CICLO: 4800,
  IMA_AVISO: 2200,
  IMA_LIGA: 2800,
  IMA_ALCANCE_X: 300,
  IMA_ALCANCE_Y: 280,
  IMA_FORCA: 150,
  /** Distância para usar a alavanca e para ativar um checkpoint. */
  ALCANCE_ALAVANCA: 60,
  ALCANCE_CHECKPOINT: 50,
  /** Raio do botão-alvo para um reciclável acertar. */
  RAIO_BOTAO: 32,
  /** Elevador: espera antes de partir, velocidade máxima e mínima (px/s) e distância de aceleração e frenagem. */
  ELEVADOR_ESPERA_MS: 350,
  ELEVADOR_VELOCIDADE: 240,
  ELEVADOR_VELOCIDADE_MIN: 50,
  ELEVADOR_RAMPA: 120,
  /** Elevador em ciclo: pausa em cada ponta. */
  ELEVADOR_PAUSA_CICLO_MS: 1100,
  /** Distância do poço em que quem espera no patamar de cima chama o elevador. */
  ELEVADOR_CHAMADA: 500,
} as const;

interface Prensa {
  x: number;
  w: number;
  superficie: number;
  atraso: number;
  cabeca: Phaser.GameObjects.Image;
  haste: Phaser.GameObjects.Rectangle;
  aviso: Phaser.GameObjects.Rectangle;
  ultimaFase: number;
}

interface Esteira {
  x: number;
  w: number;
  topo: number;
  v: number;
  faixa: Phaser.GameObjects.TileSprite;
}

interface Fragil {
  corpo: Phaser.GameObjects.Rectangle;
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  estado: 'firme' | 'tremendo' | 'caida';
  tempo: number;
}

interface Guindaste {
  corpo: Phaser.GameObjects.Rectangle;
  img: Phaser.GameObjects.Image;
  cabo: Phaser.GameObjects.Rectangle;
  min: number;
  max: number;
  w: number;
  topo: number;
  v: number;
  x: number;
}

interface Choque {
  x: number;
  w: number;
  atraso: number;
  faisca: Phaser.GameObjects.Rectangle;
  descarga: Phaser.GameObjects.Rectangle;
  ultimaFase: number;
  /** Corredor eletrificado do exercício 3: sempre ligado e fatal, salvo quando desligado. */
  grupo?: string;
}

interface Ima {
  x: number;
  y: number;
  atraso: number;
  img: Phaser.GameObjects.Image;
  campo: Phaser.GameObjects.Rectangle[];
  ultimaFase: number;
}

interface Abrivel {
  /** Ponto que a câmera mostra ao abrir. */
  x: number;
  y: number;
  aberto: boolean;
  abrir(): void;
}

interface Alavanca {
  x: number;
  superficie: number;
  alvo: string;
  img: Phaser.GameObjects.Image;
  puxada: boolean;
}

interface Botao {
  x: number;
  y: number;
  alvo: string;
  img: Phaser.GameObjects.Image;
  ativo: boolean;
}

interface Elevador {
  /** Corpo dinâmico imóvel e sem gravidade, movido por velocidade (leva quem está em cima). */
  corpo: Phaser.GameObjects.Rectangle;
  img: Phaser.GameObjects.Image;
  luz: Phaser.GameObjects.Rectangle;
  x: number;
  w: number;
  /** Topo da plataforma (y de mundo) em cima e embaixo. */
  yAlto: number;
  yBaixo: number;
  /** Para onde vai (-1 sobe, 1 desce) ou 0 parado. */
  sentido: number;
  espera: number;
  /** Só parte de novo depois que o jogador sair e subir outra vez (elevador por gatilho). */
  liberado: boolean;
  /** Em ciclo: sobe e desce sozinho, parando ELEVADOR_PAUSA_CICLO_MS em cada ponta. */
  ciclo: boolean;
}

interface Checkpoint {
  x: number;
  superficie: number;
  trecho: number;
  ordem: number;
  luz: Phaser.GameObjects.Rectangle;
}

/**
 * Mecanismos do ferro-velho eletrônico, montados a partir do LayoutLixao: esteiras que
 * empurram, prensas em ritmo fixo, plataformas frágeis e de guindaste, cabos de choque em
 * poças, ímãs de sucata, portões com alavanca ou botão-alvo, pontes e checkpoints extras.
 *
 * Todo perigo avisa antes (tremor, piscar e bipe). Esteiras, guindastes e ímãs movem o
 * jogador deslocando o corpo dele depois do passo da física (ver `empurrar`). Só avança em
 * `atualizar`, que a cena não chama com a física pausada.
 */
export class MecanismosLixao {
  private readonly cena: CenaFase3;
  private readonly aoAtingir: (origemX: number) => void;
  private tempo = 0;

  private readonly esteiras: Esteira[] = [];
  private readonly prensas: Prensa[] = [];
  private readonly frageis: Fragil[] = [];
  private readonly guindastes: Guindaste[] = [];
  private readonly choques: Choque[] = [];
  /** Até quando (tempo da cena) cada grupo de choque fica desligado. */
  private readonly desligadoAte = new Map<string, number>();
  /** Último segundo mostrado na contagem do corredor (para avisar uma vez por segundo). */
  private ultimoSegundo = -1;
  private readonly imas: Ima[] = [];
  private readonly alavancas: Alavanca[] = [];
  private readonly botoes: Botao[] = [];
  private readonly checkpoints: Checkpoint[] = [];
  private readonly elevadores: Elevador[] = [];
  private readonly avisos: { img: Phaser.GameObjects.Sprite; texto: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  /** Corpos dos elevadores: a cena liga o colisor com o jogador depois de criá-lo. */
  public readonly corposMoveis: Phaser.GameObjects.Rectangle[] = [];
  private readonly abriveis = new Map<string, Abrivel>();
  private contador = 0;

  constructor(cena: CenaFase3, aoAtingir: (origemX: number) => void) {
    this.cena = cena;
    this.aoAtingir = aoAtingir;
    this.gerarTexturas();
  }

  /** Monta um elemento do layout; x é relativo ao trecho, que começa em `offset`. */
  adicionar(e: Elemento, offset: number, trecho: number): void {
    const n = this.contador++;
    switch (e.tipo) {
      case 'esteira':
        this.criarEsteira(offset + e.x, e.alt, e.w, e.v, n);
        break;
      case 'prensa':
        this.criarPrensa(offset + e.x, e.w, e.alt, e.atraso);
        break;
      case 'fragil':
        this.criarFragil(offset + e.x, e.alt, e.w, n);
        break;
      case 'guindaste':
        this.criarGuindaste(offset + e.x, offset + e.ate, e.alt, e.w, e.v, n);
        break;
      case 'choque':
        this.criarChoque(offset + e.x, e.w, e.atraso, e.grupo);
        break;
      case 'ima':
        this.criarIma(offset + e.x, e.alt, e.atraso);
        break;
      case 'portao':
        this.criarPortao(e.id, offset + e.x);
        break;
      case 'alavanca':
        this.criarAlavanca(offset + e.x, e.alt, e.alvo);
        break;
      case 'botao':
        this.criarBotao(offset + e.x, e.alt, e.alvo);
        break;
      case 'ponte':
        this.criarPonte(e.id, offset + e.x, e.alt, e.w);
        break;
      case 'elevador':
        this.criarElevador(offset + e.x, e.alt, e.w, e.ate ?? 0, e.ciclo ?? false);
        break;
      case 'checkpoint':
        this.criarCheckpoint(offset + e.x, e.alt, trecho, e.ordem);
        break;
      case 'aviso':
        this.criarAviso(offset + e.x, e.alt, e.texto, e.estilo);
        break;
      default:
        break;
    }
  }

  /** Ao morrer: plataformas frágeis voltam inteiras. Portões e pontes abertos ficam abertos. */
  reiniciar(): void {
    for (const f of this.frageis) this.restaurarFragil(f);
  }

  /** Reciclável em voo em (x, y) acerta um botão-alvo? */
  atingir(x: number, y: number): boolean {
    const b = this.botoes.find((bt) => Phaser.Math.Distance.Between(x, y, bt.x, bt.y) <= MECANISMO.RAIO_BOTAO);
    if (!b) return false;
    if (!b.ativo) {
      b.ativo = true;
      b.img.setFrame(1);
      this.cena.som.bipesAcerto();
      this.mostrarAbertura(b.alvo);
    }
    return true;
  }

  /** Alavanca ao alcance do jogador ainda não puxada (para o aviso "[E] Alavanca"). */
  alavancaPerto(): { x: number; y: number } | null {
    const a = this.alavancaAlcance();
    return a ? { x: a.x, y: a.superficie } : null;
  }

  /** Puxa a alavanca ao alcance: abre o alvo dela com a câmera mostrando. */
  puxarAlavanca(): void {
    const a = this.alavancaAlcance();
    if (!a) return;
    a.puxada = true;
    a.img.setFrame(1);
    this.cena.som.bipesAcerto();
    this.mostrarAbertura(a.alvo);
  }

  atualizar(delta: number): void {
    this.tempo += delta;
    const dt = delta / 1000;
    this.atualizarEsteiras(dt);
    this.atualizarGuindastes(dt);
    this.atualizarElevadores(delta);
    this.atualizarFrageis(delta);
    this.atualizarPrensas();
    this.atualizarChoques();
    this.atualizarImas(dt);
    this.atualizarCheckpoints();
    this.atualizarAvisos();
  }

  /* =========================================================================
   * APOIO
   * ========================================================================= */

  private get jogador() {
    return this.cena.jogador;
  }

  /** O jogador está de pé sobre a faixa [x, x + w] com o topo em `topo`? */
  private emCima(x: number, w: number, topo: number): boolean {
    const c = this.jogador.corpo;
    const noChao = c.blocked.down || c.touching.down;
    return noChao && Math.abs(c.bottom - topo) <= 4 && c.right > x && c.left < x + w;
  }

  /** Desloca o jogador na horizontal; a física separa de paredes no próximo passo. */
  private empurrar(dx: number): void {
    this.jogador.corpo.position.x += dx;
  }

  /** Perto da câmera (para bipes de aviso só do que se vê). */
  private visivel(x: number, y: number): boolean {
    const v = this.cena.cameras.main.worldView;
    return x > v.x - 100 && x < v.right + 100 && y > v.y - 100 && y < v.bottom + 100;
  }

  private fase(ciclo: number, atraso: number): number {
    return (this.tempo + atraso) % ciclo;
  }

  private solido(x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    const r = this.cena.add.rectangle(x + w / 2, y + h / 2, w, h, 0, 0);
    this.cena.solidos.add(r);
    return r;
  }

  private tingir<T extends Phaser.GameObjects.Components.Tint>(obj: T): T {
    this.cena.cenario.registrarTingivel(obj);
    return obj;
  }

  /* =========================================================================
   * ESTEIRA
   * ========================================================================= */

  private criarEsteira(x: number, alt: number, w: number, v: number, n: number): void {
    const noChao = alt <= 24;
    const topo = CHAO_Y - alt;
    const h = noChao ? alt : 20;
    this.solido(x, topo, w, h);
    const wa = Math.round(w / ESCALA);
    const ha = Math.round(h / ESCALA);
    // Estrutura: caixa com rolos nas pontas e pés
    const chave = `lx-esteira-base-${n}`;
    texturaPixel(this.cena, chave, wa, ha + (noChao ? 0 : 3), (p) => {
      p.caixa(0, 1, wa, ha - 1, COR.musgoEscuro);
      for (let rx = 1; rx < wa - 1; rx += 4) p.ponto(rx + 1, ha - 2, COR.musgo);
      p.disco(1, Math.floor(ha / 2), Math.max(1, Math.floor(ha / 2) - 1), COR.musgoClaro);
      p.disco(wa - 2, Math.floor(ha / 2), Math.max(1, Math.floor(ha / 2) - 1), COR.musgoClaro);
      if (!noChao) {
        p.px(3, ha, 2, 3, COR.musgoEscuro);
        p.px(wa - 5, ha, 2, 3, COR.musgoEscuro);
      }
    });
    this.tingir(this.cena.add.image(grade(x), grade(topo), chave).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.objetos));
    // Faixa com setas, rolando no sentido do empurrão
    const faixa = this.cena.add
      .tileSprite(grade(x), grade(topo) - ESCALA, wa, 2, 'lx-esteira-faixa')
      .setOrigin(0, 0)
      .setScale(ESCALA)
      .setDepth(PROF.objetos + 1)
      .setFlipX(v < 0);
    this.tingir(faixa);
    this.esteiras.push({ x, w, topo, v, faixa });
  }

  private atualizarEsteiras(dt: number): void {
    for (const e of this.esteiras) {
      e.faixa.tilePositionX -= (Math.abs(e.v) * dt) / ESCALA;
      if (this.emCima(e.x, e.w, e.topo)) this.empurrar(e.v * dt);
    }
  }

  /* =========================================================================
   * PRENSA
   * ========================================================================= */

  private criarPrensa(x: number, w: number, alt: number, atraso: number): void {
    const superficie = CHAO_Y - alt;
    const topoCarcaca = superficie - MECANISMO.PRENSA_CURSO - 28 - 48;
    const wa = Math.round(w / ESCALA);
    // Carcaça hidráulica no alto, com faixas e pistão
    const chaveCarcaca = `lx-prensa-carcaca-${wa}`;
    texturaPixel(this.cena, chaveCarcaca, wa + 8, 12, (p) => {
      p.caixa(0, 0, wa + 8, 12, COR.musgo);
      p.px(1, 1, wa + 6, 2, COR.musgoClaro);
      for (let i = 2; i < wa + 6; i += 4) p.px(i, 5, 2, 3, COR.musgoEscuro);
      p.px(Math.floor((wa + 8) / 2) - 2, 9, 4, 3, COR.cobreEscuro);
    });
    this.tingir(this.cena.add.image(grade(x - 16), grade(topoCarcaca), chaveCarcaca).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.objetos));
    const haste = this.cena.add
      .rectangle(grade(x + w / 2) - 8, topoCarcaca + 48, 16, 10, hexNum(COR.musgoClaro))
      .setOrigin(0, 0)
      .setDepth(PROF.objetos);
    const chaveCabeca = `lx-prensa-cabeca-${wa}`;
    texturaPixel(this.cena, chaveCabeca, wa, 7, (p) => {
      p.caixa(0, 0, wa, 7, COR.musgoClaro);
      p.px(1, 5, wa - 2, 1, COR.musgoEscuro);
      for (let i = 1; i < wa - 1; i += 2) p.ponto(i, 6, COR.contorno);
    });
    const cabeca = this.cena.add.image(grade(x), 0, chaveCabeca).setOrigin(0, 1).setScale(ESCALA).setDepth(PROF.objetos + 1);
    this.tingir(cabeca);
    // Faixa de perigo na borda da cabeça: pisca no aviso
    const aviso = this.cena.add.rectangle(grade(x), 0, w, ESCALA, hexNum(COR.perigo)).setOrigin(0, 1).setDepth(PROF.escuro + 1).setVisible(false);
    this.prensas.push({ x, w, superficie, atraso, cabeca, haste, aviso, ultimaFase: -1 });
  }

  /** Base da cabeça da prensa (y de mundo) pela fase do ciclo. */
  private baseCabeca(p: Prensa, f: number): number {
    const M = MECANISMO;
    const alto = p.superficie - M.PRENSA_CURSO;
    if (f < M.PRENSA_DESCE) return alto;
    if (f < M.PRENSA_EMBAIXO) return alto + (M.PRENSA_CURSO * (f - M.PRENSA_DESCE)) / (M.PRENSA_EMBAIXO - M.PRENSA_DESCE);
    if (f < M.PRENSA_SOBE) return p.superficie;
    return p.superficie - (M.PRENSA_CURSO * (f - M.PRENSA_SOBE)) / (M.PRENSA_CICLO - M.PRENSA_SOBE);
  }

  private atualizarPrensas(): void {
    const M = MECANISMO;
    const c = this.jogador.corpo;
    for (const p of this.prensas) {
      const f = this.fase(M.PRENSA_CICLO, p.atraso);
      const base = grade(this.baseCabeca(p, f));
      const avisando = f >= M.PRENSA_AVISO && f < M.PRENSA_DESCE;
      const tremor = avisando && Math.floor(f / 60) % 2 === 0 ? ESCALA : 0;
      p.cabeca.setPosition(grade(p.x) + tremor, base);
      p.aviso.setPosition(grade(p.x) + tremor, base).setVisible(avisando && Math.floor(f / 120) % 2 === 0);
      const topoHaste = p.haste.y;
      p.haste.setSize(16, Math.max(4, base - 28 - topoHaste));
      // Bipe ao começar o aviso e "clang" ao bater
      if (avisando && p.ultimaFase < M.PRENSA_AVISO && this.visivel(p.x, base)) this.cena.som.aviso();
      if (f >= M.PRENSA_EMBAIXO && p.ultimaFase < M.PRENSA_EMBAIXO && this.visivel(p.x, base)) {
        this.cena.som.batida();
        this.cena.cameras.main.shake(60, 0.002);
      }
      p.ultimaFase = f;
      // Esmagar: a cabeça descendo ou embaixo encostando no jogador
      const perigosa = f >= M.PRENSA_DESCE && f < M.PRENSA_SOBE;
      if (perigosa && c.right > p.x + 4 && c.left < p.x + p.w - 4 && c.top < base && c.bottom > base - 28) this.aoAtingir(p.x + p.w / 2);
    }
  }

  /* =========================================================================
   * PLATAFORMA FRÁGIL
   * ========================================================================= */

  private criarFragil(x: number, alt: number, w: number, n: number): void {
    const topo = CHAO_Y - alt;
    const corpo = this.solido(x, topo, w, 20);
    const wa = Math.round(w / ESCALA);
    const chave = `lx-fragil-${wa}`;
    const rnd = aleatorio(700 + n);
    texturaPixel(this.cena, chave, wa, 5, (p) => {
      p.caixa(0, 0, wa, 5, COR.musgo);
      p.px(1, 1, wa - 2, 1, COR.musgoClaro);
      // Rachaduras: avisam que a chapa não aguenta
      for (let i = 3; i < wa - 3; i += 5 + Math.floor(rnd() * 4)) {
        p.linha(i, 1, i + 1, 3, COR.contorno);
        p.ponto(i + 2, 4, COR.contorno);
      }
    });
    const img = this.tingir(this.cena.add.image(grade(x), grade(topo), chave).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.objetos));
    this.frageis.push({ corpo, img, x: grade(x), y: grade(topo), estado: 'firme', tempo: 0 });
  }

  private atualizarFrageis(delta: number): void {
    for (const f of this.frageis) {
      f.tempo += delta;
      const body = f.corpo.body as Phaser.Physics.Arcade.StaticBody;
      if (f.estado === 'firme') {
        if (this.emCima(body.left, body.width, body.top)) {
          f.estado = 'tremendo';
          f.tempo = 0;
          if (this.visivel(f.x, f.y)) this.cena.som.aviso();
        }
      } else if (f.estado === 'tremendo') {
        f.img.setX(f.x + (Math.floor(f.tempo / 50) % 2 === 0 ? ESCALA : -ESCALA));
        if (f.tempo >= MECANISMO.FRAGIL_TREMOR_MS) {
          f.estado = 'caida';
          f.tempo = 0;
          body.enable = false;
          this.cena.tweens.add({ targets: f.img, y: f.y + 160, alpha: 0, duration: 400, ease: 'Quad.easeIn' });
        }
      } else if (f.tempo >= MECANISMO.FRAGIL_VOLTA_MS) {
        // Só volta se o jogador não estiver no lugar dela
        const c = this.jogador.corpo;
        const ocupado = c.right > body.left && c.left < body.right && c.bottom > body.top && c.top < body.bottom;
        if (!ocupado) this.restaurarFragil(f);
      }
    }
  }

  private restaurarFragil(f: Fragil): void {
    f.estado = 'firme';
    f.tempo = 0;
    (f.corpo.body as Phaser.Physics.Arcade.StaticBody).enable = true;
    this.cena.tweens.killTweensOf(f.img);
    f.img.setPosition(f.x, f.y).setAlpha(0);
    this.cena.tweens.add({ targets: f.img, alpha: 1, duration: 250 });
  }

  /* =========================================================================
   * PLATAFORMA DE GUINDASTE
   * ========================================================================= */

  private criarGuindaste(min: number, max: number, alt: number, w: number, v: number, n: number): void {
    const topo = CHAO_Y - alt;
    const corpo = this.solido(min, topo, w, 20);
    const wa = Math.round(w / ESCALA);
    const chave = `lx-guindaste-${wa}-${n}`;
    texturaPixel(this.cena, chave, wa, 7, (p) => {
      p.caixa(0, 2, wa, 5, COR.musgoEscuro);
      p.px(1, 3, wa - 2, 1, COR.musgoClaro);
      // Ganchos presos ao cabo
      p.px(Math.floor(wa / 2) - 3, 0, 1, 2, COR.contorno);
      p.px(Math.floor(wa / 2) + 2, 0, 1, 2, COR.contorno);
    });
    const img = this.tingir(this.cena.add.image(grade(min), grade(topo) - 2 * ESCALA, chave).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.objetos));
    const cabo = this.cena.add.rectangle(grade(min + w / 2), topo - 8, ESCALA, 900, hexNum(COR.contorno)).setOrigin(0.5, 1).setDepth(PROF.objetos - 1);
    this.guindastes.push({ corpo, img, cabo, min, max, w, topo, v, x: min });
  }

  private atualizarGuindastes(dt: number): void {
    for (const g of this.guindastes) {
      const estavaEmCima = this.emCima(g.x, g.w, g.topo);
      let nx = g.x + g.v * dt;
      if (nx > g.max || nx < g.min) {
        g.v = -g.v;
        nx = Phaser.Math.Clamp(nx, g.min, g.max);
      }
      const dx = nx - g.x;
      g.x = nx;
      g.corpo.setPosition(g.x + g.w / 2, g.topo + 10);
      (g.corpo.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      g.img.setX(grade(g.x));
      g.cabo.setX(grade(g.x + g.w / 2));
      if (estavaEmCima) this.empurrar(dx);
    }
  }

  /* =========================================================================
   * CABO DE CHOQUE NA POÇA
   * ========================================================================= */

  /** Corta a energia de um grupo de choques (exercício 3) pelo tempo informado. */
  desligarGrupo(grupo: string, ms: number): void {
    this.desligadoAte.set(grupo, this.cena.time.now + ms);
    this.ultimoSegundo = -1;
  }

  private criarChoque(x: number, w: number, atraso: number, grupo?: string): void {
    const wa = Math.round(w / ESCALA);
    texturaPixel(this.cena, `lx-poca-choque-${wa}`, wa, 3, (p) => {
      p.px(1, 0, wa - 2, 3, COR.chuvaAzul);
      p.px(0, 1, wa, 1, COR.chuvaAzul);
      p.px(2, 1, wa - 4, 1, COR.chuvaAzulClaro);
    });
    this.cena.add.image(grade(x), CHAO_Y - ESCALA, `lx-poca-choque-${wa}`).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.objetos);
    // Cabo descendo do alto com a ponta de cobre desencapada sobre a poça
    const cx = grade(x + w / 2);
    const cabo = this.cena.add.image(cx, CHAO_Y - 8, 'lx-cabo-choque').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.objetos);
    this.tingir(cabo);
    const faisca = this.cena.add.rectangle(cx, CHAO_Y - 12, ESCALA * 3, ESCALA * 3, hexNum(COR.perigo)).setDepth(PROF.escuro + 1).setVisible(false);
    const descarga = this.cena.add
      .rectangle(grade(x), CHAO_Y, w, ESCALA * 3, hexNum(COR.bateriaAmarela))
      .setOrigin(0, 1)
      .setDepth(PROF.escuro + 1)
      .setVisible(false);
    this.choques.push({ x, w, atraso, faisca, descarga, ultimaFase: -1, grupo });
  }

  private atualizarChoques(): void {
    const M = MECANISMO;
    const c = this.jogador.corpo;
    this.contarCorredor();
    for (const ch of this.choques) {
      if (ch.grupo) {
        this.atualizarCorredor(ch);
        continue;
      }
      const f = this.fase(M.CHOQUE_CICLO, ch.atraso);
      const avisando = f >= M.CHOQUE_AVISO && f < M.CHOQUE_LIGA;
      const ligado = f >= M.CHOQUE_LIGA;
      ch.faisca.setVisible((avisando && Math.floor(f / 100) % 2 === 0) || ligado);
      ch.descarga.setVisible(ligado && Math.floor(f / 50) % 2 === 0).setFillStyle(hexNum(Math.floor(f / 100) % 2 === 0 ? COR.bateriaAmarela : COR.luz));
      if (avisando && ch.ultimaFase < M.CHOQUE_AVISO && this.visivel(ch.x, CHAO_Y)) this.cena.som.aviso();
      if (ligado && ch.ultimaFase < M.CHOQUE_LIGA && this.visivel(ch.x, CHAO_Y)) this.cena.som.choque();
      ch.ultimaFase = f;
      const noChao = c.blocked.down || c.touching.down;
      if (ligado && noChao && Math.abs(c.bottom - CHAO_Y) <= 4 && c.right > ch.x + 4 && c.left < ch.x + ch.w - 4) this.aoAtingir(ch.x + ch.w / 2);
    }
  }

  /**
   * Segmento do corredor eletrificado: descarga contínua e fatal; desligado só depois do
   * exercício, com aviso piscando no fim do tempo.
   */
  private atualizarCorredor(ch: Choque): void {
    const agora = this.cena.time.now;
    const resta = (this.desligadoAte.get(ch.grupo ?? '') ?? 0) - agora;
    const ligado = resta <= 0;
    const avisando = !ligado && resta < CORREDOR.AVISO_MS;
    const piscar = Math.floor(agora / 60) % 2 === 0;
    ch.faisca.setVisible(ligado || (avisando && piscar));
    ch.descarga.setVisible(ligado && piscar).setFillStyle(hexNum(Math.floor(agora / 100) % 2 === 0 ? COR.bateriaAmarela : COR.luz));
    const c = this.jogador.corpo;
    const noChao = c.blocked.down || c.touching.down;
    if (ligado && noChao && Math.abs(c.bottom - CHAO_Y) <= 4 && c.right > ch.x + 4 && c.left < ch.x + ch.w - 4) this.cena.matarJogador();
  }

  /** Contagem regressiva na HUD enquanto o corredor está desligado, com bipe no fim. */
  private contarCorredor(): void {
    const ate = this.desligadoAte.get('corredor');
    if (ate === undefined) return;
    const resta = ate - this.cena.time.now;
    if (resta <= 0) {
      if (this.ultimoSegundo !== 0) {
        this.ultimoSegundo = 0;
        this.cena.som.choque();
      }
      return;
    }
    const s = Math.ceil(resta / 1000);
    if (s === this.ultimoSegundo) return;
    this.ultimoSegundo = s;
    this.cena.hud.mostrarAviso(`Energia cortada: ${s} s`, 1000);
    if (resta < CORREDOR.AVISO_MS) this.cena.som.aviso();
  }

  /* =========================================================================
   * ÍMÃ DE SUCATA
   * ========================================================================= */

  private criarIma(x: number, alt: number, atraso: number): void {
    const y = CHAO_Y - alt;
    this.cena.add.rectangle(grade(x), y - 30, ESCALA, 900, hexNum(COR.contorno)).setOrigin(0.5, 1).setDepth(PROF.objetos - 1);
    const img = this.cena.add.image(grade(x), grade(y), 'lx-ima', 0).setScale(ESCALA).setDepth(PROF.objetos + 1);
    this.tingir(img);
    // Linhas do campo: pulsam dos dois lados enquanto ligado
    const campo: Phaser.GameObjects.Rectangle[] = [];
    for (const lado of [-1, 1]) {
      for (let k = 1; k <= 3; k++) {
        campo.push(
          this.cena.add
            .rectangle(grade(x + lado * k * 56), grade(y), ESCALA, ESCALA * 6, hexNum(COR.janela))
            .setDepth(PROF.escuro + 1)
            .setAlpha(0.6)
            .setVisible(false)
        );
      }
    }
    this.imas.push({ x, y, atraso, img, campo, ultimaFase: -1 });
  }

  private atualizarImas(dt: number): void {
    const M = MECANISMO;
    for (const im of this.imas) {
      const f = this.fase(M.IMA_CICLO, im.atraso);
      const avisando = f >= M.IMA_AVISO && f < M.IMA_LIGA;
      const ligado = f >= M.IMA_LIGA;
      // Quadro 1: pontas acesas (perigo ligado); no aviso pisca e treme
      im.img.setFrame(ligado || (avisando && Math.floor(f / 100) % 2 === 0) ? 1 : 0);
      im.img.setX(grade(im.x) + (avisando && Math.floor(f / 60) % 2 === 0 ? ESCALA : 0));
      const onda = (this.tempo / 120) % 3;
      im.campo.forEach((r, i) => r.setVisible(ligado && Math.floor(onda) === 2 - (i % 3)));
      if (avisando && im.ultimaFase < M.IMA_AVISO && this.visivel(im.x, im.y)) this.cena.som.aviso();
      im.ultimaFase = f;
      if (!ligado) continue;
      const j = this.jogador;
      const dx = im.x - j.x;
      if (Math.abs(dx) > 8 && Math.abs(dx) < M.IMA_ALCANCE_X && Math.abs(j.y - 48 - im.y) < M.IMA_ALCANCE_Y) {
        this.empurrar(Math.sign(dx) * M.IMA_FORCA * dt);
      }
    }
  }

  /* =========================================================================
   * PORTÃO, ALAVANCA, BOTÃO E PONTE
   * ========================================================================= */

  /** Portão de grade pequeno (3 blocos) com espinhos em cima: não dá para pular. */
  private criarPortao(id: string, x: number): void {
    const h = ALTURA_BARREIRA + ALTURA_ESPINHOS;
    const topo = CHAO_Y - h;
    const corpo = this.solido(x, topo, 64, h);
    texturaPixel(this.cena, 'lx-portao-barreira', 16, Math.round(h / ESCALA), (p) => desenharBarreira(p, 16, Math.round(h / ESCALA), 'portao'));
    const img = this.tingir(this.cena.add.image(grade(x), grade(topo), 'lx-portao-barreira').setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.objetos));
    const abrivel: Abrivel = {
      x: x + 32,
      y: CHAO_Y - 160,
      aberto: false,
      abrir: () => {
        this.cena.solidos.remove(corpo, true, true);
        // Recolhe para dentro do chão
        this.cena.tweens.add({ targets: img, y: img.y + h, alpha: 0, duration: 900, ease: 'Sine.easeIn' });
        this.cena.cameras.main.shake(250, 0.004);
      },
    };
    this.abriveis.set(id, abrivel);
  }

  private criarPonte(id: string, x: number, alt: number, w: number): void {
    const topo = CHAO_Y - alt;
    const wa = Math.round(w / ESCALA);
    const abrivel: Abrivel = {
      x: x + w / 2,
      y: topo - 120,
      aberto: false,
      abrir: () => {
        this.solido(x, topo, w, 20);
        texturaPixel(this.cena, `lx-ponte-alvo-${wa}`, wa, 5, (p) => {
          p.caixa(0, 0, wa, 5, COR.musgoClaro);
          p.px(1, 3, wa - 2, 1, COR.musgo);
          for (let i = 3; i < wa - 2; i += 6) p.ponto(i, 2, COR.contorno);
        });
        const img = this.tingir(
          this.cena.add.image(grade(x), grade(topo) + 40, `lx-ponte-alvo-${wa}`).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.objetos).setAlpha(0)
        );
        this.cena.tweens.add({ targets: img, y: grade(topo), alpha: 1, duration: 600, ease: 'Back.easeOut' });
      },
    };
    this.abriveis.set(id, abrivel);
  }

  private criarAlavanca(x: number, alt: number, alvo: string): void {
    const superficie = CHAO_Y - alt;
    const img = this.cena.add.image(grade(x), superficie, 'lx-alavanca', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.escuro + 1);
    this.cena.cenario.clima.registrarLuz(img);
    this.alavancas.push({ x, superficie, alvo, img, puxada: false });
  }

  private alavancaAlcance(): Alavanca | undefined {
    const j = this.jogador;
    return this.alavancas.find(
      (a) => !a.puxada && Math.abs(j.x - a.x) < MECANISMO.ALCANCE_ALAVANCA && Math.abs(j.y - a.superficie) < MECANISMO.ALCANCE_ALAVANCA
    );
  }

  private criarBotao(x: number, alt: number, alvo: string): void {
    const y = CHAO_Y - alt;
    // Pendurado num cabo, para ficar no alto ou sobre o fosso
    this.cena.add.rectangle(grade(x), y - 28, ESCALA, 900, hexNum(COR.contorno)).setOrigin(0.5, 1).setDepth(PROF.objetos - 1);
    const img = this.cena.add.image(grade(x), grade(y), 'lx-botao-alvo', 0).setScale(ESCALA).setDepth(PROF.escuro + 1);
    this.cena.cenario.clima.registrarLuz(img);
    // Pulsa para chamar atenção (é interativo)
    this.cena.tweens.add({ targets: img, scale: ESCALA * 1.12, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.botoes.push({ x, y, alvo, img, ativo: false });
  }

  /** Abre o alvo com a câmera indo até ele (ver CenaFase3.mostrarEvento). */
  private mostrarAbertura(id: string): void {
    const alvo = this.abriveis.get(id);
    if (!alvo || alvo.aberto) return;
    alvo.aberto = true;
    this.cena.mostrarEvento(alvo.x, alvo.y, () => alvo.abrir());
  }

  /* =========================================================================
   * ELEVADOR DE SUCATA
   * ========================================================================= */

  /**
   * Elevador entre `ate` (0 = chão) e `alt`. Por gatilho, começa embaixo e sobe para buscar
   * quem chega ao patamar de cima, depois parte ao subir nele; em ciclo, sobe e desce sozinho
   * a partir do alto. O corpo é dinâmico e imóvel: a física leva o jogador junto.
   */
  private criarElevador(x: number, alt: number, w: number, ate: number, ciclo: boolean): void {
    const yAlto = CHAO_Y - alt;
    const yBaixo = CHAO_Y - Math.max(20, ate);
    // Trilhos vazados do andaime, do pé ao alto
    const pe = ate > 0 ? yBaixo + 20 : CHAO_Y;
    for (const tx of [x + 4, x + w - 8]) {
      this.cena.add.rectangle(grade(tx), pe, ESCALA, pe - yAlto + 40, hexNum(COR.sombraSucata)).setOrigin(0, 1).setDepth(PROF.objetos - 1);
    }
    for (let y = pe - 20; y > yAlto - 40; y -= 96) {
      this.cena.add.rectangle(grade(x + 4), grade(y), w - 8, ESCALA, hexNum(COR.sombraSucata)).setOrigin(0, 0).setDepth(PROF.objetos - 1);
    }
    const yInicio = ciclo ? yAlto : yBaixo;
    const corpo = this.cena.add.rectangle(x + w / 2, yInicio + 10, w, 20, 0, 0);
    this.cena.physics.add.existing(corpo);
    const b = corpo.body as Phaser.Physics.Arcade.Body;
    b.setAllowGravity(false).setImmovable(true);
    // Só o topo é sólido: dá para atravessar por baixo e pelos lados
    b.checkCollision.down = false;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
    this.corposMoveis.push(corpo);
    const wa = Math.round(w / ESCALA);
    texturaPixel(this.cena, `lx-elevador-${wa}`, wa, 6, (p) => {
      p.caixa(0, 1, wa, 5, COR.musgo);
      p.px(1, 2, wa - 2, 1, COR.musgoClaro);
      for (let i = 2; i < wa - 2; i += 3) p.ponto(i, 4, COR.musgoEscuro);
      p.px(0, 0, wa, 1, COR.contorno);
    });
    const img = this.tingir(this.cena.add.image(grade(x), grade(yInicio) - ESCALA, `lx-elevador-${wa}`).setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.objetos));
    // Lâmpada amarela: acende enquanto anda (não é interativo, então nada de ciano)
    const luz = this.cena.add.rectangle(grade(x + w / 2), grade(yInicio) - ESCALA * 2, ESCALA * 2, ESCALA, hexNum(COR.bateriaAmarela)).setDepth(PROF.escuro + 1).setAlpha(0.4);
    this.elevadores.push({ corpo, img, luz, x, w, yAlto, yBaixo, sentido: 0, espera: 0, liberado: true, ciclo });
  }

  /** Topo atual da plataforma (y de mundo). */
  private topoElevador(el: Elevador): number {
    return (el.corpo.body as Phaser.Physics.Arcade.Body).top;
  }

  /** Decide quando o elevador parte: em ciclo pela pausa; por gatilho com o jogador em cima. */
  private decidirPartida(el: Elevador, y: number, delta: number): void {
    const M = MECANISMO;
    const c = this.jogador.corpo;
    const noAlto = y <= el.yAlto + 1;
    if (el.ciclo) {
      el.espera += delta;
      if (el.espera >= M.ELEVADOR_PAUSA_CICLO_MS) {
        el.sentido = noAlto ? 1 : -1;
        el.espera = 0;
      }
      return;
    }
    const emCima = this.emCima(el.x, el.w, y);
    // Parado embaixo com o jogador esperando no patamar de cima (por exemplo depois de
    // renascer no terminal): sobe para buscar, para ninguém precisar pular lá de cima
    const noChao = c.blocked.down || c.touching.down;
    const esperandoNoAlto =
      noChao && Math.abs(c.bottom - el.yAlto) <= 4 && c.right > el.x - M.ELEVADOR_CHAMADA && c.left < el.x + el.w + M.ELEVADOR_CHAMADA;
    if (!noAlto && esperandoNoAlto && !emCima) {
      el.sentido = -1;
      el.liberado = true;
      return;
    }
    if (!emCima) {
      // Só parte de novo depois que o jogador sair de cima dele (não basta estar no ar)
      if (!(c.right > el.x && c.left < el.x + el.w)) el.liberado = true;
      el.espera = 0;
      return;
    }
    if (!el.liberado) return;
    el.espera += delta;
    if (el.espera >= M.ELEVADOR_ESPERA_MS) {
      el.sentido = noAlto ? 1 : -1;
      el.liberado = false;
      el.espera = 0;
      if (this.visivel(el.x, y)) this.cena.som.aviso();
    }
  }

  /**
   * Move cada elevador por velocidade, com aceleração na partida e frenagem na chegada, e
   * cola quem está em cima na mesma velocidade vertical (desce junto sem quicar e pode pular).
   */
  private atualizarElevadores(delta: number): void {
    const M = MECANISMO;
    const c = this.jogador.corpo;
    const dt = delta / 1000;
    for (const el of this.elevadores) {
      const b = el.corpo.body as Phaser.Physics.Arcade.Body;
      const y = this.topoElevador(el);
      let vy = 0;
      if (el.sentido === 0) this.decidirPartida(el, y, delta);
      if (el.sentido !== 0) {
        const alvo = el.sentido > 0 ? el.yBaixo : el.yAlto;
        const origem = el.sentido > 0 ? el.yAlto : el.yBaixo;
        const falta = Math.abs(alvo - y);
        const andou = Math.abs(y - origem);
        const fator = Math.min(1, (andou + 8) / M.ELEVADOR_RAMPA, falta / M.ELEVADOR_RAMPA);
        const velocidade = Math.max(M.ELEVADOR_VELOCIDADE_MIN, M.ELEVADOR_VELOCIDADE * fator);
        if (falta <= velocidade * dt) {
          // Chegou: encaixa na ponta com um tranco leve
          b.reset(el.x + el.w / 2, alvo + 10);
          el.sentido = 0;
          el.espera = 0;
          if (this.emCima(el.x, el.w, alvo) && this.visivel(el.x, alvo)) this.cena.cameras.main.shake(80, 0.002);
        } else vy = el.sentido * velocidade;
      }
      b.setVelocity(0, vy);
      // Quem está em cima (e não está pulando) acompanha a plataforma
      const topo = this.topoElevador(el);
      const sobre = c.right > el.x + 2 && c.left < el.x + el.w - 2;
      const rente = Math.abs(c.bottom - topo) <= 6;
      if (sobre && rente && c.velocity.y >= vy - 60) c.velocity.y = vy;
      el.img.setY(grade(topo) - ESCALA);
      el.luz.setY(grade(topo) - ESCALA * 2).setAlpha(el.sentido !== 0 ? 1 : 0.4);
    }
  }

  /* =========================================================================
   * AVISO DE QUEDA FATAL
   * ========================================================================= */

  /** Monitor velho num poste com a tela vermelha piscando uma seta para baixo e "!". */
  private criarAviso(x: number, alt: number, mensagem = 'QUEDA FATAL', estilo: 'queda' | 'desafio' = 'queda'): void {
    const y = CHAO_Y - alt;
    const img = this.cena.add.sprite(grade(x), grade(y), `lx-aviso-${estilo}`, 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.objetos - 1);
    const texto = this.cena.add
      .text(grade(x), grade(y) - 96, mensagem, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: estilo === 'queda' ? COR.perigo : COR.janela,
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
        lineSpacing: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(PROF.escuro + 1)
      .setAlpha(0);
    this.avisos.push({ img, texto, x, y });
  }

  /** A tela pisca sempre; o texto só aparece com o jogador por perto. */
  private atualizarAvisos(): void {
    const quadro = Math.floor(this.tempo / 450) % 2;
    const c = this.jogador.corpo;
    for (const a of this.avisos) {
      a.img.setFrame(quadro);
      // Some quando há um prompt de interação na tela, para não disputar espaço com ele
      const perto = Math.abs(c.center.x - a.x) < 260 && Math.abs(c.bottom - a.y) < 140 && !this.cena.promptVisivel;
      a.texto.setAlpha(Phaser.Math.Linear(a.texto.alpha, perto ? 1 : 0, 0.15));
    }
  }

  /* =========================================================================
   * CHECKPOINT EXTRA
   * ========================================================================= */

  private criarCheckpoint(x: number, alt: number, trecho: number, ordem: number): void {
    const superficie = CHAO_Y - alt;
    this.tingir(this.cena.add.image(grade(x), superficie, 'lx-checkpoint').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.objetos));
    const luz = this.cena.add
      .rectangle(grade(x), superficie - 15 * ESCALA, ESCALA * 2, ESCALA * 2, hexNum(COR.bateriaAmarela))
      .setOrigin(0.5, 0)
      .setDepth(PROF.escuro + 1);
    this.cena.cenario.clima.registrarLuz(luz);
    this.checkpoints.push({ x, superficie, trecho, ordem, luz });
  }

  private atualizarCheckpoints(): void {
    const j = this.jogador;
    for (const cp of this.checkpoints) {
      if (Math.abs(j.x - cp.x) > MECANISMO.ALCANCE_CHECKPOINT || Math.abs(j.y - cp.superficie) > 8) continue;
      if (this.cena.salvarCheckpoint({ x: cp.x, y: cp.superficie - 4, trecho: cp.trecho, ordem: cp.trecho * 100 + cp.ordem })) {
        cp.luz.setFillStyle(hexNum(COR.bateriaVerde));
      }
    }
  }

  /* =========================================================================
   * TEXTURAS
   * ========================================================================= */

  private gerarTexturas(): void {
    // Monitor de aviso no poste: tela vermelha com "!" e seta para baixo (quadro 1 apagado)
    folhaPixel(this.cena, 'lx-aviso-queda', 14, 22, 2, (p: Pincel, q: number) => {
      p.px(6, 12, 2, 10, COR.contorno);
      p.px(4, 21, 6, 1, COR.contorno);
      p.caixa(0, 0, 14, 12, COR.sucata);
      p.px(2, 2, 10, 8, COR.contorno);
      const tela = q === 0 ? COR.perigo : COR.cobreEscuro;
      // "!" à esquerda e seta para baixo à direita
      p.px(4, 3, 1, 4, tela);
      p.ponto(4, 8, tela);
      p.px(9, 3, 1, 4, tela);
      p.px(7, 6, 5, 1, tela);
      p.px(8, 7, 3, 1, tela);
      p.ponto(9, 8, tela);
      // Fita de perigo no pé do monitor
      for (let x = 1; x < 13; x += 3) p.px(x, 10, 2, 1, COR.bateriaAmarela);
    });
    // Monitor de desafio: tela amarela com alvo à esquerda e seta para cima à direita
    folhaPixel(this.cena, 'lx-aviso-desafio', 14, 22, 2, (p: Pincel, q: number) => {
      p.px(6, 12, 2, 10, COR.contorno);
      p.px(4, 21, 6, 1, COR.contorno);
      p.caixa(0, 0, 14, 12, COR.sucata);
      p.px(2, 2, 10, 8, COR.contorno);
      const tela = q === 0 ? COR.janela : COR.cobreEscuro;
      p.px(3, 4, 3, 1, tela);
      p.px(3, 7, 3, 1, tela);
      p.px(3, 5, 1, 2, tela);
      p.px(5, 5, 1, 2, tela);
      p.ponto(9, 3, tela);
      p.px(8, 4, 3, 1, tela);
      p.px(7, 5, 5, 1, tela);
      p.px(9, 6, 1, 3, tela);
    });
    // Faixa da esteira: borracha escura com setas claras apontando para a direita
    texturaPixel(this.cena, 'lx-esteira-faixa', 8, 2, (p) => {
      p.px(0, 0, 8, 2, COR.contorno);
      p.ponto(2, 0, COR.musgoClaro);
      p.ponto(3, 0, COR.musgoClaro);
      p.ponto(4, 1, COR.musgoClaro);
      p.ponto(3, 1, COR.musgoClaro);
    });
    // Cabo pendurado com a ponta de cobre desencapada
    texturaPixel(this.cena, 'lx-cabo-choque', 5, 48, (p) => {
      p.px(2, 0, 1, 42, COR.contorno);
      p.px(1, 42, 3, 2, COR.contorno);
      p.px(1, 44, 1, 3, COR.cobre);
      p.px(3, 44, 1, 3, COR.cobreClaro);
      p.ponto(2, 47, COR.cobre);
    });
    // Ímã em U de sucata com bobinas de cobre; quadro 1 com as pontas em perigo (ligado)
    folhaPixel(this.cena, 'lx-ima', 16, 12, 2, (p: Pincel, q: number) => {
      p.caixa(0, 0, 16, 5, COR.sucata);
      p.px(1, 1, 14, 1, COR.sucataClara);
      p.caixa(0, 4, 5, 8, COR.sucata);
      p.caixa(11, 4, 5, 8, COR.sucata);
      for (let y = 5; y < 10; y += 2) {
        p.px(1, y, 3, 1, COR.cobre);
        p.px(12, y, 3, 1, COR.cobre);
      }
      const ponta = q === 1 ? COR.perigo : COR.sombraSucata;
      p.px(1, 10, 3, 2, ponta);
      p.px(12, 10, 3, 2, ponta);
      p.px(6, 0, 4, 1, COR.contorno);
    });
    // Alavanca: base de sucata e cabo ciano (interativo); quadro 1 puxada
    folhaPixel(this.cena, 'lx-alavanca', 12, 14, 2, (p: Pincel, q: number) => {
      p.caixa(1, 10, 10, 4, COR.sucata);
      if (q === 0) {
        p.linha(5, 10, 2, 2, COR.neonCianoEscuro);
        p.linha(6, 10, 3, 2, COR.neonCiano);
        p.px(1, 0, 4, 3, COR.neonCiano);
      } else {
        p.linha(5, 10, 9, 2, COR.neonCianoEscuro);
        p.linha(6, 10, 10, 2, COR.neonCiano);
        p.px(8, 0, 4, 3, COR.neonCiano);
      }
    });
    // Botão-alvo: anéis ciano (interativo); quadro 1 ativado, verde
    folhaPixel(this.cena, 'lx-botao-alvo', 13, 13, 2, (p: Pincel, q: number) => {
      const claro = q === 0 ? COR.neonCiano : COR.bateriaVerde;
      p.disco(6, 6, 6, COR.contorno);
      p.disco(6, 6, 5, claro);
      p.disco(6, 6, 3, q === 0 ? COR.neonCianoEscuro : COR.verdePlaca);
      p.disco(6, 6, 1, claro);
    });
    // Poste de checkpoint com lâmpada (a luz é um objeto à parte que muda de cor)
    texturaPixel(this.cena, 'lx-checkpoint', 6, 16, (p) => {
      p.px(2, 2, 2, 12, COR.sombraSucata);
      p.caixa(0, 0, 6, 3, COR.sucata);
      p.caixa(0, 13, 6, 3, COR.sucata);
    });
  }
}
