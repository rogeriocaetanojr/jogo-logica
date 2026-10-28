import type { ContextoInterpretador, FuncaoInterpretador, ResultadoComando } from './tipos';

const LIMITE_HISTORICO = 50;

const COMANDO_ENUNCIADO = 'enunciado';
const SEM_ENUNCIADO = '[AVISO] Este terminal não tem enunciado para repetir.';

// Zoações ao limpar um terminal que tinha enunciado (sorteadas sem repetir a anterior)
const ZOACOES_LIMPAR = [
  '[TERMINAL LIMPO] Parabéns, você apagou o enunciado. Agora vai resolver o desafio na base da telepatia? Digite enunciado se a memória de peixe bater.',
  '[TERMINAL LIMPO] Limpou tudo, inclusive as instruções. Corajoso. Burro, mas corajoso. Digite enunciado que eu repito, bem devagar.',
  '[TERMINAL LIMPO] Tela limpinha, igual à sua cabeça agora que o enunciado sumiu. Digite enunciado para ter ele de volta.',
];

/**
 * Controlador do overlay de Terminal retrô com entrada de comandos, histórico e interpretação.
 */
export class Terminal {
  private overlay: HTMLElement | null = null;
  private output: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private elementoTitulo: HTMLElement | null = null;
  private elementoStatus: HTMLElement | null = null;

  private aberto: boolean = false;
  private interpretador?: FuncaoInterpretador;
  private contextoAtual?: ContextoInterpretador;
  private aoSubmeter?: (resultado: ResultadoComando, comandoBruto: string) => void;
  private permiteFecharComEsc: boolean = true;

  // Histórico de comandos navegável com as setas ↑/↓, como no terminal de uma IDE
  private historico: string[] = [];
  private indiceHistorico: number = 0;
  private rascunhoHistorico: string = '';

  // Linhas iniciais do último abrir(), reimpressas pelo comando "enunciado"
  private linhasEnunciado: string[] = [];
  private ultimaZoacao: number = -1;

  constructor() {
    this.overlay = document.getElementById('terminal-overlay');
    this.output = document.getElementById('terminal-output');
    this.input = document.getElementById('terminal-input') as HTMLInputElement | null;
    this.elementoTitulo = document.querySelector('.terminal-title');
    this.elementoStatus = document.querySelector('.terminal-status');

    this.vincularEventosDOM();
  }

  public get estaAberto(): boolean {
    return this.aberto;
  }

  public definirInterpretador(interpretador: FuncaoInterpretador): void {
    this.interpretador = interpretador;
  }

  public definirContexto(contexto: ContextoInterpretador): void {
    this.contextoAtual = contexto;
  }

  public definirAoSubmeter(callback: (resultado: ResultadoComando, comandoBruto: string) => void): void {
    this.aoSubmeter = callback;
  }

  public definirPermissaoFecharComEsc(permitir: boolean): void {
    this.permiteFecharComEsc = permitir;
  }

  public definirTitulo(titulo: string, status: string = '[CONEXAO ATIVA]'): void {
    if (this.elementoTitulo) {
      this.elementoTitulo.textContent = titulo;
    }
    if (this.elementoStatus) {
      this.elementoStatus.textContent = status;
    }
  }

  private vincularEventosDOM(): void {
    if (this.input) {
      this.input.addEventListener('keydown', this.tratarInputKeyDown);
    }
    window.addEventListener('keydown', this.tratarGlobalKeyDown);
  }

