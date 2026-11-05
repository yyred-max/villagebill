// src/lib/contract.ts
import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  rpc,
  Address,
} from "@stellar/stellar-sdk";
import { kit } from "./wallet";
import { Group, Member } from "../App";

export const CONTRACT_ID = "CA3JUJQLP2AEVMGCEOGG6SN5HJT45YPHMBTQ4HSYRK2FQ73WJXS3IQMH";
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const server = new rpc.Server(RPC_URL);
const contract = new Contract(CONTRACT_ID);

export type TxStatus = "idle" | "pending" | "success" | "fail";

export async function viewContract(method: string, args: any[], sourcePublicKey: string) {
  if (!sourcePublicKey) throw new Error("Wallet not connected.");
  try {
    const account = await server.getAccount(sourcePublicKey);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
    const simulated = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulated)) {
      console.error(`Simulation error for ${method}:`, simulated.error);
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    const result = simulated.result?.retval;
    if (result) return scValToNative(result);
    return null;
  } catch (err) {
    console.error(`Error in viewContract (${method}):`, err);
    throw err;
  }
}

export async function callContract(method: string, args: any[], sourcePublicKey: string) {
  if (!sourcePublicKey) throw new Error("Wallet not connected.");
  try {
    const account = await server.getAccount(sourcePublicKey);
    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
    const simulated = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulated)) {
      console.error(`Simulation error for ${method}:`, simulated.error);
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    tx = rpc.assembleTransaction(tx, simulated).build();
    const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), { networkPassphrase: Networks.TESTNET });
    if (!signedTxXdr) throw new Error("Wallet did not return signed transaction.");
    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
    const sendResponse = await server.sendTransaction(signedTx);
    if (sendResponse.status === "ERROR") throw new Error("Transaction rejected by Stellar network.");
    const txHash = sendResponse.hash;
    let response = await server.getTransaction(txHash);
    let attempts = 0;
    while (response.status === "NOT_FOUND" && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      response = await server.getTransaction(txHash);
      attempts++;
    }
    if (response.status === "SUCCESS") {
      const result = response.returnValue ? scValToNative(response.returnValue) : null;
      return { hash: txHash, result };
    }
    throw new Error(`Transaction failed with status: ${response.status}`);
  } catch (err) {
    console.error(`Error in callContract (${method}):`, err);
    throw err;
  }
}

export async function getGroups(owner: string): Promise<Group[]> {
  if (!owner) return [];
  try {
    const result = await viewContract("get_groups", [], owner);
    if (Array.isArray(result)) {
      return result.map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        owner: String(item.owner),
        totalShare: Number(item.total_share) || 0,
        members: [],
        settled: Boolean(item.settled),
        isRecurring: Boolean(item.is_recurring), // ⬅️ BARU
        cycle: Number(item.cycle) || 1,          // ⬅️ BARU
      })).filter((g: Group) => g.owner === owner);
    }
    return [];
  } catch (err) {
    console.error("Error in getGroups:", err);
    return [];
  }
}

export async function getGroupsByMember(member: string): Promise<Group[]> {
  if (!member) return [];
  try {
    const memberScVal = new Address(member).toScVal();
    const result = await viewContract("get_groups_by_member", [memberScVal], member);
    if (Array.isArray(result)) {
      return result.map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        owner: String(item.owner),
        totalShare: Number(item.total_share) || 0,
        members: [],
        settled: Boolean(item.settled),
        isRecurring: Boolean(item.is_recurring),
        cycle: Number(item.cycle) || 1,
      }));
    }
    return [];
  } catch (err) {
    console.error("Error in getGroupsByMember:", err);
    return [];
  }
}

// 🔥 getMembers: konversi stroop → XLM
export async function getMembers(groupId: bigint, sourcePublicKey: string): Promise<Member[]> {
  try {
    const result = await viewContract("get_members", [nativeToScVal(groupId, { type: "u64" })], sourcePublicKey);
    if (Array.isArray(result)) {
      return result.map((m: any) => ({
        address: String(m.address),
        share: Number(m.share_amount) / 10_000_000, // ✅ konversi
        paid: Boolean(m.has_paid),
      }));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching members for group ${groupId}:`, err);
    return [];
  }
}

export async function createGroup(owner: string, name: string, isRecurring: boolean = false) {
  if (!owner) throw new Error("Wallet not connected.");
  if (!name.trim()) throw new Error("Group name cannot be empty.");
  return callContract(
    "create_group",
    [
      new Address(owner).toScVal(),
      nativeToScVal(name.trim(), { type: "string" }),
      nativeToScVal(isRecurring, { type: "bool" }),
    ],
    owner
  );
}

export async function addMember(groupId: bigint, owner: string, member: string, shareAmount: bigint) {
  if (!owner) throw new Error("Owner wallet not connected.");
  if (!member) throw new Error("Member address required.");
  if (groupId <= 0n) throw new Error("Group ID must be > 0.");
  if (shareAmount <= 0n) throw new Error("Share must be > 0.");
  return callContract(
    "add_member",
    [nativeToScVal(groupId, { type: "u64" }), new Address(owner).toScVal(), new Address(member).toScVal(), nativeToScVal(shareAmount, { type: "i128" })],
    owner
  );
}

export async function payShare(groupId: bigint, member: string, amount: bigint) {
  if (!member) throw new Error("Wallet not connected.");
  if (groupId <= 0n) throw new Error("Group ID must be > 0.");
  if (amount <= 0n) throw new Error("Amount must be > 0.");
  return callContract(
    "pay_share",
    [nativeToScVal(groupId, { type: "u64" }), new Address(member).toScVal(), nativeToScVal(amount, { type: "i128" })],
    member
  );
}

export async function updateGroup(groupId: bigint, owner: string, newName: string) {
  if (!owner) throw new Error("Wallet not connected.");
  if (!newName.trim()) throw new Error("Name cannot be empty.");
  return callContract(
    "update_group",
    [nativeToScVal(groupId, { type: "u64" }), new Address(owner).toScVal(), nativeToScVal(newName.trim(), { type: "string" })],
    owner
  );
}

export async function deleteGroup(groupId: bigint, owner: string) {
  if (!owner) throw new Error("Wallet not connected.");
  return callContract(
    "delete_group",
    [nativeToScVal(groupId, { type: "u64" }), new Address(owner).toScVal()],
    owner
  );
}

export async function settleGroup(groupId: bigint, owner: string) {
  if (!owner) throw new Error("Wallet not connected.");
  if (groupId <= 0n) throw new Error("Group ID must be > 0.");
  return callContract(
    "settle_group",
    [nativeToScVal(groupId, { type: "u64" }), new Address(owner).toScVal()],
    owner
  );
}