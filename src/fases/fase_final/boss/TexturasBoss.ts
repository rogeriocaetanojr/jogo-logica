import Phaser from 'phaser';
import { COR, desenharLogoMegaBrain, folhaPixel, misturar, sombrear, texturaPixel, texturaSuave } from '../ArteFaseFinal';
import {
  desenharAguia,
  desenharAnelProjetil,
  desenharCanhao,
  desenharCaveira,
  desenharCerebro,
  desenharEmojiProjetil,
  desenharGarra,
  desenharLaje,
  desenharLaser,
  desenharOlhoGrande,
  desenharPistao,
  desenharPlacaCommit,
  desenharSerra,
  desenharTelaRosto,
  desenharTita,
  QUADROS_PROJETIL,
} from './ArteFormas';

/**
 * Texturas do boss e das arenas. A forma 1 (Copycat) usa os sprites finais carregados de
 * public/assets/fase_final/boss; as formas 2 a 4 são placeholders desenhados por código
 * (roteiro, seção 13), com chaves previsíveis para trocar por arte final depois:
 * basta carregar um spritesheet com a mesma chave e o mesmo número de quadros.
 */
export const TEX_BOSS = {
  copycat: (personagem: string) => `ff-copycat-${personagem}`,
  /** 80x92 de arte, 7 quadros: 0 parado, 1 preparo, 2 investida, 3 travado, 4 mira, 5 respirando, 6 investida (capa). */
  TITA: 'ff-boss-tita',
  /** 128x80 de arte, 7 quadros: 0-3 batida de asas, 4 grito, 5 rasante/mergulho, 6 presa. */
  AGUIA: 'ff-boss-aguia',
  /** 60x64 de arte, 4 quadros: 0 normal, 1 tonta, 2 boca aberta, 3 olhos acesos. */
  CAVEIRA: 'ff-boss-caveira',
  BRACO_SERRA: 'ff-braco-serra',
  BRACO_LASER: 'ff-braco-laser',
  BRACO_CANHAO: 'ff-braco-canhao',
  BRACO_GARRA: 'ff-braco-garra',
  PENA: 'ff-pena-metal',
  VAPOR: 'ff-saida-vapor',
  TERRACO_ACESSO: 'ff-terraco-acesso',
  TERRACO_CAIXA: 'ff-terraco-caixa',
  TERRACO_ANTENA: 'ff-terraco-antena',
  TERRACO_LETREIRO: 'ff-terraco-letreiro',
  TERRACO_MURETA: 'ff-terraco-mureta',
  /** Fumaça macia (vapor, poeira, explosões), pintada com tint. */
  FUMACA: 'ff-fumaca',
  /** Holograma do cérebro do Mega Brain (intro do Copycat). */
  CEREBRO: 'ff-cerebro-holo',
  /** Forma 5: corpo 128x100 (2 quadros), olho grande 28x20 (4), tela do rosto 30x22 (8). */
  SERAFICO: 'ff-boss-serafico',
  OLHO_GRANDE: 'ff-boss-olho-grande',
  ROSTO: 'ff-boss-rosto',
  EMOJI: 'ff-projetil-emoji',
  ANEL: 'ff-projetil-anel',
  LAJE_JOGADOR: 'ff-nucleo-laje',
  LAJE_BOSS: 'ff-nucleo-laje-boss',
  PISTAO: 'ff-nucleo-pistao',
  PLACA_COMMIT: 'ff-nucleo-placa-9b40',
} as const;

/** Quadros das animações das formas (para o código das formas não depender de números soltos). */
export const QUADROS_BOSS = {
  TITA: { PARADO: 0, PREPARO: 1, INVESTIDA: 2, TRAVADO: 3, MIRA: 4, RESPIRA: 5, INVESTIDA_B: 6 },
  AGUIA: { BATER: [0, 1, 2, 3, 2, 1] as readonly number[], GRITO: 4, RASANTE: 5, PRESA: 6 },
  CAVEIRA: { NORMAL: 0, TONTA: 1, BOCA: 2, ACESA: 3 },
  OLHO: { FECHADO: 0, ABRINDO: 1, ABERTO: 2, FERIDO: 3 },
  ROSTO: { NEUTRO: 0, RAIVA: 1, RISADA: 2, SUSTO: 3, TONTO: 4, PROCESSANDO: 5, JOINHA: 6, VERGONHA: 7 },
} as const;

