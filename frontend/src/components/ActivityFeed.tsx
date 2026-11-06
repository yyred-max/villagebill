/**
 * ActivityFeed.tsx — Polling-based live activity feed (PRD §4 F6, §6.4).
 *
 * Polls `get_groups()` every 10 seconds.
 * Compares current snapshot with previous snapshot to detect on-chain events:
 *  - Group created
 *  - Member added
 *  - Share updated
 *  - Member paid
 *  - Group settled
 *
 * Also pre-populates initial entries based on existing contract state so
 * users and judges see immediate context when opening the dApp.
 */

import { useState, useEffect, useRef } from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import { getGroups, type Group } from "../lib/contract";

export interface ActivityItem {
  id: string;
  type: "group_created" | "member_added" | "member_paid" | "group_settled" | "share_updated";
  title: string;
  description: string;
  timestamp: Date;
  badge: string;
  highlight?: boolean;
}

function yoctoToNear(yocto: string): string {
  try {
    const y = BigInt(yocto);
    const whole = y / BigInt(10 ** 24);
    const frac = y % BigInt(10 ** 24);
    const fracStr = frac.toString().padStart(24, "0").slice(0, 4);
    return `${whole}.${fracStr}`;
  } catch {
    return "0.0";
  }
}

// Get icon based on event type
function getIcon(type: ActivityItem["type"]): string {
  switch (type) {
    case "group_created":
      return "🏠";
    case "member_paid":
      return "💸";
    case "group_settled":
      return "🏆";
    case "member_added":
      return "👥";
    case "share_updated":
      return "📝";
    default:
      return "📌";
  }
}

interface Props {
  selector: WalletSelector;
  accountId: string | null;
  onGroupsFetched?: (groups: Group[]) => void;
}

