import Phaser from 'phaser';
import { CenaBase } from '../compartilhado/CenaBase';
import type { InfoFase, ResultadoComando } from '../compartilhado/tipos';

/**
 * CenaHub: Hub Central e Seletor de Fases com temática hacker cyberpunk retrô.
 */
export class CenaHub extends Phaser.Scene {
  private base!: CenaBase;
  private fases: InfoFase[] = [];
  private indiceSelecionado: number = 0;

  private elementosLista: {
    container: Phaser.GameObjects.Container;
    fundo: Phaser.GameObjects.Rectangle;
    textoNumero: Phaser.GameObjects.Text;
    textoTitulo: Phaser.GameObjects.Text;
    textoStatus: Phaser.GameObjects.Text;
    fase: InfoFase;
  }[] = [];

  private painelDetalhes!: {
    container: Phaser.GameObjects.Container;
    textoTitulo: Phaser.GameObjects.Text;
    textoTopico: Phaser.GameObjects.Text;
    textoAutor: Phaser.GameObjects.Text;
    textoDescricao: Phaser.GameObjects.Text;
    botaoIniciar: Phaser.GameObjects.Container;
  };

  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclasWASD?: {
    cima: Phaser.Input.Keyboard.Key;
    baixo: Phaser.Input.Keyboard.Key;
  };
  private teclaEnter?: Phaser.Input.Keyboard.Key;
  private teclaTerminal?: Phaser.Input.Keyboard.Key;
  private teclaP?: Phaser.Input.Keyboard.Key;

  // Objeto base auxiliar para herdar os utilitários de CenaBase
  private terminalHub?: CenaBase['terminal'];

  constructor() {
    super('CenaHub');
  }

  preload(): void {
    if (!this.textures.exists('alvares')) {
      this.load.spritesheet('alvares', 'assets/personagens/alvares.png', {
        frameWidth: 128,
        frameHeight: 128,
      });
    }
    if (!this.textures.exists('reis')) {
      this.load.spritesheet('reis', 'assets/personagens/reis.png', {
        frameWidth: 128,
        frameHeight: 128,
      });
    }
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#050811');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Instancia recursos de CenaBase sob demanda
    this.base = new (class extends CenaBase {
      constructor() {
        super('CenaHubInterna', 'hub');
      }
    })();
    this.base.create();
    this.terminalHub = (this.base as any).terminal;

    this.fases = this.base['gerenciadorEstado'].obterListaFases();

    this.criarCenarioFundo(width, height);
    this.criarCabecalho(width);
    this.criarBotaoSelecaoPersonagem(width);
    this.criarListaFases(width, height);
    this.criarPainelDetalhes(width, height);
    this.criarRodape(width, height);
    this.configurarControles();
    this.configurarTerminalHub();

    (this.base as any).criarEfeitoCRT(width, height, 0.035);

    this.atualizarSelecaoVisual();
  }

