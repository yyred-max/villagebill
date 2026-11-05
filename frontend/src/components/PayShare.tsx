import { useState, useEffect } from "react";
import { payShare, server, CONTRACT_ID, TxStatus } from "../lib/contract";

interface PayShareProps {
  walletAddress: string;
}

export default function PayShare({ walletAddress }: PayShareProps) {
  const [groupId, setGroupId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  // Polling event contract setiap 5 detik
  useEffect(() => {
    let isMounted = true;

    async function pollEvents() {
      try {
        const latestLedger = await server.getLatestLedger();
        const startLedger = Math.max(
          latestLedger.sequence - 100,
          1
        );

        const res = await server.getEvents({
          startLedger,
          filters: [
            {
              type: "contract",
              contractIds: [CONTRACT_ID],
            },
          ],
        });

        if (isMounted && res.events.length > 0) {
          const newLogs = res.events.map(
            (e) =>
              `Event: ${e.topic
                .map((t) => t.toString())
                .join(", ")} @ ledger ${e.ledger}`
          );

          setEvents(newLogs.slice(-5));
        }
      } catch (err) {
        console.error("Gagal mengambil event:", err);
      }
    }

    pollEvents();

    const interval = setInterval(pollEvents, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  async function handlePay() {
    setErrorMsg(null);
    setTxHash(null);

    if (!groupId || !amount) {
      setErrorMsg("Group ID dan amount wajib diisi.");
      setStatus("fail");
      return;
    }

    try {
      const parsedGroupId = BigInt(groupId);
      const parsedAmount = BigInt(amount);

      if (parsedGroupId <= 0n) {
        throw new Error("Group ID harus lebih besar dari 0.");
      }

      if (parsedAmount <= 0n) {
        throw new Error("Amount harus lebih besar dari 0.");
      }

      setStatus("pending");

      const result = await payShare(
        parsedGroupId,
        walletAddress,
        parsedAmount
      );

      setTxHash(result.hash);
      setStatus("success");
    } catch (err: any) {
      const msg = String(err?.message || err);

      if (
        msg.includes("AlreadyPaid") ||
        msg.includes("Error(Contract, #1)")
      ) {
        setErrorMsg(
          "Kamu sudah membayar porsi tagihan ini sebelumnya."
        );
      } else if (
        msg.includes("NotAMember") ||
        msg.includes("Error(Contract, #2)")
      ) {
        setErrorMsg(
          "Wallet kamu bukan anggota grup ini."
        );
      } else if (
        msg.includes("IncorrectAmount") ||
        msg.includes("Error(Contract, #3)")
      ) {
        setErrorMsg(
          "Jumlah pembayaran tidak sesuai dengan porsi yang ditentukan."
        );
      } else {
        setErrorMsg(msg);
      }

      setStatus("fail");
    }
  }

  return (
    <div className="pay-share">
      <h3>Bayar Porsi Tagihan</h3>

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
        <label>Amount</label>
        <br />
        <input
          type="text"
          placeholder="Contoh: 100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={status === "pending"}
        />
      </div>

      <br />

      <button
        onClick={handlePay}
        disabled={status === "pending"}
      >
        {status === "pending"
          ? "Memproses..."
          : "Bayar"}
      </button>

      {status === "pending" && (
        <p>⏳ Transaksi sedang diproses...</p>
      )}

      {status === "success" && txHash && (
        <p>
          ✅ Pembayaran berhasil!{" "}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            Lihat transaksi
          </a>
        </p>
      )}

      {status === "fail" && (
        <p>❌ {errorMsg}</p>
      )}

      <div className="event-feed">
        <h4>Aktivitas Terbaru</h4>

        {events.length === 0 ? (
          <p>Belum ada aktivitas.</p>
        ) : (
          <ul>
            {events.map((event, index) => (
              <li key={index}>{event}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}