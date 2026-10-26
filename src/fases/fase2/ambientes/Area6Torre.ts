import Phaser from 'phaser';
import { COR, ESCALA, Pincel, larguraTexto, texturaPixel } from '../porto/ArtePorto';
import { AguaPorto } from '../porto/AguaPorto';
import { desenharCeu, desenharCidade, desenharDepositoPneus, desenharGuindaste } from '../porto/CenariosPorto';
import { FALAS } from '../porto/DialogosPorto';
import { PROF } from '../porto/EfeitosPorto';
import { Kraken, gerarTexturasKraken, texturaRotuloIndice } from '../porto/KrakenPorto';
import type { TomadaArena } from '../porto/KrakenPorto';
import { TOTAL_FOCOS, indiceFumaca } from '../porto/TiposPorto';
import { AreaPorto } from './AreaBase';

const PISO_CENTRO = 520;
const PISO_ANEL = 576;
const NIVEL_BAIXO = 640;
const NIVEL_ALTO = 540;
const cacheLuzes = new Map<string, Array<[number, number]>>();

/**
 * ÁREA 6 — TORRE DO SERVIDOR CENTRAL (arena do boss).
 * Plataforma circular no meio da baía, à noite. O céu brilha vermelho com o incêndio ao longe,
 * a antena de radar gira e o painel repete CONECTANDO AO MEGABRAIN... A fumaça depende do
 * Índice de Fumaça trazido pelo jogador.
 */
export class Area6Torre extends AreaPorto {
  private kraken!: Kraken;
  private tomadas: TomadaArena[] = [];
  private painelTextura: Phaser.Textures.CanvasTexture | null = null;
  private painelTexto = '';
  private desconectado = false;
  private radar!: Phaser.GameObjects.Image;
  private cabo: Phaser.GameObjects.Image | null = null;
  private brilhoCabo: Phaser.GameObjects.Image | null = null;
  private anuncio!: Phaser.GameObjects.Text;
  private finalIniciado = false;
  private fogoDistante: Array<Phaser.GameObjects.GameObject> = [];

