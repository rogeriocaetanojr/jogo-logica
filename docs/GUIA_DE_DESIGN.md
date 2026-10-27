# Guia de Design — Jogo de Lógica (base: Fase 2 · Porto Bugado)

Este guia documenta as decisões visuais, de interface, de áudio e de escrita da **Fase 2 (Porto Bugado)**, para que as demais fases (e quem mexer nelas) mantenham a mesma coerência. Tudo aqui foi extraído do código em `src/fases/fase2/`; quando um valor aparece entre crases, ele existe no código com esse nome.

> **Regra de ouro:** a programação é o meio, a mecânica é o que importa. Cada elemento visual precisa ajudar o jogador a *ler* o problema (o que é perigo, o que é ferramenta, o que é código) antes de ajudá-lo a *admirar* o cenário.

---

## 1. Conceito visual

| Item | Decisão |
|---|---|
| Tema | Porto industrial em chamas, tomado por vírus do MegaBrain |
| Atmosfera | Entardecer de fuligem: céu vermelho-queimado, fumaça preta, óleo em chamas |
| Estilo | Pixel art desenhada em código (sem arquivos de imagem), exibida em **4x** |
| Tom | Tensão com humor: o mundo é perigoso, os diálogos são sarcásticos |
| Contraste-chave | Cenário **quente e escuro** × informação de jogo em **amarelo, verde-néon e ciano** |

A fase conta uma progressão visual de luz: do entardecer (Área 1–3) ao céu fumacento (Área 5) e à noite na Torre (Área 6). O **Índice de Fumaça** reforça isso: quanto mais focos apagados, mais claro o caminho.

---

## 2. Resolução e escala

- **Tela do jogo:** 1280 × 720 px.
- **Resolução de arte:** 320 × 180 px, ampliada **4x** (`ESCALA = 4`). Um pixel de arte = bloco 4 × 4 na tela.
- **Texturas:** criadas em `canvas` com filtro `NEAREST` (`texturaPixel`, `folhaPixel`). Nunca use suavização em pixel art.
- **Mundo:** cada área tem 5120 × 720 px (`AreaPorto.largura/altura`), rolagem horizontal com câmera.
- **Coordenadas inteiras:** sempre arredonde posições de sprites (`Math.round`) para evitar pixels “tremendo”.
- **Sprites pequenos, escala grande:** inimigos e objetos são desenhados em poucos pixels (ex.: BOIA 10×12, CAPITÃO 16×24) e ampliados com `setScale(ESCALA)`.

---

## 3. Paleta de cores

A paleta oficial vive em `COR` (`porto/ArtePorto.ts`). **Não invente hexadecimais novos** dentro da fase: use as chaves.

### 3.1 Céu e fumaça
| Token | Hex | Uso |
|---|---|---|
| `fuligem` | `#2E2826` | Fumaça escura, sombras |
| `fumacaIluminada` | `#6E4030` | Borda iluminada pela luz do fogo |
| `ceuQueimado` | `#7E2E28` | Céu médio |
| `horizonte` | `#DE7A34` | Linha de horizonte |
| `sol` | `#DE5232` | Sol vermelho |

### 3.2 Mar e óleo
| Token | Hex |
|---|---|
| `aguaFunda` | `#141C18` |
| `verdeLodo` | `#2A3A2A` |
| `lodoClaro` | `#3E5236` |
| `oleoRoxo` | `#6B3FA0` |
| `oleoCiano` | `#2FA4A8` |
| `oleoAmarelo` | `#C9B03A` |

### 3.3 Fogo (do núcleo à ponta)
`fogoNucleo #FFF1A8` → `fogoChama #F7C948` → `fogoLaranja #F08A24` → `fogoBrasa #C8401E` → `fogoPonta #6E1E14`

