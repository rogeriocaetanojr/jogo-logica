import Phaser from 'phaser';
import { COR, ESCALA, hexNum, texturaPixel } from './ArteLixao';
import { LARGURA_TELA, TRECHOS, VIDA_MAXIMA } from './TiposLixao';
import type { Clima, TipoReciclavel } from './TiposLixao';

/** Carga da bateria da HUD: a cor dos segmentos cheios indica quanto resta. */
type Carga = 'verde' | 'amarela' | 'vermelha';

const CORES_CARGA: Record<Carga, string> = {
  verde: COR.bateriaVerde,
  amarela: COR.bateriaAmarela,
  vermelha: COR.perigo,
};

/**
 * Bateria única e fina, em pixels de arte: casco de 1 px com polo à direita e um segmento
 * de carga por vida. Segmento de SEG_W x SEG_H com 1 px de folga entre eles.
 */
const SEG_W = 4;
const SEG_H = 3;
const SEG_FOLGA = 1;
const CASCO_W = 2 + VIDA_MAXIMA * (SEG_W + SEG_FOLGA) + 1;
const CASCO_H = SEG_H + 4;
/** Canto superior esquerdo, abaixo do HUD do setor (CenaBase). */
const POSICAO = { x: 20, y: 48 } as const;
const PROFUNDIDADE = 9998;
/** Moldura do item na mão, em pixels de arte, logo depois da bateria. */
const LADO_MOLDURA = 9;
const ESPACO_MOLDURA = 4;
/** Ícone do clima, em pixels de arte, e margem direita da HUD. */
const LADO_CLIMA = 9;
const MARGEM_DIREITA = 20;

const FONTE = 'Consolas, "Courier New", monospace';

