import Phaser from 'phaser';
import type { CenaFase3 } from '../CenaFase3';
import { PROF } from '../trechos/TrechoLixao';
import { COR, ESCALA, grade, hexNum, texturaPixel } from './ArteLixao';
import type { Pincel } from './ArteLixao';
import { ALTURA_TELA, RECICLAVEIS, TIPOS_RECICLAVEIS } from './TiposLixao';
import type { TipoReciclavel } from './TiposLixao';

/** Eventos da cena para o som: um por arremesso e um por impacto, com o tipo do item. */
export const EVENTO_ARREMESSO = 'lixao-arremesso';
export const EVENTO_IMPACTO = 'lixao-impacto';

/** Dados do EVENTO_ARREMESSO e do EVENTO_IMPACTO. */
export interface DadosArremesso {
  x: number;
  y: number;
  tipo: TipoReciclavel;
}

/** Lado do sprite de um reciclável, em pixels de arte. */
export const LADO_RECICLAVEL = 8;

export const ARREMESSO = {
  /** Velocidade de saída do item de peso 1 (px/s); cai com o peso. */
  VELOCIDADE_BASE: 820,
  VELOCIDADE_POR_PESO: 90,
  /** Gravidade sobre o item de peso 1 (px/s²); sobe com o peso. */
  GRAVIDADE_BASE: 700,
  GRAVIDADE_POR_PESO: 260,
  /** Distância até o item mais perto para pegar com F. */
  ALCANCE_PEGAR: 96,
  /** Trajetória pontilhada: quanto tempo de voo mostra e o intervalo entre os pontos. */
  TRAJETORIA_MS: 450,
  TRAJETORIA_PASSO_MS: 40,
  /** Um clique só vale se for processado até este tempo depois (descarta cliques com a cena pausada). */
  VALIDADE_CLIQUE_MS: 150,
  /** Altura do item acima da cabeça do jogador. */
  ACIMA_CABECA: 4,
} as const;

/** Giro no ar: graus por segundo e se o item capota de lado (achata e volta, como um disco). */
const GIRO: Record<TipoReciclavel, { grausPorSegundo: number; capota: boolean }> = {
  lata: { grausPorSegundo: 900, capota: false },
  placa: { grausPorSegundo: 120, capota: true },
  bateria: { grausPorSegundo: 600, capota: false },
  monitor: { grausPorSegundo: 220, capota: false },
};

/** Item em voo. */
interface Projetil {
  tipo: TipoReciclavel;
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravidade: number;
  tempo: number;
}

function velocidadeDe(tipo: TipoReciclavel): number {
  return ARREMESSO.VELOCIDADE_BASE - ARREMESSO.VELOCIDADE_POR_PESO * RECICLAVEIS[tipo].peso;
}

function gravidadeDe(tipo: TipoReciclavel): number {
  return ARREMESSO.GRAVIDADE_BASE + ARREMESSO.GRAVIDADE_POR_PESO * RECICLAVEIS[tipo].peso;
}

/**
 * Arremesso de recicláveis, igual no caminho e no chefão. F pega o item mais perto (só com a
 * mão vazia), que vai acima da cabeça do jogador. O mouse mira com uma trajetória curta
 * pontilhada e o clique arremessa. O item voa com giro próprio, curva conforme o peso e,
 * ao bater num sólido, faz a animação de impacto do tipo e some.
 *
 * Só avança em `atualizar`, que a cena não chama com o terminal aberto ou a física pausada.
 */
export class ArremessoLixao {
  private readonly cena: CenaFase3;
  private readonly teclaPegar?: Phaser.Input.Keyboard.Key;
  private readonly trajetoria: Phaser.GameObjects.Graphics;
  private readonly textoPegar: Phaser.GameObjects.Text;
  private readonly projeteis: Projetil[] = [];
  private naMao: TipoReciclavel | null = null;
  private imgMao?: Phaser.GameObjects.Image;
  /** Momento do último clique esquerdo ainda não usado. */
  private cliqueEm = -Infinity;
  /** Chamado quando o item na mão muda (HUD). */
  public aoMudarItem?: (tipo: TipoReciclavel | null) => void;

