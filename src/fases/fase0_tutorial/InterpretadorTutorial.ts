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
    generico: [
      "[ERRO DE SINTAXE] Mega Brain: 'Instrução sem sentido. Circuitos não ligam com fé, precisam do estado lógico afirmativo atribuído à variável!'",
      "[ERRO DE SINTAXE] Mega Brain: 'Você bateu a cabeça no teclado ou achou que isso era feitiço? Atribua o estado binário correto.'",
      "[ERRO DE SINTAXE] Mega Brain: 'O galpão continua nas trevas porque seu comando não expressa verdade lógica nenhuma.'",
      "[ERRO DE SINTAXE] Mega Brain: 'Desse jeito a bateria da sua lanterna acaba antes de você acertar uma atribuição lógica simples.'",
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
      "[ERRO DE ALCANCE INSUFICIENTE] Mega Brain: 'Sua esteira continuou curta e despencou no vácuo. Vai continuar chutando número no escuro?'",
      "[ERRO DE CÁLCULO] Mega Brain: 'Faltou braço pro pistão alcançar a margem. Olhe as leituras antes de digitar qualquer bobagem.'",
      "[ERRO DE VÃO] Mega Brain: 'A física não negocia com preguiça mental. O vão continua maior do que o valor ridículo que você definiu.'",
      "[ERRO DE EXTENSÃO] Mega Brain: 'Se você tentar andar nessa esteira desse tamanho, o exaustor de ar lá embaixo vai cansar de te catar.'",
    ],
    acima: [
      "[ERRO DE SOBRECARGA] Mega Brain: 'Passou do ponto! Esse tamanho vai bater contra a parede do mezanino e quebrar os pistões. O vão mede exatamente 8 metros!'",
      "[ERRO DE CALIBRAÇÃO] Mega Brain: 'Engenharia de precisão não tolera desperdício. O abismo mede 8 metros cravados, reduza essa medida.'",
      "[LIMITE FÍSICO ATINGIDO] Mega Brain: 'A esteira encavalou na estrutura do outro lado por excesso de comprimento. Ajuste para a medida exata do sensor.'",
    ],
    numeroSolto: [
      "[VALOR SOLTO] Mega Brain: 'Jogar um número solto no console não atribui nada a lugar nenhum. Cadê a variável da esteira e o operador de atribuição?'",
      "[ERRO DE SINTAXE] Mega Brain: 'Você acha que a máquina adivinha onde enfiar esse número? Atribua o valor à variável: nome = valor!'",
      "[PREGUIÇA DETECTADA] Mega Brain: 'Digitar só o número é preguiça demais. Isso é Python, não calculadora de padaria. Use a variável do painel.'",
    ],
    erroTipo: [
      "[ERRO DE TIPO] Mega Brain: 'Você mandou um texto com aspas pro motor hidráulico. Engrenagens operam com números inteiros, não com redação.'",
      "[ERRO DE TIPO] Mega Brain: 'Aspas numa variável de comprimento físico? Nem a inteligência artificial mais queimada faria isso.'",
      "[ERRO DE TIPO] Mega Brain: 'Pistões industriais não analisam prosa. Tire essas aspas e envie uma grandeza numérica.'",
    ],
  },
  desafio3: {
    ordemInvertida: [
      "[SEQUÊNCIA INVERTIDA] Mega Brain: ''FailMega'? Strings não são conta de adição comutativa onde a ordem não importa. Respeite a sequência dos fragmentos!'",
      "[ERRO DE ORDEM] Mega Brain: 'Você montou a chave de trás pra frente. Tente juntar na ordem cronológica que os registradores exibem.'",
      "[CHAVE REJEITADA] Mega Brain: 'Chave invertida rejeitada pelo elevador. O primeiro fragmento vem antes do segundo, gênio.'",
      "[ORDEM DE SINTAXE] Mega Brain: 'Quem lê da direita para a esquerda é outro tipo de compilador. Coloque parte1 antes de parte2.'",
    ],
    sintaxeOuTipo: [
      "[NOME NÃO ENCONTRADO] Mega Brain: 'Identificadores não encontrados. Ou você utiliza os nomes exatos das variáveis fragmentadas, ou concatena os textos literais entre aspas.'",
      "[ERRO DE TIPO] Mega Brain: 'Misturar texto com aritmética sem sentido quebrou o interpretador. Concatene os dois fragmentos usando o operador adequado!'",
      "[ACESSO NEGADO] Mega Brain: 'Acesso negado. O barramento exige a soma textual das duas metades fornecidas na tela.'",
      "[ELEVADOR TRAVADO] Mega Brain: 'O guincho continua travado no teto. Junte as duas metades da chave em uma variável só.'",
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
              : contexto?.totem === 'elevator' || contexto?.totem === 'elevador'
                ? '  senha = texto1 + texto2 - Concatena variáveis de texto (string)'
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
      mensagem: obterErroNaoRepetido('d0_obsoleto', ERROS_MEGA_BRAIN.desafio0.obsoleto),
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
      mensagem: obterErroNaoRepetido('d0_sintaxe', ERROS_MEGA_BRAIN.desafio0.sintaxe),
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
      mensagem:
        "[SINTAXE INCOMPLETA] Mega Brain: 'Um valor solto no terminal não altera registradores. Declare a variável completa: energia = True'",
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

  // 3. Digitou energia = true (com minúscula ou sem a inicial maiúscula estrita de Python)
  if (
    /^energia\s*=\s*true$/i.test(semPontoEVirgula) &&
    !/^energia\s*=\s*True$/.test(semPontoEVirgula)
  ) {
    return {
      sucesso: false,
      mensagem:
        "[NAME ERROR] Mega Brain: 'Em Python, booleanos começam com inicial maiúscula. Use True.'",
    };
  }

  // 4. Sucesso: sintaxe de atribuição em Python completa energia = True (aceita variações de espaçamento)
  if (/^energia\s*=\s*True$/.test(semPontoEVirgula)) {
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
      mensagem: obterErroNaoRepetido('d1_tipo', ERROS_MEGA_BRAIN.desafio1.tipoIncompativel),
    };
  }

  // Se estiver interagindo com o painel de energia ou tentou atribuir à variável energia
  if (isTotemEnergia || atribuicaoCompacta.startsWith('energia=')) {
    return {
      sucesso: false,
      mensagem: obterErroNaoRepetido('d1_invalido', ERROS_MEGA_BRAIN.desafio1.generico),
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
        mensagem: obterErroNaoRepetido('d2_numero_solto', ERROS_MEGA_BRAIN.desafio2.numeroSolto),
      };
    }

    // 2. Strings com aspas (ex: "8", 'oito', tamanho_ponte = "8")
    const casamentoTextoAspas = atribuicaoCompacta.match(
      /^(?:(?:tamanho_ponte|ponte|tamanho_esteira|esteira)=)?['"][^'"]*['"]$/
    );

    if (casamentoTextoAspas) {
      return {
        sucesso: false,
        mensagem: obterErroNaoRepetido('d2_erro_tipo', ERROS_MEGA_BRAIN.desafio2.erroTipo),
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
          mensagem: obterErroNaoRepetido('d2_abaixo', ERROS_MEGA_BRAIN.desafio2.abaixo),
        };
      } else {
        return {
          sucesso: false,
          mensagem: obterErroNaoRepetido('d2_acima', ERROS_MEGA_BRAIN.desafio2.acima),
        };
      }
    }

    return {
      sucesso: false,
      mensagem:
        "[ERRO DE SINTAXE] Mega Brain: 'Instrução sem pé nem cabeça. Declare a variável com um valor inteiro válido: tamanho_ponte = X.'",
    };
  }

  // ==========================================
  // DESAFIO 3: CONSOLE DO ELEVADOR (CONCATENAÇÃO DE STRINGS)
  // ==========================================
  const isTotemElevador = contexto?.totem === 'elevator' || contexto?.totem === 'elevador';
  const isAlvoElevador =
    isTotemElevador ||
    atribuicaoCompacta.startsWith('senha=') ||
    atribuicaoCompacta.startsWith('chave_elevador=') ||
    atribuicaoCompacta.startsWith('chave=');

  if (isAlvoElevador) {
    const expressao = atribuicaoCompacta
      .replace(/^(?:senha|chave_elevador|chave)=/, '')
      .replace(/\s+/g, '');

    // 1. Sucesso: concatenação correta de variáveis ou strings literais
    const isConcatenaSucesso =
      expressao === 'parte1+parte2' ||
      expressao === '"mega"+"fail"' ||
      expressao === "'mega'+'fail'" ||
      expressao === '"mega"+\'fail\'' ||
      expressao === "'mega'+\"fail\"" ||
      expressao === '"megafail"' ||
      expressao === "'megafail'";

    if (isConcatenaSucesso) {
      return {
        sucesso: true,
        mensagem:
          "[ACESSO CONCEDIDO] Hash validado: 'MegaFail'. Destravando guincho hidráulico...",
        acao: 'LOWER_ELEVATOR',
      };
    }

    // 2. Erro de Sequência Invertida: partes concatenadas na ordem oposta ("FailMega")
    const isOrdemInvertida =
      expressao === 'parte2+parte1' ||
      expressao === '"fail"+"mega"' ||
      expressao === "'fail'+'mega'" ||
      expressao === '"fail"+\'mega\'' ||
      expressao === "'fail'+\"mega\"" ||
      expressao === '"failmega"' ||
      expressao === "'failmega'";

    if (isOrdemInvertida) {
      return {
        sucesso: false,
        mensagem: obterErroNaoRepetido('d3_invertida', ERROS_MEGA_BRAIN.desafio3.ordemInvertida),
      };
    }

    return {
      sucesso: false,
      mensagem: obterErroNaoRepetido('d3_sintaxe', ERROS_MEGA_BRAIN.desafio3.sintaxeOuTipo),
    };
  }

  // Retorno padrão de erro para instruções não reconhecidas
  return {
    sucesso: false,
    mensagem:
      "[ERRO DE SINTAXE] Mega Brain: 'Instrução não reconhecida. Verifique a sintaxe ou consulte os comandos com \\'ajuda\\'.'",
  };
}
