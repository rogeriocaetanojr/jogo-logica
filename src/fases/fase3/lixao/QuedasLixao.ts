import Phaser from 'phaser';
import type { CenaFase3 } from '../CenaFase3';
import { PROF } from '../areas/AreaLixao';
import { COR, ESCALA, aleatorio, grade, texturaPixel } from './ArteLixao';
import type { Pincel } from './ArteLixao';
import { CHAO_Y } from './TiposLixao';

/** Evento da cena disparado a cada queda (o som de estática escuta este evento). */
export const EVENTO_QUEDA = 'lixao-queda';

/** Dados do EVENTO_QUEDA: onde o item começa a cair e onde vai tocar o chão. */
export interface DadosQueda {
  x: number;
  yChao: number;
  tipo: TipoReciclavel;
}

/** Tipos de reciclável que o lixo vira ao tocar o chão (cada um terá animação e som próprios). */
export type TipoReciclavel = 'placa' | 'monitor' | 'cabo';
const TIPOS: readonly TipoReciclavel[] = ['placa', 'monitor', 'cabo'];

/**
 * Pontos de queda por área, em x relativo ao trecho (ver os comentários [QUEDA DE LIXO] em
 * areas/AreaN). A área 2 não tem comentário: o ponto fica no chão livre entre o terceiro
 * cano e o segundo buraco. Na área 6 caem das pilhas das bordas da arena.
 */
export const PONTOS_QUEDA: readonly (readonly number[])[] = [
  [],
  [2860],
  [1150, 3350, 3500],
  [3200],
  [1280, 3900, 4100],
  [400, 1880],
];

/**
 * Intervalo entre quedas por área, em ms; null desliga. Nada na área 1, pouco na 2 e
 * aumentando até a 5. Na arena o ritmo cai um pouco para não competir com o chefão.
 */
export const INTERVALO_QUEDA_MS: readonly (number | null)[] = [null, 9000, 6000, 4500, 3000, 4000];

export const QUEDA = {
  /** Tremor da pilha e crescimento da sombra antes de soltar o item. */
  AVISO_MS: 800,
  /** Amplitude do tremor da pilha, em px de mundo. */
  TREMOR: 4,
  /** Intervalo entre os sacolejos do tremor. */
  TREMOR_PASSO_MS: 50,
  /** Aceleração da queda, em px/s². */
  GRAVIDADE: 1800,
  /** Escala inicial da sombra (cresce até 1 no fim do aviso). */
  SOMBRA_INICIAL: 0.3,
  /** Tempo do reciclável parado no chão antes de sumir. */
  RECICLAVEL_MS: 6000,
  /** Nos últimos ms o reciclável pisca avisando que vai sumir. */
  PISCA_FIM_MS: 1500,
  /** Distância máxima até o jogador para o ponto entrar no sorteio. */
  ALCANCE: 900,
} as const;

/** Tamanho do item em resolução de arte (8x8 = 32 px de mundo). */
const LADO_ITEM = 8;
/** Pilha pendurada no topo da tela de onde o item cai. */
const PILHA_W = 20;
const PILHA_H = 12;
/** Sombra no chão em resolução de arte. */
const SOMBRA_W = 12;
const SOMBRA_H = 3;
/** Topo de sólido mais alto que isto é ignorado ao procurar onde o item pousa (muralhas). */
const TOPO_MINIMO = 80;

/**
 * Reciclável parado no chão. Interface usada pelo arremesso (próxima etapa) para achar e
 * recolher munição.
 */
export interface Reciclavel {
  readonly tipo: TipoReciclavel;
  readonly x: number;
  readonly y: number;
  /** Ainda no chão e disponível para pegar. */
  readonly disponivel: boolean;
  /** Recolhe o item (some do chão). Devolve o tipo, ou null se já foi recolhido ou sumiu. */
  pegar(): TipoReciclavel | null;
}

type Fase = 'aviso' | 'caindo';

interface Ciclo {
  ponto: Ponto;
  fase: Fase;
  tempo: number;
  tipo: TipoReciclavel;
  yChao: number;
  sombra: Phaser.GameObjects.Image;
  item?: Phaser.GameObjects.Image;
  velocidade: number;
}

interface Ponto {
  x: number;
  trecho: number;
  pilha: Phaser.GameObjects.Image;
  ativo: boolean;
}

