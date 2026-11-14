import Phaser from 'phaser';
import type { CenaFase3 } from '../CenaFase3';
import { PROF } from '../trechos/TrechoLixao';

/** Aviso de um telão: título amarelo e linhas em verde de terminal. */
export interface Aviso {
  titulo: string;
  linhas: readonly string[];
}

const TELAO = {
  LARGURA: 460,
  /** Topo da tela (px de mundo; a câmera não rola na vertical). */
  Y: 64,
  /** Até onde descem as pernas da torre (horizonte). */
  PERNAS_ATE: 430,
  ALTURA_TITULO: 44,
  ALTURA_LINHA: 36,
  MARGEM_BAIXO: 14,
} as const;

const FONTE = 'Consolas, "Courier New", monospace';
export const COR_LINHA = '#7dffb0';
export const COR_LINHA_APAGADA = '#2f7a52';

/**
 * Telão velho de propaganda, longe no céu (atrás das pilhas), com um aviso para o jogador.
 * Fixo por padrão; quem precisar muda as linhas por `linhas` (o chefão destaca o passo atual).
 */
export class TelaoAviso {
  public readonly linhas: Phaser.GameObjects.Text[];

  constructor(cena: CenaFase3, cx: number, aviso: Aviso) {
    const n = aviso.linhas.length;
    const largura = TELAO.LARGURA;
    const altura = TELAO.ALTURA_TITULO + n * TELAO.ALTURA_LINHA + TELAO.MARGEM_BAIXO;
    const x = cx - largura / 2;
    const y = TELAO.Y;
    const prof = PROF.pilhas - 1;

    const g = cena.add.graphics().setDepth(prof).setAlpha(0.9);
    // Torre e pernas enferrujadas descendo até o horizonte
    g.fillStyle(0x2a1d18, 1);
    for (const dx of [-140, 140]) g.fillRect(cx + dx - 6, y + altura, 12, TELAO.PERNAS_ATE - y - altura);
    for (let yy = y + altura + 30; yy < TELAO.PERNAS_ATE; yy += 60) g.fillRect(cx - 140, yy, 280, 6);
    // Moldura
    g.fillStyle(0x1a1210, 1).fillRect(x - 12, y - 12, largura + 24, altura + 24);
    g.fillStyle(0x4a3a30, 1).fillRect(x - 6, y - 6, largura + 12, altura + 12);
    // Tela com linhas de varredura
    g.fillStyle(0x08231a, 1).fillRect(x, y, largura, altura);
    g.fillStyle(0x000000, 0.25);
    for (let yy = y; yy < y + altura; yy += 4) g.fillRect(x, yy, largura, 2);

    cena.add
      .text(cx, y + 22, aviso.titulo, { fontFamily: FONTE, fontSize: '16px', color: '#ffe14d' })
      .setOrigin(0.5)
      .setDepth(prof)
      .setAlpha(0.9);
    this.linhas = aviso.linhas.map((linha, i) =>
      cena.add
        .text(x + 24, y + TELAO.ALTURA_TITULO + TELAO.ALTURA_LINHA / 2 + i * TELAO.ALTURA_LINHA - 8, linha, {
          fontFamily: FONTE,
          fontSize: '18px',
          color: COR_LINHA,
        })
        .setOrigin(0, 0.5)
        .setDepth(prof)
    );
    // Várias luzes ao longo da tela para ela furar o escuro da noite
    for (const dx of [-160, -60, 60, 160]) cena.cenario.clima.registrarLuz({ x: cx + dx, y: y + altura / 2 }, 'led');
  }
}
