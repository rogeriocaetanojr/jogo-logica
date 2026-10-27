import { AJUDA, obterAjuda } from './AjudaConteudo';
import type { IdAjuda } from './AjudaConteudo';

function criar<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texto?: string): HTMLElementTagNameMap[K] {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = texto;
  return no;
}

/**
 * Painel de ajuda da fase 2 (tecla H): controles e explicação dos comandos de cada desafio.
 * É um overlay DOM como o terminal e o diálogo; o conteúdo vem de AjudaConteudo.
 */
export class AjudaPorto {
  private readonly raiz: HTMLElement;
  private readonly painel: HTMLElement;
  private readonly abas = new Map<IdAjuda, HTMLButtonElement>();
  private atual: IdAjuda = 'controles';
  private estaAberta = false;

  constructor() {
    document.getElementById('ajuda-fase2')?.remove();

    this.raiz = criar('div', 'hidden');
    this.raiz.id = 'ajuda-fase2';
    this.raiz.addEventListener('mousedown', (e) => {
      if (e.target === this.raiz) this.fechar();
    });

    const janela = criar('div', 'ajuda-janela');
    janela.setAttribute('role', 'dialog');
    janela.setAttribute('aria-modal', 'true');
    janela.setAttribute('aria-labelledby', 'ajuda-titulo');

    const topo = criar('div', 'ajuda-topo');
    const titulo = criar('h2', undefined, 'Manual do operador');
    titulo.id = 'ajuda-titulo';
    const fechar = criar('button', 'ajuda-fechar', 'Fechar (H)');
    fechar.type = 'button';
    fechar.addEventListener('click', () => this.fechar());
    topo.append(titulo, fechar);

    const corpo = criar('div', 'ajuda-corpo');
    const lista = criar('div', 'ajuda-abas');
    lista.setAttribute('role', 'tablist');
    lista.setAttribute('aria-label', 'Seções da ajuda');
    this.painel = criar('div', 'ajuda-painel');
    this.painel.id = 'ajuda-painel';
    this.painel.setAttribute('role', 'tabpanel');
    this.painel.tabIndex = 0;

    for (const secao of AJUDA) {
      const aba = criar('button', 'ajuda-aba', secao.aba);
      aba.type = 'button';
      aba.id = `ajuda-aba-${secao.id}`;
      aba.setAttribute('role', 'tab');
      aba.setAttribute('aria-controls', 'ajuda-painel');
      aba.addEventListener('click', () => this.selecionar(secao.id));
      this.abas.set(secao.id, aba);
      lista.append(aba);
    }
    corpo.append(lista, this.painel);

    const rodape = criar('div', 'ajuda-rodape', 'Setas ou 1 a 6 trocam de seção  ·  H ou Esc fecham');
    janela.append(topo, corpo, rodape);
    this.raiz.append(janela);
    (document.getElementById('game-container') ?? document.body).append(this.raiz);

    this.selecionar(this.atual);
    window.addEventListener('keydown', this.aoTecla, true);
  }

  get aberta(): boolean {
    return this.estaAberta;
  }

  abrir(id?: IdAjuda): void {
    if (this.estaAberta) return;
    this.estaAberta = true;
    this.raiz.classList.remove('hidden');
    this.selecionar(id ?? this.atual);
    this.abas.get(this.atual)?.focus();
  }

  fechar(): void {
    if (!this.estaAberta) return;
    this.estaAberta = false;
    this.raiz.classList.add('hidden');
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  destruir(): void {
    window.removeEventListener('keydown', this.aoTecla, true);
    this.raiz.remove();
    this.estaAberta = false;
  }

  private selecionar(id: IdAjuda): void {
    this.atual = id;
    for (const [chave, aba] of this.abas) {
      const ativa = chave === id;
      aba.setAttribute('aria-selected', String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
    }
    this.painel.setAttribute('aria-labelledby', `ajuda-aba-${id}`);
    this.desenhar(id);
  }

  private mover(passo: number): void {
    const i = AJUDA.findIndex((s) => s.id === this.atual);
    const proxima = AJUDA[(i + passo + AJUDA.length) % AJUDA.length];
    this.selecionar(proxima.id);
    this.abas.get(proxima.id)?.focus();
  }

  private desenhar(id: IdAjuda): void {
    const secao = obterAjuda(id);
    this.painel.replaceChildren();
    this.painel.scrollTop = 0;
    this.painel.append(criar('h3', undefined, secao.titulo));
    if (secao.nivel) this.painel.append(criar('p', 'ajuda-nivel', secao.nivel));
    this.painel.append(criar('p', 'ajuda-conceito', secao.conceito));
    if (secao.comoResolver) {
      const passos = criar('ol', 'ajuda-passos');
      for (const passo of secao.comoResolver) passos.append(criar('li', undefined, passo));
      this.painel.append(criar('p', 'ajuda-cuidados-titulo', 'Como resolver'), passos);
    }

    const itens = criar('dl', 'ajuda-itens');
    for (const item of secao.itens) {
      const termo = criar('dt');
      termo.append(criar('code', undefined, item.codigo));
      itens.append(termo, criar('dd', undefined, item.explicacao));
    }
    this.painel.append(itens);

    if (secao.cuidados.length > 0) {
      const lista = criar('ul', 'ajuda-cuidados');
      for (const cuidado of secao.cuidados) lista.append(criar('li', undefined, cuidado));
      this.painel.append(criar('p', 'ajuda-cuidados-titulo', 'Cuidado'), lista);
    }
  }

  /** Enquanto aberta, o painel captura o teclado para o jogo (Phaser) não receber nada. */
  private aoTecla = (e: KeyboardEvent): void => {
    if (!this.estaAberta) return;
    e.stopImmediatePropagation();
    const k = e.key;
    if (k === 'Escape' || k === 'h' || k === 'H') {
      e.preventDefault();
      this.fechar();
    } else if (k === 'ArrowDown' || k === 'ArrowRight') {
      e.preventDefault();
      this.mover(1);
    } else if (k === 'ArrowUp' || k === 'ArrowLeft') {
      e.preventDefault();
      this.mover(-1);
    } else if (/^[1-9]$/.test(k) && Number(k) <= AJUDA.length) {
      e.preventDefault();
      this.selecionar(AJUDA[Number(k) - 1].id);
    }
  };
}