  override construir(): void {
    this.largura = 1280;
    this.altura = 720;
    this.noite = true;
    this.inicio = { x: 560, y: PISO_CENTRO - 48 };
    this.volumeOndas = 1;
    this.volumeFogo = 0.3;
    const cena = this.cena;
    this.tomadas = [];
    this.desconectado = false;
    this.finalIniciado = false;
    this.cabo = null;
    this.brilhoCabo = null;

    // A fumaça da arena depende do Índice de Fumaça trazido (100% = densa, 40% = quase limpa)
    const indice = indiceFumaca(cena.estado);
    cena.fumaca.densidadeAlvo = Phaser.Math.Clamp(0.1 + ((indice - 40) / 60) * 0.68, 0.1, 0.78);

    gerarTexturasKraken(cena);
    this.construirFundo();
    this.construirTorre();

    cena.agua = new AguaPorto(cena, {
      nivel: NIVEL_BAIXO,
      mare: { amplitude: 8, periodo: 5000 },
      noite: true,
      manchas: [
        { x: 120, profundidade: 20, rx: 18, ry: 3 },
        { x: 460, profundidade: 40, rx: 22, ry: 3 },
        { x: 900, profundidade: 26, rx: 20, ry: 3 },
        { x: 1180, profundidade: 50, rx: 16, ry: 2 },
      ],
      reflexos: [{ x0: 0, x1: 300, forca: 0.6 }],
      lixo: [
        { tipo: 0, x: 90 },
        { tipo: 2, x: 330 },
        { tipo: 3, x: 1000 },
        { tipo: 1, x: 1230 },
      ],
    });
    cena.solido(0, 712, 1280, 40);

    // Plataforma circular (vista de lado): centro elevado e anéis externos
    texturaPixel(cena, 'pb-a6-plataforma', 320, 30, (p) => {
      const desenharLaje = (x0: number, x1: number, y: number) => {
        p.px(x0, y, x1 - x0, 5, '#5A5662');
        p.px(x0, y, x1 - x0, 1, '#8A8692');
        for (let x = x0; x < x1; x += 6) {
          p.px(x, y + 5, 3, 2, COR.advertencia);
          p.px(x + 3, y + 5, 3, 2, '#1A1616');
        }
        p.px(x0, y + 7, x1 - x0, 6, '#2E2C36');
        for (let x = x0 + 4; x < x1 - 2; x += 16) p.px(x, y + 13, 3, 30 - y - 13, '#24222A');
      };
      desenharLaje(40, 110, 14);
      desenharLaje(210, 280, 14);
      desenharLaje(110, 210, 0);
      for (const x of [118, 200]) p.px(x, 2, 2, 2, COR.virus);
    });
    cena.add.image(0, PISO_CENTRO, 'pb-a6-plataforma').setOrigin(0, 0).setScale(ESCALA).setDepth(PROF.plataformas);
    cena.solido(440, PISO_CENTRO, 400, 52);
    cena.solido(160, PISO_ANEL, 280, 52);
    cena.solido(840, PISO_ANEL, 280, 52);
    // Postes das tomadas sobre a água
    texturaPixel(cena, 'pb-a6-poste', 20, 40, (p) => {
      p.px(0, 0, 20, 4, '#5A5662');
      p.px(0, 0, 20, 1, '#8A8692');
      p.px(8, 4, 4, 36, '#24222A');
      p.px(8, 20, 4, 2, '#3F5A2E');
    });
    for (const x of [60, 1220]) {
      cena.imagem('pb-a6-poste', x, 560, PROF.plataformas, 0);
      cena.solido(x - 40, 560, 80, 20, true);
    }
    cena.criarHidrante(700, PISO_CENTRO);

    // 8 tomadas numeradas de 0 a 7 em volta da arena
    const posicoes: Array<[number, number]> = [
      [60, 560],
      [210, PISO_ANEL],
      [370, PISO_ANEL],
      [490, PISO_CENTRO],
      [800, PISO_CENTRO],
      [910, PISO_ANEL],
      [1070, PISO_ANEL],
      [1220, 560],
    ];
    posicoes.forEach(([x, y], indice) => {
      const img = cena.add.image(x, y - 4, 'pb-tomada', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.emissivo - 2);
      const rotulo = cena.add.image(x, y - 70, texturaRotuloIndice(cena, indice)).setScale(ESCALA * 0.75).setDepth(PROF.emissivo);
      const tomada: TomadaArena = { indice, x, y: y - 30, img, rotulo, desligada: false };
      this.tomadas.push(tomada);
      cena.interativo(x, y - 40, `[E] DESLIGAR tomadas[${indice}]`, () => this.kraken.desligarTomada(indice), () => this.kraken?.etapa === 3 && !tomada.desligada && !this.kraken.derrotado, 75);
    });

    this.anuncio = cena.add
      .text(640, 200, '', {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '24px',
        color: COR.telaBoia,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
        backgroundColor: 'rgba(6,16,20,0.75)',
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(PROF.hud - 1)
      .setAlpha(0);

    this.kraken = new Kraken(cena, 640, PISO_CENTRO, this.tomadas, {
      aoMudarEtapa: (etapa) => this.mudarEtapa(etapa),
      aoDerrotar: () => this.aoDerrotarKraken(),
      aoAnunciar: (texto) => this.anunciar(texto),
    });
  }

  override iniciar(): void {
    const cena = this.cena;
    cena.cutscene = true;
    cena.falar(FALAS.torreEntrada, () => {
      void this.kraken.emergir().then(() => {
        cena.cutscene = false;
        cena.falar(FALAS.krakenFila, () => this.kraken.iniciar());
      });
    });
  }

  private construirFundo(): void {
    this.camada('pb-a6-ceu', 0, PROF.ceu, (p, w, h) => {
      desenharCeu(p, w, h, 'noite');
      // Brilho vermelho do incêndio no horizonte
      const ctx = p.ctx;
      ctx.fillStyle = 'rgba(200,64,30,0.18)';
      for (let y = 80; y < 112; y += 2) ctx.fillRect(0, y, w, 2);
    });
    this.camada('pb-a6-cidade', 0.05, PROF.distante, (p, w) => {
      cacheLuzes.set('a6-janelas', desenharCidade(p, 160, w, 112, 31, true));
      // Porto em chamas ao longe (esquerda)
      for (const x of [10, 70, 120]) desenharGuindaste(p, x, 114, true, 0.6);
      desenharDepositoPneus(p, 20, 114, true);
      p.px(0, 112, w, 2, '#14121C');
    });
    this.luzesVirus(cacheLuzes.get('a6-janelas') ?? [], 0.05, PROF.distante + 1, 0.6);
    const fogo = this.cena.add.sprite(170, 104 * ESCALA, 'pb-fogo-g', 0).setOrigin(0.5, 1).setScale(ESCALA * 0.6).setScrollFactor(0.05, 0).setDepth(PROF.distante + 2);
    fogo.play('pb-anim-fogo-g');
    const brilho = this.cena.efeitos.brilho(170, 100 * ESCALA, 200, COR.fogoLaranja, 0.4, 0.05, PROF.distante + 3);
    const pluma = this.cena.efeitos.pluma(170, 90 * ESCALA, { largura: 120, raio: 14, frequencia: 400, fator: 0.05, profundidade: PROF.distante + 4, vida: 12000, escalaFinal: 2.6 });
    this.fogoDistante = [fogo, brilho, pluma];
  }

  /** Torre do servidor central com painel gigante e radar girando. */
  private construirTorre(): void {
    const cena = this.cena;
    texturaPixel(cena, 'pb-a6-torre', 80, 110, (p) => {
      const aco = '#2E3038';
      const acoC = '#4A4E5A';
      p.px(18, 30, 44, 80, aco);
      p.px(18, 30, 2, 80, acoC);
      for (let y = 34; y < 110; y += 10) {
        p.linha(20, y, 60, y + 10, '#24262E');
        p.linha(60, y, 20, y + 10, '#24262E');
      }
      p.px(8, 22, 64, 8, aco);
      p.px(8, 22, 64, 1, acoC);
      p.px(36, 0, 8, 22, aco);
      for (let y = 36; y < 108; y += 8) {
        p.px(22, y, 2, 2, COR.virus);
        p.px(56, y + 4, 2, 2, COR.virus);
      }
      // Racks do servidor visíveis pela grade
      for (let y = 40; y < 104; y += 12) {
        p.px(28, y, 24, 8, '#14161C');
        for (let x = 30; x < 50; x += 3) p.ponto(x, y + 3, (x + y) % 2 === 0 ? COR.virus : '#1E7A44');
      }
    });
    cena.add.image(640, PISO_CENTRO, 'pb-a6-torre').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.estruturas - 8);
    cena.efeitos.brilho(640, 300, 260, COR.virus, 0.12, 1, PROF.estruturas - 7);

    texturaPixel(cena, 'pb-a6-radar', 26, 6, (p) => {
      p.px(0, 2, 26, 2, '#8A8692');
      p.px(0, 1, 4, 4, '#C8C2B4');
      p.px(22, 1, 4, 4, '#C8C2B4');
      p.px(12, 0, 2, 6, '#5A5662');
    });
    this.radar = cena.add.image(640, PISO_CENTRO - 110 * ESCALA + 4, 'pb-a6-radar').setScale(ESCALA).setDepth(PROF.estruturas - 7);

    // Painel gigante "CONECTANDO AO MEGABRAIN..."
    const chave = 'pb-a6-painel';
    this.painelTextura = cena.textures.exists(chave) ? (cena.textures.get(chave) as Phaser.Textures.CanvasTexture) : cena.textures.createCanvas(chave, 100, 13);
    this.painelTextura?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    cena.add.image(640, 150, chave).setScale(ESCALA).setDepth(PROF.emissivo);
    this.escreverPainel('CONECTANDO AO MEGABRAIN...', COR.virus);
  }

  private escreverPainel(texto: string, cor: string): void {
    if (!this.painelTextura || texto === this.painelTexto) return;
    this.painelTexto = texto;
    const ctx = this.painelTextura.getContext();
    ctx.clearRect(0, 0, 100, 13);
    const p = new Pincel(ctx);
    p.px(0, 0, 100, 13, '#0A0A10');
    p.moldura(0, 0, 100, 13, '#3A3842');
    p.texto(texto, Math.max(2, Math.round((100 - larguraTexto(texto)) / 2)), 4, cor);
    this.painelTextura.refresh();
  }

  /* ---------------- Etapas ---------------- */

  private mudarEtapa(etapa: number): void {
    const cena = this.cena;
    if (etapa === 2) {
      cena.falar(FALAS.krakenPilha, () => this.kraken.comecarEtapa());
    } else if (etapa === 3) {
      // Maré alta: os anéis externos ficam submersos
      cena.tweens.add({
        targets: cena.agua,
        nivelBase: NIVEL_ALTO,
        duration: 3000,
        ease: 'Sine.easeInOut',
      });
      cena.hud.aviso('MARÉ ALTA! OS ANÉIS ESTÃO SUBMERSOS: USE A ESPUMA COMO PLATAFORMA', COR.telaBoia, 3200);
      cena.falar(FALAS.krakenVetor, () => this.kraken.comecarEtapa());
    }
  }

  private anunciar(texto: string): void {
    const cena = this.cena;
    if (this.kraken.etapa === 3) {
      this.anuncio.setText(`BOIA: DESLIGUE ${texto.toUpperCase().startsWith('A ') ? texto.toUpperCase() : texto}!`).setAlpha(1);
      cena.tweens.killTweensOf(this.anuncio);
      cena.tweens.add({ targets: this.anuncio, scale: { from: 1.15, to: 1 }, duration: 250 });
      cena.som.tocar('sirene');
    } else {
      cena.efeitos.textoFlutuante(640, PISO_CENTRO - 330, texto, COR.virus, 14);
    }
  }

  private aoDerrotarKraken(): void {
    const cena = this.cena;
    this.anuncio.setAlpha(0);
    cena.tweens.add({ targets: cena.agua, nivelBase: NIVEL_BAIXO, duration: 3000 });
    cena.falar(FALAS.krakenFim, () => {
      // O cabo-mestre aparece na base do servidor
      texturaPixel(cena, 'pb-a6-cabo', 10, 26, (p) => {
        p.px(3, 0, 4, 18, '#2B5C9A');
        p.px(4, 0, 1, 18, '#4A7AB8');
        p.px(1, 18, 8, 6, '#C8C2B4');
        p.px(2, 24, 2, 2, COR.advertencia);
        p.px(6, 24, 2, 2, COR.advertencia);
        p.px(2, 19, 6, 1, COR.virus);
      });
      this.cabo = cena.add.image(640, PISO_CENTRO, 'pb-a6-cabo').setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.emissivo - 1).setAlpha(0);
      cena.tweens.add({ targets: this.cabo, alpha: 1, duration: 800 });
      this.brilhoCabo = cena.efeitos.brilho(640, PISO_CENTRO - 60, 90, COR.telaBoia, 0.5);
      cena.interativo(640, PISO_CENTRO - 50, '[E] PUXAR O CABO-MESTRE', () => this.puxarCabo(), () => !this.finalIniciado, 100);
      cena.hud.aviso('PUXE O CABO-MESTRE NA BASE DO SERVIDOR [E]', COR.telaBoia, 4000);
    });
  }

