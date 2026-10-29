import Phaser from 'phaser';
import { COR, ESCALA, texturaPixel } from './ArteLixao';
import { VIDA_MAXIMA } from './TiposLixao';

/** Carga de uma bateria na HUD: as cheias mudam de cor conforme a vida restante. */
type Carga = 'verde' | 'amarela' | 'vermelha' | 'vazia';

const CORES_CARGA: Record<Carga, string> = {
  verde: COR.bateriaVerde,
  amarela: COR.bateriaAmarela,
  vermelha: COR.perigo,
  vazia: COR.sombraSucata,
};

/** Tamanho da pilha em pixels de arte e espaço entre elas. */
const LARGURA_PILHA = 12;
const ALTURA_PILHA = 7;
const ESPACO = 2;
/** Canto superior esquerdo, abaixo do HUD do setor (CenaBase). */
const POSICAO = { x: 20, y: 48 } as const;
const PROFUNDIDADE = 9998;

/** Pilha deitada: contorno, polo positivo à direita e carga dentro. */
function desenharPilha(cena: Phaser.Scene, carga: Carga): string {
  return texturaPixel(cena, `lx-bateria-${carga}`, LARGURA_PILHA, ALTURA_PILHA, (p) => {
    p.caixa(0, 0, LARGURA_PILHA - 1, ALTURA_PILHA, CORES_CARGA[carga]);
    p.px(LARGURA_PILHA - 1, 2, 1, ALTURA_PILHA - 4, COR.contorno);
    // Reflexo na parte de cima (só nas carregadas)
    if (carga !== 'vazia') p.px(2, 1, LARGURA_PILHA - 5, 1, COR.luz);
    p.px(1, ALTURA_PILHA - 2, LARGURA_PILHA - 3, 1, COR.contorno);
  });
}

/**
 * HUD da Fase 3. Por enquanto só a vida: uma fileira de pilhas fixas na câmera que
 * descarregam com o dano (verde, amarelo e, por fim, vermelho).
 */
export class HudLixao {
  private readonly pilhas: Phaser.GameObjects.Image[] = [];

  constructor(cena: Phaser.Scene) {
    (['verde', 'amarela', 'vermelha', 'vazia'] as const).forEach((c) => desenharPilha(cena, c));
    for (let i = 0; i < VIDA_MAXIMA; i++) {
      const x = POSICAO.x + i * (LARGURA_PILHA + ESPACO) * ESCALA;
      this.pilhas.push(
        cena.add
          .image(x, POSICAO.y, 'lx-bateria-verde')
          .setOrigin(0, 0)
          .setScale(ESCALA)
          .setScrollFactor(0)
          .setDepth(PROFUNDIDADE)
      );
    }
  }

  /** Mostra `vida` pilhas carregadas; a cor delas indica quanto resta. */
  atualizarVida(vida: number): void {
    const fracao = vida / VIDA_MAXIMA;
    const cor: Carga = fracao > 0.6 ? 'verde' : fracao > 0.2 ? 'amarela' : 'vermelha';
    this.pilhas.forEach((pilha, i) => pilha.setTexture(`lx-bateria-${i < vida ? cor : 'vazia'}`));
  }
}