/** Caminho dos sprites finais do Copycat (um por protagonista). */
export function caminhoCopycat(personagem: string): string {
  return `assets/fase_final/boss/copycat_${personagem}.png`;
}

export function gerarTexturasBoss(cena: Phaser.Scene): void {
  folhaPixel(cena, TEX_BOSS.TITA, 80, 92, 7, desenharTita);
  folhaPixel(cena, TEX_BOSS.AGUIA, 128, 80, 7, desenharAguia);
  folhaPixel(cena, TEX_BOSS.CAVEIRA, 60, 64, 4, desenharCaveira);
  folhaPixel(cena, TEX_BOSS.BRACO_SERRA, 32, 32, 4, desenharSerra);
  folhaPixel(cena, TEX_BOSS.BRACO_LASER, 24, 30, 3, desenharLaser);
  folhaPixel(cena, TEX_BOSS.BRACO_CANHAO, 28, 32, 2, desenharCanhao);
  folhaPixel(cena, TEX_BOSS.BRACO_GARRA, 32, 36, 2, desenharGarra);
  texturaSuave(cena, TEX_BOSS.FUMACA, 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.6)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.15)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  texturaPixel(cena, TEX_BOSS.CEREBRO, 48, 42, (p) => desenharLogoMegaBrain(p, 24, 21, 21));
  folhaPixel(cena, TEX_BOSS.SERAFICO, 128, 100, 2, desenharCerebro);
  folhaPixel(cena, TEX_BOSS.OLHO_GRANDE, 28, 20, 4, desenharOlhoGrande);
  folhaPixel(cena, TEX_BOSS.ROSTO, 30, 22, 8, desenharTelaRosto);
  folhaPixel(cena, TEX_BOSS.EMOJI, 14, 14, QUADROS_PROJETIL, desenharEmojiProjetil);
  texturaPixel(cena, TEX_BOSS.ANEL, 16, 16, desenharAnelProjetil);
  texturaPixel(cena, TEX_BOSS.LAJE_JOGADOR, 32, 24, (p) => desenharLaje(p, COR.ciano));
  texturaPixel(cena, TEX_BOSS.LAJE_BOSS, 32, 24, (p) => desenharLaje(p, COR.vermelho));
  texturaPixel(cena, TEX_BOSS.PISTAO, 28, 16, desenharPistao);
  folhaPixel(cena, TEX_BOSS.PLACA_COMMIT, 80, 16, 2, desenharPlacaCommit);
  texturaPixel(cena, TEX_BOSS.PENA, 12, 4, (p) => {
    p.px(0, 1, 12, 2, COR.metalClaro);
    p.px(0, 1, 3, 2, COR.magenta);
    p.px(9, 0, 3, 4, COR.metal);
  });
  // Saída de vapor: grelha com aletas, faixas de advertência e lâmpadas (quadro 1 = aviso aceso)
  folhaPixel(cena, TEX_BOSS.VAPOR, 40, 12, 2, (p, q) => {
    p.px(0, 4, 40, 8, COR.contorno);
    p.px(1, 4, 38, 7, COR.concretoEscuro);
    p.px(1, 4, 38, 1, COR.metalClaro);
    for (let x = 0; x < 40; x += 4) {
      p.px(x, 10, 2, 2, COR.janelaQuente);
      p.px(x + 2, 10, 2, 2, '#1a1a1a');
    }
    p.px(6, 6, 28, 4, '#05060c');
    for (let x = 7; x < 33; x += 3) {
      p.px(x, 6, 1, 4, COR.metal);
      p.ponto(x, 6, COR.metalClaro);
    }
    const luz = q === 1 ? COR.vermelho : COR.vermelhoEscuro;
    for (const x of [1, 35]) {
      p.px(x, 0, 4, 4, COR.contorno);
      p.px(x + 1, 1, 2, 3, luz);
      if (q === 1) p.ponto(x + 1, 1, '#ffd0d6');
    }
  });
  gerarTerraco(cena);
}

