import Phaser from 'phaser';
import { cumulo, gerar, poligono } from './TexturasFase1';
import { AMBIENTE_FASE1, CENARIO_FASE1, CORES_FASE1 as C } from './ArteFase1';

type Grafico = Phaser.GameObjects.Graphics;

/**
 * Desenha algo que atravessa a borda de uma textura repetida também do outro lado,
 * para a emenda do TileSprite não aparecer.
 */
function envolver(larguraTextura: number, x: number, largura: number, desenhar: (x: number) => void): void {
  desenhar(x);
  if (x + largura > larguraTextura) desenhar(x - larguraTextura);
  if (x < 0) desenhar(x + larguraTextura);
}

/**
 * Silhueta de ilha flutuante: laje clara no topo e o corpo de rocha afinando para baixo.
 */
function silhuetaIlha(g: Grafico, cx: number, cy: number, w: number, corpo: number, sombra: number, luz: number): void {
  const fundo = w * 0.55;
  g.fillStyle(corpo, 1);
  g.fillTriangle(cx - w / 2, cy + 6, cx + w / 2, cy + 6, cx + w * 0.06, cy + 6 + fundo);
  g.fillStyle(sombra, 1);
  g.fillTriangle(cx + w * 0.1, cy + 6, cx + w / 2, cy + 6, cx + w * 0.06, cy + 6 + fundo);
  g.fillStyle(luz, 1);
  g.fillRect(cx - w / 2, cy, w, 6);
}

/**
 * Colunata em ruínas sobre uma ilha: algumas colunas quebradas, arquitrave e frontão.
 */
function colunata(g: Grafico, esquerda: number, chao: number, quantidade: number, altura: number, cor: number, sombra: number, rnd: Phaser.Math.RandomDataGenerator): void {
  const passo = 22;
  for (let i = 0; i < quantidade; i++) {
    const quebrada = rnd.frac() < 0.3;
    const h = quebrada ? altura * rnd.realInRange(0.35, 0.7) : altura;
    const x = esquerda + i * passo;
    g.fillStyle(cor, 1);
    g.fillRect(x, chao - h, 10, h);
    g.fillStyle(sombra, 1);
    g.fillRect(x + 7, chao - h, 3, h);
    g.fillRect(x - 2, chao - 4, 14, 4);
  }
  const largura = (quantidade - 1) * passo + 10;
  g.fillStyle(cor, 1);
  g.fillRect(esquerda - 4, chao - altura - 8, largura * 0.7, 8);
  g.fillTriangle(esquerda - 4, chao - altura - 8, esquerda + largura * 0.35, chao - altura - 26, esquerda + largura * 0.7 - 4, chao - altura - 8);
  g.fillStyle(sombra, 1);
  g.fillRect(esquerda - 4, chao - altura - 2, largura * 0.7, 2);
}

/**
 * Fileira de bolos de nuvem que se sobrepõem. Cada bolo tem a sombra deslocada para baixo e
 * para a direita (luz vindo do alto à esquerda); o brilho fica no topo.
 */
function fileiraDeNuvens(
  g: Grafico,
  rnd: Phaser.Math.RandomDataGenerator,
  larguraTextura: number,
  y: number,
  passo: number,
  raios: readonly [number, number],
  sombra: number,
  cor: number
): void {
  for (let x = 0; x < larguraTextura; x += passo) {
    const r = rnd.between(raios[0], raios[1]);
    const cy = y + rnd.between(-10, 10);
    envolver(larguraTextura, x - r, r * 2 + 8, (dx) => {
      g.fillStyle(sombra, 1);
      g.fillCircle(dx + r + 6, cy + 7, r);
      g.fillStyle(cor, 1);
      g.fillCircle(dx + r, cy, r);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(dx + r - r * 0.3, cy - r * 0.35, r * 0.35);
    });
  }
}

/**
 * Texturas das camadas do céu (geradas uma vez e repetidas na horizontal).
 */
