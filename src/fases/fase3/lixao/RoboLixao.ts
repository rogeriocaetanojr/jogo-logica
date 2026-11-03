import Phaser from 'phaser';
import type { CenaFase3 } from '../CenaFase3';
import { PROF } from '../trechos/TrechoLixao';
import { COR, ESCALA, grade, texturaPixel } from './ArteLixao';
import type { Pincel } from './ArteLixao';
import type { Reciclavel } from './QuedasLixao';
import { CHAO_Y, TIPOS_RECICLAVEIS, TRECHOS } from './TiposLixao';
import type { TipoReciclavel } from './TiposLixao';

/** Eventos da cena para o som: bipe ao recolher lixo e ao entregar um item ao jogador. */
export const EVENTO_RECICLA_RECOLHE = 'lixao-recicla-recolhe';
export const EVENTO_RECICLA_ENTREGA = 'lixao-recicla-entrega';

/**
 * Faixa de patrulha do Recicla por trecho, em x relativo ao trecho: chão plano sem blocos
 * nem buracos (passa por baixo dos canos). null: o trecho não tem Recicla. Na arena ele só
 * entra no final, para comemorar (etapa do chefão).
 */
export const PATRULHA_RECICLA: readonly (readonly [number, number] | null)[] = [
  [3440, 4180],
  [3380, 3640],
  [1590, 1880],
  null,
];

export const RECICLA = {
  /** Velocidade da patrulha e de quando vai buscar lixo (px/s). */
  VELOCIDADE: 50,
  VELOCIDADE_BUSCA: 90,
  /** Só recolhe lixo parado no chão há pelo menos este tempo. */
  IDADE_MINIMA_LIXO_MS: 3000,
  /** Duração da animação de recolher. */
  RECOLHER_MS: 600,
  /** Distância até o jogador para entregar um item. */
  ALCANCE_ENTREGA: 120,
  /** Parado virado para o jogador antes de soltar o item na mão dele. */
  ENTREGAR_MS: 500,
  /** Espera entre uma entrega e a próxima. */
  RECARGA_ENTREGA_MS: 8000,
  /** Longe do jogador ele não avança (fica parado fora da tela). */
  ALCANCE_ATIVO: 1400,
  /** Intervalo entre os quadros da esteira andando. */
  QUADRO_MS: 160,
} as const;

/** Sprite em pixels de arte: cabe no vão de 72 px das passagens baixas. */
const RECICLA_W = 12;
const RECICLA_H = 14;

type Estado = 'patrulha' | 'buscando' | 'recolhendo' | 'entregando';

interface Robo {
  trecho: number;
  min: number;
  max: number;
  corpo: Phaser.GameObjects.Image;
  olhos: Phaser.GameObjects.Image;
  estado: Estado;
  x: number;
  direcao: number;
  tempo: number;
  /** Tempo andando, para alternar os quadros da esteira. */
  passo: number;
  recarga: number;
  alvo?: Reciclavel;
  /** Itens recolhidos, entregues ao jogador antes de sortear um novo. */
  carga: TipoReciclavel[];
}

/**
 * Recicla, o robô reciclador do lixão. Patrulha uma faixa de chão nos três primeiros trechos,
 * vai até o lixo temporário (das pilhas e dos drones) parado há algum tempo e o recolhe;
 * nunca pega os recicláveis fixos do caminho. Com o jogador perto e de mão vazia, entrega um
 * item: o que recolheu ou, sem carga, um sorteado. É imune a tudo: perigos o atravessam e
 * um reciclável arremessado só quica nele.
 *
 * Só avança em `atualizar`, que a cena não chama com o terminal aberto.
 */
export class RoboLixao {
  private readonly cena: CenaFase3;
  private readonly robos: Robo[] = [];

  constructor(cena: CenaFase3) {
    this.cena = cena;
  }

