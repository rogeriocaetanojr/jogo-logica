import Phaser from 'phaser';
import type {
  ColunaVento,
  ConfigColunaVento,
  ConfigGeiser,
  ConfigZonaVentoContrario,
  OrdemEscada,
  ParametrosEscadaVento,
  ParticulaVentoHorizontal,
  ZonaVentoContrario,
} from './tiposFase1';
import { TOTEM_4_SEQUENCIADOR, VENTO_FASE1 } from './constantesFase1';

interface AreaRetangular {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

interface GeiserVento extends ConfigGeiser {
  grafico: Phaser.GameObjects.Graphics;
  tempoCiclo: number;
  lancouNestaErupcao: boolean;
  bolhas: { x: number; y: number }[];
  jatos: { x: number; y: number; comprimento: number }[];
}

function areaContemPonto(area: AreaRetangular, px: number, py: number): boolean {
  const metadeL = area.largura / 2;
  const metadeA = area.altura / 2;
  return (
    px >= area.x - metadeL && px <= area.x + metadeL && py >= area.y - metadeA && py <= area.y + metadeA
  );
}

function normalizarOrdem(ordem: string): OrdemEscada {
  const texto = ordem.trim().toLowerCase();
  if (texto === 'crescente' || texto === 'decrescente') return texto;
  return 'simultanea';
}

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
 * Ventos da Fase 1:
 * - colunas verticais, que erguem o jogador enquanto ele segura o pulo;
 * - zonas de vento contrário, que o empurram devagar para a esquerda;
 * - gêiseres, que lançam o jogador para cima uma vez a cada erupção;
 * - o ciclo da escada de rajadas (Desafio 4), que liga uma coluna por vez.
 */
export class VentoFase1 {
  public readonly colunas: ColunaVento[] = [];
  public readonly zonasContrarias: ZonaVentoContrario[] = [];
  private readonly geiseres: GeiserVento[] = [];
  public intervaloEscadaSegundos: number = TOTEM_4_SEQUENCIADOR.PERIODO_PADRAO_MS / 1000;
  public forcaEscadaPixels: number = TOTEM_4_SEQUENCIADOR.FORCA_PADRAO;

  private cena: Phaser.Scene;
  private colunasEscada: ColunaVento[] = [];
  private escadaAtiva: boolean = false;
  private tempoCicloEscada: number = 0;
  private ordemEscada: OrdemEscada = 'crescente';

  // Estado salvo enquanto a escada roda uma simulação com valores errados
  private estadoAntesSimulacao?: {
    ativa: boolean;
    intervalo: number;
    forca: number;
    tempoCiclo: number;
    ordem: OrdemEscada;
  };

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

  public criarZonaContraria(cfg: ConfigZonaVentoContrario): ZonaVentoContrario {
    const grafico = this.cena.add.graphics();
    grafico.setDepth(VENTO_FASE1.PROFUNDIDADE_GRAFICO);

    const zona: ZonaVentoContrario = { ...cfg, grafico, particulas: [] };
    for (let i = 0; i < VENTO_FASE1.CONTRARIO.PARTICULAS_QUANTIDADE; i++) {
      zona.particulas.push(this.sortearParticulaHorizontal(zona, true));
    }

    this.zonasContrarias.push(zona);
    return zona;
  }

  public criarGeiser(cfg: ConfigGeiser): void {
    const g = VENTO_FASE1.GEISER;
    const grafico = this.cena.add.graphics();
    grafico.setDepth(VENTO_FASE1.PROFUNDIDADE_GRAFICO);

    const bolhas = Array.from({ length: g.BOLHAS_QUANTIDADE }, () => ({
      x: cfg.x - g.LARGURA_BOCA / 2 + Math.random() * g.LARGURA_BOCA,
      y: cfg.yBase - Math.random() * 80,
    }));
    const jatos = Array.from({ length: g.JATOS_QUANTIDADE }, () => ({
      x: cfg.x - cfg.largura / 2 + Math.random() * cfg.largura,
      y: cfg.yBase - Math.random() * cfg.altura,
      comprimento: 20 + Math.random() * 40,
    }));

    // O ciclo começa logo depois de uma erupção, para a primeira vir com aviso completo
    this.geiseres.push({
      ...cfg,
      grafico,
      tempoCiclo: cfg.duracaoMs + cfg.defasagemMs,
      lancouNestaErupcao: false,
      bolhas,
      jatos,
    });
  }

