import { COR, CORES_CONTEINER, Pincel, aleatorio, hash3, noturna, sombrear } from './ArtePorto';

/**
 * Peças de cenário em pixel art portadas da cena de referência (Porto Bugado.html):
 * céu de fuligem com pontilhado, cidade de Bug com janelas infectadas, torre do servidor,
 * guindastes, navios, carreta de petróleo, depósito de pneus e píer com faixas de advertência.
 *
 * Todas as funções desenham em coordenadas de pixel de arte (1 pixel de arte = 4 pixels de tela).
 */

export const PALETA_CEU = {
  entardecer: ['#24161E', '#3A1C24', '#5A2328', '#7E2E28', '#A8402A', '#C95A2C', '#DE7A34', '#E99A4A'],
  fumacento: ['#161012', '#1E1416', '#2A1A1C', '#3A1E1E', '#5A2624', '#7A3226', '#9A4228', '#B4562C'],
  noite: ['#080A18', '#0D1024', '#141530', '#201836', '#341C34', '#52222E', '#7A2E2A', '#A0442A'],
} as const;

export type ModoCeu = keyof typeof PALETA_CEU;

/** Converte uma cor para a versão noturna quando necessário. */
export function tingir(cor: string, noite: boolean): string {
  return noite ? noturna(cor) : cor;
}

/** Céu em faixas com pontilhado de Bayer; sol vermelho cortado por névoa (ou lua e estrelas à noite). */
export function desenharCeu(p: Pincel, w: number, h: number, modo: ModoCeu, horizonte = 104, solX = 206, solY = 54): void {
  p.degradePontilhado(0, 0, w, horizonte, PALETA_CEU[modo]);
  const ultima = PALETA_CEU[modo][PALETA_CEU[modo].length - 1];
  p.px(0, horizonte, w, h - horizonte, ultima);
  if (modo === 'noite') {
    const r = aleatorio(11);
    for (let i = 0; i < Math.floor(w / 7); i++) {
      const x = Math.floor(r() * w);
      const y = Math.floor(r() * 56);
      p.ponto(x, y, r() < 0.2 ? '#C8C4E0' : '#5A5878');
    }
    p.disco(52, 24, 5, '#9A8E86');
    p.disco(53, 23, 4, '#C9BEB2');
    p.px(51, 24, 2, 1, '#A89C90');
    p.ponto(54, 21, '#A89C90');
    return;
  }
  p.disco(solX, solY, 12, '#C83A28');
  p.disco(solX, solY, 10, COR.sol);
  p.disco(solX - 2, solY - 3, 5, '#EC7442');
  const ctx = p.ctx;
  ctx.fillStyle = 'rgba(120,40,34,0.7)';
  for (const dy of [-6, 0, 5, 9]) ctx.fillRect(solX - 18, solY + dy, 36, 1);
}

/**
 * Silhueta da cidade de Bug. Retorna as posições das janelas infectadas (verde-néon) para animação.
 */
export function desenharCidade(p: Pincel, x0: number, x1: number, base: number, semente: number, noite: boolean): Array<[number, number]> {
  const janelasVirus: Array<[number, number]> = [];
  const r = aleatorio(semente);
  const c1 = tingir(noite ? '#24223A' : '#5A3238', false);
  const c2 = tingir(noite ? '#1C1A2E' : '#4A2A32', false);
  let x = x0;
  while (x < x1) {
    const w = 5 + Math.floor(r() * 9);
    const h = 6 + Math.floor(r() * 22);
    const cor = r() < 0.5 ? c1 : c2;
    p.px(x, base - h, w, h, cor);
    if (r() < 0.3) p.px(x + (w >> 1), base - h - 3, 1, 3, cor);
    for (let wy = base - h + 2; wy < base - 3; wy += 3) {
      for (let wx = x + 1; wx < x + w - 1; wx += 2) {
        if (r() < 0.2) {
          if (r() < 0.14) janelasVirus.push([wx, wy]);
          else p.ponto(wx, wy, noite ? '#C89048' : '#B87444');
        }
      }
    }
    x += w + (r() < 0.3 ? 1 : 0);
  }
  return janelasVirus;
}

