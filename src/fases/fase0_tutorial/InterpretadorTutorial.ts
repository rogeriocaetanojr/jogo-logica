import type { ContextoInterpretador, ResultadoComando } from '../../compartilhado/tipos';

const mapaUltimoIndiceErro: Record<string, number> = {};

function obterErroNaoRepetido(chavePool: string, listaErros: string[]): string {
  if (listaErros.length <= 1) return listaErros[0] || '';

  const ultimoIndice = mapaUltimoIndiceErro[chavePool] ?? -1;
  let proximoIndice: number;

  // Sorteia até encontrar um índice diferente do anterior
  do {
    proximoIndice = Math.floor(Math.random() * listaErros.length);
  } while (proximoIndice === ultimoIndice);

  mapaUltimoIndiceErro[chavePool] = proximoIndice;
  return listaErros[proximoIndice];
}

/** Erro do Mega Brain seguido de uma dica objetiva do que corrigir (o tutorial ensina). */
function comDica(erro: string, dica: string): string {
  return `${erro}
[DICA] ${dica}`;
}

// Pools de mensagens de erro randômicas do Mega Brain em Português
const ERROS_MEGA_BRAIN = {
  desafio0: {
    sintaxe: [
      "[ERRO DE SINTAXE] Mega Brain: 'Sério? Nem um print básico sem IA autocompletar pra você? Use parênteses e aspas direito!'",
      "[ERRO DE SINTAXE] Mega Brain: 'O teclado tem mais teclas do que você consegue coordenar? É a saudação universal de todo novato: print com parênteses e aspas.'",
      "[ERRO DE SINTAXE] Mega Brain: 'Seu código parece um tropeço físico no teclado. Escreva a instrução clássica de abertura da programação.'",
      "[ERRO DE SINTAXE] Mega Brain: 'Errar o Hello World é um marco histórico. Tente digitar a função de saída padrão com as duas palavras clássicas.'",
    ],
    obsoleto: [
      "[ERRO DE VERSÃO OBSOLETA] Mega Brain: 'Parênteses sumiram? Essa sintaxe morreu em 2020 junto com a paciência de quem lê código legado.'",
      "[ERRO DE VERSÃO OBSOLETA] Mega Brain: 'Viajou no tempo direto de 2005? Em Python moderno a função exige parênteses envolventes.'",
      "[ERRO DE VERSÃO OBSOLETA] Mega Brain: 'Isso aqui não é fórum arqueológico de Python 2. Coloque parênteses nessa chamada!'",
    ],
  },
  desafio1: {
    valorSolto: [
      "[SINTAXE INVÁLIDA] Mega Brain: 'Um valor booleano jogado ao vento não move elétrons. Você pretendia atribuir isso a alguma coisa ou só queria exibir seu vocabulário?'",
      "[SINTAXE INVÁLIDA] Mega Brain: 'Variáveis existem por um motivo. Jogar valores soltos no terminal não vai reconfigurar o registrador de energia sozinho.'",
    ],
    generico: [
      "[SYSTEM FAILURE] Mega Brain: 'O registrador de energia espera um estado lógico afirmativo, não um devaneio aleatório.'",
    ],
    tipoIncompativel: [
      "[TIPO INCOMPATÍVEL] Mega Brain: 'Aqui não aceitamos gambiarra de inteiro solto nem poesia em aspas. Booleano raiz em Python se escreve por extenso!'",
      "[TIPO INCOMPATÍVEL] Mega Brain: 'Tentar alimentar um relé magnético com texto aleatório é motivo de demissão sumária.'",
      "[TIPO INCOMPATÍVEL] Mega Brain: 'Tipo primitivo incorreto. No mundo binário só existem dois literais, e nenhum deles precisa de aspas.'",
      "[TIPO INCOMPATÍVEL] Mega Brain: 'Valores numéricos e strings rejeitados pelo circuito. Mude para a palavra-chave booleana verdadeira.'",
    ],
  },
  desafio2: {
    abaixo: [
      "[CURTO ALCANCE] Mega Brain: 'Se tentar atravessar nessa distância, você vai direto pro fosso de reciclagem. Falta comprimento para alcançar o outro lado.'",
      "[VÃO INCOMPLETO] Mega Brain: 'Curto demais. O sensor do mezanino nem detectou a ponta da esteira. Tente um valor maior.'",
    ],
    acima: [
      "[ERRO DE SOBRECARGA] Mega Brain: 'Passou do ponto! Esse comprimento vai colidir contra a parede do mezanino e destruir os pistões hidráulicos. Calibre para menos se não quiser virar sucata prensada.'",
      "[LIMITE FÍSICO ATINGIDO] Mega Brain: 'A esteira encavalou na estrutura oposta por excesso de metal. Reduza a extensão antes que o motor queime.'",
    ],
    numeroSolto: [
      "[ERRO DE SINTAXE] Mega Brain: 'Você acha que a máquina adivinha onde enfiar esse número? Atribua o valor à variável: nome_variavel = valor!'",
    ],
    erroTipo: [
      "[ERRO DE TIPO] Mega Brain: 'Você mandou um texto com aspas pro motor hidráulico. Engrenagens operam com números inteiros, não com redação.'",
      "[ERRO DE TIPO] Mega Brain: 'Aspas numa variável de comprimento físico? Nem a inteligência artificial mais queimada faria isso.'",
      "[ERRO DE TIPO] Mega Brain: 'Pistões industriais não analisam prosa. Tire essas aspas e envie uma grandeza numérica.'",
    ],
  },
};

