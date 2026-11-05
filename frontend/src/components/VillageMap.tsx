/**
 * VillageMap.tsx — Full-Screen React wrapper for the Phaser 3 Village Canvas.
 *
 * Renders Phaser as a full-viewport canvas background (z-index: 0),
 * allowing floating HUD panels to sit on top with pointer-events.
 */

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import VillageScene from "../game/VillageScene";
import type { Group } from "../lib/contract";

interface Props {
  groups: Group[];
  selectedGroupId?: number | null;
  onSelectGroup?: (groupId: number) => void;
}

export default function VillageMap({ groups, onSelectGroup }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Phaser 3 Full-Screen Game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#2e7d32",
      pixelArt: true,
      scene: [VillageScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Send initial groups to scene once ready
    game.events.once("ready", () => {
      const scene = game.scene.getScene("VillageScene") as VillageScene;
      if (scene) {
        scene.updateGroups(groups);
      }
    });

    // Listen for village building click events from Phaser
    const handleSelectEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ groupId: number }>;
      if (customEvent.detail && onSelectGroup) {
        onSelectGroup(customEvent.detail.groupId);
      }
    };

    window.addEventListener("villagebill:selectGroup", handleSelectEvent);

    return () => {
      window.removeEventListener("villagebill:selectGroup", handleSelectEvent);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Reactively sync group updates to active Phaser scene
  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene("VillageScene") as VillageScene;
      if (scene && scene.scene.isActive()) {
        scene.updateGroups(groups);
      }
    }
  }, [groups]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    />
  );
}
