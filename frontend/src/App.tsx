import { useState, useEffect } from 'react';
import { WalletSelector } from '@near-wallet-selector/core';
import { initWalletSelector, CONTRACT_ID } from './lib/near';
import './App.css';

function App() {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  // Inisialisasi wallet saat halaman dimuat
  useEffect(() => {
    initWalletSelector().then((s) => {
      setSelector(s);
      // Cek apakah user sudah pernah login sebelumnya
      const wallet = s.store.getState().accounts;
      if (wallet.length > 0) {
        setAccountId(wallet[0].accountId);
      }
    });
  }, []);

  const handleConnect = async () => {
    if (!selector) return;
    try {
      const wallet = await selector.wallet();
      const accounts = await wallet.signIn({ contractId: CONTRACT_ID });
      setAccountId(accounts[0].accountId);
    } catch (error) {
      console.error("Gagal connect wallet:", error);
    }
  };

  const handleDisconnect = async () => {
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
    setAccountId(null);
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>🏘️ VillageBill</h1>
      <p>Smart Contract: {CONTRACT_ID}</p>

      {accountId ? (
        <div>
          <p>Terhubung sebagai: <strong>{accountId}</strong></p>
          <button onClick={handleDisconnect} style={{ padding: '10px', cursor: 'pointer' }}>
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={handleConnect} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Connect Wallet
        </button>
      )}
    </div>
  );
}

export default App;