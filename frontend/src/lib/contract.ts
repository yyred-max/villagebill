/**
 * contract.ts — Helper functions for calling the SplitBill NEAR smart contract.
 *
 * Centralizes all contract view/change method calls in one place so
 * components don't duplicate RPC logic.
 */

import type { WalletSelector } from "@near-wallet-selector/core";
import { actionCreators } from "@near-js/transactions";
import { CONTRACT_ID } from "./near";

// ── Types matching the on-chain data structures ──────────────────────

export interface Member {
  share: string; // U128 serializes as string
  paid: boolean;
}

export interface Group {
  id: number;
  owner: string;
  name: string;
  members: Record<string, Member>; // AccountId → Member
  status: "Open" | "Settled";
}

// ── Friendly error messages (PRD §6.3) ───────────────────────────────

const CONTRACT_ERROR_MAP: Record<string, string> = {
  NotOwner: "Only the group owner can perform this action.",
  NotAMember: "This account is not a member of the group.",
  AlreadyPaid: "This member has already paid their share.",
  IncorrectAmount: "The attached deposit does not match the required share.",
  GroupSettled: "This group is already settled — no changes allowed.",
  GroupNotSettled: "Cannot claim badge: the group is not fully settled yet.",
  BadgeAlreadyClaimed: "Badge has already been claimed for this group.",
  GroupNotFound: "Group not found.",
};

/**
 * Parse a contract panic message and return a user-friendly string.
 * Falls back to the raw message if no known error key matches.
 */
export function friendlyError(error: unknown): string {
  const msg =
    error instanceof Error ? error.message : String(error);

  // Wallet-level / connection errors
  if (/no wallet (selected|connected)|please connect your wallet/i.test(msg)) {
    return "Please connect your wallet first.";
  }
  if (/reject|denied|cancel/i.test(msg)) {
    return "Transaction was rejected — you cancelled the signing request.";
  }
  if (/insufficient.*(balance|fund)/i.test(msg)) {
    return "Insufficient NEAR balance for this transaction (deposit + gas).";
  }

  // Contract-level panics: NEAR wraps them as "Smart contract panicked: <key>"
  for (const [key, friendly] of Object.entries(CONTRACT_ERROR_MAP)) {
    if (msg.includes(key)) return friendly;
  }

  return `Transaction failed: ${msg}`;
}

// ── View methods (no signing required) ───────────────────────────────

async function viewMethod<T>(
  selector: WalletSelector,
  method: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { network } = selector.options;
  const url =
    network.networkId === "testnet"
      ? "https://rpc.testnet.near.org"
      : "https://rpc.mainnet.near.org";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "view",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "optimistic",
        account_id: CONTRACT_ID,
        method_name: method,
        args_base64: btoa(JSON.stringify(args)),
      },
    }),
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.data ?? json.error.message);

  const resultBytes: number[] = json.result.result;
  const decoded = new TextDecoder().decode(Uint8Array.from(resultBytes));
  return JSON.parse(decoded) as T;
}

export async function getGroups(selector: WalletSelector): Promise<Group[]> {
  return viewMethod<Group[]>(selector, "get_groups");
}

export async function getGroup(
  selector: WalletSelector,
  groupId: number,
): Promise<Group> {
  return viewMethod<Group>(selector, "get_group", { group_id: groupId });
}

// ── Change methods (signing required) ────────────────────────────────

const GAS = BigInt("30000000000000"); // 30 TGas

/**
 * Safely obtain an active connected wallet from the selector.
 * Falls back to selectedWalletId or configured modules to avoid "No wallet selected" errors.
 */
export async function getConnectedWallet(selector: WalletSelector) {
  if (!selector) {
    throw new Error("Wallet selector not initialized.");
  }

  const state = selector.store.getState();
  const selectedWalletId = state.selectedWalletId;

  // 1. Try currently active wallet id
  if (selectedWalletId) {
    try {
      const wallet = await selector.wallet(selectedWalletId);
      if (wallet) return wallet;
    } catch {
      // ignore
    }
  }

  // 2. Try default wallet() lookup
  try {
    const wallet = await selector.wallet();
    if (wallet) return wallet;
  } catch {
    // ignore
  }

  // 3. Try available modules if accounts exist
  for (const id of ["meteor-wallet", "my-near-wallet"]) {
    try {
      const wallet = await selector.wallet(id);
      if (wallet) return wallet;
    } catch {
      // ignore
    }
  }

  throw new Error("No wallet connected. Please connect your wallet first.");
}

async function callMethod(
  selector: WalletSelector,
  method: string,
  args: Record<string, unknown>,
  deposit: bigint = BigInt(0),
) {
  if (!selector) {
    throw new Error("Wallet selector not initialized.");
  }

  const wallet = await getConnectedWallet(selector);
  if (!wallet) {
    throw new Error("Please connect your wallet first.");
  }

  return wallet.signAndSendTransaction({
    receiverId: CONTRACT_ID,
    actions: [
      actionCreators.functionCall(method, args, GAS, deposit),
    ],
  });
}

export async function createGroup(
  selector: WalletSelector,
  name: string,
) {
  return callMethod(selector, "create_group", { name });
}

export async function addMember(
  selector: WalletSelector,
  groupId: number,
  member: string,
  shareYocto: string,
) {
  return callMethod(selector, "add_member", {
    group_id: groupId,
    member,
    share: shareYocto,
  });
}

export async function updateShare(
  selector: WalletSelector,
  groupId: number,
  member: string,
  newShareYocto: string,
) {
  return callMethod(selector, "update_share", {
    group_id: groupId,
    member,
    new_share: newShareYocto,
  });
}

export async function payShare(
  selector: WalletSelector,
  groupId: number,
  depositYocto: string,
) {
  return callMethod(selector, "pay_share", { group_id: groupId }, BigInt(depositYocto));
}
