/**
 * App.tsx — Root component for VillageBill.
 *
 * Integrates:
 *  - Wallet connect / disconnect (F1)
 *  - Create Group form (F2)
 *  - Add Member form (F3)
 *  - Pay Share form (F5)
 *  - Activity Feed polling (F6) ← NEW
 *  - Group list with member details + progress bar
 */

import { useState, useEffect, useCallback } from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import { initWalletSelector, CONTRACT_ID } from "./lib/near";
import {
  createGroup,
  getGroups,
  friendlyError,
  type Group,
} from "./lib/contract";
import AddMember from "./components/AddMember";
import PayShare from "./components/PayShare";
import ActivityFeed from "./components/ActivityFeed";
import "./App.css";

function App() {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState("");
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // ── Wallet init ────────────────────────────────────────────────────
  useEffect(() => {
    initWalletSelector().then((s) => {
      setSelector(s);
      const accounts = s.store.getState().accounts;
      if (accounts.length > 0) {
        setAccountId(accounts[0].accountId);
      }
    });
  }, []);

  // ── Fetch groups ───────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    if (!selector) return;
    try {
      const data = await getGroups(selector);
      setGroups(data);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  }, [selector]);

  // Fetch on mount + when selector ready
  useEffect(() => {
    if (selector) fetchGroups();
  }, [selector, fetchGroups]);

  // ── Wallet handlers ────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!selector) return;
    try {
      const wallet = await selector.wallet();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (wallet as any).signIn({ contractId: CONTRACT_ID });
      setAccountId(accounts[0].accountId);
    } catch (err) {
      const msg = friendlyError(err);
      alert(msg);
    }
  };

  const handleDisconnect = async () => {
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
    setAccountId(null);
  };

  // ── Create Group handler ───────────────────────────────────────────
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selector || !groupName.trim()) return;

    setCreating(true);
    setCreateError(null);
    setCreateStatus(null);

    try {
      await createGroup(selector, groupName.trim());
      setCreateStatus(`✅ Group "${groupName.trim()}" created!`);
      setGroupName("");
      await fetchGroups();
    } catch (err) {
      setCreateError(friendlyError(err));
    } finally {
      setCreating(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────
  /** Convert yoctoNEAR string to human-readable NEAR. */
  const yoctoToNear = (yocto: string): string => {
    const y = BigInt(yocto);
    const whole = y / BigInt(10 ** 24);
    const frac = y % BigInt(10 ** 24);
    const fracStr = frac.toString().padStart(24, "0").slice(0, 4);
    return `${whole}.${fracStr}`;
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "2rem", maxWidth: 600, margin: "0 auto", fontFamily: "var(--sans)" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <img
          src="/assets/village-logo.png"
          alt="VillageBill"
          style={{ width: 80, imageRendering: "pixelated" }}
        />
        <h1 style={{ margin: "8px 0 4px", fontSize: 32 }}>🏘️ VillageBill</h1>
        <p style={{ fontSize: 13, color: "var(--text)" }}>
          Split bills on-chain — <code>{CONTRACT_ID}</code>
        </p>
      </div>

      {/* Wallet section */}
      {accountId ? (
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <p>
            Connected as: <strong>{accountId}</strong>
          </p>
          <button onClick={handleDisconnect} style={btnSecondary}>
            Disconnect
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <button onClick={handleConnect} style={btnPrimary}>
            Connect Wallet
          </button>
        </div>
      )}

      {/* === Authenticated sections === */}
      {accountId && selector && (
        <>
          {/* ── Create Group (F2) ───────────────────────────────── */}
          <div style={sectionStyle}>
            <h2 style={{ margin: "0 0 12px" }}>🏠 Create Group</h2>
            <form onSubmit={handleCreateGroup} style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Group name (e.g. Dinner)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                disabled={creating}
              />
              <button type="submit" disabled={creating} style={btnPrimary}>
                {creating ? "Creating…" : "Create"}
              </button>
            </form>
            {createError && <p style={errStyle}>❌ {createError}</p>}
            {createStatus && <p style={okStyle}>{createStatus}</p>}
          </div>

          {/* ── Add Member (F3) ─────────────────────────────────── */}
          <AddMember
            selector={selector}
            groups={groups.filter((g) => g.owner === accountId)}
            onSuccess={fetchGroups}
          />

          {/* ── Pay Share (F5) ─────────────────────────────────── */}
          <PayShare
            selector={selector}
            accountId={accountId}
            groups={groups}
            onSuccess={fetchGroups}
          />

          {/* ── Activity Feed (F6) ──────────────────────────────── */}
          <ActivityFeed
            selector={selector}
            accountId={accountId}
            onGroupsFetched={setGroups}
          />

          {/* ── Groups list ─────────────────────────────────────── */}
          <div style={{ ...sectionStyle, marginTop: "1rem" }}>
            <h2 style={{ margin: "0 0 12px" }}>
              📋 Groups ({groups.length})
              <button
                onClick={fetchGroups}
                style={{ ...btnSecondary, marginLeft: 8, fontSize: 12 }}
              >
                Refresh
              </button>
            </h2>

            {groups.length === 0 && (
              <p style={{ color: "var(--text)" }}>No groups yet. Create one above!</p>
            )}

            {groups.map((g) => (
              <div key={g.id} style={groupCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>
                    #{g.id} — {g.name}
                  </strong>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: g.status === "Settled" ? "#27ae60" : "var(--accent)",
                      color: "#fff",
                    }}
                  >
                    {g.status}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text)", margin: "4px 0" }}>
                  Owner: {g.owner}
                </p>

                {/* Member list */}
                {Object.keys(g.members).length > 0 ? (
                  <>
                    {/* Progress bar */}
                    {(() => {
                      const entries = Object.values(g.members);
                      const paidCount = entries.filter((m) => m.paid).length;
                      const total = entries.length;
                      const pct = total > 0 ? Math.round((paidCount / total) * 100) : 0;
                      return (
                        <div style={{ margin: "8px 0 6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text)", marginBottom: 3 }}>
                            <span>{paidCount}/{total} paid</span>
                            <span>{pct}%</span>
                          </div>
                          <div style={progressBg}>
                            <div style={{ height: "100%", borderRadius: 3, transition: "width 0.3s", width: `${pct}%`, background: pct === 100 ? "#27ae60" : "var(--accent)" }} />
                          </div>
                        </div>
                      );
                    })()}

                    <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none" }}>
                      {Object.entries(g.members).map(([acct, m]) => (
                        <li
                          key={acct}
                          style={{
                            fontSize: 13,
                            padding: "5px 0",
                            borderTop: "1px solid var(--border)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>
                            {m.paid ? "✅" : "⏳"} {acct}
                            {acct === accountId && (
                              <span style={{ fontSize: 10, marginLeft: 4, color: "var(--accent)" }}>(you)</span>
                            )}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                              {yoctoToNear(m.share)} Ⓝ
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                padding: "1px 6px",
                                borderRadius: 3,
                                background: m.paid ? "#27ae60" : "#e67e22",
                                color: "#fff",
                                fontWeight: 600,
                              }}
                            >
                              {m.paid ? "PAID" : "DUE"}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--text)", marginTop: 4 }}>
                    No members yet.
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared inline styles ─────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 6,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 15,
};

const btnSecondary: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-h)",
  cursor: "pointer",
  fontSize: 14,
};

const sectionStyle: React.CSSProperties = {
  border: "2px solid var(--border)",
  borderRadius: 8,
  padding: "1.25rem",
  margin: "1rem auto",
  maxWidth: 420,
  textAlign: "left",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  fontSize: 15,
  fontFamily: "var(--mono)",
  background: "var(--code-bg)",
  color: "var(--text-h)",
};

const groupCardStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "10px 14px",
  marginBottom: 8,
  background: "var(--code-bg)",
};

const progressBg: React.CSSProperties = {
  width: "100%",
  height: 6,
  borderRadius: 3,
  background: "var(--border)",
  overflow: "hidden",
};

const errStyle: React.CSSProperties = {
  color: "#e74c3c",
  marginTop: 8,
  fontSize: 14,
};

const okStyle: React.CSSProperties = {
  color: "#27ae60",
  marginTop: 8,
  fontSize: 14,
};

export default App;
