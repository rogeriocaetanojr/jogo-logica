import Phaser from 'phaser';
import { COR, CORES_CONTEINER, ESCALA, aleatorio, sombrear, texturaPixel } from '../porto/ArtePorto';
import {
  desenharAsfalto,
  desenharCeu,
  desenharCerca,
  desenharCidade,
  desenharDepositoPneus,
  desenharGuindaste,
  desenharPilhaFundo,
  desenharPoste,
  desenharTorreServidor,
} from '../porto/CenariosPorto';
import { FALAS, GRAVACOES_PORTUS } from '../porto/DialogosPorto';
import { PROF } from '../porto/EfeitosPorto';
import { Gaivirus, JanelaPopup, SiriScript } from '../porto/InimigosPorto';
import {
  texturaCaminhao,
  texturaCarroQueimado,
  texturaGuarita,
  texturaPlaca,
  texturaPocaOleo,
  texturaPortao,
  texturasCancela,
} from '../porto/ObjetosPorto';
import { CARGAS_EXTINTOR } from '../porto/TiposPorto';
import { AreaPorto } from './AreaBase';

const CHAO = 640;
const cacheLuzes = new Map<string, Array<[number, number]>>();

/**
 * ÁREA 1 — PORTARIA TRAVADA (entrada).
 * Entardecer com céu laranja-escuro e sol vermelho atrás da fuligem. A cancela abre e fecha sem parar,
 * caminhões parados servem de plataformas e o primeiro foco de incêndio é apagado com o extintor básico.
 */
export class Area1Portaria extends AreaPorto {
  private braco!: Phaser.GameObjects.Image;
  private lembreteEm = 0;
  private capitao!: Phaser.GameObjects.Sprite;