function gerarTexturasCenario(cena: Phaser.Scene): void {
  // Nuvens soltas do fundo: variantes de cúmulo com bolos de tamanhos sorteados
  for (let v = 0; v < CENARIO_FASE1.NUVENS_FUNDO.VARIANTES; v++) {
    const rnd = new Phaser.Math.RandomDataGenerator([`nuvem-fundo-${v}`]);
    const quantidade = rnd.between(5, 8);
    const passo = rnd.between(30, 40);
    const raioMax = rnd.between(30, 42);
    const largura = (quantidade - 1) * passo + raioMax * 2 + 12;
    const altura = raioMax * 2 + 34;
    const linhaBase = altura - 22;
    const cima: number[][] = [];
    const baixo: number[][] = [];
    for (let k = 0; k < quantidade; k++) {
      const t = k / (quantidade - 1);
      const r = Math.round(14 + (raioMax - 14) * Math.sin(Math.PI * t) * rnd.realInRange(0.75, 1));
      cima.push([raioMax + 6 + k * passo, linhaBase - r * 0.65 + rnd.between(-4, 4), r]);
    }
    for (let k = 0; k < quantidade - 1; k++) {
      baixo.push([raioMax + 6 + k * passo + passo / 2, linhaBase + 4, rnd.between(12, 17)]);
    }
    gerar(cena, `nuvem-fundo-${v}`, largura, altura, (g) => cumulo(g, 1, { cima, baixo }));
  }

  // Ilhas distantes com torres e colunas minúsculas, quase da cor do céu
  gerar(cena, 'bg-ilhas-distantes', 1600, 270, (g) => {
    const rnd = new Phaser.Math.RandomDataGenerator(['ilhas']);
    for (let k = 0; k < 7; k++) {
      const w = rnd.between(70, 190);
      const cx = k * 230 + rnd.between(40, 160);
      const cy = rnd.between(40, 150);
      envolver(1600, cx - w / 2, w, (dx) => {
        const centro = dx + w / 2;
        silhuetaIlha(g, centro, cy, w, C.DISTANTE_1, C.DISTANTE_2, C.DISTANTE_LUZ);
        g.fillStyle(C.DISTANTE_1, 1);
        if (k % 2 === 0) {
          g.fillRect(centro - 8, cy - 34, 16, 34);
          g.fillTriangle(centro - 10, cy - 34, centro + 10, cy - 34, centro, cy - 50);
        } else {
          for (let c = 0; c < 4; c++) g.fillRect(centro - w * 0.3 + c * 12, cy - 16, 4, 16);
          g.fillRect(centro - w * 0.3 - 2, cy - 20, 44, 4);
        }
      });
    }
  });

  // Ruínas a meia distância: ilhas maiores com colunatas, arco e cachoeira
  gerar(cena, 'bg-ruinas', 1800, 330, (g) => {
    const rnd = new Phaser.Math.RandomDataGenerator(['ruinas']);
    const ilhas = [
      { cx: 220, cy: 130, w: 300 },
      { cx: 820, cy: 190, w: 240 },
      { cx: 1400, cy: 110, w: 360 },
    ];
    for (const ilha of ilhas) {
      envolver(1800, ilha.cx - ilha.w / 2, ilha.w, (dx) => {
        const cx = dx + ilha.w / 2;
        // Cachoeira caindo da ponta
        g.fillStyle(0xffffff, 0.45);
        g.fillRect(cx + ilha.w * 0.25, ilha.cy + 10, 6, 330);
        silhuetaIlha(g, cx, ilha.cy, ilha.w, C.DISTANTE_2, C.DISTANTE_3, C.DISTANTE_LUZ);
        colunata(g, cx - ilha.w * 0.38, ilha.cy, 5, 74, C.DISTANTE_LUZ, C.DISTANTE_1, rnd);
        // Arco solto no outro lado da ilha
        g.lineStyle(9, C.DISTANTE_LUZ, 1);
        g.beginPath();
        g.arc(cx + ilha.w * 0.24, ilha.cy - 6, 30, Math.PI, 0);
        g.strokePath();
        g.fillStyle(C.DISTANTE_LUZ, 1);
        g.fillRect(cx + ilha.w * 0.24 - 34, ilha.cy - 8, 9, 8);
        g.fillRect(cx + ilha.w * 0.24 + 25, ilha.cy - 8, 9, 8);
      });
    }
  });

  // Mar de nuvens rosa (Rivals): bolos de nuvem sobrepostos, sombra em crescente embaixo à direita
  gerar(cena, 'bg-mar-nuvens', 1024, 200, (g) => {
    const rnd = new Phaser.Math.RandomDataGenerator(['mar']);
    fileiraDeNuvens(g, rnd, 1024, 56, 44, [38, 60], C.NUVEM_SOMBRA, C.NUVEM_PESSEGO);
    g.fillStyle(C.NUVEM_ROSA, 1);
    g.fillRect(0, 100, 1024, 100);
    fileiraDeNuvens(g, rnd, 1024, 96, 40, [30, 50], C.NUVEM_ROSA_SOMBRA, C.NUVEM_ROSA);
    fileiraDeNuvens(g, rnd, 1024, 150, 52, [30, 46], C.NUVEM_ROSA_SOMBRA, C.NUVEM_ROSA);
  });

  // Nuvens brancas mais perto, com sombra lilás
  gerar(cena, 'bg-mar-nuvens-perto', 1024, 120, (g) => {
    const rnd = new Phaser.Math.RandomDataGenerator(['perto']);
    g.fillStyle(C.NUVEM_SOMBRA, 1);
    g.fillRect(0, 80, 1024, 40);
    fileiraDeNuvens(g, rnd, 1024, 60, 42, [26, 40], C.NUVEM_SOMBRA_ESCURA, C.NUVEM);
    fileiraDeNuvens(g, rnd, 1024, 98, 50, [24, 36], C.NUVEM_SOMBRA_ESCURA, C.NUVEM_SOMBRA);
  });

  // Dirigível distante (balão, casco e hélice), nas cores do horizonte
  gerar(cena, 'dirigivel', 240, 120, (g) => {
    g.lineStyle(2, C.DISTANTE_3, 1);
    g.lineBetween(90, 60, 96, 88);
    g.lineBetween(170, 60, 164, 88);
    g.fillStyle(C.DISTANTE_1, 1);
    g.fillEllipse(130, 38, 200, 64);
    g.fillStyle(C.DISTANTE_2, 1);
    g.fillEllipse(130, 50, 186, 36);
    g.fillStyle(C.DISTANTE_LUZ, 1);
    g.fillRect(70, 14, 120, 4);
    g.fillStyle(C.DISTANTE_2, 1);
    g.fillTriangle(30, 38, 6, 10, 14, 40);
    g.fillTriangle(30, 40, 6, 66, 14, 40);
    g.fillStyle(C.DISTANTE_3, 1);
    g.fillRect(84, 86, 92, 16);
    g.fillTriangle(176, 86, 200, 86, 176, 102);
    g.fillTriangle(84, 86, 70, 86, 84, 102);
    g.fillStyle(0xe9a8c8, 1);
    g.fillRect(84, 90, 92, 3);
    g.fillStyle(C.DISTANTE_LUZ, 1);
    for (let x = 96; x < 170; x += 16) g.fillRect(x, 95, 6, 4);
    g.lineStyle(2, C.DISTANTE_3, 1);
    g.lineBetween(70, 94, 60, 94);
    g.fillStyle(C.DISTANTE_3, 1);
    g.fillEllipse(58, 94, 4, 18);
  });

  gerar(cena, 'passaro', 16, 8, (g) => {
    g.lineStyle(2, 0x6d5f99, 1);
    g.beginPath();
    g.moveTo(1, 2);
    g.lineTo(8, 6);
    g.lineTo(15, 2);
    g.strokePath();
  });

  // Faixa de água repetida na vertical
  gerar(cena, 'cachoeira', 16, 64, (g) => {
    const rnd = new Phaser.Math.RandomDataGenerator(['agua']);
    g.fillStyle(C.VENTO, 0.85);
    g.fillRect(2, 0, 12, 64);
    g.fillStyle(0xffffff, 0.9);
    for (let i = 0; i < 9; i++) {
      const x = rnd.between(3, 11);
      const y = rnd.between(0, 52);
      g.fillRect(x, y, 2, rnd.between(8, 18));
    }
    g.fillStyle(C.CIANO_CLARO, 0.6);
    g.fillRect(2, 0, 2, 64);
  });

  // Estátua quebrada sobre pedestal (origem embaixo, no meio)
  gerar(cena, 'estatua-quebrada', 64, 150, (g) => {
    // Pedestal
    g.fillStyle(C.MARMORE, 1);
    g.fillRect(6, 116, 52, 34);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    g.fillRect(44, 116, 14, 34);
    g.fillStyle(C.OURO, 1);
    g.fillRect(2, 110, 60, 6);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillRect(2, 114, 60, 2);
    g.fillRect(14, 128, 36, 2);
    // Manto
    g.fillStyle(C.MARMORE, 1);
    g.fillTriangle(32, 40, 12, 110, 52, 110);
    g.fillRect(22, 40, 20, 40);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    g.fillTriangle(36, 50, 40, 110, 52, 110);
    g.lineStyle(1, C.MARMORE_VEIO, 1);
    g.lineBetween(26, 70, 20, 108);
    g.lineBetween(32, 66, 30, 108);
    // Braço erguido com a lança partida; o outro braço caiu
    g.fillStyle(C.MARMORE, 1);
    g.fillRect(40, 22, 6, 24);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillRect(42, 6, 2, 18);
    g.fillStyle(C.MARMORE_ESCURO, 1);
    g.fillRect(16, 42, 6, 4);
    // Cabeça com louros
    g.fillStyle(C.MARMORE, 1);
    g.fillCircle(32, 30, 10);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    g.fillCircle(36, 33, 6);
    g.fillStyle(C.MUSGO, 1);
    g.fillRect(22, 22, 20, 3);
    // Rachaduras
    g.lineStyle(1, C.MARMORE_ESCURO, 1);
    g.beginPath();
    g.moveTo(28, 21);
    g.lineTo(31, 28);
    g.lineTo(29, 34);
    g.moveTo(24, 80);
    g.lineTo(30, 88);
    g.lineTo(27, 96);
    g.strokePath();
    // Musgo dourado escorrendo do pedestal
    g.fillStyle(C.MUSGO, 1);
    g.fillRect(10, 116, 3, 8);
    g.fillRect(30, 116, 3, 5);
    g.fillRect(50, 116, 3, 10);
  });
}

