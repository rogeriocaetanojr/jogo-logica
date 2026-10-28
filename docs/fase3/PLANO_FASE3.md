# Fase 3: Lixão Eletrônico

## Conceito
Um lixão gigante de lixo eletrônico, inspirado em Wall-E. O jogador controla máquinas pelo terminal, com comandos Python básicos (um pouco além do tutorial), para limpar o caminho. No fim, derrota o Monstro de Sucata e o empurra até o contêiner de reciclagem, salvando o mundo do lixo eletrônico.

## Estrutura
- 6 áreas, uma por exercício, em cerca de 15 minutos no total.
- Áreas 1 e 2: ensolarado, sem efeito (aprendizado).
- Área 3: empoeirado, pouca visibilidade.
- Áreas 4 e 5: chuva, chão escorregadio.
- Área 6 (chefão): noite, escuro, só a luz das faíscas.
- Em cada área o jogador desvia dos perigos, chega ao ponto de exercício (que também é o checkpoint) e resolve o comando no terminal. A máquina da área muda o mapa: tira entulho, cria ponte ou abre passagem.

## Perigos
- Drones andam e atiram sucata. Dá para desviar ou derrubá-los arremessando lixo. Eles mudam com o clima (por exemplo, na chuva soltam faíscas).
- Lixo cai das pilhas, com sombra e tremor de aviso.
- Pulos e trechos em que é preciso se abaixar.
- Ao morrer, o jogador volta ao último ponto de exercício.

## Arremesso
- O mesmo controle nas áreas e no chefão: mira com o mouse, arremessa com clique.
- Carrega um item por vez. Depois de arremessar, pode pegar outro.
- A munição vem do chão e das pilhas que desabam. Cada tipo de reciclável tem animação e som próprios.

## Terminal
- Abre com E no ponto de exercício. Enquanto está aberto, drones e perigos pausam, mas o cenário segue animado.
- O enunciado do exercício aparece no próprio terminal.
- Errar não pune: só gera deboche ácido, estilo South Park.
- Só o terminal fala com o jogador. Não há narrador nem diálogo de personagens.

## Wall-E
- Aparece pelo mapa limpando e interagindo com o jogador. É imune a dano e tem papel de reciclador.

## Chefão: Monstro de Sucata
- Arena noturna. Ataques: joga sucata, solta faíscas e dá choque no chão.
- Cada reciclável que acerta tira vida e deixa o monstro mais lento.
- Com a vida zerada, o jogador empurra o monstro até o contêiner, que o compacta.
- Final: o céu limpa e o Wall-E comemora.

## HUD
- Canto superior esquerdo: vida em baterias (pilhas que vão descarregando) e ícone do item na mão.
- Canto superior direito: "ÁREA 2/6 · ENSOLARADO" com ícone do clima e o medidor "Lixão limpo: 33%", que sobe a cada exercício.
- Contextuais: "[E] Terminal" no ponto de exercício, "[Clique] Arremessar" com item na mão e aviso de checkpoint salvo.
- No chefão: barra de vida grande no topo, que vira "EMPURRE ATÉ O CONTÊINER!" quando zera.

## Visual e som
- O GUIA_DE_DESIGN (Fase 2) é só inspiração: pixel art desenhada em código, escala 4x. Cores e visual são próprios da Fase 3.
- Paleta: verde de placa de circuito e cobre no lixo, céu bege e laranja de poeira, ciano neon para LEDs, drones e tudo o que é interativo, vermelho para perigo. Na chuva e à noite tudo esfria para azul e roxo, e as luzes neon se destacam.
- Música chiptune leve que fica mais tensa conforme o clima. Bipes eletrônicos nas máquinas, "clang" metálico nos arremessos e estática no lixo caindo.

## Técnico
- HUD, som e ajuda próprios da Fase 3, em src/fases/fase3, usando a Fase 2 como referência, sem importar código dela.
- Esboço atual: src/fases/fase3/CenaFase3.ts e InterpretadorFase3.ts, já registrados no hub e na configuração.
- Arquivos compartilhados (src/compartilhado, src/nucleo, src/hub) só mudam combinando com o grupo.

## Em aberto
- Os 6 exercícios. Ficam para perto do fim do desenvolvimento.
