import type { DadosEstadoJogo, InfoFase } from '../compartilhado/tipos';

export type TipoPersonagem = 'alvares' | 'reis';

/**
 * Gerenciador singleton para persistência e controle do estado global do jogo e progresso das fases.
 */
export class GerenciadorEstado {
  private static instancia: GerenciadorEstado;
  private readonly CHAVE_STORAGE = 'jogo_logica_progresso_v1';
  private static readonly CHAVE_STORAGE_PERSONAGEM = 'personagem_ativo';

  private fasesConcluidas: Set<string> = new Set();
  private faseAtualId: string = 'fase0_tutorial';

  private readonly catalogoFases: InfoFase[] = [
    {
      id: 'fase0_tutorial',
      chaveCena: 'CenaTutorial',
      numero: 0,
      titulo: 'Tutorial: O Despertar do Kernel',
      subtitulo: 'Lixão dos Scripts Esquecidos',
      descricao: 'Aprenda comandos básicos, variáveis booleanas, inteiros e concatenação de strings.',
      autor: 'Sistema Base',
      topico: 'Variáveis Primitivas e Strings',
      desbloqueada: true,
      concluida: false,
    },
    {
      id: 'fase1',
      chaveCena: 'CenaFase1',
      numero: 1,
      titulo: 'Fase 1: Painéis Condicionais e Portas Lógicas',
      subtitulo: 'Setor de Triagem Booleana',
      descricao: 'Desbloqueie trancas magnéticas usando lógica condicional (IF / ELSE) e operadores AND / OR.',
      autor: 'Integrante 1',
      topico: 'Condicionais e Álgebra Booleana',
      desbloqueada: false,
      concluida: false,
    },
    {
      id: 'fase2',
      chaveCena: 'CenaFase2',
      numero: 2,
      titulo: 'Fase 2: Esteiras de Repetição e Automação',
      subtitulo: 'Fábrica de Cilindros Automatizados',
      descricao: 'Programe laços de repetição (WHILE / FOR) para alinhar esteiras contínuas e desativar prensas.',
      autor: 'Integrante 2',
      topico: 'Laços de Repetição (Loops)',
      desbloqueada: false,
      concluida: false,
    },
    {
      id: 'fase3',
      chaveCena: 'CenaFase3',
      numero: 3,
      titulo: 'Fase 3: Registradores e Barramentos de Dados',
      subtitulo: 'Arquivo Morto de Memória',
      descricao: 'Manipule estruturas de dados, vetores e listas para reordenar blocos de instruções corrompidos.',
      autor: 'Integrante 3',
      topico: 'Listas e Estruturas de Dados',
      desbloqueada: false,
      concluida: false,
    },
    {
      id: 'fase4',
      chaveCena: 'CenaFase4',
      numero: 4,
      titulo: 'Fase 4: Módulos e Sub-rotinas',
      subtitulo: 'Usina de Processamento Paralelo',
      descricao: 'Modularize código criando funções reaproveitáveis para contornar defesas automáticas.',
      autor: 'Integrante 4',
      topico: 'Funções e Parâmetros',
      desbloqueada: false,
      concluida: false,
    },
    {
      id: 'fase5',
      chaveCena: 'CenaFase5',
      numero: 5,
      titulo: 'Fase 5: Algoritmos de Busca e Otimização',
      subtitulo: 'Labirinto de Roteamento',
      descricao: 'Encontre o caminho crítico e otimize rotas de pacotes para invadir o mainframe central.',
      autor: 'Integrante 5',
      topico: 'Algoritmos e Otimização',
      desbloqueada: false,
      concluida: false,
    },
    {
      id: 'fase_final',
      chaveCena: 'CenaFaseFinal',
      numero: 6,
      titulo: 'Fase Final: O Núcleo do Mega Brain',
      subtitulo: 'Servidor Central da IA Soberana',
      descricao: 'Combine todos os conhecimentos em um embate lógico definitivo para restaurar o livre pensamento.',
      autor: 'Equipe',
      topico: 'Desafio Integrado',
      desbloqueada: false,
      concluida: false,
    },
  ];

  private constructor() {
    this.carregar();
  }

