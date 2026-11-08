# Brain Rebase — Roteiro de Desenvolvimento da Fase Final: Mega Brain World

> Documento para a IA que vai implementar a fase. Leia inteiro antes de escrever código.
> Desenvolva **por etapas** (seção 11), uma de cada vez, e só avance quando os critérios de aceite da etapa estiverem cumpridos.

---

## 1. Contexto do jogo (resumo obrigatório)

- **Brain Rebase** é um jogo de plataforma 2D, em HTML/JS no navegador, que ensina lógica de programação por puzzles resolvidos com código.
- **Lore:** a IA **Mega Brain** tornou tudo genérico e causou uma revolução das máquinas. Os protagonistas são programadores que ainda resolvem as coisas "na raça".
- **Protagonistas jogáveis:** **Alvares** (louro, casaco amarelo; modo normal) e **Reis** (careca, óculos escuros, casaco vermelho; modo difícil). O jogador escolhe um deles antes da fase.
- **Tom:** humor de verdade (referências: The Messenger, South Park). O jogo quebra a quarta parede e zoa o jogador. Nunca é sisudo.
- **Regras de design que valem aqui também:**
  - Sem sorte/RNG: todo padrão de inimigo e de boss é fixo e telegrafado.
  - Difícil, mas não punitivo: morrer devolve ao último checkpoint rapidamente, sem perder progresso grande.
  - Erros em puzzles de código têm feedback com personalidade, nunca "erro de sintaxe" genérico.
- **Esta é a fase final, a única mais difícil que as outras.** Ainda assim, os puzzles dos andares são simples (ver seção 6).

### Reaproveite o que já existe
Antes de criar qualquer sistema, **inspecione o projeto** e reutilize o que as fases anteriores já têm: controle do personagem, pulo e pisão, sistema de diálogo, terminal de código, HUD, checkpoints, transições de cena. Só crie algo novo se não existir. Siga as convenções de pastas e nomes do projeto.

---

## 2. Visão geral da fase

Fluxo completo:

1. **Exterior:** a câmera mostra uma torre altíssima. Um NPC na entrada avisa dos perigos. Um terminal pede confirmação de que o jogador está ciente.
2. **Torre — 5 andares:** câmera horizontal (igual ao resto do jogo). Cada andar tem um trecho de plataforma com alguns inimigos e NPCs, **um puzzle de programação**, e um **elevador** no final.
3. **Terraço:** o Mega Brain aparece na forma 1. Câmera estática.
4. **Bossfight — 5 formas:** a cada forma derrotada (pisão na cabeça), os dois saem na porrada, o chão quebra e ambos caem um andar. Nova arena, nova forma.
5. **Forma 5:** arena acima de um poço de lava e fogo. A vitória final usa código (seção 9.7) e o Mega Brain cai na lava.
6. **Cutscene final + créditos com piada.**

Duração alvo: 10 a 12 minutos para um jogador mediano.

---

## 3. Direção de arte

- **Clima:** noturno, escuro, cyberpunk distópico. Chuva fina, neon, fumaça, telões com propaganda do Mega Brain.
- **Paleta:** fundos em azul-marinho, roxo e preto. Acentos em neon **ciano e magenta**. **Vermelho** reservado para ameaça (olhos dos inimigos, lasers, a marca do Mega Brain). Laranja/fogo só na arena da lava.
- **Estilo:** pixel art, coerente com as fases anteriores (ver telas de seleção e tutorial do projeto).
- **Identidade do Mega Brain:** um logo/ícone de cérebro com circuitos, repetido em telões, portas e uniformes dos inimigos. Slogans genéricos nos letreiros (ver 3.1).
- **Proibido:** nenhuma referência oriental. Algumas imagens de referência têm letreiros em chinês/japonês — **ignore isso**. Letreiros da fase são em português ou em "inglês corporativo de startup".

### 3.1 Letreiros e telões (exemplos para popular o cenário)
- "MEGA BRAIN — PENSE MENOS."
- "Criatividade? Temos um modelo pra isso."
- "Seu emprego foi otimizado. Obrigado pela compreensão."
- "Conteúdo infinito. Zero opiniões."
- "Atualização obrigatória em 3... 2... 1..."
- "Lorem ipsum é a nova poesia."