  constructor(cena: CenaFase3) {
    this.cena = cena;
    this.teclaPegar = cena.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F, false);
    cena.input.on(Phaser.Input.Events.POINTER_DOWN, (ponteiro: Phaser.Input.Pointer) => {
      if (ponteiro.leftButtonDown()) this.cliqueEm = cena.time.now;
    });
    // Acima da escuridão: a mira é interativa e fica visível à noite
    this.trajetoria = cena.add.graphics().setDepth(PROF.escuro + 2);
    this.textoPegar = cena.add
      .text(0, 0, '[F] Pegar', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '16px',
        color: COR.neonCiano,
        backgroundColor: COR.contorno,
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(PROF.textos)
      .setVisible(false);
  }

  get itemNaMao(): TipoReciclavel | null {
    return this.naMao;
  }

  atualizar(delta: number): void {
    this.atualizarPegar();
    this.atualizarMao();
    this.atualizarMira();
    for (let i = this.projeteis.length - 1; i >= 0; i--) {
      if (this.avancar(this.projeteis[i], delta)) this.projeteis.splice(i, 1);
    }
  }

  /** Esconde a mira e o aviso (cena pausada: terminal, morte, fim). */
  esconderMira(): void {
    this.trajetoria.clear();
    this.textoPegar.setVisible(false);
    this.cliqueEm = -Infinity;
  }

  /** Ao morrer: some o que está no ar e a mão volta vazia. */
  reiniciar(): void {
    for (const p of this.projeteis) p.img.destroy();
    this.projeteis.length = 0;
    this.definirMao(null);
    this.esconderMira();
  }

  /* =========================================================================
   * PEGAR E SEGURAR
   * ========================================================================= */

  private atualizarPegar(): void {
    const jogador = this.cena.jogador;
    const perto = this.naMao ? undefined : this.cena.quedas.reciclaveisPerto(jogador.x, jogador.y, ARREMESSO.ALCANCE_PEGAR)[0];
    this.textoPegar.setVisible(!!perto);
    if (!perto) return;
    this.textoPegar.setPosition(perto.x, perto.y - LADO_RECICLAVEL * ESCALA - 12);
    if (this.teclaPegar && Phaser.Input.Keyboard.JustDown(this.teclaPegar)) {
      const tipo = perto.pegar();
      if (tipo) this.definirMao(tipo);
    }
  }

