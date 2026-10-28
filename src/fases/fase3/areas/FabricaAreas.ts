import type { CenaFase3 } from '../CenaFase3';
import type { AreaLixao } from './AreaLixao';
import { Area1 } from './Area1';
import { Area2 } from './Area2';
import { Area3 } from './Area3';
import { Area4 } from './Area4';
import { Area5 } from './Area5';
import { Area6 } from './Area6';

/** Cria a área correspondente ao índice (0 a 5). */
export function criarArea(cena: CenaFase3, indice: number): AreaLixao {
  switch (indice) {
    case 1:
      return new Area2(cena);
    case 2:
      return new Area3(cena);
    case 3:
      return new Area4(cena);
    case 4:
      return new Area5(cena);
    case 5:
      return new Area6(cena);
    default:
      return new Area1(cena);
  }
}
