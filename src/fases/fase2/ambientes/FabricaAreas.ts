import type { CenaFase2 } from '../CenaFase2';
import type { AreaPorto } from './AreaBase';
import { Area1Portaria } from './Area1Portaria';
import { Area2Patio } from './Area2Patio';
import { Area3Cais } from './Area3Cais';
import { Area4Deposito } from './Area4Deposito';
import { Area5Terminal } from './Area5Terminal';
import { Area6Torre } from './Area6Torre';

/** Cria o ambiente correspondente ao índice (0 a 5). */
export function criarArea(cena: CenaFase2, indice: number): AreaPorto {
  switch (indice) {
    case 1:
      return new Area2Patio(cena);
    case 2:
      return new Area3Cais(cena);
    case 3:
      return new Area4Deposito(cena);
    case 4:
      return new Area5Terminal(cena);
    case 5:
      return new Area6Torre(cena);
    default:
      return new Area1Portaria(cena);
  }
}