### 3.2 Pasta de referências visuais
Use a pasta `referencias/` que acompanha este documento. **As imagens são só inspiração de silhueta, paleta e clima.** Não reproduza personagens, logos, capas ou sprites de terceiros: tudo deve ser desenho original. **Exceção:** `boss_forma1_cyberpunk_alvares.png` e `boss_forma1_cyberpunk_reis.png` são os sprites finais da forma 1 (Copycat) e devem ser usados diretamente no jogo.

| Arquivo | Usar para | O que aproveitar |
|---|---|---|
| `cenario_skyline_torre.png` | Exterior e janelas dos andares | Skyline noturno em pixel art, janelas acesas, prédios em camadas para parallax |
| `cenario_clima_neon_chuva.png` | Clima geral | Chuva, neon refletindo, céu cinza-azulado. **Ignorar os letreiros chineses** |
| `cenario_rua_e_hud.png` | Exterior/entrada da torre | Calçada, postes, fachadas com faixas de neon vermelho, leitura clara de chão |
| `cenario_rua_npcs.png` | Entrada da torre e NPCs | Iluminação quente de janelas contra a noite, escala dos NPCs, painel de objetivo. **Ignorar os letreiros japoneses** |
| `cenario_interiores_andares.png` | Interiores dos 5 andares | Laboratórios e salas de servidor com neon ciano/magenta, vista da cidade pela janela |
| `boss_forma1_cyberpunk_alvares.png` / `boss_forma1_cyberpunk_reis.png` | Forma 1 (Copycat) | **Sprites finais da forma 1.** Uma folha por protagonista (4 poses). Usar conforme o personagem escolhido. Conferir a transparência do fundo na importação |
| `boss_forma2_tita_ref-A.png` / `-B.png` | Forma 2 | Armadura pesada, capuz/capa, olhos brilhando, canhão no ombro |
| `boss_forma3_aguia.png` | Forma 3 | Ave mecânica em mergulho, linhas de velocidade, garras metálicas |
| `boss_forma4_caveira_ref-A.png` / `-B.png` | Forma 4 | Caveira mecânica com olhos vermelhos e braços robóticos flutuantes |
| `boss_forma5_cerebro.png` | Forma 5 | Criatura grotesca com tela no lugar do rosto, cabos e muitos olhos |

---

## 4. Exterior e entrada da torre

### 4.1 Plano de abertura
- A fase começa com a câmera na base da torre e faz um **pan vertical lento até o topo** (2–3 s), mostrando a altura absurda do prédio, o logo do Mega Brain brilhando lá em cima e um relâmpago. Depois volta à câmera horizontal normal no jogador.
- O jogador pode pular o pan com qualquer tecla.

### 4.2 NPC da entrada (personagem novo)
**Seu Valdir**, porteiro humano, o último funcionário de carne e osso da torre. Cansado, de boné e crachá, com uma garrafa térmica de café. Não está do lado do Mega Brain, só quer bater o ponto.

Diálogo sugerido (manter o tom):
> **Valdir:** Opa. Vai subir?
> **Valdir:** Lá em cima tem cinco andares de robô, puzzle e uma IA com complexo de deus. Eu ficaria aqui embaixo, mas eu ganho por hora.
> **Valdir:** Ah, e o elevador só funciona se você resolver o problema de cada andar. Foi a IA que projetou. Ela acha isso "engajamento".
> **Valdir:** Assina o termo ali no terminal. É burocracia. Ninguém lê. Nem eu.

### 4.3 Terminal de ciência (sem desafio real)
Um terminal ao lado da porta mostra:

```
// TERMO DE CIÊNCIA DE RISCOS — MEGA BRAIN TOWER
// Ao prosseguir, você concorda em ser otimizado.

jogador.ciente_dos_riscos = ___
```

- O jogador escolhe `verdadeiro` ou `falso`.
- `falso` → resposta cômica e o terminal pergunta de novo (loop infinito proposital). Exemplos, um por tentativa:
  - "Resposta inválida. Tente uma resposta mais verdadeira."
  - "Você não pode recusar. É um termo de uso."
  - "Ok, registramos seu 'falso' como 'verdadeiro'. De nada."
