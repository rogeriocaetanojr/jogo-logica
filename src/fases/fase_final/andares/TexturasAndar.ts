import Phaser from 'phaser';
import {
  COR,
  Pincel,
  desenharLogoMegaBrain,
  folhaPixel,
  hash3,
  misturar,
  sombrear,
  texturaPixel,
} from '../ArteFaseFinal';
import { ANDAR_FASE_FINAL, ESCALA_ARTE } from '../constantesFaseFinal';
import type { ConfigPlataforma, TemaAndar, TipoDecoracao } from './tiposAndar';

/**
 * Texturas dos interiores da torre, geradas por tema (cada andar tem sua paleta).
 * Pixel art em meia resolução, exibida em 2x.
 */

const S = ESCALA_ARTE;
const A = ANDAR_FASE_FINAL;

/** Largura do módulo de parede (uma janela + pilar), em pixels de arte. */
export const MODULO_PAREDE = 160;
const ALTURA_PAREDE = (A.CHAO_Y - A.TETO_Y) / S; // 275
const ALTURA_TETO = A.TETO_Y / S; // 35
const ALTURA_PISO = (A.ALTURA - A.CHAO_Y) / S; // 50

/** Janela na parede (pixels de arte, dentro do módulo). */
export const JANELA = { x0: 22, x1: 150, y0: 26, y1: 140 };

export const texAndar = {
  parede: (t: TemaAndar) => `ff-parede-${t.id}`,
  teto: (t: TemaAndar) => `ff-teto-${t.id}`,
  piso: (t: TemaAndar) => `ff-piso-${t.id}`,
  terminal: (t: TemaAndar) => `ff-terminal-${t.id}`,
  elevador: (t: TemaAndar) => `ff-elevador-${t.id}`,
  folhaElevador: (t: TemaAndar) => `ff-folha-elevador-${t.id}`,
  portaSaguao: 'ff-porta-saguao',
  portaoVidro: 'ff-portao-vidro',
  catraca: 'ff-catraca',
  emissorLaser: 'ff-emissor-laser',
  placaPonte: 'ff-placa-ponte',
  comporta: 'ff-comporta',
};

export function gerarTexturasAndar(cena: Phaser.Scene, tema: TemaAndar): void {
  gerarParede(cena, tema);
  gerarTeto(cena, tema);
  gerarPiso(cena, tema);
  gerarTerminal(cena, tema);
  gerarElevador(cena, tema);
  gerarPortaSaguao(cena);
  gerarBloqueios(cena);
}

/* =========================================================================
 * PAREDE, TETO E PISO
 * ========================================================================= */

function gerarParede(cena: Phaser.Scene, t: TemaAndar): void {
  texturaPixel(cena, texAndar.parede(t), MODULO_PAREDE, ALTURA_PAREDE, (p) => {
    const W = MODULO_PAREDE;
    const H = ALTURA_PAREDE;
    p.px(0, 0, W, H, t.parede);
    // Faixa superior e pilar
    p.px(0, 0, W, 6, t.paredeEscura);
    p.px(0, 0, 12, H, t.paredeEscura);
    p.px(3, 0, 1, H, misturar(t.paredeEscura, t.acento, 0.35));
    p.px(10, 0, 1, H, sombrear(t.paredeEscura, 0.4));

    // Janela: vazada (transparente) para a cidade aparecer atrás
    const j = JANELA;
    p.px(j.x0 - 4, j.y0 - 4, j.x1 - j.x0 + 8, j.y1 - j.y0 + 8, COR.metal);
    p.px(j.x0 - 3, j.y0 - 3, j.x1 - j.x0 + 6, 1, COR.metalClaro);
    p.ctx.clearRect(j.x0, j.y0, j.x1 - j.x0, j.y1 - j.y0);
    // Caixilhos e reflexos no vidro
    const meio = Math.round((j.x0 + j.x1) / 2);
    p.px(meio, j.y0, 2, j.y1 - j.y0, COR.metal);
    p.px(j.x0, Math.round(j.y0 + (j.y1 - j.y0) * 0.62), j.x1 - j.x0, 2, COR.metal);
    for (const dx of [8, 14, 70, 76]) {
      p.linha(j.x0 + dx, j.y1 - 2, j.x0 + dx + 22, j.y0 + 2, 'rgba(200,230,255,0.10)');
    }
    // Neon do acento abaixo da janela
    p.px(12, j.y1 + 10, W - 12, 2, t.acento);
    p.px(12, j.y1 + 12, W - 12, 1, sombrear(t.acento, 0.6));

    // Painéis da parede de baixo
    for (let y = j.y1 + 22; y < H - 4; y += 28) {
      p.px(12, y, W - 12, 1, t.paredeEscura);
      for (let x = 12; x < W; x += 37) p.px(x, y, 1, 28, t.paredeEscura);
    }
    // Rodapé
    p.px(0, H - 6, W, 6, t.paredeEscura);
    p.px(0, H - 6, W, 1, misturar(t.paredeEscura, t.acento2, 0.35));
  });
}

