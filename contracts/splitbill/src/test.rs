#[test]
fn test_get_groups_by_member() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SplitBillContract, ());
    let client = SplitBillContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let member1 = Address::generate(&env);
    let member2 = Address::generate(&env);
    let stranger = Address::generate(&env);

    // Buat grup 1
    let group1 = client.create_group(
        &owner,
        &String::from_str(&env, "Trip to Bali"),
    );
    client.add_member(&group1.id, &owner, &member1, &100);
    client.add_member(&group1.id, &owner, &member2, &150);

    // Buat grup 2
    let group2 = client.create_group(
        &owner,
        &String::from_str(&env, "Dinner"),
    );
    client.add_member(&group2.id, &owner, &member1, &50);

    // Ambil grup yang diikuti oleh member1
    let groups_for_member1 = client.get_groups_by_member(&member1);

    // Harus ada 2 grup: Trip to Bali dan Dinner
    assert_eq!(groups_for_member1.len(), 2);
    let found_ids: Vec<u64> = groups_for_member1.iter().map(|g| g.id).collect();
    assert!(found_ids.contains(&group1.id));
    assert!(found_ids.contains(&group2.id));

    // Ambil grup yang diikuti oleh member2
    let groups_for_member2 = client.get_groups_by_member(&member2);
    assert_eq!(groups_for_member2.len(), 1);
    assert_eq!(groups_for_member2.get(0).unwrap().id, group1.id);

    // Ambil grup yang diikuti oleh stranger (tidak terdaftar di grup mana pun)
    let groups_for_stranger = client.get_groups_by_member(&stranger);
    assert_eq!(groups_for_stranger.len(), 0);
}