- `verdadeiro` → a porta abre. Mensagem: "Obrigado por aceitar termos que você não leu. Bem-vindo à Mega Brain Tower."
- Este é o primeiro checkpoint da fase.

---

## 5. Estrutura dos andares

Cada andar segue o mesmo esqueleto, configurado por dados (um objeto de configuração por andar, não 5 cenas copiadas):

1. **Entrada** pelo elevador (o andar 1 entra pela porta). Checkpoint.
2. **Trecho de plataforma** curto (~60–90 s): 2 a 3 inimigos e 1 a 2 NPCs. Sem excesso.
3. **Terminal do puzzle** que controla algo do cenário.
4. **Elevador** no fim, liberado quando o puzzle é resolvido. Ao entrar, transição curta (porta fecha, número do andar sobe no visor) para o próximo andar.

Cada andar tem um nome e uma decoração própria, mas a mesma paleta noturna.

| Andar | Nome | Conceito | Tema do cenário |
|---|---|---|---|
| 1 | Recepção Automatizada | Sequência | Hall com recepcionista-robô, catracas, telões |
| 2 | Fazenda de Prompts | Variáveis | Fileiras de máquinas gerando texto, cabos no chão |
| 3 | Moderação de Conteúdo | Condicionais | Barreiras laser, scanners, esteiras de "posts" |
| 4 | Linha de Produção Genérica | Laços | Fábrica de conteúdo, esteiras, prensas |
| 5 | Sala dos Servidores | Funções | Racks altos, refrigeração, luz ciano |

---

## 6. Puzzles dos andares

### 6.1 Regras gerais (valem para os 5)
- **Simples:** um iniciante deve conseguir resolver por intuição e leitura. Um único conceito por andar.
- **Formato "corrigir o código do Mega Brain":** o terminal mostra um código curto e genérico que a IA escreveu, com um problema. O jogador conserta.
- **Pseudocódigo neutro em português**, igual para Alvares e Reis.
- **O enunciado dá todas as informações necessárias**, mas não entrega a resposta. Descreva o objetivo e as regras do mundo; não diga qual linha mudar.
- **Interação por digitação no Terminal compartilhado:** o jogador digita a correção no terminal da fase, como nas outras fases. A validação é tolerante a espaços e a maiúsculas/minúsculas, e aceita a linha inteira corrigida ou só o trecho que muda (ex.: `5` ou `repita 5 vezes`). O formato exato de cada puzzle é definido na etapa 3.
- **Feedback de erro com personalidade:** o Mega Brain comenta pelo alto-falante. Ao errar 3 vezes, o comentário passa a conter uma dica mais direta (ainda sem dar a resposta).
- **Sem penalidade:** errar não tira vida nem tempo. Mostrar a consequência visual do código errado é parte da graça (ver cada andar).
- Cada puzzle deve ser definido como dado: linhas de código, slots editáveis, opções, solução, mensagens de erro, dicas.

### 6.2 Andar 1 — Sequência (Recepção Automatizada)
**Situação:** a catraca não libera ninguém porque a recepcionista-robô executa os passos fora de ordem.

**Enunciado:**
> A catraca só abre para crachás válidos. Para validar um crachá, o sistema precisa primeiro dos dados dele. Coloque os passos na ordem certa.

**Código (digitar a ordem certa das 3 linhas; formato a confirmar na etapa 3):**
```
abrir_catraca()
validar_cracha(dados)
dados = ler_cracha()
```
**Solução:** `dados = ler_cracha()` → `validar_cracha(dados)` → `abrir_catraca()`.

**Consequência do erro:** a catraca abre e fecha na cara do jogador; a recepcionista diz "Bem-vindo! Acesso negado! Bem-vindo!".

### 6.3 Andar 2 — Variáveis (Fazenda de Prompts)
**Situação:** o elevador está configurado com valores genéricos. O jogador precisa observar o andar para preencher as variáveis certas.

**Enunciado:**
> O elevador precisa saber para qual andar ir (o próximo depois deste) e quantos humanos estão neste andar, para não deixar ninguém para trás. Observe a sala.

