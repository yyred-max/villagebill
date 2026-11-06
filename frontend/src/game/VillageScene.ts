/**
 * VillageScene.ts — Stardew-style village using Kenney Tiny Town spritesheet
 */

import Phaser from "phaser";
import type { Group } from "../lib/contract";

// ─────────────────────────────────────────────
// FRAME MAP (16x16)
// ─────────────────────────────────────────────
const T = {
  // Grass
  GRASS_1: 0,
  GRASS_2: 1,
  GRASS_3: 2,

  // Path / dirt
  PATH: 33,
} as const;

export default class VillageScene extends Phaser.Scene {
  private groups: Group[] = [];
  private buildingContainers: Phaser.GameObjects.Container[] = [];
  private emptyStateText?: Phaser.GameObjects.Text;
  private terrainLayer?: Phaser.GameObjects.Group;
  private decorations: Phaser.GameObjects.GameObject[] = [];
  private animals: Phaser.GameObjects.Image[] = [];
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private camStart = { x: 0, y: 0 };

  private readonly worldWidth = 1600;
  private readonly worldHeight = 1200;
  private readonly tile = 16;

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

    for (let i = 1; i <= 8; i++) {
      this.load.image(`tree-${i}`, `/assets/tree-${i}.png`);
    }

    for (let i = 1; i <= 5; i++) {
      this.load.image(`fauna-${i}`, `/assets/fauna-${i}.png`);
    }
  }

  create() {
    this.drawTerrain();
    this.spawnDecorations();
    this.spawnAnimals();
    this.renderBuildings();
    this.setupCameraControls();

    this.cameras.main.centerOn(this.worldWidth / 2, this.worldHeight / 2);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
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
    if (this.terrainLayer) {
      this.terrainLayer.clear(true, true);
    }
    this.terrainLayer = this.add.group();

    const cols = Math.ceil(this.worldWidth / this.tile);
    const rows = Math.ceil(this.worldHeight / this.tile);
    const pathRowStart = Math.floor(rows / 2) - 2;
    const pathRowEnd = pathRowStart + 4;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * this.tile + this.tile / 2;
        const y = row * this.tile + this.tile / 2;

        let frame: number = T.GRASS_1;
        if ((col + row) % 3 === 0) frame = T.GRASS_2;
        if ((col + row) % 5 === 0) frame = T.GRASS_3;

        if (row >= pathRowStart && row <= pathRowEnd) {
          frame = T.PATH;
        }

        const tile = this.add.image(x, y, "tinytown", frame);
        tile.setDisplaySize(this.tile, this.tile);
        tile.setDepth(0);
        this.terrainLayer.add(tile);
      }
    }
  }

  // ─────────────────────────────────────────────
  // TREES
  // ─────────────────────────────────────────────
  private spawnDecorations() {
    this.decorations.forEach((d) => d.destroy());
    this.decorations = [];

    const width = this.worldWidth;
    const height = this.worldHeight;
    const rng = (min: number, max: number) => Phaser.Math.Between(min, max);

    const treeKeys = Array.from(
      { length: 8 },
      (_, index) => `tree-${index + 1}`
    );

    const spacingX = 170;
    const spacingY = 150;
    const cols = Math.floor((width - 120) / spacingX);
    const rows = Math.floor((height - 120) / spacingY);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = 60 + col * spacingX + rng(-15, 15);
        const y = 60 + row * spacingY + rng(-15, 15);

        if (Math.abs(y - height / 2) < 110) continue;
        if (rng(0, 100) < 35) continue;

        const key = Phaser.Utils.Array.GetRandom(treeKeys);
        const tree = this.add.image(x, y, key);

        tree.setOrigin(0.5, 1);
        tree.setDisplaySize(tree.width * (96 / tree.height), 96);
        tree.setDepth(y);

        this.decorations.push(tree);
      }
    }
  }

  // ─────────────────────────────────────────────
  // ANIMALS
  // ─────────────────────────────────────────────
  private spawnAnimals() {
    this.animals.forEach((animal) => animal.destroy());
    this.animals = [];

    const faunaKeys = [
      "fauna-1",
      "fauna-2",
      "fauna-3",
      "fauna-4",
      "fauna-5",
    ];

    faunaKeys.forEach((key) => {
      const startX = Phaser.Math.Between(100, this.worldWidth - 100);
      const startY = Phaser.Math.Between(100, this.worldHeight - 100);

      const animal = this.add.image(startX, startY, key);
      animal.setOrigin(0.5, 1);

      // Tinggi tampilan disamakan; lebar mengikuti rasio gambar.
      const displayHeight = 40;
      animal.setDisplaySize(
        (animal.width / animal.height) * displayHeight,
        displayHeight
      );

      animal.setDepth(startY);
      this.animals.push(animal);

      this.tweens.add({
        targets: animal,
        x: Phaser.Math.Clamp(
          startX + Phaser.Math.Between(-140, 140),
          40,
          this.worldWidth - 40
        ),
        y: Phaser.Math.Clamp(
          startY + Phaser.Math.Between(-40, 40),
          40,
          this.worldHeight - 40
        ),
        duration: Phaser.Math.Between(4500, 7500),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        onUpdate: () => animal.setDepth(animal.y),
        onYoyo: () => animal.setFlipX(true),
        onRepeat: () => animal.setFlipX(false),
      });
    });
  }
  // ─────────────────────────────────────────────
  // CAMERA
  // ─────────────────────────────────────────────
  private setupCameraControls() {
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

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
      this.cameras.main.scrollX = this.camStart.x + (this.dragStart.x - pointer.x);
      this.cameras.main.scrollY = this.camStart.y + (this.dragStart.y - pointer.y);
    });

    this.input.on("pointerup", () => {
      this.isDragging = false;
    });
  }

  // ─────────────────────────────────────────────
  // BUILDINGS
  // ─────────────────────────────────────────────
  private renderBuildings() {
    this.buildingContainers.forEach((c) => c.destroy());
    this.buildingContainers = [];

    if (this.emptyStateText) {
      this.emptyStateText.destroy();
      this.emptyStateText = undefined;
    }

    const width = this.worldWidth;
    const height = this.worldHeight;

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

    const cols = Math.min(4, Math.max(1, this.groups.length));
    const cellWidth = 280;
    const startX = width / 2 - ((cols - 1) * cellWidth) / 2;
    const startY = height / 2 - 120;
    const rowHeight = 180;

    this.groups.forEach((group, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * cellWidth;
      const y = startY + row * rowHeight;

      this.clearTreesAround(x, y);

      const container = this.createBuildingObject(group, x, y);
      this.buildingContainers.push(container);
    });
  }

  private clearTreesAround(x: number, y: number) {
    const houseWidth = 150;
    const houseHeight = 130;

    this.decorations.forEach((decoration) => {
      const tree = decoration as Phaser.GameObjects.Image;

      if (
        Math.abs(tree.x - x) < houseWidth / 2 &&
        Math.abs(tree.y - y) < houseHeight / 2
      ) {
        tree.setVisible(false);
      }
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
    const stage = pct >= 100 ? 3 : pct >= 50 ? 2 : pct > 0 ? 1 : 0;

    // Shadow
    const shadow = this.add.ellipse(0, 36, 80, 22, 0x000000, 0.28);
    container.add(shadow);

    // ── Building by stage ──
    if (stage === 0) {
      // Stage 0: Empty plot + project sign
      const g = this.add.graphics();

      // Dirt plot
      g.fillStyle(0x795548, 1);
      g.fillRoundedRect(-38, -4, 76, 44, 4);
      g.lineStyle(2, 0x5d4037, 1);
      g.strokeRoundedRect(-38, -4, 76, 44, 4);

      // Small wooden sign
      g.fillStyle(0x6d4c41, 1);
      g.fillRect(23, -40, 5, 35); // post
      g.fillStyle(0x8d6e63, 1);
      g.fillRect(8, -42, 36, 19); // board
      g.lineStyle(2, 0x4e342e, 1);
      g.strokeRect(8, -42, 36, 19);

      container.add(g);

      const signText = this.add
        .text(26, -33, "PROJECT", {
          fontFamily: "monospace",
          fontSize: "6px",
          fontStyle: "bold",
          color: "#fff3cd",
          align: "center",
        })
        .setOrigin(0.5);

      container.add(signText);
    } else if (stage === 1) {
      // Stage 1: Stone foundation + project sign
      const g = this.add.graphics();

      // Stone blocks
      const stones = [
        { x: -32, color: 0x78909c },
        { x: -11, color: 0x90a4ae },
        { x: 10, color: 0x78909c },
      ];

      stones.forEach(({ x, color }) => {
        g.fillStyle(color, 1);
        g.fillRect(x, 13, 21, 16);
        g.lineStyle(2, 0x546e7a, 1);
        g.strokeRect(x, 13, 21, 16);
      });

      // Small wooden sign stays until completion
      g.fillStyle(0x6d4c41, 1);
      g.fillRect(23, -40, 5, 35);
      g.fillStyle(0x8d6e63, 1);
      g.fillRect(8, -42, 36, 19);
      g.lineStyle(2, 0x4e342e, 1);
      g.strokeRect(8, -42, 36, 19);

      container.add(g);

      const signText = this.add
        .text(26, -33, "PROJECT", {
          fontFamily: "monospace",
          fontSize: "6px",
          fontStyle: "bold",
          color: "#fff3cd",
          align: "center",
        })
        .setOrigin(0.5);

      container.add(signText);
    } else if (stage === 2) {
      // Stage 2: Walls, red roof frame, and yellow scaffolding
      const g = this.add.graphics();

      // Stone base
      g.fillStyle(0x78909c, 1);
      g.fillRect(-34, 12, 68, 17);
      g.lineStyle(2, 0x546e7a, 1);
      g.strokeRect(-34, 12, 68, 17);

      // Wooden walls
      g.fillStyle(0xc58b52, 1);
      g.fillRect(-27, -24, 54, 36);
      g.lineStyle(2, 0x795548, 1);
      g.strokeRect(-27, -24, 54, 36);

      // Wall planks
      g.lineStyle(2, 0x9a673d, 1);
      g.lineBetween(-9, -23, -9, 11);
      g.lineBetween(9, -23, 9, 11);

      // Window openings
      g.fillStyle(0x81d4fa, 1);
      g.fillRect(-21, -14, 12, 12);
      g.fillRect(9, -14, 12, 12);
      g.lineStyle(2, 0x6d4c41, 1);
      g.strokeRect(-21, -14, 12, 12);
      g.strokeRect(9, -14, 12, 12);

      // Red roof frame
      g.lineStyle(5, 0xc62828, 1);
      g.lineBetween(-34, -24, 0, -48);
      g.lineBetween(0, -48, 34, -24);
      g.lineStyle(2, 0x7f1d1d, 1);
      g.lineBetween(-25, -27, 0, -44);
      g.lineBetween(0, -44, 25, -27);

      // Yellow scaffolding poles
      g.lineStyle(4, 0xfbc02d, 1);
      g.lineBetween(-39, -34, -39, 30);
      g.lineBetween(39, -34, 39, 30);
      g.lineBetween(-39, -17, 39, -17);
      g.lineBetween(-39, 3, 39, 3);
      g.lineBetween(-39, 23, 39, 23);

      container.add(g);
    } else {
      // Stage 3: Completed house
      const g = this.add.graphics();

      // Stone foundation
      g.fillStyle(0x78909c, 1);
      g.fillRect(-34, 13, 68, 17);
      g.lineStyle(2, 0x546e7a, 1);
      g.strokeRect(-34, 13, 68, 17);

      // House walls
      g.fillStyle(0xffe0b2, 1);
      g.fillRect(-29, -23, 58, 37);
      g.lineStyle(2, 0x8d6e63, 1);
      g.strokeRect(-29, -23, 58, 37);

      // Roof
      g.fillStyle(0xb71c1c, 1);
      g.fillTriangle(0, -51, -37, -21, 37, -21);
      g.lineStyle(2, 0x7f1d1d, 1);
      g.lineBetween(-37, -21, 37, -21);

      // Windows
      g.fillStyle(0x81d4fa, 1);
      g.fillRect(-21, -14, 12, 12);
      g.fillRect(9, -14, 12, 12);
      g.lineStyle(2, 0x6d4c41, 1);
      g.strokeRect(-21, -14, 12, 12);
      g.strokeRect(9, -14, 12, 12);

      // Door
      g.fillStyle(0x6d4c41, 1);
      g.fillRect(-6, -3, 12, 17);
      g.lineStyle(2, 0x4e342e, 1);
      g.strokeRect(-6, -3, 12, 17);
      g.fillStyle(0xffd54f, 1);
      g.fillCircle(3, 6, 1.5);

      container.add(g);

      // Golden aura
      const glow = this.add.ellipse(0, -10, 100, 90, 0xffd700, 0.22);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      container.add(glow);
    }

    // Name badge
    const shortName = (group.name ?? "Group").slice(0, 13);
    const label = this.add
      .text(0, -58, `#${group.id} ${shortName}`, {
        fontFamily: "monospace",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "rgba(10, 20, 12, 0.85)",
        padding: { x: 7, y: 3 },
      })
      .setOrigin(0.5);
    container.add(label);

    // Status
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

    if (stage === 3) {
      this.time.delayedCall(120, () => this.spawnConfetti(x, y - 30));
    }

    return container;
  }

  private spawnConfetti(x: number, y: number) {
    const colors = [0xffd700, 0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf48fb1];
    for (let i = 0; i < 18; i++) {
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