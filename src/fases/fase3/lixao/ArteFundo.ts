import { COR } from './ArteLixao';
import type { Pincel } from './ArteLixao';

/**
 * Peças de pixel art do fundo do Lixão (camadas de parallax). Cada peça é desenhada uma vez
 * na textura da camada; as que têm detalhe animado (LED, fumaça, gancho, letreiro, faísca,
 * gota) anotam o ponto em `Marcas`, em pixels de arte da camada, para o FundoLixao criar só
 * esses objetos pequenos por cima.
 */

export interface Marcas {
  /** LEDs piscando: [x, y, cor]. */
  leds: [number, number, string][];
  /** Saídas de fumaça (chaminés e escapes). */
  fumaca: [number, number][];
  /** Ponta da lança de um guindaste: [x, y, comprimento do cabo]. */
  ganchos: [number, number, number][];
  /** Letreiros neon quebrados: [x, y, largura]. */
  letreiros: [number, number, number][];
  /** Reflexos de luz em poças (chuva): [x, y, largura]. */
  reflexos: [number, number, number][];
  /** Pontos de faísca ocasional (motores, cabos rompidos). */
  faiscas: [number, number][];
  /** Janelas acesas da cidade (desenhadas fora da camada, sem a cor do clima). */
  janelas: [number, number][];
  /** Pontas de cabo de onde pinga água na chuva. */
  gotas: [number, number][];
}

export function marcasVazias(): Marcas {
  return { leds: [], fumaca: [], ganchos: [], letreiros: [], reflexos: [], janelas: [], faiscas: [], gotas: [] };
}

/** Sorteio ponderado; evita repetir `evitar` quando há outra opção. */
export function escolher<T extends string>(rnd: () => number, pesos: Partial<Record<T, number>>, evitar?: T): T {
  const opcoes = (Object.entries(pesos) as [T, number][]).filter(([k, w]) => w > 0 && k !== evitar);
  const lista = opcoes.length > 0 ? opcoes : (Object.entries(pesos) as [T, number][]);
  const total = lista.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [k, w] of lista) {
    r -= w;
    if (r <= 0) return k;
  }
  return lista[lista.length - 1][0];
}