  /**
   * Se o ponto está num gêiser em erupção que ainda não lançou ninguém nesta erupção,
   * marca o lançamento e devolve a força do impulso. Um impulso por erupção.
   */
  public consumirImpulsoGeiser(x: number, y: number): number | undefined {
    for (const geiser of this.geiseres) {
      if (!this.emErupcao(geiser) || geiser.lancouNestaErupcao) continue;
      const area = {
        x: geiser.x,
        y: geiser.yBase - geiser.altura / 2,
        largura: geiser.largura,
        altura: geiser.altura,
      };
      if (areaContemPonto(area, x, y)) {
        geiser.lancouNestaErupcao = true;
        return geiser.forca;
      }
    }
    return undefined;
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
    return this.colunas.find((col) => col.ativa && areaContemPonto(col, x, y));
  }

  /**
   * Retorna a zona de vento contrário que contém o ponto, se houver.
   */
  public zonaContrariaEm(x: number, y: number): ZonaVentoContrario | undefined {
    return this.zonasContrarias.find((zona) => areaContemPonto(zona, x, y));
  }

  /**
   * Liga a escada de rajadas aplicando o intervalo e a força digitados no terminal.
   */
  public ativarEscada(parametros: Partial<ParametrosEscadaVento>): void {
    this.aplicarEscada(
      parametros.intervalo ?? this.intervaloEscadaSegundos,
      parametros.forca ?? this.forcaEscadaPixels,
      'crescente'
    );
  }

  /**
   * Roda a escada temporariamente com os valores errados digitados, guardando o estado atual.
   */
  public iniciarSimulacaoEscada(parametros: ParametrosEscadaVento): void {
    this.estadoAntesSimulacao = {
      ativa: this.escadaAtiva,
      intervalo: this.intervaloEscadaSegundos,
      forca: this.forcaEscadaPixels,
      tempoCiclo: this.tempoCicloEscada,
      ordem: this.ordemEscada,
    };
    this.aplicarEscada(parametros.intervalo, parametros.forca, normalizarOrdem(parametros.ordem));
  }

  /**
   * Devolve a escada exatamente ao estado de antes da simulação (desligada ou já calibrada).
   */
  public encerrarSimulacaoEscada(): void {
    const anterior = this.estadoAntesSimulacao;
    if (!anterior) return;
    this.estadoAntesSimulacao = undefined;

    this.aplicarEscada(anterior.intervalo, anterior.forca, anterior.ordem);
    this.escadaAtiva = anterior.ativa;
    this.tempoCicloEscada = anterior.tempoCiclo;
    if (!anterior.ativa) {
      for (const col of this.colunasEscada) col.ativa = false;
    }
  }

  private aplicarEscada(intervalo: number, forca: number, ordem: OrdemEscada): void {
    this.intervaloEscadaSegundos = intervalo;
    this.forcaEscadaPixels = forca;
    this.ordemEscada = ordem;

    for (const col of this.colunasEscada) {
      col.forca = forca;
    }

    this.escadaAtiva = true;
    this.tempoCicloEscada = 0;
  }

  public update(tempo: number, delta: number): void {
    this.renderizarColunas(delta);
    this.renderizarZonasContrarias(tempo, delta);
    this.atualizarGeiseres(tempo, delta);
    this.atualizarCicloEscada(delta);
  }

  private emErupcao(geiser: GeiserVento): boolean {
    return geiser.tempoCiclo % geiser.periodoMs < geiser.duracaoMs;
  }