### 3.4 Porto e personagens
| Token | Hex | Uso |
|---|---|---|
| `concreto` / `concretoClaro` / `concretoEscuro` | `#6A6662` / `#8A857E` / `#4A4744` | Estruturas, piso |
| `contVermelho` / `contAzul` / `contAmarelo` / `contVerde` | `#A33A2A` / `#2B5C9A` / `#C99A1E` / `#3A7A47` | Contêineres (+ `#7A3A6A`, `#5A6A7A` em `CORES_CONTEINER`) |
| `aco` | `#2E2630` | Metal escuro |
| `contorno` | `#1A1414` | Contorno de sprites (nunca preto puro) |
| `branco` | `#EDE6D2` | “Branco” quente |
| `espuma` / `espumaSombra` | `#E8E6DC` / `#B8B4A6` | Espuma do canhão |

### 3.4.1 Cores semânticas (as que carregam significado de jogo)
Estas quatro cores **sempre** significam a mesma coisa. Não as use como decoração.

| Cor | Token | Hex | Significado |
|---|---|---|---|
| Amarelo advertência | `advertencia` | `#F2C230` | Interface, bordas, avisos, lacres, interativo |
| Verde vírus | `virus` | `#5CFF8A` | **Perigo/inimigo** (olhos de vírus, MegaBrain) e **sucesso** no terminal |
| Ciano BOIA | `telaBoia` | `#4FD8E8` | **Código**, dicas da BOIA, atalhos, holograma PORTUS |
| Laranja fogo | `fogoLaranja` | `#F08A24` | Fogo, Índice de Fumaça, “Cuidado” |

> Os olhos dos inimigos são desenhados **acima da fumaça** (`PROF.emissivo`) em verde-néon: mesmo na escuridão, o perigo se lê pela cor.

### 3.5 Variação noturna
`noturna(cor)` desloca a cor para azul escuro (`×0.42, ×0.48, ×0.78` + offset). Use `tingir(cor, noite)` em qualquer peça de cenário reutilizada na Área 6.

### 3.6 Utilitários de cor
`hexNum` (hex → `0xRRGGBB` para `Graphics`), `misturar(a, b, k)`, `sombrear(cor, k)` (escurece em direção ao preto), `noturna`.

---

## 4. Pixel art

### 4.1 Pincel (`Pincel`)
Toda arte é desenhada com `Pincel` em coordenadas de pixel de arte: `px`, `ponto`, `disco`, `elipse`, `linha`, `moldura`, `sprite`, `texto`, `textoContorno`, `degradePontilhado`, `faixaAdvertencia`.

### 4.2 Sprites por caracteres
Sprites pequenos são definidos como linhas de texto + paleta, assim a arte fica versionável em Git:

```ts
const BOIA_BASE = [
  '....KK....',
  '..KKKKKK..',
  '.KDDDDDDK.',
  /* ... */
];
p.sprite(BOIA_BASE, { K: COR.contorno, E: COR.telaBoia, W: COR.branco /* ... */ }, 0, 0);
```
`.` ou caractere fora da paleta = transparente.

### 4.3 Regras de desenho
1. **Contorno de 1 px** em `COR.contorno` (`#1A1414`) em personagens e inimigos.
2. **3 tons por material:** base, luz (topo/esquerda) e sombra (base/direita).
3. **Pontilhado de Bayer 4×4** (`bayer`, `degradePontilhado`) para degradês de céu e paredes; nunca degradê contínuo.
4. **Ruído determinístico:** use `hash3` / `aleatorio(semente)` para variar cenário sem “piscar” entre execuções.
5. **Faixa de advertência** amarelo/preto diagonal (`faixaAdvertencia`) marca bordas de píer, painéis e perigo estrutural.
6. **Animações curtas**: 2 a 5 quadros em folhas horizontais (`folhaPixel`); o quadro de “fala” altera só olhos/boca.
7. **Texturas únicas:** sempre checar `textures.exists(chave)` (já embutido nas fábricas) e prefixar chaves com `pb-`.

### 4.4 Fonte bitmap 3×5
Textos dentro da arte (placas, painéis LED, título de área) usam a fonte 3×5 própria (`FONTE` em `ArtePorto.ts`): só ASCII maiúsculo, sem acentos (o texto é normalizado). Largura = `(n*4 − 1) * escala`. Use `textoContorno` sobre fundos movimentados.

