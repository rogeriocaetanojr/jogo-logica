/** Chave do navegador em que fica a escolha de som ligado/desligado, valendo para o hub e para a Fase 1. */
export const CHAVE_MUDO = 'som-mudo';

const VOLUME_HUB = 0.15;
const FADE_ENTRADA_S = 2;
const PASSO_MS = 50;

export function lerMudoSalvo(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_MUDO) === '1' || window.localStorage.getItem('fase1-mudo') === '1';
  } catch {
    return false;
  }
}

export function salvarMudo(mudo: boolean): void {
  try {
    window.localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0');
    window.localStorage.setItem('fase1-mudo', mudo ? '1' : '0');
  } catch {
    // Navegador sem armazenamento: a escolha vale só nesta visita
  }
}

/**
 * Música de fundo do Hub (hub.mp3), em laço e com fade de entrada e saída.
 * Toca com HTMLAudioElement (streaming) e faz o fade por temporizador próprio, sem depender de
 * tweens da cena: a cena do Hub mata os tweens ao trocar de fase.
 */
export class MusicaHub {
  private readonly elemento: HTMLAudioElement;
  private temporizador?: number;
  private destruida: boolean = false;
  private aguardandoGesto: boolean = false;

  constructor() {
    this.elemento = new Audio(`${import.meta.env.BASE_URL}assets/hub/musica/hub.mp3`);
    this.elemento.loop = true;
    this.elemento.preload = 'auto';
    this.elemento.volume = 0;
    this.elemento.muted = lerMudoSalvo();
    document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
  }

  public get mudo(): boolean {
    return this.elemento.muted;
  }

  public iniciar(): void {
    this.fadeAte(VOLUME_HUB, FADE_ENTRADA_S);
    this.tocar();
  }

  public definirMudo(mudo: boolean): void {
    this.elemento.muted = mudo;
    salvarMudo(mudo);
  }

  /** Estado para testes e depuração. */
  public descrever(): { tocando: boolean; volume: number; mudo: boolean; tempo: number } {
    return {
      tocando: !this.elemento.paused,
      volume: +this.elemento.volume.toFixed(3),
      mudo: this.elemento.muted,
      tempo: +this.elemento.currentTime.toFixed(1),
    };
  }

  /** Sai da cena: a música apaga devagar e para, mesmo que a cena já tenha sido destruída. */
  public parar(fadeSegundos: number = 0.6): void {
    if (this.destruida) return;
    this.destruida = true;
    document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
    document.removeEventListener('keydown', this.tentarDeNovo);
    document.removeEventListener('pointerdown', this.tentarDeNovo);
    this.fadeAte(0, fadeSegundos, () => {
      try {
        this.elemento.pause();
        this.elemento.removeAttribute('src');
        this.elemento.load();
      } catch {
        // Elemento já liberado
      }
    });
  }

  // ---------------------------------------------------------------------------

  private fadeAte(alvo: number, segundos: number, aoTerminar?: () => void): void {
    window.clearInterval(this.temporizador);
    const passo = (PASSO_MS / 1000 / Math.max(0.05, segundos)) * Math.max(VOLUME_HUB, 0.01);
    this.temporizador = window.setInterval(() => {
      const atual = this.elemento.volume;
      const proximo = atual < alvo ? Math.min(alvo, atual + passo) : Math.max(alvo, atual - passo);
      this.elemento.volume = Math.min(1, Math.max(0, proximo));
      if (proximo === alvo) {
        window.clearInterval(this.temporizador);
        aoTerminar?.();
      }
    }, PASSO_MS);
  }

  private tocar(): void {
    const promessa = this.elemento.play();
    // O navegador pode barrar o som até o primeiro toque do jogador: tenta de novo no próximo gesto
    promessa?.catch(() => {
      if (this.aguardandoGesto || this.destruida) return;
      this.aguardandoGesto = true;
      document.addEventListener('keydown', this.tentarDeNovo);
      document.addEventListener('pointerdown', this.tentarDeNovo);
    });
  }

  private tentarDeNovo = (): void => {
    this.aguardandoGesto = false;
    document.removeEventListener('keydown', this.tentarDeNovo);
    document.removeEventListener('pointerdown', this.tentarDeNovo);
    if (!this.destruida && this.elemento.paused) this.elemento.play()?.catch(() => { });
  };

  /** Aba em segundo plano: a música pausa junto com o jogo. */
  private aoMudarVisibilidade = (): void => {
    if (this.destruida) return;
    if (document.hidden) this.elemento.pause();
    else this.elemento.play()?.catch(() => { });
  };
}