class ReciclavelChao implements Reciclavel {
  public restante = QUEDA.RECICLAVEL_MS;
  public readonly tipo: TipoReciclavel;
  public readonly img: Phaser.GameObjects.Image;

  constructor(tipo: TipoReciclavel, img: Phaser.GameObjects.Image) {
    this.tipo = tipo;
    this.img = img;
  }

  get x(): number {
    return this.img.x;
  }

  get y(): number {
    return this.img.y;
  }

  get disponivel(): boolean {
    return this.img.active;
  }

  pegar(): TipoReciclavel | null {
    if (!this.img.active) return null;
    this.img.destroy();
    return this.tipo;
  }
}

/**
 * Quedas de lixo das pilhas. Cada ponto tem uma pilha pendurada no topo da tela; no ciclo a
 * pilha treme e uma sombra vermelha cresce no chão (AVISO_MS), depois o item cai. Encostar
 * no item caindo tira 1 bateria. Ao tocar o chão ele vira um reciclável parado por
 * RECICLAVEL_MS, que o arremesso recolhe por `reciclaveisPerto`.
 *
 * Só avança em `atualizar`, que a cena não chama com o terminal aberto: as quedas pausam
 * junto com a física.
 */
export class QuedasLixao {
  private readonly cena: CenaFase3;
  private readonly aoAtingir: (origemX: number) => void;
  private readonly pontos: Ponto[] = [];
  private readonly ciclos: Ciclo[] = [];
  private readonly reciclaveis: ReciclavelChao[] = [];
  private readonly rnd = aleatorio(909);
  /** Tempo até a próxima queda no trecho atual. */
  private espera = 0;
  private trechoAtual = -1;

  constructor(cena: CenaFase3, aoAtingir: (origemX: number) => void) {
    this.cena = cena;
    this.aoAtingir = aoAtingir;
  }

  /** Cria texturas e pilhas (chamar depois de montar os trechos, que definem os sólidos). */
  construir(): void {
    this.gerarTexturas();
    this.cena.trechos.forEach((trecho, i) => {
      for (const xLocal of PONTOS_QUEDA[i] ?? []) {
        const x = grade(trecho.offset + xLocal);
        const pilha = this.cena.add
          .image(x, 0, 'lx-queda-pilha')
          .setOrigin(0.5, 0)
          .setScale(ESCALA)
          .setDepth(PROF.objetos);
        this.cena.cenario.registrarTingivel(pilha);
        this.pontos.push({ x, trecho: i, pilha, ativo: false });
      }
    });
  }

  /** Recicláveis no chão a até `raio` de (x, y), do mais perto ao mais longe. */
  reciclaveisPerto(x: number, y: number, raio: number): Reciclavel[] {
    return this.reciclaveis
      .filter((r) => r.disponivel && Phaser.Math.Distance.Between(x, y, r.x, r.y) <= raio)
      .sort((a, b) => Phaser.Math.Distance.Between(x, y, a.x, a.y) - Phaser.Math.Distance.Between(x, y, b.x, b.y));
  }

  /** Todos os recicláveis ainda no chão. */
  get disponiveis(): readonly Reciclavel[] {
    return this.reciclaveis.filter((r) => r.disponivel);
  }

  /** Cancela quedas em andamento e limpa o chão (ao morrer e voltar ao checkpoint). */
  reiniciar(): void {
    for (const ciclo of this.ciclos) this.encerrar(ciclo);
    this.ciclos.length = 0;
    for (const r of this.reciclaveis) r.img.destroy();
    this.reciclaveis.length = 0;
    this.trechoAtual = -1;
  }

  atualizar(delta: number, trecho: number): void {
    if (trecho !== this.trechoAtual) {
      this.trechoAtual = trecho;
      this.espera = this.intervalo(trecho) ?? 0;
    }
    this.sortearQueda(delta, trecho);
    for (let i = this.ciclos.length - 1; i >= 0; i--) {
      if (this.avancar(this.ciclos[i], delta)) this.ciclos.splice(i, 1);
    }
    this.atualizarReciclaveis(delta);
  }

  /* =========================================================================
   * CICLO
   * ========================================================================= */

  private intervalo(trecho: number): number | null {
    return INTERVALO_QUEDA_MS[trecho] ?? null;
  }