function gerarTeto(cena: Phaser.Scene, t: TemaAndar): void {
  texturaPixel(cena, texAndar.teto(t), MODULO_PAREDE, ALTURA_TETO, (p) => {
    const W = MODULO_PAREDE;
    const H = ALTURA_TETO;
    p.px(0, 0, W, H, sombrear(t.paredeEscura, 0.35));
    // Vigas e dutos
    p.px(0, H - 8, W, 4, t.paredeEscura);
    p.px(0, H - 4, W, 4, COR.metal);
    p.px(0, H - 4, W, 1, COR.metalClaro);
    p.px(0, 8, W, 6, sombrear(COR.metal, 0.4));
    for (let x = 6; x < W; x += 20) p.px(x, 7, 2, 8, sombrear(COR.metal, 0.6));
    // Luminária
    p.px(44, H - 9, 72, 5, COR.metal);
    p.px(46, H - 5, 68, 2, t.luz);
  });
}

function gerarPiso(cena: Phaser.Scene, t: TemaAndar): void {
  texturaPixel(cena, texAndar.piso(t), MODULO_PAREDE, ALTURA_PISO, (p) => {
    const W = MODULO_PAREDE;
    const H = ALTURA_PISO;
    p.px(0, 0, W, H, t.piso);
    p.px(0, 0, W, 2, misturar(t.piso, t.acento, 0.45));
    p.px(0, 2, W, 1, sombrear(t.piso, 0.5));
    for (let x = 0; x < W; x += 32) p.px(x, 3, 1, H, sombrear(t.piso, 0.3));
    for (let y = 18; y < H; y += 16) p.px(0, y, W, 1, sombrear(t.piso, 0.3));
    // Reflexo do neon no piso encerado
    for (let y = 4; y < 16; y++) {
      if (hash3(y, 1, 3) < 0.6) p.px(24 + (y % 3), y, 10 - Math.floor(y / 2), 1, misturar(t.piso, t.acento, 0.18));
    }
    p.px(0, H - 1, W, 1, sombrear(t.piso, 0.6));
  });
}

/* =========================================================================
 * PLATAFORMAS
 * ========================================================================= */

