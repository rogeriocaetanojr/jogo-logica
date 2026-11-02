import Phaser from 'phaser';

/**
 * Gera uma textura procedural uma única vez por chave (reaproveitada entre visitas à fase).
 */
function gerar(
  cena: Phaser.Scene,
  chave: string,
  w: number,
  h: number,
  desenhar: (g: Phaser.GameObjects.Graphics) => void
): void {
  if (cena.textures.exists(chave)) return;
  const g = cena.make.graphics();
  desenhar(g);
  g.generateTexture(chave, w, h);
  g.destroy();
}

/**
 * Gera todas as texturas procedurais da Fase 1 na paleta luminosa do Stitch.
 */
export function gerarTexturasFase1(cena: Phaser.Scene): void {
  // 1. Mármore Claro com Friso Dourado
  gerar(cena, 'marmore-bloco', 240, 36, (g) => {
    const w = 240;
    const h = 36;
    g.fillStyle(0xf8fafc, 1);
    g.fillRoundedRect(0, 0, w, h, 4);
    g.fillStyle(0xe2e8f0, 1);
    g.fillRect(2, h - 6, w - 4, 4);
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(0, 0, w, 5);
    g.fillStyle(0xfef08a, 0.9);
    g.fillRect(2, 1, w - 4, 2);
    g.lineStyle(1, 0xcbd5e1, 0.8);
    g.beginPath();
    g.moveTo(40, 5);
    g.lineTo(70, 30);
    g.moveTo(150, 5);
    g.lineTo(190, 28);
    g.strokePath();
  });

  // 2. Mármore Rachado
  gerar(cena, 'marmore-rachado', 180, 32, (g) => {
    const w = 180;
    const h = 32;
    g.fillStyle(0xf1f5f9, 1);
    g.fillRoundedRect(0, 0, w, h, 4);
    g.fillStyle(0xd97706, 0.9);
    g.fillRect(0, 0, w, 4);
    g.lineStyle(2, 0x64748b, 1);
    g.beginPath();
    g.moveTo(50, 0);
    g.lineTo(65, 14);
    g.lineTo(55, 22);
    g.lineTo(75, 32);
    g.moveTo(120, 0);
    g.lineTo(110, 12);
    g.lineTo(135, 20);
    g.lineTo(125, 32);
    g.strokePath();
    g.lineStyle(1, 0xfbbf24, 0.9);
    g.beginPath();
    g.moveTo(51, 1);
    g.lineTo(66, 15);
    g.strokePath();
  });

  // 3. Nuvem Sólida
  gerar(cena, 'nuvem-solida', 200, 44, (g) => {
    const w = 200;
    const h = 44;
    g.fillStyle(0xfff1f2, 0.95);
    g.fillRoundedRect(10, 10, w - 20, h - 10, 15);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(40, 20, 18);
    g.fillCircle(85, 16, 22);
    g.fillCircle(135, 18, 20);
    g.fillCircle(170, 22, 16);
    g.fillStyle(0xe9d5ff, 0.6);
    g.fillRoundedRect(15, h - 12, w - 30, 8, 4);
  });

  // 4. Coluna de Mármore
  gerar(cena, 'coluna-marmore', 48, 260, (g) => {
    const w = 48;
    const h = 260;
    g.fillStyle(0xf8fafc, 1);
    g.fillRect(8, 20, w - 16, h - 40);
    g.lineStyle(2, 0xcbd5e1, 0.7);
    g.lineBetween(16, 20, 16, h - 20);
    g.lineBetween(24, 20, 24, h - 20);
    g.lineBetween(32, 20, 32, h - 20);
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(0, 0, w, 20);
    g.fillRect(0, h - 20, w, 20);
    g.fillStyle(0xfef08a, 0.95);
    g.fillRect(4, 4, w - 8, 4);
    g.fillRect(4, h - 8, w - 8, 4);
  });

  // 5. Coluna Dourada
  gerar(cena, 'coluna-dourada', 56, 320, (g) => {
    const w = 56;
    const h = 320;
    g.fillStyle(0xfffbeb, 1);
    g.fillRect(10, 24, w - 20, h - 48);
    g.fillStyle(0xfbbf24, 1);
    g.fillRect(0, 0, w, 24);
    g.fillRect(0, h - 24, w, 24);
    g.fillStyle(0xd97706, 1);
    g.fillRect(6, 6, w - 12, 12);
    g.fillRect(6, h - 18, w - 12, 12);
    g.lineStyle(2, 0xf59e0b, 0.8);
    g.lineBetween(18, 24, 18, h - 24);
    g.lineBetween(28, 24, 28, h - 24);
    g.lineBetween(38, 24, 38, h - 24);
  });

  // 6. Totem Celestial
  gerar(cena, 'totem-celestial', 52, 70, (g) => {
    const w = 52;
    const h = 70;
    g.fillStyle(0x0f172a, 1);
    g.fillRoundedRect(4, 12, w - 8, h - 12, 6);
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(8, h - 8, w - 16, 6);
    g.fillStyle(0x38bdf8, 0.35);
    g.fillRoundedRect(8, 16, w - 16, 32, 4);
    g.fillStyle(0x00e5ff, 1);
    g.fillRect(14, 22, w - 28, 4);
    g.fillRect(14, 30, w - 34, 4);
    g.fillRect(14, 38, w - 24, 4);
    g.fillStyle(0xa855f7, 1);
    g.fillCircle(w / 2, 8, 6);
  });

  // 7. Sentinela-Drone
  gerar(cena, 'sentinela-drone', 64, 64, (g) => {
    g.fillStyle(0x18181b, 1);
    g.fillRoundedRect(8, 12, 48, 40, 10);
    g.fillStyle(0x27272a, 1);
    g.fillRect(12, 16, 40, 8);
    g.fillStyle(0x52525b, 1);
    g.fillRect(2, 26, 8, 12);
    g.fillRect(54, 26, 8, 12);
    g.fillStyle(0xef4444, 0.35);
    g.fillCircle(32, 34, 16);
    g.fillStyle(0xff0055, 1);
    g.fillCircle(32, 34, 10);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(34, 32, 3);
  });

  // 8. Portão Milenar
  gerar(cena, 'portao-milenar', 40, 200, (g) => {
    const w = 40;
    const h = 200;
    g.fillStyle(0x0f172a, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x38bdf8, 0.4);
    g.fillRect(4, 4, w - 8, h - 8);
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(0, 0, w, 8);
    g.fillRect(0, h - 8, w, 8);
    g.lineStyle(2, 0x38bdf8, 0.9);
    g.beginPath();
    g.moveTo(w / 2, 20);
    g.lineTo(w / 2, h - 20);
    g.strokePath();
  });

  // 9. Placa Rúnica de Sinalização
  gerar(cena, 'placa-runica', 150, 34, (g) => {
    g.fillStyle(0x1e293b, 0.92);
    g.fillRoundedRect(0, 0, 150, 34, 6);
    g.lineStyle(2, 0xfbbf24, 0.85);
    g.strokeRoundedRect(0, 0, 150, 34, 6);
  });

  // 10. Portal do Santuário
  gerar(cena, 'portal-santuario', 96, 160, (g) => {
    const w = 96;
    const h = 160;
    g.fillStyle(0xf59e0b, 1);
    g.fillRoundedRect(0, 0, w, h, 20);
    g.fillStyle(0xfef08a, 1);
    g.fillRoundedRect(6, 6, w - 12, h - 12, 16);
    g.fillStyle(0x4a044e, 1);
    g.fillRoundedRect(14, 14, w - 28, h - 28, 12);
    g.fillStyle(0xc084fc, 0.9);
    g.fillEllipse(w / 2, h / 2, 26, 50);
    g.fillStyle(0xffffff, 0.95);
    g.fillEllipse(w / 2, h / 2, 10, 24);
  });

  // 11. NPC 1: Drone Desertor "Sucatinha"
  gerar(cena, 'npc-sucatinha', 48, 48, (g) => {
    const w = 48;
    g.fillStyle(0x78716c, 1);
    g.fillRoundedRect(6, 10, 36, 30, 8);
    g.fillStyle(0xa8a29e, 1);
    g.fillRect(10, 14, 28, 8);
    g.lineStyle(2, 0xd6d3d1, 1);
    g.lineBetween(w / 2, 10, w / 2, 2);
    g.fillStyle(0x38bdf8, 1);
    g.fillCircle(w / 2, 2, 3);
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(18, 26, 5);
    g.fillCircle(30, 26, 5);
    g.fillStyle(0x000000, 1);
    g.fillCircle(19, 26, 2);
    g.fillCircle(31, 26, 2);
    g.lineStyle(2, 0xfacc15, 0.9);
    g.lineBetween(8, 32, 20, 38);
  });

  // 12. NPC 2: Mago da Nuvem Sem Salário
  gerar(cena, 'npc-mago-nuvem', 48, 60, (g) => {
    const w = 48;
    const h = 60;
    g.fillStyle(0x7c3aed, 1);
    g.fillTriangle(w / 2, 18, 6, h - 4, w - 6, h - 4);
    g.fillStyle(0xc084fc, 0.85);
    g.fillTriangle(w / 2, 22, 12, h - 4, w - 12, h - 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(w / 2, 32, 10);
    g.fillCircle(w / 2 - 6, 36, 7);
    g.fillCircle(w / 2 + 6, 36, 7);
    g.fillStyle(0x4c1d95, 1);
    g.fillTriangle(w / 2, 2, 8, 20, w - 8, 20);
    g.fillStyle(0xfbbf24, 1);
    g.fillRect(10, 18, w - 20, 3);
  });

  // 13. Nuvem Efêmera: mais transparente e com a base tracejada, para avisar que não é firme
  gerar(cena, 'nuvem-efemera', 200, 44, (g) => {
    const w = 200;
    const h = 44;
    g.fillStyle(0xf5f3ff, 0.75);
    g.fillRoundedRect(10, 10, w - 20, h - 10, 15);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(40, 20, 18);
    g.fillCircle(85, 16, 22);
    g.fillCircle(135, 18, 20);
    g.fillCircle(170, 22, 16);
    g.fillStyle(0xc4b5fd, 0.9);
    for (let x = 20; x < w - 20; x += 18) {
      g.fillRect(x, h - 8, 10, 3);
    }
  });

  // 14. Plataforma em Trilho: mármore fino com trilhos dourados nas pontas
  gerar(cena, 'plataforma-trilho', 160, 24, (g) => {
    const w = 160;
    const h = 24;
    g.fillStyle(0xf8fafc, 1);
    g.fillRoundedRect(0, 0, w, h, 4);
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(0, 0, w, 4);
    g.fillStyle(0x94a3b8, 1);
    g.fillRect(6, h - 6, 14, 4);
    g.fillRect(w - 20, h - 6, 14, 4);
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(13, h - 4, 3);
    g.fillCircle(w - 13, h - 4, 3);
  });

  // 15. Balsa da Sentinela: deck escuro com faixa verde de "hackeado"
  gerar(cena, 'plataforma-sentinela', 120, 24, (g) => {
    const w = 120;
    const h = 24;
    g.fillStyle(0x18181b, 1);
    g.fillRoundedRect(0, 0, w, h, 6);
    g.fillStyle(0x10b981, 1);
    g.fillRect(4, 2, w - 8, 4);
    g.fillStyle(0x34d399, 0.6);
    g.fillRect(10, h - 7, w - 20, 3);
    g.fillStyle(0x52525b, 1);
    g.fillRect(0, 8, 6, 10);
    g.fillRect(w - 6, 8, 6, 10);
  });

  // 16. NPC 3: Pombo-Correio Sindicalizado (com crachá do sindicato)
  gerar(cena, 'npc-pombo', 48, 40, (g) => {
    g.fillStyle(0x94a3b8, 1);
    g.fillEllipse(22, 26, 32, 22);
    g.fillStyle(0x64748b, 1);
    g.fillEllipse(16, 27, 18, 12);
    g.fillStyle(0xa5b4fc, 1);
    g.fillCircle(34, 14, 9);
    g.fillStyle(0xf59e0b, 1);
    g.fillTriangle(42, 13, 48, 15, 42, 17);
    g.fillStyle(0x000000, 1);
    g.fillCircle(36, 12, 2);
    g.fillStyle(0xef4444, 1);
    g.fillRect(24, 22, 8, 6);
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(18, 36, 2, 4);
    g.fillRect(26, 36, 2, 4);
  });

  // 17. Boss Helio, Senhor dos Ventos: capa, manto, coroa solar, barba de vento e manoplas
  gerar(cena, 'boss-helio', 128, 144, (g) => {
    // Capa
    g.fillStyle(0x6d28d9, 1);
    g.fillTriangle(64, 40, 6, 144, 122, 144);
    // Manto e barra
    g.fillStyle(0xf8fafc, 1);
    g.fillRoundedRect(34, 58, 60, 86, 10);
    g.fillStyle(0xe9d5ff, 1);
    g.fillRect(34, 124, 60, 20);
    // Cinto dourado
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(34, 94, 60, 8);
    // Manoplas de vento
    g.fillStyle(0x38bdf8, 1);
    g.fillCircle(26, 94, 12);
    g.fillCircle(102, 94, 12);
    g.fillStyle(0xe0f2fe, 1);
    g.fillCircle(26, 94, 6);
    g.fillCircle(102, 94, 6);
    // Coroa solar: raios em leque sobre a cabeça
    g.fillStyle(0xfbbf24, 1);
    for (let i = 0; i <= 6; i++) {
      const angulo = Math.PI + (i / 6) * Math.PI;
      g.fillTriangle(
        64 + Math.cos(angulo - 0.2) * 18,
        38 + Math.sin(angulo - 0.2) * 18,
        64 + Math.cos(angulo + 0.2) * 18,
        38 + Math.sin(angulo + 0.2) * 18,
        64 + Math.cos(angulo) * 36,
        38 + Math.sin(angulo) * 36
      );
    }
    // Rosto
    g.fillStyle(0xfde68a, 1);
    g.fillCircle(64, 40, 20);
    // Barba de vento
    g.fillStyle(0xffffff, 1);
    g.fillCircle(52, 58, 9);
    g.fillCircle(64, 62, 10);
    g.fillCircle(76, 58, 9);
    // Sobrancelhas bravas e olhos
    g.lineStyle(3, 0x1e1b4b, 1);
    g.lineBetween(51, 32, 61, 37);
    g.lineBetween(77, 32, 67, 37);
    g.fillStyle(0x1e1b4b, 1);
    g.fillCircle(57, 42, 3);
    g.fillCircle(71, 42, 3);
  });

  // 18. Gerador da escada de rajadas: carcaça pendurada sob o chão, com moldura dourada
  gerar(cena, 'gerador-vento', 96, 52, (g) => {
    g.fillStyle(0x1e293b, 1);
    g.fillRoundedRect(4, 0, 88, 48, 8);
    g.fillStyle(0x334155, 1);
    g.fillRoundedRect(10, 6, 76, 36, 6);
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(4, 0, 88, 4);
    g.fillStyle(0x64748b, 1);
    g.fillRect(0, 14, 6, 20);
    g.fillRect(90, 14, 6, 20);
    g.fillStyle(0x0f172a, 1);
    g.fillCircle(48, 26, 18);
  });

  // 19. Hélice do gerador (gira quando a coluna está ligada)
  gerar(cena, 'helice-gerador', 36, 36, (g) => {
    g.fillStyle(0xe0f2fe, 1);
    for (let i = 0; i < 4; i++) {
      const angulo = (i * Math.PI) / 2;
      g.fillTriangle(
        18,
        18,
        18 + Math.cos(angulo - 0.35) * 16,
        18 + Math.sin(angulo - 0.35) * 16,
        18 + Math.cos(angulo + 0.25) * 16,
        18 + Math.sin(angulo + 0.25) * 16
      );
    }
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(18, 18, 4);
  });

  // 20. Cristal solar (sensor energia_sol)
  gerar(cena, 'cristal-solar', 30, 46, (g) => {
    g.fillStyle(0xfbbf24, 1);
    g.fillTriangle(15, 0, 0, 20, 30, 20);
    g.fillTriangle(0, 20, 30, 20, 15, 46);
    g.fillStyle(0xfef08a, 1);
    g.fillTriangle(15, 4, 6, 20, 15, 20);
    g.fillTriangle(15, 20, 6, 20, 15, 38);
  });

  // 21. Base da turbina (sensor energia_vento)
  gerar(cena, 'turbina-base', 20, 70, (g) => {
    g.fillStyle(0xcbd5e1, 1);
    g.fillRect(7, 10, 6, 60);
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(2, 64, 16, 6);
    g.fillStyle(0x475569, 1);
    g.fillCircle(10, 10, 8);
  });

  // 22. Pás da turbina
  gerar(cena, 'pas-turbina', 60, 60, (g) => {
    g.fillStyle(0xf8fafc, 1);
    for (let i = 0; i < 3; i++) {
      const angulo = (i * Math.PI * 2) / 3;
      g.fillTriangle(
        30 + Math.cos(angulo - 0.2) * 6,
        30 + Math.sin(angulo - 0.2) * 6,
        30 + Math.cos(angulo + 0.2) * 6,
        30 + Math.sin(angulo + 0.2) * 6,
        30 + Math.cos(angulo) * 28,
        30 + Math.sin(angulo) * 28
      );
    }
    g.fillStyle(0x475569, 1);
    g.fillCircle(30, 30, 5);
  });

  // 23. Placa de pressão rúnica (sensor placa_pressionada)
  gerar(cena, 'placa-pressao', 70, 10, (g) => {
    g.fillStyle(0x475569, 1);
    g.fillRoundedRect(0, 0, 70, 10, 3);
    g.fillStyle(0x94a3b8, 1);
    g.fillRect(6, 2, 58, 3);
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(31, 1, 8, 8);
  });
}
