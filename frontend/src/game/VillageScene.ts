/**
 * VillageScene.ts — Full-Screen Responsive Phaser 3 Game Scene.
 *
 * Implements:
 *  - Dynamic viewport resizing (`Phaser.Scale.RESIZE`)
 *  - Lush 2D pixel terrain across the entire window
 *  - Responsive grid layout for village houses
 *  - Click & hover animations with custom event dispatching
 *  - Pan & drag camera controls
 */

import Phaser from "phaser";
import type { Group } from "../lib/contract";

export default class VillageScene extends Phaser.Scene {
  private groups: Group[] = [];
  private buildingContainers: Phaser.GameObjects.Container[] = [];
  private emptyStateText?: Phaser.GameObjects.Text;
  private terrainGraphics?: Phaser.GameObjects.Graphics;
  private decorations: Phaser.GameObjects.GameObject[] = [];
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
    this.load.image("building", "/assets/village-logo.png");
  }

  create() {
    this.drawTerrain();
    this.spawnDecorations();
    this.renderBuildings();
    this.setupCameraControls();

    // Listen for window resize from Phaser's RESIZE scale mode
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this.drawTerrain();
      this.spawnDecorations();
      this.renderBuildings();
    });

    this.events.on("updateGroups", (newGroups: Group[]) => {
      this.groups = newGroups;
      this.renderBuildings();
    });
  }

  // ─────────────────────────────────────────────
  // TERRAIN (Full Viewport)
  // ─────────────────────────────────────────────
  private drawTerrain() {
    if (this.terrainGraphics) {
      this.terrainGraphics.destroy();
    }

    const { width, height } = this.scale;
    const g = this.add.graphics();
    this.terrainGraphics = g;
    g.setDepth(0);

    // Deep forest grass base
    g.fillStyle(0x2e7d32, 1);
    g.fillRect(0, 0, width, height);

    // Soft checker tiles for retro depth
    g.fillStyle(0x388e3c, 0.4);
    const tile = 32;
    for (let x = 0; x < width; x += tile) {
      for (let y = 0; y < height; y += tile) {
        if ((x / tile + y / tile) % 2 === 0) {
          g.fillRect(x, y, tile, tile);
        }
      }
    }

    // Cobblestone / Dirt village paths
    const pathY = height / 2;
    g.fillStyle(0xc4a484, 0.65);
    g.fillRect(0, pathY - 24, width, 48);

    // Path borders
    g.fillStyle(0xa1887f, 0.5);
    g.fillRect(0, pathY - 26, width, 3);
    g.fillRect(0, pathY + 23, width, 3);

    // Soft water pond or stream in top-left
    g.fillStyle(0x1976d2, 0.7);
    g.fillRoundedRect(30, 20, 160, 50, 16);
    g.fillStyle(0x42a5f5, 0.5);
    g.fillRoundedRect(36, 26, 148, 38, 12);
  }

  // ─────────────────────────────────────────────
  // DECORATIONS (Trees, Flowers, Rocks)
  // ─────────────────────────────────────────────
  private spawnDecorations() {
    this.decorations.forEach((d) => d.destroy());
    this.decorations = [];

    const { width, height } = this.scale;
    const rng = (min: number, max: number) => Phaser.Math.Between(min, max);

    // Clustered Trees
    for (let i = 0; i < 14; i++) {
      const x = rng(50, width - 50);
      const y = rng(40, height - 40);

      // Avoid blocking the main road
      if (Math.abs(y - height / 2) < 60) continue;

      const tree = this.add.container(x, y);

      // Trunk
      const trunk = this.add.rectangle(0, 10, 10, 22, 0x5d4037);
      // Leaves (layered)
      const leaves = this.add.circle(0, -6, 20, 0x1b5e20);
      const leaves2 = this.add.circle(-10, 2, 14, 0x2e7d32);
      const leaves3 = this.add.circle(10, 2, 14, 0x388e3c);

      tree.add([trunk, leaves, leaves2, leaves3]);
      tree.setDepth(1);
      this.decorations.push(tree);
    }

    // Rocks & Wildflowers
    for (let i = 0; i < 10; i++) {
      const x = rng(40, width - 40);
      const y = rng(40, height - 40);
      if (Math.abs(y - height / 2) < 45) continue;

      const rock = this.add.ellipse(x, y, rng(12, 22), rng(8, 14), 0x78909c, 0.75);
      rock.setDepth(1);
      this.decorations.push(rock);
    }
  }

  // ─────────────────────────────────────────────
  // CAMERA (Pan & Drag Controls)
  // ─────────────────────────────────────────────
  private setupCameraControls() {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;
      this.isDragging = true;
      this.dragStart = { x: pointer.x, y: pointer.y };
      this.camStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
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
  // BUILDINGS (Responsive Grid)
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
          "🏡 The Village is Empty!\n\nUse the sidebar to create your first group\nand build a house on-chain.",
          {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#ffffff",
            align: "center",
            backgroundColor: "rgba(10, 20, 15, 0.85)",
            padding: { x: 24, y: 18 },
          }
        )
        .setOrigin(0.5)
        .setDepth(20);

      this.tweens.add({
        targets: this.emptyStateText,
        alpha: 0.7,
        duration: 1200,
        yoyo: true,
        repeat: -1,
      });
      return;
    }

    // Available width accounts for left HUD & right sidebar space
    const usableWidth = Math.max(300, width - 420); // space left of the right sidebar
    const cols = Math.min(4, Math.max(1, Math.floor(usableWidth / 220)));
    const cellWidth = usableWidth / cols;
    const startX = 60;
    const startY = 120;
    const rowHeight = 160;

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
    const stage = pct >= 100 ? 2 : pct >= 50 ? 1 : 0;

    // Drop shadow
    const shadow = this.add.ellipse(0, 32, 78, 22, 0x000000, 0.3);
    container.add(shadow);

    // Building visual
    if (this.textures.exists("building")) {
      const sprite = this.add.sprite(0, 0, "building");
      sprite.setDisplaySize(64, 64);

      if (stage === 0) {
        sprite.setTint(0x8d6e63);
        sprite.setAlpha(0.9);
      } else if (stage === 1) {
        sprite.setTint(0xffcc80);
        sprite.setAlpha(0.95);
      } else {
        sprite.clearTint();
        sprite.setAlpha(1);
      }
      container.add(sprite);
    }

    // Name badge (Top)
    const shortName = (group.name ?? "Group").slice(0, 14);
    const label = this.add
      .text(0, -52, `#${group.id} ${shortName}`, {
        fontFamily: "monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "rgba(10, 15, 12, 0.85)",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);
    container.add(label);

    // Status / Progress badge (Bottom)
    const statusText = isSettled
      ? "🏆 COMPLETED"
      : stage === 0
        ? `🧱 Foundation ${pct}%`
        : stage === 1
          ? `🏗 Walls ${pct}%`
          : `🏠 ${pct}%`;

    const statusColor = isSettled
      ? "#27ae60"
      : stage === 0
        ? "#8d6e63"
        : "#e67e22";

    const badge = this.add
      .text(0, 48, statusText, {
        fontFamily: "monospace",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: statusColor,
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);
    container.add(badge);

    // Mini progress bar under building
    if (!isSettled) {
      const barBg = this.add.rectangle(0, 64, 60, 6, 0x000000, 0.5);
      const barFill = this.add.rectangle(
        -30 + (60 * pct) / 200,
        64,
        (60 * pct) / 100,
        6,
        0x66bb6a,
        1
      );
      barFill.setOrigin(0, 0.5);
      container.add([barBg, barFill]);
    }

    // Interactive Hit Area
    const hit = this.add.rectangle(0, 0, 96, 110, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    container.add(hit);

    // Hover effect
    hit.on("pointerover", () => {
      this.tweens.add({
        targets: container,
        scale: 1.12,
        duration: 140,
        ease: "Back.easeOut",
      });
    });

    hit.on("pointerout", () => {
      this.tweens.add({
        targets: container,
        scale: 1.0,
        duration: 140,
        ease: "Sine.easeOut",
      });
    });

    // Click handler
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

    return container;
  }

  // ─────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────
  public updateGroups(newGroups: Group[]) {
    this.groups = newGroups;
    if (this.scene.isActive()) {
      this.renderBuildings();
    }
  }
}