/** Gera (uma vez) e devolve a chave da textura de uma plataforma. */
export function texturaPlataforma(cena: Phaser.Scene, cfg: ConfigPlataforma, tema: TemaAndar): string {
  const larguraArte = Math.round(cfg.largura / S);
  const altura = alturaPlataforma(cfg);
  const alturaArte = Math.round(altura / S);
  const chave = `ff-plat-${cfg.tipo}-${larguraArte}x${alturaArte}-${tema.id}`;
  texturaPixel(cena, chave, larguraArte, alturaArte, (p) => {
    const w = larguraArte;
    const h = alturaArte;
    switch (cfg.tipo) {
      case 'mesa': {
        // Tampo grosso e pés; embaixo fica vazado
        p.px(0, 0, w, 5, misturar(tema.paredeEscura, COR.metalClaro, 0.55));
        p.px(0, 0, w, 1, tema.acento);
        p.px(0, 5, w, 2, sombrear(COR.metal, 0.3));
        p.px(3, 7, 3, h - 7, COR.metal);
        p.px(w - 6, 7, 3, h - 7, COR.metal);
        // Gaveteiro sob o tampo
        p.px(w - 30, 7, 22, Math.min(18, h - 7), sombrear(COR.metal, 0.25));
        p.px(w - 22, 12, 6, 1, COR.metalClaro);
        break;
      }
      case 'passarela': {
        p.px(0, 0, w, 4, COR.metal);
        p.px(0, 0, w, 1, COR.metalClaro);
        for (let x = 1; x < w; x += 4) p.px(x, 1, 2, 2, sombrear(COR.metal, 0.5));
        p.px(0, 4, w, 2, tema.acento);
        p.px(0, 6, w, 2, sombrear(COR.metal, 0.4));
        break;
      }
      case 'rack': {
        p.px(0, 0, w, h, '#0c1020');
        p.px(0, 0, w, 3, COR.metalClaro);
        p.px(0, 0, 2, h, COR.metal);
        p.px(w - 2, 0, 2, h, COR.metal);
        for (let y = 6; y < h - 4; y += 7) {
          p.px(3, y, w - 6, 5, '#161c34');
          for (let x = 5; x < w - 6; x += 6) {
            const r = hash3(x, y, w);
            if (r < 0.45) p.ponto(x, y + 2, r < 0.15 ? tema.acento2 : r < 0.3 ? tema.acento : COR.vermelho);
          }
        }
        break;
      }
      case 'caixa': {
        p.px(0, 0, w, h, '#3a2f4a');
        p.px(0, 0, w, 2, '#5a4a6e');
        p.px(1, 1, w - 2, h - 2, '#33293f');
        p.linha(2, 2, w - 3, h - 3, '#2a2134');
        p.linha(w - 3, 2, 2, h - 3, '#2a2134');
        p.moldura(0, 0, w, h, '#1c1626');
        p.textoCentro('MB', w / 2, h / 2 - 2, COR.vermelhoEscuro, 1);
        break;
      }
    }
  });
  return chave;
}

/** Altura visual (e física, para blocos) da plataforma no mundo. */
export function alturaPlataforma(cfg: ConfigPlataforma): number {
  switch (cfg.tipo) {
    case 'mesa':
      return Math.min(A.CHAO_Y - cfg.topo, 120);
    case 'passarela':
      return 16;
    case 'rack':
    case 'caixa':
      return cfg.altura ?? A.CHAO_Y - cfg.topo;
  }
}

/* =========================================================================
 * DECORAÇÃO (atrás do jogador, sem colisão)
 * ========================================================================= */

/** Dimensões em arte de cada decoração. */
const DIM_DECORACAO: Record<Exclude<TipoDecoracao, 'telao'>, [number, number, number]> = {
  // [largura, altura, quadros]
  balcao: [110, 48, 1],
  sofa: [64, 26, 1],
  planta: [20, 44, 1],
  cartaz: [90, 36, 1],
  maquinaPrompt: [44, 110, 2],
  cabos: [120, 14, 1],
  scanner: [50, 120, 2],
  esteiraFundo: [150, 40, 2],
  prensa: [60, 150, 1],
  pilhaCaixas: [56, 60, 1],
  rackFundo: [44, 150, 2],
  tubos: [70, 150, 1],
};

export function texturaDecoracao(
  cena: Phaser.Scene,
  tipo: Exclude<TipoDecoracao, 'telao'>,
  tema: TemaAndar,
  texto?: string
): { chave: string; quadros: number } {
  const [w, h, quadros] = DIM_DECORACAO[tipo];
  const sufixo = texto ? `-${hashTexto(texto)}` : '';
  const chave = `ff-deco-${tipo}-${tema.id}${sufixo}`;
  folhaPixel(cena, chave, w, h, quadros, (p, q) => desenharDecoracao(p, tipo, tema, w, h, q, texto));
  return { chave, quadros };
}

function hashTexto(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return h >>> 0;
}