  override construir(): void {
    this.largura = 5120;
    this.inicio = { x: 180, y: CHAO - 48 };
    this.volumeOndas = 0.15;
    this.volumeFogo = 0.35;
    const cena = this.cena;

    this.construirFundo();

    // Chão de asfalto da portaria
    this.camada('pb-a1-chao', 1, PROF.plataformas, (p, w) => {
      desenharAsfalto(p, 0, w, 0, 20);
    }, { alturaArte: 20, y: CHAO });
    cena.solido(0, CHAO, this.largura, 120);

    // Placa de entrada e guarita
    texturaPlaca(cena, 'pb-a1-placa', ['PORTO DE BUG', 'ENTRADA DE CARGAS'], COR.contAzul);
    cena.imagem('pb-a1-placa', 430, CHAO, PROF.estruturas);
    texturaGuarita(cena);
    cena.imagem('pb-obj-guarita', 820, CHAO, PROF.estruturas);

    // Capitão Prático
    this.capitao = cena.add.sprite(940, CHAO, 'pb-capitao', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.npcs);
    this.capitao.setFlipX(true);
    cena.interativo(940, CHAO - 60, '[E] CAPITÃO PRÁTICO', () => this.falarComCapitao());
    cena.criarCaixaExtintor(1030, CHAO);

    // Cobertura da portaria + cancela que empurra
    this.construirCancela();

    // Óleo no chão (escorregadio)
    this.pocaOleo(1560, 200);
    this.pocaOleo(3380, 150);

    // Caminhões parados (plataformas)
    this.caminhao(2020, 'pb-a1-caminhao-1', CORES_CONTEINER[1]);
    this.caminhao(2400, 'pb-a1-caminhao-2', CORES_CONTEINER[0]);

    // Foco 1 (obrigatório): lixo e óleo pegando fogo no meio da pista
    cena.fogo.criar({ id: 'a1-f1', x: 2780, y: CHAO, tamanho: 'm', largura: 3, vida: 2, barreira: { largura: 150, altura: 360 } });
    cena.criarCaixaExtintor(2600, CHAO);
    cena.gatilho(2470, 2560, () => {
      if (cena.estado.temExtintor) cena.falar(FALAS.primeiroFogo, undefined, 'a1-primeiro-fogo');
    });
    cena.gatilho(2920, 3000, () => cena.registrarCheckpoint(2960, CHAO - 48, 'CHECKPOINT: PISTA LIBERADA'));
    cena.gatilho(1380, 1460, () => cena.falar(FALAS.oleo, undefined, 'a1-oleo'));

    // Foco 2 (opcional): carro queimado
    texturaCarroQueimado(cena);
    cena.imagem('pb-obj-carro', 3700, CHAO, PROF.estruturas);
    cena.fogo.criar({ id: 'a1-f2', x: 3700, y: CHAO - 16, tamanho: 'p', largura: 2, vida: 1 });

    // Inimigos fracos de introdução
    const ini = cena.inimigos;
    ini.adicionar(new Gaivirus(cena, 1420, 300));
    ini.adicionar(new Gaivirus(cena, 3150, 270));
    ini.adicionar(new Gaivirus(cena, 4380, 290));
    ini.adicionar(new SiriScript(cena, 1720, CHAO - 30, 1560, 1880));
    ini.adicionar(new SiriScript(cena, 3330, CHAO - 30, 3150, 3560));
    cena.gatilho(3900, 3960, () => {
      ini.adicionar(new JanelaPopup(cena, cena.jogador.x + 300, 330));
      cena.hud.aviso('ANÚNCIO DO MEGABRAIN! ACERTE O [X] COM O PATCH', COR.virus);
    });

    // Gravação 1 do PORTUS
    cena.criarGravacaoPortus(1, 4250, CHAO, GRAVACOES_PORTUS[0]);

    // Lacres e kit
    for (const [x, y] of [
      [620, 560],
      [1300, 500],
      [1960, 470],
      [2080, 470],
      [2440, 470],
      [3000, 560],
      [3320, 520],
      [3860, 500],
      [4120, 560],
      [4560, 520],
    ]) {
      cena.criarLacre(x, y);
    }
    cena.criarKit(3050, 560);

    // Portão para o Pátio das Pilhas
    texturaPortao(cena, 'pb-a1-portao', 'PATIO DAS PILHAS');
    cena.imagem('pb-a1-portao', 4900, CHAO, PROF.estruturas).setFrame(1);
    cena.gatilho(4600, 4700, () => cena.falar(FALAS.fimPortaria, undefined, 'a1-fim'));
    cena.gatilho(4980, 5200, () => {
      if (!cena.estado.temExtintor) return;
      cena.concluirArea();
    });
  }

  override iniciar(): void {
    // Sem pop-up de abertura: os controles ficam fixos no rodapé durante toda a portaria
    this.cena.hud.mostrarControles(
      '[A/D] MOVER   [W/ESPAÇO] PULAR   [S] AGACHAR   [E] INTERAGIR\n' +
        '[J] ATIRAR (Pistola de Patch)   [K] EXTINTOR (jato no fogo)   [H] AJUDA   [ESC] HUB'
    );
    this.cena.hud.aviso('FALE COM O CAPITÃO PRÁTICO NA GUARITA', COR.telaBoia, 5000);
  }

  private falarComCapitao(): void {
    const cena = this.cena;
    this.capitao.setFrame(1);
    const fim = () => this.capitao.setFrame(0);
    if (!cena.estado.temExtintor) {
      cena.falar(FALAS.capitao, () => {
        fim();
        cena.estado.temExtintor = true;
        cena.estado.cargasExtintor = CARGAS_EXTINTOR;
        cena.hud.atualizar();
        cena.som.tocar('item');
        cena.hud.aviso('EXTINTOR BÁSICO OBTIDO! [K] = JATO (3 CARGAS)', COR.espuma, 2600);
      });
    } else {
      cena.falar(FALAS.capitaoDepois, fim);
    }
  }

