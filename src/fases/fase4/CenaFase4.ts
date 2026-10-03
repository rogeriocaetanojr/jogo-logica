import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import { GerenciadorEstado, type TipoPersonagem } from '../../nucleo/GerenciadorEstado';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase4 } from './InterpretadorFase4';

/**
 * CenaFase4: Usina de Processamento Paralelo e Funções (Integrante 4).
 */
export class CenaFase4 extends CenaBase {
  private plataformas!: Phaser.Physics.Arcade.StaticGroup;
  private jogador!: Phaser.Physics.Arcade.Sprite;
  private tipoPersonagem: TipoPersonagem = 'alvares';
  private totemFuncao!: Phaser.GameObjects.Image;
  private textoPrompt!: Phaser.GameObjects.Text;
  private geradorEnergia!: Phaser.Physics.Arcade.Sprite;
  private colisorGerador?: Phaser.Physics.Arcade.Collider;
  private isResolvido: boolean = false;

  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclaInteragir?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('CenaFase4', 'fase4');
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;

    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor('#080d16');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.criarHUDSuperior('FASE 4 // MÓDULOS E FUNÇÕES REUTILIZÁVEIS');
    this.criarCenario(width, height);
    this.criarPlataformas(width, height);
    this.criarGerador(width, height);
    this.criarTotem(width, height);
    this.criarJogador();
    this.configurarControles();
    this.configurarTerminal();
    this.criarEfeitoCRT(width, height, 0.03);

    this.comunicador.iniciarDialogo([
      {
        falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 4',
        texto:
          'Setor 4: Usina de Processamento Paralelo.',
      },
      {
        falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 4',
        texto:
          'O gerador de campo precisa de uma função matemática declarada para duplicar a frequência e estabilizar o núcleo.',
      },
    ]);
  }

  private criarCenario(width: number, height: number): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x080d16, 0x080d16, 0x121b2d, 0x121b2d, 1);
    g.fillRect(0, 0, width, height);

    g.lineStyle(1, 0x38bdf8, 0.15);
    for (let x = 70; x < width; x += 120) {
      g.beginPath();
      g.moveTo(x, 60);
      g.lineTo(x, 660);
      g.strokePath();
    }
  }

  private criarPlataformas(width: number, height: number): void {
    this.plataformas = this.physics.add.staticGroup();

    if (!this.textures.exists('chao-fase4')) {
      const g = this.make.graphics();
      g.fillStyle(0x0f172a, 1);
      g.fillRect(0, 0, width, 50);
      g.fillStyle(0x38bdf8, 0.6);
      g.fillRect(0, 0, width, 4);
      g.generateTexture('chao-fase4', width, 50);
      g.destroy();
    }
    this.plataformas.create(width / 2, height - 25, 'chao-fase4');

    if (!this.textures.exists('plat-fase4')) {
      const g = this.make.graphics();
      g.fillStyle(0x1e293b, 1);
      g.fillRect(0, 0, 210, 24);
      g.fillStyle(0x7dd3fc, 0.5);
      g.fillRect(0, 0, 210, 3);
      g.generateTexture('plat-fase4', 210, 24);
      g.destroy();
    }
    this.plataformas.create(360, 480, 'plat-fase4');
    this.plataformas.create(700, 370, 'plat-fase4');
  }

  private criarGerador(width: number, height: number): void {
    if (!this.textures.exists('gerador-fase4')) {
      const g = this.make.graphics();
      g.fillStyle(0x0284c7, 0.85);
      g.fillRect(0, 0, 32, 210);
      g.generateTexture('gerador-fase4', 32, 210);
      g.destroy();
    }

    this.geradorEnergia = this.physics.add.sprite(width - 150, height - 155, 'gerador-fase4');
    (this.geradorEnergia.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.geradorEnergia.body as Phaser.Physics.Arcade.Body).allowGravity = false;
  }

  private criarTotem(_width: number, _height: number): void {
    if (!this.textures.exists('totem-fase4')) {
      const g = this.make.graphics();
      g.fillStyle(0x0f172a, 1);
      g.fillRect(0, 0, 48, 64);
      g.fillStyle(0x38bdf8, 0.8);
      g.fillRect(8, 8, 32, 24);
      g.generateTexture('totem-fase4', 48, 64);
      g.destroy();
    }

    this.totemFuncao = this.add.image(360, 436, 'totem-fase4');

    this.textoPrompt = this.add.text(360, 385, '[E] CONSOLE DE SUB-ROTINAS', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#38bdf8',
      backgroundColor: '#030712',
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
    this.colisorGerador = this.physics.add.collider(this.jogador, this.geradorEnergia);
  }

  private configurarControles(): void {
    if (this.input.keyboard) {
      this.cursores = this.input.keyboard.createCursorKeys();
      this.teclaInteragir = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }
  }

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFase4);
    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      if (resultado.acao === 'CONCLUIR_FASE4') {
        this.desativarGerador();
        setTimeout(() => {
          this.terminal.fechar();
        }, 1200);
      }
    });
  }

  private desativarGerador(): void {
    if (this.isResolvido) return;
    this.isResolvido = true;

    if (this.colisorGerador) {
      this.physics.world.removeCollider(this.colisorGerador);
    }

    this.tweens.add({
      targets: this.geradorEnergia,
      alpha: 0,
      scaleY: 0,
      duration: 600,
      onComplete: () => {
        this.geradorEnergia.destroy();
        this.concluirFaseAtual();

        this.comunicador.iniciarDialogo(
          [
            {
              falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 4',
              texto:
                'Sub-rotina compilada! O gerador de frequência estabilizou e a Fase 4 foi concluída.',
            },
            {
              falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 4',
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
      this.totemFuncao.x,
      this.totemFuncao.y
    );
    const perto = dist < 70 && !this.isResolvido;
    this.textoPrompt.setVisible(perto);

    if (perto && this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir)) {
      this.jogador.setVelocityX(0);
      this.terminal.abrir({
        titulo: 'CONSOLE DE SUB-ROTINAS E FUNÇÕES // SETOR 4',
        linhasIniciais: [
          '=== SISTEMA DE COMPENSAÇÃO DE FREQUÊNCIA ===',
          '> ENTRADA ATUAL: freq (Frequência Base)',
          '> DIRETRIZ: Declare uma função que receba a frequência e retorne o dobro do seu valor.',
          '> EXEMPLO: def compensar(freq): return freq * 2',
          '> Digite a declaração de função:',
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