function desenharDecoracao(
  p: Pincel,
  tipo: Exclude<TipoDecoracao, 'telao'>,
  t: TemaAndar,
  w: number,
  h: number,
  q: number,
  texto?: string
): void {
  switch (tipo) {
    case 'balcao': {
      p.px(0, 10, w, h - 10, '#1a2040');
      p.px(0, 8, w, 4, misturar(t.paredeEscura, COR.metalClaro, 0.5));
      p.px(0, 8, w, 1, t.acento);
      p.px(6, 18, w - 12, 2, t.acento);
      desenharLogoMegaBrain(p, w / 2, 32, 9);
      // Monitor sobre o balcão
      p.px(12, 0, 16, 9, COR.metal);
      p.px(13, 1, 14, 6, misturar('#05070f', t.acento, 0.35));
      break;
    }
    case 'sofa': {
      p.px(2, 8, w - 4, 12, sombrear(t.acento2, 0.55));
      p.px(0, 4, 6, 18, sombrear(t.acento2, 0.65));
      p.px(w - 6, 4, 6, 18, sombrear(t.acento2, 0.65));
      p.px(6, 2, w - 12, 8, sombrear(t.acento2, 0.45));
      p.px(6, 2, w - 12, 1, sombrear(t.acento2, 0.25));
      p.px(4, 22, 3, 4, COR.metal);
      p.px(w - 7, 22, 3, 4, COR.metal);
      break;
    }
    case 'planta': {
      // Planta de plástico (claro)
      p.px(5, 32, 10, 12, COR.metal);
      p.px(5, 32, 10, 1, COR.metalClaro);
      for (const [x0, y0, x1, y1] of [
        [10, 32, 3, 6],
        [10, 32, 17, 4],
        [10, 32, 10, 0],
        [10, 32, 1, 18],
        [10, 32, 19, 16],
      ]) p.linha(x0, y0, x1, y1, '#2f9e7a');
      p.ponto(10, 0, '#52d1a0');
      p.ponto(3, 6, '#52d1a0');
      p.ponto(17, 4, '#52d1a0');
      p.px(4, 30, 12, 2, '#d9d9e8'); // etiqueta "PLÁSTICO"
      break;
    }
    case 'cartaz': {
      p.px(0, 0, w, h, COR.contorno);
      p.px(1, 1, w - 2, h - 2, '#141833');
      p.moldura(2, 2, w - 4, h - 4, t.acento);
      const linhas = quebrarTexto(texto ?? '', 20);
      linhas.slice(0, 4).forEach((linha, i) => p.textoCentro(linha, w / 2, 6 + i * 7, i === 0 ? t.acento : COR.branco, 1));
      break;
    }
    case 'maquinaPrompt': {
      p.px(0, 0, w, h, '#151226');
      p.px(0, 0, w, 3, COR.metalClaro);
      p.moldura(0, 0, w, h, COR.metal);
      // Tela com "texto gerado" rolando
      p.px(5, 8, w - 10, 40, '#05070f');
      for (let i = 0; i < 7; i++) {
        const y = 11 + i * 5;
        const larg = 6 + Math.floor(hash3(i + q * 3, 2, 7) * (w - 20));
        p.px(8, y, larg, 2, misturar('#05070f', t.acento, 0.6));
      }
      p.texto('GERANDO', 6, 52, t.acento2, 1);
      // Bocal de onde sai o "conteúdo"
      p.px(8, 66, w - 16, 10, COR.metal);
      p.px(10, 76, w - 20, 26, '#0c0a18');
      for (let y = 78; y < 100; y += 4) p.px(12, y, w - 24, 2, misturar('#0c0a18', COR.branco, 0.25 + ((y + q * 4) % 8) * 0.03));
      p.ponto(w - 6, 4, q === 0 ? COR.vermelho : COR.vermelhoEscuro);
      break;
    }
    case 'cabos': {
      const cores = [t.acento, t.acento2, COR.metal, COR.vermelhoEscuro];
      cores.forEach((cor, i) => {
        let y = 6 + i * 2;
        for (let x = 0; x < w; x++) {
          y = 6 + i * 2 + Math.round(Math.sin((x + i * 13) / 9) * 2);
          p.ponto(x, y, sombrear(cor, 0.35));
        }
      });
      break;
    }
    case 'scanner': {
      // Arco de scanner de "conteúdo"
      p.px(0, 10, 8, h - 10, COR.metal);
      p.px(w - 8, 10, 8, h - 10, COR.metal);
      p.px(0, 0, w, 12, COR.metal);
      p.px(2, 2, w - 4, 6, '#05070f');
      p.texto(q === 0 ? 'IA?' : 'HUMANO?', 4, 3, COR.vermelho, 1);
      p.px(8, 12, w - 16, 2, q === 0 ? COR.vermelho : t.acento);
      for (let y = 20; y < h; y += 10) p.px(2, y, 4, 2, q === 0 ? COR.vermelhoEscuro : t.acento);
      break;
    }
    case 'esteiraFundo': {
      p.px(0, 24, w, 10, COR.metal);
      p.px(0, 24, w, 1, COR.metalClaro);
      for (let x = (q * 4) % 8; x < w; x += 8) p.px(x, 28, 4, 2, sombrear(COR.metal, 0.5));
      p.px(4, 34, 4, 6, COR.metal);
      p.px(w - 8, 34, 4, 6, COR.metal);
      // "Posts" na esteira
      for (let i = 0; i < 5; i++) {
        const x = 8 + i * 28 + (q * 4);
        p.px(x, 10, 18, 14, COR.branco);
        p.px(x + 2, 12, 14, 2, '#8b90a8');
        p.px(x + 2, 16, 10, 2, '#8b90a8');
        p.px(x + 12, 19, 4, 3, i % 2 === 0 ? COR.vermelho : t.acento);
      }
      break;
    }
    case 'prensa': {
      p.px(0, 0, 10, h, COR.metal);
      p.px(w - 10, 0, 10, h, COR.metal);
      p.px(0, 0, w, 16, sombrear(COR.metal, 0.2));
      p.px(20, 16, 20, 60, COR.metalClaro);
      p.px(8, 76, w - 16, 14, '#3a3448');
      p.px(8, 88, w - 16, 2, t.acento);
      // Faixas de advertência
      for (let x = 0; x < w; x += 8) p.px(x, h - 10, 4, 10, COR.janelaQuente);
      p.px(10, h - 30, w - 20, 20, '#1c1828');
      p.textoCentro('PRENSA', w / 2, h - 26, t.acento, 1);
      break;
    }
    case 'pilhaCaixas': {
      const caixa = (x: number, y: number, ww: number, hh: number) => {
        p.px(x, y, ww, hh, '#3a2f4a');
        p.moldura(x, y, ww, hh, '#1c1626');
        p.px(x + 1, y + 1, ww - 2, 1, '#5a4a6e');
      };
      caixa(0, 30, 28, 30);
      caixa(28, 30, 28, 30);
      caixa(12, 0, 30, 30);
      p.textoCentro('CONTEUDO', 27, 40, COR.branco, 1);
      p.textoCentro('GENERICO', 27, 47, COR.branco, 1);
      break;
    }
    case 'rackFundo': {
      p.px(0, 0, w, h, '#070b16');
      p.moldura(0, 0, w, h, COR.metal);
      for (let y = 4; y < h - 4; y += 6) {
        p.px(3, y, w - 6, 4, '#101830');
        for (let x = 5; x < w - 6; x += 5) {
          const r = hash3(x, y + q * 97, 11);
          if (r < 0.4) p.ponto(x, y + 1, r < 0.12 ? COR.vermelho : r < 0.3 ? t.acento : t.acento2);
        }
      }
      break;
    }
    case 'tubos': {
      for (const [x, cor] of [
        [8, COR.metal],
        [28, misturar(COR.metal, t.acento, 0.3)],
        [48, COR.metal],
      ] as const) {
        p.px(x, 0, 12, h, cor);
        p.px(x + 2, 0, 2, h, misturar(cor, '#ffffff', 0.25));
        for (let y = 20; y < h; y += 40) p.px(x - 2, y, 16, 4, sombrear(cor, 0.35));
      }
      p.px(0, h - 30, w, 6, sombrear(COR.metal, 0.4));
      p.textoCentro('-18 C', w / 2, h - 50, t.acento, 1);
      break;
    }
  }
}

