/**
 * CreateGroup.tsx — Form to create a new village group (F2).
 *
 * Validates wallet connection and selector state before calling `create_group`.
 */

import { useState } from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import { createGroup, friendlyError } from "../lib/contract";

interface Props {
  selector: WalletSelector | null;
  accountId: string | null;
  onSuccess: () => void;
  embedded?: boolean;
}

export default function CreateGroup({ selector, accountId, onSuccess, embedded }: Props) {
  const [groupName, setGroupName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);

    if (!selector) {
      setError("Wallet selector not initialized. Please wait or refresh.");
      return;
    }

    if (!accountId) {
      setError("Please connect your wallet first.");
      return;
    }

    const trimmed = groupName.trim();
    if (!trimmed) {
      setError("Please enter a group name.");
      return;
    }

    setLoading(true);
    try {
      await createGroup(selector, trimmed);
      setStatus(`✅ Group "${trimmed}" created!`);
      setGroupName("");
      onSuccess();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={embedded ? embeddedSectionStyle : sectionStyle}>
      <h2 style={{ margin: "0 0 12px" }}>🏠 Create Group</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Group name (e.g. Dinner, Rent)"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          disabled={loading}
        />
        <button type="submit" disabled={loading} style={btnPrimary}>
          {loading ? "Creating…" : "Create"}
        </button>
      </form>
      {error && <p style={errStyle}>❌ {error}</p>}
      {status && <p style={okStyle}>{status}</p>}
    </div>
  );
}

// ── Inline styles ────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  border: "2px solid var(--border)",
  borderRadius: 8,
  padding: "1.25rem",
  margin: "1rem auto",
  maxWidth: 420,
  textAlign: "left",
};

const embeddedSectionStyle: React.CSSProperties = {
  padding: "0.5rem 0",
  margin: 0,
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