const int = (rnd: () => number, min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

/* =========================================================================
 * CIDADE DISTANTE (uma cor só por clima, mais janelas e letreiros)
 * ========================================================================= */

export type PecaCidade = 'predio' | 'torre' | 'guindaste' | 'chamine' | 'montanha';

export interface EstiloCidade {
  /** Cor de desenho (um valor neutro; a cor do clima vem da tinta da camada). */
  cor: string;
  /** Chance de cada janela estar acesa. */
  janelas: number;
  /** Chance de um prédio ter letreiro neon. */
  letreiros: number;
  /** Multiplica alturas (névoa: silhuetas grandes). */
  escala: number;
  /** LEDs no topo das torres. */
  ledsTorre: boolean;
}

/** Desenha uma peça da cidade com a base em `base`; devolve a largura ocupada. */
export function pecaCidade(p: Pincel, peca: PecaCidade, x: number, base: number, rnd: () => number, e: EstiloCidade, m: Marcas): number {
  const S = e.cor;
  switch (peca) {
    case 'predio': {
      const w = int(rnd, 9, 22);
      const h = Math.round(int(rnd, 18, 52) * e.escala);
      const topo = base - h;
      p.px(x, topo, w, h, S);
      const telhado = rnd();
      if (telhado < 0.3) p.px(x + 2, topo - 4, w - 4, 4, S);
      else if (telhado < 0.55) {
        // Topo quebrado: recorte irregular
        for (let i = 0; i < w; i += 2) p.px(x + i, topo - int(rnd, 0, 3), 2, 3, S);
      } else if (telhado < 0.75) {
        p.px(x + Math.floor(w / 2), topo - 9, 1, 9, S);
        if (e.ledsTorre) m.leds.push([x + Math.floor(w / 2), topo - 10, COR.janela]);
      }
      for (let yy = topo + 3; yy < base - 3; yy += 4) {
        for (let xx = x + 2; xx < x + w - 2; xx += 3) {
          if (rnd() < e.janelas) m.janelas.push([xx, yy]);
        }
      }
      if (rnd() < e.letreiros && w >= 10) {
        const ly = topo + int(rnd, 4, Math.max(5, Math.floor(h / 2)));
        m.letreiros.push([x + 1, ly, w - 2]);
      }
      return w + int(rnd, 1, 6);
    }
    case 'torre': {
      // Torre de transmissão: treliça que afina para cima
      const h = Math.round(int(rnd, 46, 74) * e.escala);
      const meia = int(rnd, 6, 9);
      const cx = x + meia;
      p.linha(cx - meia, base, cx - 1, base - h, S);
      p.linha(cx + meia, base, cx + 1, base - h, S);
      for (let y = base - 6; y > base - h + 4; y -= 7) {
        const f = (base - y) / h;
        const larg = Math.round(meia * (1 - f));
        p.linha(cx - larg, y, cx + larg, y - 6, S);
        p.linha(cx + larg, y, cx - larg, y - 6, S);
        if ((base - y) % 21 < 7) p.px(cx - larg - 3, y, larg * 2 + 7, 1, S);
      }
      p.px(cx, base - h - 6, 1, 6, S);
      if (e.ledsTorre) m.leds.push([cx, base - h - 7, COR.janela]);
      return meia * 2 + int(rnd, 4, 10);
    }
    case 'guindaste': {
      const h = Math.round(int(rnd, 40, 62) * e.escala);
      const jib = int(rnd, 20, 34);
      p.px(x + 6, base - h, 3, h, S);
      for (let y = base - h + 3; y < base; y += 5) p.ponto(x + 5, y, S);
      p.px(x, base - h, jib + 8, 2, S);
      p.linha(x + 7, base - h - 6, x + jib + 6, base - h, S);
      p.linha(x + 7, base - h - 6, x, base - h, S);
      p.px(x + 1, base - h + 2, 4, 3, S);
      const cabo = int(rnd, 8, 18);
      p.px(x + jib + 3, base - h + 2, 1, cabo, S);
      p.px(x + jib + 2, base - h + 2 + cabo, 3, 2, S);
      return jib + 10 + int(rnd, 2, 8);
    }
    case 'chamine': {
      const h = Math.round(int(rnd, 36, 64) * e.escala);
      const w = int(rnd, 4, 7);
      p.px(x, base - h, w, h, S);
      p.px(x - 1, base - h, w + 2, 2, S);
      p.px(x - 2, base - 10, w + 4, 10, S);
      m.fumaca.push([x + Math.floor(w / 2), base - h - 1]);
      return w + int(rnd, 4, 12);
    }
    case 'montanha': {
      const larg = int(rnd, 34, 70);
      const alt = Math.round(int(rnd, 12, 30) * e.escala);
      const perfil = rnd();
      for (let i = 0; i < larg; i++) {
        const t = 1 - Math.abs(i - larg / 2) / (larg / 2);
        const forma = perfil < 0.33 ? Math.sqrt(t) : perfil < 0.66 ? t : Math.min(1, t * 1.8);
        // Recortes: degraus e pontas de sucata saindo do monte
        const ponta = rnd() < 0.06 ? int(rnd, 2, 6) : 0;
        const topo = Math.round(base - alt * forma - ponta + (i % 7 === 0 ? 1 : 0));
        p.px(x + i, topo, 1, base - topo, S);
      }
      return Math.round(larg * 0.7);
    }
  }
}

/* =========================================================================
 * MÁQUINAS (camada média 0.4)
 * ========================================================================= */

export type PecaMaquina = 'esteira' | 'prensa' | 'guindaste' | 'antena' | 'ventilador';

/** Desenha uma máquina parada com a base em `base`; devolve a largura ocupada. */
export function pecaMaquina(p: Pincel, peca: PecaMaquina, x: number, base: number, rnd: () => number, m: Marcas): number {
  switch (peca) {
    case 'esteira': {
      const w = int(rnd, 36, 60);
      const y = base - int(rnd, 12, 18);
      for (let lx = x + 3; lx < x + w - 2; lx += 12) p.caixa(lx, y + 3, 3, base - y - 3, COR.sucata);
      p.caixa(x, y, w, 4, COR.sombraSucata);
      for (let rx = x + 2; rx < x + w - 1; rx += 3) p.ponto(rx, y + 1, COR.sucataClara);
      // Itens parados na esteira
      for (let ix = x + 4; ix < x + w - 8; ix += int(rnd, 8, 14)) {
        if (rnd() < 0.5) monitorObj(p, ix, y - 6, 7, 6);
        else gabinete(p, ix, y - 7, 4, 7, m, rnd);
      }
      // Motor na ponta
      p.caixa(x + w - 6, y - 5, 7, 7, COR.cobreEscuro);
      p.ponto(x + w - 3, y - 2, COR.cobreClaro);
      m.faiscas.push([x + w - 3, y - 3]);
      return w + int(rnd, 6, 16);
    }
    case 'prensa': {
      const w = int(rnd, 18, 28);
      const h = int(rnd, 22, 34);
      const topo = base - h;
      p.caixa(x, topo, w, h, COR.sucata);
      p.px(x + 1, topo + 1, w - 2, 1, COR.sucataClara);
      for (let v = topo + 4; v < topo + 12; v += 2) p.px(x + 3, v, w - 6, 1, COR.sombraSucata);
      // Painel com LEDs
      p.caixa(x + 3, topo + 14, 9, 6, COR.sombraSucata);
      m.leds.push([x + 5, topo + 16, COR.janela]);
      if (rnd() < 0.6) m.leds.push([x + 8, topo + 16, COR.bateriaAmarela]);
      // Pistão e escape
      p.px(x + w - 8, topo - 6, 4, 6, COR.sombraSucata);
      p.px(x + w - 9, topo - 7, 6, 1, COR.contorno);
      m.fumaca.push([x + w - 6, topo - 8]);
      p.px(x + 2, base - 4, w - 4, 4, COR.cobreEscuro);
      return w + int(rnd, 8, 18);
    }
    case 'guindaste': {
      const h = int(rnd, 56, 80);
      const jib = int(rnd, 26, 40);
      const mx = x + 4;
      p.px(mx, base - h, 1, h, COR.sucata);
      p.px(mx + 5, base - h, 1, h, COR.sucata);
      for (let y = base - 4; y > base - h; y -= 6) {
        p.linha(mx, y, mx + 5, y - 6, COR.cobreEscuro);
        p.px(mx, y, 6, 1, COR.sucata);
      }
      p.caixa(mx - 2, base - h - 6, 10, 6, COR.cobre);
      p.ponto(mx + 1, base - h - 4, COR.sucataClara);
      p.px(mx - 8, base - h - 8, jib + 14, 2, COR.sucata);
      for (let jx = mx; jx < mx + jib; jx += 4) p.linha(jx, base - h - 8, jx + 2, base - h - 6, COR.sombraSucata);
      p.caixa(mx - 8, base - h - 10, 5, 4, COR.sombraSucata);
      m.ganchos.push([mx + jib, base - h - 6, int(rnd, 10, 24)]);
      return jib + 14 + int(rnd, 6, 16);
    }
    case 'antena': {
      const h = int(rnd, 30, 50);
      const cx = x + 6;
      p.px(cx, base - h, 1, h, COR.sombraSucata);
      p.linha(cx, base - h + 10, cx - 6, base, COR.sombraSucata);
      p.linha(cx, base - h + 10, cx + 6, base, COR.sombraSucata);
      // Pratos parabólicos tortos
      for (let i = 0; i < int(rnd, 1, 3); i++) {
        const dy = base - h + 6 + i * 9;
        const lado = i % 2 === 0 ? -1 : 1;
        p.disco(cx + lado * 4, dy, 3, COR.sucataClara);
        p.disco(cx + lado * 5, dy, 2, COR.sucata);
      }
      m.leds.push([cx, base - h - 1, COR.janela]);
      return 14 + int(rnd, 4, 12);
    }
    case 'ventilador': {
      const r = int(rnd, 6, 9);
      const cx = x + r + 1;
      const cy = base - r - 4;
      p.caixa(cx - r - 1, cy - r - 1, r * 2 + 3, r * 2 + 3, COR.sucata);
      p.disco(cx, cy, r - 1, COR.sombraSucata);
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + 0.4;
        p.linha(cx, cy, cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2), COR.sucataClara);
      }
      p.ponto(cx, cy, COR.contorno);
      p.px(cx - 1, base - 4, 3, 4, COR.sombraSucata);
      return r * 2 + int(rnd, 6, 14);
    }
  }
}