/** Torre do servidor central vista de longe (luzes verdes do MegaBrain). Retorna pontos de luz. */
export function desenharTorreServidor(p: Pincel, x: number, base: number, noite: boolean): Array<[number, number]> {
  const st = tingir('#2E3038', noite);
  const stl = tingir('#4A4E5A', noite);
  p.px(x, base - 4, 18, 4, tingir('#2A2428', noite));
  p.linha(x + 5, base - 20, x + 1, base - 4, st);
  p.linha(x + 12, base - 20, x + 16, base - 4, st);
  p.px(x + 5, base - 36, 8, 33, st);
  p.px(x + 12, base - 36, 1, 33, stl);
  p.px(x + 1, base - 41, 16, 5, st);
  p.px(x + 1, base - 41, 16, 1, stl);
  p.px(x + 8, base - 54, 2, 13, st);
  const luzes: Array<[number, number]> = [];
  for (let y = base - 32; y < base - 5; y += 5) luzes.push([x + 7, y]);
  luzes.push([x + 8, base - 55]);
  return luzes;
}

/** Guindaste de pórtico em silhueta (versão da cena de referência). */
export function desenharGuindaste(p: Pincel, x: number, base: number, noite: boolean, escala = 1): void {
  const c = tingir(noite ? '#24222E' : '#2E2630', false);
  const borda = noite ? '#3A2A34' : '#6A3E3A';
  const e = (v: number) => Math.round(v * escala);
  const topo = base - e(64);
  p.px(x - e(7), topo + e(23), e(2), e(41), c);
  p.px(x + e(6), topo + e(23), e(2), e(41), c);
  p.px(x + e(7), topo + e(23), 1, e(41), borda);
  p.linha(x - e(6), topo + e(27), x + e(6), topo + e(59), c);
  p.linha(x + e(6), topo + e(27), x - e(6), topo + e(59), c);
  p.px(x - e(7), topo + e(42), e(15), 1, c);
  p.px(x - e(50), topo + e(21), e(68), e(3), c);
  p.px(x - e(50), topo + e(21), e(68), 1, borda);
  p.linha(x - e(6), topo + e(21), x, topo + e(1), c);
  p.linha(x + e(7), topo + e(21), x + e(1), topo + e(1), c);
  p.px(x - 1, topo, 3, 2, c);
  p.linha(x, topo + e(2), x - e(48), topo + e(21), c);
  p.linha(x + 1, topo + e(2), x + e(16), topo + e(21), c);
  p.px(x - e(16), topo + e(24), e(7), e(5), c);
  p.px(x - e(15), topo + e(25), e(5), e(2), noite ? '#3A3A50' : '#8A5A3A');
}

/** Pilha simples de contêineres de fundo (12x5 cada). */
export function desenharPilhaFundo(p: Pincel, x: number, base: number, n: number, deslocCor: number, noite: boolean, escuro = 0): void {
  for (let k = 0; k < n; k++) {
    const y = base - 5 - k * 5;
    const cor = sombrear(tingir(CORES_CONTEINER[(deslocCor + k * 2) % 4], noite), escuro);
    p.px(x, y, 12, 5, cor);
    for (let cx = x + 1; cx < x + 11; cx += 2) p.px(cx, y + 1, 1, 3, sombrear(cor, 0.25));
    p.px(x, y + 4, 12, 1, sombrear(cor, 0.45));
    p.px(x + 11, y, 1, 5, sombrear(cor, 0.35));
  }
}

