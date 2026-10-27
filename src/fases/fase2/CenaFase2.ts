import Phaser from 'phaser';
import './estilos/fase2.css';
import { CenaBase } from '../../compartilhado/CenaBase';
import type { ResultadoComando } from '../../compartilhado/tipos';
import { GerenciadorEstado } from '../../nucleo/GerenciadorEstado';
import { interpretarComandoFase2 } from './InterpretadorFase2';
import type { DesafioPorto } from './InterpretadorFase2';
import { COR, ESCALA } from './porto/ArtePorto';
import { AjudaPorto } from './porto/AjudaPorto';
import type { IdAjuda } from './porto/AjudaConteudo';
import type { AguaPorto } from './porto/AguaPorto';
import { ArmasPorto } from './porto/ArmasPorto';
import { ModeloLoja } from './porto/DesafiosPorto';
import { FALAS, roteiro } from './porto/DialogosPorto';
import { FICHAS, linhasAbertura, textoNivel } from './porto/FichaDesafio';
import type { Falante } from './porto/DialogosPorto';
import { EfeitosPorto, PROF } from './porto/EfeitosPorto';
import { GerenciadorFogo } from './porto/FogoPorto';
import type { FocoIncendio } from './porto/FogoPorto';
import { FumacaPorto } from './porto/FumacaPorto';
import { HudPorto } from './porto/HudPorto';
import { GerenciadorInimigos } from './porto/InimigosPorto';
import { JogadorPorto } from './porto/JogadorPorto';
import type { ControlesPorto } from './porto/JogadorPorto';
import { PlataformaMovel } from './porto/PlataformasPorto';
import { SomPorto } from './porto/SomPorto';
import { gerarSpritesPorto } from './porto/SpritesPorto';
import {
  AREAS,
  CARGAS_EXTINTOR,
  ESPUMA_MAXIMA,
  VIDAS_INICIAIS,
  apagarProgresso,
  carregarProgresso,
  clonarEstado,
  criarEstadoInicial,
  indiceFumaca,
  salvarProgresso,
} from './porto/TiposPorto';
import type { EstadoPorto } from './porto/TiposPorto';
import type { AreaPorto } from './ambientes/AreaBase';
import { criarArea } from './ambientes/FabricaAreas';

interface Interativo {
  x: number;
  y: number;
  raio: number;
  rotulo: string;
  ativo: () => boolean;
  acao: () => void;
}

interface Gatilho {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  feito: boolean;
  acao: () => void;
}

interface Coletavel {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  tipo: 'lacre' | 'kit';
}

interface DadosCenaPorto {
  area?: number;
  estado?: EstadoPorto;
}

/**
 * CenaFase2: PORTO BUGADO (cidade de Bug).
 * O operador atravessa 6 ambientes do porto, resolve 4 desafios de estruturas de dados
 * (Pilha, Fila, Vetores e índices, Ordenação), vence o BORRACHÃO.EXE e o KRAKEN.EXE
 * e desconecta o servidor central do MegaBrain.
 */
export class CenaFase2 extends CenaBase {
  public estado!: EstadoPorto;
  public jogador!: JogadorPorto;
  public efeitos!: EfeitosPorto;
  public som!: SomPorto;
  public fumaca!: FumacaPorto;
  public hud!: HudPorto;
  public fogo!: GerenciadorFogo;
  public armas!: ArmasPorto;
  public inimigos!: GerenciadorInimigos;
  public agua: AguaPorto | null = null;
  public solidos!: Phaser.Physics.Arcade.StaticGroup;
  public grupoMoveis!: Phaser.Physics.Arcade.Group;
  public plataformasMoveis: PlataformaMovel[] = [];
  /** Retângulos de óleo no chão (escorregadio). */
  public zonasOleo: Phaser.Geom.Rectangle[] = [];
  public nomeOperador = 'Alvares';
  public checkpoint = { x: 160, y: 560 };
  public cutscene = false;
  public area!: AreaPorto;

