import Phaser from 'phaser';
import { parseCommand } from '../utils/CommandParser';
import { DialogueSystem } from '../utils/DialogueSystem';

export class MainScene extends Phaser.Scene {
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;

  // Totem 1 (Comporta Hidráulica)
  private totemBarrier!: Phaser.GameObjects.Image;
  private promptTextBarrier!: Phaser.GameObjects.Text;

  // Totem 2 (Física)
  private totemPhysics!: Phaser.GameObjects.Image;
  private promptTextPhysics!: Phaser.GameObjects.Text;

  private currentInteractingTotem: 'barrier' | 'physics' | null = null;

  private barriers!: Phaser.Physics.Arcade.StaticGroup;
  private barrier?: Phaser.Physics.Arcade.Sprite;
  private barrierCollider?: Phaser.Physics.Arcade.Collider;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private jumpKeys?: {
    w: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };
  private interactKey?: Phaser.Input.Keyboard.Key;
  private escKey?: Phaser.Input.Keyboard.Key;

  // Variáveis físicas do jogador
  private jumpForce: number = 450;
  private isRespawning: boolean = false;

  private isTerminalOpen: boolean = false;
  private terminalOverlay: HTMLElement | null = null;
  private terminalOutput: HTMLElement | null = null;
  private terminalInput: HTMLInputElement | null = null;

  private dialogueSystem!: DialogueSystem;

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#10141d');

    // 1. Expansão do Mundo da MainScene para 2560 pixels
    this.physics.world.setBounds(0, 0, 2560, 720);
    this.cameras.main.setBounds(0, 0, 2560, 720);

    // Marcador visual na margem segura após o abismo
    this.add
      .text(1650, 580, '✓ ZONA SEGURA: MARGEM OPOSTA ALCANCADA', {
        fontSize: '18px',
        color: '#00ff88',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.createGroundAndAbyss();
    this.createTotems();
    this.createPlayer();
    this.createHydraulicGate();
    this.setupControls();
    this.setupTerminal();
    this.setupDialogue();

    // Câmera segue o jogador suavemente
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  update(): void {
    if (!this.player || !this.player.body) return;

    // Se o diálogo estiver ativo, trava totalmente o jogador e esconde prompts
    if (this.dialogueSystem && this.dialogueSystem.isActive) {
      this.promptTextBarrier.setVisible(false);
      this.promptTextPhysics.setVisible(false);
      this.player.setVelocityX(0);
      return;
    }

    // Se o jogador cair no fundo do abismo
    if (this.player.y > 720) {
      this.handleSpikeHit();
      return;
    }

    // Checagem de proximidade dos totens
    const distBarrier = Math.abs(this.player.x - this.totemBarrier.x);
    const isNearBarrierTotem = distBarrier < 80;
    this.promptTextBarrier.setVisible(
      isNearBarrierTotem && !this.isTerminalOpen && Boolean(this.barrier)
    );

    const distPhysics = Math.abs(this.player.x - this.totemPhysics.x);
    const isNearPhysicsTotem = distPhysics < 80;
    this.promptTextPhysics.setVisible(isNearPhysicsTotem && !this.isTerminalOpen);

    // Identifica com qual totem o jogador está interagindo
    if (isNearPhysicsTotem) {
      this.currentInteractingTotem = 'physics';
    } else if (isNearBarrierTotem && this.barrier) {
      this.currentInteractingTotem = 'barrier';
    } else {
      this.currentInteractingTotem = null;
    }

    // Abrir terminal com tecla E quando próximo
    if (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      if (this.currentInteractingTotem && !this.isTerminalOpen) {
        this.openTerminal(this.currentInteractingTotem);
      }
    }

    // Fechar terminal com Escape no Phaser
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.isTerminalOpen) {
        this.closeTerminal();
      }
    }

    // Travar movimentação se o terminal estiver aberto
    if (this.isTerminalOpen) {
      this.player.setVelocityX(0);
      return;
    }

    // Movimentação horizontal
    const isLeftDown =
      (this.cursors?.left.isDown ?? false) ||
      (this.wasdKeys?.left.isDown ?? false);
    const isRightDown =
      (this.cursors?.right.isDown ?? false) ||
      (this.wasdKeys?.right.isDown ?? false);

    if (isLeftDown) {
      this.player.setVelocityX(-200);
    } else if (isRightDown) {
      this.player.setVelocityX(200);
    } else {
      this.player.setVelocityX(0);
    }

    // Pulo estilo Mega Man com força de pulo dinâmica
    const isJumpDown =
      (this.cursors?.up.isDown ?? false) ||
      (this.jumpKeys?.w.isDown ?? false) ||
      (this.jumpKeys?.space.isDown ?? false);

    const isGrounded =
      this.player.body.blocked.down || this.player.body.touching.down;

    if (isJumpDown && isGrounded) {
      this.player.setVelocityY(-this.jumpForce);
    }

    // Pulo variável: cortar velocidade vertical se o jogador soltar o botão durante a subida
    const cutThreshold = -Math.min(150, this.jumpForce / 3);
    if (!isJumpDown && this.player.body.velocity.y < cutThreshold) {
      this.player.setVelocityY(cutThreshold);
    }
  }