  private tratarInputKeyDown = (e: KeyboardEvent): void => {
    e.stopPropagation();

    if (e.key === 'Escape') {
      if (this.permiteFecharComEsc) {
        this.fechar();
      }
    } else if (e.key === 'Enter') {
      this.submeterComando();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.navegarHistorico(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.navegarHistorico(1);
    }
  };

  /**
   * ↑ volta para comandos mais antigos; ↓ avança até devolver o que estava sendo digitado.
   */
  private navegarHistorico(direcao: -1 | 1): void {
    if (!this.input || this.historico.length === 0) return;

    if (this.indiceHistorico === this.historico.length) {
      this.rascunhoHistorico = this.input.value;
    }

    const novoIndice = Math.max(0, Math.min(this.historico.length, this.indiceHistorico + direcao));
    if (novoIndice === this.indiceHistorico) return;

    this.indiceHistorico = novoIndice;
    this.input.value =
      novoIndice === this.historico.length ? this.rascunhoHistorico : this.historico[novoIndice];

    const fim = this.input.value.length;
    this.input.setSelectionRange(fim, fim);
  }

  private registrarNoHistorico(comando: string): void {
    // Repetir o mesmo comando seguido não duplica a entrada
    if (this.historico[this.historico.length - 1] !== comando) {
      this.historico.push(comando);
      if (this.historico.length > LIMITE_HISTORICO) this.historico.shift();
    }
    this.indiceHistorico = this.historico.length;
    this.rascunhoHistorico = '';
  }

  private tratarGlobalKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.aberto && this.permiteFecharComEsc) {
      this.fechar();
    }
  };

  /**
   * Abre o terminal, limpando ou inicializando com mensagens de cabeçalho.
   */
  public abrir(opcoes?: {
    titulo?: string;
    linhasIniciais?: string[];
    contexto?: ContextoInterpretador;
    aoSubmeter?: (res: ResultadoComando, cmd: string) => void;
    permitirFecharComEsc?: boolean;
  }): void {
    this.aberto = true;
    this.permiteFecharComEsc = opcoes?.permitirFecharComEsc ?? true;
    this.indiceHistorico = this.historico.length;
    this.rascunhoHistorico = '';
    this.linhasEnunciado = [...(opcoes?.linhasIniciais ?? [])];

    if (opcoes?.titulo) {
      this.definirTitulo(opcoes.titulo);
    }
    if (opcoes?.contexto) {
      this.contextoAtual = opcoes.contexto;
    }
    if (opcoes?.aoSubmeter) {
      this.aoSubmeter = opcoes.aoSubmeter;
    }

    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }

    if (this.output) {
      this.output.innerHTML = '';
      if (opcoes?.linhasIniciais && opcoes.linhasIniciais.length > 0) {
        for (const linha of opcoes.linhasIniciais) {
          this.imprimirLinha(linha, 'info');
        }
      }
    }

    this.focarInput();
  }

  public fechar(): void {
    if (!this.permiteFecharComEsc && this.aberto) {
      return;
    }

    this.aberto = false;

    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }

    if (this.input) {
      this.input.value = '';
      this.input.blur();
    }
  }

  public fecharForcado(): void {
    this.aberto = false;
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    if (this.input) {
      this.input.value = '';
      this.input.blur();
    }
  }

  public limpar(): void {
    if (this.output) {
      this.output.innerHTML = '';
    }
  }

  public imprimirLinha(
    texto: string,
    tipo: 'info' | 'sucesso' | 'erro' | 'comando' = 'info'
  ): void {
    if (!this.output) return;

    const div = document.createElement('div');
    const classeCss =
      tipo === 'sucesso'
        ? 'success'
        : tipo === 'erro'
          ? 'error'
          : tipo === 'comando'
            ? 'command'
            : 'info';

    div.className = `log-line ${classeCss}`;
    div.textContent = texto;
    this.output.appendChild(div);
    this.output.scrollTop = this.output.scrollHeight;
  }

  public focarInput(): void {
    if (this.input) {
      this.input.value = '';
      setTimeout(() => {
        this.input?.focus();
      }, 50);
    }
  }

  private submeterComando(): void {
    if (!this.input) return;
    const comandoBruto = this.input.value;
    if (!comandoBruto.trim()) return;

    this.registrarNoHistorico(comandoBruto);

    // Ecoa o comando digitado no histórico do terminal
    this.imprimirLinha(`> ${comandoBruto}`, 'comando');
    this.input.value = '';

    // "enunciado" é do próprio terminal: vale em qualquer fase, sem passar pelo interpretador
    if (comandoBruto.trim().toLowerCase() === COMANDO_ENUNCIADO) {
      this.mostrarEnunciado();
      return;
    }

    if (!this.interpretador) {
      this.imprimirLinha('[ERRO] Nenhum interpretador conectado a este terminal.', 'erro');
      return;
    }

    const resultado = this.interpretador(comandoBruto, this.contextoAtual);

    // Se a ação for de limpar terminal
    if (resultado.acao === 'CLEAR_TERMINAL' || resultado.acao === 'LIMPAR_TERMINAL') {
      this.limpar();
      if (this.linhasEnunciado.length > 0) {
        this.imprimirLinha(this.sortearZoacao(), 'info');
      }
      return;
    }

    // Exibe a mensagem de feedback se existir
    if (resultado.mensagem) {
      this.imprimirLinha(
        resultado.mensagem,
        resultado.sucesso ? 'sucesso' : 'erro'
      );
    }

    // Dispara callback de evento específico da cena
    if (this.aoSubmeter) {
      this.aoSubmeter(resultado, comandoBruto);
    }
  }

  private mostrarEnunciado(): void {
    if (this.linhasEnunciado.length === 0) {
      this.imprimirLinha(SEM_ENUNCIADO, 'info');
      return;
    }
    this.limpar();
    for (const linha of this.linhasEnunciado) {
      this.imprimirLinha(linha, 'info');
    }
  }

  private sortearZoacao(): string {
    let indice: number;
    do {
      indice = Math.floor(Math.random() * ZOACOES_LIMPAR.length);
    } while (indice === this.ultimaZoacao && ZOACOES_LIMPAR.length > 1);
    this.ultimaZoacao = indice;
    return ZOACOES_LIMPAR[indice];
  }

  public destruir(): void {
    if (this.input) {
      this.input.removeEventListener('keydown', this.tratarInputKeyDown);
    }
    window.removeEventListener('keydown', this.tratarGlobalKeyDown);
    this.fecharForcado();
  }
}
