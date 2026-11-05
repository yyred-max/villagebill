/**
 * VillageScene.ts — Stardew Valley inspired Phaser 3 Village
 *
 * - Colorful trees
 * - House built in stages (puzzle style)
 * - 2D animals (chickens + cows)
 * - Progress = (paid shares / total shares)
 * - Click buildings → emit selectGroup
 */

import Phaser from "phaser";
import type { Group } from "../lib/contract";

export default class VillageScene extends Phaser.Scene {
  private groups: Group[] = [];
  private buildingContainers: Phaser.GameObjects.Container[] = [];
  private emptyStateText?: Phaser.GameObjects.Text;
  private terrainGraphics?: Phaser.GameObjects.Graphics;
  private decorations: Phaser.GameObjects.GameObject[] = [];
  private animals: Phaser.GameObjects.Container[] = [];
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private camStart = { x: 0, y: 0 };

  constructor() {
    super({ key: "VillageScene" });
  }

  init(data: { groups?: Group[] }) {
    if (data?.groups) this.groups = data.groups;
  }

  preload() {
    this.load.spritesheet("tinytown", "/assets/tiny-town.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("complete-house", "/assets/village-logo.png");
  }

  create() {
    this.drawTerrain();
    this.spawnDecorations();
    this.spawnAnimals();
    this.renderBuildings();
    this.setupCameraControls();

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this.drawTerrain();
      this.spawnDecorations();
      this.spawnAnimals();
      this.renderBuildings();
    });

