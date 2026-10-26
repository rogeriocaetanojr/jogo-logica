import type Phaser from 'phaser';
import { COR, CORES_CONTEINER, Pincel, folhaPixel, hash3, larguraTexto, sombrear, texturaPixel } from './ArtePorto';
import { desenharCarreta, tingir } from './CenariosPorto';

/**
 * Objetos de cenário em primeiro plano (escala de jogo): caminhões, guarita, cancela,
 * placas, poças de óleo, portões, tambores, prateleiras e conveses.
 */

const K = COR.contorno;

/** Caminhão de contêiner estacionado (64x30). Cabine à direita. */
export function texturaCaminhao(cena: Phaser.Scene, chave: string, corConteiner: string): string {
  return texturaPixel(cena, chave, 64, 30, (p) => {
    // Contêiner sobre a carreta
    const esc = sombrear(corConteiner, 0.3);
    p.px(2, 2, 44, 17, corConteiner);
    for (let x = 4; x < 44; x += 2) p.px(x, 4, 1, 13, esc);
    p.px(2, 2, 44, 2, sombrear(corConteiner, 0.5));
    p.px(2, 17, 44, 2, sombrear(corConteiner, 0.5));
    p.px(2, 2, 44, 1, sombrear(corConteiner, -0.2));
    // Prancha
    p.px(0, 19, 50, 3, '#2A2628');
    p.px(0, 19, 50, 1, '#5A5658');
    // Cabine
    p.px(48, 6, 14, 16, '#C8401E');
    p.px(48, 6, 14, 1, '#E0603A');
    p.px(53, 8, 8, 6, '#2A3440');
    p.px(54, 9, 2, 2, '#4A6A80');
    p.px(61, 16, 3, 4, '#8A847C');
    p.px(48, 14, 14, 1, '#8A2A18');
    // Rodas
    for (const wx of [8, 16, 38, 56]) {
      p.disco(wx, 25, 4, '#141212');
      p.disco(wx, 25, 1, '#6A6662');
    }
    p.px(0, 22, 64, 1, '#1E1A1A');
  });
}

/** Carro queimado (30x12). */
export function texturaCarroQueimado(cena: Phaser.Scene): string {
  return texturaPixel(cena, 'pb-obj-carro', 30, 12, (p) => {
    p.px(2, 5, 26, 4, '#3A3236');
    p.px(7, 1, 14, 4, '#2C262A');
    p.px(9, 2, 4, 2, '#141012');
    p.px(15, 2, 4, 2, '#141012');
    for (let x = 2; x < 28; x++) if (hash3(x, 3, 9) > 0.6) p.ponto(x, 5, '#6E4030');
    p.disco(7, 9, 2, '#141212');
    p.disco(22, 9, 2, '#141212');
  });
}

/** Placa em dois postes com texto em pixel. */
export function texturaPlaca(cena: Phaser.Scene, chave: string, linhas: string[], corFundo = '#2B5C9A', corTexto = '#F2EEE2'): string {
  const w = Math.max(...linhas.map((l) => larguraTexto(l))) + 8;
  const h = linhas.length * 7 + 5;
  return texturaPixel(cena, chave, w, h + 14, (p) => {
    p.px(3, h, 2, 14, '#3A3438');
    p.px(w - 5, h, 2, 14, '#3A3438');
    p.px(0, 0, w, h, K);
    p.px(1, 1, w - 2, h - 2, corFundo);
    p.px(1, 1, w - 2, 1, sombrear(corFundo, -0.3));
    linhas.forEach((l, i) => p.textoCentro(l, w / 2, 3 + i * 7, corTexto));
  });
}

/** Poça de óleo com brilho furta-cor. */
export function texturaPocaOleo(cena: Phaser.Scene, largura: number): string {
  const chave = `pb-obj-oleo-${largura}`;
  return texturaPixel(cena, chave, largura, 4, (p) => {
    p.elipse(largura / 2, 2, largura / 2 - 1, 1, '#141012');
    p.px(1, 2, largura - 2, 2, '#141012');
    const cores = [COR.oleoRoxo, COR.oleoCiano, COR.oleoAmarelo];
    for (let x = 3; x < largura - 3; x += 3) p.ponto(x, 1 + (x % 2), cores[x % 3]);
  });
}

