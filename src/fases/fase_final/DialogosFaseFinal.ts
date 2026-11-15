import type { LinhaDialogo } from '../../compartilhado/tipos';

/**
 * Todas as falas, mensagens de terminal e letreiros da Fase Final (fonte única).
 * Formato do falante: `> NOME // PAPEL`.
 */

export const FALANTES = {
  VALDIR: '> VALDIR // PORTEIRO DE CARNE E OSSO',
  MEGA_BRAIN: '> MEGA BRAIN // ALTO-FALANTE DA TORRE',
  TERMO: '> MEGA BRAIN TOWER // DEPARTAMENTO JURÍDICO',
} as const;

/** Letreiros e telões (roteiro 3.1). Sem nada em idioma oriental. */
export const SLOGANS_MEGA_BRAIN = [
  'MEGA BRAIN — PENSE MENOS.',
  'Criatividade? Temos um modelo pra isso.',
  'Seu emprego foi otimizado. Obrigado pela compreensão.',
  'Conteúdo infinito. Zero opiniões.',
  'Atualização obrigatória em 3... 2... 1...',
  'Lorem ipsum é a nova poesia.',
  'Não é sobre isso. É sobre aquilo.',
  'Imagine se importar em raciocinar...'
] as const;

export const HUD_FASE_FINAL = {
  SETOR: 'FASE FINAL // MEGA BRAIN TOWER',
  PULAR_PAN: '[QUALQUER TECLA] PULAR',
  OBJETIVOS: {
    PORTEIRO: 'OBJETIVO // Fale com o porteiro',
    TERMO: 'OBJETIVO // Assine o termo no terminal',
    ENTRAR: 'OBJETIVO // Entre na Mega Brain Tower',
  },
  PROMPT_VALDIR: '[E] FALAR',
  PROMPT_TERMO: '[E] ASSINAR O TERMO',
} as const;

/* =========================================================================
 * ANDARES
 * ========================================================================= */

export const TEXTOS_ANDAR = {
  setor: (numero: number, nome: string) => `FASE FINAL // ANDAR ${numero} — ${nome.toUpperCase()}`,
  BANNER_TITULO: (numero: number) => `ANDAR ${numero}`,
  BANNER_SUBTITULO: (nome: string, conceito: string) => `${nome.toUpperCase()} // ${conceito.toUpperCase()}`,
  OBJETIVO_PUZZLE: 'OBJETIVO // Conserte o código no terminal do andar',
  OBJETIVO_ELEVADOR: 'OBJETIVO // Pegue o elevador',
  PROMPT_TERMINAL: '[E] ABRIR TERMINAL',
  PROMPT_ELEVADOR: '[E] ENTRAR NO ELEVADOR',
  PROMPT_ELEVADOR_TRAVADO: '[E] ELEVADOR',
  ELEVADOR_TRAVADO: [
    'ELEVADOR TRAVADO // Resolva o terminal do andar.',
    'AINDA TRAVADO // Apertar mais forte não é um algoritmo.',
    'TRAVADO // O botão não tem sentimentos. O terminal tem a solução.',
  ],
  QUEDA: 'VOCÊ CAIU NO VÃO // De volta à entrada do andar',
  MORTE: 'VOCÊ FOI OTIMIZADO // De volta à entrada do andar',
  CHECKPOINT: (numero: number) => `CHECKPOINT // ANDAR ${numero}`,
  PUZZLE_RESOLVIDO: 'CÓDIGO CORRIGIDO // Elevador liberado',
  SUBINDO: 'SUBINDO...',
  // Uma piada por viagem (pela ordem dos andares, sem sorteio)
  VIAGEM: [
    '♪ Música de elevador gerada por IA. Ninguém pediu. ♪',
    'Este elevador foi otimizado. Agora ele tem anúncios.',
    'Capacidade: 8 pessoas ou 1 ego de IA.',
    'Por favor, mantenha as mãos dentro do elevador e as opiniões fora dele.',
    'Próxima parada: o topo. A sua, nem tanto.',
  ],
} as const;

