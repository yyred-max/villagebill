I received a design proposal to make the village look like Stardew Valley. It's a beautiful idea, but we are extremely tight on time for the NEAR Hackathon (deadline is Nov 14), and we still need to implement the NFT and XP features. Also, the proposal accidentally mentioned "Stellar SDK" (we are on NEAR).

Therefore, we will NOT rewrite the Phaser logic from scratch or add a walking character right now. Instead, we will just **upgrade the current visual assets** to use the Kenney Tiny Town (CC0) pack.

Please execute this visual upgrade:

1. **Asset Preparation:**
   - I have downloaded Kenney Tiny Town. (Assume the spritesheet is placed at `frontend/public/assets/tiny-town.png`).
   - *Note: I will place the actual PNG file myself, just write the code to use it.*

2. **Update `src/game/VillageScene.ts`:**
   - **Terrain**: Instead of the procedural green checkerboard, load a grass tile and a dirt path tile from the `tiny-town` spritesheet to create a much better-looking map.
   - **Buildings**: Keep the interactive click logic exactly as it is, but instead of rendering the `village-logo.png` for every building, use a house sprite from the Kenney pack. (If we can use different house sprites for different progress stages: Foundation, Walls, Complete, that would be amazing).
   - **Decorations**: Randomly place a few tree sprites from the Kenney pack around the map to make it feel alive.

3. **Keep Integration Intact:**
   - DO NOT touch the React integration, `window.dispatchEvent`, or the contract logic.
   - Ensure the responsiveness (resizing) still works perfectly.

Please update `VillageScene.ts` to use the new assets. Write the code assuming the spritesheet is a standard Kenney 16x16 tilemap grid. Let me know when it's ready for me to test with the actual image file.