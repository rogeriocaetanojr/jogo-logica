/**
 * Tipos, constantes e estado persistente da fase Porto Bugado.
 */

export type NivelFumaca = 'leve' | 'media' | 'densa' | 'sufocante';

/** Estado que atravessa as 6 áreas (e fica salvo para continuar depois). */
export interface EstadoPorto {
  area: number;
  focosApagados: string[];
  lacres: number;
  vidas: number;
  tanquesE: number;
  filtros: number;
  temExtintor: boolean;
  cargasExtintor: number;
  temCanhao: boolean;
  espuma: number;
  gravacoes: number[];
  desafios: boolean[];
  minibossDerrotado: boolean;
  falasVistas: string[];
}

export interface InfoArea {
  numero: number;
  nome: string;
  subtitulo: string;
  fumaca: NivelFumaca;
}

export const AREAS: InfoArea[] = [
  { numero: 1, nome: 'PORTARIA TRAVADA', subtitulo: 'Entrada do porto de Bug', fumaca: 'leve' },
  { numero: 2, nome: 'PÁTIO DAS PILHAS', subtitulo: 'Desafio 1: Pilha', fumaca: 'leve' },
  { numero: 3, nome: 'CAIS DA FILA', subtitulo: 'Desafio 2: Fila', fumaca: 'media' },
  { numero: 4, nome: 'DEPÓSITO DE PNEUS', subtitulo: 'Desafio 3: Vetores e índices', fumaca: 'densa' },
  { numero: 5, nome: 'TERMINAL DE COMBUSTÍVEL', subtitulo: 'Desafio 4: Ordenação', fumaca: 'densa' },
  { numero: 6, nome: 'TORRE DO SERVIDOR CENTRAL', subtitulo: 'KRAKEN.EXE', fumaca: 'densa' },
];

export const TOTAL_FOCOS = 12;
export const VIDA_MAXIMA = 10;
export const VIDAS_INICIAIS = 3;
export const CARGAS_EXTINTOR = 3;
export const ESPUMA_MAXIMA = 12;

/** Índice de Fumaça: começa em 100% e cada foco apagado tira 5%. */
export function indiceFumaca(estado: EstadoPorto): number {
  return Math.max(0, 100 - 5 * estado.focosApagados.length);
}

export function criarEstadoInicial(): EstadoPorto {
  return {
    area: 0,
    focosApagados: [],
    lacres: 0,
    vidas: VIDAS_INICIAIS,
    tanquesE: 0,
    filtros: 0,
    temExtintor: false,
    cargasExtintor: 0,
    temCanhao: false,
    espuma: 0,
    gravacoes: [],
    desafios: [false, false, false, false],
    minibossDerrotado: false,
    falasVistas: [],
  };
}

export function clonarEstado(estado: EstadoPorto): EstadoPorto {
  return JSON.parse(JSON.stringify(estado)) as EstadoPorto;
}

/** Chave e versão do progresso salvo; mude a versão quando o formato de EstadoPorto mudar. */
const CHAVE_PROGRESSO = 'porto_bugado_progresso';
const CHAVE_LEGADA = 'porto_bugado_progresso_v1';
const VERSAO_PROGRESSO = 2;

interface ProgressoSalvo {
  versao: number;
  estado: EstadoPorto;
}

function inteiro(valor: unknown, padrao: number, min: number, max: number): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return padrao;
  return Math.min(max, Math.max(min, Math.floor(valor)));
}

function lista<T>(valor: unknown, tipo: 'string' | 'number'): T[] {
  return Array.isArray(valor) ? (valor.filter((v) => typeof v === tipo) as T[]) : [];
}

/** Aceita só campos conhecidos e do tipo certo; o que faltar ou vier corrompido volta ao valor inicial. */
function sanitizarEstado(dados: Partial<Record<keyof EstadoPorto, unknown>>): EstadoPorto {
  const base = criarEstadoInicial();
  const desafios = Array.isArray(dados.desafios) ? dados.desafios : [];
  return {
    area: inteiro(dados.area, 0, 0, AREAS.length - 1),
    focosApagados: lista<string>(dados.focosApagados, 'string'),
    lacres: inteiro(dados.lacres, base.lacres, 0, 999),
    vidas: inteiro(dados.vidas, base.vidas, 1, 99),
    tanquesE: inteiro(dados.tanquesE, base.tanquesE, 0, 99),
    filtros: inteiro(dados.filtros, base.filtros, 0, 99),
    temExtintor: dados.temExtintor === true,
    cargasExtintor: inteiro(dados.cargasExtintor, base.cargasExtintor, 0, CARGAS_EXTINTOR),
    temCanhao: dados.temCanhao === true,
    espuma: inteiro(dados.espuma, base.espuma, 0, ESPUMA_MAXIMA),
    gravacoes: lista<number>(dados.gravacoes, 'number'),
    desafios: base.desafios.map((_, i) => desafios[i] === true),
    minibossDerrotado: dados.minibossDerrotado === true,
    falasVistas: lista<string>(dados.falasVistas, 'string'),
  };
}

export function salvarProgresso(estado: EstadoPorto): void {
  try {
    const progresso: ProgressoSalvo = { versao: VERSAO_PROGRESSO, estado };
    localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(progresso));
  } catch {
    // Ignora ambientes sem localStorage
  }
}

export function carregarProgresso(): EstadoPorto | null {
  try {
    const bruto = localStorage.getItem(CHAVE_PROGRESSO);
    if (bruto) {
      const salvo = JSON.parse(bruto) as Partial<ProgressoSalvo>;
      if (salvo?.versao !== VERSAO_PROGRESSO || typeof salvo.estado !== 'object' || salvo.estado === null) return null;
      return sanitizarEstado(salvo.estado as Partial<Record<keyof EstadoPorto, unknown>>);
    }
    // Migra o save antigo (estado solto, sem versão)
    const legado = localStorage.getItem(CHAVE_LEGADA);
    if (!legado) return null;
    const dados = JSON.parse(legado) as Partial<Record<keyof EstadoPorto, unknown>>;
    if (typeof dados?.area !== 'number') return null;
    return sanitizarEstado(dados);
  } catch {
    return null;
  }
}

export function apagarProgresso(): void {
  try {
    localStorage.removeItem(CHAVE_PROGRESSO);
    localStorage.removeItem(CHAVE_LEGADA);
  } catch {
    // Ignora ambientes sem localStorage
  }
}
