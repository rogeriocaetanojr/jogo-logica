# Jogo de Lógica — Mega Brain Corp.

> *Transformando momentos de tédio em aprendizado bem-humorado de programação.*

---

## Sobre o Projeto

**Jogo de Lógica** é um jogo educacional **side-scroller 2D** que ensina fundamentos de programação através de desafios de lógica gamificados. O jogador controla um personagem dentro de uma fábrica industrial controlada pelo **Mega Brain**, uma IA tirânica que testa os conhecimentos do jogador com enigmas de código real (Python).

A proposta une a estrutura de trilhas do [roadmap.sh](https://roadmap.sh) com a mecânica engajante do Duolingo e a criatividade do Scribblenauts — trocando o scroll infinito por aprendizado divertido, acessível e viciante.

> **A programação é o meio — a mecânica de jogo é o que importa.**

---

## Demo — Fase 1: O Lixão dos Scripts Esquecidos

A demo atual contém a **Fase 1 em desenvolvimento** com 4 desafios (0 a 3) implementados até o momento, cobrindo conceitos fundamentais de Python:

### Desafio 0 — Ritual do Hello World (`print`)
- O jogador inicia na **BootScene**, um terminal CRT retro que exige pressionar qualquer tecla.
- Na **MainScene**, o galpão começa em escuridão total. O Estagiário (NPC aliado) guia o jogador via sistema de diálogos até o **Painel de Energia**.
- O terminal exibe o enunciado e o jogador deve digitar `print('hello world')` para ativar a energia do galpão.
- **Conceito ensinado:** saída padrão, sintaxe de função, strings com aspas.

### Desafio 1 — O Interruptor Binário (`bool` / Booleanos)
- Após acender as luzes, uma porta de aço tranca a passagem.
- O jogador interage com o Painel de Energia e deve atribuir `energia = True` para destrancar a porta.
- **Conceito ensinado:** variáveis booleanas, atribuição, valores `True`/`False`.

### Desafio 2 — A Ponte Curta Demais (Variáveis Inteiras)
- Após um parkour com caixas metálicas, o jogador encontra uma esteira/ponte que não alcança a outra margem.
- O terminal exibe as leituras do vão e o jogador deve atribuir `tamanho_ponte = 8` (ou valor >= 8) para estender a esteira.
- Um **exaustor de ar** no fosso funciona como trampolim pneumático, evitando softlock em caso de queda.
- **Conceito ensinado:** variáveis inteiras, operador de atribuição, leitura de valores numéricos.

### Desafio 3 — A Senha da Máquina de Café (Concatenação de Strings)
- O jogador navega por contêineres empilhados e cabos elétricos caídos até encontrar um elevador industrial travado.
- O terminal apresenta dois registradores corrompidos (`parte1 = 'Mega'`, `parte2 = 'Fail'`) e exige a concatenação na ordem correta.
- O jogador deve digitar `senha = parte1 + parte2` para liberar o elevador.
- **Conceito ensinado:** concatenação de strings, ordem de operandos, uso de variáveis.

### Final da Demo
- Após descer pelo elevador, o jogador encontra um **muro de obras** com sinalização "EM OBRAS // SETOR RESTRITO", cones industriais e andaimes.
- O Estagiário aparece com um diálogo final encerrando a demonstração.

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| **Game Engine** | [Phaser](https://phaser.io/) | 4.2.x |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) | 6.0.x |
| **Bundler** | [Vite](https://vitejs.dev/) | 8.3.x |
| **Runtime** | [Node.js](https://nodejs.org/) | 22+ |
| **Física** | Arcade Physics (integrado ao Phaser) | — |

### Outras Tecnologias
- **HTML5 Canvas** — renderização do jogo via WebGL/Canvas2D
- **CSS3** — estilização do terminal de comandos e sistema de diálogos
- **ES Modules** — sistema de módulos nativo do navegador

---

## Estrutura do Projeto

```
jogo-logica/
├── index.html                  # Ponto de entrada HTML (container do jogo + terminal + diálogos)
├── package.json                # Dependências e scripts npm
├── tsconfig.json               # Configuração do TypeScript
├── src/
│   ├── main.ts                 # Bootstrap do Phaser Game
│   ├── config.ts               # Configuração do Phaser (resolução, física, cenas)
│   ├── style.css               # Estilos globais
│   ├── scenes/
│   │   ├── BootScene.ts        # Tela de boot CRT retro (intro do terminal)
│   │   └── MainScene.ts        # Cena principal — level design, física, totens, puzzles
│   ├── styles/
│   │   ├── terminal.css        # Estilização do terminal de comandos in-game
│   │   └── dialog.css          # Estilização do sistema de diálogos do Estagiário
│   └── utils/
│       ├── CommandParser.ts    # Parser de comandos Python — validação dos desafios
│       └── DialogueSystem.ts   # Sistema de diálogos sequenciais com typewriter effect
└── dist/                       # Build de produção (gerado pelo Vite)
```

---

## Como Rodar

### Pré-requisitos
- **Node.js** v22 ou superior
- **npm** v10 ou superior

### Instalação

```bash
# Clone o repositório
git clone https://github.com/rogeriocaetanojr/jogo-logica.git
cd jogo-logica

# Instale as dependências
npm install
```

### Servidor de Desenvolvimento

```bash
npm run dev
```

O jogo estará acessível em `http://localhost:5173` (ou a porta indicada pelo Vite).

### Build de Produção

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

### Preview do Build

```bash
npm run preview
```

---

## Controles

| Ação | Tecla |
|---|---|
| Mover para a esquerda | `A` ou `Seta Esquerda` |
| Mover para a direita | `D` ou `Seta Direita` |
| Pular | `W` ou `Espaço` |
| Interagir com totem | `E` |
| Fechar terminal | `Esc` |
| Avançar diálogo | `Espaço` ou `Enter` |

---

## Arquitetura do Jogo

```
BootScene (Tela CRT) ──> MainScene (Fase 1)
                              │
                              ├── Sistema de Escuridão + Lanterna
                              ├── Totens Interativos (3 totens)
                              ├── Terminal de Comandos (HTML overlay)
                              ├── CommandParser (validação Python)
                              ├── DialogueSystem (NPC Estagiário)
                              ├── Exaustor de Ar (anti-softlock)
                              ├── Elevador Industrial (tween + física)
                              └── Muro de Obras (encerramento da demo)
```

### Fluxo de um Desafio
1. O jogador explora o cenário side-scroller com parkour entre plataformas.
2. Encontra um **totem interativo** com prompt `[E]`.
3. Ao pressionar `E`, o **terminal de comandos** abre como overlay HTML.
4. O terminal exibe o enunciado do Mega Brain com as variáveis do contexto.
5. O jogador digita um **comando Python válido** no input.
6. O `CommandParser` valida a sintaxe e a lógica do comando.
7. Em caso de **erro**, o Mega Brain responde com deboche randômico (sem repetição consecutiva).
8. Em caso de **acerto**, o terminal fecha e o cenário reage (ponte estende, porta abre, elevador desce, etc.).

---

## Personagens

| Personagem | Papel | Descrição |
|---|---|---|
| **Mega Brain** | Antagonista | IA tirânica que controla a fábrica. Zomba do jogador a cada erro com mensagens randômicas. |
| **Estagiário** | NPC Aliado | Guia rebelde que ajuda o jogador via sistema de diálogos, explicando os objetivos. |
| **Jogador** | Protagonista | Personagem controlável que resolve os desafios de programação para avançar. |

---

## Roadmap

- [/] **Fase 1 — Em Desenvolvimento** (Desafios 0 a 3 implementados)
  - [x] BootScene com efeito CRT
  - [x] Sistema de escuridão + lanterna
  - [x] Desafio 0: `print('hello world')`
  - [x] Desafio 1: Booleanos (`energia = True`)
  - [x] Desafio 2: Variáveis inteiras (`tamanho_ponte = 8`)
  - [x] Desafio 3: Concatenação de strings (`senha = parte1 + parte2`)
  - [x] Exaustor anti-softlock
  - [x] Elevador industrial com física dinâmica
  - [x] Muro de obras com diálogo final
  - [x] Mensagens de erro randômicas do Mega Brain (sem repetição consecutiva)
- [ ] **Fase 2** — Novos conceitos (condicionais, loops)
- [ ] **Sistema de HUB** — Seleção de níveis estilo Mario/Mega Man
- [ ] **Trilha sonora** — Música tematizada por mundo
- [ ] **Skill Tree** — Árvore de habilidades por personagem
- [ ] **Monetização** — Sistema de moedas e recompensas in-game

---

## Inspirações

- [roadmap.sh](https://roadmap.sh) — estrutura de trilhas de aprendizado
- **Duolingo** — mecânica de aprendizado gamificado
- **Scribblenauts** — criatividade e leveza
- **Mega Man / Mario** — design de níveis e HUB
- **Far Cry** — sistema de skill tree
- **Beat 'em ups** — progressão side-scroller

---

## Equipe

- Davi Pinheiro
- João Ferrari
- Jonathan Freire
- Leonardo Kusma
- Rogério Caetano

---

## Licença

Projeto acadêmico desenvolvido para a disciplina de **Desenvolvimento de Jogos — 8º Período**.
