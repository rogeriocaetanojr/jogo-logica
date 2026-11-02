import Phaser from 'phaser';
import { CORES_FASE1 as C } from './ArteFase1';

type Grafico = Phaser.GameObjects.Graphics;

/**
 * Gera uma textura procedural uma única vez por chave (reaproveitada entre visitas à fase).
 */
export function gerar(cena: Phaser.Scene, chave: string, w: number, h: number, desenhar: (g: Grafico) => void): void {
  if (cena.textures.exists(chave)) return;
  const g = cena.make.graphics();
  desenhar(g);
  g.generateTexture(chave, w, h);
  g.destroy();
}

/**
 * Polígono preenchido a partir de pontos simples.
 */
export function poligono(g: Grafico, pontos: readonly Phaser.Types.Math.Vector2Like[]): void {
  g.fillPoints(pontos.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
}

/**
 * Faixa de mármore em blocos com friso dourado no topo (base das plataformas e do rachado).
 */
function blocosMarmore(g: Grafico, w: number, h: number, friso: number, corFriso: number): void {
  g.fillStyle(C.MARMORE, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(C.MARMORE_LUZ, 1);
  g.fillRect(0, friso + 1, w, 1);
  const meio = Math.round((h + friso) / 2);
  g.fillStyle(C.MARMORE_SOMBRA, 1);
  g.fillRect(0, meio - 1, w, 2);
  for (let x = 20; x < w; x += 32) g.fillRect(x, friso, 2, meio - friso - 1);
  for (let x = 4; x < w; x += 32) g.fillRect(x, meio + 1, 2, h - meio - 1);
  g.fillStyle(C.MARMORE_LUZ, 1);
  g.fillRect(0, meio + 1, w, 1);
  g.fillStyle(C.MARMORE_SOMBRA, 1);
  g.fillRect(0, h - 6, w, 3);
  g.fillStyle(C.MARMORE_ESCURO, 1);
  g.fillRect(0, h - 3, w, 3);

  g.fillStyle(corFriso, 1);
  g.fillRect(0, 0, w, friso);
  g.fillStyle(C.OURO_CLARO, 1);
  g.fillRect(0, 1, w, 1);
  g.fillStyle(C.OURO_ESCURO, 1);
  g.fillRect(0, friso - 1, w, 1);
}

/**
 * Nuvem fofa com sombra lilás embaixo e topo reto (o topo é a superfície de colisão).
 */
function nuvemFofa(g: Grafico, alfa: number): void {
  cumulo(g, alfa, NUVEM_PLATAFORMA);
}

/** Bolos de cima (x, y, raio) e bolos de baixo da nuvem-plataforma (200x44). */
const NUVEM_PLATAFORMA = {
  cima: [
    [22, 17, 14],
    [50, 15, 15],
    [82, 14, 16],
    [116, 13, 17],
    [150, 14, 16],
    [178, 17, 14],
  ],
  baixo: [
    [30, 30, 12],
    [64, 31, 13],
    [100, 31, 13],
    [136, 31, 13],
    [170, 30, 12],
  ],
} as const;

/**
 * Nuvem em camadas: contorno lilás, corpo sombreado, bolos brancos deslocados para o alto
 * (luz vindo de cima), brilho nos bolos maiores e um rubor rosa embaixo.
 */
export function cumulo(
  g: Grafico,
  alfa: number,
  forma: { readonly cima: readonly (readonly number[])[]; readonly baixo: readonly (readonly number[])[] }
): void {
  const todos = [...forma.cima, ...forma.baixo];
  const xs = todos.map(([x]) => x);
  const esquerda = Math.min(...xs);
  const direita = Math.max(...xs);
  const meioY = forma.cima.reduce((s, [, y]) => s + y, 0) / forma.cima.length;
  const fundoY = forma.baixo.reduce((s, [, y]) => s + y, 0) / forma.baixo.length;

  g.fillStyle(C.NUVEM_SOMBRA_ESCURA, alfa);
  for (const [x, y, r] of todos) g.fillCircle(x, y, r + 2);
  g.fillRect(esquerda, meioY, direita - esquerda, fundoY - meioY);

  g.fillStyle(C.NUVEM_SOMBRA, alfa);
  for (const [x, y, r] of todos) g.fillCircle(x, y, r);
  g.fillRect(esquerda, meioY, direita - esquerda, fundoY - meioY);

  g.fillStyle(C.NUVEM, alfa);
  for (const [x, y, r] of forma.cima) g.fillCircle(x - 2, y - 3, r - 2);

  g.fillStyle(C.NUVEM_ROSA, alfa * 0.55);
  for (const [x, y, r] of forma.baixo) g.fillCircle(x + 3, y + 3, r * 0.45);

  g.fillStyle(C.FAIXA_CLARA, alfa);
  for (const [x, y, r] of forma.cima) {
    if (r >= 15) g.fillRect(x - r * 0.55, y - r * 0.55, r * 0.5, 2);
  }
}

/**
 * Totem rúnico: obelisco de mármore com glifos e a tela de holograma do terminal.
 */
function totemRunico(g: Grafico, corpo: number, sombra: number, glifo: number, tela: number, linha: number): void {
  // Pedestal
  g.fillStyle(C.MARMORE, 1);
  g.fillRect(4, 60, 44, 10);
  g.fillStyle(C.OURO, 1);
  g.fillRect(4, 58, 44, 3);
  // Obelisco e pirâmide dourada
  g.fillStyle(corpo, 1);
  poligono(g, [{ x: 10, y: 58 }, { x: 42, y: 58 }, { x: 38, y: 16 }, { x: 14, y: 16 }]);
  g.fillStyle(sombra, 1);
  poligono(g, [{ x: 28, y: 58 }, { x: 42, y: 58 }, { x: 38, y: 16 }, { x: 28, y: 16 }]);
  g.fillStyle(C.OURO, 1);
  g.fillTriangle(14, 16, 38, 16, 26, 4);
  g.fillStyle(C.OURO_ESCURO, 1);
  g.fillTriangle(26, 16, 38, 16, 26, 4);
  g.fillStyle(glifo, 1);
  g.fillRect(16, 50, 3, 6);
  g.fillRect(22, 52, 8, 2);
  g.fillRect(33, 50, 3, 6);
  // Cristal no topo
  g.fillStyle(C.CIANO_CLARO, 1);
  g.fillTriangle(22, 4, 30, 4, 26, 0);
  // Holograma flutuando na frente do obelisco
  g.fillStyle(tela, 0.3);
  g.fillRoundedRect(7, 22, 38, 24, 3);
  g.lineStyle(1, linha, 0.95);
  g.strokeRoundedRect(7, 22, 38, 24, 3);
  g.fillStyle(linha, 1);
  g.fillRect(11, 27, 18, 2);
  g.fillRect(11, 32, 26, 2);
  g.fillRect(11, 37, 12, 2);
  g.fillStyle(C.CIANO_BRILHO, 1);
  g.fillRect(25, 37, 4, 3);
}

/**
 * Gera todas as texturas procedurais da Fase 1 na paleta de ArteFase1 (mockups do Stitch).
 * As chaves e os tamanhos das texturas usadas em física não mudam: as hitboxes dependem deles.
 */
export function gerarTexturasFase1(cena: Phaser.Scene): void {
  // 1. Corpo das plataformas de mármore (fica invisível: o visual é a ilha flutuante)
  gerar(cena, 'marmore-bloco', 240, 36, (g) => blocosMarmore(g, 240, 36, 5, C.OURO));

  // 1b. Laje de mármore repetida pelas ilhas, com musgo dourado escorrendo do friso
  gerar(cena, 'marmore-topo', 64, 36, (g) => {
    blocosMarmore(g, 64, 36, 5, C.OURO);
    g.lineStyle(1, C.MARMORE_VEIO, 1);
    g.lineBetween(8, 9, 15, 16);
    g.lineBetween(40, 25, 47, 31);
    g.lineBetween(30, 8, 33, 12);
    g.fillStyle(C.MUSGO, 1);
    g.fillRect(12, 5, 3, 3);
    g.fillRect(13, 8, 1, 2);
    g.fillRect(44, 5, 4, 2);
  });

  // 2. Mármore rachado: a rachadura brilha laranja por dentro
  gerar(cena, 'marmore-rachado', 180, 32, (g) => {
    blocosMarmore(g, 180, 32, 4, C.OURO_ESCURO);
    const racha = [
      [50, 0], [64, 12], [56, 20], [74, 32],
    ];
    const racha2 = [
      [122, 0], [110, 11], [134, 19], [124, 32],
    ];
    for (const [espessura, cor] of [
      [5, C.RACHADURA],
      [2, C.RACHADURA_BRILHO],
    ] as const) {
      g.lineStyle(espessura, cor, 1);
      for (const pontos of [racha, racha2]) {
        g.beginPath();
        g.moveTo(pontos[0][0], pontos[0][1]);
        for (const [x, y] of pontos.slice(1)) g.lineTo(x, y);
        g.strokePath();
      }
    }
    g.fillStyle(C.RACHADURA, 0.25);
    g.fillCircle(62, 16, 14);
    g.fillCircle(122, 16, 14);
  });

  // 3. Nuvem sólida
  gerar(cena, 'nuvem-solida', 200, 44, (g) => nuvemFofa(g, 1));

  // 4. Coluna jônica de mármore com capitel dourado (decoração)
  gerar(cena, 'coluna-marmore', 48, 260, (g) => {
    g.fillStyle(C.MARMORE, 1);
    g.fillRect(8, 24, 32, 222);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    for (const x of [15, 22, 29]) g.fillRect(x, 24, 2, 222);
    g.fillRect(34, 24, 6, 222);
    g.fillStyle(C.MARMORE_LUZ, 1);
    g.fillRect(9, 24, 2, 222);
    // Base
    g.fillStyle(C.MARMORE, 1);
    g.fillRect(2, 244, 44, 16);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    g.fillRect(34, 244, 12, 16);
    g.fillStyle(C.OURO, 1);
    g.fillRect(2, 244, 44, 4);
    // Capitel com volutas
    g.fillStyle(C.MARMORE, 1);
    g.fillRect(4, 2, 40, 6);
    g.fillStyle(C.OURO, 1);
    g.fillRect(0, 8, 48, 10);
    g.fillStyle(C.OURO_CLARO, 1);
    g.fillRect(2, 9, 44, 2);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillRect(0, 16, 48, 2);
    g.fillCircle(6, 20, 6);
    g.fillCircle(42, 20, 6);
    g.fillStyle(C.OURO, 1);
    g.fillCircle(6, 20, 2);
    g.fillCircle(42, 20, 2);
    g.fillStyle(C.MUSGO, 1);
    g.fillRect(14, 18, 3, 9);
    g.fillRect(30, 18, 3, 5);
  });

  // 4b. Fuste canelado repetido nos pilares da escada
  gerar(cena, 'fuste-coluna', 40, 32, (g) => {
    g.fillStyle(C.MARMORE, 1);
    g.fillRect(0, 0, 40, 32);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    for (const x of [9, 17, 25]) g.fillRect(x, 0, 2, 32);
    g.fillRect(31, 0, 9, 32);
    g.fillStyle(C.MARMORE_ESCURO, 1);
    g.fillRect(37, 0, 3, 32);
    g.fillStyle(C.MARMORE_LUZ, 1);
    g.fillRect(1, 0, 2, 32);
  });

  // 4c. Obelisco rúnico dos checkpoints
  gerar(cena, 'obelisco-runico', 48, 260, (g) => {
    g.fillStyle(C.MARMORE, 1);
    poligono(g, [{ x: 8, y: 240 }, { x: 40, y: 240 }, { x: 34, y: 34 }, { x: 14, y: 34 }]);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    poligono(g, [{ x: 26, y: 240 }, { x: 40, y: 240 }, { x: 34, y: 34 }, { x: 26, y: 34 }]);
    g.fillStyle(C.OURO, 1);
    g.fillTriangle(14, 34, 34, 34, 24, 6);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillTriangle(24, 34, 34, 34, 24, 6);
    // Glifos dourados e uma runa de vento acesa
    g.fillStyle(C.OURO_ESCURO, 1);
    for (let y = 60; y < 230; y += 30) {
      g.fillRect(20, y, 8, 3);
      g.fillRect(22, y + 6, 3, 10);
      g.fillRect(19, y + 18, 10, 2);
    }
    g.fillStyle(C.CIANO_CLARO, 0.35);
    g.fillCircle(24, 46, 9);
    g.fillStyle(C.CIANO_CLARO, 1);
    g.fillRect(20, 44, 8, 3);
    g.fillRect(23, 40, 2, 10);
    // Plinto
    g.fillStyle(C.MARMORE, 1);
    g.fillRect(2, 240, 44, 20);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    g.fillRect(32, 240, 14, 20);
    g.fillStyle(C.OURO, 1);
    g.fillRect(2, 240, 44, 4);
  });

  // 5. Coluna dourada da arena com uma fita de vento enrolada
  gerar(cena, 'coluna-dourada', 56, 320, (g) => {
    g.fillStyle(C.MARMORE, 1);
    g.fillRect(12, 30, 32, 262);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    for (const x of [19, 26, 33]) g.fillRect(x, 30, 2, 262);
    g.fillRect(38, 30, 6, 262);
    // Fita: parte de trás apagada, parte da frente clara
    for (let y = 40; y < 280; y += 46) {
      g.lineStyle(3, C.CIANO_CLARO, 0.35);
      g.lineBetween(44, y + 20, 12, y + 43);
      g.lineStyle(6, C.VENTO, 0.9);
      g.lineBetween(12, y, 44, y + 20);
      g.lineStyle(2, 0xffffff, 1);
      g.lineBetween(12, y - 2, 44, y + 18);
    }
    // Capitel e base dourados
    for (const [y, h] of [
      [6, 24],
      [292, 28],
    ] as const) {
      g.fillStyle(C.OURO, 1);
      g.fillRect(0, y, 56, h);
      g.fillStyle(C.OURO_CLARO, 1);
      g.fillRect(2, y + 2, 52, 3);
      g.fillStyle(C.OURO_ESCURO, 1);
      g.fillRect(0, y + h - 4, 56, 4);
      g.fillRect(6, y + 9, 44, 2);
    }
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillCircle(6, 30, 6);
    g.fillCircle(50, 30, 6);
    g.fillStyle(C.OURO_CLARO, 1);
    g.fillCircle(6, 30, 2);
    g.fillCircle(50, 30, 2);
  });

  // 6. Totem rúnico com holograma ciano
  gerar(cena, 'totem-celestial', 52, 70, (g) =>
    totemRunico(g, C.MARMORE, C.MARMORE_SOMBRA, C.OURO_ESCURO, C.CIANO, C.CIANO_CLARO)
  );

  // 6b. Totem do núcleo do Helio: dourado com a tela magenta dele
  gerar(cena, 'totem-nucleo', 52, 70, (g) =>
    totemRunico(g, C.OURO_CLARO, C.OURO, C.HELIO_VERMELHO, C.HELIO_CAPA, 0xf5d0fe)
  );

  // 7. Sentinela: cápsula escura com olho vermelho e cabos pendurados
  gerar(cena, 'sentinela-drone', 64, 64, (g) => {
    g.lineStyle(3, C.TECH_CLARO, 1);
    for (const [x1, x2, x3] of [
      [24, 18, 14],
      [32, 34, 30],
      [40, 46, 50],
    ]) {
      g.beginPath();
      g.moveTo(x1, 44);
      g.lineTo(x2, 54);
      g.lineTo(x3, 62);
      g.strokePath();
    }
    g.fillStyle(C.ALERTA, 1);
    g.fillRect(12, 60, 4, 4);
    g.fillRect(28, 60, 4, 4);
    g.fillRect(48, 60, 4, 4);
    // Aletas
    g.fillStyle(C.TECH_MEDIO, 1);
    g.fillTriangle(14, 14, 4, 22, 14, 34);
    g.fillTriangle(50, 14, 60, 22, 50, 34);
    // Cápsula
    g.fillStyle(C.TECH, 1);
    g.fillRoundedRect(14, 4, 36, 44, 16);
    g.fillStyle(C.TECH_MEDIO, 1);
    g.fillRoundedRect(17, 7, 14, 38, 8);
    g.fillStyle(C.TECH_REFLEXO, 1);
    g.fillRect(20, 10, 2, 14);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillRect(14, 40, 36, 3);
    // Olho
    g.fillStyle(C.ALERTA, 0.35);
    g.fillCircle(32, 24, 12);
    g.fillStyle(C.ALERTA, 1);
    g.fillCircle(32, 24, 7);
    g.fillStyle(C.ALERTA_CLARO, 1);
    g.fillCircle(34, 22, 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(34, 21, 2, 2);
  });

  // 8. Portão milenar: folhas de mármore, moldura dourada e núcleo de energia
  gerar(cena, 'portao-milenar', 40, 200, (g) => {
    g.fillStyle(C.MARMORE, 1);
    g.fillRect(0, 0, 40, 200);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    g.fillRect(26, 10, 11, 180);
    for (let y = 22; y < 186; y += 24) {
      g.fillStyle(C.OURO_ESCURO, 1);
      g.fillRect(6, y, 6, 2);
      g.fillRect(8, y + 4, 2, 6);
      g.fillRect(29, y + 6, 6, 2);
      g.fillRect(31, y, 2, 6);
    }
    g.fillStyle(C.TECH, 1);
    g.fillRect(16, 12, 8, 176);
    g.fillStyle(C.CIANO, 1);
    g.fillRect(18, 14, 4, 172);
    g.fillStyle(C.CIANO_BRILHO, 1);
    g.fillRect(19, 14, 1, 172);
    g.fillStyle(C.OURO, 1);
    g.fillRect(0, 0, 40, 10);
    g.fillRect(0, 190, 40, 10);
    g.fillStyle(C.OURO_CLARO, 1);
    g.fillRect(0, 2, 40, 2);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillRect(0, 0, 3, 200);
    g.fillRect(37, 0, 3, 200);
    g.fillRect(0, 8, 40, 2);
  });

  // 9. Placa de sinalização (texto dourado sobre fundo escuro, para ler de longe)
  gerar(cena, 'placa-runica', 150, 34, (g) => {
    g.fillStyle(C.TECH_MEDIO, 0.94);
    g.fillRoundedRect(0, 0, 150, 34, 6);
    g.lineStyle(2, C.OURO, 0.9);
    g.strokeRoundedRect(1, 1, 148, 32, 6);
    g.fillStyle(C.OURO, 1);
    g.fillRect(6, 15, 3, 3);
    g.fillRect(141, 15, 3, 3);
  });

  // 10. Portal do santuário: arco de mármore e ouro com redemoinho rosa e lilás
  gerar(cena, 'portal-santuario', 96, 160, (g) => {
    const arco = { tl: 48, tr: 48, bl: 0, br: 0 };
    g.fillStyle(C.MARMORE, 1);
    g.fillRoundedRect(0, 0, 96, 160, arco);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    g.fillRect(80, 40, 16, 120);
    g.lineStyle(4, C.OURO, 1);
    g.strokeRoundedRect(5, 5, 86, 160, { tl: 43, tr: 43, bl: 0, br: 0 });
    g.fillStyle(C.PORTAL_FUNDO, 1);
    g.fillRoundedRect(14, 14, 68, 146, { tl: 34, tr: 34, bl: 0, br: 0 });
    g.fillStyle(C.PORTAL_LILAS, 0.65);
    g.fillEllipse(48, 92, 56, 110);
    g.fillStyle(C.PORTAL_ROSA, 0.85);
    g.fillEllipse(48, 94, 36, 76);
    g.fillStyle(C.CIANO_BRILHO, 1);
    g.fillEllipse(48, 96, 14, 38);
    g.fillStyle(C.OURO, 1);
    g.fillRect(43, 0, 10, 12);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillRect(43, 10, 10, 2);
  });

  // 11. NPC 1: Sucatinha, drone desertor remendado (rotor torto, um olho bom e outro rachado, fita)
  gerar(cena, 'npc-sucatinha', 72, 72, desenharSucatinha);

  // 12. NPC 2: Mago da Nuvem Sem Salário (chapéu caído, barba de nuvem, manto remendado e caneca de moedas)
  gerar(cena, 'npc-mago-nuvem', 72, 96, desenharMago);

  // 13. Nuvem Efêmera: translúcida e com a base tracejada, para avisar que não é firme
  gerar(cena, 'nuvem-efemera', 200, 44, (g) => {
    nuvemFofa(g, 0.6);
    g.fillStyle(C.FAIXA_ESCURA, 0.95);
    for (let x = 20; x < 180; x += 18) g.fillRect(x, 39, 10, 3);
    g.fillStyle(0xffffff, 1);
    for (const [x, y] of [
      [40, 8],
      [100, 4],
      [160, 10],
    ]) {
      g.fillRect(x - 1, y - 4, 2, 8);
      g.fillRect(x - 4, y - 1, 8, 2);
    }
  });

  // 14. Plataforma em trilho: laje de mármore (os 24 px de cima, que colidem) sobre um casco
  // dourado com dois propulsores ciano. PlataformaMovelFase1 ajusta a origem e o corpo.
  gerar(cena, 'plataforma-trilho', 160, 48, (g) => {
    blocosMarmore(g, 160, 24, 5, C.OURO);
    g.fillStyle(C.MUSGO, 1);
    g.fillRect(18, 5, 3, 3);
    g.fillRect(112, 5, 4, 2);
    // Casco em quilha
    g.fillStyle(C.OURO_ESCURO, 1);
    poligono(g, [{ x: 6, y: 24 }, { x: 154, y: 24 }, { x: 136, y: 36 }, { x: 24, y: 36 }]);
    g.fillStyle(C.OURO, 1);
    g.fillRect(6, 24, 148, 3);
    g.fillStyle(C.OURO_SOMBRA, 1);
    g.fillRect(24, 34, 112, 2);
    for (let x = 30; x < 136; x += 18) g.fillCircle(x, 30, 1.5);
    // Propulsores com chama de vento
    for (const x of [44, 116]) {
      g.fillStyle(C.TECH_MEDIO, 1);
      g.fillRoundedRect(x - 9, 32, 18, 8, 3);
      g.fillStyle(C.TECH_REFLEXO, 1);
      g.fillRect(x - 7, 33, 4, 2);
      g.fillStyle(C.CIANO_CLARO, 0.35);
      g.fillEllipse(x, 44, 18, 10);
      g.fillStyle(C.CIANO_CLARO, 1);
      g.fillTriangle(x - 6, 40, x + 6, 40, x, 48);
      g.fillStyle(C.CIANO_BRILHO, 1);
      g.fillTriangle(x - 3, 40, x + 3, 40, x, 45);
    }
  });

  // 15. Balsa da Sentinela: casco escuro da sentinela aberto em plataforma, faixa verde de
  // "hackeado", olho apagado no meio e cabos virando estabilizadores (24 px de cima colidem)
  gerar(cena, 'plataforma-sentinela', 120, 48, (g) => {
    // Cabos pendurados
    g.lineStyle(3, C.TECH_CLARO, 1);
    for (const [x1, x2] of [
      [24, 18],
      [60, 60],
      [96, 102],
    ]) {
      g.beginPath();
      g.moveTo(x1, 30);
      g.lineTo(x2, 38);
      g.lineTo(x1, 46);
      g.strokePath();
    }
    g.fillStyle(C.HACKEADO, 1);
    for (const x of [22, 58, 94]) g.fillRect(x, 44, 4, 4);
    // Casco
    g.fillStyle(C.TECH, 1);
    poligono(g, [{ x: 0, y: 4 }, { x: 120, y: 4 }, { x: 110, y: 32 }, { x: 10, y: 32 }]);
    g.fillRoundedRect(0, 0, 120, 12, 6);
    g.fillStyle(C.TECH_MEDIO, 1);
    poligono(g, [{ x: 6, y: 12 }, { x: 114, y: 12 }, { x: 106, y: 28 }, { x: 14, y: 28 }]);
    g.fillStyle(C.TECH_REFLEXO, 1);
    g.fillRect(12, 14, 30, 2);
    // Convés verde
    g.fillStyle(C.HACKEADO, 1);
    g.fillRect(4, 2, 112, 5);
    g.fillStyle(C.HACKEADO_CLARO, 1);
    g.fillRect(4, 3, 112, 1);
    for (let x = 12; x < 112; x += 16) {
      g.fillStyle(C.TECH, 1);
      g.fillRect(x, 2, 2, 5);
    }
    // Olho apagado (verde) e friso dourado
    g.fillStyle(C.HACKEADO, 0.3);
    g.fillCircle(60, 19, 9);
    g.fillStyle(C.TECH, 1);
    g.fillCircle(60, 19, 6);
    g.fillStyle(C.HACKEADO_CLARO, 1);
    g.fillCircle(60, 19, 3);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillRect(10, 28, 100, 2);
    // Aletas
    g.fillStyle(C.TECH_MEDIO, 1);
    g.fillTriangle(0, 6, 0, 22, 10, 12);
    g.fillTriangle(120, 6, 120, 22, 110, 12);
  });

  // 16. NPC 3: Pombo-Correio Sindicalizado: sorriso de lado, carta no bico e boina do sindicato
  gerar(cena, 'npc-pombo', 72, 64, desenharPombo);

  // 17. Boss Helio: deus-sol showman. Loiro arrogante, pele de mármore, armadura branca com
  // faixa vermelha, capa magenta de palco, coroa de raios e braços cruzados.
  gerar(cena, 'boss-helio', 128, 144, desenharHelio);

  // 18. Gerador da escada de rajadas: carcaça pendurada sob o chão, com moldura dourada
  gerar(cena, 'gerador-vento', 96, 52, (g) => {
    g.fillStyle(C.TECH_MEDIO, 1);
    g.fillRoundedRect(4, 0, 88, 48, 8);
    g.fillStyle(C.TECH_CLARO, 1);
    g.fillRoundedRect(10, 6, 76, 36, 6);
    g.fillStyle(C.OURO, 1);
    g.fillRect(4, 0, 88, 4);
    g.fillStyle(C.TECH_REFLEXO, 1);
    g.fillRect(0, 14, 6, 20);
    g.fillRect(90, 14, 6, 20);
    g.fillStyle(C.TECH, 1);
    g.fillCircle(48, 26, 18);
    g.lineStyle(2, C.OURO_ESCURO, 1);
    g.strokeCircle(48, 26, 18);
  });

  // 19. Hélice do gerador (gira quando a coluna está ligada)
  gerar(cena, 'helice-gerador', 36, 36, (g) => {
    g.fillStyle(C.CIANO_BRILHO, 1);
    for (let i = 0; i < 4; i++) {
      const angulo = (i * Math.PI) / 2;
      g.fillTriangle(
        18,
        18,
        18 + Math.cos(angulo - 0.35) * 16,
        18 + Math.sin(angulo - 0.35) * 16,
        18 + Math.cos(angulo + 0.25) * 16,
        18 + Math.sin(angulo + 0.25) * 16
      );
    }
    g.fillStyle(C.OURO, 1);
    g.fillCircle(18, 18, 4);
  });

  // 20. Cristal solar (sensor energia_sol): gema lapidada com halo, raios e engaste dourado
  gerar(cena, 'cristal-solar', 64, 72, (g) => {
    const cx = 32;
    const cy = 36;
    // Halo e raios de sol
    g.fillStyle(C.SOL_HALO, 0.35);
    g.fillCircle(cx, cy, 30);
    g.fillStyle(C.OURO_CLARO, 0.8);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      g.fillTriangle(
        cx + Math.cos(a - 0.08) * 18,
        cy + Math.sin(a - 0.08) * 18,
        cx + Math.cos(a + 0.08) * 18,
        cy + Math.sin(a + 0.08) * 18,
        cx + Math.cos(a) * (i % 2 ? 26 : 31),
        cy + Math.sin(a) * (i % 2 ? 26 : 31)
      );
    }
    // Gema: coroa de cima e pavilhão de baixo, com facetas
    const topo = cy - 22;
    const cinta = cy - 6;
    const ponta = cy + 24;
    g.fillStyle(C.OURO, 1);
    poligono(g, [{ x: cx - 9, y: topo }, { x: cx + 9, y: topo }, { x: cx + 16, y: cinta }, { x: cx - 16, y: cinta }]);
    g.fillStyle(C.OURO_CLARO, 1);
    poligono(g, [{ x: cx - 9, y: topo }, { x: cx, y: topo }, { x: cx - 4, y: cinta }, { x: cx - 16, y: cinta }]);
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(cx - 7, topo + 2, cx - 2, topo + 2, cx - 9, cinta - 3);
    g.fillStyle(C.OURO, 1);
    g.fillTriangle(cx - 16, cinta, cx + 16, cinta, cx, ponta);
    g.fillStyle(C.OURO_CLARO, 1);
    g.fillTriangle(cx - 16, cinta, cx - 4, cinta, cx, ponta);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillTriangle(cx + 4, cinta, cx + 16, cinta, cx, ponta);
    g.fillStyle(C.OURO_SOMBRA, 1);
    g.fillRect(cx - 16, cinta - 1, 32, 2);
    // Brilhos
    g.fillStyle(0xffffff, 1);
    for (const [x, y] of [
      [cx + 20, cy - 20],
      [cx - 22, cy + 12],
    ]) {
      g.fillRect(x - 1, y - 4, 2, 8);
      g.fillRect(x - 4, y - 1, 8, 2);
    }
  });

  // 21. Torre da turbina (sensor energia_vento): fuste de mármore afinando, painéis e plinto dourado
  gerar(cena, 'turbina-base', 28, 70, (g) => {
    g.fillStyle(C.MARMORE, 1);
    poligono(g, [{ x: 9, y: 64 }, { x: 19, y: 64 }, { x: 16, y: 8 }, { x: 12, y: 8 }]);
    g.fillStyle(C.MARMORE_SOMBRA, 1);
    poligono(g, [{ x: 14, y: 64 }, { x: 19, y: 64 }, { x: 16, y: 8 }, { x: 14, y: 8 }]);
    g.fillStyle(C.MARMORE_ESCURO, 1);
    for (const y of [24, 40, 54]) g.fillRect(10, y, 8, 1);
    g.fillStyle(C.CIANO_CLARO, 1);
    g.fillRect(13, 30, 2, 6);
    g.fillStyle(C.OURO, 1);
    g.fillRect(4, 62, 20, 8);
    g.fillStyle(C.OURO_CLARO, 1);
    g.fillRect(4, 63, 20, 2);
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillRect(4, 68, 20, 2);
    // Nacele
    g.fillStyle(C.TECH_CLARO, 1);
    g.fillRoundedRect(4, 2, 20, 12, 5);
    g.fillStyle(C.TECH_REFLEXO, 1);
    g.fillRect(7, 4, 10, 2);
    g.fillStyle(C.OURO, 1);
    g.fillRect(4, 10, 20, 2);
  });

  // 22. Pás da turbina: três pás curvas com borda de ataque clara e cubo dourado
  gerar(cena, 'pas-turbina', 64, 64, (g) => {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const ponto = (raio: number, desvio: number) => ({
        x: 32 + Math.cos(a + desvio) * raio,
        y: 32 + Math.sin(a + desvio) * raio,
      });
      g.fillStyle(C.MARMORE_SOMBRA, 1);
      poligono(g, [ponto(5, -0.6), ponto(16, 0.28), ponto(29, 0.08), ponto(30, -0.02), ponto(16, -0.1)]);
      g.fillStyle(C.MARMORE_LUZ, 1);
      poligono(g, [ponto(5, -0.6), ponto(16, -0.1), ponto(30, -0.02), ponto(16, -0.22)]);
      g.fillStyle(C.ALERTA, 1);
      const pontaA = ponto(26, 0.04);
      g.fillCircle(pontaA.x, pontaA.y, 2);
    }
    g.fillStyle(C.OURO_ESCURO, 1);
    g.fillCircle(32, 32, 7);
    g.fillStyle(C.OURO, 1);
    g.fillCircle(32, 32, 5);
    g.fillStyle(C.OURO_CLARO, 1);
    g.fillCircle(31, 31, 2);
  });

  // 23. Placa de pressão rúnica (sensor placa_pressionada)
  gerar(cena, 'placa-pressao', 70, 10, (g) => {
    g.fillStyle(C.MARMORE_ESCURO, 1);
    g.fillRoundedRect(0, 0, 70, 10, 3);
    g.fillStyle(C.MARMORE, 1);
    g.fillRect(4, 2, 62, 4);
    g.fillStyle(C.OURO, 1);
    g.fillRect(31, 1, 8, 8);
    g.fillStyle(C.CIANO_CLARO, 1);
    g.fillRect(34, 3, 2, 4);
  });
}

/**
 * Helio de frente, braços cruzados, pés em (64, 144). Ordem: coroa → capa → corpo → cabeça.
 */
function desenharHelio(g: Grafico): void {
  // Coroa de raios atrás da cabeça
  g.fillStyle(C.OURO_CLARO, 0.45);
  g.fillCircle(64, 30, 30);
  g.fillStyle(C.OURO, 1);
  for (let i = 0; i <= 8; i++) {
    const angulo = Math.PI + (i / 8) * Math.PI;
    const raio = i % 2 === 0 ? 40 : 32;
    g.fillTriangle(
      64 + Math.cos(angulo - 0.14) * 20,
      30 + Math.sin(angulo - 0.14) * 20,
      64 + Math.cos(angulo + 0.14) * 20,
      30 + Math.sin(angulo + 0.14) * 20,
      64 + Math.cos(angulo) * raio,
      30 + Math.sin(angulo) * raio
    );
  }

  // Capa de palco: forro escuro, magenta por fora e barra dourada
  g.fillStyle(C.HELIO_CAPA_FORRO, 1);
  poligono(g, [{ x: 40, y: 52 }, { x: 88, y: 52 }, { x: 122, y: 142 }, { x: 6, y: 142 }]);
  g.fillStyle(C.HELIO_CAPA, 1);
  poligono(g, [{ x: 40, y: 52 }, { x: 50, y: 56 }, { x: 22, y: 142 }, { x: 6, y: 142 }]);
  poligono(g, [{ x: 88, y: 52 }, { x: 78, y: 56 }, { x: 106, y: 142 }, { x: 122, y: 142 }]);
  g.fillStyle(C.HELIO_CAPA_ESCURA, 1);
  g.fillTriangle(88, 52, 100, 100, 112, 142);
  g.fillStyle(C.OURO, 1);
  g.fillRect(6, 140, 16, 4);
  g.fillRect(106, 140, 16, 4);

  // Pernas e botas vermelhas
  g.fillStyle(C.HELIO_ARMADURA_SOMBRA, 1);
  g.fillRect(48, 100, 14, 32);
  g.fillRect(66, 100, 14, 32);
  g.fillStyle(C.HELIO_ARMADURA, 1);
  g.fillRect(48, 100, 9, 32);
  g.fillRect(66, 100, 9, 32);
  g.fillStyle(C.HELIO_VERMELHO, 1);
  g.fillRect(45, 128, 18, 16);
  g.fillRect(65, 128, 18, 16);
  g.fillStyle(C.OURO, 1);
  g.fillRect(45, 128, 18, 3);
  g.fillRect(65, 128, 18, 3);

  // Tronco de armadura branca com a faixa vermelha na diagonal
  g.fillStyle(C.HELIO_ARMADURA, 1);
  g.fillRoundedRect(42, 50, 44, 50, 8);
  g.fillStyle(C.HELIO_ARMADURA_SOMBRA, 1);
  g.fillRect(74, 54, 10, 44);
  g.fillStyle(C.HELIO_VERMELHO, 1);
  poligono(g, [{ x: 44, y: 52 }, { x: 54, y: 52 }, { x: 86, y: 92 }, { x: 86, y: 100 }, { x: 78, y: 100 }]);
  g.fillStyle(C.HELIO_VERMELHO_ESCURO, 1);
  poligono(g, [{ x: 70, y: 82 }, { x: 86, y: 92 }, { x: 86, y: 100 }, { x: 78, y: 100 }]);

  // Cinto com o sol
  g.fillStyle(C.OURO, 1);
  g.fillRect(44, 94, 40, 7);
  g.fillStyle(C.OURO_CLARO, 1);
  g.fillCircle(64, 97, 6);
  g.fillStyle(C.OURO_ESCURO, 1);
  g.fillCircle(64, 97, 3);

  // Ombreiras douradas
  g.fillStyle(C.OURO, 1);
  g.fillEllipse(40, 56, 22, 14);
  g.fillEllipse(88, 56, 22, 14);
  g.fillStyle(C.OURO_CLARO, 1);
  g.fillRect(32, 52, 12, 2);
  g.fillRect(80, 52, 12, 2);

  // Braços cruzados: o de trás mais escuro, o da frente por cima, manoplas de vento
  g.fillStyle(C.HELIO_ARMADURA_SOMBRA, 1);
  g.fillRoundedRect(34, 64, 58, 13, 6);
  g.fillStyle(C.HELIO_ARMADURA, 1);
  g.fillRoundedRect(36, 72, 56, 13, 6);
  g.fillStyle(C.HELIO_OLHO, 1);
  g.fillCircle(38, 78, 7);
  g.fillCircle(90, 70, 7);
  g.fillStyle(C.CIANO_BRILHO, 1);
  g.fillCircle(37, 77, 3);
  g.fillCircle(89, 69, 3);

  // Pescoço e cabeça de mármore
  g.fillStyle(C.HELIO_PELE_SOMBRA, 1);
  g.fillRect(58, 42, 12, 10);
  g.fillStyle(C.HELIO_PELE, 1);
  g.fillRoundedRect(50, 18, 28, 30, 10);
  g.fillStyle(C.HELIO_PELE_SOMBRA, 1);
  g.fillRect(70, 26, 6, 18);
  g.fillTriangle(56, 46, 72, 46, 64, 50);

  // Cabelo loiro espetado
  g.fillStyle(C.HELIO_CABELO_SOMBRA, 1);
  g.fillTriangle(48, 26, 44, 4, 60, 16);
  g.fillTriangle(56, 16, 58, 0, 70, 14);
  g.fillTriangle(66, 14, 80, 2, 78, 22);
  g.fillTriangle(76, 18, 90, 14, 80, 30);
  g.fillStyle(C.HELIO_CABELO, 1);
  g.fillRoundedRect(48, 12, 32, 12, 6);
  g.fillTriangle(48, 22, 38, 12, 54, 14);
  g.fillTriangle(52, 16, 50, 2, 62, 14);
  g.fillTriangle(60, 14, 68, 0, 72, 14);
  g.fillTriangle(70, 14, 84, 6, 80, 20);
  // Franja caindo sobre a testa
  g.fillTriangle(52, 22, 62, 22, 54, 30);
  g.fillTriangle(60, 22, 72, 22, 68, 29);
  g.fillStyle(C.HELIO_CABELO_LUZ, 1);
  g.fillRect(54, 14, 10, 2);
  g.fillRect(62, 6, 2, 8);

  // Rosto: sobrancelha erguida, olhos ciano semicerrados e sorriso torto
  g.fillStyle(C.HELIO_CABELO_SOMBRA, 1);
  g.fillRect(53, 29, 8, 2);
  poligono(g, [{ x: 67, y: 28 }, { x: 75, y: 25 }, { x: 75, y: 27 }, { x: 67, y: 30 }]);
  g.fillStyle(C.TECH_MEDIO, 1);
  g.fillRect(54, 33, 7, 2);
  g.fillRect(67, 33, 7, 2);
  g.fillStyle(C.HELIO_OLHO, 1);
  g.fillRect(57, 35, 3, 2);
  g.fillRect(70, 35, 3, 2);
  g.fillStyle(C.HELIO_VERMELHO_ESCURO, 1);
  g.fillRect(58, 42, 10, 2);
  g.fillRect(68, 40, 3, 2);
}

/**
 * Sucatinha (72x72): drone velho de metal gasto, rotor em cima, olho bom à direita e
 * rachado à esquerda, fita remendando o casco, antena entortada e bracinhos de garra.
 */
function desenharSucatinha(g: Grafico): void {
  const metal = 0x8b8178;
  const metalSombra = 0x6b625a;
  const metalLuz = 0xb8ada3;
  const escuro = 0x292524;
  const ferrugem = 0xc2703d;

  // Rotor girando (borrão) sobre o mastro
  g.fillStyle(metalSombra, 1);
  g.fillRect(33, 8, 5, 10);
  g.fillStyle(0xd6d3d1, 0.3);
  g.fillEllipse(36, 8, 60, 7);
  g.fillStyle(0xd6d3d1, 0.9);
  g.fillRect(10, 7, 52, 2);
  g.fillStyle(C.OURO_ESCURO, 1);
  g.fillCircle(36, 8, 3);

  // Bracinhos com garra
  g.lineStyle(3, metalSombra, 1);
  for (const lado of [-1, 1]) {
    g.beginPath();
    g.moveTo(36 + lado * 14, 54);
    g.lineTo(36 + lado * 18, 62);
    g.lineTo(36 + lado * 14, 68);
    g.strokePath();
    g.lineStyle(2, escuro, 1);
    g.lineBetween(36 + lado * 14, 68, 36 + lado * 10, 70);
    g.lineBetween(36 + lado * 14, 68, 36 + lado * 17, 71);
    g.lineStyle(3, metalSombra, 1);
  }
  // Propulsor de baixo, soltando um fiapo de fumaça
  g.fillStyle(escuro, 1);
  g.fillRect(30, 56, 12, 6);
  g.fillStyle(0xa8a29e, 0.5);
  g.fillCircle(30, 66, 3);
  g.fillCircle(26, 70, 2);

  // Casco redondo com sombra e brilho
  g.fillStyle(escuro, 1);
  g.fillCircle(36, 38, 23);
  g.fillStyle(metalSombra, 1);
  g.fillCircle(36, 38, 21);
  g.fillStyle(metal, 1);
  g.fillCircle(34, 36, 19);
  g.fillStyle(metalLuz, 0.8);
  g.fillCircle(27, 28, 7);
  g.fillStyle(0xffffff, 0.7);
  g.fillRect(24, 25, 4, 2);

  // Cinta com rebites
  g.fillStyle(0x57534e, 1);
  g.fillRect(14, 44, 44, 5);
  g.fillStyle(0xd6d3d1, 1);
  for (let x = 18; x < 56; x += 8) g.fillRect(x, 45, 2, 2);

  // Ferrugem e amassado
  g.fillStyle(ferrugem, 1);
  g.fillCircle(48, 50, 3);
  g.fillCircle(30, 22, 2);
  g.fillRect(20, 50, 4, 2);
  g.lineStyle(1, metalSombra, 1);
  g.strokeCircle(50, 28, 3);

  // Olho bom: lente amarela grande
  g.fillStyle(escuro, 1);
  g.fillCircle(42, 34, 11);
  g.fillStyle(C.OURO_ESCURO, 1);
  g.fillCircle(42, 34, 8);
  g.fillStyle(C.OURO, 1);
  g.fillCircle(42, 34, 6);
  g.fillStyle(escuro, 1);
  g.fillCircle(43, 35, 3);
  g.fillStyle(0xffffff, 1);
  g.fillRect(44, 30, 3, 3);

  // Olho rachado
  g.fillStyle(escuro, 1);
  g.fillCircle(23, 36, 5);
  g.fillStyle(C.OURO_ESCURO, 1);
  g.fillCircle(23, 36, 3);
  g.lineStyle(1, 0xffffff, 0.9);
  g.lineBetween(20, 33, 24, 37);
  g.lineBetween(24, 37, 22, 40);

  // Fita em X remendando o casco
  g.lineStyle(4, 0xe7e5e4, 1);
  g.lineBetween(46, 52, 54, 44);
  g.lineBetween(46, 44, 54, 52);

  // Antena entortada com a luz piscando
  g.lineStyle(2, metalSombra, 1);
  g.beginPath();
  g.moveTo(50, 20);
  g.lineTo(55, 12);
  g.lineTo(63, 13);
  g.strokePath();
  g.fillStyle(C.CIANO_CLARO, 0.35);
  g.fillCircle(64, 13, 6);
  g.fillStyle(C.CIANO_CLARO, 1);
  g.fillCircle(64, 13, 3);
}

/**
 * Mago da Nuvem Sem Salário (72x96): chapéu murcho com remendo, barba de nuvem,
 * manto roxo puído e remendado, cajado com nuvenzinha e a caneca de moedas vazia.
 */
function desenharMago(g: Grafico): void {
  const roxo = 0x7c3aed;
  const roxoSombra = 0x5b21b6;
  const roxoEscuro = 0x3b0764;
  const pele = 0xfcd9b6;
  const madeira = 0x92400e;

  // Cajado com nuvenzinha no topo
  g.lineStyle(4, madeira, 1);
  g.lineBetween(62, 30, 62, 94);
  g.lineStyle(1, 0xb45309, 1);
  g.lineBetween(61, 34, 61, 92);
  g.fillStyle(C.NUVEM_SOMBRA, 1);
  g.fillCircle(58, 26, 6);
  g.fillCircle(66, 25, 7);
  g.fillStyle(C.NUVEM, 1);
  g.fillCircle(57, 24, 5);
  g.fillCircle(65, 22, 6);
  g.fillStyle(C.CIANO_CLARO, 1);
  g.fillRect(69, 14, 2, 6);
  g.fillRect(67, 16, 6, 2);

  // Manto puído
  g.fillStyle(roxoSombra, 1);
  poligono(g, [{ x: 22, y: 50 }, { x: 52, y: 50 }, { x: 62, y: 92 }, { x: 10, y: 92 }]);
  g.fillStyle(roxo, 1);
  poligono(g, [{ x: 22, y: 50 }, { x: 40, y: 50 }, { x: 36, y: 92 }, { x: 10, y: 92 }]);
  // Barra rasgada em zigue-zague com fio dourado gasto
  g.fillStyle(C.OURO_ESCURO, 1);
  g.fillRect(10, 88, 52, 3);
  g.fillStyle(roxoEscuro, 1);
  for (let x = 12; x < 60; x += 8) g.fillTriangle(x, 92, x + 8, 92, x + 4, 86);
  // Remendos costurados
  g.fillStyle(0xc4b5fd, 1);
  g.fillRect(16, 74, 9, 9);
  g.fillStyle(0xfbbf24, 1);
  g.fillRect(44, 64, 7, 7);
  g.lineStyle(1, roxoEscuro, 1);
  for (const [x, y, t] of [
    [16, 74, 9],
    [44, 64, 7],
  ]) {
    g.lineBetween(x - 1, y + 2, x + 1, y + 2);
    g.lineBetween(x + t - 1, y + t - 2, x + t + 1, y + t - 2);
  }
  // Pés
  g.fillStyle(roxoEscuro, 1);
  g.fillEllipse(26, 93, 12, 5);
  g.fillEllipse(44, 93, 12, 5);

  // Mão com a caneca de moedas (vazia, claro)
  g.fillStyle(0x94a3b8, 1);
  g.fillRect(4, 66, 11, 12);
  g.fillStyle(0x64748b, 1);
  g.fillRect(4, 66, 11, 2);
  g.fillRect(13, 68, 2, 10);
  g.lineStyle(2, 0x64748b, 1);
  g.strokeCircle(2, 72, 3);
  g.fillStyle(pele, 1);
  g.fillCircle(17, 70, 4);
  // Mão no cajado
  g.fillCircle(60, 62, 4);

  // Rosto cansado
  g.fillStyle(pele, 1);
  g.fillEllipse(36, 42, 20, 14);
  g.fillStyle(0xe8b48c, 1);
  g.fillCircle(36, 45, 3);
  g.fillStyle(0x1e1b4b, 1);
  g.fillRect(29, 41, 4, 1);
  g.fillRect(39, 41, 4, 1);
  g.fillStyle(0x93c5fd, 1);
  g.fillRect(29, 43, 4, 1);

  // Barba de nuvem caindo até a barriga
  const barba = [
    [28, 50, 7],
    [36, 52, 9],
    [44, 50, 7],
    [31, 60, 8],
    [41, 61, 8],
    [36, 69, 7],
    [36, 76, 5],
  ] as const;
  g.fillStyle(C.NUVEM_SOMBRA_ESCURA, 1);
  for (const [x, y, r] of barba) g.fillCircle(x + 1, y + 2, r);
  g.fillStyle(C.NUVEM, 1);
  for (const [x, y, r] of barba) g.fillCircle(x, y, r);
  // Sobrancelhas de nuvem
  g.fillCircle(29, 37, 4);
  g.fillCircle(43, 37, 4);

  // Chapéu murcho: cone com a ponta caída, aba, fita dourada, estrela e remendo
  g.fillStyle(roxoSombra, 1);
  g.fillTriangle(18, 34, 54, 34, 40, 6);
  g.fillStyle(roxo, 1);
  g.fillTriangle(18, 34, 38, 34, 40, 6);
  g.fillStyle(roxoSombra, 1);
  g.fillTriangle(40, 6, 46, 12, 36, 14);
  g.fillTriangle(40, 6, 52, 10, 56, 20);
  g.fillStyle(0xfbbf24, 1);
  g.fillCircle(56, 21, 3);
  g.fillStyle(roxoEscuro, 1);
  g.fillEllipse(36, 35, 56, 9);
  g.fillStyle(C.OURO, 1);
  g.fillRect(22, 28, 29, 4);
  g.fillStyle(0xfef08a, 1);
  g.fillRect(30, 18, 2, 6);
  g.fillRect(28, 20, 6, 2);
  g.fillStyle(0xa78bfa, 1);
  g.fillRect(41, 18, 6, 6);
}

/**
 * Pombo-Correio (72x64), virado para a direita: pescoço iridescente, asa em penas, boina vermelha
 * torta, sobrancelha erguida, olho de meia-pálpebra e uma carta (com lacre) presa no bico.
 */
function desenharPombo(g: Grafico): void {
  const cinza = 0x94a3b8;
  const cinzaEscuro = 0x64748b;
  const cinzaClaro = 0xcbd5e1;
  const tinta = 0x1e1b4b;

  // Pernas e pés
  g.lineStyle(3, 0xf97316, 1);
  g.lineBetween(26, 52, 24, 61);
  g.lineBetween(36, 52, 37, 61);
  g.lineStyle(2, 0xf97316, 1);
  for (const x of [24, 37]) {
    g.lineBetween(x, 61, x - 5, 63);
    g.lineBetween(x, 61, x + 5, 63);
    g.lineBetween(x, 61, x, 63);
  }

  // Cauda em leque
  g.fillStyle(cinzaEscuro, 1);
  g.fillTriangle(14, 38, 0, 40, 6, 50);
  g.fillTriangle(14, 42, 2, 50, 12, 56);
  g.fillStyle(0x475569, 1);
  g.fillTriangle(14, 44, 6, 56, 18, 52);

  // Corpo com barriga clara
  g.fillStyle(cinza, 1);
  g.fillEllipse(30, 42, 46, 30);
  g.fillStyle(cinzaClaro, 1);
  g.fillEllipse(36, 47, 28, 16);

  // Asa em camadas de penas
  g.fillStyle(cinzaEscuro, 1);
  g.fillEllipse(24, 40, 30, 20);
  g.fillStyle(0x475569, 1);
  for (let i = 0; i < 4; i++) g.fillEllipse(14 + i * 6, 46 - i * 0.5, 9, 11);
  g.fillStyle(cinza, 1);
  for (let i = 0; i < 3; i++) g.fillEllipse(18 + i * 6, 38, 8, 8);
  g.lineStyle(1, cinzaClaro, 1);
  g.lineBetween(14, 36, 30, 34);
  g.lineBetween(12, 42, 18, 54);

  // Pescoço iridescente (verde → magenta) e colar de penas
  g.fillStyle(0x0f766e, 1);
  g.fillEllipse(47, 31, 20, 20);
  g.fillStyle(0x34d399, 1);
  g.fillEllipse(46, 29, 14, 12);
  g.fillStyle(0xc026d3, 0.85);
  g.fillEllipse(50, 35, 12, 8);

  // Cabeça
  g.fillStyle(cinza, 1);
  g.fillCircle(51, 20, 12);
  g.fillStyle(cinzaClaro, 1);
  g.fillCircle(49, 25, 6);

  // Boina do sindicato torta, com botão dourado
  g.fillStyle(0x991b1b, 1);
  g.fillEllipse(48, 10, 24, 9);
  g.fillStyle(0xef4444, 1);
  g.fillEllipse(47, 8, 20, 8);
  g.fillStyle(0xfcd34d, 1);
  g.fillCircle(44, 4, 2);
  g.fillStyle(0xfef3c7, 1);
  g.fillRect(52, 8, 5, 2);

  // Carta no bico: envelope com aba, lacre e uma pontinha dobrada
  g.fillStyle(0xfffbeb, 1);
  g.fillRoundedRect(56, 26, 15, 11, 1);
  g.lineStyle(1, 0xd6c9a8, 1);
  g.lineBetween(56, 26, 63.5, 32);
  g.lineBetween(71, 26, 63.5, 32);
  g.strokeRoundedRect(56, 26, 15, 11, 1);
  g.fillStyle(0xdc2626, 1);
  g.fillCircle(63.5, 32, 2.5);
  g.fillStyle(0xfca5a5, 1);
  g.fillRect(62, 31, 1, 1);
  g.fillStyle(0xfcd34d, 1);
  g.fillTriangle(70, 36, 71, 36, 71, 33);

  // Bico por cima da carta
  g.fillStyle(0xf97316, 1);
  g.fillTriangle(58, 18, 67, 23, 58, 27);
  g.fillStyle(0xc2410c, 1);
  g.fillTriangle(58, 24, 67, 23, 58, 27);
  g.fillStyle(0xfed7aa, 1);
  g.fillRect(60, 20, 3, 1);

  // Cara de safado: olho de meia-pálpebra, sobrancelha erguida, sorriso torto e bochecha
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(53, 19, 9, 7);
  g.fillStyle(tinta, 1);
  g.fillCircle(55, 20, 2.2);
  g.fillStyle(0xffffff, 1);
  g.fillRect(55, 19, 1, 1);
  g.fillStyle(cinza, 1);
  g.fillRect(48, 14, 12, 4); // pálpebra caída sobre o olho
  g.lineStyle(2, tinta, 1);
  g.lineBetween(48, 18, 58, 18);
  g.lineBetween(49, 13, 60, 10); // sobrancelha erguida, só de um lado
  g.lineStyle(1.5, tinta, 1);
  g.beginPath();
  g.moveTo(52, 26);
  g.lineTo(56, 28);
  g.lineTo(58, 25);
  g.strokePath();
  g.fillStyle(0xf9a8d4, 0.8);
  g.fillCircle(50, 24, 2.5);

  // Crachá do sindicato no peito
  g.fillStyle(0xef4444, 1);
  g.fillRoundedRect(38, 42, 9, 7, 1);
  g.fillStyle(0xfcd34d, 1);
  g.fillRect(41, 44, 3, 3);
  g.fillStyle(0xfef3c7, 1);
  g.fillRect(39, 43, 7, 1);
}