function quebrarTexto(texto: string, limite: number): string[] {
  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let atual = '';
  for (const pal of palavras) {
    if ((atual + ' ' + pal).trim().length > limite) {
      linhas.push(atual.trim());
      atual = pal;
    } else {
      atual = `${atual} ${pal}`;
    }
  }
  if (atual.trim()) linhas.push(atual.trim());
  return linhas;
}

/* =========================================================================
 * TERMINAL, ELEVADOR E PORTA
 * ========================================================================= */

function gerarTerminal(cena: Phaser.Scene, t: TemaAndar): void {
  // Quadros: 0 e 1 travado (cursor piscando), 2 resolvido
  folhaPixel(cena, texAndar.terminal(t), 32, 56, 3, (p, q) => {
    const ok = q === 2;
    p.px(4, 50, 24, 6, COR.metal);
    p.px(13, 30, 6, 20, COR.metal);
    p.px(0, 0, 32, 32, COR.predioBorda);
    p.moldura(0, 0, 32, 32, ok ? t.acento : COR.vermelho);
    p.px(3, 3, 26, 22, '#05070f');
    if (ok) {
      p.px(4, 4, 24, 20, misturar('#05070f', t.acento, 0.25));
      p.textoCentro('OK', 16, 11, t.acento, 1);
    } else {
      p.texto('ERRO', 5, 5, COR.vermelho, 1);
      for (let i = 0; i < 3; i++) p.px(5, 12 + i * 3, 10 + ((i * 7) % 12), 1, '#5a6290');
      if (q === 0) p.px(5, 21, 3, 2, t.acento);
    }
    p.px(2, 26, 28, 4, COR.metal);
    for (let x = 4; x < 28; x += 3) p.ponto(x, 27, COR.metalClaro);
  });
  const chave = `${texAndar.terminal(t)}-pisca`;
  if (!cena.anims.exists(chave)) {
    cena.anims.create({
      key: chave,
      frames: cena.anims.generateFrameNumbers(texAndar.terminal(t), { frames: [0, 1] }),
      frameRate: 2,
      repeat: -1,
    });
  }
}

