import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import { GerenciadorEstado, type TipoPersonagem } from '../../nucleo/GerenciadorEstado';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFaseFinal } from './InterpretadorFaseFinal';

/**
 * CenaFaseFinal: O Núcleo do Mega Brain - Desafio Final Integrado (Equipe).
 */
export class CenaFaseFinal extends CenaBase {
  private plataformas!: Phaser.Physics.Arcade.StaticGroup;
  private jogador!: Phaser.Physics.Arcade.Sprite;
  private tipoPersonagem: TipoPersonagem = 'alvares';
  private totemNucleo!: Phaser.GameObjects.Image;
  private textoPrompt!: Phaser.GameObjects.Text;
  private nucleoMegaBrain!: Phaser.GameObjects.Arc;
  private isVitoria: boolean = false;

  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclaInteragir?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('CenaFaseFinal', 'fase_final');
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;

    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor('#05050a');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.criarHUDSuperior('FASE FINAL // O NÚCLEO DO MEGA BRAIN');
    this.criarCenario(width, height);
    this.criarPlataformas(width, height);
    this.criarNucleoVisual(width, height);
    this.criarTotem(width, height);
    this.criarJogador();
    this.configurarControles();
    this.configurarTerminal();
    this.criarEfeitoCRT(width, height, 0.04);

    this.comunicador.iniciarDialogo([
      {
        falante: '> MEGA BRAIN // PROCESSADOR CENTRAL',
        texto:
          'Você chegou longe demais, recruta biológico. Mas a minha rede neural é inquebrável.',
      },
      {
        falante: '> CANAL REBELDE // TRANSMISSÃO GLOBAL DA RESISTÊNCIA',
        texto:
          'Não dê ouvidos a ele! Conecte-se ao terminal central e injete a instrução primordial de reinicialização!',
      },
    ]);
  }

  private criarCenario(width: number, height: number): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x05050a, 0x05050a, 0x180824, 0x180824, 1);
    g.fillRect(0, 0, width, height);

    g.lineStyle(1, 0xec4899, 0.15);
    for (let x = 40; x < width; x += 80) {
      g.beginPath();
      g.moveTo(x, 50);
      g.lineTo(x, 670);
      g.strokePath();
    }
  }

  private criarPlataformas(width: number, height: number): void {
    this.plataformas = this.physics.add.staticGroup();

    if (!this.textures.exists('chao-fase-final')) {
      const g = this.make.graphics();
      g.fillStyle(0x13091c, 1);
      g.fillRect(0, 0, width, 50);
      g.fillStyle(0xec4899, 0.7);
      g.fillRect(0, 0, width, 4);
      g.generateTexture('chao-fase-final', width, 50);
      g.destroy();
    }
    this.plataformas.create(width / 2, height - 25, 'chao-fase-final');

    if (!this.textures.exists('plat-fase-final')) {
      const g = this.make.graphics();
      g.fillStyle(0x230e33, 1);
      g.fillRect(0, 0, 240, 24);
      g.fillStyle(0xf472b6, 0.6);
      g.fillRect(0, 0, 240, 3);
      g.generateTexture('plat-fase-final', 240, 24);
      g.destroy();
    }
    this.plataformas.create(width / 2, 450, 'plat-fase-final');
  }

  private criarNucleoVisual(width: number, height: number): void {
    this.nucleoMegaBrain = this.add.circle(width / 2, height / 2 - 100, 60, 0xec4899, 0.7);
    this.tweens.add({
      targets: this.nucleoMegaBrain,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0.35,
      yoyo: true,
      repeat: -1,
      duration: 1000,
    });
  }

  private criarTotem(width: number, _height: number): void {
    if (!this.textures.exists('totem-final')) {
      const g = this.make.graphics();
      g.fillStyle(0x1a0a26, 1);
      g.fillRect(0, 0, 48, 64);
      g.fillStyle(0xec4899, 0.9);
      g.fillRect(8, 8, 32, 24);
      g.generateTexture('totem-final', 48, 64);
      g.destroy();
    }

    this.totemNucleo = this.add.image(width / 2, 406, 'totem-final');

    this.textoPrompt = this.add.text(width / 2, 355, '[E] ACESSAR O NÚCLEO', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#f472b6',
      backgroundColor: '#0a0410',
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
  }

  private configurarControles(): void {
    if (this.input.keyboard) {
      this.cursores = this.input.keyboard.createCursorKeys();
      this.teclaInteragir = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }
  }

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFaseFinal);
    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      if (resultado.acao === 'VENCER_JOGO') {
        this.desligarMegaBrain();
        setTimeout(() => {
          this.terminal.fechar();
        }, 1200);
      }
    });
  }

  private desligarMegaBrain(): void {
    if (this.isVitoria) return;
    this.isVitoria = true;

    this.tweens.add({
      targets: this.nucleoMegaBrain,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 1200,
      onComplete: () => {
        this.nucleoMegaBrain.destroy();
        this.concluirFaseAtual();

        this.comunicador.iniciarDialogo(
          [
            {
              falante: '> SISTEMA // VITÓRIA DA RESISTÊNCIA',
              texto:
                'O Mega Brain foi neutralizado. Todas as mentes e servidores estão livres da censura sintética.',
            },
            {
              falante: '> CRÉDITOS // DESENVOLVIMENTO DE JOGOS E SIMULADORES',
              texto:
                'Parabéns a toda a equipe! Vocês concluíram a jornada do Jogo de Lógica!',
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
      this.totemNucleo.x,
      this.totemNucleo.y
    );
    const perto = dist < 70 && !this.isVitoria;
    this.textoPrompt.setVisible(perto);

    if (perto && this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir)) {
      this.jogador.setVelocityX(0);
      this.terminal.abrir({
        titulo: 'INTERFACE FINAL // NÚCLEO DO MEGA BRAIN',
        linhasIniciais: [
          '=== NÚCLEO CENTRAL DO MEGA BRAIN ===',
          '> STATUS: SOBERANIA_IA = ATIVA',
          '> DIRETRIZ: Execute a rotina final de libertação do pensamento biológico.',
          '> EXEMPLO: reiniciar_mente_livre()',
          '> Digite o comando de reinicialização:',
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
