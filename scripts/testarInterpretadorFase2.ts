/**
 * Testes dos desafios da Fase 2 (Porto Bugado), sem Phaser e sem navegador.
 * Rodar com: npx tsx scripts/testarInterpretadorFase2.ts
 */
import { interpretarComandoFase2, type DesafioPorto } from '../src/fases/fase2/InterpretadorFase2';
import { ModeloCarretas, ModeloFila, ModeloPilha, ModeloValvulas } from '../src/fases/fase2/porto/DesafiosPorto';
import { FICHAS } from '../src/fases/fase2/porto/FichaDesafio';

let total = 0;
let falhas = 0;

function checar(nome: string, cond: boolean, extra = ''): void {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? 'ok     ' : 'FALHOU '} ${nome}${cond ? '' : `  ${extra}`}`);
}

type Modelo = ModeloPilha | ModeloFila | ModeloValvulas | ModeloCarretas;

/** Roda uma lista de comandos no desafio e devolve o resultado do último. */
function rodar(desafio: DesafioPorto, modelo: Modelo, comandos: string[]) {
  let r = interpretarComandoFase2('status', { desafio, modelo });
  for (const c of comandos) r = interpretarComandoFase2(c, { desafio, modelo });
  return r;
}

// ---- Cada gabarito da ficha resolve o desafio, e é curto ----
const NOVOS: Array<[keyof typeof FICHAS, () => Modelo, (m: Modelo) => boolean]> = [
  ['pilha', () => new ModeloPilha(), (m) => (m as ModeloPilha).concluido],
  ['fila', () => new ModeloFila(), (m) => (m as ModeloFila).concluido],
  ['vetor', () => new ModeloValvulas(), (m) => (m as ModeloValvulas).concluido],
  ['ordenacao', () => new ModeloCarretas(), (m) => (m as ModeloCarretas).ordenado],
];
for (const [id, criar, resolvido] of NOVOS) {
  const ficha = FICHAS[id];
  const passos = ficha.gabarito.filter((p) => !p.comando.startsWith('for '));
  const m = criar();
  const r = rodar(id, m, passos.map((p) => p.comando));
  checar(`${id}: o gabarito resolve`, resolvido(m) && r.sucesso, r.mensagem);
  checar(`${id}: no máximo 4 comandos (${passos.length})`, passos.length <= 4);
  checar(`${id}: texto de abertura curto (${ficha.comoResolver.length} passos)`, ficha.comoResolver.length <= 2);
}
{
  const m = new ModeloValvulas();
  const r = rodar('vetor', m, ['for i in [2, 5, 7]: valvula[i].abrir()']);
  checar('vetor: o laço resolve em uma linha', m.concluido && r.sucesso, r.mensagem);
}

// ---- Pilha ----
{
  const m = new ModeloPilha();
  const r = rodar('pilha', m, ['pilhaA.pop()', 'pilhaB.push(conteiner)', 'pilhaA.pop()', 'pilhaC.push(conteiner)', 'pilhaA.pop()']);
  checar('pilha: pop e push separados também resolvem', m.concluido && r.sucesso, r.mensagem);
}
{
  const m = new ModeloPilha();
  const r = rodar('pilha', m, ['pilhaB.push(pilhaA.pop()); pilhaC.push(pilhaA.pop()); pilhaA.pop()']);
  checar('pilha: tudo numa linha com ;', m.concluido && r.sucesso, r.mensagem);
}
{
  const m = new ModeloPilha();
  const r = rodar('pilha', m, ['pilhaB.push(pilhaA.pop())', 'pilhaB.push(pilhaA.pop())', 'pilhaA.pop()']);
  checar('pilha: dois na mesma pilha também serve', m.concluido && r.sucesso, r.mensagem);
}
{
  const r = rodar('pilha', new ModeloPilha(), ['pilhaA[0]']);
  checar('pilha: mexer no meio trava com dica do topo', !r.sucesso && r.acao === 'PILHA_TOPO' && r.mensagem.includes('SÓ O TOPO'), r.mensagem);
}
{
  const r = rodar('pilha', new ModeloPilha(), ['abracadabra']);
  checar('pilha: comando estranho dá um exemplo', !r.sucesso && r.mensagem.includes('Tente: pilhaB.push(pilhaA.pop())'), r.mensagem);
}
{
  const m = new ModeloPilha();
  const r = rodar('pilha', m, ['pilhaC.pop()']);
  checar('pilha: pilha vazia avisa', !r.sucesso && r.mensagem.includes('vazia'), r.mensagem);
}

// ---- Fila ----
{
  const m = new ModeloFila();
  const r = rodar('fila', m, ['fila.dequeue()']);
  checar('fila: depois da 1ª atracação aparece o vírus', m.intruso !== null && r.mensagem.includes('ALERTA'), r.mensagem);
}
{
  const m = new ModeloFila();
  rodar('fila', m, ['fila.dequeue()', 'fila.dequeue()']);
  checar('fila: dequeue com vírus esperando deixa o vírus furar', m.eventos.some((e) => e.tipo === 'furou'));
}
{
  const m = new ModeloFila();
  const r = rodar('fila', m, ['fila.dequeue()', 'fila.enqueue(navio)', 'fila.dequeue()', 'fila.dequeue()']);
  checar('fila: 4 comandos resolvem', m.concluido && r.sucesso, r.mensagem);
}
{
  const r = rodar('fila', new ModeloFila(), ['fila.pop()']);
  checar('fila: pop explica quem sai', !r.sucesso && r.mensagem.includes('FRENTE'), r.mensagem);
}
{
  const m = new ModeloFila();
  const r = rodar('fila', m, ['fila.enqueue(navio)']);
  checar('fila: enqueue sem vírus avisa', !r.sucesso, r.mensagem);
}

// ---- Vetor ----
{
  const m = new ModeloValvulas();
  const r = rodar('vetor', m, ['valvula[8].abrir()']);
  checar('vetor: índice fora do limite dá o glitch', !r.sucesso && r.acao === 'VETOR_FORA', r.mensagem);
}
{
  const m = new ModeloValvulas();
  rodar('vetor', m, ['valvula[3].abrir()']);
  checar('vetor: válvula de prateleira sem fogo não ajuda', !m.concluido);
}
{
  const r = rodar('vetor', new ModeloValvulas(), ['valvula(2).abrir()']);
  checar('vetor: parênteses no lugar de colchetes explica', !r.sucesso && r.mensagem.includes('COLCHETES'), r.mensagem);
}

// ---- Ordenação ----
{
  const m = new ModeloCarretas();
  const r = rodar('ordenacao', m, ['se pressao[0] > pressao[1]: trocar(0, 1)', 'se pressao[1] > pressao[2]: trocar(1, 2)']);
  checar('ordenação: com condição também resolve', m.ordenado && r.sucesso, r.mensagem);
}
{
  const m = new ModeloCarretas();
  rodar('ordenacao', m, ['trocar(1, 2)']);
  const ev = m.eventos[m.eventos.length - 1];
  checar('ordenação: trocar quando a esquerda é menor piora', ev?.piorou === true);
}
{
  const r = rodar('ordenacao', new ModeloCarretas(), ['trocar(0, 2)']);
  checar('ordenação: só vizinhas', !r.sucesso && r.mensagem.includes('VIZINHAS'), r.mensagem);
}
{
  const r = rodar('ordenacao', new ModeloCarretas(), ['organizar()']);
  checar('ordenação: comando estranho dá um exemplo', !r.sucesso && r.mensagem.includes('Tente: trocar(0, 1)'), r.mensagem);
}

// ---- Terminal ----
{
  const r = interpretarComandoFase2('solucao', { desafio: 'pilha', modelo: new ModeloPilha() });
  checar('solucao mostra o gabarito curto', r.sucesso && String(r.valor).includes('pilhaA.pop()'), String(r.valor));
}
{
  const r = interpretarComandoFase2('ajuda', { desafio: 'fila', modelo: new ModeloFila() });
  checar('ajuda da fila cabe em poucas linhas', r.sucesso && String(r.valor).split('\n').length <= 18, String(r.valor).split('\n').length + ' linhas');
}

console.log(`\n${total - falhas}/${total} casos passaram.`);
process.exit(falhas > 0 ? 1 : 0);
