import Phaser from 'phaser';
import {
  COR,
  Pincel,
  desenharLogoMegaBrain,
  folhaPixel,
  hash3,
  misturar,
  retratoDataUrl,
  sombrear,
  texturaPixel,
  texturaSuave,
} from '../ArteFaseFinal';
import { EXTERIOR_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';

/**
 * Texturas do exterior da Mega Brain Tower, todas desenhadas por código em pixel art
 * (resolução de arte = metade da tela; exibidas em 2x). Chaves com prefixo `ff-`.
 */

export const TEX_EXTERIOR = {
  CEU: 'ff-ceu',
  SKYLINE_LONGE: 'ff-skyline-longe',
  SKYLINE_PERTO: 'ff-skyline-perto',
  NUVEM_TEMPESTADE: 'ff-nuvem-tempestade',
  TORRE: 'ff-torre',
  FACHADAS: 'ff-fachadas',
  CHAO: 'ff-chao-rua',
  POSTE: 'ff-poste',
  CONE_LUZ: 'ff-cone-luz',
  GUARITA: 'ff-guarita',
  VALDIR: 'ff-valdir',
  TOTEM_TERMO: 'ff-totem-termo',
  PORTA: 'ff-porta',
} as const;

const E = EXTERIOR_FASE_FINAL;
const S = ESCALA_ARTE;

/** Dimensões em pixels de arte derivadas das coordenadas do mundo. */
export const ARTE_TORRE = {
  LARGURA: (E.TORRE.X_DIREITA - E.TORRE.X_ESQUERDA) / S, // 450
  ALTURA: (E.CHAO_Y - E.TORRE.TOPO_Y) / S, // 1760
  /** Converte um y do mundo em y de arte da torre. */
  y: (yMundo: number): number => (yMundo - E.TORRE.TOPO_Y) / S,
  /** Converte um x do mundo em x de arte da torre. */
  x: (xMundo: number): number => (xMundo - E.TORRE.X_ESQUERDA) / S,
};

export function gerarTexturasExterior(cena: Phaser.Scene): void {
  gerarCeu(cena);
  gerarSkylineLonge(cena);
  gerarSkylinePerto(cena);
  gerarNuvemTempestade(cena);
  gerarTorre(cena);
  gerarFachadas(cena);
  gerarChao(cena);
  gerarPoste(cena);
  gerarConeLuz(cena);
  gerarGuarita(cena);
  gerarValdir(cena);
  gerarTotemTermo(cena);
  gerarPorta(cena);
}

/* =========================================================================
 * CÉU E SKYLINE
 * ========================================================================= */

function gerarCeu(cena: Phaser.Scene): void {
  texturaPixel(cena, TEX_EXTERIOR.CEU, 320, 180, (p) => {
    p.degradePontilhado(0, 0, 320, 180, [COR.preto, COR.noite0, COR.noite1, COR.noite2, COR.horizonte], 1.15);
    // Poucas estrelas: a poluição luminosa venceu
    for (let i = 0; i < 46; i++) {
      const x = Math.floor(hash3(i, 3, 7) * 320);
      const y = Math.floor(hash3(i, 5, 11) * 90);
      p.ponto(x, y, hash3(i, 1, 1) > 0.8 ? '#c7d2ff' : '#5a6290');
    }
  });
}

/** Silhuetas de prédios com janelas, repetível na horizontal (TileSprite). */
function desenharSkyline(
  p: Pincel,
  largura: number,
  altura: number,
  semente: number,
  cor: string,
  alturaMin: number,
  alturaMax: number,
  chanceJanela: number,
  neon: boolean
): void {
  let x = 0;
  let i = 0;
  while (x < largura) {
    const w = Math.min(largura - x, 16 + Math.floor(hash3(i, semente, 1) * 34));
    const h = alturaMin + Math.floor(hash3(i, semente, 2) * (alturaMax - alturaMin));
    const topo = altura - h;
    const corPredio = hash3(i, semente, 9) > 0.5 ? cor : misturar(cor, COR.roxo, 0.25);
    p.px(x, topo, w, h, corPredio);
    p.px(x, topo, w, 1, misturar(corPredio, '#ffffff', 0.08));

    // Janelas acesas em grade
    for (let jy = topo + 4; jy < altura - 3; jy += 5) {
      for (let jx = x + 3; jx < x + w - 3; jx += 4) {
        const r = hash3(jx, jy, semente);
        if (r < chanceJanela) {
          const tom = hash3(jx, jy, semente + 1);
          const c = tom < 0.55 ? COR.janelaFria : tom < 0.8 ? COR.janelaRoxa : COR.janelaQuente;
          p.px(jx, jy, 2, 2, misturar(corPredio, c, 0.55));
        }
      }
    }

    // Antena com luz vermelha de aviso
    if (hash3(i, semente, 4) > 0.6 && w > 20) {
      const ax = x + Math.floor(w / 2);
      p.px(ax, topo - 10, 1, 10, misturar(corPredio, '#ffffff', 0.15));
      p.ponto(ax, topo - 11, COR.vermelho);
    }
    // Faixa de neon vertical em alguns prédios da camada da frente
    if (neon && hash3(i, semente, 5) > 0.72 && h > 60) {
      const c = hash3(i, semente, 6) > 0.5 ? COR.magenta : COR.ciano;
      p.px(x + 1, topo + 6, 1, h - 12, misturar(corPredio, c, 0.7));
    }
    x += w;
    i++;
  }
}

function gerarSkylineLonge(cena: Phaser.Scene): void {
  texturaPixel(cena, TEX_EXTERIOR.SKYLINE_LONGE, 640, 220, (p) =>
    desenharSkyline(p, 640, 220, 17, COR.predioFundo, 70, 210, 0.1, false)
  );
}

function gerarSkylinePerto(cena: Phaser.Scene): void {
  texturaPixel(cena, TEX_EXTERIOR.SKYLINE_PERTO, 640, 260, (p) =>
    desenharSkyline(p, 640, 260, 41, COR.predioMeio, 60, 230, 0.2, true)
  );
}

function gerarNuvemTempestade(cena: Phaser.Scene): void {
  texturaPixel(cena, TEX_EXTERIOR.NUVEM_TEMPESTADE, 260, 70, (p) => {
    const base = '#1b1534';
    const meio = '#251c46';
    const borda = '#3b2c66';
    const bolhas = [
      [40, 44, 34, 18],
      [80, 34, 38, 24],
      [128, 40, 44, 22],
      [176, 32, 40, 24],
      [220, 44, 34, 18],
    ];
    for (const [cx, cy, rx, ry] of bolhas) p.elipse(cx, cy - 1, rx, ry, borda);
    for (const [cx, cy, rx, ry] of bolhas) p.elipse(cx, cy + 2, rx, ry, meio);
    for (const [cx, cy, rx, ry] of bolhas) p.elipse(cx, cy + 6, rx - 2, ry - 4, base);
  });
}

/* =========================================================================
 * TORRE
 * ========================================================================= */

/** Janelas de um bloco da torre, com nervuras verticais e acesas por hash. */
function janelasTorre(p: Pincel, x0: number, x1: number, y0: number, y1: number, semente: number): void {
  let coluna = 0;
  for (let x = x0 + 4; x + 6 <= x1 - 3; x += 10) {
    coluna++;
    if (coluna % 6 === 0) {
      // Nervura estrutural
      p.px(x, y0, 6, y1 - y0, COR.predioBorda);
      p.px(x + 2, y0, 1, y1 - y0, misturar(COR.predioBorda, COR.ciano, 0.25));
      continue;
    }
    for (let y = y0 + 5; y + 9 <= y1 - 3; y += 14) {
      const r = hash3(x, y, semente);
      let cor: string = COR.janelaApagada;
      if (r < 0.3) {
        const t = hash3(x, y, semente + 7);
        cor = t < 0.65 ? misturar(COR.predioFrente, COR.janelaFria, 0.55) : t < 0.9 ? misturar(COR.predioFrente, COR.janelaRoxa, 0.6) : COR.janelaQuente;
      }
      p.px(x, y, 6, 9, cor);
      p.px(x, y, 6, 1, sombrear(cor, 0.35));
    }
  }
}

function gerarTorre(cena: Phaser.Scene): void {
  const W = ARTE_TORRE.LARGURA;
  const H = ARTE_TORRE.ALTURA;
  const cx = W / 2;
  texturaPixel(cena, TEX_EXTERIOR.TORRE, W, H, (p) => {
    const yCoroa = 70;
    const ySuperior = 250;
    const yPrincipal = 520;
    const yLobby = H - 122;

    // Antena
    p.px(cx - 1, 2, 3, yCoroa - 2, COR.metal);
    p.px(cx, 2, 1, yCoroa - 2, COR.metalClaro);
    for (let y = 16; y < yCoroa; y += 14) p.px(cx - 4, y, 9, 1, COR.metal);
    p.disco(cx, 3, 2, COR.vermelho);

    // Coroa afunilada com o logo
    for (let y = yCoroa; y < ySuperior; y++) {
      const t = (y - yCoroa) / (ySuperior - yCoroa);
      const meia = Math.round(60 + t * 70);
      p.px(cx - meia, y, meia * 2, 1, COR.predioMeio);
      p.ponto(cx - meia, y, COR.magenta);
      p.ponto(cx + meia - 1, y, COR.magenta);
    }
    // Moldura do logo
    const yLogo = ARTE_TORRE.y(E.TORRE.LOGO_Y);
    p.disco(cx, yLogo, 58, COR.noite0);
    p.disco(cx, yLogo, 56, '#120a1e');
    desenharLogoMegaBrain(p, cx, yLogo, 46);

    // Bloco superior
    const meiaSup = 170;
    p.px(cx - meiaSup, ySuperior, meiaSup * 2, yPrincipal - ySuperior, COR.predioFrente);
    janelasTorre(p, cx - meiaSup, cx + meiaSup, ySuperior + 8, yPrincipal - 6, 3);
    p.px(cx - meiaSup, ySuperior, 2, yPrincipal - ySuperior, COR.ciano);
    p.px(cx + meiaSup - 2, ySuperior, 2, yPrincipal - ySuperior, COR.ciano);
    p.px(cx - meiaSup - 6, ySuperior, meiaSup * 2 + 12, 4, COR.predioBorda);
    p.px(cx - meiaSup - 6, ySuperior + 4, meiaSup * 2 + 12, 1, COR.ciano);

    // Bloco principal
    p.px(0, yPrincipal, W, H - yPrincipal, COR.predioFrente);
    janelasTorre(p, 0, W, yPrincipal + 30, yLobby - 30, 5);
    p.px(0, yPrincipal, 2, H - yPrincipal, COR.magenta);
    p.px(W - 2, yPrincipal, 2, H - yPrincipal, COR.magenta);
    p.px(0, yPrincipal, W, 4, COR.predioBorda);
    p.px(0, yPrincipal + 4, W, 1, COR.magenta);

    // Faixas vermelhas da marca, com o nome da torre na primeira
    for (let y = yPrincipal + 12; y < yLobby - 40; y += 300) {
      p.px(0, y, W, 12, COR.vermelhoEscuro);
      p.px(0, y + 1, W, 1, COR.vermelho);
      p.px(0, y + 10, W, 1, COR.vermelho);
      p.textoCentro('MEGA BRAIN TOWER // PENSE MENOS', cx, y + 4, '#ffd0d6', 1);
    }

    // Lobby envidraçado no térreo
    p.px(0, yLobby, W, 122, '#0b0f26');
    for (let x = 6; x < W - 6; x += 36) {
      p.px(x, yLobby + 26, 30, 92, '#1a2450');
      p.px(x, yLobby + 26, 30, 46, '#1d2a5c');
      p.px(x + 2, yLobby + 30, 1, 84, misturar('#1a2450', COR.ciano, 0.35));
    }
    // Marquise com neon ciano e o nome da torre, acima da porta
    p.px(40, yLobby + 4, W - 80, 14, COR.predioBorda);
    p.px(40, yLobby + 17, W - 80, 2, COR.ciano);
    p.textoCentro('MEGA BRAIN TOWER', cx, yLobby + 7, COR.vermelho, 1);

    // Vão da porta: o saguão aceso aparece quando as folhas abrem
    const xPorta = ARTE_TORRE.x(E.PORTA.x);
    const meiaPorta = E.PORTA.LARGURA_FOLHA / S;
    const alturaPorta = E.PORTA.ALTURA / S;
    const topoPorta = H - alturaPorta;
    p.px(xPorta - meiaPorta - 4, topoPorta - 4, meiaPorta * 2 + 8, alturaPorta + 4, COR.metal);
    p.degradePontilhado(xPorta - meiaPorta, topoPorta, meiaPorta * 2, alturaPorta, ['#203a6a', '#2d5f8f', '#5ab6d6'], 1);
    // Catracas e balcão da recepção ao fundo
    p.px(xPorta - meiaPorta + 4, H - 22, meiaPorta * 2 - 8, 3, COR.ciano);
    for (let x = xPorta - meiaPorta + 8; x < xPorta + meiaPorta - 6; x += 12) p.px(x, H - 30, 3, 10, COR.metalClaro);
  });
}

/* =========================================================================
 * FACHADAS DA RUA
 * ========================================================================= */

interface Predio {
  x0: number;
  x1: number;
  topo: number;
  cor: string;
  loja: string;
  corLoja: string;
}

const PREDIOS_RUA: Predio[] = [
  { x0: 0, x1: 172, topo: 40, cor: '#231a44', loja: 'SUCATA & CIA', corLoja: COR.ciano },
  { x0: 172, x1: 330, topo: 0, cor: '#16204a', loja: 'CAFE SEM IA', corLoja: COR.janelaQuente },
  { x0: 330, x1: 452, topo: 74, cor: '#2a1838', loja: 'PROMPTS 24H', corLoja: COR.magenta },
  { x0: 452, x1: 612, topo: 30, cor: '#1a1d40', loja: 'CONSERTO DE ROBO', corLoja: COR.ciano },
  { x0: 612, x1: 820, topo: 12, cor: '#20173e', loja: 'LOJA OFICIAL MB', corLoja: COR.vermelho },
];

function gerarFachadas(cena: Phaser.Scene): void {
  const W = (E.FACHADAS.X_FIM - E.FACHADAS.X_INICIO) / S;
  const H = (E.CHAO_Y - E.FACHADAS.TOPO_Y) / S;
  texturaPixel(cena, TEX_EXTERIOR.FACHADAS, W, H, (p) => {
    PREDIOS_RUA.forEach((pr, i) => {
      const w = pr.x1 - pr.x0;
      p.px(pr.x0, pr.topo, w, H - pr.topo, pr.cor);
      p.px(pr.x0, pr.topo, w, 2, misturar(pr.cor, '#ffffff', 0.12));
      p.px(pr.x0, pr.topo, 1, H - pr.topo, sombrear(pr.cor, 0.4));

      // Janelas dos andares
      for (let y = pr.topo + 8; y < H - 52; y += 16) {
        for (let x = pr.x0 + 8; x + 10 < pr.x1 - 4; x += 16) {
          const r = hash3(x, y, 77 + i);
          const cor = r < 0.32 ? (hash3(x, y, 5) > 0.5 ? COR.janelaQuente : COR.janelaFria) : COR.janelaApagada;
          p.px(x, y, 10, 10, sombrear(cor, r < 0.32 ? 0.25 : 0));
          p.px(x, y + 5, 10, 1, sombrear(pr.cor, 0.3));
          if (r > 0.9) p.px(x - 2, y + 10, 14, 2, COR.metal); // ar-condicionado
        }
      }

      // Faixa de neon vertical (vermelho no prédio da loja oficial)
      const corNeon = i === 4 ? COR.vermelho : i % 2 === 0 ? COR.magenta : COR.ciano;
      p.px(pr.x1 - 4, pr.topo + 10, 2, H - pr.topo - 60, misturar(pr.cor, corNeon, 0.85));

      // Loja no térreo
      const yLoja = H - 46;
      p.px(pr.x0 + 4, yLoja, w - 8, 46, sombrear(pr.cor, 0.35));
      p.px(pr.x0 + 4, yLoja, w - 8, 9, COR.contorno);
      p.textoCentro(pr.loja, pr.x0 + w / 2, yLoja + 2, pr.corLoja, 1);
      p.px(pr.x0 + 4, yLoja + 9, w - 8, 1, pr.corLoja);
      // Vitrine: vidro escuro com o interior aceso, prateleiras, produtos, caixilhos e reflexo
      const vx = pr.x0 + 10;
      const vw = w - 44;
      p.degradePontilhado(vx, yLoja + 14, vw, 30, [misturar(pr.cor, pr.corLoja, 0.3), sombrear(pr.cor, 0.45)], 1);
      for (const yy of [yLoja + 24, yLoja + 34]) {
        p.px(vx + 2, yy, vw - 4, 1, sombrear(pr.cor, 0.6));
        for (let xx = vx + 4; xx < vx + vw - 6; xx += 5) {
          const h = hash3(xx, yy, i);
          if (h < 0.6) {
            const alt = 2 + Math.floor(h * 6);
            const corItem = h < 0.2 ? pr.corLoja : h < 0.4 ? COR.metalClaro : misturar(pr.corLoja, COR.branco, 0.3);
            p.px(xx, yy - alt, 3, alt, sombrear(corItem, 0.35));
          }
        }
      }
      for (let xx = vx; xx <= vx + vw; xx += Math.max(18, Math.floor(vw / 4))) p.px(xx, yLoja + 14, 1, 30, '#0a0b16');
      p.px(vx, yLoja + 14, vw, 1, misturar(pr.cor, pr.corLoja, 0.6));
      p.linha(vx + 6, yLoja + 42, vx + 18, yLoja + 16, misturar(pr.cor, '#ffffff', 0.18));
      p.linha(vx + 10, yLoja + 42, vx + 22, yLoja + 16, misturar(pr.cor, '#ffffff', 0.12));
      p.px(pr.x1 - 28, yLoja + 16, 16, 30, '#0a0b16');
      p.px(pr.x1 - 27, yLoja + 17, 1, 28, misturar('#0a0b16', pr.corLoja, 0.4));
    });

    // Escada de incêndio no primeiro prédio
    for (let y = 70; y < H - 60; y += 34) {
      p.px(20, y, 70, 2, COR.metal);
      p.linha(24, y + 2, 84, y + 32, COR.metal);
      for (let x = 22; x < 90; x += 6) p.px(x, y - 8, 1, 8, COR.metal);
    }
    // Caixas d'água e antenas nos telhados
    p.px(370, 74 - 14, 24, 14, COR.metal);
    p.px(372, 74 - 18, 20, 4, COR.metalClaro);
    p.px(700, 12 - 20, 2, 20, COR.metal);
    p.ponto(700, 12 - 21, COR.vermelho);
  });
}

/* =========================================================================
 * RUA, POSTES, GUARITA
 * ========================================================================= */

function gerarChao(cena: Phaser.Scene): void {
  const W = E.LARGURA / S;
  texturaPixel(cena, TEX_EXTERIOR.CHAO, W, 50, (p) => {
    // Calçada
    p.px(0, 0, W, 15, COR.concreto);
    p.px(0, 0, W, 1, COR.concretoClaro);
    for (let x = 0; x < W; x += 16) p.px(x, 1, 1, 14, COR.concretoEscuro);
    p.px(0, 8, W, 1, sombrear(COR.concreto, 0.2));
    // Meio-fio
    p.px(0, 15, W, 4, COR.concretoClaro);
    p.px(0, 18, W, 1, COR.concretoEscuro);
    // Asfalto molhado
    p.px(0, 19, W, 31, COR.asfalto);
    for (let x = 0; x < W; x += 44) p.px(x, 36, 22, 2, sombrear(COR.faixa, 0.45));
    // Reflexos dos neons e das luzes na água
    const reflexos: Array<[number, string]> = [
      [80, COR.ciano],
      [150, COR.janelaQuente],
      [195, COR.magenta],
      [290, COR.ciano],
      [400, COR.vermelho],
      [560, COR.ciano],
      [700, COR.magenta],
      [780, COR.vermelho],
      [1050, COR.vermelho],
      [1110, COR.ciano],
      [1200, COR.magenta],
    ];
    for (const [x, cor] of reflexos) {
      for (let y = 20; y < 50; y++) {
        const largura = 2 + Math.floor(hash3(x, y, 2) * 5);
        if (hash3(x, y, 3) < 0.55) p.px(x - largura / 2 + Math.floor(hash3(x, y, 9) * 3) - 1, y, largura, 1, misturar(COR.asfalto, cor, 0.32 - (y - 20) * 0.006));
      }
    }
    // Poças
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(hash3(i, 9, 9) * W);
      p.px(x, 2 + Math.floor(hash3(i, 1, 9) * 10), 8 + Math.floor(hash3(i, 2, 9) * 10), 1, misturar(COR.concreto, COR.ciano, 0.25));
    }
  });
}

