/**
 * Janela "Tem certeza que deseja voltar ao Hub?", aberta pelo ESC nas fases (ver CenaBase).
 *
 * Confirma com Enter, S ou clique no botão de voltar. ESC (ou o botão de continuar) fecha a
 * janela sem fazer nada. Enquanto aberta, captura o teclado antes do jogo, para nenhuma tecla
 * mexer no personagem por trás dela.
 */
export class ConfirmacaoSaida {
  private raiz?: HTMLDivElement;
  private aoConfirmar?: () => void;
  private aoCancelar?: () => void;

  get aberta(): boolean {
    return !!this.raiz;
  }

  abrir(aoConfirmar: () => void, aoCancelar: () => void): void {
    if (this.raiz) return;
    this.aoConfirmar = aoConfirmar;
    this.aoCancelar = aoCancelar;

    const raiz = document.createElement('div');
    raiz.id = 'confirmacao-saida';
    raiz.innerHTML = `
      <div class="confirmacao-caixa" role="dialog" aria-modal="true" aria-labelledby="confirmacao-titulo">
        <div class="confirmacao-cabecalho">&gt; SISTEMA // SAIR DO SETOR</div>
        <p id="confirmacao-titulo" class="confirmacao-pergunta">Tem certeza que deseja voltar ao Hub?</p>
        <div class="confirmacao-botoes">
          <button type="button" class="confirmacao-sim">[ENTER / S] Voltar ao Hub</button>
          <button type="button" class="confirmacao-nao">[ESC] Continuar jogando</button>
        </div>
      </div>`;
    raiz.querySelector('.confirmacao-sim')?.addEventListener('click', () => this.confirmar());
    raiz.querySelector('.confirmacao-nao')?.addEventListener('click', () => this.cancelar());
    (document.getElementById('game-container') ?? document.body).appendChild(raiz);
    this.raiz = raiz;
    window.addEventListener('keydown', this.aoTeclar, true);
    window.addEventListener('keyup', this.engolir, true);
  }

  /** Fecha sem chamar nada (cena encerrando). */
  fechar(): void {
    window.removeEventListener('keydown', this.aoTeclar, true);
    window.removeEventListener('keyup', this.engolir, true);
    this.raiz?.remove();
    this.raiz = undefined;
  }

  private confirmar(): void {
    const acao = this.aoConfirmar;
    this.fechar();
    acao?.();
  }

  private cancelar(): void {
    const acao = this.aoCancelar;
    this.fechar();
    acao?.();
  }

  private aoTeclar = (e: KeyboardEvent): void => {
    this.engolir(e);
    if (e.repeat) return;
    if (e.key === 'Escape') this.cancelar();
    else if (e.key === 'Enter' || e.key === 's' || e.key === 'S') this.confirmar();
  };

  /** Nenhuma tecla chega ao jogo (nem ao terminal) com a janela aberta. */
  private engolir = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
}
