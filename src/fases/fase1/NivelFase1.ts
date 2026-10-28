import Phaser from 'phaser';
import { SentinelaFase1 } from './SentinelaFase1';
import { NpcFase1 } from './NpcFase1';
import type { VentoFase1 } from './VentoFase1';
import type { PlataformasRachadasFase1 } from './PlataformasFase1';
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
  VENTO_FASE1,
  SENTINELAS_FASE1,
  NPCS_FASE1,
  OFFSET_PROMPT_TOTEM_Y,
  TOTEM_1_ALCOOLEMIA,
  TOTEM_2_BALANCA,
  TOTEM_3_PORTAO,
  TOTEM_4_SEQUENCIADOR,
  SANTUARIO_FASE1,
  BLOCO_1_LEVEL_DESIGN,
  BLOCO_2_LEVEL_DESIGN,
  BLOCO_3_LEVEL_DESIGN,
} from './constantesFase1';

/**
 * Referências do nível que a cena precisa para puzzles, interações e respawn.
 */
export interface ElementosNivelFase1 {
  plataformasEstaticas: Phaser.Physics.Arcade.StaticGroup;
  nuvensSolidas: Phaser.Physics.Arcade.StaticGroup;
  sentinelas: SentinelaFase1[];
  npcs: NpcFase1[];
  totens: TotemFase1[];
  sentinela1: SentinelaFase1;
  barreiraEscudo: Phaser.Physics.Arcade.Sprite;
  graficoEscudo: Phaser.GameObjects.Graphics;
  elevadorNuvem: Phaser.Physics.Arcade.Sprite;
  portaoMilenar: Phaser.Physics.Arcade.Sprite;
  colisorPortao: Phaser.Physics.Arcade.Collider;
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
 * Monta os 3 blocos de level design, o santuário final, os 4 totens, sentinelas e NPCs.
 * O jogador já deve existir para que os colisores individuais sejam registrados.
 */
export function construirNivelFase1(
  cena: Phaser.Scene,
  jogador: Phaser.Physics.Arcade.Sprite,
  vento: VentoFase1,
  rachados: PlataformasRachadasFase1
): ElementosNivelFase1 {
  const plataformasEstaticas = cena.physics.add.staticGroup();
  const nuvensSolidas = cena.physics.add.staticGroup();
  const sentinelas: SentinelaFase1[] = [];
  const npcs: NpcFase1[] = [];
  const totens: TotemFase1[] = [];

  const plataforma = (cfg: ConfigPlataforma) => {
    plataformasEstaticas.create(cfg.x, cfg.y, 'marmore-bloco').setScale(cfg.scaleX, cfg.scaleY).refreshBody();
  };
  const nuvem = (x: number, y: number) => {
    nuvensSolidas.create(x, y, 'nuvem-solida').refreshBody();
  };
  const sentinela = (id: string, cfg: ConfigSentinela) => {
    const s = new SentinelaFase1(cena, id, cfg.x, cfg.y, cfg.minX, cfg.maxX, cfg.velocidade, cfg.podeDispararPulso);
    sentinelas.push(s);
    return s;
  };
  const totem = (id: string, x: number, y: number, textos: TextosTotemFase1, reabrivel = false) => {
    const imagem = cena.add.image(x, y, 'totem-celestial');
    const prompt = criarPromptTexto(cena, x, y - OFFSET_PROMPT_TOTEM_Y, textos.PROMPT);
    totens.push({ id, imagem, prompt, textos, reabrivel });
  };
  const npc = (cfg: (typeof NPCS_FASE1)[keyof typeof NPCS_FASE1], textos: (typeof TEXTOS_NPCS_FASE1)[keyof typeof TEXTOS_NPCS_FASE1]) => {
    nuvem(cfg.X, cfg.Y + cfg.OFFSET_NUVEM_Y);
    npcs.push(new NpcFase1(cena, cfg.ID, textos.NOME, cfg.X, cfg.Y, cfg.TEXTURA, textos.PROMPT, [...textos.DIALOGO]));
  };

  // ===========================================================================
  // BLOCO 1: Introdução ao Ar (x: 0 a 1740)
  // Nuvens + mármore rachado intercalados, 2 colunas de vento e NPC Sucatinha.
  // ===========================================================================
  const b1 = BLOCO_1_LEVEL_DESIGN;
  plataforma(b1.CHAO_INICIAL);

  for (const pos of b1.COLUNAS_DECORATIVAS) {
    cena.add.image(pos.x, pos.y, 'coluna-marmore').setDepth(2);
  }

  nuvem(b1.NUVEM_1.x, b1.NUVEM_1.y);
  vento.criarColuna(VENTO_FASE1.COLUNA_1);
  rachados.criar(b1.MARMORE_RACHADO_1.x, b1.MARMORE_RACHADO_1.y);
  npc(NPCS_FASE1.SUCATINHA, TEXTOS_NPCS_FASE1.SUCATINHA);
  nuvem(b1.NUVEM_2.x, b1.NUVEM_2.y);
  vento.criarColuna(VENTO_FASE1.COLUNA_2);

  // Zonas de vento contrário: empurram o jogador devagar para a esquerda
  for (const zona of VENTO_FASE1.CONTRARIO.ZONAS) {
    vento.criarZonaContraria(zona);
  }
  rachados.criar(b1.MARMORE_RACHADO_2.x, b1.MARMORE_RACHADO_2.y);
  rachados.criar(b1.MARMORE_RACHADO_3.x, b1.MARMORE_RACHADO_3.y);

  // Platô de Chegada do Bloco 1 / Checkpoint 1
  plataforma(b1.PLATO_CHEGADA);
  cena.add.image(b1.OBELISCO_CP1.x, b1.OBELISCO_CP1.y, 'coluna-marmore').setScale(b1.OBELISCO_CP1.scaleX, b1.OBELISCO_CP1.scaleY);

  // ===========================================================================
  // BLOCO 2: Desafios 1 e 2 + NPC Mago da Nuvem (x: 1740 a 3600)
  // ===========================================================================
  const b2 = BLOCO_2_LEVEL_DESIGN;

  // Desafio 1: "O Teste de Alcoolemia da Sentinela"
  plataforma(b2.PLATO_TOTEM_1);
  totem(TOTEM_1_ALCOOLEMIA.ID, TOTEM_1_ALCOOLEMIA.X, TOTEM_1_ALCOOLEMIA.Y, TEXTOS_TOTEM_1_ALCOOLEMIA);

  const sentinela1 = sentinela('sentinela_1', SENTINELAS_FASE1.SENTINELA_1);
  sentinela1.escudoAtivo = true;

  // Barreira física do escudo da Sentinela A-01
  const cfgBarreira = TOTEM_1_ALCOOLEMIA.BARREIRA;
  const barreiraEscudo = cena.physics.add.sprite(cfgBarreira.x, cfgBarreira.y, 'marmore-bloco');
  barreiraEscudo.setVisible(false);
  barreiraEscudo.setScale(cfgBarreira.scaleX, cfgBarreira.scaleY);
  barreiraEscudo.setImmovable(true);
  (barreiraEscudo.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  cena.physics.add.collider(jogador, barreiraEscudo);

  const graficoEscudo = cena.add.graphics();
  graficoEscudo.setDepth(8);

  plataforma(b2.PLATO_SOB_SENTINELA);

  // Desafio 2: "A Balança Hipócrita de Nuvens"
  plataforma(b2.PLATO_TOTEM_2);
  totem(TOTEM_2_BALANCA.ID, TOTEM_2_BALANCA.X, TOTEM_2_BALANCA.Y, TEXTOS_TOTEM_2_BALANCA);

  const placaX = TOTEM_2_BALANCA.X + TOTEM_2_BALANCA.PLACA_OFFSET.x;
  const placaY = TOTEM_2_BALANCA.Y + TOTEM_2_BALANCA.PLACA_OFFSET.y;
  cena.add.image(placaX, placaY, 'placa-runica').setDepth(2);
  cena.add
    .text(placaX, placaY, `ALTITUDE ALVO: ${TOTEM_2_BALANCA.ALTITUDE_ALVO}`, {
      ...ESTILO_TEXTO_MONO,
      fontSize: '11px',
      color: '#fbbf24',
    })
    .setOrigin(0.5)
    .setDepth(3);

  const elevadorNuvem = cena.physics.add.sprite(
    TOTEM_2_BALANCA.ELEVADOR_X,
    TOTEM_2_BALANCA.ELEVADOR_Y_INICIAL,
    'nuvem-solida'
  );
  elevadorNuvem.setImmovable(true);
  (elevadorNuvem.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  cena.physics.add.collider(jogador, elevadorNuvem);

  // Platô de Recepção do Elevador / Checkpoint 2
  plataforma(b2.PLATO_APOS_ELEVADOR);
  plataforma(b2.PLATO_INTERMEDIARIO);
  plataforma(b2.CORREDOR);

  npc(NPCS_FASE1.MAGO_NUVEM, TEXTOS_NPCS_FASE1.MAGO_NUVEM);
  rachados.criar(b2.MARMORE_RACHADO_1.x, b2.MARMORE_RACHADO_1.y);

  // Platô de Chegada do Bloco 2 / Checkpoint 3
  plataforma(b2.PLATO_CHEGADA);
  cena.add.image(b2.OBELISCO_CP3.x, b2.OBELISCO_CP3.y, 'coluna-marmore').setScale(b2.OBELISCO_CP3.scaleX, b2.OBELISCO_CP3.scaleY);

  // ===========================================================================
  // BLOCO 3: Desafios 3 e 4 + Santuário Final (x: 3600 a 5400)
  // ===========================================================================
  const b3 = BLOCO_3_LEVEL_DESIGN;

  // Desafio 3: "O Portão com Crise Existencial"
  totem(TOTEM_3_PORTAO.ID, TOTEM_3_PORTAO.X, TOTEM_3_PORTAO.Y, TEXTOS_TOTEM_3_PORTAO);

  const portaoMilenar = cena.physics.add.sprite(TOTEM_3_PORTAO.X_PORTAO, TOTEM_3_PORTAO.Y_PORTAO, 'portao-milenar');
  portaoMilenar.setImmovable(true);
  (portaoMilenar.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  const colisorPortao = cena.physics.add.collider(jogador, portaoMilenar);

  sentinela('sentinela_3', SENTINELAS_FASE1.SENTINELA_3);

  // Desafio 4: "O Sequenciador de Rajadas" (reabrível para recalibrar)
  nuvem(b3.NUVEM_TOTEM_4.x, b3.NUVEM_TOTEM_4.y);
  totem(TOTEM_4_SEQUENCIADOR.ID, TOTEM_4_SEQUENCIADOR.X, TOTEM_4_SEQUENCIADOR.Y, TEXTOS_TOTEM_4_SEQUENCIADOR, true);

  vento.definirEscada([
    vento.criarColuna(TOTEM_4_SEQUENCIADOR.COLUNA_ESCADA_1),
    vento.criarColuna(TOTEM_4_SEQUENCIADOR.COLUNA_ESCADA_2),
    vento.criarColuna(TOTEM_4_SEQUENCIADOR.COLUNA_ESCADA_3),
  ]);

  rachados.criar(b3.MARMORE_RACHADO_1.x, b3.MARMORE_RACHADO_1.y);
  rachados.criar(b3.MARMORE_RACHADO_2.x, b3.MARMORE_RACHADO_2.y);

  // Platô Pós-Escada / Checkpoint 4 e Antecâmara
  plataforma(b3.PLATO_APOS_ESCADA);
  plataforma(b3.PLATO_ANTECAMARA);

  // Santuário Final
  const alturaMundo = MUNDO_FASE1.ALTURA;
  const s = SANTUARIO_FASE1;
  plataforma({ x: s.CHAO.x, y: alturaMundo - s.CHAO.yOffset, scaleX: s.CHAO.scaleX, scaleY: s.CHAO.scaleY });

  for (const xCol of s.COLUNAS_DOURADAS_X) {
    cena.add.image(xCol, alturaMundo - s.COLUNAS_DOURADAS_Y_OFFSET, 'coluna-dourada').setDepth(2);
  }

  const luzSantuario = cena.add.graphics();
  luzSantuario.fillStyle(0xfef08a, 0.18);
  for (const feixe of s.FEIXES_LUZ) {
    luzSantuario.fillTriangle(feixe.topoX, 0, feixe.baseX1, feixe.baseY, feixe.baseX2, feixe.baseY);
  }

  const portalFinal = cena.add.sprite(s.PORTAL.x, alturaMundo - s.PORTAL.yOffset, 'portal-santuario');
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
    sentinelas,
    npcs,
    totens,
    sentinela1,
    barreiraEscudo,
    graficoEscudo,
    elevadorNuvem,
    portaoMilenar,
    colisorPortao,
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