function gerarPoste(cena: Phaser.Scene): void {
  texturaPixel(cena, TEX_EXTERIOR.POSTE, 30, 120, (p) => {
    p.px(4, 112, 8, 8, COR.metal);
    p.px(6, 12, 3, 104, COR.metal);
    p.px(7, 12, 1, 104, COR.metalClaro);
    p.px(6, 10, 18, 3, COR.metal);
    p.px(18, 10, 10, 5, COR.metalClaro);
    p.px(19, 15, 8, 1, '#e8fbff');
    p.px(8, 60, 6, 10, COR.predioBorda); // placa de rua
    p.px(9, 61, 4, 8, COR.ciano);
  });
}

function gerarConeLuz(cena: Phaser.Scene): void {
  texturaSuave(cena, TEX_EXTERIOR.CONE_LUZ, 200, 300, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(85, 0);
    ctx.lineTo(115, 0);
    ctx.lineTo(200, 300);
    ctx.lineTo(0, 300);
    ctx.closePath();
    ctx.fill();
  });
}

function gerarGuarita(cena: Phaser.Scene): void {
  texturaPixel(cena, TEX_EXTERIOR.GUARITA, 56, 72, (p) => {
    p.px(2, 8, 52, 64, COR.concreto);
    p.px(2, 8, 52, 1, COR.concretoClaro);
    p.px(0, 4, 56, 5, COR.predioBorda);
    p.px(0, 8, 56, 1, COR.ciano);
    p.textoCentro('PORTARIA', 28, 13, COR.janelaQuente, 1);
    // Janela com luz amarelada e a TV do porteiro
    p.px(8, 22, 40, 22, '#3a2e1c');
    p.px(9, 23, 38, 20, misturar(COR.janelaQuente, '#3a2e1c', 0.45));
    p.px(34, 30, 10, 8, '#101428');
    p.px(35, 31, 8, 6, misturar(COR.ciano, '#101428', 0.4));
    p.px(8, 44, 40, 3, COR.concretoClaro);
    // Porta lateral e cartaz
    p.px(10, 50, 14, 22, '#14172a');
    p.px(30, 52, 16, 12, COR.branco);
    p.texto('PONTO', 31, 54, COR.vermelhoEscuro, 1);
    p.px(32, 60, 12, 1, COR.metal);
  });
}

