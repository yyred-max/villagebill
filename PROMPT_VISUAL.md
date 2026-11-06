I am getting a "WebAssembly trap: An unreachable opcode was executed" error when trying to interact with the contract from the frontend. This means there is a panic (assert/require failure) inside the Rust smart contract.

Please review `contracts/splitbill-near/src/lib.rs` and `frontend/src/lib/contract.ts`. 
1. Check if the `claim_badge` or `pay_share` functions have any strict `assert!` conditions that might be failing.
2. Ensure the arguments passed from the frontend exactly match what the Rust function expects (e.g., yoctoNEAR conversion).
3. Ensure all functions are properly defined.

After fixing any potential bugs, ensure `cargo build --target wasm32-unknown-unknown --release` compiles cleanly. Then give me the commands to deploy this as a NEW contract (`splitbill-v3.plaindove8331.testnet`).