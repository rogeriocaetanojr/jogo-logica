import Phaser from 'phaser';
import type { CenaFase2 } from '../CenaFase2';
import { COR, ESCALA, hexNum, larguraTexto, texturaPixel } from './ArtePorto';
import { PROF } from './EfeitosPorto';
import { AREAS, ESPUMA_MAXIMA, VIDA_MAXIMA, indiceFumaca } from './TiposPorto';

const FONTE = 'Consolas, "Courier New", monospace';

/**
 * HUD da fase: vida, vidas, ferramenta (extintor/canhão de espuma), lacres, itens da CRACA,
 * medidor global do Índice de Fumaça, barra de chefe e avisos.
 */
export class HudPorto {
  private readonly cena: CenaFase2;
  private readonly grafico: Phaser.GameObjects.Graphics;
  private readonly graficoIndice: Phaser.GameObjects.Graphics;
  private readonly textoTitulo: Phaser.GameObjects.Text;
  private readonly textoAtalhos: Phaser.GameObjects.Text;
  private readonly textoVidas: Phaser.GameObjects.Text;
  private readonly textoFerramenta: Phaser.GameObjects.Text;
  private readonly textoLacres: Phaser.GameObjects.Text;
  private readonly textoItens: Phaser.GameObjects.Text;
  private readonly textoIndice: Phaser.GameObjects.Text;
  private readonly textoIndiceValor: Phaser.GameObjects.Text;
  private readonly textoArea: Phaser.GameObjects.Text;
  private readonly textoFiltro: Phaser.GameObjects.Text;
  private readonly textoAviso: Phaser.GameObjects.Text;
  private readonly iconeLacre: Phaser.GameObjects.Image;
  private readonly textoControles: Phaser.GameObjects.Text;
  private chefe: { nome: string; vida: number; max: number; texto: Phaser.GameObjects.Text; grafico: Phaser.GameObjects.Graphics } | null = null;
  private indiceExibido = 100;

