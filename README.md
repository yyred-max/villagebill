# SplitBill — Stellar Soroban dApp

**SplitBill** is a group expense tracker built on a smart contract deployed to **Stellar Soroban** (Testnet). Each group member pays their share of a bill *on-chain*, with payment status, group ownership, and activity history that are transparent and directly verifiable on the blockchain.

🌐 **Live demo:** [stellar-meetup.vercel.app](https://stellar-meetup.vercel.app/)

---

## ✅ Level 2 Requirements Checklist

| Requirement                     | Status                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Custom error types handled       | ✅ `AlreadyPaid`, `NotAMember`, `IncorrectAmount`, `GroupNotFound`, `NotOwner` (5 types) |
| Contract deployed on testnet      | ✅ `CA3JUJQLP2AEVMGCEOGG6SN5HJT45YPHMBTQ4HSYRK2FQ73WJXS3IQMH`                          |
| Contract called from frontend     | ✅ `createGroup`, `addMember`, `payShare`, `updateGroup`, `deleteGroup`, `settleGroup` |
| Transaction status visible        | ✅ Modal with processing → success/fail feedback                                      |
| 10+ meaningful commits            | ✅ 20+ commits (feat, fix, refactor, docs)                                             |
| Multi-wallet support              | ✅ Freighter, Albedo, LOBSTR, xBull, Rabet                                             |
| Real-time event integration       | ✅ Activity feed updates on every transaction                                          |

---

## ✨ Key Features

- **Multi-wallet support** — via [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit) (Freighter, Albedo, xBull, LOBSTR, Rabet)
- **Smart contract** for:
  - Creating a group (`create_group`)
  - Renaming a group (`update_group`) — owner only
  - Deleting a group (`delete_group`) — owner only
  - Adding a member with their bill share (`add_member`)
  - Paying a share on-chain (`pay_share`)
  - Escrow settlement (`settle_group`) — funds held in the contract until all members have paid, then withdrawn by the owner in one transaction
- **Sequential group IDs** — each new group gets an auto-incrementing ID (1, 2, 3, …), avoiding precision-loss issues with large random IDs
- **Two-layer error handling**:
  - *Wallet-level*: not found, rejected, insufficient balance
  - *Contract-level*: `AlreadyPaid`, `NotAMember`, `IncorrectAmount`, `GroupNotFound`, `NotOwner`
- **Full page set**: Dashboard (statistics), Groups (search & filter), Group Detail (manage members, pay, edit/delete, settle), Activity (history feed)
- **Modern UI** — dark mode, responsive, accessible

---

## 🧱 Tech Stack

| Component          | Technology                          |
| -------------------- | -------------------------------------- |
| Smart contract        | Rust + Soroban SDK                     |
| Frontend               | React + TypeScript + Vite              |
| Wallet integration     | `@creit.tech/stellar-wallets-kit`     |
| Blockchain SDK         | `@stellar/stellar-sdk`                |
| Network                | Stellar Testnet                        |

---

## 📁 Project Structure

```
stellar-meetup/                      # repository root (Rust/Cargo workspace)
├── contracts/
│   ├── notes/                       # separate practice contract from earlier learning exercises,
│   │   ├── src/                     # not used by the SplitBill app — kept for reference only
│   │   ├── Cargo.toml
│   │   └── Makefile
│   └── splitbill/                   # the actual SplitBill smart contract used by this app
│       ├── src/
│       │   ├── lib.rs               # main contract logic
│       │   └── test.rs              # unit tests
│       ├── Cargo.toml
│       └── Makefile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Groups.tsx
│   │   │   ├── GroupDetail.tsx
│   │   │   ├── Activity.tsx
│   │   │   ├── CreateGroupModal.tsx   # active — used by App.tsx
│   │   │   ├── AddMemberModal.tsx     # active — used by GroupDetail.tsx
│   │   │   ├── PayShareModal.tsx      # active — used by GroupDetail.tsx
│   │   │   ├── CreateGroup.tsx        # ⚠️ legacy, superseded by CreateGroupModal.tsx
│   │   │   ├── AddMember.tsx          # ⚠️ legacy, superseded by AddMemberModal.tsx
│   │   │   ├── PayShare.tsx           # ⚠️ legacy, superseded by PayShareModal.tsx
│   │   │   └── Icons.tsx
│   │   ├── lib/
│   │   │   ├── wallet.ts
│   │   │   └── contract.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── App.css
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.ts
├── Cargo.toml                       # Rust workspace manifest (covers contracts/notes + contracts/splitbill)
├── Cargo.lock
├── target/                          # shared Cargo build output (git-ignored)
└── README.md
```

> **Note:** `contracts/notes/` is a separate contract from earlier learning exercises and is not part of the SplitBill application — only `contracts/splitbill/` is deployed and used by the frontend. The `CreateGroup.tsx` / `AddMember.tsx` / `PayShare.tsx` components are earlier, simpler versions kept in the repo for reference; the app currently uses their `*Modal.tsx` counterparts.

---

## 🚀 Setup & Running

### Prerequisites

- [Rust](https://rustup.rs) with the `wasm32v1-none` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli)
- Node.js (v18+) and npm
- A Stellar wallet extension (e.g. [Freighter](https://www.freighter.app))

### 1. Clone & build the contract

```bash
git clone <REPO_URL>
cd <REPO_NAME>/contracts/splitbill
cargo test
stellar contract build
```

### 2. Deploy to testnet (optional — already deployed, see address below)

```bash
stellar keys generate alice --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32v1-none/release/splitbill.wasm \
  --source alice \
  --network testnet
```

> **Note:** after redeploying, update `CONTRACT_ID` in `frontend/src/lib/contract.ts`.

### 3. Run the frontend

```bash
cd ../../frontend
npm install
npm run dev
```

Open `http://localhost:5173`, or try the [live demo](https://stellar-meetup.vercel.app).

### 4. Connect a wallet

- Install a wallet extension and set its network to **Testnet**.
- Click **Connect Wallet** in the app and choose a wallet.
- If the account has no testnet balance, top up via [Friendbot](https://friendbot.stellar.org).

---

## 📜 Deployed Contract

**Contract address (testnet):**
`CA3JUJQLP2AEVMGCEOGG6SN5HJT45YPHMBTQ4HSYRK2FQ73WJXS3IQMH`

🔍 [View on Stellar Lab](https://lab.stellar.org/r/testnet/contract/CA3JUJQLP2AEVMGCEOGG6SN5HJT45YPHMBTQ4HSYRK2FQ73WJXS3IQMH)

---

## 🔁 Example Transaction

| Function | Transaction Hash | Stellar Explorer |
|--------|------------------|------------------|
| `create_group` | `f51be9e084e6b14509e3c3315a79091ed0073b5520baa3cda258a4b28b60f660` | [View](https://stellar.expert/explorer/testnet/tx/f51be9e084e6b14509e3c3315a79091ed0073b5520baa3cda258a4b28b60f660) |
| `add_member` | `55a1ef57521db2f8c624d564c7d4815aaf59a7d9e02e5d49dbfcccf2484d21c8` | [View](https://stellar.expert/explorer/testnet/tx/55a1ef57521db2f8c624d564c7d4815aaf59a7d9e02e5d49dbfcccf2484d21c8) |
| `pay_share` | `0b483b8e79f4bc4e9d67fa47fba0d1620d25e09f702e0076cdaa3517edb1ae6f` | [View](https://stellar.expert/explorer/testnet/tx/0b483b8e79f4bc4e9d67fa47fba0d1620d25e09f702e0076cdaa3517edb1ae6f) |
| `settle_group` | `34ac8faeea93278c4c35f2e50d61f28fe777be3145bc9b3a0540a745c740c2fa` | [View](https://stellar.expert/explorer/testnet/tx/34ac8faeea93278c4c35f2e50d61f28fe777be3145bc9b3a0540a745c740c2fa) |

---

## ⚠️ Error Handling

| Layer     | Error                    | Code | When it occurs                                                    |
| ---------- | ------------------------- | ---- | -------------------------------------------------------------------- |
| Wallet     | `not_found`                | —    | Wallet extension not detected / not installed                        |
| Wallet     | `rejected`                  | —    | User rejected or cancelled connection or signing                     |
| Wallet     | `insufficient_balance`      | —    | XLM balance below minimum (fees + reserve)                           |
| Contract   | `AlreadyPaid`                | 1    | Member tries to pay a share that is already paid                     |
| Contract   | `NotAMember`                 | 2    | Address is not a registered member of the group                      |
| Contract   | `IncorrectAmount`             | 3    | Payment amount does not match the assigned share                     |
| Contract   | `GroupNotFound`               | 4    | Group ID not found in contract storage                               |
| Contract   | `NotOwner`                     | 5    | Caller of `update_group` / `delete_group` is not the group owner     |

---

## 🧪 Testing

Unit tests cover both success and error scenarios.

```bash
cd contracts/splitbill
cargo test
```

Expected output: 4+ passing tests.

---

## 📋 Smart Contract Functions

| Function                                                    | Description                                          |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| `create_group(owner, name)`                                     | Creates a new group with a sequential ID               |
| `update_group(group_id, owner, new_name)`                       | Renames a group (owner only)                            |
| `delete_group(group_id, owner)`                                  | Deletes a group (owner only)                            |
| `add_member(group_id, owner, member, share_amount)`             | Adds a member with their bill share                     |
| `pay_share(group_id, member, amount)`                            | Pays a share, escrowing XLM into the contract            |
| `settle_group(group_id, owner)`                                  | Owner withdraws all escrowed funds once everyone has paid |
| `get_groups()`                                                    | Reads all group data                                    |
| `get_groups_by_member(member_address)`                           | Reads groups where an address is a member                |
| `get_members(group_id)`                                          | Reads all members of a group                             |

---

## 🖼️ Screenshots

### Dashboard (Account 1)
![Dashboard Account 1](./screenshots/Dashboard_akun1.png)

### Groups Page (Account 1)
![Groups Page Account 1](./screenshots/Group_akun1.png)

### Group Detail - After Creation (Account 1)
![Group Detail Success](./screenshots/Group_akun1_success.png)

### Group Detail - Before Payment (Account 2)
![Group Detail Account 2](./screenshots/Group_akun2.png)

### Pay Share Modal
![Pay Share Modal](./screenshots/PayShare_akun2.png)

### Group Detail - After Payment (Account 2)
![Group Detail Paid](./screenshots/Group_paid_akun2.png)

---

## 📄 License

MIT — free to use and modify.

---

Built on **Stellar Soroban**.