  private createGroundAndAbyss(): void {
    // Piso 1: X = 0 a 950 (largura 950, centro 475)
    if (!this.textures.exists('ground-section-1')) {
      const g = this.make.graphics();
      g.fillStyle(0x18202c, 1);
      g.fillRect(0, 0, 950, 40);
      g.fillStyle(0x00ff88, 1);
      g.fillRect(0, 0, 950, 3);
      g.generateTexture('ground-section-1', 950, 40);
      g.destroy();
    }

    // Piso 2: X = 1400 a 2560 (largura 1160, centro 1980)
    if (!this.textures.exists('ground-section-2')) {
      const g = this.make.graphics();
      g.fillStyle(0x18202c, 1);
      g.fillRect(0, 0, 1160, 40);
      g.fillStyle(0x00ff88, 1);
      g.fillRect(0, 0, 1160, 3);
      g.generateTexture('ground-section-2', 1160, 40);
      g.destroy();
    }

    // Textura dos espinhos vermelhos neon no abismo (X = 950 a 1400, largura 450)
    if (!this.textures.exists('spikes-abyss')) {
      const g = this.make.graphics();
      g.fillStyle(0xff1744, 1);
      const spikeW = 15;
      const count = 450 / spikeW;
      for (let i = 0; i < count; i++) {
        const x = i * spikeW;
        g.beginPath();
        g.moveTo(x, 20);
        g.lineTo(x + spikeW / 2, 0);
        g.lineTo(x + spikeW, 20);
        g.closePath();
        g.fillPath();
      }
      g.generateTexture('spikes-abyss', 450, 20);
      g.destroy();
    }

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(475, 700, 'ground-section-1');
    this.platforms.create(1980, 700, 'ground-section-2');

    this.spikes = this.physics.add.staticGroup();
    this.spikes.create(1175, 710, 'spikes-abyss');
  }

