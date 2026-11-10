/**
 * Verificação de alcance da Fase 3 (sem Phaser): a partir de MOVIMENTO_LIXAO e da gravidade do
 * mundo, monta as superfícies de cada trecho (chão, vigas, esteiras, frágeis, guindastes,
 * elevadores, pontes) e confere, abrindo portões e passagens só quando o jogador alcança a
 * alavanca, o botão ou o terminal:
 *  1. o caminho obrigatório vai do início ao fim do trecho só com pulos possíveis (com margem)
 *     e quedas de no máximo QUEDA_SEGURA, sem depender de tomar dano;
 *  2. nenhum portão ou exercício pode ser pulado (com o pulo perfeito e qualquer queda);
 *  3. cada elevador para sobre chão firme;
 *  4. nenhum puzzle se repete entre os trechos e cada um usa os mecanismos do seu clima.
 *
 * Uso: node scripts/verificarAlcanceFase3.ts
 */
import { ALTURA_BARREIRA, ALTURA_ESPINHOS, LAYOUTS, QUEDA_SEGURA } from '../src/fases/fase3/trechos/LayoutLixao.ts';
import type { Elemento, LayoutTrecho } from '../src/fases/fase3/trechos/LayoutLixao.ts';
import { MOVIMENTO_LIXAO } from '../src/fases/fase3/lixao/TiposLixao.ts';

const GRAVIDADE = 600; // src/nucleo/configuracao.ts
const V0 = -MOVIMENTO_LIXAO.IMPULSO_PULO;
const VX = MOVIMENTO_LIXAO.VELOCIDADE;
const ALTURA_MAX = (V0 * V0) / (2 * GRAVIDADE);
const LARGURA_JOGADOR = 44;
const BARREIRA = ALTURA_BARREIRA + ALTURA_ESPINHOS;
const PORTAO_W = 64;
const ALCANCE_ARREMESSO = 500;
const NOMES_TRECHO = ['sol', 'névoa', 'chuva'];

interface Sup {
  l: number;
  r: number;
  alt: number;
  nome: string;
}
interface Barreira {
  id: string;
  x: number;
  base: number;
}
interface Modo {
  /** Fração do alcance horizontal do pulo usada (margem). */
  fator: number;
  /** Altura máxima de degrau. */
  subida: number;
  queda: number;
}
const OBRIGATORIO: Modo = { fator: 0.85, subida: 160, queda: QUEDA_SEGURA };
const TRAPACA: Modo = { fator: 1, subida: ALTURA_MAX, queda: Infinity };

