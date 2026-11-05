The puzzle building logic is PERFECT (the glowing house for #2 Bali looks great). However, the terrain, trees, and animals are STILL completely missing. The map is just a flat green screen.

You are failing to guess the correct frame indices for the Kenney spritesheet. STOP using the spritesheet for decorations immediately.

Instead, use Phaser Graphics (`this.add.graphics()`) to draw them programmatically. This guarantees they will show up on screen.

Please implement this in `frontend/src/game/VillageScene.ts`:

### 1. Draw the Dirt Path (drawTerrain)
- Clear the flat green.
- Draw a horizontal dirt path across the middle using a brown rectangle: `fillStyle(0x8d6e63); fillRect(0, height/2 - 30, width, 60);`

### 2. Draw Trees (spawnDecorations)
- Scatter 10-15 trees around the map (avoiding the center path).
- A tree is just a brown rectangle for the trunk, and a green circle for the leaves. 
- Example code for a tree at (x,y):
  `this.add.rectangle(x, y, 10, 20, 0x5d4037);` (trunk)
  `this.add.circle(x, y - 15, 20, 0x2e7d32);` (leaves)

### 3. Draw Street Lights (spawnDecorations)
- Place 4-5 street lights along the dirt path.
- A street light is a grey rectangle (pole) and a yellow circle (light) at the top.

### 4. Draw Animals (spawnAnimals)
- Instead of loading the spritesheet, draw 3 simple chickens.
- A chicken is just a white circle for the body, a small red triangle for the beak/comb.
- Animate them walking left and right using the exact same `tweens.add` logic you already have.

### 5. Keep the Building Logic
- DO NOT touch the puzzle building logic. It works perfectly.

Make these visual changes using pure Phaser shapes. Ensure it compiles.