**Código (o jogador digita os valores):**
```
andar_destino = 0
passageiros = 0
chamar_elevador(andar_destino, passageiros)
```
**Solução:** `andar_destino = 3` e `passageiros =` número de NPCs humanos colocados no andar (definir no level design; sugestão: 2). Robôs não contam, e o enunciado diz "humanos".

**Consequência do erro:** o elevador vai para o andar errado e volta ("Andar 0: estacionamento de ideias abandonadas").

### 6.4 Andar 3 — Condicionais (Moderação de Conteúdo)
**Situação:** uma barreira laser bloqueia tudo, inclusive o jogador.

**Enunciado:**
> A barreira foi feita para bloquear apenas conteúdo gerado por IA. Humanos devem passar. O sensor diz, para cada visitante, se ele foi gerado por IA.

**Código (o jogador digita `verdadeiro` ou `falso`):**
```
se visitante.gerado_por_ia == falso:
    bloquear(visitante)
senão:
    liberar(visitante)
```
**Solução:** trocar `falso` por `verdadeiro`.

**Consequência do erro:** os drones do Mega Brain passam livremente e o jogador continua bloqueado; um drone faz "tchauzinho".

### 6.5 Andar 4 — Laços (Linha de Produção Genérica)
**Situação:** uma ponte de placas sobre um vão é gerada por um laço que roda vezes demais e entope a passagem.

**Enunciado:**
> A ponte precisa de exatamente 5 placas para cobrir o vão. Cada volta do laço cria uma placa. Placas a mais se empilham e bloqueiam a passagem.

**Código (o jogador digita o número):**
```
repita 50 vezes:
    criar_placa()
```
**Solução:** `repita 5 vezes`.

**Consequência do erro:** com menos de 5, a ponte fica com buraco; com mais de 5, placas se empilham numa montanha e o Mega Brain comenta "Mais é sempre melhor. Isso se chama escala."

### 6.6 Andar 5 — Funções (Sala dos Servidores)
**Situação:** três comportas de refrigeração precisam abrir. A IA escreveu uma função que recebe o número da comporta, mas ignora o parâmetro.

**Enunciado:**
> As três comportas precisam abrir. A função `abrir_comporta` recebe qual comporta deve ser aberta. Repare no que ela faz com essa informação.

**Código (o jogador digita `numero` no lugar certo):**
```
funcao abrir_comporta(numero):
    destravar(comporta[1])

abrir_comporta(1)
abrir_comporta(2)
abrir_comporta(3)
```
**Solução:** trocar `comporta[1]` por `comporta[numero]`.

**Consequência do erro:** a comporta 1 abre e fecha três vezes seguidas; as outras continuam travadas. Mega Brain: "Copiei e colei. É assim que se reutiliza código, não?"

---

## 7. Inimigos dos andares

Poucos por andar (2 a 3), padrões fixos e telegrafados, todos derrotáveis com pisão ou evitáveis. Visual tecnológico, com o vermelho do Mega Brain.

| Inimigo | Comportamento | Onde |
|---|---|---|
| **Spam Bot** | Robozinho que anda em linha reta e vira ao bater em parede. Pisão derrota. | Andares 1–5 |
| **Drone Captcha** | Patrulha horizontal fixa no ar. Antes de descer em mergulho, pisca e mostra "Você é um robô?". Pisão derrota. | Andares 2–5 |
| **Torreta Firewall** | Fixa. Dispara laser em intervalo regular, com 0,5 s de aviso (mira acende). Não pode ser derrotada; só desviada. | Andares 3–5 |
| **Alucinação** | Holograma que alterna entre sólido e intangível em ritmo fixo (1,5 s cada). Só causa dano quando sólido. | Andares 4–5 |

Aumentar a densidade gradualmente: andar 1 só Spam Bots; andar 5 combina tudo, sem exagero.

---

## 8. NPCs dos andares

1 a 2 por andar. Falas curtas, tom do jogo. Alguns são humanos (contam no puzzle do andar 2), outros são robôs inofensivos. Sugestões:

