import Phaser from 'phaser';
import { COR, ESCALA, texturaPixel } from './ArteLixao';
import { LARGURA_TELA, TRECHOS, VIDA_MAXIMA } from './TiposLixao';
import type { Clima, TipoReciclavel } from './TiposLixao';

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
/** Ícone do clima, em pixels de arte, e margem direita da HUD. */
const LADO_CLIMA = 9;
const MARGEM_DIREITA = 20;

const FONTE = 'Consolas, "Courier New", monospace';

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

/** Ícone 9x9 de cada clima: sol com raios, nuvem de poeira, nuvem com gotas, lua. */
function desenharClima(cena: Phaser.Scene, clima: Clima): string {
  return texturaPixel(cena, `lx-hud-clima-${clima}`, LADO_CLIMA, LADO_CLIMA, (p) => {
    switch (clima) {
      case 'sol':
        p.disco(4, 4, 2, COR.bateriaAmarela);
        p.ponto(4, 0, COR.horizonte);
        p.ponto(4, 8, COR.horizonte);
        p.ponto(0, 4, COR.horizonte);
        p.ponto(8, 4, COR.horizonte);
        p.ponto(1, 1, COR.horizonte);
        p.ponto(7, 1, COR.horizonte);
        p.ponto(1, 7, COR.horizonte);
        p.ponto(7, 7, COR.horizonte);
        break;
      case 'nevoa':
        p.px(1, 3, 7, 2, COR.tintaPo);
        p.px(0, 6, 6, 1, COR.ceuPoeira);
        p.px(3, 1, 4, 1, COR.ceuPoeira);
        p.px(6, 8, 3, 1, COR.horizonte);
        break;
      case 'chuva':
        p.px(1, 1, 7, 2, COR.tintaChuva);
        p.px(0, 2, 9, 2, COR.tintaChuva);
        p.px(2, 5, 1, 2, COR.chuvaAzulClaro);
        p.px(4, 6, 1, 2, COR.chuvaAzulClaro);
        p.px(6, 5, 1, 2, COR.chuvaAzulClaro);
        break;
      case 'noite':
        p.disco(4, 4, 3, COR.tintaNoite);
        p.disco(6, 3, 3, COR.contorno);
        p.ponto(1, 1, COR.luz);
        p.ponto(8, 7, COR.luz);
        break;
    }
  });
}

/**
 * HUD da Fase 3, fixa na câmera. Esquerda: a vida numa fileira de pilhas que descarregam com
 * o dano (verde, amarelo e, por fim, vermelho) e a moldura com o ícone do item na mão.
 * Direita: ícone e nome do clima e o medidor "Lixão limpo". Contextuais: "[Clique]
 * Arremessar" com item na mão e avisos curtos como "Checkpoint salvo".
 */
export class HudLixao {
  private readonly cena: Phaser.Scene;
  private readonly pilhas: Phaser.GameObjects.Image[] = [];
  private readonly icone: Phaser.GameObjects.Image;
  private readonly avisoArremesso: Phaser.GameObjects.Text;
  private readonly iconeClima: Phaser.GameObjects.Image;
  private readonly textoClima: Phaser.GameObjects.Text;
  private readonly textoLimpo: Phaser.GameObjects.Text;
  private readonly aviso: Phaser.GameObjects.Text;
  private temporizadorAviso?: Phaser.Time.TimerEvent;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    (['verde', 'amarela', 'vermelha', 'vazia'] as const).forEach((c) => desenharPilha(cena, c));
    for (let i = 0; i < VIDA_MAXIMA; i++) {
      const x = POSICAO.x + i * (LARGURA_PILHA + ESPACO) * ESCALA;
      this.pilhas.push(this.fixo(cena.add.image(x, POSICAO.y, 'lx-bateria-verde').setOrigin(0, 0).setScale(ESCALA)));
    }

