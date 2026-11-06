Now that the app is working, let's do a quick Security Audit of the smart contract before submitting to the hackathon.

Please review `contracts/splitbill-near/src/lib.rs` and check for vulnerabilities based on the following criteria:

1. **Access Control**: Verify that critical functions (`add_member`, `update_share`, `settle_group` if it exists) can ONLY be called by the group owner.
2. **Financial Logic**: Verify that `pay_share` correctly asserts the deposit amount and doesn't allow users to pay less than their share, or double-pay.
3. **Reentrancy**: Verify that state updates (e.g., `member.paid = true`) happen BEFORE external calls (e.g., `Promise::new().transfer()`).
4. **Overflow/Underflow**: Ensure there are no unsafe math operations with `u128` or `NearToken`.
5. **Panic Handling**: Ensure that `.unwrap()` or `.expect()` are used safely without exposing sensitive state.

If you find any potential vulnerabilities, fix them. If everything looks secure, just tell me "The contract is secure" and explain why.