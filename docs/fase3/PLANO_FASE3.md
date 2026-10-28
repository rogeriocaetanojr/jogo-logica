# Fase 3: Lixão Eletrônico

## Conceito
Um lixão gigante de lixo eletrônico, inspirado em Wall-E. O jogador controla máquinas pelo terminal, com comandos Python básicos (um pouco além do tutorial), para limpar o caminho. No fim, derrota o Monstro de Sucata e o empurra até o contêiner de reciclagem, salvando o mundo do lixo eletrônico.

## Estrutura
- Um mapa único e contínuo com 6 áreas em sequência, uma por exercício, em cerca de 15 minutos no total. O jogador anda direto de uma área para a outra, e o clima muda em transição suave.
- Áreas 1 e 2: ensolarado, sem efeito (aprendizado).
- Área 3: empoeirado, pouca visibilidade.
- Áreas 4 e 5: chuva, chão escorregadio.
- Área 6 (chefão): noite, escuro, só a luz das faíscas.
- Em cada área o jogador desvia dos perigos, chega ao ponto de exercício (que também é o checkpoint) e resolve o comando no terminal. A máquina da área muda o mapa: tira entulho, cria ponte ou abre passagem.

## Perigos
- Drones andam e atiram sucata. Dá para desviar ou derrubá-los arremessando lixo. Eles mudam com o clima (por exemplo, na chuva soltam faíscas).
- Lixo cai das pilhas, com sombra e tremor de aviso.
- Pulos e trechos em que é preciso se abaixar. Abaixado (S ou seta para baixo), o jogador anda mais devagar, não pula e só levanta se houver espaço acima. Como os personagens não têm quadro de abaixar, o sprite é achatado pelos pés.
- Parâmetros de movimento ficam em `MOVIMENTO_LIXAO` (lixao/JogadorLixao.ts). Cada jogador tem uma cópia em `parametros` para o clima alterar, por exemplo a frenagem na chuva.
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

## Paleta
Tokens do objeto `COR` em `src/fases/fase3/lixao/ArteLixao.ts`. Nenhum hexadecimal da fase fica fora dele.

Regras:
- Pixel art desenhada em código, resolução de arte 320x180 ampliada 4x, posições arredondadas para a grade.
- Ciano só no que é interativo (terminal, saída, drones). Vermelho só no que é perigo.
- Na chuva e à noite, pilhas, chão e decoração recebem uma tinta fria. O que é ciano nunca é tingido e fica acima da escuridão.

| Token | Hex | Uso |
|---|---|---|
| `verdePlaca` | #1F5C3A | Lâminas de placa de circuito |
| `verdePlacaClaro` | #3E8E5A | Borda iluminada das placas |
| `verdePlacaEscuro` | #12361F | Monte por baixo das placas |
| `cobre` | #B8733A | Trilhas e fios de cobre |
| `cobreClaro` | #D9965A | Pontas desencapadas, ilhas de solda |
| `cobreEscuro` | #7A4A26 | Ferrugem, engrenagens, trilhas no chão |
| `sucataClara` | #6E6058 | Carcaças de monitor, chapas, borda do chão |
| `sucata` | #4A3F38 | Metal em geral, corpo do chão |
| `sombraSucata` | #2B2420 | Telas apagadas, monte de cabos, chão fundo |
| `contorno` | #17120F | Contornos, cabos pretos, fundo do texto |
| `ceuPoeiraClaro` | #F2D2A8 | Topo do céu ensolarado, sol, lua, nuvens claras |
| `ceuPoeira` | #E8B887 | Meio do céu de poeira, partículas de pó |
| `horizonte` | #D98A4E | Base do céu, névoa da tempestade de pó |
| `horizonteEscuro` | #A8623A | Montanhas distantes no tempo seco |
| `chuvaAzulClaro` | #4E6596 | Base do céu de chuva |
| `chuvaAzul` | #2B3F6B | Céu e nuvens de chuva |
| `noiteRoxo` | #2A1F4A | Céu noturno, montanhas na chuva |
| `noiteRoxoEscuro` | #160F2A | Topo do céu noturno, véu de escuridão |
| `tintaPo` | #E8C49A | Tinta do cenário na área 3 |
| `tintaChuva` | #9AA8CC | Tinta do cenário nas áreas 4 e 5, gotas de chuva |
| `tintaNoite` | #6E62A0 | Tinta do cenário na área 6 |
| `neonCiano` | #3FE8E0 | LED e tela do terminal, seta da saída, textos interativos |
| `neonCianoEscuro` | #1E8F8C | Fundo da tela do terminal, LED apagado, placa da saída |
| `perigo` | #E0413A | Só perigos: tiros, faíscas, lixo caindo |
| `luz` | #FFFFFF | Base branca de partículas e brilhos que recebem tinta |

Cenário por área (céu fixo, nuvens 0.1, horizonte 0.25, pilhas 0.55, chão 1.0):

| Área | Céu | Astro | Tinta |
|---|---|---|---|
| 1 e 2 | ceuPoeiraClaro, ceuPoeira, horizonte | sol | nenhuma |
| 3 | ceuPoeira, horizonte, horizonteEscuro | nenhum | tintaPo |
| 4 | chuvaAzul, chuvaAzulClaro | nenhum | tintaChuva |
| 5 | noiteRoxo, chuvaAzul, chuvaAzulClaro | nenhum | tintaChuva |
| 6 | noiteRoxoEscuro, noiteRoxo | lua | tintaNoite |

## Técnico
- HUD, som e ajuda próprios da Fase 3, em src/fases/fase3, usando a Fase 2 como referência, sem importar código dela.
- Esboço atual: src/fases/fase3/CenaFase3.ts e InterpretadorFase3.ts, já registrados no hub e na configuração.
- Arquivos compartilhados (src/compartilhado, src/nucleo, src/hub) só mudam combinando com o grupo.

## Em aberto
- Os 6 exercícios. Ficam para perto do fim do desenvolvimento.
