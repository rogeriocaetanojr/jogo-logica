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
  { numero: 2, nome: 'PATIO DAS PILHAS', subtitulo: 'Desafio 1: Pilha', fumaca: 'leve' },
  { numero: 3, nome: 'CAIS DA FILA', subtitulo: 'Desafio 2: Fila', fumaca: 'media' },
  { numero: 4, nome: 'DEPOSITO DE PNEUS', subtitulo: 'Desafio 3: Vetores e indices', fumaca: 'densa' },
  { numero: 5, nome: 'TERMINAL DE COMBUSTIVEL', subtitulo: 'Desafio 4: Ordenacao', fumaca: 'densa' },
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

const CHAVE_PROGRESSO = 'porto_bugado_progresso_v1';

export function salvarProgresso(estado: EstadoPorto): void {
  try {
    localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(estado));
  } catch {
    // Ignora ambientes sem localStorage
  }
}

export function carregarProgresso(): EstadoPorto | null {
  try {
    const bruto = localStorage.getItem(CHAVE_PROGRESSO);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as Partial<EstadoPorto>;
    if (typeof dados.area !== 'number') return null;
    return { ...criarEstadoInicial(), ...dados } as EstadoPorto;
  } catch {
    return null;
  }
}

export function apagarProgresso(): void {
  try {
    localStorage.removeItem(CHAVE_PROGRESSO);
  } catch {
    // Ignora ambientes sem localStorage
  }
}
