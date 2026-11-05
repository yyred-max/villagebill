import { useState } from "react";
import { createGroup, TxStatus } from "../lib/contract";

interface CreateGroupProps {
  walletAddress: string;
}

export default function CreateGroup({
  walletAddress,
}: CreateGroupProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<TxStatus>("idle");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleCreateGroup() {
    if (!name.trim()) {
      setErrorMsg("Nama grup wajib diisi.");
      setStatus("fail");
      return;
    }

    setStatus("pending");
    setErrorMsg(null);
    setGroupId(null);
    setTxHash(null);

    try {
      const result = await createGroup(
        walletAddress,
        name.trim()
      );

      setTxHash(result.hash);

      if (result.result) {
        const group = result.result as any;

        if (group.id !== undefined) {
          setGroupId(String(group.id));
        }
      }

      setStatus("success");
      setName("");
    } catch (err: any) {
      console.error("Create group error:", err);

      setErrorMsg(
        err?.message || "Gagal membuat group."
      );

      setStatus("fail");
    }
  }

  return (
    <div className="create-group">
      <h3>Buat Group Baru</h3>

      <input
        type="text"
        placeholder="Nama group"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={status === "pending"}
      />

      <button
        onClick={handleCreateGroup}
        disabled={status === "pending" || !walletAddress}
      >
        {status === "pending"
          ? "Membuat Group..."
          : "Buat Group"}
      </button>

      {status === "pending" && (
        <p>⏳ Transaksi sedang diproses...</p>
      )}

      {status === "success" && (
        <div>
          <p>✅ Group berhasil dibuat!</p>

          {groupId && (
            <p>
              Group ID: <strong>{groupId}</strong>
            </p>
          )}

          {txHash && (
            <p>
              Transaction:{" "}
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {txHash.slice(0, 10)}...
              </a>
            </p>
          )}
        </div>
      )}

      {status === "fail" && (
        <p>❌ {errorMsg}</p>
      )}
    </div>
  );
}