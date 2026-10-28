import Phaser from 'phaser';
import { SentinelaFase1 } from './SentinelaFase1';
import { NpcFase1 } from './NpcFase1';
import type { VentoFase1 } from './VentoFase1';
import { PlataformaMovelFase1, type PlataformasInstaveisFase1 } from './PlataformasFase1';
import type { ConfigPlataforma, ConfigSentinela, TotemFase1 } from './tiposFase1';
import {
  TEXTOS_NPCS_FASE1,
  TEXTOS_TOTEM_1_ALCOOLEMIA,
  TEXTOS_TOTEM_2_BALANCA,
  TEXTOS_TOTEM_3_PORTAO,
  TEXTOS_TOTEM_4_SEQUENCIADOR,
  type TextosTotemFase1,
} from './DialogosFase1';
import {
  MUNDO_FASE1,
  NPCS_FASE1,
  OFFSET_PROMPT_TOTEM_Y,
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_PORTAO,
  TOTEM_4_SEQUENCIADOR,
  ARENA_FASE1,
  BLOCOS_NIVEL_FASE1,
} from './constantesFase1';

/**
 * Referências do nível que a cena precisa para puzzles, interações e respawn.
 */
export interface ElementosNivelFase1 {
  plataformasEstaticas: Phaser.Physics.Arcade.StaticGroup;
  nuvensSolidas: Phaser.Physics.Arcade.StaticGroup;
  plataformasMoveis: PlataformaMovelFase1[];
  sentinelas: SentinelaFase1[];
  npcs: NpcFase1[];
  totens: TotemFase1[];
  sentinela1: SentinelaFase1;
  balsaSentinela: PlataformaMovelFase1;
  barreiraEscudo: Phaser.Physics.Arcade.Sprite;
  graficoEscudo: Phaser.GameObjects.Graphics;
  elevadorNuvem: Phaser.Physics.Arcade.Sprite;
  portaoMilenar: Phaser.Physics.Arcade.Sprite;
  colisorPortao: Phaser.Physics.Arcade.Collider;
  portaArena: Phaser.Physics.Arcade.Sprite;
  colisorPortaArena: Phaser.Physics.Arcade.Collider;
  portalFinal: Phaser.GameObjects.Sprite;
}

const ESTILO_TEXTO_MONO = { fontFamily: 'Consolas, Courier New, monospace' } as const;

/**
 * Constrói o fundo em degradê do Céu Partido (lilás/rosa luminoso) e nuvens em Parallax.
 */
export function criarCenarioParallaxFase1(cena: Phaser.Scene): void {
  const larguraMundo = MUNDO_FASE1.LARGURA;

  const gradiente = cena.add.graphics();
  gradiente.setDepth(-10);
  gradiente.fillGradientStyle(0x8b5cf6, 0xa855f7, 0xf472b6, 0xfbcfe8, 1);
  gradiente.fillRect(0, 0, 1280, 720);
  gradiente.setScrollFactor(0);

  // Camada 1: Névoa e nuvens distantes
  const nuvensDistantes = cena.add.graphics();
  nuvensDistantes.setDepth(-8);
  nuvensDistantes.fillStyle(0xf5d0fe, 0.45);
  for (let x = 40; x < larguraMundo; x += 360) {
    nuvensDistantes.fillEllipse(x, 460, 280, 110);
    nuvensDistantes.fillEllipse(x + 120, 420, 220, 90);
  }
  nuvensDistantes.setScrollFactor(0.15, 0.1);

  // Camada 2: Ruínas celestiais e arcos de mármore
  const ruinasDistantes = cena.add.graphics();
  ruinasDistantes.setDepth(-6);
  ruinasDistantes.fillStyle(0xffedd5, 0.55);
  for (let x = 180; x < larguraMundo; x += 520) {
    ruinasDistantes.fillRect(x, 320, 24, 180);
    ruinasDistantes.fillRect(x + 60, 320, 24, 180);
    ruinasDistantes.fillRect(x - 10, 310, 104, 16);
    ruinasDistantes.fillCircle(x + 42, 280, 30);
  }
  ruinasDistantes.setScrollFactor(0.35, 0.2);

  // Camada 3: Nuvens médias bem iluminadas
  const nuvensMedias = cena.add.graphics();
  nuvensMedias.setDepth(-4);
  nuvensMedias.fillStyle(0xffffff, 0.65);
  for (let x = 80; x < larguraMundo; x += 440) {
    nuvensMedias.fillCircle(x, 540, 60);
    nuvensMedias.fillCircle(x + 50, 520, 80);
  }
  nuvensMedias.setScrollFactor(0.55, 0.3);
}