  /** Conta o intervalo do trecho e começa uma queda num ponto livre perto do jogador. */
  private sortearQueda(delta: number, trecho: number): void {
    const intervalo = this.intervalo(trecho);
    if (intervalo === null) return;
    this.espera -= delta;
    if (this.espera > 0) return;
    const jx = this.cena.jogador.x;
    const livres = this.pontos.filter((p) => p.trecho === trecho && !p.ativo && Math.abs(p.x - jx) < QUEDA.ALCANCE);
    // Sem ponto por perto: tenta de novo logo, sem esperar o intervalo inteiro
    if (livres.length === 0) {
      this.espera = 500;
      return;
    }
    // Variação de ±25% para o ritmo não ficar previsível
    this.espera = intervalo * (0.75 + this.rnd() * 0.5);
    this.iniciar(livres[Math.floor(this.rnd() * livres.length)]);
  }

  private iniciar(ponto: Ponto): void {
    ponto.ativo = true;
    const yChao = this.superficie(ponto.x);
    // Sombra de perigo acima do pó e da escuridão, para continuar visível em qualquer clima
    const sombra = this.cena.add
      .image(ponto.x, yChao, 'lx-queda-sombra')
      .setOrigin(0.5, 0.5)
      .setScale(ESCALA * QUEDA.SOMBRA_INICIAL, ESCALA)
      .setAlpha(0.4)
      .setDepth(PROF.escuro + 1);
    const tipo = TIPOS[Math.floor(this.rnd() * TIPOS.length)];
    this.ciclos.push({ ponto, fase: 'aviso', tempo: 0, tipo, yChao, sombra, velocidade: 0 });
  }

  /** Avança um ciclo; devolve true quando ele termina. */
  private avancar(ciclo: Ciclo, delta: number): boolean {
    ciclo.tempo += delta;
    if (ciclo.fase === 'aviso') {
      const f = Math.min(1, ciclo.tempo / QUEDA.AVISO_MS);
      const escala = QUEDA.SOMBRA_INICIAL + (1 - QUEDA.SOMBRA_INICIAL) * f;
      ciclo.sombra.setScale(ESCALA * escala, ESCALA).setAlpha(0.4 + 0.5 * f);
      // Sacolejo em passos fixos, preso à grade
      const passo = Math.floor(ciclo.tempo / QUEDA.TREMOR_PASSO_MS);
      ciclo.ponto.pilha.setX(ciclo.ponto.x + (passo % 2 === 0 ? QUEDA.TREMOR : -QUEDA.TREMOR));
      if (f >= 1) this.soltar(ciclo);
      return false;
    }

    const item = ciclo.item!;
    ciclo.velocidade += (QUEDA.GRAVIDADE * delta) / 1000;
    const y = Math.min(ciclo.yChao, item.y + (ciclo.velocidade * delta) / 1000);
    item.setY(grade(y));
    item.setAngle(item.angle + delta * 0.3);
    if (this.encostaNoJogador(item)) this.aoAtingir(item.x);
    if (y < ciclo.yChao) return false;
    this.pousar(ciclo);
    return true;
  }

  /** Fim do aviso: a pilha para de tremer e o item começa a cair. */
  private soltar(ciclo: Ciclo): void {
    const { ponto } = ciclo;
    ponto.pilha.setX(ponto.x);
    ciclo.fase = 'caindo';
    ciclo.item = this.cena.add
      .image(ponto.x, PILHA_H * ESCALA, `lx-queda-${ciclo.tipo}-perigo`)
      .setOrigin(0.5, 1)
      .setScale(ESCALA)
      .setDepth(PROF.jogador - 1);
    const dados: DadosQueda = { x: ponto.x, yChao: ciclo.yChao, tipo: ciclo.tipo };
    this.cena.events.emit(EVENTO_QUEDA, dados);
  }

  /** Item tocou o chão: vira reciclável parado e libera o ponto. */
  private pousar(ciclo: Ciclo): void {
    const { item, tipo, yChao } = ciclo;
    this.encerrar(ciclo);
    this.cena.cameras.main.shake(80, 0.002);
    const img = this.cena.add
      .image(item!.x, yChao, `lx-queda-${tipo}`)
      .setOrigin(0.5, 1)
      .setScale(ESCALA)
      .setDepth(PROF.objetos);
    this.cena.cenario.registrarTingivel(img);
    this.reciclaveis.push(new ReciclavelChao(tipo, img));
  }