/** Guarita da portaria (34x30). */
export function texturaGuarita(cena: Phaser.Scene): string {
  return texturaPixel(cena, 'pb-obj-guarita', 34, 30, (p) => {
    p.px(0, 4, 34, 3, '#3A3236');
    p.px(1, 3, 32, 1, '#5A5054');
    p.px(2, 7, 30, 23, '#8A7E70');
    p.px(2, 7, 30, 1, '#A89C8C');
    p.px(5, 10, 16, 9, '#1A2228');
    p.px(6, 11, 14, 7, '#2A3A44');
    p.px(6, 11, 5, 1, '#5A7A8A');
    p.px(24, 12, 6, 18, '#5A4A40');
    p.ponto(28, 21, COR.advertencia);
    p.px(4, 0, 26, 4, COR.contAzul);
    p.textoCentro('PORTARIA', 17, 0, '#F2EEE2');
    p.faixaAdvertencia(2, 26, 21, 4);
  });
}

/** Cancela: poste e braço listrado (o braço gira). */
export function texturasCancela(cena: Phaser.Scene): void {
  texturaPixel(cena, 'pb-obj-cancela-poste', 8, 26, (p) => {
    p.px(1, 6, 6, 20, '#C8C2B4');
    p.px(1, 6, 6, 1, '#E8E2D2');
    p.px(0, 0, 8, 7, '#3A3438');
    p.ponto(3, 2, '#FF3A2A');
    p.ponto(4, 2, '#FF3A2A');
    p.px(2, 12, 4, 3, '#2A2426');
  });
  texturaPixel(cena, 'pb-obj-cancela-braco', 66, 3, (p) => {
    for (let x = 0; x < 66; x += 6) {
      p.px(x, 0, 3, 3, '#E8E2D2');
      p.px(x + 3, 0, 3, 3, '#C8301E');
    }
    p.px(0, 0, 66, 1, '#F2EEE2');
  });
}

/** Portão de saída com placa (40x34). Quadro 0 fechado, 1 aberto. */
export function texturaPortao(cena: Phaser.Scene, chave: string, rotulo: string): string {
  return folhaPixel(cena, chave, 44, 36, 2, (p, q) => {
    p.px(0, 4, 3, 32, '#3A3438');
    p.px(41, 4, 3, 32, '#3A3438');
    p.px(0, 0, 44, 5, COR.advertencia);
    p.textoCentro(rotulo, 22, 0, K);
    if (q === 0) {
      for (let x = 4; x < 41; x += 3) p.px(x, 6, 1, 30, '#6A6662');
      p.px(3, 12, 38, 1, '#6A6662');
      p.px(3, 26, 38, 1, '#6A6662');
      p.px(19, 17, 6, 5, '#C8301E');
      p.px(20, 18, 4, 3, '#FF5A4A');
    } else {
      for (let x = 4; x < 9; x += 3) p.px(x, 6, 1, 30, '#6A6662');
      p.px(3, 12, 6, 1, '#6A6662');
      p.px(3, 26, 6, 1, '#6A6662');
    }
  });
}

/** Pilha de tambores (decoração/obstáculo). */
export function texturaTambores(cena: Phaser.Scene): string {
  return texturaPixel(cena, 'pb-obj-tambores', 22, 16, (p) => {
    const tambor = (x: number, y: number, cor: string) => {
      p.px(x, y, 7, 8, cor);
      p.px(x, y, 7, 1, sombrear(cor, -0.3));
      p.px(x, y + 3, 7, 1, sombrear(cor, 0.4));
      p.px(x, y + 6, 7, 1, sombrear(cor, 0.4));
    };
    tambor(0, 8, COR.contAzul);
    tambor(7, 8, '#8A4A2A');
    tambor(14, 8, COR.contAzul);
    tambor(4, 0, '#8A4A2A');
    tambor(11, 0, COR.contAzul);
    p.ponto(16, 11, COR.virus);
  });
}

/** Carreta-tanque de petróleo (opcionalmente tombada) em escala de jogo. */
export function texturaCarretaPetroleo(cena: Phaser.Scene, chave: string, tombada: boolean): string {
  return texturaPixel(cena, chave, 52, tombada ? 16 : 18, (p) => {
    desenharCarreta(p, tombada ? 4 : 2, tombada ? 2 : 1, false, tombada);
  });
}

/** Contêiner "aberto" (esconderijo da CRACA). */
export function texturaConteinerAberto(cena: Phaser.Scene): string {
  return texturaPixel(cena, 'pb-obj-cont-aberto', 32, 16, (p) => {
    const cor = CORES_CONTEINER[3];
    p.px(0, 0, 32, 16, sombrear(cor, 0.2));
    p.px(2, 2, 26, 12, '#141012');
    p.px(28, 0, 4, 16, sombrear(cor, 0.5));
    p.px(0, 0, 32, 2, sombrear(cor, 0.4));
    p.px(0, 14, 32, 2, sombrear(cor, 0.4));
    for (let x = 4; x < 26; x += 4) p.ponto(x, 13, '#3A3436');
  });
}

