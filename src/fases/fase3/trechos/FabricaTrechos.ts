import type { CenaFase3 } from '../CenaFase3';
import type { TrechoLixao } from './TrechoLixao';
import { Trecho1Sol } from './Trecho1Sol';
import { Trecho2Nevoa } from './Trecho2Nevoa';
import { Trecho3Chuva } from './Trecho3Chuva';
import { Trecho4Noite } from './Trecho4Noite';

/** Cria os 4 trechos do mapa contínuo, um depois do outro, cada um começando onde o anterior acaba. */
export function criarTrechos(cena: CenaFase3): TrechoLixao[] {
  const trechos = [Trecho1Sol, Trecho2Nevoa, Trecho3Chuva, Trecho4Noite].map((Trecho) => new Trecho(cena));
  let x = 0;
  for (const trecho of trechos) {
    trecho.offset = x;
    x += trecho.largura;
  }
  return trechos;
}