  private encerrar(ciclo: Ciclo): void {
    ciclo.ponto.ativo = false;
    ciclo.ponto.pilha.setX(ciclo.ponto.x);
    ciclo.sombra.destroy();
    ciclo.item?.destroy();
  }

  private atualizarReciclaveis(delta: number): void {
    for (let i = this.reciclaveis.length - 1; i >= 0; i--) {
      const r = this.reciclaveis[i];
      r.restante -= delta;
      if (!r.disponivel || r.restante <= 0) {
        r.img.destroy();
        this.reciclaveis.splice(i, 1);
        continue;
      }
      if (r.restante < QUEDA.PISCA_FIM_MS) r.img.setVisible(Math.floor(r.restante / 120) % 2 === 0);
    }
  }

  /* =========================================================================
   * APOIO
   * ========================================================================= */

  /** Topo do sólido mais alto sob x (viga, bloco ou chão); sem nada, a linha do chão. */
  private superficie(x: number): number {
    let topo = Infinity;
    for (const obj of this.cena.solidos.getChildren()) {
      const corpo = (obj as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody | null;
      if (!corpo || x < corpo.left || x > corpo.right || corpo.top < TOPO_MINIMO) continue;
      topo = Math.min(topo, corpo.top);
    }
    return topo === Infinity ? CHAO_Y : topo;
  }

  private encostaNoJogador(item: Phaser.GameObjects.Image): boolean {
    const j = this.cena.jogador.corpo;
    const meio = (LADO_ITEM * ESCALA) / 2;
    return item.x + meio > j.left && item.x - meio < j.right && item.y > j.top && item.y - meio * 2 < j.bottom;
  }

  private gerarTexturas(): void {
    texturaPixel(this.cena, 'lx-queda-pilha', PILHA_W, PILHA_H, (p) => desenharPilhaPendurada(p, aleatorio(77)));
    // Sombra em losango achatado, só no vermelho de perigo
    texturaPixel(this.cena, 'lx-queda-sombra', SOMBRA_W, SOMBRA_H, (p) => {
      p.px(2, 0, SOMBRA_W - 4, 1, COR.perigo);
      p.px(0, 1, SOMBRA_W, 1, COR.perigo);
      p.px(2, 2, SOMBRA_W - 4, 1, COR.perigo);
    });
    for (const tipo of TIPOS) {
      texturaPixel(this.cena, `lx-queda-${tipo}`, LADO_ITEM, LADO_ITEM, (p) => DESENHO_ITEM[tipo](p, COR.contorno));
      // Caindo, o contorno fica no vermelho de perigo
      texturaPixel(this.cena, `lx-queda-${tipo}-perigo`, LADO_ITEM, LADO_ITEM, (p) => DESENHO_ITEM[tipo](p, COR.perigo));
    }
  }
}

/** Beirada de pilha pendurada no topo da tela: chapas e placas soltas por baixo. */
function desenharPilhaPendurada(p: Pincel, rnd: () => number): void {
  p.px(0, 0, PILHA_W, 4, COR.sombraSucata);
  for (let x = 0; x < PILHA_W; x += 3) {
    const h = 5 + Math.floor(rnd() * (PILHA_H - 5));
    const cor = rnd() < 0.5 ? COR.sucata : COR.verdePlacaEscuro;
    p.px(x, 0, 3, h, cor);
    p.px(x, h - 1, 3, 1, COR.contorno);
    if (rnd() < 0.4) p.ponto(x + 1, h - 2, COR.cobre);
  }
}

const DESENHO_ITEM: Record<TipoReciclavel, (p: Pincel, borda: string) => void> = {
  placa: (p, borda) => {
    p.caixa(0, 2, 8, 5, COR.verdePlaca, borda);
    p.px(1, 3, 6, 1, COR.verdePlacaClaro);
    p.linha(2, 5, 5, 5, COR.cobre);
    p.ponto(6, 5, COR.cobreClaro);
  },
  monitor: (p, borda) => {
    p.caixa(0, 0, 8, 7, COR.sucataClara, borda);
    p.px(2, 2, 4, 3, COR.sombraSucata);
    p.px(3, 7, 2, 1, borda);
  },
  cabo: (p, borda) => {
    p.disco(4, 4, 3, borda);
    p.disco(4, 4, 2, COR.cobreEscuro);
    p.ponto(4, 4, borda);
    p.ponto(7, 1, COR.cobreClaro);
    p.ponto(6, 2, COR.cobre);
  },
};