/* =========================================================================
 * TERRAÇO: casinha da escada, caixa d'água, antena, letreiro e mureta
 * ========================================================================= */

function gerarTerraco(cena: Phaser.Scene): void {
  texturaPixel(cena, TEX_BOSS.TERRACO_ACESSO, 72, 100, (p) => {
    p.px(0, 10, 72, 90, COR.concretoEscuro);
    p.px(2, 12, 68, 88, COR.concreto);
    p.px(0, 6, 72, 6, COR.concretoClaro);
    p.px(0, 6, 72, 1, COR.metalClaro);
    for (let y = 22; y < 100; y += 10) p.px(2, y, 68, 1, sombrear(COR.concreto, 0.2));
    // Porta com luz
    p.px(20, 38, 32, 62, '#0c0e1c');
    p.px(22, 40, 28, 60, misturar(COR.janelaFria, COR.concreto, 0.55));
    p.px(22, 40, 28, 2, COR.janelaFria);
    p.px(44, 70, 3, 3, COR.metalClaro);
    // Placa SAÍDA
    p.px(22, 26, 28, 9, '#05060c');
    p.textoCentro('SAIDA', 36, 28, COR.ciano, 1);
  });
  texturaPixel(cena, TEX_BOSS.TERRACO_CAIXA, 60, 80, (p) => {
    p.px(4, 4, 52, 44, '#253058');
    p.px(6, 6, 48, 40, '#2f3c6c');
    p.px(4, 4, 52, 2, COR.metalClaro);
    for (let x = 10; x < 54; x += 8) p.px(x, 6, 1, 40, '#253058');
    p.textoCentro('AGUA', 30, 22, COR.janelaFria, 1);
    for (const x of [8, 48]) p.px(x, 48, 4, 32, COR.metal);
    p.linha(10, 52, 50, 76, COR.metal);
    p.linha(50, 52, 10, 76, COR.metal);
  });
  folhaPixel(cena, TEX_BOSS.TERRACO_ANTENA, 24, 150, 2, (p, q) => {
    p.px(11, 8, 2, 142, COR.metal);
    for (let y = 20; y < 150; y += 18) {
      p.linha(5, y, 19, y + 12, COR.metal);
      p.linha(19, y, 5, y + 12, COR.metal);
    }
    p.px(6, 30, 12, 2, COR.metalClaro);
    p.px(4, 60, 16, 2, COR.metalClaro);
    p.disco(12, 5, 3, q === 1 ? COR.vermelho : COR.vermelhoEscuro);
  });
  texturaPixel(cena, TEX_BOSS.TERRACO_LETREIRO, 180, 90, (p) => {
    // Andaime
    for (const x of [20, 90, 160]) p.px(x, 46, 3, 44, COR.metal);
    p.linha(20, 60, 160, 88, COR.metal);
    p.linha(160, 60, 20, 88, COR.metal);
    // Placa
    p.px(0, 0, 180, 48, '#0a0b18');
    p.moldura(0, 0, 180, 48, COR.vermelhoEscuro);
    p.moldura(2, 2, 176, 44, COR.vermelho);
    desenharLogoMegaBrain(p, 26, 24, 15);
    p.texto('MEGA BRAIN', 48, 12, COR.branco, 2);
    p.texto('PENSE MENOS', 52, 30, COR.vermelho, 1);
  });
  texturaPixel(cena, TEX_BOSS.TERRACO_MURETA, 64, 14, (p) => {
    p.px(0, 0, 64, 14, COR.concreto);
    p.px(0, 0, 64, 2, COR.concretoClaro);
    p.px(0, 12, 64, 2, COR.concretoEscuro);
    p.px(30, 2, 2, 10, COR.concretoEscuro);
    p.px(0, 6, 64, 1, COR.vermelhoEscuro);
  });
}