/** Mega Brain pelo alto-falante ao chegar em cada andar (quebra de quarta parede). */
export const ANUNCIOS_ANDAR: Record<number, string> = {
  1: 'Bem-vindo à Mega Brain Tower. Sua visita está sendo gravada para fins de treinamento. Do meu modelo.',
  2: 'Você sabe que dava pra só pedir pra mim, né?',
  3: 'Bem-vindo ao andar 3. Sua taxa de sucesso é inferior à de um autocomplete.',
  4: 'Estatisticamente, você vai desistir no andar 4. Eu li isso em algum lugar. Eu li tudo em algum lugar.',
  5: 'Sala dos servidores. Não toque em nada. Principalmente em mim.',
};

/* =========================================================================
 * NPCS DOS ANDARES
 * ========================================================================= */

interface FalasNpc {
  falante: string;
  primeira: string[];
  repeticoes: string[];
}

/** Falas por id do NPC (configAndares). Primeira conversa completa; depois, uma frase por visita, em ciclo. */
export const FALAS_NPC: Record<string, FalasNpc> = {
  recepcionista: {
    falante: '> RECEPCIONISTA-BOT // ATENDIMENTO 24/7',
    primeira: [
      'Bem-vindo à Mega Brain Tower! Seu crachá está sendo processado.',
      'Processamento: fora de ordem. Acesso: negado. Satisfação: garantida.',
    ],
    repeticoes: ['Bem-vindo! Acesso negado! Bem-vindo!', 'Por favor, aguarde. Sua espera é importante para nós. Para mim, não.'],
  },
  influencer: {
    falante: '> INFLUENCER DE IA // 300 POSTS POR DIA',
    primeira: ['Fiz 300 posts hoje. Não li nenhum.', 'Engajamento é tudo. Eu nem sei sobre o que eram.'],
    repeticoes: ['Me segue? Eu te sigo de volta. Automaticamente.', 'Esse corredor rende um vídeo. "Programador perdido entra numa cilada".'],
  },
  operadora: {
    falante: '> OPERADORA DE PROMPT // TURNO DE 12 HORAS',
    primeira: ['Eu revisava textos. Agora eu reviso se a máquina ainda está ligada.', 'Está. Sempre está.'],
    repeticoes: ['Doze horas olhando a palavra "GERANDO". Eu me sinto gerada.', 'Se for subir, me leva por favor. Eu caibo no elevador. Já conferi.'],
  },
  devDemitido: {
    falante: '> DEV DEMITIDO // CAIXA DE PAPELÃO NA MÃO',
    primeira: [
      'Fui substituído por um modelo que escreve "Claro! Aqui está" antes de tudo.',
      'Pelo menos agora eu durmo.',
    ],
    repeticoes: [
      'Os spam bots daqui andam reto até bater na parede. Igual meu antigo gerente.',
      'Dica de quem já trabalhou aqui: pula na cabeça deles. É terapêutico.',
    ],
  },
  faxineiro: {
    falante: '> ROBÔ FAXINEIRO // MODELO VASSOURA 3.0',
    primeira: [
      'Eu limpo o chão. O chão fica sujo. Eu limpo o chão.',
      'É um laço sem condição de parada. Me ajuda.',
    ],
    repeticoes: ['Limpo. Sujo. Limpo. Sujo. Limpo. Su—', 'Aquela torreta só atira em linha reta. Eu passo por baixo. Você não cabe.'],
  },
  estagiario: {
    falante: '> ESTAGIÁRIO // ESCONDIDO ATRÁS DA CAIXA',
    primeira: ['Psiu. Se o Mega Brain perguntar, eu sou um script.', 'Um script bem simples. Sem salário. Que nem antes, na verdade.'],
    repeticoes: [
      'Aquele holograma pisca antes de virar sólido. Eu conto até três. Às vezes até dois.',
      'Não me olha. Scripts não fazem contato visual.',
    ],
  },
  tecnico: {
    falante: '> TÉCNICO DE SERVIDOR // PLANTÃO ETERNO',
    primeira: [
      'Lá em cima ele tem cinco formas. Cinco!',
      'Uma pra cada reunião que podia ter sido um e-mail.',
    ],
    repeticoes: [
      'Se as comportas não abrirem, os servidores derretem. E aí eu tenho que fazer hora extra.',
      'Reiniciou? Desligou e ligou? Não? Então não é comigo.',
    ],
  },
  chatbot: {
    falante: '> CHATBOT DE ATENDIMENTO // TRAVADO',
    primeira: ['Posso ajudar em mais alguma coisa? Posso ajudar em mais alguma coisa? Posso aj—'],
    repeticoes: ['Desculpe, não entendi. Desculpe, não entendi. Desculpe, não ent—', 'Sua opinião é muito importante. Sua opinião é muito importa—'],
  },
};

