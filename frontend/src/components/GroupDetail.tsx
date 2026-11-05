// src/components/GroupDetail.tsx
import { useState } from "react";
import AddMemberModal from "./AddMemberModal";
import PayShareModal from "./PayShareModal";
import { truncateHash } from "../utils/format";
import { IconPlus, IconLogout, IconUsers, IconCheck, IconCreditCard } from "./Icons";
import type { Group, Member, Activity } from "../App"; // ✅ hanya import dari App
import { addMember, payShare, updateGroup, deleteGroup, settleGroup } from "../lib/contract";

interface GroupDetailProps {
  address: string | null;
  group: Group;
  onAddMember: (groupId: string, member: Member) => void;
  onMarkPaid: (groupId: string, memberAddress: string) => void;
  onDisconnect: () => void;
  onGoHome: () => void;
  onGoGroups: () => void;
  onGoActivity: () => void;
  onActivityAdd?: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  onRefresh?: () => void;
  onSettled: (groupId: string) => void;
}

function shortAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function GroupDetail({
  address,
  group,
  onAddMember,
  onMarkPaid,
  onDisconnect,
  onGoHome,
  onGoGroups,
  onGoActivity,
  onActivityAdd,
  onRefresh,
  onSettled,
}: GroupDetailProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [payTarget, setPayTarget] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);

  const totalMembers = group.members.length;
  const paidCount = group.members.filter((m) => m.paid).length;
  const yourShare = totalMembers > 0 ? group.totalShare / totalMembers : 0;

  const handleMemberAdded = (member: Member) => {
    onAddMember(group.id, member);
  };

  const handleAddMemberContract = async (memberAddress: string, share: number): Promise<{ hash: string }> => {
    if (!address) throw new Error("Wallet not connected");
    if (group.settled) throw new Error("This group has already been settled. Cannot add new members.");

    let groupId: bigint;
    try {
      groupId = BigInt(group.id);
    } catch (e) {
      throw new Error("Invalid group ID. Please create a new group.");
    }
    if (groupId <= 0n) throw new Error("Invalid group ID");

    const shareAmount = BigInt(Math.round(share * 10_000_000));
    if (shareAmount <= 0n) throw new Error("Share must be > 0");

    const result = await addMember(groupId, group.owner, memberAddress, shareAmount);
    return { hash: result.hash };
  };

  const handlePayShareContract = async (memberAddress: string, amount: number): Promise<{ hash: string }> => {
    if (!address) throw new Error("Wallet not connected");
    let groupId: bigint;
    try {
      groupId = BigInt(group.id);
    } catch (e) {
      throw new Error("Invalid group ID");
    }

    const amountStroop = BigInt(Math.round(amount * 10_000_000));
    if (amountStroop <= 0n) throw new Error("Amount must be > 0");

    const result = await payShare(groupId, memberAddress, amountStroop);
    return { hash: result.hash };
  };

  const handleEdit = async () => {
    if (!address) return;
    if (address !== group.owner) {
      alert("Only the group owner can edit.");
      return;
    }
    try {
      const groupId = BigInt(group.id);
      console.log("📝 Editing group:", { groupId: groupId.toString(), owner: address });
      await updateGroup(groupId, address, editName);
      onActivityAdd?.({
        type: 'group_created',
        title: `Group renamed to "${editName}"`,
        description: `Group ID: ${group.id}`,
      });
      setIsEditing(false);
      if (onRefresh) onRefresh();
      onGoGroups();
    } catch (err: any) {
      console.error("Edit error:", err);
      alert(err.message || "Failed to update group.");
    }
  };

  const handleDelete = async () => {
    if (!address) return;
    if (address !== group.owner) {
      alert("Only the group owner can delete.");
      return;
    }

    let groupId: bigint;
    try {
      console.log("🧪 group.id from state:", group.id, "type:", typeof group.id);
      groupId = BigInt(group.id);
      console.log("🧪 groupId as BigInt:", groupId.toString());
    } catch (err) {
      console.error("❌ Invalid group.id:", group.id);
      alert("Group ini tidak bisa dihapus karena ID tidak valid. Silakan buat grup baru.");
      return;
    }

    if (groupId <= 0n) {
      alert("Group ID tidak valid.");
      return;
    }

    if (!confirm(`Delete group "${group.name}"? This action cannot be undone.`)) return;

    try {
      console.log("🗑️ Sending delete_group with:", { groupId: groupId.toString(), owner: address });
      const result = await deleteGroup(groupId, address);
      console.log("✅ Delete result:", result);
      onActivityAdd?.({
        type: 'group_created',
        title: `Group "${group.name}" deleted`,
        description: `Group ID: ${group.id}`,
      });
      if (onRefresh) onRefresh();
      onGoGroups();
    } catch (err: any) {
      console.error("❌ Delete error:", err);
      alert(err.message || "Failed to delete group. Please check console for details.");
    }
  };

  const handleSettle = async () => {
    if (!address) return;
    if (address !== group.owner) {
      alert("Only the group owner can settle.");
      return;
    }
    if (totalMembers === 0 || paidCount !== totalMembers) {
      alert("All members must have paid before settling.");
      return;
    }
    if (group.settled) {
      alert("This group has already been settled.");
      return;
    }
    if (!confirm(`Settle group "${group.name}"? This will transfer all collected XLM to your wallet.`)) return;
    try {
      const groupId = BigInt(group.id);
      console.log("💰 Settling group:", { groupId: groupId.toString(), owner: address });
      const result = await settleGroup(groupId, address);
      console.log("✅ Settle result:", result);
      const amount = result?.result ?? 0;
      onActivityAdd?.({
        type: 'share_paid',
        title: `Group "${group.name}" settled`,
        description: `Total collected: ${amount} XLM • Tx: ${truncateHash(result?.hash ?? '')}`,
      });
      onSettled(group.id);
      if (onRefresh) onRefresh();
      onGoGroups();
    } catch (err: any) {
      console.error("❌ Settle error:", err);
      alert(err.message || "Failed to settle group.");
    }
  };

  const isOwner = address === group.owner;

  return (
    <div className="dashboard group-detail-page">
      <header className="navbar dashboard-navbar">
        <div className="brand">
          <div className="brand-icon"><span className="brand-bars" /></div>
          <h1>SplitBill</h1>
        </div>
        <nav className="dashboard-tabs">
          <button className="dashboard-tab" onClick={onGoHome}>Dashboard</button>
          <button className="dashboard-tab active" onClick={onGoGroups}>Groups</button>
          <button className="dashboard-tab" onClick={onGoActivity}>Activity</button>
        </nav>
        <div className="dashboard-account">
          <span className="pulse-dot" />
          <span className="account-label">Connected</span>
          <span className="account-address">
            {address ? shortAddr(address) : "GABCD...7XYZ"}
          </span>
          <button className="account-logout" onClick={onDisconnect} aria-label="Disconnect">
            <IconLogout />
          </button>
        </div>
      </header>

      <div className="group-breadcrumb">
        <button className="crumb-link" onClick={onGoGroups}>Groups</button>
        <span className="crumb-sep">›</span>
        <span className="crumb-current">{group.name}</span>
      </div>

      <div className="group-detail-header">
        <h1 className="group-detail-title">{group.name}</h1>
        <div className="group-actions-row">
          {isOwner && !group.settled && (
            <>
              <button
                className="btn-secondary group-action-btn"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
              <button
                className="btn-secondary group-action-btn"
                onClick={handleDelete}
                style={{ color: 'var(--red)' }}
              >
                Delete
              </button>
            </>
          )}
          {!group.settled && (
            <button
              className="btn-primary group-action-btn"
              onClick={() => setShowAddMember(true)}
            >
              <IconPlus /> Add Member
            </button>
          )}
          {isOwner && totalMembers > 0 && paidCount === totalMembers && !group.settled && (
            <button
              className="btn-primary group-action-btn"
              onClick={handleSettle}
              style={{ background: 'var(--green)' }}
            >
              <IconCreditCard /> Settle
            </button>
          )}
          {group.settled && (
            <span
              className="badge-completed group-action-btn"
              style={{
                background: 'var(--green)',
                color: '#fff',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <IconCheck /> Already Settled
            </span>
          )}
        </div>
      </div>

      <div className="group-detail-grid">
        <div className="members-card">
          <h2>Members</h2>
          {group.members.length === 0 ? (
            <p className="members-empty">No members yet. Add the first one to start splitting.</p>
          ) : (
            <ul className="member-list">
              {group.members.map((m) => {
                const isCurrentUser = address && m.address === address;
                return (
                  <li key={m.address} className="member-row">
                    <span className="member-avatar-lg"><IconUsers /></span>
                    <div className="member-row-identity">
                      <strong>{shortAddr(m.address)}</strong>
                      <span className="member-row-addr">{m.address}</span>
                    </div>
                    <span className="member-row-share">{m.share.toLocaleString()} XLM</span>
                    <span className={`status-badge ${m.paid ? "status-paid" : "status-pending"}`}>
                      {m.paid ? "Paid" : "Pending"}
                    </span>
                    {!m.paid && isCurrentUser && (
                      <button className="btn-pay-share" onClick={() => setPayTarget(m)}>
                        Pay
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="summary-card">
          <h2>Group Summary</h2>
          <div className="summary-row"><span>Total Members</span><strong>{totalMembers}</strong></div>
          <div className="summary-row"><span>Total Bill</span><strong>{group.totalShare.toLocaleString()} XLM</strong></div>
          <div className="summary-row"><span>Your Share</span><strong className="share-value">{yourShare.toLocaleString()} XLM</strong></div>
          <div className="summary-progress-row">
            <span>Progress</span>
            <span className={paidCount === totalMembers ? "progress-complete-text" : "progress-text"}>
              {paidCount}/{totalMembers} Paid
            </span>
          </div>
          <div className="summary-row">
            <span>Settlement</span>
            <strong className={group.settled ? "status-paid" : "status-pending"}>
              {group.settled ? <><IconCheck /> Settled</> : "Pending"}
            </strong>
          </div>
          <div className="progress-track">
            <div className={`progress-fill ${paidCount === totalMembers ? "is-complete" : ""}`}
                 style={{ width: totalMembers > 0 ? `${(paidCount / totalMembers) * 100}%` : "0%" }} />
          </div>
        </div>
      </div>

      <footer className="app-footer groups-footer">
        <span className="footer-brand">Built on Stellar Soroban</span>
        <div className="footer-links">
          <a href="https://github.com/yyred-max/Stellar-meetup" target="_blank" rel="noopener noreferrer">Source Code</a>
          <a href="https://developers.stellar.org/docs/" target="_blank" rel="noopener noreferrer">Documentation</a>
        </div>
      </footer>

      {showAddMember && (
        <AddMemberModal
          groupName={group.name}
          currentTotal={group.totalShare}
          onClose={() => setShowAddMember(false)}
          onAdded={handleMemberAdded}
          onViewGroup={() => setShowAddMember(false)}
          onActivityAdd={onActivityAdd}
          onAddMember={handleAddMemberContract}
        />
      )}

      {payTarget && (
        <PayShareModal
          groupName={group.name}
          memberAddress={payTarget.address}
          payerAddress={address}
          shareAmount={payTarget.share}
          onClose={() => setPayTarget(null)}
          onPaid={() => onMarkPaid(group.id, payTarget.address)}
          onPay={handlePayShareContract}
        />
      )}

      {isEditing && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Edit Group Name</h2>
            </div>
            <div className="modal-body">
              <input
                className="field-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter new group name"
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}