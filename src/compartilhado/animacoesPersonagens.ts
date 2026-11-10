/**
 * Quadros dos spritesheets de Alvares e Reis (128x128 cada):
 * 0 parado, 1 pose de corrida, 2 de costas, 3 pulando,
 * 4..11 ciclo de caminhada (gerado por scripts/gerarAnimacaoAndar.py).
 *
 * As animações do Phaser são globais: a primeira cena que registrar
 * `<personagem>_run` vale para o jogo todo, por isso todas usam estes valores.
 */
export const QUADROS_ANDAR: number[] = [4, 5, 6, 7, 8, 9, 10, 11];
export const FPS_ANDAR = 12;