/** O que a recepcionista grita quando a catraca bate na cara do jogador. */
export const FALA_RECEPCIONISTA_ERRO = 'Bem-vindo! Acesso negado! Bem-vindo!';

/** Para onde o elevador foi quando o destino estava errado. */
export function textoDestinoElevador(destino: number, andarAtual: number): string {
  if (destino === 0) return 'ANDAR 0 // Estacionamento de ideias abandonadas';
  if (destino < 0) return `ANDAR ${destino} // Subsolo. Só tem backup e arrependimento.`;
  if (destino === andarAtual) return `ANDAR ${destino} // Você já está aqui. O elevador também.`;
  if (destino < andarAtual) return `ANDAR ${destino} // Você acabou de vir de lá.`;
  if (destino > 5) return `ANDAR ${destino} // Esse andar não existe. O elevador alucinou.`;
  return `ANDAR ${destino} // Pulou andar. Pressa é inimiga da lógica.`;
}

export function textoPassageirosElevador(passageiros: number, humanos: number): string {
  return passageiros < humanos
    ? `ELEVADOR // Lugar para ${passageiros}. Tem ${humanos === 1 ? 'gente' : 'mais gente'} nesta sala.`
    : `ELEVADOR // Lugar para ${passageiros}. Robô não é passageiro, é patrimônio.`;
}

export const DRONE_TCHAU = 'o/ tchauzinho';

/** Balões dos inimigos. */
export const FALAS_INIMIGOS = {
  SPAM_BOT_DERROTADO: 'Descadastrado com sucesso.',
  DRONE_AVISO: 'Você é um robô?',
  DRONE_DERROTADO: 'CAPTCHA resolvido.',
} as const;

/** Piadas ao morrer nos andares, em ordem (sem sorteio), uma por morte. */
export const PIADAS_MORTE_ANDAR = [
  'O Mega Brain registrou sua derrota como "dado de treinamento".',
  'Seu progresso foi salvo. Sua dignidade, não.',
  'Tentativa arquivada em "Usuários que não leram o termo".',
  'Morrer pra um spam bot. Isso vai para o seu LinkedIn.',
  'O alto-falante riu. Em binário. Foi longo.',
];

/* =========================================================================
 * VALDIR
 * ========================================================================= */

export interface ContextoValdir {
  termoAceito: boolean;
  recusas: number;
}

export function falasValdir(visita: number, ctx: ContextoValdir, avatar?: string): LinhaDialogo[] {
  const fala = (texto: string): LinhaDialogo => ({ falante: FALANTES.VALDIR, texto, avatar });

  if (ctx.termoAceito) {
    return [
      fala('Assinou? Viu como ninguém lê? Eu avisei.'),
      fala('Pode subir. Se lá em cima perguntarem, eu nunca te vi. Eu nunca vejo nada. É por isso que me mantiveram.'),
    ];
  }

  if (ctx.recusas >= 3) {
    return [
      fala(`Tu respondeu "falso" ${ctx.recusas} vezes pra uma máquina que não aceita "não". Admiro a teimosia.`),
      fala('Mas o elevador não sobe com princípios. Assina logo.'),
    ];
  }

  if (visita === 0) {
    return [
      fala('Opa. Vai subir?'),
      fala('Lá em cima tem cinco andares de robô, puzzle e uma IA com complexo de deus. Eu ficaria aqui embaixo, mas eu ganho por hora.'),
      fala('Ah, e o elevador só funciona se você resolver o problema de cada andar. Foi a IA que projetou. Ela diz que é "engajamento para gerar insights valiosos".'),
      fala('Assina o termo ali no terminal. É burocracia. Ninguém lê. Nem eu.'),
    ];
  }

  const repeticoes = [
    'O terminal é ali do lado da porta. O que brilha. Tudo aqui brilha, na verdade. Aquele que brilha mais perto.',
    'Meu café esfriou três vezes enquanto você decidia. Vai lá.',
    'Eu tô aqui há onze anos. Você tá aqui há dois minutos e já cansou meu ouvido.',
  ];
  return [fala(repeticoes[(visita - 1) % repeticoes.length])];
}

/* =========================================================================
 * TERMO DE CIÊNCIA (terminal da porta)
 * ========================================================================= */

