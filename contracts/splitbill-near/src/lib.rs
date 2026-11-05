use near_sdk::json_types::U128;
use near_sdk::{env, near, AccountId, PanicOnDefault, Promise, NearToken};
use near_sdk::store::IterableMap;
use std::collections::HashMap;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub groups: IterableMap<u64, Group>,
    pub next_group_id: u64,
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
        }
    }

    // F2: Membuat grup baru
    pub fn create_group(&mut self, name: String) -> u64 {
        let owner = env::predecessor_account_id();
        let group_id = self.next_group_id;
        
        let group = Group {
            id: group_id,
            owner,
            name,
            members: HashMap::new(),
            status: GroupStatus::Open,
        };

        self.groups.insert(group_id, group);
        self.next_group_id += 1;
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
        assert_eq!(m.paid, false, "AlreadyPaid");

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
        assert_eq!(member.paid, false, "AlreadyPaid");
        assert_eq!(deposit, NearToken::from_yoctonear(member.share.0), "IncorrectAmount");

        // Tandai sudah bayar
        member.paid = true;
        self.groups.insert(group_id, group.clone());

        // Cek apakah semua anggota sudah bayar? Jika ya, ubah status menjadi Settled
        let all_paid = group.members.values().all(|m| m.paid);
        if all_paid {
            group.status = GroupStatus::Settled;
            self.groups.insert(group_id, group.clone());
        }

        // Teruskan dana ke owner
        Promise::new(group.owner).transfer(deposit)
    }

    // View functions
    pub fn get_group(&self, group_id: u64) -> Group {
        self.groups.get(&group_id).expect("GroupNotFound").clone()
    }

    pub fn get_groups(&self) -> Vec<Group> {
        self.groups.values().cloned().collect()
    }
}