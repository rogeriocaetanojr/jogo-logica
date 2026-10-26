import Phaser from 'phaser';

/**
 * Plataforma cinemática (corpo imóvel guiado por velocidade): conveses de navio, contêineres
 * carregados pelo guindaste e plataformas de espuma que sobem e descem com a maré.
 * Mover por velocidade faz o Arcade carregar o jogador que estiver em cima.
 */
export class PlataformaMovel {
  public readonly zona: Phaser.GameObjects.Zone;
  public readonly body: Phaser.Physics.Arcade.Body;
  public alvoX: number;
  public alvoY: number;
  public readonly visuais: Array<{ obj: Phaser.GameObjects.Components.Transform; dx: number; dy: number }> = [];

  constructor(grupo: Phaser.Physics.Arcade.Group, cena: Phaser.Scene, x: number, y: number, largura: number, altura: number, umaVia = true) {
    this.zona = cena.add.zone(x, y, largura, altura);
    grupo.add(this.zona);
    this.body = this.zona.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.pushable = false;
    if (umaVia) {
      this.body.checkCollision.down = false;
      this.body.checkCollision.left = false;
      this.body.checkCollision.right = false;
    }
    this.alvoX = x;
    this.alvoY = y;
  }

  get x(): number {
    return this.body.center.x;
  }

  get y(): number {
    return this.body.center.y;
  }

  get topo(): number {
    return this.body.top;
  }

  /** Prende um objeto visual que acompanha a plataforma com deslocamento fixo. */
  anexar(obj: Phaser.GameObjects.Components.Transform, dx: number, dy: number): void {
    this.visuais.push({ obj, dx, dy });
    obj.setPosition(this.x + dx, this.y + dy);
  }

  moverPara(x: number, y: number): void {
    this.alvoX = x;
    this.alvoY = y;
  }

  teleportar(x: number, y: number): void {
    this.alvoX = x;
    this.alvoY = y;
    this.body.reset(x, y);
  }

  /** Define a velocidade necessária para alcançar o alvo no próximo passo da física. */
  aplicar(delta: number): void {
    if (!this.body.enable) return;
    const dt = Math.max(0.001, delta / 1000);
    const vx = (this.alvoX - this.body.center.x) / dt;
    const vy = (this.alvoY - this.body.center.y) / dt;
    this.body.setVelocity(Phaser.Math.Clamp(vx, -1600, 1600), Phaser.Math.Clamp(vy, -1600, 1600));
  }

  /** Posiciona os visuais anexados (chamar depois da física). */
  sincronizar(): void {
    for (const v of this.visuais) v.obj.setPosition(Math.round(this.x + v.dx), Math.round(this.y + v.dy));
  }

  destruir(): void {
    for (const v of this.visuais) (v.obj as unknown as Phaser.GameObjects.GameObject).destroy();
    this.zona.destroy();
  }
}