  private indiceArea = 0;
  private estadoEntrada!: EstadoPorto;
  private continuouDoSave = false;
  private interativos: Interativo[] = [];
  private gatilhos: Gatilho[] = [];
  private coletaveis: Coletavel[] = [];
  private textoPrompt!: Phaser.GameObjects.Text;
  private transicionando = false;
  private fisicaPausada = false;
  private ultimoDanoAgua = 0;
  private ultimoDanoFumaca = 0;
  private nevoa!: Phaser.GameObjects.Rectangle;
  private desafioAberto: DesafioPorto | null = null;
  private teclas!: Record<string, Phaser.Input.Keyboard.Key>;
  private ajuda!: AjudaPorto;
  private inicioCena = 0;

  constructor() {
    super('CenaFase2', 'fase2');
  }

  override init(dados?: DadosCenaPorto): void {
    this.continuouDoSave = false;
    if (dados?.estado) {
      this.estado = clonarEstado(dados.estado);
      this.indiceArea = dados.area ?? this.estado.area;
    } else {
      const salvo = carregarProgresso();
      if (salvo && salvo.area > 0 && salvo.area < AREAS.length) {
        this.estado = salvo;
        this.continuouDoSave = true;
      } else {
        this.estado = criarEstadoInicial();
      }
      this.indiceArea = dados?.area ?? this.estado.area;
    }
    this.estado.area = Phaser.Math.Clamp(this.indiceArea, 0, AREAS.length - 1);
    this.indiceArea = this.estado.area;
    this.agua = null;
    this.plataformasMoveis = [];
    this.zonasOleo = [];
    this.interativos = [];
    this.gatilhos = [];
    this.coletaveis = [];
    this.transicionando = false;
    this.fisicaPausada = false;
    this.cutscene = false;
    this.desafioAberto = null;
    this.ultimoDanoAgua = 0;
    this.ultimoDanoFumaca = 0;
  }