### 4.5 Camadas de profundidade (`PROF`)
| Camada | Valor | Camada | Valor |
|---|---|---|---|
| `ceu` | −100 | `projeteis` | 28 |
| `distante` | −90 | `agua` | 30 |
| `meio` | −80 | `frente` | 35 |
| `proximo` | −70 | `fogo` | 40 |
| `fumacaFundo` | −60 | `brilho` | 42 |
| `estruturas` | 0 | `fumacaFrente` | 45 |
| `plataformas` | 10 | **`mascara`** | 50 |
| `npcs` | 15 | `emissivo` | 55 |
| `itens` | 18 | `textos` | 60 |
| `inimigos` | 20 | **`hud`** | 9000 |
| `jogador` | 25 | | |

Regras: o que **brilha** (olhos de vírus, explosões, faíscas) fica em `emissivo` (acima da máscara de fumaça); a máscara de visão fica em `mascara`; o HUD sempre em `hud`.

### 4.6 Parallax
Fundo em camadas (`AreaPorto.camada`): quanto mais longe, menor o fator de rolagem. Exemplo da Área 1: céu `0`, cidade `0.1`, armazéns `0.5`, chão `1`. Cada camada é uma textura desenhada uma vez, com largura calculada para cobrir o mundo inteiro.

---

## 5. Iluminação e efeitos

| Efeito | Como | Onde |
|---|---|---|
| **Brilho de fogo** | Imagem radial aditiva (`BlendModes.ADD`), tint laranja, alpha tremulando (90–170 ms, yoyo) | `EfeitosPorto.brilho` |
| **Clarão** | Mesmo brilho, some em 380 ms | `brilhoRapido` |
| **Explosão** | Sprite animado + clarão laranja | `explosao` |
| **Vapor / respingo / faísca** | Sprites animados de vida curta, destruídos ao terminar | `vapor`, `respingo`, `faisca` |
| **Pluma de fumaça** | Partículas subindo e derivando à esquerda, crescem de `0.35x` a `~1.6x` | `pluma` |
| **Texto flutuante** | Texto 11–13 px sobe 34 px e some em 1,3 s | `textoFlutuante` |
| **Dano** | Flash branco em 80 ms (`setTintMode(FILL)`) | `Inimigo.sofrer` |

### 5.1 Mecânica visual central: a máscara de fumaça
A tela escurece fora de um círculo de visão em volta da lanterna do operador (`FumacaPorto`).

| Nível | Densidade | Área |
|---|---|---|
| `leve` | 0.22 | 1, 2 |
| `media` | 0.50 | 3 |
| `densa` | 0.72 | 4, 5, 6 |
| `sufocante` | 0.92 | (reservado) |

- Máscara em canvas 320×180 exibida em 4x, **com bordas em degraus de pixel** (círculos concêntricos 1.0 / 0.84 / 0.68 / 0.52).
- Cor da máscara: `#140F0E` (dia) e `#07070C` (noite).
- Raio base: `150 − densidade × 122` px de arte; **agachar ×1.4**, **filtro de máscara ×2**, cada foco apagado devolve até +55% de visão.
- Raio mínimo: 16 px de arte. O jogador nunca fica totalmente cego.
- Ajuste de densidade é suavizado (`k = delta × 1.6`), nunca em salto.

---

## 6. Tipografia

| Contexto | Fonte | Observação |
|---|---|---|
| HUD e textos Phaser | `Consolas, "Courier New", monospace` | **Sempre negrito**, contorno preto 3 px (`strokeThickness: 3`) |
| Terminal e códigos (DOM) | `'Cascadia Mono', Consolas, 'Courier New', monospace` (`--pb-fonte-codigo`) | Tudo que o jogador digita ou lê como comando |
| Texto corrido (DOM) | `'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif` (`--pb-fonte-texto`) | Diálogos e ajuda |
| Placas e painéis na arte | Fonte bitmap 3×5 | Apenas ASCII maiúsculo |