/* =========================================================================
 * VALDIR, O PORTEIRO
 * ========================================================================= */

/** Valdir virado para a esquerda. `respira` levanta cabeça e ombros 1 pixel. */
function desenharValdir(p: Pincel, ox: number, oy: number, respira: boolean): void {
  const r = respira ? -1 : 0;
  const x = (v: number) => ox + v;
  const y = (v: number) => oy + v;

  // Sapatos e calça
  p.px(x(10), y(56), 7, 4, '#15161f');
  p.px(x(19), y(56), 7, 4, '#15161f');
  p.px(x(9), y(59), 8, 1, '#0a0a12');
  p.px(x(11), y(40), 6, 16, COR.calca);
  p.px(x(19), y(40), 6, 16, COR.calca);
  p.px(x(23), y(40), 2, 16, sombrear(COR.calca, 0.3));

  // Tronco com barriga de quem toma café há onze anos
  p.px(x(9), y(22 + r), 19, 20 - r, COR.uniforme);
  p.px(x(7), y(31), 3, 9, COR.uniforme);
  p.px(x(24), y(22 + r), 4, 20 - r, COR.uniformeSombra);
  p.px(x(18), y(23 + r), 1, 18, COR.uniformeSombra);
  p.px(x(9), y(40), 19, 2, '#151a30'); // cinto
  p.px(x(16), y(40), 3, 2, COR.metalClaro);
  // Gola
  p.px(x(13), y(21 + r), 9, 2, COR.uniformeSombra);

  // Crachá com cordão
  p.linha(x(13), y(23 + r), x(13), y(28 + r), COR.ciano);
  p.linha(x(17), y(23 + r), x(16), y(28 + r), COR.ciano);
  p.px(x(12), y(28 + r), 6, 7, COR.branco);
  p.px(x(13), y(29 + r), 4, 2, '#c9cde0');
  p.px(x(14), y(32 + r), 2, 2, COR.vermelho);

  // Braço da frente segurando a garrafa térmica
  p.px(x(6), y(24 + r), 4, 12, COR.uniforme);
  p.px(x(2), y(30), 5, 12, COR.garrafa);
  p.px(x(2), y(30), 5, 1, '#e35b5b');
  p.px(x(2), y(28), 5, 2, '#c0c4d8');
  p.px(x(3), y(27), 3, 1, '#8b90a8');
  p.px(x(2), y(36), 5, 1, sombrear(COR.garrafa, 0.35));
  p.px(x(5), y(34), 4, 3, COR.pele);
  // Braço de trás
  p.px(x(26), y(24 + r), 3, 14, COR.uniformeSombra);
  p.px(x(26), y(38), 3, 2, COR.peleSombra);

  // Pescoço e cabeça
  p.px(x(15), y(19 + r), 6, 3, COR.peleSombra);
  p.px(x(12), y(9 + r), 12, 11, COR.pele);
  p.px(x(21), y(10 + r), 3, 10, COR.peleSombra);
  p.px(x(21), y(13 + r), 2, 3, '#c48a66'); // orelha
  p.px(x(20), y(11 + r), 4, 3, COR.cabeloGrisalho);
  p.px(x(11), y(13 + r), 1, 3, COR.pele); // nariz
  // Olhos cansados, olheiras e sobrancelhas grisalhas
  p.px(x(13), y(12 + r), 3, 1, COR.cabeloGrisalho);
  p.px(x(13), y(14 + r), 2, 1, '#1b1b26');
  p.px(x(17), y(14 + r), 2, 1, '#1b1b26');
  p.px(x(13), y(15 + r), 2, 1, COR.peleSombra);
  p.px(x(17), y(15 + r), 2, 1, COR.peleSombra);
  // Bigode e boca
  p.px(x(11), y(17 + r), 7, 1, COR.cabeloGrisalho);
  p.px(x(12), y(18 + r), 5, 1, '#d6d6de');
  p.px(x(13), y(19 + r), 3, 1, '#6b3a3a');

  // Boné com aba para a esquerda
  p.px(x(12), y(5 + r), 12, 5, COR.bone);
  p.px(x(13), y(4 + r), 10, 1, COR.bone);
  p.px(x(7), y(9 + r), 9, 2, sombrear(COR.bone, 0.35));
  p.px(x(16), y(6 + r), 4, 2, COR.ciano);
  p.px(x(12), y(5 + r), 1, 5, misturar(COR.bone, '#ffffff', 0.15));
}