  private definirMao(tipo: TipoReciclavel | null): void {
    this.naMao = tipo;
    this.imgMao?.destroy();
    this.imgMao = tipo
      ? this.cena.add.image(0, 0, `lx-rec-${tipo}`).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.jogador + 1)
      : undefined;
    this.atualizarMao();
    this.aoMudarItem?.(tipo);
  }

  /** Item acima da cabeça, acompanhando o jogador (abaixado, desce junto). */
  private atualizarMao(): void {
    if (!this.imgMao) return;
    const { x, y } = this.pontoMao();
    this.imgMao.setPosition(grade(x), grade(y));
  }

  /** Onde fica a base do item na mão, que é também a origem do arremesso. */
  private pontoMao(): { x: number; y: number } {
    const corpo = this.cena.jogador.corpo;
    return { x: corpo.center.x, y: corpo.top - ARREMESSO.ACIMA_CABECA };
  }

  /* =========================================================================
   * MIRA E ARREMESSO
   * ========================================================================= */

  /** Velocidade inicial na direção do ponteiro, em coordenadas do mundo. */
  private velocidadeMira(tipo: TipoReciclavel): { x: number; y: number; vx: number; vy: number } {
    const ponteiro = this.cena.input.activePointer;
    ponteiro.updateWorldPoint(this.cena.cameras.main);
    const mao = this.pontoMao();
    const origem = { x: mao.x, y: mao.y - (LADO_RECICLAVEL * ESCALA) / 2 };
    const angulo = Math.atan2(ponteiro.worldY - origem.y, ponteiro.worldX - origem.x);
    const v = velocidadeDe(tipo);
    return { ...origem, vx: Math.cos(angulo) * v, vy: Math.sin(angulo) * v };
  }

  private atualizarMira(): void {
    this.trajetoria.clear();
    const tipo = this.naMao;
    if (!tipo) return;
    const mira = this.velocidadeMira(tipo);

    if (this.cena.time.now - this.cliqueEm <= ARREMESSO.VALIDADE_CLIQUE_MS) {
      this.cliqueEm = -Infinity;
      this.arremessar(tipo, mira);
      return;
    }

    // Pontos da trajetória, um pixel de arte cada, até bater num sólido
    const g = gravidadeDe(tipo);
    for (let t = ARREMESSO.TRAJETORIA_PASSO_MS; t <= ARREMESSO.TRAJETORIA_MS; t += ARREMESSO.TRAJETORIA_PASSO_MS) {
      const s = t / 1000;
      const x = mira.x + mira.vx * s;
      const y = mira.y + mira.vy * s + (g * s * s) / 2;
      if (this.solidoEm(x, y)) break;
      // Os pontos somem aos poucos no fim da trajetória
      this.trajetoria.fillStyle(hexNum(COR.neonCiano), 0.9 - (0.6 * t) / ARREMESSO.TRAJETORIA_MS);
      this.trajetoria.fillRect(grade(x) - ESCALA / 2, grade(y) - ESCALA / 2, ESCALA, ESCALA);
    }
  }

  private arremessar(tipo: TipoReciclavel, mira: { x: number; y: number; vx: number; vy: number }): void {
    const img = this.cena.add.image(mira.x, mira.y, `lx-rec-${tipo}`).setScale(ESCALA).setDepth(PROF.jogador + 1);
    this.projeteis.push({ tipo, img, x: mira.x, y: mira.y, vx: mira.vx, vy: mira.vy, gravidade: gravidadeDe(tipo), tempo: 0 });
    this.definirMao(null);
    this.trajetoria.clear();
    const dados: DadosArremesso = { x: mira.x, y: mira.y, tipo };
    this.cena.events.emit(EVENTO_ARREMESSO, dados);
  }

  /** Avança um item no ar; devolve true quando ele bate ou sai do mundo. */
  private avancar(p: Projetil, delta: number): boolean {
    const s = delta / 1000;
    p.tempo += delta;
    p.vy += p.gravidade * s;
    p.x += p.vx * s;
    p.y += p.vy * s;

    const giro = GIRO[p.tipo];
    p.img.setPosition(grade(p.x), grade(p.y)).setAngle((giro.grausPorSegundo * p.tempo) / 1000);
    if (giro.capota) p.img.setScale(ESCALA * Math.max(0.25, Math.abs(Math.cos(p.tempo / 90))), ESCALA);

    // [DRONE] [CHEFÃO] acertar drones e o Monstro de Sucata entra aqui, antes dos sólidos
    const larguraMundo = this.cena.physics.world.bounds.width;
    if (p.y > ALTURA_TELA + 40 || p.x < 0 || p.x > larguraMundo) {
      p.img.destroy();
      return true;
    }
    if (!this.solidoEm(p.x, p.y)) return false;

    // Recua até a borda do sólido para o impacto não acontecer dentro dele
    const passos = 6;
    for (let i = 0; i < passos && this.solidoEm(p.x, p.y); i++) {
      p.x -= (p.vx * s) / passos;
      p.y -= (p.vy * s) / passos;
    }
    p.img.destroy();
    this.impacto(p.tipo, grade(p.x), grade(p.y), p.vx);
    return true;
  }

  private solidoEm(x: number, y: number): boolean {
    for (const obj of this.cena.solidos.getChildren()) {
      const corpo = (obj as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody | null;
      if (corpo && x >= corpo.left && x <= corpo.right && y >= corpo.top && y <= corpo.bottom) return true;
    }
    return false;
  }

  /* =========================================================================
   * IMPACTO
   * ========================================================================= */

  /** Animação de impacto própria de cada tipo e o evento para o som. */
  private impacto(tipo: TipoReciclavel, x: number, y: number, vx: number): void {
    const dados: DadosArremesso = { x, y, tipo };
    this.cena.events.emit(EVENTO_IMPACTO, dados);
    const lado = vx >= 0 ? -1 : 1;
    switch (tipo) {
      case 'lata': {
        // Quica para trás amassada e some
        const img = this.cena.add.image(x, y, 'lx-rec-lata').setScale(ESCALA, ESCALA * 0.75).setDepth(PROF.objetos + 1);
        this.cena.tweens.add({ targets: img, x: x + lado * 48, duration: 500, ease: 'Linear' });
        this.cena.tweens.add({ targets: img, y: y - 36, duration: 220, ease: 'Quad.easeOut', yoyo: true });
        this.cena.tweens.add({ targets: img, angle: lado * 360, alpha: 0, duration: 500, delay: 100 });
        this.cena.time.delayedCall(520, () => img.destroy());
        this.estilhacos(x, y, [COR.sucataClara, COR.sucata], 3, 40, lado);
        break;
      }
      case 'placa':
        // Racha em lascas verdes e pedaços de trilha de cobre
        this.estilhacos(x, y, [COR.verdePlaca, COR.verdePlacaClaro, COR.cobre], 8, 64, lado);
        break;
      case 'monitor': {
        // Tubo de imagem estoura: clarão curto e cacos de vidro e carcaça
        const clarao = this.cena.add.rectangle(x, y, 14 * ESCALA, 10 * ESCALA, hexNum(COR.luz)).setDepth(PROF.escuro + 1).setAlpha(0.8);
        this.cena.tweens.add({ targets: clarao, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 160, onComplete: () => clarao.destroy() });
        this.estilhacos(x, y, [COR.sucataClara, COR.sombraSucata, COR.luz], 12, 80, lado);
        this.cena.cameras.main.shake(100, 0.003);
        break;
      }
      case 'bateria':
        // Curto-circuito: faíscas amarelas rápidas acima da escuridão
        this.estilhacos(x, y, [COR.bateriaAmarela, COR.cobreClaro, COR.luz], 10, 96, lado, PROF.escuro + 1, 220);
        break;
    }
  }

  /** Pedaços de um pixel de arte espirrando de (x, y), puxados para o lado `lado`. */
  private estilhacos(
    x: number,
    y: number,
    cores: readonly string[],
    quantidade: number,
    alcance: number,
    lado: number,
    profundidade: number = PROF.objetos + 1,
    duracao = 420
  ): void {
    for (let i = 0; i < quantidade; i++) {
      const cor = cores[i % cores.length];
      const caco = this.cena.add.rectangle(x, y, ESCALA, ESCALA, hexNum(cor)).setDepth(profundidade);
      // Leque para cima, mais aberto para o lado de onde o item veio
      const angulo = -Math.PI / 2 + lado * (Math.PI / 3) * Math.random() + (Math.random() - 0.5) * 1.6;
      const d = alcance * (0.4 + Math.random() * 0.6);
      this.cena.tweens.add({
        targets: caco,
        x: grade(x + Math.cos(angulo) * d),
        y: grade(y + Math.sin(angulo) * d * 0.6 + alcance * 0.5),
        alpha: 0,
        duration: duracao * (0.7 + Math.random() * 0.6),
        ease: 'Quad.easeOut',
        onComplete: () => caco.destroy(),
      });
    }
  }
}