### Escala de tamanhos
| Uso | Tamanho |
|---|---|
| Texto flutuante / aviso de bloqueio | 11–13 px |
| HUD (títulos, rótulos, itens) | 13–15 px |
| Valor do Índice de Fumaça | 20 px (destaque) |
| Aviso central | 17 px |
| Subtítulo do cartão de área | 19 px |
| Terminal | 15 px (cabeçalho 14, rodapé 12) |
| Diálogo | 18 px, entrelinha 1.55 |
| Ajuda: título / conceito / item | 22 / 16 / 15 px |

Legibilidade: textos corridos limitados a `62ch`–`66ch`; contraste de texto sobre fundo escuro sempre alto (`#ECE6D6` sobre `rgba(18,13,12,.96)`).

---

## 7. Interface (HUD em Phaser)

Coordenadas em tela de 1280 × 720, com `setScrollFactor(0)` e `PROF.hud`. Implementação: `porto/HudPorto.ts`.

```
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 2 · PORTO BUGADO                          [H] AJUDA   [ESC] HUB   │  y 14
│ ┌──────────────────────────┐                ┌──────────────────────────┐│
│ │▓▒▓▒ faixa advertência    │                │▓▒▓▒ faixa advertência    ││  y 44
│ │ VIDA ■■■■■■■■■■  x3      │                │ ÍNDICE DE FUMAÇA   100%  ││
│ │ EXTINTOR ■ ■ ■           │                │ [████████████▌░░░░░░░░]  ││
│ │ ▮ 0   Q:TANQUE F:FILTRO  │                │ ÁREA 1/6 · PORTARIA      ││  h 78
│ └──────────────────────────┘                └──────────────────────────┘│
│                                                                        │
│                      [ aviso central, y 150 ]                          │
│                                                                        │
│                                                                        │
│                 [ controles temporários, y 704 ]                       │
│                [ KRAKEN.EXE  ▓▓▓▓▓▓▓▓▓▓▓░░░░ ]    (barra de chefe)    │  y 656-682
└────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Painéis
- Tamanho `300 × 78`, 16 px de margem lateral, y = 44.
- Fundo `#0E0A0A` com alpha 0.78; borda `COR.advertencia` 2 px (alpha 0.85).
- **Faixa de advertência de 4 px no topo:** blocos alternados de 12 px entre amarelo e `#1A1616`.
- Esquerda = **o que o jogador tem** (vida, ferramenta, lacres, itens). Direita = **o que o mundo faz** (Índice, área, filtro).

### 7.2 Medidores segmentados
Cada unidade é um bloco com moldura escura e miolo colorido (sem barras lisas):
- **Vida:** 10 blocos `13×14`; cheio = `fogoLaranja`, **≤ 3 vidas = `#FF4A3A`** (alerta), vazio = `#2A2224`, realce `#FFF1A8` em 80% no topo.
- **Extintor:** 3 blocos `16×14` em `#C8301E`.
- **Espuma:** 12 blocos `10×12` em `COR.espuma`.
- **Índice de Fumaça:** barra `280×14`; cor interpola de cinza (`#8A847C`) a laranja conforme sobe; **marca verde nos 40%** = mínimo possível (todos os 12 focos apagados).

### 7.3 Movimento no HUD
- O medidor do Índice anima suavemente (lerp `0.08` por quadro); só ele tem `Graphics` próprio, para não redesenhar o painel inteiro.
- **Aviso central:** aparece em alpha 1, espera `duração` (2200 ms), sobe 10 px e some em 500 ms.
- **Controles:** surgem por 9 s, fade de 1,2 s.
- **Cartão de área:** título em pixel art 4× (linha “AREA N” amarela + nome em branco quente 2x), fade in 500 ms, **hold 1800 ms**, fade out.
- **Barra de chefe:** `600 × 22` na base (y 660), preenchimento `COR.virus`, **marcas brancas em 60% e 30%** indicando as etapas do KRAKEN.

