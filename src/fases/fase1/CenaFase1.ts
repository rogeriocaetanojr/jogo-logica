import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import { GerenciadorEstado, type TipoPersonagem } from '../../nucleo/GerenciadorEstado';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase1 } from './InterpretadorFase1';

/**
 * CenaFase1: Setor de Triagem Booleana e Portas Lógicas (Integrante 1).
 */
export class CenaFase1 extends CenaBase {
  private plataformas!: Phaser.Physics.Arcade.StaticGroup;
  private jogador!: Phaser.Physics.Arcade.Sprite;
  private tipoPersonagem: TipoPersonagem = 'alvares';
  private totemLogico!: Phaser.GameObjects.Image;
  private textoPrompt!: Phaser.GameObjects.Text;
  private portaLaser!: Phaser.Physics.Arcade.Sprite;
  private colisorPorta?: Phaser.Physics.Arcade.Collider;
  private isPortaDestravada: boolean = false;

  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclaInteragir?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('CenaFase1', 'fase1');
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;

    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor('#060b14');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.criarHUDSuperior('FASE 1 // CONDICIONAIS E PORTAS LÓGICAS');
    this.criarCenario(width, height);
    this.criarPlataformas(width, height);
    this.criarPortaLaser(width, height);
    this.criarTotem(width, height);
    this.criarJogador();
    this.configurarControles();
    this.configurarTerminal();
    this.criarEfeitoCRT(width, height, 0.03);

    this.comunicador.iniciarDialogo([
      {
        falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 1',
        texto:
          'Bem-vindo ao Setor 1. A comporta de contenção à direita está selada por uma trava lógica.',
      },
      {
        falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 1',
        texto:
          'O Sensor A está emitindo sinal positivo, mas o Sensor B está em curto. Use uma estrutura condicional no totem para desarmar a trava!',
      },
    ]);
  }

  private criarCenario(width: number, height: number): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x060b14, 0x060b14, 0x0c1626, 0x0c1626, 1);
    g.fillRect(0, 0, width, height);

    // Linhas de circuito iluminadas em ciano
    g.lineStyle(1, 0x00e5ff, 0.15);
    for (let x = 60; x < width; x += 120) {
      g.beginPath();
      g.moveTo(x, 100);
      g.lineTo(x, 620);
      g.strokePath();
    }
  }

  private criarPlataformas(width: number, height: number): void {
    this.plataformas = this.physics.add.staticGroup();

    // Chão principal
    if (!this.textures.exists('chao-fase1')) {
      const g = this.make.graphics();
      g.fillStyle(0x0f1c2e, 1);
      g.fillRect(0, 0, width, 50);
      g.fillStyle(0x00e5ff, 0.6);
      g.fillRect(0, 0, width, 4);
      g.generateTexture('chao-fase1', width, 50);
      g.destroy();
    }
    this.plataformas.create(width / 2, height - 25, 'chao-fase1');

    // Plataformas elevadas
    if (!this.textures.exists('plat-fase1')) {
      const g = this.make.graphics();
      g.fillStyle(0x132238, 1);
      g.fillRect(0, 0, 220, 24);
      g.fillStyle(0x00ff66, 0.5);
      g.fillRect(0, 0, 220, 3);
      g.generateTexture('plat-fase1', 220, 24);
      g.destroy();
    }
    this.plataformas.create(350, 480, 'plat-fase1');
    this.plataformas.create(650, 360, 'plat-fase1');
  }

  private criarPortaLaser(width: number, height: number): void {
    if (!this.textures.exists('porta-laser-fase1')) {
      const g = this.make.graphics();
      g.fillStyle(0xef4444, 0.85);
      g.fillRect(0, 0, 24, 200);
      g.generateTexture('porta-laser-fase1', 24, 200);
      g.destroy();
    }

    this.portaLaser = this.physics.add.sprite(width - 140, height - 150, 'porta-laser-fase1');
    (this.portaLaser.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.portaLaser.body as Phaser.Physics.Arcade.Body).allowGravity = false;
  }

  private criarTotem(_width: number, _height: number): void {
    if (!this.textures.exists('totem-fase1')) {
      const g = this.make.graphics();
      g.fillStyle(0x091420, 1);
      g.fillRect(0, 0, 48, 64);
      g.fillStyle(0x00e5ff, 0.8);
      g.fillRect(8, 8, 32, 24);
      g.generateTexture('totem-fase1', 48, 64);
      g.destroy();
    }

    this.totemLogico = this.add.image(350, 436, 'totem-fase1');

    this.textoPrompt = this.add.text(350, 385, '[E] CONECTAR AO CIRCUITO', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#00e5ff',
      backgroundColor: '#040810',
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
    this.colisorPorta = this.physics.add.collider(this.jogador, this.portaLaser);
  }

  private configurarControles(): void {
    if (this.input.keyboard) {
      this.cursores = this.input.keyboard.createCursorKeys();
      this.teclaInteragir = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }
  }

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFase1);
    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      if (resultado.acao === 'DESTRAVAR_PORTA_FASE1') {
        this.destravarPorta();
        setTimeout(() => {
          this.terminal.fechar();
        }, 1200);
      }
    });
  }

  private destravarPorta(): void {
    if (this.isPortaDestravada) return;
    this.isPortaDestravada = true;

    if (this.colisorPorta) {
      this.physics.world.removeCollider(this.colisorPorta);
    }

    this.tweens.add({
      targets: this.portaLaser,
      alpha: 0,
      scaleY: 0,
      duration: 600,
      onComplete: () => {
        this.portaLaser.destroy();
        this.concluirFaseAtual();

        this.comunicador.iniciarDialogo(
          [
            {
              falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 1',
              texto:
                'Circuito estabilizado! As comportas foram liberadas e a Fase 1 foi concluída com sucesso!',
            },
            {
              falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 1',
              texto: 'Pressione ENTER ou ESC para retornar ao Hub e acessar o Setor 2.',
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

    // Proximidade com o Totem
    const dist = Phaser.Math.Distance.Between(
      this.jogador.x,
      this.jogador.y,
      this.totemLogico.x,
      this.totemLogico.y
    );
    const pertoDoTotem = dist < 70 && !this.isPortaDestravada;
    this.textoPrompt.setVisible(pertoDoTotem);

    if (pertoDoTotem && this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir)) {
      this.abrirTerminalFase1();
    }

    // Movimentação do Jogador
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

  private abrirTerminalFase1(): void {
    this.jogador.setVelocityX(0);
    this.terminal.abrir({
      titulo: 'PAINEL DE COMUTAÇÃO LÓGICA // SETOR 1',
      linhasIniciais: [
        '=== ANALISADOR DE CIRCUITOS BOOLEANOS ===',
        '> ESTADO DOS SENSORES:',
        '>   sensor_a = True   (Ativo)',
        '>   sensor_b = False  (Danificado / Ruído)',
        '> DIRETRIZ: Ative a trava lógica apenas quando o Sensor A for VERDADEIRO e o Sensor B for FALSO.',
        "> INSTRUÇÃO REQUERIDA: if sensor_a and not sensor_b: abrir_trava()",
        '> Digite a instrução condicional:',
      ],
    });
  }
}