  /** Cria texturas e robôs (chamar depois de montar os trechos). */
  construir(): void {
    this.gerarTexturas();
    this.cena.trechos.forEach((trecho, i) => {
      const faixa = PATRULHA_RECICLA[i];
      if (!faixa) return;
      const [a, b] = faixa;
      if (!trecho.chaoLivre(a, 0) || !trecho.chaoLivre(b, 0)) console.warn(`Patrulha do Recicla no trecho ${i + 1} fora do chão livre.`);
      const corpo = this.cena.add.image(0, 0, 'lx-recicla-0').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.objetos + 1);
      this.cena.cenario.registrarTingivel(corpo);
      // Olhos ciano acima do véu: na névoa e à noite são o farol do Recicla
      const olhos = this.cena.add.image(0, 0, 'lx-recicla-olhos').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.escuro + 1);
      this.cena.cenario.clima.registrarLuz(olhos);
      const robo: Robo = {
        trecho: i,
        min: grade(trecho.offset + a),
        max: grade(trecho.offset + b),
        corpo,
        olhos,
        estado: 'patrulha',
        x: 0,
        direcao: 1,
        tempo: 0,
        passo: 0,
        recarga: 0,
        carga: [],
      };
      this.reposicionar(robo);
      this.robos.push(robo);
    });
  }

  /** Ao morrer: cada robô volta ao meio da faixa, sem carga e pronto para entregar. */
  reiniciar(): void {
    for (const r of this.robos) this.reposicionar(r);
  }

  /** Reciclável em voo em (x, y) acerta um robô? Ele só balança; o item faz o próprio impacto. */
  atingir(x: number, y: number): boolean {
    const meioW = (RECICLA_W * ESCALA) / 2;
    const alvo = this.robos.find((r) => Math.abs(x - r.x) <= meioW && y <= CHAO_Y && y >= CHAO_Y - RECICLA_H * ESCALA);
    if (!alvo) return false;
    this.cena.tweens.add({ targets: [alvo.corpo, alvo.olhos], angle: { from: -8, to: 0 }, duration: 240, ease: 'Back.easeOut' });
    return true;
  }

  /** Depuração: o robô do trecho atual vai até o jogador (depois volta andando à faixa). */
  trazerAteJogador(trecho: number): void {
    const robo = this.robos.find((r) => r.trecho === trecho);
    if (!robo) return;
    robo.x = grade(this.cena.jogador.x + 80);
    robo.estado = 'patrulha';
    robo.alvo = undefined;
    robo.recarga = 0;
    this.desenhar(robo);
  }

  atualizar(delta: number): void {
    const jogador = this.cena.jogador;
    for (const r of this.robos) {
      if (Math.abs(r.x - jogador.x) > RECICLA.ALCANCE_ATIVO) continue;
      r.recarga = Math.max(0, r.recarga - delta);
      r.tempo += delta;
      switch (r.estado) {
        case 'patrulha':
          this.patrulhar(r, delta);
          break;
        case 'buscando':
          this.buscar(r, delta);
          break;
        case 'recolhendo':
          if (r.tempo >= RECICLA.RECOLHER_MS) this.terminarRecolher(r);
          break;
        case 'entregando':
          if (r.tempo >= RECICLA.ENTREGAR_MS) this.entregar(r);
          break;
      }
      this.desenhar(r);
    }
  }

  /* =========================================================================
   * COMPORTAMENTO
   * ========================================================================= */

  private mudar(r: Robo, estado: Estado): void {
    r.estado = estado;
    r.tempo = 0;
  }

  /** Anda de um lado a outro da faixa; para quando pode entregar ou vê lixo para recolher. */
  private patrulhar(r: Robo, delta: number): void {
    if (this.podeEntregar(r)) {
      this.mudar(r, 'entregando');
      return;
    }
    const lixo = this.lixoNaFaixa(r);
    if (lixo) {
      r.alvo = lixo;
      this.mudar(r, 'buscando');
      return;
    }
    // Fora da faixa (atalho de depuração): volta para ela
    if (r.x < r.min) r.direcao = 1;
    else if (r.x > r.max) r.direcao = -1;
    this.andar(r, RECICLA.VELOCIDADE, delta);
    if (r.x >= r.max && r.direcao > 0) r.direcao = -1;
    else if (r.x <= r.min && r.direcao < 0) r.direcao = 1;
  }

  private buscar(r: Robo, delta: number): void {
    const alvo = r.alvo;
    if (!alvo || !alvo.disponivel) {
      r.alvo = undefined;
      this.mudar(r, 'patrulha');
      return;
    }
    if (this.podeEntregar(r)) {
      this.mudar(r, 'entregando');
      return;
    }
    const dx = alvo.x - r.x;
    r.direcao = dx >= 0 ? 1 : -1;
    const passo = (RECICLA.VELOCIDADE_BUSCA * delta) / 1000;
    if (Math.abs(dx) <= passo) {
      r.x = alvo.x;
      this.mudar(r, 'recolhendo');
      return;
    }
    this.andar(r, RECICLA.VELOCIDADE_BUSCA, delta);
  }

  private terminarRecolher(r: Robo): void {
    const tipo = r.alvo?.pegar() ?? null;
    r.alvo = undefined;
    if (tipo) {
      r.carga.push(tipo);
      this.cena.events.emit(EVENTO_RECICLA_RECOLHE, { x: r.x, y: CHAO_Y, tipo });
    }
    this.mudar(r, 'patrulha');
  }

  /** Solta na mão do jogador o primeiro item da carga ou, sem carga, um sorteado. */
  private entregar(r: Robo): void {
    this.mudar(r, 'patrulha');
    const tipo = r.carga[0] ?? TIPOS_RECICLAVEIS[Math.floor(Math.random() * TIPOS_RECICLAVEIS.length)];
    if (!this.cena.arremesso.receber(tipo)) return;
    if (r.carga.length > 0) r.carga.shift();
    r.recarga = RECICLA.RECARGA_ENTREGA_MS;
    this.cena.events.emit(EVENTO_RECICLA_ENTREGA, { x: r.x, y: CHAO_Y, tipo });
  }

  private podeEntregar(r: Robo): boolean {
    const jogador = this.cena.jogador;
    if (r.recarga > 0 || this.cena.arremesso.itemNaMao) return false;
    if (Math.abs(jogador.x - r.x) > RECICLA.ALCANCE_ENTREGA || Math.abs(jogador.y - CHAO_Y) > RECICLA.ALCANCE_ENTREGA) return false;
    r.direcao = jogador.x >= r.x ? 1 : -1;
    return true;
  }

  /** Lixo temporário dentro da faixa, parado há tempo suficiente, do mais perto ao mais longe. */
  private lixoNaFaixa(r: Robo): Reciclavel | undefined {
    return this.cena.quedas.disponiveis
      .filter((l) => l.temporario && l.idade >= RECICLA.IDADE_MINIMA_LIXO_MS && l.x >= r.min && l.x <= r.max)
      .sort((a, b) => Math.abs(a.x - r.x) - Math.abs(b.x - r.x))[0];
  }

  private andar(r: Robo, velocidade: number, delta: number): void {
    r.x += (r.direcao * velocidade * delta) / 1000;
    r.passo += delta;
  }

  private reposicionar(r: Robo): void {
    r.x = grade((r.min + r.max) / 2);
    r.direcao = 1;
    r.estado = 'patrulha';
    r.tempo = 0;
    r.passo = 0;
    r.recarga = 0;
    r.alvo = undefined;
    r.carga.length = 0;
    this.desenhar(r);
  }

  /** Posição, quadro e sentido do sprite; os olhos acompanham o corpo. */
  private desenhar(r: Robo): void {
    const x = grade(r.x);
    let quadro = 'lx-recicla-0';
    if (r.estado === 'recolhendo') quadro = 'lx-recicla-pega';
    else if (r.estado === 'patrulha' || r.estado === 'buscando') quadro = Math.floor(r.passo / RECICLA.QUADRO_MS) % 2 === 0 ? 'lx-recicla-0' : 'lx-recicla-1';
    const virado = r.direcao < 0;
    r.corpo.setTexture(quadro).setPosition(x, CHAO_Y).setFlipX(virado);
    // Ao entregar, os olhos sobem um pixel (contente)
    const yOlhos = CHAO_Y - (r.estado === 'entregando' ? ESCALA : 0);
    r.olhos.setPosition(x, yOlhos).setFlipX(virado);
    // Farol só onde a visibilidade é ruim
    const clima = TRECHOS[r.trecho].clima;
    r.olhos.setAlpha(clima === 'nevoa' || clima === 'noite' ? 1 : 0.85);
  }

  /* =========================================================================
   * SPRITES
   * ========================================================================= */

  private gerarTexturas(): void {
    texturaPixel(this.cena, 'lx-recicla-0', RECICLA_W, RECICLA_H, (p) => desenharRecicla(p, 0, false));
    texturaPixel(this.cena, 'lx-recicla-1', RECICLA_W, RECICLA_H, (p) => desenharRecicla(p, 1, false));
    texturaPixel(this.cena, 'lx-recicla-pega', RECICLA_W, RECICLA_H, (p) => desenharRecicla(p, 0, true));
    // Só os olhos, na mesma moldura do corpo, para ficarem acima da escuridão
    texturaPixel(this.cena, 'lx-recicla-olhos', RECICLA_W, RECICLA_H, (p) => {
      p.px(4, 2, 2, 2, COR.neonCiano);
      p.px(7, 2, 2, 2, COR.neonCiano);
    });
  }
}