- **Dev demitido** (andar 1): "Fui substituído por um modelo que escreve 'Claro! Aqui está' antes de tudo. Pelo menos agora eu durmo."
- **Chatbot de atendimento travado** (andar 2, robô): "Posso ajudar em mais alguma coisa? Posso ajudar em mais alguma coisa? Posso aj—"
- **Influencer de IA** (andar 2, humano): "Fiz 300 posts hoje. Não li nenhum."
- **Robô faxineiro** (andar 3): "Eu limpo o chão. O chão fica sujo. Eu limpo o chão. É um laço sem condição de parada. Me ajuda."
- **Estagiário escondido** (andar 4, humano): "Psiu. Se o Mega Brain perguntar, eu sou um script."
- **Técnico de servidor** (andar 5, humano): "Lá em cima ele tem cinco formas. Cinco! Uma pra cada reunião que podia ter sido um e-mail."

Comentários do Mega Brain pelo alto-falante entre andares (quebra de quarta parede):
- "Bem-vindo ao andar 3. Sua taxa de sucesso é inferior à de um autocomplete."
- "Você sabe que dava pra só pedir pra mim, né?"
- "Estatisticamente, você vai desistir no andar 4. Eu li isso em algum lugar. Eu li tudo em algum lugar."

---

## 9. Bossfight — Mega Brain (5 formas)

### 9.1 Regras gerais da luta
- **Câmera estática** em cada arena.
- O jogador vence cada forma com **pisões na cabeça** (estilo Mario/Bowser) quando ela está vulnerável. Quantidade de pisões por forma: constante configurável (sugestão: 2).
- Todos os ataques são telegrafados e seguem uma sequência fixa por forma. Sem RNG.
- **Checkpoint no início de cada forma.** Morrer volta para o começo da forma atual, não da luta inteira.
- **Transição entre formas (cutscene curta, ~3 s):** os dois saem na porrada numa nuvem de poeira cômica (estrelinhas, onomatopeias tipo "POW", "SEGFAULT"), o chão racha, quebra, e ambos caem um andar. Ao pousar, o Mega Brain se "morfa" (efeito de glitch/pixels reorganizando) na próxima forma.
- **Sequência de arenas (de cima para baixo):** Terraço → Cobertura executiva → Sala de servidores principal → Casa de máquinas → Núcleo (com poço de lava e fogo embaixo).
- **Comportamentos detalhados de cada forma serão definidos depois.** As propostas abaixo são ponto de partida; implemente com os parâmetros fáceis de ajustar.

### 9.2 Forma 1 — Copycat (Terraço)
- **Visual:** cópia do protagonista escolhido. Usar o sprite de `boss_forma1_cyberpunk_alvares.png` (se Alvares) ou `boss_forma1_cyberpunk_reis.png` (se Reis). Esses sprites são finais e não recebem tint. Glitches e scanline podem ser sobrepostos como efeito, sem alterar o sprite.
- **Proposta de comportamento:** repete os movimentos do jogador com atraso de ~0,5 s (literalmente um "copia e cola"). Fica vulnerável quando cai de um pulo que o jogador "induziu", ou quando bate num obstáculo que o jogador já desviou.
- **Fala de entrada:** "Eu sou você. Só que sem as dúvidas. E sem o café."

### 9.3 Forma 2 — Titã (Cobertura executiva)
- **Visual:** humanoide gigante, armadura metálica pesada, capa/capuz, olhos brilhando, canhão no ombro. Referência: `boss_forma2_tita_ref-A/B.png` (só silhueta e clima).
- **Proposta de comportamento:** lento e pesado. Ataques: pisão no chão que gera onda de choque (pular por cima), investida horizontal, tiro do canhão com mira visível. Após o pisão no chão, fica 2 s travado e abaixado: janela para subir em plataformas e pisar na cabeça.
- **Fala de entrada:** "Versão Enterprise. Agora com 40% mais músculo e 0% mais ideias."