    // Moldura do item: centrada na altura das pilhas, vazia até pegar algo
    texturaPixel(cena, 'lx-hud-moldura', LADO_MOLDURA, LADO_MOLDURA, (p) => p.caixa(0, 0, LADO_MOLDURA, LADO_MOLDURA, COR.sombraSucata));
    const xMoldura = POSICAO.x + (VIDA_MAXIMA * (LARGURA_PILHA + ESPACO) + ESPACO_MOLDURA) * ESCALA;
    const centro = { x: xMoldura + (LADO_MOLDURA * ESCALA) / 2, y: POSICAO.y + (ALTURA_PILHA * ESCALA) / 2 };
    this.fixo(cena.add.image(centro.x, centro.y, 'lx-hud-moldura').setScale(ESCALA));
    this.icone = this.fixo(cena.add.image(centro.x, centro.y, '__DEFAULT').setScale(ESCALA).setVisible(false));
    this.avisoArremesso = this.fixo(
      cena.add.text(POSICAO.x, centro.y + (LADO_MOLDURA / 2) * ESCALA + 8, '[Clique] Arremessar', this.estilo(COR.neonCiano, '14px')).setVisible(false)
    );

    // Direita: clima (ícone + nome) e o medidor de limpeza logo abaixo
    (['sol', 'nevoa', 'chuva', 'noite'] as const).forEach((c) => desenharClima(cena, c));
    this.textoClima = this.fixo(
      cena.add.text(LARGURA_TELA - MARGEM_DIREITA, 16, '', this.estilo(COR.ceuPoeiraClaro, '13px', { x: 8, y: 4 })).setOrigin(1, 0)
    );
    this.iconeClima = this.fixo(cena.add.image(0, 0, 'lx-hud-clima-sol').setOrigin(1, 0.5).setScale(ESCALA));
    this.textoLimpo = this.fixo(
      cena.add.text(LARGURA_TELA - MARGEM_DIREITA, 16 + 30, '', this.estilo(COR.bateriaVerde, '13px', { x: 8, y: 4 })).setOrigin(1, 0)
    );
    this.atualizarLimpo(0);

    // Aviso contextual no centro, acima do meio da tela
    this.aviso = this.fixo(
      cena.add.text(LARGURA_TELA / 2, 120, '', this.estilo(COR.neonCiano, '16px', { x: 10, y: 5 })).setOrigin(0.5, 0).setVisible(false)
    );
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

  /** Ícone e nome do clima; `rotulo` substitui o nome (atalho de depuração). */
  atualizarClima(clima: Clima, rotulo?: string): void {
    const nome = rotulo ?? TRECHOS.find((t) => t.clima === clima)?.rotuloClima ?? clima.toUpperCase();
    this.textoClima.setText(nome);
    this.iconeClima.setTexture(`lx-hud-clima-${clima}`);
    const limites = this.textoClima.getBounds();
    this.iconeClima.setPosition(limites.left - 8, limites.centerY);
  }

  /** Medidor "Lixão limpo: X%" (0 a 100). */
  atualizarLimpo(porcentagem: number): void {
    this.textoLimpo.setText(`Lixão limpo: ${Math.round(Phaser.Math.Clamp(porcentagem, 0, 100))}%`);
  }

  /** Aviso curto no centro da tela por `duracaoMs`; um novo aviso substitui o anterior. */
  mostrarAviso(texto: string, duracaoMs: number): void {
    this.temporizadorAviso?.remove(false);
    this.aviso.setText(texto).setVisible(true).setAlpha(1);
    this.temporizadorAviso = this.cena.time.delayedCall(duracaoMs, () => this.aviso.setVisible(false));
  }

  private fixo<T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(obj: T): T {
    return obj.setScrollFactor(0).setDepth(PROFUNDIDADE);
  }

  private estilo(cor: string, tamanho: string, padding = { x: 6, y: 3 }): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: FONTE, fontSize: tamanho, color: cor, backgroundColor: COR.contorno, padding };
  }
}