interface NuvemFundo {
  imagem: Phaser.GameObjects.Image;
  fator: number;
  velocidade: number;
  yBase: number;
  fase: number;
}

/**
 * Céu do Céu Partido: faixas em degradê com pontilhado (pixel art), sol, cinco camadas em
 * parallax, dirigíveis e pássaros. Os objetos de ambiente do mundo (cachoeiras, bandeiras,
 * estátuas) também ficam aqui porque são só visuais e se animam juntos.
 */
export class CenarioFase1 {
  private readonly cena: Phaser.Scene;
  private readonly camadas: { sprite: Phaser.GameObjects.TileSprite; fator: number; deriva: number }[] = [];
  private readonly dirigiveis: { imagem: Phaser.GameObjects.Image; fator: number; velocidade: number }[] = [];
  private readonly passaros: { imagem: Phaser.GameObjects.Image; fase: number; velocidade: number }[] = [];
  private readonly cachoeiras: Phaser.GameObjects.TileSprite[] = [];
  private readonly nuvens: NuvemFundo[] = [];
  private readonly bandeiras: { x: number; base: number }[] = [];
  private readonly graficoBandeiras: Grafico;
  private readonly neblina: Phaser.GameObjects.TileSprite;
  private tempo: number = 0;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    const CEN = CENARIO_FASE1;
    gerarTexturasCenario(cena);

