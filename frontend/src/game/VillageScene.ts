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

  // Trees (perkiraan dari sheet kamu)
  TREE_ORANGE: 4,
  TREE_PINE: 5,
  TREE_BUSH: 6,
  TREE_TALL_PINE: 7,
  TREE_ROUND: 8,
  TREE_YELLOW: 9,

  // Path / dirt
  PATH: 33,

  // Building parts (perkiraan)
  FOUNDATION: 36,
} as const;

export default class VillageScene extends Phaser.Scene {
  private groups: Group[] = [];
  private buildingContainers: Phaser.GameObjects.Container[] = [];
  private emptyStateText?: Phaser.GameObjects.Text;
  private terrainLayer?: Phaser.GameObjects.Group;
  private decorations: Phaser.GameObjects.GameObject[] = [];
  private animals: Phaser.GameObjects.Container[] = [];
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

    // PERHATIAN: Pastikan kamu punya file tree-1.png s/d tree-8.png di public/assets/
    // Jika tidak ada, ganti pemanggilan spritesheet pohon ini dengan Phaser Graphics.
    for (let i = 1; i <= 8; i++) {
      this.load.image(`tree-${i}`, `/assets/tree-${i}.png`);
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

        // Path di tengah
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
    const rng = (min: number, max: number) =>
      Phaser.Math.Between(min, max);

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

        // Kosongkan area jalan di tengah.
        if (Math.abs(y - height / 2) < 110) continue;

        // Sisakan beberapa celah.
        if (rng(0, 100) < 35) continue;

        const key = Phaser.Utils.Array.GetRandom(treeKeys);
        const tree = this.add.image(x, y, key);

        tree.setOrigin(0.5, 1);
        tree.setDisplaySize(
          tree.width * (96 / tree.height),
          96
        );
        tree.setDepth(y);

        this.decorations.push(tree);
      }
    }
  }

  // ─────────────────────────────────────────────
  // ANIMALS
  // ─────────────────────────────────────────────
  private spawnAnimals() {
    this.animals.forEach((a) => a.destroy());
    this.animals = [];

    const width = this.worldWidth;
    const height = this.worldHeight;

    // Chickens
    for (let i = 0; i < 5; i++) {
      const startX = Phaser.Math.Between(100, width - 100);
      const startY = Phaser.Math.Between(100, height - 100);

      const chicken = this.add.container(startX, startY);
      chicken.setDepth(4);

      const body = this.add.ellipse(0, 0, 18, 14, 0xffffff);
      const head = this.add.circle(10, -4, 7, 0xffffff);
      const beak = this.add.triangle(17, -4, 0, 0, -7, -3, -7, 3, 0xff7043);
      const comb = this.add.triangle(10, -11, 0, 0, -4, 5, 4, 5, 0xe53935);
      const eye = this.add.circle(12, -5, 1.5, 0x212121);
      const leg = this.add.rectangle(0, 9, 3, 6, 0xffb74d);

      chicken.add([body, head, beak, comb, eye, leg]);
      this.animals.push(chicken);

      this.tweens.add({
        targets: chicken,
        x: startX + Phaser.Math.Between(-180, 180),
        y: startY + Phaser.Math.Between(-50, 50),
        duration: Phaser.Math.Between(3500, 6500),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        onYoyo: () => chicken.setScale(chicken.scaleX * -1, 1),
        onRepeat: () => chicken.setScale(Math.abs(chicken.scaleX), 1),
      });
    }

    // Cows
    for (let i = 0; i < 3; i++) {
      const startX = Phaser.Math.Between(120, width - 120);
      const startY = Phaser.Math.Between(120, height - 120);

      const cow = this.add.container(startX, startY);
      cow.setDepth(4);

      const body = this.add.ellipse(0, 0, 36, 22, 0xf5f5f5);
      const spot1 = this.add.ellipse(-8, -2, 10, 8, 0x424242);
      const spot2 = this.add.ellipse(10, 3, 8, 6, 0x424242);
      const head = this.add.ellipse(20, -4, 16, 14, 0xf5f5f5);
      const hornL = this.add.triangle(16, -14, 0, 0, -4, 6, 4, 6, 0xffecb3);
      const hornR = this.add.triangle(24, -14, 0, 0, -4, 6, 4, 6, 0xffecb3);
      const eye = this.add.circle(23, -6, 2, 0x212121);
      const leg1 = this.add.rectangle(-10, 14, 5, 10, 0x424242);
      const leg2 = this.add.rectangle(8, 14, 5, 10, 0x424242);

      cow.add([body, spot1, spot2, head, hornL, hornR, eye, leg1, leg2]);
      this.animals.push(cow);

      this.tweens.add({
        targets: cow,
        x: startX + Phaser.Math.Between(-140, 140),
        duration: Phaser.Math.Between(5000, 8500),
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

      this.clearTreesAround(x, y); // Memanggil method dengan benar

      const container = this.createBuildingObject(group, x, y);
      this.buildingContainers.push(container);
    });
  }

  // ✅ METHOD DIPINDAHKAN KE DALAM CLASS
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
      const g = this.add.graphics();
      g.fillStyle(0x6d4c41, 0.9);
      g.fillRect(-30, -8, 60, 40);
      g.lineStyle(2, 0x8d6e63, 1);
      g.strokeRect(-30, -8, 60, 40);
      container.add(g);
    } else if (stage === 1) {
      if (this.textures.exists("tinytown")) {
        for (let i = -1; i <= 1; i++) {
          const t = this.add.image(i * 16, 8, "tinytown", T.FOUNDATION);
          t.setDisplaySize(18, 18);
          container.add(t);
        }
      } else {
        const g = this.add.graphics();
        g.fillStyle(0x78909c, 1);
        g.fillRect(-32, 0, 64, 28);
        container.add(g);
      }
    } else if (stage === 2) {
      const g = this.add.graphics();
      g.fillStyle(0x78909c, 1);
      g.fillRect(-32, 10, 64, 20);
      g.fillStyle(0xffcc80, 1);
      g.fillRect(-28, -26, 56, 38);
      g.lineStyle(2, 0x8d6e63, 1);
      g.strokeRect(-28, -26, 56, 38);
      g.fillStyle(0x81d4fa, 0.8);
      g.fillRect(-18, -16, 12, 12);
      g.fillRect(6, -16, 12, 12);
      g.lineStyle(3, 0xddaa54, 0.85);
      g.lineBetween(-36, -34, -36, 28);
      g.lineBetween(36, -34, 36, 28);
      g.lineBetween(-36, -18, 36, -18);
      container.add(g);
    } else {
      if (this.textures.exists("tinytown")) {
        for (let i = -1; i <= 1; i++) {
          const base = this.add.image(i * 16, 14, "tinytown", T.FOUNDATION);
          base.setDisplaySize(18, 16);
          container.add(base);
        }
      }

      const g = this.add.graphics();
      g.fillStyle(0xfff3e0, 1);
      g.fillRect(-28, -22, 56, 36);
      g.fillStyle(0x81d4fa, 1);
      g.fillRect(-18, -12, 12, 12);
      g.fillRect(6, -12, 12, 12);
      g.fillStyle(0x6d4c41, 1);
      g.fillRect(-8, 0, 16, 22);
      g.fillStyle(0xc62828, 1);
      g.fillTriangle(0, -44, -34, -18, 34, -18);
      g.fillStyle(0xffd700, 1);
      g.fillRect(-16, -50, 32, 7);
      container.add(g);

      const glow = this.add.ellipse(0, -8, 88, 70, 0xffd700, 0.18);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      container.add(glow);
    }

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