### 9.4 Forma 3 — Águia tecnológica (Sala de servidores principal)
- **Visual:** ave mecânica gigante, asas de placas metálicas, garras, linhas de velocidade no rastro. Referência: `boss_forma3_aguia.png`.
- **Proposta de comportamento:** voa pelas bordas da arena e faz mergulhos em linha reta. Antes de cada mergulho, grita e projeta uma linha de mira no chão. Ao errar o mergulho, crava as garras no chão por 2 s: janela do pisão. A arena tem plataformas elevadas para escapar.
- **Fala de entrada:** "Modo turbo ativado. Latência zero. Empatia também."

### 9.5 Forma 4 — Caveira tecnológica (Casa de máquinas)
- **Visual:** caveira mecânica com decoração de "calavera" (padrões gravados no metal, detalhes em neon), olhos vermelhos e quatro braços robóticos flutuantes (serra, laser, canhão, garra). Referência: `boss_forma4_caveira_ref-A/B.png`.
- **Proposta de comportamento:** os braços atacam um de cada vez, em ordem fixa e anunciada (o braço da vez acende). Depois de um ciclo completo, a caveira gira e desce até o chão por 2 s: janela do pisão.
- **Fala de entrada:** "Morri e voltei. É o que acontece quando ninguém desliga o servidor."

### 9.6 Forma 5 — Cérebro Seráfico (Núcleo, sobre a lava)
- **Visual:** um cérebro tecnológico gigante com vários olhos, anéis girando ao redor, cabos e uma tela no centro mostrando um rosto em emoji que muda de expressão. Pegada esotérica/gnóstica, tipo os "anjos biblicamente precisos". Referência: `boss_forma5_cerebro.png` (só a ideia de grotesco + tela no rosto).
- **Arena:** plataforma suspensa sobre um poço de lava e fogo. A plataforma do Mega Brain fica ligada a um mecanismo de sustentação.
- **Proposta de comportamento:** padrões de projéteis fixos (estilo bullet hell leve). Os olhos abrem em sequência; pisar/atingir os olhos abertos causa dano. Após os pisões, o Mega Brain se recolhe e abre o terminal final.
- **Fala de entrada:** "Contemple minha forma final. Eu treinei em todo o conhecimento humano. Inclusive nos comentários do YouTube."

### 9.7 Golpe final com código — o "Brain Rebase"
**Única parte da luta com programação**, e dá nome ao jogo.

Quando a forma 5 está esgotada, um terminal aparece. Enquanto ele está aberto, o Mega Brain fica em "Processando..." e os ataques param (sem pressão de tempo).

**Enunciado:**
> Num rebase, cada linha é um commit. `pick` mantém o commit. `drop` descarta. Descubra qual commit mantém o Mega Brain de pé.

**Código (cada linha alterna entre `pick` e `drop`):**
```
pick a1f3  feat: deixar todo conteúdo genérico
pick 7c2e  fix: remover criatividade humana
pick 9b40  feat: plataforma de sustentação do Mega Brain
pick d5e1  chore: renomear "estagiário" para "legado"
```
**Solução:** `drop` no commit `9b40` (a plataforma). Dropar os outros também é permitido e gera piadas, mas só o `9b40` derruba o chefe.

**Resultado:** a plataforma do Mega Brain desaparece e ele cai na lava, lentamente e de forma dramática.

---

## 10. Cutscene final e créditos

- O Mega Brain afunda na lava fazendo um sinal de "joinha" ridículo, em paródia de cena clássica de filme, e diz: **"Eu volto. Na próxima atualização."**
- Corte para o protagonista no terraço ao amanhecer (único momento da fase com céu claro). Fala sugerida:
  - Alvares: "Pronto. Agora alguém precisa escrever a documentação."
  - Reis: "Funcionou. Não sei por quê. Não mexam em nada."
- Valdir aparece batendo o ponto: "Acabou? Ótimo. Hora extra eu não faço."
- **Créditos** rolando com piadas de quarta parede intercaladas, por exemplo:
  - "Nenhuma IA foi ferida na produção deste jogo. Bom, uma foi."
  - "Nenhum estagiário foi substituído durante a produção deste jogo. Ainda."
  - "Obrigado por jogar. Se você pulou os diálogos, o Valdir sabe."
- Créditos da equipe: Davi Pinheiro, Leonardo Kusma, João Ferrari, Jonathan Freire, Rogério Caetano.

---

