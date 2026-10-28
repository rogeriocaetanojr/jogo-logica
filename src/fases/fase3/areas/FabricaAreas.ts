import type { CenaFase3 } from '../CenaFase3';
import type { AreaLixao } from './AreaLixao';
import { Area1 } from './Area1';
import { Area2 } from './Area2';
import { Area3 } from './Area3';
import { Area4 } from './Area4';
import { Area5 } from './Area5';
import { Area6 } from './Area6';

/** Cria os 6 trechos do mapa contínuo, um depois do outro, cada um começando onde o anterior acaba. */
export function criarTrechos(cena: CenaFase3): AreaLixao[] {
  const trechos = [Area1, Area2, Area3, Area4, Area5, Area6].map((Trecho) => new Trecho(cena));
  let x = 0;
  for (const trecho of trechos) {
    trecho.offset = x;
    x += trecho.largura;
  }
  return trechos;
}