  private handleSpikeHit(): void {
    if (this.isRespawning) return;
    this.isRespawning = true;

    // Respawn imediato na última posição segura antes do abismo (X = 900, Y = 600)
    this.player.setPosition(900, 600);
    this.player.setVelocity(0, 0);

    // Efeito visual rápido de flash na câmera e piscar no player sem travar o jogo
    this.cameras.main.flash(180, 255, 30, 60);

    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      yoyo: true,
      repeat: 3,
      duration: 70,
      onComplete: () => {
        this.player.setAlpha(1);
        this.isRespawning = false;
      },
    });
  }

  private createTotems(): void {
    if (!this.textures.exists('totem')) {
      const g = this.make.graphics();
      g.fillStyle(0x00ff66, 1);
      g.fillRect(0, 0, 32, 48);
      g.fillStyle(0x0a1410, 1);
      g.fillRect(4, 6, 24, 20);
      g.fillStyle(0x00ff66, 0.9);
      g.fillRect(6, 10, 12, 2);
      g.fillRect(6, 14, 16, 2);
      g.fillRect(6, 18, 8, 2);
      g.generateTexture('totem', 32, 48);
      g.destroy();
    }

    if (!this.textures.exists('totem-physics')) {
      const g = this.make.graphics();
      g.fillStyle(0x00e5ff, 1);
      g.fillRect(0, 0, 32, 48);
      g.fillStyle(0x051520, 1);
      g.fillRect(4, 6, 24, 20);
      g.fillStyle(0x00e5ff, 0.9);
      g.fillRect(6, 10, 14, 2);
      g.fillRect(6, 14, 10, 2);
      g.fillRect(6, 18, 16, 2);
      g.generateTexture('totem-physics', 32, 48);
      g.destroy();
    }

    // Totem 1: Comporta Hidráulica (X = 520, Y = 656)
    this.totemBarrier = this.add.image(520, 656, 'totem');
    this.promptTextBarrier = this.add
      .text(520, 615, '[E] DESTRAVAR COMPORTA', {
        fontSize: '16px',
        color: '#ffee00',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Totem 2: Puzzle de Física (X = 920, Y = 656)
    this.totemPhysics = this.add.image(920, 656, 'totem-physics');
    this.promptTextPhysics = this.add
      .text(920, 615, '[E] HACKEAR FÍSICA', {
        fontSize: '16px',
        color: '#00e5ff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  private createHydraulicGate(): void {
    // Comporta de metal industrial pesado com faixas de aviso amarelo/preto
    if (!this.textures.exists('hydraulic-gate')) {
      const g = this.make.graphics();
      const w = 36;
      const h = 680;

      // Base cinza escuro industrial
      g.fillStyle(0x232730, 1);
      g.fillRect(0, 0, w, h);

      // Bordas reforçadas de metal/chumbo
      g.fillStyle(0x3e4756, 1);
      g.fillRect(0, 0, 4, h);
      g.fillRect(w - 4, 0, 4, h);

      // Placas e rebites horizontais
      for (let y = 0; y < h; y += 60) {
        g.fillStyle(0x181a20, 1);
        g.fillRect(4, y, w - 8, 4);
        g.fillStyle(0x8a97a8, 1);
        g.fillCircle(8, y + 10, 2);
        g.fillCircle(w - 8, y + 10, 2);
      }

      // Faixas de aviso de perigo amarelo/preto (Hazard Stripes)
      const drawStripes = (startY: number, sectionHeight: number) => {
        g.fillStyle(0x111827, 1);
        g.fillRect(4, startY, w - 8, sectionHeight);
        g.fillStyle(0xfacc15, 1);
        for (let sy = startY - 20; sy < startY + sectionHeight; sy += 16) {
          g.beginPath();
          g.moveTo(4, sy);
          g.lineTo(w - 4, sy + 12);
          g.lineTo(w - 4, sy + 18);
          g.lineTo(4, sy + 6);
          g.closePath();
          g.fillPath();
        }
      };

      drawStripes(40, 70);
      drawStripes(h - 120, 70);

      g.generateTexture('hydraulic-gate', w, h);
      g.destroy();
    }

    this.barriers = this.physics.add.staticGroup();
    // Posição X = 650, centro Y = 340 (bloqueia completamente do topo Y = 0 até o chão Y = 680)
    this.barrier = this.barriers.create(650, 340, 'hydraulic-gate') as Phaser.Physics.Arcade.Sprite;
    this.barrierCollider = this.physics.add.collider(this.player, this.barriers);
  }

  private disableBarrier(): void {
    // Destrói imediatamente a colisão física para permitir passagem
    if (this.barrierCollider) {
      this.barrierCollider.destroy();
      this.barrierCollider = undefined;
    }
    this.promptTextBarrier.setVisible(false);

    if (this.barrier) {
      // Animação da comporta subindo para o teto com tween vertical
      this.tweens.add({
        targets: this.barrier,
        y: -340,
        duration: 900,
        ease: 'Power2',
        onComplete: () => {
          if (this.barrier) {
            this.barrier.destroy();
            this.barrier = undefined;
          }
          if (this.barriers) {
            this.barriers.clear(true, true);
          }
        },
      });
    }
  }

  private createPlayer(): void {
    if (!this.textures.exists('player')) {
      const g = this.make.graphics();
      g.fillStyle(0x00e5ff, 1);
      g.fillRoundedRect(0, 0, 32, 48, 4);
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(6, 10, 20, 6);
      g.generateTexture('player', 32, 48);
      g.destroy();
    }

    this.player = this.physics.add.sprite(100, 500, 'player');
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms);

    // Detecção de contato com espinhos
    this.physics.add.overlap(this.player, this.spikes, () => {
      this.handleSpikeHit();
    });
  }

  private setupControls(): void {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.jumpKeys = {
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };
      this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }
  }

  private setupDialogue(): void {
    this.dialogueSystem = new DialogueSystem();

    this.player.setVelocityX(0);
    this.dialogueSystem.startDialogue([
      {
        speaker: 'O ESTAGIÁRIO FANTASMA',
        avatar: '👻',
        text: 'Ei! Carne nova no ferro-velho! Cuidado onde pisa, o chão aqui é 90% cabos desencapados e 10% código descartado por alucinação de IA.',
      },
      {
        speaker: 'O ESTAGIÁRIO FANTASMA',
        avatar: '👻',
        text: 'O Mega Brain trancou a comporta hidráulica logo à frente. O estagiário da IA declarou a chave como uma string em vez de inteiro e foi tomar café.',
      },
      {
        speaker: 'O ESTAGIÁRIO FANTASMA',
        avatar: '👻',
        text: 'Aperte [E] no terminal da esteira. Se você não souber a diferença entre um texto e um número, estamos todos fritos.',
      },
    ]);
  }

  private setupTerminal(): void {
    this.terminalOverlay = document.getElementById('terminal-overlay');
    this.terminalOutput = document.getElementById('terminal-output');
    this.terminalInput = document.getElementById('terminal-input') as HTMLInputElement | null;

    if (this.terminalInput) {
      this.terminalInput.addEventListener('keydown', (e: KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          this.closeTerminal();
        } else if (e.key === 'Enter') {
          this.handleCommandSubmit();
        }
      });
    }

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isTerminalOpen) {
        this.closeTerminal();
      }
    });
  }

  private handleCommandSubmit(): void {
    if (!this.terminalInput) return;
    const value = this.terminalInput.value;
    if (!value.trim()) return;

    const result = parseCommand(value, {
      totem: this.currentInteractingTotem ?? undefined,
    });

    if (this.terminalOutput) {
      const cmdElement = document.createElement('div');
      cmdElement.className = 'log-line command';
      cmdElement.textContent = `> ${value}`;
      this.terminalOutput.appendChild(cmdElement);

      const respElement = document.createElement('div');
      respElement.className = `log-line ${result.success ? 'success' : 'error'}`;
      respElement.textContent = result.message;
      this.terminalOutput.appendChild(respElement);

      this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }

    this.terminalInput.value = '';

    if (result.success) {
      if (result.action === 'DISABLE_BARRIER') {
        this.disableBarrier();
      } else if (result.action === 'SET_GRAVITY' && result.value !== undefined) {
        this.physics.world.gravity.y = result.value;
      } else if (result.action === 'SET_JUMP_FORCE' && result.value !== undefined) {
        this.jumpForce = result.value;
      }

      setTimeout(() => {
        this.closeTerminal();
      }, 1000);
    }
  }

  private openTerminal(totemType: 'barrier' | 'physics'): void {
    if (this.dialogueSystem && this.dialogueSystem.isActive) return;

    this.isTerminalOpen = true;
    this.player.setVelocityX(0);

    if (this.terminalOverlay) {
      this.terminalOverlay.classList.remove('hidden');
    }

    // Logs contextuais específicos para cada totem
    if (this.terminalOutput) {
      if (totemType === 'barrier') {
        const lines = [
          '=== SISTEMA HIDRÁULICO DO PISTÃO ===',
          "STATUS: chave_seguranca = '42' [TIPO DETECTADO: STRING/TEXTO]",
          'AVISO: O sensor de peso exige um INTEIRO (number/int) para calcular a massa do contrapeso. Strings causam travamento mecânico.',
          "> DICA DO ESTAGIÁRIO: Remova as aspas para virar número ou converta o tipo! (ex: chave = 42 ou int('42'))",
        ];
        lines.forEach((lineText) => {
          const info = document.createElement('div');
          info.className = 'log-line info';
          info.textContent = lineText;
          this.terminalOutput?.appendChild(info);
        });
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
      } else if (totemType === 'physics') {
        const info = document.createElement('div');
        info.className = 'log-line info';
        info.textContent =
          'PROPRIEDADES DO SISTEMA: gravidade_mundo = 600. O abismo tem 450px de largura. Você precisa alterar a gravidade ou a forca_pulo para conseguir saltar.';
        this.terminalOutput.appendChild(info);
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
      }
    }

    if (this.terminalInput) {
      setTimeout(() => {
        this.terminalInput?.focus();
      }, 50);
    }
  }

  private closeTerminal(): void {
    this.isTerminalOpen = false;

    if (this.terminalOverlay) {
      this.terminalOverlay.classList.add('hidden');
    }
    if (this.terminalInput) {
      this.terminalInput.value = '';
      this.terminalInput.blur();
    }
  }
}