    this.events.on("updateGroups", (newGroups: Group[]) => {
      this.groups = newGroups;
      this.renderBuildings();
    });
  }

  // ─────────────────────────────────────────────
  // TERRAIN
  // ─────────────────────────────────────────────
  private drawTerrain() {
    if (this.terrainGraphics) this.terrainGraphics.destroy();

    const { width, height } = this.scale;
    const g = this.add.graphics();
    this.terrainGraphics = g;
    g.setDepth(0);

    // Soft grass
    g.fillStyle(0x4caf50, 1);
    g.fillRect(0, 0, width, height);

    // Checker grass texture
    g.fillStyle(0x43a047, 0.35);
    const tile = 32;
    for (let x = 0; x < width; x += tile) {
      for (let y = 0; y < height; y += tile) {
        if ((x / tile + y / tile) % 2 === 0) {
          g.fillRect(x, y, tile, tile);
        }
      }
    }

    // Dirt path
    g.fillStyle(0xc4a484, 1);
    g.fillRect(0, height / 2 - 28, width, 56);
    g.fillStyle(0xa1887f, 0.6);
    g.fillRect(0, height / 2 - 30, width, 4);
    g.fillRect(0, height / 2 + 26, width, 4);

    // Soft border
    g.fillStyle(0x2e7d32, 0.8);
    g.fillRect(0, 0, width, 8);
    g.fillRect(0, height - 8, width, 8);
  }

  // ─────────────────────────────────────────────
  // COLORFUL TREES (Stardew style)
  // ─────────────────────────────────────────────
  private spawnDecorations() {
    this.decorations.forEach((d) => d.destroy());
    this.decorations = [];

    const { width, height } = this.scale;
    const rng = (min: number, max: number) => Phaser.Math.Between(min, max);

    // Tree leaf colors (Stardew-ish)
    const leafColors = [
      0x2e7d32, // green
      0x66bb6a, // light green
      0xf48fb1, // pink
      0xffb74d, // orange
      0xfff176, // yellow
      0x81c784, // soft green
      0xef5350, // red autumn
    ];

    for (let i = 0; i < 14; i++) {
      const x = rng(40, width - 40);
      const y = rng(50, height - 50);

      // Avoid road
      if (Math.abs(y - height / 2) < 70) continue;

      const tree = this.add.container(x, y);
      tree.setDepth(2);

      // Trunk
      const trunk = this.add.rectangle(0, 10, 10, 22, 0x5d4037);
      tree.add(trunk);

      // Multiple leaf circles for fuller look
      const color = Phaser.Utils.Array.GetRandom(leafColors);
      const leaf1 = this.add.circle(0, -12, 18, color);
      const leaf2 = this.add.circle(-10, -4, 14, color);
      const leaf3 = this.add.circle(10, -4, 14, color);
      const leaf4 = this.add.circle(0, -22, 12, Phaser.Display.Color.IntegerToColor(color).lighten(20).color);

      tree.add([leaf1, leaf2, leaf3, leaf4]);
      this.decorations.push(tree);

      // Soft sway
      this.tweens.add({
        targets: tree,
        angle: Phaser.Math.Between(-3, 3),
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // Small rocks / flowers
    for (let i = 0; i < 8; i++) {
      const x = rng(30, width - 30);
      const y = rng(40, height - 40);
      if (Math.abs(y - height / 2) < 50) continue;

      const rock = this.add.ellipse(x, y, rng(8, 16), rng(6, 11), 0x90a4ae, 0.85);
      rock.setDepth(1);
      this.decorations.push(rock);
    }

    // Street lights along path
    const pathY = height / 2;
    const spacing = width / 6;
    for (let i = 1; i <= 5; i++) {
      const x = spacing * i;
      const pole = this.add.rectangle(x, pathY - 18, 5, 48, 0x78909c);
      const light = this.add.circle(x, pathY - 44, 10, 0xffeb3b);
      const glow = this.add.circle(x, pathY - 44, 16, 0xffeb3b, 0.25);
      glow.setBlendMode(Phaser.BlendModes.ADD);

      pole.setDepth(2);
      light.setDepth(2);
      glow.setDepth(2);
      this.decorations.push(pole, light, glow);
    }
  }

  // ─────────────────────────────────────────────
  // 2D ANIMALS (Chickens + Cows)
  // ─────────────────────────────────────────────
  private spawnAnimals() {
    this.animals.forEach((a) => a.destroy());
    this.animals = [];

    const { width, height } = this.scale;

    // ── Chickens ──
    for (let i = 0; i < 4; i++) {
      const startX = Phaser.Math.Between(80, width - 80);
      const startY = Phaser.Math.Between(80, height - 80);

      const chicken = this.add.container(startX, startY);
      chicken.setDepth(4);

      // Body
      const body = this.add.ellipse(0, 0, 18, 14, 0xffffff);
      // Head
      const head = this.add.circle(10, -4, 7, 0xffffff);
      // Beak
      const beak = this.add.triangle(17, -4, 0, 0, -7, -3, -7, 3, 0xff7043);
      // Comb
      const comb = this.add.triangle(10, -11, 0, 0, -4, 5, 4, 5, 0xe53935);
      // Eye
      const eye = this.add.circle(12, -5, 1.5, 0x212121);
      // Leg
      const leg = this.add.rectangle(0, 9, 3, 6, 0xffb74d);

      chicken.add([body, head, beak, comb, eye, leg]);
      this.animals.push(chicken);

      this.tweens.add({
        targets: chicken,
        x: startX + Phaser.Math.Between(-160, 160),
        y: startY + Phaser.Math.Between(-40, 40),
        duration: Phaser.Math.Between(3500, 6500),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        onYoyo: () => {
          chicken.setScale(chicken.scaleX * -1, 1); // flip
        },
        onRepeat: () => {
          chicken.setScale(Math.abs(chicken.scaleX), 1);
        },
      });
    }

    // ── Simple Cows ──
    for (let i = 0; i < 2; i++) {
      const startX = Phaser.Math.Between(100, width - 100);
      const startY = Phaser.Math.Between(100, height - 100);

      const cow = this.add.container(startX, startY);
      cow.setDepth(4);

      // Body
      const body = this.add.ellipse(0, 0, 36, 22, 0xf5f5f5);
      // Spots
      const spot1 = this.add.ellipse(-8, -2, 10, 8, 0x424242);
      const spot2 = this.add.ellipse(10, 3, 8, 6, 0x424242);
      // Head
      const head = this.add.ellipse(20, -4, 16, 14, 0xf5f5f5);
      // Horns
      const hornL = this.add.triangle(16, -14, 0, 0, -4, 6, 4, 6, 0xffecb3);
      const hornR = this.add.triangle(24, -14, 0, 0, -4, 6, 4, 6, 0xffecb3);
      // Eye
      const eye = this.add.circle(23, -6, 2, 0x212121);
      // Legs
      const leg1 = this.add.rectangle(-10, 14, 5, 10, 0x424242);
      const leg2 = this.add.rectangle(8, 14, 5, 10, 0x424242);

      cow.add([body, spot1, spot2, head, hornL, hornR, eye, leg1, leg2]);
      this.animals.push(cow);

      this.tweens.add({
        targets: cow,
        x: startX + Phaser.Math.Between(-120, 120),
        duration: Phaser.Math.Between(5000, 8000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // ─────────────────────────────────────────────
  // CAMERA
  // ─────────────────────────────────────────────
  private setupCameraControls() {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;
      this.isDragging = true;
      this.dragStart = { x: pointer.x, y: pointer.y };
      this.camStart = {
        x: this.cameras.main.scrollX,
        y: this.cameras.main.scrollY,
      };
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dx = this.dragStart.x - pointer.x;
      const dy = this.dragStart.y - pointer.y;
      this.cameras.main.scrollX = this.camStart.x + dx;
      this.cameras.main.scrollY = this.camStart.y + dy;
    });

    this.input.on("pointerup", () => {
      this.isDragging = false;
    });
  }

  // ─────────────────────────────────────────────
  // BUILDINGS (Puzzle-style stages)
  // ─────────────────────────────────────────────
  private renderBuildings() {
    this.buildingContainers.forEach((c) => c.destroy());
    this.buildingContainers = [];

    if (this.emptyStateText) {
      this.emptyStateText.destroy();
      this.emptyStateText = undefined;
    }

    const { width, height } = this.scale;

    if (this.groups.length === 0) {
      this.emptyStateText = this.add
        .text(
          width / 2,
          height / 2 - 20,
          "🏡 The Village is Empty!\n\nCreate your first group\nto start building a house.",
          {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#ffffff",
            align: "center",
            backgroundColor: "rgba(10, 30, 15, 0.85)",
            padding: { x: 24, y: 18 },
          }
        )
        .setOrigin(0.5)
        .setDepth(20);

      this.tweens.add({
        targets: this.emptyStateText,
        alpha: 0.75,
        duration: 1300,
        yoyo: true,
        repeat: -1,
      });
      return;
    }

    const isMobile = width <= 1024;
    const usableWidth = isMobile
      ? Math.max(260, width - 40)
      : Math.max(300, width - 400);
    const cols = isMobile
      ? Math.min(2, Math.max(1, Math.floor(usableWidth / 150)))
      : Math.min(4, Math.max(1, Math.floor(usableWidth / 220)));
    const cellWidth = usableWidth / cols;
    const startX = isMobile ? (width - cols * cellWidth) / 2 : 50;
    const startY = isMobile ? 100 : 120;
    const rowHeight = isMobile ? 145 : 165;

    this.groups.forEach((group, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * cellWidth + cellWidth / 2;
      const y = startY + row * rowHeight;

      const container = this.createBuildingObject(group, x, y);
      this.buildingContainers.push(container);
    });
  }

  private calcProgress(group: Group): number {
    const members = Object.values(group.members ?? {});
    if (members.length === 0) return 0;

    let total = 0n;
    let paid = 0n;

    for (const m of members) {
      const share = BigInt(m.share?.toString() ?? "0");
      total += share;
      if (m.paid) paid += share;
    }

    if (total === 0n) return 0;
    return Number((paid * 100n) / total);
  }

  private createBuildingObject(
    group: Group,
    x: number,
    y: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(5);

    const isSettled = group.status === "Settled";
    const pct = isSettled ? 100 : this.calcProgress(group);

    // Stage (puzzle style)
    // 0%     → empty dirt plot
    // 1-49%  → foundation
    // 50-99% → walls + roof frame
    // 100%   → finished house
    const stage = pct >= 100 ? 3 : pct >= 50 ? 2 : pct > 0 ? 1 : 0;

    // Shadow
    const shadow = this.add.ellipse(0, 34, 80, 22, 0x000000, 0.28);
    container.add(shadow);

    // ── Puzzle-style building ──
    const g = this.add.graphics();

    if (stage === 0) {
      // Empty dirt plot
      g.fillStyle(0x6d4c41, 0.85);
      g.fillRect(-30, -10, 60, 40);
      g.lineStyle(2, 0x8d6e63, 1);
      g.strokeRect(-30, -10, 60, 40);
      // Plot marker
      g.lineStyle(1, 0xa1887f, 0.6);
      g.strokeRect(-24, -4, 48, 28);
    } else if (stage === 1) {
      // Foundation (stone blocks)
      g.fillStyle(0x78909c, 1);
      g.fillRect(-32, 0, 64, 28);
      g.lineStyle(2, 0x546e7a, 1);
      g.strokeRect(-32, 0, 64, 28);
      // Block lines
      for (let i = -32; i < 32; i += 16) {
        g.lineBetween(i, 0, i, 28);
      }
      g.lineBetween(-32, 14, 32, 14);
    } else if (stage === 2) {
      // Walls + scaffolding
      // Foundation
      g.fillStyle(0x78909c, 1);
      g.fillRect(-32, 8, 64, 20);
      // Wooden walls
      g.fillStyle(0xffcc80, 1);
      g.fillRect(-28, -28, 56, 40);
      g.lineStyle(2, 0x8d6e63, 1);
      g.strokeRect(-28, -28, 56, 40);
      // Windows
      g.fillStyle(0x81d4fa, 0.85);
      g.fillRect(-18, -18, 12, 12);
      g.fillRect(6, -18, 12, 12);
      // Scaffolding poles
      g.lineStyle(3, 0xddaa54, 0.8);
      g.lineBetween(-36, -36, -36, 28);
      g.lineBetween(36, -36, 36, 28);
      g.lineBetween(-36, -20, 36, -20);
    } else {
      // Finished house
      // Foundation
      g.fillStyle(0x5d4037, 1);
      g.fillRect(-32, 10, 64, 22);
      // Walls
      g.fillStyle(0xfff3e0, 1);
      g.fillRect(-28, -24, 56, 38);
      // Windows
      g.fillStyle(0x81d4fa, 1);
      g.fillRect(-18, -14, 12, 12);
      g.fillRect(6, -14, 12, 12);
      // Door
      g.fillStyle(0x6d4c41, 1);
      g.fillRect(-8, -2, 16, 24);
      // Roof
      g.fillStyle(0xc62828, 1);
      g.fillTriangle(0, -46, -36, -20, 36, -20);
      // Golden banner
      g.fillStyle(0xffd700, 1);
      g.fillRect(-18, -52, 36, 8);
    }

    container.add(g);

    // Optional complete-house sprite overlay when settled
    if (stage === 3 && this.textures.exists("complete-house")) {
      const glow = this.add.ellipse(0, 0, 92, 92, 0xffd700, 0.22);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      container.add(glow);

      const sprite = this.add.image(0, -4, "complete-house");
      sprite.setDisplaySize(62, 62);
      container.add(sprite);
    }

    // Name badge
    const shortName = (group.name ?? "Group").slice(0, 13);
    const label = this.add
      .text(0, -58, `#${group.id} ${shortName}`, {
        fontFamily: "monospace",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "rgba(10, 20, 12, 0.82)",
        padding: { x: 7, y: 3 },
      })
      .setOrigin(0.5);
    container.add(label);

    // Status text
    const statusText =
      stage === 3
        ? "🏆 COMPLETED"
        : stage === 0
          ? "🪴 Empty Plot"
          : stage === 1
            ? `🧱 Foundation ${pct}%`
            : `🏗 Building ${pct}%`;

    const statusColor =
      stage === 3 ? "#27ae60" : stage === 0 ? "#8d6e63" : "#e67e22";

    const badge = this.add
      .text(0, 48, statusText, {
        fontFamily: "monospace",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: statusColor,
        padding: { x: 7, y: 3 },
      })
      .setOrigin(0.5);
    container.add(badge);

    // Progress bar
    if (stage < 3) {
      const barBg = this.add.rectangle(0, 62, 58, 6, 0x000000, 0.45);
      const barFill = this.add.rectangle(
        -29,
        62,
        (58 * pct) / 100,
        6,
        0x66bb6a,
        1
      );
      barFill.setOrigin(0, 0.5);
      container.add([barBg, barFill]);
    }

    // Hit area
    const hit = this.add.rectangle(0, 0, 96, 115, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    container.add(hit);

    hit.on("pointerover", () => {
      this.tweens.add({
        targets: container,
        scale: 1.12,
        duration: 130,
        ease: "Back.easeOut",
      });
    });

    hit.on("pointerout", () => {
      this.tweens.add({
        targets: container,
        scale: 1.0,
        duration: 130,
        ease: "Sine.easeOut",
      });
    });

    hit.on("pointerdown", () => {
      this.isDragging = false;
      this.tweens.add({
        targets: container,
        scale: 0.92,
        yoyo: true,
        duration: 70,
      });

      this.events.emit("selectGroup", group.id);
      window.dispatchEvent(
        new CustomEvent("villagebill:selectGroup", {
          detail: { groupId: group.id },
        })
      );
    });

    // Confetti when completed
    if (stage === 3) {
      this.time.delayedCall(150, () => this.spawnConfetti(x, y - 30));
    }

    return container;
  }

  private spawnConfetti(x: number, y: number) {
    const colors = [0xffd700, 0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf48fb1];

    for (let i = 0; i < 20; i++) {
      const p = this.add.rectangle(
        x,
        y,
        Phaser.Math.Between(4, 8),
        Phaser.Math.Between(4, 8),
        Phaser.Utils.Array.GetRandom(colors)
      );
      p.setDepth(30);

      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-70, 70),
        y: y + Phaser.Math.Between(30, 100),
        alpha: 0,
        angle: Phaser.Math.Between(-200, 200),
        duration: Phaser.Math.Between(800, 1300),
        ease: "Cubic.easeOut",
        onComplete: () => p.destroy(),
      });
    }
  }

  public updateGroups(newGroups: Group[]) {
    this.groups = newGroups;
    if (this.scene.isActive()) {
      this.renderBuildings();
    }
  }
}