let falhas = 0;
function checar(nome: string, ok: boolean, detalhe = ''): void {
  if (!ok) falhas++;
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${nome}${!ok && detalhe ? ` (${detalhe})` : ''}`);
}

/** Altura (relativa à decolagem) após andar `s` px na horizontal com o pulo cheio. */
function alturaNoArco(s: number, vx: number): number {
  const t = s / vx;
  return V0 * t - (GRAVIDADE / 2) * t * t;
}

/** Distância horizontal do pulo cheio até pousar `dh` acima (ou abaixo) da decolagem. */
function alcance(dh: number, vx: number): number {
  const disc = V0 * V0 - 2 * GRAVIDADE * dh;
  if (disc < 0) return -1;
  return (vx * (V0 + Math.sqrt(disc))) / GRAVIDADE;
}

/** Superfícies e barreiras do trecho com o conjunto de ids já abertos. */
function montar(lay: LayoutTrecho, abertos: Set<string>): { sups: Sup[]; barreiras: Barreira[]; elevadores: [Sup, Sup][] } {
  const sups: Sup[] = [];
  const barreiras: Barreira[] = [];
  const elevadores: [Sup, Sup][] = [];
  const ex = lay.exercicio;
  // Chão em segmentos pelos buracos; portões fechados são barreiras
  const vaos = [...lay.buracos].sort((a, b) => a[0] - b[0]);
  let x = 0;
  for (const [bx, bw] of vaos) {
    if (bx > x) sups.push({ l: x, r: bx, alt: 0, nome: `chão ${x}` });
    x = bx + bw;
  }
  sups.push({ l: x, r: lay.largura, alt: 0, nome: `chão ${x}` });
  for (const e of lay.elementos as Elemento[]) {
    switch (e.tipo) {
      case 'viga':
      case 'esteira':
      case 'fragil':
        if (ex.obstaculo === 'portao' && e.tipo === 'viga' && e.x === ex.xObstaculo && e.alt === ex.alt && !abertos.has('exercicio')) {
          sups.push({ l: e.x + PORTAO_W, r: e.x + e.w, alt: e.alt, nome: `passarela ${e.x}` });
          barreiras.push({ id: 'exercicio', x: e.x, base: e.alt });
        } else sups.push({ l: e.x, r: e.x + e.w, alt: e.alt, nome: `${e.tipo} ${e.x}/${e.alt}` });
        break;
      case 'guindaste':
        sups.push({ l: e.x, r: e.ate + e.w, alt: e.alt, nome: `guindaste ${e.x}/${e.alt}` });
        break;
      case 'elevador': {
        const alto = { l: e.x, r: e.x + e.w, alt: e.alt, nome: `elevador ${e.x} (alto)` };
        const baixo = { l: e.x, r: e.x + e.w, alt: 20, nome: `elevador ${e.x} (embaixo)` };
        sups.push(alto, baixo);
        elevadores.push([alto, baixo]);
        break;
      }
      case 'ponte':
        if (abertos.has(e.id)) sups.push({ l: e.x, r: e.x + e.w, alt: e.alt, nome: `ponte ${e.id}` });
        break;
      case 'portao':
        if (!abertos.has(e.id)) barreiras.push({ id: e.id, x: e.x, base: 0 });
        break;
      default:
        break;
    }
  }
  // Portões fechados cortam o chão em dois
  for (const br of barreiras) {
    if (br.base !== 0) continue;
    const i = sups.findIndex((s) => s.alt === 0 && s.nome.startsWith('chão') && s.l < br.x && s.r > br.x);
    if (i < 0) continue;
    const s = sups[i];
    sups.splice(i, 1, { ...s, r: br.x }, { ...s, l: br.x + PORTAO_W, nome: `chão ${br.x + PORTAO_W}` });
  }
  if (ex.obstaculo !== 'portao' && abertos.has('exercicio')) {
    sups.push({ l: ex.xObstaculo, r: ex.xObstaculo + ex.largura, alt: ex.alt, nome: 'passagem do exercício' });
  }
  return { sups, barreiras, elevadores };
}

/** O arco de A até B (no sentido `dir`) cruza uma barreira fechada sem passar por cima? */
function bloqueado(a: Sup, b: Sup, dir: 1 | -1, barreiras: Barreira[], vx: number): boolean {
  const saida = dir > 0 ? a.r : a.l;
  const chegada = dir > 0 ? b.l : b.r;
  for (const br of barreiras) {
    const perto = dir > 0 ? br.x : br.x + PORTAO_W;
    const longe = dir > 0 ? br.x + PORTAO_W : br.x;
    // A barreira fica entre a saída e a chegada
    if (dir > 0 ? !(br.x >= saida - 1 && br.x < chegada + LARGURA_JOGADOR) : !(br.x + PORTAO_W <= saida + 1 && br.x + PORTAO_W > chegada - LARGURA_JOGADOR)) continue;
    const topo = br.base + BARREIRA - a.alt;
    const s1 = Math.max(0, Math.abs(perto - saida) - LARGURA_JOGADOR / 2);
    const s2 = Math.abs(longe - saida) + LARGURA_JOGADOR / 2;
    if (alturaNoArco(s1, vx) <= topo || alturaNoArco(s2, vx) <= topo) return true;
  }
  return false;
}

function alcancavel(a: Sup, b: Sup, modo: Modo, barreiras: Barreira[]): boolean {
  if (a === b) return false;
  const dh = b.alt - a.alt;
  if (dh > modo.subida || -dh > modo.queda) return false;
  const vx = VX * modo.fator;
  const d = alcance(dh, vx);
  if (d < 0) return false;
  // Lado direito e esquerdo
  for (const dir of [1, -1] as const) {
    let gap = dir > 0 ? b.l - a.r : a.l - b.r;
    const sobrepostos = b.l < a.r && a.l < b.r;
    if (gap < 0 && !sobrepostos) continue; // B fica do outro lado
    if (gap < 0) {
      // Sobrepostos: precisa sair pela borda de A com B ainda à frente (subindo, fora de baixo de B)
      const sobra = dir > 0 ? (dh > 0 ? a.r - b.r : b.r - a.r) : dh > 0 ? b.l - a.l : a.l - b.l;
      if (sobra < (dh > 0 ? LARGURA_JOGADOR : 1)) continue;
      gap = 0;
    }
    if (gap <= d && !bloqueado(a, b, dir, barreiras, vx)) return true;
  }
  return false;
}

/** Busca no grafo, abrindo o que for alcançado. `bloquear` nunca abre. Devolve o que abriu e se chegou ao fim. */
function explorar(lay: LayoutTrecho, modo: Modo, bloquear?: string): { fim: boolean; ordem: string[]; abertos: Set<string>; caminho: string } {
  const abertos = new Set<string>();
  const ordem: string[] = [];
  for (;;) {
    const { sups, barreiras, elevadores } = montar(lay, abertos);
    const inicio = sups.find((s) => s.alt === 0 && s.l <= 160 && s.r >= 160)!;
    const vistos = new Set<Sup>([inicio]);
    const fila = [inicio];
    const pai = new Map<Sup, Sup>();
    while (fila.length) {
      const a = fila.shift()!;
      const vizinhos = sups.filter((b) => alcancavel(a, b, modo, barreiras));
      for (const [alto, baixo] of elevadores) {
        if (a === alto) vizinhos.push(baixo);
        if (a === baixo) vizinhos.push(alto);
      }
      for (const b of vizinhos) if (!vistos.has(b)) (vistos.add(b), pai.set(b, a), fila.push(b));
    }
    const pisa = (x: number, alt: number): boolean => [...vistos].some((s) => s.alt === alt && s.l <= x && s.r >= x);
    let novo = false;
    const abrir = (id: string): void => {
      if (abertos.has(id) || id === bloquear) return;
      abertos.add(id);
      ordem.push(id);
      novo = true;
    };
    const ex = lay.exercicio;
    if (pisa(ex.x, ex.alt)) abrir('exercicio');
    for (const e of lay.elementos) {
      if (e.tipo === 'alavanca' && pisa(e.x, e.alt)) abrir(e.alvo);
      if (e.tipo === 'botao' && [...vistos].some((s) => s.alt < e.alt && Math.max(s.l - e.x, e.x - s.r, 0) <= ALCANCE_ARREMESSO)) abrir(e.alvo);
    }
    if (!novo) {
      const ult = [...vistos].find((s) => s.alt === 0 && s.l <= lay.largura - 10 && s.r >= lay.largura - 10);
      const passos: string[] = [];
      for (let s = ult; s; s = pai.get(s)) passos.unshift(s.nome);
      return { fim: !!ult, ordem, abertos, caminho: passos.join(' > ') };
    }
  }
}

/* ----------------------------- alcance ----------------------------- */

console.log(`Pulo: ${ALTURA_MAX.toFixed(0)} px de altura, ${alcance(0, VX).toFixed(0)} px no mesmo nível; queda segura até ${QUEDA_SEGURA} px.\n`);

LAYOUTS.forEach((lay, i) => {
  const nome = NOMES_TRECHO[i];
  const r = explorar(lay, OBRIGATORIO);
  checar(`${nome}: início ao fim sem dano nem queda > ${QUEDA_SEGURA} px`, r.fim, `abriu: ${r.ordem.join(', ') || 'nada'}`);
  const ids = ['exercicio', ...lay.elementos.flatMap((e) => (e.tipo === 'portao' || e.tipo === 'ponte' ? [e.id] : []))];
  for (const id of ids) {
    checar(`${nome}: ${id} é necessário no caminho obrigatório`, r.abertos.has(id));
    const t = explorar(lay, TRAPACA, id);
    checar(`${nome}: ${id} não dá para pular nem com o pulo perfeito`, !t.fim, t.caminho);
  }
  // Elevadores param sobre chão firme
  for (const e of lay.elementos) {
    if (e.tipo !== 'elevador') continue;
    const sobreBuraco = lay.buracos.some(([bx, bw]) => e.x < bx + bw && e.x + e.w > bx);
    checar(`${nome}: elevador ${e.x} para sobre chão firme`, !sobreBuraco);
  }
  // Fim do trecho no chão para o seguinte continuar
  checar(`${nome}: termina em chão firme`, !lay.buracos.some(([bx, bw]) => bx + bw > lay.largura - 32));
});

/* ----------------------------- puzzles ----------------------------- */

const TEMA: readonly (readonly Elemento['tipo'][])[] = [
  ['esteira', 'prensa'],
  ['fragil', 'guindaste'],
  ['choque', 'ima'],
];
const assinaturas = new Map<string, string>();
const combinacoes = new Map<string, string>();
LAYOUTS.forEach((lay, i) => {
  for (const p of lay.puzzles) {
    const els = lay.elementos.filter((e) => e.x >= p.de && e.x <= p.ate && e.tipo !== 'checkpoint');
    const geo = els
      .map((e) => `${e.tipo}:${e.x - p.de}:${'alt' in e ? e.alt : 0}:${'w' in e ? e.w : 0}`)
      .sort()
      .join('|');
    const tipos = [...new Set(els.map((e) => e.tipo))].sort().join('+');
    checar(`${p.nome}: layout único`, !assinaturas.has(geo), `igual a ${assinaturas.get(geo)}`);
    checar(`${p.nome}: combinação de mecanismos única (${tipos})`, !combinacoes.has(tipos), `igual a ${combinacoes.get(tipos)}`);
    checar(`${p.nome}: usa mecanismo do clima`, els.some((e) => TEMA[i].includes(e.tipo)));
    assinaturas.set(geo, p.nome);
    combinacoes.set(tipos, p.nome);
  }
});

console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