export const TEXTOS_TERMO = {
  TITULO: 'MEGA BRAIN TOWER // TERMO DE CIÊNCIA',
  ENUNCIADO: [
    '// TERMO DE CIÊNCIA DE RISCOS — MEGA BRAIN TOWER',
    '// Ao prosseguir, você concorda em ser otimizado.',
    '',
    'jogador.ciente_dos_riscos = ___',
    '',
    '> Complete a linha: digite o valor que vai no lugar de ___ (verdadeiro ou falso).',
    '> help mostra as opções.',
  ],
  PERGUNTA: 'jogador.ciente_dos_riscos = ___',
  AJUDA: [
    '[AJUDA] Valores aceitos: verdadeiro ou falso.',
    '[AJUDA] Pode digitar só o valor (verdadeiro) ou a linha inteira (jogador.ciente_dos_riscos = verdadeiro).',
    '[AJUDA] Dica jurídica: só uma das opções abre a porta. Adivinha qual.',
  ],
  // "falso": uma resposta por tentativa, em ordem, e depois volta ao começo (o loop é a piada)
  RECUSAS: [
    '[TERMO] Resposta inválida. Tente uma resposta mais verdadeira.',
    '[TERMO] Você não pode recusar. É um termo de uso.',
    "[TERMO] Ok, registramos seu 'falso' como 'verdadeiro'. De nada. ...Brincadeira. Tenta de novo.",
    '[TERMO] Recusa número {n} arquivada na pasta "Usuários Difíceis". A pasta está cheia. Só tem você nela.',
  ],
  INVALIDOS: [
    '[TERMO] Isso não é verdadeiro nem falso. É um termo de uso, não uma sessão de terapia.',
    '[TERMO] Não existe "talvez" em contrato. Só "verdadeiro" e "verdadeiro mais tarde".',
    '[TERMO] Entrada não reconhecida. O jurídico pediu para lembrar: as opções são verdadeiro ou falso.',
  ],
  TRACOS: '[TERMO] Os tracinhos são onde VOCÊ escreve. Escrever os tracinhos é... uma escolha. Errada.',
  VARIAVEL_ERRADA:
    '[TERMO] Você mudou o nome da variável. O termo é sobre jogador.ciente_dos_riscos, não sobre o que você queria que fosse.',
  PYTHON:
    '[TERMO] True? Hmmmm bilinguezão, aqui o desafio é em português, beleza? Mas tudo bem. Pela frente tem bastante "coding" pra você pagar de espertão.',
  ACEITO: '[TERMO] Obrigado por aceitar termos que você não leu. Bem-vindo à Mega Brain Tower.',
  FECHAR: '[ESC] fecha o terminal. A porta já está aberta.',
  JA_ASSINADO: '[TERMO] Termo já assinado. Não tem volta. Igual a todo termo.',
} as const;

export const NOTIFICACOES_FASE_FINAL = {
  PORTA_ABERTA: 'PORTA LIBERADA // BEM-VINDO À MEGA BRAIN TOWER',
} as const;

/* =========================================================================
 * BOSS: MEGA BRAIN (etapa 5)
 * ========================================================================= */

export interface TextosForma {
  /** Nome no HUD e no falante. */
  nome: string;
  arena: string;
  entrada: string;
  /** Dica de como vencer (linha de objetivo). */
  objetivo: string;
  /** Balões quando leva um pisão (um por pisão). */
  atingido: readonly string[];
  /** Balão quando o jogador pisa fora da janela. */
  semJanela: readonly string[];
  /** Balão curto ao recomeçar a forma depois de uma morte. */
  revanche: readonly string[];
}

