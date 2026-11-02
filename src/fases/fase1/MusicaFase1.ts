import { MUSICA_FASE1 } from './constantesFase1';

type FaixaFase1 = 'ceu' | 'helio';

interface Faixa {
  elemento: HTMLAudioElement;
  /** Volume desejado (0 a 1); o volume real anda até ele aos poucos. */
  alvo: number;
  atual: number;
  /** Segundos que o volume leva para ir de 0 a 1 (ou de 1 a 0). */
  duracaoFade: number;
}

/**
 * Trilha sonora da Fase 1: skyTheme no céu e helioTheme na luta contra o Helio, em laço.
 *
 * Toca com HTMLAudioElement (streaming): são duas faixas de ~4 minutos e decodificar tudo em
 * memória custaria mais de 150 MB. Os fades andam por conta própria (não por tween) porque o
 * jogo congela os tweens com o terminal aberto, e é justamente aí que a música deve abaixar.
 */
export class MusicaFase1 {
  private readonly faixas: Record<FaixaFase1, Faixa>;
  private abafada: boolean = false;
  private mudo: boolean = false;
  private destruida: boolean = false;
  private aguardandoGesto: boolean = false;

  constructor() {
    const criar = (arquivo: string): Faixa => {
      const elemento = new Audio(`${import.meta.env.BASE_URL}assets/fase1/musica/${arquivo}`);
      elemento.loop = true;
      elemento.preload = 'auto';
      elemento.volume = 0;
      return { elemento, alvo: 0, atual: 0, duracaoFade: MUSICA_FASE1.FADE_PADRAO_S };
    };
    this.faixas = { ceu: criar('skyTheme.mp3'), helio: criar('helioTheme.mp3') };
    document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
  }

  /** Começa a trilha do céu, com fade de entrada. */
  public iniciar(): void {
    this.tocar('ceu', MUSICA_FASE1.VOLUME_CEU, MUSICA_FASE1.FADE_ENTRADA_S);
  }

  /** O Helio entrou: o céu abafa e a trilha da luta começa do zero. */
  public iniciarLuta(): void {
    this.faixas.helio.elemento.currentTime = 0;
    this.faixas.ceu.alvo = 0;
    this.faixas.ceu.duracaoFade = MUSICA_FASE1.FADE_SAIDA_CEU_S;
    this.tocar('helio', MUSICA_FASE1.VOLUME_HELIO, MUSICA_FASE1.FADE_ENTRADA_LUTA_S);
  }

  /** O Helio caiu de joelhos: a música da luta fica baixa, esperando o comando final. */
  public suspenseDerrota(): void {
    this.definirAlvo('helio', MUSICA_FASE1.VOLUME_SUSPENSE, MUSICA_FASE1.FADE_PADRAO_S);
  }

  /** Helio desligado: a luta cala devagar e o céu volta, mais calmo. */
  public aoVencer(): void {
    this.definirAlvo('helio', 0, MUSICA_FASE1.FADE_VITORIA_S);
    this.tocar('ceu', MUSICA_FASE1.VOLUME_CEU_VITORIA, MUSICA_FASE1.FADE_VITORIA_S);
  }

  /** Terminal ou diálogo aberto: a música fica ao fundo para dar para ler. */
  public definirAbafada(abafada: boolean): void {
    this.abafada = abafada;
  }

  public definirMudo(mudo: boolean): void {
    this.mudo = mudo;
    for (const faixa of Object.values(this.faixas)) faixa.elemento.muted = mudo;
  }

  /** Anda os volumes até o alvo (chamar a cada quadro). */
  public atualizar(deltaMs: number): void {
    if (this.destruida) return;
    for (const faixa of Object.values(this.faixas)) {
      const fator = this.abafada ? MUSICA_FASE1.FATOR_ABAFADO : 1;
      const alvo = faixa.alvo * fator;
      const passo = deltaMs / 1000 / Math.max(0.05, faixa.duracaoFade);
      faixa.atual += limitar(alvo - faixa.atual, -passo, passo);
      faixa.elemento.volume = Math.min(1, Math.max(0, faixa.atual));

      // Faixa em silêncio total para de gastar processamento
      if (faixa.alvo === 0 && faixa.atual <= 0.001 && !faixa.elemento.paused) {
        faixa.elemento.pause();
      }
    }
  }

  public destruir(): void {
    this.destruida = true;
    document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
    document.removeEventListener('keydown', this.tentarDeNovo);
    document.removeEventListener('pointerdown', this.tentarDeNovo);
    for (const faixa of Object.values(this.faixas)) {
      try {
        faixa.elemento.pause();
        faixa.elemento.removeAttribute('src');
        faixa.elemento.load();
      } catch {
        // Elemento já liberado
      }
    }
  }

  /** Estado para testes e depuração. */
  public descrever(): Record<FaixaFase1, { tocando: boolean; volume: number; tempo: number }> {
    const ler = (f: Faixa) => ({ tocando: !f.elemento.paused, volume: +f.elemento.volume.toFixed(3), tempo: +f.elemento.currentTime.toFixed(1) });
    return { ceu: ler(this.faixas.ceu), helio: ler(this.faixas.helio) };
  }

  // ---------------------------------------------------------------------------

  private definirAlvo(nome: FaixaFase1, alvo: number, duracaoFade: number): void {
    this.faixas[nome].alvo = alvo;
    this.faixas[nome].duracaoFade = duracaoFade;
  }

  private tocar(nome: FaixaFase1, alvo: number, duracaoFade: number): void {
    const faixa = this.faixas[nome];
    this.definirAlvo(nome, alvo, duracaoFade);
    faixa.elemento.muted = this.mudo;
    if (!faixa.elemento.paused) return;
    const promessa = faixa.elemento.play();
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
    for (const faixa of Object.values(this.faixas)) {
      if (faixa.alvo > 0 && faixa.elemento.paused) faixa.elemento.play()?.catch(() => {});
    }
  };

  /** Aba em segundo plano: a trilha pausa junto com o jogo e volta quando o jogador voltar. */
  private aoMudarVisibilidade = (): void => {
    if (this.destruida) return;
    for (const faixa of Object.values(this.faixas)) {
      if (document.hidden) faixa.elemento.pause();
      else if (faixa.alvo > 0) faixa.elemento.play()?.catch(() => {});
    }
  };
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}
