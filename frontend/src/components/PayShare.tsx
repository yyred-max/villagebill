/**
 * PayShare.tsx — Allows a member to pay their assigned share for a group.
 *
 * Logic:
 *  1. User selects a group from a dropdown (only groups where they are a member).
 *  2. The component looks up the user's share and paid status from group data.
 *  3. If already paid → shows a "Paid" badge, button is disabled.
 *  4. If unpaid → shows the exact share amount and a "Pay" button.
 *  5. On click, calls `pay_share(group_id)` with `deposit` = member's share (yoctoNEAR).
 *     The contract asserts deposit == share, so the amount must be exact.
 *
 * Error handling uses `friendlyError()` for AlreadyPaid, IncorrectAmount, etc.
 */

import { useState } from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import { payShare, friendlyError, type Group } from "../lib/contract";

/** Convert yoctoNEAR string to human-readable NEAR (4 decimal places). */
function yoctoToNear(yocto: string): string {
  const y = BigInt(yocto);
  const whole = y / BigInt(10 ** 24);
  const frac = y % BigInt(10 ** 24);
  const fracStr = frac.toString().padStart(24, "0").slice(0, 4);
  return `${whole}.${fracStr}`;
}

interface Props {
  selector: WalletSelector;
  accountId: string;
  groups: Group[];
  onSuccess: () => void;
}

export default function PayShare({ selector, accountId, groups, onSuccess }: Props) {
  const [groupId, setGroupId] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Groups where the connected user is a member (any status)
  const memberGroups = groups.filter((g) => accountId in g.members);

  // Selected group data
  const selectedGroup = groupId
    ? memberGroups.find((g) => g.id === Number(groupId))
    : null;

  // Current user's membership in the selected group
  const myMembership = selectedGroup?.members[accountId] ?? null;

  const handlePay = async () => {
    if (!selector) {
      setError("Wallet selector not initialized.");
      return;
    }
    if (!selectedGroup || !myMembership) return;

    setError(null);
    setStatus(null);
    setLoading(true);

    try {
      // deposit must exactly equal the member's share (yoctoNEAR)
      await payShare(selector, selectedGroup.id, myMembership.share);
      setStatus(
        `✅ Payment of ${yoctoToNear(myMembership.share)} NEAR sent to group owner!`
      );
      onSuccess(); // refresh group data
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: "0 0 12px" }}>💸 Pay Share</h2>

      {memberGroups.length === 0 ? (
        <p style={{ color: "var(--text)", fontSize: 14 }}>
          You are not a member of any group yet.
        </p>
      ) : (
        <>
          {/* Group selector — only groups the user belongs to */}
          <label style={labelStyle}>
            Select Group
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setError(null);
                setStatus(null);
              }}
              style={inputStyle}
              disabled={loading}
            >
              <option value="">— Select a group —</option>
              {memberGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  #{g.id} — {g.name} [{g.status}]
                </option>
              ))}
            </select>
          </label>

          {/* Show share details when a group is selected */}
          {selectedGroup && myMembership && (
            <div style={detailsBoxStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "var(--text)" }}>Your Share:</span>
                <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "var(--text-h)" }}>
                  {yoctoToNear(myMembership.share)} NEAR
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 14, color: "var(--text)" }}>Status:</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "2px 10px",
                    borderRadius: 4,
                    background: myMembership.paid ? "#27ae60" : "#e67e22",
                    color: "#fff",
                  }}
                >
                  {myMembership.paid ? "✅ Paid" : "⏳ Unpaid"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 14, color: "var(--text)" }}>Owner:</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text)" }}>
                  {selectedGroup.owner}
                </span>
              </div>

              {/* Progress bar: paid members / total members */}
              {(() => {
                const entries = Object.values(selectedGroup.members);
                const paidCount = entries.filter((m) => m.paid).length;
                const total = entries.length;
                const pct = total > 0 ? Math.round((paidCount / total) * 100) : 0;
                return (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text)", marginBottom: 4 }}>
                      <span>Group Progress</span>
                      <span>{paidCount}/{total} paid ({pct}%)</span>
                    </div>
                    <div style={progressBarBg}>
                      <div
                        style={{
                          ...progressBarFill,
                          width: `${pct}%`,
                          background: pct === 100 ? "#27ae60" : "var(--accent)",
                        }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Pay button */}
              {myMembership.paid ? (
                <p style={{ ...okStyle, marginTop: 12, textAlign: "center" }}>
                  You have already paid your share for this group. 🎉
                </p>
              ) : selectedGroup.status === "Settled" ? (
                <p style={{ ...errStyle, marginTop: 12, textAlign: "center" }}>
                  This group is already settled.
                </p>
              ) : (
                <button
                  onClick={handlePay}
                  disabled={loading}
                  style={{ ...btnPayStyle, marginTop: 12 }}
                >
                  {loading
                    ? "Sending transaction…"
                    : `Pay ${yoctoToNear(myMembership.share)} NEAR`}
                </button>
              )}
            </div>
          )}

          {error && <p style={errStyle}>❌ {error}</p>}
          {status && <p style={okStyle}>{status}</p>}
        </>
      )}
    </div>
  );
}

// ── Inline styles ────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  border: "2px solid var(--border)",
  borderRadius: 8,
  padding: "1.25rem",
  margin: "1rem auto",
  maxWidth: 420,
  textAlign: "left",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text-h)",
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

const detailsBoxStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "12px 14px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "var(--code-bg)",
};

const progressBarBg: React.CSSProperties = {
  width: "100%",
  height: 8,
  borderRadius: 4,
  background: "var(--border)",
  overflow: "hidden",
};

const progressBarFill: React.CSSProperties = {
  height: "100%",
  borderRadius: 4,
  transition: "width 0.3s ease",
};

const btnPayStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 20px",
  borderRadius: 6,
  border: "none",
  background: "#27ae60",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 16,
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

