/**
 * Testes dos textos reativos da Fase 1 (NPCs, Helio, rádio, mortes e terminal), sem Phaser.
 * Rodar com: npx tsx scripts/testarDialogosFase1.ts
 */
import {
  CONTEXTO_NEUTRO_FASE1,
  DIALOGO_RADIO_ABERTURA,
  ERROS_GERAIS_FASE1,
  TERMINAL_OCIOSO_FASE1,
  TEXTOS_TOTEM_1_ALCOOLEMIA,
  TEXTOS_TOTEM_2_BALANCA,
  TEXTOS_TOTEM_3_PORTAO,
  TEXTOS_TOTEM_4_SEQUENCIADOR,
  TEXTOS_TOTEM_5_HELIO,
  comentarioEntradaTotem,
  dialogoRadioVitoria,
  falasMagoNuvem,
  falasPombo,
  falasSucatinha,
  introHelio,
  piadaDeMorte,
  type ContextoDialogoFase1,
} from '../src/fases/fase1/DialogosFase1';
import { TOTEM_2_BALANCA, TOTEM_3_PORTAO } from '../src/fases/fase1/constantesFase1';
import type { LinhaDialogo } from '../src/compartilhado/tipos';

const ctx = (parcial: Partial<ContextoDialogoFase1>): ContextoDialogoFase1 => ({ ...CONTEXTO_NEUTRO_FASE1, ...parcial });
const texto = (falas: LinhaDialogo[]) => falas.map((f) => f.texto).join(' ');

// Regra do guia (10.2.5): frases curtas. Uma fala longa demais não cabe na caixa de diálogo.
const LIMITE_FALA = 260;

let falhas = 0;
let total = 0;
function checar(rotulo: string, passou: boolean, detalhe = ''): void {
  total++;
  if (!passou) falhas++;
  console.log(`${passou ? 'ok    ' : 'FALHOU'}  ${rotulo}${!passou && detalhe ? ` — ${detalhe}` : ''}`);
}

// ---- NPCs reagem ----
checar('Sucatinha ensina planar com [ESPAÇO] na primeira conversa', texto(falasSucatinha(ctx({}), 0)).includes('[ESPAÇO]'));
checar('Sucatinha cita as quedas de quem já caiu', texto(falasSucatinha(ctx({ mortes: 2 }), 0)).includes('2 vezes'));
checar('Sucatinha diz "1 vez" no singular', texto(falasSucatinha(ctx({ mortes: 1 }), 0)).includes('1 vez '));
checar('Segunda conversa com o Sucatinha é curta', falasSucatinha(ctx({}), 1).length === 1);
checar('Falas curtas variam entre visitas', texto(falasSucatinha(ctx({}), 1)) !== texto(falasSucatinha(ctx({}), 2)));

const magoIgnorou = texto(falasMagoNuvem(ctx({ conversouCom: () => false }), 0));
checar('Mago cobra quem ignorou o Sucatinha', magoIgnorou.includes('Sucatinha'));
checar('Mago não cobra quem conversou', !texto(falasMagoNuvem(ctx({}), 0)).includes('nem falou com o Sucatinha'));
checar('Mago dá a pista dos parênteses do portão', texto(falasMagoNuvem(ctx({}), 0)).toLowerCase().includes('parêntese'));
checar('Mago comenta muitos erros', texto(falasMagoNuvem(ctx({ erros: 7 }), 0)).includes('7 erros'));

const pombo = texto(falasPombo(ctx({}), 0));
checar('Pombo entrega o padrão do Helio', pombo.includes('Rajada rasteira') && pombo.includes('chuva de penas'));
checar('Pombo dá a pista "and not" do núcleo', pombo.includes('and not'));
checar('Pombo avisa que a porta fecha', pombo.includes('porta fecha'));
checar('Pombo cobra quem ignorou o Mago', texto(falasPombo(ctx({ conversouCom: () => false }), 0)).includes('Mago'));
checar('Carta do Helio cita as quedas', texto(falasPombo(ctx({ mortes: 4 }), 0)).includes('4 quedas'));

// ---- Helio e rádio ----
checar('Intro do Helio sem histórico tem 2 falas', introHelio(ctx({})).length === 2);
checar('Intro do Helio conta quedas e erros', texto(introHelio(ctx({ mortes: 3, erros: 1 }))).includes('3 quedas e 1 erro de terminal'));
checar('Vitória sem quedas nem erros desconfia da senha-mestra', texto(dialogoRadioVitoria(ctx({}))).includes('senha-mestra'));
checar('Vitória mostra o placar', texto(dialogoRadioVitoria(ctx({ mortes: 5, erros: 2 }))).includes('5 quedas e 2 erros'));

// ---- Quarta parede ----
checar('Piada na 3ª morte', piadaDeMorte(3) !== undefined);
checar('Sem piada na 4ª morte (humor não vira ruído)', piadaDeMorte(4) === undefined);
checar('Piada a cada 5 mortes depois da 12ª', piadaDeMorte(15) !== undefined && piadaDeMorte(16) === undefined);
checar('Totem 2 comenta muitas quedas', comentarioEntradaTotem(TOTEM_2_BALANCA.ID, ctx({ mortes: 3 })) !== undefined);
checar('Totem 2 fica quieto sem quedas', comentarioEntradaTotem(TOTEM_2_BALANCA.ID, ctx({})) === undefined);
checar('Portão comenta muitos erros', comentarioEntradaTotem(TOTEM_3_PORTAO.ID, ctx({ erros: 5 }))?.includes('5 erros') === true);

// ---- Regras gerais de escrita ----
const totens = [
  TEXTOS_TOTEM_1_ALCOOLEMIA,
  TEXTOS_TOTEM_2_BALANCA,
  TEXTOS_TOTEM_3_PORTAO,
  TEXTOS_TOTEM_4_SEQUENCIADOR,
  TEXTOS_TOTEM_5_HELIO,
];
checar('Cada totem tem ao menos 3 deboches de erro', totens.every((t) => t.MENSAGENS_ERRO.length >= 3));
checar('Cada erro geral tem ao menos 3 variações', Object.values(ERROS_GERAIS_FASE1).every((lista) => lista.length >= 3));

const todasAsFalas: LinhaDialogo[] = [
  ...DIALOGO_RADIO_ABERTURA,
  ...dialogoRadioVitoria(ctx({ mortes: 10, erros: 10 })),
  ...introHelio(ctx({ mortes: 10, erros: 10 })),
];
for (const c of [ctx({}), ctx({ mortes: 9, erros: 9, conversouCom: () => false })]) {
  for (let visita = 0; visita < 4; visita++) {
    todasAsFalas.push(...falasSucatinha(c, visita), ...falasMagoNuvem(c, visita), ...falasPombo(c, visita));
  }
}
const longas = todasAsFalas.filter((f) => f.texto.length > LIMITE_FALA);
checar(`Nenhuma fala passa de ${LIMITE_FALA} caracteres`, longas.length === 0, longas.map((f) => f.texto.slice(0, 50)).join(' | '));
checar('Falantes no formato "> NOME // PAPEL"', todasAsFalas.every((f) => /^> [^/]+ \/\/ .+/.test(f.falante)));
checar('Nenhuma menção ao nome antigo do boss', !JSON.stringify(todasAsFalas).toLowerCase().includes('azel'));
checar('Terminal ocioso tem falas variadas', new Set(TERMINAL_OCIOSO_FASE1).size >= 3);

console.log(`\n${total - falhas}/${total} verificações passaram.`);
process.exit(falhas > 0 ? 1 : 0);
