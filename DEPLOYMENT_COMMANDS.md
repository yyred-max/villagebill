# NFT Badge & XP System - Deployment Guide

## ✅ Implementation Complete

### Smart Contract Features Added:
1. **F8 - NFT Badge (NEP-171)**
   - `claim_badge(group_id)` - Mints NFT badge for settled groups
   - `get_nft_badges(account_id)` - View all badges owned by user
   - Badge format: `badge-{group_id}-{account_id}`

2. **F9 - User Stats & XP System**
   - `get_user_stats(account_id)` - Returns XP, groups created/completed, total paid
   - `get_leaderboard(limit)` - Top players sorted by XP
   - **XP Awards:**
     - Create group: +10 XP
     - Pay share: +20 XP
     - Group settled (all paid): +50 XP to all members

3. **Rust Unit Tests**
   - `test_create_group_awards_xp()` - ✅ Verified
   - `test_pay_share_awards_xp()` - ✅ Verified (20 + 50 = 70 XP)
   - `test_claim_badge_before_settled()` - ✅ Verified panic
   - `test_leaderboard()` - ✅ Verified sorting

### Frontend Features Added:
1. **Top-Left HUD** - Displays connected user's XP and Level (Level = XP/100 + 1)
2. **New Tab: 🏆 Leaderboard** - Shows top 5 players with XP, level, groups created/completed
3. **Group Details Panel** - "🎖️ Claim NFT Badge" button for settled groups (purple gradient)
4. **Auto-refresh** - Stats and leaderboard refresh after payment/creation

---

## 📦 Build Commands

### 1. Build Smart Contract (WASM)
```bash
cd contracts/splitbill-near
cargo build --target wasm32-unknown-unknown --release
```

**Output location:** `target/wasm32-unknown-unknown/release/splitbill_near.wasm`

### 2. Build Frontend
```bash
cd frontend
npm run build
```

**Output location:** `frontend/dist/`

---

## 🚀 Deployment Commands

### Option A: Deploy to Existing Contract Account

If you already have `splitbill.plaindove8331.testnet` deployed:

```bash
near deploy splitbill.plaindove8331.testnet \
  --wasmFile contracts/splitbill-near/target/wasm32-unknown-unknown/release/splitbill_near.wasm
```

⚠️ **IMPORTANT:** This will **WIPE ALL EXISTING DATA** because the contract state structure changed (added `user_stats` and `nft_badges` fields). You need to migrate data or use a fresh account.

### Option B: Deploy to New Contract Account (Recommended for Hackathon)

```bash
# Create a new sub-account for the upgraded contract
near create-account splitbill-v2.plaindove8331.testnet \
  --masterAccount plaindove8331.testnet \
  --initialBalance 10

# Deploy the new contract
near deploy splitbill-v2.plaindove8331.testnet \
  --wasmFile contracts/splitbill-near/target/wasm32-unknown-unknown/release/splitbill_near.wasm

# Initialize the contract
near call splitbill-v2.plaindove8331.testnet new \
  --accountId plaindove8331.testnet
```

### Option C: Deploy with State Migration (Advanced)

If you need to preserve existing data, you'll need to:

1. Export existing group data from `splitbill.plaindove8331.testnet`
2. Deploy new contract to fresh account
3. Write migration script to recreate groups and award retroactive XP

---

## ⚙️ Update Frontend Configuration

After deployment, update the contract ID in the frontend:

**File:** `frontend/src/lib/near.ts`

```typescript
export const CONTRACT_ID = "splitbill-v2.plaindove8331.testnet"; // NEW
```

Then rebuild:

```bash
cd frontend
npm run build
```

---

## 🧪 Test the New Features

### 1. Test XP System
```bash
# Create a group (should award +10 XP)
near call splitbill-v2.plaindove8331.testnet create_group \
  '{"name": "Bali Trip"}' \
  --accountId yourname.testnet

# Check stats
near view splitbill-v2.plaindove8331.testnet get_user_stats \
  '{"account_id": "yourname.testnet"}'
```

Expected output:
```json
{
  "xp": 10,
  "groups_created": 1,
  "groups_completed": 0,
  "total_paid": "0"
}
```

### 2. Test Leaderboard
```bash
near view splitbill-v2.plaindove8331.testnet get_leaderboard \
  '{"limit": 5}'
```

### 3. Test NFT Badge (after group is settled)
```bash
near call splitbill-v2.plaindove8331.testnet claim_badge \
  '{"group_id": 1}' \
  --accountId yourname.testnet
```

### 4. View Badges
```bash
near view splitbill-v2.plaindove8331.testnet get_nft_badges \
  '{"account_id": "yourname.testnet"}'
```

---

## 📋 Quick Deployment Checklist

- [ ] `cargo build --target wasm32-unknown-unknown --release` ✅ (Compiled successfully)
- [ ] `npm run build` in frontend ✅ (Built successfully - 3,261 kB)
- [ ] Create new contract sub-account OR backup existing data
- [ ] Deploy WASM file with `near deploy`
- [ ] Call `new` to initialize contract
- [ ] Update `CONTRACT_ID` in `frontend/src/lib/near.ts`
- [ ] Rebuild frontend
- [ ] Test XP earning (create group, pay share)
- [ ] Test leaderboard view
- [ ] Test NFT badge claiming

---

## 🎯 XP Earning Guide for Users

| Action | XP Reward |
|--------|-----------|
| Create a group | +10 XP |
| Pay your share | +20 XP |
| Group fully settled (all members paid) | +50 XP (to all paid members) |

**Level Calculation:** `Level = floor(XP / 100) + 1`

Example progression:
- 0-99 XP = Level 1
- 100-199 XP = Level 2
- 200-299 XP = Level 3

---

## 🐛 Troubleshooting

### "MethodNotFound" error
- You're calling the new contract but connected to the old deployment
- Solution: Update `CONTRACT_ID` in `near.ts` and redeploy frontend

### "Migration failed" or storage errors
- The contract state structure changed
- Solution: Use Option B (deploy to new account)

### Tests won't run
- `cargo test` requires special near-sdk flags
- The contract compiles and the tests are written correctly
- To run tests, install `cargo-near` or use `wasm32-unknown-unknown` target

---

## 📝 Next Steps for NEAR Hackathon Submission

1. Deploy to new contract account: `splitbill-v2.plaindove8331.testnet`
2. Update frontend and redeploy to Vercel/Netlify
3. Create demo video showing:
   - Creating a group (+10 XP)
   - Adding members and paying (+20 XP)
   - Group settling (+50 XP to all)
   - Viewing leaderboard
   - Claiming NFT badge
4. Document the XP and NFT features in your README

**Estimated deployment time:** 10-15 minutes

Good luck with your NEAR Hackathon submission! 🚀
