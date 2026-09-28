import type { LinhaDialogo } from './tipos';

/**
 * Sistema de rádio / comunicador rebelde em overlay DOM com efeito de máquina de escrever.
 */
export class Comunicador {
  private overlay: HTMLElement | null = null;
  private elementoFalante: HTMLElement | null = null;
  private elementoTexto: HTMLElement | null = null;
  private elementoAvatar: HTMLElement | null = null;

  private filaLinhas: LinhaDialogo[] = [];
  private linhaAtual: LinhaDialogo | null = null;
  private estaDigitando: boolean = false;
  private timerDigitacao: number | null = null;
  private indiceCaractere: number = 0;
  private callbackConclusao?: () => void;

  public ativo: boolean = false;

  constructor() {
    this.overlay = document.getElementById('dialog-overlay');
    this.elementoFalante = document.getElementById('dialog-speaker');
    this.elementoTexto = document.getElementById('dialog-text');
    this.elementoAvatar = document.getElementById('dialog-avatar');

    window.addEventListener('keydown', this.tratarTeclaPressionada, true);
  }

  public get estaAtivo(): boolean {
    return this.ativo;
  }

  /**
   * Inicia uma transmissão de diálogos rebeldes.
   */
  public iniciarDialogo(linhas: LinhaDialogo[], aoConcluir?: () => void): void {
    if (!linhas || linhas.length === 0) {
      if (aoConcluir) aoConcluir();
      return;
    }

    this.filaLinhas = [...linhas];
    this.callbackConclusao = aoConcluir;
    this.ativo = true;

    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }

    this.exibirProximaLinha();
  }

  private exibirProximaLinha(): void {
    if (this.filaLinhas.length === 0) {
      this.finalizarDialogo();
      return;
    }

    this.linhaAtual = this.filaLinhas.shift()!;

    if (this.elementoFalante) {
      this.elementoFalante.textContent = this.linhaAtual.falante;
    }

    if (this.elementoAvatar) {
      if (this.linhaAtual.avatar) {
        this.elementoAvatar.innerHTML = this.linhaAtual.avatar;
      } else {
        this.elementoAvatar.innerHTML =
          '<span class="avatar-line">[ T-0 ]</span><span class="avatar-line">[ REC ]</span>';
      }
    }

    if (this.elementoTexto) {
      this.elementoTexto.textContent = '';
    }

    this.indiceCaractere = 0;
    this.estaDigitando = true;
    this.digitarProximoCaractere();
  }

  private digitarProximoCaractere = (): void => {
    if (!this.linhaAtual || !this.elementoTexto || !this.estaDigitando) return;

    if (this.indiceCaractere < this.linhaAtual.texto.length) {
      this.elementoTexto.textContent += this.linhaAtual.texto.charAt(this.indiceCaractere);
      this.indiceCaractere++;
      this.timerDigitacao = window.setTimeout(this.digitarProximoCaractere, 25);
    } else {
      this.completarDigitacao();
    }
  };

  private completarDigitacao(): void {
    if (this.timerDigitacao !== null) {
      clearTimeout(this.timerDigitacao);
      this.timerDigitacao = null;
    }
    if (this.linhaAtual && this.elementoTexto) {
      this.elementoTexto.textContent = this.linhaAtual.texto;
    }
    this.estaDigitando = false;
  }

  /**
   * Avança para a próxima fala ou conclui instantaneamente a digitação da frase em andamento.
   */
  public avancar(): void {
    if (!this.ativo) return;

    if (this.estaDigitando) {
      this.completarDigitacao();
    } else {
      this.exibirProximaLinha();
    }
  }

  public finalizarDialogo(): void {
    this.ativo = false;
    this.estaDigitando = false;

    if (this.timerDigitacao !== null) {
      clearTimeout(this.timerDigitacao);
      this.timerDigitacao = null;
    }

    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }

    if (this.callbackConclusao) {
      const cb = this.callbackConclusao;
      this.callbackConclusao = undefined;
      cb();
    }
  }

  private tratarTeclaPressionada = (e: KeyboardEvent): void => {
    if (!this.ativo) return;

    if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.avancar();
    }
  };

  public destruir(): void {
    window.removeEventListener('keydown', this.tratarTeclaPressionada, true);
    if (this.timerDigitacao !== null) {
      clearTimeout(this.timerDigitacao);
    }
  }
}
