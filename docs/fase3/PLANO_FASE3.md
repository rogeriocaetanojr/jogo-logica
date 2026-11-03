# Fase 3: Lixão Eletrônico

## Conceito
Um lixão gigante de lixo eletrônico, inspirado em Wall-E. O jogador controla máquinas pelo terminal, com comandos Python básicos (um pouco além do tutorial), para limpar o caminho. No fim, derrota o Monstro de Sucata e o empurra até o contêiner de reciclagem, salvando o mundo do lixo eletrônico.

## Estrutura
- Uma fase só, direta: um mapa contínuo, do começo ao chefão, em cerca de 10 minutos. Não há áreas, telas de área, muros, portões ou placas de saída dividindo o caminho.
- O mapa tem 4 trechos, e o que muda de um para o outro é só o clima, em transição suave enquanto o jogador anda:
  1. Sol: sem efeito (aprendizado).
  2. Névoa de poeira: pouca visibilidade.
  3. Chuva: chão escorregadio.
  4. Noite: escuro, só a luz das faíscas. É a arena do chefão.
- Há 3 exercícios, um no meio de cada trecho de sol, névoa e chuva. No ponto de exercício (que também é o checkpoint) o jogador resolve o comando no terminal, e uma máquina muda o caminho logo à frente: tira entulho, cria ponte ou abre passagem. O obstáculo é parte do caminho, nunca uma divisa entre trechos.
- No trecho da noite não há exercício: é a luta com o Monstro de Sucata.

## Perigos
- Drones andam e atiram sucata. Dá para desviar ou derrubá-los arremessando lixo. Eles mudam com o clima (por exemplo, na chuva soltam faíscas).
- Lixo cai das pilhas, com sombra e tremor de aviso.
- Pulos e trechos em que é preciso se abaixar. Abaixado (S ou seta para baixo), o jogador anda mais devagar, não pula e só levanta se houver espaço acima. Como os personagens não têm quadro de abaixar, o sprite é achatado pelos pés.
- Parâmetros de movimento ficam em `MOVIMENTO_LIXAO` (lixao/JogadorLixao.ts). Cada jogador tem uma cópia em `parametros` para o clima alterar, por exemplo a frenagem na chuva.
- Vida de 5 baterias. Cada dano tira 1 bateria, dá 1 s de invencibilidade piscando e um empurrão leve. Ao zerar, o jogador volta com vida cheia ao último ponto de exercício ativado; o início da fase conta como o primeiro ponto.

## Arremesso
- O mesmo controle no caminho e no chefão: mira com o mouse, arremessa com clique.
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
- Canto superior direito: ícone e nome do clima atual (SOL, NÉVOA, CHUVA, NOITE) e o medidor "Lixão limpo: 25%", que sobe 25% a cada exercício resolvido e chega a 100% ao vencer o chefão. Nada de número de área.
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
- Ciano só no que é interativo (terminal, máquinas, drones). Vermelho só no que é perigo.
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
| `tintaPo` | #E8C49A | Tinta do cenário no trecho de névoa |
| `tintaChuva` | #9AA8CC | Tinta do cenário no trecho de chuva, gotas de chuva |
| `tintaNoite` | #6E62A0 | Tinta do cenário no trecho da noite |
| `neonCiano` | #3FE8E0 | LED e tela do terminal, máquinas, setas e textos interativos |
| `neonCianoEscuro` | #1E8F8C | Fundo da tela do terminal, LED apagado |
| `perigo` | #E0413A | Só perigos: tiros, faíscas, lixo caindo |
| `bateriaVerde` | #5FCB5A | Baterias da HUD com carga alta |
| `bateriaAmarela` | #E8C440 | Baterias da HUD com carga média; com carga baixa elas ficam `perigo` |
| `luz` | #FFFFFF | Base branca de partículas e brilhos que recebem tinta |

Cenário por trecho (céu fixo, nuvens 0.1, horizonte 0.25, pilhas 0.55, chão 1.0):

| Trecho | Céu | Astro | Tinta |
|---|---|---|---|
| Sol | ceuPoeiraClaro, ceuPoeira, horizonte | sol | nenhuma |
| Névoa | ceuPoeira, horizonte, horizonteEscuro | nenhum | tintaPo |
| Chuva | chuvaAzul, chuvaAzulClaro | nenhum | tintaChuva |
| Noite | noiteRoxoEscuro, noiteRoxo | lua | tintaNoite |

## Técnico
- HUD, som e ajuda próprios da Fase 3, em src/fases/fase3, usando a Fase 2 como referência, sem importar código dela.
- A cena é a CenaFase3, registrada no hub e na configuração. Os trechos ficam em src/fases/fase3/trechos (Trecho1Sol a Trecho4Noite), montados um depois do outro num só mundo.
- Arquivos compartilhados (src/compartilhado, src/nucleo, src/hub) só mudam combinando com o grupo.

## Em aberto
- Os 3 exercícios. Ficam para perto do fim do desenvolvimento.
