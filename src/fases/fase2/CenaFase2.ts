import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import { GerenciadorEstado, type TipoPersonagem } from '../../nucleo/GerenciadorEstado';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase2 } from './InterpretadorFase2';

/**
 * CenaFase2: Fábrica de Cilindros e Automação com Loops (Integrante 2).
 */
export class CenaFase2 extends CenaBase {
  private plataformas!: Phaser.Physics.Arcade.StaticGroup;
  private jogador!: Phaser.Physics.Arcade.Sprite;
  private tipoPersonagem: TipoPersonagem = 'alvares';
  private totemLoop!: Phaser.GameObjects.Image;
  private textoPrompt!: Phaser.GameObjects.Text;
  private barreiraMecanica!: Phaser.Physics.Arcade.Sprite;
  private colisorBarreira?: Phaser.Physics.Arcade.Collider;
  private isResolvido: boolean = false;

  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclaInteragir?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('CenaFase2', 'fase2');
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;

    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor('#080d12');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.criarHUDSuperior('FASE 2 // LAÇOS DE REPETIÇÃO E AUTOMAÇÃO');
    this.criarCenario(width, height);
    this.criarPlataformas(width, height);
    this.criarBarreira(width, height);
    this.criarTotem(width, height);
    this.criarJogador();
    this.configurarControles();
    this.configurarTerminal();
    this.criarEfeitoCRT(width, height, 0.03);