/** Painel de LED que mostra push()/pop() (texto desenhado dinamicamente pela área). */
export function desenharPainelLed(p: Pincel, w: number, h: number, texto: string, cor: string = COR.fogoLaranja): void {
  p.px(0, 0, w, h, K);
  p.px(1, 1, w - 2, h - 2, '#120C0C');
  for (let y = 2; y < h - 2; y += 2) for (let x = 2; x < w - 2; x += 2) p.ponto(x, y, '#2A1A16');
  p.textoCentro(texto, w / 2, Math.floor((h - 5) / 2), cor);
}

/* =========================================================================
 * NAVIOS DA FILA (escala de jogo)
 * ========================================================================= */

export type TipoNavio = 'CARGUEIRO' | 'PETROLEIRO' | 'PESQUEIRO' | 'BALSA' | 'GRANELEIRO' | 'REBOCADOR' | 'VIRUS';

export interface InfoNavio {
  chave: string;
  /** Largura e altura da textura (pixels de arte). */
  w: number;
  h: number;
  /** Linha do convés dentro da textura. */
  conves: number;
  /** Plataformas relativas à linha do convés: [x0, x1, alturaAcimaDoConves] em pixels de arte. */
  plataformas: Array<[number, number, number]>;
}

const DADOS_NAVIO: Record<TipoNavio, { w: number; casco: string; acima: number }> = {
  CARGUEIRO: { w: 84, casco: '#5A2A22', acima: 24 },
  PETROLEIRO: { w: 78, casco: '#3A3A5A', acima: 22 },
  PESQUEIRO: { w: 56, casco: '#2B5C9A', acima: 20 },
  BALSA: { w: 70, casco: '#4A4448', acima: 10 },
  GRANELEIRO: { w: 80, casco: '#3A5A3A', acima: 22 },
  REBOCADOR: { w: 60, casco: '#C8301E', acima: 26 },
  VIRUS: { w: 62, casco: '#18161C', acima: 22 },
};

