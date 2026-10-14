import './style.css';
import './styles/terminal.css';
import './styles/dialog.css';
import Phaser from 'phaser';
import { configuracaoJogo } from './nucleo/configuracao';

// Inicialização da instância do jogo Phaser com a configuração do núcleo
const game = new Phaser.Game(configuracaoJogo);
(window as any).__game = game;

// Mapa de atalhos rápidos de desenvolvimento (ALT + [0-6])
const MAPA_FASES_DEV: Record<string, string> = {
  '0': 'CenaTutorial',
  '1': 'CenaFase1',
  '2': 'CenaFase2',
  '3': 'CenaFase3',
  '4': 'CenaFase4',
  '5': 'CenaFase5',
  '6': 'CenaFaseFinal',
};

const obterNumeroAtalho = (evento: KeyboardEvent): string | null => {
  // Suporta tanto evento.key quanto evento.code (Digit0-6 ou Numpad0-6)
  if (MAPA_FASES_DEV[evento.key]) {
    return evento.key;
  }
  if (evento.code.startsWith('Digit')) {
    const digito = evento.code.replace('Digit', '');
    if (MAPA_FASES_DEV[digito]) return digito;
  }
  if (evento.code.startsWith('Numpad')) {
    const digito = evento.code.replace('Numpad', '');
    if (MAPA_FASES_DEV[digito]) return digito;
  }
  return null;
};

// Utiliza a fase de captura (true) para interceptar o evento antes de inputs e diálogos
window.addEventListener(
  'keydown',
  (evento: KeyboardEvent) => {
    if (!evento.altKey) return;

    const digito = obterNumeroAtalho(evento);
    if (!digito) return;

    const chaveCena = MAPA_FASES_DEV[digito];
    if (!chaveCena) return;

    // Intercepta e bloqueia a propagação para evitar digitação no input do terminal
    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();

    // 1. Limpa e esconde o Terminal HTML
    const overlayTerminal = document.getElementById('terminal-overlay');
    if (overlayTerminal) {
      overlayTerminal.classList.add('hidden');
    }
    const inputTerminal = document.getElementById('terminal-input') as HTMLInputElement | null;
    if (inputTerminal) {
      inputTerminal.value = '';
      inputTerminal.blur();
    }

    // 2. Limpa e esconde os diálogos (tanto 'dialog-overlay' quanto qualquer classe oculta)
    const dialogOverlay = document.getElementById('dialog-overlay');
    if (dialogOverlay) {
      dialogOverlay.classList.add('hidden');
    }
    const dialogoTexto = document.getElementById('dialog-text');
    if (dialogoTexto) {
      dialogoTexto.textContent = '';
    }

    // 3. Remove o efeito de blur aplicado ao container no ritual de boot
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.classList.remove('blur-active');
    }

    // 4. Para todas as cenas ativas e transiciona imediatamente
    const cenasAtivas = game.scene.getScenes(true);
    for (const cena of cenasAtivas) {
      // Se for uma CenaBase, chama os métodos de limpeza
      if ('terminal' in (cena as any) && (cena as any).terminal?.fecharForcado) {
        (cena as any).terminal.fecharForcado();
      }
      if ('comunicador' in (cena as any) && (cena as any).comunicador?.finalizarDialogo) {
        (cena as any).comunicador.finalizarDialogo();
      }
      game.scene.stop(cena.scene.key);
    }

    // Inicia a cena desejada (se for o tutorial via atalho, pula o ritual de boot)
    const dadosTransicao = digito === '0' ? { isBooting: false, iniciarAposBoot: true } : undefined;
    game.scene.start(chaveCena, dadosTransicao);
  },
  true // CAPTURE: executa antes de qualquer input ou elemento com foco
);
