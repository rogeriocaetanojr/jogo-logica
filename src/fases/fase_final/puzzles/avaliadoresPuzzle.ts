import type { IdPuzzleAndar } from '../andares/tiposAndar';
import { normalizar } from '../utilTexto';
import type { EstadoPuzzle, FatosAndar, ResultadoPuzzle } from './tiposPuzzle';

/**
 * Avaliação dos 5 puzzles: funções puras (sem Phaser), testadas em scripts/testarPuzzlesFaseFinal.ts.
 * O código dos puzzles é pseudocódigo em inglês, quase Python. A avaliação é tolerante: ignora
 * maiúsculas, acentos e espaços; aceita a linha corrigida inteira ou só o trecho que muda.
 */

export const ESTADO_INICIAL_PUZZLE: EstadoPuzzle = { destino: 0, passageiros: 0 };

export function avaliarPuzzle(
  id: IdPuzzleAndar,
  entrada: string,
  estado: EstadoPuzzle,
  fatos: FatosAndar
): ResultadoPuzzle {
  const texto = normalizar(entrada);
  switch (id) {
    case 'sequencia':
      return avaliarSequencia(texto);
    case 'variaveis':
      return avaliarVariaveis(texto, estado, fatos);
    case 'condicionais':
      return avaliarCondicionais(texto);
    case 'lacos':
      return avaliarLacos(texto);
    case 'funcoes':
      return avaliarFuncoes(texto);
  }
}

/* =========================================================================
 * ANDAR 1 — SEQUÊNCIA
 * ========================================================================= */

const LINHAS_SEQUENCIA: Record<string, number> = {
  'abrir_catraca()': 1,
  'validar_cracha(dados)': 2,
  'dados=ler_cracha()': 3,
};

function avaliarSequencia(texto: string): ResultadoPuzzle {
  let ordem: number[];
  const semEspaco = texto.replace(/ /g, '');

  if (/^[[(]?[1-3]([,;>-]*[1-3]){2}[\])]?$/.test(semEspaco)) {
    ordem = (semEspaco.match(/[1-3]/g) ?? []).map(Number);
  } else if (semEspaco.includes(')')) {
    // Linhas escritas por extenso, separadas por ; ou só uma depois da outra
    const partes = semEspaco.split(/;|(?<=\))/).filter(Boolean);
    const desconhecida = partes.find((p) => !(p in LINHAS_SEQUENCIA));
    if (desconhecida) {
      return { status: 'formato', mensagem: `[?] Não reconheci a linha "${desconhecida}". Copie as linhas como estão no código.` };
    }
    ordem = partes.map((p) => LINHAS_SEQUENCIA[p]);
  } else {
    return { status: 'formato', mensagem: '[?] Digite a ordem das linhas pelos números, tipo 2 1 3.' };
  }

  if (ordem.length !== 3 || new Set(ordem).size !== 3) {
    return { status: 'formato', mensagem: '[?] Use as três linhas, cada uma uma vez só.' };
  }
  const pos = (linha: number) => ordem.indexOf(linha);
  if (pos(3) === 0 && pos(2) === 1 && pos(1) === 2) return { status: 'certo' };
  if (pos(2) < pos(3)) return { status: 'errado', erro: 'usa_antes_de_criar', dados: { ordem } };
  return { status: 'errado', erro: 'abre_antes_de_validar', dados: { ordem } };
}

/* =========================================================================
 * ANDAR 2 — VARIÁVEIS
 * ========================================================================= */

function avaliarVariaveis(texto: string, estado: EstadoPuzzle, fatos: FatosAndar): ResultadoPuzzle {
  const novo: EstadoPuzzle = { ...estado };
  const semEspaco = texto.replace(/ /g, '');
  let entendeu = false;

  // chamar_elevador(3, 2) com os valores direto
  const chamada = semEspaco.match(/^chamar_elevador\((-?\d+),(-?\d+)\)$/);
  // "3 2" ou "3,2"
  const dupla = texto.match(/^(-?\d+)[ ,;](-?\d+)$/);

  if (chamada || dupla) {
    const m = (chamada ?? dupla)!;
    novo.destino = Number(m[1]);
    novo.passageiros = Number(m[2]);
    entendeu = true;
  } else {
    for (const m of texto.matchAll(/(andar_destino|passageiros)=([^;, ]*)/g)) {
      const valor = m[2];
      if (!/^-?\d+$/.test(valor)) {
        return {
          status: 'formato',
          mensagem: `[?] ${m[1]} recebe um número inteiro. "${valor || 'nada'}" não dá para contar.`,
        };
      }
      if (m[1] === 'andar_destino') novo.destino = Number(valor);
      else novo.passageiros = Number(valor);
      entendeu = true;
    }
    if (!entendeu && /^(chamar_elevador\(andar_destino,passageiros\)|executar|rodar)$/.test(semEspaco)) {
      entendeu = true; // chama com os valores atuais
    }
  }

  if (!entendeu) {
    return { status: 'formato', mensagem: '[?] Atribua um valor a uma variável. Ex.: passageiros = 9' };
  }

  const proximo = fatos.numeroAndar + 1;
  if (novo.destino === proximo && novo.passageiros === fatos.humanos) return { status: 'certo', estado: novo };
  const dados = { destino: novo.destino, passageiros: novo.passageiros, humanos: fatos.humanos };
  return { status: 'errado', erro: novo.destino !== proximo ? 'destino' : 'passageiros', dados, estado: novo };
}