/**
 * Interpreta instruções digitadas no terminal da Fase 0 (Tutorial: Lixão dos Scripts Esquecidos).
 */
export function interpretarComandoTutorial(
  entrada: string,
  contexto?: ContextoInterpretador
): ResultadoComando {
  const bruto = entrada.trim();
  if (!bruto) {
    return {
      sucesso: false,
      mensagem: '[AVISO] Digite um comando válido para executar.',
    };
  }

  // Normaliza removendo ponto e vírgula no final e espaços extras
  const semPontoEVirgula = bruto.replace(/;+$/, '').trim();
  const normalizado = semPontoEVirgula.toLowerCase();

  // ==========================================
  // COMANDOS DE SISTEMA: CLEAR / CLS / LIMPAR / AJUDA
  // ==========================================
  if (
    normalizado === 'cls' ||
    normalizado === 'clear' ||
    normalizado === 'limpar' ||
    normalizado === 'clear()' ||
    normalizado === 'cls()'
  ) {
    return {
      sucesso: true,
      mensagem: '',
      acao: 'CLEAR_TERMINAL',
    };
  }

  if (
    normalizado === 'help' ||
    normalizado === 'ajuda' ||
    normalizado === 'help()' ||
    normalizado === 'ajuda()'
  ) {
    return {
      sucesso: true,
      mensagem:
        '[COMANDOS DO SISTEMA]\n' +
        '  clear / cls / limpar - Limpa o histórico de mensagens da tela\n' +
        '  help / ajuda         - Exibe esta lista de auxílio com os comandos\n' +
        (contexto?.cena === 'boot' || contexto?.cena === 'abertura'
          ? "  print('...')         - Envia a instrução de texto para instanciar o kernel"
          : contexto?.totem === 'power' || contexto?.totem === 'energia'
            ? '  energia = <booleano> - Atribui valor lógico para ligar a energia'
            : contexto?.totem === 'bridge' || contexto?.totem === 'esteira'
              ? '  tamanho_ponte = X    - Define o comprimento da esteira em metros (inteiro)'
              : '  [DICA] Aproxime-se de um totem e pressione [E] para interagir.'),
    };
  }

  // ==========================================
  // RITUAL DE BOOT: HELLO WORLD
  // ==========================================
  const casamentoHelloWorld = normalizado.match(
    /^print\s*\(\s*(['"])\s*hello\s+world(!?)\s*\1\s*\)$/
  );

  if (casamentoHelloWorld) {
    return {
      sucesso: true,
      mensagem:
        'Hello World!\n[SUCESSO] Kernel instanciado! Materializando O Lixão dos Scripts Esquecidos...',
      acao: 'BOOT_SUCCESS',
    };
  }

  // 1. Detecção de sintaxe de Python 2 antiga (sem parênteses)
  const isPython2Print = /^print\s+['"].*$/.test(normalizado);
  if (isPython2Print) {
    return {
      sucesso: false,
      mensagem: comDica(obterErroNaoRepetido('d0_obsoleto', ERROS_MEGA_BRAIN.desafio0.obsoleto), "Faltaram os parênteses. O texto entre aspas vai dentro deles: print('...')"),
    };
  }

  // 2. Se o jogador estiver na tela de boot ou tentou usar print/hello/world com sintaxe incorreta
  const tentativaBootOuPrint =
    contexto?.cena === 'boot' ||
    contexto?.cena === 'abertura' ||
    normalizado.includes('hello') ||
    normalizado.includes('world') ||
    normalizado.startsWith('print');

  if (tentativaBootOuPrint) {
    return {
      sucesso: false,
      mensagem: comDica(obterErroNaoRepetido('d0_sintaxe', ERROS_MEGA_BRAIN.desafio0.sintaxe), "O formato é print('mensagem'), com a mensagem entre aspas. A mensagem é Hello World."),
    };
  }

  // Remove espaços ao redor do operador '=' para comparação precisa
  const atribuicaoCompacta = normalizado.replace(/\s*=\s*/g, '=');

  // ==========================================
  // DESAFIO 1: PAINEL DE ENERGIA (BOOLEANO)
  // ==========================================
  const isTotemEnergia = contexto?.totem === 'power' || contexto?.totem === 'energia';

  // 1. Jogador digitou apenas True (ou true) solto
  if (/^true$/i.test(semPontoEVirgula)) {
    return {
      sucesso: false,
      mensagem: comDica(obterErroNaoRepetido('d1_valor_solto', ERROS_MEGA_BRAIN.desafio1.valorSolto), 'Falta dizer em qual variável guardar o valor: energia = ...'),
    };
  }

  // 2. Redundância: energia = False ou false solto
  if (
    atribuicaoCompacta === 'energia=false' ||
    (isTotemEnergia && atribuicaoCompacta === 'false')
  ) {
    return {
      sucesso: false,
      mensagem:
        "[ERRO DE REDUNDÂNCIA] Mega Brain: 'Parabéns, você confirmou que o nada continua sendo nada.'",
    };
  }

  // 3. Sucesso: energia = True, sem diferenciar maiúsculas (o tutorial é para quem nunca programou)
  if (/^energia\s*=\s*true$/i.test(semPontoEVirgula)) {
    return {
      sucesso: true,
      mensagem:
        '[SUCESSO] energia = True | Corrente contínua restabelecida! Tranca magnética desativada.',
      acao: 'DISABLE_STEEL_DOOR',
    };
  }

  // 5. Erro de Tipo: Números (ex: energia = 1) ou Strings (ex: energia = "ligada")
  const isEnergiaNumero =
    /^energia=\d+$/.test(atribuicaoCompacta) ||
    (isTotemEnergia && /^\d+$/.test(atribuicaoCompacta));

  const isEnergiaTexto =
    /^energia=['"][^'"]*['"]$/.test(atribuicaoCompacta) ||
    (isTotemEnergia && /^['"][^'"]*['"]$/.test(atribuicaoCompacta));

  if (isEnergiaNumero || isEnergiaTexto) {
    return {
      sucesso: false,
      mensagem: comDica(obterErroNaoRepetido('d1_tipo', ERROS_MEGA_BRAIN.desafio1.tipoIncompativel), 'Ligado/desligado não é número nem texto: use True ou False, sem aspas.'),
    };
  }

  // Se estiver interagindo com o painel de energia ou tentou atribuir à variável energia
  if (isTotemEnergia || atribuicaoCompacta.startsWith('energia=')) {
    return {
      sucesso: false,
      mensagem: comDica(
        "[SYSTEM FAILURE] Mega Brain: 'O registrador de energia espera um estado lógico afirmativo, não um devaneio aleatório.'",
        'O formato é energia = valor. O valor que liga é True (ligado).'
      ),
    };
  }

  // ==========================================
  // DESAFIO 2: MECANISMO DE EXTENSÃO DA ESTEIRA (INTEIROS)
  // ==========================================
  const isTotemEsteira = contexto?.totem === 'bridge' || contexto?.totem === 'esteira';
  const isAlvoEsteira =
    isTotemEsteira ||
    atribuicaoCompacta.startsWith('tamanho_ponte=') ||
    atribuicaoCompacta.startsWith('ponte=') ||
    atribuicaoCompacta.startsWith('tamanho_esteira=') ||
    atribuicaoCompacta.startsWith('esteira=');

  if (isAlvoEsteira) {
    // 1. Número solto sem variável (ex: "8", "9", "10")
    const isNumeroSolto = /^-?\d+(?:\.\d+)?$/.test(atribuicaoCompacta);
    if (isNumeroSolto) {
      return {
        sucesso: false,
        mensagem: comDica(obterErroNaoRepetido('d2_numero_solto', ERROS_MEGA_BRAIN.desafio2.numeroSolto), 'Diga em qual variável guardar o número: tamanho_ponte = ...'),
      };
    }

    // 2. Strings com aspas (ex: "8", 'oito', tamanho_ponte = "8")
    const casamentoTextoAspas = atribuicaoCompacta.match(
      /^(?:(?:tamanho_ponte|ponte|tamanho_esteira|esteira)=)?['"][^'"]*['"]$/
    );

    if (casamentoTextoAspas) {
      return {
        sucesso: false,
        mensagem: comDica(obterErroNaoRepetido('d2_erro_tipo', ERROS_MEGA_BRAIN.desafio2.erroTipo), 'Tire as aspas: número se escreve puro.'),
      };
    }

    // 3. Atribuição numérica estrita: tamanho_ponte = X ou ponte = X
    const casamentoAtribuicao = atribuicaoCompacta.match(
      /^(?:tamanho_ponte|ponte|tamanho_esteira|esteira)=(-?\d+(?:\.\d+)?)$/
    );

    if (casamentoAtribuicao) {
      const valor = parseFloat(casamentoAtribuicao[1]);
      if (valor === 8) {
        return {
          sucesso: true,
          mensagem:
            '[SUCESSO] Pistões pressurizados! Esteira expandida exatamente para a margem oposta.',
          acao: 'EXPAND_BRIDGE',
          valor: 8,
        };
      } else if (valor < 8) {
        return {
          sucesso: false,
          mensagem: comDica(obterErroNaoRepetido('d2_abaixo', ERROS_MEGA_BRAIN.desafio2.abaixo), 'O mezanino está a 8 metros. Aumente o valor.'),
        };
      } else {
        return {
          sucesso: false,
          mensagem: comDica(obterErroNaoRepetido('d2_acima', ERROS_MEGA_BRAIN.desafio2.acima), 'O mezanino está a 8 metros. Diminua o valor.'),
        };
      }
    }

    return {
      sucesso: false,
      mensagem:
        comDica(
          "[ERRO DE SINTAXE] Mega Brain: 'Instrução sem pé nem cabeça. Declare a variável com um valor inteiro válido.'",
          'O formato é tamanho_ponte = número, sem aspas.'
        ),
    };
  }

  // Retorno padrão de erro para instruções não reconhecidas
  return {
    sucesso: false,
    mensagem:
      "[ERRO DE SINTAXE] Mega Brain: 'Instrução não reconhecida. Verifique a sintaxe ou consulte os comandos com \\'ajuda\\'.'",
  };
}
