/**
 * Golpe final "Brain Rebase" (roteiro 9.7): o histórico do Mega Brain como um `git rebase -i`.
 * Cada linha é um commit com `pick` (mantém) ou `drop` (descarta). Só descartar o 9b40
 * (a plataforma de sustentação) derruba o chefe; descartar os outros gera piadas.
 * Avaliação pura (sem Phaser) para poder ser testada em scripts/testarPuzzlesFaseFinal.ts.
 */

export type AcaoRebase = 'pick' | 'drop';

export interface Commit {
  hash: string;
  mensagem: string;
}

export const COMMITS: readonly Commit[] = [
  { hash: 'a1f3', mensagem: 'feat: deixar todo conteúdo genérico' },
  { hash: '7c2e', mensagem: 'fix: remover criatividade humana' },
  { hash: '9b40', mensagem: 'feat: plataforma de sustentação do Mega Brain' },
  { hash: 'd5e1', mensagem: 'chore: renomear "estagiário" para "legado"' },
];

/** O commit que segura o Mega Brain. */
export const COMMIT_SUSTENTACAO = '9b40';

export type EstadoRebase = Record<string, AcaoRebase>;

export function estadoInicialRebase(): EstadoRebase {
  return Object.fromEntries(COMMITS.map((c) => [c.hash, 'pick' as AcaoRebase]));
}

export type ResultadoRebase =
  | { status: 'resolvido'; estado: EstadoRebase }
  | { status: 'alterado'; hash: string; acao: AcaoRebase; estado: EstadoRebase }
  | { status: 'sem_mudanca'; hash: string; acao: AcaoRebase }
  | { status: 'continuar' }
  | { status: 'formato'; motivo: 'hash_inexistente' | 'so_hash' | 'sem_hash' | 'outro_comando' | 'geral'; hash?: string };

const ACOES: Record<string, AcaoRebase> = { pick: 'pick', p: 'pick', drop: 'drop', d: 'drop' };
const OUTROS_COMANDOS = new Set(['reword', 'r', 'edit', 'e', 'squash', 's', 'fixup', 'f', 'exec', 'x', 'break', 'b', 'label', 'reset', 'merge']);

/** Linhas do editor do rebase no estado atual. */
export function listarRebase(estado: EstadoRebase): Array<{ texto: string; acao: AcaoRebase }> {
  return COMMITS.map((c) => {
    const acao = estado[c.hash] ?? 'pick';
    return { texto: `${acao.padEnd(4)} ${c.hash}  ${c.mensagem}`, acao };
  });
}

/**
 * Interpreta uma linha do jogador. Tolerante: maiúsculas, espaços extras, a linha inteira copiada
 * (`drop 9b40 feat: ...`), atalhos do git (`d 9b40`) e prefixos como `git`.
 */
export function avaliarRebase(entrada: string, estado: EstadoRebase): ResultadoRebase {
  const texto = entrada
    .toLowerCase()
    .replace(/[`"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^(git )?rebase --?continue$|^continue$|^--continue$/.test(texto)) return { status: 'continuar' };

  const palavras = texto.replace(/^git (rebase )?/, '').split(/[\s(),;]+/).filter(Boolean);
  if (palavras.length === 0) return { status: 'formato', motivo: 'geral' };
  const [primeira, segunda] = palavras;

  if (/^[0-9a-f]{4}$/.test(primeira)) return { status: 'formato', motivo: 'so_hash', hash: primeira };
  if (OUTROS_COMANDOS.has(primeira)) return { status: 'formato', motivo: 'outro_comando' };

  const acao = ACOES[primeira];
  if (!acao) return { status: 'formato', motivo: 'geral' };
  if (!segunda) return { status: 'formato', motivo: 'sem_hash' };
  if (!/^[0-9a-z]{3,8}$/.test(segunda)) return { status: 'formato', motivo: 'sem_hash' };
  const commit = COMMITS.find((c) => c.hash === segunda);
  if (!commit) return { status: 'formato', motivo: 'hash_inexistente', hash: segunda };

  if (estado[commit.hash] === acao) return { status: 'sem_mudanca', hash: commit.hash, acao };
  const novo: EstadoRebase = { ...estado, [commit.hash]: acao };
  if (commit.hash === COMMIT_SUSTENTACAO && acao === 'drop') return { status: 'resolvido', estado: novo };
  return { status: 'alterado', hash: commit.hash, acao, estado: novo };
}