### 7.4 Textos do HUD por cor
Branco quente `#F2EEE2` (valores) · cinza-areia `#C8C2B4` (rótulos) · `advertencia` (lacres, avisos) · `telaBoia` (atalhos, filtro) · `fogoLaranja` (índice) · `virus` (chefes).

---

## 8. Overlays DOM (diálogo, terminal, ajuda)

Tema em `estilos/fase2.css`, **escopado em `body.fase2`** (a `CenaFase2` liga e remove a classe), então as outras fases mantêm seu visual verde padrão.

### 8.1 Tokens CSS
```css
--pb-fundo:        rgba(18, 13, 12, 0.96);
--pb-fundo-fundo:  #0c0808;
--pb-borda:        #f2c230;               /* amarelo advertência */
--pb-borda-suave:  rgba(242, 194, 48, .35);
--pb-texto:        #ece6d6;
--pb-suave:        #b9b2a2;               /* texto secundário */
--pb-fogo:         #f08a24;
--pb-ok:           #5cff8a;
--pb-erro:         #ff7a66;
--pb-codigo:       #4fd8e8;
```

### 8.2 Forma
- **Cantos quase retos:** `border-radius: 2px` em tudo.
- **Borda de 2 px** amarela nas janelas; **1 px suave** para divisórias internas.
- **Sombra:** `0 8–12px 28–40px rgba(0,0,0,.75–.8)`.
- **Sem blur, sem brilho de texto** (`backdrop-filter: none`, `text-shadow: none`). O visual CRT verde da Fase 1 é desligado.
- **Cabeçalhos** de janela: fundo `rgba(242,194,48,.12)` + linha inferior suave.

### 8.3 Diálogo (`#dialog-overlay`)
- Largura `880px`, altura mínima `112px`, posicionado em `top: 18.8%` (**logo abaixo do HUD**: o operador e o cenário continuam visíveis).
- Avatar `84×84` com retrato em pixel art ampliado (`image-rendering: pixelated`).
- Rótulo do falante: monoespaçada 13 px, amarelo, formato `> NOME // PAPEL` (ver §10).
- Prompt de avanço: 12 px, cinza, estático (sem animação).

### 8.4 Terminal (`#terminal-overlay`)
- `min(900px, 94%) × min(560px, 82%)`.
- Linhas do log por tipo: `info` → `--pb-suave` · `command` → `--pb-borda` · `success` → `--pb-ok` · `error` → `--pb-erro`.
- Campo de entrada: cursor amarelo; **foco = linha superior amarela de 2 px** (sem outline do navegador).
- Lembrete fixo à direita do campo: *“ajuda mostra os comandos · Esc fecha”*.
- Sempre aceita `ajuda`, `dica`, `status`, `limpar`.

### 8.5 Ajuda (`#ajuda-fase2`, tecla **H**)
- Modal `min(1000px,100%) × min(600px,100%)` sobre fundo `rgba(8,5,5,.78)`, `z-index: 200`.
- Abas verticais (190 px) à esquerda; aba ativa: **barra de 4 px amarela**, texto em negrito, fundo `rgba(242,194,48,.12)`.
- Painel: título (22 px) → conceito (16 px, cor suave, `max-width: 62ch`) → grade `dl` de comandos → **“Cuidado”** em laranja com lista de erros comuns.
- Códigos como “pílulas”: monoespaçada 14 px, ciano `#4fd8e8`, fundo `rgba(79,216,232,.08)`, borda `rgba(79,216,232,.28)`.
- **Teclado:** setas ou `1–6` trocam de seção; `H`/`Esc` fecham; o painel captura as teclas (o jogo não recebe nada).
- **Acessibilidade:** `role="dialog"`, `aria-modal`, `role="tablist/tab/tabpanel"`, `aria-selected`, foco visível (`outline: 2px solid --pb-codigo`).
- **Responsivo (≤ 760 px):** abas viram uma linha horizontal rolável com barra inferior; a grade de itens vira uma coluna.

---

## 9. Áudio

Tudo é **sintetizado em tempo real com Web Audio** (`SomPorto`), sem arquivos externos.

