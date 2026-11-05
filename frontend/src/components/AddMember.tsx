// AddMember.tsx
import { useState } from "react";
import { addMember, TxStatus } from "../lib/contract";

interface AddMemberProps {
  walletAddress: string;
}

export default function AddMember({
  walletAddress,
}: AddMemberProps) {
  const [groupId, setGroupId] = useState("");
  const [member, setMember] = useState("");
  const [shareAmount, setShareAmount] = useState("");

  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleAddMember() {
    setErrorMsg(null);
    setTxHash(null);

    if (!groupId || !member || !shareAmount) {
      setErrorMsg(
        "Group ID, alamat member, dan share amount wajib diisi."
      );
      setStatus("fail");
      return;
    }

    try {
      const parsedGroupId = BigInt(groupId);
      const parsedShareAmount = BigInt(shareAmount);

      if (parsedGroupId <= 0n) {
        throw new Error("Group ID harus lebih besar dari 0.");
      }

      if (parsedShareAmount <= 0n) {
        throw new Error("Share amount harus lebih besar dari 0.");
      }

      setStatus("pending");

      const result = await addMember(
        parsedGroupId,
        walletAddress,
        member,
        parsedShareAmount
      );

      setTxHash(result.hash);
      setStatus("success");

      setGroupId("");
      setMember("");
      setShareAmount("");
    } catch (err: any) {
      console.error("Add member error:", err);

      setErrorMsg(
        err?.message || "Gagal menambahkan member."
      );

      setStatus("fail");
    }
  }

  return (
    <div className="add-member">
      <h3>Tambah Member</h3>

      <div>
        <label>Group ID</label>
        <br />
        <input
          type="text"
          placeholder="Contoh: 10569198802406336929"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          disabled={status === "pending"}
        />
      </div>

      <br />

      <div>
        <label>Alamat Member</label>
        <br />
        <input
          type="text"
          placeholder="G..."
          value={member}
          onChange={(e) => setMember(e.target.value)}
          disabled={status === "pending"}
        />
      </div>

      <br />

      <div>
        <label>Share Amount</label>
        <br />
        <input
          type="text"
          placeholder="Contoh: 100"
          value={shareAmount}
          onChange={(e) => setShareAmount(e.target.value)}
          disabled={status === "pending"}
        />
      </div>

      <br />

      <button
        onClick={handleAddMember}
        disabled={status === "pending"}
      >
        {status === "pending"
          ? "Menambahkan..."
          : "Tambah Member"}
      </button>

      {status === "pending" && (
        <p>⏳ Transaksi sedang diproses...</p>
      )}

      {status === "success" && txHash && (
        <div>
          <p>✅ Member berhasil ditambahkan!</p>

          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            Lihat transaksi
          </a>
        </div>
      )}

      {status === "fail" && (
        <p>❌ {errorMsg}</p>
      )}
    </div>
  );
}
