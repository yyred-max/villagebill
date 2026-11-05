#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
    String, Symbol, Vec,
};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Group {
    pub id: u64,
    pub name: String,
    pub owner: Address,
    pub total_members: u32,
    pub members_paid: u32,
    pub settled: bool,
    pub is_recurring: bool,   // ⬅️ BARU
    pub cycle: u32,           // ⬅️ BARU
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Member {
    pub group_id: u64,
    pub address: Address,
    pub share_amount: i128,
    pub has_paid: bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum SplitBillError {
    AlreadyPaid = 1,
    NotAMember = 2,
    IncorrectAmount = 3,
    GroupNotFound = 4,
    NotOwner = 5,
    NotFullyPaid = 6,
    AlreadySettled = 7,
}

const GROUP_DATA: Symbol = symbol_short!("GROUPS");
const MEMBER_DATA: Symbol = symbol_short!("MEMBERS");
const NEXT_ID: Symbol = symbol_short!("NEXT_ID");
const TOKEN_KEY: Symbol = symbol_short!("TOKEN");

#[contract]
pub struct SplitBillContract;

#[contractimpl]
impl SplitBillContract {
    pub fn initialize(env: Env, native_token: Address) {
        env.storage().instance().set(&TOKEN_KEY, &native_token);
    }

    pub fn get_groups(env: Env) -> Vec<Group> {
        env.storage()
            .instance()
            .get(&GROUP_DATA)
            .unwrap_or(Vec::new(&env))
    }

    // 🔥 create_group sekarang menerima 3 argumen: owner, name, is_recurring
    pub fn create_group(env: Env, owner: Address, name: String, is_recurring: bool) -> Group {
        owner.require_auth();

        let mut groups: Vec<Group> = env
            .storage()
            .instance()
            .get(&GROUP_DATA)
            .unwrap_or(Vec::new(&env));

        let next_id: u64 = env
            .storage()
            .instance()
            .get(&NEXT_ID)
            .unwrap_or(1u64);

        let group = Group {
            id: next_id,
            name,
            owner: owner.clone(),
            total_members: 0,
            members_paid: 0,
            settled: false,
            is_recurring,
            cycle: 1,   // semua grup mulai dari cycle 1
        };

        groups.push_back(group.clone());
        env.storage().instance().set(&GROUP_DATA, &groups);
        env.storage().instance().set(&NEXT_ID, &(next_id + 1));

        env.events()
            .publish((symbol_short!("g_create"), group.id), owner);

        group
    }

    // ⬇️ DIUBAH: return type menjadi Result, tambah pengecekan settled
    pub fn add_member(
        env: Env,
        group_id: u64,
        owner: Address,
        member: Address,
        share_amount: i128,
    ) -> Result<String, SplitBillError> {
        owner.require_auth();

        // 🔥 Cek apakah grup sudah settled
        let groups: Vec<Group> = env
            .storage()
            .instance()
            .get(&GROUP_DATA)
            .unwrap_or(Vec::new(&env));

        let mut group_found = false;
        let mut group_settled = false;
        for g in groups.iter() {
            if g.id == group_id {
                group_found = true;
                group_settled = g.settled;
                break;
            }
        }
        if !group_found {
            return Err(SplitBillError::GroupNotFound);
        }
        if group_settled {
            return Err(SplitBillError::AlreadySettled);
        }

        let mut members: Vec<Member> = env
            .storage()
            .instance()
            .get(&MEMBER_DATA)
            .unwrap_or(Vec::new(&env));

        let member_data = Member {
            group_id,
            address: member.clone(),
            share_amount,
            has_paid: false,
        };
        members.push_back(member_data);
        env.storage().instance().set(&MEMBER_DATA, &members);

        let mut groups_mut: Vec<Group> = env
            .storage()
            .instance()
            .get(&GROUP_DATA)
            .unwrap_or(Vec::new(&env));

        for i in 0..groups_mut.len() {
            let mut g = groups_mut.get(i).unwrap();
            if g.id == group_id {
                g.total_members += 1;
                groups_mut.set(i, g);
                break;
            }
        }
        env.storage().instance().set(&GROUP_DATA, &groups_mut);

        env.events()
            .publish((symbol_short!("m_add"), group_id), member);

        Ok(String::from_str(&env, "Member berhasil ditambahkan"))
    }

    // ============================================================
    // pay_share — transfer XLM dari member ke KONTRAK (escrow)
    // ============================================================
    pub fn pay_share(
        env: Env,
        group_id: u64,
        member: Address,
        amount: i128,
    ) -> Result<String, SplitBillError> {
        member.require_auth();

        let mut members: Vec<Member> = env
            .storage()
            .instance()
            .get(&MEMBER_DATA)
            .unwrap_or(Vec::new(&env));

        let mut found_index: Option<u32> = None;
        for i in 0..members.len() {
            let m = members.get(i).unwrap();
            if m.group_id == group_id && m.address == member {
                found_index = Some(i);
                break;
            }
        }

        let index = found_index.ok_or(SplitBillError::NotAMember)?;
        let mut member_data = members.get(index).unwrap();

        if member_data.has_paid {
            return Err(SplitBillError::AlreadyPaid);
        }
        if amount != member_data.share_amount {
            return Err(SplitBillError::IncorrectAmount);
        }

        // 🔥 INTER-CONTRACT CALL: transfer XLM dari member ke kontrak ini
        let token_addr: Address = env
            .storage()
            .instance()
            .get(&TOKEN_KEY)
            .expect("contract belum di-initialize, panggil initialize() dulu");
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&member, &env.current_contract_address(), &amount);

        member_data.has_paid = true;
        members.set(index, member_data);
        env.storage().instance().set(&MEMBER_DATA, &members);

        let mut groups: Vec<Group> = env
            .storage()
            .instance()
            .get(&GROUP_DATA)
            .unwrap_or(Vec::new(&env));
        for i in 0..groups.len() {
            let mut g = groups.get(i).unwrap();
            if g.id == group_id {
                g.members_paid += 1;
                groups.set(i, g);
                break;
            }
        }
        env.storage().instance().set(&GROUP_DATA, &groups);

        env.events()
            .publish((symbol_short!("m_paid"), group_id), (member, amount));

        Ok(String::from_str(&env, "Pembayaran berhasil, dana ditahan di kontrak"))
    }

    // ============================================================
    // settle_group — owner menarik semua dana escrow
    // ============================================================
    pub fn settle_group(env: Env, group_id: u64, owner: Address) -> Result<i128, SplitBillError> {
        owner.require_auth();

        let mut groups: Vec<Group> = env
            .storage()
            .instance()
            .get(&GROUP_DATA)
            .unwrap_or(Vec::new(&env));

        let mut idx_found: Option<u32> = None;
        for i in 0..groups.len() {
            let g = groups.get(i).unwrap();
            if g.id == group_id {
                if g.owner != owner {
                    return Err(SplitBillError::NotOwner);
                }
                if g.settled {
                    return Err(SplitBillError::AlreadySettled);
                }
                if g.total_members == 0 || g.members_paid < g.total_members {
                    return Err(SplitBillError::NotFullyPaid);
                }
                idx_found = Some(i);
                break;
            }
        }
        let i = idx_found.ok_or(SplitBillError::GroupNotFound)?;
        let mut g = groups.get(i).unwrap();

        // Hitung total dana yang sudah terkumpul dari member grup ini
        let members: Vec<Member> = env
            .storage()
            .instance()
            .get(&MEMBER_DATA)
            .unwrap_or(Vec::new(&env));
        let mut total: i128 = 0;
        for j in 0..members.len() {
            let m = members.get(j).unwrap();
            if m.group_id == group_id && m.has_paid {
                total += m.share_amount;
            }
        }

        // 🔥 INTER-CONTRACT CALL: transfer dari kontrak ke owner
        let token_addr: Address = env
            .storage()
            .instance()
            .get(&TOKEN_KEY)
            .expect("contract belum di-initialize");
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &owner, &total);

        g.settled = true;
        groups.set(i, g);
        env.storage().instance().set(&GROUP_DATA, &groups);

        env.events()
            .publish((symbol_short!("g_settle"), group_id), (owner.clone(), total));

        Ok(total)
    }

    pub fn get_members(env: Env, group_id: u64) -> Vec<Member> {
        let members: Vec<Member> = env
            .storage()
            .instance()
            .get(&MEMBER_DATA)
            .unwrap_or(Vec::new(&env));

        let mut result: Vec<Member> = Vec::new(&env);

        for i in 0..members.len() {
            let m = members.get(i).unwrap();
            if m.group_id == group_id {
                result.push_back(m);
            }
        }

        result
    }

    pub fn get_groups_by_member(env: Env, member_address: Address) -> Vec<Group> {
        let all_members: Vec<Member> = env
            .storage()
            .instance()
            .get(&MEMBER_DATA)
            .unwrap_or(Vec::new(&env));

        let mut group_ids: Vec<u64> = Vec::new(&env);
        for i in 0..all_members.len() {
            let m = all_members.get(i).unwrap();
            if m.address == member_address {
                let mut already_exists = false;
                for j in 0..group_ids.len() {
                    if group_ids.get(j).unwrap() == m.group_id {
                        already_exists = true;
                        break;
                    }
                }
                if !already_exists {
                    group_ids.push_back(m.group_id);
                }
            }
        }

        let all_groups: Vec<Group> = env
            .storage()
            .instance()
            .get(&GROUP_DATA)
            .unwrap_or(Vec::new(&env));

        let mut result: Vec<Group> = Vec::new(&env);
        for i in 0..all_groups.len() {
            let g = all_groups.get(i).unwrap();
            for j in 0..group_ids.len() {
                if g.id == group_ids.get(j).unwrap() {
                    result.push_back(g);
                    break;
                }
            }
        }

        result
    }

    // ============================================================
    // 🆕 Update group name
    // ============================================================
    pub fn update_group(
        env: Env,
        group_id: u64,
        owner: Address,
        new_name: String,
    ) -> Result<Group, SplitBillError> {
        owner.require_auth();

        let mut groups: Vec<Group> = env
            .storage()
            .instance()
            .get(&GROUP_DATA)
            .unwrap_or(Vec::new(&env));

        for i in 0..groups.len() {
            let g = groups.get(i).unwrap();
            if g.id == group_id {
                if g.owner != owner {
                    return Err(SplitBillError::NotOwner);
                }
                let mut updated = g;
                updated.name = new_name;
                groups.set(i, updated.clone());
                env.storage().instance().set(&GROUP_DATA, &groups);
                env.events()
                    .publish((symbol_short!("g_update"), group_id), owner);
                return Ok(updated);
            }
        }
        Err(SplitBillError::GroupNotFound)
    }

    // ============================================================
    // 🆕 Delete group
    // ============================================================
    pub fn delete_group(
        env: Env,
        group_id: u64,
        owner: Address,
    ) -> Result<(), SplitBillError> {
        owner.require_auth();

        let groups: Vec<Group> = env
            .storage()
            .instance()
            .get(&GROUP_DATA)
            .unwrap_or(Vec::new(&env));

        let mut new_groups: Vec<Group> = Vec::new(&env);
        let mut found = false;

        for i in 0..groups.len() {
            let g = groups.get(i).unwrap();
            if g.id == group_id {
                if g.owner != owner {
                    return Err(SplitBillError::NotOwner);
                }
                found = true;
                // skip this group (delete)
            } else {
                new_groups.push_back(g);
            }
        }

        if !found {
            return Err(SplitBillError::GroupNotFound);
        }

        env.storage().instance().set(&GROUP_DATA, &new_groups);
        env.events()
            .publish((symbol_short!("g_delete"), group_id), owner);
        Ok(())
    }
}

mod test;