/**
 * Desenha a barreira pulsante de vento do escudo da Sentinela A-01 (Desafio 1).
 */
export function desenharEscudoSentinela(grafico: Phaser.GameObjects.Graphics, tempo: number): void {
  const { x, y, largura, altura } = TOTEM_1_ALCOOLEMIA.ESCUDO_VISUAL;
  const alfaOscilante = 0.5 + Math.sin(tempo * 0.006) * 0.25;

  grafico.clear();
  grafico.fillStyle(0x0284c7, alfaOscilante * 0.35);
  grafico.fillRect(x, y, largura, altura);

  grafico.lineStyle(2, 0x38bdf8, alfaOscilante);
  grafico.strokeRect(x, y, largura, altura);

  grafico.lineStyle(1.5, 0xa5f3fc, 0.8);
  const deslocamentoY = (tempo * 0.1) % 40;
  for (let linhaY = y + 10 + deslocamentoY; linhaY < y + altura - 10; linhaY += 40) {
    grafico.lineBetween(x + 2, linhaY, x + largura - 2, linhaY);
  }
}

/**
 * Monta o nível a partir das tabelas de cada bloco (constantesFase1.ts) e depois os elementos
 * com comportamento próprio: os 4 totens, a balsa da sentinela, o elevador, o portão e a arena.
 * O jogador já deve existir para que os colisores individuais sejam registrados.
 */
