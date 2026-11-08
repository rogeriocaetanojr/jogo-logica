import Phaser from 'phaser';
import { COR, folhaPixel, misturar, sombrear } from '../ArteFaseFinal';

/**
 * Pixel art dos inimigos dos andares (o Drone Captcha fica em npcs/TexturasNpc).
 * Todos com o vermelho do Mega Brain nos olhos/lentes, virados para a esquerda.
 */

export const TEX_INIMIGOS = {
  SPAM_BOT: 'ff-spam-bot',
  TORRETA: 'ff-torreta-firewall',
  ALUCINACAO: 'ff-alucinacao',
} as const;

export const ANIM_INIMIGOS = {
  SPAM_BOT_ANDA: 'ff-spam-bot-anda',
  ALUCINACAO_GLITCH: 'ff-alucinacao-glitch',
} as const;

export function gerarTexturasInimigos(cena: Phaser.Scene): void {
  // Spam Bot: caixinha com olho vermelho, envelope no peito e antena; 2 quadros de passo
  folhaPixel(cena, TEX_INIMIGOS.SPAM_BOT, 24, 20, 2, (p, q) => {
    const corpo = '#3a3f5c';
    p.px(3, 3, 18, 12, sombrear(corpo, 0.4));
    p.px(4, 3, 16, 11, corpo);
    p.px(4, 3, 16, 1, misturar(corpo, '#ffffff', 0.25));
    // Tela com olho
    p.px(5, 5, 7, 5, '#05070f');
    p.px(6, 6, 3, 3, COR.vermelho);
    p.ponto(6, 6, '#ffd0d6');
    // Envelope de spam
    p.px(13, 6, 6, 5, COR.branco);
    p.linha(13, 6, 16, 8, '#8b90a8');
    p.linha(18, 6, 16, 8, '#8b90a8');
    p.ponto(18, 10, COR.vermelho);
    // Antena
    p.px(16, 0, 1, 3, COR.metal);
    p.ponto(16, 0, COR.vermelho);
    // Perninhas
    const passo = q === 0 ? [5, 15] : [7, 13];
    p.px(passo[0], 15, 3, 4, COR.metal);
    p.px(passo[1], 15, 3, 4, COR.metal);
    p.px(passo[0] - 1, 19, 5, 1, '#15161f');
    p.px(passo[1] - 1, 19, 5, 1, '#15161f');
  });
  if (!cena.anims.exists(ANIM_INIMIGOS.SPAM_BOT_ANDA)) {
    cena.anims.create({
      key: ANIM_INIMIGOS.SPAM_BOT_ANDA,
      frames: cena.anims.generateFrameNumbers(TEX_INIMIGOS.SPAM_BOT, { frames: [0, 1] }),
      frameRate: 6,
      repeat: -1,
    });
  }

  // Torreta Firewall: base presa ao chão, cúpula e cano; quadro 1 = lente carregando
  folhaPixel(cena, TEX_INIMIGOS.TORRETA, 24, 26, 2, (p, q) => {
    p.px(3, 18, 18, 8, COR.metal);
    p.px(3, 18, 18, 1, COR.metalClaro);
    for (let x = 4; x < 21; x += 4) p.px(x, 21, 2, 2, COR.janelaQuente); // faixa de advertência
    p.disco(12, 13, 7, '#2b2f45');
    p.disco(12, 12, 6, '#3a3f5c');
    p.px(0, 11, 9, 4, COR.metal); // cano para a esquerda
    p.px(0, 11, 9, 1, COR.metalClaro);
    p.disco(13, 11, 3, q === 1 ? COR.vermelho : COR.vermelhoEscuro);
    if (q === 1) p.ponto(12, 10, '#ffd0d6');
    p.px(0, 12, 2, 2, q === 1 ? COR.vermelho : COR.vermelhoEscuro);
    p.texto('FW', 8, 2, COR.vermelho, 1);
  });

  // Alucinação: holograma humanoide com linhas de varredura e olhos vermelhos; quadro 1 = glitch
  folhaPixel(cena, TEX_INIMIGOS.ALUCINACAO, 24, 54, 2, (p, q) => {
    const cor = COR.magenta;
    const borda = COR.ciano;
    const fatia = (y0: number, y1: number, dx: number) => {
      for (let y = y0; y < y1; y++) {
        if (y % 3 === 2) continue; // linhas de varredura vazadas
        const meia = y < 14 ? 5 : y < 34 ? 8 : 6;
        const cx = 12 + dx;
        p.px(cx - meia, y, meia * 2, 1, misturar(cor, '#ffffff', y < 14 ? 0.15 : 0));
        p.ponto(cx - meia, y, borda);
        p.ponto(cx + meia - 1, y, borda);
      }
    };
    const glitch = q === 1;
    fatia(2, 14, 0); // cabeça
    fatia(14, 34, glitch ? 2 : 0); // tronco
    fatia(34, 54, glitch ? -1 : 0); // pernas
    // Olhos vermelhos
    p.px(8, 7, 3, 2, COR.vermelho);
    p.px(13, 7, 3, 2, COR.vermelho);
    // Texto genérico flutuando no peito
    p.px(7 + (glitch ? 2 : 0), 22, 10, 1, '#ffd6f4');
    p.px(7 + (glitch ? 2 : 0), 25, 7, 1, '#ffd6f4');
  });
  if (!cena.anims.exists(ANIM_INIMIGOS.ALUCINACAO_GLITCH)) {
    cena.anims.create({
      key: ANIM_INIMIGOS.ALUCINACAO_GLITCH,
      frames: cena.anims.generateFrameNumbers(TEX_INIMIGOS.ALUCINACAO, { frames: [0, 0, 0, 1, 0, 1] }),
      frameRate: 8,
      repeat: -1,
    });
  }
}
