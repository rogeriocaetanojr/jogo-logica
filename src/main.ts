import './style.css';
import './styles/terminal.css';
import './styles/dialog.css';
import Phaser from 'phaser';
import { configuracaoJogo } from './nucleo/configuracao';

// Inicialização da instância do jogo Phaser com a configuração do núcleo
new Phaser.Game(configuracaoJogo);