  override create(): void {
    super.create();
    gerarSpritesPorto(this);
    const tipo = GerenciadorEstado.obterPersonagem();
    this.nomeOperador = tipo === 'reis' ? 'Reis' : 'Alvares';
    this.estadoEntrada = clonarEstado(this.estado);
    salvarProgresso(this.estado);
    this.inicioCena = this.time.now;

    this.efeitos = new EfeitosPorto(this);
    this.som = new SomPorto(this);
    this.solidos = this.physics.add.staticGroup();
    this.grupoMoveis = this.physics.add.group({ allowGravity: false, immovable: true });
    this.fogo = new GerenciadorFogo(this);
    this.armas = new ArmasPorto(this);
    this.inimigos = new GerenciadorInimigos(this);

    this.jogador = new JogadorPorto(this, 160, 500, tipo);
    this.physics.add.collider(this.jogador.corpo, this.solidos);
    this.physics.add.collider(this.jogador.corpo, this.grupoMoveis);

    this.fumaca = new FumacaPorto(this);
    this.area = criarArea(this, this.indiceArea);
    this.fumaca.noite = this.area.noite;
    this.fumaca.definirNivel(AREAS[this.indiceArea].fumaca);

    this.nevoa = this.add.rectangle(640, 360, 1280, 720, this.area.noite ? 0x0e0e1a : 0x3a2822, 0.2).setScrollFactor(0).setDepth(PROF.fumacaFundo + 1);

    this.area.construir();
    this.physics.world.setBounds(0, 0, this.area.largura, this.area.altura);
    this.cameras.main.setBounds(0, 0, this.area.largura, this.area.altura);
    this.cameras.main.setBackgroundColor('#140f0e');
    this.checkpoint = { ...this.area.inicio };
    this.jogador.posicionar(this.area.inicio.x, this.area.inicio.y);
    this.cameras.main.startFollow(this.jogador.corpo, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(140, 90);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.hud = new HudPorto(this);
    this.textoPrompt = this.add
      .text(0, 0, '', {
        fontFamily: 'Consolas, Courier New, monospace',
        fontSize: '13px',
        color: '#F2C230',
        fontStyle: 'bold',
        backgroundColor: 'rgba(14,10,10,0.85)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(PROF.textos)
      .setVisible(false);

    this.criarEfeitoCRT(this.scale.width, this.scale.height, 0.025);
    this.configurarTeclas();
    this.configurarTerminal();
    this.configurarOverlays();
    this.efeitos.cinzas(indiceFumaca(this.estado) / 100, this.area.noite);

    const info = AREAS[this.indiceArea];
    this.hud.cartaoArea(info.numero, info.nome, info.subtitulo);
    if (this.continuouDoSave) {
      this.time.delayedCall(2600, () => this.hud.aviso(`PROGRESSO RESTAURADO: ÁREA ${info.numero}  ·  [N] RECOMEÇA DO INÍCIO`, COR.telaBoia, 4500));
    }
    this.som.iniciarAmbiente(this.area.volumeOndas, this.area.volumeFogo);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ajuda.destruir();
      document.body.classList.remove('fase2');
      document.getElementById('terminal-input')?.setAttribute('placeholder', 'Digite um comando...');
      this.som.destruir();
      this.armas.destruir();
      this.agua?.destruir();
      this.agua = null;
    });

    this.time.delayedCall(700, () => this.area.iniciar());
  }

  /* =========================================================================
   * ENTRADA
   * ========================================================================= */

  private configurarTeclas(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const nomes: Record<string, number> = {
      A: K.A,
      D: K.D,
      W: K.W,
      S: K.S,
      ESQ: K.LEFT,
      DIR: K.RIGHT,
      CIMA: K.UP,
      BAIXO: K.DOWN,
      ESPACO: K.SPACE,
      J: K.J,
      X: K.X,
      K: K.K,
      C: K.C,
      E: K.E,
      Q: K.Q,
      F: K.F,
      N: K.N,
      H: K.H,
    };
    this.teclas = {};
    for (const [nome, codigo] of Object.entries(nomes)) this.teclas[nome] = kb.addKey(codigo, false);
  }

  private lerControles(): ControlesPorto {
    const t = this.teclas;
    const down = (n: string) => t[n]?.isDown ?? false;
    const just = (n: string) => (t[n] ? Phaser.Input.Keyboard.JustDown(t[n]) : false);
    const puloApertado = just('W') || just('CIMA') || just('ESPACO');
    return {
      esquerda: down('A') || down('ESQ'),
      direita: down('D') || down('DIR'),
      cima: down('W') || down('CIMA'),
      pulo: down('W') || down('CIMA') || down('ESPACO'),
      puloApertado,
      agachar: down('S') || down('BAIXO'),
      atirar: down('J') || down('X'),
      espuma: down('K') || down('C'),
      espumaApertada: just('K') || just('C'),
    };
  }

  /** Liga o tema da fase nos overlays DOM e cria o painel de ajuda (tecla H). */
  private configurarOverlays(): void {
    document.body.classList.add('fase2');
    document.getElementById('terminal-input')?.setAttribute('placeholder', 'Digite um comando ou "ajuda"');
    this.ajuda = new AjudaPorto();
  }

  /** Seção da ajuda que combina com a área atual (cada área de 2 a 5 tem um desafio). */
  private ajudaDaArea(): IdAjuda {
    const porArea: IdAjuda[] = ['controles', 'pilha', 'fila', 'vetor', 'ordenacao'];
    return porArea[this.indiceArea] ?? 'controles';
  }

  /* =========================================================================
   * TERMINAL
   * ========================================================================= */

  private configurarTerminal(): void {
    this.terminal.definirInterpretador(interpretarComandoFase2);
    this.terminal.definirAoSubmeter((resultado: ResultadoComando) => {
      // O quadro do desafio (pilhas, fila, carretas...) e o texto de ajuda vêm à parte para não herdar a cor do feedback
      if (typeof resultado.valor === 'string' && resultado.valor) this.terminal.imprimirLinha(resultado.valor, 'info');
      if (this.desafioAberto === 'loja') {
        this.hud.atualizar();
        if (resultado.acao === 'LOJA_COMPROU') this.som.tocar('item');
        if (resultado.acao === 'LOJA_SAIR') this.time.delayedCall(500, () => this.terminal.fechar());
        return;
      }
      if (resultado.sucesso) this.som.tocar('acerto');
      else if (resultado.acao !== 'LIMPAR_TERMINAL') this.som.tocar('erro');
      this.area.aoResultadoTerminal(resultado, this.desafioAberto ?? '');
    });
  }

  /**
   * Abre o terminal de um desafio. Nos 4 desafios de programação o texto de abertura sai da ficha
   * (nível, objetivo, como resolver) e `linhasIniciais` traz só o contexto da cena; na loja vale como veio.
   */
  abrirDesafio(desafio: DesafioPorto, modelo: { desenhar(): string }, titulo: string, linhasIniciais: string[]): void {
    this.desafioAberto = desafio;
    this.jogador.body.setVelocityX(0);
    const ficha = desafio === 'loja' ? null : FICHAS[desafio];
    this.terminal.abrir({
      titulo,
      contexto: { cena: 'fase2', desafio, modelo },
      linhasIniciais: ficha ? linhasAbertura(ficha, linhasIniciais, modelo.desenhar()) : linhasIniciais,
    });
    // O nível fica no cabeçalho do terminal, que não rola junto com o texto
    this.terminal.definirTitulo(titulo, ficha ? `[${textoNivel(ficha)}]` : undefined);
  }

  abrirLoja(): void {
    const loja = new ModeloLoja(this.estado);
    this.abrirDesafio('loja', loja, 'CRACA // MERCADO DEBAIXO DO PÍER', [
      'CRACA: Psst! Tem lacre aí? Tenho filtro novinho, quase sem fuligem.',
      '',
      loja.desenhar(),
      '',
      `   Seus lacres: ${this.estado.lacres}`,
      '> Digite o número do item para comprar, ou "sair".',
    ]);
  }

  imprimirNoTerminal(texto: string, tipo: 'info' | 'sucesso' | 'erro' = 'info'): void {
    if (this.terminal.estaAberto) this.terminal.imprimirLinha(texto, tipo);
  }

  fecharTerminal(): void {
    this.terminal.fecharForcado();
  }

  get terminalAberto(): boolean {
    return this.terminal.estaAberto;
  }

  fecharTerminalEm(ms: number): void {
    this.time.delayedCall(ms, () => this.terminal.fecharForcado());
  }

  /* =========================================================================
   * DIÁLOGOS
   * ========================================================================= */

  /** Abre um diálogo (uma única vez por partida quando a chave é informada). */
  falar(linhas: Array<[Falante, string]>, aoFim?: () => void, chaveUnica?: string): void {
    if (chaveUnica) {
      if (this.estado.falasVistas.includes(chaveUnica)) {
        aoFim?.();
        return;
      }
      this.estado.falasVistas.push(chaveUnica);
    }
    this.jogador.body.setVelocityX(0);
    this.comunicador.iniciarDialogo(roteiro(linhas, this.nomeOperador), aoFim);
  }

  /* =========================================================================
   * CONSTRUÇÃO (usada pelas áreas)
   * ========================================================================= */

  /** Sólido invisível (chão, paredes); umaVia = só colide por cima. */
  solido(x: number, y: number, w: number, h: number, umaVia = false): Phaser.GameObjects.Zone {
    const z = this.add.zone(x + w / 2, y + h / 2, w, h);
    this.physics.add.existing(z, true);
    this.solidos.add(z);
    const body = z.body as Phaser.Physics.Arcade.StaticBody;
    if (umaVia) {
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }
    return z;
  }

  /** Imagem em pixel art (escala 4) posicionada pela base (x centro, y base). */
  imagem(chave: string, x: number, y: number, profundidade: number = PROF.estruturas, origemY = 1): Phaser.GameObjects.Image {
    return this.add.image(Math.round(x), Math.round(y), chave).setOrigin(0.5, origemY).setScale(ESCALA).setDepth(profundidade);
  }

  plataformaMovel(x: number, y: number, w: number, h: number, umaVia = true): PlataformaMovel {
    const p = new PlataformaMovel(this.grupoMoveis, this, x, y, w, h, umaVia);
    this.plataformasMoveis.push(p);
    return p;
  }

  /** Plataforma fixa de mão única com visual (ex.: mancha de óleo seca pela espuma). */
  criarPlataformaFixa(x: number, topo: number, largura: number, textura: string): void {
    this.solido(x - largura / 2, topo, largura, 16, true);
    this.add.image(x, topo - 4, textura).setOrigin(0.5, 0).setScale(ESCALA).setDepth(PROF.plataformas);
  }

  interativo(x: number, y: number, rotulo: string, acao: () => void, ativo: () => boolean = () => true, raio = 90): void {
    this.interativos.push({ x, y, raio, rotulo, acao, ativo });
  }

  gatilho(x0: number, x1: number, acao: () => void, y0 = -10000, y1 = 10000): void {
    this.gatilhos.push({ x0, x1, y0, y1, feito: false, acao });
  }

  criarLacre(x: number, y: number): void {
    const s = this.add.sprite(x, y, 'pb-lacre', 0).setScale(ESCALA).setDepth(PROF.itens);
    s.play('pb-anim-lacre');
    this.tweens.add({ targets: s, y: y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.coletaveis.push({ sprite: s, tipo: 'lacre' });
  }

  criarKit(x: number, y: number): void {
    const s = this.add.image(x, y, 'pb-kit').setScale(ESCALA).setDepth(PROF.itens);
    this.tweens.add({ targets: s, y: y - 6, duration: 600, yoyo: true, repeat: -1 });
    this.coletaveis.push({ sprite: s, tipo: 'kit' });
  }

  /** Hidrante: recarrega o tanque do Canhão de Espuma. */
  criarHidrante(x: number, chao: number): void {
    this.imagem('pb-hidrante', x, chao, PROF.npcs);
    this.interativo(
      x,
      chao - 30,
      '[E] RECARREGAR ESPUMA',
      () => {
        this.estado.espuma = ESPUMA_MAXIMA;
        this.hud.atualizar();
        this.som.tocar('item');
        this.efeitos.textoFlutuante(x, chao - 70, 'TANQUE CHEIO!', COR.espuma);
      },
      () => this.estado.temCanhao && this.estado.espuma < ESPUMA_MAXIMA
    );
  }

  /** Caixa de incêndio: recarrega o extintor básico. */
  criarCaixaExtintor(x: number, chao: number): void {
    this.imagem('pb-caixa-extintor', x, chao - 40, PROF.npcs);
    this.interativo(
      x,
      chao - 60,
      '[E] RECARREGAR EXTINTOR',
      () => {
        this.estado.cargasExtintor = CARGAS_EXTINTOR;
        this.hud.atualizar();
        this.som.tocar('item');
        this.efeitos.textoFlutuante(x, chao - 110, 'EXTINTOR: 3 JATOS', '#FF8A6A');
      },
      () => this.estado.temExtintor && !this.estado.temCanhao && this.estado.cargasExtintor < CARGAS_EXTINTOR
    );
  }

  /** Terminal holográfico do PORTUS com uma das 5 gravações. */
  criarGravacaoPortus(numero: number, x: number, chao: number, texto: string): void {
    this.imagem('pb-pedestal-portus', x, chao, PROF.npcs);
    const holo = this.add.sprite(x, chao - 12 * ESCALA, 'pb-portus', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.emissivo).setAlpha(0.8);
    holo.play('pb-anim-portus');
    this.tweens.add({ targets: holo, y: holo.y - 6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.efeitos.brilho(x, chao - 90, 70, COR.telaBoia, 0.25);
    this.interativo(x, chao - 50, `[E] GRAVAÇÃO DO PORTUS ${numero}/5`, () => {
      if (!this.estado.gravacoes.includes(numero)) this.estado.gravacoes.push(numero);
      this.comunicador.iniciarDialogo([
        { ...roteiro([['portus', texto]], this.nomeOperador)[0], falante: `> PORTUS // GRAVAÇÃO ${numero} DE 5 (ANTES DA CORRUPÇÃO)` },
      ]);
    });
  }

  /** CRACA escondida (loja). */
  criarCraca(x: number, chao: number): void {
    const s = this.add.sprite(x, chao, 'pb-craca', 0).setOrigin(0.5, 1).setScale(ESCALA).setDepth(PROF.npcs);
    s.play('pb-anim-craca');
    this.interativo(x, chao - 30, '[E] CRACA (LOJA)', () => {
      if (!this.estado.falasVistas.includes('craca')) {
        this.falar(FALAS.craca, () => this.abrirLoja(), 'craca');
      } else {
        this.abrirLoja();
      }
    });
  }

  /** Recompensa ao derrotar inimigo: lacre (35%) ou kit de reparo (10%). */
  soltarRecompensa(x: number, y: number): void {
    const r = Math.random();
    if (r < 0.35) this.criarLacre(x, Math.min(y, this.area.altura - 120));
    else if (r < 0.45) this.criarKit(x, Math.min(y, this.area.altura - 120));
  }

  /* =========================================================================
   * EVENTOS DE JOGO
   * ========================================================================= */

  dispararPatch(x: number, y: number, dir: number): boolean {
    return this.armas.dispararPatch(x, y, dir);
  }

  usarFerramentaEspuma(x: number, y: number, dir: number, mira: 'normal' | 'alto' | 'baixo'): void {
    const e = this.estado;
    if (e.temCanhao) {
      if (e.espuma <= 0) {
        this.hud.aviso('TANQUE DE ESPUMA VAZIO! RECARREGUE NUM HIDRANTE [E]', '#FF8A6A');
        this.som.tocar('erro');
        return;
      }
      e.espuma--;
      this.armas.dispararEspuma(x, y, dir, mira);
    } else if (e.temExtintor) {
      if (e.cargasExtintor <= 0) {
        this.hud.aviso('EXTINTOR VAZIO! RECARREGUE NA CAIXA DE INCÊNDIO [E]', '#FF8A6A');
        this.som.tocar('erro');
        return;
      }
      e.cargasExtintor--;
      this.armas.usarExtintor(x, y, dir);
    } else {
      this.hud.aviso('VOCÊ AINDA NÃO TEM FERRAMENTA CONTRA FOGO', '#C8C2B4', 1400);
      return;
    }
    this.hud.atualizar();
  }

  atingirComPatch(tiro: Phaser.Physics.Arcade.Image): boolean {
    return this.inimigos.atingirPatch(tiro) || this.area.atingirPatch(tiro);
  }

  atingirComEspuma(bola: Phaser.Physics.Arcade.Image): boolean {
    return this.inimigos.atingirEspuma(bola) || this.area.atingirEspuma(bola);
  }

  aoApagarFoco(foco: FocoIncendio): void {
    if (foco.id && !this.estado.focosApagados.includes(foco.id)) {
      this.estado.focosApagados.push(foco.id);
      this.hud.aviso(`FOCO APAGADO! ÍNDICE DE FUMAÇA: ${indiceFumaca(this.estado)}%  (${this.estado.focosApagados.length}/12)`, COR.espuma);
      this.nevoa.setAlpha(0.32 * (indiceFumaca(this.estado) / 100));
    }
    this.area.aoApagarFoco(foco);
  }

  aoEspumaNoOleo(x: number, zona: Phaser.Geom.Rectangle): void {
    this.area.aoEspumaNoOleo(x, zona);
  }

  fogoNoChaoEm(x: number): boolean {
    return this.area.fogoNoChaoEm(x);
  }

  aoMorrerJogador(): void {
    this.estado.vidas--;
    this.hud.atualizar();
    if (this.estado.vidas > 0) {
      this.cameras.main.flash(300, 255, 255, 255);
      this.jogador.reviver(this.checkpoint.x, this.checkpoint.y);
      this.hud.aviso(`VIDAS RESTANTES: ${this.estado.vidas}`, '#FF8A6A');
      this.area.aoReviver();
      return;
    }
    // Fim de jogo: recomeça a área com o estado da entrada e 3 vidas
    this.hud.aviso('FIM DE JOGO — REINICIANDO A ÁREA', '#FF4A3A', 1800);
    this.transicionando = true;
    const estado = clonarEstado(this.estadoEntrada);
    estado.vidas = VIDAS_INICIAIS;
    this.time.delayedCall(1800, () => {
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(520, () => this.scene.restart({ area: this.indiceArea, estado }));
    });
  }

  registrarCheckpoint(x: number, y: number, texto = 'CHECKPOINT'): void {
    if (this.checkpoint.x === x && this.checkpoint.y === y) return;
    this.checkpoint = { x, y };
    this.hud.aviso(texto, COR.telaBoia, 1500);
  }

  /** Avança para a próxima área (ou conclui a fase após a torre). */
  concluirArea(): void {
    if (this.transicionando) return;
    this.transicionando = true;
    this.terminal.fecharForcado();
    const proxima = this.indiceArea + 1;
    if (proxima >= AREAS.length) {
      this.concluirFaseAtual();
      apagarProgresso();
      this.cameras.main.fade(900, 0, 0, 0);
      this.time.delayedCall(950, () => this.scene.start('CenaHub'));
      return;
    }
    const estado = clonarEstado(this.estado);
    estado.area = proxima;
    salvarProgresso(estado);
    this.cameras.main.fade(600, 0, 0, 0);
    this.time.delayedCall(650, () => this.scene.restart({ area: proxima, estado }));
  }

  /** Desliga a névoa de fundo (final) */
  definirNevoa(alpha: number): void {
    this.tweens.add({ targets: this.nevoa, alpha, duration: 2000 });
  }

  /* =========================================================================
   * LAÇO PRINCIPAL
   * ========================================================================= */

  override update(tempo: number, delta: number): void {
    // Com a ajuda aberta o Esc só fecha a ajuda (a CenaBase usaria o Esc para voltar ao Hub)
    if (!this.ajuda?.aberta) super.update(tempo, delta);
    if (!this.jogador || !this.area) return;

    const pausado = this.ajuda.aberta || this.terminal.estaAberto || this.comunicador.estaAtivo || this.cutscene || this.transicionando;
    if (pausado !== this.fisicaPausada) {
      this.fisicaPausada = pausado;
      if (pausado) this.physics.world.pause();
      else {
        this.physics.world.resume();
        if (!this.terminal.estaAberto) this.desafioAberto = null;
      }
    }

    for (const p of this.plataformasMoveis) {
      if (!p.body?.enable) continue;
      if (pausado) p.teleportar(p.alvoX, p.alvoY);
      else p.aplicar(delta);
    }
    for (const p of this.armas.plataformas) {
      if (pausado) p.plat.teleportar(p.plat.alvoX, p.plat.alvoY);
      else p.plat.aplicar(delta);
    }

    if (pausado) {
      this.textoPrompt.setVisible(false);
      Phaser.Input.Keyboard.JustDown(this.teclas.H); // descarta o H apertado durante diálogos
      this.jogador.congelado = true;
      this.jogador.atualizar(this.lerControlesVazios(), delta);
      this.area.atualizarPausado(tempo, delta);
    } else {
      this.jogador.congelado = false;
      this.atualizarAmbiente(tempo);
      this.jogador.atualizar(this.lerControles(), delta);
      this.atualizarItens();
      this.fogo.atualizar();
      this.armas.atualizar();
      this.inimigos.atualizar(tempo, delta);
      this.atualizarGatilhos();
      this.atualizarInterativos();
      this.area.atualizar(tempo, delta);
      if (Phaser.Input.Keyboard.JustDown(this.teclas.H)) this.ajuda.abrir(this.ajudaDaArea());
      if (this.jogador.y > this.area.altura + 60 && !this.jogador.morto) {
        this.jogador.receberDano(2, this.jogador.x);
        if (!this.jogador.morto) this.jogador.posicionar(this.checkpoint.x, this.checkpoint.y);
      }
      if (Phaser.Input.Keyboard.JustDown(this.teclas.N) && this.continuouDoSave && tempo - this.inicioCena < 15000) {
        apagarProgresso();
        this.scene.restart({ area: 0, estado: criarEstadoInicial() });
        return;
      }
    }

    for (const p of this.plataformasMoveis) p.sincronizar();
    for (const p of this.armas.plataformas) p.plat.sincronizar();
    this.agua?.atualizar(delta);
    const cam = this.cameras.main;
    const cabeca = this.jogador.cabeca;
    this.fumaca.atualizar(delta, cabeca.x - cam.scrollX, cabeca.y - cam.scrollY, this.jogador.agachado, indiceFumaca(this.estado));
    this.hud.quadro();
  }

  private lerControlesVazios(): ControlesPorto {
    return { esquerda: false, direita: false, cima: false, pulo: false, puloApertado: false, agachar: false, atirar: false, espuma: false, espumaApertada: false };
  }

  /** Água, óleo e fumaça sufocante. */
  private atualizarAmbiente(tempo: number): void {
    const j = this.jogador;
    const agua = this.agua;
    j.naAgua = !!agua && agua.estaSubmerso(j.x, j.y + 20);
    j.aguaLimpa = !!agua && agua.limpeza >= 0.6;
    if (j.naAgua && !j.aguaLimpa && tempo - this.ultimoDanoAgua > 900) {
      this.ultimoDanoAgua = tempo;
      if (j.receberDano(1, j.x, 0)) this.efeitos.textoFlutuante(j.x, j.y - 70, 'ÁGUA CONTAMINADA!', '#8ACB9A', 12);
    }
    const pes = j.pes;
    j.noOleo = this.zonasOleo.some((r) => j.x >= r.x && j.x <= r.right && pes >= r.y - 6 && pes <= r.bottom + 4);

    // Fumaça sufocante: em pé, o operador tosse e perde vida; agachado, respira
    if (this.fumaca.densidadeAtual > 0.86 && !j.agachado && !this.fumaca.filtroAtivo && tempo - this.ultimoDanoFumaca > 3500) {
      this.ultimoDanoFumaca = tempo;
      if (j.receberDano(1, j.x, 0)) this.efeitos.textoFlutuante(j.x, j.y - 80, 'COF! COF! AGACHE [S]!', '#C8C2B4', 13);
    }

    if (Phaser.Input.Keyboard.JustDown(this.teclas.Q)) {
      if (this.estado.tanquesE > 0 && j.vida < 10) {
        this.estado.tanquesE--;
        j.curar(10);
        this.som.tocar('item');
        this.efeitos.textoFlutuante(j.x, j.y - 80, 'TANQUE-E: VIDA CHEIA!', COR.virus);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.teclas.F)) {
      if (this.estado.filtros > 0 && !this.fumaca.filtroAtivo) {
        this.estado.filtros--;
        this.fumaca.ativarFiltro(60000);
        this.som.tocar('item');
        this.hud.atualizar();
        this.efeitos.textoFlutuante(j.x, j.y - 80, 'FILTRO DE MÁSCARA: VISÃO EM DOBRO!', COR.telaBoia);
      }
    }
  }

  private atualizarItens(): void {
    const j = this.jogador;
    for (let i = this.coletaveis.length - 1; i >= 0; i--) {
      const c = this.coletaveis[i];
      if (Math.abs(c.sprite.x - j.x) < 34 && Math.abs(c.sprite.y - j.y) < 64) {
        if (c.tipo === 'lacre') {
          this.estado.lacres++;
          this.som.tocar('lacre');
          this.efeitos.textoFlutuante(c.sprite.x, c.sprite.y - 20, '+1 LACRE', COR.advertencia, 12);
        } else {
          j.curar(3);
          this.som.tocar('item');
          this.efeitos.textoFlutuante(c.sprite.x, c.sprite.y - 20, '+3 VIDA', COR.telaBoia, 12);
        }
        this.tweens.killTweensOf(c.sprite);
        c.sprite.destroy();
        this.coletaveis.splice(i, 1);
        this.hud.atualizar();
      }
    }
  }

  private atualizarGatilhos(): void {
    const j = this.jogador;
    for (const g of this.gatilhos) {
      if (!g.feito && j.x >= g.x0 && j.x <= g.x1 && j.y >= g.y0 && j.y <= g.y1) {
        g.feito = true;
        g.acao();
        if (this.comunicador.estaAtivo || this.terminal.estaAberto) break;
      }
    }
  }

  private atualizarInterativos(): void {
    const j = this.jogador;
    let melhor: Interativo | null = null;
    let menor = Infinity;
    for (const it of this.interativos) {
      if (!it.ativo()) continue;
      const d = Phaser.Math.Distance.Between(j.x, j.y, it.x, it.y);
      if (d < it.raio && d < menor) {
        menor = d;
        melhor = it;
      }
    }
    if (melhor) {
      this.textoPrompt.setText(melhor.rotulo).setPosition(melhor.x, melhor.y - 46).setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.teclas.E)) {
        this.textoPrompt.setVisible(false);
        melhor.acao();
      }
    } else {
      this.textoPrompt.setVisible(false);
      Phaser.Input.Keyboard.JustDown(this.teclas.E);
    }
  }
}
