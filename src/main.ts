import './style.css';
import './styles/terminal.css';
import './styles/dialog.css';
import Phaser from 'phaser';
import { configuracaoJogo } from './nucleo/configuracao';

// Inicialização da instância do jogo Phaser com a configuração do núcleo
const game = new Phaser.Game(configuracaoJogo);
(window as any).__game = game;
