import Phaser from 'phaser';
import { FINAL_FASE_FINAL } from '../constantesFaseFinal';
import { type LinhaCredito, TEXTOS_FINAL } from '../DialogosFaseFinal';

const C = FINAL_FASE_FINAL.CREDITOS;
const FONTE = 'Consolas, Courier New, monospace';

interface EstiloCredito {
  tamanho: number;
  cor: string;
  negrito?: boolean;
  italico?: boolean;
  /** Espaço depois da linha. */
  respiro: number;
}

const ESTILOS: Record<LinhaCredito['tipo'], EstiloCredito> = {
  titulo: { tamanho: 56, cor: '#ffd36b', negrito: true, respiro: 10 },
  subtitulo: { tamanho: 18, cor: '#22e5ff', respiro: 20 },
  secao: { tamanho: 20, cor: '#ff2bd6', negrito: true, respiro: 14 },
  nome: { tamanho: 20, cor: '#eef0ff', respiro: 10 },
  piada: { tamanho: 17, cor: '#ffd27a', italico: true, respiro: 10 },
  espaco: { tamanho: 0, cor: '', respiro: 56 },
  fim: { tamanho: 72, cor: '#ffffff', negrito: true, respiro: 0 },
};

/**
 * Créditos rolando sobre o amanhecer escurecido. [ESPAÇO] acelera. Ao fim, o "FIM" para no
 * centro, aparece um aviso de atualização do Mega Brain 2.0 (adiado para sempre) e [E]/[ENTER]
 * volta ao hub.
 */
export class CreditosFaseFinal {
  private readonly cena: Phaser.Scene;
  private readonly aoTerminar: () => void;
  private readonly bloco: Phaser.GameObjects.Container;
  private readonly fimY: number;
  private readonly teclaAcelerar?: Phaser.Input.Keyboard.Key;
  private readonly teclasSair: Phaser.Input.Keyboard.Key[] = [];
  private readonly dica: Phaser.GameObjects.Text;
  private rolando: boolean = true;
  private podeSair: boolean = false;
  private saiu: boolean = false;

  constructor(cena: Phaser.Scene, linhas: LinhaCredito[], aoTerminar: () => void) {
    this.cena = cena;
    this.aoTerminar = aoTerminar;
    const w = cena.scale.width;
    const h = cena.scale.height;
    const escuro = cena.add.rectangle(0, 0, w, h, 0x05050c).setOrigin(0).setScrollFactor(0).setDepth(10000).setAlpha(0);
    cena.tweens.add({ targets: escuro, alpha: C.ESCURECER, duration: 1400 });

    this.bloco = cena.add.container(w / 2, h + 30).setScrollFactor(0).setDepth(10001);
    let y = 0;
    let fimY = 0;
    for (const linha of linhas) {
      const e = ESTILOS[linha.tipo];
      if (linha.tipo !== 'espaco' && linha.texto) {
        const estilo = [e.negrito ? 'bold' : '', e.italico ? 'italic' : ''].join(' ').trim();
        const t = cena.add
          .text(0, y, linha.texto, {
            fontFamily: FONTE,
            fontSize: `${e.tamanho}px`,
            fontStyle: estilo || 'normal',
            color: e.cor,
            align: 'center',
            stroke: '#05050c',
            strokeThickness: linha.tipo === 'titulo' || linha.tipo === 'fim' ? 6 : 3,
            wordWrap: { width: 860 },
          })
          .setOrigin(0.5, 0);
        this.bloco.add(t);
        if (linha.tipo === 'fim') fimY = y + t.height / 2;
        y += t.height;
      }
      y += e.respiro;
    }
    this.fimY = fimY;

    this.dica = cena.add
      .text(w - 20, h - 64, TEXTOS_FINAL.ACELERAR, { fontFamily: FONTE, fontSize: '12px', color: '#9aa0c8' })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(10003)
      .setAlpha(0.8);

    const teclado = cena.input.keyboard;
    if (teclado) {
      this.teclaAcelerar = teclado.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.teclasSair = [
        teclado.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        teclado.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      ];
    }
  }

  public get terminouDeRolar(): boolean {
    return !this.rolando;
  }

  public update(delta: number): void {
    if (this.rolando) {
      const rapido = this.teclaAcelerar?.isDown ?? false;
      this.bloco.y -= ((rapido ? C.VELOCIDADE_RAPIDA : C.VELOCIDADE) * delta) / 1000;
      const centro = this.cena.scale.height / 2;
      if (this.bloco.y + this.fimY <= centro) {
        this.bloco.y = centro - this.fimY;
        this.rolando = false;
        this.dica.setVisible(false);
        this.cena.time.delayedCall(C.PAUSA_FIM_MS, () => this.avisoDeAtualizacao());
      }
      return;
    }
    if (this.podeSair && !this.saiu && this.teclasSair.some((t) => Phaser.Input.Keyboard.JustDown(t))) {
      this.saiu = true;
      this.aoTerminar();
    }
  }

  /** Cena pós-créditos: a notificação de atualização que ninguém pediu. */
  private avisoDeAtualizacao(): void {
    const cena = this.cena;
    const largura = 440;
    const altura = 150;
    const x = cena.scale.width - largura - 30;
    const y = cena.scale.height - altura - 80;
    const caixa = cena.add.container(x + 40, y).setScrollFactor(0).setDepth(10004).setAlpha(0);
    const fundo = cena.add.rectangle(0, 0, largura, altura, 0x0e1230).setOrigin(0).setStrokeStyle(2, 0xff2bd6);
    const titulo = cena.add.text(14, 10, TEXTOS_FINAL.ATUALIZACAO_TITULO, {
      fontFamily: FONTE,
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ff2bd6',
    });
    const texto = cena.add.text(14, 36, TEXTOS_FINAL.ATUALIZACAO_TEXTO, {
      fontFamily: FONTE,
      fontSize: '13px',
      color: '#eef0ff',
      wordWrap: { width: largura - 28 },
    });
    const [instalar, lembrar] = TEXTOS_FINAL.ATUALIZACAO_BOTOES.map((rotulo, i) =>
      cena.add.text(14 + i * 190, altura - 34, rotulo, {
        fontFamily: FONTE,
        fontSize: '13px',
        color: i === 0 ? '#22e5ff' : '#9aa0c8',
        backgroundColor: '#05050c',
        padding: { x: 6, y: 4 },
      })
    );
    caixa.add([fundo, titulo, texto, instalar, lembrar]);
    cena.tweens.add({ targets: caixa, x, alpha: 1, duration: 350, ease: 'Back.easeOut' });

    // "Clica" sozinho em lembrar mais tarde
    cena.time.delayedCall(C.ATUALIZACAO_MS, () => {
      lembrar.setColor('#05050c').setBackgroundColor('#ffd36b');
      cena.time.delayedCall(450, () => {
        instalar.setVisible(false);
        lembrar.setVisible(false);
        texto.setText(TEXTOS_FINAL.ATUALIZACAO_ADIADA);
        cena.tweens.add({
          targets: caixa,
          alpha: 0,
          delay: 1300,
          duration: 500,
          onComplete: () => {
            caixa.destroy();
            this.mostrarVoltar();
          },
        });
      });
    });
  }

  private mostrarVoltar(): void {
    const cena = this.cena;
    const voltar = cena.add
      .text(cena.scale.width / 2, cena.scale.height - 110, TEXTOS_FINAL.VOLTAR, {
        fontFamily: FONTE,
        fontSize: '16px',
        color: '#22e5ff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);
    cena.tweens.add({ targets: voltar, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    this.podeSair = true;
  }
}
