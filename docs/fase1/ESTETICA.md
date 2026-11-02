# Estética da Fase 1: Céu Partido

Resumo da direção de arte da Fase 1. Os números e as cores ficam no código, em
`src/fases/fase1/ArteFase1.ts` (`CORES_FASE1`, `CENARIO_FASE1`, `AMBIENTE_FASE1`).

## Referências

- **Mockups do Stitch** (`docs/fase1/mockup/`, fora do git): céu pastel, ilhas de mármore
  flutuando sobre um mar de nuvens, ruínas gregas, obeliscos rúnicos e hologramas ciano.
- **Celeste**: céu em faixas com transição pontilhada, nuvens compridas e bandeira vermelha no mirante.
- **Rivals of Aether**: mar de nuvens rosa e dirigíveis ao fundo.
- **Air Man (Mega Man 2)**: plataformas com propulsores e tornados como obstáculo.
- **Helio**: busto de Hélio em mármore, lutador loiro arrogante e apresentador de palco (capa magenta).

## Paleta

| Grupo | Cores | Onde aparece |
|---|---|---|
| Céu | ciano `#8AD8EC` → lavanda `#C9B5F4` → rosa `#F8BCCD` → pêssego `#FED9C4` | fundo em faixas |
| Mármore | `#FAF6F0`, sombra `#E3DCEA`, escuro `#C3B8D6` | plataformas, colunas, estátuas |
| Ouro | `#FCD34D`, claro `#FEF3C7`, escuro `#D99A1E`, musgo `#E8C547` | frisos, capitéis, musgo |
| Rocha | `#BCB0E2`, `#9F92C8`, `#76689F` | fundo das ilhas flutuantes |
| Energia | `#06B6D4`, `#67E8F9`, `#CFFAFE` | vento, hologramas, cristais, escudo |
| Hostil | `#0B0F19`, `#1E2235`, alerta `#EF4444` | sentinelas e geradores |
| Helio | pele `#F6EEE4`, cabelo `#FCD34D`, vermelho `#DC2626`, capa `#C026D3` | boss |

Regra: o que se pisa é claro (mármore e nuvem); o que machuca ou vigia é escuro com vermelho;
o que se ativa no terminal brilha em ciano.

## Camadas (de trás para a frente)

1. Céu em faixas e sol (fixos na tela).
2. Faixas de nuvem compridas (parallax 0,04, derivando devagar).
3. Dirigíveis e ilhas distantes (0,06 a 0,14).
4. Ruínas com colunatas, arcos e cachoeiras (0,28).
5. Mar de nuvens rosa (0,45) e nuvens brancas mais perto (0,7).
6. Mundo do jogo: ilhas de mármore, colunas, obeliscos, estátuas e bandeiras.
7. Neblina de primeiro plano na base da tela (1,25, translúcida).

A tempestade do Helio cobre as camadas 1 a 5 e deixa o mundo do jogo legível.

## Peças

- **Ilha flutuante**: laje de mármore com friso dourado repetida (nítida em qualquer largura) e rocha
  em estratos embaixo, com musgo dourado, cristais e pedrinhas soltas. A arena ganha um friso grego.
- **Coluna de vento**: feixe ciano mais forte no meio, duas fitas em espiral e brilhos subindo.
  A velocidade das fitas acompanha a força: vento fraco se vê fraco.
- **Totem**: obelisco de mármore com glifos e o holograma do terminal. O totem do núcleo do Helio é dourado com tela magenta.
- **Sentinela**: cápsula escura com olho vermelho e cabos.
- **Checkpoint**: obelisco rúnico; nos mirantes, uma bandeira vermelha tremula para a esquerda (contra o jogador).

Terminal e diálogos seguem o visual padrão do jogo e não mudam nesta fase.