/** Navio porta-contêineres (casco enferrujado, contêineres e ponte de comando). */
export function desenharNavio(
  p: Pincel,
  x: number,
  convesY: number,
  largura: number,
  semente: number,
  noite: boolean,
  nome = 'BUG'
): void {
  const casco = tingir('#5A2A22', noite);
  const cascoE = tingir('#3A1C18', noite);
  const conves = tingir('#2A1E1E', noite);
  const ferrugem = tingir('#7A3A26', noite);
  const r = aleatorio(semente);
  const colunas = Math.floor((largura - 24) / 6);
  for (let i = 0; i < colunas; i++) {
    const cx = x + 8 + i * 6;
    const linhas = 2 + Math.floor(r() * 3);
    for (let k = 0; k < linhas; k++) {
      const y = convesY - 3 - k * 3;
      const cor = tingir(CORES_CONTEINER[Math.floor(r() * CORES_CONTEINER.length)], noite);
      p.px(cx, y, 5, 3, cor);
      p.px(cx, y + 2, 5, 1, sombrear(cor, 0.4));
      p.px(cx + 4, y, 1, 2, sombrear(cor, 0.25));
    }
  }
  const px0 = x + largura - 22;
  p.px(px0, convesY - 20, 14, 20, tingir('#B8B0A4', noite));
  p.px(px0 + 13, convesY - 20, 1, 20, tingir('#8A847C', noite));
  p.px(px0 + 1, convesY - 17, 12, 2, tingir('#2A3440', noite));
  const luz = noite ? '#E8C060' : tingir('#C8A060', noite);
  p.px(px0 + 2, convesY - 17, 2, 1, luz);
  p.px(px0 + 8, convesY - 17, 2, 1, luz);
  p.px(px0 + 1, convesY - 12, 12, 1, tingir('#2A3440', noite));
  p.px(px0 + 4, convesY - 27, 7, 7, tingir('#A33A2A', noite));
  p.px(px0 + 4, convesY - 27, 7, 1, tingir('#1A1414', noite));
  p.px(x + 4, convesY - 14, 1, 14, tingir('#4A3E3A', noite));
  p.px(x + 1, convesY - 11, 7, 1, tingir('#4A3E3A', noite));
  for (let y = convesY; y <= convesY + 15; y++) {
    const esq = Math.round(x + (y - convesY) * 0.7);
    const dir = Math.round(x + largura - Math.max(0, y - convesY - 10) * 1.6);
    p.px(esq, y, dir - esq, 1, y >= convesY + 13 ? cascoE : casco);
  }
  p.px(x, convesY, largura, 1, conves);
  for (let i = 0; i < Math.floor(largura / 7); i++) {
    const rx = x + 8 + Math.floor(r() * (largura - 16));
    p.px(rx, convesY + 2, 1, 2 + Math.floor(r() * 6), ferrugem);
  }
  p.texto(nome, x + 10, convesY + 4, tingir('#C8BCA8', noite));
}

