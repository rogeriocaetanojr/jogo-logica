/**
 * Definições e interfaces de tipos globais do projeto (PT-BR).
 */

export interface LinhaDialogo {
  falante: string;
  texto: string;
  avatar?: string;
}

export interface ResultadoComando {
  sucesso: boolean;
  mensagem: string;
  acao?: string;
  valor?: number | string;
}

export interface ContextoInterpretador {
  totem?: 'power' | 'bridge' | 'elevator' | 'energia' | 'esteira' | 'elevador' | string;
  cena?: 'boot' | 'abertura' | 'tutorial' | 'fase1' | string;
  [chave: string]: unknown;
}

export type FuncaoInterpretador = (
  entrada: string,
  contexto?: ContextoInterpretador
) => ResultadoComando;

export interface InfoFase {
  id: string; // Ex: 'fase0_tutorial', 'fase1', 'fase2', ...
  chaveCena: string; // Ex: 'CenaTutorial', 'CenaFase1', ...
  numero: number;
  titulo: string;
  subtitulo: string;
  descricao: string;
  autor: string;
  topico: string; // Ex: 'Variáveis e Concatenação', 'Condicionais e Lógica', ...
  desbloqueada: boolean;
  concluida: boolean;
}

export interface DadosEstadoJogo {
  fasesConcluidas: string[];
  faseAtual: string;
  pontuacao?: number;
}
