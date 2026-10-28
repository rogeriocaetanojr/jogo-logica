import Phaser from 'phaser';
import type { ColunaVento, ConfigColunaVento, ParametrosEscadaVento } from './tiposFase1';
import { TOTEM_4_SEQUENCIADOR, VENTO_FASE1 } from './constantesFase1';

/**
 * Lê os parâmetros da escada de rajadas vindos do interpretador
 * (objeto ou JSON em string), ignorando campos ausentes ou inválidos.
 */
export function lerParametrosEscada(valor: unknown): Partial<ParametrosEscadaVento> {
  let bruto: unknown = valor;
  if (typeof valor === 'string') {
    try {
      bruto = JSON.parse(valor);
    } catch {
      return {};
    }
  }
  if (typeof bruto !== 'object' || bruto === null) return {};

  const v = bruto as { intervalo?: unknown; forca?: unknown };
  const parametros: Partial<ParametrosEscadaVento> = {};
  if (typeof v.intervalo === 'number' && !isNaN(v.intervalo)) {
    parametros.intervalo = v.intervalo;
  }
  if (typeof v.forca === 'number' && !isNaN(v.forca)) {
    parametros.forca = v.forca;
  }
  return parametros;
}

/**
 * Colunas de vento ascensional da Fase 1: criação, partículas, renderização
 * e o ciclo da escada de rajadas (Desafio 4), que liga uma coluna por vez.
 */
export class VentoFase1 {
  public readonly colunas: ColunaVento[] = [];
  public intervaloEscadaSegundos: number = TOTEM_4_SEQUENCIADOR.PERIODO_PADRAO_MS / 1000;
  public forcaEscadaPixels: number = TOTEM_4_SEQUENCIADOR.FORCA_PADRAO;

  private cena: Phaser.Scene;
  private colunasEscada: ColunaVento[] = [];
  private escadaAtiva: boolean = false;
  private tempoCicloEscada: number = 0;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
  }

  public criarColuna(cfg: ConfigColunaVento): ColunaVento {
    const grafico = this.cena.add.graphics();
    grafico.setDepth(VENTO_FASE1.PROFUNDIDADE_GRAFICO);

    const particulas: ColunaVento['particulas'] = [];
    for (let i = 0; i < VENTO_FASE1.PARTICULAS_QUANTIDADE; i++) {
      particulas.push({
        x: this.sortearXParticula(cfg.x, cfg.largura),
        y: cfg.y - cfg.altura / 2 + Math.random() * cfg.altura,
        velY:
          VENTO_FASE1.PARTICULAS_VEL_Y_MIN +
          Math.random() * (VENTO_FASE1.PARTICULAS_VEL_Y_MAX - VENTO_FASE1.PARTICULAS_VEL_Y_MIN),
        alfa:
          VENTO_FASE1.PARTICULAS_ALFA_MIN +
          Math.random() * (VENTO_FASE1.PARTICULAS_ALFA_MAX - VENTO_FASE1.PARTICULAS_ALFA_MIN),
      });
    }

    const coluna: ColunaVento = { ...cfg, grafico, particulas };
    this.colunas.push(coluna);
    return coluna;
  }

  /**
   * Registra as colunas que formam a escada de rajadas, em ordem crescente.
   */
  public definirEscada(colunas: ColunaVento[]): void {
    this.colunasEscada = colunas;
  }

  /**
   * Retorna a primeira coluna ativa que contém o ponto, se houver.
   */
  public colunaAtivaEm(x: number, y: number): ColunaVento | undefined {
    return this.colunas.find((col) => {
      if (!col.ativa) return false;
      const metadeL = col.largura / 2;
      const metadeA = col.altura / 2;
      return (
        x >= col.x - metadeL && x <= col.x + metadeL && y >= col.y - metadeA && y <= col.y + metadeA
      );
    });
  }

  /**
   * Liga a escada de rajadas aplicando o intervalo e a força digitados no terminal.
   */
  public ativarEscada(parametros: Partial<ParametrosEscadaVento>): void {
    if (parametros.intervalo !== undefined) this.intervaloEscadaSegundos = parametros.intervalo;
    if (parametros.forca !== undefined) this.forcaEscadaPixels = parametros.forca;

    for (const col of this.colunasEscada) {
      col.forca = this.forcaEscadaPixels;
    }

    this.escadaAtiva = true;
    this.tempoCicloEscada = 0;
  }

  public update(delta: number): void {
    this.renderizarColunas(delta);
    this.atualizarCicloEscada(delta);
  }

  private renderizarColunas(delta: number): void {
    const dt = delta / 1000;

    for (const col of this.colunas) {
      col.grafico.clear();
      if (!col.ativa) continue;

      const metadeL = col.largura / 2;
      const topoY = col.y - col.altura / 2;
      const baseColY = col.y + col.altura / 2;

      col.grafico.fillStyle(VENTO_FASE1.COR_FUNDO_COLUNA, VENTO_FASE1.ALFA_FUNDO_COLUNA);
      col.grafico.fillRect(col.x - metadeL, topoY, col.largura, col.altura);

      col.grafico.lineStyle(
        VENTO_FASE1.ESPESSURA_BORDA_COLUNA,
        VENTO_FASE1.COR_BORDA_COLUNA,
        VENTO_FASE1.ALFA_BORDA_COLUNA
      );
      col.grafico.lineBetween(col.x - metadeL, topoY, col.x - metadeL, baseColY);
      col.grafico.lineBetween(col.x + metadeL, topoY, col.x + metadeL, baseColY);

      col.grafico.fillStyle(0xffffff, 0.7);
      for (const p of col.particulas) {
        p.y -= p.velY * dt;
        if (p.y < topoY) {
          p.y = baseColY;
          p.x = this.sortearXParticula(col.x, col.largura);
        }
        col.grafico.fillRect(p.x, p.y, VENTO_FASE1.LARGURA_PARTICULA, VENTO_FASE1.ALTURA_PARTICULA);
      }
    }
  }

  private atualizarCicloEscada(delta: number): void {
    if (!this.escadaAtiva || this.colunasEscada.length === 0) return;

    this.tempoCicloEscada += delta;
    const periodoMs = this.intervaloEscadaSegundos * 1000;
    const tempoNoCiclo = this.tempoCicloEscada % (periodoMs * this.colunasEscada.length);
    const colunaAtivaIndex = Math.floor(tempoNoCiclo / periodoMs);

    for (let i = 0; i < this.colunasEscada.length; i++) {
      this.colunasEscada[i].ativa = i === colunaAtivaIndex;
    }
  }

  private sortearXParticula(centroX: number, largura: number): number {
    const padding = VENTO_FASE1.PADDING_PARTICULAS_X;
    return centroX - largura / 2 + padding + Math.random() * (largura - padding * 2);
  }
}
