import Phaser from 'phaser';
import { COR, ESCALA, texturaPixel } from './ArteLixao';
import { VIDA_MAXIMA } from './TiposLixao';
import type { TipoReciclavel } from './TiposLixao';

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
/** Moldura do item na mão, em pixels de arte, logo depois da última bateria. */
const LADO_MOLDURA = 12;
const ESPACO_MOLDURA = 4;

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
 * HUD da Fase 3, fixa na câmera: a vida numa fileira de pilhas que descarregam com o dano
 * (verde, amarelo e, por fim, vermelho), a moldura com o ícone do item na mão e, com um item
 * na mão, o aviso "[Clique] Arremessar".
 */
export class HudLixao {
  private readonly pilhas: Phaser.GameObjects.Image[] = [];
  private readonly icone: Phaser.GameObjects.Image;
  private readonly avisoArremesso: Phaser.GameObjects.Text;

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

    // Moldura do item: centrada na altura das pilhas, vazia até pegar algo
    texturaPixel(cena, 'lx-hud-moldura', LADO_MOLDURA, LADO_MOLDURA, (p) => p.caixa(0, 0, LADO_MOLDURA, LADO_MOLDURA, COR.sombraSucata));
    const xMoldura = POSICAO.x + (VIDA_MAXIMA * (LARGURA_PILHA + ESPACO) + ESPACO_MOLDURA) * ESCALA;
    const centro = { x: xMoldura + (LADO_MOLDURA * ESCALA) / 2, y: POSICAO.y + (ALTURA_PILHA * ESCALA) / 2 };
    cena.add
      .image(centro.x, centro.y, 'lx-hud-moldura')
      .setScale(ESCALA)
      .setScrollFactor(0)
      .setDepth(PROFUNDIDADE);
    this.icone = cena.add
      .image(centro.x, centro.y, '__DEFAULT')
      .setScale(ESCALA)
      .setScrollFactor(0)
      .setDepth(PROFUNDIDADE)
      .setVisible(false);
    this.avisoArremesso = cena.add
      .text(POSICAO.x, centro.y + ((LADO_MOLDURA / 2) * ESCALA) + 8, '[Clique] Arremessar', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        color: COR.neonCiano,
        backgroundColor: COR.contorno,
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0)
      .setDepth(PROFUNDIDADE)
      .setVisible(false);
  }

  /** Ícone do item na mão (lx-rec-<tipo>, ver ArremessoLixao); null esvazia a moldura. */
  atualizarItem(tipo: TipoReciclavel | null): void {
    this.icone.setVisible(tipo !== null);
    if (tipo) this.icone.setTexture(`lx-rec-${tipo}`);
    this.avisoArremesso.setVisible(tipo !== null);
  }

  /** Mostra `vida` pilhas carregadas; a cor delas indica quanto resta. */
  atualizarVida(vida: number): void {
    const fracao = vida / VIDA_MAXIMA;
    const cor: Carga = fracao > 0.6 ? 'verde' : fracao > 0.2 ? 'amarela' : 'vermelha';
    this.pilhas.forEach((pilha, i) => pilha.setTexture(`lx-bateria-${i < vida ? cor : 'vazia'}`));
  }
}