  constructor(cena: CenaFase2) {
    this.cena = cena;
    const fixo = (o: Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth) => {
      o.setScrollFactor(0);
      o.setDepth(PROF.hud);
    };

    this.grafico = cena.add.graphics();
    fixo(this.grafico);
    this.graficoIndice = cena.add.graphics();
    fixo(this.graficoIndice);

    const estilo = (cor: string, tamanho = 12): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: FONTE,
      fontSize: `${tamanho}px`,
      color: cor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });

    // Faixa superior: nome da fase à esquerda e atalhos à direita (substitui a barra genérica de setor)
    this.textoTitulo = cena.add.text(16, 14, 'FASE 2  ·  PORTO BUGADO', estilo('#C8C2B4', 13));
    this.textoAtalhos = cena.add.text(1264, 14, '[H] AJUDA   [ESC] HUB', estilo(COR.telaBoia, 13));
    this.textoAtalhos.setOrigin(1, 0);

    this.textoVidas = cena.add.text(238, 53, '', estilo('#F2EEE2', 14));
    this.textoFerramenta = cena.add.text(28, 77, '', estilo('#F2EEE2', 13));
    this.textoLacres = cena.add.text(50, 99, '', estilo(COR.advertencia, 15));
    this.textoItens = cena.add.text(92, 101, '', estilo('#C8C2B4', 13));
    this.textoIndice = cena.add.text(1264 - 290, 51, 'ÍNDICE DE FUMAÇA', estilo('#C8C2B4', 13));
    this.textoIndiceValor = cena.add.text(1264 - 16, 48, '100%', estilo(COR.fogoLaranja, 20));
    this.textoIndiceValor.setOrigin(1, 0);
    this.textoArea = cena.add.text(1264 - 290, 97, '', estilo('#C8C2B4', 13));
    this.textoFiltro = cena.add.text(1264 - 16, 97, '', estilo(COR.telaBoia, 13));
    this.textoFiltro.setOrigin(1, 0);
    this.textoAviso = cena.add.text(640, 150, '', {
      ...estilo(COR.advertencia, 17),
      backgroundColor: 'rgba(14,10,10,0.88)',
      padding: { x: 14, y: 8 },
      align: 'center',
      wordWrap: { width: 900 },
    });
    this.textoAviso.setOrigin(0.5).setAlpha(0);
    this.textoControles = cena.add.text(640, 704, '', {
      ...estilo('#E8E2D2', 14),
      backgroundColor: 'rgba(14,10,10,0.88)',
      padding: { x: 12, y: 6 },
    });
    this.textoControles.setOrigin(0.5, 1).setAlpha(0);

    texturaPixel(cena, 'pb-hud-lacre', 5, 8, (p) => {
      p.px(0, 0, 5, 7, COR.advertencia);
      p.px(0, 0, 5, 1, '#B88A1A');
      p.ponto(2, 3, '#1A1414');
      p.px(2, 7, 1, 1, '#8A847C');
    });
    this.iconeLacre = cena.add.image(28, 99, 'pb-hud-lacre').setOrigin(0, 0).setScale(3);

    for (const o of [
      this.textoTitulo,
      this.textoAtalhos,
      this.textoVidas,
      this.textoFerramenta,
      this.textoLacres,
      this.textoItens,
      this.textoIndice,
      this.textoIndiceValor,
      this.textoArea,
      this.textoFiltro,
      this.textoAviso,
      this.textoControles,
      this.iconeLacre,
    ]) {
      fixo(o);
    }
    this.indiceExibido = indiceFumaca(cena.estado);
    this.atualizar();
  }

  /** Redesenha os painéis (chamado quando algo muda). */
  atualizar(): void {
    const g = this.grafico;
    const estado = this.cena.estado;
    const jogador = this.cena.jogador;
    g.clear();

    // Painel esquerdo
    this.painel(g, 16, 44, 300, 78);
    this.textoPequeno(g, 'VIDA', 28, 54);
    const vida = jogador ? jogador.vida : VIDA_MAXIMA;
    for (let i = 0; i < VIDA_MAXIMA; i++) {
      const x = 72 + i * 16;
      const cheio = i < vida;
      g.fillStyle(0x0e0a0a, 1);
      g.fillRect(x, 54, 13, 14);
      g.fillStyle(cheio ? (vida <= 3 ? 0xff4a3a : hexNum(COR.fogoLaranja)) : 0x2a2224, 1);
      g.fillRect(x + 2, 56, 9, 10);
      if (cheio) {
        g.fillStyle(0xfff1a8, 0.8);
        g.fillRect(x + 2, 56, 9, 2);
      }
    }
    this.textoVidas.setText(`x${estado.vidas}`);

    // Ferramenta: extintor (3 jatos) ou canhão de espuma (tanque)
    if (estado.temCanhao) {
      this.textoFerramenta.setText('ESPUMA');
      for (let i = 0; i < ESPUMA_MAXIMA; i++) {
        const x = 84 + i * 12;
        g.fillStyle(0x0e0a0a, 1);
        g.fillRect(x, 78, 10, 12);
        g.fillStyle(i < estado.espuma ? hexNum(COR.espuma) : 0x2a2a30, 1);
        g.fillRect(x + 2, 80, 6, 8);
      }
    } else if (estado.temExtintor) {
      this.textoFerramenta.setText('EXTINTOR');
      for (let i = 0; i < 3; i++) {
        const x = 96 + i * 20;
        g.fillStyle(0x0e0a0a, 1);
        g.fillRect(x, 77, 16, 14);
        g.fillStyle(i < estado.cargasExtintor ? 0xc8301e : 0x2a2224, 1);
        g.fillRect(x + 3, 79, 10, 10);
      }
    } else {
      this.textoFerramenta.setText('SEM FERRAMENTA DE FOGO');
    }

    this.textoLacres.setText(`${estado.lacres}`);
    const itens: string[] = [];
    if (estado.tanquesE > 0) itens.push(`Q:TANQUE x${estado.tanquesE}`);
    if (estado.filtros > 0) itens.push(`F:FILTRO x${estado.filtros}`);
    this.textoItens.setText(itens.join('  '));

    // Painel direito: moldura (o medidor em si é redesenhado por desenharIndice)
    this.painel(g, 1264 - 300, 44, 300, 78);
    const info = AREAS[estado.area] ?? AREAS[0];
    this.textoArea.setText(`ÁREA ${info.numero}/6 · ${info.nome}`);
    this.desenharIndice();
  }

  /** Medidor do Índice de Fumaça: é a única parte do HUD que anima, então tem o próprio gráfico. */
  private desenharIndice(): void {
    const g = this.graficoIndice;
    g.clear();
    const indice = this.indiceExibido;
    const barraX = 1264 - 290;
    const barraW = 280;
    g.fillStyle(0x0e0a0a, 1);
    g.fillRect(barraX, 74, barraW, 14);
    const cor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x8a847c),
      Phaser.Display.Color.ValueToColor(hexNum(COR.fogoLaranja)),
      60,
      Math.max(0, Math.min(60, indice - 40))
    );
    g.fillStyle(Phaser.Display.Color.GetColor(cor.r, cor.g, cor.b), 1);
    g.fillRect(barraX + 2, 76, Math.round(((barraW - 4) * indice) / 100), 10);
    // Marca do mínimo possível (todos os 12 focos apagados = 40%)
    g.fillStyle(hexNum(COR.virus), 0.8);
    g.fillRect(barraX + 2 + Math.round((barraW - 4) * 0.4), 72, 2, 18);
    this.textoIndiceValor.setText(`${Math.round(indice)}%`);
  }

  /** Atualizações contínuas leves (contadores e animação do medidor). */
  quadro(): void {
    const alvo = indiceFumaca(this.cena.estado);
    if (Math.abs(alvo - this.indiceExibido) > 0.05) {
      this.indiceExibido += (alvo - this.indiceExibido) * 0.08;
      this.desenharIndice();
    }
    const fumaca = this.cena.fumaca;
    if (fumaca.filtroAtivo) {
      const s = Math.ceil((fumaca.filtroAte - this.cena.time.now) / 1000);
      this.textoFiltro.setText(`FILTRO ${s}s`);
    } else if (this.textoFiltro.text) {
      this.textoFiltro.setText('');
    }
  }

  private painel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0x0e0a0a, 0.78);
    g.fillRect(x, y, w, h);
    g.lineStyle(2, hexNum(COR.advertencia), 0.85);
    g.strokeRect(x, y, w, h);
    // Faixa de advertência no topo do painel
    for (let i = 0; i < w; i += 12) {
      g.fillStyle(i % 24 === 0 ? hexNum(COR.advertencia) : 0x1a1616, 1);
      g.fillRect(x + i, y, Math.min(12, w - i), 4);
    }
  }

  private textoPequeno(_g: Phaser.GameObjects.Graphics, texto: string, x: number, y: number): void {
    const chave = `pb-hud-txt-${texto}`;
    texturaPixel(this.cena, chave, larguraTexto(texto) + 2, 7, (p) => p.textoContorno(texto, 1, 1, '#F2EEE2', '#000000'));
    if (!this.cena.children.getByName(chave)) {
      const img = this.cena.add.image(x, y + 2, chave).setOrigin(0, 0).setScale(2).setScrollFactor(0).setDepth(PROF.hud + 1);
      img.setName(chave);
    }
  }

  aviso(texto: string, cor: string = COR.advertencia, duracao = 2200): void {
    this.textoAviso.setText(texto).setColor(cor);
    this.cena.tweens.killTweensOf(this.textoAviso);
    this.textoAviso.setAlpha(1).setY(150);
    this.cena.tweens.add({ targets: this.textoAviso, alpha: 0, y: 140, delay: duracao, duration: 500 });
  }

  mostrarControles(texto: string, duracao = 9000): void {
    this.textoControles.setText(texto).setAlpha(1);
    this.cena.tweens.killTweensOf(this.textoControles);
    this.cena.tweens.add({ targets: this.textoControles, alpha: 0, delay: duracao, duration: 1200 });
  }

  /** Cartão de título da área (letras em pixel art). */
  cartaoArea(numero: number, nome: string, subtitulo: string): void {
    const chave = `pb-titulo-area-${numero}`;
    const linha1 = `AREA ${numero}`;
    const w = Math.max(larguraTexto(nome, 2), larguraTexto(linha1)) + 8;
    texturaPixel(this.cena, chave, w, 22, (p) => {
      p.textoContorno(linha1, Math.round((w - larguraTexto(linha1)) / 2), 1, COR.advertencia, '#000000');
      p.textoContorno(nome, Math.round((w - larguraTexto(nome, 2)) / 2), 9, '#F2EEE2', '#000000', 2);
    });
    const titulo = this.cena.add.image(640, 300, chave).setScale(ESCALA).setScrollFactor(0).setDepth(PROF.hud + 5).setAlpha(0);
    const sub = this.cena.add
      .text(640, 368, subtitulo.toUpperCase(), {
        fontFamily: FONTE,
        fontSize: '19px',
        color: '#E8E2D2',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(PROF.hud + 5)
      .setAlpha(0);
    this.cena.tweens.add({
      targets: [titulo, sub],
      alpha: 1,
      duration: 500,
      hold: 1800,
      yoyo: true,
      onComplete: () => {
        titulo.destroy();
        sub.destroy();
      },
    });
  }

  /** Barra de vida de chefe na base da tela. */
  mostrarChefe(nome: string, max: number): void {
    this.esconderChefe();
    const grafico = this.cena.add.graphics().setScrollFactor(0).setDepth(PROF.hud);
    const texto = this.cena.add
      .text(640, 656, nome, {
        fontFamily: FONTE,
        fontSize: '14px',
        color: COR.virus,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(PROF.hud);
    this.chefe = { nome, vida: max, max, texto, grafico };
    this.atualizarChefe(max);
  }

  atualizarChefe(vida: number): void {
    if (!this.chefe) return;
    this.chefe.vida = vida;
    const g = this.chefe.grafico;
    g.clear();
    g.fillStyle(0x0e0a0a, 0.85);
    g.fillRect(340, 660, 600, 22);
    g.lineStyle(2, hexNum(COR.virus), 0.9);
    g.strokeRect(340, 660, 600, 22);
    g.fillStyle(hexNum(COR.virus), 1);
    g.fillRect(344, 664, Math.round((592 * Math.max(0, vida)) / this.chefe.max), 14);
    // Marcas das etapas do KRAKEN (60% e 30%)
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(344 + Math.round(592 * 0.6), 662, 2, 18);
    g.fillRect(344 + Math.round(592 * 0.3), 662, 2, 18);
  }

  esconderChefe(): void {
    if (!this.chefe) return;
    this.chefe.grafico.destroy();
    this.chefe.texto.destroy();
    this.chefe = null;
  }
}
