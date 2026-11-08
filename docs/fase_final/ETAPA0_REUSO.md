# Fase Final — Etapa 0: mapa de reaproveitamento

Levantamento do que já existe no projeto e de como cada sistema entra na Fase Final.
Regra adotada: **as fases não importam umas das outras.** O que vem da Fase 1 é copiado e adaptado
para `src/fases/fase_final/` (mesmo padrão que a Fase 1 usou com o `SomPorto` da Fase 2).
O que está em `src/compartilhado/` e `src/nucleo/` é usado direto.

## Usado direto (compartilhado / núcleo)

| Sistema | Onde | Como entra na Fase Final |
|---|---|---|
| Cena base | `compartilhado/CenaBase.ts` | `CenaFaseFinal` continua herdando: terminal, comunicador, ESC → Hub, `concluirFaseAtual()`, `retornarAoHub()`, efeito CRT, carga dos sprites `alvares`/`reis` e animações `*_idle/_run/_jump` |
| Terminal | `compartilhado/Terminal.ts` | Termo de ciência, 5 puzzles e o rebase final. `abrir({ titulo, linhasIniciais, contexto, aoSubmeter, permitirFecharComEsc })`, `imprimirLinha`, comando `enunciado` já embutido |
| Diálogo | `compartilhado/Comunicador.ts` | Valdir, NPCs, alto-falante do Mega Brain, falas de entrada das formas, cutscene final. `iniciarDialogo(linhas, aoConcluir)`, formato `> NOME // PAPEL` |
| Personagem escolhido | `nucleo/GerenciadorEstado.ts` | `obterPersonagem()` → `'alvares' \| 'reis'`: escolhe o sprite do jogador, o do Copycat e as falas finais |
| Progresso | `nucleo/GerenciadorEstado.ts` | `concluirFase('fase_final')`; o portal do Hub já só libera com `todasFasesAnterioresConcluidas()` |
| Atalho de teste | `main.ts` | **ALT + 6** já abre `CenaFaseFinal` |
| Física | `nucleo/configuracao.ts` | Arcade, gravidade 600, tela 1280×720 (nada muda) |

## Copiado e adaptado da Fase 1

| Sistema | Origem | Adaptação |
|---|---|---|
| Jogador | `fase1/JogadorFase1.ts` | Mantém sprite físico invisível + sprite visual (squash/stretch sem mexer na hitbox), coyote time, jump buffer, pulo variável, poeira, `quicar()` para o pisão, `aplicarEmpurrao()`, `congelar()`, `respawnar()`. **Sai** tudo de vento (coluna, zona contrária, gêiser, planar e rastro) |
| Pisão / dano / morte | `CenaFase1` (`aoPisarHelio`, `ferirJogador`, `morrerNaLuta`) | Hitstop, quique, flash, shake, invulnerabilidade de 1 s, empurrão no dano, animação de morte. Vira um módulo de combate usado pelos inimigos dos andares e pelo boss |
| Corações + vida do boss | `fase1/HudLutaFase1.ts` | Mesmo HUD (segmentos no topo, corações à direita), com rótulo e cores do Mega Brain |
| Checkpoint | `CenaFase1` (`snapshotAtual`, `restaurarSnapshot`) | Snapshot simples `{ id, pontoSpawn }`; respawn reseta inimigos e mantém puzzles resolvidos. Checkpoints: termo de ciência, entrada de cada andar, início de cada forma |
| Congelar o mundo | `CenaFase1` (`congelarJogo`) | Física e tweens pausam com terminal ou diálogo aberto |
| NPC | `fase1/NpcFase1.ts` | Prompt `[E]`, falas geradas por visita (`gerarDialogo`). Tira a flutuação (NPCs da torre ficam no chão) |
| Boss em máquina de estados | `fase1/BossHelioFase1.ts` | Padrão de estados + eventos para a cena; base para a classe comum das 5 formas |
| Constantes por módulo | `fase1/constantesFase1.ts` | Mesmo padrão: um arquivo de constantes e tabelas de dados (andares, puzzles, formas) |
| Diálogos centralizados | `fase1/DialogosFase1.ts` | Todas as falas e mensagens de erro num único arquivo (`DialogosFaseFinal.ts`) |
| Som / música / mute `[M]` | `fase1/SomFase1.ts`, `MusicaFase1.ts`, `hub/MusicaHub.ts` | **Só na etapa 8.** O mute usa `lerMudoSalvo()/salvarMudo()` do `hub/MusicaHub.ts` |
| Testes headless | `scripts/` + driver CDP usado na Fase 1 | Mesma abordagem: `window.__game`, ALT + 6, testes por etapa |

## Não reaproveitado

- Interpretador Python da Fase 1 (lexer/parser/avaliador): os puzzles daqui são pseudocódigo em português e validação simples por texto normalizado. Fica um interpretador pequeno próprio (`InterpretadorFaseFinal.ts`, reescrito).
- Vento, sentinelas, nuvens e plataformas de mármore da Fase 1.
- O stub atual de `CenaFaseFinal.ts` e `InterpretadorFaseFinal.ts` será substituído.

## Assets organizados nesta etapa

| Arquivo | Origem | Formato |
|---|---|---|
| `public/assets/fase_final/boss/copycat_alvares.png` | `referencias/boss_forma1_cyberpunk_alvares.png` | 512×128, 4 quadros de 128×128 |
| `public/assets/fase_final/boss/copycat_reis.png` | `referencias/boss_forma1_cyberpunk_reis.png` | 512×128, 4 quadros de 128×128 |

As folhas originais já tinham fundo transparente. As poses estão na mesma ordem do sprite do jogador
(0 parado, 1 correndo, 2 de costas, 3 pulo), com o mesmo enquadramento: personagem de pé com 106 px
de altura, pés em y = 121, centralizado no quadro. Assim o Copycat usa as mesmas animações e a mesma
hitbox do jogador. As outras imagens de `referencias/` continuam só como inspiração e não vão para `public/`.

## Estrutura prevista de `src/fases/fase_final/`

```
CenaFaseFinal.ts          orquestra exterior → andares → boss → final
constantesFaseFinal.ts    parâmetros ajustáveis (física, tempos, pisões por forma…)
DialogosFaseFinal.ts      todas as falas e mensagens
JogadorFaseFinal.ts       jogador sem vento
CombateFaseFinal.ts       pisão, dano, invulnerabilidade, morte
HudFaseFinal.ts           corações e vida do boss
exterior/                 pan da torre, Valdir, termo de ciência
andares/                  config dos 5 andares, construtor genérico, elevador
puzzles/                  dados dos 5 puzzles + validação
inimigos/                 Spam Bot, Drone Captcha, Torreta Firewall, Alucinação
boss/                     máquina de estados comum + 5 formas + transição de queda + rebase
final/                    cutscene e créditos
```
