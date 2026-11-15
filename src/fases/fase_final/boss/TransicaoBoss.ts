import Phaser from 'phaser';
import { COR, hexNum, texturaBrilho } from '../ArteFaseFinal';
import { BOSS_FASE_FINAL } from '../constantesFaseFinal';
import { TEXTOS_BOSS } from '../DialogosFaseFinal';
import type { JogadorFaseFinal } from '../JogadorFaseFinal';
import type { ArenaBoss } from './ArenaBoss';
import { VAO_QUEDA } from './configArenas';
import { Particulas, clarao, estouro, explosao, fumaca, onomatopeia } from './EfeitosBoss';
import { TEX_BOSS } from './TexturasBoss';

const B = BOSS_FASE_FINAL;
/** Deslocamentos do glitch (fixos, sem sorteio). */
const TREMIDA = [6, -8, 4, -3, 9, -6, 2, -9, 5, -2];

/** Aparência da forma anterior, para cair junto e se transformar na nova. */
export interface AparenciaForma {
  textura: string;
  quadro: number;
  escala: number;
  /** Fração da altura onde ficam os pés (origem vertical). */
  origemY: number;
}

/** Duas cópias coloridas deslocadas (aberração cromática) que somem sozinhas. */
function fantasmas(cena: Phaser.Scene, alvo: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, ms: number): void {
  const cores = [hexNum(COR.ciano), hexNum(COR.magenta)];
  cores.forEach((cor, i) => {
    const copia = cena.add
      .image(alvo.x, alvo.y, alvo.texture.key, alvo.frame.name)
      .setOrigin(alvo.originX, alvo.originY)
      .setScale(alvo.scaleX, alvo.scaleY)
      .setFlipX(alvo.flipX)
      .setTint(cor)
      .setAlpha(0.6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(alvo.depth + 0.5);
    let passo = 0;
    const evento = cena.time.addEvent({
      delay: 60,
      repeat: Math.floor(ms / 60),
      callback: () => {
        passo++;
        copia.setPosition(alvo.x + TREMIDA[(passo + i * 3) % TREMIDA.length] * (i === 0 ? 1 : -1), alvo.y);
        copia.setTexture(alvo.texture.key, alvo.frame.name);
      },
    });
    cena.time.delayedCall(ms, () => {
      evento.remove();
      copia.destroy();
    });
  });
}

/* =========================================================================
 * INTRO DA FORMA 1: O CÉREBRO SE DESMONTA EM PIXELS E VIRA O COPYCAT
 * ========================================================================= */

interface PontoCor {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

/** Lê os pixels opacos de uma região de textura (canvas ou imagem), de `passo` em `passo`. */
function amostrarPixels(
  cena: Phaser.Scene,
  chave: string,
  regiao: { x: number; y: number; w: number; h: number },
  passo: number
): Array<{ px: number; py: number; r: number; g: number; b: number }> {
  const fonte = cena.textures.get(chave).getSourceImage() as CanvasImageSource;
  const tela = document.createElement('canvas');
  tela.width = regiao.w;
  tela.height = regiao.h;
  const ctx = tela.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(fonte, regiao.x, regiao.y, regiao.w, regiao.h, 0, 0, regiao.w, regiao.h);
  const dados = ctx.getImageData(0, 0, regiao.w, regiao.h).data;
  const pontos: Array<{ px: number; py: number; r: number; g: number; b: number }> = [];
  for (let y = 0; y < regiao.h; y += passo) {
    for (let x = 0; x < regiao.w; x += passo) {
      const i = (y * regiao.w + x) * 4;
      if (dados[i + 3] > 140) pontos.push({ px: x, py: y, r: dados[i], g: dados[i + 1], b: dados[i + 2] });
    }
  }
  return pontos;
}

/**
 * Abertura da luta (forma 1): o holograma do cérebro do Mega Brain aparece sobre o terraço,
 * pulsa, se desmonta em pixels que voam em redemoinho e se remontam como o Copycat.
 * O sprite do Copycat já está no lugar, invisível; o diálogo vem depois (aoTerminar).
 */
export function cerebroViraCopycat(cena: Phaser.Scene, copia: Phaser.GameObjects.Sprite, aoTerminar: () => void): void {
  const ESCALA = 3;
  const cx = copia.x;
  const cy = 330;
  copia.setAlpha(0);
  const particulas = new Particulas(cena, 21);

  const halo = cena.add
    .image(cx, cy, texturaBrilho(cena))
    .setTint(hexNum(COR.vermelho))
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0)
    .setAlpha(0.55)
    .setDepth(19);
  const cerebro = cena.add.image(cx, cy, TEX_BOSS.CEREBRO).setScale(0).setDepth(20).setAlpha(0.9);
  const linhas = cena.add.graphics().setDepth(20.5);

  // Fase 1: o holograma liga (cresce, pisca e treme)
  clarao(cena, hexNum(COR.vermelho), 0.15, 300);
  cena.tweens.add({ targets: cerebro, scale: ESCALA, duration: 600, ease: 'Back.easeOut' });
  cena.tweens.add({ targets: halo, scale: 2.4, duration: 600, ease: 'Quad.easeOut' });
  let passo = 0;
  const piscar = cena.time.addEvent({
    delay: 70,
    loop: true,
    callback: () => {
      passo++;
      cerebro.setAlpha(passo % 7 === 0 ? 0.3 : 0.92);
      cerebro.x = cx + (passo % 5 === 0 ? TREMIDA[passo % TREMIDA.length] : 0);
      // Linhas de varredura do holograma
      linhas.clear();
      const h = 42 * cerebro.scaleY;
      const topo = cy - h / 2;
      for (let y = 0; y < h; y += 6) {
        linhas.fillStyle(0x05050c, 0.35);
        linhas.fillRect(cx - 80, topo + ((y + passo * 2) % h), 160, 2);
      }
    },
  });

  // Fase 2: pulsa carregando energia, faíscas vermelhas
  cena.time.delayedCall(700, () => {
    cena.tweens.add({ targets: cerebro, scale: ESCALA * 1.12, duration: 160, yoyo: true, repeat: 2 });
    cena.cameras.main.shake(700, 0.003);
    for (let i = 0; i < 4; i++) {
      cena.time.delayedCall(i * 170, () =>
        particulas.emitir(cx, cy, {
          quantidade: 10,
          velocidade: [100, 260],
          vidaMs: [250, 500],
          tamanho: [2, 3],
          cores: [hexNum(COR.vermelho), 0xffd0d6, hexNum(COR.magenta)],
          gravidade: 0,
          forma: 'risco',
          espalhar: 40,
        })
      );
    }
  });

  // Fase 3: desmonta em pixels que se remontam como o Copycat
  cena.time.delayedCall(1500, () => {
    piscar.remove();
    linhas.destroy();
    const origem = amostrarPixels(cena, TEX_BOSS.CEREBRO, { x: 0, y: 0, w: 48, h: 42 }, 1);
    const destino = amostrarPixels(cena, copia.texture.key, { x: 0, y: 0, w: 128, h: 128 }, 3);
    cerebro.destroy();
    clarao(cena, 0xffffff, 0.2, 200);
    estouro(cena, cx, cy, 70, hexNum(COR.vermelho), 0x05050c, 21);

    const pesY = copia.y;
    const de: PontoCor[] = origem.map((o) => ({
      x: cx + (o.px - 24) * ESCALA,
      y: cy + (o.py - 21) * ESCALA,
      r: o.r,
      g: o.g,
      b: o.b,
    }));
    const para: PontoCor[] = destino.map((d) => ({
      // O Copycat olha para a esquerda (espelhado)
      x: copia.flipX ? cx + (64 - d.px) - 3 : cx - 64 + d.px,
      y: pesY - 121 + d.py,
      r: d.r,
      g: d.g,
      b: d.b,
    }));
    const pixels = cena.add.graphics().setDepth(21);
    const n = para.length;
    const DURACAO = 1700;
    cena.tweens.addCounter({
      from: 0,
      to: 1,
      duration: DURACAO,
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        pixels.clear();
        for (let i = 0; i < n; i++) {
          const a = de.length ? de[(i * 7) % de.length] : { x: cx, y: cy, r: 255, g: 42, b: 61 };
          const b = para[i];
          const atraso = (i / n) * 0.35;
          const kk = Phaser.Math.Clamp((k - atraso) / 0.65, 0, 1);
          const e = kk * kk * (3 - 2 * kk);
          // Redemoinho: cada pixel faz uma curva para um lado
          const lado = i % 2 === 0 ? 1 : -1;
          const curva = Math.sin(e * Math.PI) * (50 + (i % 5) * 12) * lado;
          const x = a.x + (b.x - a.x) * e + curva;
          const y = a.y + (b.y - a.y) * e - Math.sin(e * Math.PI) * 30;
          const cor = Phaser.Display.Color.GetColor(
            Math.round(a.r + (b.r - a.r) * e),
            Math.round(a.g + (b.g - a.g) * e),
            Math.round(a.b + (b.b - a.b) * e)
          );
          pixels.fillStyle(cor, 1);
          pixels.fillRect(x, y, 3, 3);
        }
      },
      onComplete: () => {
        // Fase 4: firma como sprite de verdade
        copia.setAlpha(1);
        fantasmas(cena, copia, 400);
        clarao(cena, 0xffffff, 0.25, 250);
        cena.cameras.main.shake(200, 0.006);
        particulas.emitir(cx, pesY - 50, {
          quantidade: 24,
          velocidade: [120, 320],
          vidaMs: [250, 500],
          tamanho: [2, 3],
          cores: [hexNum(COR.ciano), hexNum(COR.magenta), 0xffffff],
          gravidade: 300,
          forma: 'risco',
          espalhar: 30,
        });
        cena.tweens.add({ targets: [pixels, halo], alpha: 0, duration: 250, onComplete: () => {
          pixels.destroy();
          halo.destroy();
        } });
        cena.time.delayedCall(500, aoTerminar);
      },
    });
  });
}

