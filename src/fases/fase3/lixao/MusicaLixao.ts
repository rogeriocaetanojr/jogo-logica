import Phaser from 'phaser';
import { lerMudoSalvo } from '../../../hub/MusicaHub';

type Faixa = 'lixao' | 'monstro';

/** Volume de cada faixa (0 a 1), abaixo dos efeitos, e tempos dos fades (s). */
const MUSICA = {
  VOLUME_LIXAO: 0.2,
  VOLUME_MONSTRO: 0.22,
  /** Derrotado o monstro, a trilha fica baixa até o contêiner; ao compactar, apaga. */
  VOLUME_DERROTA: 0.08,
  FADE_ENTRADA_S: 2.5,
  FADE_SAIDA_S: 0.8,
  /** Entrada na arena: a trilha do lixão cede devagar e a do monstro entra em seguida. */
  FADE_LIXAO_CEDE_S: 2.2,
  FADE_MONSTRO_ENTRA_S: 1.6,
  FADE_DERROTA_S: 1.5,
  FADE_VITORIA_S: 2.5,
} as const;

interface Estado {
  elemento: HTMLAudioElement;
  alvo: number;
  atual: number;
  duracaoFade: number;
}

/**
 * Trilha da Fase 3: lixao.mp3 no caminho todo e monstroSucata.mp3 na luta contra o Monstro de
 * Sucata, ambas em laço. Toca por HTMLAudioElement (streaming), com fades próprios. Os volumes
 * andam em `atualizar`, chamado a cada quadro pela cena; o mudo segue o salvo do jogo.
 */
export class MusicaLixao {
  private readonly faixas: Record<Faixa, Estado>;
  private destruida = false;
  private aguardandoGesto = false;
  private readonly cena: Phaser.Scene;
  private readonly aoAtualizarCena = (_t: number, delta: number): void => this.atualizar(delta);

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    const mudo = lerMudoSalvo();
    const criar = (arquivo: string): Estado => {
      const elemento = new Audio(`${import.meta.env.BASE_URL}assets/fase3/musica/${arquivo}`);
      elemento.loop = true;
      elemento.preload = 'auto';
      elemento.volume = 0;
      elemento.muted = mudo;
      return { elemento, alvo: 0, atual: 0, duracaoFade: MUSICA.FADE_ENTRADA_S };
    };
    this.faixas = { lixao: criar('lixao.mp3'), monstro: criar('monstroSucata.mp3') };
    document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
    cena.events.on(Phaser.Scenes.Events.UPDATE, this.aoAtualizarCena);
  }

  /** Começa a trilha do lixão com fade de entrada. */
  iniciar(): void {
    this.tocar('lixao', MUSICA.VOLUME_LIXAO, MUSICA.FADE_ENTRADA_S);
  }

  /** O monstro acordou: o lixão cede e a trilha da luta começa do zero. */
  iniciarLuta(): void {
    const monstro = this.faixas.monstro.elemento;
    if (monstro.paused) monstro.currentTime = 0;
    this.definirAlvo('lixao', 0, MUSICA.FADE_LIXAO_CEDE_S);
    this.tocar('monstro', MUSICA.VOLUME_MONSTRO, MUSICA.FADE_MONSTRO_ENTRA_S);
  }

  /** Monstro derrotado: a luta fica baixa enquanto o jogador o empurra até o contêiner. */
  aoDerrotar(): void {
    this.definirAlvo('monstro', MUSICA.VOLUME_DERROTA, MUSICA.FADE_DERROTA_S);
  }

  /** Compactado: a trilha da luta apaga e o fim da fase fica em silêncio dos instrumentos. */
  aoVencer(): void {
    this.definirAlvo('monstro', 0, MUSICA.FADE_VITORIA_S);
  }

  /** Sai de cena: apaga rápido e libera o áudio. */
  parar(): void {
    for (const f of Object.values(this.faixas)) {
      f.alvo = 0;
      f.duracaoFade = MUSICA.FADE_SAIDA_S;
    }
    window.setTimeout(() => this.destruir(), MUSICA.FADE_SAIDA_S * 1000 + 100);
  }

  /** Estado para testes e depuração. */
  descrever(): Record<Faixa, { tocando: boolean; volume: number; tempo: number }> {
    const ler = (f: Estado) => ({ tocando: !f.elemento.paused, volume: +f.elemento.volume.toFixed(3), tempo: +f.elemento.currentTime.toFixed(1) });
    return { lixao: ler(this.faixas.lixao), monstro: ler(this.faixas.monstro) };
  }

  private atualizar(deltaMs: number): void {
    if (this.destruida) return;
    for (const f of Object.values(this.faixas)) {
      const passo = deltaMs / 1000 / Math.max(0.05, f.duracaoFade);
      f.atual += Math.min(passo, Math.max(-passo, f.alvo - f.atual));
      f.elemento.volume = Math.min(1, Math.max(0, f.atual));
      // Faixa em silêncio total para de gastar processamento
      if (f.alvo === 0 && f.atual <= 0.001 && !f.elemento.paused) f.elemento.pause();
    }
  }

  private definirAlvo(nome: Faixa, alvo: number, duracaoFade: number): void {
    this.faixas[nome].alvo = alvo;
    this.faixas[nome].duracaoFade = duracaoFade;
  }

  private tocar(nome: Faixa, alvo: number, duracaoFade: number): void {
    const f = this.faixas[nome];
    this.definirAlvo(nome, alvo, duracaoFade);
    if (!f.elemento.paused) return;
    // O navegador pode barrar o som até o primeiro toque do jogador: tenta de novo no próximo gesto
    f.elemento.play()?.catch(() => {
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
    for (const f of Object.values(this.faixas)) {
      if (f.alvo > 0 && f.elemento.paused) f.elemento.play()?.catch(() => {});
    }
  };

  /** Aba em segundo plano: a trilha pausa junto com o jogo. */
  private aoMudarVisibilidade = (): void => {
    if (this.destruida) return;
    for (const f of Object.values(this.faixas)) {
      if (document.hidden) f.elemento.pause();
      else if (f.alvo > 0) f.elemento.play()?.catch(() => {});
    }
  };

  private destruir(): void {
    this.destruida = true;
    this.cena.events.off(Phaser.Scenes.Events.UPDATE, this.aoAtualizarCena);
    document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
    document.removeEventListener('keydown', this.tentarDeNovo);
    document.removeEventListener('pointerdown', this.tentarDeNovo);
    for (const f of Object.values(this.faixas)) {
      try {
        f.elemento.pause();
        f.elemento.removeAttribute('src');
        f.elemento.load();
      } catch {
        // Elemento já liberado
      }
    }
  }
}