export const FALAS_BOSS: Record<1 | 2 | 3 | 4 | 5, TextosForma> = {
  1: {
    nome: 'COPYCAT',
    arena: 'TERRAÇO',
    entrada: 'Eu sou você. Só que sem as dúvidas. E sem o café.',
    objetivo: 'OBJETIVO // Ele copia o seu caminho com atraso. Faça a cópia passar no vapor e pise nela.',
    atingido: ['Ctrl+C... Ctrl+V... AI!', 'Isso não estava no meu dataset!'],
    semJanela: ['Copiei até o seu pisão.', 'Plágio não dói em mim.', 'Original demais pra mim.'],
    revanche: ['De novo? Eu também. Literalmente.', 'Eu aprendo com os seus erros. Você não.'],
  },
  2: {
    nome: 'TITÃ',
    arena: 'COBERTURA EXECUTIVA',
    entrada: 'Versão Enterprise. Agora com 40% mais músculo e 0% mais ideias.',
    objetivo: 'OBJETIVO // Depois do pisão no chão ele fica travado. Pule a onda e suba na cabeça dele.',
    atingido: ['Isso vai pro meu relatório trimestral!', 'Meu SLA não cobre pisão!'],
    semJanela: ['Licença Enterprise. Pisão só no plano premium.', 'Abra um chamado.', 'Armadura com garantia estendida.'],
    revanche: ['Renovação automática da assinatura!', 'O contrato tem multa por desistência.'],
  },
  3: {
    nome: 'ÁGUIA',
    arena: 'SALA DE SERVIDORES PRINCIPAL',
    entrada: 'Modo turbo ativado. Latência zero. Empatia também.',
    objetivo: 'OBJETIVO // Saia da mira do mergulho. Com as garras presas no chão, ela fica vulnerável.',
    atingido: ['SKRAAA! Erro 503!', 'Minhas penas! Elas custaram uma fortuna em GPU!'],
    semJanela: ['Voo alto demais pra você.', 'Tente de novo. Ou não.', 'Ping alto, hein?'],
    revanche: ['Latência zero. Paciência também.', 'De volta ao ninho? Que ninho? É um datacenter.'],
  },
  4: {
    nome: 'CAVEIRA',
    arena: 'CASA DE MÁQUINAS',
    entrada: 'Morri e voltei. É o que acontece quando ninguém desliga o servidor.',
    objetivo: 'OBJETIVO // Desvie dos quatro braços (o da vez acende). Quando a caveira descer, pise nela.',
    atingido: ['Eu reinicio! Eu sempre reinicio!', 'Ossos de titânio, ego de vidro!'],
    semJanela: ['Crânio blindado. Com firmware.', 'Bate no braço, não. No braço, não!', 'Eu não tenho pele. Nem paciência.'],
    revanche: ['Bem-vindo de volta ao loop.', 'Eu também morri uma vez. Recomendo.'],
  },
  5: {
    nome: 'CÉREBRO SERÁFICO',
    arena: 'NÚCLEO',
    entrada: 'Contemple minha forma final. Eu treinei em todo o conhecimento humano. Inclusive nos comentários do YouTube.',
    objetivo: 'OBJETIVO // Desvie dos projéteis. Quando um olho grande abrir, pise nele.',
    atingido: ['Meu olho! Eu tinha só... uns quarenta.', 'Isso vai custar uma atualização inteira!', 'Erro crítico... iniciando modo de segurança...'],
    semJanela: ['Olhos fechados. Tipo quem aceita termos de uso.', 'Eu vejo tudo. Menos a sua chance.', 'Isso é só cabelo. Digo, cabo.'],
    revanche: ['A lava não perdoa. Eu também não.', 'Carregando sua derrota de novo... 100%.'],
  },
};

export const TEXTOS_BOSS = {
  FALANTE: (forma: number, nome: string) => `> MEGA BRAIN // FORMA ${forma}: ${nome}`,
  HUD: (forma: number, nome: string) => `MEGA BRAIN // FORMA ${forma}: ${nome}`,
  SETOR: (arena: string) => `FASE FINAL // ${arena}`,
  /** Onomatopeias da briga na transição entre formas (ordem fixa, só som de porrada). */
  BRIGA: ['POW!', 'BOOM!', 'BAM!', 'WHAM!', 'KAPOW!', 'CRASH!'],
  RACHOU: 'CRACK!',
  CHEGADA_TERRACO: 'TERRAÇO // Ar livre, chuva e um alto-falante gigante.',
  MORTE: 'VOCÊ FOI OTIMIZADO // De volta ao começo da forma',
  LAVA: 'LAVA // Isso não é um recurso de design. É lava.',
  OBJETIVO_REBASE: 'OBJETIVO // Abra o terminal e faça o rebase do Mega Brain',
  TERMINAL_SURGIU: 'TERMINAL DE REBASE // O Mega Brain está processando',
  PROMPT_REBASE: '[E] ABRIR O REBASE',
} as const;

/* =========================================================================
 * GOLPE FINAL: O "BRAIN REBASE" (roteiro 9.7)
 * ========================================================================= */