/* =========================================================================
 * CHEGADA NA ARENA DE BAIXO
 * ========================================================================= */

/**
 * Chegada na nova arena: a forma anterior despenca pelo buraco do teto, pousa e se "morfa" na
 * nova (alternando as duas com glitch e faíscas); depois a nova salta até a posição de início.
 * O sprite da nova forma já está criado na posição de início, invisível.
 */
export function quedaEMorfose(
  cena: Phaser.Scene,
  anterior: AparenciaForma,
  nova: Phaser.GameObjects.Sprite,
  aoTerminar: () => void
): void {
  const xFinal = nova.x;
  const yFinal = nova.y;
  const xQueda = B.QUEDA_BOSS_X;
  const particulas = new Particulas(cena, 21);
  nova.setVisible(false).setPosition(xQueda, yFinal);
  const velha = cena.add
    .image(xQueda, -160, anterior.textura, anterior.quadro)
    .setOrigin(0.5, anterior.origemY)
    .setScale(anterior.escala)
    .setDepth(nova.depth);
  cena.tweens.add({
    targets: velha,
    y: B.CHAO_Y,
    duration: 650,
    delay: 250,
    ease: 'Quad.easeIn',
    onComplete: () => {
      cena.cameras.main.shake(260, 0.01);
      estouro(cena, xQueda, B.CHAO_Y - 12, 60, 0xffd36b);
      particulas.detritos(xQueda, B.CHAO_Y - 4, 14, [0x3f4462, 0x2b2e44, 0xffd36b], B.CHAO_Y);
      fumaca(cena, xQueda - 50, B.CHAO_Y - 10, 1.2, 0x6b6f8c, 700);
      fumaca(cena, xQueda + 50, B.CHAO_Y - 10, 1.2, 0x6b6f8c, 700);
      fantasmas(cena, velha, B.GLITCH_MS);
      let passo = 0;
      cena.time.addEvent({
        delay: 80,
        repeat: Math.floor(B.GLITCH_MS / 80) - 1,
        callback: () => {
          passo++;
          const mostraNova = passo % 2 === 0 || passo > 9;
          nova.setVisible(mostraNova);
          velha.setVisible(!mostraNova);
          velha.x = xQueda + TREMIDA[passo % TREMIDA.length];
          particulas.emitir(xQueda, B.CHAO_Y - 80, {
            quantidade: 3,
            velocidade: [100, 260],
            vidaMs: [150, 300],
            tamanho: [2, 3],
            cores: [hexNum(COR.ciano), hexNum(COR.magenta)],
            gravidade: 0,
            forma: 'risco',
            espalhar: 50,
          });
        },
      });
      cena.time.delayedCall(B.GLITCH_MS, () => {
        velha.destroy();
        nova.setVisible(true);
        fantasmas(cena, nova, 300);
        clarao(cena, 0xffffff, 0.18, 200);
        // Salto até a posição de início da forma
        const distancia = Math.abs(xFinal - xQueda);
        if (distancia < 8) {
          nova.setPosition(xFinal, yFinal);
          aoTerminar();
          return;
        }
        nova.setFlipX(xFinal > xQueda);
        cena.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 300 + distancia,
          onUpdate: (tw) => {
            const k = tw.getValue() ?? 0;
            nova.setPosition(xQueda + (xFinal - xQueda) * k, yFinal - Math.sin(k * Math.PI) * 120);
          },
          onComplete: () => {
            nova.setPosition(xFinal, yFinal);
            cena.cameras.main.shake(140, 0.005);
            fumaca(cena, xFinal, B.CHAO_Y - 10, 1, 0x6b6f8c, 500);
            aoTerminar();
          },
        });
      });
    },
  });
}

