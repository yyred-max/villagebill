/**
 * App.tsx — Full-Screen Web3 Game Map with Responsive Floating HUD (PRD §5, §7 F11).
 *
 * Responsive HUD Architecture:
 *  - Full-Screen Phaser 3 Canvas at z-index: 0
 *  - Responsive HUD Overlay at z-index: 10 (pointer-events: none, panels: pointer-events: auto)
 *  - Top-Left: Scaled Logo, Contract ID, and Wallet Controls
 *  - Top-Right: Mobile Hamburger Button (☰ HUD) to toggle drawer
 *  - Bottom-Left: Collapsible Activity Feed (auto-collapsed on mobile screens)
 *  - Center-Bottom: Selected Building Details Card
 *  - Right-Side: Floating Sidebar on Desktop, Slide-In Drawer on Mobile (<1024px)
 */

import { useState, useEffect, useCallback } from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import { initWalletSelector, CONTRACT_ID } from "./lib/near";
import {
  getGroups,
  payShare,
  friendlyError,
  type Group,
} from "./lib/contract";
import CreateGroup from "./components/CreateGroup";
import AddMember from "./components/AddMember";
import PayShare from "./components/PayShare";
import ActivityFeed from "./components/ActivityFeed";
import VillageMap from "./components/VillageMap";
import "./App.css";

type SidebarTab = "groups" | "create" | "add_member" | "pay";