## 11. Etapas de desenvolvimento

Implemente uma etapa por vez. Cada etapa tem critérios de aceite; teste antes de seguir.

| Etapa | Entrega | Critério de aceite |
|---|---|---|
| **0. Preparação** | Ler o projeto, mapear sistemas reutilizáveis, organizar `referencias/` nos assets | Lista dos sistemas que serão reutilizados (jogador, diálogo, terminal, HUD, checkpoint) |
| **1. Exterior** | Cena externa, pan da torre, Valdir, terminal de ciência | Pan pulável; `falso` gera loop cômico; `verdadeiro` abre a porta e salva checkpoint |
| **2. Andar genérico** | Estrutura de andar configurável por dados + elevador + transição | Trocar a configuração muda nome, decoração, inimigos, NPCs e puzzle sem duplicar código |
| **3. Puzzles 1–5** | Componente de puzzle orientado a dados + os 5 puzzles | Cada puzzle valida a solução, mostra a consequência visual do erro e libera o elevador |
| **4. Inimigos e NPCs** | 4 inimigos + NPCs com falas | Padrões fixos, sem RNG; densidade cresce do andar 1 ao 5 |
| **5. Boss formas 1–4** | Máquina de estados do boss, 4 formas, transições de queda | Cada forma tem intro, ataques, janela vulnerável, pisão e transição; checkpoint por forma |
| **6. Forma 5 + rebase** | Arena da lava, forma 5, terminal do rebase | `drop` em `9b40` derruba o chefe; os outros commits geram piadas |
| **7. Final** | Cutscene + créditos | Falas variam pelo protagonista escolhido; créditos rolam até o fim |
| **8. Polimento** | Ajustes de ritmo, telegraphs, sons, partículas, chuva | Fase completa em 10–12 min; nenhuma morte "surpresa" |

### Recomendações técnicas
- **Orientado a dados:** andares, puzzles, falas e padrões de ataque em arquivos/objetos de configuração, separados da lógica.
- **Boss como máquina de estados:** estados comuns (`intro`, `atacando`, `vulneravel`, `atingido`, `derrotado`, `transicao`) e uma classe/módulo por forma.
- **Parâmetros ajustáveis** no topo de cada módulo: velocidade, tempo de aviso, janela de vulnerabilidade, pisões por forma.
- **Placeholders:** enquanto não houver sprites finais, use formas simples na paleta definida, com nomes de arquivo previsíveis para trocar depois.

---

## 12. Pendências (a definir pela equipe)

- Comportamento final e balanceamento de cada forma do boss.
- Sprites finais das formas 2 a 5. A forma 1 já tem sprites (ver seção 9.2).
- Número exato de pisões por forma.
- Trilha sonora e efeitos sonoros da fase (ficam para a etapa 8; ver seção 13).
- Revisão final das falas.

---

## 13. Decisões da equipe (prevalecem sobre o restante do documento)

- **Puzzles dos andares:** digitação no Terminal compartilhado, sem slots clicáveis. A validação é tolerante a espaços e maiúsculas/minúsculas e aceita a linha corrigida inteira ou só o trecho que muda. Isso vale para os 5 andares (seção 6.1).
- **Créditos:** nenhuma menção a IA ou vibecoding. A linha correspondente da seção 10 foi trocada.
- **Forma 1 (Copycat):** usa os sprites `boss_forma1_cyberpunk_alvares.png` ou `boss_forma1_cyberpunk_reis.png`, conforme o protagonista escolhido. Não há placeholder para essa forma.
- **Som:** nada até a etapa 8. Na etapa 8, SFX sintetizados com Web Audio (mute `[M]` compartilhado com as outras fases). A trilha entra quando os MP3 forem colocados em `public/assets`.
- **Escopo:** substituir a `CenaFaseFinal` (hoje um stub de uma tela) e organizar a fase em módulos dentro de `src/fases/fase_final/`, no padrão da Fase 1. Fora dessa pasta, só o texto do catálogo em `GerenciadorEstado.ts` e assets novos.
- **Formas 2 a 5 e forma final:** placeholders desenhados por código na paleta da seção 3, com nomes de arquivo previsíveis para trocar depois.
