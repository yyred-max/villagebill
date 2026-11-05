/**
 * AddMember.tsx — Form to add a member to an existing group.
 *
 * Owner provides:
 *   - Group ID (selected from a dropdown of their groups)
 *   - Member account (e.g. "alice.testnet")
 *   - Share in NEAR (converted to yoctoNEAR before sending)
 *
 * Calls `add_member(group_id, member, share)` on the contract.
 * Displays friendly error messages per PRD §6.3.
 */

import { useState } from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import { addMember, friendlyError, type Group } from "../lib/contract";

/** Convert a human-readable NEAR amount (e.g. "1.5") to yoctoNEAR string. */
function nearToYocto(near: string): string {
  const [whole = "0", frac = ""] = near.split(".");
  const padded = frac.padEnd(24, "0").slice(0, 24);
  return (BigInt(whole) * BigInt(10 ** 24) + BigInt(padded)).toString();
}

interface Props {
  selector: WalletSelector;
  groups: Group[];
  onSuccess: () => void;
}

export default function AddMember({ selector, groups, onSuccess }: Props) {
  const [groupId, setGroupId] = useState<string>("");
  const [member, setMember] = useState("");
  const [share, setShare] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only show Open groups that the user owns
  const openGroups = groups.filter((g) => g.status === "Open");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);

    // Basic client-side validation
    if (!groupId) {
      setError("Please select a group.");
      return;
    }
    if (!member.endsWith(".testnet") && !member.endsWith(".near")) {
      setError("Member must be a valid NEAR account (e.g. alice.testnet).");
      return;
    }
    const shareNum = parseFloat(share);
    if (isNaN(shareNum) || shareNum <= 0) {
      setError("Share must be a positive number in NEAR.");
      return;
    }

    setLoading(true);
    try {
      const yocto = nearToYocto(share);
      await addMember(selector, Number(groupId), member, yocto);
      setStatus(`✅ Added ${member} with share of ${share} NEAR`);
      setMember("");
      setShare("");
      onSuccess();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: "0 0 12px" }}>👥 Add Member</h2>

      <form onSubmit={handleSubmit} style={formStyle}>
        {/* Group selector */}
        <label style={labelStyle}>
          Group
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            style={inputStyle}
            disabled={loading}
          >
            <option value="">— Select a group —</option>
            {openGroups.map((g) => (
              <option key={g.id} value={g.id}>
                #{g.id} — {g.name}
              </option>
            ))}
          </select>
        </label>

        {/* Member account */}
        <label style={labelStyle}>
          Member Account
          <input
            type="text"
            placeholder="alice.testnet"
            value={member}
            onChange={(e) => setMember(e.target.value.trim().toLowerCase())}
            style={inputStyle}
            disabled={loading}
          />
        </label>

        {/* Share amount */}
        <label style={labelStyle}>
          Share (NEAR)
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.5"
            value={share}
            onChange={(e) => setShare(e.target.value)}
            style={inputStyle}
            disabled={loading}
          />
        </label>

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "Sending…" : "Add Member"}
        </button>
      </form>

      {error && <p style={errorStyle}>❌ {error}</p>}
      {status && <p style={successStyle}>{status}</p>}
    </div>
  );
}

// ── Inline styles (pixel-art theme friendly) ─────────────────────────

const containerStyle: React.CSSProperties = {
  border: "2px solid var(--border)",
  borderRadius: 8,
  padding: "1.25rem",
  margin: "1rem auto",
  maxWidth: 420,
  textAlign: "left",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
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

const btnStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 6,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 15,
  marginTop: 4,
};

const errorStyle: React.CSSProperties = {
  color: "#e74c3c",
  marginTop: 8,
  fontSize: 14,
};

const successStyle: React.CSSProperties = {
  color: "#27ae60",
  marginTop: 8,
  fontSize: 14,
};