/* =========================================================================
 * ANDAR 3 — CONDICIONAIS
 * ========================================================================= */

// Aceita também as palavras em português, por gentileza (o código é que está em inglês)
const VERDADEIROS = ['true', 'verdadeiro', 'sim'];
const FALSOS = ['false', 'falso', 'nao'];

function avaliarCondicionais(texto: string): ResultadoPuzzle {
  const t = texto.replace(/ /g, '').replace(/:$/, '');
  const valor = t.replace(/^if/, '').replace(/^visitante\.gerado_por_ia/, '');

  // Só o valor, "== valor", a linha inteira ou a forma equivalente com !=
  const igual = valor.match(/^(?:==)?(\w+)$/);
  const diferente = valor.match(/^!=(\w+)$/);
  if (valor === '' && t.startsWith('ifvisitante.gerado_por_ia')) {
    return { status: 'certo', observacao: 'sem comparação: o próprio valor já é True ou False' };
  }
  if (igual && VERDADEIROS.includes(igual[1])) return { status: 'certo' };
  if (diferente && FALSOS.includes(diferente[1])) return { status: 'certo', observacao: '!= False também vale' };
  if ((igual && FALSOS.includes(igual[1])) || (diferente && VERDADEIROS.includes(diferente[1]))) {
    return { status: 'errado', erro: 'sem_mudanca', dados: {} };
  }
  return { status: 'formato', mensagem: '[?] O sensor só entende True ou False.' };
}

/* =========================================================================
 * ANDAR 4 — LAÇOS
 * ========================================================================= */

export const PLACAS_NECESSARIAS = 5;

function avaliarLacos(texto: string): ResultadoPuzzle {
  const t = texto.replace(/ /g, '').replace(/:$/, '');
  // "5", "range(5)", "range(0,5)" ou "for i in range(5)"
  const m = t.match(/^(?:for\w+inrange\(|range\()?(?:0,)?(-?\d+(?:[.,]\d+)?)\)?$/);
  if (!m) return { status: 'formato', mensagem: '[?] Digite quantas voltas o laço dá. Só o número já serve.' };
  const n = Number(m[1].replace(',', '.'));
  if (!Number.isInteger(n)) return { status: 'formato', mensagem: '[?] Laço não dá meia volta. Use um número inteiro.' };
  if (n < 0) return { status: 'formato', mensagem: '[?] Dar um número negativo de voltas é desfazer. Isso é outra matéria.' };
  if (n === PLACAS_NECESSARIAS) return { status: 'certo' };
  if (n === 0) return { status: 'errado', erro: 'zero', dados: { placas: 0 } };
  return { status: 'errado', erro: n < PLACAS_NECESSARIAS ? 'poucas' : 'muitas', dados: { placas: n } };
}

/* =========================================================================
 * ANDAR 5 — FUNÇÕES
 * ========================================================================= */

function avaliarFuncoes(texto: string): ResultadoPuzzle {
  const t = texto.replace(/ /g, '');
  if (['numero', 'comporta[numero]', 'destravar(comporta[numero])'].includes(t)) return { status: 'certo' };
  const fixo = t.match(/^(?:destravar\()?(?:comporta\[)?([1-3])\]?\)?$/);
  if (fixo) return { status: 'errado', erro: 'fixo', dados: { comporta: Number(fixo[1]) } };
  if (t.includes('abrir_comporta')) {
    return { status: 'formato', mensagem: '[?] As chamadas lá embaixo estão certas. O problema está dentro da função.' };
  }
  return { status: 'formato', mensagem: '[?] Digite o que vai entre os colchetes de comporta[ ].' };
}
