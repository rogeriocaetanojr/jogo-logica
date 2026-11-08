/**
 * Tabela de testes dos puzzles da Fase Final (sem Phaser). O código dos puzzles é pseudocódigo
 * em inglês, quase Python.
 * Uso: npx tsx scripts/testarPuzzlesFaseFinal.ts
 */
import type { IdPuzzleAndar } from '../src/fases/fase_final/andares/tiposAndar';
import { ESTADO_INICIAL_PUZZLE, avaliarPuzzle } from '../src/fases/fase_final/puzzles/avaliadoresPuzzle';
import type { EstadoPuzzle } from '../src/fases/fase_final/puzzles/tiposPuzzle';
import { interpretarComandoFaseFinal } from '../src/fases/fase_final/InterpretadorFaseFinal';

type Esperado = 'certo' | 'formato' | string; // string = código do erro

interface Caso {
  id: IdPuzzleAndar;
  entrada: string;
  esperado: Esperado;
  estado?: EstadoPuzzle;
}

const casos: Caso[] = [
  // Andar 1: sequência
  { id: 'sequencia', entrada: '3 2 1', esperado: 'certo' },
  { id: 'sequencia', entrada: '3,2,1', esperado: 'certo' },
  { id: 'sequencia', entrada: '321', esperado: 'certo' },
  { id: 'sequencia', entrada: '[3, 2, 1]', esperado: 'certo' },
  { id: 'sequencia', entrada: '3 -> 2 -> 1', esperado: 'certo' },
  { id: 'sequencia', entrada: 'dados = ler_cracha(); validar_cracha(dados); abrir_catraca()', esperado: 'certo' },
  { id: 'sequencia', entrada: 'DADOS = LER_CRACHA() VALIDAR_CRACHA(DADOS) ABRIR_CATRACA()', esperado: 'certo' },
  { id: 'sequencia', entrada: '1 2 3', esperado: 'usa_antes_de_criar' },
  { id: 'sequencia', entrada: '2 3 1', esperado: 'usa_antes_de_criar' },
  { id: 'sequencia', entrada: '3 1 2', esperado: 'abre_antes_de_validar' },
  { id: 'sequencia', entrada: '1 3 2', esperado: 'abre_antes_de_validar' },
  { id: 'sequencia', entrada: '3 3 1', esperado: 'formato' },
  { id: 'sequencia', entrada: '3 2', esperado: 'formato' },
  { id: 'sequencia', entrada: 'abrir a catraca', esperado: 'formato' },
  { id: 'sequencia', entrada: 'dados = ler_cracha(); abrir_porta()', esperado: 'formato' },

  // Andar 2: variáveis (próximo andar 3, 2 humanos)
  { id: 'variaveis', entrada: 'andar_destino = 3; passageiros = 2', esperado: 'certo' },
  { id: 'variaveis', entrada: 'Andar_Destino=3 passageiros=2', esperado: 'certo' },
  { id: 'variaveis', entrada: '3 2', esperado: 'certo' },
  { id: 'variaveis', entrada: 'chamar_elevador(3, 2)', esperado: 'certo' },
  { id: 'variaveis', entrada: 'passageiros = 2', esperado: 'certo', estado: { destino: 3, passageiros: 0 } },
  { id: 'variaveis', entrada: 'executar', esperado: 'certo', estado: { destino: 3, passageiros: 2 } },
  { id: 'variaveis', entrada: 'andar_destino = 3', esperado: 'passageiros' },
  { id: 'variaveis', entrada: 'andar_destino = 3; passageiros = 3', esperado: 'passageiros' },
  { id: 'variaveis', entrada: 'andar_destino = 0; passageiros = 2', esperado: 'destino' },
  { id: 'variaveis', entrada: 'andar_destino = 4; passageiros = 2', esperado: 'destino' },
  { id: 'variaveis', entrada: 'passageiros = 2', esperado: 'destino' },
  { id: 'variaveis', entrada: 'andar_destino = tres', esperado: 'formato' },
  { id: 'variaveis', entrada: 'destination_floor = 3', esperado: 'formato' },
  { id: 'variaveis', entrada: 'subir', esperado: 'formato' },

  // Andar 3: condicionais
  { id: 'condicionais', entrada: 'True', esperado: 'certo' },
  { id: 'condicionais', entrada: 'true', esperado: 'certo' },
  { id: 'condicionais', entrada: '== True', esperado: 'certo' },
  { id: 'condicionais', entrada: 'if visitante.gerado_por_ia == True:', esperado: 'certo' },
  { id: 'condicionais', entrada: 'if visitante.gerado_por_ia == True', esperado: 'certo' },
  { id: 'condicionais', entrada: 'if visitante.gerado_por_ia != False:', esperado: 'certo' },
  { id: 'condicionais', entrada: 'if visitante.gerado_por_ia:', esperado: 'certo' },
  { id: 'condicionais', entrada: 'verdadeiro', esperado: 'certo' },
  { id: 'condicionais', entrada: 'False', esperado: 'sem_mudanca' },
  { id: 'condicionais', entrada: 'false', esperado: 'sem_mudanca' },
  { id: 'condicionais', entrada: 'if visitante.gerado_por_ia == False:', esperado: 'sem_mudanca' },
  { id: 'condicionais', entrada: 'if visitante.gerado_por_ia != True:', esperado: 'sem_mudanca' },
  { id: 'condicionais', entrada: 'talvez', esperado: 'formato' },

  // Andar 4: laços
  { id: 'lacos', entrada: '5', esperado: 'certo' },
  { id: 'lacos', entrada: 'range(5)', esperado: 'certo' },
  { id: 'lacos', entrada: 'for i in range(5):', esperado: 'certo' },
  { id: 'lacos', entrada: 'FOR n IN RANGE( 5 ):', esperado: 'certo' },
  { id: 'lacos', entrada: 'for i in range(0, 5):', esperado: 'certo' },
  { id: 'lacos', entrada: '50', esperado: 'muitas' },
  { id: 'lacos', entrada: 'for i in range(6):', esperado: 'muitas' },
  { id: 'lacos', entrada: '4', esperado: 'poucas' },
  { id: 'lacos', entrada: 'range(1)', esperado: 'poucas' },
  { id: 'lacos', entrada: '0', esperado: 'zero' },
  { id: 'lacos', entrada: '-3', esperado: 'formato' },
  { id: 'lacos', entrada: '4.5', esperado: 'formato' },
  { id: 'lacos', entrada: 'cinco', esperado: 'formato' },

  // Andar 5: funções
  { id: 'funcoes', entrada: 'numero', esperado: 'certo' },
  { id: 'funcoes', entrada: 'comporta[numero]', esperado: 'certo' },
  { id: 'funcoes', entrada: 'destravar(comporta[numero])', esperado: 'certo' },
  { id: 'funcoes', entrada: 'Destravar( comporta[ Numero ] )', esperado: 'certo' },
  { id: 'funcoes', entrada: '1', esperado: 'fixo' },
  { id: 'funcoes', entrada: 'comporta[2]', esperado: 'fixo' },
  { id: 'funcoes', entrada: 'destravar(comporta[3])', esperado: 'fixo' },
  { id: 'funcoes', entrada: 'abrir_comporta(numero)', esperado: 'formato' },
  { id: 'funcoes', entrada: 'n', esperado: 'formato' },
];