/** Carreta-tanque de petróleo (cabine vermelha, tanque com faixa laranja e símbolo de inflamável). */
export function desenharCarreta(p: Pincel, x: number, y: number, noite: boolean, tombada = false): void {
  const t = (c: string) => tingir(c, noite);
  if (tombada) {
    // Tanque deitado de lado, vazando óleo
    p.elipse(x + 22, y + 6, 20, 6, t('#8A847C'));
    p.elipse(x + 22, y + 5, 19, 5, t('#B8B2A8'));
    p.px(x + 4, y + 4, 36, 2, t('#E07A2A'));
    p.px(x + 40, y + 2, 9, 9, t('#C8401E'));
    p.px(x + 42, y + 4, 5, 3, t('#2A3440'));
    p.disco(x + 10, y - 1, 2, t('#141212'));
    p.disco(x + 30, y - 1, 2, t('#141212'));
    p.px(x - 6, y + 11, 50, 2, '#141012');
    p.ponto(x + 2, y + 11, COR.oleoRoxo);
    p.ponto(x + 18, y + 12, COR.oleoCiano);
    return;
  }
  const tanque = t('#B8B2A8');
  const tanqueS = t('#8A847C');
  for (let yy = y; yy <= y + 10; yy++) {
    const ins = yy === y || yy === y + 10 ? 2 : yy === y + 1 || yy === y + 9 ? 1 : 0;
    p.px(x + 12 + ins, yy, 31 - ins * 2, 1, yy > y + 7 ? tanqueS : tanque);
  }
  p.px(x + 12, y + 4, 31, 2, t('#E07A2A'));
  for (let tx = x + 14; tx < x + 41; tx++) {
    if (hash3(tx, 1, 3) < 0.6) p.ponto(tx, y + (hash3(tx, 2, 3) < 0.5 ? 0 : 1), t('#2A2422'));
  }
  const vermelho = t('#C8301E');
  p.ponto(x + 36, y + 3, vermelho);
  p.px(x + 35, y + 4, 3, 1, vermelho);
  p.px(x + 34, y + 5, 5, 1, vermelho);
  p.px(x + 35, y + 6, 3, 1, vermelho);
  p.ponto(x + 36, y + 7, vermelho);
  p.ponto(x + 36, y + 5, t(COR.branco));
  p.px(x, y + 10, 43, 2, t('#1E1A1A'));
  p.px(x, y + 1, 11, 9, t('#C8401E'));
  p.px(x, y + 1, 11, 1, t('#E0603A'));
  p.px(x + 2, y + 3, 6, 3, t('#2A3440'));
  p.px(x + 9, y + 3, 1, 6, t('#8A2A18'));
  for (const wx of [x + 4, x + 18, x + 26, x + 38]) {
    p.disco(wx, y + 14, 2, t('#141212'));
    p.ponto(wx, y + 14, t('#5A5650'));
  }
}

/** Depósito de pneus com telhado inclinado, porta incandescente e pilhas de pneus. */
export function desenharDepositoPneus(p: Pincel, x: number, base: number, noite: boolean): void {
  const t = (c: string) => tingir(c, noite);
  const parede = t('#3A3236');
  const paredeE = t('#2C262A');
  const telhado = t('#4A3E40');
  p.px(x, base - 22, 47, 22, parede);
  for (let wx = x + 1; wx < x + 47; wx += 3) p.px(wx, base - 22, 1, 22, paredeE);
  for (let rx = x; rx <= x + 25; rx++) {
    const yt = Math.round(base - 22 - (rx - x) * (10 / 17));
    p.px(rx, yt, 1, base - 21 - yt, telhado);
  }
  p.linha(x + 26, base - 28, x + 39, base - 22, t('#2A2224'));
  p.linha(x + 31, base - 30, x + 43, base - 23, t('#2A2224'));
  p.px(x + 11, base - 14, 18, 14, '#1A1012');
  p.texto('PNEUS', x + 10, base - 20, t('#C8BCA8'));
  for (const [tx, n] of [
    [x + 34, 3],
    [x + 41, 2],
  ]) {
    for (let k = 0; k < n; k++) {
      const ty = base - 2 - k * 3;
      p.px(tx - 3, ty - 1, 7, 3, t('#141212'));
      p.px(tx - 2, ty - 1, 5, 1, t('#3A3636'));
    }
  }
}

/** Porta incandescente do depósito (quadro animado separado do cenário estático). */
export function desenharPortaFogo(p: Pincel, x: number, y: number, intensidade: number, fase: number): void {
  for (let yy = 0; yy < 14; yy++) {
    const k = yy / 13;
    const f = 0.75 + 0.25 * Math.sin(fase + yy * 0.8);
    const r = Math.round(58 + (232 - 58) * k * f * (0.35 + 0.65 * intensidade));
    const g = Math.round(20 + (116 - 20) * k * f * (0.35 + 0.65 * intensidade));
    const b = Math.round(14 + (42 - 14) * k * f * (0.35 + 0.65 * intensidade));
    p.px(x, y + yy, 18, 1, `rgb(${r},${g},${b})`);
  }
  for (const [tx, ty] of [
    [3, 11],
    [8, 11],
    [13, 11],
    [5, 8],
    [11, 8],
    [8, 5],
  ]) {
    p.px(x + tx - 2, y + ty - 1, 5, 3, '#120A0A');
    p.ponto(x + tx, y + ty, '#E8742A');
  }
}

