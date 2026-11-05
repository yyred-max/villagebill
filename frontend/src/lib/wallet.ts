import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
  AlbedoModule,
  LobstrModule,
  xBullModule,      // ✅ perbaiki case menjadi xBullModule
} from "@creit.tech/stellar-wallets-kit";

export const kit: StellarWalletsKit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: [
    new FreighterModule(),   // Freighter (ekstensi Chrome)
    new AlbedoModule(),      // Albedo (web-based & ekstensi)
    new LobstrModule(),      // LOBSTR (ekstensi Chrome)
    new xBullModule(),       // xBull (ekstensi Chrome) — perbaiki case
  ],
});