  private atualizarGeiseres(tempo: number, delta: number): void {
    const g = VENTO_FASE1.GEISER;
    const dt = delta / 1000;

    for (const geiser of this.geiseres) {
      geiser.tempoCiclo += delta;
      const fase = geiser.tempoCiclo % geiser.periodoMs;
      const erupcao = fase < geiser.duracaoMs;
      const aviso = fase >= geiser.periodoMs - geiser.avisoMs;
      if (!erupcao) geiser.lancouNestaErupcao = false;

      const desenho = geiser.grafico;
      const topo = geiser.yBase - geiser.altura;
      desenho.clear();

      // Boca do gêiser no chão
      desenho.fillStyle(g.COR_BOCA, 1);
      desenho.fillEllipse(geiser.x, geiser.yBase - 2, g.LARGURA_BOCA, g.ALTURA_BOCA);

      // Aviso: a boca brilha e solta bolhas antes de estourar
      if (aviso) {
        desenho.fillStyle(g.COR_AVISO, 0.35 + Math.sin(tempo * 0.02) * 0.25);
        desenho.fillEllipse(geiser.x, geiser.yBase - 2, g.LARGURA_BOCA * 0.8, g.ALTURA_BOCA * 0.7);
        desenho.fillStyle(g.COR_AVISO, 0.8);
        for (const bolha of geiser.bolhas) {
          bolha.y -= g.BOLHAS_VEL_Y * dt;
          if (bolha.y < geiser.yBase - 80) bolha.y = geiser.yBase;
          desenho.fillCircle(bolha.x, bolha.y, 3);
        }
      }

      // Erupção: coluna clara com jatos subindo rápido por toda a área
      if (erupcao) {
        desenho.fillStyle(g.COR_ERUPCAO, g.ALFA_ERUPCAO);
        desenho.fillRect(geiser.x - geiser.largura / 2, topo, geiser.largura, geiser.altura);
        desenho.lineStyle(2, 0xffffff, 0.85);
        for (const jato of geiser.jatos) {
          jato.y -= g.JATOS_VEL_Y * dt;
          if (jato.y < topo) jato.y = geiser.yBase;
          desenho.lineBetween(jato.x, jato.y, jato.x, jato.y + jato.comprimento);
        }
      }
    }
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

      // Partículas mais rápidas quanto mais forte o vento: força fraca se vê fraca
      const fatorForca = Phaser.Math.Clamp(
        col.forca / VENTO_FASE1.FORCA_REFERENCIA_PARTICULAS,
        VENTO_FASE1.FATOR_PARTICULAS_MIN,
        VENTO_FASE1.FATOR_PARTICULAS_MAX
      );

      col.grafico.fillStyle(0xffffff, 0.7);
      for (const p of col.particulas) {
        p.y -= p.velY * fatorForca * dt;
        if (p.y < topoY) {
          p.y = baseColY;
          p.x = this.sortearXParticula(col.x, col.largura);
        }
        col.grafico.fillRect(p.x, p.y, VENTO_FASE1.LARGURA_PARTICULA, VENTO_FASE1.ALTURA_PARTICULA);
      }
    }
  }

  private renderizarZonasContrarias(tempo: number, delta: number): void {
    const c = VENTO_FASE1.CONTRARIO;
    const dt = delta / 1000;
    const deslocamentoTracejado = (tempo * c.VELOCIDADE_TRACEJADO) % c.PERIODO_TRACEJADO;

    for (const zona of this.zonasContrarias) {
      const g = zona.grafico;
      const esquerda = zona.x - zona.largura / 2;
      const topo = zona.y - zona.altura / 2;
      const base = zona.y + zona.altura / 2;

      g.clear();
      g.fillStyle(c.COR_FUNDO, c.ALFA_FUNDO);
      g.fillRect(esquerda, topo, zona.largura, zona.altura);

      // Bordas tracejadas que correm para a esquerda, como uma esteira de ar
      g.lineStyle(c.ESPESSURA_BORDA, c.COR_BORDA, c.ALFA_BORDA);
      for (let dx = -deslocamentoTracejado; dx < zona.largura; dx += c.PERIODO_TRACEJADO) {
        const inicio = Math.max(0, dx);
        const fim = Math.min(zona.largura, dx + c.COMPRIMENTO_TRACEJADO);
        if (fim <= inicio) continue;
        g.lineBetween(esquerda + inicio, topo, esquerda + fim, topo);
        g.lineBetween(esquerda + inicio, base, esquerda + fim, base);
      }

      // Riscos de vento atravessando a zona da direita para a esquerda
      for (const p of zona.particulas) {
        p.x -= p.velX * dt;
        if (p.x + p.comprimento < esquerda) {
          Object.assign(p, this.sortearParticulaHorizontal(zona, false));
        }
        g.lineStyle(c.PARTICULAS_ESPESSURA, c.COR_PARTICULA, p.alfa);
        g.lineBetween(p.x, p.y, p.x + p.comprimento, p.y);
      }

      this.desenharBiruta(g, esquerda, topo, tempo);
    }
  }