/**
 * Píer de concreto com faixa amarela/preta, face, estacas e lodo.
 * yDeck é a linha superior do piso; desenha até alturaTotal.
 */
export function desenharPier(p: Pincel, x0: number, x1: number, yDeck: number, alturaTotal: number, noite: boolean): void {
  const t = (c: string) => tingir(c, noite);
  const largura = x1 - x0;
  p.px(x0, yDeck, largura, 4, t(COR.concreto));
  p.px(x0, yDeck, largura, 1, t(COR.concretoClaro));
  for (let x = x0; x < x1; x += 8) {
    p.px(x, yDeck + 4, Math.min(4, x1 - x), 2, t(COR.advertencia));
    if (x + 4 < x1) p.px(x + 4, yDeck + 4, Math.min(4, x1 - x - 4), 2, t('#1A1616'));
  }
  p.px(x0, yDeck + 6, largura, 5, t('#3E3B38'));
  for (let x = x0 + 4; x < x1 - 3; x += 18) {
    const alturaEstaca = alturaTotal - (yDeck + 11);
    if (alturaEstaca <= 0) continue;
    p.px(x, yDeck + 11, 4, alturaEstaca, t('#2E2B2A'));
    p.px(x, yDeck + 11, 4, 2, t('#3F5A2E'));
    p.ponto(x + 1, yDeck + 15, t('#8A8270'));
    p.ponto(x + 2, yDeck + 19, t('#8A8270'));
  }
}

/** Faixa de asfalto da portaria (pista com marcações e meio-fio zebrado). */
export function desenharAsfalto(p: Pincel, x0: number, x1: number, yTopo: number, altura: number): void {
  const largura = x1 - x0;
  p.px(x0, yTopo, largura, altura, '#2E2A2C');
  p.px(x0, yTopo, largura, 1, '#5A5458');
  for (let x = x0; x < x1; x++) {
    for (let y = yTopo + 1; y < yTopo + altura; y++) {
      const h = hash3(x, y, 17);
      if (h > 0.93) p.ponto(x, y, '#3A3638');
      else if (h < 0.03) p.ponto(x, y, '#242022');
    }
  }
  for (let x = x0 + 2; x < x1; x += 16) p.px(x, yTopo + 8, 8, 1, '#C8B890');
  for (let x = x0; x < x1; x += 6) {
    p.px(x, yTopo + 1, 3, 2, COR.advertencia);
    p.px(x + 3, yTopo + 1, 3, 2, '#1A1616');
  }
}

/** Poste de iluminação do porto (luz alaranjada). */
export function desenharPoste(p: Pincel, x: number, base: number, altura: number, noite: boolean): void {
  const c = tingir('#3A3438', noite);
  p.px(x, base - altura, 1, altura, c);
  p.px(x - 3, base - altura, 7, 1, c);
  p.px(x - 3, base - altura + 1, 2, 1, noite ? '#F0C060' : '#D89048');
  p.px(x + 2, base - altura + 1, 2, 1, noite ? '#F0C060' : '#D89048');
}

/** Cerca de alambrado com faixa de advertência. */
export function desenharCerca(p: Pincel, x0: number, x1: number, base: number, altura: number, noite: boolean): void {
  const c = tingir('#4A4448', noite);
  for (let x = x0; x < x1; x += 12) p.px(x, base - altura, 1, altura, c);
  p.px(x0, base - altura, x1 - x0, 1, c);
  for (let x = x0; x < x1; x++) {
    for (let y = base - altura + 1; y < base; y++) {
      if ((x + y) % 3 === 0 && hash3(x, y, 3) > 0.35) p.ponto(x, y, sombrear(c, 0.25));
    }
  }
}
