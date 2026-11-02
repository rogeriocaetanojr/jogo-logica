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
import { CORES_FASE1 as C } from './ArteFase1';
import { poligono } from './TexturasFase1';
import { desenharBandeira } from './CenarioFase1';
import { emitirSom } from './SomFase1';

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
  emErupcaoAntes: boolean;
  bolhas: { x: number; y: number }[];
  jatos: { x: number; y: number; comprimento: number }[];
}

/**
 * Gerador na base de uma coluna da escada: grade no chão, carcaça sob a laje e hélice.
 */
interface GeradorEscada {
  coluna: ColunaVento;
  grafico: Phaser.GameObjects.Graphics;
  helice: Phaser.GameObjects.Image;
}

const ESPESSURA_LAJE = 36; // Plataformas de mármore com scaleY 1
const ALTURA_CARCACA = 52;
const GIRO_LIGADO = 0.9; // graus por ms
const GIRO_DESLIGADO = 0.04;

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
  private readonly geradores: GeradorEscada[] = [];
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
      emErupcaoAntes: false,
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
   * Registra as colunas que formam a escada de rajadas, em ordem crescente,
   * e monta o gerador na base de cada uma (no chão, logo abaixo da coluna).
   */
  public definirEscada(colunas: ColunaVento[]): void {
    this.colunasEscada = colunas;

    for (const coluna of colunas) {
      const piso = coluna.y + coluna.altura / 2;
      const centroCarcaca = piso + ESPESSURA_LAJE + ALTURA_CARCACA / 2;

      this.cena.add.image(coluna.x, centroCarcaca, 'gerador-vento').setDepth(VENTO_FASE1.PROFUNDIDADE_GRAFICO);
      const helice = this.cena.add.image(coluna.x, centroCarcaca + 2, 'helice-gerador');
      helice.setDepth(VENTO_FASE1.PROFUNDIDADE_GRAFICO + 1);

      const grafico = this.cena.add.graphics();
      grafico.setDepth(VENTO_FASE1.PROFUNDIDADE_GRAFICO + 1);

      this.geradores.push({ coluna, grafico, helice });
    }
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
    this.renderizarColunas(tempo, delta);
    this.renderizarZonasContrarias(tempo, delta);
    this.atualizarGeiseres(tempo, delta);
    this.atualizarCicloEscada(delta);
    this.atualizarGeradores(tempo, delta);
  }

  /**
   * Gerador ligado: hélice girando forte, grade do chão brilhando e luz verde.
   * Desligado: hélice quase parada e luz vermelha. Mostra de baixo qual coluna vai soprar.
   */
  private atualizarGeradores(tempo: number, delta: number): void {
    for (const gerador of this.geradores) {
      const { coluna, grafico, helice } = gerador;
      const ligado = coluna.ativa;
      const piso = coluna.y + coluna.altura / 2;
      const meiaLargura = coluna.largura / 2 - 6;

      helice.angle += delta * (ligado ? GIRO_LIGADO : GIRO_DESLIGADO);

      grafico.clear();
      // Respiradouro no chão: moldura dourada e aletas inclinadas, que acendem quando sopra
      if (ligado) {
        grafico.fillStyle(C.CIANO_CLARO, 0.22 + Math.sin(tempo * 0.02) * 0.08);
        grafico.fillEllipse(coluna.x, piso - 6, meiaLargura * 2 + 16, 18);
      }
      grafico.fillStyle(C.OURO_ESCURO, 1);
      grafico.fillRoundedRect(coluna.x - meiaLargura - 4, piso - 9, meiaLargura * 2 + 8, 9, 3);
      grafico.fillStyle(C.OURO, 1);
      grafico.fillRect(coluna.x - meiaLargura - 4, piso - 9, meiaLargura * 2 + 8, 2);
      grafico.fillStyle(C.TECH, 1);
      grafico.fillRect(coluna.x - meiaLargura, piso - 6, meiaLargura * 2, 5);
      const brilho = ligado ? 0.65 + Math.sin(tempo * 0.02) * 0.3 : 1;
      grafico.fillStyle(ligado ? C.CIANO_CLARO : C.TECH_CLARO, brilho);
      for (let x = coluna.x - meiaLargura + 3; x < coluna.x + meiaLargura - 4; x += 8) {
        poligono(grafico, [
          { x, y: piso - 6 },
          { x: x + 4, y: piso - 6 },
          { x: x + 2, y: piso - 1 },
          { x: x - 2, y: piso - 1 },
        ]);
      }
      // Luz de estado na carcaça, com halo
      const corLuz = ligado ? C.HACKEADO : C.ALERTA;
      const luzX = coluna.x + 36;
      const luzY = piso + ESPESSURA_LAJE + 10;
      grafico.fillStyle(corLuz, 0.3);
      grafico.fillCircle(luzX, luzY, 7);
      grafico.fillStyle(corLuz, 1);
      grafico.fillCircle(luzX, luzY, 4);
      grafico.fillStyle(0xffffff, 0.8);
      grafico.fillRect(luzX - 2, luzY - 2, 2, 2);
    }
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
      if (erupcao && !geiser.emErupcaoAntes) emitirSom(this.cena, 'geiser', geiser.x);
      geiser.emErupcaoAntes = erupcao;

      const desenho = geiser.grafico;
      const topo = geiser.yBase - geiser.altura;
      const bocaY = geiser.yBase - 2;
      desenho.clear();

      // Erupção: o mesmo feixe com fitas das colunas, só que forte e rápido, com jatos e um
      // estouro de nuvem no alto
      if (erupcao) {
        const fatorForca = geiser.forca / VENTO_FASE1.FORCA_REFERENCIA_PARTICULAS;
        const sobe = Math.min(1, fase / g.SUBIDA_MS);
        const topoAtual = geiser.yBase - geiser.altura * sobe;
        this.desenharFeixe(desenho, geiser.x, topoAtual, geiser.yBase, geiser.largura, tempo, fatorForca);

        desenho.fillStyle(0xffffff, 0.85);
        for (const jato of geiser.jatos) {
          jato.y -= g.JATOS_VEL_Y * dt;
          if (jato.y < topo) jato.y = geiser.yBase;
          if (jato.y < topoAtual) continue;
          desenho.fillRect(jato.x, jato.y, 2, jato.comprimento);
          if (jato.comprimento > 45) desenho.fillRect(jato.x - 3, jato.y + 4, 8, 2);
        }

        const estouro = 1 - fase / geiser.duracaoMs;
        desenho.fillStyle(C.NUVEM, 0.75 * estouro);
        for (let k = 0; k < 5; k++) {
          const angulo = (k / 5) * Math.PI * 2 + tempo * 0.004;
          desenho.fillCircle(geiser.x + Math.cos(angulo) * 26, topoAtual + Math.sin(angulo) * 8, 10 + (1 - estouro) * 8);
        }
      }

      // Boca de rocha: anel de pedras, garganta escura e brilho de vento lá dentro
      desenho.fillStyle(C.ROCHA_ESCURA, 1);
      desenho.fillEllipse(geiser.x, bocaY, g.LARGURA_BOCA + 18, g.ALTURA_BOCA + 10);
      for (let k = 0; k < 9; k++) {
        const angulo = Math.PI + (k / 8) * Math.PI;
        const px = geiser.x + Math.cos(angulo) * (g.LARGURA_BOCA / 2 + 4);
        const py = bocaY + Math.sin(angulo) * (g.ALTURA_BOCA / 2 + 2);
        desenho.fillStyle(k % 2 ? C.ROCHA : C.ROCHA_CLARA, 1);
        desenho.fillRoundedRect(px - 6, py - 4, 12, 8, 3);
      }
      desenho.fillStyle(C.TECH, 1);
      desenho.fillEllipse(geiser.x, bocaY, g.LARGURA_BOCA - 6, g.ALTURA_BOCA - 2);
      const pulso = aviso ? 0.55 + Math.sin(tempo * 0.025) * 0.35 : erupcao ? 0.9 : 0.25;
      desenho.fillStyle(C.CIANO_CLARO, pulso);
      desenho.fillEllipse(geiser.x, bocaY, g.LARGURA_BOCA * 0.6, g.ALTURA_BOCA * 0.45);
      desenho.fillStyle(C.MUSGO, 1);
      desenho.fillRect(geiser.x - g.LARGURA_BOCA / 2 + 2, bocaY - 3, 3, 6);
      desenho.fillRect(geiser.x + g.LARGURA_BOCA / 2 - 6, bocaY - 2, 3, 5);

      // Aviso: redemoinhos subindo da boca e o anel acendendo antes do estouro
      if (aviso) {
        for (const bolha of geiser.bolhas) {
          bolha.y -= g.BOLHAS_VEL_Y * dt;
          if (bolha.y < geiser.yBase - 80) bolha.y = geiser.yBase;
          const subida = (geiser.yBase - bolha.y) / 80;
          const x = bolha.x + Math.sin(tempo * 0.01 + bolha.y * 0.1) * 5;
          desenho.lineStyle(2, C.CIANO_CLARO, 0.9 * (1 - subida));
          desenho.strokeEllipse(x, bolha.y, 8 + subida * 10, 4 + subida * 3);
        }
        desenho.lineStyle(2, C.CIANO_CLARO, pulso);
        desenho.strokeEllipse(geiser.x, bocaY, g.LARGURA_BOCA + 22, g.ALTURA_BOCA + 14);
      }
    }
  }

  /**
   * Feixe de vento subindo: faixas sobrepostas (o centro fica mais forte), bordas finas e duas
   * fitas em espiral na velocidade da força. Colunas e gêiser usam o mesmo desenho.
   */
  private desenharFeixe(
    g: Phaser.GameObjects.Graphics,
    x: number,
    topoY: number,
    baseY: number,
    largura: number,
    tempo: number,
    fatorForca: number
  ): void {
    const metadeL = largura / 2;
    const altura = baseY - topoY;
    if (altura <= 0) return;

    for (let faixa = 0; faixa < VENTO_FASE1.FAIXAS_FEIXE; faixa++) {
      const recuo = (faixa * metadeL) / VENTO_FASE1.FAIXAS_FEIXE;
      g.fillStyle(VENTO_FASE1.COR_FUNDO_COLUNA, VENTO_FASE1.ALFA_FUNDO_COLUNA);
      g.fillRect(x - metadeL + recuo, topoY, largura - recuo * 2, altura);
    }
    g.lineStyle(VENTO_FASE1.ESPESSURA_BORDA_COLUNA, VENTO_FASE1.COR_BORDA_COLUNA, VENTO_FASE1.ALFA_BORDA_COLUNA);
    g.lineBetween(x - metadeL, topoY, x - metadeL, baseY);
    g.lineBetween(x + metadeL, topoY, x + metadeL, baseY);

    const deslocamento = (tempo / 1000) * VENTO_FASE1.VELOCIDADE_FITA * fatorForca;
    for (let fita = 0; fita < 2; fita++) {
      g.lineStyle(VENTO_FASE1.ESPESSURA_FITA, VENTO_FASE1.COR_FITA, VENTO_FASE1.ALFA_FITA);
      g.beginPath();
      for (let y = baseY; y >= topoY; y -= VENTO_FASE1.PASSO_FITA) {
        const angulo = (y + deslocamento) / VENTO_FASE1.COMPRIMENTO_ONDA_FITA + fita * Math.PI;
        const px = x + Math.sin(angulo) * metadeL * 0.7;
        if (y === baseY) g.moveTo(px, y);
        else g.lineTo(px, y);
      }
      g.strokePath();
    }
  }

  private renderizarColunas(tempo: number, delta: number): void {
    const dt = delta / 1000;

    for (const col of this.colunas) {
      col.grafico.clear();
      if (!col.ativa) continue;

      const topoY = col.y - col.altura / 2;
      const baseColY = col.y + col.altura / 2;

      // Partículas mais rápidas quanto mais forte o vento: força fraca se vê fraca
      const fatorForca = Phaser.Math.Clamp(
        col.forca / VENTO_FASE1.FORCA_REFERENCIA_PARTICULAS,
        VENTO_FASE1.FATOR_PARTICULAS_MIN,
        VENTO_FASE1.FATOR_PARTICULAS_MAX
      );
      this.desenharFeixe(col.grafico, col.x, topoY, baseColY, col.largura, tempo, fatorForca);

      col.grafico.fillStyle(0xffffff, 0.7);
      for (const p of col.particulas) {
        p.y -= p.velY * fatorForca * dt;
        if (p.y < topoY) {
          p.y = baseColY;
          p.x = this.sortearXParticula(col.x, col.largura);
        }
        col.grafico.fillRect(p.x, p.y, VENTO_FASE1.LARGURA_PARTICULA, VENTO_FASE1.ALTURA_PARTICULA);
        // Brilho em cruz (as partículas mais visíveis)
        if (p.alfa > 0.65) col.grafico.fillRect(p.x - 3, p.y + 3, VENTO_FASE1.LARGURA_PARTICULA + 6, 2);
      }
    }
  }

  /**
   * Corrente de vento lateral: massa de ar visível (névoa em duas camadas com bolhas de nuvem
   * rolando) cortada por fitas largas que afinam nas pontas, ondulam e terminam em caracol,
   * como o vento desenhado em Zelda: Wind Waker.
   */
  private renderizarZonasContrarias(tempo: number, delta: number): void {
    const c = VENTO_FASE1.CONTRARIO;
    const dt = delta / 1000;

    for (const zona of this.zonasContrarias) {
      const g = zona.grafico;
      const esquerda = zona.x - zona.largura / 2;
      const direita = zona.x + zona.largura / 2;
      const topo = zona.y - zona.altura / 2;

      g.clear();
      // Massa de ar: duas camadas arredondadas, o miolo mais denso
      g.fillStyle(c.COR_FUNDO, c.ALFA_FUNDO);
      g.fillRoundedRect(esquerda, topo, zona.largura, zona.altura, Math.min(c.RAIO_NEVOA, zona.altura / 2));
      g.fillStyle(c.COR_RASTRO, c.ALFA_MIOLO);
      g.fillRoundedRect(esquerda + 24, topo + zona.altura * 0.22, zona.largura - 48, zona.altura * 0.56, Math.min(c.RAIO_NEVOA, zona.altura / 4));

      // Golfadas de nuvem rolando para a esquerda no meio da corrente
      g.fillStyle(0xffffff, c.ALFA_GOLFADA);
      for (let k = 0; k < c.GOLFADAS; k++) {
        const ciclo = (tempo * c.GOLFADA_VELOCIDADE + (k * zona.largura) / c.GOLFADAS) % zona.largura;
        const gx = direita - ciclo;
        const gy = topo + zona.altura * (0.2 + 0.6 * ((k * 0.37) % 1)) + Math.sin(tempo * 0.002 + k) * 6;
        const borda = Math.min(1, ciclo / c.FADE_BORDA, (zona.largura - ciclo) / c.FADE_BORDA);
        g.fillStyle(0xffffff, c.ALFA_GOLFADA * borda);
        g.fillEllipse(gx, gy, 54, 18);
        g.fillEllipse(gx + 20, gy - 5, 30, 14);
        g.fillEllipse(gx - 22, gy + 3, 26, 10);
      }

      zona.particulas.forEach((p, indice) => {
        p.x -= p.velX * dt;
        if (p.x + p.comprimento < esquerda) {
          Object.assign(p, this.sortearParticulaHorizontal(zona, false));
        }
        // Some suave perto das pontas da zona
        const borda = Math.min(1, (p.x - esquerda) / c.FADE_BORDA, (direita - p.x - p.comprimento) / c.FADE_BORDA);
        if (borda <= 0) return;
        const alfa = Math.min(1, p.alfa * borda);

        // Eixo ondulado da fita e a espessura, que afina nas duas pontas
        const eixo: Phaser.Math.Vector2[] = [];
        const lado: number[] = [];
        for (let k = 0; k <= c.PONTOS_RISCO; k++) {
          const t = k / c.PONTOS_RISCO;
          const x = p.x + t * p.comprimento;
          const onda = Math.sin(x * c.ONDA_FREQUENCIA + tempo * c.ONDA_VELOCIDADE + p.y) * c.ONDA_AMPLITUDE;
          eixo.push(new Phaser.Math.Vector2(x, p.y + onda));
          lado.push(Math.sin(Math.PI * t) * (c.ESPESSURA_MIN + p.alfa * c.ESPESSURA_EXTRA));
        }
        const contorno = (fator: number, deslocY: number) => [
          ...eixo.map((e, k) => new Phaser.Math.Vector2(e.x, e.y - lado[k] * fator + deslocY)),
          ...eixo.map((e, k) => new Phaser.Math.Vector2(e.x, e.y + lado[k] * fator + deslocY)).reverse(),
        ];
        // Contorno ciano, corpo branco, vinco claro no meio
        g.fillStyle(c.COR_RASTRO, alfa * 0.6);
        g.fillPoints(contorno(1.35, 1), true);
        g.fillStyle(c.COR_PARTICULA, alfa);
        g.fillPoints(contorno(1, 0), true);
        g.lineStyle(1, c.COR_RASTRO, alfa);
        g.strokePoints(eixo);

        // Caracol na ponta da frente (a da esquerda, para onde o vento vai)
        if (indice % c.CARACOL_A_CADA === 0) {
          const ponta = eixo[0];
          const raio = c.RAIO_CARACOL + lado[Math.floor(c.PONTOS_RISCO / 2)] * 0.5;
          g.lineStyle(c.ESPESSURA_CARACOL, c.COR_PARTICULA, alfa);
          g.beginPath();
          g.arc(ponta.x, ponta.y - raio, raio, Math.PI / 2, Math.PI / 2 + Math.PI * 1.7, false);
          g.strokePath();
          g.lineStyle(1.5, c.COR_RASTRO, alfa);
          g.beginPath();
          g.arc(ponta.x, ponta.y - raio, raio * 0.5, Math.PI / 2, Math.PI / 2 + Math.PI * 1.4, false);
          g.strokePath();
        }
      });

      this.desenharBiruta(g, esquerda, topo, tempo);
    }
  }

  /**
   * Bandeira da fase fincada na borda esquerda da zona, avisando de longe de onde vem o vento.
   * O mastro desce do topo da zona (x, y) e o pedestal fica ALTURA_MASTRO abaixo.
   */
  private desenharBiruta(g: Phaser.GameObjects.Graphics, x: number, y: number, tempo: number): void {
    desenharBandeira(g, x, y + VENTO_FASE1.CONTRARIO.BIRUTA.ALTURA_MASTRO, VENTO_FASE1.CONTRARIO.BIRUTA.ALTURA_MASTRO, tempo);
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
      const vaiLigar = i === colunaAtivaIndex;
      if (vaiLigar && !this.colunasEscada[i].ativa) emitirSom(this.cena, 'escada', this.colunasEscada[i].x);
      this.colunasEscada[i].ativa = vaiLigar;
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