  /* ---------------- Final ---------------- */

  private puxarCabo(): void {
    if (this.finalIniciado || !this.cabo) return;
    this.finalIniciado = true;
    const cena = this.cena;
    cena.cutscene = true;
    cena.tweens.add({ targets: this.cabo, y: PISO_CENTRO + 60, angle: 25, alpha: 0, duration: 700, ease: 'Back.easeIn' });
    this.brilhoCabo?.destroy();
    cena.som.tocar('glitch');
    cena.cameras.main.flash(500, 79, 216, 232);
    cena.cameras.main.shake(500, 0.008);
    this.desconectado = true;
    this.escreverPainel('DESCONECTADO', '#F2EEE2');

    // Canhões de espuma da torre disparam sobre o porto
    cena.time.delayedCall(900, () => {
      cena.som.tocar('espuma');
      const jatos = [cena.armas.chuvaDeEspuma(600, 140, -520), cena.armas.chuvaDeEspuma(680, 140, 520), cena.armas.chuvaDeEspuma(640, 120, -260)];
      cena.time.delayedCall(5000, () => jatos.forEach((j) => j.stop()));
      cena.time.delayedCall(9000, () => jatos.forEach((j) => j.destroy()));
    });
    // A fumaça vai embora e a água da baía clareia aos poucos
    cena.time.delayedCall(1800, () => {
      cena.fumaca.dissipar(4000);
      cena.definirNevoa(0);
      cena.agua?.limpar(6000);
      cena.agua?.reflexos.splice(0);
      // O incêndio do porto se apaga ao longe
      const [fogo, brilho, pluma] = this.fogoDistante as [Phaser.GameObjects.Sprite, Phaser.GameObjects.Image, Phaser.GameObjects.Particles.ParticleEmitter];
      pluma?.stop();
      cena.tweens.killTweensOf(brilho);
      cena.tweens.add({ targets: [fogo, brilho], alpha: 0, scaleY: 0, duration: 3000 });
      const amanhecer = cena.add.rectangle(640, 360, 1280, 720, 0x6a8ab0, 0).setScrollFactor(0).setDepth(PROF.fumacaFundo + 2).setBlendMode(Phaser.BlendModes.ADD);
      cena.tweens.add({ targets: amanhecer, fillAlpha: 0.14, duration: 6000 });
    });
    cena.time.delayedCall(6500, () => {
      cena.cutscene = false;
      cena.falar(FALAS.final, () => this.mostrarResumo());
    });
  }

