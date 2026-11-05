/**
 * VillageMap.tsx — React wrapper for the Phaser 3 Village Canvas (PRD §4 F11, §6.1, §7).
 *
 * Responsibilities:
 *  - Initializes and mounts the Phaser 3 game inside a container div.
 *  - Bridges React state (`groups`) into `VillageScene`.
 *  - Listens for building click events and notifies parent (`onSelectGroup`).
 *  - Completely cleans up the Phaser game instance on unmount to prevent leaks.
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

export default function VillageMap({ groups, selectedGroupId, onSelectGroup }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Phaser 3 Game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 600,
      height: 260,
      backgroundColor: "#2e7d32",
      pixelArt: true,
      scene: [VillageScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    // Instantiate Phaser
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

  // Pass reactive group updates to the active Phaser scene
  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene("VillageScene") as VillageScene;
      if (scene && scene.scene.isActive()) {
        scene.updateGroups(groups);
      }
    }
  }, [groups]);

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>🎮</span>
          <strong style={{ fontSize: 14, color: "var(--text-h)" }}>Village Map (Phaser 2D)</strong>
        </div>
        {selectedGroupId && (
          <span style={selectedBadge}>
            Selected House: #{selectedGroupId}
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        style={canvasContainerStyle}
      />

      <div style={footerStyle}>
        <span>💡 Click any building in the village to focus its project details</span>
      </div>
    </div>
  );
}

// ── Inline styles ────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  border: "2px solid var(--border)",
  borderRadius: 8,
  overflow: "hidden",
  margin: "1rem auto",
  maxWidth: 600,
  background: "var(--code-bg)",
  textAlign: "left",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 12px",
  borderBottom: "1px solid var(--border)",
};

const selectedBadge: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 4,
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 600,
};

const canvasContainerStyle: React.CSSProperties = {
  width: "100%",
  height: "260px",
  position: "relative",
  overflow: "hidden",
  backgroundColor: "#2e7d32",
};

const footerStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 11,
  color: "var(--text)",
  borderTop: "1px solid var(--border)",
  display: "flex",
  justifyContent: "space-between",
};