function gerarElevador(cena: Phaser.Scene, t: TemaAndar): void {
  const E = A.ELEVADOR;
  const w = E.LARGURA / S;
  const h = E.ALTURA / S;
  texturaPixel(cena, texAndar.elevador(t), w, h, (p) => {
    // Batente e cabine iluminada
    p.px(0, 0, w, h, COR.metal);
    p.px(0, 0, w, 2, COR.metalClaro);
    p.px(4, 18, w - 8, h - 18, '#1a2a4a');
    p.degradePontilhado(6, 20, w - 12, h - 22, [misturar('#1a2a4a', t.luz, 0.35), '#1a2a4a'], 1);
    // Visor (o número é um texto por cima)
    p.px(w / 2 - 12, 3, 24, 12, '#05070f');
    p.moldura(w / 2 - 12, 3, 24, 12, COR.metalClaro);
    // Botões ao lado
    p.px(w - 3, 50, 2, 10, COR.metalClaro);
  });
  texturaPixel(cena, texAndar.folhaElevador(t), E.LARGURA_FOLHA / S, (E.ALTURA - 36) / S, (p) => {
    const fw = E.LARGURA_FOLHA / S;
    const fh = (E.ALTURA - 36) / S;
    p.px(0, 0, fw, fh, '#4d5677');
    p.px(0, 0, 1, fh, COR.metalClaro);
    for (let y = 4; y < fh; y += 6) p.px(1, y, fw - 2, 1, sombrear('#4d5677', 0.15));
    p.px(fw - 3, 0, 2, fh, t.acento);
  });
}

function gerarPortaSaguao(cena: Phaser.Scene): void {
  // Porta pela qual o andar 1 é acessado (lado de dentro do saguão)
  texturaPixel(cena, texAndar.portaSaguao, 70, 100, (p) => {
    p.px(0, 0, 70, 100, COR.metal);
    p.px(4, 4, 62, 96, '#0d1530');
    p.degradePontilhado(6, 6, 58, 94, ['#1b2a55', '#24426e'], 1);
    p.px(34, 4, 2, 96, COR.metal);
    p.textoCentro('SAIDA', 35, 10, COR.ciano, 1);
  });
}

