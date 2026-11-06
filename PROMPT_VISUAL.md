The visual game world is PERFECT. I have verified the trees, path, chickens, and puzzle buildings are all rendering beautifully. DO NOT touch the Phaser code or CSS ever again.

We are running out of time for the NEAR Hackathon. You must now execute the FINAL backend and integration tasks: **F8 - NFT Badge (NEP-171)** and **F9 - User Stats/XP/Leaderboard**. 

Do NOT write reports. Directly modify the code:

### Part 1: Smart Contract (Rust)
1. **`contracts/splitbill-near/Cargo.toml`**: Add `near-contract-standards = "5.1.0"` to dependencies.
2. **`contracts/splitbill-near/src/lib.rs`**:
   - Add a simple NEP-171 implementation using `near_contract_standards::non_fungible_token::NonFungibleToken`.
   - Add `claim_badge(group_id: u64)` function. Mints NFT ID `format!("badge-{}-{}", group_id, caller)`. Panics if group is not Settled, user hasn't paid, or already claimed.
   - Add XP tracking: Add `user_stats: IterableMap<AccountId, UserStats>` to the Contract struct.
   - Update `create_group`: +10 XP to owner.
   - Update `pay_share`: +20 XP to payer. If group becomes Settled, +50 XP to all members who paid.
   - Add view methods: `get_user_stats(account_id)` and `get_leaderboard(limit)`.
   - Write basic Rust unit tests for the new functions.

### Part 2: Frontend Integration
1. **`frontend/src/lib/contract.ts`**: Add helper functions to call `claim_badge`, `get_user_stats`, and `get_leaderboard`.
2. **`frontend/src/App.tsx`**: 
   - In the Top-Left HUD, display the connected user's XP and Level (Level = XP / 100 + 1).
   - Add a new tab to the Right Sidebar called "🏆 Leaderboard" showing the top 5 users (Account ID and XP).
3. **Group Details Panel**: If a group is `Settled`, and the connected user has paid, show a "🎖️ Claim NFT Badge" button that calls `claim_badge`.

Run `cargo build --target wasm32-unknown-unknown --release` and `npm run build` to ensure everything compiles. Then, provide the exact `near deploy` CLI commands I need to run.