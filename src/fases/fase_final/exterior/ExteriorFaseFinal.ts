import Phaser from 'phaser';
import { COR, hexNum, texturaBrilho } from '../ArteFaseFinal';
import { desenharRaio } from '../ClimaFaseFinal';
import { ESCALA_ARTE, EXTERIOR_FASE_FINAL, PAN_TORRE_FASE_FINAL } from '../constantesFaseFinal';
import { TelaoFaseFinal } from '../TelaoFaseFinal';
import { TEX_EXTERIOR, gerarTexturasExterior } from './TexturasExterior';

const E = EXTERIOR_FASE_FINAL;
const S = ESCALA_ARTE;

/**
 * Cenário da rua em frente à Mega Brain Tower: céu, skyline em parallax, nuvens de tempestade,
 * a torre com o logo, fachadas com telões, postes, guarita, terminal do termo e a porta.
 * Também faz o plano de abertura (pan vertical da câmera até o topo da torre).
 */
export class ExteriorFaseFinal {
  /** Chão da rua e parede invisível da porta fechada (colidem com o jogador). */
  public readonly solidos: Phaser.Physics.Arcade.StaticGroup;
  public readonly totemTermo: Phaser.GameObjects.Sprite;
  public portaAberta: boolean = false;

  private readonly cena: Phaser.Scene;
  private readonly barreiraPorta: Phaser.GameObjects.Zone;
  private readonly folhaEsquerda: Phaser.GameObjects.Image;
  private readonly folhaDireita: Phaser.GameObjects.Image;
  private readonly brilhoLogo: Phaser.GameObjects.Image;
  private readonly luzAntena: Phaser.GameObjects.Image;
  private readonly brilhoSaguao: Phaser.GameObjects.Image;
  private readonly raioTorre: Phaser.GameObjects.Graphics;
  private readonly teloes: TelaoFaseFinal[] = [];

  // Plano de abertura
  private panAtivo: boolean = false;
  private aoTerminarPan?: () => void;
  private readonly textoPular: Phaser.GameObjects.Text;