    this.desenharCeu();

    for (const camada of CEN.CAMADAS) {
      const textura = cena.textures.get(camada.chave).getSourceImage();
      const sprite = cena.add
        .tileSprite(0, camada.y, CEN.LARGURA_TELA, textura.height, camada.chave)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(camada.profundidade);
      this.camadas.push({ sprite, fator: camada.fator, deriva: camada.deriva });
    }

    for (let i = 0; i < CEN.NUVENS_FUNDO.QUANTIDADE; i++) {
      const nuvem: NuvemFundo = { imagem: cena.add.image(0, 0, 'nuvem-fundo-0'), fator: 0, velocidade: 0, yBase: 0, fase: 0 };
      this.sortearNuvem(nuvem);
      // Na largada, já espalhadas pela tela
      nuvem.imagem.x = Phaser.Math.Between(-100, CEN.LARGURA_TELA + 100);
      this.nuvens.push(nuvem);
    }

    for (const d of CEN.DIRIGIVEIS) {
      const imagem = cena.add.image(d.x, d.y, 'dirigivel').setScale(d.escala).setScrollFactor(d.fator, 0).setDepth(-17);
      this.dirigiveis.push({ imagem, fator: d.fator, velocidade: d.velocidade });
    }

    const P = CEN.PASSAROS;
    for (let i = 0; i < P.QUANTIDADE; i++) {
      const imagem = cena.add
        .image(i * 260 + Phaser.Math.Between(0, 120), Phaser.Math.Between(P.Y_MIN, P.Y_MAX), 'passaro')
        .setScrollFactor(P.FATOR, 0)
        .setDepth(-9);
      this.passaros.push({ imagem, fase: Math.random() * Math.PI * 2, velocidade: P.VELOCIDADE * Phaser.Math.FloatBetween(0.7, 1.3) });
    }

    const N = CEN.NEBLINA_FRENTE;
    this.neblina = cena.add
      .tileSprite(0, N.y, CEN.LARGURA_TELA, 120, 'bg-mar-nuvens-perto')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(N.alfa)
      .setDepth(N.profundidade);

