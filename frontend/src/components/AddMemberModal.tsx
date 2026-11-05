// src/components/AddMemberModal.tsx
import { useState } from "react";
import {
  IconWallet,
  IconInfo,
  IconCheck,
  IconSpinner,
  IconCopy,
} from "./Icons";
import type { Member } from "../App"; // ✅ import dari App, bukan Groups
import type { Activity } from "../App";
import { truncateHash } from "../utils/format";

interface AddMemberModalProps {
  groupName: string;
  currentTotal: number;
  onClose: () => void;
  onAdded: (member: Member) => void;
  onViewGroup?: () => void;
  onActivityAdd?: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  onAddMember?: (address: string, share: number) => Promise<{ hash: string }>;
}

type Step = "form" | "processing" | "success";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateAddMember(): Promise<{ hash: string }> {
  console.warn(
    "⚠️ [AddMemberModal] Using SIMULATION mode. " +
    "Pass `onAddMember` prop to use real contract call."
  );
  await delay(1600);
  const hash = Array.from({ length: 12 }, () =>
    "0123456789ABCDEF"[Math.floor(Math.random() * 16)]
  ).join("");
  return { hash: `${hash.slice(0, 6)}...${hash.slice(6, 10)}` };
}

function shortAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AddMemberModal({
  groupName,
  currentTotal,
  onClose,
  onAdded,
  onViewGroup,
  onActivityAdd,
  onAddMember,
}: AddMemberModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [walletAddress, setWalletAddress] = useState("");
  const [shareAmount, setShareAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);

  const shareValue = parseFloat(shareAmount) || 0;
  const newTotal = currentTotal + shareValue;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress.trim() || shareValue <= 0) return;

    setStep("processing");

    try {
      const result = await (onAddMember
        ? onAddMember(walletAddress.trim(), shareValue)
        : simulateAddMember());

      setTxHash(result.hash);

      const newMember: Member = {
        address: walletAddress.trim(),
        share: shareValue,
        paid: false,
      };
      onAdded(newMember);

      onActivityAdd?.({
        type: 'member_added',
        title: `You added ${shortAddr(walletAddress)} to ${groupName}`,
        description: `Share: ${shareValue} XLM • Tx: ${truncateHash(result.hash)}`,
      });

      setStep("success");
    } catch (error) {
      console.error("Failed to add member:", error);
      const errorMessage = error instanceof Error ? error.message : "Gagal menambahkan member. Silakan coba lagi.";
      alert(errorMessage);
      setStep("form");
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(txHash).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {/* ===== FORM ===== */}
        {step === "form" && (
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h2>Add Member</h2>
              <p>Add a member to your group and assign their share.</p>
            </div>

            <div className="modal-body">
              <label className="field-label">Group</label>
              <div className="group-static-field">{groupName}</div>

              <div className="field-label-row" style={{ marginTop: 20 }}>
                <label className="field-label">Member Wallet Address</label>
              </div>
              <div className="field-input-icon-wrap">
                <IconWallet />
                <input
                  className="field-input field-input-icon"
                  type="text"
                  placeholder="GABCD...7XYZ"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  required
                />
              </div>
              <p className="field-hint">Only a public wallet address is required.</p>

              <div className="field-label-row" style={{ marginTop: 20 }}>
                <label className="field-label">Share Amount</label>
              </div>
              <div className="field-input-suffix-wrap">
                <input
                  className="field-input field-input-suffix"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="25.00"
                  value={shareAmount}
                  onChange={(e) => setShareAmount(e.target.value)}
                  required
                />
                <span className="field-suffix">XLM</span>
              </div>
              <p className="field-hint">Amount this member is responsible for.</p>

              <div className="owner-card">
                <span className="owner-label" style={{ marginBottom: 10, display: "block" }}>
                  GROUP SUMMARY
                </span>
                <div className="owner-card-rows">
                  <div>
                    <span>Current Total</span>
                    <strong>{currentTotal.toLocaleString()} XLM</strong>
                  </div>
                  <div>
                    <span>New Member Share</span>
                    <strong className="share-value">
                      + {shareValue.toLocaleString()} XLM
                    </strong>
                  </div>
                  <div className="summary-divider" />
                  <div>
                    <span>New Total</span>
                    <strong>{newTotal.toLocaleString()} XLM</strong>
                  </div>
                </div>
              </div>

              <p className="modal-note">
                <IconInfo /> Network: Stellar Testnet · Estimated Network Fee: ~0.0001 XLM
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary modal-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary modal-btn">
                Add Member
              </button>
            </div>
          </form>
        )}

        {/* ===== PROCESSING ===== */}
        {step === "processing" && (
          <div className="modal-processing">
            <div className="modal-header">
              <h2>Add Member</h2>
            </div>
            <div className="modal-body processing-body">
              <div className="processing-spinner">
                <IconSpinner size={28} />
              </div>
              <h3>Adding {shortAddr(walletAddress)} to {groupName}...</h3>
              <p className="waiting-text" style={{ justifyContent: "center" }}>
                <span className="waiting-dot" /> Waiting for wallet confirmation...
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary modal-btn" disabled>
                Cancel
              </button>
              <button className="btn-primary modal-btn" disabled>
                <IconSpinner size={14} /> Adding...
              </button>
            </div>
          </div>
        )}

        {/* ===== SUCCESS ===== */}
        {step === "success" && (
          <div className="modal-success">
            <div className="success-icon">
              <IconCheck />
            </div>
            <h2>Member Added Successfully</h2>
            <p>{shortAddr(walletAddress)} has been added to {groupName}.</p>

            <div className="success-card">
              <div className="success-row">
                <span>Member</span>
                <strong>{shortAddr(walletAddress)}</strong>
              </div>
              <div className="success-row">
                <span>Wallet</span>
                <strong className="success-hash-plain">
                  {shortAddr(walletAddress)}
                </strong>
              </div>
              <div className="success-row">
                <span>Share</span>
                <strong>{shareValue.toLocaleString()} XLM</strong>
              </div>
              <div className="success-row">
                <span>Group</span>
                <strong>{groupName}</strong>
              </div>
              <div className="success-row">
                <span>Transaction Hash</span>
                <span className="success-hash" title={txHash}>
                  {txHash.slice(0, 10)}...{txHash.slice(-6)}
                  <button className="hash-copy" onClick={handleCopy} aria-label="Copy hash">
                    <IconCopy />
                  </button>
                </span>
              </div>
              {copied && <span className="copied-toast">Copied!</span>}
            </div>

            <button className="btn-primary modal-btn-wide" onClick={onViewGroup}>
              VIEW GROUP
            </button>
            <button className="btn-secondary modal-btn-wide" onClick={onClose}>
              DONE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}