/**
 * Recicla em 12x14, olhando para a direita: cabeça de caixa com visor, corpo de caçamba
 * de cobre e esteira. `quadro` desloca os dentes da esteira; `pegando` baixa a garra.
 */
function desenharRecicla(p: Pincel, quadro: number, pegando: boolean): void {
  // Cabeça e visor (os olhos ciano ficam em textura própria)
  p.caixa(3, 0, 7, 5, COR.sucataClara);
  p.px(4, 2, 5, 2, COR.sombraSucata);
  p.px(6, 5, 1, 1, COR.contorno);
  // Caçamba de cobre com o símbolo de reciclagem em três setas
  p.caixa(1, 6, 10, 5, COR.cobre);
  p.px(2, 7, 8, 1, COR.cobreClaro);
  p.ponto(5, 8, COR.verdePlacaClaro);
  p.ponto(4, 9, COR.verdePlacaClaro);
  p.ponto(6, 9, COR.verdePlacaClaro);
  // Garra: estendida à frente, ou baixada até o chão ao recolher
  if (pegando) {
    p.px(10, 8, 1, 5, COR.sucataClara);
    p.px(10, 13, 2, 1, COR.contorno);
  } else {
    p.px(11, 7, 1, 2, COR.sucataClara);
    p.ponto(11, 9, COR.contorno);
  }
  // Esteira com dentes que alternam a cada quadro
  p.caixa(0, 11, 11, 3, COR.sombraSucata);
  for (let x = 1 + quadro; x < 10; x += 2) p.ponto(x, 12, COR.sucataClara);
}
