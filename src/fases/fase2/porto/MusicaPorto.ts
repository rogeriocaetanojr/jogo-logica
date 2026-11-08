import { lerMudoSalvo } from '../../../hub/MusicaHub';

const VOLUME_PORTO = 0.2;
const FADE_ENTRADA_S = 2.5;
const FADE_SAIDA_S = 0.8;
const PASSO_MS = 50;

/**
 * Trilha da Fase 2 (portoTheme.mp3), em laço.
 *
 * A cena do porto reinicia a cada troca de área (scene.restart), então a música não pode morrer
 * junto com ela: é um singleton do módulo. `iniciar` é idempotente e `parar` só apaga a trilha se
 * nenhuma cena nova pedir `iniciar` logo em seguida (o caso do restart).
 */
class MusicaPortoImpl {
  private elemento?: HTMLAudioElement;
  private temporizador?: number;
  private aguardandoGesto = false;

  public iniciar(): void {
    if (!this.elemento) {
      this.elemento = new Audio(`${import.meta.env.BASE_URL}assets/fase2/musica/portoTheme.mp3`);
      this.elemento.loop = true;
      this.elemento.preload = 'auto';
      this.elemento.volume = 0;
      document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
    }
    this.elemento.muted = lerMudoSalvo();
    this.fadeAte(VOLUME_PORTO, FADE_ENTRADA_S);
    this.tocar();
  }

  /** Saiu da fase: a música apaga devagar e libera o áudio. Cancelada se a cena reiniciar. */
  public parar(): void {
    const elemento = this.elemento;
    if (!elemento) return;
    this.fadeAte(0, FADE_SAIDA_S, () => {
      if (this.elemento !== elemento) return;
      document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
      document.removeEventListener('keydown', this.tentarDeNovo);
      document.removeEventListener('pointerdown', this.tentarDeNovo);
      this.aguardandoGesto = false;
      try {
        elemento.pause();
        elemento.removeAttribute('src');
        elemento.load();
      } catch {
        // Elemento já liberado
      }
      this.elemento = undefined;
    });
  }

  /** Estado para testes e depuração. */
  public descrever(): { tocando: boolean; volume: number; tempo: number } | null {
    const e = this.elemento;
    return e ? { tocando: !e.paused, volume: +e.volume.toFixed(3), tempo: +e.currentTime.toFixed(1) } : null;
  }

  private fadeAte(alvo: number, segundos: number, aoTerminar?: () => void): void {
    window.clearInterval(this.temporizador);
    const passo = (PASSO_MS / 1000 / Math.max(0.05, segundos)) * VOLUME_PORTO;
    this.temporizador = window.setInterval(() => {
      const e = this.elemento;
      if (!e) {
        window.clearInterval(this.temporizador);
        return;
      }
      const atual = e.volume;
      const proximo = atual < alvo ? Math.min(alvo, atual + passo) : Math.max(alvo, atual - passo);
      e.volume = Math.min(1, Math.max(0, proximo));
      if (proximo === alvo) {
        window.clearInterval(this.temporizador);
        aoTerminar?.();
      }
    }, PASSO_MS);
  }

  private tocar(): void {
    const promessa = this.elemento?.play();
    // O navegador pode barrar o som até o primeiro toque do jogador: tenta de novo no próximo gesto
    promessa?.catch(() => {
      if (this.aguardandoGesto) return;
      this.aguardandoGesto = true;
      document.addEventListener('keydown', this.tentarDeNovo);
      document.addEventListener('pointerdown', this.tentarDeNovo);
    });
  }

  private tentarDeNovo = (): void => {
    this.aguardandoGesto = false;
    document.removeEventListener('keydown', this.tentarDeNovo);
    document.removeEventListener('pointerdown', this.tentarDeNovo);
    if (this.elemento?.paused) this.elemento.play()?.catch(() => {});
  };

  /** Aba em segundo plano: a música pausa junto com o jogo. */
  private aoMudarVisibilidade = (): void => {
    if (!this.elemento) return;
    if (document.hidden) this.elemento.pause();
    else this.elemento.play()?.catch(() => {});
  };
}

export const MusicaPorto = new MusicaPortoImpl();
