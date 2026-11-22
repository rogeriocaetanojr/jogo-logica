/**
 * Tipos, constantes e estado persistente da fase Porto Bugado.
 */

export type NivelFumaca = 'leve' | 'media' | 'densa' | 'sufocante';

/** Estado que atravessa as áreas da partida (não é salvo: cada entrada na fase começa do início). */
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
  { numero: 3, nome: 'CAIS DA FILA', subtitulo: 'Desafio: Fila', fumaca: 'media' },
  { numero: 4, nome: 'DEPÓSITO DE PNEUS', subtitulo: 'Desafio: Vetores e índices + BORRACHÃO.EXE', fumaca: 'densa' },
  { numero: 5, nome: 'TERMINAL DE COMBUSTÍVEL', subtitulo: 'Desafio 4: Ordenação', fumaca: 'densa' },
  { numero: 6, nome: 'TORRE DO SERVIDOR CENTRAL', subtitulo: 'KRAKEN.EXE', fumaca: 'densa' },
];

/**
 * Áreas que a partida percorre, em ordem (índices de AREAS). A versão mais curta da fase pula o
 * Pátio das Pilhas (1) e o Terminal de Combustível (4): Portaria → Cais → Depósito/Borrachão → Kraken.
 */
export const ROTEIRO_AREAS = [0, 2, 3, 5];

/** Posição da área no roteiro (0, 1, 2...), usada nos números "ÁREA N/total" mostrados ao jogador. */
export function etapaDoRoteiro(area: number): number {
  return Math.max(0, ROTEIRO_AREAS.indexOf(area));
}

/** Próxima área do roteiro, ou -1 quando a área é a última (fim da fase). */
export function proximaArea(area: number): number {
  const i = ROTEIRO_AREAS.indexOf(area);
  return i >= 0 && i + 1 < ROTEIRO_AREAS.length ? ROTEIRO_AREAS[i + 1] : -1;
}

/** Focos com id nas áreas do roteiro: Portaria (2), Cais (2) e Depósito (3). */
export const TOTAL_FOCOS = 7;
/** Gravações do PORTUS nas áreas do roteiro: Portaria, Cais e Depósito. */
export const TOTAL_GRAVACOES = 3;
export const VIDA_MAXIMA = 10;
export const VIDAS_INICIAIS = 5;
export const CARGAS_EXTINTOR = 3;
export const ESPUMA_MAXIMA = 12;

/** Índice de Fumaça: começa em 100% e chega a 40% com todos os focos do roteiro apagados. */
export function indiceFumaca(estado: EstadoPorto): number {
  const apagados = Math.min(TOTAL_FOCOS, estado.focosApagados.length);
  return Math.round(100 - (60 * apagados) / TOTAL_FOCOS);
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

/** Chaves do progresso que versões antigas da fase salvavam; hoje só são apagadas. */
const CHAVES_PROGRESSO_ANTIGO = ['porto_bugado_progresso', 'porto_bugado_progresso_v1'];

/** Remove o progresso salvo por versões antigas, que fazia a fase reabrir no meio. */
export function apagarProgresso(): void {
  try {
    for (const chave of CHAVES_PROGRESSO_ANTIGO) localStorage.removeItem(chave);
  } catch {
    // Ignora ambientes sem localStorage
  }
}