- Volume mestre: `0.32`.
- Primitivas: `tom(tipo, f0, f1, duração, volume)` (oscilador com rampa exponencial) e `chiado(duração, volume, filtro, f0, f1)` (ruído filtrado).
- Sons nomeados: `tiro`, `pulo`, `dano`, `derrota`, `espuma`, `extintor`, `apagar`, `explosao`, `lacre`, `item`, `bracada`, `buzina`, `sirene`, `guindaste`, `erro`, `acerto`, `glitch`, `tink`, `inimigo`, `vapor`.
- **Ambiente por área** (`volumeOndas` / `volumeFogo`): Portaria 0.15/0.35 · Pátio 0.1/0.3 · Cais 0.9/0.5 · Depósito 0/1 · Terminal 0/1 · Torre 1/0.3. O som conta onde você está.
- Só toca com o `AudioContext` em `running` e dentro de `try/catch`; **nunca** depender do áudio para passar informação essencial.

Princípios: tiro = onda quadrada aguda e curta; dano/erro = tons descendentes; acerto = tons ascendentes; fogo/água = ruído filtrado.

---

## 10. Escrita e voz

### 10.1 Falantes (formato `> NOME // PAPEL`)
| Falante | Rótulo | Voz |
|---|---|---|
| **BOIA** | `> BOIA // ROBÔ-BOIA DE SINALIZAÇÃO` | Aliada calma, didática, usa analogias do dia a dia (*“Pilha é igual pilha de pratos”*) |
| **CAPITÃO PRÁTICO** | `> CAPITÃO PRÁTICO // EX-PRÁTICO DO PORTO DE BUG` | Marinheiro rabugento e afetuoso (*“Rapaz, isso não é jeito de atracar!”*) |
| **CRACA** | `> CRACA // MERCADO DEBAIXO DO PÍER` | Vendedor sorrateiro (*“Psst! Tem lacre aí?”*) |
| **PORTUS** | `> PORTUS // GRAVAÇÃO RECUPERADA` | IA do porto, frases curtas e tristes, **dá pistas do chefe** |
| **MEGABRAIN** | `> MEGABRAIN // TRANSMISSÃO HOSTIL` | Vilão debochado e arrogante |
| **ESTIVADOR-07** | `> ESTIVADOR-07 // ROBÔ DE CARGA` | Preso em loop (*“Carregar... carregar...”*) |
| **Operador** | `> ALVARES // OPERADOR DE LOGÍSTICA` | `{nome}` troca pelo personagem escolhido |

### 10.2 Regras de texto
1. **Explique o conceito com metáfora, depois mostre o comando.** Ex.: pilha de pratos → `pilhaA.pop()`.
2. **Mostre a tecla entre colchetes:** `[K]`, `[E]`, `[H]`.
3. **Cada falha tem uma resposta do MegaBrain**, sorteada **sem repetir a anterior** (`sortearSemRepetir`), 3 variações por desafio. O deboche ensina: nomeia o erro conceitual (*“Contar a partir do um? Que adorável.”*).
4. **Prefixos do terminal:** `[DICA DA BOIA]`, `[ERRO]`, `[AVISO]`; comandos ecoados com `>`; o quadro ASCII do desafio vai em `valor` (cor neutra).
5. **Frases curtas.** Uma ideia por linha de diálogo; no máximo 2 sentenças longas por fala.
6. **Português do Brasil**, informal, sem jargão não explicado.
7. **Tolerância de entrada:** o interpretador ignora espaços, aspas e caixa (`compactar`) e aceita vários comandos separados por `;`.
8. **Ajuda = fonte única:** `AjudaConteudo.ts` alimenta o painel [H] **e** o comando `ajuda`. Toda sintaxe listada ali precisa ser aceita pelo interpretador.

---

## 11. Mecânica e feedback (leitura do jogo)