  private construirFundo(): void {
    // 1. Céu de fuligem e sol vermelho (0x)
    this.camada('pb-a1-ceu', 0, PROF.ceu, (p, w, h) => desenharCeu(p, w, h, 'entardecer'));

    // 2. Cidade de Bug e torre do servidor (0.1x)
    this.camada('pb-a1-cidade', 0.1, PROF.distante, (p, w) => {
      cacheLuzes.set('a1-janelas', desenharCidade(p, 0, w, 112, 5, false));
      cacheLuzes.set('a1-torre', desenharTorreServidor(p, 300, 114, false));
    });
    const janelas = cacheLuzes.get('a1-janelas') ?? [];
    const luzesTorre = cacheLuzes.get('a1-torre') ?? [];
    this.luzesVirus(janelas, 0.1, PROF.distante + 1, 0.55);
    this.luzesVirus(luzesTorre, 0.1, PROF.distante + 1, 0.85);

    // 3. Guindastes em silhueta e o depósito de pneus pegando fogo ao fundo (0.25x)
    const fatorMeio = 0.25;
    this.camada('pb-a1-guindastes', fatorMeio, PROF.meio, (p, w) => {
      p.px(0, 118, w, 62, '#3A2228');
      for (const x of [120, 230, 390, 520]) desenharGuindaste(p, x, 120, false);
      desenharDepositoPneus(p, 470, 122, false);
      for (let i = 0; i < 12; i++) desenharPilhaFundo(p, 20 + i * 36, 120, 1 + (i % 3), i, false, 0.35);
    });
    const xDeposito = 470 * ESCALA;
    const fogoFundo = this.cena.add.sprite(xDeposito + 70, 96 * ESCALA, 'pb-fogo-g', 0).setOrigin(0.5, 1).setScale(ESCALA * 0.7).setScrollFactor(fatorMeio, 0).setDepth(PROF.meio + 1);
    fogoFundo.play('pb-anim-fogo-g');
    this.cena.efeitos.pluma(xDeposito + 70, 80 * ESCALA, { largura: 80, raio: 14, frequencia: 380, fator: fatorMeio, profundidade: PROF.meio + 2, vida: 12000, escalaFinal: 2.6 });
    this.cena.efeitos.brilho(xDeposito + 70, 100 * ESCALA, 180, COR.fogoLaranja, 0.3, fatorMeio, PROF.meio + 3);

    // 4. Armazéns, cerca e contêineres próximos (0.5x)
    this.camada('pb-a1-armazens', 0.5, PROF.proximo, (p, w) => {
      const r = aleatorio(31);
      p.px(0, 150, w, 30, '#2A1E20');
      let x = 0;
      while (x < w) {
        const larg = 50 + Math.floor(r() * 50);
        const alt = 22 + Math.floor(r() * 18);
        const cor = r() < 0.5 ? '#4A3436' : '#3E2E30';
        p.px(x, 160 - alt, larg, alt, cor);
        p.px(x, 160 - alt, larg, 2, sombrear(cor, -0.25));
        for (let pxp = x + 6; pxp < x + larg - 14; pxp += 22) {
          p.px(pxp, 160 - 14, 12, 14, sombrear(cor, 0.35));
          for (let yy = 160 - 13; yy < 160; yy += 2) p.px(pxp, yy, 12, 1, sombrear(cor, 0.45));
        }
        x += larg + 8 + Math.floor(r() * 30);
        if (r() < 0.5) {
          desenharPilhaFundo(p, x - 6, 160, 2 + Math.floor(r() * 3), Math.floor(r() * 4), false, 0.25);
        }
      }
      desenharCerca(p, 0, w, 160, 10, false);
      for (let px0 = 30; px0 < w; px0 += 90) desenharPoste(p, px0, 160, 40, false);
    });
  }