    // Objetos de ambiente presos ao mundo
    const Q = CEN.CACHOEIRA;
    for (const c of AMBIENTE_FASE1.CACHOEIRAS) {
      const altura = CEN.ALTURA_TELA - c.topo;
      const agua = cena.add
        .tileSprite(c.x, c.topo + 30, Q.LARGURA, altura, 'cachoeira')
        .setOrigin(0.5, 0)
        .setAlpha(Q.ALFA)
        .setDepth(CEN.ILHA.PROFUNDIDADE - 0.5);
      this.cachoeiras.push(agua);
    }

    for (const e of AMBIENTE_FASE1.ESTATUAS) {
      cena.add
        .image(e.x, e.base, 'estatua-quebrada')
        .setOrigin(0.5, 1)
        .setScale(e.espelhar ? -e.escala : e.escala, e.escala)
        .setDepth(-0.5);
    }

    this.bandeiras.push(...AMBIENTE_FASE1.BANDEIRAS);
    this.graficoBandeiras = cena.add.graphics().setDepth(-0.5);
  }

  /** Anima nuvens, dirigíveis, pássaros, água e bandeiras. Roda mesmo com o terminal aberto. */
  public atualizar(delta: number): void {
    const dt = delta / 1000;
    this.tempo += delta;
    const camera = this.cena.cameras.main;
    const largura = CENARIO_FASE1.LARGURA_TELA;

    this.camadas.forEach((c, i) => {
      c.sprite.tilePositionX = camera.scrollX * c.fator + (this.tempo / 1000) * c.deriva;
      if (c.deriva > 0) c.sprite.tilePositionY = Math.sin(this.tempo * 0.0004 + i * 1.7) * CENARIO_FASE1.BALANCO_CAMADAS;
    });
    this.neblina.tilePositionX = camera.scrollX * CENARIO_FASE1.NEBLINA_FRENTE.fator + this.tempo * 0.012;

    // Dirigíveis e pássaros dão a volta quando saem da tela
    const reposicionar = (imagem: Phaser.GameObjects.Image, fator: number) => {
      const naTela = imagem.x - camera.scrollX * fator;
      const margem = 260;
      if (naTela < -margem) imagem.x += largura + margem * 2;
      else if (naTela > largura + margem) imagem.x -= largura + margem * 2;
    };
    // Nuvens soltas: velocidade com rajadas, balanço vertical e nova nuvem sorteada a cada volta
    const NF = CENARIO_FASE1.NUVENS_FUNDO;
    for (const n of this.nuvens) {
      const rajada = 1 + Math.sin(this.tempo * 0.00035 + n.fase * 3) * NF.OSCILACAO_VELOCIDADE;
      n.imagem.x += n.velocidade * rajada * dt;
      n.imagem.y = n.yBase + Math.sin(this.tempo * 0.0005 + n.fase) * NF.BALANCO_Y;
      const naTela = n.imagem.x - camera.scrollX * n.fator;
      const margem = n.imagem.displayWidth / 2 + 40;
      if (naTela < -margem) {
        this.sortearNuvem(n);
        n.imagem.x = camera.scrollX * n.fator + largura + n.imagem.displayWidth / 2 + 40;
      } else if (naTela > largura + margem) {
        this.sortearNuvem(n);
        n.imagem.x = camera.scrollX * n.fator - n.imagem.displayWidth / 2 - 40;
      }
    }

    for (const d of this.dirigiveis) {
      d.imagem.x += d.velocidade * dt;
      d.imagem.y += Math.sin(this.tempo * 0.0006 + d.fator * 40) * 0.05;
      reposicionar(d.imagem, d.fator);
    }
    for (const p of this.passaros) {
      p.imagem.x += p.velocidade * dt;
      p.imagem.scaleY = Math.sin(this.tempo * 0.012 + p.fase) > 0 ? 1 : -0.6;
      reposicionar(p.imagem, CENARIO_FASE1.PASSAROS.FATOR);
    }

    for (const agua of this.cachoeiras) {
      agua.tilePositionY -= CENARIO_FASE1.CACHOEIRA.VELOCIDADE * dt;
    }

    this.desenharBandeiras();
  }

  /**
   * Sorteia distância, forma, tamanho, altura e velocidade de uma nuvem do fundo.
   * A distância decide o resto: perto = maior, mais rápida, mais branca e na frente das ruínas.
   */
  private sortearNuvem(n: NuvemFundo): void {
    const NF = CENARIO_FASE1.NUVENS_FUNDO;
    const perto = Math.random();
    n.fator = Phaser.Math.Linear(NF.FATOR_MIN, NF.FATOR_MAX, perto);
    n.velocidade = -Phaser.Math.Linear(NF.VELOCIDADE_MIN, NF.VELOCIDADE_MAX, perto) * Phaser.Math.FloatBetween(0.8, 1.2);
    n.yBase = Phaser.Math.Between(NF.Y_MIN, NF.Y_MAX);
    n.fase = Math.random() * Math.PI * 2;
    const escala = Phaser.Math.Linear(NF.ESCALA_MIN, NF.ESCALA_MAX, perto) * Phaser.Math.FloatBetween(0.85, 1.15);
    n.imagem
      .setTexture(`nuvem-fundo-${Phaser.Math.Between(0, NF.VARIANTES - 1)}`)
      .setScale(Math.random() < 0.5 ? -escala : escala, escala)
      .setScrollFactor(n.fator, 0)
      .setAlpha(Phaser.Math.Linear(NF.ALFA_LONGE, NF.ALFA_PERTO, perto))
      .setDepth(perto < 0.35 ? -19 : perto < 0.7 ? -15 : -13);
    if (perto < 0.5) n.imagem.setTint(NF.TINT_LONGE);
    else n.imagem.clearTint();
    n.imagem.y = n.yBase;
  }

  private desenharCeu(): void {
    const CEN = CENARIO_FASE1;
    const ceu = this.cena.add.graphics().setScrollFactor(0).setDepth(CEN.PROFUNDIDADE_CEU);
    const faixas = C.CEU_FAIXAS;
    const alturaFaixa = Math.ceil(CEN.ALTURA_TELA / faixas.length);

    faixas.forEach((cor, i) => {
      ceu.fillStyle(cor, 1);
      ceu.fillRect(0, i * alturaFaixa, CEN.LARGURA_TELA, alturaFaixa);
    });
    // Transição pontilhada entre faixas: linhas da cor seguinte cada vez mais grossas
    faixas.forEach((cor, i) => {
      if (i === 0) return;
      const limite = i * alturaFaixa;
      ceu.fillStyle(cor, 1);
      ceu.fillRect(0, limite - 18, CEN.LARGURA_TELA, 2);
      ceu.fillRect(0, limite - 11, CEN.LARGURA_TELA, 3);
      ceu.fillRect(0, limite - 5, CEN.LARGURA_TELA, 4);
    });

    // Sol baixo e difuso, com halo em anéis
    const { x, y, raio } = CEN.SOL;
    for (let i = 4; i >= 1; i--) {
      ceu.fillStyle(C.SOL_HALO, 0.12);
      ceu.fillCircle(x, y, raio + i * 22);
    }
    ceu.fillStyle(C.SOL, 1);
    ceu.fillCircle(x, y, raio);
  }

  private desenharBandeiras(): void {
    const g = this.graficoBandeiras;
    const camera = this.cena.cameras.main;
    g.clear();
    for (const b of this.bandeiras) {
      if (b.x < camera.scrollX - 100 || b.x > camera.scrollX + CENARIO_FASE1.LARGURA_TELA + 100) continue;
      desenharBandeira(g, b.x, b.base, 86, this.tempo);
    }
  }
}

