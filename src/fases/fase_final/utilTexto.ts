/**
 * Normalização das entradas dos terminais: minúsculas, sem acentos, espaços colapsados e sem
 * espaços ao redor de símbolos. "Jogador.Ciente = Verdadeiro" vira "jogador.ciente=verdadeiro".
 */
export function normalizar(entrada: string): string {
  return entrada
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([=(),:;.\[\]!<>-])\s*/g, '$1')
    .trim();
}

/** Mesmo texto normalizado, sem nenhum espaço. */
export function semEspacos(entrada: string): string {
  return normalizar(entrada).replace(/ /g, '');
}
