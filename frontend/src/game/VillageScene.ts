/**
 * VillageScene.ts — Phaser 3 Scene representing the 2D Village Map (PRD §5, §7 F11).
 *
 * Each SplitBill Group is rendered as a building in the village:
 *  - 0% - 99% progress: Open building project with live payment meter
 *  - 100% / Settled: Finished village house with golden victory banner
 *
 * Clickable buildings emit 'selectGroup' events back to React.
 */

import Phaser from "phaser";
import type { Group } from "../lib/contract";

export default class VillageScene extends Phaser.Scene {
  private groups: Group[] = [];
  private buildingContainers: Phaser.GameObjects.Container[] = [];
  private emptyStateText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "VillageScene" });
  }

  init(data: { groups?: Group[] }) {
    if (data && data.groups) {
      this.groups = data.groups;
    }
  }

  preload() {
    // Load village building pixel art texture
    this.load.image("building", "/assets/village-logo.png");
  }

  create() {
    // 1. Draw decorative grassy terrain with pathways
    this.drawTerrain();

    // 2. Render buildings based on initial data
    this.renderBuildings();

    // 3. Listen for dynamic updates from React
    this.events.on("updateGroups", (newGroups: Group[]) => {
      this.groups = newGroups;
      this.renderBuildings();
    });
  }

  /**
   * Draw soft pixel-grass background and paths
   */
  private drawTerrain() {
    const { width, height } = this.scale;
    const g = this.add.graphics();

    // Grass base
    g.fillStyle(0x388e3c, 1); // Rich grass green
    g.fillRect(0, 0, width, height);

    // Subtle grass texture / grid accents
    g.fillStyle(0x2e7d32, 0.4);
    const tileSize = 32;
    for (let x = 0; x < width; x += tileSize) {
      for (let y = 0; y < height; y += tileSize) {
        if ((x / tileSize + y / tileSize) % 2 === 0) {
          g.fillRect(x, y, tileSize, tileSize);
        }
      }
    }

    // Dirt pathway through the village
    g.fillStyle(0xd7ccc8, 0.6);
    g.fillRect(0, height / 2 - 16, width, 32);

    // River or stone border on top
    g.fillStyle(0x1b5e20, 0.8);
    g.fillRect(0, 0, width, 4);
    g.fillRect(0, height - 4, width, 4);
  }

  /**
   * Render or re-render houses in a clean grid
   */
  private renderBuildings() {
    // Clear previous containers
    this.buildingContainers.forEach((c) => c.destroy());
    this.buildingContainers = [];

    if (this.emptyStateText) {
      this.emptyStateText.destroy();
      this.emptyStateText = undefined;
    }

    if (this.groups.length === 0) {
      this.emptyStateText = this.add
        .text(
          this.scale.width / 2,
          this.scale.height / 2,
          "🏡 Empty Village\nCreate your first group to build a house!",
          {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#ffffff",
            align: "center",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            padding: { x: 14, y: 10 },
          }
        )
        .setOrigin(0.5);
      return;
    }

    const cols = Math.min(3, Math.max(1, Math.floor(this.scale.width / 220)));
    const cellWidth = this.scale.width / cols;
    const startY = 80;
    const rowHeight = 130;

    this.groups.forEach((group, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = col * cellWidth + cellWidth / 2;
      const y = startY + row * rowHeight;

      const container = this.createBuildingObject(group, x, y);
      this.buildingContainers.push(container);
    });
  }

  /**
   * Creates a single interactive building with labels & progress
   */
  private createBuildingObject(group: Group, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const membersList = Object.values(group.members);
    const paidCount = membersList.filter((m) => m.paid).length;
    const totalCount = membersList.length;
    const isSettled = group.status === "Settled";
    const pct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

    // 1. Plot / Foundation Shadow
    const shadow = this.add.ellipse(0, 24, 64, 20, 0x000000, 0.3);
    container.add(shadow);

    // 2. House Sprite
    const sprite = this.add.sprite(0, 0, "building");
    sprite.setDisplaySize(54, 54);
    // Slight tint for unsettled building
    if (!isSettled) {
      sprite.setAlpha(0.9);
    }
    container.add(sprite);

    // 3. Name & ID Badge (top)
    const label = this.add
      .text(0, -38, `#${group.id} ${group.name.slice(0, 12)}`, {
        fontFamily: "monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5);
    container.add(label);

    // 4. Status / Progress Badge (bottom)
    const statusText = isSettled ? "🏆 COMPLETED" : `${paidCount}/${totalCount} (${pct}%)`;
    const statusColor = isSettled ? "#27ae60" : "#e67e22";

    const badge = this.add
      .text(0, 36, statusText, {
        fontFamily: "monospace",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: statusColor,
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5);
    container.add(badge);

    // 5. Interactivity: Click & Hover
    sprite.setInteractive({ useHandCursor: true });

    sprite.on("pointerover", () => {
      this.tweens.add({
        targets: [sprite, label, badge],
        scale: 1.1,
        duration: 150,
      });
    });

    sprite.on("pointerout", () => {
      this.tweens.add({
        targets: [sprite, label, badge],
        scale: 1.0,
        duration: 150,
      });
    });

    sprite.on("pointerdown", () => {
      // Pulse effect
      this.tweens.add({
        targets: sprite,
        scale: 0.95,
        yoyo: true,
        duration: 80,
      });

      // Emit event through Phaser and Window for React integration
      this.events.emit("selectGroup", group.id);
      window.dispatchEvent(
        new CustomEvent("villagebill:selectGroup", { detail: { groupId: group.id } })
      );
    });

    return container;
  }

  /**
   * External method callable by React wrapper to push new group list
   */
  public updateGroups(newGroups: Group[]) {
    this.groups = newGroups;
    if (this.scene.isActive()) {
      this.renderBuildings();
    }
  }
}