### 11.1 Operador
| Parâmetro | Valor |
|---|---|
| Corpo de colisão | 40 × 94 px (zona invisível; o sprite acompanha os pés) |
| Velocidade | 240 px/s (agachado 110) |
| Pulo | 650 · gravidade extra 400 · queda máx. 900 |
| Agachar | Achata o sprite sem mudar colisão; aumenta visão ×1.4 |
| Vida | 10 blocos · 3 vidas iniciais |
| Ferramentas | Pistola de Patch `[J]`, extintor (3 cargas) ou Canhão de Espuma (12) `[K]` |

### 11.2 Inimigos (leitura pela silhueta e pelo olho verde)
Todos têm **olho verde-néon** emissivo. O jogador deve entender *como derrotar* só de olhar:

| Inimigo | Comportamento | Como derrotar |
|---|---|---|
| **GAIVÍRUS** | Gaivota-drone, rasante em linha reta | 1 tiro de patch |
| **SIRI-SCRIPT** | Anda de lado, atira colchetes `{ }` | 2 tiros, por trás ou de cima |
| **JANELA POP-UP** | Cobre parte da tela | Tiro no “X” |
| **EMPILHADEIRA ZUMBI** | Patrulha, ergue os garfos ao ver o jogador e investe em linha reta | 3 de vida (ver `InimigosPorto.ts`) |
| **ÁGUA-VÍRUS** | Água-viva de sacolas | Espuma prende, depois 1 tiro |
| **MANCHA VIVA** | Poça de óleo que se ergue e pega fogo | Espuma seca e vira plataforma |
| **FUMACÊ** | Nuvem com olhos, reduz a visão | Espuma ou ventiladores |
| **BARRIL BUGADO** | Rola e explode no fogo | Manter longe do fogo |
| **GARRA DE GUINDASTE** | Desce para agarrar | Tiro no cabo |

Dano de contato padrão: `2`. Quando um tiro não surte efeito (ex.: patch num inimigo que só cai com espuma), o inimigo faz faísca + som `tink` e pode mostrar um texto flutuante cinza (`bloquear`): o jogo explica por que não funcionou em vez de ficar “mudo”.

### 11.3 Chefes
- **Miniboss BORRACHÃO.EXE** (Área 4): um jato de espuma esfria os pneus e o faz parar por 3 s, mostrando o núcleo verde (alvo do patch).
- **Boss KRAKEN.EXE** (Área 6): barra de vida com marcas em **60%** e **30%** = mudança de etapa, sempre com um diálogo.

### 11.4 Áreas e desafios
| # | Área | Conceito | Fumaça | Céu |
|---|---|---|---|---|
| 1 | Portaria Travada | Introdução | leve | `entardecer` |
| 2 | Pátio das Pilhas | **Pilha** (LIFO) | leve | `entardecer` |
| 3 | Cais da Fila | **Fila** (FIFO) | média | `entardecer` |
| 4 | Depósito de Pneus | **Vetores e índices** | densa | parede de galpão (degradê `#140C0C`→`#3A1A14`) |
| 5 | Terminal de Combustível | **Ordenação** | densa | `fumacento` |
| 6 | Torre do Servidor Central | KRAKEN.EXE | densa | `noite` |

### 11.5 Princípio “cenário que ensina”
O desafio é **visível no mundo**, não só no terminal: painéis LED mostram `push()`/`pop()`, navios formam a fila, válvulas ficam numeradas, carretas se reordenam. O terminal só dá o comando; o cenário mostra o resultado.

---

## 12. Movimento e tempo (cheatsheet)

| Elemento | Duração / curva |
|---|---|
| Flash de dano | 80 ms |
| Clarão | 380 ms |
| Tremulação do brilho do fogo | 90–170 ms, yoyo infinito |
| Texto flutuante | 1300 ms, `Quad.easeOut`, sobe 34 px |
| Aviso do HUD | 2200 ms visível + 500 ms de saída |
| Cartão de área | 500 + 1800 + 500 ms |
| Índice de Fumaça | lerp `0.08` / quadro |
| Visão (raio) | lerp `delta × 5` |
| Densidade | lerp `delta × 1.6` |
| Piscar das luzes-vírus | a cada 480 ms, 60% de chance por luz |
| Espuma → plataforma | dura 4 s |
| Filtro de máscara | 60 s |