  constructor(cena: Phaser.Scene) {
    this.cena = cena;
    gerarTexturasExterior(cena);
    const brilho = texturaBrilho(cena);
    const larguraTela = cena.scale.width;

    // Céu fixo na tela e skyline em camadas de parallax (também na vertical, para o pan)
    cena.add.image(0, 0, TEX_EXTERIOR.CEU).setOrigin(0).setScale(4).setScrollFactor(0).setDepth(-100);
    cena.add
      .tileSprite(0, E.CHAO_Y - 20 - 440, larguraTela + 260, 220, TEX_EXTERIOR.SKYLINE_LONGE)
      .setOrigin(0)
      .setScale(S)
      .setScrollFactor(0.15, 0.12)
      .setDepth(-90);
    for (const [x, y, escala] of [
      [1000, -1820, 1.6],
      [1500, -1700, 1.2],
      [1980, -1880, 1.8],
      [2500, -1740, 1.3],
      [1250, -1580, 1],
    ] as const) {
      cena.add
        .image(x, y, TEX_EXTERIOR.NUVEM_TEMPESTADE)
        .setScale(S * escala)
        .setScrollFactor(0.7)
        .setDepth(-85)
        .setAlpha(0.92);
    }
    cena.add
      .tileSprite(0, E.CHAO_Y - 10 - 520, (larguraTela + 600) / S, 260, TEX_EXTERIOR.SKYLINE_PERTO)
      .setOrigin(0)
      .setScale(S)
      .setScrollFactor(0.35, 0.3)
      .setDepth(-80);

    // Torre
    cena.add.image(E.TORRE.X_ESQUERDA, E.TORRE.TOPO_Y, TEX_EXTERIOR.TORRE).setOrigin(0).setScale(S).setDepth(-50);
    const centroTorre = (E.TORRE.X_ESQUERDA + E.TORRE.X_DIREITA) / 2;
    this.brilhoLogo = cena.add
      .image(centroTorre, E.TORRE.LOGO_Y, brilho)
      .setScale(3.2)
      .setTint(hexNum(COR.vermelho))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55)
      .setDepth(-49);
    this.luzAntena = cena.add
      .image(centroTorre, E.TORRE.TOPO_Y + 6, brilho)
      .setScale(0.5)
      .setTint(hexNum(COR.vermelho))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-48);
    this.raioTorre = cena.add.graphics().setDepth(-47);

    // Fachadas da rua e telões
    cena.add.image(E.FACHADAS.X_INICIO, E.FACHADAS.TOPO_Y, TEX_EXTERIOR.FACHADAS).setOrigin(0).setScale(S).setDepth(-40);
    for (const cfg of E.TELOES) {
      this.teloes.push(new TelaoFaseFinal(cena, { ...cfg }, E.TELAO_TROCA_MS));
    }

    // Postes com cone de luz
    for (const x of E.POSTES_X) {
      cena.add.image(x, E.CHAO_Y, TEX_EXTERIOR.POSTE).setOrigin(0.25, 1).setScale(S).setDepth(-30);
      cena.add
        .image(x + 38, E.CHAO_Y - 210, TEX_EXTERIOR.CONE_LUZ)
        .setOrigin(0.5, 0)
        .setScale(0.9, 0.72)
        .setTint(0xbfeaff)
        .setAlpha(0.32)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(-29);
    }

    // Guarita do Valdir
    cena.add.image(E.GUARITA_X, E.CHAO_Y, TEX_EXTERIOR.GUARITA).setOrigin(0.5, 1).setScale(S).setDepth(-25);
    cena.add
      .image(E.GUARITA_X, E.CHAO_Y - 86, brilho)
      .setScale(1.1)
      .setTint(hexNum(COR.janelaQuente))
      .setAlpha(0.25)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-24);

    // Porta: o saguão aceso fica atrás das folhas
    this.brilhoSaguao = cena.add
      .image(E.PORTA.x, E.CHAO_Y - 70, brilho)
      .setScale(2.2, 1.8)
      .setTint(hexNum(COR.ciano))
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-21);
    const yPorta = E.CHAO_Y;
    this.folhaEsquerda = cena.add
      .image(E.PORTA.x, yPorta, TEX_EXTERIOR.PORTA, 0)
      .setOrigin(1, 1)
      .setScale(S)
      .setDepth(-20);
    this.folhaDireita = cena.add
      .image(E.PORTA.x, yPorta, TEX_EXTERIOR.PORTA, 1)
      .setOrigin(0, 1)
      .setScale(S)
      .setDepth(-20);

    // Terminal do termo de ciência
    this.totemTermo = cena.add
      .sprite(E.TERMINAL_TERMO.x, E.CHAO_Y, TEX_EXTERIOR.TOTEM_TERMO, 0)
      .setOrigin(0.5, 1)
      .setScale(S)
      .setDepth(-18);
    this.totemTermo.play('ff-totem-termo-pisca');
    cena.add
      .image(E.TERMINAL_TERMO.x, E.CHAO_Y - 66, brilho)
      .setScale(0.7)
      .setTint(hexNum(COR.magenta))
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-19);

    // Chão e paredes físicas
    cena.add.image(0, E.CHAO_Y, TEX_EXTERIOR.CHAO).setOrigin(0).setScale(S).setDepth(5);
    this.solidos = cena.physics.add.staticGroup();
    const chao = cena.add.zone(E.LARGURA / 2, E.CHAO_Y + 50, E.LARGURA, 100);
    this.solidos.add(chao);
    this.barreiraPorta = cena.add.zone(E.PORTA.BARREIRA_X + 10, E.CHAO_Y - 200, 20, 400);
    this.solidos.add(this.barreiraPorta);

    this.textoPular = cena.add
      .text(cena.scale.width - 20, cena.scale.height - 20, '', {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '12px',
        color: '#22e5ff',
        backgroundColor: 'rgba(5, 5, 12, 0.7)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(1)
      .setScrollFactor(0)
      .setDepth(9500)
      .setVisible(false);
  }

  public get emPan(): boolean {
    return this.panAtivo;
  }

  public update(tempo: number, delta: number): void {
    for (const t of this.teloes) t.update(tempo, delta);
    // Logo pulsando e luz da antena piscando
    this.brilhoLogo.setAlpha(0.45 + Math.sin(tempo / 520) * 0.12);
    this.luzAntena.setAlpha(Math.floor(tempo / 700) % 2 === 0 ? 0.9 : 0.15);
  }

  /* =======================================================================
   * PLANO DE ABERTURA
   * ======================================================================= */

  /**
   * Câmera sobe da base até o topo da torre, mostra o logo com um relâmpago e volta ao jogador.
   * Qualquer tecla pula. `alvoFinal` é o ponto que a câmera deve centralizar ao terminar.
   */
  public iniciarPan(textoPular: string, alvoFinal: { x: number; y: number }, aoTerminar: () => void): void {
    const p = PAN_TORRE_FASE_FINAL;
    const cam = this.cena.cameras.main;
    const largura = this.cena.scale.width;
    const centroTorre = (E.TORRE.X_ESQUERDA + E.TORRE.X_DIREITA) / 2;
    const scrollXTorre = Phaser.Math.Clamp(centroTorre - largura / 2, 0, E.LARGURA - largura);
    const alvoScrollX = Phaser.Math.Clamp(alvoFinal.x - largura / 2, 0, E.LARGURA - largura);

    this.panAtivo = true;
    this.aoTerminarPan = aoTerminar;
    this.textoPular.setText(textoPular).setVisible(true);
    cam.stopFollow();
    cam.setScroll(scrollXTorre, 0);

    const linhaDoTempo = this.cena.tweens.chain({
      targets: cam,
      tweens: [
        { scrollY: 0, duration: p.ESPERA_INICIAL_MS },
        { scrollY: p.SCROLL_Y_TOPO, duration: p.SUBIDA_MS, ease: 'Sine.easeInOut' },
        {
          scrollY: p.SCROLL_Y_TOPO,
          duration: p.PAUSA_TOPO_MS,
          onStart: () => this.relampagoNoTopo(),
        },
        { scrollX: alvoScrollX, scrollY: 0, duration: p.VOLTA_MS, ease: 'Sine.easeInOut' },
      ],
      onComplete: () => this.terminarPan(),
    });

    // Qualquer tecla pula
    const pular = (): void => {
      if (!this.panAtivo) return;
      linhaDoTempo.stop();
      cam.setScroll(alvoScrollX, 0);
      this.terminarPan();
    };
    this.cena.input.keyboard?.once('keydown', pular);
    this.cena.input.once('pointerdown', pular);
  }

  private relampagoNoTopo(): void {
    const centroTorre = (E.TORRE.X_ESQUERDA + E.TORRE.X_DIREITA) / 2;
    const topo = E.TORRE.TOPO_Y;
    desenharRaio(this.raioTorre, centroTorre - 260, PAN_TORRE_FASE_FINAL.SCROLL_Y_TOPO - 10, centroTorre + 2, topo + 2, 0xeef4ff, 3);
    this.cena.cameras.main.flash(260, 214, 228, 255);
    this.brilhoLogo.setScale(4.2);
    this.cena.tweens.add({ targets: this.brilhoLogo, scale: 3.2, duration: 600, ease: 'Quad.easeOut' });
    this.cena.time.delayedCall(260, () => this.raioTorre.clear());
  }

  private terminarPan(): void {
    if (!this.panAtivo) return;
    this.panAtivo = false;
    this.raioTorre.clear();
    this.textoPular.setVisible(false);
    const cb = this.aoTerminarPan;
    this.aoTerminarPan = undefined;
    cb?.();
  }

  /* =======================================================================
   * PORTA
   * ======================================================================= */

  /** Abre as folhas da porta, acende o saguão e libera a passagem. */
  public abrirPorta(): void {
    if (this.portaAberta) return;
    this.portaAberta = true;
    const d = E.PORTA.ABERTURA_MS;
    this.totemTermo.stop();
    this.totemTermo.setFrame(2);
    this.cena.tweens.add({ targets: this.folhaEsquerda, x: E.PORTA.x - E.PORTA.LARGURA_FOLHA + 6, duration: d, ease: 'Cubic.easeInOut' });
    this.cena.tweens.add({ targets: this.folhaDireita, x: E.PORTA.x + E.PORTA.LARGURA_FOLHA - 6, duration: d, ease: 'Cubic.easeInOut' });
    this.cena.tweens.add({ targets: this.brilhoSaguao, alpha: 0.45, duration: d });
    this.solidos.remove(this.barreiraPorta, true, true);
  }

  /** Porta aberta sem animação (voltar a um checkpoint depois do termo). */
  public deixarPortaAberta(): void {
    if (!this.portaAberta) this.abrirPorta();
    this.cena.tweens.killTweensOf([this.folhaEsquerda, this.folhaDireita, this.brilhoSaguao]);
    this.folhaEsquerda.x = E.PORTA.x - E.PORTA.LARGURA_FOLHA + 6;
    this.folhaDireita.x = E.PORTA.x + E.PORTA.LARGURA_FOLHA - 6;
    this.brilhoSaguao.setAlpha(0.45);
  }
}