function gerarValdir(cena: Phaser.Scene): void {
  folhaPixel(cena, TEX_EXTERIOR.VALDIR, 32, 60, 2, (p, quadro) => desenharValdir(p, 0, 0, quadro === 1));
  if (!cena.anims.exists('ff-valdir-respira')) {
    cena.anims.create({
      key: 'ff-valdir-respira',
      frames: cena.anims.generateFrameNumbers(TEX_EXTERIOR.VALDIR, { frames: [0, 0, 1, 1] }),
      frameRate: 2,
      repeat: -1,
    });
  }
}

/** Retrato do Valdir (cabeça e ombros) para o avatar do diálogo. */
export function retratoValdir(): string {
  return retratoDataUrl(24, 22, 3, (p) => {
    p.px(0, 0, 24, 22, COR.noite1);
    desenharValdir(p, -3, 1, false);
  });
}

/* =========================================================================
 * TERMINAL DO TERMO E PORTA
 * ========================================================================= */

function gerarTotemTermo(cena: Phaser.Scene): void {
  folhaPixel(cena, TEX_EXTERIOR.TOTEM_TERMO, 30, 52, 3, (p, quadro) => {
    const aceito = quadro === 2;
    // Base e corpo
    p.px(3, 46, 24, 6, COR.metal);
    p.px(3, 46, 24, 1, COR.metalClaro);
    p.px(5, 8, 20, 38, COR.predioBorda);
    p.px(5, 8, 1, 38, aceito ? COR.ciano : COR.magenta);
    p.px(24, 8, 1, 38, aceito ? COR.ciano : COR.magenta);
    // Logo no topo
    desenharLogoMegaBrain(p, 15, 4, 5);
    // Tela
    p.px(7, 11, 16, 18, '#05070f');
    if (aceito) {
      p.px(8, 12, 14, 16, misturar('#05070f', COR.ciano, 0.25));
      p.textoCentro('OK', 15, 17, COR.ciano, 1);
    } else {
      p.px(8, 12, 14, 16, '#0a0d1e');
      p.texto('TERMO', 8, 13, COR.vermelho, 1);
      p.px(9, 20, 10, 1, '#5a6290');
      p.px(9, 22, 8, 1, '#5a6290');
      // Cursor piscando (quadro 1 sem cursor)
      if (quadro === 0) p.px(9, 25, 3, 2, COR.ciano);
    }
    // Teclado
    p.px(6, 31, 18, 5, COR.metal);
    for (let x = 7; x < 23; x += 3) p.px(x, 32, 2, 1, COR.metalClaro);
    p.px(7, 34, 16, 1, sombrear(COR.metal, 0.3));
  });
  if (!cena.anims.exists('ff-totem-termo-pisca')) {
    cena.anims.create({
      key: 'ff-totem-termo-pisca',
      frames: cena.anims.generateFrameNumbers(TEX_EXTERIOR.TOTEM_TERMO, { frames: [0, 1] }),
      frameRate: 2,
      repeat: -1,
    });
  }
}

function gerarPorta(cena: Phaser.Scene): void {
  const w = E.PORTA.LARGURA_FOLHA / S;
  const h = E.PORTA.ALTURA / S;
  folhaPixel(cena, TEX_EXTERIOR.PORTA, w, h, 2, (p, quadro) => {
    p.px(0, 0, w, h, COR.metal);
    p.px(1, 1, w - 2, h - 2, '#101a3e');
    // Reflexos diagonais no vidro
    for (let i = 0; i < 3; i++) p.linha(4 + i * 8, h - 4, 14 + i * 8, 6, misturar('#101a3e', COR.ciano, 0.25));
    // Meio logo em cada folha: as duas metades formam o cérebro com a porta fechada
    desenharLogoMegaBrain(p, quadro === 0 ? w : 0, 36, 10);
    // Puxador
    p.px(quadro === 0 ? w - 4 : 2, 50, 2, 16, COR.metalClaro);
    p.px(0, h - 2, w, 2, COR.metalClaro);
  });
}
