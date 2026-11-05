/**
 * VillageScene.ts — Phaser 3 Scene representing the 2D Village Map (PRD §5, §7 F11).
 *
 * Each SplitBill Group is rendered as a building in the village:
 *  - 0% – 49%  : Foundation only
 *  - 50% – 99% : Walls rising
 *  - 100% / Settled : Finished house + golden banner
 *
 * Progress = (sum of paid shares) / (total shares)  ← PRD requirement
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
    if (data?.groups) {
      this.groups = data.groups;
    }
  }

  preload() {
    // Optional pixel-art texture. Fallback shapes are drawn if missing.
    this.load.image("building", "/assets/village-logo.png");
  }

  create() {
    this.drawTerrain();
    this.renderBuildings();

    // React can push updates via this event
    this.events.on("updateGroups", (newGroups: Group[]) => {
      this.groups = newGroups;
      this.renderBuildings();
    });
  }

  /** Soft pixel-grass background + pathway */
  private drawTerrain() {
    const { width, height } = this.scale;
    const g = this.add.graphics();

    // Grass base
    g.fillStyle(0x388e3c, 1);
    g.fillRect(0, 0, width, height);

    // Checker texture
    g.fillStyle(0x2e7d32, 0.35);
    const tile = 32;
    for (let x = 0; x < width; x += tile) {
      for (let y = 0; y < height; y += tile) {
        if ((x / tile + y / tile) % 2 === 0) {
          g.fillRect(x, y, tile, tile);
        }
      }
    }

    // Dirt path
    g.fillStyle(0xd7ccc8, 0.55);
    g.fillRect(0, height / 2 - 16, width, 32);

    // Borders
    g.fillStyle(0x1b5e20, 0.85);
    g.fillRect(0, 0, width, 4);
    g.fillRect(0, height - 4, width, 4);
  }

  /** Clear & re-render every building */
  private renderBuildings() {
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
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: { x: 14, y: 10 },
          }
        )
        .setOrigin(0.5);
      return;
    }

    const cols = Math.min(3, Math.max(1, Math.floor(this.scale.width / 220)));
    const cellWidth = this.scale.width / cols;
    const startY = 80;
    const rowHeight = 140;

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
   * Calculate progress strictly by funds collected (PRD §5).
   * Returns 0–100.
   */
  private calcProgress(group: Group): number {
    const members = Object.values(group.members ?? {});
    if (members.length === 0) return 0;

    let total = 0n;
    let paid = 0n;

    for (const m of members) {
      // share may arrive as string (yoctoNEAR) or number
      const share = BigInt(m.share?.toString() ?? "0");
      total += share;
      if (m.paid) paid += share;
    }

    if (total === 0n) return 0;
    return Number((paid * 100n) / total); // integer %
  }

  /** Single interactive building with stage visuals */
  private createBuildingObject(
    group: Group,
    x: number,
    y: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);


    const isSettled = group.status === "Settled";
    const pct = isSettled ? 100 : this.calcProgress(group);

    // Stage based on funds %
    // 0-49  → foundation
    // 50-99 → walls
    // 100   → completed
    const stage = pct >= 100 ? 2 : pct >= 50 ? 1 : 0;

    // 1. Shadow
    const shadow = this.add.ellipse(0, 28, 70, 22, 0x000000, 0.28);
    container.add(shadow);

    // 2. Building visual (sprite or procedural fallback)
    let building: Phaser.GameObjects.GameObject;

    if (this.textures.exists("building")) {
      const sprite = this.add.sprite(0, 0, "building");
      sprite.setDisplaySize(56, 56);

      // Stage tinting
      if (stage === 0) {
        sprite.setTint(0x8d6e63); // brown foundation
        sprite.setAlpha(0.85);
      } else if (stage === 1) {
        sprite.setTint(0xffcc80); // warm walls
        sprite.setAlpha(0.95);
      } else {
        // completed – full color + slight glow
        sprite.clearTint();
        sprite.setAlpha(1);
      }

      building = sprite;
    } else {
      // Procedural fallback (PRD §7) – coloured rectangles
      const g = this.add.graphics();
      if (stage === 0) {
        // Foundation only
        g.fillStyle(0x5d4037, 1);
        g.fillRect(-28, 8, 56, 20);
      } else if (stage === 1) {
        // Foundation + walls
        g.fillStyle(0x5d4037, 1);
        g.fillRect(-28, 8, 56, 20);
        g.fillStyle(0xffcc80, 1);
        g.fillRect(-24, -20, 48, 30);
      } else {
        // Full house + roof
        g.fillStyle(0x5d4037, 1);
        g.fillRect(-28, 8, 56, 20);
        g.fillStyle(0xfff3e0, 1);
        g.fillRect(-24, -20, 48, 30);
        g.fillStyle(0xc62828, 1);
        g.fillTriangle(0, -38, -30, -18, 30, -18);
      }
      building = g;
    }
    container.add(building);

    // 3. Name badge
    const shortName = (group.name ?? "Group").slice(0, 14);
    const label = this.add
      .text(0, -42, `#${group.id} ${shortName}`, {
        fontFamily: "monospace",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.75)",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5);
    container.add(label);

    // 4. Progress / status badge
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
      .text(0, 42, statusText, {
        fontFamily: "monospace",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: statusColor,
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5);
    container.add(badge);

    // 5. Interaction – scale the whole container (cleaner)
    // Make a hit area larger than the visual
    const hit = this.add.rectangle(0, 0, 80, 90, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    container.add(hit);

    hit.on("pointerover", () => {
      this.tweens.add({
        targets: container,
        scale: 1.12,
        duration: 140,
        ease: "Sine.easeOut",
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

    hit.on("pointerdown", () => {
      this.tweens.add({
        targets: container,
        scale: 0.94,
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

  /** Public method for React wrapper */
  public updateGroups(newGroups: Group[]) {
    this.groups = newGroups;
    if (this.scene.isActive()) {
      this.renderBuildings();
    }
  }
}