  private construirCancela(): void {
    const cena = this.cena;
    texturasCancela(cena);
    // Cobertura da portaria: limita a altura do pulo sobre a cancela
    texturaPixel(cena, 'pb-a1-cobertura', 76, 8, (p) => {
      p.px(0, 0, 76, 6, '#4A4448');
      p.px(0, 0, 76, 1, '#6A6468');
      p.faixaAdvertencia(0, 6, 76, 2);
      p.px(2, 6, 2, 2, '#2A2426');
      p.px(72, 6, 2, 2, '#2A2426');
    });
    cena.imagem('pb-a1-cobertura', 1330, 448, PROF.estruturas + 2);
    texturaPixel(cena, 'pb-a1-coluna', 4, 52, (p) => {
      p.px(0, 0, 4, 52, '#3A3438');
      p.px(0, 0, 1, 52, '#5A5458');
    });
    cena.imagem('pb-a1-coluna', 1484, CHAO, PROF.estruturas + 1);
    cena.solido(1178, 416, 304, 32);
    cena.imagem('pb-obj-cancela-poste', 1180, CHAO, PROF.estruturas + 3);
    this.braco = cena.add.image(1186, 566, 'pb-obj-cancela-braco').setOrigin(0, 0.5).setScale(ESCALA).setDepth(PROF.estruturas + 4);
    texturaPlaca(cena, 'pb-a1-placa-cancela', ['PARE'], '#C8301E');
    cena.imagem('pb-a1-placa-cancela', 1110, CHAO, PROF.estruturas);
  }

  private pocaOleo(x: number, largura: number): void {
    const chave = texturaPocaOleo(this.cena, Math.round(largura / ESCALA));
    this.cena.imagem(chave, x + largura / 2, CHAO + 8, PROF.plataformas + 1);
    this.cena.zonasOleo.push(new Phaser.Geom.Rectangle(x, CHAO - 4, largura, 12));
  }

  private caminhao(x: number, chave: string, cor: string): void {
    const cena = this.cena;
    texturaCaminhao(cena, chave, cor);
    cena.imagem(chave, x, CHAO + 4, PROF.estruturas + 2);
    const esquerda = x - 32 * ESCALA;
    cena.solido(esquerda + 8, CHAO + 4 - 28 * ESCALA, 44 * ESCALA, 12, true);
    cena.solido(esquerda + 48 * ESCALA, CHAO + 4 - 24 * ESCALA, 14 * ESCALA, 12, true);
  }

  override atualizar(tempo: number): void {
    // Cancela: abre e fecha sem parar (ciclo de 3,6 s)
    const t = (tempo % 3600) / 3600;
    let alvo: number;
    if (t < 0.38) alvo = 0;
    else if (t < 0.48) alvo = -((t - 0.38) / 0.1) * 80;
    else if (t < 0.86) alvo = -80;
    else alvo = -80 + ((t - 0.86) / 0.14) * 80;
    const descendo = t >= 0.86 || t < 0.38;
    this.braco.setAngle(alvo);

    const j = this.cena.jogador;
    if (!j.morto && descendo && alvo > -30 && j.x > 1196 && j.x < 1186 + 66 * ESCALA && j.body.top < 576 && j.body.bottom > 556) {
      j.empurrar(-420, -220, 300);
      this.cena.efeitos.textoFlutuante(j.x, j.y - 70, 'A CANCELA EMPURROU VOCÊ!', '#FF8A6A', 12);
      this.cena.som.tocar('erro');
    }
    // Capitão olha para o operador
    this.capitao.setFlipX(j.x < this.capitao.x);
    // Lembrete: sem extintor não dá para passar pelo primeiro foco
    if (!this.cena.estado.temExtintor && j.x > 2460 && j.x < 2700 && tempo > this.lembreteEm) {
      this.lembreteEm = tempo + 9000;
      this.cena.falar([['boia', 'Fogo bloqueando a pista e você sem extintor! Volte e fale com o Capitão Prático na guarita.']]);
    }
  }
}
