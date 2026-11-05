// src/components/PayShareModal.tsx
import { useState } from "react";
import { IconInfo, IconCheck, IconCopy, IconExternalLink, IconSpinner } from "./Icons";

interface PayShareModalProps {
  groupName: string;
  memberAddress: string;
  payerAddress: string | null;
  shareAmount: number;
  onClose: () => void;
  onPaid: () => void;
  onPay?: (memberAddress: string, amount: number) => Promise<{ hash: string }>;
}

type Step = "review" | "processing" | "success";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulatePayment(): Promise<{ hash: string }> {
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

const NETWORK_FEE = 0.0001;

export default function PayShareModal({
  groupName,
  memberAddress,
  payerAddress,
  shareAmount,
  onClose,
  onPaid,
  onPay,
}: PayShareModalProps) {
  const [step, setStep] = useState<Step>("review");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);

  const total = shareAmount + NETWORK_FEE;

  async function handleConfirm() {
    setStep("processing");
    try {
      const result = await (onPay
        ? onPay(memberAddress, shareAmount)
        : simulatePayment());
      setTxHash(result.hash);
      onPaid();
      setStep("success");
    } catch (error) {
      console.error("Payment failed:", error);
      const msg = error instanceof Error ? error.message : "Pembayaran gagal. Silakan coba lagi.";
      alert(msg);
      setStep("review");
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(txHash).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleCopyPayer() {
    if (payerAddress) navigator.clipboard.writeText(payerAddress).catch(() => {});
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {step === "review" && (
          <>
            <div className="modal-header modal-header-row">
              <div>
                <h2>Pay Your Share</h2>
                <p>Review your payment before confirming the transaction.</p>
              </div>
              <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <div className="pay-route-card">
                <div>
                  <span className="pay-route-label">GROUP</span>
                  <strong>{groupName}</strong>
                </div>
                <span className="pay-route-arrow">→</span>
                <div className="align-right">
                  <span className="pay-route-label">MEMBER</span>
                  <strong>{shortAddr(memberAddress)}</strong>
                </div>
              </div>
              <div className="pay-share-amount">
                <span className="pay-share-label">YOUR SHARE</span>
                <div className="pay-share-value">
                  {shareAmount.toFixed(2)} <em>XLM</em>
                </div>
              </div>
              <div className="owner-card">
                <div className="owner-card-rows">
                  <div><span>Share Amount</span><strong>{shareAmount.toFixed(2)} XLM</strong></div>
                  <div><span>Network Fee</span><strong>~{NETWORK_FEE} XLM</strong></div>
                  <div className="summary-divider" />
                  <div>
                    <span className="pay-total-label">Total</span>
                    <strong className="pay-total-value">{total.toFixed(4)} XLM</strong>
                  </div>
                </div>
                <p className="field-hint" style={{ marginTop: 10 }}>Network fees are paid in XLM.</p>
              </div>
              <div className="pay-network-rows">
                <div>
                  <span>Network</span>
                  <span>Stellar Testnet <span className="badge-ready owner-connected" style={{ marginLeft: 8 }}><span className="ready-dot" /> Connected</span></span>
                </div>
                <div>
                  <span>Paying From</span>
                  <span className="pay-from-pill" onClick={handleCopyPayer}>
                    {payerAddress ? shortAddr(payerAddress) : "GABCD...7XYZ"}
                    <IconCopy />
                  </span>
                </div>
              </div>
              <p className="modal-note"><IconInfo /> You're about to submit a transaction on Stellar Testnet.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary modal-btn" onClick={onClose}>Cancel</button>
              <button type="button" className="btn-primary modal-btn" onClick={handleConfirm}>Confirm Payment →</button>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="modal-processing">
            <div className="modal-body processing-body">
              <div className="pay-processing-spinner"><IconSpinner size={22} /></div>
              <h3>Preparing payment...</h3>
              <p className="processing-warning"><IconInfo /> Secure Soroban Contract</p>
              <div className="pay-sending-box"><span>Sending:</span><strong>{shareAmount.toFixed(2)} XLM</strong></div>
              <p className="processing-footer"><IconSpinner /> PROCESSING...</p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="modal-success">
            <div className="success-icon success-icon-green"><IconCheck /></div>
            <h2>Payment Successful</h2>
            <p>Your {shareAmount.toFixed(2)} XLM share has been paid.</p>
            <div className="success-card">
              <div className="success-row"><span>Group</span><strong>{groupName}</strong></div>
              <div className="success-row"><span>Member</span><strong>{shortAddr(memberAddress)}</strong></div>
              <div className="success-row"><span>Amount</span><strong>{shareAmount.toFixed(2)} XLM</strong></div>
              <div className="success-row"><span>Status</span><span className="status-badge status-paid"><IconCheck /> Paid</span></div>
              <div className="success-row">
                <span>Transaction Hash</span>
                <span className="success-hash" title={txHash}>
                  {txHash.slice(0, 10)}...{txHash.slice(-6)}
                  <button className="hash-copy" onClick={handleCopy}><IconCopy /></button>
                </span>
              </div>
              <a className="explorer-link" href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                View on Explorer <IconExternalLink />
              </a>
              {copied && <span className="copied-toast">Copied!</span>}
            </div>
            <button className="btn-primary modal-btn-wide" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}