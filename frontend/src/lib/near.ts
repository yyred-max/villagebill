import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";

export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_NAME || "splitbill.plaindove8331.testnet";

// Fungsi untuk inisialisasi Wallet Selector
export const initWalletSelector = async () => {
    return await setupWalletSelector({
        network: "testnet",
        modules: [
            setupMeteorWallet(),
            setupMyNearWallet(),
        ],
    });
};