export default function App() {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  // Groups & Selection
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>("groups");

  // Responsive sidebar: default open on desktop (>1024px), closed on mobile/tablet
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth > 1024 : true;
  });

  // Quick pay loading state for the Selected Group Details HUD
  const [quickPayLoading, setQuickPayLoading] = useState(false);
  const [quickPayMsg, setQuickPayMsg] = useState<string | null>(null);

  // ── Wallet Init & Redirection Handling ──────────────────────────────
  useEffect(() => {
    initWalletSelector().then((s) => {
      setSelector(s);
      const state = s.store.getState();
      if (state.accounts.length > 0) {
        setAccountId(state.accounts[0].accountId);
      }

      s.on("signedIn", (e) => {
        if (e.accounts && e.accounts.length > 0) {
          setAccountId(e.accounts[0].accountId);
        }
      });

      s.on("signedOut", () => {
        setAccountId(null);
      });
    });
  }, []);

  // ── Fetch Groups ───────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    if (!selector) return;
    try {
      const data = await getGroups(selector);
      setGroups(data);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  }, [selector]);

  useEffect(() => {
    if (selector) fetchGroups();
  }, [selector, fetchGroups]);

  // ── Wallet Handlers ────────────────────────────────────────────────
  const handleConnect = async (walletId: "meteor-wallet" | "my-near-wallet" = "meteor-wallet") => {
    if (!selector) {
      alert("Wallet selector not initialized. Please refresh.");
      return;
    }
    try {
      const wallet = await selector.wallet(walletId);
      if (!wallet) {
        alert("Selected wallet could not be loaded.");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (wallet as any).signIn({ contractId: CONTRACT_ID });
      if (accounts && accounts.length > 0) {
        setAccountId(accounts[0].accountId);
      }
    } catch (err) {
      const msg = friendlyError(err);
      alert(msg);
    }
  };

  const handleDisconnect = async () => {
    if (!selector) return;
    try {
      const wallet = await selector.wallet();
      await wallet.signOut();
    } catch (err) {
      console.warn("Sign out fallback:", err);
    }
    setAccountId(null);
  };

  // ── YoctoNEAR to NEAR Helper ───────────────────────────────────────
  const yoctoToNear = (yocto: string): string => {
    try {
      const y = BigInt(yocto);
      const whole = y / BigInt(10 ** 24);
      const frac = y % BigInt(10 ** 24);
      const fracStr = frac.toString().padStart(24, "0").slice(0, 4);
      return `${whole}.${fracStr}`;
    } catch {
      return "0.0";
    }
  };

  // Selected Group computation
  const selectedGroup = selectedGroupId
    ? groups.find((g) => g.id === selectedGroupId) ?? null
    : null;

  // Handle Quick Pay directly from the Floating Group Details card
  const handleQuickPay = async () => {
    if (!selector || !selectedGroup || !accountId) return;
    const myMembership = selectedGroup.members[accountId];
    if (!myMembership || myMembership.paid) return;

    setQuickPayLoading(true);
    setQuickPayMsg(null);
    try {
      await payShare(selector, selectedGroup.id, myMembership.share);
      setQuickPayMsg("✅ Paid successfully!");
      fetchGroups();
    } catch (err) {
      setQuickPayMsg(`❌ ${friendlyError(err)}`);
    } finally {
      setQuickPayLoading(false);
    }
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. FULL-SCREEN PHASER 3 VILLAGE MAP (Z-INDEX 0)              */}
      {/* ──────────────────────────────────────────────────────────── */}
      <VillageMap
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={(id) => setSelectedGroupId(id)}
      />

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. FLOATING GAME HUD LAYER (Z-INDEX 10)                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="game-hud-overlay">
        {/* ── TOP-LEFT: HEADER & WALLET PANEL ── */}
        <div className="hud-top-left">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="/assets/village-logo.png"
              alt="VillageBill"
              className="logo-img"
            />
            <div>
              <h1 className="title-text">
                🏘️ VillageBill
              </h1>
              <span className="contract-pill" title={CONTRACT_ID}>
                {CONTRACT_ID}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 8, borderTop: "1px solid rgba(240, 217, 168, 0.25)", paddingTop: 6 }}>
            {accountId ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>Player: </span>
                  <strong style={{ color: "#27ae60", fontFamily: "var(--mono)" }}>
                    {accountId.length > 16 ? `${accountId.slice(0, 14)}…` : accountId}
                  </strong>
                </div>
                <button onClick={handleDisconnect} style={miniBtnStyle}>
                  Exit
                </button>
              </div>
            ) : (
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
                  Connect NEAR Testnet:
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleConnect("meteor-wallet")} style={hudBtnPrimary}>
                    ☄️ Meteor
                  </button>
                  <button onClick={() => handleConnect("my-near-wallet")} style={hudBtnSecondary}>
                    🌐 MyNear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── MOBILE HAMBURGER BUTTON (TOP-RIGHT) ── */}
        <button
          className="hud-hamburger-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title="Toggle Navigation Menu"
        >
          {isSidebarOpen ? "✕ Close" : "☰ HUD"}
        </button>

        {/* ── MOBILE BACKDROP OVERLAY ── */}
        {isSidebarOpen && (
          <div
            className="hud-mobile-backdrop"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ── BOTTOM-LEFT: ACTIVITY FEED ── */}
        <div className="hud-bottom-left">
          <ActivityFeed
            selector={selector!}
            accountId={accountId}
            onGroupsFetched={setGroups}
          />
        </div>

        {/* ── CENTER-BOTTOM: SELECTED GROUP DETAILS POPUP ── */}
        {selectedGroup && (
          <div className="hud-selected-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 18 }}>🏡</span>
                <strong style={{ fontSize: 15, color: "#F0D9A8" }}>
                  #{selectedGroup.id} {selectedGroup.name}
                </strong>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 5px",
                    borderRadius: 4,
                    background: selectedGroup.status === "Settled" ? "#27ae60" : "#e67e22",
                    color: "#fff",
                  }}
                >
                  {selectedGroup.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedGroupId(null)}
                style={closeBtnStyle}
                title="Close"
              >
                ✕
              </button>
            </div>

            <p style={{ margin: "0 0 6px", fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
              Owner: <span style={{ fontFamily: "var(--mono)" }}>{selectedGroup.owner}</span>
            </p>

            {/* Progress calculation */}
            {(() => {
              const members = Object.values(selectedGroup.members);
              const paidCount = members.filter((m) => m.paid).length;
              const totalCount = members.length;
              const pct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
              const myMembership = accountId ? selectedGroup.members[accountId] : null;

              return (
                <>
                  <div style={{ margin: "6px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#F0D9A8", marginBottom: 2 }}>
                      <span>Progress</span>
                      <span>{paidCount}/{totalCount} Paid ({pct}%)</span>
                    </div>
                    <div style={progressBgStyle}>
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 3,
                          transition: "width 0.3s ease",
                          width: `${pct}%`,
                          background: pct === 100 ? "#27ae60" : "linear-gradient(90deg, #aa3bff, #F0D9A8)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Members list */}
                  <div style={{ maxHeight: 85, overflowY: "auto", margin: "6px 0" }}>
                    {members.length === 0 ? (
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>No members added yet.</p>
                    ) : (
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {Object.entries(selectedGroup.members).map(([memId, m]) => (
                          <li
                            key={memId}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 11,
                              padding: "2px 0",
                              borderBottom: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <span>
                              {m.paid ? "✅" : "⏳"} {memId} {memId === accountId && "(you)"}
                            </span>
                            <span style={{ fontFamily: "var(--mono)" }}>
                              {yoctoToNear(m.share)} Ⓝ
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Quick pay if logged-in user owes money */}
                  {myMembership && !myMembership.paid && (
                    <div style={{ marginTop: 6 }}>
                      <button
                        onClick={handleQuickPay}
                        disabled={quickPayLoading}
                        style={quickPayBtnStyle}
                      >
                        {quickPayLoading
                          ? "Processing Payment…"
                          : `💸 Pay My Share (${yoctoToNear(myMembership.share)} Ⓝ)`}
                      </button>
                      {quickPayMsg && (
                        <p style={{ margin: "4px 0 0", fontSize: 10, textAlign: "center" }}>
                          {quickPayMsg}
                        </p>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ── RIGHT-SIDE: FLOATING HUD SIDEBAR / MOBILE DRAWER ── */}
        <div
          className="hud-sidebar-container"
          style={{
            transform: isSidebarOpen ? "translateX(0)" : "translateX(calc(100% + 20px))",
          }}
        >
          {/* Desktop Left Edge Toggle Button */}
          <button
            className="hud-sidebar-edge-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "Collapse Sidebar" : "Open Sidebar"}
          >
            {isSidebarOpen ? "▶" : "◀ HUD"}
          </button>

          {/* Sidebar Navigation Tabs */}
          <div style={tabBarStyle}>
            <button
              onClick={() => setActiveTab("groups")}
              style={activeTab === "groups" ? activeTabStyle : tabStyle}
            >
              📋 Groups
            </button>
            <button
              onClick={() => setActiveTab("create")}
              style={activeTab === "create" ? activeTabStyle : tabStyle}
            >
              🏠 Create
            </button>
            <button
              onClick={() => setActiveTab("add_member")}
              style={activeTab === "add_member" ? activeTabStyle : tabStyle}
            >
              👥 Member
            </button>
            <button
              onClick={() => setActiveTab("pay")}
              style={activeTab === "pay" ? activeTabStyle : tabStyle}
            >
              💸 Pay
            </button>
          </div>

          {/* Sidebar Body Content */}
          <div style={sidebarBodyStyle}>
            {activeTab === "groups" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13, color: "#F0D9A8" }}>
                    Active Village Projects ({groups.length})
                  </strong>
                  <button onClick={fetchGroups} style={miniBtnStyle}>
                    ↻ Refresh
                  </button>
                </div>

                {groups.length === 0 && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                    No village projects yet. Click 🏠 Create above!
                  </p>
                )}

                {groups.map((g) => {
                  const isSelected = g.id === selectedGroupId;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroupId(isSelected ? null : g.id)}
                      style={{
                        ...groupItemStyle,
                        borderColor: isSelected ? "#F0D9A8" : "rgba(255,255,255,0.15)",
                        background: isSelected ? "rgba(240, 217, 168, 0.15)" : "rgba(0,0,0,0.3)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: 13, color: "#fff" }}>
                          #{g.id} {g.name}
                        </strong>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: 3,
                            background: g.status === "Settled" ? "#27ae60" : "#e67e22",
                            color: "#fff",
                          }}
                        >
                          {g.status}
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                        Owner: {g.owner}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "create" && (
              <CreateGroup
                selector={selector}
                accountId={accountId}
                onSuccess={() => {
                  fetchGroups();
                  setActiveTab("groups");
                }}
                embedded
              />
            )}

            {activeTab === "add_member" && (
              <AddMember
                selector={selector!}
                groups={groups.filter((g) => g.owner === accountId)}
                onSuccess={() => {
                  fetchGroups();
                  setActiveTab("groups");
                }}
                embedded
              />
            )}

            {activeTab === "pay" && (
              <PayShare
                selector={selector!}
                accountId={accountId || ""}
                groups={groups}
                onSuccess={() => {
                  fetchGroups();
                  setActiveTab("groups");
                }}
                embedded
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SHARED INLINE STYLES ─────────────────────────────────────────────

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid rgba(240, 217, 168, 0.25)",
  background: "rgba(0, 0, 0, 0.3)",
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 4px",
  background: "transparent",
  border: "none",
  color: "rgba(255, 255, 255, 0.65)",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  transition: "all 0.15s ease",
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  color: "#F0D9A8",
  background: "rgba(240, 217, 168, 0.12)",
  borderBottom: "2px solid #F0D9A8",
};

const sidebarBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 12,
};

const groupItemStyle: React.CSSProperties = {
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: 8,
  padding: "8px 10px",
  marginBottom: 8,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const progressBgStyle: React.CSSProperties = {
  width: "100%",
  height: 6,
  borderRadius: 3,
  background: "rgba(255, 255, 255, 0.15)",
  overflow: "hidden",
};

const hudBtnPrimary: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 6,
  border: "none",
  background: "#aa3bff",
  color: "#fff",
  fontWeight: 600,
  fontSize: 11,
  cursor: "pointer",
};

const hudBtnSecondary: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid rgba(240, 217, 168, 0.4)",
  background: "rgba(255, 255, 255, 0.08)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 11,
  cursor: "pointer",
};

const miniBtnStyle: React.CSSProperties = {
  padding: "2px 6px",
  borderRadius: 4,
  border: "1px solid rgba(240, 217, 168, 0.4)",
  background: "rgba(255, 255, 255, 0.1)",
  color: "#F0D9A8",
  fontSize: 10,
  cursor: "pointer",
};

const closeBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#F0D9A8",
  fontSize: 14,
  cursor: "pointer",
};

const quickPayBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 6,
  border: "none",
  background: "#27ae60",
  color: "#fff",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};