/* =========================================================================
 * SPRITES
 * ========================================================================= */

/** Desenho de cada reciclável em 8x8; `borda` é o contorno (vermelho enquanto cai da pilha). */
const DESENHO_RECICLAVEL: Record<TipoReciclavel, (p: Pincel, borda: string) => void> = {
  lata: (p, borda) => {
    p.caixa(1, 1, 6, 7, COR.sucataClara, borda);
    p.px(2, 1, 4, 1, COR.sucata);
    p.px(2, 4, 4, 2, COR.cobre);
    p.ponto(2, 4, COR.cobreClaro);
    // Amassado
    p.ponto(5, 2, COR.sucata);
  },
  placa: (p, borda) => {
    p.caixa(0, 2, 8, 5, COR.verdePlaca, borda);
    p.px(1, 3, 6, 1, COR.verdePlacaClaro);
    p.linha(2, 5, 5, 5, COR.cobre);
    p.ponto(6, 5, COR.cobreClaro);
  },
  monitor: (p, borda) => {
    p.caixa(0, 0, 8, 7, COR.sucataClara, borda);
    p.px(2, 2, 4, 3, COR.sombraSucata);
    p.ponto(2, 2, COR.sucataClara);
    p.px(3, 7, 2, 1, borda);
  },
  bateria: (p, borda) => {
    p.px(3, 0, 2, 1, COR.cobreClaro);
    p.caixa(1, 1, 6, 7, COR.sombraSucata, borda);
    p.px(2, 3, 4, 2, COR.cobre);
    p.ponto(2, 2, COR.sucataClara);
  },
};

/** Texturas dos recicláveis: `lx-rec-<tipo>` (contorno escuro) e `lx-rec-<tipo>-perigo` (caindo). */
export function gerarTexturasReciclaveis(cena: Phaser.Scene): void {
  for (const tipo of TIPOS_RECICLAVEIS) {
    texturaPixel(cena, `lx-rec-${tipo}`, LADO_RECICLAVEL, LADO_RECICLAVEL, (p) => DESENHO_RECICLAVEL[tipo](p, COR.contorno));
    texturaPixel(cena, `lx-rec-${tipo}-perigo`, LADO_RECICLAVEL, LADO_RECICLAVEL, (p) => DESENHO_RECICLAVEL[tipo](p, COR.perigo));
  }
}