  private desenharBiruta(g: Phaser.GameObjects.Graphics, x: number, y: number, tempo: number): void {
    const b = VENTO_FASE1.CONTRARIO.BIRUTA;

    g.lineStyle(3, b.COR_MASTRO, 1);
    g.lineBetween(x, y, x, y + b.ALTURA_MASTRO);
    g.fillStyle(b.COR_PONTA, 1);
    g.fillCircle(x, y, 4);

    // Faixas hasteadas para a esquerda, ondulando em fases diferentes
    const larguraSegmento = b.COMPRIMENTO / b.SEGMENTOS;
    for (let i = 0; i < b.SEGMENTOS; i++) {
      const altura = b.ALTURA_BASE - i * b.ALTURA_REDUCAO;
      const onda = Math.sin(tempo * b.ONDA_VELOCIDADE - i * 0.9) * b.ONDA_AMPLITUDE;
      g.fillStyle(i % 2 === 0 ? b.COR_SEGMENTO_A : b.COR_SEGMENTO_B, 0.95);
      g.fillRect(x - (i + 1) * larguraSegmento, y + 4 + onda, larguraSegmento, altura);
    }
  }

  private atualizarCicloEscada(delta: number): void {
    if (!this.escadaAtiva || this.colunasEscada.length === 0) return;

    if (this.ordemEscada === 'simultanea') {
      for (const col of this.colunasEscada) col.ativa = true;
      return;
    }

    const quantidade = this.colunasEscada.length;
    this.tempoCicloEscada += delta;
    const periodoMs = Math.max(VENTO_FASE1.PERIODO_MIN_ESCADA_MS, this.intervaloEscadaSegundos * 1000);
    const tempoNoCiclo = this.tempoCicloEscada % (periodoMs * quantidade);
    const passo = Math.floor(tempoNoCiclo / periodoMs);
    const colunaAtivaIndex = this.ordemEscada === 'decrescente' ? quantidade - 1 - passo : passo;

    for (let i = 0; i < quantidade; i++) {
      this.colunasEscada[i].ativa = i === colunaAtivaIndex;
    }
  }

  private sortearXParticula(centroX: number, largura: number): number {
    const padding = VENTO_FASE1.PADDING_PARTICULAS_X;
    return centroX - largura / 2 + padding + Math.random() * (largura - padding * 2);
  }

  /**
   * Sorteia um risco de vento: espalhado pela zona na criação, ou na borda direita ao reaparecer.
   */
  private sortearParticulaHorizontal(zona: AreaRetangular, espalhar: boolean): ParticulaVentoHorizontal {
    const c = VENTO_FASE1.CONTRARIO;
    const esquerda = zona.x - zona.largura / 2;
    return {
      x: espalhar ? esquerda + Math.random() * zona.largura : esquerda + zona.largura,
      y: zona.y - zona.altura / 2 + Math.random() * zona.altura,
      velX: c.PARTICULAS_VEL_X_MIN + Math.random() * (c.PARTICULAS_VEL_X_MAX - c.PARTICULAS_VEL_X_MIN),
      comprimento:
        c.PARTICULAS_COMPRIMENTO_MIN +
        Math.random() * (c.PARTICULAS_COMPRIMENTO_MAX - c.PARTICULAS_COMPRIMENTO_MIN),
      alfa: c.PARTICULAS_ALFA_MIN + Math.random() * (c.PARTICULAS_ALFA_MAX - c.PARTICULAS_ALFA_MIN),
    };
  }
}