/* =========================================================================
 * PILHAS DE LIXO ELETRÔNICO (camada próxima 0.55)
 * ========================================================================= */

export type ObjetoPilha = 'monitor' | 'teclado' | 'gabinete' | 'placa' | 'celular' | 'ventoinha' | 'engrenagem' | 'bobina';

function monitorObj(p: Pincel, x: number, y: number, w: number, h: number): void {
  p.caixa(x, y, w, h, COR.sucataClara);
  p.px(x + 1, y + 1, w - 2, h - 3, COR.sombraSucata);
  p.ponto(x + 2, y + 2, COR.sucata);
  p.px(x + 1, y + h - 1, w - 2, 1, COR.sucata);
}

function gabinete(p: Pincel, x: number, y: number, w: number, h: number, m: Marcas, rnd: () => number): void {
  p.caixa(x, y, w, h, COR.sucata);
  p.px(x + 1, y + 1, w - 2, 1, COR.sucataClara);
  if (h > 6) p.px(x + 1, y + 3, w - 2, 1, COR.sombraSucata);
  if (rnd() < 0.35) m.leds.push([x + 1, y + h - 2, COR.janela]);
}

/** Um objeto reconhecível da pilha, apoiado em (x, y = base dele). */
function objetoPilha(p: Pincel, obj: ObjetoPilha, x: number, y: number, rnd: () => number, m: Marcas): void {
  switch (obj) {
    case 'monitor':
      monitorObj(p, x, y - 8, int(rnd, 9, 13), 8);
      break;
    case 'teclado': {
      const w = int(rnd, 10, 14);
      p.caixa(x, y - 3, w, 3, COR.sucataClara);
      for (let k = x + 1; k < x + w - 1; k += 2) p.ponto(k, y - 2, COR.sombraSucata);
      break;
    }
    case 'gabinete':
      gabinete(p, x, y - 11, 6, 11, m, rnd);
      break;
    case 'placa': {
      const w = int(rnd, 8, 13);
      p.px(x, y - 4, w, 4, COR.verdePlaca);
      p.px(x, y - 4, w, 1, COR.verdePlacaClaro);
      p.linha(x + 1, y - 2, x + w - 3, y - 2, COR.cobre);
      p.px(x + 3, y - 3, 2, 1, COR.contorno);
      break;
    }
    case 'celular':
      p.caixa(x, y - 6, 4, 6, COR.contorno);
      p.px(x + 1, y - 5, 2, 3, COR.sucata);
      break;
    case 'ventoinha':
      p.caixa(x, y - 7, 7, 7, COR.sombraSucata);
      p.linha(x + 1, y - 6, x + 5, y - 2, COR.sucataClara);
      p.linha(x + 5, y - 6, x + 1, y - 2, COR.sucataClara);
      break;
    case 'engrenagem': {
      const r = int(rnd, 3, 5);
      p.disco(x + r, y - r, r, COR.cobreEscuro);
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        p.ponto(x + r + Math.round(Math.cos(a) * (r + 1)), y - r + Math.round(Math.sin(a) * (r + 1)), COR.cobreEscuro);
      }
      p.ponto(x + r, y - r, COR.sucata);
      break;
    }
    case 'bobina': {
      const r = int(rnd, 3, 4);
      p.disco(x + r, y - r, r, COR.cobre);
      p.disco(x + r, y - r, r - 1, COR.cobreClaro);
      p.disco(x + r, y - r, 1, COR.cobreEscuro);
      break;
    }
  }
}

