The Stardew Valley wooden theme is PERFECT! I love it. Do NOT change the theme colors, fonts, or the right sidebar tabs (Groups, Create, Member, Pay).

However, we need to fix the game world and tidy up the UI layout.

Please execute these specific tasks:

### 1. Tidy Up the UI (CSS & React)
- **Top-Left Card (VillageBill)**: The text "Player: farzone..." and the "Exit" button are cramped. Add better padding, make the text smaller, and align the Exit button nicely.
- **Bottom-Left Card (Village Activity)**: The scrollbar looks weird, and the text is touching the edges. Add proper padding, adjust the max-height, and style the scrollbar to match the wooden theme.

### 2. Phaser Terrain (VillageScene.ts)
- The background is currently a flat green color. Please use the `tiny-town.png` spritesheet to draw a tiled grass background. 
- Draw a dirt path across the middle using the dirt tile frames from the spritesheet.
- Scatter a few trees and rocks (using Kenney frames) so the map feels alive.

### 3. Puzzle Building Logic (VillageScene.ts)
Implement the step-by-step building logic based on progress (totalPaid / totalShare):
- **0%**: Draw a dirt plot (use `this.add.graphics()` to draw a brown rectangle).
- **1% - 49%**: Draw a foundation (Phaser graphics, grey/brown blocks).
- **50% - 99%**: Draw half-built walls (Phaser graphics, wooden boxes/scaffolding).
- **100% (Settled)**: Add the image `this.add.image(x, y, 'complete-house')` (using `village-logo.png`). Add a slight glow behind it.
*(Remove the floating text boxes that just say "Foundation 0%" on the map. Let the visual of the building speak for itself. The React HUD already shows the progress.)*

### 4. Add Moving Animals/NPCs (VillageScene.ts)
- Add a cute walking animal (e.g., a chicken, dog, or a simple NPC character from the Kenney spritesheet).
- Use a Phaser Tween to make it randomly walk back and forth around the village so it feels "alive" and cute.

Ensure `npm run build` compiles cleanly. Let's make this village look amazing!