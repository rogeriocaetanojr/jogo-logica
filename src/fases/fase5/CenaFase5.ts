import Phaser from 'phaser';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { interpretarComandoFase5 } from './InterpretadorFase5';

/**
 * CenaFase5: Labirinto de Roteamento e Algoritmos de Otimização (Integrante 5).
 */
export class CenaFase5 extends CenaBase {
  private plataformas!: Phaser.Physics.Arcade.StaticGroup;
  private jogador!: Phaser.Physics.Arcade.Sprite;
  private totemRoteador!: Phaser.GameObjects.Image;
  private textoPrompt!: Phaser.GameObjects.Text;
  private firewallBarreira!: Phaser.Physics.Arcade.Sprite;
  private colisorFirewall?: Phaser.Physics.Arcade.Collider;
  private isResolvido: boolean = false;

  private cursores?: Phaser.Types.Input.Keyboard.CursorKeys;
  private teclaInteragir?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('CenaFase5', 'fase5');
  }

  create(): void {
    super.create();
    const { width, height } = this.scale;

    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setBackgroundColor('#10070c');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.criarHUDSuperior('FASE 5 // ALGORITMOS DE BUSCA E OTIMIZAÇÃO');
    this.criarCenario(width, height);
    this.criarPlataformas(width, height);
    this.criarFirewall(width, height);
    this.criarTotem(width, height);
    this.criarJogador();
    this.configurarControles();
    this.configurarTerminal();
    this.criarEfeitoCRT(width, height, 0.03);

    this.comunicador.iniciarDialogo([
      {
        falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 5',
        texto:
          'Setor 5: Labirinto de Roteamento.',
      },
      {
        falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 5',
        texto:
          'O firewall de segurança filtra pacotes de alta latência. Use um algoritmo para selecionar a menor rota e burlar a barreira.',
      },
    ]);
  }

  private criarCenario(width: number, height: number): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x10070c, 0x10070c, 0x220c18, 0x220c18, 1);
    g.fillRect(0, 0, width, height);

    g.lineStyle(1, 0xf43f5e, 0.15);
    for (let x = 60; x < width; x += 110) {
      g.beginPath();
      g.moveTo(x, 70);
      g.lineTo(x, 650);
      g.strokePath();
    }
  }

  private criarPlataformas(width: number, height: number): void {
    this.plataformas = this.physics.add.staticGroup();

    if (!this.textures.exists('chao-fase5')) {
      const g = this.make.graphics();
      g.fillStyle(0x1c0d16, 1);
      g.fillRect(0, 0, width, 50);
      g.fillStyle(0xf43f5e, 0.6);
      g.fillRect(0, 0, width, 4);
      g.generateTexture('chao-fase5', width, 50);
      g.destroy();
    }
    this.plataformas.create(width / 2, height - 25, 'chao-fase5');

    if (!this.textures.exists('plat-fase5')) {
      const g = this.make.graphics();
      g.fillStyle(0x2c1524, 1);
      g.fillRect(0, 0, 210, 24);
      g.fillStyle(0xfb7185, 0.5);
      g.fillRect(0, 0, 210, 3);
      g.generateTexture('plat-fase5', 210, 24);
      g.destroy();
    }
    this.plataformas.create(370, 480, 'plat-fase5');
    this.plataformas.create(710, 370, 'plat-fase5');
  }

  private criarFirewall(width: number, height: number): void {
    if (!this.textures.exists('firewall-fase5')) {
      const g = this.make.graphics();
      g.fillStyle(0xe11d48, 0.85);
      g.fillRect(0, 0, 30, 210);
      g.generateTexture('firewall-fase5', 30, 210);
      g.destroy();
    }

    this.firewallBarreira = this.physics.add.sprite(width - 140, height - 155, 'firewall-fase5');
    (this.firewallBarreira.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.firewallBarreira.body as Phaser.Physics.Arcade.Body).allowGravity = false;
  }

  private criarTotem(_width: number, _height: number): void {
    if (!this.textures.exists('totem-fase5')) {
      const g = this.make.graphics();
      g.fillStyle(0x1f0e1a, 1);
      g.fillRect(0, 0, 48, 64);
      g.fillStyle(0xf43f5e, 0.8);
      g.fillRect(8, 8, 32, 24);
      g.generateTexture('totem-fase5', 48, 64);
      g.destroy();
    }

    this.totemRoteador = this.add.image(370, 436, 'totem-fase5');

    this.textoPrompt = this.add.text(370, 385, '[E] ROTEADOR OTIMIZADO', {
      fontFamily: 'Consolas, Courier New, monospace',
      fontSize: '13px',
      color: '#fb7185',
      backgroundColor: '#10070c',
      padding: { x: 6, y: 3 },
    });
    this.textoPrompt.setOrigin(0.5);
    this.textoPrompt.setVisible(false);
  }

  private criarJogador(): void {
    this.jogador = this.physics.add.sprite(120, 580, 'player');
    this.jogador.setCollideWorldBounds(true);

    this.physics.add.collider(this.jogador, this.plataformas);
    this.colisorFirewall = this.physics.add.collider(this.jogador, this.firewallBarreira);
  }

  private configurarControles(): void {
    if (this.input.keyboard) {
      this.cursores = this.input.keyboard.createCursorKeys();
      this.teclaInteragir = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }
  }

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFase5);
    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      if (resultado.acao === 'CONCLUIR_FASE5') {
        this.desativarFirewall();
        setTimeout(() => {
          this.terminal.fechar();
        }, 1200);
      }
    });
  }

  private desativarFirewall(): void {
    if (this.isResolvido) return;
    this.isResolvido = true;

    if (this.colisorFirewall) {
      this.physics.world.removeCollider(this.colisorFirewall);
    }

    this.tweens.add({
      targets: this.firewallBarreira,
      alpha: 0,
      scaleY: 0,
      duration: 600,
      onComplete: () => {
        this.firewallBarreira.destroy();
        this.concluirFaseAtual();

        this.comunicador.iniciarDialogo(
          [
            {
              falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 5',
              texto:
                'Firewall ultrapassado! O caminho para o Núcleo do Mega Brain está livre!',
            },
            {
              falante: '> CANAL REBELDE // INTERCEPTAÇÃO: INTEGRANTE 5',
              texto: 'Pressione ENTER ou ESC para retornar ao Hub Central e encarar a Fase Final.',
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
      this.totemRoteador.x,
      this.totemRoteador.y
    );
    const perto = dist < 70 && !this.isResolvido;
    this.textoPrompt.setVisible(perto);

    if (perto && this.teclaInteragir && Phaser.Input.Keyboard.JustDown(this.teclaInteragir)) {
      this.jogador.setVelocityX(0);
      this.terminal.abrir({
        titulo: 'ROTEADOR DE PACOTES CRÍTICOS // SETOR 5',
        linhasIniciais: [
          '=== TABELA DE LATÊNCIAS DE ROTA ===',
          '> rotas = [14, 8, 22]',
          '> DIRETRIZ: Calcule a menor latência usando min() para contornar o firewall do setor.',
          '> EXEMPLO: rota = min([14, 8, 22])',
          '> Digite a instrução de busca:',
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