  private criarCenarioFundo(width: number, height: number): void {
    const g = this.add.graphics();

    // Gradiente sutil escuro
    g.fillGradientStyle(0x04060a, 0x04060a, 0x08101a, 0x08101a, 1);
    g.fillRect(0, 0, width, height);

    // Grid hacker no fundo
    g.lineStyle(1, 0x00ff66, 0.04);
    for (let x = 0; x < width; x += 40) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, height);
      g.strokePath();
    }
    for (let y = 0; y < height; y += 40) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(width, y);
      g.strokePath();
    }
  }

  private criarCabecalho(width: number): void {
    const container = this.add.container(width / 2, 45);

    const titulo = this.add.text(
      0,
      -10,
      'TERMINAL ZERO // HUB CENTRAL DE COMANDO',
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '26px',
        color: '#00ff66',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    titulo.setOrigin(0.5);

    const subtitulo = this.add.text(
      0,
      20,
      '[ REDE SUBTERRÂNEA REBELDE - SELEÇÃO DE SETORES E FASES ]',
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '13px',
        color: '#00e5ff',
        letterSpacing: 2,
      }
    );
    subtitulo.setOrigin(0.5);

    container.add([titulo, subtitulo]);
  }

  private criarBotaoSelecaoPersonagem(width: number): void {
    const personagemAtivo = this.base['gerenciadorEstado'].obterPersonagem();
    const nomePersonagem = personagemAtivo === 'reis' ? 'REIS' : 'ALVARES';
    const corPersonagem = personagemAtivo === 'reis' ? '#f87171' : '#facc15';

    const container = this.add.container(width - 150, 45);
    const fundo = this.add.rectangle(0, 0, 240, 46, 0x091522, 0.9);
    fundo.setStrokeStyle(1.5, 0x00e5ff, 0.7);
    fundo.setInteractive({ useHandCursor: true });

    const textoAtalho = this.add.text(0, -9, '[P] SELEÇÃO DE OPERADOR', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '12px',
      color: '#00e5ff',
      fontStyle: 'bold',
    });
    textoAtalho.setOrigin(0.5);

    const textoOperador = this.add.text(0, 9, `ATIVO: ${nomePersonagem}`, {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '11px',
      color: corPersonagem,
      fontStyle: 'bold',
    });
    textoOperador.setOrigin(0.5);

    container.add([fundo, textoAtalho, textoOperador]);
    container.setDepth(20);

    fundo.on('pointerover', () => {
      fundo.setFillStyle(0x102538, 1);
      fundo.setStrokeStyle(2, 0x00ffcc, 1);
    });

    fundo.on('pointerout', () => {
      fundo.setFillStyle(0x091522, 0.9);
      fundo.setStrokeStyle(1.5, 0x00e5ff, 0.7);
    });

    fundo.on('pointerdown', () => {
      this.abrirSelecaoPersonagem();
    });
  }

  private abrirSelecaoPersonagem(): void {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('CenaSelecaoPersonagem');
    });
  }

  private criarListaFases(_width: number, _height: number): void {
    const startX = 60;
    const startY = 110;
    const itemWidth = 620;
    const itemHeight = 65;
    const espacamento = 10;

    this.elementosLista = [];

    this.fases.forEach((fase, i) => {
      const y = startY + i * (itemHeight + espacamento);
      const container = this.add.container(startX, y);

      const fundo = this.add.rectangle(0, 0, itemWidth, itemHeight, 0x09111c, 0.85);
      fundo.setOrigin(0, 0);
      fundo.setStrokeStyle(1, 0x00ff66, 0.2);
      fundo.setInteractive({ useHandCursor: true });

      const textoNumero = this.add.text(18, 14, `[#${fase.numero}]`, {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '18px',
        color: fase.desbloqueada ? '#00e5ff' : '#4b5563',
        fontStyle: 'bold',
      });

      const textoTitulo = this.add.text(80, 14, fase.titulo, {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '15px',
        color: fase.desbloqueada ? '#e2e8f0' : '#6b7280',
        fontStyle: 'bold',
      });

      const textoSubtitulo = this.add.text(80, 36, `${fase.subtitulo} // ${fase.topico}`, {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '11px',
        color: fase.desbloqueada ? '#94a3b8' : '#475569',
      });

      let statusStr = '[BLOQUEADO]';
      let statusCor = '#ef4444';
      if (fase.concluida) {
        statusStr = '[CONCLUÍDO]';
        statusCor = '#10b981';
      } else if (fase.desbloqueada) {
        statusStr = '[DISPONÍVEL]';
        statusCor = '#00ff66';
      }

      const textoStatus = this.add.text(itemWidth - 18, 22, statusStr, {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '13px',
        color: statusCor,
        fontStyle: 'bold',
      });
      textoStatus.setOrigin(1, 0);

      container.add([fundo, textoNumero, textoTitulo, textoSubtitulo, textoStatus]);

      fundo.on('pointerdown', () => {
        this.indiceSelecionado = i;
        this.atualizarSelecaoVisual();
        this.tentarIniciarFaseSelecionada();
      });

      fundo.on('pointerover', () => {
        this.indiceSelecionado = i;
        this.atualizarSelecaoVisual();
      });

      this.elementosLista.push({
        container,
        fundo,
        textoNumero,
        textoTitulo,
        textoStatus,
        fase,
      });
    });
  }

  private criarPainelDetalhes(width: number, _height: number): void {
    const painelX = 720;
    const painelY = 110;
    const painelW = width - painelX - 60;
    const painelH = 515;

    const container = this.add.container(painelX, painelY);

    const fundo = this.add.rectangle(0, 0, painelW, painelH, 0x060c14, 0.92);
    fundo.setOrigin(0, 0);
    fundo.setStrokeStyle(1, 0x00ff66, 0.4);

    const header = this.add.rectangle(0, 0, painelW, 36, 0x00ff66, 0.12);
    header.setOrigin(0, 0);

    const headerText = this.add.text(14, 9, 'DETALHES DO SETOR REBELDE', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#00ff66',
      fontStyle: 'bold',
    });

    const textoTitulo = this.add.text(20, 55, '', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '18px',
      color: '#00e5ff',
      fontStyle: 'bold',
      wordWrap: { width: painelW - 40 },
    });

    const textoTopico = this.add.text(20, 110, '', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#38ef7d',
    });

    const textoAutor = this.add.text(20, 135, '', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '12px',
      color: '#94a3b8',
    });

    const linhaDivisoria = this.add.line(0, 0, 20, 165, painelW - 20, 165, 0x00ff66, 0.25);
    linhaDivisoria.setOrigin(0, 0);

    const textoDescricao = this.add.text(20, 180, '', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '14px',
      color: '#cbd5e1',
      lineSpacing: 6,
      wordWrap: { width: painelW - 40 },
    });

    // Botão Iniciar Missão
    const botaoIniciar = this.add.container(painelW / 2, painelH - 50);
    const fundoBotao = this.add.rectangle(0, 0, painelW - 60, 48, 0x00ff66, 0.2);
    fundoBotao.setStrokeStyle(2, 0x00ff66, 0.8);
    fundoBotao.setInteractive({ useHandCursor: true });

    const textoBotao = this.add.text(0, 0, 'INICIAR MISSÃO [ENTER]', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '16px',
      color: '#00ff66',
      fontStyle: 'bold',
    });
    textoBotao.setOrigin(0.5);

    botaoIniciar.add([fundoBotao, textoBotao]);

    fundoBotao.on('pointerdown', () => {
      this.tentarIniciarFaseSelecionada();
    });

    container.add([
      fundo,
      header,
      headerText,
      textoTitulo,
      textoTopico,
      textoAutor,
      linhaDivisoria,
      textoDescricao,
      botaoIniciar,
    ]);

    this.painelDetalhes = {
      container,
      textoTitulo,
      textoTopico,
      textoAutor,
      textoDescricao,
      botaoIniciar,
    };
  }

  private teclaTres?: Phaser.Input.Keyboard.Key;
  private teclaTresNumpad?: Phaser.Input.Keyboard.Key;

  private criarRodape(width: number, height: number): void {
    const rodape = this.add.text(
      width / 2,
      height - 25,
      '[ ↑ / ↓ ou W / S ] Navegar  |  [ENTER] Iniciar  |  [P] Selecionar Personagem  |  [3] Inspecionar Fase 3  |  [T] Terminal Hub',
      {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '12px',
        color: '#64748b',
      }
    );
    rodape.setOrigin(0.5);
  }

  private configurarControles(): void {
    if (this.input.keyboard) {
      this.cursores = this.input.keyboard.createCursorKeys();
      this.teclasWASD = {
        cima: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        baixo: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      };
      this.teclaEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.teclaTerminal = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
      this.teclaTres = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
      this.teclaTresNumpad = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE);
      this.teclaP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    }
  }

  update(): void {
    if (this.terminalHub && this.terminalHub.estaAberto) {
      return;
    }

    if (this.teclaP && Phaser.Input.Keyboard.JustDown(this.teclaP)) {
      this.abrirSelecaoPersonagem();
      return;
    }

    if (
      (this.teclaTres && Phaser.Input.Keyboard.JustDown(this.teclaTres)) ||
      (this.teclaTresNumpad && Phaser.Input.Keyboard.JustDown(this.teclaTresNumpad))
    ) {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('CenaFase3');
      });
      return;
    }

    if (
      (this.cursores && Phaser.Input.Keyboard.JustDown(this.cursores.up)) ||
      (this.teclasWASD && Phaser.Input.Keyboard.JustDown(this.teclasWASD.cima))
    ) {
      this.indiceSelecionado =
        (this.indiceSelecionado - 1 + this.fases.length) % this.fases.length;
      this.atualizarSelecaoVisual();
    } else if (
      (this.cursores && Phaser.Input.Keyboard.JustDown(this.cursores.down)) ||
      (this.teclasWASD && Phaser.Input.Keyboard.JustDown(this.teclasWASD.baixo))
    ) {
      this.indiceSelecionado = (this.indiceSelecionado + 1) % this.fases.length;
      this.atualizarSelecaoVisual();
    } else if (this.teclaEnter && Phaser.Input.Keyboard.JustDown(this.teclaEnter)) {
      this.tentarIniciarFaseSelecionada();
    } else if (this.teclaTerminal && Phaser.Input.Keyboard.JustDown(this.teclaTerminal)) {
      this.abrirTerminalHub();
    }
  }

  private atualizarSelecaoVisual(): void {
    this.fases = this.base['gerenciadorEstado'].obterListaFases();

    this.elementosLista.forEach((item, index) => {
      const isSelecionado = index === this.indiceSelecionado;
      const fase = this.fases[index];
      item.fase = fase;

      if (isSelecionado) {
        item.fundo.setFillStyle(0x0e2433, 0.95);
        item.fundo.setStrokeStyle(2, 0x00ffcc, 0.9);
      } else {
        item.fundo.setFillStyle(0x09111c, 0.85);
        item.fundo.setStrokeStyle(1, 0x00ff66, 0.2);
      }

      let statusStr = '[BLOQUEADO]';
      let statusCor = '#ef4444';
      if (fase.concluida) {
        statusStr = '[CONCLUÍDO]';
        statusCor = '#10b981';
      } else if (fase.desbloqueada) {
        statusStr = '[DISPONÍVEL]';
        statusCor = '#00ff66';
      }
      item.textoStatus.setText(statusStr);
      item.textoStatus.setColor(statusCor);
    });

    const faseSel = this.fases[this.indiceSelecionado];
    if (faseSel) {
      this.painelDetalhes.textoTitulo.setText(faseSel.titulo);
      this.painelDetalhes.textoTopico.setText(`TÓPICO: ${faseSel.topico}`);
      this.painelDetalhes.textoAutor.setText(`AUTOR: ${faseSel.autor} // ${faseSel.subtitulo}`);
      this.painelDetalhes.textoDescricao.setText(
        `${faseSel.descricao}\n\n` +
          (faseSel.desbloqueada
            ? '>> Setor com conexão neural autorizada. Pressione ENTER para carregar.'
            : '>> ACESSO NEGADO: Conclua os módulos anteriores para decodificar esta tranca.')
      );

      const fundoBotao = this.painelDetalhes.botaoIniciar.getAt(0) as Phaser.GameObjects.Rectangle;
      const textoBotao = this.painelDetalhes.botaoIniciar.getAt(1) as Phaser.GameObjects.Text;

      if (faseSel.desbloqueada || faseSel.id === 'fase3') {
        fundoBotao.setFillStyle(0x00ff66, 0.25);
        fundoBotao.setStrokeStyle(2, 0x00ff66, 0.9);
        textoBotao.setText(faseSel.id === 'fase3' && !faseSel.desbloqueada ? 'INSPECIONAR FASE 3 [ENTER]' : 'INICIAR MISSÃO [ENTER]');
        textoBotao.setColor('#00ff66');
      } else {
        fundoBotao.setFillStyle(0x1f2937, 0.4);
        fundoBotao.setStrokeStyle(1, 0x4b5563, 0.6);
        textoBotao.setText('SETOR BLOQUEADO');
        textoBotao.setColor('#6b7280');
      }
    }
  }

  private tentarIniciarFaseSelecionada(): void {
    const faseSel = this.fases[this.indiceSelecionado];
    if (!faseSel) return;

    if (!faseSel.desbloqueada && faseSel.id !== 'fase3') {
      this.cameras.main.shake(150, 0.005);
      return;
    }

    this.base['gerenciadorEstado'].definirFaseAtual(faseSel.id);
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start(faseSel.chaveCena);
    });
  }

  private configurarTerminalHub(): void {
    if (!this.terminalHub) return;

    this.terminalHub.definirInterpretador(
      (comandoBruto: string): ResultadoComando => {
        const cmd = comandoBruto.trim().toLowerCase();

        if (cmd === 'cls' || cmd === 'clear' || cmd === 'limpar') {
          return { sucesso: true, mensagem: '', acao: 'CLEAR_TERMINAL' };
        }

        if (cmd === 'help' || cmd === 'ajuda') {
          return {
            sucesso: true,
            mensagem:
              '[COMANDOS DO HUB REBELDE]\n' +
              '  listar / ls             - Lista todos os setores e estados\n' +
              '  iniciar <numero|id>     - Carrega o setor desejado (ex: iniciar 0, iniciar 1)\n' +
              '  desbloquear_tudo        - Concede acesso a todas as fases (Modo Dev)\n' +
              '  resetar                 - Reinicia o progresso salvo para o padrão\n' +
              '  cls / limpar            - Limpa o terminal\n' +
              '  sair                    - Fecha este terminal',
          };
        }

        if (cmd === 'sair' || cmd === 'exit') {
          this.terminalHub?.fechar();
          return { sucesso: true, mensagem: '' };
        }

        if (cmd === 'listar' || cmd === 'ls') {
          const listaStr = this.fases
            .map(
              (f) =>
                `  [#${f.numero}] ${f.id} - ${f.titulo} -> ${
                  f.concluida ? '[CONCLUIDO]' : f.desbloqueada ? '[DISPONIVEL]' : '[BLOQUEADO]'
                }`
            )
            .join('\n');
          return {
            sucesso: true,
            mensagem: `[CATÁLOGO DE SETORES]:\n${listaStr}`,
          };
        }

        if (cmd === 'desbloquear_tudo') {
          this.base['gerenciadorEstado'].desbloquearTodas();
          this.atualizarSelecaoVisual();
          return {
            sucesso: true,
            mensagem: '[SUCESSO] Todas as fases foram desbloqueadas!',
          };
        }

        if (cmd === 'resetar') {
          this.base['gerenciadorEstado'].reiniciarProgresso();
          this.atualizarSelecaoVisual();
          return {
            sucesso: true,
            mensagem: '[AVISO] Progresso resetado para a Fase 0 (Tutorial).',
          };
        }

        if (cmd.startsWith('iniciar ') || cmd.startsWith('start ')) {
          const arg = cmd.replace(/^(?:iniciar|start)\s+/, '').trim();
          const faseAlvo = this.fases.find(
            (f) =>
              f.id.toLowerCase() === arg ||
              f.numero.toString() === arg ||
              f.chaveCena.toLowerCase() === arg
          );

          if (!faseAlvo) {
            return {
              sucesso: false,
              mensagem: `[ERRO] Setor '${arg}' não encontrado. Use 'listar' para ver os identificadores.`,
            };
          }

          if (!faseAlvo.desbloqueada) {
            return {
              sucesso: false,
              mensagem: `[ACESSO NEGADO] O setor #${faseAlvo.numero} (${faseAlvo.id}) ainda está bloqueado.`,
            };
          }

          setTimeout(() => {
            this.terminalHub?.fechar();
            this.scene.start(faseAlvo.chaveCena);
          }, 800);

          return {
            sucesso: true,
            mensagem: `[CARREGANDO] Saltando para #${faseAlvo.numero}: ${faseAlvo.titulo}...`,
          };
        }

        return {
          sucesso: false,
          mensagem: "[SINTAXE INVÁLIDA] Digite 'ajuda' para verificar os comandos disponíveis.",
        };
      }
    );
  }

  private abrirTerminalHub(): void {
    if (!this.terminalHub) return;
    this.terminalHub.abrir({
      titulo: 'TERMINAL ZERO // NAVEGADOR DE SETORES',
      linhasIniciais: [
        '=== SISTEMA CENTRAL DE ROTEAMENTO REBELDE ===',
        '> Digite \'ajuda\' para visualizar os comandos de salto e catálogo de fases.',
        '> Digite \'listar\' para inspecionar os setores disponíveis.',
      ],
    });
  }
}