  private mostrarResumo(): void {
    const cena = this.cena;
    const e = cena.estado;
    cena.cutscene = true;
    const fundo = cena.add.rectangle(640, 360, 760, 330, 0x0e0a0a, 0.92).setScrollFactor(0).setDepth(PROF.hud + 10).setStrokeStyle(3, 0xf2c230);
    const linhas = [
      'PORTO BUGADO — FASE CONCLUÍDA',
      '',
      `Servidor central: DESCONECTADO`,
      `Focos apagados: ${e.focosApagados.length}/${TOTAL_FOCOS}   ·   Índice de Fumaça final: ${indiceFumaca(e)}%`,
      `Gravações do PORTUS: ${e.gravacoes.length}/5   ·   Lacres: ${e.lacres}`,
      '',
      'Conceitos dominados: PILHA · FILA · VETORES E ÍNDICES · ORDENAÇÃO',
      '',
      '[ENTER] VOLTAR AO HUB',
    ];
    const texto = cena.add
      .text(640, 360, linhas.join('\n'), {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '17px',
        color: '#F2EEE2',
        align: 'center',
        lineSpacing: 6,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(PROF.hud + 11);
    for (const o of [fundo, texto]) o.setAlpha(0);
    cena.tweens.add({ targets: [fundo, texto], alpha: 1, duration: 500 });
    cena.som.tocar('item');
    const teclado = cena.input.keyboard;
    const sair = () => cena.concluirArea();
    teclado?.once('keydown-ENTER', sair);
    teclado?.once('keydown-SPACE', sair);
    cena.time.delayedCall(15000, sair);
  }

  /* ---------------- Atualização ---------------- */

  override atingirPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    return this.kraken.levarPatch(tiro);
  }

  override atualizarPausado(tempo: number): void {
    this.atualizarVisual(tempo);
    // Durante a cena de entrada, a cabeça do KRAKEN continua respirando
    if (!this.kraken.ativo) this.kraken.atualizar(tempo, 0);
  }

  override atualizar(tempo: number, delta: number): void {
    this.atualizarVisual(tempo);
    this.kraken.atualizar(tempo, delta);
    if (this.kraken.etapa === 3 && !this.kraken.derrotado && this.anuncio.alpha > 0) {
      this.anuncio.setAlpha(0.75 + 0.25 * Math.sin(tempo / 120));
    }
  }

  private atualizarVisual(tempo: number): void {
    this.radar.setScale(ESCALA * Math.max(0.15, Math.abs(Math.cos(tempo / 600))), ESCALA);
    if (!this.desconectado) {
      const pontos = '.'.repeat(1 + (Math.floor(tempo / 450) % 3));
      this.escreverPainel(`CONECTANDO AO MEGABRAIN${pontos}`, Math.floor(tempo / 900) % 2 === 0 ? COR.virus : '#9CFFB8');
    }
  }
}