    this.comunicador.iniciarDialogo([
      {
        falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 2',
        texto:
          'Setor 2 alcançado. As esteiras de alimentação estão desacopladas.',
      },
      {
        falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 2',
        texto:
          'Programe um laço de repetição FOR no console de automação para calibrar os 5 pistões de uma só vez.',
      },
    ]);
  }

  private criarCenario(width: number, height: number): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x080d12, 0x080d12, 0x141f1a, 0x141f1a, 1);
    g.fillRect(0, 0, width, height);

    g.lineStyle(1, 0x38ef7d, 0.12);
    for (let x = 80; x < width; x += 100) {
      g.beginPath();
      g.moveTo(x, 60);
      g.lineTo(x, 660);
      g.strokePath();
    }
  }

  private criarPlataformas(width: number, height: number): void {
    this.plataformas = this.physics.add.staticGroup();

    if (!this.textures.exists('chao-fase2')) {
      const g = this.make.graphics();
      g.fillStyle(0x111c18, 1);
      g.fillRect(0, 0, width, 50);
      g.fillStyle(0x38ef7d, 0.6);
      g.fillRect(0, 0, width, 4);
      g.generateTexture('chao-fase2', width, 50);
      g.destroy();
    }
    this.plataformas.create(width / 2, height - 25, 'chao-fase2');

    if (!this.textures.exists('plat-fase2')) {
      const g = this.make.graphics();
      g.fillStyle(0x182c24, 1);
      g.fillRect(0, 0, 200, 24);
      g.fillStyle(0x00ffcc, 0.5);
      g.fillRect(0, 0, 200, 3);
      g.generateTexture('plat-fase2', 200, 24);
      g.destroy();
    }
    this.plataformas.create(400, 480, 'plat-fase2');
    this.plataformas.create(750, 370, 'plat-fase2');
  }

  private criarBarreira(width: number, height: number): void {
    if (!this.textures.exists('barreira-fase2')) {
      const g = this.make.graphics();
      g.fillStyle(0xf59e0b, 0.85);
      g.fillRect(0, 0, 30, 220);
      g.generateTexture('barreira-fase2', 30, 220);
      g.destroy();
    }

    this.barreiraMecanica = this.physics.add.sprite(width - 150, height - 160, 'barreira-fase2');
    (this.barreiraMecanica.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.barreiraMecanica.body as Phaser.Physics.Arcade.Body).allowGravity = false;
  }

  private criarTotem(_width: number, _height: number): void {
    if (!this.textures.exists('totem-fase2')) {
      const g = this.make.graphics();
      g.fillStyle(0x0c1e17, 1);
      g.fillRect(0, 0, 48, 64);
      g.fillStyle(0x38ef7d, 0.8);
      g.fillRect(8, 8, 32, 24);
      g.generateTexture('totem-fase2', 48, 64);
      g.destroy();
    }

    this.totemLoop = this.add.image(400, 436, 'totem-fase2');

    this.textoPrompt = this.add.text(400, 385, '[E] CONSOLE DE AUTOMAÇÃO', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#38ef7d',
      backgroundColor: '#040d0a',
      padding: { x: 6, y: 3 },
    });
    this.textoPrompt.setOrigin(0.5);
    this.textoPrompt.setVisible(false);
  }

  private criarJogador(): void {
    this.tipoPersonagem = GerenciadorEstado.obterPersonagem();
    const chave = this.tipoPersonagem === 'reis' ? 'reis' : 'alvares';
    this.jogador = this.physics.add.sprite(120, 580, chave);
    this.jogador.setCollideWorldBounds(true);

    const body = this.jogador.body as Phaser.Physics.Arcade.Body;
    body.setSize(44, 96);
    body.setOffset(42, 26);

    this.jogador.anims.play(`${this.tipoPersonagem}_idle`, true);

    this.physics.add.collider(this.jogador, this.plataformas);
    this.colisorBarreira = this.physics.add.collider(this.jogador, this.barreiraMecanica);
  }

  private configurarControles(): void {
    if (this.input.keyboard) {
      this.cursores = this.input.keyboard.createCursorKeys();
      this.teclaInteragir = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }
  }

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFase2);
    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      if (resultado.acao === 'CONCLUIR_FASE2') {
        this.desativarBarreira();
        setTimeout(() => {
          this.terminal.fechar();
        }, 1200);
      }
    });
  }

  private desativarBarreira(): void {
    if (this.isResolvido) return;
    this.isResolvido = true;

    if (this.colisorBarreira) {
      this.physics.world.removeCollider(this.colisorBarreira);
    }

    this.tweens.add({
      targets: this.barreiraMecanica,
      y: this.barreiraMecanica.y + 220,
      alpha: 0,
      duration: 700,
      onComplete: () => {
        this.barreiraMecanica.destroy();
        this.concluirFaseAtual();

        this.comunicador.iniciarDialogo(
          [
            {
              falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 2',
              texto:
                'Pistões sincronizados com sucesso via loop! A Fase 2 foi dominada.',
            },
            {
              falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 2',
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
      this.jogador.anims.play(`${this.tipoPersonagem}_idle`, true);
      this.textoPrompt.setVisible(false);
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.jogador.x,
      this.jogador.y,
      this.totemLoop.x,
      this.totemLoop.y
    );
    const perto = dist < 70 && !this.isResolvido;
    this.textoPrompt.setVisible(perto);

    if (perto && this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir)) {
      this.jogador.setVelocityX(0);
      this.terminal.abrir({
        titulo: 'CONSOLE DE CONTROLE DE PISTÕES // SETOR 2',
        linhasIniciais: [
          '=== SISTEMA DE CALIBRAÇÃO DE ESTEIRAS ===',
          '> TOTAL DE PISTÕES DESALINHADOS: 5',
          '> DIRETRIZ: Execute um loop para calibrar os 5 pistões sequencialmente.',
          '> EXEMPLO: for i in range(5): alinhar_esteira()',
          '> Digite a instrução de repetição:',
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

    // Máquina de animações
    if (!noChao) {
      this.jogador.anims.play(`${this.tipoPersonagem}_jump`, true);
    } else if (esquerda || direita) {
      this.jogador.anims.play(`${this.tipoPersonagem}_run`, true);
    } else {
      this.jogador.anims.play(`${this.tipoPersonagem}_idle`, true);
    }
  }
}