Princípios: **nada muda de estado em salto**: use lerp ou tween. Fade-outs são mais lentos que fade-ins.

---

## 13. Persistência de estado visual
- Progresso: `localStorage` chave `porto_bugado_progresso`, com **versão** (`VERSAO_PROGRESSO = 2`) e **sanitização** (campos desconhecidos ignorados, números limitados com `inteiro(min, max)`).
- Falas já vistas (`falasVistas`) não se repetem; ao voltar, NPCs usam a versão curta (`capitaoDepois`).
- O progresso é salvo a cada área; **N** nos primeiros segundos recomeça do início.

---

## 14. Checklist para criar uma nova fase com este visual

**Arte**
- [ ] Desenhei em 320×180 e exibi em 4x com `NEAREST`.
- [ ] Usei só cores de `COR` (ou criei um token novo documentado aqui).
- [ ] Contorno `#1A1414` de 1 px nos personagens/inimigos.
- [ ] Céu e paredes com pontilhado de Bayer, não degradê liso.
- [ ] Camadas de profundidade usam `PROF`; o que brilha fica em `emissivo`.
- [ ] Peças reutilizadas aceitam `noite` via `tingir`.

**Interface**
- [ ] HUD com painéis `300×78`, borda amarela e faixa de advertência.
- [ ] Medidores segmentados, nunca barras lisas.
- [ ] Overlays DOM escopados em `body.faseN` (não vazam para outras fases).
- [ ] Tokens `--pb-*` (ou equivalentes da nova fase) em vez de hex soltos no CSS.
- [ ] Foco visível e `aria-*` em tudo que for interativo.
- [ ] Layout testado em ≤ 760 px.

**Cores com significado**
- [ ] Amarelo = interface/interativo · verde = perigo/sucesso · ciano = código/dica · laranja = fogo/alerta.

**Texto**
- [ ] Falas no formato `> NOME // PAPEL`; metáfora antes do comando.
- [ ] Erro do vilão sorteado sem repetir; ao menos 3 variações por desafio.
- [ ] A ajuda lista só sintaxe que o interpretador aceita.

**Jogo**
- [ ] O jogador entende o desafio olhando o cenário.
- [ ] Todo inimigo mostra seu ponto fraco na silhueta ou no comportamento.
- [ ] Nada depende só de som ou só de cor para comunicar algo essencial.
- [ ] Testado com GPU (Chrome headless com `--use-angle=d3d11`); com renderização por software a fase roda ~8 FPS e engana a avaliação de ritmo.

---

## 15. Mapa de arquivos de referência

| Assunto | Arquivo |
|---|---|
| Paleta, pincel, fonte bitmap, texturas | `src/fases/fase2/porto/ArtePorto.ts` |
| Profundidade e efeitos | `src/fases/fase2/porto/EfeitosPorto.ts` |
| Cenário (céu, guindastes, navios, píer) | `src/fases/fase2/porto/CenariosPorto.ts` |
| Sprites, retratos, avatares | `src/fases/fase2/porto/SpritesPorto.ts` |
| HUD | `src/fases/fase2/porto/HudPorto.ts` |
| Máscara de fumaça | `src/fases/fase2/porto/FumacaPorto.ts` |
| Áudio | `src/fases/fase2/porto/SomPorto.ts` |
| Diálogos e falantes | `src/fases/fase2/porto/DialogosPorto.ts` |
| Ajuda (conteúdo e painel) | `src/fases/fase2/porto/AjudaConteudo.ts`, `AjudaPorto.ts` |
| Tema dos overlays DOM | `src/fases/fase2/estilos/fase2.css` |
| Interpretador de comandos | `src/fases/fase2/InterpretadorFase2.ts` |
| Estado, constantes, save | `src/fases/fase2/porto/TiposPorto.ts` |
| Base das áreas e parallax | `src/fases/fase2/ambientes/AreaBase.ts` |