const fatos = { numeroAndar: 2, humanos: 2 };
let falhas = 0;
for (const c of casos) {
  const r = avaliarPuzzle(c.id, c.entrada, c.estado ?? { ...ESTADO_INICIAL_PUZZLE }, fatos);
  const obtido = r.status === 'errado' ? r.erro : r.status;
  const passou = obtido === c.esperado;
  if (!passou) falhas++;
  console.log(`${passou ? 'OK    ' : 'FALHOU'} [${c.id}] ${JSON.stringify(c.entrada)} → ${obtido}${passou ? '' : ` (esperado ${c.esperado})`}`);
}

// Termo de ciência da portaria: em português (verdadeiro/falso); "true" é aceito com uma piada
const termo = { puzzle: 'termo', aceito: false, recusas: 0, invalidos: 0 };
const casosTermo: Array<[string, string]> = [
  ['verdadeiro', 'TERMO_ACEITO'],
  ['Verdadeiro', 'TERMO_ACEITO'],
  ['jogador.ciente_dos_riscos = verdadeiro', 'TERMO_ACEITO'],
  ['Jogador.Ciente_Dos_Riscos=VERDADEIRO', 'TERMO_ACEITO'],
  ['true', 'TERMO_ACEITO'],
  ['jogador.ciente_dos_riscos = True', 'TERMO_ACEITO'],
  ['falso', 'TERMO_RECUSADO'],
  ['jogador.ciente_dos_riscos = falso', 'TERMO_RECUSADO'],
  ['False', 'TERMO_RECUSADO'],
  ['talvez', 'TERMO_INVALIDO'],
  ['jogador.outra_coisa = verdadeiro', 'TERMO_INVALIDO'],
  ['player.aware_of_risks = True', 'TERMO_INVALIDO'],
];
for (const [entrada, acao] of casosTermo) {
  const r = interpretarComandoFaseFinal(entrada, termo);
  const passou = r.acao === acao;
  if (!passou) falhas++;
  console.log(`${passou ? 'OK    ' : 'FALHOU'} [termo] ${JSON.stringify(entrada)} → ${r.acao}`);
}

const total = casos.length + casosTermo.length;
console.log(`\n${total - falhas}/${total} passaram`);
process.exit(falhas ? 1 : 0);