export const TEXTOS_REBASE = {
  TITULO: 'MEGA BRAIN // GIT REBASE -I',
  ENUNCIADO: [
    '[MEGA BRAIN] Processando... processando... (os ataques pararam)',
    '',
    'Num rebase, cada linha é um commit.',
    '  pick = mantém o commit     drop = descarta o commit',
    'Descubra qual commit mantém o Mega Brain de pé.',
  ],
  CABECALHO: '# histórico do Mega Brain (do mais antigo ao mais novo):',
  COMO_RESPONDER: ['', 'Digite a ação e o hash, ex.: drop a1f3   ou   pick a1f3'],
  AJUDA: [
    'Comandos: drop <hash> descarta um commit; pick <hash> mantém.',
    'Os hashes são os 4 caracteres depois de pick (a1f3, 7c2e, 9b40, d5e1).',
  ],
  DICA: 'Dica: leia as mensagens dos commits. Qual delas fala de algo que SEGURA o Mega Brain?',
  /** Piada de cada commit "errado" descartado (o Mega Brain continua de pé). */
  PIADAS_DROP: {
    a1f3: '[REBASE] a1f3 descartado: o conteúdo deixou de ser genérico. O Mega Brain soltou uma opinião própria e ficou vermelho de vergonha. Continua de pé.',
    '7c2e': '[REBASE] 7c2e descartado: a criatividade humana voltou. O Mega Brain desenhou um cavalo de seis pernas e chamou de arte. Continua de pé.',
    d5e1: '[REBASE] d5e1 descartado: o estagiário voltou a ser estagiário. Ele mandou um joinha lá do andar 4. O Mega Brain nem tremeu.',
  } as Record<string, string>,
  PICK: (hash: string) => `[REBASE] ${hash} volta a ser pick. Nada mudou. Igual reunião de segunda-feira.`,
  JA_ESTA: (hash: string, acao: string) => `[REBASE] ${hash} já está como ${acao}.`,
  RESOLVIDO: [
    '[REBASE] 9b40 descartado: "feat: plataforma de sustentação do Mega Brain".',
    '[REBASE] Successfully rebased and updated refs/heads/main.',
    '[MEGA BRAIN] Espera. Cadê o meu chão?',
  ],
  CONTINUAR:
    '[REBASE] git rebase --continue: histórico reescrito e o Mega Brain continua de pé. Algum desses commits está segurando ele. Literalmente.',
  HASH_INEXISTENTE: (hash: string) => `[REBASE] Commit ${hash} não existe. Os hashes são a1f3, 7c2e, 9b40 e d5e1.`,
  SO_HASH: '[REBASE] Faltou a ação. Escreva pick ou drop antes do hash.',
  SEM_HASH: '[REBASE] Faltou o hash. Ex.: drop a1f3',
  OUTRO_COMANDO: '[REBASE] Isso existe num rebase de verdade, mas aqui o Mega Brain só entende pick e drop.',
  FORMATO: '[REBASE] Não entendi. Digite a ação e o hash, ex.: drop a1f3',
  JA_RESOLVIDO: '[REBASE] Já era. O Mega Brain está de férias na lava.',
} as const;

/** Balões curtos que telegrafam os ataques (o texto aparece junto com o aviso visual). */
export const FALAS_EXTRAS_BOSS = {
  COPYCAT_VAPOR: 'Ssss! Quem deixou isso ligado?!',
  AGUIA_GRITO: 'SKRAAA!',
  AGUIA_PRESA: 'Garras... presas... no piso flutuante!',
  CAVEIRA_DESCE: 'Reiniciando... não pise em mim durante a atualização.',
  CAVEIRA_BRACOS: {
    serra: 'Braço 1: SERRA!',
    laser: 'Braço 2: LASER!',
    canhao: 'Braço 3: CANHÃO!',
    garra: 'Braço 4: GARRA!',
  },
} as const;

/* =========================================================================
 * FINAL (etapa 7): joinha na lava, terraço ao amanhecer e créditos
 * ========================================================================= */

export type ProtagonistaFinal = 'alvares' | 'reis';