  public static obterInstancia(): GerenciadorEstado {
    if (!GerenciadorEstado.instancia) {
      GerenciadorEstado.instancia = new GerenciadorEstado();
    }
    return GerenciadorEstado.instancia;
  }

  /**
   * Retorna a lista atualizada de fases com seus respectivos status de conclusão e desbloqueio.
   */
  public obterListaFases(): InfoFase[] {
    return this.catalogoFases.map((fase, index) => {
      const concluida = this.fasesConcluidas.has(fase.id);
      // A primeira fase é sempre desbloqueada; as demais são desbloqueadas se a anterior estiver concluída
      const anteriorConcluida = index === 0 || this.fasesConcluidas.has(this.catalogoFases[index - 1].id);
      const desbloqueada = index === 0 || anteriorConcluida;

      return {
        ...fase,
        desbloqueada,
        concluida,
      };
    });
  }

  public obterFasePorId(id: string): InfoFase | undefined {
    return this.obterListaFases().find((f) => f.id === id);
  }

  public obterFasePorChaveCena(chaveCena: string): InfoFase | undefined {
    return this.obterListaFases().find((f) => f.chaveCena === chaveCena);
  }

  public estaDesbloqueada(idFase: string): boolean {
    const fase = this.obterFasePorId(idFase);
    return fase?.desbloqueada ?? false;
  }

  public estaConcluida(idFase: string): boolean {
    return this.fasesConcluidas.has(idFase);
  }

  public concluirFase(idFase: string): void {
    this.fasesConcluidas.add(idFase);
    this.salvar();
  }

  public desbloquearTodas(): void {
    for (const fase of this.catalogoFases) {
      this.fasesConcluidas.add(fase.id);
    }
    this.salvar();
  }

  public definirFaseAtual(idFase: string): void {
    this.faseAtualId = idFase;
  }

  public obterFaseAtual(): string {
    return this.faseAtualId;
  }

  public reiniciarProgresso(): void {
    this.fasesConcluidas.clear();
    this.faseAtualId = 'fase0_tutorial';
    try {
      localStorage.removeItem(this.CHAVE_STORAGE);
    } catch {
      // Ignora erro de storage indisponível
    }
  }

  /**
   * Define o personagem ativo para as fases e persiste no localStorage
   */
  public definirPersonagem(tipo: TipoPersonagem): void {
    try {
      localStorage.setItem(GerenciadorEstado.CHAVE_STORAGE_PERSONAGEM, tipo);
    } catch {
      // Ignora erro em ambientes sem localStorage
    }
  }

  /**
   * Retorna o personagem ativo ('alvares' ou 'reis'), com padrão 'alvares'
   */
  public obterPersonagem(): TipoPersonagem {
    try {
      const salvo = localStorage.getItem(GerenciadorEstado.CHAVE_STORAGE_PERSONAGEM) as TipoPersonagem | null;
      if (salvo === 'alvares' || salvo === 'reis') {
        return salvo;
      }
    } catch {
      // Ignora erro
    }
    return 'alvares';
  }

  /**
   * Atalho estático para conveniência
   */
  public static definirPersonagem(tipo: TipoPersonagem): void {
    GerenciadorEstado.obterInstancia().definirPersonagem(tipo);
  }

  /**
   * Atalho estático para conveniência
   */
  public static obterPersonagem(): TipoPersonagem {
    return GerenciadorEstado.obterInstancia().obterPersonagem();
  }

  public salvar(): void {
    try {
      const dados: DadosEstadoJogo = {
        fasesConcluidas: Array.from(this.fasesConcluidas),
        faseAtual: this.faseAtualId,
      };
      localStorage.setItem(this.CHAVE_STORAGE, JSON.stringify(dados));
    } catch {
      // Ignora erro em ambientes sem localStorage
    }
  }

  public carregar(): void {
    try {
      const salvo = localStorage.getItem(this.CHAVE_STORAGE);
      if (salvo) {
        const dados: DadosEstadoJogo = JSON.parse(salvo);
        if (dados && Array.isArray(dados.fasesConcluidas)) {
          this.fasesConcluidas = new Set(dados.fasesConcluidas);
        }
        if (dados && dados.faseAtual) {
          this.faseAtualId = dados.faseAtual;
        }
      }
    } catch {
      // Em caso de corrupção ou erro de leitura, mantém o padrão
    }
  }
}