export function texturaNavio(cena: Phaser.Scene, tipo: TipoNavio): InfoNavio {
  const d = DADOS_NAVIO[tipo];
  const w = d.w;
  const conves = d.acima;
  const h = conves + 17;
  const chave = `pb-navio-${tipo}`;
  const plataformas: Array<[number, number, number]> = [[3, w - 6, 0]];
  const ponte = (p: Pincel, x: number, larg: number, alt: number, cor: string) => {
    p.px(x, conves - alt, larg, alt, cor);
    p.px(x, conves - alt, larg, 1, sombrear(cor, -0.25));
    p.px(x + larg - 1, conves - alt, 1, alt, sombrear(cor, 0.3));
    p.px(x + 1, conves - alt + 3, larg - 2, 2, '#2A3440');
    p.px(x + 2, conves - alt + 3, 2, 1, '#E8C060');
    p.px(x + larg - 4, conves - alt + 3, 2, 1, '#E8C060');
  };
  texturaPixel(cena, chave, w, h, (p) => {
    const casco = d.casco;
    // Casco: popa à esquerda, proa inclinada à direita
    for (let r = 0; r < 17; r++) {
      const esq = Math.round(r * 0.45);
      const dir = Math.round(w - Math.max(0, r - 5) * 1.5);
      p.px(esq, conves + r, dir - esq, 1, r >= 14 ? sombrear(casco, 0.4) : casco);
    }
    p.px(0, conves, w, 1, '#2A1E1E');
    p.px(0, conves + 1, w, 1, sombrear(casco, -0.2));
    for (let i = 0; i < w / 6; i++) {
      const rx = 4 + Math.floor(hash3(i, 3, w) * (w - 10));
      p.px(rx, conves + 3, 1, 2 + Math.floor(hash3(i, 5, w) * 6), tipo === 'VIRUS' ? COR.virus : '#7A3A26');
    }
    p.texto(tipo === 'VIRUS' ? '{VIRUS}' : tipo.slice(0, 9), 6, conves + 6, tipo === 'VIRUS' ? COR.virus : '#E8E2D2');

    switch (tipo) {
      case 'CARGUEIRO': {
        ponte(p, 2, 14, 22, '#B8B0A4');
        for (let x = 18; x < w - 8; x += 6) {
          for (let k = 0; k < 2; k++) {
            const cor = CORES_CONTEINER[Math.floor(hash3(x, k, 7) * 4)];
            p.px(x, conves - 6 - k * 6, 6, 6, cor);
            p.px(x, conves - 1 - k * 6, 6, 1, sombrear(cor, 0.4));
            p.px(x + 5, conves - 6 - k * 6, 1, 5, sombrear(cor, 0.3));
          }
        }
        plataformas.push([18, w - 8 - ((w - 26) % 6), 12], [2, 16, 22]);
        break;
      }
      case 'PETROLEIRO':
        ponte(p, 3, 13, 20, '#C8C2B4');
        for (let x = 18; x < w - 6; x += 2) p.ponto(x, conves - 2, '#8A847C');
        p.px(18, conves - 3, w - 26, 1, '#5A5658');
        p.px(30, conves - 6, 3, 6, '#8A847C');
        p.px(50, conves - 6, 3, 6, '#8A847C');
        plataformas.push([3, 16, 20]);
        break;
      case 'PESQUEIRO':
        ponte(p, 6, 14, 14, '#E8E2D2');
        p.px(36, conves - 20, 1, 20, '#5A4A40');
        p.linha(36, conves - 20, w - 6, conves - 2, '#8A7A6A');
        p.linha(36, conves - 18, 24, conves - 2, '#8A7A6A');
        plataformas.push([6, 20, 14]);
        break;
      case 'BALSA':
        p.px(4, conves - 3, w - 10, 3, '#5A5458');
        for (let x = 6; x < w - 8; x += 8) p.px(x, conves - 6, 4, 3, '#8A5A3A');
        break;
      case 'GRANELEIRO':
        ponte(p, 2, 13, 20, '#B8B0A4');
        for (let x = 18; x < w - 8; x += 15) {
          p.px(x, conves - 4, 12, 4, '#6A5A3A');
          p.px(x, conves - 4, 12, 1, '#8A7A5A');
        }
        plataformas.push([2, 15, 20]);
        break;
      case 'REBOCADOR': {
        ponte(p, 14, 18, 18, '#E8E2D2');
        p.px(14, conves - 18, 18, 2, '#C8301E');
        p.px(21, conves - 26, 3, 8, '#3A3438');
        p.px(20, conves - 26, 5, 2, '#C8301E');
        // Canhões d'água
        p.px(36, conves - 6, 3, 6, '#8A847C');
        p.px(36, conves - 8, 8, 3, '#C8C2B4');
        p.px(44, conves - 4, 3, 4, '#8A847C');
        p.px(44, conves - 6, 7, 2, '#C8C2B4');
        p.px(2, conves - 4, 8, 4, '#3A3438');
        plataformas.push([14, 32, 18]);
        break;
      }
      case 'VIRUS':
        ponte(p, 8, 16, 18, '#2A2830');
        p.px(8, conves - 18, 16, 1, COR.virus);
        p.textoCentro('{}', 16, conves - 12, COR.virus);
        for (let x = 28; x < w - 6; x += 4) p.ponto(x, conves - 2, COR.virus);
        plataformas.push([8, 24, 18]);
        break;
    }
  });
  return { chave, w, h, conves, plataformas };
}

/** Painel de chegadas: todos os navios ATRASADOS (quadro 1 pisca). */
export function texturaPainelChegadas(cena: Phaser.Scene): string {
  return folhaPixel(cena, 'pb-painel-chegadas', 82, 46, 2, (p, q) => {
    p.px(0, 0, 82, 40, K);
    p.px(1, 1, 80, 38, '#0E1012');
    p.px(1, 1, 80, 7, '#2B5C9A');
    p.textoCentro('CHEGADAS', 41, 2, '#F2EEE2');
    const navios = ['CARGUEIRO', 'PETROLEIRO', 'PESQUEIRO', 'BALSA', 'GRANELEIRO'];
    navios.forEach((n, i) => {
      p.texto(n, 3, 10 + i * 6, '#C8C2B4');
      if (q === 0 || i % 2 === 1) p.texto('ATRASADO', 47, 10 + i * 6, '#FF4A3A');
    });
    p.px(10, 40, 2, 6, '#3A3438');
    p.px(70, 40, 2, 6, '#3A3438');
  });
}

/** Cor noturna opcional para objetos (reexportada por conveniência). */
export const tingirObjeto = tingir;
