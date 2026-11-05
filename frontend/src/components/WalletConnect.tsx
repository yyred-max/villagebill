// src/components/WalletConnect.tsx
import { forwardRef, useImperativeHandle, useState } from "react";
import { kit } from "../lib/wallet";
import { Horizon } from "@stellar/stellar-sdk";
import { IconWallet, IconSpinner } from "./Icons";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(HORIZON_URL);

export type WalletStatus = "idle" | "connecting" | "connected" | "error";

interface WalletConnectProps {
  onStatusChange: (
    status: WalletStatus,
    data?: { address?: string; error?: string }
  ) => void;
}

export interface WalletConnectHandle {
  connect: () => void;
  disconnect: () => void;
}

const WalletConnect = forwardRef<WalletConnectHandle, WalletConnectProps>(
  function WalletConnect({ onStatusChange }, ref) {
    const [address, setAddress] = useState<string | null>(null);
    const [status, setStatus] = useState<WalletStatus>("idle");

    useImperativeHandle(ref, () => ({
      connect: handleConnect,
      disconnect: handleDisconnect,
    }));

    async function checkBalance(publicKey: string): Promise<boolean> {
      try {
        // Gunakan Horizon untuk mendapatkan data akun
        const account = await server.loadAccount(publicKey);
        // Cari saldo native (XLM)
        const nativeBalance = account.balances.find(
          (b: any) => b.asset_type === "native"
        );
        const balance = nativeBalance ? parseFloat(nativeBalance.balance) : 0;
        console.log(`[checkBalance] Balance for ${publicKey}: ${balance} XLM`);
        return balance >= 2;
      } catch (error) {
        console.error("[checkBalance] Error:", error);
        return false;
      }
    }

    function parseError(err: any): string {
      const msg = String(err?.message || err || "").toLowerCase();
      if (msg.includes("reject") || msg.includes("declined") || msg.includes("cancel")) {
        return "Connection rejected. Please try again if you want to proceed.";
      }
      if (msg.includes("not found") || msg.includes("not installed")) {
        return "Wallet not found. Please make sure the extension is installed.";
      }
      return "Wallet could not connect. Please ensure your wallet is available and try again.";
    }

    function fail(msg: string) {
      setStatus("error");
      onStatusChange("error", { error: msg });
    }

    async function handleConnect() {
      setStatus("connecting");
      onStatusChange("connecting");

      try {
        await kit.openModal({
          onWalletSelected: async (option) => {
            try {
              kit.setWallet(option.id);
              const { address: publicKey } = await kit.getAddress();

              if (!publicKey) {
                fail("Wallet not found. Please make sure your wallet extension is installed.");
                return;
              }

              const hasEnoughBalance = await checkBalance(publicKey);
              if (!hasEnoughBalance) {
                fail("Insufficient XLM balance. Please top up via Friendbot first.");
                return;
              }

              setAddress(publicKey);
              setStatus("connected");
              onStatusChange("connected", { address: publicKey });
            } catch (err: any) {
              fail(parseError(err));
            }
          },
          onClosed: () => {
            setStatus((current) => {
              if (current === "connecting") {
                onStatusChange("idle");
                return "idle";
              }
              return current;
            });
          },
        });
      } catch (err: any) {
        fail(parseError(err));
      }
    }

    function handleDisconnect() {
      setAddress(null);
      setStatus("idle");
      onStatusChange("idle");
    }

    // ===== Header piece only, sesuai desain =====

    if (status === "connected" && address) {
      return (
        <div className="wallet-pill wallet-pill-connected">
          <span className="pulse-dot" />
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      );
    }

    if (status === "connecting") {
      return (
        <div className="wallet-pill wallet-pill-connecting">
          <IconSpinner size={14} />
          Connecting…
        </div>
      );
    }

    return (
      <button className="btn-header-connect" onClick={handleConnect}>
        <IconWallet /> Connect Wallet
      </button>
    );
  }
);

export default WalletConnect;