export default function ActivityFeed({ selector, accountId, onGroupsFetched }: Props) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isCollapsed, setIsCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);
  const prevGroupsRef = useRef<Group[] | null>(null);
  const isInitialRun = useRef(true);

  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      try {
        setIsPolling(true);
        const currentGroups = await getGroups(selector);
        if (!isMounted) return;

        setLastUpdated(new Date());
        if (onGroupsFetched) {
          onGroupsFetched(currentGroups);
        }

        const prev = prevGroupsRef.current;
        const newEvents: ActivityItem[] = [];

        if (isInitialRun.current || prev === null) {
          // Initial population from on-chain state
          currentGroups.forEach((g) => {
            newEvents.push({
              id: `init-grp-${g.id}`,
              type: "group_created",
              title: `Group #${g.id} "${g.name}" active`,
              description: `Owner: ${g.owner} • Status: ${g.status}`,
              timestamp: new Date(),
              badge: "🏠 GROUP",
            });

            Object.entries(g.members).forEach(([member, m]) => {
              if (m.paid) {
                newEvents.push({
                  id: `init-paid-${g.id}-${member}`,
                  type: "member_paid",
                  title: `${member} paid their share`,
                  description: `Contributed ${yoctoToNear(m.share)} Ⓝ to #${g.id} ${g.name}`,
                  timestamp: new Date(),
                  badge: "💸 PAID",
                });
              } else {
                newEvents.push({
                  id: `init-mem-${g.id}-${member}`,
                  type: "member_added",
                  title: `${member} joined #${g.id} ${g.name}`,
                  description: `Target share: ${yoctoToNear(m.share)} Ⓝ`,
                  timestamp: new Date(),
                  badge: "👥 MEMBER",
                });
              }
            });

            if (g.status === "Settled") {
              newEvents.push({
                id: `init-settled-${g.id}`,
                type: "group_settled",
                title: `Group #${g.id} is fully settled!`,
                description: `All members paid for "${g.name}" 🏆`,
                timestamp: new Date(),
                badge: "🎉 SETTLED",
              });
            }
          });

          // Limit initial events to recent 15 entries
          setActivities(newEvents.slice(-15).reverse());
          isInitialRun.current = false;
        } else {
          // Compare prev vs current for real-time diffs
          const prevMap = new Map<number, Group>(prev.map((g) => [g.id, g]));

          for (const curr of currentGroups) {
            const old = prevMap.get(curr.id);

            if (!old) {
              // Brand new group detected
              newEvents.unshift({
                id: `grp-${curr.id}-${Date.now()}`,
                type: "group_created",
                title: `New Group #${curr.id} Created!`,
                description: `"${curr.name}" created by ${curr.owner}`,
                timestamp: new Date(),
                badge: "✨ NEW",
                highlight: true,
              });
              continue;
            }

            // Check members
            for (const [member, m] of Object.entries(curr.members)) {
              const oldMember = old.members[member];

              if (!oldMember) {
                // New member added
                newEvents.unshift({
                  id: `mem-${curr.id}-${member}-${Date.now()}`,
                  type: "member_added",
                  title: `New Member Added`,
                  description: `${member} added to "${curr.name}" (${yoctoToNear(m.share)} Ⓝ)`,
                  timestamp: new Date(),
                  badge: "👥 ADDED",
                  highlight: true,
                });
              } else {
                // Check if payment occurred
                if (!oldMember.paid && m.paid) {
                  newEvents.unshift({
                    id: `paid-${curr.id}-${member}-${Date.now()}`,
                    type: "member_paid",
                    title: `Payment Received!`,
                    description: `${member} paid ${yoctoToNear(m.share)} Ⓝ in "${curr.name}"`,
                    timestamp: new Date(),
                    badge: "💸 PAID",
                    highlight: true,
                  });
                }
                // Check if share was updated
                if (oldMember.share !== m.share) {
                  newEvents.unshift({
                    id: `share-${curr.id}-${member}-${Date.now()}`,
                    type: "share_updated",
                    title: `Share Updated`,
                    description: `${member}'s share in "${curr.name}" set to ${yoctoToNear(m.share)} Ⓝ`,
                    timestamp: new Date(),
                    badge: "📝 UPDATE",
                  });
                }
              }
            }

            // Check if group settled
            if (old.status !== "Settled" && curr.status === "Settled") {
              newEvents.unshift({
                id: `settle-${curr.id}-${Date.now()}`,
                type: "group_settled",
                title: `Village Project Completed!`,
                description: `Group #${curr.id} "${curr.name}" is now fully settled! 🏆`,
                timestamp: new Date(),
                badge: "🏆 COMPLETED",
                highlight: true,
              });
            }
          }

          if (newEvents.length > 0) {
            setActivities((existing) => [...newEvents, ...existing].slice(0, 30));
          }
        }

        prevGroupsRef.current = currentGroups;
      } catch (err) {
        console.error("ActivityFeed poll error:", err);
      } finally {
        if (isMounted) {
          setIsPolling(false);
        }
      }
    };

    // Initial poll
    poll();

    // 10-second polling interval (PRD §6.4)
    const interval = setInterval(poll, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selector, onGroupsFetched]);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 15, color: "#F0D9A8" }}>⚡ Village Activity</h2>
          <span style={livePulseBadge}>
            <span style={pulseDot(isPolling)} />
            {isPolling ? "SYNC" : "10s"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "var(--mono)" }}>
            {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={collapseBtnStyle}
            title={isCollapsed ? "Expand Feed" : "Collapse Feed"}
          >
            {isCollapsed ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {activities.length === 0 ? (
            <div style={{ padding: "8px 12px", textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              Listening for village events...
            </div>
          ) : (
            <div style={listStyle}>
          {activities.map((item) => {
            const isRelatedToMe =
              accountId &&
              (item.description.includes(accountId) || item.title.includes(accountId));
            
            // Combine title and description into one line
            const combinedText = `${item.title} • ${item.description}`;

            return (
              <div
                key={item.id}
                style={{
                  ...itemCardStyle,
                  borderColor: isRelatedToMe ? "var(--accent)" : "var(--border)",
                  background: item.highlight ? "var(--accent-bg)" : "var(--code-bg)",
                }}
              >
                {/* Row 1: Icon + Combined Text */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{getIcon(item.type)}</span>
                  <span style={{ 
                    fontSize: 11, 
                    color: isRelatedToMe ? "var(--accent)" : "var(--text-h)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1
                  }}>
                    {combinedText}
                  </span>
                </div>
                {/* Row 2: Timestamp */}
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "var(--mono)", textAlign: "right" }}>
                  {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
              </div>
            );
          })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  background: "rgba(18, 22, 20, 0.88)",
  backdropFilter: "blur(12px)",
  border: "2px solid #F0D9A8",
  borderRadius: 12,
  padding: "12px 14px",
  width: "auto",
  minWidth: 240,
  maxWidth: "min(340px, calc(100vw - 24px))",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
  color: "#ffffff",
  pointerEvents: "auto",
};

const collapseBtnStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(240, 217, 168, 0.5)",
  color: "#F0D9A8",
  borderRadius: 4,
  padding: "1px 6px",
  cursor: "pointer",
  fontSize: 10,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
  flexWrap: "wrap",
  gap: 6,
};

const livePulseBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
  padding: "2px 8px",
  borderRadius: 12,
  background: "rgba(39, 174, 96, 0.15)",
  color: "#27ae60",
  border: "1px solid rgba(39, 174, 96, 0.4)",
};

const pulseDot = (active: boolean): React.CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  backgroundColor: active ? "#aa3bff" : "#27ae60",
  boxShadow: active ? "0 0 6px #aa3bff" : "0 0 6px #27ae60",
  transition: "background-color 0.3s ease",
});

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  maxHeight: 250,
  overflowY: "auto",
  paddingRight: 6,
  marginTop: 6,
};

const itemCardStyle: React.CSSProperties = {
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: 6,
  padding: "6px 8px",
  marginBottom: 8,
  transition: "all 0.2s ease",
  background: "rgba(0, 0, 0, 0.3)",
};