export function construirNivelFase1(
  cena: Phaser.Scene,
  jogador: Phaser.Physics.Arcade.Sprite,
  vento: VentoFase1,
  instaveis: PlataformasInstaveisFase1
): ElementosNivelFase1 {
  const plataformasEstaticas = cena.physics.add.staticGroup();
  const nuvensSolidas = cena.physics.add.staticGroup();
  const plataformasMoveis: PlataformaMovelFase1[] = [];
  const sentinelas: SentinelaFase1[] = [];
  const npcs: NpcFase1[] = [];
  const totens: TotemFase1[] = [];

  const plataforma = (cfg: ConfigPlataforma) => {
    plataformasEstaticas.create(cfg.x, cfg.y, 'marmore-bloco').setScale(cfg.scaleX, cfg.scaleY).refreshBody();
  };
  const sentinela = (id: string, cfg: ConfigSentinela) => {
    const s = new SentinelaFase1(cena, id, cfg);
    sentinelas.push(s);
    return s;
  };
  const totem = (id: string, x: number, y: number, textos: TextosTotemFase1, reabrivel = false) => {
    const imagem = cena.add.image(x, y, 'totem-celestial');
    const prompt = criarPromptTexto(cena, x, y - OFFSET_PROMPT_TOTEM_Y, textos.PROMPT);
    totens.push({ id, imagem, prompt, textos, reabrivel });
  };

  // ===========================================================================
  // GEOMETRIA DOS BLOCOS (dados em constantesFase1.ts)
  // ===========================================================================
  for (const bloco of BLOCOS_NIVEL_FASE1) {
    for (const cfg of bloco.DECORACAO ?? []) {
      cena.add.image(cfg.x, cfg.y, 'coluna-marmore').setScale(cfg.scaleX, cfg.scaleY).setDepth(2);
    }
    for (const cfg of bloco.PLATAFORMAS ?? []) plataforma(cfg);
    for (const pos of bloco.NUVENS ?? []) nuvensSolidas.create(pos.x, pos.y, 'nuvem-solida').refreshBody();
    for (const pos of bloco.RACHADOS ?? []) instaveis.criar(pos.x, pos.y, 'rachado');
    for (const pos of bloco.EFEMERAS ?? []) instaveis.criar(pos.x, pos.y, 'efemera');
    for (const cfg of bloco.TRILHOS ?? []) {
      plataformasMoveis.push(new PlataformaMovelFase1(cena, cfg, 'plataforma-trilho'));
    }
    for (const cfg of bloco.COLUNAS_VENTO ?? []) vento.criarColuna(cfg);
    for (const cfg of bloco.ZONAS_CONTRARIAS ?? []) vento.criarZonaContraria(cfg);
    for (const cfg of bloco.GEISERES ?? []) vento.criarGeiser(cfg);
    for (const cfg of bloco.SENTINELAS ?? []) sentinela(`sentinela_${sentinelas.length + 1}`, cfg);
  }

  // NPCs (ficam sobre plataformas definidas nos blocos)
  for (const chave of ['SUCATINHA', 'MAGO_NUVEM', 'POMBO'] as const) {
    const cfg = NPCS_FASE1[chave];
    const textos = TEXTOS_NPCS_FASE1[chave];
    npcs.push(new NpcFase1(cena, cfg.ID, textos.NOME, cfg.X, cfg.Y, cfg.TEXTURA, textos.PROMPT, [...textos.DIALOGO]));
  }

  // ===========================================================================
  // DESAFIO 1: escudo da Sentinela A-01, que vira balsa quando hackeada
  // ===========================================================================
  const t1 = TOTEM_1_ALCOOLEMIA;
  totem(t1.ID, t1.X, t1.Y, TEXTOS_TOTEM_1_ALCOOLEMIA);

  const sentinela1 = sentinela('sentinela_a01', t1.SENTINELA);
  sentinela1.escudoAtivo = true;

  const barreiraEscudo = cena.physics.add.sprite(t1.BARREIRA.x, t1.BARREIRA.y, 'marmore-bloco');
  barreiraEscudo.setVisible(false);
  barreiraEscudo.setScale(t1.BARREIRA.scaleX, t1.BARREIRA.scaleY);
  barreiraEscudo.setImmovable(true);
  (barreiraEscudo.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  cena.physics.add.collider(jogador, barreiraEscudo);

  const graficoEscudo = cena.add.graphics();
  graficoEscudo.setDepth(8);

  const balsaSentinela = new PlataformaMovelFase1(
    cena,
    {
      x: t1.BALSA.minX,
      y: t1.BALSA.y,
      deslocamentoX: t1.BALSA.maxX - t1.BALSA.minX,
      deslocamentoY: 0,
      velocidade: t1.BALSA.velocidade,
      pausaMs: t1.BALSA.pausaMs,
    },
    'plataforma-sentinela',
    false
  );
  plataformasMoveis.push(balsaSentinela);

  // ===========================================================================
  // DESAFIO 2: balança de nuvens (elevador até a altitude da placa)
  // ===========================================================================
  const t2 = TOTEM_2_BALANCA;
  totem(t2.ID, t2.X, t2.Y, TEXTOS_TOTEM_2_BALANCA);

  const placaX = t2.X + t2.PLACA_OFFSET.x;
  const placaY = t2.Y + t2.PLACA_OFFSET.y;
  cena.add.image(placaX, placaY, 'placa-runica').setDepth(2);
  cena.add
    .text(placaX, placaY, `ALTITUDE ALVO: ${t2.ALTITUDE_ALVO}`, {
      ...ESTILO_TEXTO_MONO,
      fontSize: '11px',
      color: '#fbbf24',
    })
    .setOrigin(0.5)
    .setDepth(3);

  const elevadorNuvem = cena.physics.add.sprite(t2.ELEVADOR_X, t2.ELEVADOR_Y_INICIAL, 'nuvem-solida');
  elevadorNuvem.setImmovable(true);
  (elevadorNuvem.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  cena.physics.add.collider(jogador, elevadorNuvem);

  // ===========================================================================
  // DESAFIO 3: portão milenar
  // ===========================================================================
  const t3 = TOTEM_3_PORTAO;
  totem(t3.ID, t3.X, t3.Y, TEXTOS_TOTEM_3_PORTAO);

  const portaoMilenar = cena.physics.add.sprite(t3.X_PORTAO, t3.Y_PORTAO, 'portao-milenar');
  portaoMilenar.setScale(1, t3.ESCALA_Y_PORTAO);
  portaoMilenar.setImmovable(true);
  (portaoMilenar.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  const colisorPortao = cena.physics.add.collider(jogador, portaoMilenar);

  // ===========================================================================
  // DESAFIO 4: sequenciador da escada de rajadas (reabrível para recalibrar)
  // ===========================================================================
  const t4 = TOTEM_4_SEQUENCIADOR;
  totem(t4.ID, t4.X, t4.Y, TEXTOS_TOTEM_4_SEQUENCIADOR, true);
  vento.definirEscada([
    vento.criarColuna(t4.COLUNA_ESCADA_1),
    vento.criarColuna(t4.COLUNA_ESCADA_2),
    vento.criarColuna(t4.COLUNA_ESCADA_3),
  ]);

  // ===========================================================================
  // ARENA: porta que sela a entrada e o portal de saída
  // ===========================================================================
  const a = ARENA_FASE1;
  const portaArena = cena.physics.add.sprite(a.PORTA.x, a.PORTA.y + a.PORTA.deslocamentoAbertaY, 'portao-milenar');
  portaArena.setScale(1, a.PORTA.escalaY);
  portaArena.setImmovable(true);
  portaArena.setAlpha(0);
  const corpoPorta = portaArena.body as Phaser.Physics.Arcade.Body;
  corpoPorta.setAllowGravity(false);
  corpoPorta.enable = false;
  const colisorPortaArena = cena.physics.add.collider(jogador, portaArena);
  colisorPortaArena.active = false;

  for (const coluna of a.COLUNAS_DOURADAS) {
    cena.add.image(coluna.x, coluna.y, 'coluna-dourada').setDepth(2);
  }

  const luzSantuario = cena.add.graphics();
  luzSantuario.fillStyle(0xfef08a, 0.18);
  for (const feixe of a.FEIXES_LUZ) {
    luzSantuario.fillTriangle(feixe.topoX, 0, feixe.baseX1, feixe.baseY, feixe.baseX2, feixe.baseY);
  }

  const portalFinal = cena.add.sprite(a.PORTAL.x, a.PORTAL.y, 'portal-santuario');
  portalFinal.setDepth(3);
  cena.tweens.add({
    targets: portalFinal,
    scaleX: 1.05,
    scaleY: 1.05,
    yoyo: true,
    repeat: -1,
    duration: 1200,
    ease: 'Sine.easeInOut',
  });

  return {
    plataformasEstaticas,
    nuvensSolidas,
    plataformasMoveis,
    sentinelas,
    npcs,
    totens,
    sentinela1,
    balsaSentinela,
    barreiraEscudo,
    graficoEscudo,
    elevadorNuvem,
    portaoMilenar,
    colisorPortao,
    portaArena,
    colisorPortaArena,
    portalFinal,
  };
}

function criarPromptTexto(cena: Phaser.Scene, x: number, y: number, texto: string): Phaser.GameObjects.Text {
  const t = cena.add.text(x, y, texto, {
    ...ESTILO_TEXTO_MONO,
    fontSize: '11px',
    color: '#38bdf8',
    backgroundColor: '#090d16',
    padding: { x: 6, y: 3 },
  });
  t.setOrigin(0.5);
  t.setVisible(false);
  t.setDepth(90);
  return t;
}
