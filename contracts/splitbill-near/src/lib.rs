use near_sdk::json_types::U128;
use near_sdk::{env, near, AccountId, PanicOnDefault, Promise, NearToken};
use near_sdk::store::IterableMap;
use std::collections::HashMap;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub groups: IterableMap<u64, Group>,
    pub next_group_id: u64,
    pub user_stats: IterableMap<AccountId, UserStats>,
    pub nft_badges: IterableMap<String, NFTBadge>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct UserStats {
    pub xp: u64,
    pub groups_created: u64,
    pub groups_completed: u64,
    pub total_paid: U128,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct NFTBadge {
    pub token_id: String,
    pub owner_id: AccountId,
    pub group_id: u64,
    pub group_name: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum GroupStatus {
    Open,
    Settled,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Member {
    pub share: U128, // Menggunakan U128 untuk format yoctoNEAR
    pub paid: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Group {
    pub id: u64,
    pub owner: AccountId,
    pub name: String,
    pub members: HashMap<AccountId, Member>,
    pub status: GroupStatus,
}

#[near]
impl Contract {
    #[init]
    pub fn new() -> Self {
        Self {
            groups: IterableMap::new(b"g"),
            next_group_id: 1,
            user_stats: IterableMap::new(b"u"),
            nft_badges: IterableMap::new(b"n"),
        }
    }

    // F2: Membuat grup baru
    pub fn create_group(&mut self, name: String) -> u64 {
        let owner = env::predecessor_account_id();
        let group_id = self.next_group_id;
        
        let group = Group {
            id: group_id,
            owner: owner.clone(),
            name,
            members: HashMap::new(),
            status: GroupStatus::Open,
        };

        self.groups.insert(group_id, group);
        self.next_group_id += 1;
        
        // Award 10 XP to owner
        self.add_xp(&owner, 10);
        self.increment_stat(&owner, "groups_created");
        
        group_id
    }

    // F3: Menambah anggota dan porsi
    pub fn add_member(&mut self, group_id: u64, member: AccountId, share: U128) {
        let caller = env::predecessor_account_id();
        let mut group = self.groups.get(&group_id).expect("GroupNotFound").clone();

        assert_eq!(caller, group.owner, "NotOwner");
        assert_eq!(group.status, GroupStatus::Open, "GroupSettled");

        group.members.insert(member, Member {
            share,
            paid: false,
        });

        self.groups.insert(group_id, group);
    }

    // F4: Mengubah porsi (hanya jika belum bayar)
    pub fn update_share(&mut self, group_id: u64, member: AccountId, new_share: U128) {
        let caller = env::predecessor_account_id();
        let mut group = self.groups.get(&group_id).expect("GroupNotFound").clone();

        assert_eq!(caller, group.owner, "NotOwner");
        assert_eq!(group.status, GroupStatus::Open, "GroupSettled");

        let m = group.members.get_mut(&member).expect("NotAMember");
        assert!(!m.paid, "AlreadyPaid");

        m.share = new_share;
        self.groups.insert(group_id, group);
    }

    // F5: Membayar porsi (Payable)
    #[payable]
    pub fn pay_share(&mut self, group_id: u64) -> Promise {
        let caller = env::predecessor_account_id();
        let deposit = env::attached_deposit();
        
        let mut group = self.groups.get(&group_id).expect("GroupNotFound").clone();
        assert_eq!(group.status, GroupStatus::Open, "GroupSettled");

        let member = group.members.get_mut(&caller).expect("NotAMember");
        assert!(!member.paid, "AlreadyPaid");
        
        let required_amount = NearToken::from_yoctonear(member.share.0);
        assert_eq!(deposit, required_amount, "IncorrectAmount");

        let payment_amount = member.share.0;
        let owner = group.owner.clone();
        
        // Tandai sudah bayar
        member.paid = true;
        
        // Award 20 XP to payer
        self.add_xp(&caller, 20);
        
        // Update total paid stat
        let mut stats = self.get_or_create_stats(&caller);
        stats.total_paid = U128(stats.total_paid.0 + payment_amount);
        self.user_stats.insert(caller.clone(), stats);
        
        // Cek apakah semua anggota sudah bayar? Jika ya, ubah status menjadi Settled
        let all_paid = group.members.values().all(|m| m.paid);
        if all_paid {
            group.status = GroupStatus::Settled;
            
            // Award 50 XP to all paid members
            for member_id in group.members.keys() {
                self.add_xp(member_id, 50);
                self.increment_stat(member_id, "groups_completed");
            }
        }
        
        // Save group state once
        self.groups.insert(group_id, group);

        // Teruskan dana ke owner
        Promise::new(owner).transfer(deposit)
    }

    // View functions
    pub fn get_group(&self, group_id: u64) -> Group {
        self.groups.get(&group_id).expect("GroupNotFound").clone()
    }

    pub fn get_groups(&self) -> Vec<Group> {
        self.groups.values().cloned().collect()
    }
    
    // F8: Claim NFT Badge
    pub fn claim_badge(&mut self, group_id: u64) -> String {
        let caller = env::predecessor_account_id();
        let group = self.groups.get(&group_id).expect("GroupNotFound");
        
        // Validation
        assert_eq!(group.status, GroupStatus::Settled, "GroupNotSettled");
        let member = group.members.get(&caller).expect("NotAMember");
        assert!(member.paid, "UserHasNotPaid");
        
        let token_id = format!("badge-{}-{}", group_id, caller);
        assert!(!self.nft_badges.contains_key(&token_id), "BadgeAlreadyClaimed");
        
        // Mint NFT badge
        let badge = NFTBadge {
            token_id: token_id.clone(),
            owner_id: caller.clone(),
            group_id,
            group_name: group.name.clone(),
        };
        
        self.nft_badges.insert(token_id.clone(), badge);
        token_id
    }
    
    // F9: User Stats
    pub fn get_user_stats(&self, account_id: AccountId) -> UserStats {
        self.user_stats.get(&account_id).cloned().unwrap_or(UserStats {
            xp: 0,
            groups_created: 0,
            groups_completed: 0,
            total_paid: U128(0),
        })
    }
    
    pub fn get_leaderboard(&self, limit: u64) -> Vec<(AccountId, UserStats)> {
        let mut leaderboard: Vec<_> = self.user_stats.iter()
            .map(|(id, stats)| (id.clone(), stats.clone()))
            .collect();
        
        leaderboard.sort_by(|a, b| b.1.xp.cmp(&a.1.xp));
        leaderboard.truncate(limit as usize);
        leaderboard
    }
    
    pub fn get_nft_badges(&self, account_id: AccountId) -> Vec<NFTBadge> {
        self.nft_badges.values()
            .filter(|b| b.owner_id == account_id)
            .cloned()
            .collect()
    }
    
    // Helper functions
    fn add_xp(&mut self, account_id: &AccountId, amount: u64) {
        let mut stats = self.get_or_create_stats(account_id);
        stats.xp += amount;
        self.user_stats.insert(account_id.clone(), stats);
    }
    
    fn increment_stat(&mut self, account_id: &AccountId, stat: &str) {
        let mut stats = self.get_or_create_stats(account_id);
        match stat {
            "groups_created" => stats.groups_created += 1,
            "groups_completed" => stats.groups_completed += 1,
            _ => {}
        }
        self.user_stats.insert(account_id.clone(), stats);
    }
    
    fn get_or_create_stats(&self, account_id: &AccountId) -> UserStats {
        self.user_stats.get(account_id).cloned().unwrap_or(UserStats {
            xp: 0,
            groups_created: 0,
            groups_completed: 0,
            total_paid: U128(0),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn get_context(predecessor: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(predecessor);
        builder
    }

    #[test]
    fn test_create_group_awards_xp() {
        let mut contract = Contract::new();
        let context = get_context(accounts(0));
        testing_env!(context.build());
        
        contract.create_group("Test Group".to_string());
        
        let stats = contract.get_user_stats(accounts(0));
        assert_eq!(stats.xp, 10);
        assert_eq!(stats.groups_created, 1);
    }

    #[test]
    fn test_pay_share_awards_xp() {
        let mut contract = Contract::new();
        
        // Create group as accounts(0)
        let mut context = get_context(accounts(0));
        testing_env!(context.build());
        let group_id = contract.create_group("Test".to_string());
        
        // Add member
        contract.add_member(group_id, accounts(1), U128(1000000000000000000000000));
        
        // Pay as accounts(1)
        context = get_context(accounts(1));
        context.attached_deposit(NearToken::from_yoctonear(1000000000000000000000000));
        testing_env!(context.build());
        
        contract.pay_share(group_id);
        
        let stats = contract.get_user_stats(accounts(1));
        assert_eq!(stats.xp, 70); // 20 for paying + 50 for completing
    }

    #[test]
    #[should_panic(expected = "GroupNotSettled")]
    fn test_claim_badge_before_settled() {
        let mut contract = Contract::new();
        let context = get_context(accounts(0));
        testing_env!(context.build());
        
        let group_id = contract.create_group("Test".to_string());
        contract.claim_badge(group_id);
    }

    #[test]
    fn test_leaderboard() {
        let mut contract = Contract::new();
        
        // Create groups with different users
        for i in 0..3 {
            let context = get_context(accounts(i));
            testing_env!(context.build());
            contract.create_group(format!("Group {}", i));
        }
        
        let leaderboard = contract.get_leaderboard(5);
        assert_eq!(leaderboard.len(), 3);
        assert_eq!(leaderboard[0].1.xp, 10);
    }
}