/**
 * Pilha mista: monte escuro coberto de objetos sorteados pelos pesos do trecho, de baixo para
 * cima e sem o mesmo objeto duas vezes seguidas. Devolve o topo do monte (para cabos).
 */
export function pilhaMista(
  p: Pincel,
  cx: number,
  base: number,
  larg: number,
  alt: number,
  rnd: () => number,
  pesos: Partial<Record<ObjetoPilha, number>>,
  m: Marcas
): number {
  const x0 = Math.round(cx - larg / 2);
  const topos: number[] = [];
  for (let i = 0; i < larg; i++) {
    const t = 1 - Math.abs(i - larg / 2) / (larg / 2);
    const topo = Math.round(base - alt * Math.sqrt(Math.max(0, t)) + rnd() * 2);
    topos.push(topo);
    p.px(x0 + i, topo, 1, base - topo + 1, COR.sombraSucata);
    if (rnd() < 0.08) p.ponto(x0 + i, topo + int(rnd, 1, 4), COR.sucata);
  }
  let anterior: ObjetoPilha | undefined;
  const n = Math.floor((larg * alt) / 70);
  for (let i = 0; i < n; i++) {
    const coluna = int(rnd, 2, Math.max(2, larg - 12));
    const topo = topos[coluna] ?? base;
    const y = Math.min(base, topo + 4 + Math.floor(rnd() * Math.max(1, (base - topo) * 0.8)));
    const obj = escolher(rnd, pesos, anterior);
    anterior = obj;
    objetoPilha(p, obj, x0 + coluna, y, rnd, m);
  }
  return Math.min(...topos);
}

/** Cabo pendurado entre dois pontos (catenária); anota a ponta mais baixa para pingar. */
export function caboPendurado(p: Pincel, x0: number, y0: number, x1: number, y1: number, flecha: number, cor: string, m: Marcas): void {
  let ax = x0;
  let ay = y0;
  const passos = Math.max(4, Math.round(Math.abs(x1 - x0) / 3));
  for (let k = 1; k <= passos; k++) {
    const t = k / passos;
    const bx = x0 + (x1 - x0) * t;
    const by = y0 + (y1 - y0) * t + flecha * 4 * t * (1 - t);
    p.linha(ax, ay, bx, by, cor);
    ax = bx;
    ay = by;
  }
  m.gotas.push([Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2 + flecha)]);
}
