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
    // Load Kenney Tiny Town spritesheet (16x16 tiles)
    this.load.spritesheet("tinytown", "/assets/tiny-town.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    // Load complete house image
    this.load.image("complete-house", "/assets/village-logo.png");
  }

  create() {
    this.drawTerrain();
    this.spawnDecorations();
    this.renderBuildings();
    this.setupCameraControls();
    this.spawnAnimals();

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
    const tileSize = 32; // Scale up 16x16 tiles to 32x32 for visibility
    
    // Create a container for terrain tiles
    const terrainContainer = this.add.container(0, 0);
    terrainContainer.setDepth(0);
    this.terrainGraphics = terrainContainer as any;

    if (!this.textures.exists("tinytown")) {
      return; // Spritesheet not loaded yet
    }

    // Grass base layer (frame 1 = grass tile in Kenney Tiny Town)
    const grassFrames = [1, 2, 17, 18]; // Various grass tiles
    for (let x = 0; x < width; x += tileSize) {
      for (let y = 0; y < height; y += tileSize) {
        const frame = Phaser.Math.RND.pick(grassFrames);
        const tile = this.add.image(x + tileSize / 2, y + tileSize / 2, "tinytown", frame);
        tile.setDisplaySize(tileSize, tileSize);
        tile.setDepth(0);
        terrainContainer.add(tile);
      }
    }

    // Dirt path across the middle (frame 32 = dirt/path in Kenney Tiny Town)
    const pathY = height / 2;
    const pathHeight = 96;
    const dirtFrames = [32, 33, 48, 49]; // Dirt/path tiles
    
    for (let x = 0; x < width; x += tileSize) {
      for (let y = pathY - pathHeight / 2; y < pathY + pathHeight / 2; y += tileSize) {
        const frame = Phaser.Math.RND.pick(dirtFrames);
        const tile = this.add.image(x + tileSize / 2, y + tileSize / 2, "tinytown", frame);
        tile.setDisplaySize(tileSize, tileSize);
        tile.setDepth(0);
        terrainContainer.add(tile);
      }
    }

    // Small water feature in top-left (frame 80 = water in Kenney Tiny Town)
    const waterFrames = [80, 81, 96, 97];
    for (let x = 30; x < 190; x += tileSize) {
      for (let y = 20; y < 70; y += tileSize) {
        const frame = Phaser.Math.RND.pick(waterFrames);
        const tile = this.add.image(x + tileSize / 2, y + tileSize / 2, "tinytown", frame);
        tile.setDisplaySize(tileSize, tileSize);
        tile.setDepth(0);
        terrainContainer.add(tile);
      }
    }
  }

  // ─────────────────────────────────────────────
  // DECORATIONS (Trees, Flowers, Rocks)
  // ─────────────────────────────────────────────
  private spawnDecorations() {
    this.decorations.forEach((d) => d.destroy());
    this.decorations = [];

    const { width, height } = this.scale;
    const rng = (min: number, max: number) => Phaser.Math.Between(min, max);

    if (!this.textures.exists("tinytown")) {
      return; // Spritesheet not loaded yet
    }

    // Clustered Trees from Kenney pack (frames 64-67 = trees in Tiny Town)
    const treeFrames = [64, 65, 66, 67];
    for (let i = 0; i < 14; i++) {
      const x = rng(50, width - 50);
      const y = rng(40, height - 40);

      // Avoid blocking the main road
      if (Math.abs(y - height / 2) < 60) continue;

      const frame = Phaser.Math.RND.pick(treeFrames);
      const tree = this.add.image(x, y, "tinytown", frame);
      tree.setDisplaySize(48, 48); // Scale up for visibility
      tree.setDepth(1);
      this.decorations.push(tree);
    }

    // Rocks & decorative elements (frames 112-115 = rocks/bushes)
    const rockFrames = [112, 113, 114, 115];
    for (let i = 0; i < 10; i++) {
      const x = rng(40, width - 40);
      const y = rng(40, height - 40);
      if (Math.abs(y - height / 2) < 45) continue;

      const frame = Phaser.Math.RND.pick(rockFrames);
      const rock = this.add.image(x, y, "tinytown", frame);
      rock.setDisplaySize(24, 24);
      rock.setDepth(1);
      this.decorations.push(rock);
    }
  }

  // ─────────────────────────────────────────────
  // MOVING ANIMALS/NPCs
  // ─────────────────────────────────────────────
  private spawnAnimals() {
    if (!this.textures.exists("tinytown")) return;

    const { width, height } = this.scale;
    
    // Spawn 3 cute walking animals (chickens, dogs, etc.)
    const animalFrames = [192, 193, 208, 209]; // Animal sprites from Kenney
    
    for (let i = 0; i < 3; i++) {
      const frame = Phaser.Math.RND.pick(animalFrames);
      const startX = Phaser.Math.Between(100, width - 100);
      const startY = Phaser.Math.Between(100, height - 100);
      
      const animal = this.add.image(startX, startY, "tinytown", frame);
      animal.setDisplaySize(32, 32);
      animal.setDepth(3);
      
      // Random walk animation
      this.tweens.add({
        targets: animal,
        x: Phaser.Math.Between(50, width - 50),
        duration: Phaser.Math.Between(3000, 6000),
        ease: "Linear",
        yoyo: true,
        repeat: -1,
        onYoyo: () => {
          animal.setFlipX(!animal.flipX);
        },
        onRepeat: () => {
          animal.setFlipX(!animal.flipX);
        },
      });
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

    // Responsive layout: on mobile (width <= 1024), sidebar is a drawer so full screen is available
    const isMobile = width <= 1024;
    const usableWidth = isMobile ? Math.max(260, width - 40) : Math.max(300, width - 400);
    const cols = isMobile
      ? Math.min(2, Math.max(1, Math.floor(usableWidth / 150)))
      : Math.min(4, Math.max(1, Math.floor(usableWidth / 220)));
    const cellWidth = usableWidth / cols;
    const startX = isMobile ? (width - cols * cellWidth) / 2 : 50;
    const startY = isMobile ? 100 : 120;
    const rowHeight = isMobile ? 140 : 160;

    this.groups.forEach((group, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * cellWidth + cellWidth / 2;
      const y = startY + row * rowHeight;

      const container = this.createBuildingObject(group, x, y);
      this.buildingContainers.push(container);
    });
  }

  private createBuildingObject(
    group: Group,
    x: number,
    y: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(5);

    const isSettled = group.status === "Settled";
    
    // Calculate progress percentage based on paid members
    const members = Object.values(group.members ?? {});
    let totalShare = 0n;
    let paidShare = 0n;
    
    for (const m of members) {
      const share = BigInt(m.share?.toString() ?? "0");
      totalShare += share;
      if (m.paid) paidShare += share;
    }
    
    const pct = totalShare > 0n ? Number((paidShare * 100n) / totalShare) : 0;

    // Drop shadow
    const shadow = this.add.ellipse(0, 32, 78, 22, 0x000000, 0.3);
    container.add(shadow);

    // Building visual based on progress
    if (pct === 0) {
      // 0%: Dirt plot
      const g = this.add.graphics();
      g.fillStyle(0x5d4037, 0.8);
      g.fillRect(-28, -28, 56, 56);
      g.lineStyle(2, 0x8d6e63, 1);
      g.strokeRect(-28, -28, 56, 56);
      container.add(g);
    } else if (pct < 50) {
      // 1-49%: Foundation (grey/brown blocks)
      const g = this.add.graphics();
      g.fillStyle(0x78909c, 0.9);
      g.fillRect(-28, -20, 56, 40);
      g.lineStyle(2, 0x546e7a, 1);
      g.strokeRect(-28, -20, 56, 40);
      // Add some block lines
      for (let i = -28; i < 28; i += 14) {
        g.lineBetween(i, -20, i, 20);
      }
      container.add(g);
    } else if (pct < 100) {
      // 50-99%: Half-built walls (wooden boxes/scaffolding)
      const g = this.add.graphics();
      // Wooden frame
      g.fillStyle(0x8d6e63, 0.9);
      g.fillRect(-30, -35, 60, 60);
      g.lineStyle(3, 0x5d4037, 1);
      g.strokeRect(-30, -35, 60, 60);
      // Window holes
      g.fillStyle(0x000000, 0.4);
      g.fillRect(-20, -25, 15, 15);
      g.fillRect(5, -25, 15, 15);
      // Scaffolding
      g.lineStyle(2, 0xddaa54, 0.7);
      g.lineBetween(-35, -40, -35, 30);
      g.lineBetween(35, -40, 35, 30);
      container.add(g);
    } else {
      // 100% (Settled): Complete house with glow
      if (this.textures.exists("complete-house")) {
        // Glow effect
        const glow = this.add.ellipse(0, 0, 90, 90, 0xddaa54, 0.3);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        container.add(glow);
        
        const sprite = this.add.image(0, 0, "complete-house");
        sprite.setDisplaySize(64, 64);
        container.add(sprite);
      }
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

    // Mini progress bar under building (only if not settled)
    if (!isSettled) {
      const barBg = this.add.rectangle(0, 48, 60, 6, 0x000000, 0.5);
      const barFill = this.add.rectangle(
        -30 + (60 * pct) / 200,
        48,
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