/** Casco da bateria: contorno claro de 1 px, sombra de 1 px embaixo e polo positivo. */
function desenharCasco(cena: Phaser.Scene): string {
  return texturaPixel(cena, 'lx-hud-bateria', CASCO_W + 2, CASCO_H + 1, (p) => {
    // Sombra deslocada 1 px para baixo, para ler sobre qualquer fundo
    p.px(1, 1, CASCO_W, CASCO_H, COR.contorno);
    p.px(CASCO_W + 1, 3, 1, CASCO_H - 4, COR.contorno);
    // Casco vazado
    p.px(0, 0, CASCO_W, 1, COR.luz);
    p.px(0, CASCO_H - 1, CASCO_W, 1, COR.luz);
    p.px(0, 0, 1, CASCO_H, COR.luz);
    p.px(CASCO_W - 1, 0, 1, CASCO_H, COR.luz);
    p.px(1, 1, CASCO_W - 2, CASCO_H - 2, COR.contorno);
    // Polo
    p.px(CASCO_W, 2, 1, CASCO_H - 4, COR.luz);
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
 * HUD da Fase 3, fixa na câmera. Esquerda: a vida numa bateria fina com um segmento por vida, que descarrega com
 * o dano (verde, amarelo e, por fim, vermelho) e a moldura com o ícone do item na mão.
 * Direita: ícone e nome do clima e o medidor "Lixão limpo". Contextuais: "[J] ou [Clique]
 * Arremessar" com item na mão e avisos curtos como "Checkpoint salvo".
 */
export class HudLixao {
  private readonly cena: Phaser.Scene;
  private readonly segmentos: Phaser.GameObjects.Rectangle[] = [];
  private vidaMostrada = VIDA_MAXIMA;
  private readonly icone: Phaser.GameObjects.Image;
  private readonly avisoArremesso: Phaser.GameObjects.Text;
  private readonly iconeClima: Phaser.GameObjects.Image;
  private readonly textoClima: Phaser.GameObjects.Text;
  private readonly textoLimpo: Phaser.GameObjects.Text;
  private readonly aviso: Phaser.GameObjects.Text;
  private temporizadorAviso?: Phaser.Time.TimerEvent;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;

    // Faixa superior como na Fase 2: nome da fase à esquerda e atalho à direita, sem fundo
    const topo = (x: number, texto: string, cor: string) =>
      this.fixo(
        cena.add.text(x, 14, texto, { fontFamily: FONTE, fontSize: '13px', color: cor, fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 })
      );
    topo(16, 'FASE 3  ·  LIXÃO ABANDONADO', '#C8C2B4');
    topo(LARGURA_TELA - 16, '[ESC] HUB', COR.neonCiano).setOrigin(1, 0);
    this.fixo(cena.add.image(POSICAO.x, POSICAO.y, desenharCasco(cena)).setOrigin(0, 0).setScale(ESCALA).setAlpha(0.9));
    for (let i = 0; i < VIDA_MAXIMA; i++) {
      const x = POSICAO.x + (2 + i * (SEG_W + SEG_FOLGA)) * ESCALA;
      this.segmentos.push(
        this.fixo(cena.add.rectangle(x, POSICAO.y + 2 * ESCALA, SEG_W * ESCALA, SEG_H * ESCALA, hexNum(COR.bateriaVerde)).setOrigin(0, 0))
      );
    }

    // Moldura do item: só um contorno fino, centrada na altura da bateria
    texturaPixel(cena, 'lx-hud-moldura', LADO_MOLDURA, LADO_MOLDURA, (p) => {
      p.px(0, 0, LADO_MOLDURA, 1, COR.luz);
      p.px(0, LADO_MOLDURA - 1, LADO_MOLDURA, 1, COR.luz);
      p.px(0, 0, 1, LADO_MOLDURA, COR.luz);
      p.px(LADO_MOLDURA - 1, 0, 1, LADO_MOLDURA, COR.luz);
    });
    const xMoldura = POSICAO.x + (CASCO_W + 1 + ESPACO_MOLDURA) * ESCALA;
    const centro = { x: xMoldura + (LADO_MOLDURA * ESCALA) / 2, y: POSICAO.y + (CASCO_H * ESCALA) / 2 };
    this.fixo(cena.add.image(centro.x, centro.y, 'lx-hud-moldura').setScale(ESCALA).setAlpha(0.5));
    // Ícone um pouco menor que a escala do mundo para caber com folga na moldura fina
    this.icone = this.fixo(cena.add.image(centro.x, centro.y, '__DEFAULT').setScale(ESCALA - 1).setVisible(false));
    this.avisoArremesso = this.fixo(
      cena.add.text(POSICAO.x, centro.y + (LADO_MOLDURA / 2) * ESCALA + 8, '[J] ou [Clique] Arremessar', this.estilo(COR.neonCiano, '14px')).setVisible(false)
    );

    // Direita: clima (ícone + nome) e o medidor de limpeza logo abaixo
    (['sol', 'nevoa', 'chuva', 'noite'] as const).forEach((c) => desenharClima(cena, c));
    this.textoClima = this.fixo(
      cena.add.text(LARGURA_TELA - MARGEM_DIREITA, 44, '', this.estilo(COR.ceuPoeiraClaro, '13px', { x: 8, y: 4 })).setOrigin(1, 0)
    );
    this.iconeClima = this.fixo(cena.add.image(0, 0, 'lx-hud-clima-sol').setOrigin(1, 0.5).setScale(ESCALA));
    this.textoLimpo = this.fixo(
      cena.add.text(LARGURA_TELA - MARGEM_DIREITA, 44 + 30, '', this.estilo(COR.bateriaVerde, '13px', { x: 8, y: 4 })).setOrigin(1, 0)
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

  /**
   * Acende `vida` segmentos na cor da carga restante. O segmento perdido pisca branco e
   * apaga; o recuperado acende com um brilho rápido.
   */
  atualizarVida(vida: number): void {
    const fracao = vida / VIDA_MAXIMA;
    const carga: Carga = fracao > 0.6 ? 'verde' : fracao > 0.2 ? 'amarela' : 'vermelha';
    const cor = hexNum(CORES_CARGA[carga]);
    const antes = this.vidaMostrada;
    this.vidaMostrada = vida;
    this.segmentos.forEach((seg, i) => {
      this.cena.tweens.killTweensOf(seg);
      seg.setFillStyle(cor).setScale(1);
      const cheio = i < vida;
      if (!cheio && i < antes) {
        // Perdido agora: flash branco e some
        seg.setFillStyle(hexNum(COR.luz)).setAlpha(1);
        this.cena.tweens.add({ targets: seg, alpha: 0, duration: 450, ease: 'Quad.easeIn' });
      } else if (cheio && i >= antes) {
        seg.setAlpha(0);
        this.cena.tweens.add({ targets: seg, alpha: 1, duration: 250 });
      } else seg.setAlpha(cheio ? 1 : 0);
    });
    // Última carga: pulsa devagar para chamar atenção sem poluir
    if (vida === 1) {
      this.cena.tweens.add({ targets: this.segmentos[0], alpha: 0.35, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
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