/* =========================================================================
 * FIM DE UMA FORMA: PORRADARIA, CHÃO QUEBRA, QUEDA
 * ========================================================================= */

/**
 * Fim de uma forma (roteiro 9.1): os dois saem na porrada numa nuvem de poeira cômica (só
 * onomatopeias, estouros e explosõezinhas), o chão racha, quebra, e ambos caem um andar.
 * Termina com a tela apagada.
 */
export function brigaEQueda(
  cena: Phaser.Scene,
  arena: ArenaBoss,
  bossSprite: Phaser.GameObjects.Sprite,
  jogador: JogadorFaseFinal,
  aoTerminar: () => void
): void {
  const t = B.TRANSICAO;
  const cx = (VAO_QUEDA.x0 + VAO_QUEDA.x1) / 2;
  const cy = B.CHAO_Y - 70;
  const particulas = new Particulas(cena, 31);

  // Os dois correm para o meio e somem dentro da nuvem
  fumaca(cena, jogador.x, B.CHAO_Y - 30, 1, 0x8a90b8, 400);
  jogador.congelar();
  cena.tweens.add({ targets: jogador.sprite, alpha: 0, duration: 150 });
  cena.tweens.add({ targets: bossSprite, x: cx + 30, duration: t.APROXIMA_MS, ease: 'Quad.easeIn' });
  cena.tweens.add({ targets: bossSprite, alpha: 0, delay: t.APROXIMA_MS - 100, duration: 150 });

  const nuvem = cena.add.graphics().setDepth(30);
  const rachaduras = cena.add.graphics().setDepth(7);
  let tempo = 0;
  let proximoGolpe = 0;
  let indice = 0;
  let deslocY = 0;

  const desenharNuvem = (raioBase: number) => {
    nuvem.clear();
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + tempo / 300;
      const r = raioBase * (0.55 + 0.25 * Math.sin(tempo / 90 + i * 1.7));
      const x = cx + Math.cos(a) * raioBase * 0.9;
      const y = cy + deslocY + Math.sin(a) * raioBase * 0.5;
      nuvem.fillStyle(i % 3 === 0 ? 0x6b7099 : 0x9aa0c4, 0.95);
      nuvem.fillCircle(x, y, r);
    }
    nuvem.fillStyle(0xc8cce6, 1);
    nuvem.fillCircle(cx, cy + deslocY, raioBase * 0.7);
    // Punhos, botas e estrelinhas escapando da nuvem
    for (let i = 0; i < 4; i++) {
      const a = tempo / 120 + i * 1.6;
      const x = cx + Math.cos(a) * raioBase * 1.1;
      const y = cy + deslocY + Math.sin(a) * raioBase * 0.6;
      nuvem.lineStyle(6, i % 2 ? hexNum(COR.janelaQuente) : 0x2b2f45, 1);
      nuvem.lineBetween(x, y, x + Math.cos(a) * 22, y + Math.sin(a) * 14);
      nuvem.fillStyle(i % 2 ? hexNum(COR.janelaQuente) : 0x2b2f45, 1);
      nuvem.fillCircle(x + Math.cos(a) * 24, y + Math.sin(a) * 15, 6);
    }
    for (let i = 0; i < 3; i++) {
      const a = -tempo / 200 + i * 2.1;
      const x = cx + Math.cos(a) * raioBase * 1.3;
      const y = cy + deslocY - 30 + Math.sin(a) * 20;
      nuvem.fillStyle(hexNum(COR.janelaQuente), 1);
      nuvem.fillRect(x - 5, y - 1, 10, 2);
      nuvem.fillRect(x - 1, y - 5, 2, 10);
    }
  };

  // Posições e cores fixas das onomatopeias, estouros e explosõezinhas
  const posicoes = [
    [-110, -70],
    [120, -90],
    [-60, -130],
    [140, -20],
    [-150, -10],
    [40, -150],
  ];
  const cores = [COR.janelaQuente, COR.ciano, COR.magenta, COR.branco, COR.janelaQuente, COR.ciano];
  const golpe = () => {
    const [dx, dy] = posicoes[indice % posicoes.length];
    const [ex, ey] = posicoes[(indice + 3) % posicoes.length];
    if (indice % 2 === 0) {
      onomatopeia(cena, cx + dx, cy + dy, TEXTOS_BOSS.BRIGA[(indice / 2) % TEXTOS_BOSS.BRIGA.length], cores[indice % cores.length], indice % 4 === 0 ? -12 : 10);
    } else {
      estouro(cena, cx + dx * 0.6, cy + dy * 0.6, 34, 0xffffff);
    }
    // Explosãozinha e faíscas em volta da nuvem
    explosao(cena, particulas, cx + ex * 0.7, cy + ey * 0.5, 0.45, B.CHAO_Y);
    particulas.faiscas(cx + dx * 0.4, cy + dy * 0.4, Math.atan2(dy, dx), 0.6, 8);
    cena.cameras.main.shake(110, 0.006);
    if (indice % 3 === 0) clarao(cena, 0xffffff, 0.12, 120);
    indice++;
  };

  // Fase 1: briga (a nuvem cresce e o pau come)
  cena.tweens.addCounter({
    from: 0,
    to: 1,
    duration: t.APROXIMA_MS + t.BRIGA_MS,
    onUpdate: (tw) => {
      const k = tw.getValue() ?? 0;
      tempo = k * (t.APROXIMA_MS + t.BRIGA_MS);
      const crescer = Math.min(1, tempo / t.APROXIMA_MS);
      desenharNuvem(20 + 70 * crescer);
      if (tempo >= t.APROXIMA_MS && tempo >= proximoGolpe) {
        golpe();
        proximoGolpe = tempo + 160;
      }
    },
    onComplete: () => {
      // Fase 2: o chão racha embaixo da nuvem
      onomatopeia(cena, cx, B.CHAO_Y - 170, TEXTOS_BOSS.RACHOU, COR.branco, -6);
      cena.tweens.addCounter({
        from: 0,
        to: 1,
        duration: t.RACHA_MS,
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          tempo += 16;
          desenharNuvem(90);
          arena.rachar(rachaduras, k);
          if (Math.random() < 0.3) particulas.detritos(cx + (k - 0.5) * 200, B.CHAO_Y, 1, [0x3f4462, 0x2b2e44], B.CHAO_Y);
        },
        onComplete: () => {
          // Fase 3: o piso quebra e a nuvem despenca pelo buraco
          arena.quebrarChao();
          rachaduras.clear();
          explosao(cena, particulas, cx, B.CHAO_Y - 10, 1.2, B.CHAO_Y + 200);
          clarao(cena, 0xffffff, 0.25, 250);
          cena.cameras.main.shake(400, 0.014);
          cena.tweens.addCounter({
            from: 0,
            to: 1,
            duration: t.QUEDA_MS,
            ease: 'Quad.easeIn',
            onUpdate: (tw) => {
              tempo += 16;
              deslocY = (tw.getValue() ?? 0) * 520;
              desenharNuvem(90);
            },
          });
          cena.time.delayedCall(t.QUEDA_MS - 350, () => {
            cena.cameras.main.fadeOut(350, 0, 0, 0);
            cena.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, aoTerminar);
          });
        },
      });
    },
  });
}
