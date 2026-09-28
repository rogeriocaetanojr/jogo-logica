import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase3 } from './InterpretadorFase3';

/**
 * CenaFase3: Arquivo Morto e Registradores de Lista (Integrante 3).
 */
export class CenaFase3 extends CenaBase {
  private plataformas!: Phaser.Physics.Arcade.StaticGroup;
  private jogador!: Phaser.Physics.Arcade.Sprite;
  private totemLista!: Phaser.GameObjects.Image;
  private textoPrompt!: Phaser.GameObjects.Text;
  private portaoArquivo!: Phaser.Physics.Arcade.Sprite;
  private colisorPortao?: Phaser.Physics.Arcade.Collider;
  private isResolvido: boolean = false;

  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclaInteragir?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('CenaFase3', 'fase3');
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;

    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor('#090714');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.criarHUDSuperior('FASE 3 // LISTAS E REGISTRADORES DE MEMÓRIA');
    this.criarCenario(width, height);
    this.criarPlataformas(width, height);
    this.criarPortao(width, height);
    this.criarTotem(width, height);
    this.criarJogador();
    this.configurarControles();
    this.configurarTerminal();
    this.criarEfeitoCRT(width, height, 0.03);

    this.comunicador.iniciarDialogo([
      {
        falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 3',
        texto:
          'Setor 3 alcançado: Arquivo Morto de Memória.',
      },
      {
        falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 3',
        texto:
          'A senha da câmara foi fragmentada em um vetor de dados. Acesse os índices corretos para desbloquear o portão.',
      },
    ]);
  }

  private criarCenario(width: number, height: number): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x090714, 0x090714, 0x16102a, 0x16102a, 1);
    g.fillRect(0, 0, width, height);

    g.lineStyle(1, 0xa855f7, 0.15);
    for (let x = 60; x < width; x += 110) {
      g.beginPath();
      g.moveTo(x, 80);
      g.lineTo(x, 640);
      g.strokePath();
    }
  }

  private criarPlataformas(width: number, height: number): void {
    this.plataformas = this.physics.add.staticGroup();

    if (!this.textures.exists('chao-fase3')) {
      const g = this.make.graphics();
      g.fillStyle(0x130e24, 1);
      g.fillRect(0, 0, width, 50);
      g.fillStyle(0xa855f7, 0.6);
      g.fillRect(0, 0, width, 4);
      g.generateTexture('chao-fase3', width, 50);
      g.destroy();
    }
    this.plataformas.create(width / 2, height - 25, 'chao-fase3');

    if (!this.textures.exists('plat-fase3')) {
      const g = this.make.graphics();
      g.fillStyle(0x1d1538, 1);
      g.fillRect(0, 0, 220, 24);
      g.fillStyle(0xd8b4fe, 0.5);
      g.fillRect(0, 0, 220, 3);
      g.generateTexture('plat-fase3', 220, 24);
      g.destroy();
    }
    this.plataformas.create(380, 480, 'plat-fase3');
    this.plataformas.create(720, 360, 'plat-fase3');
  }

  private criarPortao(width: number, height: number): void {
    if (!this.textures.exists('portao-fase3')) {
      const g = this.make.graphics();
      g.fillStyle(0x9333ea, 0.85);
      g.fillRect(0, 0, 28, 210);
      g.generateTexture('portao-fase3', 28, 210);
      g.destroy();
    }

    this.portaoArquivo = this.physics.add.sprite(width - 140, height - 155, 'portao-fase3');
    (this.portaoArquivo.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.portaoArquivo.body as Phaser.Physics.Arcade.Body).allowGravity = false;
  }

  private criarTotem(_width: number, _height: number): void {
    if (!this.textures.exists('totem-fase3')) {
      const g = this.make.graphics();
      g.fillStyle(0x140e29, 1);
      g.fillRect(0, 0, 48, 64);
      g.fillStyle(0xa855f7, 0.8);
      g.fillRect(8, 8, 32, 24);
      g.generateTexture('totem-fase3', 48, 64);
      g.destroy();
    }

    this.totemLista = this.add.image(380, 436, 'totem-fase3');

    this.textoPrompt = this.add.text(380, 385, '[E] BARRAMENTO DE DADOS', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#c084fc',
      backgroundColor: '#090514',
      padding: { x: 6, y: 3 },
    });
    this.textoPrompt.setOrigin(0.5);
    this.textoPrompt.setVisible(false);
  }

  private criarJogador(): void {
    this.jogador = this.physics.add.sprite(120, 580, 'player');
    this.jogador.setCollideWorldBounds(true);

    this.physics.add.collider(this.jogador, this.plataformas);
    this.colisorPortao = this.physics.add.collider(this.jogador, this.portaoArquivo);
  }

  private configurarControles(): void {
    if (this.input.keyboard) {
      this.cursores = this.input.keyboard.createCursorKeys();
      this.teclaInteragir = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }
  }

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFase3);
    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      if (resultado.acao === 'CONCLUIR_FASE3') {
        this.desbloquearPortao();
        setTimeout(() => {
          this.terminal.fechar();
        }, 1200);
      }
    });
  }

  private desbloquearPortao(): void {
    if (this.isResolvido) return;
    this.isResolvido = true;

    if (this.colisorPortao) {
      this.physics.world.removeCollider(this.colisorPortao);
    }

    this.tweens.add({
      targets: this.portaoArquivo,
      alpha: 0,
      scaleY: 0,
      duration: 600,
      onComplete: () => {
        this.portaoArquivo.destroy();
        this.concluirFaseAtual();

        this.comunicador.iniciarDialogo(
          [
            {
              falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 3',
              texto:
                'Registrador validado! A câmara de arquivos foi aberta e a Fase 3 concluída.',
            },
            {
              falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 3',
              texto: 'Pressione ENTER ou ESC para retornar ao Hub Central.',
            },
          ],
          () => {
            this.retornarAoHub();
          }
        );
      },
    });
  }

  override update(tempo: number, delta: number): void {
    super.update(tempo, delta);

    if (!this.jogador || !this.jogador.body) return;

    if (this.terminal.estaAberto || this.comunicador.estaAtivo) {
      this.jogador.setVelocityX(0);
      this.textoPrompt.setVisible(false);
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.jogador.x,
      this.jogador.y,
      this.totemLista.x,
      this.totemLista.y
    );
    const perto = dist < 70 && !this.isResolvido;
    this.textoPrompt.setVisible(perto);

    if (perto && this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir)) {
      this.jogador.setVelocityX(0);
      this.terminal.abrir({
        titulo: 'SISTEMA DE REGISTRADORES DE MEMÓRIA // SETOR 3',
        linhasIniciais: [
          '=== BARRAMENTO DE ARQUIVO MORTO ===',
          "> registrador = ['Alfa', 'Beta', 'Gamma', 'Delta']",
          "> DIRETRIZ: Concatene o 1º (índice 0) com o 3º (índice 2) elemento para compor a senha de liberação.",
          "> EXEMPLO: chave = registrador[0] + registrador[2]",
          '> Digite a expressão de indexação:',
        ],
      });
    }

    const esquerda = this.cursores?.left.isDown ?? false;
    const direita = this.cursores?.right.isDown ?? false;
    const pulo = this.cursores?.up.isDown ?? false;
    const noChao = this.jogador.body.blocked.down || this.jogador.body.touching.down;

    if (esquerda) {
      this.jogador.setVelocityX(-220);
      this.jogador.setFlipX(true);
    } else if (direita) {
      this.jogador.setVelocityX(220);
      this.jogador.setFlipX(false);
    } else {
      this.jogador.setVelocityX(0);
    }

    if (pulo && noChao) {
      this.jogador.setVelocityY(-520);
    }
  }
}