/**
 * Bandeira de mármore e ouro com pano tremulando para a esquerda (contra o jogador). É a única
 * bandeira da fase: os mirantes dos checkpoints e as birutas das correntes de vento usam esta.
 * `base` é onde o pedestal toca o chão e `altura`, do chão até a ponta do mastro.
 */
export function desenharBandeira(g: Grafico, x: number, base: number, altura: number, tempo: number): void {
  const topo = base - altura;

  // Pedestal de mármore com friso dourado
  g.fillStyle(C.MARMORE, 1);
  g.fillRoundedRect(x - 10, base - 9, 20, 9, 2);
  g.fillStyle(C.MARMORE_SOMBRA, 1);
  g.fillRect(x + 3, base - 7, 6, 7);
  g.fillStyle(C.OURO, 1);
  g.fillRect(x - 10, base - 10, 20, 3);

  // Mastro roliço com anéis dourados e ponta de lança
  g.fillStyle(C.MARMORE, 1);
  g.fillRect(x - 2, topo, 5, altura - 9);
  g.fillStyle(C.MARMORE_ESCURO, 1);
  g.fillRect(x + 2, topo, 1, altura - 9);
  g.fillStyle(C.MARMORE_LUZ, 1);
  g.fillRect(x - 1, topo, 1, altura - 9);
  g.fillStyle(C.OURO, 1);
  for (const y of [topo + 34, base - 22]) g.fillRect(x - 3, y, 7, 3);
  g.fillCircle(x + 0.5, topo - 1, 4);
  g.fillTriangle(x - 3, topo - 4, x + 4, topo - 4, x + 0.5, topo - 14);
  g.fillStyle(C.OURO_CLARO, 1);
  g.fillRect(x - 1, topo - 10, 1, 6);

  // Pano em rabo de andorinha tremulando para a esquerda (o vento sopra contra o jogador):
  // cada gomo é sombreado pela inclinação da onda, como um tecido de verdade
  const segmentos = 8;
  const comprimento = 52;
  const alturaPano = 28;
  const cima: Phaser.Types.Math.Vector2Like[] = [];
  const baixo: Phaser.Types.Math.Vector2Like[] = [];
  const inclinacao: number[] = [];
  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos;
    const fase = tempo * 0.008 - i * 0.8;
    const onda = Math.sin(fase) * 5 * t;
    const px = x - 2 - t * comprimento + Math.abs(Math.cos(fase)) * 2 * t;
    cima.push({ x: px, y: topo + 2 + onda + t * 2 });
    baixo.push({ x: px, y: topo + 2 + alturaPano + onda - t * 5 });
    inclinacao.push(Math.cos(fase));
  }
  for (let i = 0; i < segmentos; i++) {
    const cor = inclinacao[i] > 0.35 ? C.BANDEIRA_LUZ : inclinacao[i] < -0.35 ? C.BANDEIRA_SOMBRA : C.BANDEIRA;
    g.fillStyle(cor, 1);
    if (i < segmentos - 1) {
      poligono(g, [cima[i], cima[i + 1], baixo[i + 1], baixo[i]]);
    } else {
      // Último gomo com o corte em V
      const corte = { x: (cima[i].x + cima[i + 1].x) / 2, y: (cima[i + 1].y + baixo[i + 1].y) / 2 };
      poligono(g, [cima[i], cima[i + 1], corte, baixo[i + 1], baixo[i]]);
    }
  }
  // Bainha escura nas bordas
  g.lineStyle(1, C.BANDEIRA_SOMBRA, 1);
  g.strokePoints(cima.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
  g.strokePoints(baixo.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
  // Emblema: sol dourado com um arco de vento, no gomo perto do mastro
  const meioX = (cima[2].x + cima[3].x) / 2;
  const meioY = (cima[2].y + baixo[3].y) / 2;
  g.fillStyle(C.OURO, 1);
  g.fillCircle(meioX, meioY, 5);
  g.fillStyle(C.OURO_CLARO, 1);
  g.fillCircle(meioX - 1, meioY - 1, 2);
  g.lineStyle(1, C.OURO, 1);
  g.beginPath();
  g.arc(meioX, meioY, 8, -Math.PI * 0.9, Math.PI * 0.1);
  g.strokePath();
}

/**
 * Ilha flutuante de mármore: laje com friso dourado (TileSprite, nítida em qualquer largura)
 * e, embaixo, rocha em camadas com musgo dourado, cristais e pedrinhas soltas.
 * A colisão continua no corpo invisível de 'marmore-bloco'; isto é só o visual.
 */
export function criarIlhaFlutuante(cena: Phaser.Scene, x: number, topo: number, largura: number, arena = false): void {
  const I = CENARIO_FASE1.ILHA;
  const esquerda = x - largura / 2;
  const direita = x + largura / 2;
  const base = topo + 36;
  const rnd = new Phaser.Math.RandomDataGenerator([`ilha-${x}-${topo}`]);

  cena.add.tileSprite(x, topo + 18, largura, 36, 'marmore-topo').setDepth(0);

  const frente = cena.add.graphics().setDepth(0.5);
  frente.fillStyle(C.MARMORE_ESCURO, 1);
  frente.fillRect(esquerda, topo + 5, 3, 31);
  frente.fillRect(direita - 3, topo + 5, 3, 31);
  frente.fillStyle(C.OURO_ESCURO, 1);
  frente.fillRect(esquerda, topo, 4, 5);
  frente.fillRect(direita - 4, topo, 4, 5);

  const g = cena.add.graphics().setDepth(I.PROFUNDIDADE);
  let inicioRocha = base;

  if (arena) {
    // Arena: tambor de mármore com friso grego dourado antes da rocha
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    g.fillRect(esquerda, base, largura, 34);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillRect(esquerda, base + 4, largura, 3);
    g.fillRect(esquerda, base + 26, largura, 3);
    g.fillStyle(C.OURO, 1);
    for (let mx = esquerda + 4; mx < direita - 16; mx += 20) {
      g.fillRect(mx, base + 10, 12, 2);
      g.fillRect(mx + 10, base + 10, 2, 12);
      g.fillRect(mx + 4, base + 20, 8, 2);
      g.fillRect(mx + 4, base + 14, 2, 8);
    }
    inicioRocha = base + 34;
  }

  const fundo = Phaser.Math.Clamp(largura * I.PROPORCAO_FUNDO, I.FUNDO_MIN, I.FUNDO_MAX);
  const passos = Math.max(5, Math.round(largura / 26));
  const ruido = Array.from({ length: passos + 1 }, () => rnd.between(-9, 9));
  const deslocamentoPonta = rnd.realInRange(-0.12, 0.12);
  const perfil = (t: number) => Math.pow(Math.max(0, Math.sin(Math.PI * Phaser.Math.Clamp(t + deslocamentoPonta * Math.sin(Math.PI * t), 0, 1))), 0.75);
  const contorno = (escala: number): Phaser.Types.Math.Vector2Like[] => {
    const pontos: Phaser.Types.Math.Vector2Like[] = [{ x: esquerda, y: inicioRocha }];
    for (let i = 1; i < passos; i++) {
      const t = i / passos;
      pontos.push({ x: esquerda + t * largura, y: inicioRocha + (fundo * perfil(t) + ruido[i]) * escala });
    }
    pontos.push({ x: direita, y: inicioRocha });
    return pontos;
  };

  // Estratos: escuro por fora, claro perto da laje (luz vindo de cima)
  g.fillStyle(C.ROCHA_ESCURA, 1);
  poligono(g, contorno(1));
  g.fillStyle(C.ROCHA, 1);
  poligono(g, contorno(0.68));
  g.fillStyle(C.ROCHA_CLARA, 1);
  poligono(g, contorno(0.32));
  g.fillStyle(C.MARMORE_ESCURO, 1);
  g.fillRect(esquerda, inicioRocha, largura, 4);

  // Musgo dourado escorrendo da borda
  for (let i = 0; i < largura / 28; i++) {
    const mx = esquerda + 6 + rnd.frac() * (largura - 12);
    const comprimento = rnd.between(4, 16);
    g.fillStyle(C.MUSGO, 1);
    g.fillRect(mx, inicioRocha, 3, comprimento);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillRect(mx, inicioRocha + comprimento, 3, 2);
  }

  // Cristais de vento presos na rocha
  const cristais = largura > 200 ? 2 : 1;
  for (let i = 0; i < cristais; i++) {
    const t = rnd.realInRange(0.3, 0.7);
    const cx = esquerda + t * largura;
    const cy = inicioRocha + fundo * perfil(t) * 0.55;
    g.fillStyle(C.CIANO_CLARO, 0.25);
    g.fillCircle(cx, cy, 10);
    g.fillStyle(C.CIANO_CLARO, 1);
    g.fillTriangle(cx - 4, cy, cx + 4, cy, cx, cy - 10);
    g.fillStyle(C.CIANO, 1);
    g.fillTriangle(cx - 4, cy, cx + 4, cy, cx, cy + 8);
  }

  // Pedrinhas soltas flutuando sob a ponta
  for (let i = 0; i < 3; i++) {
    const px = x + rnd.between(-largura * 0.2, largura * 0.2);
    const py = inicioRocha + fundo + rnd.between(10, 40);
    const tamanho = rnd.between(4, 9);
    g.fillStyle(C.ROCHA_ESCURA, 1);
    g.fillRect(px, py, tamanho, tamanho);
    g.fillStyle(C.ROCHA_CLARA, 1);
    g.fillRect(px, py, tamanho, 2);
  }
}

/**
 * Pilar que separa as salas da escada: fuste canelado repetido e capitel dourado.
 */
export function criarPilarMarmore(cena: Phaser.Scene, x: number, y: number, largura: number, altura: number): void {
  const topo = y - altura / 2;
  cena.add.tileSprite(x, y, largura, altura, 'fuste-coluna').setDepth(0);
  const g = cena.add.graphics().setDepth(0.5);
  g.fillStyle(C.OURO_ESCURO, 1);
  g.fillRect(x - largura / 2 - 8, topo, largura + 16, 12);
  g.fillStyle(C.OURO, 1);
  g.fillRect(x - largura / 2 - 8, topo, largura + 16, 8);
  g.fillStyle(C.OURO_CLARO, 1);
  g.fillRect(x - largura / 2 - 6, topo + 2, largura + 12, 2);
  // Volutas do capitel
  g.fillStyle(C.OURO_ESCURO, 1);
  g.fillCircle(x - largura / 2 - 4, topo + 14, 5);
  g.fillCircle(x + largura / 2 + 4, topo + 14, 5);
  g.fillStyle(C.OURO, 1);
  g.fillCircle(x - largura / 2 - 4, topo + 14, 2);
  g.fillCircle(x + largura / 2 + 4, topo + 14, 2);
}