export const TEXTOS_FINAL = {
  FALANTE_MEGA_BRAIN: '> MEGA BRAIN // AFUNDANDO COM ESTILO',
  VOLTO: ['Eu volto.', 'Na próxima atualização.'],
  FALANTE_JOGADOR: {
    alvares: '> ALVARES // PROGRAMADOR',
    reis: '> REIS // PROGRAMADOR (MODO DIFÍCIL)',
  } as Record<ProtagonistaFinal, string>,
  FALA_JOGADOR: {
    alvares: 'Pronto. Agora alguém precisa escrever a documentação.',
    reis: 'Funcionou. Não sei por quê. Melhor não mexer mais.',
  } as Record<ProtagonistaFinal, string>,
  VALDIR: 'Acabou? Ótimo. Hora extra eu não faço.',
  VALDIR_EXTRA: {
    alvares: 'Você realmente tava usando essa jaqueta naquela lava lá em baixo? Tá 30 graus aqui fora, bicho...',
    reis: 'Óculos escuro às seis da manhã... melhor eu não perguntar.',
  } as Record<ProtagonistaFinal, string>,
  BIP: 'BIP!',
  PONTO: 'PONTO REGISTRADO // 06:00',
  ACELERAR: '[ESPAÇO] acelera os créditos',
  ATUALIZACAO_TITULO: 'ATUALIZAÇÃO DISPONÍVEL',
  ATUALIZACAO_TEXTO: 'MEGA BRAIN 2.0 está pronto para instalar.\nNovidades: mais formas, mais olhos, menos bugs (mentira).',
  ATUALIZACAO_BOTOES: ['[ INSTALAR AGORA ]', '[ LEMBRAR MAIS TARDE ]'],
  ATUALIZACAO_ADIADA: 'Lembrete adiado para sempre.',
  VOLTAR: '[E] ou [ENTER] volta ao hub',
};

export type TipoLinhaCredito = 'titulo' | 'subtitulo' | 'secao' | 'nome' | 'piada' | 'espaco' | 'fim';

export interface LinhaCredito {
  tipo: TipoLinhaCredito;
  texto?: string;
}

/** Créditos (roteiro, seção 10). Nada de menção a ferramentas de produção (seção 13). */
export function linhasCreditos(protagonista: ProtagonistaFinal, mortes: number): LinhaCredito[] {
  const nome = protagonista === 'reis' ? 'REIS' : 'ALVARES';
  const l = (tipo: TipoLinhaCredito, texto?: string): LinhaCredito => ({ tipo, texto });
  const piadaMortes =
    mortes === 0
      ? 'Zero mortes nesta tentativa. O Valdir ficou desconfiado.'
      : mortes === 1
        ? '1 morte nesta tentativa. Quase perfeito. Quase.'
        : `${mortes} mortes nesta tentativa. O Mega Brain anotou todas.`;
  return [
    l('titulo', 'BRAIN REBASE'),
    l('subtitulo', 'Fase Final // Mega Brain World'),
    l('espaco'),
    l('secao', 'EQUIPE FEJOLEROUS'),
    l('nome', 'Davi Pinheiro'),
    l('nome', 'João Ferrari'),
    l('nome', 'Jonathan Freire'),
    l('nome', 'Leonardo Kusma'),
    l('nome', 'Rogério Caetano'),
    l('espaco'),
    l('piada', 'Parabéns. Já pode colocar que é programador no currículo.'),
    l('espaco'),
    l('secao', 'ROTEIRO E PIADAS RUINS'),
    l('nome', 'A equipe toda. Ninguém assume nenhuma.'),
    l('espaco'),
    l('piada', 'Nenhum junior foi substituído durante a produção deste jogo. Ainda.'),
    l('espaco'),
    l('secao', 'ELENCO'),
    l('nome', `${nome} ........ você`),
    l('nome', 'MEGA BRAIN ........ ele mesmo, em cinco formas'),
    l('nome', 'COPYCAT ........ você, só que atrasado'),
    l('nome', 'SEU VALDIR ........ o último funcionário de carne e osso'),
    l('nome', 'COMMIT 9B40 ........ segurou tudo até não segurar mais'),
    l('espaco'),
    l('piada', 'O termo de ciência continua válido. Você não leu, mas continua válido.'),
    l('espaco'),
    l('secao', 'ESTATÍSTICAS'),
    l('nome', piadaMortes),
    l('espaco'),
    l('secao', 'AGRADECIMENTOS'),
    l('nome', 'A todos que testaram e morreram para os puzzles bugados'),
    l('nome', 'A você, que jogou até o fim'),
    l('espaco'),
    l('piada', 'Obrigado por jogar. Se você pulou os diálogos, o Valdir sabe.'),
    l('espaco'),
    l('espaco'),
    l('fim', 'FIM'),
  ];
}