/* =========================================================================
 * BLOQUEIOS DOS PUZZLES
 * ========================================================================= */

function gerarBloqueios(cena: Phaser.Scene): void {
  const alturaVao = (A.CHAO_Y - A.TETO_Y) / S; // portões vão do chão ao teto
  // Portão de vidro do chão ao teto, com faixa vermelha de "acesso negado"
  const LV = 36;
  texturaPixel(cena, texAndar.portaoVidro, LV, alturaVao, (p) => {
    p.px(0, 0, LV, alturaVao, COR.metal);
    p.px(0, 0, LV, 2, COR.metalClaro);
    p.px(3, 3, LV - 6, alturaVao - 6, 'rgba(110,190,255,0.30)');
    for (const dx of [5, 9, 20]) p.linha(3 + dx, alturaVao - 10, 3 + dx + 12, alturaVao - 70, 'rgba(225,245,255,0.35)');
    p.px(4, 3, 1, alturaVao - 6, 'rgba(225,245,255,0.55)');
    const yFaixa = Math.round(alturaVao * 0.62);
    p.px(3, yFaixa, LV - 6, 8, COR.vermelhoEscuro);
    p.px(3, yFaixa + 1, LV - 6, 1, COR.vermelho);
    p.textoCentro('PARE', LV / 2, yFaixa + 2, '#ffd0d6', 1);
    desenharLogoMegaBrain(p, LV / 2, alturaVao * 0.35, 9);
  });
  texturaPixel(cena, texAndar.catraca, 36, 50, (p) => {
    p.px(4, 10, 28, 40, '#2c3248');
    p.px(4, 10, 28, 2, COR.metalClaro);
    p.px(8, 16, 20, 6, '#05070f');
    p.texto('PARE', 9, 17, COR.vermelho, 1);
    p.px(26, 26, 10, 3, COR.metalClaro); // braço da catraca
    p.px(2, 46, 32, 4, COR.metal);
  });
  texturaPixel(cena, texAndar.emissorLaser, 20, 12, (p) => {
    p.px(0, 0, 20, 12, COR.metal);
    p.px(0, 0, 20, 2, COR.metalClaro);
    p.px(4, 8, 12, 4, COR.vermelhoEscuro);
    p.px(7, 9, 6, 3, COR.vermelho);
  });
  texturaPixel(cena, texAndar.placaPonte, 48, ANDAR_FASE_FINAL.ESPESSURA_PLACA / S, (p) => {
    const h = ANDAR_FASE_FINAL.ESPESSURA_PLACA / S;
    p.px(0, 0, 48, h, COR.metal);
    p.px(0, 0, 48, 1, COR.metalClaro);
    p.px(0, 2, 48, 2, COR.janelaQuente);
    p.px(0, h - 2, 48, 2, sombrear(COR.metal, 0.4));
    for (let x = 4; x < 48; x += 10) p.ponto(x, 6, COR.metalClaro);
  });
  // Comporta de refrigeração: chapa de lâminas, faixa de advertência e visor de temperatura
  const LC = 40;
  texturaPixel(cena, texAndar.comporta, LC, alturaVao, (p) => {
    p.px(0, 0, LC, alturaVao, '#24304a');
    p.moldura(0, 0, LC, alturaVao, COR.metal);
    p.px(1, 0, LC - 2, 1, COR.metalClaro);
    for (let y = 6; y < alturaVao - 24; y += 8) {
      p.px(2, y, LC - 4, 1, misturar('#24304a', '#ffffff', 0.12));
      p.px(2, y + 1, LC - 4, 2, sombrear('#24304a', 0.35));
    }
    for (let y = alturaVao - 22; y < alturaVao - 2; y++) {
      for (let x = 2; x < LC - 2; x++) if (Math.floor((x + y) / 4) % 2 === 0) p.ponto(x, y, COR.janelaQuente);
    }
    p.px(10, 60, 20, 14, '#05070f');
    p.moldura(10, 60, 20, 14, COR.metalClaro);
    p.textoCentro('-18', 20, 64, COR.ciano, 1);
    p.px(14, 90, 12, 4, COR.vermelho); // trava
  });
}
